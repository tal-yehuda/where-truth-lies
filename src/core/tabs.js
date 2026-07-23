// Tab shell: switching, the header Prev/Next walk, and the current-chapter
// label. Active-tab state is read back from the DOM (same as the original).
import { fireTabShow } from './registry.js';

export const tabOrder = [
  'proposal', 'about', 'home', 'foundations', 'truth', 'applied', 'interpretation', 'conclusion', 'reflection',
];

export const tabNames = {
  proposal: 'Project Proposal',
  about: 'About the Project',
  home: 'Home',
  foundations: '1. Formal Systems',
  truth: '2. Truth',
  applied: '3. Computability',
  interpretation: '4. Interpretation',
  conclusion: '5. Reverse Mathematics',
  reflection: '6. Where Truth Lies',
};

export function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach((tab) => {
    tab.style.display = 'none';
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.classList.remove('active');
  });

  const targetTab = document.getElementById('tab-' + tabId);
  if (targetTab) {
    targetTab.style.display = 'flex';
    setTimeout(() => targetTab.classList.add('active'), 10);
  }

  const targetBtn = document.getElementById('tab-btn-' + tabId);
  if (targetBtn) {
    targetBtn.classList.add('active');
  }

  // Scroll to top when switching tabs for walkthrough flow
  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateFloatingNav(tabId);
  fireTabShow(tabId);
}

export function updateFloatingNav(tabId) {
  const currentIndex = tabOrder.indexOf(tabId);
  const prevBtn = document.getElementById('floating-prev');
  const nextBtn = document.getElementById('floating-next');
  const currentTitle = document.getElementById('floating-current');

  if (currentTitle) currentTitle.textContent = tabNames[tabId];
  if (prevBtn) prevBtn.disabled = currentIndex <= 0;
  if (nextBtn) nextBtn.disabled = currentIndex >= tabOrder.length - 1;
}

function currentActiveTab() {
  let activeTab = 'home';
  document.querySelectorAll('.tab-content').forEach((tab) => {
    if (tab.classList.contains('active')) activeTab = tab.id.replace('tab-', '');
  });
  return activeTab;
}

export function navPrev() {
  const idx = tabOrder.indexOf(currentActiveTab());
  if (idx > 0) switchTab(tabOrder[idx - 1]);
}

export function navNext() {
  const idx = tabOrder.indexOf(currentActiveTab());
  if (idx < tabOrder.length - 1) switchTab(tabOrder[idx + 1]);
}
