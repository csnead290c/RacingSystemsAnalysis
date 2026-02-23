<?php
/**
 * NHRA Tech Parity — Shared Library
 *
 * OData client, normalization mapper, row hashing, UUID generation.
 * Used by api/parity.php endpoints.
 */

// ============================================================================
// OData Client
// ============================================================================

/**
 * Fetch NHRA results from the OData feed, handling pagination and both
 * JSON shapes:
 *   - { "value": [...], "@odata.nextLink": "..." }       (OData v4)
 *   - { "d": { "results": [...], "__next": "..." } }     (OData v2)
 *
 * @param string $raceLookup  YYYYMMDD date string
 * @return array  [ 'rows' => array[], 'url' => string ]
 * @throws RuntimeException on fetch failure
 */
function parity_fetchODataResults(string $raceLookup): array {
    $baseUrl = "https://odata.nhradata.com/api/oGetResults/GetResults/{$raceLookup}";
    $url = $baseUrl;
    $allRows = [];
    $pageCount = 0;
    $maxPages = 100; // safety limit

    while ($url && $pageCount < $maxPages) {
        $pageCount++;
        $response = parity_httpGet($url);

        if ($response === false) {
            throw new RuntimeException("Failed to fetch OData URL: $url");
        }

        $json = json_decode($response, true);
        if ($json === null) {
            throw new RuntimeException("Invalid JSON from OData URL: $url");
        }

        // Extract rows from either JSON shape
        $rows = parity_extractRows($json);
        $allRows = array_merge($allRows, $rows);

        // Follow pagination
        $url = parity_extractNextLink($json);
    }

    return [
        'rows' => $allRows,
        'url' => $baseUrl,
    ];
}

/**
 * Extract rows from OData JSON response (supports v2 and v4 shapes).
 */
function parity_extractRows(array $json): array {
    // OData v4: { "value": [...] }
    if (isset($json['value']) && is_array($json['value'])) {
        return $json['value'];
    }
    // OData v2: { "d": { "results": [...] } }
    if (isset($json['d']['results']) && is_array($json['d']['results'])) {
        return $json['d']['results'];
    }
    // OData v2 alternate: { "d": [...] }
    if (isset($json['d']) && is_array($json['d']) && !isset($json['d']['results'])) {
        return $json['d'];
    }
    return [];
}

/**
 * Extract the next-page URL from OData JSON response.
 */
function parity_extractNextLink(array $json): ?string {
    // OData v4
    if (!empty($json['@odata.nextLink'])) {
        return $json['@odata.nextLink'];
    }
    // OData v2
    if (!empty($json['d']['__next'])) {
        return $json['d']['__next'];
    }
    return null;
}

/**
 * HTTP GET with cURL.
 */
function parity_httpGet(string $url): string|false {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
        ],
    ]);
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($result === false || $httpCode >= 400) {
        error_log("parity_httpGet failed: url=$url httpCode=$httpCode error=$error");
        return false;
    }
    return $result;
}

// ============================================================================
// Field Alias Map & Normalization
// ============================================================================

/**
 * Configurable field alias map.
 * For each normalized column, lists candidate source field names in priority order.
 * When we learn the exact NHRA field names, add them to the front of each list.
 */
