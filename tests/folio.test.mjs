// Unit tests for the pure parts of the folio theme's scripts.
// Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { planPages } from '../themes/folio/assets/js/paginate.js';
import { rank, snippet } from '../themes/folio/assets/js/search.js';

const block = (height, extra = {}) => ({ height, ...extra });
const section = (height) => block(height, { section: true });

test('planPages keeps blocks together while they fit', () => {
  assert.deepEqual(planPages([block(100), block(100), block(100)], 400), [[0, 1, 2]]);
});

test('planPages starts a new page when a block would overflow', () => {
  assert.deepEqual(planPages([block(300), block(150), block(50)], 400), [[0], [1, 2]]);
});

test('planPages starts each section on a new page in section mode', () => {
  const blocks = [block(50), section(20), block(50), section(20), block(50)];
  assert.deepEqual(planPages(blocks, 1000, 'section'), [[0], [1, 2], [3, 4]]);
});

test('planPages lets sections share a page in flow mode', () => {
  const blocks = [block(50), section(20), block(50), section(20), block(50)];
  assert.deepEqual(planPages(blocks, 1000, 'flow'), [[0, 1, 2, 3, 4]]);
});

test('planPages never leaves a heading alone at the bottom of a page', () => {
  const blocks = [block(350), block(30, { heading: true }), block(100)];
  assert.deepEqual(planPages(blocks, 400, 'flow'), [[0], [1, 2]]);
});

test('planPages honours forced breaks', () => {
  const blocks = [block(10), block(0, { pagebreak: true }), block(10)];
  assert.deepEqual(planPages(blocks, 1000), [[0], [1, 2]]);
});

test('planPages gives an oversized block its own page instead of an empty one', () => {
  assert.deepEqual(planPages([block(900), block(10)], 400), [[0], [1]]);
  assert.deepEqual(planPages([block(10), block(900)], 400), [[0], [1]]);
});

test('planPages does not open with an empty page when the first block is a section', () => {
  assert.deepEqual(planPages([section(20), block(10)], 400, 'section'), [[0, 1]]);
});

test('planPages keeps the first section on the same page as the document head', () => {
  const blocks = [block(100, { lead: true }), section(20), block(50), section(20), block(50)];
  assert.deepEqual(planPages(blocks, 1000, 'section'), [[0, 1, 2], [3, 4]]);
});

test('planPages does not leave a blank page between a forced break and a section', () => {
  const blocks = [block(100), block(0, { pagebreak: true }), block(20, { section: true, heading: true }), block(50)];
  assert.deepEqual(planPages(blocks, 900, 'section'), [[0], [1, 2, 3]]);
});

test('planPages keeps a heading with a following block that is taller than a page', () => {
  const blocks = [block(100), block(30, { heading: true }), block(2000)];
  assert.deepEqual(planPages(blocks, 400, 'flow'), [[0], [1, 2]]);
});

test('planPages counts the marginalia of the block a heading is kept with', () => {
  const blocks = [block(800), block(30, { heading: true }), block(50, { extent: 300 })];
  assert.deepEqual(planPages(blocks, 900, 'flow'), [[0], [1, 2]]);
});

test('planPages measures a block by its marginalia when they reach further', () => {
  assert.deepEqual(planPages([block(300), block(50, { extent: 200 })], 400), [[0], [1]]);
  // Marginalia hang beside later blocks; they do not push them down.
  assert.deepEqual(planPages([block(100, { extent: 350 }), block(100)], 400), [[0, 1]]);
});

test('planPages returns no pages for no blocks', () => {
  assert.deepEqual(planPages([], 400), []);
});

const items = [
  { label: 'Now', group: 'Pages' },
  { label: 'Uses', group: 'Pages', body: 'MacBook M1 Air and a BenQ monitor' },
  { label: 'Print or save as PDF', group: 'Actions', keywords: 'download pdf' },
  { label: 'Notes', group: 'Pages' },
];

test('rank returns every item, in order, for an empty query', () => {
  assert.deepEqual(rank(items, '  ').map((r) => r.item.label), ['Now', 'Uses', 'Print or save as PDF', 'Notes']);
});

test('rank prefers prefix matches over inner and fuzzy matches', () => {
  const labels = rank(items, 'no').map((r) => r.item.label);
  assert.deepEqual(labels.slice(0, 2), ['Now', 'Notes']);
});

test('rank matches keywords and body text, and quotes the body', () => {
  assert.equal(rank(items, 'download')[0].item.label, 'Print or save as PDF');
  const [hit] = rank(items, 'benq');
  assert.equal(hit.item.label, 'Uses');
  assert.match(hit.snippet, /BenQ/);
});

test('rank drops items that do not match at all', () => {
  assert.deepEqual(rank(items, 'zzz'), []);
});

test('snippet trims long text around the match with ellipses', () => {
  const text = 'a'.repeat(100) + 'needle' + 'b'.repeat(100);
  const s = snippet(text, 100, 6, 10);
  assert.equal(s, '…' + 'a'.repeat(10) + 'needle' + 'b'.repeat(10) + '…');
});
