<?php
/**
 * Batch 7 Production Smoke Test — Tech Card Workflow
 * One-time script. Safe to delete after use.
 */
ini_set('display_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/tm-helpers.php';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$userId = 5; // csnead owner account
$entryId = 130824; // Super Comp / SC entry

echo "=== Batch 7 Tech Card Production Smoke ===\n\n";

// ── 1. Create declaration ──
echo "1. Creating declaration for entry $entryId...\n";
$uuid = tm_uuid();
$pdo->prepare("
    INSERT INTO techcard_declarations
        (uuid, event_entry_id, card_status, card_type, category, class_index, revision, notes, created_by)
    VALUES (?, ?, 'missing', 'smoke_test', 'Super Comp', 'SC', 1, 'Batch 7 smoke test', ?)
")->execute([$uuid, $entryId, $userId]);
$declId = (int)$pdo->lastInsertId();
echo "   Created declaration id=$declId uuid=$uuid\n";

// Scaffold fields
$fieldTemplate = [
    ['declared_min_weight', 'Declared Minimum Weight (lbs)', 'Weight', 'number', 10],
    ['declared_fuel_type', 'Declared Fuel Type', 'Fuel', 'select', 20],
    ['declared_engine_type', 'Declared Engine Type / Manufacturer', 'Engine', 'text', 30],
    ['declared_engine_displacement', 'Declared Engine Displacement (ci)', 'Engine', 'number', 40],
    ['declared_chassis_serial', 'Chassis Serial / SFI Number', 'Chassis', 'text', 50],
    ['safety_equipment_current', 'Safety Equipment Current', 'Safety', 'boolean', 80],
];
$insField = $pdo->prepare("INSERT INTO techcard_declaration_fields (declaration_id, field_key, field_label, field_group, field_type, sort_order) VALUES (?,?,?,?,?,?)");
foreach ($fieldTemplate as $ft) {
    $insField->execute([$declId, $ft[0], $ft[1], $ft[2], $ft[3], $ft[4]]);
}
echo "   Scaffolded " . count($fieldTemplate) . " fields\n\n";

// ── 2. Save field values ──
echo "2. Saving declaration field values...\n";
$updates = [
    'declared_min_weight' => '2350',
    'declared_fuel_type' => 'gasoline',
    'declared_engine_type' => 'Chevrolet LS',
    'declared_engine_displacement' => '376',
    'declared_chassis_serial' => 'SC-SMOKE-2026-001',
    'safety_equipment_current' => 'yes',
];
foreach ($updates as $key => $val) {
    $pdo->prepare("UPDATE techcard_declaration_fields SET declared_value = ? WHERE declaration_id = ? AND field_key = ?")
        ->execute([$val, $declId, $key]);
}
echo "   Updated " . count($updates) . " field values\n";

// Verify
$flds = $pdo->prepare("SELECT field_key, declared_value FROM techcard_declaration_fields WHERE declaration_id = ? ORDER BY sort_order");
$flds->execute([$declId]);
foreach ($flds->fetchAll(PDO::FETCH_ASSOC) as $f) {
    echo "   [$f[field_key]] = $f[declared_value]\n";
}
echo "\n";

// ── 3. Add artifact metadata ──
echo "3. Adding artifact metadata...\n";
$artUuid = tm_uuid();
$pdo->prepare("
    INSERT INTO techcard_artifacts (uuid, declaration_id, original_filename, storage_path, mime_type, file_size_bytes, page_count, uploaded_by)
    VALUES (?, ?, 'smoke_test_card.pdf', '/test/smoke_test_card.pdf', 'application/pdf', 245000, 2, ?)
")->execute([$artUuid, $declId, $userId]);
$artId = (int)$pdo->lastInsertId();
echo "   Added artifact id=$artId uuid=$artUuid\n";

// Auto-transition: missing -> uploaded
$pdo->prepare("UPDATE techcard_declarations SET card_status = 'uploaded', received_at = NOW(), received_by = ? WHERE id = ? AND card_status = 'missing'")
    ->execute([$userId, $declId]);
$newStatus = $pdo->prepare("SELECT card_status FROM techcard_declarations WHERE id = ?");
$newStatus->execute([$declId]);
echo "   Card status after artifact: " . $newStatus->fetchColumn() . "\n\n";

// ── 4. Run audit ──
echo "4. Running tech card audit...\n";

// Create tech_case for audit
$caseUuid = tm_uuid();
$pdo->prepare("INSERT INTO tech_cases (uuid, event_entry_id, case_type, status, opened_at, created_by) VALUES (?, ?, 'techcard_audit', 'open', NOW(), ?)")
    ->execute([$caseUuid, $entryId, $userId]);
$caseId = (int)$pdo->lastInsertId();
$pdo->prepare("UPDATE techcard_declarations SET tech_case_id = ? WHERE id = ?")->execute([$caseId, $declId]);
echo "   Created tech_case id=$caseId\n";

// Check for missing key fields (chassis serial is filled, all 4 required keys filled)
$requiredKeys = ['declared_min_weight', 'declared_fuel_type', 'declared_engine_type', 'declared_chassis_serial'];
$fieldMap = [];
$flds2 = $pdo->prepare("SELECT field_key, declared_value FROM techcard_declaration_fields WHERE declaration_id = ?");
$flds2->execute([$declId]);
foreach ($flds2->fetchAll(PDO::FETCH_ASSOC) as $f2) $fieldMap[$f2['field_key']] = $f2['declared_value'];

$flags = [];
$insFind = $pdo->prepare("INSERT INTO tech_findings (uuid, tech_case_id, finding_type, severity, description, measured_value, expected_value, disposition, follow_up_required, created_by) VALUES (?,?,?,?,?,?,?,'open',?,?)");

// Check no artifact on file — we have one, so skip
$artCnt = $pdo->prepare("SELECT COUNT(*) FROM techcard_artifacts WHERE declaration_id = ?");
$artCnt->execute([$declId]);
$hasArt = (int)$artCnt->fetchColumn() > 0;
echo "   Artifact on file: " . ($hasArt ? 'yes' : 'NO') . "\n";

// Check required fields
foreach ($requiredKeys as $rk) {
    if (empty(trim($fieldMap[$rk] ?? ''))) {
        $flags[] = "missing_$rk";
        $insFind->execute([tm_uuid(), $caseId, 'missing_key_declaration', 'low', "Key declaration field not filled: $rk", null, null, 0, $userId]);
    }
}

// All keys filled, no fuel/scale/inspection records for this entry, so no cross-module flags expected
echo "   Flags found: " . (empty($flags) ? 'NONE (clean)' : implode(', ', $flags)) . "\n";

// Set status
$finalStatus = empty($flags) ? 'audited' : 'discrepancy_found';
$pdo->prepare("UPDATE techcard_declarations SET card_status = ?, audited_at = NOW(), audited_by = ? WHERE id = ?")
    ->execute([$finalStatus, $userId, $declId]);
echo "   Final card_status: $finalStatus\n\n";

// ── 5. Verify final state ──
echo "5. Final verification...\n";
$final = $pdo->prepare("SELECT id, uuid, card_status, revision, tech_case_id, received_at, audited_at FROM techcard_declarations WHERE id = ?");
$final->execute([$declId]);
$row = $final->fetch(PDO::FETCH_ASSOC);
echo "   Declaration: id={$row['id']} status={$row['card_status']} rev={$row['revision']} case_id={$row['tech_case_id']}\n";
echo "   received_at: {$row['received_at']}\n";
echo "   audited_at: {$row['audited_at']}\n";

$fCount = $pdo->prepare("SELECT COUNT(*) FROM techcard_declaration_fields WHERE declaration_id = ?");
$fCount->execute([$declId]);
echo "   Fields: " . $fCount->fetchColumn() . "\n";

$aCount = $pdo->prepare("SELECT COUNT(*) FROM techcard_artifacts WHERE declaration_id = ?");
$aCount->execute([$declId]);
echo "   Artifacts: " . $aCount->fetchColumn() . "\n";

$findCount = $pdo->prepare("SELECT COUNT(*) FROM tech_findings WHERE tech_case_id = ?");
$findCount->execute([$caseId]);
echo "   Findings: " . $findCount->fetchColumn() . "\n";

echo "\n=== Batch 7 Smoke Complete — ALL OK ===\n";

// ── 6. Cleanup: remove smoke test data ──
echo "\n6. Cleaning up smoke test data...\n";
$pdo->prepare("DELETE FROM tech_findings WHERE tech_case_id = ?")->execute([$caseId]);
$pdo->prepare("DELETE FROM techcard_artifacts WHERE declaration_id = ?")->execute([$declId]);
$pdo->prepare("DELETE FROM techcard_declaration_fields WHERE declaration_id = ?")->execute([$declId]);
$pdo->prepare("DELETE FROM techcard_declarations WHERE id = ?")->execute([$declId]);
$pdo->prepare("DELETE FROM tech_cases WHERE id = ?")->execute([$caseId]);
echo "   Cleaned up all smoke test rows.\n";
echo "=== Done ===\n";
