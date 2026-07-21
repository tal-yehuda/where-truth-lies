// Gödel arithmetization core: the symbol dictionary, the prime basis, and the
// pure functions that expand macro formulas and compute prime-power encodings.
// State (the saved-formula memory bank) lives in the sandbox demo and is passed
// in, so these functions stay side-effect free.

export const dictionary = {
  '0': 1n, S: 2n, '=': 3n, '¬': 4n, x: 5n,
  '(': 6n, ')': 7n, '⌜': 8n, '⌝': 9n, ',': 10n,
  Prov: 11n,
  Sub: 12n,
  A: 13n, B: 14n, C: 15n, D: 16n, E: 17n,
};

export const primes = [
  2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n,
  31n, 37n, 41n, 43n, 47n, 53n, 59n, 61n, 67n, 71n,
];

// Recursively expand any saved macros (α…ε) inside a formula string into their
// stored definitions. `visualOnly` produces a human-readable primitive view.
export function expandFormula(formula, memory, visualOnly = false) {
  let expanded = formula;
  let iterations = 0;

  let needsExpansion = true;
  while (needsExpansion && iterations < 20) {
    needsExpansion = false;

    for (const [, data] of Object.entries(memory)) {
      if (!data.formula) continue;

      const symbolIndex = expanded.indexOf(data.symbol);
      if (symbolIndex !== -1) {
        needsExpansion = true;

        if (
          symbolIndex + data.symbol.length < expanded.length &&
          expanded[symbolIndex + data.symbol.length] === '('
        ) {
          let openCount = 1;
          const argStart = symbolIndex + data.symbol.length + 1;
          let argEnd = -1;
          for (let i = argStart; i < expanded.length; i++) {
            if (expanded[i] === '(') openCount++;
            else if (expanded[i] === ')') openCount--;

            if (openCount === 0) {
              argEnd = i;
              break;
            }
          }

          if (argEnd !== -1) {
            const arg = expanded.substring(argStart, argEnd);
            const substituted = data.formula.replaceAll('x', arg);
            const wrap = substituted.length > 1 ? `(${substituted})` : substituted;

            expanded = expanded.substring(0, symbolIndex) + wrap + expanded.substring(argEnd + 1);
            break;
          }
        }

        const wrap = data.formula.length > 1 ? `(${data.formula})` : data.formula;
        expanded =
          expanded.substring(0, symbolIndex) + wrap + expanded.substring(symbolIndex + data.symbol.length);
        break;
      }
    }
    iterations++;
  }

  if (visualOnly) {
    for (const [, data] of Object.entries(memory)) {
      if (data.constant && expanded.includes(data.constant)) {
        expanded = expanded.replaceAll(data.constant, `[S...S0 (${data.constant} times)]`);
      }
    }
    expanded = expanded.replaceAll('Prov', '∃p Proof');
  }

  return expanded;
}

// Encode a formula string into its Gödel number (BigInt) plus HTML fragments
// for the factorization and the token/prime breakdown.
export function calculateEncoding(formula, memory) {
  if (formula.length === 0) return { factorization: '', godelNumber: 0n, visualHTML: '' };

  const expandedFormula = expandFormula(formula, memory, false);

  let factHTML = '';
  let visualHTML = '';
  let godelNumber = 1n;

  const tokens = [];
  let i = 0;
  while (i < expandedFormula.length) {
    if (expandedFormula.startsWith('Prov', i)) {
      tokens.push('Prov');
      i += 4;
    } else if (expandedFormula.startsWith('Sub', i)) {
      tokens.push('Sub');
      i += 3;
    } else {
      tokens.push(expandedFormula[i]);
      i++;
    }
  }

  for (let j = 0; j < tokens.length; j++) {
    const sym = tokens[j];
    const code = dictionary[sym] || 1n;
    const prime = primes[j % primes.length];
    if (j > 0) factHTML += ' &times; ';
    factHTML += `${prime}<sup>${code}</sup>`;
    godelNumber *= prime ** code;

    visualHTML += `
        <div class="token-col">
            <span class="token-sym">${sym}</span>
            <span class="token-prime">${prime}</span>
        </div>`;
  }

  return { factorization: factHTML, godelNumber, visualHTML };
}
