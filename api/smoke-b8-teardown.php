<?php
/**
 * Batch 8 Production Smoke Test — Teardown Workflow
 * One-time script. Safe to delete after use.
 */
ini_set('display_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/tm-helpers.php';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$userId = 5; // csnead
$entryId = 130824; // Super Comp / SC entry

echo "=== Batch 8 Teardown Production Smoke ===\n\n";

// ── 1. Create a tech_case + teardown record using TF template ──
echo "1. Creating teardown record with Top Fuel template for entry $entryId...\n";
$tplId = (int)$pdo->query("SELECT id FROM teardown_templates WHERE class_index = 'TF' LIMIT 1")->fetchColumn();
echo "   Using template id=$tplId\n";

$caseUuid = tm_uuid();
$pdo->prepare("INSERT INTO tech_cases (uuid, event_entry_id, case_type, status, opened_at, location, created_by) VALUES (?,?,'teardown','open',NOW(),'Bay 3',?)")
    ->execute([$caseUuid, $entryId, $userId]);
$caseId = (int)$pdo->lastInsertId();

$recUuid = tm_uuid();
$pdo->prepare("INSERT INTO teardown_records (uuid, event_entry_id, tech_case_id, template_id, teardown_status, bay_assignment, overall_result, started_at, operator_id, notes, created_by) VALUES (?,?,?,?,'in_progress','Bay 3','incomplete',NOW(),?,?,?)")
    ->execute([$recUuid, $entryId, $caseId, $tplId, $userId, 'Smoke test teardown', $userId]);
$recId = (int)$pdo->lastInsertId();
echo "   Created record id=$recId case_id=$caseId\n";

// Scaffold observed items from template
$tplItems = $pdo->prepare("SELECT * FROM teardown_template_items WHERE template_id = ? ORDER BY sort_order");
$tplItems->execute([$tplId]);
$insObs = $pdo->prepare("INSERT INTO teardown_observed_items (teardown_record_id, template_item_id, item_category, item_label, item_type, expected_value_min, expected_value_max, spec_unit, declaration_key) VALUES (?,?,?,?,?,?,?,?,?)");
$itemCount = 0;
foreach ($tplItems->fetchAll(PDO::FETCH_ASSOC) as $ti) {
    $insObs->execute([$recId, (int)$ti['id'], $ti['item_category'], $ti['item_label'], $ti['item_type'], $ti['spec_min'], $ti['spec_max'], $ti['spec_unit'], $ti['declaration_key']]);
    $itemCount++;
}
echo "   Scaffolded $itemCount observed items\n\n";

// ── 2. Save some observed values ──
echo "2. Saving observed item values...\n";
$obs = $pdo->prepare("SELECT id, item_label, item_type FROM teardown_observed_items WHERE teardown_record_id = ? ORDER BY id");
$obs->execute([$recId]);
$obsItems = $obs->fetchAll(PDO::FETCH_ASSOC);

$saved = 0;
foreach ($obsItems as $oi) {
    $id = (int)$oi['id'];
    if ($oi['item_type'] === 'serial_check') {
        $pdo->prepare("UPDATE teardown_observed_items SET observed_serial = 'SMOKE-SN-001', result = 'pass' WHERE id = ?")->execute([$id]);
        $saved++;
    } elseif ($oi['item_type'] === 'measurement' && strpos($oi['item_label'], 'displacement') !== false) {
        $pdo->prepare("UPDATE teardown_observed_items SET observed_value = 498.5, result = 'pass' WHERE id = ?")->execute([$id]);
        $saved++;
    } elseif ($oi['item_type'] === 'visual_check') {
        $pdo->prepare("UPDATE teardown_observed_items SET result = 'pass' WHERE id = ?")->execute([$id]);
        $saved++;
    } elseif ($oi['item_type'] === 'note') {
        $pdo->prepare("UPDATE teardown_observed_items SET observed_text = 'Smoke test note', result = 'pass' WHERE id = ?")->execute([$id]);
        $saved++;
    }
    if ($saved >= 6) break; // Save 6 items as sample
}
echo "   Saved $saved item values\n\n";

// ── 3. Check current state ──
echo "3. Verifying record state...\n";
$rec = $pdo->prepare("SELECT teardown_status, overall_result, bay_assignment FROM teardown_records WHERE id = ?");
$rec->execute([$recId]);
$row = $rec->fetch(PDO::FETCH_ASSOC);
echo "   Status: {$row['teardown_status']}, Result: {$row['overall_result']}, Bay: {$row['bay_assignment']}\n";

$filledCount = $pdo->prepare("SELECT COUNT(*) FROM teardown_observed_items WHERE teardown_record_id = ? AND result IS NOT NULL");
$filledCount->execute([$recId]);
echo "   Items with result: " . $filledCount->fetchColumn() . " / $itemCount\n\n";

// ── 4. Complete the teardown (auto-evaluate) ──
echo "4. Completing teardown (auto-evaluate)...\n";

// Clear old findings
$pdo->prepare("DELETE FROM tech_findings WHERE tech_case_id = ?")->execute([$caseId]);

$obsAll = $pdo->prepare("SELECT * FROM teardown_observed_items WHERE teardown_record_id = ?");
$obsAll->execute([$recId]);
$allItems = $obsAll->fetchAll(PDO::FETCH_ASSOC);

$flags = [];
$insFind = $pdo->prepare("INSERT INTO tech_findings (uuid, tech_case_id, finding_type, severity, description, measured_value, expected_value, disposition, follow_up_required, created_by) VALUES (?,?,?,?,?,?,?,'open',?,?)");

$anyFail = false;
$anyIncomplete = false;
foreach ($allItems as $ai) {
    $result = $ai['result'];
    // Check required items missing
    if ($result === null || $result === '') {
        if ($ai['template_item_id']) {
            $reqCheck = $pdo->prepare("SELECT is_required FROM teardown_template_items WHERE id = ?");
            $reqCheck->execute([$ai['template_item_id']]);
            $req = $reqCheck->fetch(PDO::FETCH_ASSOC);
            if ($req && (int)$req['is_required']) {
                $anyIncomplete = true;
                $flags[] = 'required_item_missing';
                $insFind->execute([tm_uuid(), $caseId, 'teardown_required_item_missing', 'medium', "Required item not completed: {$ai['item_label']}", null, null, 0, $userId]);
            }
        }
    }
    if ($result === 'fail') $anyFail = true;
}

$overall = 'pass';
if ($anyFail) $overall = 'fail';
elseif ($anyIncomplete) $overall = 'incomplete';

$pdo->prepare("UPDATE teardown_records SET teardown_status = 'completed', completed_at = NOW(), overall_result = ? WHERE id = ?")->execute([$overall, $recId]);

$findingCount = $pdo->prepare("SELECT COUNT(*) FROM tech_findings WHERE tech_case_id = ?");
$findingCount->execute([$caseId]);
$fc = (int)$findingCount->fetchColumn();

echo "   Overall result: $overall\n";
echo "   Findings generated: $fc\n";
echo "   Flags: " . (empty($flags) ? 'NONE' : implode(', ', array_unique($flags))) . "\n\n";

// ── 5. Final state ──
echo "5. Final verification...\n";
$final = $pdo->prepare("SELECT id, teardown_status, overall_result, completed_at FROM teardown_records WHERE id = ?");
$final->execute([$recId]);
$fr = $final->fetch(PDO::FETCH_ASSOC);
echo "   Record: id={$fr['id']} status={$fr['teardown_status']} result={$fr['overall_result']} completed={$fr['completed_at']}\n";
echo "   Findings: $fc\n";

echo "\n=== Batch 8 Teardown Smoke — ALL OK ===\n";

// ── 6. Cleanup ──
echo "\n6. Cleaning up smoke test data...\n";
$pdo->prepare("DELETE FROM tech_findings WHERE tech_case_id = ?")->execute([$caseId]);
$pdo->prepare("DELETE FROM teardown_observed_items WHERE teardown_record_id = ?")->execute([$recId]);
$pdo->prepare("DELETE FROM teardown_records WHERE id = ?")->execute([$recId]);
$pdo->prepare("DELETE FROM tech_cases WHERE id = ?")->execute([$caseId]);
echo "   Cleaned up all smoke test rows.\n";
echo "=== Done ===\n";
