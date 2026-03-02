<?php
/**
 * Generate admin token then call weatherHealthRebuild for each 2024 event via internal curl.
 */
chdir("/home/customer/www/racingsystemsanalysis.com/public_html");
require_once "api/config.php";
require_once "api/functions.php";

$pdo = getDB();

// Generate admin token
$stmt = $pdo->query("SELECT id, email, role FROM users WHERE role = 'owner' LIMIT 1");
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$user) { echo "No owner user found\n"; exit(1); }
$token = rsa_generateToken((int)$user["id"], $user["email"], $user["role"]);
echo "Token generated for user {$user['id']} ({$user['email']})\n";

// Get 2024 events
$stmt = $pdo->prepare("SELECT id, event_name FROM parity_events WHERE season_year = 2024 ORDER BY start_date_local");
$stmt->execute();
$events = $stmt->fetchAll(PDO::FETCH_ASSOC);

$baseUrl = "https://racingsystemsanalysis.com/api/parity.php?action=weatherHealthRebuild";

foreach ($events as $ev) {
    $eventId = (int)$ev["id"];
    echo "REBUILD $eventId {$ev['event_name']}... ";
    flush();

    $ch = curl_init($baseUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(["eventId" => $eventId]),
        CURLOPT_HTTPHEADER => [
            "Content-Type: application/json",
            "Authorization: Bearer $token",
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 120,
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($resp, true);
    if ($httpCode === 200 && isset($data["ok"])) {
        echo "OK buckets={$data['bucketsProcessed']} station={$data['stationUsed']} backup={$data['backupUsed']}\n";
    } else {
        echo "HTTP $httpCode: " . substr($resp, 0, 200) . "\n";
    }
    flush();
    usleep(200000);
}

echo "\nDone.\n";
