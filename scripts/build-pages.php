<?php

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

use Kirby\Filesystem\Dir;
use Kirby\Http\Response;

function publishFile(string $path, string $body): void
{
    if (!Dir::make(dirname($path)) || file_put_contents($path, $body) === false) {
        throw new RuntimeException("Could not write $path.");
    }
}

function publicMedia(string $html, string $pageUrl, string $siteUrl, callable $makeKirby, string $output): void
{
    $document = new DOMDocument();
    $document->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_NONET);
    $xpath = new DOMXPath($document);
    $site = parse_url($siteUrl);
    $prefix = ($site['path'] ?? '') . '/';

    foreach ($xpath->query('//@href | //@src | //@srcset | //@poster') as $attribute) {
        $urls = [$attribute->value];
        if ($attribute->name === 'srcset') {
            $urls = array_map(
                fn (string $candidate) => preg_split('/\s+/', trim($candidate), 2)[0],
                explode(',', $attribute->value)
            );
        }

        foreach ($urls as $url) {
            $target = parse_url(trim($url));
            if ($target === false || empty($target['path'])) {
                continue;
            }
            if (isset($target['scheme']) && !in_array($target['scheme'], ['http', 'https'], true)) {
                continue;
            }
            if (isset($target['host']) && (
                strcasecmp($site['host'], $target['host']) !== 0 ||
                ($site['scheme'] !== ($target['scheme'] ?? $site['scheme'])) ||
                ($site['port'] ?? null) !== ($target['port'] ?? null)
            )) {
                continue;
            }

            $path = $target['path'];
            if (!str_starts_with($path, '/')) {
                $path = (parse_url($pageUrl, PHP_URL_PATH) ?: '/') . $path;
            }

            $relative = str_starts_with($path, $prefix) ? substr($path, strlen($prefix)) : '';
            $file = rawurldecode($relative);
            if (preg_match('~(?:^|/)\.|[\\\\\x00-\x1f]~', $file)) {
                throw new RuntimeException("Unsafe asset URL in $pageUrl: $url.");
            }
            if (str_starts_with($relative, 'media/')) {
                if (!preg_match('~^media/(?:pages|site)/.+\.(?:avif|gif|jpe?g|png|svg|webp|pdf|mp3|mp4|ogg|wav|webm)$~i', $file)) {
                    throw new RuntimeException("Unsupported public media in $pageUrl: $url.");
                }
                if (!is_file("$output/$file")) {
                    $response = $makeKirby($relative)->call($relative, 'GET');
                    if (!$response instanceof Response || $response->code() !== 200) {
                        throw new RuntimeException("Could not generate media for $url.");
                    }
                    publishFile("$output/$file", $response->body());
                }
            } elseif (str_starts_with($relative, 'dist/') || $attribute->name !== 'href') {
                if ($file === '' || !is_file("$output/$file")) {
                    throw new RuntimeException("Missing local asset in $pageUrl: $url.");
                }
            }
        }
    }
}

$root = dirname(__DIR__);
chdir($root);
$siteUrl = rtrim(getenv('SITE_URL') ?: '', '/');
$url = parse_url($siteUrl);
if (
    !filter_var($siteUrl, FILTER_VALIDATE_URL) ||
    !in_array($url['scheme'] ?? '', ['http', 'https'], true) ||
    array_intersect(['user', 'pass', 'query', 'fragment'], array_keys($url ?: [])) ||
    !preg_match('~^(?:/[a-zA-Z0-9_-][a-zA-Z0-9_.-]*)*$~', $url['path'] ?? '')
) {
    fwrite(STDERR, "Set SITE_URL to a full HTTP(S) URL, optionally with a repository path.\n");
    exit(1);
}
if (PHP_VERSION_ID < 80200 || PHP_VERSION_ID >= 80600) {
    fwrite(STDERR, "Use PHP 8.2–8.5 to build the Pages preview.\n");
    exit(1);
}

require $root . '/kirby/bootstrap.php';

$lock = fopen("$root/.pages-build.lock", 'c');
if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
    fwrite(STDERR, "Another Pages build is running.\n");
    exit(1);
}

