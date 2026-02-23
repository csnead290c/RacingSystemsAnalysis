<?php
/**
 * Database Migration v6c — NHRA Tech Parity Weather Tables
 *
 * Creates:
 *   - parity_tracks           (track name + timezone)
 *   - parity_events           (event name + track + date range)
 *   - parity_weather_samples  (raw Tempest observations)
 *   - parity_weather_canonical (bucketed canonical weather for joins)
 *
 * Safe to run multiple times (uses IF NOT EXISTS).
 *
 * Usage:
 *   php api/migrate-v6c-parity-weather.php
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== RSA Database Migration v6c — Parity Weather Tables ===\n\n";

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

function addIndexSafeV6c(PDO $pdo, string $name, string $ddl): void {
    try {
        $pdo->exec($ddl);
        echo "   Added: $name\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) {
            echo "   Exists: $name\n";
        } else {
            echo "   FAILED: $name — " . $e->getMessage() . "\n";
        }
    }
}

// ── 2. parity_tracks ───────────────────────────────────────────────────

echo "2. Creating parity_tracks table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parity_tracks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            track_name VARCHAR(255) NOT NULL,
            timezone_iana VARCHAR(100) NOT NULL DEFAULT 'America/New_York',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            UNIQUE KEY uk_pt_name (track_name)
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 3. parity_events ───────────────────────────────────────────────────

echo "3. Creating parity_events table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parity_events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            event_name VARCHAR(255) NOT NULL,
            track_id INT NOT NULL,
            start_date_local DATE NOT NULL,
            end_date_local DATE NOT NULL,
            race_lookup VARCHAR(8) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            INDEX idx_pe_track (track_id),
            INDEX idx_pe_dates (start_date_local, end_date_local),
            INDEX idx_pe_racelookup (race_lookup),
            FOREIGN KEY (track_id) REFERENCES parity_tracks(id) ON DELETE CASCADE
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 4. parity_weather_samples ──────────────────────────────────────────
// Raw observations from Tempest/WeatherFlow.
// station_pressure_raw: uncorrected station pressure in mb (as returned by Tempest).
// temp_c/temp_f: both stored for convenience.

echo "4. Creating parity_weather_samples table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parity_weather_samples (
            id INT AUTO_INCREMENT PRIMARY KEY,
            timestamp_utc DATETIME NOT NULL,
            event_id INT NULL,
            track_id INT NULL,
            event_local_time DATETIME NULL,
            temp_c DOUBLE NULL,
            temp_f DOUBLE NULL,
            rh_pct DOUBLE NULL,
            station_pressure_raw DOUBLE NULL,
            source VARCHAR(50) NOT NULL DEFAULT 'tempest',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            INDEX idx_pws_ts (timestamp_utc),
            INDEX idx_pws_event_ts (event_id, timestamp_utc),
            UNIQUE KEY uk_pws_source_ts (source, timestamp_utc),
            FOREIGN KEY (event_id) REFERENCES parity_events(id) ON DELETE SET NULL,
            FOREIGN KEY (track_id) REFERENCES parity_tracks(id) ON DELETE SET NULL
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 5. parity_weather_canonical ────────────────────────────────────────
// Bucketed canonical weather for run-to-weather joins.
// pressure_inhg: station pressure converted to inches of mercury (inHg).
//   Conversion: 1 mb = 0.02953 inHg  →  pressure_inhg = station_pressure_raw * 0.02953
//   This is UNCORRECTED station pressure, NOT sea-level adjusted.
//   Documented in docs/NHRA_PARITY_DEV_NOTES.md.

echo "5. Creating parity_weather_canonical table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parity_weather_canonical (
            id INT AUTO_INCREMENT PRIMARY KEY,
            timestamp_utc DATETIME NOT NULL,
            temp_f DOUBLE NULL,
            rh_pct DOUBLE NULL,
            pressure_inhg DOUBLE NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            UNIQUE KEY uk_pwc_ts (timestamp_utc),
            INDEX idx_pwc_ts (timestamp_utc)
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

echo "=== Migration v6c Complete ===\n";
echo "Tables: parity_tracks, parity_events, parity_weather_samples, parity_weather_canonical\n";
echo "\nPressure unit note:\n";
echo "  parity_weather_samples.station_pressure_raw = mb (millibars, as returned by Tempest)\n";
echo "  parity_weather_canonical.pressure_inhg = inHg (inches of mercury)\n";
echo "  Conversion: pressure_inhg = station_pressure_raw * 0.02953\n";
echo "  This is UNCORRECTED station pressure, NOT sea-level adjusted.\n";
