<?php
/**
 * Migration v17: Tech Master Foundation — seasons + event_types
 *
 * Part of the NHRA Tech Master Phase 1 backbone.
 * Creates reference tables needed before event_instances can be built.
 *
 * Safe to run multiple times (CREATE TABLE IF NOT EXISTS, INSERT IGNORE).
 * Depends on: nothing (first TM migration)
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

// Admin gate
$auth = rsa_getAuthUser();
if (!$auth || !in_array($auth['role'] ?? '', ['admin', 'owner'])) {
    http_response_code(403);
    echo "Forbidden: admin role required.\n";
    exit(1);
}

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== Migration v17: Tech Master Foundation ===\n\n";
flush();

// ── 1. seasons ──────────────────────────────────────────────────────────

echo "1. Creating seasons table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS seasons (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            year        SMALLINT NOT NULL,
            label       VARCHAR(50) NULL,
            status      ENUM('upcoming','active','completed') NOT NULL DEFAULT 'upcoming',
            created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

            UNIQUE KEY uk_s_year (year)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// Seed seasons from existing parity_events.season_year if available
echo "   Seeding seasons from parity_events...\n";
try {
    $stmt = $pdo->query("
        SELECT DISTINCT season_year FROM parity_events
        WHERE season_year IS NOT NULL
        ORDER BY season_year
    ");
    $years = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $currentYear = (int)date('Y');

    $insert = $pdo->prepare("
        INSERT IGNORE INTO seasons (year, label, status) VALUES (?, ?, ?)
    ");
    foreach ($years as $y) {
        $y = (int)$y;
        $status = ($y < $currentYear) ? 'completed' : (($y === $currentYear) ? 'active' : 'upcoming');
        $insert->execute([$y, "$y NHRA Season", $status]);
    }
    echo "   Seeded " . count($years) . " season(s)\n\n";
} catch (PDOException $e) {
    echo "   Seed skipped (parity_events may not exist): " . $e->getMessage() . "\n\n";
}

// ── 2. event_types ──────────────────────────────────────────────────────

echo "2. Creating event_types table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS event_types (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            code        VARCHAR(30) NOT NULL,
            label       VARCHAR(100) NOT NULL,
            sort_order  SMALLINT NOT NULL DEFAULT 0,
            is_active   TINYINT(1) NOT NULL DEFAULT 1,
            created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

            UNIQUE KEY uk_et_code (code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// Seed event types
echo "   Seeding event types...\n";
$seeds = [
    ['national',   'National Event',   10],
    ['divisional', 'Divisional Event',  20],
    ['regional',   'Regional Event',    30],
    ['specialty',  'Specialty Event',   40],
    ['test',       'Test / Private',    50],
];
$seedStmt = $pdo->prepare("
    INSERT IGNORE INTO event_types (code, label, sort_order) VALUES (?, ?, ?)
");
foreach ($seeds as $s) {
    $seedStmt->execute($s);
}
echo "   Seeded " . count($seeds) . " event type(s)\n\n";

echo "=== Migration v17 Complete ===\n";
echo "Tables: seasons, event_types\n";
