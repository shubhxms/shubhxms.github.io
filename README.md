# Shubham Shah's Personal Website

[![Deploy Hugo site to Pages](https://github.com/shubhxms/shubhxms.github.io/actions/workflows/hugo.yml/badge.svg)](https://github.com/shubhxms/shubhxms.github.io/actions/workflows/hugo.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The personal website, blog, and digital garden of [Shubham Shah](https://shubhxms.github.io/). Built with [Hugo](https://gohugo.io/) and a custom fork of the [Archie theme](https://github.com/athul/archie).

**Live Site:** [https://shubhxms.github.io/](https://shubhxms.github.io/)

## Features

- **Blog & Notes** - Organized thoughts and articles
- **Projects** - Showcase of work and side projects
- **Shelf** - Reading list and recommendations
- **Stream** - Stream of consciousness and quick updates
- **Dark/Light Mode** - Toggle between themes
- **Fast & Lightweight** - Static site with KaTeX for math rendering
- **Responsive Design** - Works on all devices

## Quick Start

### Prerequisites

- [Hugo](https://gohugo.io/installation/) extended version (v0.128.0 or later)
- Git

### Local Development

```bash
# Clone the repository (including submodules)
git clone --recursive https://github.com/shubhxms/shubhxms.github.io.git
cd shubhxms.github.io

# Start the development server
hugo server -D

# Build the site (output in ./public)
hugo --cleanDestinationDir
```

Visit `http://localhost:1313` in your browser to see the site.

### Development Commands

```bash
# Create a new note
hugo new notes/my-note.md

# Create a new page
hugo new pages/my-page.md

# Build with drafts
hugo -D

# Clean build
hugo --cleanDestinationDir
```

## Project Structure

```
.
├── assets/           # Processed files (CSS, JS)
├── content/          # Site content
│   ├── notes/        # Blog posts and notes
│   ├── pages/        # Static pages (About, Core, Uses, etc.)
│   └── stream/       # Stream of consciousness entries
├── static/           # Static assets (images, fonts, files)
│   └── images/       # Site images
├── layouts/          # Custom layout templates (overrides theme)
├── themes/           # Hugo themes
│   └── archie/       # Custom fork of Archie theme
├── public/           # Generated site (Hugo output, do not edit)
├── hugo.toml         # Site configuration
└── README.md         # This file
```

## Content Management

### Adding a Note

Notes are organized in `content/notes/`. Each note requires front matter:

```markdown
---
title: "My Note Title"
date: 2026-03-18
description: "A brief description"
tldr: "Quick summary"
draft: false
tags: ["tag1", "tag2"]
---

Your content here...
```

### Adding a Page

Static pages go in `content/pages/`:

```markdown
---
title: "Page Title"
url: /page-slug
description: "Page description"
draft: false
---

Page content...
```

### Adding Images

Place images in `static/images/` and reference them in markdown:

```markdown
![Alt text](/images/your-image.jpg)
```

## Configuration

Key settings in `hugo.toml`:

```toml
# Site settings
baseURL = 'https://shubhxms.github.io/'
languageCode = 'en-us'
title = 'Shubham Shah'
theme = "archie"

# Theme toggle
mode = "toggle"  # or "dark" or "light"

# Math rendering (KaTeX)
katex = true

# Pagination
paginate = 4

# Syntax highlighting
pygmentsstyle = "monokai"
pygmentscodefences = true
```

### Navigation Menu

Add menu items in `hugo.toml`:

```toml
[[menu.main]]
name = "Page Name"
url = "/page-url"
weight = 1
```

## Deployment

The site is automatically deployed to [GitHub Pages](https://pages.github.com/) via GitHub Actions on every push to the `main` branch.

### Workflow

1. Push changes to `main` branch
2. GitHub Actions triggers automatically
3. Hugo builds the site
4. Output is deployed to `https://shubhxms.github.io/`

### Manual Deployment

You can also trigger a deployment manually from the [Actions tab](https://github.com/shubhxms/shubhxms.github.io/actions).

## Theme Customization

This site uses a custom fork of the [Archie theme](https://github.com/athul/archie) located in `themes/archie/`. Customizations include:

- Modified styling and layout
- Custom color schemes
- Feature enhancements
- Bug fixes and optimizations

### Overriding Theme Templates

To override a template from the theme:

1. Create the same directory structure in your root `layouts/` folder
2. Copy the template file from `themes/archie/layouts/`
3. Modify as needed

Example: Override `single.html`:
```
layouts/
└── _default/
    └── single.html
```

## Contributing

This is a personal website, but feel free to:

- Report bugs via [GitHub Issues](https://github.com/shubhxms/shubhxms.github.io/issues)
- Fork for your own use
- Submit pull requests for theme improvements

## License

© 2026 Shubham Shah. Content licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Code licensed under [MIT](https://opensource.org/licenses/MIT).

## Tech Stack

- **Static Site Generator:** [Hugo](https://gohugo.io/)
- **Theme:** [Archie](https://github.com/athul/archie) (custom fork)
- **Hosting:** [GitHub Pages](https://pages.github.com/)
- **CI/CD:** [GitHub Actions](https://github.com/features/actions)
- **Domain:** [GitHub Pages](https://shubhxms.github.io/)
- **Math Rendering:** [KaTeX](https://katex.org/)
- **Syntax Highlighting:** [Pygments](https://pygments.org/)

## Links

- **GitHub:** [shubhxms](https://github.com/shubhxms/)
- **Twitter:** [@shubhxms](https://twitter.com/shubhxms/)
- **Website:** [shubhxms.github.io](https://shubhxms.github.io/)

---

Made with ❤️ and [Hugo](https://gohugo.io/)
