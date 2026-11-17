// Unit tests for the feed's data handling: items → entries, the query
// language, and matching. Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { entry, parseQuery, matches, byMonth } from '../themes/folio/assets/js/feed/data.js';

const film = {
  id: 'lbx:kal-ho-naa-ho', source: 'letterboxd', type: 'watched', occurred_at: Date.UTC(2026, 9, 12),
  title: 'Kal Ho Naa Ho', url: 'https://letterboxd.com/x/film/kal-ho-naa-ho/', body: 'rohit deserved better',
  rating: 2.5, poster: 'https://a.ltrbxd.com/poster.jpg', media: null, tags: null,
  meta: { year: 2003, rewatch: false, liked: true },
};
const saved = {
  id: 'curius:1', source: 'curius', type: 'saved', occurred_at: Date.UTC(2026, 10, 2),
  title: 'Serial comma', url: 'https://en.wikipedia.org/wiki/Serial_comma', body: 'In English punctuation, a serial comma…',
  rating: null, poster: null, media: null, tags: null, meta: { favorite: true, toRead: false },
};
const drop = {
  id: 'tg:7', source: 'telegram', type: 'drop', occurred_at: Date.UTC(2025, 4, 20),
  title: null, url: 'https://www.substack.com/p/goats',
  body: 'We need more goat sacrifices\n\nhttps://www.substack.com/p/goats', rating: null, poster: null,
  media: [{ type: 'photo', url: 'https://feed.example/m/1.jpg', width: 800, height: 600 }], tags: null, meta: {},
};
const bare = {
  id: 'tg:8', source: 'telegram', type: 'drop', occurred_at: Date.UTC(2025, 4, 21),
  title: null, url: 'https://media.example.io/feature/fast-food', body: 'https://media.example.io/feature/fast-food',
  rating: null, poster: null, media: null, tags: null,
  meta: { preview: { title: 'Fast Food, Slow Cities', description: 'A magazine.', image: 'https://media.example.io/og.png' } },
};
const entries = [film, saved, drop, bare].map(entry);
const [e1, e2, e3, e4] = entries;
const find = (q) => entries.filter((e) => matches(e, parseQuery(q))).map((e) => e.id);

test('entry names kinds plainly and keeps the site without www', () => {
  assert.deepEqual(entries.map((e) => e.kind), ['film', 'link', 'post', 'post']);
  assert.equal(e1.site, 'letterboxd.com');
  assert.equal(e3.site, 'substack.com');
});

test('entry titles a post from its first line of text, else its preview, else its address', () => {
  assert.equal(e3.title, 'We need more goat sacrifices');
  assert.equal(e3.text, '');
  assert.equal(e4.title, 'Fast Food, Slow Cities');
  assert.equal(entry({ ...bare, meta: {} }).title, 'Fast food');
  // A bare link titles itself from its slug, else falls back to its address.
  assert.equal(entry({ ...bare, meta: {}, url: 'https://x.com/p/we-need-more-goat-sacrifices', body: '' }).title, 'We need more goat sacrifices');
  assert.equal(entry({ ...bare, meta: {}, url: 'https://x.com/status/1529452415346302976', body: '' }).title, 'x.com/status/1529452415346302976');
});

test('entry takes a post\'s address from its text when it has none of its own', () => {
  const e = entry({ ...bare, url: null, meta: {}, body: 'https://www.wired.com/2013/02/james-hamilton-amazon/' });
  assert.equal(e.url, 'https://www.wired.com/2013/02/james-hamilton-amazon/');
  assert.equal(e.site, 'wired.com');
  assert.equal(e.title, 'James hamilton amazon');
});

test('entry picks one image: poster, else attached photo, else preview', () => {
  assert.equal(e1.image, 'https://a.ltrbxd.com/poster.jpg');
  assert.equal(e3.image, 'https://feed.example/m/1.jpg');
  assert.equal(e4.image, 'https://media.example.io/og.png');
  assert.equal(e2.image, null);
});

test('parseQuery separates words, phrases, exclusions and field filters', () => {
  const q = parseQuery('goat "serial comma" -rohit kind:film rating:>=4 site:substack has:image is:fav year:2025');
  assert.deepEqual(q.terms, ['goat', 'serial comma']);
  assert.deepEqual(q.not, ['rohit']);
  assert.deepEqual(q.kind, ['film']);
  assert.deepEqual(q.rating, { op: '>=', value: 4 });
  assert.deepEqual(q.site, ['substack']);
  assert.deepEqual(q.has, ['image']);
  assert.deepEqual(q.is, ['fav']);
  assert.deepEqual(q.year, [2025]);
});

test('matches needs every word, anywhere in title, text, site or tags', () => {
  assert.deepEqual(find('goat'), ['tg:7']);
  assert.deepEqual(find('serial english'), ['curius:1']);
  assert.deepEqual(find('wikipedia'), ['curius:1']);
  assert.deepEqual(find('"slow cities"'), ['tg:8']);
  assert.deepEqual(find('rohit'), ['lbx:kal-ho-naa-ho']);
  assert.deepEqual(find('-rohit kind:film'), []);
});

test('matches applies field filters', () => {
  assert.deepEqual(find('kind:film'), ['lbx:kal-ho-naa-ho']);
  assert.deepEqual(find('kind:post,link'), ['curius:1', 'tg:7', 'tg:8']);
  assert.deepEqual(find('rating:>=3'), []);
  assert.deepEqual(find('rating:<3'), ['lbx:kal-ho-naa-ho']);
  assert.deepEqual(find('site:wiki'), ['curius:1']);
  assert.deepEqual(find('has:image -kind:film'), ['tg:7', 'tg:8']);
  assert.deepEqual(find('has:review'), ['lbx:kal-ho-naa-ho']);
  assert.deepEqual(find('is:fav'), ['curius:1']);
  assert.deepEqual(find('is:liked'), ['lbx:kal-ho-naa-ho']);
  assert.deepEqual(find('year:2025'), ['tg:7', 'tg:8']);
  assert.deepEqual(find('year:2003'), ['lbx:kal-ho-naa-ho']); // a film's release year counts too
});

test('byMonth groups newest first, keeping order within a month', () => {
  const months = byMonth(entries);
  assert.deepEqual(months.map((m) => m.key), ['2026-11', '2026-10', '2025-05']);
  assert.deepEqual(months[2].entries.map((e) => e.id), ['tg:8', 'tg:7']);
});
