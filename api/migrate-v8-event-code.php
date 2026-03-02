<?php
/**
 * Migration v8: Add event_code column to parity_events
 * Safe to re-run — uses IF NOT EXISTS logic.
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== RSA Database Migration v8 — Event Code ===\n\n";

require_once __DIR__ . '/config.php';

echo "1. Connecting to database...\n";
try {
    $pdo = getDB();
    echo "   OK\n\n";
} catch (Exception $e) {
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
} catch (Exception $e) {
    echo "   FAILED: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\nMigration v8 complete.\n";
