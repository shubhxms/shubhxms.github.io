# shubhamshah.net

[![Deploy Hugo site to Pages](https://github.com/shubhxms/shubhxms.github.io/actions/workflows/hugo.yml/badge.svg)](https://github.com/shubhxms/shubhxms.github.io/actions/workflows/hugo.yml)

The personal website of [Shubham Shah](https://shubhamshah.net). Built with [Hugo](https://gohugo.io/) on **folio**, a theme written for this site (`themes/folio`). See [/colophon](https://shubhamshah.net/colophon) for where its ideas come from.

## Run it

Needs [Hugo](https://gohugo.io/installation/) **extended**, v0.162.1 (the version the deploy uses), and Node 22+ for the unit tests.

```bash
git clone https://github.com/shubhxms/shubhxms.github.io.git
cd shubhxms.github.io

bin/dev                    # dev server on http://localhost:1313
PORT=1414 bin/dev          # another port; extra flags go to `hugo server`

hugo --gc --minify         # production build, into ./public
```

`bin/dev` renders to memory and restarts Hugo by itself when a rebuild hits a Go runtime error (Hugo's own state gone stale); ordinary template errors are shown and left for you to fix.

## Tests

```bash
node --test tests/*.mjs    # unit tests for the theme's scripts
tests/folio-smoke.sh       # builds the site with fixture pages and checks the output
tests/dev.test.sh          # bin/dev's restart behaviour, with a stand-in for hugo
```

The deploy runs the first two before it builds.

## Layout

```
content/
├── _index.md          # home: title page, intro, likes, Lately
├── notes/             # notes (cascade word count and a drop cap)
└── pages/             # Now, Contact, Projects, Feed, Shelf, Core, Uses, Colophon
data/shelf.yaml        # the Shelf: books and films with covers
static/images/         # images; also mounted as assets so Hugo can resize them
themes/folio/          # the theme: layouts, CSS, JS, self-hosted fonts
tests/                 # unit tests, smoke test, fixtures
bin/dev                # dev server
hugo.toml              # config: menu, params, module mounts
```

`themes/archie` is the previous theme, kept as a submodule; the site doesn't use it.

## Writing

A note in `content/notes/`:

```markdown
---
title: "On Vikram Sarabhai"
date: 2026-02-13
description: "Or Rambling about a book I just read"
tldr: "Shown under the title in the archive."
tags: ["book-review"]
---
```

A page in `content/pages/` takes `title`, `url` and `tldr`. Other front matter: `stats: true` (word count and reading time), `dropcap: true`.

Shortcodes, in `themes/folio/layouts/shortcodes/`:

| Shortcode | Does |
|---|---|
| `{{< sidenote >}}…{{< /sidenote >}}` | Numbered note in the margin |
| `{{< marginnote >}}…{{< /marginnote >}}` | Unnumbered note in the margin |
| `{{< marginfigure src="/images/…" caption="…" >}}` | Image in the margin |
| `{{< hero src="/images/…" alt="…" position="center 85%" >}}` | Wide, short photo across the top |
| `{{< callout text="…" >}}` | Boxed note |
| `{{< likes >}}` / `{{< lately 6 >}}` | Home page lists |
| `{{< subscribe "substack-name" >}}` | Newsletter sign-up |

Images under `static/images/` are resized to the size they're shown at and served as WebP, whether used in Markdown or in a shortcode. GIFs and outside URLs are left as they are.

The **Shelf** comes from `data/shelf.yaml`; an entry without a `cover` is left off it. The **Feed** is fetched in the browser from a Cloudflare Worker (`params.feedApi` in `hugo.toml`).

## Deploy

Every push to `main` runs `.github/workflows/hugo.yml`: tests, `hugo --gc --minify`, then GitHub Pages. It can also be run by hand from the [Actions tab](https://github.com/shubhxms/shubhxms.github.io/actions).

## License

Content © Shubham Shah, [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Code [MIT](https://opensource.org/licenses/MIT). Fonts under the [SIL Open Font License](https://openfontlicense.org).
