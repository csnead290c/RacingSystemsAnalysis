<?php
ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "Starting diag-v14...\n";

try {
    require_once __DIR__ . '/config.php';
    echo "Config loaded OK. PDO class: " . get_class($pdo) . "\n";
} catch (Throwable $e) {
    echo "Config error: " . $e->getMessage() . "\n";
    exit(1);
}

// Check if column exists
try {
    $stmt = $pdo->query("SHOW COLUMNS FROM parity_runs LIKE 'run_time_local'");
    $exists = $stmt->rowCount() > 0;
    echo "run_time_local column exists: " . ($exists ? 'YES' : 'NO') . "\n";
} catch (Throwable $e) {
    echo "Column check error: " . $e->getMessage() . "\n";
}

// If not, add it
if (!$exists) {
    try {
        $pdo->exec("ALTER TABLE parity_runs ADD COLUMN run_time_local DATETIME NULL AFTER run_timestamp_utc");
        echo "Column added successfully.\n";
    } catch (Throwable $e) {
        echo "Add column error: " . $e->getMessage() . "\n";
    }
} else {
    echo "Column already exists, skipping add.\n";
}

// Check indexes
try {
    $stmt = $pdo->query("SHOW INDEX FROM parity_runs WHERE Key_name = 'idx_pr_time_local'");
    $idxExists = $stmt->rowCount() > 0;
    echo "idx_pr_time_local index exists: " . ($idxExists ? 'YES' : 'NO') . "\n";
    if (!$idxExists) {
        $pdo->exec("ALTER TABLE parity_runs ADD INDEX idx_pr_time_local (run_time_local)");
        echo "Index added.\n";
    }
} catch (Throwable $e) {
    echo "Index check/add error: " . $e->getMessage() . "\n";
}

// Count runs with/without run_time_local
try {
    $stmt = $pdo->query("SELECT COUNT(*) AS total, SUM(CASE WHEN run_time_local IS NOT NULL THEN 1 ELSE 0 END) AS has_local, SUM(CASE WHEN run_timestamp_utc IS NOT NULL THEN 1 ELSE 0 END) AS has_utc FROM parity_runs");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "\nRun stats:\n";
    echo "  Total runs: " . $row['total'] . "\n";
    echo "  With run_time_local: " . $row['has_local'] . "\n";
    echo "  With run_timestamp_utc: " . $row['has_utc'] . "\n";
    echo "  Missing run_time_local: " . ($row['has_utc'] - $row['has_local']) . "\n";
} catch (Throwable $e) {
    echo "Stats error: " . $e->getMessage() . "\n";
}

echo "\nDone.\n";
