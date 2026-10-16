<?php /* Shown on every URL while the glina.comingSoon option is on (see site/config/config.php). Plain HTML, no Vue. */ ?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= esc($site->title()) ?></title>
  <meta name="description" content="<?= esc($site->title(), 'attr') ?>: 3D-printed ceramics from Amsterdam. Our new website is in the making.">
  <?= vite()->css('styles/main.css') ?>
</head>
<body>
  <main class="board coming-soon">
    <div class="tile">
      <h1 class="title"><?= esc($site->title()) ?></h1>
      <div class="coming-soon-body">
        <p>Our new website is in the making.<br>Come back soon, or get in touch.</p>
        <address>
          <a href="mailto:<?= esc($site->email(), 'attr') ?>"><?= esc($site->email()) ?></a>
          <?php if ($site->phone()->isNotEmpty()): ?>
          <a href="tel:<?= esc(preg_replace('/[^+\d]/', '', $site->phone()->value()), 'attr') ?>"><?= esc($site->phone()) ?></a>
          <?php endif ?>
          <?php if ($site->address()->isNotEmpty()): ?>
          <span><?= nl2br(esc($site->address())) ?></span>
          <?php endif ?>
        </address>
      </div>
    </div>
  </main>
</body>
</html>
