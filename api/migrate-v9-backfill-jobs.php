<?php
/**
 * Database Migration v9 — Parity Backfill Jobs
 *
 * Creates:
 *   - parity_backfill_jobs       (job metadata + progress)
 *   - parity_backfill_job_items  (per-item status tracking)
 *
 * Safe to run multiple times (uses IF NOT EXISTS).
 *
 * Usage:
 *   php api/migrate-v9-backfill-jobs.php          (CLI)
 *   https://example.com/api/migrate-v9-backfill-jobs.php  (browser)
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== RSA Database Migration v9 — Parity Backfill Jobs ===\n\n";

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

// ── 2. parity_backfill_jobs table ───────────────────────────────────────

echo "2. Creating parity_backfill_jobs table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parity_backfill_jobs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            type ENUM('runs','weather') NOT NULL,
            status ENUM('running','complete','error','paused','cancelled') NOT NULL DEFAULT 'running',
            created_by_user_id INT NULL,
            params_json JSON NOT NULL,
            total_items INT NOT NULL DEFAULT 0,
            completed_count INT NOT NULL DEFAULT 0,
            skipped_count INT NOT NULL DEFAULT 0,
            no_data_count INT NOT NULL DEFAULT 0,
            error_count INT NOT NULL DEFAULT 0,
            current_item_key VARCHAR(100) NULL,
            last_error TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            finished_at TIMESTAMP NULL,

            INDEX idx_pbj_type_status (type, status),
            INDEX idx_pbj_created (created_at)
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 3. parity_backfill_job_items table ──────────────────────────────────

echo "3. Creating parity_backfill_job_items table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parity_backfill_job_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            job_id INT NOT NULL,
            item_key VARCHAR(100) NOT NULL,
            status ENUM('pending','ok','skipped','no_data','error') NOT NULL DEFAULT 'pending',
            attempts INT NOT NULL DEFAULT 0,
            last_http_status INT NULL,
            last_error TEXT NULL,
            rows_fetched INT NOT NULL DEFAULT 0,
            rows_inserted INT NOT NULL DEFAULT 0,
            rows_deduped INT NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            UNIQUE KEY uk_pbji_job_item (job_id, item_key),
            INDEX idx_pbji_status (job_id, status),
            FOREIGN KEY (job_id) REFERENCES parity_backfill_jobs(id) ON DELETE CASCADE
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

echo "=== Migration v9 Complete ===\n";
echo "Tables: parity_backfill_jobs, parity_backfill_job_items\n";
