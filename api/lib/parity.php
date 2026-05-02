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
 * Redact sensitive query params from a URL for safe logging.
 */
function parity_redactUrl(string $url): string {
    return preg_replace('/([?&])(api_key|token|secret|key|password)=[^&]*/i', '$1$2=REDACTED', $url);
}

/**
 * HTTP GET with cURL — returns structured result.
 * NEVER logs raw URLs that may contain secrets; uses parity_redactUrl.
 *
 * @return array{body: string|false, httpCode: int, error: string}
 */
function parity_httpGetFull(string $url): array {
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
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    return ['body' => $result, 'httpCode' => $httpCode, 'error' => $error];
}

/**
 * HTTP GET with cURL — simple boolean interface (backwards compat for OData).
 * Logs redacted URLs only.
 */
function parity_httpGet(string $url): string|false {
    $r = parity_httpGetFull($url);
    if ($r['body'] === false || $r['httpCode'] >= 400) {
        error_log("parity_httpGet failed: url=" . parity_redactUrl($url) . " httpCode={$r['httpCode']} error={$r['error']}");
        return false;
    }
    return $r['body'];
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
            case 'lane':
                $row[$normalizedKey] = parity_normalizeLane($value);
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
 * Normalize lane values to canonical form.
 * Accepts: Left/Right/L/R (pair mode) and 1/2/3/4/Lane 1/etc (quad mode).
 * Returns: 'L','R','1','2','3','4' or null.
 */
function parity_normalizeLane(mixed $value): ?string {
    if ($value === null || $value === '') return null;
    $s = strtolower(trim((string)$value));
    // Strip "lane " prefix: "lane 1" -> "1", "lane left" -> "left"
    $s = preg_replace('/^lane\s*/i', '', $s);
    // Pair lanes
    if (in_array($s, ['l', 'left'])) return 'L';
    if (in_array($s, ['r', 'right'])) return 'R';
    // Quad lanes
    if ($s === '1') return '1';
    if ($s === '2') return '2';
    if ($s === '3') return '3';
    if ($s === '4') return '4';
    // Pass through anything else as-is (uppercase first char)
    return strtoupper(substr(trim((string)$value), 0, 1)) ?: null;
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
 * Parse a raw NHRA OData timestamp into EVENT-LOCAL wall-clock datetime.
 *
 * NHRA timing system timestamps represent local time at the track, NOT UTC.
 * The /Date(epoch_ms)/ format from NHRA OData is non-standard: the epoch
 * value encodes local wall-clock time (as if the track were in GMT).
 *
 * We use gmdate() to extract the datetime digits without any server-timezone
 * interference, since the epoch value itself represents local time.
 *
 * @param mixed $value  Raw OData timestamp value
 * @return string|null  "Y-m-d H:i:s" in event-local time, or null
 */
function parity_parseTimestampLocal(mixed $value): ?string {
    if ($value === null || $value === '') return null;
    $s = (string)$value;

    // OData v2 date format: /Date(1234567890000)/
    // NHRA encodes local wall-clock time as epoch ms (non-standard).
    // Use gmdate to extract digits without server-tz interference.
    if (preg_match('#/Date\((-?\d+)\)/#', $s, $m)) {
        return gmdate('Y-m-d H:i:s', (int)($m[1] / 1000));
    }

    // ISO 8601 with explicit offset — strip offset, keep wall-clock digits.
    // e.g. "2025-10-30T14:30:00-04:00" → "2025-10-30 14:30:00"
    if (preg_match('/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/', $s, $m)) {
        return $m[1] . ' ' . $m[2];
    }

    // Bare datetime string — take as-is (already local).
    // Use strtotime with UTC anchor to avoid server-tz interference.
    $ts = strtotime($s . ' UTC');
    if ($ts !== false) {
        return gmdate('Y-m-d H:i:s', $ts);
    }

    return null;
}

/**
 * Backward-compat wrapper. Returns local time (same as parity_parseTimestampLocal).
 * @deprecated Use parity_parseTimestampLocal() instead.
 */
function parity_parseTimestamp(mixed $value): ?string {
    return parity_parseTimestampLocal($value);
}

/**
 * Convert a UTC datetime string to track-local time using an IANA timezone.
 *
 * @param string|null $utcDatetime  MySQL DATETIME in UTC (e.g. "2025-10-30 18:30:00")
 * @param string      $tzIana       IANA timezone (e.g. "America/New_York")
 * @return string|null  Local datetime string "Y-m-d H:i:s" or null
 */
function parity_utcToLocal(?string $utcDatetime, string $tzIana): ?string {
    if ($utcDatetime === null || $utcDatetime === '') return null;
    try {
        $dt = new DateTimeImmutable($utcDatetime, new DateTimeZone('UTC'));
        return $dt->setTimezone(new DateTimeZone($tzIana))->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Convert a local datetime string to UTC using an IANA timezone.
 * Handles DST transitions correctly via PHP's DateTimeImmutable.
 *
 * @param string|null $localDatetime  MySQL DATETIME in local time
 * @param string      $tzIana         IANA timezone (e.g. "America/Los_Angeles")
 * @return string|null  UTC datetime string "Y-m-d H:i:s" or null
 */
function parity_localToUtc(?string $localDatetime, string $tzIana): ?string {
    if ($localDatetime === null || $localDatetime === '') return null;
    try {
        $dt = new DateTimeImmutable($localDatetime, new DateTimeZone($tzIana));
        return $dt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        return null;
    }
}

// ============================================================================
// Row Hashing
// ============================================================================

/**
 * Compute a deterministic row hash for de-duplication.
 */
function parity_computeRowHash(string $raceLookup, array $normalized, array $raw): string {
    // IMPORTANT: We do NOT use source_ref (NHRA DumbyID) as the dedup key.
    // NHRA reassigns DumbyIDs when new entries are inserted mid-event (e.g.,
    // late additions shift all subsequent IDs), causing hash collisions that
    // corrupt existing rows on re-import.  Identity fields are stable.
    $parts = [
        $raceLookup,
        strtolower(trim($normalized['driver_name'] ?? '')),
        strtolower(trim($normalized['round'] ?? '')),
        strtolower(trim($normalized['class_index'] ?? '')),
        strtolower(trim($normalized['lane'] ?? '')),
        // ET as tiebreaker — same driver+round+class+lane is normally unique,
        // but include ft1320 to distinguish DQ/re-runs.  Fall back to
        // timestamp when ET is absent (aborted / red-light run).
        $normalized['ft1320'] !== null
            ? number_format((float)$normalized['ft1320'], 4, '.', '')
            : ($normalized['run_timestamp_utc'] ?? ''),
    ];

    return hash('sha256', implode('|', $parts));
}

/**
 * Upsert a normalized run row: INSERT or merge-update if a matching row exists.
 *
 * Merge strategy: new non-null values overwrite existing null values.
 * Existing non-null values are NOT overwritten with null.
 *
 * Returns: 'inserted' | 'updated' | 'skipped'
 */
function parity_upsertRun(PDO $pdo, array $normalized, string $rowHash, int $importId, string $raceLookup, ?string $utcTime, ?string $localTime): string {
    // Timing/numeric fields that can be filled in on a merge-update
    static $mergeFields = [
        'category', 'class_index', 'round', 'lane', 'driver_name', 'car_number',
        'dial_in', 'rt', 'ft60', 'ft330', 'ft660', 'mph660', 'ft1000', 'mph1000',
        'ft1320', 'mph1320', 'win_flag', 'dq_flag', 'mov', 'place', 'source_ref',
    ];

    // Try INSERT first (fast path — most runs are new)
    $stmtInsert = $pdo->prepare("
        INSERT INTO parity_runs (uuid, import_id, race_lookup, run_timestamp_utc, run_time_local, category, class_index, round, lane, driver_name, car_number, dial_in, rt, ft60, ft330, ft660, mph660, ft1000, mph1000, ft1320, mph1320, win_flag, dq_flag, mov, place, source_ref, row_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    try {
        $stmtInsert->execute([
            parity_generateUUID(), $importId, $raceLookup,
            $utcTime, $localTime,
            $normalized['category'], $normalized['class_index'],
            $normalized['round'], $normalized['lane'], $normalized['driver_name'], $normalized['car_number'],
            $normalized['dial_in'], $normalized['rt'], $normalized['ft60'], $normalized['ft330'],
            $normalized['ft660'], $normalized['mph660'], $normalized['ft1000'], $normalized['mph1000'],
            $normalized['ft1320'], $normalized['mph1320'], $normalized['win_flag'], $normalized['dq_flag'],
            $normalized['mov'], $normalized['place'], $normalized['source_ref'], $rowHash,
        ]);
        return 'inserted';
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate') === false) {
            throw $e;  // real error, not a dupe
        }
    }

    // Duplicate row_hash — check if existing row is partial and needs merging
    $stmtFind = $pdo->prepare("
        SELECT id, rt, ft60, ft330, ft660, mph660, ft1000, mph1000, ft1320, mph1320,
               dial_in, car_number, win_flag, dq_flag, mov, place, source_ref,
               run_timestamp_utc, run_time_local, category, class_index, driver_name, round, lane
        FROM parity_runs
        WHERE race_lookup = ? AND row_hash = ?
        LIMIT 1
    ");
    $stmtFind->execute([$raceLookup, $rowHash]);
    $existing = $stmtFind->fetch(PDO::FETCH_ASSOC);

    if (!$existing) {
        return 'skipped';  // shouldn't happen, but defensive
    }

    // Build SET clause: only update fields where existing is null and incoming is not null
    $setClauses = [];
    $setParams = [];

    foreach ($mergeFields as $field) {
        $incomingVal = $normalized[$field] ?? null;
        $existingVal = $existing[$field] ?? null;
        if ($incomingVal !== null && $incomingVal !== '' && ($existingVal === null || $existingVal === '')) {
            $setClauses[] = "$field = ?";
            $setParams[] = $incomingVal;
        }
    }

    // Also merge timestamp fields
    if ($utcTime !== null && ($existing['run_timestamp_utc'] === null || $existing['run_timestamp_utc'] === '')) {
        $setClauses[] = "run_timestamp_utc = ?";
        $setParams[] = $utcTime;
    }
    if ($localTime !== null && ($existing['run_time_local'] === null || $existing['run_time_local'] === '')) {
        $setClauses[] = "run_time_local = ?";
        $setParams[] = $localTime;
    }

    if (empty($setClauses)) {
        return 'skipped';  // nothing to update
    }

    // Perform merge update
    $setClause = implode(', ', $setClauses);
    $setParams[] = (int)$existing['id'];
    $pdo->prepare("UPDATE parity_runs SET $setClause WHERE id = ?")->execute($setParams);
    return 'updated';
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
 * Fetch Tempest observations for a time range with retry/backoff.
 *
 * Retry policy:
 *   - 429 (rate limit), 503, 504: retry up to 5 times with exponential backoff + jitter
 *   - 401, 403: fail fast with "unauthorized" (no secret shown)
 *   - 200 but empty obs: return empty array (no_data, not an error)
 *   - Other 4xx/5xx: fail after retries
 *
 * SECURITY: NEVER includes api_key in exceptions or error_log.
 *
 * @param int    $startEpoch     Unix epoch seconds (UTC)
 * @param int    $endEpoch       Unix epoch seconds (UTC)
 * @param int    $bucketMinutes  Aggregation bucket (default 30)
 * @param string $stationId      Tempest station ID (from env)
 * @param string $apiKey         Tempest API key (from env)
 * @return array{samples: array, httpCode: int, attempts: int}
 * @throws RuntimeException on unrecoverable failure (message is safe to expose)
 */
function parity_fetchTempest(int $startEpoch, int $endEpoch, int $bucketMinutes, string $stationId, string $apiKey, int $maxRetries = 5): array {
    $url = "https://swd.weatherflow.com/swd/rest/observations/stn/{$stationId}"
         . "?time_start={$startEpoch}&time_end={$endEpoch}"
         . "&bucket={$bucketMinutes}&api_key={$apiKey}";

    $maxRetries = max(1, $maxRetries);
    $lastHttpCode = 0;
    $lastError = '';

    for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
        $r = parity_httpGetFull($url);
        $lastHttpCode = $r['httpCode'];

        // Fail fast on auth errors
        if ($lastHttpCode === 401 || $lastHttpCode === 403) {
            throw new RuntimeException("Tempest credentials invalid/unauthorized (HTTP $lastHttpCode)");
        }

        // Success path
        if ($r['body'] !== false && $lastHttpCode >= 200 && $lastHttpCode < 300) {
            $json = json_decode($r['body'], true);
            if ($json === null) {
                throw new RuntimeException("Tempest returned invalid JSON (HTTP $lastHttpCode)");
            }
            $samples = parity_parseTempestResponse($json);
            return ['samples' => $samples, 'httpCode' => $lastHttpCode, 'attempts' => $attempt];
        }

        // Retryable status codes: 429, 503, 504
        $retryable = in_array($lastHttpCode, [429, 503, 504], true) || $r['body'] === false;
        if (!$retryable || $attempt === $maxRetries) {
            $bodySnippet = is_string($r['body']) ? substr($r['body'], 0, 200) : '(no body)';
            $lastError = "HTTP $lastHttpCode after $attempt attempt(s). Body: $bodySnippet";
            error_log("parity_fetchTempest failed: " . parity_redactUrl($url) . " — $lastError");
            break;
        }

        // Exponential backoff + jitter: 1s, 2s, 4s, 8s, 16s + 0-500ms random
        $backoffMs = (int)(pow(2, $attempt - 1) * 1000) + random_int(0, 500);
        usleep($backoffMs * 1000);
    }

    throw new RuntimeException("Tempest fetch failed (HTTP $lastHttpCode after $maxRetries retries)");
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
    $windSpeedIdx = $fieldMap['wind_avg'] ?? $fieldMap['wind_average'] ?? $fieldMap['wind_speed'] ?? null;
    $windDirIdx = $fieldMap['wind_dir'] ?? $fieldMap['wind_direction'] ?? $fieldMap['wind_bearing'] ?? null;

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

        // Wind speed: Tempest obs_st uses m/s → convert to mph
        $windMps = ($windSpeedIdx !== null && isset($row[$windSpeedIdx]) && $row[$windSpeedIdx] !== null)
            ? (float)$row[$windSpeedIdx] : null;
        $windMph = $windMps !== null ? round($windMps * 2.23694, 2) : null;

        $windDir = ($windDirIdx !== null && isset($row[$windDirIdx]) && $row[$windDirIdx] !== null)
            ? (int)$row[$windDirIdx] : null;

        $samples[] = [
            'timestamp_epoch' => $epoch,
            'temp_c' => $tempC,
            'rh_pct' => $rh,
            'station_pressure_raw' => $press,
            'wind_speed_mph' => $windMph,
            'wind_dir_deg' => $windDir,
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
 *
 * Supports multi-station via TEMPEST_STATION_IDS (comma-separated).
 * Falls back to legacy single TEMPEST_STATION_ID for backward compat.
 *
 * @return array [ 'station_id' => string, 'station_ids' => string[], 'api_key' => string, 'bucket_minutes' => int ]
 * @throws RuntimeException if required vars are missing
 */
function parity_getTempestConfig(): array {
    $stationIdsRaw = defined('TEMPEST_STATION_IDS') ? TEMPEST_STATION_IDS : (getenv('TEMPEST_STATION_IDS') ?: ($_ENV['TEMPEST_STATION_IDS'] ?? ''));
    $stationId = defined('TEMPEST_STATION_ID') ? TEMPEST_STATION_ID : (getenv('TEMPEST_STATION_ID') ?: ($_ENV['TEMPEST_STATION_ID'] ?? ''));
    $apiKey = defined('TEMPEST_API_KEY') ? TEMPEST_API_KEY : (getenv('TEMPEST_API_KEY') ?: ($_ENV['TEMPEST_API_KEY'] ?? ''));
    $bucket = defined('TEMPEST_BUCKET_MINUTES') ? (int)TEMPEST_BUCKET_MINUTES : (int)(getenv('TEMPEST_BUCKET_MINUTES') ?: ($_ENV['TEMPEST_BUCKET_MINUTES'] ?? 30));

    // Build station IDs array: prefer TEMPEST_STATION_IDS, fall back to single TEMPEST_STATION_ID
    $stationIds = [];
    if (!empty($stationIdsRaw)) {
        $stationIds = array_filter(array_map('trim', explode(',', $stationIdsRaw)));
    }
    if (empty($stationIds) && !empty($stationId)) {
        $stationIds = [$stationId];
    }

    if (empty($stationIds) || empty($apiKey)) {
        throw new RuntimeException('TEMPEST_STATION_IDS (or TEMPEST_STATION_ID) and TEMPEST_API_KEY must be defined in config.php or environment');
    }

    return [
        'station_id' => $stationIds[0],          // Legacy: primary station for backward compat
        'station_ids' => $stationIds,             // All stations for multi-station fetch
        'api_key' => $apiKey,
        'bucket_minutes' => $bucket ?: 30,
    ];
}

/**
 * Fetch weather data from ALL configured Tempest stations for a time range.
 *
 * Each station's samples are tagged with source = "tempest_{stationId}" so they
 * can coexist in parity_weather_samples and be cross-validated during canonical rebuild.
 *
 * Stations that are offline or return errors are logged but don't block the others.
 *
 * @param int    $startEpoch     Unix epoch start
 * @param int    $endEpoch       Unix epoch end
 * @param array  $config         From parity_getTempestConfig()
 * @param int    $throttleMs     Delay between station fetches (default 300ms)
 * @return array [ 'stations' => [ stationId => [ 'samples' => [...], 'error' => null|string ] ], 'totalSamples' => int ]
 */
function parity_fetchAllTempestStations(int $startEpoch, int $endEpoch, array $config, int $throttleMs = 300, int $maxRetries = 5): array {
    $stationIds = $config['station_ids'];
    $apiKey = $config['api_key'];
    $bucketMinutes = $config['bucket_minutes'];

    $stations = [];
    $totalSamples = 0;
    $isFirst = true;

    foreach ($stationIds as $sid) {
        if (!$isFirst && $throttleMs > 0) {
            usleep($throttleMs * 1000);
        }
        $isFirst = false;

        try {
            $result = parity_fetchTempest($startEpoch, $endEpoch, $bucketMinutes, $sid, $apiKey, $maxRetries);
            $stations[$sid] = ['samples' => $result['samples'], 'error' => null];
            $totalSamples += count($result['samples']);
        } catch (RuntimeException $e) {
            $stations[$sid] = ['samples' => [], 'error' => $e->getMessage()];
            error_log("parity_fetchAllTempestStations: station $sid failed: " . $e->getMessage());
        }
    }

    return ['stations' => $stations, 'totalSamples' => $totalSamples];
}

/**
 * Compute median of a numeric array. Returns null for empty arrays.
 */
function parity_median(array $values): ?float {
    $values = array_filter($values, function($v) { return $v !== null && is_numeric($v); });
    $values = array_values($values);
    $n = count($values);
    if ($n === 0) return null;
    sort($values);
    $mid = (int)floor($n / 2);
    if ($n % 2 === 0) {
        return ($values[$mid - 1] + $values[$mid]) / 2.0;
    }
    return (float)$values[$mid];
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
