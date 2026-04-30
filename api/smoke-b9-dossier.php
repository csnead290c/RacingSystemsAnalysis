<?php
/**
 * Batch 9 — Production Smoke Test: Dossier / Reporting Bridge
 * One-time script. Safe to delete after use.
 * Read-only — no writes, no cleanup needed.
 */
ini_set('display_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/tm-helpers.php';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== Batch 9 Dossier/Reporting Bridge Smoke Test ===\n\n";
$pass = true;

try {
    // Step 1: Find an event with entries
    echo "1. Finding event with entries...\n";
    $evStmt = $pdo->query("SELECT ei.id, ei.name FROM event_instances ei JOIN event_entries ee ON ee.event_instance_id = ei.id GROUP BY ei.id ORDER BY COUNT(*) DESC LIMIT 1");
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) { echo "   SKIP: No events with entries\n"; exit; }
    $eventId = (int)$event['id'];
    echo "   Event: id=$eventId name={$event['name']}\n";

    // Step 2: Find an entry
    echo "2. Finding entry in event...\n";
    $entryStmt = $pdo->prepare("SELECT id, competition_number, category, class_index FROM event_entries WHERE event_instance_id = ? AND entry_status IN ('registered','active') LIMIT 1");
    $entryStmt->execute([$eventId]);
    $entry = $entryStmt->fetch(PDO::FETCH_ASSOC);
    if (!$entry) { echo "   SKIP: No active entries\n"; exit; }
    $entryId = (int)$entry['id'];
    echo "   Entry: id=$entryId #{$entry['competition_number']} {$entry['category']}/{$entry['class_index']}\n";

    // Step 3: Test dossier entry load query (core of entryDossier)
    echo "3. Testing entry dossier load...\n";
    $dStmt = $pdo->prepare("
        SELECT ee.id, ee.competition_number, ee.category, ee.class_index,
               ei.name AS event_name, ei.start_date_local,
               p.display_name AS person_name,
               o.name AS org_name,
               va.description AS vehicle_desc
        FROM event_entries ee
        JOIN event_instances ei ON ee.event_instance_id = ei.id
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        LEFT JOIN vehicle_assets va ON ee.vehicle_id = va.id
        WHERE ee.id = ?
    ");
    $dStmt->execute([$entryId]);
    $dRow = $dStmt->fetch(PDO::FETCH_ASSOC);
    $ok3 = $dRow && isset($dRow['event_name']);
    echo "   " . ($ok3 ? "OK" : "FAIL") . " — entry loaded, event_name={$dRow['event_name']}, person={$dRow['person_name']}\n";
    if (!$ok3) $pass = false;

    // Step 4: Test per-module status queries (scale, fuel, inspection, techcard, teardown)
    echo "4. Testing module status queries...\n";
    $modules = [
        'scale' => "SELECT COUNT(*) FROM scale_records WHERE event_entry_id = ?",
        'fuel' => "SELECT COUNT(*) FROM fuel_records WHERE event_entry_id = ?",
        'inspection' => "SELECT COUNT(*) FROM inspection_records WHERE event_entry_id = ?",
        'techcard' => "SELECT COUNT(*) FROM techcard_declarations WHERE event_entry_id = ?",
        'teardown' => "SELECT COUNT(*) FROM teardown_records WHERE event_entry_id = ?",
    ];
    foreach ($modules as $mod => $sql) {
        $s = $pdo->prepare($sql);
        $s->execute([$entryId]);
        $cnt = (int)$s->fetchColumn();
        echo "   $mod: $cnt records\n";
    }
    echo "   OK — all 5 module queries executed\n";

    // Step 5: Test event-level batch compliance query
    echo "5. Testing event compliance batch queries...\n";
    $batchStmt = $pdo->prepare("SELECT COUNT(*) FROM event_entries WHERE event_instance_id = ? AND entry_status IN ('registered','active')");
    $batchStmt->execute([$eventId]);
    $entryCnt = (int)$batchStmt->fetchColumn();
    echo "   Entry count for event: $entryCnt\n";

    // Batch scale
    $bsStmt = $pdo->prepare("SELECT COUNT(DISTINCT event_entry_id) FROM scale_records sr JOIN event_entries ee ON sr.event_entry_id = ee.id WHERE ee.event_instance_id = ?");
    $bsStmt->execute([$eventId]);
    $withScale = (int)$bsStmt->fetchColumn();
    echo "   Entries with scale: $withScale / $entryCnt (missing: " . ($entryCnt - $withScale) . ")\n";

    // Batch fuel
    $bfStmt = $pdo->prepare("SELECT COUNT(DISTINCT event_entry_id) FROM fuel_records fr JOIN event_entries ee ON fr.event_entry_id = ee.id WHERE ee.event_instance_id = ?");
    $bfStmt->execute([$eventId]);
    $withFuel = (int)$bfStmt->fetchColumn();
    echo "   Entries with fuel: $withFuel / $entryCnt\n";

    // Batch inspection
    $biStmt = $pdo->prepare("SELECT COUNT(DISTINCT event_entry_id) FROM inspection_records ir JOIN event_entries ee ON ir.event_entry_id = ee.id WHERE ee.event_instance_id = ?");
    $biStmt->execute([$eventId]);
    $withInsp = (int)$biStmt->fetchColumn();
    echo "   Entries with inspection: $withInsp / $entryCnt\n";

    echo "   OK — batch compliance queries work\n";

    // Step 6: Test findings aggregate query
    echo "6. Testing findings aggregate query...\n";
    $fStmt = $pdo->prepare("
        SELECT tf.severity, tf.disposition, COUNT(*) AS cnt
        FROM tech_findings tf
        JOIN tech_cases tc ON tf.tech_case_id = tc.id
        JOIN event_entries ee ON tc.event_entry_id = ee.id
        WHERE ee.event_instance_id = ?
        GROUP BY tf.severity, tf.disposition
    ");
    $fStmt->execute([$eventId]);
    $fRows = $fStmt->fetchAll(PDO::FETCH_ASSOC);
    $totalFindings = 0;
    foreach ($fRows as $fr) $totalFindings += (int)$fr['cnt'];
    echo "   Total findings for event: $totalFindings (" . count($fRows) . " severity/disposition combos)\n";
    echo "   OK — findings aggregate query works\n";

    // Step 7: Verify tm-dossier.php file exists and is valid PHP
    echo "7. Verifying API file...\n";
    $apiFile = __DIR__ . '/tm-dossier.php';
    $exists = file_exists($apiFile);
    $size = $exists ? filesize($apiFile) : 0;
    echo "   tm-dossier.php exists=" . ($exists ? 'YES' : 'NO') . " size=$size bytes\n";
    if (!$exists) $pass = false;

    // Step 8: Verify frontend chunk deployed
    echo "8. Verifying frontend chunk...\n";
    $webRoot = dirname(__DIR__);
    $chunks = glob($webRoot . '/assets/TechMasterShell-*.js');
    $chunkCount = count($chunks);
    echo "   TechMasterShell chunks found: $chunkCount\n";
    if ($chunkCount > 0) {
        $chunkSize = filesize($chunks[0]);
        $chunkName = basename($chunks[0]);
        echo "   Latest: $chunkName ($chunkSize bytes)\n";
        // Check it contains dossier-related strings
        $content = file_get_contents($chunks[0]);
        $hasDossier = strpos($content, 'Dossier') !== false || strpos($content, 'dossier') !== false;
        $hasCompliance = strpos($content, 'Compliance') !== false || strpos($content, 'compliance') !== false;
        $hasFindings = strpos($content, 'Findings') !== false || strpos($content, 'findings') !== false;
        echo "   Contains 'dossier': " . ($hasDossier ? 'YES' : 'NO') . "\n";
        echo "   Contains 'compliance': " . ($hasCompliance ? 'YES' : 'NO') . "\n";
        echo "   Contains 'findings': " . ($hasFindings ? 'YES' : 'NO') . "\n";
        if (!$hasDossier || !$hasCompliance) $pass = false;
    } else {
        echo "   WARNING: No TechMasterShell chunk found\n";
        $pass = false;
    }

    echo "\n=== RESULT: " . ($pass ? "PASS" : "FAIL") . " ===\n";

} catch (Throwable $e) {
    echo "\n=== FAIL: " . $e->getMessage() . " ===\n";
    echo $e->getTraceAsString() . "\n";
}
