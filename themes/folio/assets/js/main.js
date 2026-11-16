// Wires the folio theme together: reader controls, compact bar, palette.
import { createReader, bindActions, bindBar, bindContents, bindToolbar, bindKeys } from './reader.js';
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

// Layout ("paper", "plain") and section heads ("side", "inline"):
// attributes on <html>, set before paint by the head.
function setView(key, name, value) {
  store(key, value);
  document.documentElement.dataset[name] = value;
  window.dispatchEvent(new Event('resize'));
}

function startReader(folio, actions) {
  const reader = createReader(folio);
  Object.assign(actions, reader.actions);
  bindToolbar(document.querySelector('.reader'), reader);
  bindContents(folio, reader);
  bindBar(folio);

  const fit = () => (wide.matches ? reader.layout() : reader.unlayout());
  fit();
  wide.addEventListener('change', fit);
  window.addEventListener('resize', () => wide.matches && reader.layout());
  // Web fonts change heights (the header's, for one): lay out again once in.
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
    'layout-paper': () => setView('folio-layout', 'layout', 'paper'),
    'layout-plain': () => setView('folio-layout', 'layout', 'plain'),
    'heads-side': () => setView('folio-heads', 'heads', 'side'),
    'heads-inline': () => setView('folio-heads', 'heads', 'inline'),
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
