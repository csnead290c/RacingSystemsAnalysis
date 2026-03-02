<?php
/**
 * Run paritySmokeTest on event 98 (U.S. Nationals) and event 86 (Gatornationals)
 * to verify weather coverage after backfill.
 */
chdir("/home/customer/www/racingsystemsanalysis.com/public_html");
require_once "api/config.php";
require_once "api/functions.php";

$pdo = getDB();

// Generate admin token
$stmt = $pdo->query("SELECT id, email, role FROM users WHERE role = 'owner' LIMIT 1");
$user = $stmt->fetch(PDO::FETCH_ASSOC);
$token = rsa_generateToken((int)$user["id"], $user["email"], $user["role"]);

$eventIds = [98, 86];
$baseUrl = "https://racingsystemsanalysis.com/api/parity.php";

foreach ($eventIds as $eventId) {
    echo "\n========== paritySmokeTest event_id=$eventId ==========\n";
    $url = "$baseUrl?action=paritySmokeTest&event_id=$eventId";

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer $token",
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($resp, true);
    if ($httpCode !== 200 || !$data) {
        echo "HTTP $httpCode: " . substr($resp, 0, 500) . "\n";
        continue;
    }

    // Print key fields
    echo "Event: {$data['event']['event_name']}\n";
    echo "Track: {$data['event']['track_name']}\n";
    echo "Season: {$data['event']['season_year']}\n\n";

    // Qual sheet assertions
    $qa = $data['qualSheetVerification']['assertions'] ?? [];
    echo "--- Qual Sheet Assertions ---\n";
    echo "  onlyQualRounds: " . ($qa['onlyQualRounds'] ? 'TRUE' : 'FALSE') . "\n";
    echo "  orderingOk:     " . ($qa['orderingOk'] ? 'TRUE' : 'FALSE') . "\n";
    echo "  dqAtBottomOk:   " . ($qa['dqAtBottomOk'] ? 'TRUE' : 'FALSE') . "\n";
    echo "  dqMphBlankOk:   " . ($qa['dqMphBlankOk'] ? 'TRUE' : 'FALSE') . "\n";

    $stats = $data['qualSheetVerification']['stats'] ?? [];
    echo "  totalDrivers:   {$stats['totalDrivers']}\n";
    echo "  dqCount:        {$stats['dqCount']}\n";
    echo "  roundsFound:    " . implode(', ', $stats['roundsFound'] ?? []) . "\n\n";

    // DQ flag stats
    $dq = $data['dqFlagStats'] ?? [];
    echo "--- dq_flag Stats ---\n";
    echo "  dqNullCount:  {$dq['dqNullCount']}\n";
    echo "  dqTrueCount:  {$dq['dqTrueCount']}\n";
    echo "  dqFalseCount: {$dq['dqFalseCount']}\n\n";

    // Weather coverage
    $wc = $data['weatherCoverage'] ?? [];
    echo "--- Weather Coverage ---\n";
    echo "  hasTrackCoords:     " . ($wc['hasTrackCoords'] ? 'YES' : 'NO') . "\n";
    echo "  canonicalPoints:    {$wc['canonicalPoints']}\n";
    echo "  runCount:           {$wc['runCount']}\n";
    echo "  runsCovered:        {$wc['runsCovered']}\n";
    echo "  coveragePct:        {$wc['coveragePct']}%\n";
    echo "  largestGapMinutes:  {$wc['largestGapMinutes']}\n";
    echo "  recommendedActions: " . (empty($wc['recommendedActions']) ? '(none)' : implode('; ', $wc['recommendedActions'])) . "\n";
}

echo "\nDone.\n";
