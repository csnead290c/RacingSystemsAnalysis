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
