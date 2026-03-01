<?php
/**
 * run-backfill-v14.php — Standalone backfill script (no auth required).
 *
 * Fixes historical runs where run_timestamp_utc actually contains local time.
 * For each run:
 *   1. Copy current run_timestamp_utc → run_time_local (it was local all along)
 *   2. Compute correct run_timestamp_utc = localToUtc(local, track_tz)
 *
 * Usage: curl https://racingsystemsanalysis.com/api/run-backfill-v14.php
 *   Optional: ?dryRun=1  (preview without writing)
 *             ?eventId=N  (single event)
 *             ?limit=500  (batch size per event, default=5000)
 */
ini_set('display_errors', '1');
error_reporting(E_ALL);
set_time_limit(300); // 5 minutes
header('Content-Type: text/plain; charset=utf-8');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/parity.php';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$dryRun = isset($_GET['dryRun']) && $_GET['dryRun'];
$eventIdFilter = isset($_GET['eventId']) ? (int)$_GET['eventId'] : null;
$batchLimit = isset($_GET['limit']) ? max(100, min(50000, (int)$_GET['limit'])) : 5000;

echo "=== Backfill v14: run_time_local + correct run_timestamp_utc ===\n";
echo "Mode: " . ($dryRun ? "DRY RUN" : "LIVE") . "\n";
if ($eventIdFilter) echo "Filter: eventId=$eventIdFilter\n";
echo "Batch limit per event: $batchLimit\n\n";

// Get events with track timezone
$where = $eventIdFilter ? 'WHERE e.id = ?' : '';
$params = $eventIdFilter ? [$eventIdFilter] : [];

$evStmt = $pdo->prepare("
    SELECT e.id, e.event_name, e.race_lookup, t.timezone_iana
    FROM parity_events e
    JOIN parity_tracks t ON t.id = e.track_id
    $where
    ORDER BY e.start_date_local ASC
");
$evStmt->execute($params);
$events = $evStmt->fetchAll(PDO::FETCH_ASSOC);

echo "Events found: " . count($events) . "\n\n";

if (empty($events)) {
    echo "No events to process.\n";
    exit(0);
}

$stmtFetch = $pdo->prepare("
    SELECT id, run_timestamp_utc, run_time_local
    FROM parity_runs
    WHERE race_lookup = ?
      AND run_timestamp_utc IS NOT NULL
      AND run_time_local IS NULL
    LIMIT ?
");

$stmtUpdate = $pdo->prepare("
    UPDATE parity_runs SET run_time_local = ?, run_timestamp_utc = ? WHERE id = ?
");

$grandTotal = 0;
$grandUpdated = 0;
$grandErrors = 0;

foreach ($events as $ev) {
    $tz = $ev['timezone_iana'] ?: 'America/New_York';
    $stmtFetch->execute([$ev['race_lookup'], $batchLimit]);
    $runs = $stmtFetch->fetchAll(PDO::FETCH_ASSOC);

    if (empty($runs)) {
        continue; // skip events with no runs needing backfill
    }

    $updated = 0;
    $errors = 0;
    $sampleLocal = null;
    $sampleOldUtc = null;
    $sampleNewUtc = null;

    foreach ($runs as $run) {
        $grandTotal++;
        // Current run_timestamp_utc is actually local time (historical bug)
        $localTime = $run['run_timestamp_utc'];
        $newUtc = parity_localToUtc($localTime, $tz);

        if ($newUtc === null) {
            $errors++;
            $grandErrors++;
            continue;
        }

        if ($sampleLocal === null) {
            $sampleLocal = $localTime;
            $sampleOldUtc = $localTime; // was stored as UTC but was really local
            $sampleNewUtc = $newUtc;
        }

        if (!$dryRun) {
            $stmtUpdate->execute([$localTime, $newUtc, $run['id']]);
        }
        $updated++;
        $grandUpdated++;
    }

    echo sprintf(
        "  [%d] %-45s tz=%-22s runs=%d updated=%d errors=%d\n",
        $ev['id'], $ev['event_name'], $tz, count($runs), $updated, $errors
    );
    if ($sampleLocal) {
        echo "        sample: local=$sampleLocal  old_utc=$sampleOldUtc  new_utc=$sampleNewUtc\n";
    }
    flush();
}

echo "\n=== Summary ===\n";
echo "Runs scanned: $grandTotal\n";
echo "Updated: $grandUpdated\n";
echo "Errors: $grandErrors\n";
echo "Mode: " . ($dryRun ? "DRY RUN (no writes)" : "LIVE (writes committed)") . "\n";
echo "Done.\n";
