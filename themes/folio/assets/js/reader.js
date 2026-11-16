// PDF-reader behaviour: which sheet is in view, paging and zoom.
// Every control (toolbar, keyboard, palette) goes through an actions map.
import { stored, store } from './storage.js';

const ZOOM_STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
const ZOOM_KEY = 'folio-zoom';

export function createReader(folio) {
  const desk = folio.closest('.desk');
  const sheets = () => Array.from(folio.querySelectorAll('.sheet'));
  let zoom = stored(ZOOM_KEY) || 'fit';

  // The desk grows with a zoomed folio, so measure the room around it
  // instead: the shell, less its padding, gap and sidebar.
  function fitScale() {
    const shell = desk.parentElement;
    const style = getComputedStyle(shell);
    const sidebar = shell.querySelector('.sidebar');
    const room = shell.clientWidth
      - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      - (sidebar ? sidebar.offsetWidth + parseFloat(style.columnGap) : 0);
    const sheetWidth = parseFloat(getComputedStyle(folio).getPropertyValue('--sheet-w'));
    return Math.min(1, room / sheetWidth);
  }

  function scale() {
    return zoom === 'fit' ? fitScale() : Number(zoom);
  }

  function applyZoom() {
    folio.style.zoom = String(scale());
    render();
  }

  function setZoom(value) {
    zoom = value;
    store(ZOOM_KEY, String(value));
    applyZoom();
  }

  function stepZoom(direction) {
    const current = scale();
    const steps = direction > 0 ? ZOOM_STEPS : [...ZOOM_STEPS].reverse();
    const next = steps.find((step) => (direction > 0 ? step > current + 0.001 : step < current - 0.001));
    if (next) setZoom(next);
  }

  // The sheet that crosses the middle of the viewport.
  function currentIndex() {
    const middle = window.innerHeight / 2;
    const all = sheets();
    const index = all.findIndex((sheet) => sheet.getBoundingClientRect().bottom >= middle);
    return index === -1 ? all.length - 1 : index;
  }

  function goTo(index) {
    const all = sheets();
    const target = all[Math.max(0, Math.min(all.length - 1, index))];
    target.scrollIntoView({ block: 'start' });
  }

  const listeners = new Set();
  function render() {
    const all = sheets();
    const index = currentIndex();
    const state = {
      page: index + 1,
      pages: all.length,
      section: all[index]?.dataset.section || '',
      zoom: Math.round(scale() * 100),
      fit: zoom === 'fit',
    };
    listeners.forEach((listener) => listener(state));
  }

  const actions = {
    next: () => goTo(currentIndex() + 1),
    prev: () => goTo(currentIndex() - 1),
    first: () => goTo(0),
    last: () => goTo(sheets().length - 1),
    'zoom-in': () => stepZoom(1),
    'zoom-out': () => stepZoom(-1),
    'zoom-fit': () => setZoom('fit'),
    'zoom-reset': () => setZoom(1),
  };

  let frame = 0;
  window.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(render);
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (zoom === 'fit') applyZoom();
    else render();
  });

  return {
    actions,
    goTo,
    applyZoom,
    render,
    onChange: (listener) => listeners.add(listener),
  };
}

// Clicks on any [data-action] element run the matching action.
export function bindActions(root, actions) {
  root.addEventListener('click', (event) => {
    const control = event.target.closest('[data-action]');
    if (!control || !(control.dataset.action in actions)) return;
    event.preventDefault();
    actions[control.dataset.action]();
  });
}

// Reflects reader state in the toolbar.
export function bindToolbar(toolbar, reader) {
  const field = (name) => toolbar.querySelector(`[data-reader="${name}"]`);
  reader.onChange((state) => {
    field('page').textContent = state.page;
    field('pages').textContent = state.pages;
    field('section').textContent = state.section;
    field('zoom').textContent = state.fit ? 'fit' : `${state.zoom}%`;
  });
  toolbar.hidden = false;
}

function isTyping(event) {
  const target = event.target;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

// j/k page, +/- zoom, 0 fit, ⌘K or / opens the palette.
export function bindKeys(actions, openPalette) {
  const keys = { j: 'next', k: 'prev', '+': 'zoom-in', '=': 'zoom-in', '-': 'zoom-out', 0: 'zoom-fit' };
  document.addEventListener('keydown', (event) => {
    const command = event.metaKey || event.ctrlKey;
    if (command && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openPalette();
      return;
    }
    if (command || event.altKey || isTyping(event)) return;
    if (event.key === '/') {
      event.preventDefault();
      openPalette();
    } else if (event.key in keys && keys[event.key] in actions) {
      event.preventDefault();
      actions[keys[event.key]]();
    }
  });
}
