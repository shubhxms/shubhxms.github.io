// The ⌘K command palette: jump to a section, open or search pages, run actions.
import { rank } from './search.js';

const ACTIONS = [
  { label: 'Next page', action: 'next', hint: 'j' },
  { label: 'Previous page', action: 'prev', hint: 'k' },
  { label: 'First page', action: 'first' },
  { label: 'Last page', action: 'last' },
  { label: 'Zoom in', action: 'zoom-in', hint: '+' },
  { label: 'Zoom out', action: 'zoom-out', hint: '−' },
  { label: 'Fit width', action: 'zoom-fit', hint: '0' },
  { label: 'Actual size', action: 'zoom-reset', keywords: '100%' },
  { label: 'Print or save as PDF', action: 'print', keywords: 'download pdf' },
  { label: 'Light theme', action: 'theme-light', keywords: 'mode day' },
  { label: 'Dark theme', action: 'theme-dark', keywords: 'mode night' },
];

function sectionItems() {
  return Array.from(document.querySelectorAll('.sheet-body > h2[id]'), (heading) => ({
    label: heading.textContent.trim(),
    group: 'On this page',
    href: `#${heading.id}`,
  }));
}

function linkItems() {
  const links = document.querySelectorAll('.colophon a[data-palette]');
  return Array.from(links, (link) => ({
    label: link.dataset.palette,
    group: 'Actions',
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
  const actionItems = ACTIONS.filter((item) => item.action in actions).map((item) => ({ ...item, group: 'Actions' }));

  let items = [];
  let results = [];
  let selected = 0;

  function run(item) {
    dialog.close();
    if (item.action) actions[item.action]();
    else if (item.href) window.location.href = item.href;
  }

  function option(result, index) {
    const { item } = result;
    const li = document.createElement('li');
    li.id = `palette-option-${index}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(index === selected));

    const label = document.createElement('span');
    label.className = 'palette-label';
    label.textContent = item.label;
    li.append(label);

    const meta = document.createElement('span');
    meta.className = 'palette-meta';
    meta.textContent = item.hint || item.group;
    li.append(meta);

    if (result.snippet) {
      const quote = document.createElement('span');
      quote.className = 'palette-snippet';
      quote.textContent = result.snippet;
      li.append(quote);
    }

    li.addEventListener('mousemove', () => select(index));
    li.addEventListener('click', () => run(item));
    return li;
  }

  function select(index) {
    if (!results.length) {
      input.removeAttribute('aria-activedescendant');
      return;
    }
    selected = (index + results.length) % results.length;
    Array.from(list.children).forEach((li, i) => li.setAttribute('aria-selected', String(i === selected)));
    input.setAttribute('aria-activedescendant', `palette-option-${selected}`);
    list.children[selected]?.scrollIntoView({ block: 'nearest' });
  }

  // Re-ranks, keeping the highlighted item highlighted if it is still listed.
  function update() {
    const current = results[selected]?.item;
    results = rank(items, input.value);
    selected = Math.max(0, results.findIndex((result) => result.item === current));
    list.replaceChildren(...results.map(option));
    status.textContent = results.length ? '' : 'Nothing found.';
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
