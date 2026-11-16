#!/usr/bin/env bash
# Builds the site (with fixture pages) and checks the folio theme's output.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

hugo --quiet --source "$ROOT" --destination "$OUT" \
	--config "$ROOT/hugo.toml,$ROOT/tests/hugo.test.toml" --enableGitInfo

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

# Title page, modelled on a book's frontmatter.
has index.html 'class="sheet sheet--title"'
grep -Eq '<p class="title-edition">[A-Z][a-z]+(-[a-z]+)? Edition</p>' "$OUT/index.html" \
	|| fail 'index.html should open with a spelled-out edition'
has index.html '<h1 class="title-name">'
has index.html 'class="title-imprint"'
has index.html 'data-pages="flow"'

# Documents: one flowing sheet that the paginator splits; ToC from h2s.
has now/index.html 'class="sheet" data-flow'
has uses/index.html 'class="doc-toc"'
has uses/index.html 'href="#devices"'
lacks now/index.html 'class="doc-toc"'

# Colophon: last commit for this page, source, markdown and print.
has now/index.html 'class="colophon"'
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
has fixture-typesetting/index.html 'class="pagebreak"'
has fixture-typesetting/index.html 'class="callout"'
has sarabhai/index.html 'class="marginfigure"'

# Pages that keep their own scripts still build.
has feed/index.html 'id="feed-root"'

printf 'folio smoke tests passed\n'