const PARITY_FIELD_ALIASES = [
    // Exact NHRA OData field names confirmed via $metadata + peek (2025-10-30 event).
    // NHRA fields: TimeStamp, Round, Lane, QualPos, CarNumber, Name, ClassIndex,
    //   DialIn, RT, ft60, ft330, ft660, mph660, ft1000, mph1000, ft1320, mph1320,
    //   MOV, Win, IsDQ, Place, Category, DumbyID
    // NOTE: IsDQ and Place contain the car number in real data, NOT boolean/position.
    'run_timestamp_utc' => ['TimeStamp', 'RunTimeUtc', 'TimestampUtc', 'UTC_Timestamp', 'RunDateTimeUtc', 'RunDate', 'DateTime'],
    'category'          => ['Category', 'Cat', 'EventCategory'],
    'class_index'       => ['ClassIndex', 'Class', 'Class_Name', 'ClassName', 'ClassId'],
    'round'             => ['Round', 'Rnd', 'RoundNumber', 'RoundNum'],
    'lane'              => ['Lane', 'LaneChoice', 'LaneNumber'],
    'driver_name'       => ['Name', 'DriverName', 'Driver', 'DriverFullName', 'Racer'],
    'car_number'        => ['CarNumber', 'CarNo', 'Car', 'CarNum'],
    'dial_in'           => ['DialIn', 'Dial', 'DialInTime'],
    'rt'                => ['RT', 'ReactionTime', 'Reaction', 'RxnTime'],
    'ft60'              => ['ft60', 'SixtyFoot', '60ft', 'Sixty', 'ET60'],
    'ft330'             => ['ft330', 'ThreeThirty', '330ft', 'ET330'],
    'ft660'             => ['ft660', 'SixSixty', '660ft', 'EighthMileET', 'ET660', 'Eighth'],
    'mph660'            => ['mph660', 'EighthMileMPH', '660mph', 'MPH660', 'EighthMPH'],
    'ft1000'            => ['ft1000', 'ThousandFoot', '1000ft', 'ET1000'],
    'mph1000'           => ['mph1000', '1000mph', 'MPH1000'],
    'ft1320'            => ['ft1320', 'QuarterMileET', '1320ft', 'ET1320', 'ET', 'ElapsedTime'],
    'mph1320'           => ['mph1320', 'QuarterMileMPH', '1320mph', 'MPH1320', 'MPH', 'Speed'],
    'win_flag'          => ['Win', 'IsWin', 'Winner', 'WinLoss'],
    'dq_flag'           => ['DQ', 'Disqualified', 'Foul'],
    'mov'               => ['MOV', 'MarginOfVictory', 'Margin'],
    'place'             => ['QualPos', 'Finish', 'Position', 'FinishPosition'],
    'source_ref'        => ['DumbyID', 'Id', 'RunId', 'ResultId', 'RowId', 'UniqueId', 'RecordId'],
];

/**
 * Normalize a single raw OData row into a parity_runs-shaped assoc array.
 *
 * @param array  $raw         Raw row from OData
 * @param string $raceLookup  The race lookup date string
 * @return array  Normalized row (keys match parity_runs columns)
 */
function parity_normalizeRow(array $raw, string $raceLookup): array {
    $row = ['race_lookup' => $raceLookup];

    foreach (PARITY_FIELD_ALIASES as $normalizedKey => $aliases) {
        $value = parity_findField($raw, $aliases);

        switch ($normalizedKey) {
            case 'run_timestamp_utc':
                $row[$normalizedKey] = parity_parseTimestamp($value);
                break;
            case 'win_flag':
            case 'dq_flag':
                $row[$normalizedKey] = parity_parseBool($value);
                break;
            case 'dial_in':
            case 'rt':
            case 'ft60':
            case 'ft330':
            case 'ft660':
            case 'mph660':
            case 'ft1000':
            case 'mph1000':
            case 'ft1320':
            case 'mph1320':
            case 'mov':
                $row[$normalizedKey] = parity_parseFloat($value);
                break;
            case 'round':
            case 'place':
                // Could be numeric or string
                $row[$normalizedKey] = ($value !== null) ? (string)$value : null;
                break;
            default:
                // String fields
                $row[$normalizedKey] = ($value !== null && $value !== '') ? (string)$value : null;
                break;
        }
    }

    return $row;
}

/**
 * Find a field value from a raw row using alias list (case-insensitive).
 */
