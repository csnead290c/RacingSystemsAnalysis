<?php
/**
 * Migration v28 — Teardown Foundation
 *
 * Creates 4 tables:
 *   1. teardown_templates      — curated teardown item definitions per category/class
 *   2. teardown_template_items — ordered items within a template
 *   3. teardown_records        — teardown header linked to tech_cases + event_entries
 *   4. teardown_observed_items — individual observed items/results per teardown record
 *
 * Seeds starter teardown templates for Top Fuel and Pro Stock.
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

// ── 1. teardown_templates ───────────────────────────────────────────────

$pdo->exec("
    CREATE TABLE IF NOT EXISTS teardown_templates (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        uuid            VARCHAR(36)  NOT NULL,
        category        VARCHAR(100) NOT NULL DEFAULT '*',
        class_index     VARCHAR(50)  NOT NULL DEFAULT '*',
        label           VARCHAR(255) NOT NULL,
        description     TEXT         NULL,
        is_active       TINYINT(1)   NOT NULL DEFAULT 1,
        sort_order      INT          NOT NULL DEFAULT 0,
        created_by      INT          NULL,
        created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uk_tdt_uuid (uuid),
        UNIQUE KEY uk_tdt_cat_class (category, class_index),
        INDEX idx_tdt_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
$results[] = 'teardown_templates: created/exists';

// ── 2. teardown_template_items ──────────────────────────────────────────

$pdo->exec("
    CREATE TABLE IF NOT EXISTS teardown_template_items (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        template_id     INT          NOT NULL,
        item_category   VARCHAR(100) NOT NULL,
        item_label      VARCHAR(500) NOT NULL,
        item_type       ENUM('serial_check','measurement','visual_check','note') NOT NULL DEFAULT 'visual_check',
        description     TEXT         NULL,
        sort_order      INT          NOT NULL DEFAULT 0,
        is_required     TINYINT(1)   NOT NULL DEFAULT 1,
        spec_min        DECIMAL(12,4) NULL,
        spec_max        DECIMAL(12,4) NULL,
        spec_unit       VARCHAR(50)  NULL,
        declaration_key VARCHAR(100) NULL,
        created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_tdti_template (template_id, sort_order),
        CONSTRAINT fk_tdti_template FOREIGN KEY (template_id) REFERENCES teardown_templates(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
$results[] = 'teardown_template_items: created/exists';

// ── 3. teardown_records ─────────────────────────────────────────────────

$pdo->exec("
    CREATE TABLE IF NOT EXISTS teardown_records (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        uuid            VARCHAR(36)  NOT NULL,
        event_entry_id  INT          NOT NULL,
        tech_case_id    INT          NULL,
        template_id     INT          NULL,
        teardown_status ENUM('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
        bay_assignment  VARCHAR(100) NULL,
        overall_result  ENUM('pass','fail','incomplete','review') NOT NULL DEFAULT 'incomplete',
        started_at      TIMESTAMP    NULL,
        completed_at    TIMESTAMP    NULL,
        operator_id     INT          NULL,
        notes           TEXT         NULL,
        created_by      INT          NOT NULL,
        created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uk_tdr_uuid (uuid),
        INDEX idx_tdr_entry (event_entry_id),
        INDEX idx_tdr_case (tech_case_id),
        INDEX idx_tdr_template (template_id),
        INDEX idx_tdr_status (teardown_status),
        INDEX idx_tdr_started (started_at),
        CONSTRAINT fk_tdr_entry FOREIGN KEY (event_entry_id) REFERENCES event_entries(id) ON DELETE CASCADE,
        CONSTRAINT fk_tdr_case FOREIGN KEY (tech_case_id) REFERENCES tech_cases(id) ON DELETE SET NULL,
        CONSTRAINT fk_tdr_template FOREIGN KEY (template_id) REFERENCES teardown_templates(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
$results[] = 'teardown_records: created/exists';

// ── 4. teardown_observed_items ──────────────────────────────────────────

$pdo->exec("
    CREATE TABLE IF NOT EXISTS teardown_observed_items (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        teardown_record_id  INT          NOT NULL,
        template_item_id    INT          NULL,
        item_category       VARCHAR(100) NOT NULL,
        item_label          VARCHAR(500) NOT NULL,
        item_type           ENUM('serial_check','measurement','visual_check','note') NOT NULL DEFAULT 'visual_check',
        observed_serial     VARCHAR(255) NULL,
        observed_value      DECIMAL(12,4) NULL,
        observed_text       TEXT         NULL,
        expected_serial     VARCHAR(255) NULL,
        expected_value_min  DECIMAL(12,4) NULL,
        expected_value_max  DECIMAL(12,4) NULL,
        spec_unit           VARCHAR(50)  NULL,
        declaration_key     VARCHAR(100) NULL,
        result              ENUM('pass','fail','na','skip','review') NULL,
        notes               TEXT         NULL,
        created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_tdoi_record (teardown_record_id),
        INDEX idx_tdoi_template_item (template_item_id),
        CONSTRAINT fk_tdoi_record FOREIGN KEY (teardown_record_id) REFERENCES teardown_records(id) ON DELETE CASCADE,
        CONSTRAINT fk_tdoi_template_item FOREIGN KEY (template_item_id) REFERENCES teardown_template_items(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
$results[] = 'teardown_observed_items: created/exists';

// ── 5. Seed starter teardown templates ──────────────────────────────────

$seeded = 0;

// Check if templates already seeded
$existing = $pdo->query("SELECT COUNT(*) FROM teardown_templates")->fetchColumn();
if ((int)$existing === 0) {
    $insTpl = $pdo->prepare("INSERT INTO teardown_templates (uuid, category, class_index, label, description, sort_order) VALUES (?,?,?,?,?,?)");
    $insItem = $pdo->prepare("INSERT INTO teardown_template_items (template_id, item_category, item_label, item_type, sort_order, is_required, spec_min, spec_max, spec_unit, declaration_key) VALUES (?,?,?,?,?,?,?,?,?,?)");

    // ── Template 1: Top Fuel Engine Teardown ──
    $insTpl->execute([tm_uuid(), 'TOP FUEL', 'TF', 'Top Fuel Engine Teardown',
        'Post-run engine teardown audit for Top Fuel dragsters — covers block, heads, supercharger, clutch, and critical measurements.', 1]);
    $tfId = (int)$pdo->lastInsertId();
    $tfItems = [
        // Engine block
        ['Engine Block', 'Engine block serial number', 'serial_check', 10, 1, null, null, null, 'declared_engine_type'],
        ['Engine Block', 'Engine displacement (cubic inches)', 'measurement', 20, 1, 496.0, 500.0, 'ci', 'declared_engine_displacement'],
        ['Engine Block', 'Cylinder bore diameter', 'measurement', 30, 1, 4.185, 4.210, 'in', null],
        ['Engine Block', 'Crankshaft stroke', 'measurement', 40, 1, 4.500, 4.500, 'in', null],
        ['Engine Block', 'Block condition / damage assessment', 'visual_check', 50, 1, null, null, null, null],
        // Heads
        ['Cylinder Heads', 'Cylinder head casting numbers', 'serial_check', 60, 1, null, null, null, null],
        ['Cylinder Heads', 'Combustion chamber volume (cc)', 'measurement', 70, 0, null, null, 'cc', null],
        ['Cylinder Heads', 'Head gasket condition', 'visual_check', 80, 1, null, null, null, null],
        // Supercharger
        ['Supercharger', 'Supercharger serial / ID', 'serial_check', 90, 1, null, null, null, 'declared_supercharger_type'],
        ['Supercharger', 'Rotor clearance', 'measurement', 100, 0, null, null, 'in', null],
        ['Supercharger', 'Case condition', 'visual_check', 110, 1, null, null, null, null],
        // Clutch
        ['Clutch Assembly', 'Clutch pack serial / count', 'serial_check', 120, 1, null, null, null, null],
        ['Clutch Assembly', 'Disc condition', 'visual_check', 130, 1, null, null, null, null],
        // General
        ['General', 'Chassis serial verification', 'serial_check', 140, 1, null, null, null, 'declared_chassis_serial'],
        ['General', 'Teardown notes', 'note', 150, 0, null, null, null, null],
    ];
    foreach ($tfItems as $it) {
        $insItem->execute([$tfId, $it[0], $it[1], $it[2], $it[3], $it[4], $it[5], $it[6], $it[7], $it[8]]);
    }
    $seeded++;

    // ── Template 2: Pro Stock Engine Teardown ──
    $insTpl->execute([tm_uuid(), 'PRO STOCK', 'PS', 'Pro Stock Engine Teardown',
        'Post-run engine teardown audit for Pro Stock — covers block, heads, intake, carburetor, and critical measurements.', 2]);
    $psId = (int)$pdo->lastInsertId();
    $psItems = [
        // Engine block
        ['Engine Block', 'Engine block serial number', 'serial_check', 10, 1, null, null, null, 'declared_engine_type'],
        ['Engine Block', 'Engine displacement (cubic inches)', 'measurement', 20, 1, 0, 500.0, 'ci', 'declared_engine_displacement'],
        ['Engine Block', 'Cylinder bore diameter', 'measurement', 30, 1, null, null, 'in', null],
        ['Engine Block', 'Crankshaft stroke', 'measurement', 40, 1, null, null, 'in', null],
        ['Engine Block', 'Block casting number', 'serial_check', 45, 1, null, null, null, null],
        ['Engine Block', 'Block condition / damage assessment', 'visual_check', 50, 1, null, null, null, null],
        // Heads
        ['Cylinder Heads', 'Cylinder head casting numbers', 'serial_check', 60, 1, null, null, null, null],
        ['Cylinder Heads', 'Intake port volume (cc)', 'measurement', 65, 0, null, null, 'cc', null],
        ['Cylinder Heads', 'Combustion chamber volume (cc)', 'measurement', 70, 0, null, null, 'cc', null],
        ['Cylinder Heads', 'Valve size (intake)', 'measurement', 75, 0, null, null, 'in', null],
        // Intake / Carb
        ['Intake / Carburetor', 'Carburetor type / ID', 'serial_check', 80, 1, null, null, null, 'declared_carburetor'],
        ['Intake / Carburetor', 'Carburetor venturi size', 'measurement', 85, 0, null, null, 'in', null],
        ['Intake / Carburetor', 'Intake manifold ID', 'serial_check', 90, 1, null, null, null, null],
        // Transmission
        ['Transmission', 'Transmission type / ID', 'serial_check', 100, 1, null, null, null, 'declared_transmission'],
        ['Transmission', 'Gear condition', 'visual_check', 110, 1, null, null, null, null],
        // General
        ['General', 'Chassis serial verification', 'serial_check', 120, 1, null, null, null, 'declared_chassis_serial'],
        ['General', 'Teardown notes', 'note', 130, 0, null, null, null, null],
    ];
    foreach ($psItems as $it) {
        $insItem->execute([$psId, $it[0], $it[1], $it[2], $it[3], $it[4], $it[5], $it[6], $it[7], $it[8]]);
    }
    $seeded++;
}
$results[] = "teardown_templates: seeded $seeded new template(s)";

// ── Output ──────────────────────────────────────────────────────────────

if (php_sapi_name() === 'cli') {
    echo "=== Migration v28: Teardown Foundation ===\n";
    foreach ($results as $r) echo "$r\n";
    echo "=== Migration v28 Complete ===\n";
} else {
    tm_json(['migration' => 'v28', 'results' => $results]);
}
