// Unit tests for the pure parts of the folio theme's scripts.
// Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { sectionAt, position } from '../themes/folio/assets/js/sections.js';
import { rank, snippet, arrange } from '../themes/folio/assets/js/search.js';

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

const r = (label, group, score) => ({ item: { label, group }, score });
const ORDER = ['Sections', 'Pages', 'Move', 'View'];

test('arrange keeps groups in their fixed order when nothing is typed', () => {
  const results = [r('Zoom in', 'View', 1), r('Now', 'Pages', 1), r('Next', 'Move', 1), r('Uses', 'Pages', 1)];
  assert.deepEqual(arrange(results, ORDER, '').map((x) => x.item.label), ['Now', 'Uses', 'Next', 'Zoom in']);
});

test('arrange puts the group with the best match first while typing', () => {
  const results = [r('Zoom in', 'View', 100), r('Notes', 'Pages', 40), r('Now', 'Pages', 80)];
  assert.deepEqual(arrange(results, ORDER, 'zo').map((x) => x.item.label), ['Zoom in', 'Now', 'Notes']);
});

import { geometry, TEXT_STEPS } from '../themes/folio/assets/js/layout.js';

test('geometry fills the room, within the sheet limits, in whole pixels', () => {
  const small = geometry(500);
  const mid = geometry(900);
  const huge = geometry(3000);
  assert.equal(small.sheet, 680);
  assert.equal(mid.sheet, 900);
  assert.equal(huge.sheet, 1200);
  for (const g of [small, mid, huge]) {
    for (const value of Object.values(g)) assert.ok(Number.isInteger(value), JSON.stringify(g));
    assert.equal(g.padLeft + g.text + g.gutter + g.note + g.padRight, g.sheet);
  }
});

test('geometry sets type for a comfortable measure, larger on wider sheets', () => {
  const mid = geometry(900);
  const huge = geometry(3000);
  assert.ok(mid.type >= 16 && mid.type <= 18, mid.type);
  assert.ok(huge.type > mid.type);
  // About 30–34 ems of text a line: 70–80 characters of Crimson.
  for (const g of [mid, huge]) assert.ok(g.text / g.type > 29 && g.text / g.type < 35, JSON.stringify(g));
});

test('geometry scales type, not the page, when asked for larger text', () => {
  const normal = geometry(900, 1);
  const larger = geometry(900, TEXT_STEPS[TEXT_STEPS.length - 1]);
  assert.equal(larger.sheet, normal.sheet);
  assert.equal(larger.text, normal.text);
  assert.ok(larger.type > normal.type);
});
