// Wires the folio theme together: layout, keys, compact bar, palette.
import { createReader, bindActions, bindBar, bindContents, bindKeys } from './reader.js';
import { createPalette } from './palette.js';
import { store } from './storage.js';

// Wide screens size the paper to the window; narrow screens show it as it is.
const wide = window.matchMedia('(min-width: 801px)');

// The head sets the initial theme before paint; this marks and changes it.
function markTheme() {
  const theme = document.documentElement.dataset.theme;
  document.querySelectorAll('[data-action^="theme-"]').forEach((button) => {
    button.classList.toggle('active', button.dataset.action === `theme-${theme}`);
  });
}

function setTheme(mode) {
  store('theme-storage', mode);
  document.documentElement.dataset.theme = mode;
  markTheme();
}

function startReader(folio, actions) {
  const reader = createReader(folio);
  Object.assign(actions, reader.actions);
  bindContents(folio, reader);
  bindBar(folio);

  const fit = () => (wide.matches ? reader.layout() : reader.unlayout());
  fit();
  wide.addEventListener('change', fit);
  window.addEventListener('resize', () => wide.matches && reader.layout());
  // The script can run before the stylesheet or the web fonts have
  // settled; measure again once they have.
  window.addEventListener('load', () => wide.matches && reader.layout());
  document.fonts?.ready.then(() => wide.matches && reader.layout());

  // Laying out moves everything, so return to a linked #fragment afterwards.
  const target = window.location.hash && document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  if (target) target.scrollIntoView({ block: 'start' });
}

function start() {
  const actions = {
    print: () => window.print(),
    'theme-light': () => setTheme('light'),
    'theme-dark': () => setTheme('dark'),
  };

  const folio = document.querySelector('.folio');
  if (folio) startReader(folio, actions);

  const dialog = document.querySelector('.palette');
  const palette = dialog ? createPalette(dialog, actions) : null;
  if (palette) actions.palette = palette.open;

  bindActions(document, actions);
  bindKeys(actions, () => palette?.open());
  markTheme();
}

start();
