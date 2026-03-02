<?php
/**
 * Migration v7: Database Size Optimization
 *
 * Problem: Database is at ~1080 MB, exceeding the 1000 MB hosting limit.
 *   - parity_runs_raw:  619 MB (57%) — audit trail, never queried
 *   - parity_runs:      457 MB (42%) — normalized run data, actively queried
 *   - Everything else:    4 MB  (0.4%)
 *
 * Optimization Plan (3 phases, run in order):
 *
 * Phase 1: Drop redundant indexes (~50–80 MB savings)
 *   - parity_runs.idx_pr_race — prefix of uk_pr_race_hash and uk_pr_race_sourceref
 *   - parity_runs_raw.idx_prr_import — prefix of uk_prr_import_hash
 *
 * Phase 2: Archive parity_runs_raw.raw_json (~268 MB savings)
 *   - Set raw_json = NULL for all rows (keep metadata: uuid, import_id, row_hash)
 *   - The raw_json column stores original OData JSON — already parsed into parity_runs
 *   - row_hash is preserved for cross-import deduplication
 *
 * Phase 3: Reclaim space
 *   - OPTIMIZE TABLE on both tables to reclaim freed pages
 *
 * Rollback Plan:
 *   - Phase 1: Re-create dropped indexes (DDL provided below)
 *   - Phase 2: raw_json is NOT recoverable once NULLed — but data can be re-ingested
 *     from the OData source. The parsed fields in parity_runs are authoritative.
 *   - Phase 3: OPTIMIZE is non-destructive
 *
 * Expected savings: ~320–400 MB → DB drops to ~680–760 MB (well under 1000 MB)
 *
 * Safe to re-run: Yes (all operations are idempotent).
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';
$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$phase = $_GET['phase'] ?? 'report';
$dryRun = ($_GET['dry'] ?? '1') === '1';

header('Content-Type: text/plain; charset=utf-8');

echo "=== Migration v7: DB Size Optimization ===\n";
echo "Phase: {$phase}\n";
echo "Dry run: " . ($dryRun ? 'YES (no changes)' : 'NO (LIVE)') . "\n";
echo "Time: " . date('c') . "\n\n";

// ── Report current state ──────────────────────────────────────────────
function reportState(PDO $pdo): void {
    $dbName = DB_NAME;
    $stmt = $pdo->query("
        SELECT TABLE_NAME, TABLE_ROWS,
               ROUND(DATA_LENGTH/1024/1024, 2) AS data_mb,
               ROUND(INDEX_LENGTH/1024/1024, 2) AS idx_mb,
               ROUND((DATA_LENGTH+INDEX_LENGTH)/1024/1024, 2) AS total_mb
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = '{$dbName}' AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY (DATA_LENGTH+INDEX_LENGTH) DESC LIMIT 10
    ");
    echo "Top tables by size:\n";
    printf("  %-30s %10s %10s %10s %10s\n", 'TABLE', 'ROWS', 'DATA_MB', 'IDX_MB', 'TOTAL_MB');
    printf("  %-30s %10s %10s %10s %10s\n", str_repeat('-', 30), str_repeat('-', 10), str_repeat('-', 10), str_repeat('-', 10), str_repeat('-', 10));
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        printf("  %-30s %10s %10s %10s %10s\n",
            $row['TABLE_NAME'], $row['TABLE_ROWS'],
            $row['data_mb'], $row['idx_mb'], $row['total_mb']);
    }

    $stmt = $pdo->query("SELECT ROUND(SUM(DATA_LENGTH+INDEX_LENGTH)/1024/1024, 2) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA = '{$dbName}'");
    $total = $stmt->fetch()['total'];
    echo "\n  TOTAL DATABASE SIZE: {$total} MB\n";
    echo "  HOST LIMIT: 1000 MB\n";
    $pct = round(($total / 1000) * 100, 1);
    echo "  USAGE: {$pct}%\n\n";
}

// Always show current state
echo "── BEFORE ──\n";
reportState($pdo);

// ── Phase 1: Drop redundant indexes ──────────────────────────────────
if ($phase === '1' || $phase === 'all') {
    echo "── PHASE 1: Drop redundant indexes ──\n\n";

    $indexDrops = [
        // parity_runs.idx_pr_race is prefix of uk_pr_race_hash(race_lookup, row_hash)
        ['parity_runs', 'idx_pr_race'],
        // parity_runs_raw.idx_prr_import is prefix of uk_prr_import_hash(import_id, row_hash)
        ['parity_runs_raw', 'idx_prr_import'],
    ];

    foreach ($indexDrops as [$table, $index]) {
        // Check if index exists
        $stmt = $pdo->prepare("
            SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?
        ");
        $stmt->execute([DB_NAME, $table, $index]);
        $exists = (int)$stmt->fetch()['cnt'] > 0;

        if (!$exists) {
            echo "  SKIP: {$table}.{$index} — already dropped\n";
            continue;
        }

        $sql = "ALTER TABLE `{$table}` DROP INDEX `{$index}`";
        if ($dryRun) {
            echo "  DRY RUN: {$sql}\n";
        } else {
            echo "  EXECUTING: {$sql} ... ";
            $pdo->exec($sql);
            echo "OK\n";
        }
    }

    echo "\n";
    if (!$dryRun) {
        echo "── AFTER PHASE 1 ──\n";
        reportState($pdo);
    }
}

// ── Phase 2: NULL out raw_json in parity_runs_raw ────────────────────
if ($phase === '2' || $phase === 'all') {
    echo "── PHASE 2: Archive raw_json (set NULL) ──\n\n";

    // First report current raw_json size
    $stmt = $pdo->query("
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN raw_json IS NOT NULL AND LENGTH(raw_json) > 0 THEN 1 ELSE 0 END) AS non_null,
               ROUND(SUM(LENGTH(raw_json))/1024/1024, 1) AS size_mb
        FROM parity_runs_raw
    ");
    $info = $stmt->fetch();
    echo "  Current raw_json: {$info['non_null']}/{$info['total']} rows with data, {$info['size_mb']} MB\n";

    // Verify parity_runs has matching data (safety check)
    $stmt = $pdo->query("SELECT COUNT(*) AS cnt FROM parity_runs");
    $runsCount = (int)$stmt->fetch()['cnt'];
    $stmt = $pdo->query("SELECT COUNT(*) AS cnt FROM parity_runs_raw");
    $rawCount = (int)$stmt->fetch()['cnt'];
    echo "  parity_runs: {$runsCount} rows\n";
    echo "  parity_runs_raw: {$rawCount} rows\n";

    if ($runsCount === 0) {
        echo "  ERROR: parity_runs is empty! Aborting — raw_json may be needed.\n";
    } else {
        $sql = "UPDATE parity_runs_raw SET raw_json = NULL WHERE raw_json IS NOT NULL";
        if ($dryRun) {
            echo "  DRY RUN: {$sql}\n";
        } else {
            echo "  EXECUTING: {$sql} ... ";
            $affected = $pdo->exec($sql);
            echo "OK ({$affected} rows updated)\n";
        }
    }

    echo "\n";
    if (!$dryRun) {
        echo "── AFTER PHASE 2 ──\n";
        reportState($pdo);
    }
}

// ── Phase 3: OPTIMIZE TABLE ──────────────────────────────────────────
if ($phase === '3' || $phase === 'all') {
    echo "── PHASE 3: OPTIMIZE TABLE (reclaim space) ──\n\n";
    echo "  NOTE: This may take several minutes for large tables.\n\n";

    $optimizeTables = ['parity_runs_raw', 'parity_runs'];

    foreach ($optimizeTables as $table) {
        $sql = "OPTIMIZE TABLE `{$table}`";
        if ($dryRun) {
            echo "  DRY RUN: {$sql}\n";
        } else {
            echo "  EXECUTING: {$sql} ... ";
            $result = $pdo->query($sql);
            $row = $result->fetch();
            $msg = $row['Msg_text'] ?? 'done';
            echo "OK ({$msg})\n";
        }
    }

    echo "\n";
    if (!$dryRun) {
        echo "── AFTER PHASE 3 ──\n";
        reportState($pdo);
    }
}

// ── Phase 4: Drop parity_runs_raw table ──────────────────────────────
if ($phase === '4' || $phase === 'all') {
    echo "── PHASE 4: Drop parity_runs_raw table ──\n\n";
    echo "  PREREQUISITE: parity.php must be updated to stop writing to parity_runs_raw.\n";
    echo "  Dedup is now handled by parity_runs unique index uk_pr_race_hash(race_lookup, row_hash).\n\n";

    // Check if table exists
    $stmt = $pdo->prepare("
        SELECT COUNT(*) AS cnt FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'parity_runs_raw'
    ");
    $stmt->execute([DB_NAME]);
    $exists = (int)$stmt->fetch()['cnt'] > 0;

    if (!$exists) {
        echo "  SKIP: parity_runs_raw already dropped.\n";
    } else {
        // Verify raw_json is all NULL (safety check)
        $stmt = $pdo->query("SELECT COUNT(*) AS cnt FROM parity_runs_raw WHERE raw_json IS NOT NULL");
        $nonNull = (int)$stmt->fetch()['cnt'];
        if ($nonNull > 0) {
            echo "  WARNING: {$nonNull} rows still have raw_json data.\n";
            echo "  Run Phase 2 first to NULL out raw_json.\n";
        }

        // Rename to backup first, then drop
        $sql = "RENAME TABLE parity_runs_raw TO _parity_runs_raw_backup_v7";
        if ($dryRun) {
            echo "  DRY RUN: {$sql}\n";
            echo "  DRY RUN: DROP TABLE _parity_runs_raw_backup_v7\n";
        } else {
            // First rename as backup
            echo "  EXECUTING: {$sql} ... ";
            try {
                $pdo->exec($sql);
                echo "OK\n";
            } catch (PDOException $e) {
                // Backup table may already exist from a previous run
                if (strpos($e->getMessage(), 'already exists') !== false) {
                    echo "backup already exists, dropping original directly\n";
                    $sql = "DROP TABLE parity_runs_raw";
                    echo "  EXECUTING: {$sql} ... ";
                    $pdo->exec($sql);
                    echo "OK\n";
                } else {
                    throw $e;
                }
            }

            // Now drop the backup
            echo "  EXECUTING: DROP TABLE IF EXISTS _parity_runs_raw_backup_v7 ... ";
            $pdo->exec("DROP TABLE IF EXISTS _parity_runs_raw_backup_v7");
            echo "OK\n";
        }
    }

    echo "\n";
    if (!$dryRun) {
        echo "── AFTER PHASE 4 ──\n";
        reportState($pdo);
    }
}

// ── Rollback instructions ────────────────────────────────────────────
if ($phase === 'rollback-info') {
    echo "── ROLLBACK INSTRUCTIONS ──\n\n";
    echo "Phase 1 rollback (re-create dropped indexes):\n";
    echo "  ALTER TABLE parity_runs ADD INDEX idx_pr_race (race_lookup);\n";
    echo "  -- parity_runs_raw indexes: N/A if table was dropped in Phase 4\n\n";
    echo "Phase 2 rollback (raw_json data):\n";
    echo "  raw_json cannot be restored from DB — it was NULLed.\n";
    echo "  The data can be re-ingested from the OData source if needed.\n";
    echo "  All parsed fields are preserved in parity_runs.\n\n";
    echo "Phase 3 rollback:\n";
    echo "  OPTIMIZE TABLE is non-destructive, no rollback needed.\n\n";
    echo "Phase 4 rollback (re-create parity_runs_raw):\n";
    echo "  CREATE TABLE parity_runs_raw (\n";
    echo "    id INT AUTO_INCREMENT PRIMARY KEY,\n";
    echo "    uuid VARCHAR(36) NOT NULL,\n";
    echo "    import_id INT NOT NULL,\n";
    echo "    row_hash VARCHAR(64) NOT NULL,\n";
    echo "    raw_json JSON DEFAULT NULL,\n";
    echo "    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n";
    echo "    UNIQUE KEY uuid (uuid),\n";
    echo "    UNIQUE KEY uk_prr_import_hash (import_id, row_hash),\n";
    echo "    KEY idx_prr_rowhash (row_hash)\n";
    echo "  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n";
    echo "  -- Then revert parity.php to re-enable raw inserts.\n\n";
}

echo "=== Migration complete ===\n";
