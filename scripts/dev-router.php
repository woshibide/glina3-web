<?php

if (PHP_SAPI !== 'cli-server') {
    http_response_code(404);
    exit;
}

$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
if (preg_match('~(?:^|/)\.[^/]+|^/(?:content|site|kirby|scripts|vendor|tool|node_modules|pages-dist)(?:/|$)~i', $path)) {
    http_response_code(404);
    return true;
}

return require dirname(__DIR__) . '/kirby/router.php';
