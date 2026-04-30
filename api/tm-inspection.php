<?php
/**
 * Tech Master — General Tech / Inspection API
 *
 * Actions:
 *   GET  listTemplates       — active templates, filterable by type/category/class
 *   GET  getTemplate         — single template with items
 *   POST upsertTemplate      — create/update template header (admin)
 *   GET  listByEvent         — inspection records for an event
 *   GET  listByEntry         — inspection records for an entry
 *   GET  getRecord           — single inspection record with responses + findings
 *   POST createRecord        — create inspection with responses, auto tech_case + findings
 *   POST completeRecord      — mark inspection complete, re-evaluate compliance
 *   GET  compliance          — compliance check for a record
 *   GET  entryInspectionStatus — inspection readiness summary for an entry
 *   GET  entryTechSummary    — cross-module tech status (scale + fuel + inspection)
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
    // ── Templates ──
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
    case 'upsertTemplate':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleUpsertTemplate($pdo, $userId);
        break;

    // ── Inspection Records ──
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
    case 'completeRecord':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleCompleteRecord($pdo, $userId);
        break;
    case 'compliance':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleCompliance($pdo);
        break;
    case 'entryInspectionStatus':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleEntryInspectionStatus($pdo);
        break;

    // ── Cross-module ──
    case 'entryTechSummary':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleEntryTechSummary($pdo);
        break;

    default:
        tm_error("Unknown action: $action", 400);
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function handleListTemplates(PDO $pdo): void {
    $type     = $_GET['templateType'] ?? null;
    $category = $_GET['category'] ?? null;
    $classIdx = $_GET['classIndex'] ?? null;
    $active   = ($_GET['activeOnly'] ?? '1') === '1';

    $where = [];
    $params = [];
    if ($active) { $where[] = 'it.is_active = 1'; }
    if ($type) { $where[] = 'it.template_type = ?'; $params[] = $type; }
    if ($category) { $where[] = '(it.category = ? OR it.category = \'*\')'; $params[] = $category; }
    if ($classIdx) { $where[] = '(it.class_index = ? OR it.class_index = \'*\')'; $params[] = $classIdx; }

    $sql = "SELECT it.*, (SELECT COUNT(*) FROM inspection_template_items WHERE template_id = it.id) AS item_count
            FROM inspection_templates it";
    if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
    $sql .= ' ORDER BY it.sort_order, it.category, it.class_index';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['is_active'] = (int)$r['is_active'];
        $r['sort_order'] = (int)$r['sort_order'];
        $r['item_count'] = (int)$r['item_count'];
        if ($r['season_year']) $r['season_year'] = (int)$r['season_year'];
    }
    tm_json(['templates' => $rows, 'count' => count($rows)]);
}

function handleGetTemplate(PDO $pdo): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) tm_error('Missing template id');

    $stmt = $pdo->prepare("SELECT * FROM inspection_templates WHERE id = ?");
    $stmt->execute([$id]);
    $tpl = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$tpl) tm_error('Template not found', 404);

    $tpl['id'] = (int)$tpl['id'];
    $tpl['is_active'] = (int)$tpl['is_active'];
    $tpl['sort_order'] = (int)$tpl['sort_order'];
    if ($tpl['season_year']) $tpl['season_year'] = (int)$tpl['season_year'];

    // Load items
    $itemStmt = $pdo->prepare("SELECT * FROM inspection_template_items WHERE template_id = ? ORDER BY sort_order");
    $itemStmt->execute([$id]);
    $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
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

function handleUpsertTemplate(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $templateType = tm_optionalParam($body, 'template_type', 'general_tech');
    $category = tm_requireParam($body, 'category');
    $classIndex = tm_optionalParam($body, 'class_index', '*');
    $label = tm_requireParam($body, 'label');
    $description = tm_optionalParam($body, 'description');
    $sortOrder = tm_optionalInt($body, 'sort_order', 0);

    $existing = $pdo->prepare("
        SELECT id FROM inspection_templates
        WHERE template_type = ? AND category = ? AND class_index = ? AND season_year IS NULL
    ");
    $existing->execute([$templateType, $category, $classIndex]);
    $row = $existing->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        $pdo->prepare("
            UPDATE inspection_templates SET label = ?, description = ?, sort_order = ? WHERE id = ?
        ")->execute([$label, $description, $sortOrder, $row['id']]);
        tm_json(['upserted' => true, 'id' => (int)$row['id'], 'action' => 'updated']);
    } else {
        $uuid = tm_uuid();
        $pdo->prepare("
            INSERT INTO inspection_templates (uuid, template_type, category, class_index, label, description, sort_order, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ")->execute([$uuid, $templateType, $category, $classIndex, $label, $description, $sortOrder, $userId]);
        tm_json(['upserted' => true, 'id' => (int)$pdo->lastInsertId(), 'action' => 'created'], 201);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// INSPECTION RECORD HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function handleListByEvent(PDO $pdo): void {
    $eventId = (int)($_GET['eventInstanceId'] ?? 0);
    if (!$eventId) tm_error('Missing eventInstanceId');

    $stmt = $pdo->prepare("
        SELECT ir.*,
               ee.competition_number, ee.class_index, ee.category,
               p.display_name AS person_name,
               o.name AS org_name,
               it.label AS template_label, it.template_type
        FROM inspection_records ir
        JOIN event_entries ee ON ir.event_entry_id = ee.id
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        LEFT JOIN inspection_templates it ON ir.template_id = it.id
        WHERE ee.event_instance_id = ?
        ORDER BY ir.measured_at DESC
    ");
    $stmt->execute([$eventId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    castRecordRows($rows);

    tm_json(['records' => $rows, 'count' => count($rows), 'eventInstanceId' => $eventId]);
}

function handleListByEntry(PDO $pdo): void {
    $entryId = (int)($_GET['eventEntryId'] ?? 0);
    if (!$entryId) tm_error('Missing eventEntryId');

    $stmt = $pdo->prepare("
        SELECT ir.*,
               it.label AS template_label, it.template_type
        FROM inspection_records ir
        LEFT JOIN inspection_templates it ON ir.template_id = it.id
        WHERE ir.event_entry_id = ?
        ORDER BY ir.measured_at DESC
    ");
    $stmt->execute([$entryId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    castRecordRows($rows);

    tm_json(['records' => $rows, 'count' => count($rows)]);
}

function handleGetRecord(PDO $pdo): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) tm_error('Missing id');

    $stmt = $pdo->prepare("
        SELECT ir.*,
               ee.competition_number, ee.class_index, ee.category,
               p.display_name AS person_name,
               o.name AS org_name,
               it.label AS template_label, it.template_type,
               ei.name AS event_name
        FROM inspection_records ir
        JOIN event_entries ee ON ir.event_entry_id = ee.id
        JOIN event_instances ei ON ee.event_instance_id = ei.id
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        LEFT JOIN inspection_templates it ON ir.template_id = it.id
        WHERE ir.id = ?
    ");
    $stmt->execute([$id]);
    $rec = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$rec) tm_error('Record not found', 404);

    castRecordRow($rec);

    // Load responses
    $respStmt = $pdo->prepare("
        SELECT * FROM inspection_responses WHERE inspection_record_id = ? ORDER BY id
    ");
    $respStmt->execute([$id]);
    $responses = $respStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($responses as &$r) {
        $r['id'] = (int)$r['id'];
        $r['inspection_record_id'] = (int)$r['inspection_record_id'];
        if ($r['template_item_id']) $r['template_item_id'] = (int)$r['template_item_id'];
        if ($r['bool_value'] !== null) $r['bool_value'] = (int)$r['bool_value'];
        if ($r['numeric_value'] !== null) $r['numeric_value'] = (float)$r['numeric_value'];
    }
    $rec['responses'] = $responses;

    // Load findings
    $findStmt = $pdo->prepare("SELECT * FROM tech_findings WHERE tech_case_id = ? ORDER BY created_at");
    $findStmt->execute([$rec['tech_case_id']]);
    $findings = $findStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($findings as &$f) {
        $f['id'] = (int)$f['id'];
        $f['tech_case_id'] = (int)$f['tech_case_id'];
        $f['follow_up_required'] = (int)$f['follow_up_required'];
        $f['created_by'] = (int)$f['created_by'];
    }
    $rec['findings'] = $findings;

    tm_json(['record' => $rec]);
}

function handleCreateRecord(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $entryId = (int)tm_requireParam($body, 'event_entry_id');
    $templateId = tm_optionalInt($body, 'template_id');
    $inspectionArea = tm_optionalParam($body, 'inspection_area');
    $notes = tm_optionalParam($body, 'notes');
    $isOfficial = tm_optionalInt($body, 'is_official', 1);
    $responses = $body['responses'] ?? [];

    // Validate entry exists
    $entry = loadEntry($pdo, $entryId);
    if (!$entry) tm_error('Event entry not found', 404);

    // Load template if specified
    $template = null;
    $templateItems = [];
    if ($templateId) {
        $tplStmt = $pdo->prepare("SELECT * FROM inspection_templates WHERE id = ? AND is_active = 1");
        $tplStmt->execute([$templateId]);
        $template = $tplStmt->fetch(PDO::FETCH_ASSOC);
        if (!$template) tm_error('Template not found or inactive', 404);

        $itemStmt = $pdo->prepare("SELECT * FROM inspection_template_items WHERE template_id = ? ORDER BY sort_order");
        $itemStmt->execute([$templateId]);
        $templateItems = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    $pdo->beginTransaction();
    try {
        // Create tech_case
        $caseUuid = tm_uuid();
        $caseType = 'inspection';
        $pdo->prepare("
            INSERT INTO tech_cases (uuid, event_entry_id, case_type, status, opened_at, created_by)
            VALUES (?, ?, ?, 'open', NOW(), ?)
        ")->execute([$caseUuid, $entryId, $caseType, $userId]);
        $caseId = (int)$pdo->lastInsertId();

        // Create inspection_record
        $recUuid = tm_uuid();
        $pdo->prepare("
            INSERT INTO inspection_records
                (uuid, tech_case_id, event_entry_id, template_id, overall_result, is_official,
                 inspection_area, notes, created_by)
            VALUES (?, ?, ?, ?, 'incomplete', ?, ?, ?, ?)
        ")->execute([$recUuid, $caseId, $entryId, $templateId, $isOfficial, $inspectionArea, $notes, $userId]);
        $recordId = (int)$pdo->lastInsertId();

        // Insert responses
        $respInsert = $pdo->prepare("
            INSERT INTO inspection_responses
                (inspection_record_id, template_item_id, item_label, item_type, bool_value, numeric_value, text_value, result, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $responseCount = 0;
        if ($templateId && !empty($templateItems)) {
            // Template-based: create a response for each template item, filling from submitted data
            $submittedMap = [];
            foreach ($responses as $r) {
                $key = $r['template_item_id'] ?? $r['item_label'] ?? null;
                if ($key) $submittedMap[$key] = $r;
            }

            foreach ($templateItems as $item) {
                $submitted = $submittedMap[$item['id']] ?? $submittedMap[$item['label']] ?? null;
                $boolVal = null;
                $numVal = null;
                $textVal = null;
                $result = null;
                $respNotes = null;

                if ($submitted) {
                    $boolVal = isset($submitted['bool_value']) ? (int)$submitted['bool_value'] : null;
                    $numVal = isset($submitted['numeric_value']) && $submitted['numeric_value'] !== '' ? (float)$submitted['numeric_value'] : null;
                    $textVal = $submitted['text_value'] ?? null;
                    $result = $submitted['result'] ?? null;
                    $respNotes = $submitted['notes'] ?? null;

                    // Auto-evaluate measurement items
                    if ($item['item_type'] === 'measurement' && $numVal !== null && !$result) {
                        $result = evaluateMeasurement($numVal, $item['spec_min'] ? (float)$item['spec_min'] : null, $item['spec_max'] ? (float)$item['spec_max'] : null);
                    }
                    // Auto-evaluate checkbox items
                    if ($item['item_type'] === 'checkbox' && $boolVal !== null && !$result) {
                        $result = $boolVal ? 'pass' : 'fail';
                    }
                }

                $respInsert->execute([
                    $recordId,
                    (int)$item['id'],
                    $item['label'],
                    $item['item_type'],
                    $boolVal,
                    $numVal,
                    $textVal,
                    $result,
                    $respNotes,
                ]);
                $responseCount++;
            }
        } elseif (!empty($responses)) {
            // Ad-hoc (no template): insert submitted responses directly
            foreach ($responses as $r) {
                $itemType = $r['item_type'] ?? 'checkbox';
                $boolVal = isset($r['bool_value']) ? (int)$r['bool_value'] : null;
                $numVal = isset($r['numeric_value']) && $r['numeric_value'] !== '' ? (float)$r['numeric_value'] : null;
                $textVal = $r['text_value'] ?? null;
                $result = $r['result'] ?? null;
                $respNotes = $r['notes'] ?? null;
                $label = $r['item_label'] ?? $r['label'] ?? 'Item';

                $respInsert->execute([
                    $recordId,
                    null,
                    $label,
                    $itemType,
                    $boolVal,
                    $numVal,
                    $textVal,
                    $result,
                    $respNotes,
                ]);
                $responseCount++;
            }
        }

        // Generate findings
        $flags = generateInspectionFindings($pdo, $recordId, $caseId, $userId, $templateItems);

        // Compute overall result
        $overall = computeOverallResult($pdo, $recordId, $responseCount);
        $pdo->prepare("UPDATE inspection_records SET overall_result = ? WHERE id = ?")->execute([$overall, $recordId]);

        $pdo->commit();

        tm_json([
            'id' => $recordId,
            'uuid' => $recUuid,
            'tech_case_id' => $caseId,
            'template_id' => $templateId,
            'overall_result' => $overall,
            'response_count' => $responseCount,
            'flags' => $flags,
        ], 201);
    } catch (\Exception $e) {
        $pdo->rollBack();
        tm_error('Failed to create inspection: ' . $e->getMessage(), 500);
    }
}

function handleCompleteRecord(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $recordId = (int)tm_requireParam($body, 'inspection_record_id');
    $responses = $body['responses'] ?? [];
    $notes = tm_optionalParam($body, 'notes');

    // Load record
    $stmt = $pdo->prepare("SELECT * FROM inspection_records WHERE id = ?");
    $stmt->execute([$recordId]);
    $rec = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$rec) tm_error('Record not found', 404);

    // Load template items if applicable
    $templateItems = [];
    if ($rec['template_id']) {
        $itemStmt = $pdo->prepare("SELECT * FROM inspection_template_items WHERE template_id = ? ORDER BY sort_order");
        $itemStmt->execute([$rec['template_id']]);
        $templateItems = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    $pdo->beginTransaction();
    try {
        // Update/insert responses
        if (!empty($responses)) {
            foreach ($responses as $r) {
                $templateItemId = $r['template_item_id'] ?? null;
                $itemLabel = $r['item_label'] ?? $r['label'] ?? 'Item';
                $itemType = $r['item_type'] ?? 'checkbox';
                $boolVal = isset($r['bool_value']) ? (int)$r['bool_value'] : null;
                $numVal = isset($r['numeric_value']) && $r['numeric_value'] !== '' ? (float)$r['numeric_value'] : null;
                $textVal = $r['text_value'] ?? null;
                $result = $r['result'] ?? null;
                $respNotes = $r['notes'] ?? null;

                if ($templateItemId) {
                    // Find matching template item for auto-evaluation
                    $matchItem = null;
                    foreach ($templateItems as $ti) {
                        if ((int)$ti['id'] === (int)$templateItemId) { $matchItem = $ti; break; }
                    }
                    if ($matchItem && $matchItem['item_type'] === 'measurement' && $numVal !== null && !$result) {
                        $result = evaluateMeasurement($numVal, $matchItem['spec_min'] ? (float)$matchItem['spec_min'] : null, $matchItem['spec_max'] ? (float)$matchItem['spec_max'] : null);
                    }
                    if ($matchItem && $matchItem['item_type'] === 'checkbox' && $boolVal !== null && !$result) {
                        $result = $boolVal ? 'pass' : 'fail';
                    }

                    // Upsert by template_item_id
                    $existing = $pdo->prepare("SELECT id FROM inspection_responses WHERE inspection_record_id = ? AND template_item_id = ?");
                    $existing->execute([$recordId, $templateItemId]);
                    $existRow = $existing->fetch(PDO::FETCH_ASSOC);
                    if ($existRow) {
                        $pdo->prepare("
                            UPDATE inspection_responses SET bool_value = ?, numeric_value = ?, text_value = ?, result = ?, notes = ? WHERE id = ?
                        ")->execute([$boolVal, $numVal, $textVal, $result, $respNotes, $existRow['id']]);
                    } else {
                        $pdo->prepare("
                            INSERT INTO inspection_responses
                                (inspection_record_id, template_item_id, item_label, item_type, bool_value, numeric_value, text_value, result, notes)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ")->execute([$recordId, $templateItemId, $itemLabel, $itemType, $boolVal, $numVal, $textVal, $result, $respNotes]);
                    }
                }
            }
        }

        // Clear old findings and regenerate
        $pdo->prepare("DELETE FROM tech_findings WHERE tech_case_id = ?")->execute([$rec['tech_case_id']]);
        $flags = generateInspectionFindings($pdo, $recordId, (int)$rec['tech_case_id'], $userId, $templateItems);

        // Recompute overall
        $respCount = $pdo->prepare("SELECT COUNT(*) FROM inspection_responses WHERE inspection_record_id = ?");
        $respCount->execute([$recordId]);
        $cnt = (int)$respCount->fetchColumn();
        $overall = computeOverallResult($pdo, $recordId, $cnt);

        $updates = ['overall_result = ?', 'completed_at = NOW()'];
        $updateParams = [$overall];
        if ($notes !== null) { $updates[] = 'notes = ?'; $updateParams[] = $notes; }
        $updateParams[] = $recordId;
        $pdo->prepare("UPDATE inspection_records SET " . implode(', ', $updates) . " WHERE id = ?")->execute($updateParams);

        // Close the tech case
        $pdo->prepare("UPDATE tech_cases SET status = 'closed', closed_at = NOW() WHERE id = ?")->execute([$rec['tech_case_id']]);

        $pdo->commit();

        tm_json(['completed' => true, 'id' => $recordId, 'overall_result' => $overall, 'flags' => $flags]);
    } catch (\Exception $e) {
        $pdo->rollBack();
        tm_error('Failed to complete inspection: ' . $e->getMessage(), 500);
    }
}

function handleCompliance(PDO $pdo): void {
    $recordId = (int)($_GET['inspectionRecordId'] ?? 0);
    if (!$recordId) tm_error('Missing inspectionRecordId');

    $stmt = $pdo->prepare("SELECT * FROM inspection_records WHERE id = ?");
    $stmt->execute([$recordId]);
    $rec = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$rec) tm_error('Record not found', 404);

    // Load findings
    $findStmt = $pdo->prepare("SELECT * FROM tech_findings WHERE tech_case_id = ? ORDER BY created_at");
    $findStmt->execute([$rec['tech_case_id']]);
    $findings = $findStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($findings as &$f) {
        $f['id'] = (int)$f['id'];
        $f['tech_case_id'] = (int)$f['tech_case_id'];
        $f['follow_up_required'] = (int)$f['follow_up_required'];
    }

    $openFlags = 0;
    foreach ($findings as $f) {
        if ($f['disposition'] === 'open') $openFlags++;
    }

    // Load responses for summary
    $respStmt = $pdo->prepare("SELECT result FROM inspection_responses WHERE inspection_record_id = ?");
    $respStmt->execute([$recordId]);
    $results = $respStmt->fetchAll(PDO::FETCH_COLUMN);

    $passCount = count(array_filter($results, fn($r) => $r === 'pass'));
    $failCount = count(array_filter($results, fn($r) => $r === 'fail'));
    $naCount = count(array_filter($results, fn($r) => $r === 'na'));
    $skipCount = count(array_filter($results, fn($r) => $r === 'skip'));
    $unanswered = count(array_filter($results, fn($r) => $r === null));

    tm_json([
        'record_id' => (int)$rec['id'],
        'overall_result' => $rec['overall_result'],
        'findings' => $findings,
        'open_flag_count' => $openFlags,
        'response_summary' => [
            'total' => count($results),
            'pass' => $passCount,
            'fail' => $failCount,
            'na' => $naCount,
            'skip' => $skipCount,
            'unanswered' => $unanswered,
        ],
    ]);
}

function handleEntryInspectionStatus(PDO $pdo): void {
    $entryId = (int)($_GET['eventEntryId'] ?? 0);
    if (!$entryId) tm_error('Missing eventEntryId');

    $stmt = $pdo->prepare("
        SELECT ir.id, ir.overall_result, ir.measured_at, ir.completed_at,
               it.label AS template_label, it.template_type
        FROM inspection_records ir
        LEFT JOIN inspection_templates it ON ir.template_id = it.id
        WHERE ir.event_entry_id = ?
        ORDER BY ir.measured_at DESC
    ");
    $stmt->execute([$entryId]);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $failCount = 0;
    $incompleteCount = 0;
    foreach ($records as &$r) {
        $r['id'] = (int)$r['id'];
        if ($r['overall_result'] === 'fail') $failCount++;
        if ($r['overall_result'] === 'incomplete') $incompleteCount++;
    }

    $status = 'not_inspected';
    if (count($records) > 0) {
        if ($failCount > 0) $status = 'has_failure';
        elseif ($incompleteCount > 0) $status = 'has_incomplete';
        else $status = 'inspected_ok';
    }

    tm_json([
        'entry_id' => $entryId,
        'record_count' => count($records),
        'fail_count' => $failCount,
        'incomplete_count' => $incompleteCount,
        'inspection_status' => $status,
        'latest_record' => $records[0] ?? null,
    ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// CROSS-MODULE TECH SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

function handleEntryTechSummary(PDO $pdo): void {
    $entryId = (int)($_GET['eventEntryId'] ?? 0);
    if (!$entryId) tm_error('Missing eventEntryId');

    // Scale status
    $scaleStmt = $pdo->prepare("
        SELECT COUNT(*) AS cnt,
               SUM(CASE WHEN (measured_total_weight IS NOT NULL OR derived_total_weight IS NOT NULL) THEN 1 ELSE 0 END) AS weighed
        FROM scale_records WHERE event_entry_id = ?
    ");
    $scaleStmt->execute([$entryId]);
    $scale = $scaleStmt->fetch(PDO::FETCH_ASSOC);
    $scaleStatus = ((int)$scale['cnt'] === 0) ? 'not_weighed' : 'weighed';

    // Fuel status
    $fuelStmt = $pdo->prepare("
        SELECT COUNT(*) AS cnt,
               SUM(CASE WHEN overall_result = 'fail' THEN 1 ELSE 0 END) AS fails
        FROM fuel_records WHERE event_entry_id = ?
    ");
    $fuelStmt->execute([$entryId]);
    $fuel = $fuelStmt->fetch(PDO::FETCH_ASSOC);
    $fuelStatus = ((int)$fuel['cnt'] === 0) ? 'not_checked'
        : ((int)$fuel['fails'] > 0 ? 'has_failure' : 'checked_ok');

    // Inspection status
    $inspStmt = $pdo->prepare("
        SELECT COUNT(*) AS cnt,
               SUM(CASE WHEN overall_result = 'fail' THEN 1 ELSE 0 END) AS fails,
               SUM(CASE WHEN overall_result = 'incomplete' THEN 1 ELSE 0 END) AS incomplete
        FROM inspection_records WHERE event_entry_id = ?
    ");
    $inspStmt->execute([$entryId]);
    $insp = $inspStmt->fetch(PDO::FETCH_ASSOC);
    $inspStatus = ((int)$insp['cnt'] === 0) ? 'not_inspected'
        : ((int)$insp['fails'] > 0 ? 'has_failure'
        : ((int)$insp['incomplete'] > 0 ? 'has_incomplete' : 'inspected_ok'));

    tm_json([
        'entry_id' => $entryId,
        'scale' => [
            'status' => $scaleStatus,
            'record_count' => (int)$scale['cnt'],
        ],
        'fuel' => [
            'status' => $fuelStatus,
            'record_count' => (int)$fuel['cnt'],
            'fail_count' => (int)$fuel['fails'],
        ],
        'inspection' => [
            'status' => $inspStatus,
            'record_count' => (int)$insp['cnt'],
            'fail_count' => (int)$insp['fails'],
            'incomplete_count' => (int)$insp['incomplete'],
        ],
    ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function loadEntry(PDO $pdo, int $entryId): ?array {
    $stmt = $pdo->prepare("
        SELECT ee.*, ei.race_lookup, ei.name AS event_name
        FROM event_entries ee
        JOIN event_instances ei ON ee.event_instance_id = ei.id
        WHERE ee.id = ?
    ");
    $stmt->execute([$entryId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

function evaluateMeasurement(float $value, ?float $min, ?float $max): string {
    if ($min !== null && $value < $min) return 'fail';
    if ($max !== null && $value > $max) return 'fail';
    if ($min === null && $max === null) return 'pass'; // no spec = pass
    return 'pass';
}

function generateInspectionFindings(PDO $pdo, int $recordId, int $caseId, int $userId, array $templateItems): array {
    $flags = [];

    $insFind = $pdo->prepare("
        INSERT INTO tech_findings
            (uuid, tech_case_id, finding_type, severity, description, measured_value, expected_value, disposition, follow_up_required, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    ");

    // Load responses
    $respStmt = $pdo->prepare("SELECT * FROM inspection_responses WHERE inspection_record_id = ?");
    $respStmt->execute([$recordId]);
    $responses = $respStmt->fetchAll(PDO::FETCH_ASSOC);

    // Build a lookup of template items by id
    $itemMap = [];
    foreach ($templateItems as $ti) {
        $itemMap[(int)$ti['id']] = $ti;
    }

    // Check each response
    foreach ($responses as $resp) {
        $itemId = $resp['template_item_id'] ? (int)$resp['template_item_id'] : null;
        $item = $itemId ? ($itemMap[$itemId] ?? null) : null;
        $isRequired = $item ? (int)$item['is_required'] : 0;

        // Failed checkbox
        if ($resp['item_type'] === 'checkbox' && $resp['result'] === 'fail') {
            $flags[] = 'failed_checklist_item';
            $insFind->execute([
                tm_uuid(), $caseId, 'failed_checklist_item', 'high',
                'Failed checklist item: ' . $resp['item_label'],
                $resp['bool_value'] !== null ? ($resp['bool_value'] ? 'true' : 'false') : null,
                'pass',
                1, $userId,
            ]);
        }

        // Measurement out of range
        if ($resp['item_type'] === 'measurement' && $resp['result'] === 'fail' && $resp['numeric_value'] !== null) {
            $specMin = $item ? $item['spec_min'] : null;
            $specMax = $item ? $item['spec_max'] : null;
            $expected = '';
            if ($specMin !== null && $specMax !== null) $expected = "$specMin – $specMax";
            elseif ($specMin !== null) $expected = "≥ $specMin";
            elseif ($specMax !== null) $expected = "≤ $specMax";
            $unit = $item ? ($item['spec_unit'] ?? '') : '';

            $flags[] = 'measurement_out_of_range';
            $insFind->execute([
                tm_uuid(), $caseId, 'measurement_out_of_range', 'high',
                'Measurement out of range: ' . $resp['item_label'],
                $resp['numeric_value'] . ($unit ? " $unit" : ''),
                $expected . ($unit ? " $unit" : ''),
                1, $userId,
            ]);
        }

        // Required item missing response
        if ($isRequired && $resp['result'] === null) {
            // Checkbox with no value or measurement with no value
            $missing = false;
            if ($resp['item_type'] === 'checkbox' && $resp['bool_value'] === null) $missing = true;
            if ($resp['item_type'] === 'measurement' && $resp['numeric_value'] === null) $missing = true;

            if ($missing) {
                $flags[] = 'required_item_missing';
                $insFind->execute([
                    tm_uuid(), $caseId, 'required_item_missing', 'medium',
                    'Required item not answered: ' . $resp['item_label'],
                    null, null,
                    0, $userId,
                ]);
            }
        }
    }

    // No template configured warning
    $recStmt = $pdo->prepare("SELECT template_id FROM inspection_records WHERE id = ?");
    $recStmt->execute([$recordId]);
    $recRow = $recStmt->fetch(PDO::FETCH_ASSOC);
    if (!$recRow['template_id']) {
        $flags[] = 'no_template_configured';
        $insFind->execute([
            tm_uuid(), $caseId, 'no_template_configured', 'info',
            'No inspection template was used for this inspection',
            null, null,
            0, $userId,
        ]);
    }

    return array_unique($flags);
}

function computeOverallResult(PDO $pdo, int $recordId, int $totalResponses): string {
    if ($totalResponses === 0) return 'incomplete';

    $respStmt = $pdo->prepare("SELECT result FROM inspection_responses WHERE inspection_record_id = ?");
    $respStmt->execute([$recordId]);
    $results = $respStmt->fetchAll(PDO::FETCH_COLUMN);

    $hasFail = false;
    $hasUnanswered = false;
    foreach ($results as $r) {
        if ($r === 'fail') $hasFail = true;
        if ($r === null) $hasUnanswered = true;
    }

    if ($hasFail) return 'fail';
    if ($hasUnanswered) return 'incomplete';
    return 'pass';
}

function castRecordRows(array &$rows): void {
    foreach ($rows as &$r) castRecordRow($r);
}

function castRecordRow(array &$r): void {
    $r['id'] = (int)$r['id'];
    $r['tech_case_id'] = (int)$r['tech_case_id'];
    $r['event_entry_id'] = (int)$r['event_entry_id'];
    if ($r['template_id']) $r['template_id'] = (int)$r['template_id'];
    $r['is_official'] = (int)$r['is_official'];
    $r['created_by'] = (int)$r['created_by'];
}
