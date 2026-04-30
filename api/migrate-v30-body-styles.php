<?php
/**
 * Migration v30: Create parity_body_styles + parity_driver_body_styles tables.
 * Mirrors the engine combo pattern (parity_engine_combos + parity_driver_combos).
 * Safe to re-run.
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== Migration v30: Body Style Parity Tables ===\n\n";

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

try {
    $pdo = getDB();
    echo "1. Connected to database.\n\n";
} catch (Exception $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
    exit(1);
}

// ── 1. parity_body_styles ─────────────────────────────────────────────

echo "2. Creating parity_body_styles table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parity_body_styles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            category VARCHAR(50) NULL,
            body_style_num INT NULL COMMENT 'VB6 body style number (1-8)',
            cd DOUBLE NOT NULL DEFAULT 0 COMMENT 'Drag coefficient',
            frontal_area DOUBLE NOT NULL DEFAULT 0 COMMENT 'Frontal area (sq ft)',
            lift_coef DOUBLE NOT NULL DEFAULT 0 COMMENT 'Lift coefficient',
            overhang_in DOUBLE NOT NULL DEFAULT 0 COMMENT 'Overhang (inches)',
            color_hex VARCHAR(7) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            UNIQUE KEY uk_pbs_name (name)
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'already exists') !== false) {
        echo "   Already exists\n\n";
    } else {
        echo "   FAILED: " . $e->getMessage() . "\n\n";
    }
}

// ── 2. parity_driver_body_styles ──────────────────────────────────────

echo "3. Creating parity_driver_body_styles table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parity_driver_body_styles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            driver_name VARCHAR(255) NOT NULL,
            class_index VARCHAR(50) NOT NULL,
            body_style_id INT NOT NULL,
            effective_from_utc DATETIME NOT NULL,
            effective_to_utc DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            INDEX idx_pdbs_driver_class (driver_name, class_index),
            INDEX idx_pdbs_body_style (body_style_id),
            INDEX idx_pdbs_effective (effective_from_utc, effective_to_utc),
            FOREIGN KEY (body_style_id) REFERENCES parity_body_styles(id) ON DELETE CASCADE
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'already exists') !== false) {
        echo "   Already exists\n\n";
    } else {
        echo "   FAILED: " . $e->getMessage() . "\n\n";
    }
}

// ── 3. Seed default body styles from VB6 ──────────────────────────────

echo "4. Seeding default body styles...\n";
$defaults = [
    ['Dragster w/ Wing',    'Top Fuel',               1, 0.66, 18, 0.8, 30, '#ff4444'],
    ['Dragster',            'Top Alcohol Dragster',    2, 0.50, 14, 0.2, 30, '#4488ff'],
    ['Funny Car',           'Funny Car',               3, 0.52, 22, 0.8, 40, '#44bb44'],
    ['Altered/Roadster',    'Default',                 4, 0.52, 20, 0.1, 30, '#ffaa44'],
    ['Fastback',            'Pro Stock',               5, 0.28, 16, 0.1, 30, '#ff44ff'],
    ['Sedan',               'Default',                 6, 0.40, 24, 0.1, 24, '#44dddd'],
    ['Station Wagon/Van',   'Default',                 7, 0.46, 28, 0.1, 18, '#dddd44'],
    ['Motorcycle',          'Pro Stock Motorcycle',    8, 0.54,  6, 0.1, 12, '#ff8888'],
];

$insertStmt = $pdo->prepare("
    INSERT IGNORE INTO parity_body_styles (name, category, body_style_num, cd, frontal_area, lift_coef, overhang_in, color_hex)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
");

$seeded = 0;
foreach ($defaults as $d) {
    $insertStmt->execute($d);
    if ($insertStmt->rowCount() > 0) $seeded++;
}
echo "   Seeded $seeded new body styles (skipped duplicates).\n\n";

echo "Migration v30 completed successfully!\n";
