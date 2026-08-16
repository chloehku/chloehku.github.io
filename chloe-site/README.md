# Chloe's personal site

Single-file static site. Warm editorial (terracotta + cream + serif), with D-style tabs for "By the numbers / Case studies / Toolkit" and a portrait in the hero.

## Files

- `index.html` — the whole site (HTML + CSS + tiny JS, no dependencies)
- `photo.png` — your portrait (extracted from the CV at 1254×1254). Tip: a 1200×1600 vertical JPG/WebP would crop better in the 3:4 hero frame — swap when you have one.
- `assets/` — official brand SVGs fetched from public reference sources:
  - `hku.svg`, `hkust.svg` (schools, education section + can also be added to the hero strip)
  - `loreal.svg`, `hsbc.svg`, `ogilvy.svg` (companies, case studies + hero strip)
  - Harbour & Pine Coffee has no public logo, so it uses a small monogram + italic serif wordmark in the brand strip.

## How to preview locally

Just open `index.html` in your browser, or run a tiny local server (recommended so the photo loads cleanly):

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## How to deploy

This is a single static HTML file, so any free static host works:

- **GitHub Pages** (matches your existing `chloemarketing/chloemarketing.github.io` repo) — drop the contents of this folder into the repo and push.
- **Cloudflare Pages / Netlify / Vercel** — drag the folder onto their dashboard.

## Editing what you see

| To change | Open `index.html` and edit |
|---|---|
| Your name, tagline, contact pills | Hero `<h1>` and `.pills` block |
| Portrait | Replace `photo.jpg` (recommended 1200×1600px, JPG or WebP) |
| "Now / Open to / Based in" cards | The three `.now` `.now-row` divs |
| About copy | `#about .about-lede` |
| Stats / Case studies / Toolkit content | The three `.tab-panel` blocks under `#work` |
| Projects | `#projects .projects-grid` and `.projects-row` |
| Footer | `<footer>` |

The accent colour is `--accent: #B86F4B` and the cream background is `--bg: #FAF6EE` at the very top of the `<style>` block — change them once and the whole site updates.
