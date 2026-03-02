<?php
/**
 * Database Migration v11 — NHRA Parity Engine/Driver Combo Tables + Weather Samples Fix
 *
 * Creates:
 *   - parity_engine_combos   (engine combo parameters: tPower, dPower, FF)
 *   - parity_driver_combos   (driver → engine combo mapping with effective date ranges)
 *
 * Alters:
 *   - parity_weather_samples: Changes UNIQUE KEY from (source, timestamp_utc) to
 *     (source, event_id, timestamp_utc) to support CSV backfill across multiple events.
 *
 * Safe to run multiple times (uses IF NOT EXISTS, checks before ALTER).
 *
 * Usage:
 *   php api/migrate-v11-parity-combos.php
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== RSA Database Migration v11 — Parity Engine/Driver Combos ===\n\n";

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

function addIndexSafeV11(PDO $pdo, string $name, string $ddl): void {
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

// ── 2. parity_engine_combos ──────────────────────────────────────────

echo "2. Creating parity_engine_combos table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parity_engine_combos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            t_power DOUBLE NOT NULL DEFAULT 0,
            d_power DOUBLE NOT NULL DEFAULT 0,
            friction_factor DOUBLE NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            UNIQUE KEY uk_pec_name (name)
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 3. parity_driver_combos ──────────────────────────────────────────

echo "3. Creating parity_driver_combos table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parity_driver_combos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            driver_name VARCHAR(255) NOT NULL,
            class_index VARCHAR(50) NOT NULL,
            engine_combo_id INT NOT NULL,
            effective_from_utc DATETIME NOT NULL,
            effective_to_utc DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            INDEX idx_pdc_driver_class (driver_name, class_index),
            INDEX idx_pdc_engine (engine_combo_id),
            INDEX idx_pdc_effective (effective_from_utc, effective_to_utc),
            FOREIGN KEY (engine_combo_id) REFERENCES parity_engine_combos(id) ON DELETE CASCADE
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 4. Fix parity_weather_samples UNIQUE KEY ─────────────────────────
// Change from (source, timestamp_utc) to (source, event_id, timestamp_utc)
// so CSV backfill rows for different events with the same timestamp don't collide.

echo "4. Fixing parity_weather_samples UNIQUE KEY...\n";
try {
    // Check if the old unique key exists
    $stmt = $pdo->query("SHOW INDEX FROM parity_weather_samples WHERE Key_name = 'uk_pws_source_ts'");
    $oldIdx = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($oldIdx)) {
        // Check if event_id is already part of the key (column count > 2 means already fixed)
        $cols = array_column($oldIdx, 'Column_name');
        if (!in_array('event_id', $cols)) {
            echo "   Dropping old UNIQUE KEY uk_pws_source_ts (source, timestamp_utc)...\n";
            $pdo->exec("ALTER TABLE parity_weather_samples DROP INDEX uk_pws_source_ts");
            echo "   Adding new UNIQUE KEY uk_pws_source_event_ts (source, event_id, timestamp_utc)...\n";
            $pdo->exec("ALTER TABLE parity_weather_samples ADD UNIQUE KEY uk_pws_source_event_ts (source, event_id, timestamp_utc)");
            echo "   OK\n\n";
        } else {
            echo "   Already includes event_id, skipping.\n\n";
        }
    } else {
        // Old key doesn't exist, check if new one exists
        $stmt2 = $pdo->query("SHOW INDEX FROM parity_weather_samples WHERE Key_name = 'uk_pws_source_event_ts'");
        if ($stmt2->fetch()) {
            echo "   New UNIQUE KEY already exists, skipping.\n\n";
        } else {
            echo "   Adding UNIQUE KEY uk_pws_source_event_ts (source, event_id, timestamp_utc)...\n";
            $pdo->exec("ALTER TABLE parity_weather_samples ADD UNIQUE KEY uk_pws_source_event_ts (source, event_id, timestamp_utc)");
            echo "   OK\n\n";
        }
    }
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

echo "=== Migration v11 Complete ===\n";
echo "Tables: parity_engine_combos, parity_driver_combos\n";
echo "Altered: parity_weather_samples UNIQUE KEY now includes event_id\n";
