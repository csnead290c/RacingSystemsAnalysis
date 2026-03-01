<?php
/**
 * Database Migration v6 — NHRA Tech Parity Tables
 *
 * Creates:
 *   - parity_run_imports  (import audit trail)
 *   - parity_runs_raw     (raw OData rows for replay/audit)
 *   - parity_runs         (normalized run data)
 *
 * Safe to run multiple times (uses IF NOT EXISTS).
 *
 * Usage:
 *   php api/migrate-v6-parity.php          (CLI)
 *   https://example.com/api/migrate-v6-parity.php  (browser — protect in production!)
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== RSA Database Migration v6 — NHRA Tech Parity ===\n\n";

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

// ── Helper ──────────────────────────────────────────────────────────────

function addIndexSafeV6(PDO $pdo, string $name, string $ddl): void {
    try {
        $pdo->exec($ddl);
        echo "   Added index: $name\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) {
            echo "   Exists: $name\n";
        } else {
            throw $e;
        }
    }
}

// ── 2. parity_run_imports table ─────────────────────────────────────────

echo "2. Creating parity_run_imports table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parity_run_imports (
            id INT AUTO_INCREMENT PRIMARY KEY,
            uuid VARCHAR(36) UNIQUE NOT NULL,
            race_lookup VARCHAR(8) NOT NULL,
            requested_at_utc DATETIME NOT NULL,
            fetched_at_utc DATETIME NULL,
            status ENUM('success','error') NOT NULL DEFAULT 'success',
            row_count INT NOT NULL DEFAULT 0,
            error_message TEXT NULL,
            source_url TEXT NOT NULL,
            created_by_user_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            INDEX idx_pri_race (race_lookup),
            UNIQUE KEY uk_pri_race_fetch (race_lookup, requested_at_utc)
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 3. parity_runs_raw table ────────────────────────────────────────────

echo "3. Creating parity_runs_raw table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parity_runs_raw (
            id INT AUTO_INCREMENT PRIMARY KEY,
            uuid VARCHAR(36) UNIQUE NOT NULL,
            import_id INT NOT NULL,
            row_hash VARCHAR(64) NOT NULL,
            raw_json JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            INDEX idx_prr_import (import_id),
            UNIQUE KEY uk_prr_import_hash (import_id, row_hash),
            FOREIGN KEY (import_id) REFERENCES parity_run_imports(id) ON DELETE CASCADE
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 4. parity_runs table ────────────────────────────────────────────────

echo "4. Creating parity_runs table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parity_runs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            uuid VARCHAR(36) UNIQUE NOT NULL,
            import_id INT NOT NULL,
            race_lookup VARCHAR(8) NOT NULL,
            -- Derived via parity_localToUtc(). Do NOT write directly from timing system data.
            run_timestamp_utc DATETIME NULL,
            category VARCHAR(100) NULL,
            class_index VARCHAR(100) NULL,
            round VARCHAR(50) NULL,
            lane VARCHAR(20) NULL,
            driver_name VARCHAR(255) NULL,
            car_number VARCHAR(50) NULL,
            dial_in DOUBLE NULL,
            rt DOUBLE NULL,
            ft60 DOUBLE NULL,
            ft330 DOUBLE NULL,
            ft660 DOUBLE NULL,
            mph660 DOUBLE NULL,
            ft1000 DOUBLE NULL,
            mph1000 DOUBLE NULL,
            ft1320 DOUBLE NULL,
            mph1320 DOUBLE NULL,
            win_flag TINYINT(1) NULL,
            dq_flag TINYINT(1) NULL,
            mov DOUBLE NULL,
            place VARCHAR(20) NULL,
            source_ref VARCHAR(255) NULL,
            row_hash VARCHAR(64) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            INDEX idx_pr_race (race_lookup),
            INDEX idx_pr_class_race (class_index, race_lookup),
            INDEX idx_pr_driver_race (driver_name, race_lookup),
            INDEX idx_pr_timestamp (run_timestamp_utc),
            INDEX idx_pr_import (import_id),
            UNIQUE KEY uk_pr_race_hash (race_lookup, row_hash),
            FOREIGN KEY (import_id) REFERENCES parity_run_imports(id) ON DELETE CASCADE
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

echo "=== Migration v6 Complete ===\n";
echo "Tables: parity_run_imports, parity_runs_raw, parity_runs\n";
