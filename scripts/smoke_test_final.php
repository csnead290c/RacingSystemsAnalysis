<?php
chdir("/home/customer/www/racingsystemsanalysis.com/public_html");
require_once "api/config.php";
require_once "api/functions.php";

$pdo = getDB();
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
        CURLOPT_HTTPHEADER => ["Authorization: Bearer $token"],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
    ]);
    $resp = curl_exec($ch);
    curl_close($ch);
    $d = json_decode($resp, true);

    echo "Event: {$d['eventName']}\n";
    echo "Race Lookup: {$d['raceLookup']}\n";
    echo "Class: {$d['classIndex']}\n\n";

    // Qual sheet check
    $qs = $d['qualSheetCheck'] ?? [];
    echo "--- Qual Sheet ---\n";
    if (isset($qs['assertions'])) {
        $a = $qs['assertions'];
        echo "  onlyQualRounds: " . json_encode($a['onlyQualRounds'] ?? null) . "\n";
        echo "  orderingOk:     " . json_encode($a['orderingOk'] ?? null) . "\n";
        echo "  dqAtBottomOk:   " . json_encode($a['dqAtBottomOk'] ?? null) . "\n";
        echo "  dqMphBlankOk:   " . json_encode($a['dqMphBlankOk'] ?? null) . "\n";
    }
    if (isset($qs['stats'])) {
        $s = $qs['stats'];
        echo "  totalDrivers:   " . ($s['totalDrivers'] ?? '?') . "\n";
        echo "  dqCount:        " . ($s['dqCount'] ?? '?') . "\n";
        echo "  roundsFound:    " . implode(', ', $s['roundsFound'] ?? []) . "\n";
    }

    // dq_flag
    if (isset($qs['dqFlagCounts'])) {
        $dq = $qs['dqFlagCounts'];
        echo "\n--- dq_flag Counts ---\n";
        echo "  null={$dq['dqNullCount']}, true={$dq['dqTrueCount']}, false={$dq['dqFalseCount']}\n";
    }

    // Weather coverage
    $wc = $d['weatherCoverage'] ?? [];
    echo "\n--- Weather Coverage ---\n";
    echo "  trackCoordsMissing: " . json_encode($wc['trackCoordsMissing'] ?? null) . "\n";
    echo "  canonicalPoints:    " . ($wc['canonicalPointCount'] ?? '?') . "\n";
    echo "  totalEventRuns:     " . ($wc['totalEventRuns'] ?? '?') . "\n";
    echo "  weatherLinkedRuns:  " . ($wc['weatherLinkedRuns'] ?? '?') . "\n";
    echo "  coveragePct:        " . round($wc['eventCoveragePct'] ?? 0, 1) . "%\n";
    echo "  largestGapMinutes:  " . ($wc['largestGapMinutes'] ?? '?') . "\n";
    $actions = $wc['recommendedActions'] ?? [];
    echo "  recommendedActions: " . (empty($actions) ? '(none)' : implode('; ', $actions)) . "\n";
}
echo "\nDone.\n";
