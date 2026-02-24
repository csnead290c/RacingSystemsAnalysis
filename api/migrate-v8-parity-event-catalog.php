<?php
/**
 * Database Migration v8 — Parity Event Catalog
 *
 * Creates:
 *   - parity_event_catalog (event metadata for charting labels)
 *
 * Safe to run multiple times (uses IF NOT EXISTS).
 *
 * Usage:
 *   php api/migrate-v8-parity-event-catalog.php   (CLI)
 *   https://example.com/api/migrate-v8-parity-event-catalog.php  (browser)
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== RSA Database Migration v8 — Parity Event Catalog ===\n\n";

if (!file_exists(__DIR__ . '/config.php')) {
    echo "ERROR: config.php not found!\n";
    exit(1);
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

echo "1. Connecting to database...\n";
try {
    $pdo = getDB();
    echo "   OK\n\n";
} catch (Exception $e) {
    echo "   FAILED: " . $e->getMessage() . "\n";
    exit(1);
}

// ── 2. parity_event_catalog table ───────────────────────────────────────

echo "2. Creating parity_event_catalog table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parity_event_catalog (
            race_lookup VARCHAR(8) NOT NULL PRIMARY KEY,
            event_name VARCHAR(255) NOT NULL DEFAULT '',
            track_name VARCHAR(255) NOT NULL DEFAULT '',
            season_year INT NOT NULL,
            start_date_local DATE NULL,
            end_date_local DATE NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            INDEX idx_pec_season (season_year),
            INDEX idx_pec_track (track_name)
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

echo "=== Migration v8 Complete ===\n";
echo "Table: parity_event_catalog\n";
