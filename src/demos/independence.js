// Chapter 2 — makes Gödel independence tangible. G can be neither proved nor
// refuted, so the reader chooses which axiom to add; either choice yields a
// consistent universe, dramatizing that here "truth" is fixed by a model, not
// forced by the axioms.
export function init() {
  const res = document.getElementById('independence-result');
  if (!res) return;

  const branch = (chosen, other) => `
    <div class="indep-branches">
      <div class="indep-branch chosen">
        <span class="indep-tag">Your universe</span><b>Base&nbsp;+&nbsp;${chosen}</b><span class="indep-note">consistent ✓</span>
      </div>
      <div class="indep-branch">
        <span class="indep-tag">The road not taken</span><b>Base&nbsp;+&nbsp;${other}</b><span class="indep-note">equally consistent ✓</span>
      </div>
    </div>
    <p class="indep-caption">Both extensions are perfectly consistent — the axioms never forced the choice. So here "truth" isn't something you <em>discover</em>; it is fixed only once you pick a model. That gap between what a system can <em>derive</em> and what is <em>true</em> in a structure is exactly what Gödel exposes.</p>`;

  document.getElementById('indep-g').addEventListener('click', () => {
    res.className = 'independence-result show';
    res.innerHTML = branch('G', '&not;G');
  });
  document.getElementById('indep-ng').addEventListener('click', () => {
    res.className = 'independence-result show';
    res.innerHTML = branch('&not;G', 'G');
  });
}

export const handlers = {};
