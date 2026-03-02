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
require_once __DIR__ . '/functions.php';

try {
    $pdo = getDB();

    // Check if column already exists
    $cols = $pdo->query("SHOW COLUMNS FROM parity_events LIKE 'event_code'")->fetchAll();
    if (count($cols) === 0) {
        $pdo->exec("ALTER TABLE parity_events ADD COLUMN event_code VARCHAR(20) NULL DEFAULT NULL AFTER event_name");
        echo "Added event_code column to parity_events.\n";
    } else {
        echo "event_code column already exists.\n";
    }

    echo "Migration v8 complete.\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
