<?php
/**
 * Migration v13: Weather Reliability Improvements
 *
 * 1. Add latitude/longitude to parity_tracks (needed for backup weather providers)
 * 2. Add delta-tracking columns to parity_weather_canonical (station vs backup comparison)
 * 3. Change unique key on parity_weather_samples to include event_id (allow multi-track)
 *
 * Safe to run multiple times (uses IF NOT EXISTS / catches duplicates).
 *
 * Usage:
 *   php api/migrate-v13-weather-reliability.php
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== RSA Migration v13 — Weather Reliability ===\n\n";

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

try {
    $pdo = getDB();
    echo "Connected to database.\n\n";
} catch (Exception $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
    exit(1);
}

function v13_addColumn(PDO $pdo, string $table, string $column, string $ddl): void {
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
        if ($stmt->rowCount() > 0) {
            echo "  EXISTS: $table.$column\n";
            return;
        }
        $pdo->exec("ALTER TABLE `$table` ADD COLUMN $ddl");
        echo "  ADDED: $table.$column\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) {
            echo "  EXISTS: $table.$column\n";
        } else {
            echo "  FAILED: $table.$column — " . $e->getMessage() . "\n";
        }
    }
}

// ── 1. Add lat/lon to parity_tracks ──────────────────────────────────────
echo "1. Adding latitude/longitude to parity_tracks...\n";
v13_addColumn($pdo, 'parity_tracks', 'latitude', 'latitude DOUBLE NULL AFTER timezone_iana');
v13_addColumn($pdo, 'parity_tracks', 'longitude', 'longitude DOUBLE NULL AFTER latitude');
echo "\n";

// ── 2a. Add provenance columns to parity_weather_canonical (may already exist) ──
echo "2a. Adding provenance columns to parity_weather_canonical...\n";
v13_addColumn($pdo, 'parity_weather_canonical', 'canonical_source_kind', "canonical_source_kind VARCHAR(50) NULL");
v13_addColumn($pdo, 'parity_weather_canonical', 'canonical_source_detail', "canonical_source_detail VARCHAR(255) NULL");
v13_addColumn($pdo, 'parity_weather_canonical', 'sample_count', "sample_count INT NULL");
v13_addColumn($pdo, 'parity_weather_canonical', 'sample_sources_json', "sample_sources_json JSON NULL");
echo "\n";

// ── 2b. Add delta-tracking columns to parity_weather_canonical ────────────
echo "2b. Adding delta-tracking columns to parity_weather_canonical...\n";
v13_addColumn($pdo, 'parity_weather_canonical', 'station_temp_delta', 'station_temp_delta DOUBLE NULL');
v13_addColumn($pdo, 'parity_weather_canonical', 'station_humidity_delta', 'station_humidity_delta DOUBLE NULL');
v13_addColumn($pdo, 'parity_weather_canonical', 'station_pressure_delta', 'station_pressure_delta DOUBLE NULL');
v13_addColumn($pdo, 'parity_weather_canonical', 'backup_temp_f', 'backup_temp_f DOUBLE NULL');
v13_addColumn($pdo, 'parity_weather_canonical', 'backup_rh_pct', 'backup_rh_pct DOUBLE NULL');
v13_addColumn($pdo, 'parity_weather_canonical', 'backup_pressure_inhg', 'backup_pressure_inhg DOUBLE NULL');
echo "\n";

// ── 3. Fix unique key on parity_weather_samples ──────────────────────────
// Old: UNIQUE(source, timestamp_utc) — blocks multi-track samples at same time
// New: UNIQUE(source, timestamp_utc, event_id) — allows per-event samples
echo "3. Updating unique key on parity_weather_samples...\n";
try {
    // Check if old key exists
    $stmt = $pdo->query("SHOW INDEX FROM parity_weather_samples WHERE Key_name = 'uk_pws_source_ts'");
    $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!empty($indexes)) {
        // Check column count in the key
        $colCount = count($indexes);
        if ($colCount <= 2) {
            // Old 2-column key — drop and recreate with 3 columns
            $pdo->exec("ALTER TABLE parity_weather_samples DROP INDEX uk_pws_source_ts");
            echo "  DROPPED old uk_pws_source_ts (2-col)\n";
            $pdo->exec("ALTER TABLE parity_weather_samples ADD UNIQUE KEY uk_pws_source_ts_evt (source, timestamp_utc, event_id)");
            echo "  ADDED uk_pws_source_ts_evt (3-col)\n";
        } else {
            echo "  Key already has >2 columns, skipping\n";
        }
    } else {
        // Check if new key already exists
        $stmt2 = $pdo->query("SHOW INDEX FROM parity_weather_samples WHERE Key_name = 'uk_pws_source_ts_evt'");
        if ($stmt2->rowCount() > 0) {
            echo "  EXISTS: uk_pws_source_ts_evt\n";
        } else {
            $pdo->exec("ALTER TABLE parity_weather_samples ADD UNIQUE KEY uk_pws_source_ts_evt (source, timestamp_utc, event_id)");
            echo "  ADDED uk_pws_source_ts_evt\n";
        }
    }
} catch (PDOException $e) {
    echo "  FAILED: " . $e->getMessage() . "\n";
}
echo "\n";

// ── 4. Add source index on parity_weather_samples ────────────────────────
echo "4. Adding source index on parity_weather_samples...\n";
try {
    $stmt = $pdo->query("SHOW INDEX FROM parity_weather_samples WHERE Key_name = 'idx_pws_source'");
    if ($stmt->rowCount() > 0) {
        echo "  EXISTS: idx_pws_source\n";
    } else {
        $pdo->exec("CREATE INDEX idx_pws_source ON parity_weather_samples(source)");
        echo "  ADDED: idx_pws_source\n";
    }
} catch (PDOException $e) {
    echo "  FAILED: " . $e->getMessage() . "\n";
}
echo "\n";

echo "=== Migration v13 Complete ===\n";
echo "\nChanges:\n";
echo "  - parity_tracks: +latitude, +longitude\n";
echo "  - parity_weather_canonical: +station_temp_delta, +station_humidity_delta, +station_pressure_delta, +backup_temp_f, +backup_rh_pct, +backup_pressure_inhg\n";
echo "  - parity_weather_samples: unique key now includes event_id\n";
echo "  - parity_weather_samples: +idx_pws_source index\n";
