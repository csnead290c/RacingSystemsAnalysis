<?php
/**
 * Migration v14: Add run_time_local column to parity_runs
 *
 * The NHRA OData timestamps represent EVENT LOCAL wall-clock time.
 * Previously we stored them directly into run_timestamp_utc, which was
 * incorrect — they were local times mislabeled as UTC.
 *
 * This migration:
 *   1. Adds run_time_local DATETIME NULL column to parity_runs
 *   2. Ensures idx on run_timestamp_utc exists
 *   3. Adds idx on run_time_local
 *
 * Safe to run multiple times (uses IF NOT EXISTS / column-check).
 */

require_once __DIR__ . '/config.php';

echo "=== Migration v14: run_time_local ===\n\n";

function v14_addColumn(PDO $pdo, string $table, string $column, string $definition): void {
    $stmt = $pdo->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
    if ($stmt->rowCount() > 0) {
        echo "  Column $table.$column already exists — skip\n";
        return;
    }
    $pdo->exec("ALTER TABLE `$table` ADD COLUMN $definition");
    echo "  Added $table.$column\n";
}

function v14_addIndex(PDO $pdo, string $table, string $indexName, string $columns): void {
    $stmt = $pdo->query("SHOW INDEX FROM `$table` WHERE Key_name = '$indexName'");
    if ($stmt->rowCount() > 0) {
        echo "  Index $indexName already exists — skip\n";
        return;
    }
    $pdo->exec("ALTER TABLE `$table` ADD INDEX `$indexName` ($columns)");
    echo "  Added index $indexName on $table($columns)\n";
}

// ── 1. Add run_time_local column ─────────────────────────────────────────
echo "1. Adding run_time_local to parity_runs...\n";
try {
    v14_addColumn($pdo, 'parity_runs', 'run_time_local', 'run_time_local DATETIME NULL AFTER run_timestamp_utc');
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 2. Ensure index on run_timestamp_utc ─────────────────────────────────
echo "2. Ensuring index on run_timestamp_utc...\n";
try {
    v14_addIndex($pdo, 'parity_runs', 'idx_pr_timestamp', 'run_timestamp_utc');
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   OK (index may already exist): " . $e->getMessage() . "\n\n";
}

// ── 3. Add index on run_time_local ───────────────────────────────────────
echo "3. Adding index on run_time_local...\n";
try {
    v14_addIndex($pdo, 'parity_runs', 'idx_pr_time_local', 'run_time_local');
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

echo "=== Migration v14 Complete ===\n";
echo "Changes: parity_runs +run_time_local, +idx_pr_time_local\n";
