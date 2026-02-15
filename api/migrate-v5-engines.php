<?php
/**
 * Database Migration v5 — Engine Library with Versioning
 *
 * Creates:
 *   - engines (identity/ownership)
 *   - engine_revisions (immutable versioned snapshots)
 *
 * Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN with duplicate check).
 *
 * Usage:
 *   php api/migrate-v5-engines.php          (CLI)
 *   https://example.com/api/migrate-v5-engines.php  (browser — protect in production!)
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== RSA Database Migration v5 — Engine Library ===\n\n";

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

// ── Helper (same as migrate-v2) ─────────────────────────────────────────

function addColumnSafeV5(PDO $pdo, string $table, string $colDef): void {
    $colName = explode(' ', trim($colDef))[0];
    try {
        $pdo->exec("ALTER TABLE $table ADD COLUMN $colDef");
        echo "   Added column: $table.$colName\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "   Exists: $table.$colName\n";
        } else {
            throw $e;
        }
    }
}

function addIndexSafeV5(PDO $pdo, string $name, string $ddl): void {
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

// ── 2. engines table ────────────────────────────────────────────────────

echo "2. Creating engines table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS engines (
            id INT AUTO_INCREMENT PRIMARY KEY,
            uuid VARCHAR(36) UNIQUE NOT NULL,
            user_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            source VARCHAR(50) NOT NULL DEFAULT 'enginePro',
            scope VARCHAR(20) NOT NULL DEFAULT 'personal',
            current_revision INT NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            INDEX idx_eng_user (user_id),
            INDEX idx_eng_scope (scope),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 3. engine_revisions table ───────────────────────────────────────────

echo "3. Creating engine_revisions table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS engine_revisions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            engine_id INT NOT NULL,
            revision INT NOT NULL,
            peak_hp DECIMAL(8,2) NOT NULL,
            rpm_at_peak_hp INT NOT NULL,
            peak_torque DECIMAL(8,2) NULL,
            rpm_at_peak_torque INT NULL,
            displacement_cid DECIMAL(8,2) NULL,
            fuel_type VARCHAR(50) NULL,
            hp_curve JSON NULL,
            engine_sim_config JSON NULL,
            engine_sim_doc_id VARCHAR(100) NULL,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            UNIQUE KEY uk_engine_rev (engine_id, revision),
            INDEX idx_rev_engine (engine_id),
            FOREIGN KEY (engine_id) REFERENCES engines(id) ON DELETE CASCADE
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 4. engine_sims table (if not exists) ────────────────────────────────
// The frontend already calls /engine_sims.php — ensure the table exists.

echo "4. Creating engine_sims table (if not exists)...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS engine_sims (
            id INT AUTO_INCREMENT PRIMARY KEY,
            uuid VARCHAR(36) UNIQUE NOT NULL,
            user_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            data JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            INDEX idx_esim_user (user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

echo "=== Migration v5 Complete ===\n";
echo "Tables: engines, engine_revisions, engine_sims\n";
