<?php
/**
 * Database Migration v12 — Parity Class Default Combos
 *
 * Creates:
 *   - parity_class_defaults (class_index → engine_combo fallback with optional date range)
 *
 * Safe to run multiple times (uses IF NOT EXISTS).
 *
 * Usage:
 *   php api/migrate-v12-class-defaults.php
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== RSA Database Migration v12 — Parity Class Defaults ===\n\n";

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

echo "1. Connecting to database...\n";
try {
    $pdo = getDB();
    echo "   OK\n\n";
} catch (Exception $e) {
    echo "   FAILED: " . $e->getMessage() . "\n";
    exit(1);
}

// ── 2. parity_class_defaults ─────────────────────────────────────────

echo "2. Creating parity_class_defaults table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parity_class_defaults (
            id INT AUTO_INCREMENT PRIMARY KEY,
            class_index VARCHAR(50) NOT NULL,
            engine_combo_id INT NOT NULL,
            effective_from_utc DATETIME NULL,
            effective_to_utc DATETIME NULL,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            INDEX idx_pcd_class_eff (class_index, effective_from_utc),
            INDEX idx_pcd_engine (engine_combo_id),
            FOREIGN KEY (engine_combo_id) REFERENCES parity_engine_combos(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 3. Verify ────────────────────────────────────────────────────────

echo "3. Verifying table exists...\n";
$stmt = $pdo->query("SHOW TABLES LIKE 'parity_class_defaults'");
if ($stmt->rowCount() > 0) {
    echo "   parity_class_defaults: EXISTS\n";
    $cols = $pdo->query("SHOW COLUMNS FROM parity_class_defaults")->fetchAll(PDO::FETCH_COLUMN);
    echo "   Columns: " . implode(', ', $cols) . "\n";
} else {
    echo "   parity_class_defaults: MISSING\n";
}

echo "\n=== Migration v12 complete ===\n";