function parity_findField(array $raw, array $aliases): mixed {
    // First try exact match
    foreach ($aliases as $alias) {
        if (array_key_exists($alias, $raw)) {
            return $raw[$alias];
        }
    }
    // Then try case-insensitive
    $lowered = [];
    foreach ($raw as $k => $v) {
        $lowered[strtolower($k)] = $v;
    }
    foreach ($aliases as $alias) {
        $key = strtolower($alias);
        if (array_key_exists($key, $lowered)) {
            return $lowered[$key];
        }
    }
    return null;
}

/**
 * Parse a value as float, returning null if not numeric.
 */
function parity_parseFloat(mixed $value): ?float {
    if ($value === null || $value === '') return null;
    if (is_numeric($value)) return (float)$value;
    // Strip common non-numeric chars
    $cleaned = preg_replace('/[^0-9.\-]/', '', (string)$value);
    if ($cleaned !== '' && is_numeric($cleaned)) return (float)$cleaned;
    return null;
}

/**
 * Parse a value as boolean, returning null if unparseable.
 * Handles: true/false, 1/0, "Y"/"N", "Yes"/"No", "W"/"L"
 */
function parity_parseBool(mixed $value): ?int {
    if ($value === null || $value === '') return null;
    if (is_bool($value)) return $value ? 1 : 0;
    if (is_int($value)) return $value ? 1 : 0;
    $s = strtolower(trim((string)$value));
    if (in_array($s, ['true', '1', 'y', 'yes', 'w', 'win'])) return 1;
    if (in_array($s, ['false', '0', 'n', 'no', 'l', 'loss'])) return 0;
    return null;
}

/**
 * Parse a timestamp string into MySQL DATETIME format, or null.
 */
function parity_parseTimestamp(mixed $value): ?string {
    if ($value === null || $value === '') return null;
    $s = (string)$value;

    // OData v2 date format: /Date(1234567890000)/
    if (preg_match('#/Date\((\d+)\)/#', $s, $m)) {
        return date('Y-m-d H:i:s', (int)($m[1] / 1000));
    }

    // Try standard parsing
    $ts = strtotime($s);
    if ($ts !== false) {
        return date('Y-m-d H:i:s', $ts);
    }

    return null;
}

// ============================================================================
// Row Hashing
// ============================================================================

/**
 * Compute a deterministic row hash for de-duplication.
 *
 * If source_ref exists, use it. Otherwise hash stable fields.
 */
function parity_computeRowHash(string $raceLookup, array $normalized, array $raw): string {
    $sourceRef = $normalized['source_ref'] ?? null;

    if ($sourceRef !== null && $sourceRef !== '') {
        return hash('sha256', $raceLookup . '|' . $sourceRef);
    }

    // Build stable key from available fields
    $parts = [
        $raceLookup,
        $normalized['driver_name'] ?? '',
        $normalized['lane'] ?? '',
        $normalized['round'] ?? '',
        $normalized['class_index'] ?? '',
        ($normalized['ft1320'] !== null) ? (string)$normalized['ft1320'] : '',
        ($normalized['mph1320'] !== null) ? (string)$normalized['mph1320'] : '',
        ($normalized['rt'] !== null) ? (string)$normalized['rt'] : '',
    ];

    return hash('sha256', implode('|', $parts));
}

// ============================================================================
// Tempest / WeatherFlow Client
// ============================================================================

/**
 * Pressure conversion: millibars → inches of mercury.
 * 1 mb = 0.0295300 inHg (standard conversion factor).
 * This is UNCORRECTED station pressure, NOT sea-level adjusted.
 */
const PARITY_MB_TO_INHG = 0.02953;

/**
 * Fetch Tempest observations for a time range.
 *
 * @param int    $startEpoch     Unix epoch seconds (UTC)
 * @param int    $endEpoch       Unix epoch seconds (UTC)
 * @param int    $bucketMinutes  Aggregation bucket (default 30)
 * @param string $stationId      Tempest station ID (from env)
 * @param string $apiKey         Tempest API key (from env)
 * @return array  List of [ 'timestamp_epoch' => int, 'temp_c' => ?float, 'rh_pct' => ?float, 'station_pressure_raw' => ?float ]
 * @throws RuntimeException on fetch/parse failure
 */
