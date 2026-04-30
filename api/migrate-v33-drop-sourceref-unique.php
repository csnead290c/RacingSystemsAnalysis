<?php
/**
 * Migration v33 — Drop UNIQUE(race_lookup, source_ref) on parity_runs
 *
 * BUG: NHRA reassigns DumbyIDs mid-event. New E3 runs get source_ref values
 * that collide with existing rows. The INSERT fails, parity_upsertRun catches
 * "Duplicate" but can't find a row_hash match, so it silently returns 'skipped'.
 * Legitimate new runs are permanently lost. The row_hash UNIQUE index is sufficient.
 */
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== Migration v33: Drop uk_pr_race_sourceref ===\n\n";
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

$pdo = getDB();

$stmt = $pdo->prepare("
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'parity_runs'
      AND index_name = 'uk_pr_race_sourceref'
");
$stmt->execute();
if ((int)$stmt->fetchColumn() === 0) {
    echo "Index uk_pr_race_sourceref not found — already removed.\n";
} else {
    $pdo->exec("ALTER TABLE parity_runs DROP INDEX uk_pr_race_sourceref");
    echo "OK: uk_pr_race_sourceref dropped.\n";
}

echo "Dedup is now handled solely by uk_pr_race_hash (row_hash).\n";
echo "=== Done ===\n";
