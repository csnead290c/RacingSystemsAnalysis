<?php
/**
 * Migration v29: Add category and color_hex columns to parity_engine_combos
 * Safe to re-run (checks for column existence).
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== Migration v29: Engine Combo Categories & Colors ===\n\n";

if (!file_exists(__DIR__ . '/config.php')) {
    echo "ERROR: config.php not found!\n";
    exit(1);
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

try {
    $pdo = getDB();
    echo "1. Connected to database.\n";
} catch (Exception $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
    exit(1);
}

function addColumnSafeV29(PDO $pdo, string $table, string $colDef): void {
    $colName = explode(' ', trim($colDef))[0];
    try {
        $pdo->exec("ALTER TABLE $table ADD COLUMN $colDef");
        echo "   Added column: $table.$colName\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "   Exists: $table.$colName\n";
        } else {
            throw $e;
        }
    }
}

// ── Add columns ───────────────────────────────────────────────────────────

echo "\n2. Adding columns to parity_engine_combos...\n";

addColumnSafeV29($pdo, 'parity_engine_combos', "category VARCHAR(50) NULL AFTER name");
addColumnSafeV29($pdo, 'parity_engine_combos', "color_hex VARCHAR(7) NULL AFTER fuel_type");

// ── Backfill existing combos ──────────────────────────────────────────────

echo "\n3. Backfilling existing combos...\n";

// Default category/color for any combos that don't have one yet
$stmt = $pdo->prepare("UPDATE parity_engine_combos SET category = 'Default', color_hex = '#888888' WHERE category IS NULL");
$stmt->execute();
echo "   Backfilled " . $stmt->rowCount() . " rows with default category/color.\n";

echo "\nMigration v29 completed successfully!\n";
