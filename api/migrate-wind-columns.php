<?php
/**
 * Migration: Add wind_speed_mph + wind_dir_deg to weather tables
 * Safe to re-run (idempotent — uses column-existence checks).
 * Run once before deploying the wind-data feature.
 *
 * Usage: php migrate-wind-columns.php
 */
require_once __DIR__ . '/config.php';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$results = [];

// ── parity_weather_samples ───────────────────────────────────────────────────
$cols = $pdo->query("DESCRIBE parity_weather_samples")->fetchAll(PDO::FETCH_COLUMN);

if (!in_array('wind_speed_mph', $cols)) {
    $pdo->exec("ALTER TABLE parity_weather_samples
                ADD COLUMN wind_speed_mph DECIMAL(5,2) NULL AFTER station_pressure_raw");
    $results[] = 'Added wind_speed_mph to parity_weather_samples';
} else {
    $results[] = 'SKIP: wind_speed_mph already in parity_weather_samples';
}

$cols = $pdo->query("DESCRIBE parity_weather_samples")->fetchAll(PDO::FETCH_COLUMN);
if (!in_array('wind_dir_deg', $cols)) {
    $pdo->exec("ALTER TABLE parity_weather_samples
                ADD COLUMN wind_dir_deg SMALLINT UNSIGNED NULL AFTER wind_speed_mph");
    $results[] = 'Added wind_dir_deg to parity_weather_samples';
} else {
    $results[] = 'SKIP: wind_dir_deg already in parity_weather_samples';
}

// ── parity_weather_canonical ─────────────────────────────────────────────────
$cols = $pdo->query("DESCRIBE parity_weather_canonical")->fetchAll(PDO::FETCH_COLUMN);

if (!in_array('wind_speed_mph', $cols)) {
    $pdo->exec("ALTER TABLE parity_weather_canonical
                ADD COLUMN wind_speed_mph DECIMAL(5,2) NULL");
    $results[] = 'Added wind_speed_mph to parity_weather_canonical';
} else {
    $results[] = 'SKIP: wind_speed_mph already in parity_weather_canonical';
}

$cols = $pdo->query("DESCRIBE parity_weather_canonical")->fetchAll(PDO::FETCH_COLUMN);
if (!in_array('wind_dir_deg', $cols)) {
    $pdo->exec("ALTER TABLE parity_weather_canonical
                ADD COLUMN wind_dir_deg SMALLINT UNSIGNED NULL");
    $results[] = 'Added wind_dir_deg to parity_weather_canonical';
} else {
    $results[] = 'SKIP: wind_dir_deg already in parity_weather_canonical';
}

echo json_encode(['ok' => true, 'results' => $results], JSON_PRETTY_PRINT) . "\n";