function parity_fetchTempest(int $startEpoch, int $endEpoch, int $bucketMinutes, string $stationId, string $apiKey): array {
    $url = "https://swd.weatherflow.com/swd/rest/observations/stn/{$stationId}"
         . "?time_start={$startEpoch}&time_end={$endEpoch}"
         . "&bucket={$bucketMinutes}&api_key={$apiKey}";

    $raw = parity_httpGet($url);
    if ($raw === false) {
        throw new RuntimeException("Tempest fetch failed: $url");
    }

    $json = json_decode($raw, true);
    if ($json === null) {
        throw new RuntimeException("Tempest returned invalid JSON");
    }

    return parity_parseTempestResponse($json);
}

/**
 * Parse a Tempest JSON response into sample objects.
 * Uses ob_fields to locate column indexes dynamically.
 */
function parity_parseTempestResponse(array $json): array {
    $fields = $json['ob_fields'] ?? $json['fields'] ?? [];
    $obs = $json['obs'] ?? [];

    if (empty($fields) || empty($obs)) {
        return [];
    }

    // Build field index map (case-insensitive)
    $fieldMap = [];
    foreach ($fields as $i => $name) {
        $fieldMap[strtolower($name)] = $i;
    }

    // Locate required columns
    $tsIdx = $fieldMap['timestamp'] ?? $fieldMap['time_epoch'] ?? null;
    $tempIdx = $fieldMap['air_temperature'] ?? $fieldMap['air_temp'] ?? $fieldMap['temperature'] ?? null;
    $rhIdx = $fieldMap['relative_humidity'] ?? $fieldMap['rh'] ?? null;
    $pressIdx = $fieldMap['station_pressure'] ?? $fieldMap['pressure'] ?? $fieldMap['barometric_pressure'] ?? null;

    if ($tsIdx === null) {
        throw new RuntimeException("Tempest response missing timestamp field. Fields: " . implode(', ', $fields));
    }

    $samples = [];
    foreach ($obs as $row) {
        if (!is_array($row)) continue;

        $epoch = isset($row[$tsIdx]) ? (int)$row[$tsIdx] : null;
        if ($epoch === null || $epoch === 0) continue;

        $tempC = ($tempIdx !== null && isset($row[$tempIdx]) && $row[$tempIdx] !== null)
            ? (float)$row[$tempIdx] : null;

        $rh = ($rhIdx !== null && isset($row[$rhIdx]) && $row[$rhIdx] !== null)
            ? (float)$row[$rhIdx] : null;

        $press = ($pressIdx !== null && isset($row[$pressIdx]) && $row[$pressIdx] !== null)
            ? (float)$row[$pressIdx] : null;

        $samples[] = [
            'timestamp_epoch' => $epoch,
            'temp_c' => $tempC,
            'rh_pct' => $rh,
            'station_pressure_raw' => $press,
        ];
    }

    return $samples;
}

/**
 * Convert Celsius to Fahrenheit.
 */
function parity_cToF(?float $c): ?float {
    if ($c === null) return null;
    return round($c * 9.0 / 5.0 + 32.0, 2);
}

/**
 * Convert millibars to inches of mercury.
 */
function parity_mbToInhg(?float $mb): ?float {
    if ($mb === null) return null;
    return round($mb * PARITY_MB_TO_INHG, 4);
}

/**
 * Get Tempest config from environment variables.
 * @return array [ 'station_id' => string, 'api_key' => string, 'bucket_minutes' => int ]
 * @throws RuntimeException if required vars are missing
 */
