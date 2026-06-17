<?php
/**
 * Migration v35 — Rich run_history records (hybrid DB-first run logging)
 *
 * The existing run_history table only stored a minimal subset of a run
 * (vehicle, race length, env, result ET/MPH, hp/weight adjust, notes).
 *
 * RSA run logging now persists the FULL rich run record (timing splits,
 * opponent/MOV, run completion, dial-in, weather, corrected ET, etc.) as a
 * JSON blob, plus a few denormalized/queryable columns and offline-sync
 * support.
 *
 * Adds to run_history:
 *   - run_data JSON NULL            full RunRecordV1 payload
 *   - client_id VARCHAR(64) NULL    stable client id for offline dedupe/upsert
 *   - run_kind VARCHAR(16)          'logged' (default) | 'prediction'
 *   - corrected_et DECIMAL(10,4)    RSA Standard Day corrected ET
 *   - correction_factor DECIMAL(10,5)
 *   - weather_source VARCHAR(32)    manual | forecast_prefill | observed_station | imported
 *   - updated_at TIMESTAMP          ON UPDATE CURRENT_TIMESTAMP (last-write-wins)
 *   - UNIQUE INDEX (user_id, client_id)  idempotent sync
 *
 * Backward compatible: all new columns are nullable / defaulted, existing
 * minimal records and the existing POST path keep working unchanged.
 *
 * Safe to re-run (checks column/index existence before altering).
 *
 * Admin gate: requires Bearer token with admin/owner role.
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

echo "=== Migration v35: rich run_history ===\n\n";
flush();

$addCol = function (PDO $pdo, string $table, string $column, string $definition): void {
    $stmt = $pdo->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
    if ($stmt->rowCount() > 0) {
        echo "  Column $table.$column already exists — skip\n";
        return;
    }
    $pdo->exec("ALTER TABLE `$table` ADD COLUMN $definition");
    echo "  Added $table.$column\n";
};

$addIdx = function (PDO $pdo, string $table, string $indexName, string $definition): void {
    $stmt = $pdo->query("SHOW INDEX FROM `$table` WHERE Key_name = '$indexName'");
    if ($stmt->rowCount() > 0) {
        echo "  Index $indexName already exists — skip\n";
        return;
    }
    $pdo->exec("ALTER TABLE `$table` ADD $definition");
    echo "  Added index $indexName\n";
};

echo "1. Adding rich columns to run_history...\n";
flush();
try {
    $addCol($pdo, 'run_history', 'run_data', 'run_data JSON NULL AFTER env_data');
    $addCol($pdo, 'run_history', 'client_id', "client_id VARCHAR(64) NULL AFTER uuid");
    $addCol($pdo, 'run_history', 'run_kind', "run_kind VARCHAR(16) NOT NULL DEFAULT 'logged' AFTER race_length");
    $addCol($pdo, 'run_history', 'corrected_et', 'corrected_et DECIMAL(10,4) NULL AFTER result_mph');
    $addCol($pdo, 'run_history', 'correction_factor', 'correction_factor DECIMAL(10,5) NULL AFTER corrected_et');
    $addCol($pdo, 'run_history', 'weather_source', "weather_source VARCHAR(32) NULL AFTER correction_factor");
    $addCol($pdo, 'run_history', 'updated_at', 'updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}
flush();

echo "2. Backfilling run_kind / updated_at defaults...\n";
try {
    $pdo->exec("UPDATE run_history SET run_kind = 'logged' WHERE run_kind IS NULL OR run_kind = ''");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}
flush();

echo "3. Adding indexes...\n";
try {
    // Unique (user_id, client_id) enables idempotent offline-sync upserts.
    // NULL client_id values are allowed and do not collide under MySQL's
    // treatment of NULLs in unique indexes.
    $addIdx($pdo, 'run_history', 'uniq_user_client', 'UNIQUE INDEX `uniq_user_client` (user_id, client_id)');
    $addIdx($pdo, 'run_history', 'idx_rh_kind', 'INDEX `idx_rh_kind` (user_id, run_kind)');
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}
flush();

$total = (int)$pdo->query("SELECT COUNT(*) FROM run_history")->fetchColumn();
echo "=== Migration v35 Complete ===\n";
echo "run_history rows: $total\n";
echo "Columns added: run_data, client_id, run_kind, corrected_et, correction_factor, weather_source, updated_at\n";
echo "Indexes added: uniq_user_client, idx_rh_kind\n";
