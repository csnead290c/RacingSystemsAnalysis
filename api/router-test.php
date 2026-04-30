<?php
/**
 * Test Router for PHP Built-in Server
 * Routes requests to appropriate API files using SQLite test database
 */

// Use test config instead of production config
if (file_exists(__DIR__ . '/config.test.php')) {
    require_once __DIR__ . '/config.test.php';
} else {
    require_once __DIR__ . '/config.php';
}

// Mark that config is already loaded to prevent double-loading
define('RSA_CONFIG_LOADED', true);

// Get the requested URI
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Remove /api prefix if present (browser sends /api/auth.php, we need auth.php)
$uri = preg_replace('#^/api/#', '/', $uri);

$file = __DIR__ . $uri;

// If it's a PHP file in the api directory, execute it
if (preg_match('/\.php$/', $uri) && file_exists($file)) {
    require $file;
    return true;
}

// For non-PHP files, let the built-in server handle them
return false;
