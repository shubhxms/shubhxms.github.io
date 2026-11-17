#!/usr/bin/env bash
# Builds the site (with fixture pages) and checks the folio theme's output.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

# Hugo prints build errors only when not --quiet; keep them, drop the rest.
hugo --source "$ROOT" --destination "$OUT" \
	--config "$ROOT/hugo.toml,$ROOT/tests/hugo.test.toml" --enableGitInfo >/dev/null

fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }
has() { grep -Fq -- "$2" "$OUT/$1" || fail "$1 should contain: $2"; }
lacks() { ! grep -Fq -- "$2" "$OUT/$1" || fail "$1 should not contain: $2"; }

# Shell: paper on a desk, sidebar on the right (with light, dark and ⌘K on
# one line), and the palette; no floating reader controls.
for page in index.html now/index.html notes/index.html fixture-typesetting/index.html; do
	has "$page" 'class="desk"'
	has "$page" 'class="sidebar"'
	lacks "$page" 'class="reader"'
	lacks "$page" 'class="mobile-menu"'
	has "$page" '<a class="site-title" href="/">'
	lacks "$page" 'sidebar-art'
	has "$page" '<div class="sidebar-tools">'
	has "$page" '<dialog class="palette"'
	has "$page" '/js/folio.'
	lacks "$page" 'layout-side-rail'
	lacks "$page" 'heading-index'
	lacks "$page" 'roman-numerals'
done
has now/index.html 'class="active-page" aria-current="page">★ Now</a>'

# Home: one sheet, opening with a title-page header (edition, name,
# subtitle) and running straight into the content.
lacks index.html 'sheet--title'
lacks index.html 'class="postcard'
lacks index.html 'title-block'
has index.html '<header class="doc-head doc-head--title">'
lacks index.html 'title-card'
has index.html '<p class="title-edition">Second Edition</p>'
has index.html '<h1 class="title-name">Shubham Shah</h1>'
has index.html 'id="contact"'

# Abstracts live where pages are listed, not on the pages themselves.
lacks sarabhai/index.html 'class="doc-tldr"'
has notes/index.html '<h2 class="archive-year">2026</h2>'
has notes/index.html '<time class="archive-date" datetime="2026-02-13">13 Feb</time>'
has notes/index.html '<p class="archive-abstract">In this I gather some thoughts'
lacks notes/index.html 'contents-leader'
grep -Eq 'class="doc-kicker">[0-9]+ entr(y|ies)<' "$OUT/notes/index.html" || fail 'a list kicker should count its entries'

# Documents: one continuous sheet. A big header (kicker, title,
# contents) gives way on scroll to a compact bar, inert until shown.
has now/index.html '<article class="sheet sheet--doc'
lacks now/index.html 'data-flow'
lacks now/index.html 'sheet-head'
# Length and reading time only where turned on (stats: true; notes cascade it).
grep -Eq 'class="doc-kicker">[^<]*[0-9]+ words [^<]* [0-9]+ min read<' "$OUT/sarabhai/index.html" || fail 'a note kicker should read "… N words · N min read"'
lacks now/index.html 'min read'
lacks uses/index.html 'doc-kicker'

# Layout: "paper" (a sheet on a desk) or "plain" (the page is the site),
# and section heads, "side" or "inline": set in hugo.toml only, not saved
# per reader, and not offered in the palette.
has index.html 'data-layout-default="plain"'
lacks index.html 'folio-layout'
lacks index.html 'folio-heads'
! grep -Eq "layout-(paper|plain)|heads-(side|inline)" "$ROOT/themes/folio/assets/js/palette.js" "$ROOT/themes/folio/assets/js/main.js" || fail 'the palette should not switch layouts or heads'

# No test content ships: test notes or TEST NOTE sidenotes.
! grep -rlq 'TEST' "$ROOT/content" || fail "test content should not ship: $(grep -rl 'TEST' "$ROOT/content" | head -3)"

# Section heads: "side" (names in a side column beyond a dotted rule) or
# "inline" (underlined headings in the text). Only a page's own sections
# hang in the side column, and pages without sections have none.
has index.html 'data-heads-default="side"'
has contact/index.html 'class="sheet sheet--doc sheet--flat"'
lacks uses/index.html 'sheet--flat'
has index.html 'dataset.layout'
has now/index.html '<div class="doc-bar" inert>'
has now/index.html '<span class="doc-bar-title">Now</span>'
lacks now/index.html 'class="doc-toc"'
has uses/index.html 'class="doc-toc"'
has uses/index.html '<li><a href="#devices">Devices</a></li>'
lacks uses/index.html 'doc-toc-n'
has index.html '<div class="doc-bar" inert>'

