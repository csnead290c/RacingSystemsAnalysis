<?php
/**
 * Migration v8: Add event_code column to parity_events
 * Safe to re-run — uses IF NOT EXISTS logic.
 */

header('Content-Type: text/plain');

require_once __DIR__ . '/config.php';

// Override config.php error suppression
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Catch fatal errors
register_shutdown_function(function () {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        echo "\nFATAL: " . $error['message'] . " in " . $error['file'] . ":" . $error['line'] . "\n";
    }
});

echo "=== RSA Database Migration v8 — Event Code ===\n\n";

echo "1. Connecting to database...\n";
try {
    $pdo = getDB();
    echo "   OK\n\n";
} catch (\Throwable $e) {
    echo "   FAILED: " . $e->getMessage() . "\n";
    exit(1);
}

echo "2. Checking for event_code column...\n";
try {
    $cols = $pdo->query("SHOW COLUMNS FROM parity_events LIKE 'event_code'")->fetchAll();
    if (count($cols) === 0) {
        echo "   Column does not exist. Adding...\n";
        $pdo->exec("ALTER TABLE parity_events ADD COLUMN event_code VARCHAR(20) NULL DEFAULT NULL AFTER event_name");
        echo "   Added event_code column to parity_events.\n";
    } else {
        echo "   event_code column already exists.\n";
    }
} catch (\Throwable $e) {
    echo "   FAILED: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\nMigration v8 complete.\n";
