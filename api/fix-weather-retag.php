<?php
/**
 * One-time fix: Re-tag old source='tempest' samples to 'tempest_156136'
 * and check for unique key conflicts. Then show summary.
 */
error_reporting(E_ALL);
ini_set('display_errors', '1');

require __DIR__ . '/config.php';

// Direct PDO connection (getDbConnection() may call exit in CLI)
try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    echo "DB connection failed: " . $e->getMessage() . "\n";
    exit(1);
}

echo "=== Weather Sample Source Distribution ===\n";
$stmt = $pdo->query("SELECT source, COUNT(*) as cnt FROM parity_weather_samples GROUP BY source ORDER BY source");
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
    echo "  {$r['source']}: {$r['cnt']}\n";
}

// Count old 'tempest' rows
$stmt = $pdo->query("SELECT COUNT(*) FROM parity_weather_samples WHERE source = 'tempest'");
$oldCount = (int)$stmt->fetchColumn();
echo "\nOld source='tempest' rows: $oldCount\n";

if ($oldCount === 0) {
    echo "Nothing to re-tag. Done.\n";
    exit(0);
}

// Check for conflicts: rows that would collide on (source, timestamp_utc, event_id)
$stmt = $pdo->query("
    SELECT COUNT(*) FROM parity_weather_samples old_t
    INNER JOIN parity_weather_samples new_t
        ON new_t.source = 'tempest_156136'
        AND new_t.timestamp_utc = old_t.timestamp_utc
        AND new_t.event_id <=> old_t.event_id
    WHERE old_t.source = 'tempest'
");
$conflicts = (int)$stmt->fetchColumn();
echo "Rows that would conflict with existing tempest_156136: $conflicts\n";

if ($conflicts > 0) {
    // Delete the old rows that would conflict (the new tempest_156136 rows are fresher)
    echo "Deleting $conflicts conflicting old 'tempest' rows (tempest_156136 versions already exist)...\n";
    $pdo->exec("
        DELETE old_t FROM parity_weather_samples old_t
        INNER JOIN parity_weather_samples new_t
            ON new_t.source = 'tempest_156136'
            AND new_t.timestamp_utc = old_t.timestamp_utc
            AND new_t.event_id <=> old_t.event_id
        WHERE old_t.source = 'tempest'
    ");
    echo "  Deleted.\n";
}

// Re-tag remaining old rows
$stmt = $pdo->query("SELECT COUNT(*) FROM parity_weather_samples WHERE source = 'tempest'");
$remaining = (int)$stmt->fetchColumn();
echo "Re-tagging $remaining remaining source='tempest' rows to 'tempest_156136'...\n";

if ($remaining > 0) {
    $pdo->exec("UPDATE parity_weather_samples SET source = 'tempest_156136' WHERE source = 'tempest'");
    echo "  Done.\n";
}

// Also re-tag 'station' if present
$stmt = $pdo->query("SELECT COUNT(*) FROM parity_weather_samples WHERE source = 'station'");
$stationCount = (int)$stmt->fetchColumn();
if ($stationCount > 0) {
    echo "Re-tagging $stationCount source='station' rows to 'tempest_156136'...\n";
    // Check conflicts first
    $pdo->exec("
        DELETE old_t FROM parity_weather_samples old_t
        INNER JOIN parity_weather_samples new_t
            ON new_t.source = 'tempest_156136'
            AND new_t.timestamp_utc = old_t.timestamp_utc
            AND new_t.event_id <=> old_t.event_id
        WHERE old_t.source = 'station'
    ");
    $pdo->exec("UPDATE parity_weather_samples SET source = 'tempest_156136' WHERE source = 'station'");
    echo "  Done.\n";
}

echo "\n=== Updated Source Distribution ===\n";
$stmt = $pdo->query("SELECT source, COUNT(*) as cnt FROM parity_weather_samples GROUP BY source ORDER BY source");
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
    echo "  {$r['source']}: {$r['cnt']}\n";
}

echo "\n=== Fix Complete ===\n";
echo "Now refresh the event from the Parity Portal to re-fetch all 3 stations and rebuild canonical weather.\n";
