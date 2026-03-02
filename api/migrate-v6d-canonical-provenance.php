<?php
/**
 * Migration v6d: Add provenance tracking to parity_weather_canonical
 * 
 * Adds columns to track the source and composition of canonical weather points:
 * - canonical_source_kind: primary source type (station, csv_backfill, open_meteo_backfill, mixed, unknown)
 * - canonical_source_detail: human-readable summary of sources
 * - sample_count: number of samples merged into this canonical point
 * - sample_sources_json: JSON array of {source, count} for detailed breakdown
 */

require_once __DIR__ . '/config.php';

$pdo = getDB();

echo "Migration v6d: Adding provenance columns to parity_weather_canonical\n";

try {
    $pdo->beginTransaction();

    // Add provenance columns
    echo "Adding canonical_source_kind column...\n";
    $pdo->exec("
        ALTER TABLE parity_weather_canonical
        ADD COLUMN canonical_source_kind VARCHAR(32) NOT NULL DEFAULT 'unknown'
        AFTER pressure_inhg
    ");

    echo "Adding canonical_source_detail column...\n";
    $pdo->exec("
        ALTER TABLE parity_weather_canonical
        ADD COLUMN canonical_source_detail TEXT NULL
        AFTER canonical_source_kind
    ");

    echo "Adding sample_count column...\n";
    $pdo->exec("
        ALTER TABLE parity_weather_canonical
        ADD COLUMN sample_count INT NOT NULL DEFAULT 0
        AFTER canonical_source_detail
    ");

    echo "Adding sample_sources_json column...\n";
    $pdo->exec("
        ALTER TABLE parity_weather_canonical
        ADD COLUMN sample_sources_json TEXT NULL
        AFTER sample_count
    ");

    // Add index on canonical_source_kind for filtering queries
    echo "Adding index on canonical_source_kind...\n";
    $pdo->exec("
        CREATE INDEX idx_canonical_source_kind 
        ON parity_weather_canonical(canonical_source_kind)
    ");

    $pdo->commit();
    echo "✓ Migration v6d completed successfully\n";
    echo "\nNext steps:\n";
    echo "1. Update canonicalization logic to populate these fields\n";
    echo "2. Re-run canonicalization to backfill existing data\n";

} catch (Exception $e) {
    $pdo->rollBack();
    echo "✗ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
