<?php
/**
 * diag-v14.php — Diagnose and run migration v14 (add run_time_local).
 * Uses the exact same require pattern as parity.php.
 */
ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/parity.php';

$pdo = getDB();
echo "DB connected.\n";

// 1. Check/add column
$stmt = $pdo->query("SHOW COLUMNS FROM parity_runs LIKE 'run_time_local'");
if ($stmt->rowCount() > 0) {
    echo "Column run_time_local: EXISTS\n";
} else {
    $pdo->exec("ALTER TABLE parity_runs ADD COLUMN run_time_local DATETIME NULL AFTER run_timestamp_utc");
    echo "Column run_time_local: ADDED\n";
}

// 2. Check/add index on run_timestamp_utc
$stmt = $pdo->query("SHOW INDEX FROM parity_runs WHERE Key_name = 'idx_pr_timestamp'");
if ($stmt->rowCount() > 0) {
    echo "Index idx_pr_timestamp: EXISTS\n";
} else {
    $pdo->exec("ALTER TABLE parity_runs ADD INDEX idx_pr_timestamp (run_timestamp_utc)");
    echo "Index idx_pr_timestamp: ADDED\n";
}

// 3. Check/add index on run_time_local
$stmt = $pdo->query("SHOW INDEX FROM parity_runs WHERE Key_name = 'idx_pr_time_local'");
if ($stmt->rowCount() > 0) {
    echo "Index idx_pr_time_local: EXISTS\n";
} else {
    $pdo->exec("ALTER TABLE parity_runs ADD INDEX idx_pr_time_local (run_time_local)");
    echo "Index idx_pr_time_local: ADDED\n";
}

// 4. Stats
$stmt = $pdo->query("
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN run_time_local IS NOT NULL THEN 1 ELSE 0 END) AS has_local,
           SUM(CASE WHEN run_timestamp_utc IS NOT NULL THEN 1 ELSE 0 END) AS has_utc
    FROM parity_runs
");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
echo "\nRun stats:\n";
echo "  Total: {$row['total']}\n";
echo "  Has run_time_local: {$row['has_local']}\n";
echo "  Has run_timestamp_utc: {$row['has_utc']}\n";
echo "  Needs backfill: " . ($row['has_utc'] - $row['has_local']) . "\n";

// 5. Quick timezone function test
$local = parity_parseTimestampLocal('/Date(1730312400000)/');
echo "\nTimezone function test:\n";
echo "  parseTimestampLocal('/Date(1730312400000)/') = $local\n";
$utc = parity_localToUtc($local, 'America/New_York');
echo "  localToUtc('$local', 'America/New_York') = $utc\n";

echo "\nDone.\n";
