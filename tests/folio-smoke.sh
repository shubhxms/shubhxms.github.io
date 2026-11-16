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

# Shell: paper on a desk, sidebar on the right, reader controls and palette.
for page in index.html now/index.html notes/index.html fixture-typesetting/index.html; do
	has "$page" 'class="desk"'
	has "$page" 'class="sidebar"'
	has "$page" 'class="reader"'
	has "$page" '<dialog class="palette"'
	has "$page" '/js/folio.'
	lacks "$page" 'layout-side-rail'
	lacks "$page" 'heading-index'
	lacks "$page" 'roman-numerals'
done
has now/index.html 'class="active-page">★ Now</a>'

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
has notes/index.html 'class="doc-kicker">1 entry<'

# Documents: one continuous sheet. A big header (kicker, title,
# contents) gives way on scroll to a compact bar, inert until shown.
has now/index.html '<article class="sheet sheet--doc'
lacks now/index.html 'data-flow'
lacks now/index.html 'sheet-head'
# Length and reading time only where turned on (stats: true; notes cascade it).
grep -Eq 'class="doc-kicker">[^<]*[0-9]+ words [^<]* [0-9]+ min read<' "$OUT/sarabhai/index.html" || fail 'a note kicker should read "… N words · N min read"'
lacks now/index.html 'min read'
lacks uses/index.html 'doc-kicker'

# Layout: "paper" (a sheet on a desk, with floating controls) or "plain"
# (the page is the site), set in hugo.toml and switchable from the palette.
has index.html 'data-layout-default="plain"'

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

# Pages that keep their own scripts still build.
has feed/index.html 'id="feed-root"'

# Side-column heads apply only to a page's own (top-level) sections, so
# headings inside lists (the archive's years) stay put.
grep -q ':root\[data-heads="side"\] .sheet-body > h2 {' "$CSS" || fail 'side heads should be top-level h2s only'
# In side mode every page keeps the side column, so text starts at the same
# place; pages without sections set an ornament there.
grep -q ':root\[data-heads="side"\] .sheet--flat .doc-head::after {' "$CSS" || fail 'flat pages should mark the side column'
! grep -Fq '.sheet:not(.sheet--flat)' "$CSS" || fail 'the side column should not depend on sections'
! grep -Fq 'side-bare' "$CSS" || fail 'side-bare is gone: side heads have no rule across'

printf 'folio smoke tests passed\n'
