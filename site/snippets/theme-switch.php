<?php /* Server copy of src/components/ThemeSwitch.vue; icons are shared from src/icons. */ ?>
<div class="theme-switch" role="group" aria-label="Colour theme">
  <?php foreach (['light' => ['Light', 'sun'], 'system' => ['System', 'system'], 'dark' => ['Dark', 'moon']] as $value => [$label, $icon]): ?>
  <button type="button" data-theme-option="<?= $value ?>" aria-label="<?= $label ?>" title="<?= $label ?>" aria-pressed="<?= $value === 'system' ? 'true' : 'false' ?>"><?= trim(F::read(kirby()->root('index') . "/src/icons/$icon.svg")) ?></button>
  <?php endforeach ?>
</div>
