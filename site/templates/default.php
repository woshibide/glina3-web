<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= $page->isHomePage() ? esc($site->title()) : esc($page->title() . ' | ' . $site->title()) ?></title>
  <script>
    // Apply the stored colour theme before first paint (see src/components/ThemeSwitch.vue).
    try {
      const theme = localStorage.getItem('theme');
      if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
    } catch {}
  </script>
  <?php /* Linked, not imported from JS, so the page is styled before scripts run, in dev and production. */ ?>
  <?= vite()->css('styles/main.css') ?>
  <?= vite()->css('main.js', try: true) ?>
</head>
<body>
  <div id="app">
    <?php /* Server-rendered fallback for crawlers and no-JS visitors; Vue replaces it on mount. Keep in step with src/App.vue. */ ?>
    <div class="board">
      <header class="tile masthead">
        <a href="<?= $site->url() ?>"><?= esc($site->title()) ?></a>
        <nav aria-label="Main">
          <?php foreach ($data['site']['nav'] as $item): ?>
          <a href="<?= $item['url'] ?>"<?= $item['active'] ? ' aria-current="page"' : '' ?>><?= esc($item['title']) ?></a>
          <?php endforeach ?>
        </nav>
        <?php snippet('theme-switch') ?>
      </header>
      <main class="tile">
        <h1 class="title"><?= esc($page->title()) ?></h1>
        <div class="text"><?= $data['page']['text'] ?></div>
      </main>
      <footer class="tile">
        <a href="mailto:<?= esc($site->email(), 'attr') ?>"><?= esc($site->email()) ?></a>
      </footer>
    </div>
  </div>
  <script type="application/json" id="kirby-data"><?= json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) ?></script>
  <?= vite()->js('main.js') ?>
</body>
</html>
