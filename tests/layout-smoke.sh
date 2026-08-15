#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

hugo --quiet --source "$ROOT" --destination "$OUT"

assert_contains() {
	local file="$1"
	local expected="$2"

	if ! grep -Fq -- "$expected" "$file"; then
		printf 'Expected %s to contain: %s\n' "$file" "$expected" >&2
		exit 1
	fi
}

assert_not_contains() {
	local file="$1"
	local unexpected="$2"

	if grep -Fq -- "$unexpected" "$file"; then
		printf 'Expected %s not to contain: %s\n' "$file" "$unexpected" >&2
		exit 1
	fi
}

assert_contains "$OUT/notes/index.html" '<body class="layout-reading">'
assert_contains "$OUT/projects/index.html" '<body class="layout-reading page-single">'
assert_not_contains "$OUT/notes/index.html" 'layout-columns-2'
assert_not_contains "$OUT/projects/index.html" 'layout-columns-2'
assert_contains "$OUT/notes/index.html" 'shubhxms.substack.com/embed'
assert_not_contains "$OUT/notes/index.html" 'class="substack-card"'

assert_contains "$OUT/projects/index.html" 'class="page-shell"'
assert_contains "$OUT/projects/index.html" 'class="layout-side-rail"'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '.page-single .page-content-header {'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '--main-column-width: 500px'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '.layout-wide'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '--main-column-width: 760px'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'minmax(0, var(--side-rail-width))'
assert_not_contains "$ROOT/themes/archie/assets/css/main.css" '--side-rail-left-space'
assert_contains "$OUT/sarabhai/index.html" '<body class="layout-reading page-single">'
assert_contains "$OUT/sarabhai/index.html" 'class="page-content-header"'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '--shell-left-padding: 6%'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'padding: 40px 2rem 1.5rem var(--shell-left-padding)'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'left: 0'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'top: 50%'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'Crimson Text'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'Urbanist'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'font-family: "Space Mono", monospace'
assert_not_contains "$ROOT/themes/archie/assets/css/main.css" 'Fleur De Leah'
assert_not_contains "$ROOT/themes/archie/assets/css/main.css" 'Bebas Neue'
assert_not_contains "$ROOT/themes/archie/assets/css/main.css" 'Lexend Deca'
assert_contains "$ROOT/themes/archie/assets/css/main.css" ':not(h1):not(h2):not(h3):not(h4):not(h5):not(h6)'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '.sidebar-nav a {'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'Dense editorial rhythm'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'Sidebar links are intentionally unadorned.'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'text-decoration-style: solid'
assert_not_contains "$ROOT/themes/archie/assets/css/main.css" 'text-decoration-style: dotted'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'font-size: 2rem'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'margin: 0 0 0.65rem'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '--bg: #f5faff'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '--link: #1827a3'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '--visited: #1827a3'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '--selection: #fff36d'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'width: 100%'
assert_contains "$OUT/projects/index.html" 'fonts.googleapis.com'
assert_contains "$OUT/projects/index.html" 'family=Crimson+Text'
assert_contains "$OUT/projects/index.html" 'family=Urbanist'
assert_contains "$OUT/projects/index.html" '<body class="layout-reading page-single">'
assert_contains "$OUT/feed/index.html" '<body class="layout-wide">'
assert_contains "$OUT/shelf/index.html" '<body class="layout-wide page-single">'
assert_contains "$ROOT/static/css/feed.css" 'position: fixed'
assert_contains "$ROOT/static/js/feed.js" 'function centerPanelInRail()'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'color: var(--text)'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '--side-rail-width: clamp(22rem, 30vw, 30rem)'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '--side-rail-width: 500px'
assert_contains "$ROOT/static/js/feed.js" 'if (window.innerWidth <= 800) return 2;'
assert_contains "$ROOT/static/js/feed.js" 'return 3;'
assert_not_contains "$ROOT/static/js/feed.js" 'function positionPanel()'
assert_contains "$OUT/feed/index.html" 'class="layout-side-rail"'
assert_contains "$OUT/feed/index.html" 'id="fd-panel"'
assert_contains "$OUT/feed/index.html" '/js/feed.js?v=13'
assert_contains "$OUT/feed/index.html" '/css/feed.css?v=18'
assert_contains "$OUT/feed/index.html" 'defer'
assert_contains "$ROOT/static/js/feed.js" 'youtube-nocookie.com/embed/'
assert_contains "$ROOT/static/js/feed.js" 'fd-link-preview'
assert_contains "$ROOT/static/css/feed.css" '.fd-link-preview'
assert_contains "$ROOT/static/css/feed.css" 'hyphens: none'
assert_not_contains "$OUT/projects/index.html" '<section class="side-rail" data-rail-anchor='
assert_not_contains "$OUT/projects/index.html" 'class="rail-anchor"'
assert_not_contains "$OUT/projects/index.html" 'class="sidenote"'
assert_not_contains "$OUT/projects/index.html" '/js/side-rail.js'
assert_not_contains "$OUT/sarabhai/index.html" '/js/side-rail.js'
assert_contains "$OUT/sarabhai/index.html" 'class="shell-footer"'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '/* Side-column content starts at the top and remains in normal flow. */'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '@media (max-width: 1399px)'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '/* Keep every stacked editorial block on the same measure. */'
assert_contains "$OUT/index.html" '<body class="layout-reading page-home">'
assert_contains "$OUT/index.html" 'class="home-editorial"'
assert_contains "$OUT/index.html" 'Ahmedabad is home—for now.'
assert_contains "$OUT/index.html" 'class="sidenote"'
assert_contains "$OUT/index.html" 'class="home-site-header"'
assert_contains "$OUT/index.html" 'COMPUTERS, STORIES &amp; SCIENCE · AHMEDABAD'
assert_contains "$OUT/index.html" '/images/shelf/dorian-gray.jpg'
assert_contains "$OUT/index.html" '/images/shelf/grand-budapest.jpg'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'grid-column: 1 / span 2'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'line-height: 1.1'
assert_not_contains "$OUT/index.html" 'Starter pack'
assert_not_contains "$OUT/index.html" 'home-permanent-links'
assert_contains "$OUT/index.html" 'class="home-section home-now"'
assert_contains "$OUT/index.html" 'id="some-things-i-like"'
assert_contains "$OUT/index.html" 'State machines · science · stories · storytelling'
assert_contains "$OUT/index.html" 'class="home-masthead"'
assert_not_contains "$OUT/index.html" 'home-starter-links'
assert_contains "$OUT/index.html" 'class="home-shelf-grid"'
assert_not_contains "$ROOT/themes/archie/assets/css/main.css" 'margin-top: auto'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'left: 0.65rem'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '--bg: #f5faff'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'transform: translateY(-50%)'
assert_contains "$ROOT/themes/archie/assets/css/dark.css" '--bg: #10131c'
assert_contains "$ROOT/themes/archie/assets/css/dark.css" '--link: #ffd166'
assert_contains "$ROOT/themes/archie/assets/css/dark.css" '--selection: #3656c9'
assert_contains "$ROOT/themes/archie/assets/css/dark.css" '--selection-text: #fff'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '.heading-index.is-open .heading-index-inner {'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'font-size: clamp(3.25rem, 5.5vw, 5.5rem)'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '.heading-index-trigger'
assert_contains "$OUT/index.html" '/js/heading-index.js?v=5'
assert_contains "$ROOT/themes/archie/static/js/heading-index.js" 'for (let i = 0; i < 3; i++)'
assert_contains "$ROOT/themes/archie/static/js/heading-index.js" "classList.add('is-open')"
assert_contains "$ROOT/themes/archie/static/js/roman-numerals.js" "document.body.classList.contains('page-home')"
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'flex-direction: column'
assert_contains "$OUT/index.html" 'class="shell-footer home-shell-footer"'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '.shell-footer {'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '/* Footer follows the taller of the content and side columns. */'
assert_contains "$ROOT/themes/archie/assets/css/main.css" '/* The rail is no longer a separate column here. */'
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'position: fixed'
assert_contains "$ROOT/themes/archie/static/js/heading-index.js" 'function slugifyHeading'
assert_not_contains "$ROOT/themes/archie/static/js/heading-index.js" "'heading-' + i"
assert_contains "$ROOT/themes/archie/assets/css/main.css" 'overflow-x: clip'
assert_contains "$OUT/index.html" '/js/roman-numerals.js?v=2'
printf 'layout smoke tests passed\n'
