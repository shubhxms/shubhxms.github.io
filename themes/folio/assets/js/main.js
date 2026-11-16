// Wires the folio theme together: pagination, reader controls, palette.
import { paginate, unpaginate } from './paginate.js';
import { createReader, bindActions, bindToolbar, bindKeys } from './reader.js';
import { createPalette } from './palette.js';
import { store } from './storage.js';

// Sheets are fixed-size on wide screens; narrow screens get one reflowed sheet.
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
  bindToolbar(document.querySelector('.reader'), reader);

  // Printing narrows the page to A4, which can flip `wide`; the sheets are
  // already the right size for paper, so leave them alone until it is done.
  let printing = false;
  window.addEventListener('beforeprint', () => { printing = true; });
  window.addEventListener('afterprint', () => { printing = false; });

  let firstLayout = true;
  const layout = () => {
    if (printing) return;
    const anchor = readingPosition(folio, firstLayout);
    firstLayout = false;

    unpaginate(folio);
    folio.style.zoom = '';
    if (wide.matches) {
      paginate(folio);
      reader.applyZoom();
    } else {
      reader.render();
    }
    anchor?.scrollIntoView({ block: 'start' });
  };

  document.fonts.ready.then(() => {
    layout();
    // Images without dimensions change height once they load.
    if (document.readyState !== 'complete') window.addEventListener('load', layout, { once: true });
  });
  wide.addEventListener('change', layout);
}

// What the reader is looking at, so a relayout can return to it: the linked
// #fragment on first load, otherwise the first block at the top of the view.
function readingPosition(folio, firstLayout) {
  const target = firstLayout && window.location.hash
    ? document.getElementById(decodeURIComponent(window.location.hash.slice(1)))
    : null;
  if (target) return target;
  if (window.scrollY === 0) return null;
  const blocks = folio.querySelectorAll('.sheet-body > *');
  return Array.from(blocks).find((block) => block.getBoundingClientRect().bottom > 0) ?? null;
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
