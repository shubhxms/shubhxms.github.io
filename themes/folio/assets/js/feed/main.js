// The feed table and the home page's recent list. Items come from the feed
// API, are kept in localStorage for instant repeat visits, and are brought
// up to date with only what changed since (?ts=).
import { entry, parseQuery, matches, byMonth } from './data.js';

const CACHE_KEY = 'folio-feed';
const PAGE = 200;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const KIND_LABEL = { film: 'Film', link: 'Link', post: 'Post' };

// ---- Data ----------------------------------------------------------------

function loadCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY));
    return cache && typeof cache.ts === 'number' && cache.items ? cache : null;
  } catch {
    return null;
  }
}

function saveCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or unavailable: the feed still works, uncached.
  }
}

// Calls `render(entries)` with what is cached (if anything), then again once
// the API has answered; `fail(error)` if it cannot be reached.
function load(api, render, fail) {
  let cache = loadCache() || { ts: 0, items: {} };
  const publish = () => {
    const items = Object.values(cache.items);
    // Catalogue numbers: oldest is 1.
    const entries = items.sort((a, b) => a.occurred_at - b.occurred_at).map((item, i) => ({ ...entry(item), n: i + 1 }));
    render(entries);
  };
  if (cache.ts) publish();

  fetch(`${api}/feed${cache.ts ? `?ts=${cache.ts}` : ''}`)
    .then((response) => {
      if (!response.ok) throw new Error(`feed: HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      (data.items || []).forEach((item) => {
        if (item.deleted) delete cache.items[item.id];
        else cache.items[item.id] = item;
      });
      if (data.ts) cache.ts = data.ts;
      saveCache(cache);
      publish();
    })
    .catch((error) => {
      console.error(error);
      if (!cache.ts) fail(error);
    });
}

// ---- Rows ----------------------------------------------------------------

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

const pad = (n) => String(n).padStart(2, '0');
const dayMonth = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`;
};
const fullDate = (ms) => {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export function stars(rating) {
  if (rating == null) return '';
  return '★'.repeat(Math.floor(rating)) + (rating % 1 ? '½' : '');
}

// A table row. On the feed page (linked = false) the title is plain text:
// pointing shows the entry in the plate, and it opens from there. The
// recent list, without a plate, links the title directly.
function row(e, linked = false) {
  const tr = el('tr', `feed-row feed-row--${e.kind}`);
  tr.dataset.id = e.id;
  tr.tabIndex = 0;
  tr.append(el('td', 'feed-n', String(e.n)));
  tr.append(el('td', 'feed-date', dayMonth(e.date)));
  tr.append(el('td', 'feed-kind', KIND_LABEL[e.kind] || e.kind));

  const cell = el('td', 'feed-entry');
  if (linked) {
    const link = el('a', 'feed-title', e.title);
    link.href = e.url;
    link.rel = 'noopener';
    cell.append(link);
  } else {
    cell.append(el('span', 'feed-title', e.title));
  }
  if (e.kind === 'film') {
    const extra = [e.year, stars(e.rating)].filter(Boolean).join(' ');
    if (extra) cell.append(' ', el('span', 'feed-extra', extra));
  }
  if (e.image) cell.append(' ', el('span', 'feed-pic', '▪'));
  tr.append(cell);

  tr.append(el('td', 'feed-site', e.site));
  return tr;
}

// ---- The feed page -------------------------------------------------------

function feedPage(root) {
  const input = root.querySelector('input');
  const kinds = root.querySelector('.feed-kinds');
  const status = root.querySelector('.feed-status');
  const body = root.querySelector('tbody');
  const more = root.querySelector('.feed-more');
  const plate = root.querySelector('.feed-plate');

  let all = [];
  let shown = [];
  let limit = PAGE;
  let pinned = null;
  const byId = new Map();

  // The plate: the entry under the pointer, else the pinned one, else a key
  // to the search syntax.
  function showPlate(e) {
    plate.replaceChildren();
    if (!e) {
      plate.append(el('p', 'feed-plate-kicker', 'Search'));
      const list = el('dl', 'feed-syntax');
      [
        ['word "a phrase"', 'in titles and text'],
        ['-word', 'leave out'],
        ['kind:film,link,post', 'what it is'],
        ['site:substack', 'where from'],
        ['rating:>=4', 'films, by stars'],
        ['year:2025', 'when'],
        ['has:image', 'or review, text'],
        ['is:fav', 'or liked, rewatch'],
        ['order:old', 'oldest first'],
      ].forEach(([code, what]) => list.append(el('dt', null, code), el('dd', null, what)));
      plate.append(list);
      return;
    }
    plate.append(el('p', 'feed-plate-kicker', `No. ${e.n} · ${KIND_LABEL[e.kind]} · ${fullDate(e.date)}`));
    if (e.image) {
      const img = el('img', `feed-plate-img feed-plate-img--${e.kind}`);
      img.alt = '';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => img.remove());
      img.src = e.image;
      plate.append(img);
    }
    const title = el('a', 'feed-plate-title', e.title);
    title.href = e.url;
    title.rel = 'noopener';
    plate.append(title);
    if (e.kind === 'film' && (e.year || e.rating != null)) {
      plate.append(el('p', 'feed-plate-extra', [e.year, stars(e.rating), e.liked ? '♥' : ''].filter(Boolean).join('  ')));
    }
    if (e.text) plate.append(el('p', 'feed-plate-text', e.text));
    const open = el('a', 'feed-plate-open', `Open on ${e.site} ↗`);
    open.href = e.url;
    open.rel = 'noopener';
    plate.append(open);
  }

  function draw() {
    const query = parseQuery(input.value);
    shown = all.filter((e) => matches(e, query));
    const months = byMonth(shown, query.order);

    const rows = [];
    let count = 0;
    for (const month of months) {
      if (count >= limit) break;
      const head = el('tr', 'feed-month');
      const th = el('th', null);
      th.colSpan = 5;
      th.scope = 'rowgroup';
      th.append(el('span', null, month.label), el('span', 'feed-month-n', String(month.entries.length)));
      head.append(th);
      rows.push(head);
      for (const e of month.entries) {
        if (count >= limit) break;
        rows.push(row(e));
        count += 1;
      }
    }
    body.replaceChildren(...rows);

    status.textContent = shown.length === all.length
      ? `${all.length} entries`
      : `${shown.length} of ${all.length}`;
    const rest = shown.length - count;
    more.hidden = rest <= 0;
    more.textContent = `${Math.min(PAGE, rest)} more of ${rest}`;
    markKinds();
    if (pinned && !shown.includes(pinned)) pinned = null;
    showPlate(pinned);
  }

  // Kind buttons write their filter into the query, so the box always says
  // what is shown.
  const KIND_BUTTONS = [
    ['All', null],
    ['Films', 'kind:film'],
    ['Links', 'kind:link'],
    ['Posts', 'kind:post'],
    ['Pictures', 'has:image'],
  ];
  const tokens = () => input.value.split(/\s+/).filter(Boolean);
  function markKinds() {
    const present = new Set(tokens());
    kinds.querySelectorAll('button').forEach((button) => {
      const token = button.dataset.token;
      const on = token ? present.has(token) : !KIND_BUTTONS.some(([, t]) => t && present.has(t));
      button.setAttribute('aria-pressed', String(on));
    });
  }
  KIND_BUTTONS.forEach(([label, token]) => {
    const button = el('button', null, label);
    button.type = 'button';
    if (token) button.dataset.token = token;
    button.addEventListener('click', () => {
      const others = tokens().filter((t) => !KIND_BUTTONS.some(([, k]) => k === t));
      const on = token && !tokens().includes(token);
      input.value = [...others, ...(on ? [token] : [])].join(' ');
      update();
    });
    kinds.append(button);
  });

  function update() {
    limit = PAGE;
    const url = new URL(window.location.href);
    if (input.value.trim()) url.searchParams.set('q', input.value.trim());
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url);
    draw();
  }

  let timer = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(update, 90);
  });
  input.value = new URL(window.location.href).searchParams.get('q') || '';

  more.addEventListener('click', () => {
    limit += PAGE;
    draw();
  });

  // Pointer or keyboard over a row shows it; a click (not on its link) pins it.
  const rowOf = (target) => target.closest && target.closest('.feed-row');
  body.addEventListener('mouseover', (event) => {
    const tr = rowOf(event.target);
    if (tr) showPlate(byId.get(tr.dataset.id));
  });
  body.addEventListener('mouseleave', () => showPlate(pinned));
  body.addEventListener('focusin', (event) => {
    const tr = rowOf(event.target);
    if (tr) showPlate(byId.get(tr.dataset.id));
  });
  body.addEventListener('click', (event) => {
    const tr = rowOf(event.target);
    if (!tr) return;
    const e = byId.get(tr.dataset.id);
    pinned = pinned === e ? null : e;
    body.querySelectorAll('.is-pinned').forEach((r) => r.classList.remove('is-pinned'));
    if (pinned) tr.classList.add('is-pinned');
    showPlate(pinned || e);
  });
  // Up and down move between rows; Enter pins the entry, Enter again opens it.
  body.addEventListener('keydown', (event) => {
    const tr = rowOf(event.target);
    if (!tr) return;
    const step = { ArrowDown: 'nextElementSibling', ArrowUp: 'previousElementSibling' }[event.key];
    if (step) {
      let next = tr[step];
      while (next && !next.classList.contains('feed-row')) next = next[step];
      if (next) {
        event.preventDefault();
        next.focus();
      }
    } else if (event.key === 'Enter' && event.target === tr) {
      const e = byId.get(tr.dataset.id);
      if (pinned === e) window.open(e.url, '_blank', 'noopener');
      else tr.click();
    }
  });

  load(root.dataset.api, (entries) => {
    all = entries;
    byId.clear();
    entries.forEach((e) => byId.set(e.id, e));
    draw();
  }, () => {
    status.textContent = 'The feed could not be reached.';
  });
  showPlate(null);
}

// ---- The recent list -----------------------------------------------------

function recentList(root) {
  const body = root.querySelector('tbody');
  const count = Number(root.dataset.count) || 6;
  load(root.dataset.api, (entries) => {
    const latest = [...entries].sort((a, b) => b.date - a.date).slice(0, count);
    body.replaceChildren(...latest.map((e) => row(e, true)));
  }, () => {
    root.hidden = true;
  });
}

document.querySelectorAll('.feed').forEach(feedPage);
document.querySelectorAll('.feed-recent').forEach(recentList);
