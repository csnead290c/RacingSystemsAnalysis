<?php
/**
 * Tech Master — Teardown API
 *
 * Actions:
 *   GET  listTemplates              — teardown templates, filterable by category/class
 *   GET  getTemplate                — single template with items
 *   GET  listByEvent                — teardown records for an event
 *   GET  listByEntry                — teardown records for an entry
 *   GET  getRecord                  — single teardown record with observed items + findings
 *   POST createRecord               — create teardown record with auto item scaffolding
 *   POST updateRecord               — update teardown header (status, bay, notes)
 *   POST saveItems                  — save/update observed item values
 *   POST completeRecord             — complete teardown, evaluate findings, set overall result
 *   POST runDeclComparison          — compare observed items against tech card declarations
 *   GET  entryTeardownStatus        — teardown status summary for an entry
 *   GET  eventTeardownSummary       — teardown status summary across all entries in an event
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/tm-helpers.php';

rsa_setCorsHeaders();

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$auth   = rsa_requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'listTemplates':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleListTemplates($pdo);
        break;
    case 'getTemplate':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleGetTemplate($pdo);
        break;
    case 'listByEvent':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleListByEvent($pdo);
        break;
    case 'listByEntry':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleListByEntry($pdo);
        break;
    case 'getRecord':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleGetRecord($pdo);
        break;
    case 'createRecord':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleCreateRecord($pdo, $userId);
        break;
    case 'updateRecord':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleUpdateRecord($pdo, $userId);
        break;
    case 'saveItems':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleSaveItems($pdo, $userId);
        break;
    case 'completeRecord':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleCompleteRecord($pdo, $userId);
        break;
    case 'runDeclComparison':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleRunDeclComparison($pdo, $userId);
        break;
    case 'entryTeardownStatus':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleEntryTeardownStatus($pdo);
        break;
    case 'eventTeardownSummary':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleEventTeardownSummary($pdo);
        break;
    default:
        tm_error("Unknown action: $action", 400);
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function handleListTemplates(PDO $pdo): void {
    $category = $_GET['category'] ?? null;
    $classIndex = $_GET['classIndex'] ?? null;

    $where = 'is_active = 1';
    $params = [];
    if ($category) {
        $where .= ' AND (category = ? OR category = ?)';
        $params[] = $category;
        $params[] = '*';
    }
    if ($classIndex) {
        $where .= ' AND (class_index = ? OR class_index = ?)';
        $params[] = $classIndex;
        $params[] = '*';
    }

    $stmt = $pdo->prepare("
        SELECT t.*,
               (SELECT COUNT(*) FROM teardown_template_items WHERE template_id = t.id) AS item_count
        FROM teardown_templates t
        WHERE $where
        ORDER BY t.sort_order, t.label
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    castTplRows($rows);

    tm_json(['templates' => $rows, 'count' => count($rows)]);
}

function handleGetTemplate(PDO $pdo): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) tm_error('Missing id');

    $stmt = $pdo->prepare("SELECT * FROM teardown_templates WHERE id = ?");
    $stmt->execute([$id]);
    $tpl = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$tpl) tm_error('Template not found', 404);
    castTplRow($tpl);

    $iStmt = $pdo->prepare("SELECT * FROM teardown_template_items WHERE template_id = ? ORDER BY sort_order, id");
    $iStmt->execute([$id]);
    $items = $iStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($items as &$it) {
        $it['id'] = (int)$it['id'];
        $it['template_id'] = (int)$it['template_id'];
        $it['sort_order'] = (int)$it['sort_order'];
        $it['is_required'] = (int)$it['is_required'];
        if ($it['spec_min'] !== null) $it['spec_min'] = (float)$it['spec_min'];
        if ($it['spec_max'] !== null) $it['spec_max'] = (float)$it['spec_max'];
    }
    $tpl['items'] = $items;

    tm_json(['template' => $tpl]);
}

// ═══════════════════════════════════════════════════════════════════════════
// RECORD HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function handleListByEvent(PDO $pdo): void {
    $eventId = (int)($_GET['eventInstanceId'] ?? 0);
    if (!$eventId) tm_error('Missing eventInstanceId');

    $stmt = $pdo->prepare("
        SELECT r.*,
               ee.competition_number, ee.class_index AS entry_class, ee.category AS entry_category,
               p.display_name AS person_name,
               o.name AS org_name,
               tt.label AS template_label,
               (SELECT COUNT(*) FROM teardown_observed_items WHERE teardown_record_id = r.id) AS item_count
        FROM teardown_records r
        JOIN event_entries ee ON r.event_entry_id = ee.id
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        LEFT JOIN teardown_templates tt ON r.template_id = tt.id
        WHERE ee.event_instance_id = ?
        ORDER BY r.started_at DESC, r.created_at DESC
    ");
    $stmt->execute([$eventId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    castRecRows($rows);

    tm_json(['records' => $rows, 'count' => count($rows), 'eventInstanceId' => $eventId]);
}

function handleListByEntry(PDO $pdo): void {
    $entryId = (int)($_GET['eventEntryId'] ?? 0);
    if (!$entryId) tm_error('Missing eventEntryId');

    $stmt = $pdo->prepare("
        SELECT r.*,
               tt.label AS template_label,
               (SELECT COUNT(*) FROM teardown_observed_items WHERE teardown_record_id = r.id) AS item_count
        FROM teardown_records r
        LEFT JOIN teardown_templates tt ON r.template_id = tt.id
        WHERE r.event_entry_id = ?
        ORDER BY r.started_at DESC, r.created_at DESC
    ");
    $stmt->execute([$entryId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    castRecRows($rows);

    tm_json(['records' => $rows, 'count' => count($rows)]);
}

function handleGetRecord(PDO $pdo): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) tm_error('Missing id');

    $stmt = $pdo->prepare("
        SELECT r.*,
               ee.competition_number, ee.class_index AS entry_class, ee.category AS entry_category,
               ee.event_instance_id,
               p.display_name AS person_name,
               o.name AS org_name,
               ei.name AS event_name,
               tt.label AS template_label
        FROM teardown_records r
        JOIN event_entries ee ON r.event_entry_id = ee.id
        JOIN event_instances ei ON ee.event_instance_id = ei.id
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        LEFT JOIN teardown_templates tt ON r.template_id = tt.id
        WHERE r.id = ?
    ");
    $stmt->execute([$id]);
    $rec = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$rec) tm_error('Teardown record not found', 404);
    castRecRow($rec);

    // Load observed items
    $oStmt = $pdo->prepare("SELECT * FROM teardown_observed_items WHERE teardown_record_id = ? ORDER BY id");
    $oStmt->execute([$id]);
    $items = $oStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($items as &$it) castObsItem($it);
    $rec['observed_items'] = $items;

    // Load findings if tech_case_id present
    $rec['findings'] = [];
    if ($rec['tech_case_id']) {
        $fStmt = $pdo->prepare("SELECT * FROM tech_findings WHERE tech_case_id = ? ORDER BY created_at");
        $fStmt->execute([$rec['tech_case_id']]);
        $findings = $fStmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($findings as &$fi) {
            $fi['id'] = (int)$fi['id'];
            $fi['tech_case_id'] = (int)$fi['tech_case_id'];
            $fi['follow_up_required'] = (int)$fi['follow_up_required'];
            $fi['created_by'] = (int)$fi['created_by'];
        }
        $rec['findings'] = $findings;
    }

    tm_json(['record' => $rec]);
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE / UPDATE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function handleCreateRecord(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $entryId = (int)tm_requireParam($body, 'event_entry_id');
    $templateId = tm_optionalInt($body, 'template_id');
    $bay = tm_optionalParam($body, 'bay_assignment');
    $notes = tm_optionalParam($body, 'notes');

    // Validate entry
    $entryStmt = $pdo->prepare("SELECT * FROM event_entries WHERE id = ?");
    $entryStmt->execute([$entryId]);
    $entry = $entryStmt->fetch(PDO::FETCH_ASSOC);
    if (!$entry) tm_error('Event entry not found', 404);

    $pdo->beginTransaction();
    try {
        // Create tech_case
        $caseUuid = tm_uuid();
        $pdo->prepare("
            INSERT INTO tech_cases (uuid, event_entry_id, case_type, status, opened_at, location, created_by)
            VALUES (?, ?, 'teardown', 'open', NOW(), ?, ?)
        ")->execute([$caseUuid, $entryId, $bay, $userId]);
        $caseId = (int)$pdo->lastInsertId();

        // Create teardown record
        $recUuid = tm_uuid();
        $pdo->prepare("
            INSERT INTO teardown_records
                (uuid, event_entry_id, tech_case_id, template_id, teardown_status, bay_assignment, overall_result, started_at, operator_id, notes, created_by)
            VALUES (?, ?, ?, ?, 'in_progress', ?, 'incomplete', NOW(), ?, ?, ?)
        ")->execute([$recUuid, $entryId, $caseId, $templateId, $bay, $userId, $notes, $userId]);
        $recId = (int)$pdo->lastInsertId();

        // Auto-scaffold observed items from template
        $itemCount = 0;
        if ($templateId) {
            $tplItems = $pdo->prepare("SELECT * FROM teardown_template_items WHERE template_id = ? ORDER BY sort_order");
            $tplItems->execute([$templateId]);
            $insObs = $pdo->prepare("
                INSERT INTO teardown_observed_items
                    (teardown_record_id, template_item_id, item_category, item_label, item_type, expected_value_min, expected_value_max, spec_unit, declaration_key)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            foreach ($tplItems->fetchAll(PDO::FETCH_ASSOC) as $ti) {
                $insObs->execute([
                    $recId,
                    (int)$ti['id'],
                    $ti['item_category'],
                    $ti['item_label'],
                    $ti['item_type'],
                    $ti['spec_min'],
                    $ti['spec_max'],
                    $ti['spec_unit'],
                    $ti['declaration_key'],
                ]);
                $itemCount++;
            }
        }

        $pdo->commit();

        tm_json([
            'id' => $recId,
            'uuid' => $recUuid,
            'tech_case_id' => $caseId,
            'item_count' => $itemCount,
        ], 201);
    } catch (\Exception $e) {
        $pdo->rollBack();
        tm_error('Failed to create teardown: ' . $e->getMessage(), 500);
    }
}

function handleUpdateRecord(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $recId = (int)tm_requireParam($body, 'teardown_record_id');

    $check = $pdo->prepare("SELECT id FROM teardown_records WHERE id = ?");
    $check->execute([$recId]);
    if (!$check->fetch()) tm_error('Teardown record not found', 404);

    $allowed = ['teardown_status', 'bay_assignment', 'notes'];
    $sets = [];
    $params = [];
    foreach ($allowed as $col) {
        if (array_key_exists($col, $body)) {
            $sets[] = "`$col` = ?";
            $params[] = $body[$col];
        }
    }
    if (isset($body['teardown_status']) && $body['teardown_status'] === 'cancelled') {
        $sets[] = "overall_result = 'incomplete'";
    }
    if (empty($sets)) tm_error('No updatable fields provided', 400);

    $params[] = $recId;
    $pdo->prepare("UPDATE teardown_records SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);

    tm_json(['updated' => true, 'id' => $recId]);
}

function handleSaveItems(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $recId = (int)tm_requireParam($body, 'teardown_record_id');
    $items = $body['items'] ?? [];
    if (empty($items)) tm_error('No items provided');

    $check = $pdo->prepare("SELECT id FROM teardown_records WHERE id = ?");
    $check->execute([$recId]);
    if (!$check->fetch()) tm_error('Teardown record not found', 404);

    $updated = 0;
    foreach ($items as $it) {
        $itemId = (int)($it['id'] ?? 0);
        if (!$itemId) continue;

        $sets = [];
        $params = [];
        $allowedCols = ['observed_serial', 'observed_text', 'result', 'notes'];
        foreach ($allowedCols as $col) {
            if (array_key_exists($col, $it)) {
                $sets[] = "`$col` = ?";
                $params[] = $it[$col];
            }
        }
        if (array_key_exists('observed_value', $it)) {
            $sets[] = "observed_value = ?";
            $params[] = $it['observed_value'] !== null && $it['observed_value'] !== '' ? (float)$it['observed_value'] : null;
        }

        if (!empty($sets)) {
            $params[] = $itemId;
            $params[] = $recId;
            $pdo->prepare("UPDATE teardown_observed_items SET " . implode(', ', $sets) . " WHERE id = ? AND teardown_record_id = ?")->execute($params);
            $updated++;
        }
    }

    tm_json(['updated' => true, 'items_updated' => $updated]);
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE / EVALUATE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function handleCompleteRecord(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $recId = (int)tm_requireParam($body, 'teardown_record_id');

    $rec = $pdo->prepare("SELECT * FROM teardown_records WHERE id = ?");
    $rec->execute([$recId]);
    $record = $rec->fetch(PDO::FETCH_ASSOC);
    if (!$record) tm_error('Teardown record not found', 404);

    $caseId = $record['tech_case_id'] ? (int)$record['tech_case_id'] : null;

    $pdo->beginTransaction();
    try {
        // Ensure tech_case exists
        if (!$caseId) {
            $caseUuid = tm_uuid();
            $pdo->prepare("INSERT INTO tech_cases (uuid, event_entry_id, case_type, status, opened_at, created_by) VALUES (?, ?, 'teardown', 'open', NOW(), ?)")
                ->execute([$caseUuid, (int)$record['event_entry_id'], $userId]);
            $caseId = (int)$pdo->lastInsertId();
            $pdo->prepare("UPDATE teardown_records SET tech_case_id = ? WHERE id = ?")->execute([$caseId, $recId]);
        }

        // Clear old findings
        $pdo->prepare("DELETE FROM tech_findings WHERE tech_case_id = ?")->execute([$caseId]);

        // Load observed items
        $obsStmt = $pdo->prepare("SELECT * FROM teardown_observed_items WHERE teardown_record_id = ?");
        $obsStmt->execute([$recId]);
        $obsItems = $obsStmt->fetchAll(PDO::FETCH_ASSOC);

        $flags = [];
        $insFind = $pdo->prepare("
            INSERT INTO tech_findings
                (uuid, tech_case_id, finding_type, severity, description, measured_value, expected_value, disposition, follow_up_required, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
        ");

        $anyFail = false;
        $anyIncomplete = false;

        foreach ($obsItems as &$obs) {
            $type = $obs['item_type'];
            $label = $obs['item_label'];
            $result = $obs['result'];

            // Auto-evaluate measurements
            if ($type === 'measurement' && $obs['observed_value'] !== null) {
                $val = (float)$obs['observed_value'];
                $min = $obs['expected_value_min'] !== null ? (float)$obs['expected_value_min'] : null;
                $max = $obs['expected_value_max'] !== null ? (float)$obs['expected_value_max'] : null;
                $inRange = true;
                if ($min !== null && $val < $min) $inRange = false;
                if ($max !== null && $val > $max) $inRange = false;
                $autoResult = ($min !== null || $max !== null) ? ($inRange ? 'pass' : 'fail') : ($result ?: 'pass');
                // Update result in DB
                $pdo->prepare("UPDATE teardown_observed_items SET result = ? WHERE id = ?")->execute([$autoResult, $obs['id']]);
                $result = $autoResult;

                if (!$inRange && ($min !== null || $max !== null)) {
                    $flags[] = 'measurement_out_of_range';
                    $specStr = '';
                    if ($min !== null && $max !== null) $specStr = "$min–$max";
                    elseif ($min !== null) $specStr = "≥$min";
                    else $specStr = "≤$max";
                    $unit = $obs['spec_unit'] ?? '';
                    $insFind->execute([tm_uuid(), $caseId, 'teardown_measurement_out_of_range', 'high',
                        "Teardown measurement out of range: $label",
                        $val . ($unit ? " $unit" : ''), $specStr . ($unit ? " $unit" : ''), 1, $userId]);
                }
            }

            // Check explicitly failed items
            if ($result === 'fail') {
                $anyFail = true;
                if ($type === 'visual_check') {
                    $flags[] = 'visual_check_failed';
                    $insFind->execute([tm_uuid(), $caseId, 'teardown_visual_check_failed', 'high',
                        "Teardown visual check failed: $label", null, null, 1, $userId]);
                } elseif ($type === 'serial_check') {
                    $flags[] = 'serial_check_failed';
                    $insFind->execute([tm_uuid(), $caseId, 'teardown_serial_mismatch', 'high',
                        "Teardown serial check failed: $label",
                        $obs['observed_serial'] ?? null, $obs['expected_serial'] ?? null, 1, $userId]);
                }
            }

            // Check required items not answered
            if ($result === null || $result === '') {
                // Check if template item was required
                if ($obs['template_item_id']) {
                    $reqCheck = $pdo->prepare("SELECT is_required FROM teardown_template_items WHERE id = ?");
                    $reqCheck->execute([$obs['template_item_id']]);
                    $req = $reqCheck->fetch(PDO::FETCH_ASSOC);
                    if ($req && (int)$req['is_required']) {
                        $anyIncomplete = true;
                        $flags[] = 'required_item_missing';
                        $insFind->execute([tm_uuid(), $caseId, 'teardown_required_item_missing', 'medium',
                            "Required teardown item not completed: $label", null, null, 0, $userId]);
                    }
                }
            }

            if ($result === 'fail') $anyFail = true;
        }

        // Compute overall
        $overall = 'pass';
        if ($anyFail) $overall = 'fail';
        elseif ($anyIncomplete) $overall = 'incomplete';

        // Update record
        $pdo->prepare("UPDATE teardown_records SET teardown_status = 'completed', completed_at = NOW(), overall_result = ? WHERE id = ?")
            ->execute([$overall, $recId]);

        // Close tech case if pass
        if ($overall === 'pass') {
            $pdo->prepare("UPDATE tech_cases SET status = 'closed', closed_at = NOW() WHERE id = ?")->execute([$caseId]);
        }

        $pdo->commit();

        tm_json([
            'completed' => true,
            'teardown_record_id' => $recId,
            'tech_case_id' => $caseId,
            'overall_result' => $overall,
            'flags' => array_unique($flags),
            'finding_count' => count($flags),
        ]);
    } catch (\Exception $e) {
        $pdo->rollBack();
        tm_error('Complete failed: ' . $e->getMessage(), 500);
    }
}

function handleRunDeclComparison(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $recId = (int)tm_requireParam($body, 'teardown_record_id');

    $rec = $pdo->prepare("SELECT * FROM teardown_records WHERE id = ?");
    $rec->execute([$recId]);
    $record = $rec->fetch(PDO::FETCH_ASSOC);
    if (!$record) tm_error('Teardown record not found', 404);

    $entryId = (int)$record['event_entry_id'];
    $caseId = $record['tech_case_id'] ? (int)$record['tech_case_id'] : null;

    // Load the latest tech card declaration for this entry
    $declStmt = $pdo->prepare("
        SELECT d.id FROM techcard_declarations d
        WHERE d.event_entry_id = ?
        ORDER BY d.revision DESC LIMIT 1
    ");
    $declStmt->execute([$entryId]);
    $declRow = $declStmt->fetch(PDO::FETCH_ASSOC);

    if (!$declRow) {
        tm_json([
            'compared' => false,
            'reason' => 'No tech card declaration found for this entry',
            'flags' => ['no_declaration'],
            'finding_count' => 0,
        ]);
        return;
    }

    $declId = (int)$declRow['id'];

    // Load declaration field values
    $fStmt = $pdo->prepare("SELECT field_key, declared_value FROM techcard_declaration_fields WHERE declaration_id = ?");
    $fStmt->execute([$declId]);
    $declFields = [];
    foreach ($fStmt->fetchAll(PDO::FETCH_ASSOC) as $df) {
        $declFields[$df['field_key']] = $df['declared_value'];
    }

    // Load observed items with declaration_key
    $obsStmt = $pdo->prepare("SELECT * FROM teardown_observed_items WHERE teardown_record_id = ? AND declaration_key IS NOT NULL");
    $obsStmt->execute([$recId]);
    $obsItems = $obsStmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$caseId) {
        $caseUuid = tm_uuid();
        $pdo->prepare("INSERT INTO tech_cases (uuid, event_entry_id, case_type, status, opened_at, created_by) VALUES (?, ?, 'teardown', 'open', NOW(), ?)")
            ->execute([$caseUuid, $entryId, $userId]);
        $caseId = (int)$pdo->lastInsertId();
        $pdo->prepare("UPDATE teardown_records SET tech_case_id = ? WHERE id = ?")->execute([$caseId, $recId]);
    }

    $flags = [];
    $insFind = $pdo->prepare("
        INSERT INTO tech_findings
            (uuid, tech_case_id, finding_type, severity, description, measured_value, expected_value, disposition, follow_up_required, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    ");

    foreach ($obsItems as $obs) {
        $dk = $obs['declaration_key'];
        $declaredVal = trim($declFields[$dk] ?? '');
        $label = $obs['item_label'];

        if ($declaredVal === '') continue; // No declaration to compare

        $type = $obs['item_type'];

        if ($type === 'serial_check') {
            $observedSerial = trim($obs['observed_serial'] ?? '');
            if ($observedSerial !== '' && strtolower($observedSerial) !== strtolower($declaredVal)) {
                $flags[] = 'declaration_serial_mismatch';
                $insFind->execute([tm_uuid(), $caseId, 'teardown_decl_serial_mismatch', 'high',
                    "Declaration mismatch — $label: observed serial differs from declared",
                    $observedSerial, $declaredVal, 1, $userId]);
            }
        } elseif ($type === 'measurement') {
            $observedVal = $obs['observed_value'] !== null ? (float)$obs['observed_value'] : null;
            if ($observedVal !== null && is_numeric($declaredVal)) {
                $declaredNum = (float)$declaredVal;
                // For displacement: check if observed is close (within 5% tolerance)
                if ($declaredNum > 0 && abs($observedVal - $declaredNum) / $declaredNum > 0.05) {
                    $flags[] = 'declaration_measurement_mismatch';
                    $unit = $obs['spec_unit'] ?? '';
                    $insFind->execute([tm_uuid(), $caseId, 'teardown_decl_measurement_mismatch', 'high',
                        "Declaration mismatch — $label: observed value differs from declared by >5%",
                        $observedVal . ($unit ? " $unit" : ''), $declaredVal . ($unit ? " $unit" : ''), 1, $userId]);
                }
            }
        }
    }

    tm_json([
        'compared' => true,
        'teardown_record_id' => $recId,
        'tech_case_id' => $caseId,
        'declaration_id' => $declId,
        'flags' => array_unique($flags),
        'finding_count' => count($flags),
    ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS / SUMMARY HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function handleEntryTeardownStatus(PDO $pdo): void {
    $entryId = (int)($_GET['eventEntryId'] ?? 0);
    if (!$entryId) tm_error('Missing eventEntryId');

    $stmt = $pdo->prepare("
        SELECT id, teardown_status, overall_result, started_at, completed_at
        FROM teardown_records
        WHERE event_entry_id = ?
        ORDER BY created_at DESC
    ");
    $stmt->execute([$entryId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $status = 'no_teardown';
    $latest = null;
    if (!empty($rows)) {
        $latest = $rows[0];
        $latest['id'] = (int)$latest['id'];
        $status = $latest['teardown_status'];
    }

    tm_json([
        'entry_id' => $entryId,
        'teardown_status' => $status,
        'record_count' => count($rows),
        'latest_record' => $latest,
    ]);
}

function handleEventTeardownSummary(PDO $pdo): void {
    $eventId = (int)($_GET['eventInstanceId'] ?? 0);
    if (!$eventId) tm_error('Missing eventInstanceId');

    $entryStmt = $pdo->prepare("
        SELECT ee.id, ee.competition_number, ee.class_index, ee.category,
               p.display_name AS person_name
        FROM event_entries ee
        LEFT JOIN persons p ON ee.person_id = p.id
        WHERE ee.event_instance_id = ? AND ee.entry_status IN ('registered','active')
        ORDER BY ee.competition_number
    ");
    $entryStmt->execute([$eventId]);
    $entries = $entryStmt->fetchAll(PDO::FETCH_ASSOC);

    $recStmt = $pdo->prepare("
        SELECT r.event_entry_id, r.teardown_status, r.overall_result
        FROM teardown_records r
        JOIN event_entries ee ON r.event_entry_id = ee.id
        WHERE ee.event_instance_id = ?
        ORDER BY r.created_at DESC
    ");
    $recStmt->execute([$eventId]);
    $recs = $recStmt->fetchAll(PDO::FETCH_ASSOC);

    $statusMap = [];
    $resultMap = [];
    foreach ($recs as $r) {
        $eid = (int)$r['event_entry_id'];
        if (!isset($statusMap[$eid])) {
            $statusMap[$eid] = $r['teardown_status'];
            $resultMap[$eid] = $r['overall_result'];
        }
    }

    $summary = [];
    $counts = ['no_teardown' => 0, 'scheduled' => 0, 'in_progress' => 0, 'completed' => 0, 'cancelled' => 0];
    foreach ($entries as $e) {
        $eid = (int)$e['id'];
        $ts = $statusMap[$eid] ?? 'no_teardown';
        $summary[] = [
            'entry_id' => $eid,
            'competition_number' => $e['competition_number'],
            'class_index' => $e['class_index'],
            'category' => $e['category'],
            'person_name' => $e['person_name'],
            'teardown_status' => $ts,
            'overall_result' => $resultMap[$eid] ?? null,
        ];
        if (isset($counts[$ts])) $counts[$ts]++;
    }

    tm_json([
        'eventInstanceId' => $eventId,
        'total_entries' => count($entries),
        'entries' => $summary,
        'counts' => $counts,
    ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function castTplRows(array &$rows): void { foreach ($rows as &$r) castTplRow($r); }
function castTplRow(array &$r): void {
    $r['id'] = (int)$r['id'];
    $r['is_active'] = (int)$r['is_active'];
    $r['sort_order'] = (int)$r['sort_order'];
    if (isset($r['item_count'])) $r['item_count'] = (int)$r['item_count'];
}

function castRecRows(array &$rows): void { foreach ($rows as &$r) castRecRow($r); }
function castRecRow(array &$r): void {
    $r['id'] = (int)$r['id'];
    $r['event_entry_id'] = (int)$r['event_entry_id'];
    if ($r['tech_case_id']) $r['tech_case_id'] = (int)$r['tech_case_id'];
    if ($r['template_id']) $r['template_id'] = (int)$r['template_id'];
    if ($r['operator_id']) $r['operator_id'] = (int)$r['operator_id'];
    $r['created_by'] = (int)$r['created_by'];
    if (isset($r['item_count'])) $r['item_count'] = (int)$r['item_count'];
}

function castObsItem(array &$it): void {
    $it['id'] = (int)$it['id'];
    $it['teardown_record_id'] = (int)$it['teardown_record_id'];
    if ($it['template_item_id']) $it['template_item_id'] = (int)$it['template_item_id'];
    if ($it['observed_value'] !== null) $it['observed_value'] = (float)$it['observed_value'];
    if ($it['expected_value_min'] !== null) $it['expected_value_min'] = (float)$it['expected_value_min'];
    if ($it['expected_value_max'] !== null) $it['expected_value_max'] = (float)$it['expected_value_max'];
}
