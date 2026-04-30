<?php
/**
 * Batch 11 — Production Smoke Test: Holds + CSV Export
 * One-time script. Safe to delete after use.
 */
ini_set('display_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/tm-helpers.php';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== Batch 11 Holds + Export Smoke Test ===\n\n";
$pass = true;

try {
    // Step 1: Verify new tables exist
    echo "1. Verifying new tables...\n";
    $tables = ['entry_holds', 'entry_hold_history'];
    foreach ($tables as $t) {
        $s = $pdo->query("SELECT COUNT(*) FROM $t");
        $cnt = (int)$s->fetchColumn();
        echo "   $t: exists, $cnt rows\n";
    }
    echo "   OK\n";

    // Step 2: Test hold placement workflow
    echo "2. Testing hold placement...\n";
    $entryStmt = $pdo->query("SELECT id, competition_number FROM event_entries ORDER BY id DESC LIMIT 1");
    $entry = $entryStmt->fetch(PDO::FETCH_ASSOC);
    if (!$entry) {
        echo "   SKIP — no entries to test with\n";
    } else {
        $entryId = (int)$entry['id'];
        echo "   Using entry #{$entry['competition_number']} (id=$entryId)\n";
        
        // Place hold
        $pdo->beginTransaction();
        $pdo->prepare("INSERT INTO entry_holds (event_entry_id, hold_type, reason, notes, placed_by) VALUES (?, 'tech_hold', 'Batch 11 smoke test', 'Testing hold workflow', 5)")->execute([$entryId]);
        $holdId = (int)$pdo->lastInsertId();
        $pdo->prepare("INSERT INTO entry_hold_history (entry_hold_id, action, new_reason, notes, changed_by) VALUES (?, 'placed', 'Batch 11 smoke test', 'Initial placement', 5)")->execute([$holdId]);
        $pdo->commit();
        echo "   Placed hold id=$holdId\n";
        
        // Verify hold
        $holdStmt = $pdo->prepare("SELECT * FROM entry_holds WHERE id = ?");
        $holdStmt->execute([$holdId]);
        $hold = $holdStmt->fetch(PDO::FETCH_ASSOC);
        $ok2 = $hold && $hold['event_entry_id'] == $entryId && $hold['is_active'] == 1;
        echo "   " . ($ok2 ? "OK" : "FAIL") . " — hold verified\n";
        if (!$ok2) $pass = false;
        
        // Verify history
        $histStmt = $pdo->prepare("SELECT * FROM entry_hold_history WHERE entry_hold_id = ?");
        $histStmt->execute([$holdId]);
        $hist = $histStmt->fetch(PDO::FETCH_ASSOC);
        $ok3 = $hist && $hist['action'] === 'placed';
        echo "   " . ($ok3 ? "OK" : "FAIL") . " — history verified\n";
        if (!$ok3) $pass = false;
        
        // Clear hold
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE entry_holds SET is_active = 0, cleared_by = 5, cleared_at = NOW() WHERE id = ?")->execute([$holdId]);
        $pdo->prepare("INSERT INTO entry_hold_history (entry_hold_id, action, old_reason, notes, changed_by) VALUES (?, 'cleared', 'Batch 11 smoke test', 'Smoke test cleanup', 5)")->execute([$holdId]);
        $pdo->commit();
        echo "   Cleared hold\n";
        
        // Verify cleared
        $holdStmt->execute([$holdId]);
        $hold = $holdStmt->fetch(PDO::FETCH_ASSOC);
        $ok4 = $hold && $hold['is_active'] == 0 && $hold['cleared_by'] == 5;
        echo "   " . ($ok4 ? "OK" : "FAIL") . " — hold cleared\n";
        if (!$ok4) $pass = false;
        
        // Cleanup
        $pdo->prepare("DELETE FROM entry_hold_history WHERE entry_hold_id = ?")->execute([$holdId]);
        $pdo->prepare("DELETE FROM entry_holds WHERE id = ?")->execute([$holdId]);
        echo "   Cleaned up test hold\n";
    }

    // Step 3: Verify CSV export handler exists
    echo "3. Verifying CSV export handler...\n";
    $dossierApi = __DIR__ . '/tm-dossier.php';
    $content = file_get_contents($dossierApi);
    $hasCSV = strpos($content, 'handleEventComplianceCSV') !== false;
    $hasAction = strpos($content, 'eventComplianceCSV') !== false;
    echo "   handleEventComplianceCSV function: " . ($hasCSV ? 'YES' : 'NO') . "\n";
    echo "   eventComplianceCSV action: " . ($hasAction ? 'YES' : 'NO') . "\n";
    $ok5 = $hasCSV && $hasAction;
    echo "   " . ($ok5 ? "OK" : "FAIL") . "\n";
    if (!$ok5) $pass = false;

    // Step 4: Verify admin API has hold actions
    echo "4. Verifying admin API hold actions...\n";
    $adminApi = __DIR__ . '/tm-admin.php';
    $adminContent = file_get_contents($adminApi);
    $hasListHolds = strpos($adminContent, 'handleListEntryHolds') !== false;
    $hasPlaceHold = strpos($adminContent, 'handlePlaceHold') !== false;
    $hasClearHold = strpos($adminContent, 'handleClearHold') !== false;
    $hasHoldHistory = strpos($adminContent, 'handleHoldHistory') !== false;
    echo "   listEntryHolds: " . ($hasListHolds ? 'YES' : 'NO') . "\n";
    echo "   placeHold: " . ($hasPlaceHold ? 'YES' : 'NO') . "\n";
    echo "   clearHold: " . ($hasClearHold ? 'YES' : 'NO') . "\n";
    echo "   holdHistory: " . ($hasHoldHistory ? 'YES' : 'NO') . "\n";
    $ok6 = $hasListHolds && $hasPlaceHold && $hasClearHold && $hasHoldHistory;
    echo "   " . ($ok6 ? "OK" : "FAIL") . "\n";
    if (!$ok6) $pass = false;

    // Step 5: Verify frontend assets
    echo "5. Verifying frontend assets...\n";
    $webRoot = dirname(__DIR__);
    $chunks = glob($webRoot . '/assets/TechMasterShell-*.js');
    if (!empty($chunks)) {
        $content = file_get_contents($chunks[0]);
        $hasHolds = strpos($content, 'hold') !== false || strpos($content, 'Hold') !== false;
        echo "   TechMasterShell chunk: " . basename($chunks[0]) . " (" . filesize($chunks[0]) . " bytes)\n";
        echo "   Contains 'hold': " . ($hasHolds ? 'YES' : 'NO') . "\n";
    } else {
        echo "   WARNING: No TechMasterShell chunk found\n";
        $pass = false;
    }

    // Step 6: Verify print stylesheet
    echo "6. Verifying print stylesheet...\n";
    $printCSS = glob($webRoot . '/assets/*print*.css');
    if (!empty($printCSS)) {
        echo "   Print stylesheet: " . basename($printCSS[0]) . " (" . filesize($printCSS[0]) . " bytes)\n";
        echo "   OK\n";
    } else {
        echo "   Note: No dedicated print stylesheet found (may be inline)\n";
    }

    echo "\n=== RESULT: " . ($pass ? "PASS" : "FAIL") . " ===\n";

} catch (Throwable $e) {
    echo "\n=== FAIL: " . $e->getMessage() . " ===\n";
    echo $e->getTraceAsString() . "\n";
}
