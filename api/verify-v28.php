<?php
ini_set('display_errors', '1');
error_reporting(E_ALL);
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Tables
$tables = $pdo->query("SHOW TABLES LIKE 'teardown%'")->fetchAll(PDO::FETCH_COLUMN);
echo "Tables: " . implode(", ", $tables) . "\n";

foreach ($tables as $t) {
    $cols = $pdo->query("DESCRIBE `$t`")->fetchAll(PDO::FETCH_COLUMN);
    echo "$t cols: " . count($cols) . "\n";
}

// FKs
$fks = $pdo->query("SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'teardown%' AND REFERENCED_TABLE_NAME IS NOT NULL")->fetchAll(PDO::FETCH_ASSOC);
echo "FK constraints: " . count($fks) . "\n";
foreach ($fks as $fk) echo "  {$fk['TABLE_NAME']}.{$fk['CONSTRAINT_NAME']} -> {$fk['REFERENCED_TABLE_NAME']}\n";

// Templates
$tpls = $pdo->query("SELECT id, category, class_index, label FROM teardown_templates")->fetchAll(PDO::FETCH_ASSOC);
echo "Templates: " . count($tpls) . "\n";
foreach ($tpls as $tp) {
    $cnt = $pdo->query("SELECT COUNT(*) FROM teardown_template_items WHERE template_id = {$tp['id']}")->fetchColumn();
    echo "  #{$tp['id']} {$tp['category']}/{$tp['class_index']} - {$tp['label']} ({$cnt} items)\n";
}

echo "=== v28 verification done ===\n";