function parity_getTempestConfig(): array {
    $stationId = defined('TEMPEST_STATION_ID') ? TEMPEST_STATION_ID : (getenv('TEMPEST_STATION_ID') ?: ($_ENV['TEMPEST_STATION_ID'] ?? ''));
    $apiKey = defined('TEMPEST_API_KEY') ? TEMPEST_API_KEY : (getenv('TEMPEST_API_KEY') ?: ($_ENV['TEMPEST_API_KEY'] ?? ''));
    $bucket = defined('TEMPEST_BUCKET_MINUTES') ? (int)TEMPEST_BUCKET_MINUTES : (int)(getenv('TEMPEST_BUCKET_MINUTES') ?: ($_ENV['TEMPEST_BUCKET_MINUTES'] ?? 30));

    if (empty($stationId) || empty($apiKey)) {
        throw new RuntimeException('TEMPEST_STATION_ID and TEMPEST_API_KEY must be defined in config.php or environment');
    }

    return [
        'station_id' => $stationId,
        'api_key' => $apiKey,
        'bucket_minutes' => $bucket ?: 30,
    ];
}

// ============================================================================
// Event / Track Matching
// ============================================================================

/**
 * Find the best matching event for a UTC datetime.
 *
 * For each event, converts dtUTC to the event's track local time.
 * If the local time falls within [start_date 00:00:00, end_date 23:59:59], returns immediately.
 * Otherwise picks the event with the smallest distance to the nearest boundary.
 *
 * @param PDO    $pdo
 * @param string $dtUtc  MySQL DATETIME string in UTC
 * @return array|null  [ 'event_id' => int, 'track_id' => int, 'local_time' => string, 'timezone' => string ] or null
 */
function parity_matchEvent(PDO $pdo, string $dtUtc): ?array {
    $stmt = $pdo->query("
        SELECT e.id AS event_id, e.start_date_local, e.end_date_local,
               t.id AS track_id, t.timezone_iana
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
    ");
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($events)) return null;

    $utcDt = new DateTimeImmutable($dtUtc, new DateTimeZone('UTC'));
    $bestMatch = null;
    $bestDistance = PHP_INT_MAX;

    foreach ($events as $ev) {
        try {
            $tz = new DateTimeZone($ev['timezone_iana']);
        } catch (Exception $e) {
            continue; // skip invalid timezone
        }

        $localDt = $utcDt->setTimezone($tz);
        $localStr = $localDt->format('Y-m-d H:i:s');

        $startBound = new DateTimeImmutable($ev['start_date_local'] . ' 00:00:00', $tz);
        $endBound = new DateTimeImmutable($ev['end_date_local'] . ' 23:59:59', $tz);

        if ($localDt >= $startBound && $localDt <= $endBound) {
            // Exact match — inside event range
            return [
                'event_id' => (int)$ev['event_id'],
                'track_id' => (int)$ev['track_id'],
                'local_time' => $localStr,
                'timezone' => $ev['timezone_iana'],
            ];
        }

        // Compute distance to nearest boundary
        $distStart = abs($localDt->getTimestamp() - $startBound->getTimestamp());
        $distEnd = abs($localDt->getTimestamp() - $endBound->getTimestamp());
        $dist = min($distStart, $distEnd);

        if ($dist < $bestDistance) {
            $bestDistance = $dist;
            $bestMatch = [
                'event_id' => (int)$ev['event_id'],
                'track_id' => (int)$ev['track_id'],
                'local_time' => $localStr,
                'timezone' => $ev['timezone_iana'],
            ];
        }
    }

    return $bestMatch;
}

/**
 * Convert a local date string + timezone to UTC epoch range [start, end).
 * Returns [ 'start_epoch' => int, 'end_epoch' => int ]
 */
function parity_localDateToUtcRange(string $localDate, string $timezoneIana): array {
    $tz = new DateTimeZone($timezoneIana);
    $start = new DateTime($localDate . ' 00:00:00', $tz);
    $end = new DateTime($localDate . ' 23:59:59', $tz);
    return [
        'start_epoch' => $start->getTimestamp(),
        'end_epoch' => $end->getTimestamp(),
    ];
}

// ============================================================================
// UUID Generation
// ============================================================================

function parity_generateUUID(): string {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
