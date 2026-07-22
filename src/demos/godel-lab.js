// Chapter 2 — two warm-up labs that precede the Gödel construction, built to make
// the two hardest ideas concrete:
//   1. Sub(a,b): substitution as a function from NUMBERS to a NUMBER.
//   2. Diagonalization: feeding a formula its own code, Sub(a,a).
import { calculateEncoding } from '../lib/godel.js';
import { formatScientific } from '../lib/dom.js';

// ---------- 1. Sub(a,b) explorer ----------
// Templates carry one free variable x. Substituting the numeral for b means
// replacing x with S…S0 (b copies of S), then re-encoding to a Gödel number.
const SUB_TEMPLATES = {
  'x=0': { pretty: 'x = 0', gloss: '“x is zero”' },
  '¬(x=0)': { pretty: '¬(x = 0)', gloss: '“x is not zero”' },
  'x=S0': { pretty: 'x = S0', gloss: '“x is 1”' },
};

const numeral = (b) => 'S'.repeat(b) + '0';
const prettyNumeral = (b) => (b === 0 ? '0' : 'S'.repeat(b) + '0');
const encode = (s) => calculateEncoding(s, {}).godelNumber;
const prettify = (s) => s.replace(/=/g, ' = ');

let subB = 2;

function renderSub() {
  const sel = document.getElementById('sub-formula');
  if (!sel) return;
  const tmpl = sel.value;
  const a = encode(tmpl);
  const num = numeral(subB);
  const subf = tmpl.replaceAll('x', num);
  const out = encode(subf);

  document.getElementById('sub-a').innerHTML = formatScientific(a);
  document.getElementById('sub-b').textContent = subB;
  document.getElementById('sub-b-numeral').textContent = prettyNumeral(subB);
  document.getElementById('sub-subformula').innerHTML = prettify(subf);
  document.getElementById('sub-out').innerHTML = formatScientific(out);
}

function initSub() {
  const sel = document.getElementById('sub-formula');
  if (!sel) return;
  sel.addEventListener('change', renderSub);
  document.getElementById('sub-b-inc').addEventListener('click', () => {
    subB = Math.min(6, subB + 1);
    renderSub();
  });
  document.getElementById('sub-b-dec').addEventListener('click', () => {
    subB = Math.max(0, subB - 1);
    renderSub();
  });
  renderSub();
}

// ---------- 2. Diagonalization explorer ----------
// Diagonalizing φ = computing Sub(⌜φ⌝, ⌜φ⌝): plug the formula's own code in for x.
const DIAG = {
  eq: {
    phi: 'x = x',
    result: '⌜φ⌝ = ⌜φ⌝',
    reduce: null,
    says: 'True — the formula’s own code equals itself. A self-reference, but a harmless one.',
    tag: null,
  },
  prov: {
    phi: 'Prov(x)',
    result: 'Prov(⌜φ⌝)',
    reduce: null,
    says: 'Plugging φ’s own code ⌜φ⌝ in for x gives “the formula Prov(x) is provable.” It mentions φ’s code — but it is a statement about the formula φ, not yet about itself.',
    tag: null,
  },
  nprov: {
    phi: '¬Prov(x)',
    result: '¬Prov(⌜φ⌝)',
    reduce: null,
    says: 'The ⌜φ⌝ is φ’s own code, plugged in for x. So this reads “the formula ¬Prov(x) has no proof” — tantalisingly close to “this sentence is unprovable.” But look closely: it speaks about the formula ¬Prov(x), not about itself. Closing that gap is exactly what the inner Sub(x,x) does. →',
    tag: 'almost there',
  },
  psi: {
    phi: '¬Prov(Sub(x,x))',
    result: '¬Prov(Sub(⌜φ⌝, ⌜φ⌝))',
    reduce: '¬Prov(⌜G⌝)',
    says: 'Now the self-reference is airtight. The number Sub(⌜φ⌝, ⌜φ⌝) is the code of this very sentence, so it reads ¬Prov(⌜G⌝): “I have no proof.” That diagonal is G — the sentence the rest of this chapter is about.',
    tag: 'this is G',
  },
};

function renderDiag(key) {
  const out = document.getElementById('diag-out');
  if (!out) return;
  const d = DIAG[key];
  document.querySelectorAll('.diag-opt').forEach((b) => b.classList.toggle('active', b.dataset.d === key));
  const tag = d.tag ? `<span class="diag-tag">${d.tag}</span>` : '';
  const reduceLine = d.reduce
    ? `<div class="diag-line"><span class="diag-lbl">which is</span><span class="mono">${d.reduce}</span></div>`
    : '';
  out.className = 'diag-out show' + (key === 'psi' ? ' is-g' : '');
  // "φ(⌜φ⌝):" reads "the diagonal is the formula …" — a colon, not an equals, so a
  // result that is itself an equation (like ⌜φ⌝ = ⌜φ⌝) can't be misread as a chain.
  out.innerHTML = `
    <div class="diag-line"><span class="diag-lbl">Formula</span><span class="mono">&varphi;(x) := ${d.phi}</span></div>
    <div class="diag-line"><span class="diag-lbl">Diagonal</span><span class="mono">&varphi;(&ulcorner;&varphi;&urcorner;): &nbsp;${d.result}</span>${tag}</div>
    ${reduceLine}
    <div class="diag-says">${d.says}</div>`;
}

function initDiag() {
  const menu = document.getElementById('diag-menu');
  if (!menu) return;
  menu.querySelectorAll('.diag-opt').forEach((b) => b.addEventListener('click', () => renderDiag(b.dataset.d)));
  renderDiag('eq');
}

export function init() {
  initSub();
  initDiag();
}

export const handlers = {};
