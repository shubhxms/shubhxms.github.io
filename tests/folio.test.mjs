// Unit tests for the pure parts of the folio theme's scripts.
// Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { sectionAt, position } from '../themes/folio/assets/js/sections.js';
import { rank, snippet } from '../themes/folio/assets/js/search.js';

test('sectionAt finds the last section whose heading has reached the line', () => {
  const tops = [100, 600, 1400];
  assert.equal(sectionAt(tops, 50), -1);
  assert.equal(sectionAt(tops, 100), 0);
  assert.equal(sectionAt(tops, 900), 1);
  assert.equal(sectionAt(tops, 5000), 2);
  assert.equal(sectionAt([], 500), -1);
});

test('position numbers sections the way the contents line does', () => {
  assert.equal(position(1, 5), '02 / 05');
  assert.equal(position(-1, 5), '00 / 05');
  assert.equal(position(0, 0), '—');
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
