<?php
/**
 * Migration v29 — Template Admin + Compliance Workflow Strengthening
 *
 * Creates:
 *   1. required_module_config — defines which modules are required per category/class
 *   2. finding_status_history — audit trail for finding disposition changes
 *
 * Safe to re-run: uses IF NOT EXISTS.
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';
$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== Migration v29 — Template Admin + Compliance Workflow ===\n\n";

// ── 1. required_module_config ──
echo "1. Creating required_module_config...\n";
$pdo->exec("
    CREATE TABLE IF NOT EXISTS required_module_config (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        category       VARCHAR(100) NOT NULL,
        class_index    VARCHAR(100) NOT NULL DEFAULT '*',
        module_key     VARCHAR(50) NOT NULL COMMENT 'scale|fuel|inspection|techcard|teardown',
        is_required    TINYINT(1) NOT NULL DEFAULT 1,
        context        VARCHAR(50) DEFAULT 'pre_race' COMMENT 'pre_race|post_race|qualifying|eliminations',
        notes          TEXT,
        created_by     INT,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_rmc_scope (category, class_index, module_key, context)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");
echo "   OK\n";

// ── 2. finding_status_history ──
echo "2. Creating finding_status_history...\n";
$pdo->exec("
    CREATE TABLE IF NOT EXISTS finding_status_history (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        finding_id     INT NOT NULL,
        old_disposition VARCHAR(50),
        new_disposition VARCHAR(50) NOT NULL,
        notes          TEXT,
        changed_by     INT NOT NULL,
        changed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fsh_finding (finding_id),
        CONSTRAINT fk_fsh_finding FOREIGN KEY (finding_id) REFERENCES tech_findings(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");
echo "   OK\n";

// ── 3. Add is_active to inspection_templates if missing ──
echo "3. Checking inspection_templates.is_active...\n";
$cols = $pdo->query("SHOW COLUMNS FROM inspection_templates LIKE 'is_active'")->fetchAll();
if (empty($cols)) {
    $pdo->exec("ALTER TABLE inspection_templates ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1");
    echo "   Added is_active column\n";
} else {
    echo "   Already exists\n";
}

// ── 4. Add is_active to teardown_templates if missing ──
echo "4. Checking teardown_templates.is_active...\n";
$cols = $pdo->query("SHOW COLUMNS FROM teardown_templates LIKE 'is_active'")->fetchAll();
if (empty($cols)) {
    echo "   Already exists (was in original schema)\n";
} else {
    echo "   Already exists\n";
}

// ── 5. Seed default required-module configs ──
echo "5. Seeding default required-module configs...\n";
$seedCount = 0;
$defaults = [
    ['TOP FUEL', 'TF', 'scale', 'pre_race'],
    ['TOP FUEL', 'TF', 'fuel', 'pre_race'],
    ['TOP FUEL', 'TF', 'inspection', 'pre_race'],
    ['TOP FUEL', 'TF', 'techcard', 'pre_race'],
    ['TOP FUEL', 'TF', 'teardown', 'post_race'],
    ['FUNNY CAR', 'FC', 'scale', 'pre_race'],
    ['FUNNY CAR', 'FC', 'fuel', 'pre_race'],
    ['FUNNY CAR', 'FC', 'inspection', 'pre_race'],
    ['FUNNY CAR', 'FC', 'techcard', 'pre_race'],
    ['FUNNY CAR', 'FC', 'teardown', 'post_race'],
    ['PRO STOCK', 'PS', 'scale', 'pre_race'],
    ['PRO STOCK', 'PS', 'fuel', 'pre_race'],
    ['PRO STOCK', 'PS', 'inspection', 'pre_race'],
    ['PRO STOCK', 'PS', 'techcard', 'pre_race'],
    ['PRO STOCK', 'PS', 'teardown', 'post_race'],
    ['PRO STOCK MOTORCYCLE', 'PSM', 'scale', 'pre_race'],
    ['PRO STOCK MOTORCYCLE', 'PSM', 'fuel', 'pre_race'],
    ['PRO STOCK MOTORCYCLE', 'PSM', 'inspection', 'pre_race'],
    ['PRO STOCK MOTORCYCLE', 'PSM', 'techcard', 'pre_race'],
];

$insertStmt = $pdo->prepare("
    INSERT IGNORE INTO required_module_config (category, class_index, module_key, context, is_required, notes, created_by)
    VALUES (?, ?, ?, ?, 1, 'Seeded by migration v29', NULL)
");
foreach ($defaults as $d) {
    $insertStmt->execute($d);
    $seedCount += $insertStmt->rowCount();
}
echo "   Seeded $seedCount required-module configs\n";

echo "\n=== Migration v29 complete ===\n";
