<?php
/**
 * handleBackfillWeatherProvider — Fetch historical weather from external provider
 * 
 * Body: { eventId, trackId, provider, startUtc, endUtc, lat?, lon? }
 * Fetches weather from Open-Meteo API and inserts into parity_weather_samples.
 * Admin-only. Deduplicates on (timestamp_utc, event_id, source).
 */
function handleBackfillWeatherProvider(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    
    $eventId = (int)($input['eventId'] ?? 0);
    $trackId = (int)($input['trackId'] ?? 0);
    $provider = $input['provider'] ?? '';
    $startUtc = $input['startUtc'] ?? '';
    $endUtc = $input['endUtc'] ?? '';
    $lat = isset($input['lat']) ? (float)$input['lat'] : null;
    $lon = isset($input['lon']) ? (float)$input['lon'] : null;
    
    if ($eventId <= 0) rsa_jsonResponse(['error' => 'eventId is required'], 400);
    if ($trackId <= 0) rsa_jsonResponse(['error' => 'trackId is required'], 400);
    if ($provider !== 'OPEN_METEO') rsa_jsonResponse(['error' => 'Only OPEN_METEO provider is currently supported'], 400);
    if (!$startUtc || !$endUtc) rsa_jsonResponse(['error' => 'startUtc and endUtc are required'], 400);
    
    // Validate event exists and get track info
    $evtChk = $pdo->prepare("
        SELECT e.id, t.timezone_iana, t.latitude, t.longitude 
        FROM parity_events e 
        JOIN parity_tracks t ON t.id = e.track_id 
        WHERE e.id = ?
    ");
    $evtChk->execute([$eventId]);
    $evt = $evtChk->fetch(PDO::FETCH_ASSOC);
    if (!$evt) rsa_jsonResponse(['error' => "Event $eventId not found"], 404);
    
    $tz = $evt['timezone_iana'];
    
    // Use track lat/lon if not provided
    if ($lat === null || $lon === null) {
        $lat = (float)$evt['latitude'];
        $lon = (float)$evt['longitude'];
        if ($lat === 0.0 || $lon === 0.0) {
            rsa_jsonResponse(['error' => 'Track has no lat/lon coordinates and none provided'], 400);
        }
    }
    
    // Fetch from Open-Meteo
    try {
        $samples = fetchOpenMeteoWeather($lat, $lon, $startUtc, $endUtc);
    } catch (Exception $e) {
        rsa_jsonResponse(['error' => 'Provider fetch failed: ' . $e->getMessage()], 500);
        return;
    }
    
    if (empty($samples)) {
        rsa_jsonResponse([
            'ok' => true,
            'eventId' => $eventId,
            'trackId' => $trackId,
            'provider' => $provider,
            'totalRows' => 0,
            'inserted' => 0,
            'deduped' => 0,
            'errorCount' => 0,
            'errors' => [],
            'preview' => [],
        ]);
        return;
    }
    
    // Insert samples
    $stmtInsert = $pdo->prepare("
        INSERT INTO parity_weather_samples
            (timestamp_utc, event_id, track_id, event_local_time, temp_c, temp_f, rh_pct, station_pressure_raw, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $inserted = 0;
    $deduped = 0;
    $errors = [];
    $preview = [];
    
    foreach ($samples as $i => $sample) {
        $tsUtc = $sample['timestampUtc'];
        $tempF = $sample['tempF'];
        $humPct = $sample['humidityPct'];
        $baroInHg = $sample['baroInHg'];
        $source = $sample['source'];
        
        // Convert tempF → tempC
        $tempC = ($tempF - 32) * 5.0 / 9.0;
        
        // Convert inHg to mbar for station_pressure_raw
        $pressureMbar = $baroInHg / 0.02953;
        
        // Compute local time
        try {
            $utcDt = new DateTimeImmutable($tsUtc, new DateTimeZone('UTC'));
            $localDt = $utcDt->setTimezone(new DateTimeZone($tz));
            $localStr = $localDt->format('Y-m-d H:i:s');
            $tsUtcFmt = $utcDt->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            $errors[] = "Sample $i: invalid timestamp '$tsUtc'";
            continue;
        }
        
        // Store preview (first 50 samples)
        if (count($preview) < 50) {
            $preview[] = [
                'timestampUtc' => $tsUtcFmt,
                'tempF' => round($tempF, 2),
                'humidityPct' => round($humPct, 1),
                'baroInHg' => round($baroInHg, 3),
            ];
        }
        
        try {
            $stmtInsert->execute([
                $tsUtcFmt,
                $eventId,
                $trackId,
                $localStr,
                round($tempC, 4),
                round($tempF, 4),
                round($humPct, 2),
                round($pressureMbar, 4),
                $source,
            ]);
            $inserted++;
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Duplicate') !== false) {
                $deduped++;
            } else {
                $errors[] = "Sample $i: " . $e->getMessage();
            }
        }
    }
    
    rsa_jsonResponse([
        'ok' => true,
        'eventId' => $eventId,
        'trackId' => $trackId,
        'provider' => $provider,
        'totalRows' => count($samples),
        'inserted' => $inserted,
        'deduped' => $deduped,
        'errorCount' => count($errors),
        'errors' => array_slice($errors, 0, 20),
        'preview' => $preview,
    ]);
}

/**
 * Fetch historical weather from Open-Meteo Archive API
 * 
 * @param float $lat Latitude
 * @param float $lon Longitude
 * @param string $startUtc Start timestamp (ISO 8601)
 * @param string $endUtc End timestamp (ISO 8601)
 * @return array Array of samples: [{timestampUtc, tempF, humidityPct, baroInHg, source}]
 * @throws Exception on API error
 */
function fetchOpenMeteoWeather(float $lat, float $lon, string $startUtc, string $endUtc): array {
    // Convert ISO timestamps to YYYY-MM-DD
    $startDate = substr($startUtc, 0, 10);
    $endDate = substr($endUtc, 0, 10);
    
    // Build API URL
    $url = 'https://archive-api.open-meteo.com/v1/archive';
    $params = [
        'latitude' => $lat,
        'longitude' => $lon,
        'start_date' => $startDate,
        'end_date' => $endDate,
        'hourly' => 'temperature_2m,relative_humidity_2m,surface_pressure',
        'temperature_unit' => 'fahrenheit',
        'timezone' => 'UTC',
    ];
    
    $fullUrl = $url . '?' . http_build_query($params);
    
    // Fetch data with timeout
    $context = stream_context_create([
        'http' => [
            'timeout' => 30,
            'user_agent' => 'RSA-Parity/1.0',
        ],
    ]);
    
    $response = @file_get_contents($fullUrl, false, $context);
    if ($response === false) {
        throw new Exception('Failed to fetch from Open-Meteo API');
    }
    
    $data = json_decode($response, true);
    if (!$data || !isset($data['hourly']) || !isset($data['hourly']['time'])) {
        throw new Exception('Invalid response from Open-Meteo API');
    }
    
    $hourly = $data['hourly'];
    $times = $hourly['time'];
    $temps = $hourly['temperature_2m'] ?? [];
    $humidity = $hourly['relative_humidity_2m'] ?? [];
    $pressure = $hourly['surface_pressure'] ?? [];
    
    $samples = [];
    for ($i = 0; $i < count($times); $i++) {
        $timestamp = $times[$i];
        $tempF = $temps[$i] ?? null;
        $humPct = $humidity[$i] ?? null;
        $pressureHPa = $pressure[$i] ?? null;
        
        // Skip if any value is missing
        if ($tempF === null || $humPct === null || $pressureHPa === null) {
            continue;
        }
        
        // Validate ranges
        if (!is_finite($tempF) || !is_finite($humPct) || !is_finite($pressureHPa)) {
            continue;
        }
        if ($humPct < 0 || $humPct > 100) {
            continue;
        }
        if ($pressureHPa < 800 || $pressureHPa > 1100) {
            continue;
        }
        
        // Convert pressure from hPa to inHg (1 hPa = 0.02953 inHg)
        $baroInHg = $pressureHPa * 0.02953;
        
        // Ensure timestamp is ISO UTC format
        $timestampUtc = strpos($timestamp, 'Z') !== false ? $timestamp : $timestamp . ':00Z';
        
        $samples[] = [
            'timestampUtc' => $timestampUtc,
            'tempF' => $tempF,
            'humidityPct' => $humPct,
            'baroInHg' => $baroInHg,
            'source' => 'open_meteo_backfill',
        ];
    }
    
    return $samples;
}
