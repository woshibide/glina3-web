<?php

// Shared by every template: the data the Vue app mounts with.
return function ($site, $page) {
    return [
        'data' => [
            'site' => [
                'title' => $site->title()->value(),
                'url'   => $site->url(),
                'email' => $site->email()->value(),
                'nav'   => $site->children()->listed()->map(fn ($item) => [
                    'title'  => $item->title()->value(),
                    'url'    => $item->url(),
                    'active' => $item->isOpen(),
                ])->values(),
            ],
            'page' => [
                'title'    => $page->title()->value(),
                'template' => $page->intendedTemplate()->name(),
                'text'     => $page->text()->kirbytext()->value(),
            ],
        ],
    ];
};
