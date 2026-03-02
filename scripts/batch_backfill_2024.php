<?php
/**
 * Standalone batch backfill script for 2024 events.
 * Run via: php batch_backfill_2024.php
 * from the public_html directory on the server.
 */
chdir("/home/customer/www/racingsystemsanalysis.com/public_html");
require_once "api/config.php";
require_once "api/parity_weather_provider.php";

$pdo = getDB();
set_time_limit(600);

$yearFrom = 2024;
$yearTo = 2024;
$maxCoveragePct = 80;

$stmt = $pdo->prepare("
    SELECT e.id AS event_id, e.event_name, e.race_lookup,
           e.start_date_local, e.end_date_local,
           t.id AS track_id, t.track_name, t.latitude, t.longitude, t.timezone_iana
    FROM parity_events e
    JOIN parity_tracks t ON t.id = e.track_id
    WHERE e.season_year BETWEEN ? AND ?
    ORDER BY e.start_date_local ASC
");
$stmt->execute([$yearFrom, $yearTo]);
$events = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmtRunCount = $pdo->prepare("SELECT COUNT(*) FROM parity_runs WHERE race_lookup = ?");
$stmtCoveredCount = $pdo->prepare("
    SELECT COUNT(*) FROM parity_runs r
    WHERE r.race_lookup = ?
      AND EXISTS (
          SELECT 1 FROM parity_weather_canonical wc
          WHERE ABS(TIMESTAMPDIFF(SECOND, r.run_timestamp_utc, wc.timestamp_utc)) <= 1800
      )
");

$totals = ["processed" => 0, "backfilled" => 0, "skipped" => 0, "errors" => 0];

foreach ($events as $ev) {
    $eventId = (int)$ev["event_id"];
    $evName = $ev["event_name"];
    $lat = $ev["latitude"] !== null ? (float)$ev["latitude"] : null;
    $lon = $ev["longitude"] !== null ? (float)$ev["longitude"] : null;
    $tz = $ev["timezone_iana"];

    $stmtRunCount->execute([$ev["race_lookup"]]);
    $runCount = (int)$stmtRunCount->fetchColumn();
    if ($runCount === 0) {
        echo "SKIP (no runs): $eventId $evName\n";
        $totals["skipped"]++;
        continue;
    }

    $stmtCoveredCount->execute([$ev["race_lookup"]]);
    $coveredCount = (int)$stmtCoveredCount->fetchColumn();
    $pct = round(100 * $coveredCount / $runCount, 1);
    if ($pct >= $maxCoveragePct) {
        echo "SKIP ({$pct}%): $eventId $evName\n";
        $totals["skipped"]++;
        continue;
    }
    if ($lat === null || $lon === null) {
        echo "SKIP (no coords): $eventId $evName\n";
        $totals["skipped"]++;
        continue;
    }

    $startLocal = $ev["start_date_local"];
    $endLocal = $ev["end_date_local"];
    try {
        $tzObj = new DateTimeZone($tz);
        $startUtcStr = (new DateTimeImmutable("$startLocal 00:00:00", $tzObj))
            ->setTimezone(new DateTimeZone("UTC"))->format("Y-m-d\TH:i:s\Z");
        $endUtcStr = (new DateTimeImmutable("$endLocal 23:59:59", $tzObj))
            ->setTimezone(new DateTimeZone("UTC"))->format("Y-m-d\TH:i:s\Z");
    } catch (Exception $e) {
        echo "ERROR tz: $eventId $evName: {$e->getMessage()}\n";
        $totals["errors"]++;
        continue;
    }

    echo "BACKFILL $eventId $evName ({$pct}%)... ";
    flush();

    try {
        $samples = fetchOpenMeteoWeather($lat, $lon, $startUtcStr, $endUtcStr);
    } catch (Exception $e) {
        echo "FETCH ERR: {$e->getMessage()}\n";
        $totals["errors"]++;
        continue;
    }

    $stmtIns = $pdo->prepare("
        INSERT INTO parity_weather_samples
            (timestamp_utc, event_id, track_id, event_local_time, temp_c, temp_f, rh_pct, station_pressure_raw, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open_meteo_backfill')
    ");
    $inserted = 0;
    $deduped = 0;
    foreach ($samples as $s) {
        $tempC = ($s["tempF"] - 32) * 5.0 / 9.0;
        $pressMbar = $s["baroInHg"] / 0.02953;
        try {
            $utcDt = new DateTimeImmutable($s["timestampUtc"], new DateTimeZone("UTC"));
            $localDt = $utcDt->setTimezone(new DateTimeZone($tz));
            $stmtIns->execute([
                $utcDt->format("Y-m-d H:i:s"),
                $eventId,
                (int)$ev["track_id"],
                $localDt->format("Y-m-d H:i:s"),
                round($tempC, 4),
                round($s["tempF"], 4),
                round($s["humidityPct"], 2),
                round($pressMbar, 4),
            ]);
            $inserted++;
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), "Duplicate") !== false) {
                $deduped++;
            }
        } catch (Exception $e) {
            // skip bad timestamps
        }
    }
    $totals["backfilled"]++;
    $totals["processed"]++;
    echo "fetched=" . count($samples) . " ins=$inserted dedup=$deduped\n";
    flush();
    usleep(400000); // 400ms throttle
}

echo "\n=== TOTALS ===\n";
echo json_encode($totals, JSON_PRETTY_PRINT) . "\n";
