# GLINA³ website

Kirby 5 CMS renders every page as real HTML; a Vue 3 app, bundled by Vite, mounts over it.
Design starting point: `../../1_research/design.md`.
Source copy of the current site: `../../0_input/GLINA3_full_website_archive_2026-09-22.txt`.

## Requirements

- PHP 8.2 to 8.5 and Composer
- Node 22 or newer

## Run

```bash
composer install
npm install
npm run dev      # Kirby on http://127.0.0.1:8000 (Panel at /panel), Vite assets with hot reload
npm run build    # production assets into dist/ (Kirby serves them when no dev server runs)
```

Open the Kirby URL, not the Vite one.
Do not run `npm run build` while `npm run dev` is running: `vite-plugin-kirby` deletes the `.dev` flag on build, which switches the running site to the production assets.
Restart `npm run dev` afterwards if you did.

## Local Panel account

Panel: http://127.0.0.1:8000/panel

- Email: `test@test.test`
- Password: `1q2w3e4r`

This account is for local development only.
Accounts live in `site/accounts/`, which is git-ignored, so each machine creates its own on the first Panel visit.
Never use these credentials on a public server.

## How it fits together

- `site/controllers/site.php` builds the data for every page (site, nav, page).
- `site/templates/default.php` renders that data as HTML, embeds it as JSON in `#kirby-data`, and loads `src/main.js`.
- `src/main.js` reads the JSON and mounts `src/App.vue` onto `#app`, replacing the server HTML.
  Keep the server markup in the template and `App.vue` in step; the server copy is what crawlers and no-JS visitors see.
- `vite.config.js` uses `vite-plugin-kirby`, which writes `site/config/vite.config.php` and a `.dev` flag file.
  With `.dev` present Kirby loads assets from Vite; without it, from `dist/` via the manifest.
- `site/config/config.127.0.0.1.php` turns on Kirby debug for local development only.
- `src/styles/main.css` holds the base tokens from the design study; expect them to change.
  The template links it directly (not through `main.js`), so pages are styled before any script runs.
- Page transitions are cross-document view transitions (`@view-transition` in `main.css`): a short crossfade on same-site links, off under reduced motion, instant in browsers without support.
- Colour theme: light, system, or dark, chosen in the top bar (`src/components/ThemeSwitch.vue`, server copy in `site/snippets/theme-switch.php`, icons in `src/icons/`).
  The choice is stored in `localStorage` and applied by an inline script in the `<head>` before first paint; colours use `light-dark()`.

## Deploy

Run `composer install --no-dev` and `npm ci && npm run build`, then upload everything except `node_modules/`.
A Kirby license is required on a public domain.
