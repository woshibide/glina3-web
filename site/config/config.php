<?php

use Kirby\Cms\Page;

$comingSoon = fn () => Page::factory([
    'slug'     => 'coming-soon',
    'template' => 'coming-soon',
    'content'  => ['title' => site()->title()->value()],
]);

return [
    'debug' => false,

    // While true, visitors get the coming-soon page (site/templates/coming-soon.php) on every URL;
    // Panel users who are logged in still see the real site. Turned off locally in config.127.0.0.1.php.
    'glina.comingSoon' => true,

    'routes' => [
        [
            // Local preview of the coming-soon page while the option is off; only with debug on.
            'pattern' => 'coming-soon',
            'action'  => function () use ($comingSoon) {
                if (option('debug') !== true) {
                    $this->next();
                }

                return $comingSoon();
            },
        ],
        [
            'pattern' => '(:all)',
            'action'  => function (string $path) use ($comingSoon) {
                if (option('glina.comingSoon') !== true || kirby()->user() !== null) {
                    $this->next();
                }

                // One page only: send old and deep links to it instead of repeating it on every URL.
                if ($path !== '') {
                    go('/', 302);
                }

                return $comingSoon();
            },
        ],
    ],
];
