// The ⌘K command palette: jump to a section, open or search pages, run actions.
import { rank, arrange } from './search.js';

// Groups, in the order they are listed when nothing is typed.
const GROUPS = ['Sections', 'Pages', 'Move', 'View', 'This page'];

const ACTIONS = [
  { group: 'Move', label: 'Next section', action: 'next', hint: 'j' },
  { group: 'Move', label: 'Previous section', action: 'prev', hint: 'k' },
  { group: 'Move', label: 'Back to top', action: 'first', keywords: 'start beginning' },
  { group: 'Move', label: 'Last section', action: 'last', keywords: 'end' },
  { group: 'View', label: 'Larger text', action: 'text-larger', hint: '+', keywords: 'zoom in font size' },
  { group: 'View', label: 'Smaller text', action: 'text-smaller', hint: '−', keywords: 'zoom out font size' },
  { group: 'View', label: 'Default text size', action: 'text-reset', hint: '0', keywords: 'zoom reset 100%' },
  { group: 'View', label: 'Light theme', action: 'theme-light', keywords: 'mode day' },
  { group: 'View', label: 'Dark theme', action: 'theme-dark', keywords: 'mode night' },
  { group: 'This page', label: 'Print or save as PDF', action: 'print', keywords: 'download pdf' },
];

function sectionItems() {
  return Array.from(document.querySelectorAll('.sheet--doc .sheet-body > h2[id]'), (heading) => ({
    label: heading.textContent.trim(),
    group: 'Sections',
    href: `#${heading.id}`,
  }));
}

function linkItems() {
  const links = document.querySelectorAll('.colophon a[data-palette]');
  return Array.from(links, (link) => ({
    label: link.dataset.palette,
    group: 'This page',
    href: link.href,
  }));
}

let searchIndex;
async function pageItems(indexUrl) {
  if (!searchIndex) {
    searchIndex = fetch(indexUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`search index: HTTP ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        searchIndex = undefined; // try again next time the palette opens
        throw error;
      })
      .then((pages) => pages.map((page) => ({
        label: page.title,
        group: 'Pages',
        href: page.url,
        keywords: page.summary,
        body: page.body,
      })));
  }
  return searchIndex;
}

export function createPalette(dialog, actions) {
  const input = dialog.querySelector('input');
  const list = dialog.querySelector('[role="listbox"]');
  const status = dialog.querySelector('.palette-status');
  const count = dialog.querySelector('.palette-count');
  const actionItems = ACTIONS.filter((item) => item.action in actions);

  let items = [];
  let results = [];
  let selected = 0;

  function run(item) {
    dialog.close();
    if (item.action) actions[item.action]();
    else if (item.href) window.location.href = item.href;
  }

  // The label, with the letters the query matched marked.
  function marked(text, indices) {
    const span = document.createElement('span');
    span.className = 'palette-label';
    const hits = new Set(indices);
    let run = '';
    let inHit = false;
    const flush = () => {
      if (!run) return;
      if (inHit) {
        const mark = document.createElement('mark');
        mark.textContent = run;
        span.append(mark);
      } else span.append(run);
      run = '';
    };
    [...text].forEach((ch, at) => {
      if (hits.has(at) !== inHit) {
        flush();
        inHit = hits.has(at);
      }
      run += ch;
    });
    flush();
    return span;
  }

  // A row of the directory: group (on its first row only) | label and any
  // quote from the body | key or kind.
  function option(result, index, first) {
    const { item } = result;
    const li = document.createElement('li');
    li.id = `palette-option-${index}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(index === selected));
    if (first) li.classList.add('is-first');

    const group = document.createElement('span');
    group.className = 'palette-group';
    group.textContent = first ? item.group : '';
    group.setAttribute('aria-hidden', 'true');

    const main = document.createElement('span');
    main.className = 'palette-main';
    main.append(marked(item.label, result.indices || []));
    if (result.snippet) {
      const quote = document.createElement('span');
      quote.className = 'palette-snippet';
      quote.textContent = result.snippet;
      main.append(quote);
    }

    const meta = document.createElement('span');
    meta.className = 'palette-meta';
    if (item.hint) {
      const key = document.createElement('kbd');
      key.textContent = item.hint;
      meta.append(key);
    } else if (item.href && !item.href.startsWith('#') && item.group === 'Pages') {
      meta.textContent = '↵';
    }

    li.append(group, main, meta);
    li.addEventListener('mousemove', () => select(index));
    li.addEventListener('click', () => run(item));
    return li;
  }

  const options = () => list.querySelectorAll('[role="option"]');

  function select(index) {
    if (!results.length) {
      input.removeAttribute('aria-activedescendant');
      return;
    }
    selected = (index + results.length) % results.length;
    options().forEach((li, i) => li.setAttribute('aria-selected', String(i === selected)));
    input.setAttribute('aria-activedescendant', `palette-option-${selected}`);
    options()[selected]?.scrollIntoView({ block: 'nearest' });
  }

  // Re-ranks into groups, keeping the highlighted item highlighted if it is
  // still listed.
  function update() {
    const current = results[selected]?.item;
    results = arrange(rank(items, input.value), GROUPS, input.value);
    selected = Math.max(0, results.findIndex((result) => result.item === current));
    list.replaceChildren(...results.map((result, index) =>
      option(result, index, result.item.group !== results[index - 1]?.item.group)));
    status.textContent = results.length ? '' : 'Nothing found.';
    count.textContent = `${results.length} ${results.length === 1 ? 'result' : 'results'}`;
    select(selected);
  }

  input.addEventListener('input', update);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || (event.ctrlKey && event.key === 'n')) {
      event.preventDefault();
      select(selected + 1);
    } else if (event.key === 'ArrowUp' || (event.ctrlKey && event.key === 'p')) {
      event.preventDefault();
      select(selected - 1);
    } else if (event.key === 'Enter' && !event.isComposing && results[selected]) {
      event.preventDefault();
      run(results[selected].item);
    }
  });
  // A click on the backdrop lands on the dialog itself.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  async function open() {
    if (dialog.open) return;
    items = [...sectionItems(), ...actionItems, ...linkItems()];
    input.value = '';
    results = [];
    update();
    dialog.showModal();
    try {
      items = [...sectionItems(), ...(await pageItems(dialog.dataset.index)), ...actionItems, ...linkItems()];
      update();
    } catch (error) {
      status.textContent = 'Search is unavailable right now.';
      console.error(error);
    }
  }

  return { open };
}
