// Ranks palette items against a query.
//
// An item is { label, group, keywords?, body? }. Matches on the label beat
// matches on keywords, which beat matches in the body; a body match carries a
// snippet of the text around it.

const SCORE = { prefix: 100, inner: 80, fuzzy: 40, keyword: 30, body: 10 };

// Letters of `query` appear in `text` in order (e.g. "prt" in "print").
function isSubsequence(query, text) {
  let at = 0;
  for (const ch of text) {
    if (ch === query[at]) at += 1;
    if (at === query.length) return true;
  }
  return false;
}

function scoreLabel(label, query) {
  if (label.startsWith(query)) return SCORE.prefix;
  if (label.includes(query)) return SCORE.inner;
  if (isSubsequence(query, label)) return SCORE.fuzzy;
  return 0;
}

// The text around `text[at, at + length)`, `radius` characters either side.
export function snippet(text, at, length, radius = 50) {
  const start = Math.max(0, at - radius);
  const end = Math.min(text.length, at + length + radius);
  const before = start > 0 ? '…' : '';
  const after = end < text.length ? '…' : '';
  return before + text.slice(start, end).trim() + after;
}

export function rank(items, rawQuery) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return items.map((item) => ({ item, score: 1 }));

  const results = [];
  items.forEach((item, order) => {
    const label = scoreLabel(item.label.toLowerCase(), query);
    const keyword = (item.keywords || '').toLowerCase().includes(query) ? SCORE.keyword : 0;
    const bodyAt = (item.body || '').toLowerCase().indexOf(query);
    const body = bodyAt >= 0 ? SCORE.body : 0;

    const score = Math.max(label, keyword, body);
    if (score === 0) return;

    const result = { item, score, order };
    if (score === SCORE.body) result.snippet = snippet(item.body, bodyAt, query.length);
    results.push(result);
  });

  return results
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ order, ...result }) => result);
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
