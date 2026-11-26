<?php

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

use Kirby\Data\Yaml;

$root = dirname(__DIR__);
require $root . '/vendor/autoload.php';

$files = [new SplFileInfo($root . '/index.php')];
foreach (['scripts', 'site/blueprints', 'site/config', 'site/controllers', 'site/snippets', 'site/templates'] as $directory) {
    $path = "$root/$directory";
    if (is_dir($path)) {
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS));
        foreach ($iterator as $file) {
            $files[] = $file;
        }
    }
}

try {
    foreach ($files as $file) {
        $path = $file->getPathname();
        switch ($file->getExtension()) {
            case 'php':
                exec(escapeshellarg(PHP_BINARY) . ' -l ' . escapeshellarg($path), $output, $status);
                if ($status !== 0) {
                    throw new RuntimeException("PHP syntax check failed for $path.");
                }
                break;
            case 'yml':
            case 'yaml':
                if (!is_array(Yaml::decode(file_get_contents($path)))) {
                    throw new RuntimeException("Invalid blueprint in $path.");
                }
                break;
        }
    }
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage() . PHP_EOL);
    exit(1);
}

echo "PHP syntax and blueprint checks passed.\n";
