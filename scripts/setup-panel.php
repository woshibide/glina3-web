<?php

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

if (PHP_VERSION_ID < 80200 || PHP_VERSION_ID >= 80600) {
    fwrite(STDERR, "Use PHP 8.2–8.5 to set up the Panel.\n");
    exit(1);
}

$root = dirname(__DIR__);
require $root . '/kirby/bootstrap.php';

$kirby = new Kirby(['roots' => ['index' => $root]]);
$email = 'test@test.test';
$credentials = $root . '/.panel-local.json';

try {
    $kirby->impersonate('kirby', function () use ($kirby, $email, $credentials) {
        if ($kirby->users()->findBy('email', $email) !== null) {
            echo "Local account already exists for $email.\n";
            return;
        }

        $password = bin2hex(random_bytes(20));
        $previousUmask = umask(0077);
        $file = @fopen($credentials, 'x');
        umask($previousUmask);
        if ($file === false) {
            throw new RuntimeException("Cannot create $credentials. Check for credentials from an earlier setup.");
        }

        try {
            $data = json_encode(['email' => $email, 'password' => $password], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR) . PHP_EOL;
            $written = fwrite($file, $data);
            fclose($file);
            if ($written !== strlen($data)) {
                throw new RuntimeException('Could not save local credentials.');
            }

            $kirby->users()->create(['email' => $email, 'password' => $password, 'role' => 'editor']);
        } catch (Throwable $error) {
            unlink($credentials);
            throw $error;
        }
        echo "Local Panel credentials saved in $credentials.\n";
    });
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage() . PHP_EOL);
    exit(1);
}