$scratch = $root . '/.pages-build-' . bin2hex(random_bytes(8));
$output = "$scratch/public";
$destination = "$root/pages-dist";
$basePath = $url['path'] ?? '';
$success = false;
try {
    if (file_exists("$root/.dev")) {
        throw new RuntimeException('Stop Vite before exporting Pages, or remove a stale .dev file.');
    }

    passthru('npm run build >&2', $status);
    if ($status !== 0 || !is_dir("$root/dist/assets") || !is_file("$root/site/config/vite.config.php")) {
        throw new RuntimeException('Vite did not produce the assets and Kirby config. Run npm ci and retry.');
    }

    Dir::copy("$root/dist/assets", "$output/dist/assets");
    $makeKirby = fn (string $path = '') => new Kirby([
        'path' => $path,
        'request' => ['method' => 'GET', 'url' => "$siteUrl/$path", 'cli' => true],
        'roots' => [
            'index' => $root,
            'media' => "$scratch/media",
            'accounts' => "$scratch/accounts",
            'cache' => "$scratch/cache",
            'sessions' => "$scratch/sessions",
        ],
        'urls' => ['index' => $siteUrl, 'media' => "$siteUrl/media"],
        'options' => [
            'api' => false,
            'debug' => false,
            'panel' => false,
            'glina.comingSoon' => false,
            'glina.staticPreview' => true,
        ],
    ]);

    $kirby = $makeKirby();
    foreach (['styles/main.css', 'main.js', 'coming-soon.js'] as $entry) {
        if (!isset(vite()->manifest()[$entry]['file'])) {
            throw new RuntimeException("Vite manifest is missing $entry.");
        }
    }

    $routes = ['' => 'index.html', 'coming-soon' => 'coming-soon/index.html'];
    foreach ($kirby->site()->children()->index() as $page) {
        if ($page->isPublished() && !$page->isHomeOrErrorPage()) {
            $id = $page->id();
            if (!preg_match('~^[\pL\pN_-]+(?:/[\pL\pN_-]+)*$~u', $id) || isset($routes[$id])) {
                throw new RuntimeException("Page route cannot be exported: $id.");
            }
            $routes[$id] = "$id/index.html";
        }
    }

    $notFound = '__glina_preview_missing__';
    if (isset($routes[$notFound])) {
        throw new RuntimeException("Reserved preview route: $notFound.");
    }

    foreach ([...$routes, $notFound => '404.html'] as $path => $file) {
        $path = (string)$path;
        $pageUrl = $siteUrl . '/' . ($path === '' ? '' : "$path/");
        $result = $makeKirby($path)->render();
        $expected = $file === '404.html' ? 404 : 200;
        if ($result?->code() !== $expected || !str_contains($result->type(), 'text/html')) {
            throw new RuntimeException("Unexpected response for $pageUrl (expected HTML $expected).");
        }

        // Kirby-Vite emits root-relative entry tags even with Vite's relative build base.
        $html = str_replace(['href="/dist/', 'src="/dist/'], ["href=\"$basePath/dist/", "src=\"$basePath/dist/"], $result->body());
        $html = str_replace('</head>', "  <meta name=\"robots\" content=\"noindex\">\n</head>", $html);
        publicMedia($html, $pageUrl, $siteUrl, $makeKirby, $output);
        publishFile("$output/$file", $html);
    }

    $sitemap = new XMLWriter();
    $sitemap->openMemory();
    $sitemap->startDocument('1.0', 'UTF-8');
    $sitemap->startElementNs(null, 'urlset', 'http://www.sitemaps.org/schemas/sitemap/0.9');
    foreach (array_keys($routes) as $path) {
        $sitemap->startElement('url');
        $sitemap->writeElement('loc', $siteUrl . '/' . ($path === '' ? '' : "$path/"));
        $sitemap->endElement();
    }
    $sitemap->endDocument();
    publishFile("$output/sitemap.xml", $sitemap->outputMemory());
    publishFile("$output/.nojekyll", '');

    if (is_link($destination) || (file_exists($destination) && !is_dir($destination))) {
        throw new RuntimeException("Expected a directory at $destination.");
    }
    $previous = "$scratch/previous";
    if (is_dir($destination) && !rename($destination, $previous)) {
        throw new RuntimeException("Could not replace $destination.");
    }
    if (!rename($output, $destination)) {
        if (is_dir($previous)) {
            rename($previous, $destination);
        }
        throw new RuntimeException("Could not publish $destination.");
    }
    $success = true;
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage() . PHP_EOL);
} finally {
    if (is_dir($scratch)) {
        Dir::remove($scratch);
    }
    fclose($lock);
}

if (!$success) {
    exit(1);
}

echo "Built Pages preview for $siteUrl in pages-dist/.\n";
