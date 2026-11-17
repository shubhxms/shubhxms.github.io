// Ranks palette items against a query.
//
// An item is { label, group, keywords?, body? }. Each word of the query must
// match the item somewhere: fuzzily in the label (letters in order, best at
// word starts and in runs), or else as plain text in its keywords, or else
// in its body. Label matches outrank keyword matches, which outrank body
// matches; a body match carries a snippet of the text around it.

const BONUS = { match: 1, boundary: 8, first: 4, run: 6 };
const GAP = 0.25;
const KEYWORD = 2;
const BODY = 1;
// Shorter words match labels only: a letter or two is in almost any body.
const MIN_TEXT_TERM = 3;

const isWordChar = (ch) => /[\p{L}\p{N}]/u.test(ch);
const isBoundary = (text, at) => at === 0 || !isWordChar(text[at - 1])
  || (/\p{Lu}/u.test(text[at]) && /\p{Ll}/u.test(text[at - 1]));

// The best way to find `term`'s letters, in order, in `text`: its score and
// the indices it matched. Null when there is none, or when too many letters
// land mid-word with nothing before them (strewn too thinly to mean much).
export function fuzzy(term, label) {
  const text = label.toLowerCase();
  const m = term.length;
  const n = text.length;
  if (!m || m > n) return null;

  // best[i][j]: best score with term[i] matched at text[j]; from[i][j]: where
  // term[i - 1] was matched; loose[i][j]: letters so far neither at a word
  // start nor right after the previous one.
  const best = Array.from({ length: m }, () => new Array(n).fill(-Infinity));
  const from = Array.from({ length: m }, () => new Array(n).fill(-1));
  const loose = Array.from({ length: m }, () => new Array(n).fill(0));

  for (let i = 0; i < m; i += 1) {
    for (let j = i; j < n; j += 1) {
      if (text[j] !== term[i]) continue;
      const boundary = isBoundary(label, j);
      const base = BONUS.match + (boundary ? BONUS.boundary : 0) + (j === 0 ? BONUS.first : 0);
      if (i === 0) {
        best[i][j] = base - GAP * 0.2 * j;
        loose[i][j] = boundary ? 0 : 1;
        continue;
      }
      for (let k = i - 1; k < j; k += 1) {
        if (best[i - 1][k] === -Infinity) continue;
        const run = k === j - 1;
        const score = best[i - 1][k] + base + (run ? BONUS.run : 0) - GAP * (j - k - 1);
        if (score > best[i][j]) {
          best[i][j] = score;
          from[i][j] = k;
          loose[i][j] = loose[i - 1][k] + (boundary || run ? 0 : 1);
        }
      }
    }
  }

  let end = -1;
  for (let j = 0; j < n; j += 1) {
    if (best[m - 1][j] > (end === -1 ? -Infinity : best[m - 1][end])) end = j;
  }
  if (end === -1 || loose[m - 1][end] > Math.floor(m / 3)) return null;

  const indices = [];
  for (let i = m - 1, j = end; i >= 0; j = from[i][j], i -= 1) indices.unshift(j);
  return { score: best[m - 1][end], indices };
}

// The text around `text[at, at + length)`, `radius` characters either side.
export function snippet(text, at, length, radius = 50) {
  const start = Math.max(0, at - radius);
  const end = Math.min(text.length, at + length + radius);
  const before = start > 0 ? '…' : '';
  const after = end < text.length ? '…' : '';
  return before + text.slice(start, end).trim() + after;
}

// Where `term` starts a word in `text`, or -1.
function wordAt(text, term) {
  if (term.length < MIN_TEXT_TERM || !text) return -1;
  const lower = text.toLowerCase();
  for (let at = lower.indexOf(term); at !== -1; at = lower.indexOf(term, at + 1)) {
    if (isBoundary(text, at)) return at;
  }
  return -1;
}

function match(item, terms) {
  let score = 0;
  const indices = new Set();
  let quote;
  for (const term of terms) {
    const label = fuzzy(term, item.label);
    if (label) {
      score += label.score;
      label.indices.forEach((index) => indices.add(index));
      continue;
    }
    if (wordAt(item.keywords, term) !== -1) {
      score += KEYWORD;
      continue;
    }
    const at = wordAt(item.body, term);
    if (at === -1) return null;
    score += BODY;
    quote ??= snippet(item.body, at, term.length);
  }
  const result = { item, score: score - 0.01 * item.label.length, indices: [...indices].sort((a, b) => a - b) };
  if (quote) result.snippet = quote;
  return result;
}

export function rank(items, rawQuery) {
  const terms = rawQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return items.map((item) => ({ item, score: 1, indices: [] }));

  return items
    .map((item, order) => ({ order, result: match(item, terms) }))
    .filter(({ result }) => result)
    .sort((a, b) => b.result.score - a.result.score || a.order - b.order)
    .map(({ result }) => result);
}

// Orders ranked results into groups. With nothing typed, groups follow
// `order`; while typing, the group holding the best match comes first.
// Within a group, results keep their rank.
export function arrange(results, order, query) {
  const groups = new Map();
  results.forEach((result) => {
    const name = result.item.group;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(result);
  });

  const position = (name) => (order.includes(name) ? order.indexOf(name) : order.length);
  const best = (name) => Math.max(...groups.get(name).map((result) => result.score));
  const names = [...groups.keys()].sort((a, b) =>
    (query.trim() ? best(b) - best(a) : 0) || position(a) - position(b));

  return names.flatMap((name) => groups.get(name).sort((a, b) => b.score - a.score));
}
