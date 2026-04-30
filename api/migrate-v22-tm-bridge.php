<?php
/**
 * Migration v22: Tech Master Bridge FKs on existing parity tables
 *
 * Adds nullable foreign keys to existing parity tables to link them
 * to the new Tech Master backbone. No existing columns are changed.
 *
 * Safe to run multiple times (column/FK existence checks).
 * Depends on: v20 (event_entries), v21 (tech_cases), v19 (persons)
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

echo "=== Migration v22: Tech Master Bridge FKs ===\n\n";
flush();

// ── Helpers ─────────────────────────────────────────────────────────────

function colExistsV22(PDO $pdo, string $table, string $column): bool {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    ");
    $stmt->execute([$table, $column]);
    return (int)$stmt->fetchColumn() > 0;
}

function addColV22(PDO $pdo, string $table, string $column, string $def): void {
    if (colExistsV22($pdo, $table, $column)) {
        echo "   Exists: $table.$column\n";
        return;
    }
    $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$column` $def");
    echo "   Added: $table.$column\n";
}

function fkExistsV22(PDO $pdo, string $table, string $fkName): bool {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?
    ");
    $stmt->execute([$table, $fkName]);
    return (int)$stmt->fetchColumn() > 0;
}

function addFkV22(PDO $pdo, string $table, string $fkName, string $ddl): void {
    if (fkExistsV22($pdo, $table, $fkName)) {
        echo "   Exists: FK $fkName\n";
        return;
    }
    try {
        $pdo->exec($ddl);
        echo "   Added: FK $fkName\n";
    } catch (PDOException $e) {
        echo "   FAILED: FK $fkName — " . $e->getMessage() . "\n";
    }
}

function idxExistsV22(PDO $pdo, string $table, string $idxName): bool {
    try {
        $stmt = $pdo->query("SHOW INDEX FROM `$table` WHERE Key_name = '$idxName'");
        return $stmt->rowCount() > 0;
    } catch (PDOException $e) {
        return false;
    }
}

function addIdxV22(PDO $pdo, string $table, string $idxName, string $ddl): void {
    if (idxExistsV22($pdo, $table, $idxName)) {
        echo "   Exists: IDX $idxName\n";
        return;
    }
    try {
        $pdo->exec($ddl);
        echo "   Added: IDX $idxName\n";
    } catch (PDOException $e) {
        echo "   FAILED: IDX $idxName — " . $e->getMessage() . "\n";
    }
}

function tableExistsV22(PDO $pdo, string $table): bool {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    ");
    $stmt->execute([$table]);
    return (int)$stmt->fetchColumn() > 0;
}

// ── 1. parity_runs.event_entry_id ───────────────────────────────────────

echo "1. Bridge: parity_runs.event_entry_id...\n";
if (tableExistsV22($pdo, 'parity_runs')) {
    addColV22($pdo, 'parity_runs', 'event_entry_id', 'INT NULL');
    addIdxV22($pdo, 'parity_runs', 'idx_pr_entry',
        "ALTER TABLE parity_runs ADD INDEX idx_pr_entry (event_entry_id)");
    addFkV22($pdo, 'parity_runs', 'fk_pr_entry',
        "ALTER TABLE parity_runs ADD CONSTRAINT fk_pr_entry FOREIGN KEY (event_entry_id) REFERENCES event_entries(id) ON DELETE SET NULL");
} else {
    echo "   Skipped: parity_runs does not exist\n";
}
echo "\n";

// ── 2. parity_driver_combos.person_id ───────────────────────────────────

echo "2. Bridge: parity_driver_combos.person_id...\n";
if (tableExistsV22($pdo, 'parity_driver_combos')) {
    addColV22($pdo, 'parity_driver_combos', 'person_id', 'INT NULL');
    addIdxV22($pdo, 'parity_driver_combos', 'idx_pdc_person',
        "ALTER TABLE parity_driver_combos ADD INDEX idx_pdc_person (person_id)");
    addFkV22($pdo, 'parity_driver_combos', 'fk_pdc_person',
        "ALTER TABLE parity_driver_combos ADD CONSTRAINT fk_pdc_person FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE SET NULL");
} else {
    echo "   Skipped: parity_driver_combos does not exist\n";
}
echo "\n";

// ── 3. run_incidents.tech_case_id ───────────────────────────────────────

echo "3. Bridge: run_incidents.tech_case_id...\n";
if (tableExistsV22($pdo, 'run_incidents')) {
    addColV22($pdo, 'run_incidents', 'tech_case_id', 'INT NULL');
    addIdxV22($pdo, 'run_incidents', 'idx_ri_techcase',
        "ALTER TABLE run_incidents ADD INDEX idx_ri_techcase (tech_case_id)");
    addFkV22($pdo, 'run_incidents', 'fk_ri_techcase',
        "ALTER TABLE run_incidents ADD CONSTRAINT fk_ri_techcase FOREIGN KEY (tech_case_id) REFERENCES tech_cases(id) ON DELETE SET NULL");
} else {
    echo "   Skipped: run_incidents does not exist\n";
}
echo "\n";

// ── 4. incident_analysis_sessions.tech_case_id ──────────────────────────

echo "4. Bridge: incident_analysis_sessions.tech_case_id...\n";
if (tableExistsV22($pdo, 'incident_analysis_sessions')) {
    addColV22($pdo, 'incident_analysis_sessions', 'tech_case_id', 'INT NULL');
    addIdxV22($pdo, 'incident_analysis_sessions', 'idx_ias_techcase',
        "ALTER TABLE incident_analysis_sessions ADD INDEX idx_ias_techcase (tech_case_id)");
    addFkV22($pdo, 'incident_analysis_sessions', 'fk_ias_techcase',
        "ALTER TABLE incident_analysis_sessions ADD CONSTRAINT fk_ias_techcase FOREIGN KEY (tech_case_id) REFERENCES tech_cases(id) ON DELETE SET NULL");
} else {
    echo "   Skipped: incident_analysis_sessions does not exist\n";
}
echo "\n";

echo "=== Migration v22 Complete ===\n";
echo "Bridge FKs added (all nullable, all ON DELETE SET NULL):\n";
echo "  parity_runs.event_entry_id → event_entries\n";
echo "  parity_driver_combos.person_id → persons\n";
echo "  run_incidents.tech_case_id → tech_cases\n";
echo "  incident_analysis_sessions.tech_case_id → tech_cases\n";
