// Reading a document set as paper: which section is in view, moving
// between sections, zoom, and the compact bar. Every control (toolbar,
// keyboard, palette) goes through an actions map.
import { stored, store } from './storage.js';
import { sectionAt, position } from './sections.js';

const ZOOM_STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
const ZOOM_KEY = 'folio-zoom';
// "Fit" fills the room beside the sidebar, up to FIT_SHARE of the window,
// and never past MAX_ZOOM, so type stays a reading size on big screens.
const FIT_SHARE = 0.75;
const MAX_ZOOM = 1.15;

export function createReader(folio) {
  const desk = folio.closest('.desk');
  const bar = folio.querySelector('.doc-bar');
  let zoom = stored(ZOOM_KEY) || 'fit';

  // The desk grows with a zoomed folio, so measure the room around it
  // instead: the shell, less its padding, gap and sidebar.
  function room() {
    const shell = desk.parentElement;
    const style = getComputedStyle(shell);
    const sidebar = shell.querySelector('.sidebar');
    return shell.clientWidth
      - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      - (sidebar ? sidebar.offsetWidth + parseFloat(style.columnGap) : 0);
  }

  function fitScale() {
    const sheetWidth = parseFloat(getComputedStyle(folio).getPropertyValue('--sheet-w'));
    return Math.min(MAX_ZOOM, Math.min(FIT_SHARE * window.innerWidth, room()) / sheetWidth);
  }

  function scale() {
    return zoom === 'fit' ? fitScale() : Number(zoom);
  }

  // A sheet is at least one screen tall, so a short page fills the view
  // and never scrolls past it. The zoomed folio needs the height unzoomed.
  function applyZoom() {
    const zoomed = scale();
    folio.style.zoom = String(zoomed);
    const shell = getComputedStyle(desk.parentElement);
    const room = window.innerHeight - parseFloat(shell.paddingTop) - parseFloat(shell.paddingBottom);
    folio.style.setProperty('--sheet-min', `${room / zoomed}px`);
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

  const headings = () => Array.from(folio.querySelectorAll('.sheet--doc .sheet-body > h2[id]'));

  // A section is current once its heading reaches the bottom of the bar.
  function currentIndex() {
    const line = (bar ? bar.querySelector('.doc-bar-inner').getBoundingClientRect().bottom : 0) + 24;
    return sectionAt(headings().map((h) => h.getBoundingClientRect().top), line);
  }

  function goTo(index) {
    const all = headings();
    if (index < 0 || all.length === 0) {
      window.scrollTo({ top: 0 });
      return;
    }
    all[Math.min(index, all.length - 1)].scrollIntoView({ block: 'start' });
  }

  const listeners = new Set();
  function render() {
    const all = headings();
    const index = currentIndex();
    const heading = all[index];
    const state = {
      position: position(index, all.length),
      section: heading ? heading.textContent.trim() : folio.dataset.title || '',
      sectionId: heading?.id || '',
      zoom: Math.round(scale() * 100),
      fit: zoom === 'fit',
    };
    listeners.forEach((listener) => listener(state));
  }

  const actions = {
    next: () => goTo(currentIndex() + 1),
    prev: () => goTo(currentIndex() - 1),
    first: () => goTo(-1),
    last: () => goTo(headings().length - 1),
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

  return {
    actions,
    applyZoom,
    render,
    refit: () => (zoom === 'fit' ? applyZoom() : render()),
    onChange: (listener) => listeners.add(listener),
  };
}

// Shows the compact bar once the big header has scrolled out of view
// above, and hides it again on the way back up.
export function bindBar(folio) {
  const bar = folio.querySelector('.doc-bar');
  const header = folio.querySelector('.doc-head');
  if (!bar || !header) return;

  const observer = new IntersectionObserver(([entry]) => {
    const passed = !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
    bar.classList.toggle('is-shown', passed);
    bar.inert = !passed;
    // From the next frame on, changes animate; the first placement does not.
    if (!bar.classList.contains('is-ready')) requestAnimationFrame(() => bar.classList.add('is-ready'));
  });
  observer.observe(header);
}

// Marks the current section in every contents list (big header and bar),
// and keeps it in view when the bar's list is wider than the bar.
export function bindContents(folio, reader) {
  const lists = folio.querySelectorAll('.doc-toc');
  if (!lists.length) return;
  let shown = null;
  reader.onChange((state) => {
    if (state.sectionId === shown) return;
    shown = state.sectionId;
    lists.forEach((list) => {
      list.querySelectorAll('a').forEach((link) => {
        const current = link.hash === `#${state.sectionId}`;
        link.setAttribute('aria-current', String(current));
        if (current && list.closest('.doc-bar')) list.scrollLeft = link.offsetLeft - list.clientWidth / 3;
      });
    });
  });
}

// Reflects reader state in the toolbar.
export function bindToolbar(toolbar, reader) {
  const field = (name) => toolbar.querySelector(`[data-reader="${name}"]`);
  reader.onChange((state) => {
    field('position').textContent = state.position;
    field('section').textContent = state.section;
    field('zoom').textContent = state.fit ? 'fit' : `${state.zoom}%`;
  });
  toolbar.hidden = false;
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

function isTyping(event) {
  const target = event.target;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

// j/k sections, +/- zoom, 0 fit, ⌘K or / opens the palette.
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
