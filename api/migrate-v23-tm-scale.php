<?php
/**
 * Migration v23: Tech Master Scale MVP — scale_records, scale_rules
 *
 * Part of NHRA Tech Master Phase 1 Batch 3 (Scale MVP).
 * Creates the scale detail table (hanging off tech_cases) and a lightweight
 * class/rule config table for minimum weight enforcement.
 *
 * Safe to run multiple times (CREATE TABLE IF NOT EXISTS).
 * Depends on: v21 (tech_cases), v20 (event_entries), v22 (bridge FKs on parity_runs)
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

$auth = rsa_getAuthUser();
if (!$auth || !in_array($auth['role'] ?? '', ['admin', 'owner'])) {
    http_response_code(403);
    echo "Forbidden: admin role required.\n";
    exit(1);
}

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== Migration v23: Tech Master Scale MVP ===\n\n";
flush();

// ── 1. scale_records ────────────────────────────────────────────────────
// One row per weighing event. Links to tech_cases for backbone lifecycle.
// Each scale record captures one measurement action (combined, driver-only, or car-only).

echo "1. Creating scale_records table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS scale_records (
            id                      INT AUTO_INCREMENT PRIMARY KEY,
            uuid                    VARCHAR(36) NOT NULL,
            tech_case_id            INT NOT NULL,
            event_entry_id          INT NOT NULL,

            -- Measurement mode: 'combined', 'driver_only', 'car_only'
            measurement_mode        VARCHAR(20) NOT NULL,

            -- Measured weights (nullable per mode)
            measured_total_weight   DECIMAL(8,2) NULL,
            measured_driver_weight  DECIMAL(8,2) NULL,
            measured_car_weight     DECIMAL(8,2) NULL,
            measured_rear_axle_weight DECIMAL(8,2) NULL,

            -- Derived total = car_weight + active driver reference
            derived_total_weight    DECIMAL(8,2) NULL,

            -- Whether this is an official record or a practice/informational weigh
            is_official             TINYINT(1) NOT NULL DEFAULT 1,

            -- Run linkage
            linked_run_id           INT NULL,
            link_method             VARCHAR(20) NULL,

            -- Operator / timestamp
            measured_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            operator_id             INT NULL,
            scale_station           VARCHAR(50) NULL,
            notes                   TEXT NULL,

            created_by              INT NOT NULL,
            created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            UNIQUE KEY uk_sr_uuid (uuid),
            INDEX idx_sr_case (tech_case_id),
            INDEX idx_sr_entry (event_entry_id),
            INDEX idx_sr_mode (measurement_mode),
            INDEX idx_sr_measured (measured_at),
            INDEX idx_sr_run (linked_run_id),
            CONSTRAINT fk_sr_case FOREIGN KEY (tech_case_id) REFERENCES tech_cases(id) ON DELETE CASCADE,
            CONSTRAINT fk_sr_entry FOREIGN KEY (event_entry_id) REFERENCES event_entries(id) ON DELETE CASCADE,
            CONSTRAINT fk_sr_run FOREIGN KEY (linked_run_id) REFERENCES parity_runs(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 2. scale_rules ──────────────────────────────────────────────────────
// Lightweight class/rule config for minimum weight enforcement.
// One row per class (or category+class combo). Extensible for future rules.

echo "2. Creating scale_rules table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS scale_rules (
            id                      INT AUTO_INCREMENT PRIMARY KEY,
            category                VARCHAR(100) NOT NULL,
            class_index             VARCHAR(100) NOT NULL,
            season_year             SMALLINT NULL,

            -- Minimum weights (nullable = not enforced)
            min_total_weight        DECIMAL(8,2) NULL,
            min_rear_axle_weight    DECIMAL(8,2) NULL,
            rear_axle_required      TINYINT(1) NOT NULL DEFAULT 0,

            -- Driver reference requirement
            driver_weigh_required   TINYINT(1) NOT NULL DEFAULT 0,

            -- Flags
            is_active               TINYINT(1) NOT NULL DEFAULT 1,
            notes                   TEXT NULL,

            created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            UNIQUE KEY uk_sr_class_season (category, class_index, season_year),
            INDEX idx_sr_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 3. Seed scale_rules with common NHRA class minimums ─────────────────

echo "3. Seeding scale_rules with common class minimums...\n";
try {
    $seeds = [
        ['Top Fuel',    'TF',   2330, null,  0, 0, 'NHRA Top Fuel minimum'],
        ['Funny Car',   'FC',   2525, null,  0, 0, 'NHRA Funny Car minimum'],
        ['Pro Stock',   'PS',   2350, 1100,  1, 1, 'NHRA Pro Stock minimum (total + rear axle)'],
        ['Pro Stock Motorcycle', 'PSM', 625, null, 0, 0, 'NHRA Pro Stock Motorcycle minimum'],
        ['Top Alcohol Dragster', 'TAD', 2125, null, 0, 0, 'NHRA Top Alcohol Dragster minimum'],
        ['Top Alcohol Funny Car', 'TAFC', 2475, null, 0, 0, 'NHRA Top Alcohol Funny Car minimum'],
    ];

    $stmt = $pdo->prepare("
        INSERT IGNORE INTO scale_rules (category, class_index, season_year, min_total_weight, min_rear_axle_weight, rear_axle_required, driver_weigh_required, notes)
        VALUES (?, ?, NULL, ?, ?, ?, ?, ?)
    ");

    foreach ($seeds as $s) {
        $stmt->execute($s);
    }
    echo "   Seeded " . count($seeds) . " class rules (INSERT IGNORE)\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

echo "=== Migration v23 Complete ===\n";
echo "Tables: scale_records, scale_rules\n";
echo "Seeds: " . count($seeds ?? []) . " class rules\n";
