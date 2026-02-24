<?php
/**
 * Database Migration v10 — Event/Track enhancements, Run Flags, Scrape Logs
 *
 * Changes:
 *   - ALTER parity_tracks: add street, city, state, zip columns
 *   - ALTER parity_events: add season_year, make race_lookup UNIQUE
 *   - CREATE parity_run_flags (run-quality flagging)
 *   - CREATE parity_scrape_logs (schedule scraper audit trail)
 *
 * Safe to run multiple times (uses IF NOT EXISTS / column-exists checks).
 *
 * Usage:
 *   php api/migrate-v10-events-flags.php
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== RSA Database Migration v10 — Events/Flags/ScrapeLogs ===\n\n";

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

// ── Helper: add column if not exists ─────────────────────────────────────

function addColumnIfNotExists(PDO $pdo, string $table, string $column, string $definition): void {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    ");
    $stmt->execute([$table, $column]);
    if ((int)$stmt->fetchColumn() === 0) {
        $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
        echo "   Added column: $table.$column\n";
    } else {
        echo "   Exists: $table.$column\n";
    }
}

function addIndexSafe(PDO $pdo, string $name, string $ddl): void {
    try {
        $pdo->exec($ddl);
        echo "   Added: $name\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) {
            echo "   Exists: $name\n";
        } else {
            echo "   FAILED: $name — " . $e->getMessage() . "\n";
        }
    }
}

// ── 2. Extend parity_tracks ─────────────────────────────────────────────

echo "2. Extending parity_tracks (add address columns)...\n";
try {
    addColumnIfNotExists($pdo, 'parity_tracks', 'street', "VARCHAR(255) NULL AFTER timezone_iana");
    addColumnIfNotExists($pdo, 'parity_tracks', 'city', "VARCHAR(100) NULL AFTER street");
    addColumnIfNotExists($pdo, 'parity_tracks', 'state', "VARCHAR(50) NULL AFTER city");
    addColumnIfNotExists($pdo, 'parity_tracks', 'zip', "VARCHAR(20) NULL AFTER state");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 3. Extend parity_events ─────────────────────────────────────────────

echo "3. Extending parity_events (add season_year, unique race_lookup)...\n";
try {
    addColumnIfNotExists($pdo, 'parity_events', 'season_year', "INT NULL AFTER event_name");
    // Make race_lookup UNIQUE (it was just indexed before)
    addIndexSafe($pdo, 'uk_pe_racelookup', "ALTER TABLE parity_events ADD UNIQUE KEY uk_pe_racelookup (race_lookup)");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 4. Create parity_run_flags ──────────────────────────────────────────

echo "4. Creating parity_run_flags table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parity_run_flags (
            id INT AUTO_INCREMENT PRIMARY KEY,
            run_id INT NOT NULL,
            flag_type ENUM('bad','note','exclude') NOT NULL DEFAULT 'bad',
            reason TEXT NULL,
            created_by_user_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            UNIQUE KEY uk_prf_run_type (run_id, flag_type),
            INDEX idx_prf_run (run_id),
            INDEX idx_prf_type (flag_type),
            FOREIGN KEY (run_id) REFERENCES parity_runs(id) ON DELETE CASCADE
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 5. Create parity_scrape_logs ────────────────────────────────────────

echo "5. Creating parity_scrape_logs table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parity_scrape_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            started_at DATETIME NOT NULL,
            ended_at DATETIME NULL,
            years JSON NOT NULL,
            events_upserted INT NOT NULL DEFAULT 0,
            tracks_upserted INT NOT NULL DEFAULT 0,
            errors_json JSON NULL,
            created_by_user_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

echo "=== Migration v10 Complete ===\n";
echo "Changes: parity_tracks +address, parity_events +season_year +unique(race_lookup), parity_run_flags, parity_scrape_logs\n";
