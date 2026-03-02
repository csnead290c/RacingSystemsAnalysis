<?php
/**
 * Migration: parity_class_aliases table
 * Maps alias class_index values to canonical class names.
 * e.g. PRO → PS, TAFC → FC, TAD → TD
 */
require_once __DIR__ . '/config.php';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$pdo->exec("
    CREATE TABLE IF NOT EXISTS parity_class_aliases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        canonical VARCHAR(20) NOT NULL COMMENT 'Canonical class index (e.g. PS, TF, FC)',
        alias VARCHAR(20) NOT NULL COMMENT 'Alias that maps to the canonical (e.g. PRO, TAFC)',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_alias (alias)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

echo "✅ parity_class_aliases table created.\n";

// Seed common aliases
$seeds = [
    ['PS', 'PRO'],
    ['FC', 'TAFC'],
    ['TD', 'TAD'],
];

$stmt = $pdo->prepare("INSERT IGNORE INTO parity_class_aliases (canonical, alias) VALUES (?, ?)");
foreach ($seeds as [$canonical, $alias]) {
    $stmt->execute([$canonical, $alias]);
    echo "  Seeded: $alias → $canonical\n";
}

echo "Done.\n";
