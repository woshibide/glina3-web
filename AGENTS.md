# Working on the GLINA website

Run `composer start` from this repository and open http://127.0.0.1:8000/coming-soon to review the construction notice.
Production serves the notice at the root while maintenance mode is enabled.
Local development keeps the full site at the root.
Use the actual Kirby route for browser review so the test exercises PHP, Vite and the cross-origin bake worker.

## Checkout and environment notes

- The website consumes its pinned `tool/` npm workspace.
  Make tool changes in the sibling `../glina3-tool` repository.
  The [website README](README.md#everyday-flows) covers publishing a reviewed tool revision and committing its exact pin.
  A leading `+` in `git submodule status` means the checkout differs from the parent index.
- Inspect both repositories before staging changes.
  Dependency updates and unrelated template, CSS and documentation edits can coexist in the website working tree.
  Stage feature hunks deliberately.
  A repository-wide whitespace check also reported existing trailing spaces in generated Composer autoload files.
  Check the feature diff independently and leave generated files to Composer.
- The system PHP on this workstation was 8.6, outside the project's supported range.
  Select Homebrew PHP 8.5 on PATH as described in the README and verify with `php -v`.
- If `composer start` reports `Cannot bind 127.0.0.1:8000 (EPERM)`, run it with loopback permission.
  With Playwright and Chromium installed and Kirby running, use `node scripts/check-pages.cjs http://127.0.0.1:8000/coming-soon` to check the Vite artwork request and completed bake.
  Stop the dev server, then run `node scripts/check-pages.cjs` for the root and subpath exports.
  The Pages workflow pins the Playwright version.
- Consult the [artwork guide](tool/artwork/README.md) for mask dimensions, orientation and relief depth.
  The worker reports bake progress.
  Only the first rendered frame signals completion.
- Check `git -C tool status --short` as well as the pin before reviewing artwork.
  The preview imports `tool/artwork/2.png` directly and uses it on every load.
  Verify the reviewed commit is reachable on the tool remote before recording the website pin.
