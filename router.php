<?php
$_SERVER['DOCUMENT_ROOT'] = __DIR__;

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . $path;

// Mirrors of the .htaccess rewrites
if ($path === '/sitemap.xml') {
    include __DIR__ . '/sitemap.php';
    return true;
}
if (preg_match('#^/jokes/([a-z0-9-]+)/?$#', $path, $m)) {
    if (!str_ends_with($path, '/')) {
        header("Location: " . $path . "/", true, 301);
        exit;
    }
    $_GET['slug'] = $m[1];
    include __DIR__ . '/jokes/joke.php';
    return true;
}

// Serve static assets directly (css, js, images, svgs, etc.)
if ($path !== '/' && file_exists($file) && !is_dir($file)) {
    return false;
}

// If directory, ensure trailing slash for relative assets, then serve index.php
if (is_dir($file)) {
    if (!str_ends_with($path, '/')) {
        header("Location: " . $path . "/");
        exit;
    }
    if (file_exists($file . '/index.php')) {
        include $file . '/index.php';
        return true;
    }
}

// Extensionless .php routing
if (file_exists($file . '.php')) {
    include $file . '.php';
    return true;
}

return false;
