<?php
/**
 * Batch 10 — Production Smoke Test: Admin / Config / Findings Resolution
 * One-time script. Safe to delete after use.
 * Tests schema, API file, required-module config, findings resolution, frontend chunk.
 */
ini_set('display_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/tm-helpers.php';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== Batch 10 Admin/Config Smoke Test ===\n\n";
$pass = true;

try {
    // Step 1: Verify new tables exist
    echo "1. Verifying new tables...\n";
    $tables = ['required_module_config', 'finding_status_history'];
    foreach ($tables as $t) {
        $s = $pdo->query("SELECT COUNT(*) FROM $t");
        $cnt = (int)$s->fetchColumn();
        echo "   $t: exists, $cnt rows\n";
    }
    echo "   OK\n";

    // Step 2: Verify required_module_config seeded data
    echo "2. Checking required-module configs...\n";
    $rmcStmt = $pdo->query("SELECT category, class_index, module_key, context FROM required_module_config ORDER BY category, class_index, module_key");
    $rmcRows = $rmcStmt->fetchAll(PDO::FETCH_ASSOC);
    echo "   Total configs: " . count($rmcRows) . "\n";
    $categories = array_unique(array_column($rmcRows, 'category'));
    echo "   Categories: " . implode(', ', $categories) . "\n";
    $ok2 = count($rmcRows) >= 19;
    if (!$ok2) { echo "   FAIL: Expected >= 19 configs\n"; $pass = false; } else echo "   OK\n";

    // Step 3: Verify inspection_templates.is_active exists
    echo "3. Checking inspection_templates.is_active...\n";
    $cols = $pdo->query("SHOW COLUMNS FROM inspection_templates LIKE 'is_active'")->fetchAll();
    $ok3 = !empty($cols);
    echo "   " . ($ok3 ? "OK" : "FAIL") . " — is_active column " . ($ok3 ? "exists" : "missing") . "\n";
    if (!$ok3) $pass = false;

    // Step 4: Test findings resolution query pattern
    echo "4. Testing findings resolution query pattern...\n";
    $fStmt = $pdo->query("
        SELECT tf.id, tf.disposition, tf.severity, tf.finding_type, tf.description
        FROM tech_findings tf
        JOIN tech_cases tc ON tf.tech_case_id = tc.id
        ORDER BY tf.id DESC LIMIT 5
    ");
    $findings = $fStmt->fetchAll(PDO::FETCH_ASSOC);
    echo "   Recent findings: " . count($findings) . "\n";
    if (!empty($findings)) {
        $f = $findings[0];
        echo "   Latest: id={$f['id']} type={$f['finding_type']} sev={$f['severity']} disp={$f['disposition']}\n";
    }
    echo "   OK — findings query works\n";

    // Step 5: Test finding_status_history insert/query (using a real finding if exists, or skip)
    echo "5. Testing finding_status_history...\n";
    if (!empty($findings)) {
        $testFindingId = (int)$findings[0]['id'];
        // Insert a test history entry, then delete it
        $pdo->prepare("INSERT INTO finding_status_history (finding_id, old_disposition, new_disposition, notes, changed_by) VALUES (?, ?, ?, 'smoke test - will delete', 5)")
            ->execute([$testFindingId, $findings[0]['disposition'], $findings[0]['disposition']]);
        $histId = (int)$pdo->lastInsertId();
        echo "   Inserted test history id=$histId\n";

        $hStmt = $pdo->prepare("SELECT * FROM finding_status_history WHERE id = ?");
        $hStmt->execute([$histId]);
        $hRow = $hStmt->fetch(PDO::FETCH_ASSOC);
        $ok5 = $hRow && $hRow['finding_id'] == $testFindingId;
        echo "   " . ($ok5 ? "OK" : "FAIL") . " — history read back\n";
        if (!$ok5) $pass = false;

        // Cleanup
        $pdo->prepare("DELETE FROM finding_status_history WHERE id = ?")->execute([$histId]);
        echo "   Cleaned up test history entry\n";
    } else {
        echo "   SKIP — no findings to test with\n";
    }

    // Step 6: Test dossier readiness with required-module config
    echo "6. Testing dossier readiness with required modules...\n";
    $rmcTest = $pdo->prepare("SELECT module_key FROM required_module_config WHERE category = 'TOP FUEL' AND class_index = 'TF' AND context = 'pre_race'");
    $rmcTest->execute();
    $tfMods = $rmcTest->fetchAll(PDO::FETCH_COLUMN);
    echo "   TOP FUEL/TF pre_race required modules: " . implode(', ', $tfMods) . "\n";
    $ok6 = in_array('scale', $tfMods) && in_array('fuel', $tfMods) && in_array('inspection', $tfMods);
    echo "   " . ($ok6 ? "OK" : "FAIL") . " — expected scale, fuel, inspection at minimum\n";
    if (!$ok6) $pass = false;

    // Step 7: Verify admin API templates list queries
    echo "7. Testing template admin queries...\n";
    $inspTplStmt = $pdo->query("SELECT COUNT(*) FROM inspection_templates");
    $inspCount = (int)$inspTplStmt->fetchColumn();
    $tdTplStmt = $pdo->query("SELECT COUNT(*) FROM teardown_templates");
    $tdCount = (int)$tdTplStmt->fetchColumn();
    echo "   Inspection templates: $inspCount\n";
    echo "   Teardown templates: $tdCount\n";

    $scaleRuleStmt = $pdo->query("SELECT COUNT(*) FROM scale_rules");
    $scaleRuleCount = (int)$scaleRuleStmt->fetchColumn();
    $fuelRuleStmt = $pdo->query("SELECT COUNT(*) FROM fuel_rules");
    $fuelRuleCount = (int)$fuelRuleStmt->fetchColumn();
    echo "   Scale rules: $scaleRuleCount\n";
    echo "   Fuel rules: $fuelRuleCount\n";
    echo "   OK\n";

    // Step 8: Verify API file + frontend chunk
    echo "8. Verifying deployed files...\n";
    $adminApi = __DIR__ . '/tm-admin.php';
    $adminExists = file_exists($adminApi);
    $adminSize = $adminExists ? filesize($adminApi) : 0;
    echo "   tm-admin.php exists=" . ($adminExists ? 'YES' : 'NO') . " size=$adminSize bytes\n";
    if (!$adminExists) $pass = false;

    $webRoot = dirname(__DIR__);
    $chunks = glob($webRoot . '/assets/TechMasterShell-*.js');
    if (!empty($chunks)) {
        $content = file_get_contents($chunks[0]);
        $hasAdmin = strpos($content, 'Admin Config') !== false || strpos($content, 'admin') !== false;
        $hasReqModules = strpos($content, 'Required Module') !== false || strpos($content, 'required_module') !== false;
        echo "   TechMasterShell chunk: " . basename($chunks[0]) . " (" . filesize($chunks[0]) . " bytes)\n";
        echo "   Contains 'admin': " . ($hasAdmin ? 'YES' : 'NO') . "\n";
        echo "   Contains 'required module': " . ($hasReqModules ? 'YES' : 'NO') . "\n";
    } else {
        echo "   WARNING: No TechMasterShell chunk found\n";
        $pass = false;
    }

    echo "\n=== RESULT: " . ($pass ? "PASS" : "FAIL") . " ===\n";

} catch (Throwable $e) {
    echo "\n=== FAIL: " . $e->getMessage() . " ===\n";
    echo $e->getTraceAsString() . "\n";
}
