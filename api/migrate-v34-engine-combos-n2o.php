<?php
/**
 * Migration v34 — Add uses_n2o column to parity_engine_combos
 *
 * When true, the weather correction pipeline applies a 50/50 blended
 * gasoline HPC instead of the full gasoline correction. This reflects
 * that roughly half the power of a large nitrous combination comes from
 * the nitrous-assisted portion, which is approximately weather-independent.
 *
 * Safe to re-run (checks for column existence before altering).
 */

error_reporting(E_ALL);
header('Content-Type: text/plain');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== Migration v34 — parity_engine_combos: uses_n2o ===\n\n";

// ── Check / add column ───────────────────────────────────────────────────────

echo "1. Checking for uses_n2o column...\n";
$stmt = $pdo->prepare("SHOW COLUMNS FROM parity_engine_combos LIKE 'uses_n2o'");
$stmt->execute();
if ($stmt->rowCount() > 0) {
    echo "   uses_n2o column already exists. Skipping.\n";
} else {
    $pdo->exec("ALTER TABLE parity_engine_combos ADD COLUMN uses_n2o TINYINT(1) NOT NULL DEFAULT 0 AFTER fuel_type");
    echo "   Added uses_n2o TINYINT(1) NOT NULL DEFAULT 0\n";
}

// ── Verify existing rows default to 0 ────────────────────────────────────────

echo "\n2. Verifying existing rows...\n";
$count = (int)$pdo->query("SELECT COUNT(*) FROM parity_engine_combos WHERE uses_n2o IS NULL")->fetchColumn();
if ($count > 0) {
    $pdo->exec("UPDATE parity_engine_combos SET uses_n2o = 0 WHERE uses_n2o IS NULL");
    echo "   Backfilled $count rows with uses_n2o = 0\n";
} else {
    echo "   All existing rows have uses_n2o set. No backfill needed.\n";
}

$total = (int)$pdo->query("SELECT COUNT(*) FROM parity_engine_combos")->fetchColumn();
echo "   Total engine combos: $total\n";

echo "\n=== Migration v34 complete ===\n";
echo "Column added: parity_engine_combos.uses_n2o TINYINT(1) DEFAULT 0\n";
echo "All existing combos: uses_n2o = 0 (no behavior change)\n";
