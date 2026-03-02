<?php
/**
 * Rebuild canonical weather for 2024 events that were just backfilled.
 * This calls weatherRebuildCanonicalRange for each event's time range.
 */
chdir("/home/customer/www/racingsystemsanalysis.com/public_html");

// We need to include parity.php's weatherRebuildCanonicalRange function.
// Since parity.php has routing at the top, we need to prevent that from executing.
// Trick: define $_GET['action'] and $_SERVER['REQUEST_METHOD'] but catch the output.
$_GET['action'] = '__noop__';
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once "api/parity.php";
ob_end_clean();

$pdo = getDB();
set_time_limit(600);

// Get 2024 events that have backup weather samples but may need canonical rebuild
$stmt = $pdo->prepare("
    SELECT e.id AS event_id, e.event_name, e.start_date_local, e.end_date_local,
           t.timezone_iana
    FROM parity_events e
    JOIN parity_tracks t ON t.id = e.track_id
    WHERE e.season_year = 2024
    ORDER BY e.start_date_local ASC
");
$stmt->execute();
$events = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($events as $ev) {
    $tz = $ev["timezone_iana"];
    $startLocal = $ev["start_date_local"];
    $endLocal = $ev["end_date_local"];

    try {
        $tzObj = new DateTimeZone($tz);
        $startUtc = (new DateTimeImmutable("$startLocal 00:00:00", $tzObj))
            ->setTimezone(new DateTimeZone("UTC"))->format("Y-m-d H:i:s");
        $endUtc = (new DateTimeImmutable("$endLocal 23:59:59", $tzObj))
            ->setTimezone(new DateTimeZone("UTC"))->format("Y-m-d H:i:s");
    } catch (Exception $e) {
        echo "ERROR {$ev['event_id']} {$ev['event_name']}: {$e->getMessage()}\n";
        continue;
    }

    echo "REBUILD {$ev['event_id']} {$ev['event_name']}... ";
    flush();

    $result = weatherRebuildCanonicalRange($pdo, $startUtc, $endUtc, 30);
    echo "buckets={$result['bucketsProcessed']} station={$result['stationUsed']} backup={$result['backupUsed']}\n";
    flush();
}

echo "\nDone.\n";