# Colophon: last commit for this page, source, markdown and print.
has now/index.html 'class="colophon"'
has now/index.html 'class="colophon-subject"'
python3 - "$OUT/now/index.html" <<'PY2' || fail 'colophon order: date, message | commit, source, .md, print'
import sys
html = open(sys.argv[1]).read()
foot = html[html.index('class="colophon"'):html.index('</footer>', html.index('class="colophon"'))]
order = ['<time', 'colophon-subject', 'colophon-actions', '/commit/', '/blob/main/', 'index.md', 'data-action="print"']
at = [foot.index(mark) for mark in order]
assert at == sorted(at), dict(zip(order, at))
PY2
python3 - "$OUT/now/index.html" <<'PY2' || fail 'the colophon should sit inside the paper'
import sys
html = open(sys.argv[1]).read()
sheet = html.index('<article class="sheet sheet--doc')
assert sheet < html.index('class="colophon"') < html.index('</article>', sheet)
PY2
has now/index.html '/commit/'
has now/index.html '/blob/main/content/pages/now.md'
has now/index.html 'href="/now/index.md"'
has now/index.html 'data-action="print"'
has now/index.md '# Now'

# Search index for the palette.
python3 - "$OUT/search.json" <<'PY' || fail 'search.json should list pages with text'
import json, sys
pages = json.load(open(sys.argv[1]))
urls = {p["url"] for p in pages}
assert "/now/" in urls and all(p["title"] for p in pages), urls
PY

# Typesetting: build-time KaTeX, marginalia, page breaks, callouts.
has fixture-typesetting/index.html 'class="katex"'
has fixture-typesetting/index.html 'katex-display'
has fixture-typesetting/index.html 'katex.min.css'
lacks fixture-typesetting/index.html '$$'
lacks fixture-typesetting/index.html '\(e^'
lacks now/index.html 'katex.min.css'
has fixture-typesetting/index.html 'class="sidenote"'
has fixture-typesetting/index.html 'class="marginnote"'
has fixture-typesetting/index.html 'class="callout"'
has sarabhai/index.html 'class="marginfigure"'
# Notes sit inside a paragraph, so their own paragraphs must not be <p>s.
has fixture-typesetting/index.html '<span class="note-para">Second paragraph.</span>'
lacks fixture-typesetting/index.html '<p>Second paragraph.</p>'
has fixture-typesetting/index.html '<p>First line<br>'
# Margin images are measured on load, so they must not load lazily.
lacks index.html 'loading="lazy"'

# Stylesheet rules the layout depends on.
CSS="$ROOT/themes/folio/assets/css/folio.css"
grep -Fq '.sheet-body figure:not(.marginfigure) {' "$CSS" || fail 'text-column figure rules must not pull margin figures back in'
grep -Fq '@media screen and (max-width: 800px)' "$CSS" || fail 'phone layout must not apply to printed A4 pages'
grep -Fq -- '--sheet-w: 860px' "$CSS" || fail 'the sheet should be wider than A4'
grep -Fq 'grid-template-columns: minmax(min-content, 1fr) var(--sidebar-width)' "$CSS" \
	|| fail 'a zoomed folio must widen the desk, not slide under the sidebar'

# Production assets are fingerprinted with integrity hashes.
grep -Eq 'href="/css/folio\.min\.[0-9a-f]{64}\.css" integrity="sha256-' "$OUT/now/index.html" \
	|| fail 'production CSS should be fingerprinted'
grep -Eq 'src="/js/folio\.min\.[0-9a-f]{64}\.js" integrity="sha256-' "$OUT/now/index.html" \
	|| fail 'production JS should be fingerprinted'

# Development assets keep stable URLs, so live reload can swap CSS in place.
DEV="$(mktemp -d)"
trap 'rm -rf "$OUT" "$DEV"' EXIT
hugo --source "$ROOT" --destination "$DEV" --environment development >/dev/null
grep -Fq 'href="/css/folio.css"' "$DEV/now/index.html" || fail 'development CSS should have a stable URL'
grep -Fq 'src="/js/folio.js"' "$DEV/now/index.html" || fail 'development JS should have a stable URL'
! grep -Fq 'integrity=' "$DEV/now/index.html" || fail 'development assets should carry no integrity hash'

# The feed: a searchable table set on the paper, with its own script, and
# none of the old activity wall.
has feed/index.html 'class="sheet sheet--doc'
has feed/index.html '<table class="feed-table">'
has feed/index.html 'data-api="https://feed.shubhxms.workers.dev"'
grep -Eq '<script src="/js/feed(\.min\.[0-9a-f]+)?\.js"' "$OUT/feed/index.html" || fail 'the feed page should load the feed script'
lacks feed/index.html 'feed-root'
lacks now/index.html '/js/feed'
# The home page sets the feed's latest entries and the shelf's picks side
# by side, and no longer carries the stepwell photograph.
has index.html '<div class="lately">'
has index.html '>20 more on the Shelf →</a>'
has index.html '>See all →</a>'
lacks index.html 'Telegram channel'
has feed/index.html '<div class="feed-body">'
grep -q '^\.feed-row a:hover {' "$CSS" || fail 'feed titles should not take the link hover'
lacks index.html 'home-header.jpg'
has index.html 'class="feed-recent"'
grep -Eq '<script src="/js/feed(\.min\.[0-9a-f]+)?\.js"' "$OUT/index.html" || fail 'the home page should load the feed script for its recent list'

