<?php
/**
 * Migration v24: Tech Master Linkage Hardening
 *
 * Adds columns to support historical entry derivation, run-entry linkage
 * confidence tracking, and scale link hardening.
 *
 * Safe to run multiple times (IF NOT EXISTS / column-exists checks).
 * Depends on: v20 (event_entries), v22 (bridge FKs), v23 (scale_records)
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

// Admin gate
$auth = rsa_getAuthUser();
if (!$auth || !in_array($auth['role'] ?? '', ['admin', 'owner'])) {
    http_response_code(403);
    echo "Forbidden: admin role required.\n";
    exit(1);
}

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== Migration v24: Tech Master Linkage Hardening ===\n\n";
flush();

function colExistsV24(PDO $pdo, string $table, string $col): bool {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    ");
    $stmt->execute([$table, $col]);
    return (int)$stmt->fetchColumn() > 0;
}

function addColV24(PDO $pdo, string $table, string $col, string $def): void {
    if (colExistsV24($pdo, $table, $col)) {
        echo "   Exists: $table.$col\n";
    } else {
        $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$col` $def");
        echo "   Added: $table.$col\n";
    }
}

function addIndexSafeV24(PDO $pdo, string $name, string $ddl): void {
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

// ── 1. event_entries.derivation_source ──────────────────────────────────
// Tracks how an entry was created: 'manual', 'roster_import', 'run_derived'

echo "1. event_entries.derivation_source...\n";
addColV24($pdo, 'event_entries', 'derivation_source',
    "ENUM('manual','roster_import','run_derived') NULL DEFAULT NULL AFTER notes");
echo "\n";

// ── 2. event_entries.source_driver_name ─────────────────────────────────
// For run-derived entries, stores the original driver_name from parity_runs
// to support dedup and review without requiring a persons record.

echo "2. event_entries.source_driver_name...\n";
addColV24($pdo, 'event_entries', 'source_driver_name',
    "VARCHAR(255) NULL DEFAULT NULL AFTER derivation_source");
echo "\n";

// ── 3. scale_records.link_confidence ────────────────────────────────────
// Confidence level for the run-link: 'high', 'medium', 'low', 'none'

echo "3. scale_records.link_confidence...\n";
addColV24($pdo, 'scale_records', 'link_confidence',
    "ENUM('high','medium','low','none') NULL DEFAULT NULL AFTER link_method");
echo "\n";

// ── 4. Index for derivation dedup: event_instance_id + source_driver_name
echo "4. Index for derivation dedup...\n";
addIndexSafeV24($pdo, 'idx_ee_derive_dedup',
    "ALTER TABLE event_entries ADD INDEX idx_ee_derive_dedup (event_instance_id, source_driver_name)");
echo "\n";

// ── 5. Index on parity_runs for backfill queries
echo "5. Index for backfill: parity_runs(race_lookup, driver_name, event_entry_id)...\n";
addIndexSafeV24($pdo, 'idx_pr_backfill',
    "ALTER TABLE parity_runs ADD INDEX idx_pr_backfill (race_lookup, driver_name, event_entry_id)");
echo "\n";

// ── 6. Backfill derivation_source for existing entries
echo "6. Backfill derivation_source='manual' for existing entries without a source...\n";
$updated = $pdo->exec("UPDATE event_entries SET derivation_source = 'manual' WHERE derivation_source IS NULL");
echo "   Updated: $updated rows\n\n";

echo "=== Migration v24 Complete ===\n";
echo "Added: event_entries.derivation_source, event_entries.source_driver_name\n";
echo "Added: scale_records.link_confidence\n";
echo "Added: idx_ee_derive_dedup, idx_pr_backfill\n";
