// The feed's data: raw items from the feed API made into entries, a small
// query language over them, and grouping by month. No DOM here.
//
// Query language (words AND together; case and accents ignored):
//   word  "a phrase"  -word         text in title, text, site or tags
//   kind:film,link,post             what it is (several: any of them)
//   site:substack                   part of the site's name
//   year:2025                       year it was added (or a film's year)
//   rating:>=4  rating:<3  rating:5 a film's rating
//   has:image  has:review  has:text
//   is:fav  is:liked  is:rewatch
//   order:old                       oldest first
// Prefix any filter with - to exclude it: -kind:film, -has:image.

const KINDS = { watched: 'film', saved: 'link', drop: 'post' };
const URL_LINE = /^\s*https?:\/\/\S+\s*$/;

const fold = (text) => (text || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

function siteOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, '');
  } catch {
    return url || '';
  }
}

// A readable title from a link's last path segment ("we-need-more-goats"
// → "We need more goats"), when it reads like words; else null.
function slugTitle(url) {
  try {
    const segment = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || '');
    const words = segment.replace(/\.[a-z0-9]{2,5}$/i, '').split(/[-_+]+/).filter(Boolean);
    if (words.length < 2 || !words.some((w) => /[a-z]{3,}/i.test(w))) return null;
    const text = words.join(' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  } catch {
    return null;
  }
}

export function entry(item) {
  const meta = item.meta || {};
  const preview = meta.preview || {};
  const lines = (item.body || '').split('\n').map((line) => line.trim()).filter(Boolean);
  // Some posts carry their link only in their text.
  const url = item.url || (lines.find((line) => URL_LINE.test(line)) || '').trim() || null;
  const prose = lines.filter((line) => !URL_LINE.test(line));

  let title = item.title;
  let text = item.body || '';
  if (item.type === 'drop') {
    title = prose[0] || preview.title || slugTitle(url) || shortUrl(url);
    text = prose.slice(1).join('\n') || (prose.length ? '' : preview.description || '');
  }

  const photo = (item.media || []).find((m) => m && m.url);
  return {
    id: item.id,
    kind: KINDS[item.type] || item.type,
    date: item.occurred_at,
    title: title || shortUrl(url),
    text: text.trim(),
    url,
    site: siteOf(url),
    tags: item.tags || [],
    image: item.poster || (photo && photo.url) || preview.image || null,
    rating: item.rating == null ? null : Number(item.rating),
    year: meta.year || null,
    fav: Boolean(meta.favorite),
    liked: Boolean(meta.liked),
    rewatch: Boolean(meta.rewatch),
  };
}

const FIELDS = ['kind', 'site', 'year', 'rating', 'has', 'is', 'order'];

export function parseQuery(raw) {
  const query = { terms: [], not: [], kind: [], site: [], year: [], has: [], is: [], rating: null, order: 'new', exclude: [] };
  const tokens = (raw || '').match(/-?"[^"]*"?|\S+/g) || [];
  for (let token of tokens) {
    const negative = token.startsWith('-') && token.length > 1;
    if (negative) token = token.slice(1);

    const field = token.match(/^(\w+):(.*)$/);
    if (field && FIELDS.includes(field[1].toLowerCase()) && field[2]) {
      const name = field[1].toLowerCase();
      const value = fold(field[2]);
      if (name === 'rating') {
        const m = value.match(/^(>=|<=|>|<|=)?(\d+(?:\.\d+)?)$/);
        if (m) query.rating = { op: m[1] || '=', value: Number(m[2]) };
      } else if (name === 'order') {
        query.order = value === 'old' ? 'old' : 'new';
      } else {
        const values = value.split(',').filter(Boolean).map((v) => (name === 'year' ? Number(v) : v));
        if (negative) query.exclude.push({ name, values });
        else query[name].push(...values);
      }
      continue;
    }

    const word = fold(token.replace(/^"|"$/g, '')).trim();
    if (!word) continue;
    (negative ? query.not : query.terms).push(word);
  }
  return query;
}

const RATING = {
  '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '<': (a, b) => a < b, '=': (a, b) => a === b,
};

const TESTS = {
  kind: (e, v) => e.kind === v,
  site: (e, v) => fold(e.site).includes(v),
  year: (e, v) => new Date(e.date).getUTCFullYear() === v || e.year === v,
  has: (e, v) => (v === 'image' ? Boolean(e.image) : v === 'review' ? e.kind === 'film' && Boolean(e.text) : v === 'text' ? Boolean(e.text) : false),
  is: (e, v) => (v === 'fav' ? e.fav : v === 'liked' ? e.liked : v === 'rewatch' ? e.rewatch : false),
};

const anyOf = (e, name, values) => values.some((v) => TESTS[name](e, v));

export function matches(e, query) {
  const haystack = e._haystack || (e._haystack = fold([e.title, e.text, e.site, ...e.tags].join(' \n ')));
  if (!query.terms.every((term) => haystack.includes(term))) return false;
  if (query.not.some((term) => haystack.includes(term))) return false;
  for (const name of ['kind', 'site', 'year', 'has', 'is']) {
    if (query[name].length && !anyOf(e, name, query[name])) return false;
  }
  if (query.exclude.some(({ name, values }) => anyOf(e, name, values))) return false;
  if (query.rating && (e.rating == null || !RATING[query.rating.op](e.rating, query.rating.value))) return false;
  return true;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Entries by month, newest month first; entries keep their order within it.
export function byMonth(list, order = 'new') {
  const sorted = [...list].sort((a, b) => (order === 'old' ? a.date - b.date : b.date - a.date));
  const months = [];
  for (const e of sorted) {
    const d = new Date(e.date);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (months[months.length - 1]?.key !== key) {
      months.push({ key, label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`, entries: [] });
    }
    months[months.length - 1].entries.push(e);
  }
  return months;
}