# Side-column heads apply only to a page's own (top-level) sections, so
# headings inside lists (the archive's years) stay put.
grep -q ':root\[data-heads="side"\] .sheet-body > h2 {' "$CSS" || fail 'side heads should be top-level h2s only'
# In side mode every page keeps the side column, so text starts at the same
# place; pages without sections set an ornament there.
# A page that opens without a section head shows a row of small printer's
# marks (a registration mark and tone dots) in the empty side column; one
# that opens with a head would not.
has now/index.html '<span class="card-corner" aria-hidden="true">'
has now/index.html '<span class="pip pip--reg"></span><span class="pip pip--full"></span><span class="pip pip--half"></span><span class="pip pip--empty"></span>'
! grep -q 'rgb(230 0 125)' "$CSS" || fail 'the marks are black and white, no inks'
lacks core/index.html 'class="card-corner"' # opens with a comment, then a head
! grep -q -- '--spade' "$CSS" || fail 'the old spade mask should be gone'
lacks contact/index.html 'class="ornament'
! grep -q 'cursor: crosshair' "$CSS" || fail 'the page keeps the normal cursor'

# The colophon: how the site is made and what it borrows from, linked from
# the sidebar on every page.
has colophon/index.html '<h1 class="doc-title">Colophon</h1>'
has colophon/index.html 'href="https://usgraphics.com/"'
has index.html 'href="/colophon"'
! grep -Fq '.sheet:not(.sheet--flat)' "$CSS" || fail 'the side column should not depend on sections'
! grep -Fq 'side-bare' "$CSS" || fail 'side-bare is gone: side heads have no rule across'

# Raised caps: a script initial on pages that set dropcap (notes cascade it),
# with the font loaded only there, and only its capitals.
has sarabhai/index.html 'sheet--dropcap'
has sarabhai/index.html 'family=Pinyon+Script'
lacks uses/index.html 'Pinyon'
lacks uses/index.html 'sheet--dropcap'
# Notes take sign-ups with the site's own form, posting to Substack.
has notes/index.html '<form class="subscribe" action="https://shubhxms.substack.com/api/v1/free?nojs=true" method="post"'
lacks notes/index.html 'substack.com/embed'
grep -q 'sheet--dropcap .sheet-body > p:first-of-type::first-letter' "$CSS" || fail 'raised cap rule missing'

# Shelf: the visual one. Books and films from data/shelf.yaml as grids of
# covers with their names under them, one grid a section. A cover without
# an image is set in type. A cover links to its note, if it has one.
C="$OUT/shelf/index.html"
[ "$(grep -o '<li class="shelf-item"' "$C" | wc -l | tr -d ' ')" = 26 ] || fail 'the shelf should show its 26 books and films'
[ "$(grep -o '<img class="shelf-cover" src="/images/shelf/[^"]*_hu_[^"]*\.webp"' "$C" | wc -l | tr -d ' ')" = 26 ] || fail 'covers should be resized thumbnails'
# The shelf is pictures only: an entry without a cover is left off it.
lacks shelf/index.html 'shelf-cover--type'
! grep -q 'shelf-cover--type' "$CSS" || fail 'no typeset covers any more'
grep -q '{{- if .cover }}' "$ROOT/themes/folio/layouts/partials/shelf-lists.html" || fail 'the shelf should skip entries without a cover'
[ "$(grep -o '<ol class="shelf-grid">' "$C" | wc -l | tr -d ' ')" = 2 ] || fail 'one grid per section'
lacks shelf/index.html 'shelf-label'
has shelf/index.html '<a class="shelf-link" href="/sarabhai/">'
has shelf/index.html '<li class="shelf-item" id="chaos" title="Chaos — James Gleick">'
lacks shelf/index.html 'class="lede"'
has shelf/index.html '<li><a href="#films-shows--anime">Films, Shows &amp; Anime</a></li>'
lacks shelf/index.html 'shelf-wall'
lacks shelf/index.html 'shelf-row'
lacks shelf/index.html 'Dynomight'
! grep -rq 'core-' "$ROOT/themes/folio/assets" "$ROOT/themes/folio/layouts" || fail 'the shelf should not be named core anywhere'

# Core: its own page again, in Markdown, a starter pack of what makes me;
# it overlaps with the shelf, and that's fine.
has core/index.html '<h2 id="books">Books</h2>'
has core/index.html '<a href="https://dynomight.substack.com/">blog</a>'
lacks core/index.html 'shelf-row'
has index.html '<a href="/shelf">Shelf</a>'
has index.html '<a href="/core">Core</a>'
[ "$(grep -o '<a class="shelf-pick' "$OUT/index.html" | wc -l | tr -d ' ')" = 6 ] || fail 'the home page should show the six picks'
has index.html '<p class="likes">state machines · science'

printf 'folio smoke tests passed\n'
