<?php
/**
 * Migration v25 — Fuel MVP tables
 *
 * Creates:
 *   1. fuel_records — detail table linked to tech_cases + event_entries + optional parity_runs
 *   2. fuel_rules  — class-scoped fuel compliance rules
 *
 * Safe to re-run (IF NOT EXISTS / IF NOT EXISTS on columns).
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/tm-helpers.php';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Auth: CLI skips web auth; web requires admin
if (php_sapi_name() !== 'cli') {
    $auth = rsa_requireAuth();
    tm_requireAdmin($pdo, $auth);
}

$results = [];

// ── 1. fuel_records ─────────────────────────────────────────────────────

$pdo->exec("
    CREATE TABLE IF NOT EXISTS fuel_records (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        uuid            VARCHAR(36)   NOT NULL,
        tech_case_id    INT           NOT NULL,
        event_entry_id  INT           NOT NULL,

        check_type      ENUM('spot_check','pre_run','post_run','random','confiscation') NOT NULL DEFAULT 'spot_check',
        fuel_type_declared ENUM('nitromethane','methanol','gasoline','diesel','e85','other') DEFAULT NULL,
        sample_id       VARCHAR(100)  DEFAULT NULL,

        sg_measured     DECIMAL(8,4)  DEFAULT NULL,
        sg_expected_min DECIMAL(8,4)  DEFAULT NULL,
        sg_expected_max DECIMAL(8,4)  DEFAULT NULL,
        sg_result       ENUM('pass','fail','no_rule') DEFAULT NULL,

        dielectric_measured  DECIMAL(8,4)  DEFAULT NULL,
        dielectric_expected_min DECIMAL(8,4) DEFAULT NULL,
        dielectric_expected_max DECIMAL(8,4) DEFAULT NULL,
        dielectric_result    ENUM('pass','fail','no_rule') DEFAULT NULL,

        temperature_f   DECIMAL(6,2)  DEFAULT NULL,
        overall_result  ENUM('pass','fail','review') NOT NULL DEFAULT 'review',

        is_official     TINYINT(1)    NOT NULL DEFAULT 1,
        linked_run_id   INT           DEFAULT NULL,
        link_method     VARCHAR(50)   DEFAULT 'unlinked',
        link_confidence ENUM('high','medium','low','none') DEFAULT 'none',

        measured_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        operator_id     INT           DEFAULT NULL,
        test_station    VARCHAR(100)  DEFAULT NULL,
        notes           TEXT          DEFAULT NULL,
        created_by      INT           DEFAULT NULL,

        created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uk_fr_uuid (uuid),
        KEY idx_fr_entry (event_entry_id),
        KEY idx_fr_case (tech_case_id),
        KEY idx_fr_measured (measured_at),
        KEY idx_fr_run (linked_run_id),

        CONSTRAINT fk_fr_case  FOREIGN KEY (tech_case_id)   REFERENCES tech_cases(id) ON DELETE CASCADE,
        CONSTRAINT fk_fr_entry FOREIGN KEY (event_entry_id) REFERENCES event_entries(id) ON DELETE CASCADE,
        CONSTRAINT fk_fr_run   FOREIGN KEY (linked_run_id)  REFERENCES parity_runs(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");
$results[] = 'fuel_records: created/exists';

// ── 2. fuel_rules ───────────────────────────────────────────────────────

$pdo->exec("
    CREATE TABLE IF NOT EXISTS fuel_rules (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        category        VARCHAR(100)  NOT NULL,
        class_index     VARCHAR(100)  NOT NULL,
        season_year     INT           DEFAULT NULL,

        fuel_type_required ENUM('nitromethane','methanol','gasoline','diesel','e85','other') DEFAULT NULL,

        sg_min          DECIMAL(8,4)  DEFAULT NULL,
        sg_max          DECIMAL(8,4)  DEFAULT NULL,
        dielectric_min  DECIMAL(8,4)  DEFAULT NULL,
        dielectric_max  DECIMAL(8,4)  DEFAULT NULL,

        temperature_compensate TINYINT(1) NOT NULL DEFAULT 0,
        is_active       TINYINT(1)    NOT NULL DEFAULT 1,
        notes           TEXT          DEFAULT NULL,

        created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uk_fuel_rule (category, class_index, season_year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");
$results[] = 'fuel_rules: created/exists';

// ── 3. Seed fuel rules for major categories ─────────────────────────────

$seedCount = 0;
$seeds = [
    // Top Fuel: 90% nitromethane max
    ['TOP FUEL', 'TF', null, 'nitromethane', 0.9800, 1.1500, null, null, 0, 'NHRA max 90% nitromethane blend'],
    // Funny Car: 90% nitromethane max (same as TF)
    ['FUNNY CAR', 'FC', null, 'nitromethane', 0.9800, 1.1500, null, null, 0, 'NHRA max 90% nitromethane blend'],
    // Pro Stock: gasoline only, strict SG range
    ['PRO STOCK', 'PS', null, 'gasoline', 0.7100, 0.7700, null, null, 1, 'NHRA-approved racing gasoline only'],
    // Pro Stock Motorcycle: gasoline only
    ['PRO STOCK MOTORCYCLE', 'PSM', null, 'gasoline', 0.7100, 0.7700, null, null, 1, 'NHRA-approved racing gasoline only'],
    // Top Alcohol Dragster: methanol
    ['TOP ALCOHOL', 'TAD', null, 'methanol', 0.7900, 0.8100, null, null, 0, 'Pure methanol required'],
    // Top Alcohol Funny Car: methanol
    ['TOP ALCOHOL', 'TAFC', null, 'methanol', 0.7900, 0.8100, null, null, 0, 'Pure methanol required'],
];

$insertSeed = $pdo->prepare("
    INSERT IGNORE INTO fuel_rules
        (category, class_index, season_year, fuel_type_required, sg_min, sg_max, dielectric_min, dielectric_max, temperature_compensate, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
");

foreach ($seeds as $s) {
    $insertSeed->execute($s);
    if ($insertSeed->rowCount() > 0) $seedCount++;
}
$results[] = "fuel_rules: seeded $seedCount new rules";

// ── Done ────────────────────────────────────────────────────────────────

if (php_sapi_name() === 'cli') {
    echo "=== Migration v25: Fuel MVP ===\n";
    foreach ($results as $r) echo "$r\n";
    echo "=== Migration v25 Complete ===\n";
} else {
    tm_json(['migration' => 'v25-tm-fuel', 'results' => $results]);
}
