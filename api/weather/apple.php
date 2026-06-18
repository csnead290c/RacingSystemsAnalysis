<?php
/**
 * Apple WeatherKit proxy endpoint.
 *
 * Fetches current conditions and hourly forecast from Apple WeatherKit REST API
 * for a given lat/lon, signing the request with an ES256 JWT derived from the
 * Apple Developer credentials stored in config.php.
 *
 * Apple WeatherKit returns:
 *   - currentWeather.temperature     (°C) → convert to °F
 *   - currentWeather.humidity        (0–1) → multiply by 100 for %
 *   - currentWeather.pressure        (hPa, sea-level) → convert to inHg
 *   - currentWeather.wind.speed      (km/h) → convert to mph
 *   - currentWeather.wind.direction  (degrees from north)
 *
 * Pressure note: Apple WeatherKit provides SEA-LEVEL pressure in hPa.
 *   This maps directly to RSA barometerInHg (no station/altitude correction needed).
 *   Conversion: inHg = hPa / 33.8639
 *
 * Required config.php constants (never commit real values):
 *   APPLE_WEATHER_KEY_ID    — Key ID from Apple Developer portal (10-char string)
 *   APPLE_WEATHER_TEAM_ID   — Apple Developer Team ID (10-char string)
 *   APPLE_WEATHER_SERVICE_BUNDLE_ID — Service identifier (e.g. com.example.weatherkit-client)
 *   APPLE_WEATHER_PRIVATE_KEY_PEM   — PEM-encoded ES256 private key (multiline)
 *
 * Request:  GET /api/weather/apple.php?lat=35.123&lon=-97.456&tz=America/Chicago
 * Response: JSON object with keys matching the WeatherInput interface in RSA
 *
 * Error response: { "error": "message", "code": "WEATHERKIT_ERROR" }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config.php';

// ─── Validate required configuration ─────────────────────────────────────────

foreach (['APPLE_WEATHER_KEY_ID', 'APPLE_WEATHER_TEAM_ID', 'APPLE_WEATHER_SERVICE_BUNDLE_ID', 'APPLE_WEATHER_PRIVATE_KEY_PEM'] as $const) {
    if (!defined($const) || empty(constant($const))) {
        http_response_code(503);
        echo json_encode(['error' => "Apple WeatherKit not configured: missing $const", 'code' => 'NOT_CONFIGURED']);
        exit;
    }
}

// ─── Parse and validate query parameters ─────────────────────────────────────

$lat = isset($_GET['lat']) ? (float)$_GET['lat'] : null;
$lon = isset($_GET['lon']) ? (float)$_GET['lon'] : null;
$tz  = isset($_GET['tz'])  ? preg_replace('/[^A-Za-z0-9_\/\-+]/', '', $_GET['tz']) : 'UTC';

if ($lat === null || $lon === null || $lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) {
    http_response_code(400);
    echo json_encode(['error' => 'lat and lon are required and must be valid coordinates', 'code' => 'BAD_REQUEST']);
    exit;
}

// ─── Build ES256 JWT ──────────────────────────────────────────────────────────

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function build_weatherkit_jwt(): string {
    $keyId    = APPLE_WEATHER_KEY_ID;
    $teamId   = APPLE_WEATHER_TEAM_ID;
    $bundleId = APPLE_WEATHER_SERVICE_BUNDLE_ID;
    $pem      = APPLE_WEATHER_PRIVATE_KEY_PEM;

    $now = time();
    $header = base64url_encode(json_encode(['alg' => 'ES256', 'kid' => $keyId]));
    $payload = base64url_encode(json_encode([
        'iss' => $teamId,
        'iat' => $now,
        'exp' => $now + 3600,
        'sub' => $bundleId,
    ]));

    $signing_input = "$header.$payload";

    $pkey = openssl_pkey_get_private($pem);
    if ($pkey === false) {
        throw new \RuntimeException('Failed to load Apple WeatherKit private key');
    }

    $signature = '';
    if (!openssl_sign($signing_input, $signature, $pkey, OPENSSL_ALGO_SHA256)) {
        throw new \RuntimeException('Failed to sign WeatherKit JWT');
    }

    // openssl_sign returns DER-encoded ECDSA signature; convert to raw r||s for JWT
    // DER format: 30 <len> 02 <rlen> <r> 02 <slen> <s>
    $offset = 2; // skip 30 <len>
    $offset++; // skip 02
    $rLen = ord($signature[$offset++]);
    if (ord($signature[$offset]) === 0x00) { $offset++; $rLen--; } // skip leading 0x00 padding
    $r = substr($signature, $offset, $rLen);
    $offset += $rLen;
    $offset++; // skip 02
    $sLen = ord($signature[$offset++]);
    if (ord($signature[$offset]) === 0x00) { $offset++; $sLen--; }
    $s = substr($signature, $offset, $sLen);

    // Pad r and s to 32 bytes each
    $r = str_pad($r, 32, "\x00", STR_PAD_LEFT);
    $s = str_pad($s, 32, "\x00", STR_PAD_LEFT);

    return "$header.$payload." . base64url_encode($r . $s);
}

// ─── Call WeatherKit API ──────────────────────────────────────────────────────

try {
    $jwt = build_weatherkit_jwt();
} catch (\RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage(), 'code' => 'JWT_ERROR']);
    exit;
}

$dataSetTypes = 'currentWeather';
$url = "https://weatherkit.apple.com/api/v1/weather/en/{$lat}/{$lon}"
     . "?dataSets={$dataSetTypes}&timezone=" . urlencode($tz);

$ctx = stream_context_create([
    'http' => [
        'method'  => 'GET',
        'header'  => "Authorization: Bearer $jwt\r\nAccept: application/json\r\n",
        'timeout' => 10,
        'ignore_errors' => true,
    ]
]);

$raw = @file_get_contents($url, false, $ctx);
if ($raw === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to reach Apple WeatherKit', 'code' => 'UPSTREAM_ERROR']);
    exit;
}

// Check HTTP status from response headers
$statusLine = $http_response_header[0] ?? 'HTTP/1.1 200 OK';
preg_match('/HTTP\/\d\.\d\s+(\d+)/', $statusLine, $m);
$httpStatus = isset($m[1]) ? (int)$m[1] : 200;

if ($httpStatus !== 200) {
    http_response_code($httpStatus >= 400 && $httpStatus < 600 ? $httpStatus : 502);
    echo json_encode(['error' => "WeatherKit returned HTTP $httpStatus", 'code' => 'WEATHERKIT_ERROR', 'detail' => $raw]);
    exit;
}

$data = json_decode($raw, true);
if (!isset($data['currentWeather'])) {
    http_response_code(502);
    echo json_encode(['error' => 'Unexpected WeatherKit response shape', 'code' => 'PARSE_ERROR']);
    exit;
}

// ─── Normalize to RSA WeatherInput ───────────────────────────────────────────

$cw = $data['currentWeather'];

// Temperature: °C → °F
$tempF = isset($cw['temperature']) ? round($cw['temperature'] * 9 / 5 + 32, 1) : null;

// Humidity: 0–1 → 0–100
$humidityPct = isset($cw['humidity']) ? round($cw['humidity'] * 100, 1) : null;

// Pressure: hPa (sea-level) → inHg
// Apple WeatherKit pressure IS sea-level corrected — use directly.
$pressureHPa = $cw['pressure'] ?? null;
$barometerInHg = $pressureHPa !== null ? round($pressureHPa / 33.8639, 2) : null;

// Wind speed: km/h → mph
$windKph = $cw['windSpeed'] ?? null;
$windMph = $windKph !== null ? round($windKph * 0.621371, 1) : null;

// Wind direction: degrees from north (WeatherKit uses meteorological convention)
$windAngleDeg = $cw['windDirection'] ?? null;

// ─── Return RSA-compatible payload ───────────────────────────────────────────

echo json_encode([
    'source'        => 'apple_weather',
    'provider'      => 'Apple WeatherKit',
    'timestamp'     => $cw['asOf'] ?? null,
    'temperatureF'  => $tempF,
    'humidityPct'   => $humidityPct,
    'barometerInHg' => $barometerInHg,
    'pressureHPa'   => $pressureHPa,
    'windMph'       => $windMph,
    'windAngleDeg'  => $windAngleDeg,
    'conditionCode' => $cw['conditionCode'] ?? null,
]);
