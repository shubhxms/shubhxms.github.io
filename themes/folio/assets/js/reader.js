// Reading a document set as paper: laying the sheet out for the window,
// text size, which section is in view, moving between sections, and the
// compact bar. Every control (toolbar, keyboard, palette) goes through an
// actions map.
import { stored, store } from './storage.js';
import { sectionAt, position } from './sections.js';
import { geometry, TEXT_STEPS } from './layout.js';

const TEXT_KEY = 'folio-text';

export function createReader(folio) {
  const desk = folio.closest('.desk');
  const bar = folio.querySelector('.doc-bar');
  let textStep = TEXT_STEPS.indexOf(Number(stored(TEXT_KEY)));
  if (textStep === -1) textStep = TEXT_STEPS.indexOf(1);

  // The width beside the sidebar: the shell, less its padding, gap and sidebar.
  function room() {
    const shell = desk.parentElement;
    const style = getComputedStyle(shell);
    const sidebar = shell.querySelector('.sidebar');
    return shell.clientWidth
      - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      - (sidebar ? sidebar.offsetWidth + parseFloat(style.columnGap) : 0);
  }

  // Sets the sheet's measurements as whole pixels. A sheet is also at
  // least one screen tall, so a short page fills the view without scrolling.
  function layout() {
    const g = geometry(room(), TEXT_STEPS[textStep]);
    const shell = getComputedStyle(desk.parentElement);
    const height = window.innerHeight - parseFloat(shell.paddingTop) - parseFloat(shell.paddingBottom);
    const set = (name, px) => folio.style.setProperty(name, `${px}px`);
    set('--sheet-w', g.sheet);
    set('--pad-left', g.padLeft);
    set('--side', g.side);
    set('--side-gap', g.sideGap);
    set('--text-w', g.text);
    set('--gutter', g.gutter);
    set('--note-w', g.note);
    set('--type', g.type);
    set('--sheet-min', Math.floor(height));
    render();
  }

  // Back to the stylesheet's own sizes (narrow screens).
  function unlayout() {
    ['--sheet-w', '--pad-left', '--side', '--side-gap', '--text-w', '--gutter', '--note-w', '--type', '--sheet-min']
      .forEach((name) => folio.style.removeProperty(name));
    render();
  }

  function setText(step) {
    textStep = Math.max(0, Math.min(TEXT_STEPS.length - 1, step));
    store(TEXT_KEY, String(TEXT_STEPS[textStep]));
    layout();
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
      text: Math.round(TEXT_STEPS[textStep] * 100),
    };
    listeners.forEach((listener) => listener(state));
  }

  const actions = {
    next: () => goTo(currentIndex() + 1),
    prev: () => goTo(currentIndex() - 1),
    first: () => goTo(-1),
    last: () => goTo(headings().length - 1),
    'text-larger': () => setText(textStep + 1),
    'text-smaller': () => setText(textStep - 1),
    'text-reset': () => setText(TEXT_STEPS.indexOf(1)),
  };

  let frame = 0;
  window.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(render);
  }, { passive: true });

  return {
    actions,
    layout,
    unlayout,
    render,
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

// j/k sections, +/- text size, 0 default size, ⌘K or / opens the palette.
export function bindKeys(actions, openPalette) {
  const keys = { j: 'next', k: 'prev', '+': 'text-larger', '=': 'text-larger', '-': 'text-smaller', 0: 'text-reset' };
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
