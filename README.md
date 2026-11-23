# GLINA³ website

Kirby 5 CMS renders every page as real HTML; a Vue 3 app, bundled by Vite, mounts over it.
Design starting point: `../../1_research/design.md`.
Source copy of the current site: `../../0_input/GLINA3_full_website_archive_2026-09-22.txt`.

## Requirements

- PHP 8.5 and Composer.
- Node 24 (`nvm use`).

On macOS, install `php@8.5` with Homebrew and run `export PATH="$(brew --prefix php@8.5)/bin:$PATH"` in the shell you use for Composer.
Check `php -v` before installing dependencies.

## Run

For cloning (with the tool submodule), see [Everyday flows](#everyday-flows).

```bash
git submodule update --init --recursive
composer install
npm ci
composer check
composer panel:setup
composer start
```

Open http://127.0.0.1:8000 for Kirby and http://127.0.0.1:8000/panel for the Panel.
Vite serves assets at http://127.0.0.1:5173.
Set `GLINA_PHP_PORT` and `GLINA_VITE_PORT` before `composer start` if another project uses either port.
Stop the dev server before using `npm run build` or `composer build`.
If a dev server was killed and left `.dev` behind, remove the flag after checking the server has stopped.

## Coming-soon page

While the `glina.comingSoon` option is `true` (in `site/config/config.php`), every URL shows `site/templates/coming-soon.php` and other paths redirect to `/`.
The Panel keeps working, and logged-in Panel users see the real site, so content can be prepared on the live server.
Locally, `site/config/config.127.0.0.1.php` turns the option off.
The page is still at http://127.0.0.1:8000/coming-soon, and Pages exports it at `/coming-soon/`.
Email, phone, and address come from the site fields in the Panel.
The notice is a one-column card over the cup from the tool, which turns behind it in a full-window canvas (`src/coming-soon.js`, styles at the end of `src/styles/main.css`).
The page is always light, on the tool's off-white (`--cup-ground`), whatever the system theme.
On wide screens the page fits one screen and does not scroll; on phones the card scrolls away and leaves only the cup.
Without WebGL the page shows the card alone.
To launch the full site, set the option to `false` (or remove it with the routes) on `main`.

## Local Panel account

Panel: http://127.0.0.1:8000/panel

`composer panel:setup` creates the local editor `test@test.test` and saves the generated password in the ignored `.panel-local.json` file.
Kirby stores the account in the ignored `site/accounts/` directory.
Running setup again preserves the existing account and password.

## How it fits together

- `site/controllers/site.php` builds the data for every page (site, nav, page).
- `site/templates/default.php` renders that data as HTML, embeds it as JSON in `#kirby-data`, and loads `src/main.js`.
- `src/main.js` reads the JSON and mounts `src/App.vue` onto `#app`, replacing the server HTML.
  Keep the server markup in the template and `App.vue` in step; the server copy is what crawlers and no-JS visitors see.
- `vite.config.js` uses `vite-plugin-kirby`, which writes `site/config/vite.config.php` and a `.dev` flag file.
  With `.dev` present Kirby loads assets from Vite; without it, from `dist/` via the manifest.
- The tool is an npm workspace (`"workspaces": ["tool"]` in `package.json`), so `npm install` here also installs its dependencies and links it as the package `glina-cup-tool`.
  Pages import it by that name; Vite builds it into `dist/` with the rest.
- `site/config/config.127.0.0.1.php` turns on Kirby debug for local development only.
- `src/styles/main.css` holds the base tokens from the design study; expect them to change.
  The template links it directly (not through `main.js`), so pages are styled before any script runs.
- Spacing: `--gap` (10px) is the board grid; everything else uses the scale in `:root` of `main.css`.
  `--space-text` is 1em; `--space-xs` to `--space-xl` follow the window width (2, 4, 8, 16, and 32 gaps on a 1440 px window), so proportions hold at every width.
  Write `var(--space-xl)`, never `calc(var(--gap) * n)`; change sizes in that one place.
- Page transitions are cross-document view transitions (`@view-transition` in `main.css`): a short crossfade on same-site links, off under reduced motion, instant in browsers without support.
- Colour theme: light, system, or dark, chosen in the top bar (`src/components/ThemeSwitch.vue`, server copy in `site/snippets/theme-switch.php`, icons in `src/icons/`).
  The choice is stored in `localStorage` and applied by an inline script in the `<head>` before first paint; colours use `light-dark()`.

## Repositories and Git

### Map

| Repository | Local folder | What it is |
| --- | --- | --- |
| `woshibide/glina3-web` | `2_development/www` (this one) | The website: Kirby, Vue, Vite. |
| `woshibide/glina3-tool` | `2_development/tool` | The cup tool, developed on its own. |
| `woshibide/glina3-tool` again | `2_development/www/tool` | The same tool as a git submodule of the website, pinned to one commit. |
| `woshibide/glina3` | none | The legacy site (static "digital card" on GitHub Pages). Read-only reference. |

The tool has two checkouts on purpose:

- `../tool` is where the tool is edited, tested, committed, and pushed (see `../tool/AGENTS.md`).
- `tool/` here is only the copy the website uses.
  Git checks it out at the pinned commit as a detached HEAD, so commits made inside it are easy to lose.
  Do not edit there.

### Branches

Website (`glina3-web`):

- `main` is production: whatever is on it can be deployed.
  Today it serves the coming-soon page.
- `develop` collects the redesign and publishes the static GitHub Pages preview.
  Branch features off `develop` (`feature/<name>`), merge them back, and merge `develop` into `main` to release.
- Urgent fixes to the live site branch off `main` and are merged into both `main` and `develop`.

Tool (`glina3-tool`):

- `main` is the tool as it will ship on the website, being stripped down and revamped to fit the site.
  The submodule tracks this branch.
- `ux-research` parks the interaction prototype as it was before the revamp (commit `aac9252`).
  It is not merged back; single ideas are cherry-picked from it when needed.

The website's branches can pin different tool commits; `git submodule status` shows the current one.

### Everyday flows

New clone:

```bash
git clone --recurse-submodules https://github.com/woshibide/glina3-web.git www
git -C www config submodule.recurse true   # checkout, switch, and pull then also move tool/ to the pinned commit
git clone https://github.com/woshibide/glina3-tool.git tool   # next to www, for editing the tool
```

Without `submodule.recurse`, run `git submodule update` after every branch switch or pull; otherwise `tool/` keeps the old commit and `git status` shows `modified: tool`.

Change the tool and use it in the website:

```bash
cd ../tool                   # on main
# edit, npm test, commit
git push                     # push first, or other clones cannot check out the new pin
cd ../www                    # on develop
git submodule update --remote tool
git add tool && git commit -m "Update cup tool"
git push
```

Change the website: branch off `develop`, commit, merge back into `develop`, push.

Release through a PR from `develop` to `main` after design approval.
Record the reviewed Pages commit in the PR and recheck the preview if design changes land before merge.

### Running both at once

Both dev servers default to port 5173, and the website's Vite server needs exactly that port.
Start the tool on another one: `npm run start -- --port 4173` in `../tool`.

### Web access

`.htaccess` blocks `tool/` from the web; only the website's own build in `dist/` is served.

## Design preview

Build a local export with `SITE_URL=http://127.0.0.1:8080/glina3-web/ composer build`.
Serve `pages-dist/` at that path with a static server configured to use `404.html` for missing routes.
The export renders published Kirby content and the coming-soon card, with public media and compiled Vite assets.
The Panel and API require the local or live Kirby server.

After approval to publish, set the Pages source to **GitHub Actions** and allow only `develop` in the `github-pages` deployment environment.
The next push to `develop` runs source and Chromium checks before publishing to `https://woshibide.github.io/glina3-web/`.
If the tool repository is private, set `GLINA_SUBMODULE_TOKEN` to a read-only checkout credential with access to both repos.
The workflow uses the configured Pages URL automatically when a custom domain is connected.

## Live Kirby

Build from a clone with the `tool/` submodule checked out (the build bundles it): run `composer install --no-dev` and `npm ci && npm run build`, then upload everything except `node_modules/` and `tool/`.
A Kirby license is required on a public domain.
Connect fortrabbit to `main` when live deployment is approved and use its assigned HTTPS URL.
Verify that deployment preserves live content, media, accounts, and sessions.
