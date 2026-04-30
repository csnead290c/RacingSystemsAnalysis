<?php
/**
 * Migration v26 — General Tech / Inspection Foundation
 *
 * Creates 4 tables:
 *   1. inspection_templates     — category/class-scoped template headers
 *   2. inspection_template_items — ordered checklist/measurement/note items
 *   3. inspection_records       — detail table linked to tech_cases + event_entries
 *   4. inspection_responses     — individual item responses per inspection record
 *
 * Seeds starter templates for proof-of-pattern.
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

// ── 1. inspection_templates ─────────────────────────────────────────────

$pdo->exec("
    CREATE TABLE IF NOT EXISTS inspection_templates (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        uuid            VARCHAR(36)  NOT NULL,
        template_type   ENUM('general_tech','body','chassis') NOT NULL DEFAULT 'general_tech',
        category        VARCHAR(100) NOT NULL,
        class_index     VARCHAR(50)  NOT NULL DEFAULT '*',
        season_year     INT          NULL,
        label           VARCHAR(255) NOT NULL,
        description     TEXT         NULL,
        is_active       TINYINT(1)   NOT NULL DEFAULT 1,
        sort_order      INT          NOT NULL DEFAULT 0,
        created_by      INT          NULL,
        created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uk_it_uuid (uuid),
        UNIQUE KEY uk_it_scope (template_type, category, class_index, season_year),
        INDEX idx_it_active (is_active, template_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
$results[] = 'inspection_templates: created/exists';

// ── 2. inspection_template_items ────────────────────────────────────────

$pdo->exec("
    CREATE TABLE IF NOT EXISTS inspection_template_items (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        template_id     INT          NOT NULL,
        item_type       ENUM('checkbox','measurement','note') NOT NULL DEFAULT 'checkbox',
        label           VARCHAR(500) NOT NULL,
        description     TEXT         NULL,
        sort_order      INT          NOT NULL DEFAULT 0,
        is_required     TINYINT(1)   NOT NULL DEFAULT 1,
        spec_min        DECIMAL(10,4) NULL,
        spec_max        DECIMAL(10,4) NULL,
        spec_unit       VARCHAR(50)  NULL,
        expected_value  VARCHAR(255) NULL,
        created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_iti_template (template_id, sort_order),
        CONSTRAINT fk_iti_template FOREIGN KEY (template_id) REFERENCES inspection_templates(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
$results[] = 'inspection_template_items: created/exists';

// ── 3. inspection_records ───────────────────────────────────────────────

$pdo->exec("
    CREATE TABLE IF NOT EXISTS inspection_records (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        uuid            VARCHAR(36)  NOT NULL,
        tech_case_id    INT          NOT NULL,
        event_entry_id  INT          NOT NULL,
        template_id     INT          NULL,
        overall_result  ENUM('pass','fail','incomplete','review') NOT NULL DEFAULT 'incomplete',
        is_official     TINYINT(1)   NOT NULL DEFAULT 1,
        measured_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at    TIMESTAMP    NULL,
        operator_id     INT          NULL,
        inspection_area VARCHAR(100) NULL,
        notes           TEXT         NULL,
        created_by      INT          NOT NULL,
        created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uk_ir_uuid (uuid),
        INDEX idx_ir_entry (event_entry_id),
        INDEX idx_ir_case (tech_case_id),
        INDEX idx_ir_template (template_id),
        INDEX idx_ir_measured (measured_at),
        CONSTRAINT fk_ir_case FOREIGN KEY (tech_case_id) REFERENCES tech_cases(id) ON DELETE CASCADE,
        CONSTRAINT fk_ir_entry FOREIGN KEY (event_entry_id) REFERENCES event_entries(id) ON DELETE CASCADE,
        CONSTRAINT fk_ir_template FOREIGN KEY (template_id) REFERENCES inspection_templates(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
$results[] = 'inspection_records: created/exists';

// ── 4. inspection_responses ─────────────────────────────────────────────

$pdo->exec("
    CREATE TABLE IF NOT EXISTS inspection_responses (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        inspection_record_id INT         NOT NULL,
        template_item_id    INT          NULL,
        item_label          VARCHAR(500) NOT NULL,
        item_type           ENUM('checkbox','measurement','note') NOT NULL DEFAULT 'checkbox',
        bool_value          TINYINT(1)   NULL,
        numeric_value       DECIMAL(10,4) NULL,
        text_value          TEXT         NULL,
        result              ENUM('pass','fail','na','skip') NULL,
        notes               TEXT         NULL,
        created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_iresp_record (inspection_record_id),
        INDEX idx_iresp_item (template_item_id),
        CONSTRAINT fk_iresp_record FOREIGN KEY (inspection_record_id) REFERENCES inspection_records(id) ON DELETE CASCADE,
        CONSTRAINT fk_iresp_item FOREIGN KEY (template_item_id) REFERENCES inspection_template_items(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
$results[] = 'inspection_responses: created/exists';

// ── 5. Seed starter templates ───────────────────────────────────────────

$seeded = 0;

// Helper to insert a template + items atomically
function seedTemplate(PDO $pdo, array $header, array $items): bool {
    // Check if already exists
    $check = $pdo->prepare("
        SELECT id FROM inspection_templates
        WHERE template_type = ? AND category = ? AND class_index = ? AND season_year IS NULL
    ");
    $check->execute([$header['template_type'], $header['category'], $header['class_index']]);
    if ($check->fetch()) return false; // already seeded

    $uuid = tm_uuid();
    $ins = $pdo->prepare("
        INSERT INTO inspection_templates (uuid, template_type, category, class_index, label, description, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $ins->execute([
        $uuid,
        $header['template_type'],
        $header['category'],
        $header['class_index'],
        $header['label'],
        $header['description'] ?? null,
        $header['sort_order'] ?? 0,
    ]);
    $templateId = (int)$pdo->lastInsertId();

    $insItem = $pdo->prepare("
        INSERT INTO inspection_template_items
            (template_id, item_type, label, description, sort_order, is_required, spec_min, spec_max, spec_unit, expected_value)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    foreach ($items as $i => $item) {
        $insItem->execute([
            $templateId,
            $item['item_type'] ?? 'checkbox',
            $item['label'],
            $item['description'] ?? null,
            $item['sort_order'] ?? ($i + 1) * 10,
            $item['is_required'] ?? 1,
            $item['spec_min'] ?? null,
            $item['spec_max'] ?? null,
            $item['spec_unit'] ?? null,
            $item['expected_value'] ?? null,
        ]);
    }
    return true;
}

// Template 1: General Tech — All Categories (wildcard)
if (seedTemplate($pdo, [
    'template_type' => 'general_tech',
    'category' => '*',
    'class_index' => '*',
    'label' => 'General Pre-Race Tech Inspection',
    'description' => 'Standard general tech inspection applicable to all categories. Covers safety equipment, credentials, and basic compliance.',
    'sort_order' => 1,
], [
    ['item_type' => 'checkbox', 'label' => 'Valid NHRA tech credential / license presented', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Fire suppression system present and charged', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Kill switch operational (tested)', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Helmet and driver safety equipment meets SFI/FIA spec', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Seat belts / harness current and properly mounted', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Roll cage / chassis certification tag current', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Battery secured and terminals covered', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Throttle return spring(s) functional', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Fluid containment (oil, coolant, fuel) — no visible leaks', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Competition number clearly visible and correct', 'is_required' => 1],
    ['item_type' => 'note', 'label' => 'General notes / observations', 'is_required' => 0],
])) $seeded++;

// Template 2: Body/Chassis — Top Fuel / TF
if (seedTemplate($pdo, [
    'template_type' => 'body',
    'category' => 'TOP FUEL',
    'class_index' => 'TF',
    'label' => 'Top Fuel Body & Chassis Inspection',
    'description' => 'Body template compliance and chassis dimensional checks for Top Fuel dragsters.',
    'sort_order' => 10,
], [
    ['item_type' => 'measurement', 'label' => 'Wheelbase (inches)', 'spec_min' => 270.0, 'spec_max' => 300.0, 'spec_unit' => 'in', 'is_required' => 1],
    ['item_type' => 'measurement', 'label' => 'Rear wing height from ground (inches)', 'spec_min' => null, 'spec_max' => 90.0, 'spec_unit' => 'in', 'is_required' => 1],
    ['item_type' => 'measurement', 'label' => 'Rear wing width (inches)', 'spec_min' => null, 'spec_max' => 48.0, 'spec_unit' => 'in', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Body template conforms to approved outline', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Chassis SFI certification tag present and current', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Parachute(s) packed and deployment mechanism functional', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Burst panel(s) present and intact', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Titanium shield / ballistic blanket in place', 'is_required' => 1],
    ['item_type' => 'measurement', 'label' => 'Front wing ground clearance (inches)', 'spec_min' => 3.0, 'spec_max' => null, 'spec_unit' => 'in', 'is_required' => 0],
    ['item_type' => 'note', 'label' => 'Body/chassis notes', 'is_required' => 0],
])) $seeded++;

// Template 3: Body — Pro Stock / PS
if (seedTemplate($pdo, [
    'template_type' => 'body',
    'category' => 'PRO STOCK',
    'class_index' => 'PS',
    'label' => 'Pro Stock Body Inspection',
    'description' => 'Body template compliance and dimensional checks for Pro Stock vehicles.',
    'sort_order' => 20,
], [
    ['item_type' => 'measurement', 'label' => 'Wheelbase (inches)', 'spec_min' => 104.0, 'spec_max' => 105.5, 'spec_unit' => 'in', 'is_required' => 1],
    ['item_type' => 'measurement', 'label' => 'Overall height (inches)', 'spec_min' => 47.0, 'spec_max' => 53.0, 'spec_unit' => 'in', 'is_required' => 1],
    ['item_type' => 'measurement', 'label' => 'Front overhang (inches)', 'spec_min' => null, 'spec_max' => 50.0, 'spec_unit' => 'in', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Body conforms to approved manufacturer template', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Hood scoop within dimensional limits', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'All body panels OEM-profile or approved', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Windshield meets minimum thickness spec', 'is_required' => 1],
    ['item_type' => 'checkbox', 'label' => 'Chassis SFI certification tag present and current', 'is_required' => 1],
    ['item_type' => 'note', 'label' => 'Body inspection notes', 'is_required' => 0],
])) $seeded++;

$results[] = "inspection_templates: seeded $seeded new template(s)";

// ── Output ──────────────────────────────────────────────────────────────

if (php_sapi_name() === 'cli') {
    echo "=== Migration v26: General Tech / Inspection Foundation ===\n";
    foreach ($results as $r) echo "$r\n";
    echo "=== Migration v26 Complete ===\n";
} else {
    tm_json(['migration' => 'v26', 'results' => $results]);
}
