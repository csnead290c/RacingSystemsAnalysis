<?php
/**
 * Run paritySmokeTest and dump raw JSON for 2 events.
 */
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
    echo "\n===== event_id=$eventId =====\n";
    $url = "$baseUrl?action=paritySmokeTest&event_id=$eventId";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => ["Authorization: Bearer $token"],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    echo "HTTP $httpCode\n";
    // Pretty print just the top-level keys and weatherCoverage
    $data = json_decode($resp, true);
    if (!$data) {
        echo "RAW: " . substr($resp, 0, 500) . "\n";
        continue;
    }
    echo "Top keys: " . implode(", ", array_keys($data)) . "\n";
    if (isset($data["event"])) {
        echo "event keys: " . implode(", ", array_keys($data["event"])) . "\n";
        echo "event_name: " . ($data["event"]["event_name"] ?? "NULL") . "\n";
    }
    if (isset($data["weatherCoverage"])) {
        echo "weatherCoverage: " . json_encode($data["weatherCoverage"], JSON_PRETTY_PRINT) . "\n";
    }
    if (isset($data["qualSheetVerification"])) {
        $qsv = $data["qualSheetVerification"];
        echo "qualSheet keys: " . implode(", ", array_keys($qsv)) . "\n";
        if (isset($qsv["assertions"])) {
            echo "assertions: " . json_encode($qsv["assertions"], JSON_PRETTY_PRINT) . "\n";
        }
        if (isset($qsv["stats"])) {
            echo "stats: " . json_encode($qsv["stats"], JSON_PRETTY_PRINT) . "\n";
        }
    }
    if (isset($data["dqFlagStats"])) {
        echo "dqFlagStats: " . json_encode($data["dqFlagStats"], JSON_PRETTY_PRINT) . "\n";
    }
}
echo "\nDone.\n";
