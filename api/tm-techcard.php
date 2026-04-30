<?php
/**
 * Tech Master — Tech Card Audit API
 *
 * Actions:
 *   GET  listByEvent           — declarations for an event
 *   GET  listByEntry           — declarations for an entry
 *   GET  getDeclaration        — single declaration with fields + artifacts + findings
 *   POST createDeclaration     — create declaration with auto field scaffolding
 *   POST updateDeclaration     — update declaration header (status, notes, etc.)
 *   POST saveFields            — save/update declaration field values
 *   POST addArtifact           — record artifact metadata
 *   GET  listArtifacts         — list artifacts for a declaration
 *   POST runAudit              — evaluate discrepancies against Scale/Fuel/Inspection
 *   GET  entryCardStatus       — card status summary for an entry
 *   GET  eventCardSummary      — card status summary across all entries in an event
 *   GET  fieldTemplate         — get the first-pass field template for a category/class
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
    case 'getDeclaration':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleGetDeclaration($pdo);
        break;
    case 'createDeclaration':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleCreateDeclaration($pdo, $userId);
        break;
    case 'updateDeclaration':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleUpdateDeclaration($pdo, $userId);
        break;
    case 'saveFields':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleSaveFields($pdo, $userId);
        break;
    case 'addArtifact':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleAddArtifact($pdo, $userId);
        break;
    case 'listArtifacts':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleListArtifacts($pdo);
        break;
    case 'runAudit':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleRunAudit($pdo, $userId);
        break;
    case 'entryCardStatus':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleEntryCardStatus($pdo);
        break;
    case 'eventCardSummary':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleEventCardSummary($pdo);
        break;
    case 'fieldTemplate':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleFieldTemplate();
        break;
    default:
        tm_error("Unknown action: $action", 400);
}

// ═══════════════════════════════════════════════════════════════════════════
// FIRST-PASS DECLARATION FIELD TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

function getFieldTemplate(string $category, string $classIndex): array {
    // Common fields for all categories
    $common = [
        ['field_key' => 'declared_min_weight', 'field_label' => 'Declared Minimum Weight (lbs)', 'field_group' => 'Weight', 'field_type' => 'number', 'sort_order' => 10],
        ['field_key' => 'declared_fuel_type', 'field_label' => 'Declared Fuel Type', 'field_group' => 'Fuel', 'field_type' => 'select', 'sort_order' => 20],
        ['field_key' => 'declared_engine_type', 'field_label' => 'Declared Engine Type / Manufacturer', 'field_group' => 'Engine', 'field_type' => 'text', 'sort_order' => 30],
        ['field_key' => 'declared_engine_displacement', 'field_label' => 'Declared Engine Displacement (ci)', 'field_group' => 'Engine', 'field_type' => 'number', 'sort_order' => 40],
        ['field_key' => 'declared_chassis_serial', 'field_label' => 'Chassis Serial / SFI Number', 'field_group' => 'Chassis', 'field_type' => 'text', 'sort_order' => 50],
        ['field_key' => 'declared_chassis_cert_expiry', 'field_label' => 'Chassis Certification Expiry', 'field_group' => 'Chassis', 'field_type' => 'text', 'sort_order' => 60],
        ['field_key' => 'declared_body_make_model', 'field_label' => 'Declared Body Make / Model', 'field_group' => 'Body', 'field_type' => 'text', 'sort_order' => 70],
        ['field_key' => 'safety_equipment_current', 'field_label' => 'Safety Equipment Current (harness, helmet, suit)', 'field_group' => 'Safety', 'field_type' => 'boolean', 'sort_order' => 80],
        ['field_key' => 'fire_system_current', 'field_label' => 'Fire Suppression System Current', 'field_group' => 'Safety', 'field_type' => 'boolean', 'sort_order' => 90],
        ['field_key' => 'additional_notes', 'field_label' => 'Additional Notes / Declarations', 'field_group' => 'Notes', 'field_type' => 'text', 'sort_order' => 200],
    ];

    // Category-specific additions
    $catUpper = strtoupper($category);

    if (in_array($catUpper, ['TOP FUEL', 'FUNNY CAR']) || in_array(strtoupper($classIndex), ['TF', 'FC'])) {
        $common[] = ['field_key' => 'declared_supercharger_type', 'field_label' => 'Declared Supercharger Type / Size', 'field_group' => 'Engine', 'field_type' => 'text', 'sort_order' => 45];
        $common[] = ['field_key' => 'declared_wheelbase', 'field_label' => 'Declared Wheelbase (inches)', 'field_group' => 'Chassis', 'field_type' => 'number', 'sort_order' => 55];
        $common[] = ['field_key' => 'parachute_count', 'field_label' => 'Number of Parachutes', 'field_group' => 'Safety', 'field_type' => 'number', 'sort_order' => 95];
    }

    if (in_array($catUpper, ['PRO STOCK']) || strtoupper($classIndex) === 'PS') {
        $common[] = ['field_key' => 'declared_wheelbase', 'field_label' => 'Declared Wheelbase (inches)', 'field_group' => 'Chassis', 'field_type' => 'number', 'sort_order' => 55];
        $common[] = ['field_key' => 'declared_carburetor', 'field_label' => 'Declared Carburetor Type', 'field_group' => 'Engine', 'field_type' => 'text', 'sort_order' => 46];
        $common[] = ['field_key' => 'declared_transmission', 'field_label' => 'Declared Transmission Type', 'field_group' => 'Engine', 'field_type' => 'text', 'sort_order' => 47];
    }

    if (in_array($catUpper, ['PRO STOCK MOTORCYCLE']) || strtoupper($classIndex) === 'PSM') {
        $common[] = ['field_key' => 'declared_frame_make', 'field_label' => 'Declared Frame Manufacturer', 'field_group' => 'Chassis', 'field_type' => 'text', 'sort_order' => 52];
        $common[] = ['field_key' => 'declared_wheelbase', 'field_label' => 'Declared Wheelbase (inches)', 'field_group' => 'Chassis', 'field_type' => 'number', 'sort_order' => 55];
    }

    // Sort by sort_order
    usort($common, fn($a, $b) => $a['sort_order'] <=> $b['sort_order']);
    return $common;
}

// ═══════════════════════════════════════════════════════════════════════════
// LIST / GET HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function handleListByEvent(PDO $pdo): void {
    $eventId = (int)($_GET['eventInstanceId'] ?? 0);
    if (!$eventId) tm_error('Missing eventInstanceId');

    $stmt = $pdo->prepare("
        SELECT d.*,
               ee.competition_number, ee.class_index AS entry_class, ee.category AS entry_category,
               p.display_name AS person_name,
               o.name AS org_name,
               (SELECT COUNT(*) FROM techcard_declaration_fields WHERE declaration_id = d.id) AS field_count,
               (SELECT COUNT(*) FROM techcard_artifacts WHERE declaration_id = d.id) AS artifact_count
        FROM techcard_declarations d
        JOIN event_entries ee ON d.event_entry_id = ee.id
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        WHERE ee.event_instance_id = ?
        ORDER BY ee.competition_number, d.created_at DESC
    ");
    $stmt->execute([$eventId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    castDeclRows($rows);

    tm_json(['declarations' => $rows, 'count' => count($rows), 'eventInstanceId' => $eventId]);
}

function handleListByEntry(PDO $pdo): void {
    $entryId = (int)($_GET['eventEntryId'] ?? 0);
    if (!$entryId) tm_error('Missing eventEntryId');

    $stmt = $pdo->prepare("
        SELECT d.*,
               (SELECT COUNT(*) FROM techcard_declaration_fields WHERE declaration_id = d.id) AS field_count,
               (SELECT COUNT(*) FROM techcard_artifacts WHERE declaration_id = d.id) AS artifact_count
        FROM techcard_declarations d
        WHERE d.event_entry_id = ?
        ORDER BY d.revision DESC
    ");
    $stmt->execute([$entryId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    castDeclRows($rows);

    tm_json(['declarations' => $rows, 'count' => count($rows)]);
}

function handleGetDeclaration(PDO $pdo): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) tm_error('Missing id');

    $stmt = $pdo->prepare("
        SELECT d.*,
               ee.competition_number, ee.class_index AS entry_class, ee.category AS entry_category,
               ee.event_instance_id,
               p.display_name AS person_name,
               o.name AS org_name,
               ei.name AS event_name
        FROM techcard_declarations d
        JOIN event_entries ee ON d.event_entry_id = ee.id
        JOIN event_instances ei ON ee.event_instance_id = ei.id
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        WHERE d.id = ?
    ");
    $stmt->execute([$id]);
    $decl = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$decl) tm_error('Declaration not found', 404);
    castDeclRow($decl);

    // Load fields
    $fStmt = $pdo->prepare("SELECT * FROM techcard_declaration_fields WHERE declaration_id = ? ORDER BY sort_order, id");
    $fStmt->execute([$id]);
    $fields = $fStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($fields as &$f) {
        $f['id'] = (int)$f['id'];
        $f['declaration_id'] = (int)$f['declaration_id'];
        $f['sort_order'] = (int)$f['sort_order'];
    }
    $decl['fields'] = $fields;

    // Load artifacts
    $aStmt = $pdo->prepare("SELECT * FROM techcard_artifacts WHERE declaration_id = ? ORDER BY uploaded_at");
    $aStmt->execute([$id]);
    $artifacts = $aStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($artifacts as &$a) {
        $a['id'] = (int)$a['id'];
        $a['declaration_id'] = (int)$a['declaration_id'];
        $a['uploaded_by'] = (int)$a['uploaded_by'];
        if ($a['file_size_bytes'] !== null) $a['file_size_bytes'] = (int)$a['file_size_bytes'];
        if ($a['page_count'] !== null) $a['page_count'] = (int)$a['page_count'];
    }
    $decl['artifacts'] = $artifacts;

    // Load findings if tech_case_id present
    $decl['findings'] = [];
    if ($decl['tech_case_id']) {
        $findStmt = $pdo->prepare("SELECT * FROM tech_findings WHERE tech_case_id = ? ORDER BY created_at");
        $findStmt->execute([$decl['tech_case_id']]);
        $findings = $findStmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($findings as &$fi) {
            $fi['id'] = (int)$fi['id'];
            $fi['tech_case_id'] = (int)$fi['tech_case_id'];
            $fi['follow_up_required'] = (int)$fi['follow_up_required'];
            $fi['created_by'] = (int)$fi['created_by'];
        }
        $decl['findings'] = $findings;
    }

    tm_json(['declaration' => $decl]);
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE / UPDATE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function handleCreateDeclaration(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $entryId = (int)tm_requireParam($body, 'event_entry_id');
    $cardType = tm_optionalParam($body, 'card_type');
    $notes = tm_optionalParam($body, 'notes');

    // Validate entry
    $entryStmt = $pdo->prepare("
        SELECT ee.*, ei.name AS event_name
        FROM event_entries ee
        JOIN event_instances ei ON ee.event_instance_id = ei.id
        WHERE ee.id = ?
    ");
    $entryStmt->execute([$entryId]);
    $entry = $entryStmt->fetch(PDO::FETCH_ASSOC);
    if (!$entry) tm_error('Event entry not found', 404);

    // Check if declaration already exists for this entry
    $existStmt = $pdo->prepare("SELECT id, revision FROM techcard_declarations WHERE event_entry_id = ? ORDER BY revision DESC LIMIT 1");
    $existStmt->execute([$entryId]);
    $existing = $existStmt->fetch(PDO::FETCH_ASSOC);
    $revision = $existing ? (int)$existing['revision'] + 1 : 1;

    $pdo->beginTransaction();
    try {
        $uuid = tm_uuid();
        $category = $entry['category'] ?? '';
        $classIndex = $entry['class_index'] ?? '';

        $pdo->prepare("
            INSERT INTO techcard_declarations
                (uuid, event_entry_id, card_status, card_type, category, class_index, revision, notes, created_by)
            VALUES (?, ?, 'missing', ?, ?, ?, ?, ?, ?)
        ")->execute([$uuid, $entryId, $cardType, $category, $classIndex, $revision, $notes, $userId]);
        $declId = (int)$pdo->lastInsertId();

        // Auto-scaffold declaration fields from template
        $fieldTemplate = getFieldTemplate($category, $classIndex);
        $insField = $pdo->prepare("
            INSERT INTO techcard_declaration_fields
                (declaration_id, field_key, field_label, field_group, field_type, sort_order)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        foreach ($fieldTemplate as $ft) {
            $insField->execute([
                $declId,
                $ft['field_key'],
                $ft['field_label'],
                $ft['field_group'] ?? null,
                $ft['field_type'] ?? 'text',
                $ft['sort_order'] ?? 0,
            ]);
        }

        $pdo->commit();

        tm_json([
            'id' => $declId,
            'uuid' => $uuid,
            'revision' => $revision,
            'field_count' => count($fieldTemplate),
            'category' => $category,
            'class_index' => $classIndex,
        ], 201);
    } catch (\Exception $e) {
        $pdo->rollBack();
        tm_error('Failed to create declaration: ' . $e->getMessage(), 500);
    }
}

function handleUpdateDeclaration(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $declId = (int)tm_requireParam($body, 'declaration_id');

    $stmt = $pdo->prepare("SELECT * FROM techcard_declarations WHERE id = ?");
    $stmt->execute([$declId]);
    $decl = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$decl) tm_error('Declaration not found', 404);

    $allowed = ['card_status', 'card_type', 'notes'];
    $sets = [];
    $params = [];
    foreach ($allowed as $col) {
        if (array_key_exists($col, $body)) {
            $sets[] = "`$col` = ?";
            $params[] = $body[$col];
        }
    }

    // Handle status transitions with timestamps
    if (isset($body['card_status'])) {
        $newStatus = $body['card_status'];
        if ($newStatus === 'uploaded' && !$decl['received_at']) {
            $sets[] = "received_at = NOW()";
            $sets[] = "received_by = ?";
            $params[] = $userId;
        }
        if (in_array($newStatus, ['audited', 'discrepancy_found', 'closed'])) {
            $sets[] = "audited_at = NOW()";
            $sets[] = "audited_by = ?";
            $params[] = $userId;
        }
    }

    if (empty($sets)) tm_error('No updatable fields provided', 400);

    $params[] = $declId;
    $pdo->prepare("UPDATE techcard_declarations SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);

    tm_json(['updated' => true, 'id' => $declId]);
}

function handleSaveFields(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $declId = (int)tm_requireParam($body, 'declaration_id');
    $fields = $body['fields'] ?? [];

    if (empty($fields)) tm_error('No fields provided');

    // Verify declaration exists
    $check = $pdo->prepare("SELECT id FROM techcard_declarations WHERE id = ?");
    $check->execute([$declId]);
    if (!$check->fetch()) tm_error('Declaration not found', 404);

    $updated = 0;
    foreach ($fields as $f) {
        $fieldKey = $f['field_key'] ?? null;
        $fieldId = isset($f['id']) ? (int)$f['id'] : null;
        $value = $f['declared_value'] ?? null;

        if ($fieldId) {
            // Update by ID
            $pdo->prepare("UPDATE techcard_declaration_fields SET declared_value = ? WHERE id = ? AND declaration_id = ?")
                ->execute([$value, $fieldId, $declId]);
            $updated++;
        } elseif ($fieldKey) {
            // Update by key
            $pdo->prepare("UPDATE techcard_declaration_fields SET declared_value = ? WHERE declaration_id = ? AND field_key = ?")
                ->execute([$value, $declId, $fieldKey]);
            $updated++;
        }
    }

    tm_json(['updated' => true, 'fields_updated' => $updated]);
}

// ═══════════════════════════════════════════════════════════════════════════
// ARTIFACT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function handleAddArtifact(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $declId = (int)tm_requireParam($body, 'declaration_id');
    $filename = tm_requireParam($body, 'original_filename');
    $storagePath = tm_optionalParam($body, 'storage_path');
    $mimeType = tm_optionalParam($body, 'mime_type');
    $fileSize = tm_optionalInt($body, 'file_size_bytes');
    $pageCount = tm_optionalInt($body, 'page_count');

    // Verify declaration exists
    $check = $pdo->prepare("SELECT id, card_status FROM techcard_declarations WHERE id = ?");
    $check->execute([$declId]);
    $decl = $check->fetch(PDO::FETCH_ASSOC);
    if (!$decl) tm_error('Declaration not found', 404);

    $uuid = tm_uuid();
    $pdo->prepare("
        INSERT INTO techcard_artifacts
            (uuid, declaration_id, original_filename, storage_path, mime_type, file_size_bytes, page_count, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ")->execute([$uuid, $declId, $filename, $storagePath, $mimeType, $fileSize, $pageCount, $userId]);
    $artId = (int)$pdo->lastInsertId();

    // Auto-transition status to 'uploaded' if currently 'missing'
    if ($decl['card_status'] === 'missing') {
        $pdo->prepare("UPDATE techcard_declarations SET card_status = 'uploaded', received_at = NOW(), received_by = ? WHERE id = ?")
            ->execute([$userId, $declId]);
    }

    tm_json(['id' => $artId, 'uuid' => $uuid], 201);
}

function handleListArtifacts(PDO $pdo): void {
    $declId = (int)($_GET['declarationId'] ?? 0);
    if (!$declId) tm_error('Missing declarationId');

    $stmt = $pdo->prepare("SELECT * FROM techcard_artifacts WHERE declaration_id = ? ORDER BY uploaded_at");
    $stmt->execute([$declId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['declaration_id'] = (int)$r['declaration_id'];
        $r['uploaded_by'] = (int)$r['uploaded_by'];
        if ($r['file_size_bytes'] !== null) $r['file_size_bytes'] = (int)$r['file_size_bytes'];
        if ($r['page_count'] !== null) $r['page_count'] = (int)$r['page_count'];
    }

    tm_json(['artifacts' => $rows, 'count' => count($rows)]);
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT / DISCREPANCY HANDLER
// ═══════════════════════════════════════════════════════════════════════════

function handleRunAudit(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $declId = (int)tm_requireParam($body, 'declaration_id');

    // Load declaration + fields
    $stmt = $pdo->prepare("SELECT * FROM techcard_declarations WHERE id = ?");
    $stmt->execute([$declId]);
    $decl = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$decl) tm_error('Declaration not found', 404);

    $entryId = (int)$decl['event_entry_id'];

    // Load fields as key=>value map
    $fStmt = $pdo->prepare("SELECT field_key, declared_value, field_label FROM techcard_declaration_fields WHERE declaration_id = ?");
    $fStmt->execute([$declId]);
    $fieldRows = $fStmt->fetchAll(PDO::FETCH_ASSOC);
    $fieldMap = [];
    $labelMap = [];
    foreach ($fieldRows as $fr) {
        $fieldMap[$fr['field_key']] = $fr['declared_value'];
        $labelMap[$fr['field_key']] = $fr['field_label'];
    }

    $pdo->beginTransaction();
    try {
        // Ensure a tech_case exists for this declaration
        $caseId = $decl['tech_case_id'] ? (int)$decl['tech_case_id'] : null;
        if (!$caseId) {
            $caseUuid = tm_uuid();
            $pdo->prepare("
                INSERT INTO tech_cases (uuid, event_entry_id, case_type, status, opened_at, created_by)
                VALUES (?, ?, 'techcard_audit', 'open', NOW(), ?)
            ")->execute([$caseUuid, $entryId, $userId]);
            $caseId = (int)$pdo->lastInsertId();
            $pdo->prepare("UPDATE techcard_declarations SET tech_case_id = ? WHERE id = ?")->execute([$caseId, $declId]);
        }

        // Clear old findings for re-evaluation
        $pdo->prepare("DELETE FROM tech_findings WHERE tech_case_id = ?")->execute([$caseId]);

        $flags = [];
        $insFind = $pdo->prepare("
            INSERT INTO tech_findings
                (uuid, tech_case_id, finding_type, severity, description, measured_value, expected_value, disposition, follow_up_required, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
        ");

        // ── Check 1: No artifact on file ──
        $artCount = $pdo->prepare("SELECT COUNT(*) FROM techcard_artifacts WHERE declaration_id = ?");
        $artCount->execute([$declId]);
        if ((int)$artCount->fetchColumn() === 0) {
            $flags[] = 'no_card_on_file';
            $insFind->execute([tm_uuid(), $caseId, 'no_card_on_file', 'medium',
                'No tech card artifact/scan on file for this entry', null, null, 1, $userId]);
        }

        // ── Check 2: Declared fuel type vs fuel check ──
        $declaredFuel = trim($fieldMap['declared_fuel_type'] ?? '');
        if ($declaredFuel) {
            $fuelStmt = $pdo->prepare("
                SELECT fuel_type_declared, overall_result FROM fuel_records
                WHERE event_entry_id = ? ORDER BY created_at DESC LIMIT 1
            ");
            $fuelStmt->execute([$entryId]);
            $fuelRec = $fuelStmt->fetch(PDO::FETCH_ASSOC);
            if ($fuelRec && $fuelRec['fuel_type_declared']) {
                $checkedFuel = strtolower(trim($fuelRec['fuel_type_declared']));
                if ($checkedFuel !== strtolower($declaredFuel)) {
                    $flags[] = 'fuel_type_mismatch';
                    $insFind->execute([tm_uuid(), $caseId, 'fuel_type_mismatch', 'high',
                        'Declared fuel type does not match fuel check record',
                        $fuelRec['fuel_type_declared'], $declaredFuel, 1, $userId]);
                }
            }
        }

        // ── Check 3: Declared weight vs scale context ──
        $declaredWeight = $fieldMap['declared_min_weight'] ?? null;
        if ($declaredWeight && is_numeric($declaredWeight)) {
            $declW = (float)$declaredWeight;
            // Check against scale rules
            $entry = loadEntryForAudit($pdo, $entryId);
            if ($entry) {
                $ruleStmt = $pdo->prepare("
                    SELECT minimum_weight FROM scale_rules
                    WHERE category = ? AND class_index = ? AND is_active = 1
                    ORDER BY season_year DESC LIMIT 1
                ");
                $ruleStmt->execute([$entry['category'], $entry['class_index']]);
                $rule = $ruleStmt->fetch(PDO::FETCH_ASSOC);
                if ($rule && $rule['minimum_weight'] && $declW < (float)$rule['minimum_weight']) {
                    $flags[] = 'declared_weight_below_rule';
                    $insFind->execute([tm_uuid(), $caseId, 'declared_weight_below_rule', 'high',
                        'Declared minimum weight is below the class rule minimum',
                        (string)$declW . ' lbs', $rule['minimum_weight'] . ' lbs', 1, $userId]);
                }
            }

            // Check against latest scale record
            $scaleStmt = $pdo->prepare("
                SELECT COALESCE(measured_total_weight, derived_total_weight) AS total_weight
                FROM scale_records WHERE event_entry_id = ? ORDER BY created_at DESC LIMIT 1
            ");
            $scaleStmt->execute([$entryId]);
            $scaleRec = $scaleStmt->fetch(PDO::FETCH_ASSOC);
            if ($scaleRec && $scaleRec['total_weight']) {
                $measuredW = (float)$scaleRec['total_weight'];
                if ($measuredW < $declW) {
                    $flags[] = 'measured_weight_below_declared';
                    $insFind->execute([tm_uuid(), $caseId, 'measured_weight_below_declared', 'high',
                        'Measured weight is below the declared minimum weight',
                        $measuredW . ' lbs', $declW . ' lbs', 1, $userId]);
                }
            }
        }

        // ── Check 4: Inspection findings present ──
        $inspStmt = $pdo->prepare("
            SELECT ir.overall_result FROM inspection_records ir
            WHERE ir.event_entry_id = ? AND ir.overall_result = 'fail'
            LIMIT 1
        ");
        $inspStmt->execute([$entryId]);
        if ($inspStmt->fetch()) {
            $flags[] = 'inspection_failure_present';
            $insFind->execute([tm_uuid(), $caseId, 'inspection_failure_present', 'medium',
                'Entry has a failed inspection record — review against tech card declarations',
                null, null, 0, $userId]);
        }

        // ── Check 5: Key declaration fields missing ──
        $requiredKeys = ['declared_min_weight', 'declared_fuel_type', 'declared_engine_type', 'declared_chassis_serial'];
        foreach ($requiredKeys as $rk) {
            $val = trim($fieldMap[$rk] ?? '');
            if ($val === '') {
                $flags[] = 'missing_declaration_' . $rk;
                $label = $labelMap[$rk] ?? $rk;
                $insFind->execute([tm_uuid(), $caseId, 'missing_key_declaration', 'low',
                    "Key declaration field not filled: $label",
                    null, null, 0, $userId]);
            }
        }

        // ── Check 6: Declared wheelbase vs inspection measurement ──
        $declaredWB = $fieldMap['declared_wheelbase'] ?? null;
        if ($declaredWB && is_numeric($declaredWB)) {
            $declWB = (float)$declaredWB;
            $wbResp = $pdo->prepare("
                SELECT iresp.numeric_value
                FROM inspection_responses iresp
                JOIN inspection_records ir ON iresp.inspection_record_id = ir.id
                WHERE ir.event_entry_id = ?
                  AND iresp.item_label LIKE '%wheelbase%'
                  AND iresp.numeric_value IS NOT NULL
                ORDER BY ir.measured_at DESC LIMIT 1
            ");
            $wbResp->execute([$entryId]);
            $wbRow = $wbResp->fetch(PDO::FETCH_ASSOC);
            if ($wbRow && $wbRow['numeric_value'] !== null) {
                $measuredWB = (float)$wbRow['numeric_value'];
                if (abs($measuredWB - $declWB) > 1.0) {
                    $flags[] = 'wheelbase_discrepancy';
                    $insFind->execute([tm_uuid(), $caseId, 'wheelbase_discrepancy', 'high',
                        'Declared wheelbase differs from measured wheelbase by more than 1 inch',
                        $measuredWB . ' in', $declWB . ' in', 1, $userId]);
                }
            }
        }

        // Update declaration status based on findings
        $newStatus = empty($flags) ? 'audited' : 'discrepancy_found';
        $pdo->prepare("UPDATE techcard_declarations SET card_status = ?, audited_at = NOW(), audited_by = ? WHERE id = ?")
            ->execute([$newStatus, $userId, $declId]);

        $pdo->commit();

        tm_json([
            'audited' => true,
            'declaration_id' => $declId,
            'tech_case_id' => $caseId,
            'card_status' => $newStatus,
            'flags' => array_unique($flags),
            'finding_count' => count($flags),
        ]);
    } catch (\Exception $e) {
        $pdo->rollBack();
        tm_error('Audit failed: ' . $e->getMessage(), 500);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS / SUMMARY HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function handleEntryCardStatus(PDO $pdo): void {
    $entryId = (int)($_GET['eventEntryId'] ?? 0);
    if (!$entryId) tm_error('Missing eventEntryId');

    $stmt = $pdo->prepare("
        SELECT d.id, d.card_status, d.revision, d.received_at, d.audited_at,
               (SELECT COUNT(*) FROM techcard_artifacts WHERE declaration_id = d.id) AS artifact_count
        FROM techcard_declarations d
        WHERE d.event_entry_id = ?
        ORDER BY d.revision DESC
    ");
    $stmt->execute([$entryId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $status = 'no_declaration';
    $latestDecl = null;
    if (!empty($rows)) {
        $latestDecl = $rows[0];
        $latestDecl['id'] = (int)$latestDecl['id'];
        $latestDecl['revision'] = (int)$latestDecl['revision'];
        $latestDecl['artifact_count'] = (int)$latestDecl['artifact_count'];
        $status = $latestDecl['card_status'];
    }

    tm_json([
        'entry_id' => $entryId,
        'card_status' => $status,
        'declaration_count' => count($rows),
        'latest_declaration' => $latestDecl,
    ]);
}

function handleEventCardSummary(PDO $pdo): void {
    $eventId = (int)($_GET['eventInstanceId'] ?? 0);
    if (!$eventId) tm_error('Missing eventInstanceId');

    // Get all entries for event
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

    // Get declarations
    $declStmt = $pdo->prepare("
        SELECT d.event_entry_id, d.card_status, d.revision
        FROM techcard_declarations d
        JOIN event_entries ee ON d.event_entry_id = ee.id
        WHERE ee.event_instance_id = ?
        ORDER BY d.revision DESC
    ");
    $declStmt->execute([$eventId]);
    $decls = $declStmt->fetchAll(PDO::FETCH_ASSOC);

    // Build map: entry_id => latest card_status
    $statusMap = [];
    foreach ($decls as $d) {
        $eid = (int)$d['event_entry_id'];
        if (!isset($statusMap[$eid])) {
            $statusMap[$eid] = $d['card_status'];
        }
    }

    $summary = [];
    $counts = ['no_declaration' => 0, 'missing' => 0, 'uploaded' => 0, 'under_review' => 0, 'audited' => 0, 'discrepancy_found' => 0, 'closed' => 0];
    foreach ($entries as $e) {
        $eid = (int)$e['id'];
        $cs = $statusMap[$eid] ?? 'no_declaration';
        $summary[] = [
            'entry_id' => $eid,
            'competition_number' => $e['competition_number'],
            'class_index' => $e['class_index'],
            'category' => $e['category'],
            'person_name' => $e['person_name'],
            'card_status' => $cs,
        ];
        if (isset($counts[$cs])) $counts[$cs]++;
    }

    tm_json([
        'eventInstanceId' => $eventId,
        'total_entries' => count($entries),
        'entries' => $summary,
        'counts' => $counts,
    ]);
}

function handleFieldTemplate(): void {
    $category = $_GET['category'] ?? '*';
    $classIndex = $_GET['classIndex'] ?? '*';
    $fields = getFieldTemplate($category, $classIndex);
    tm_json(['category' => $category, 'classIndex' => $classIndex, 'fields' => $fields, 'count' => count($fields)]);
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function loadEntryForAudit(PDO $pdo, int $entryId): ?array {
    $stmt = $pdo->prepare("SELECT * FROM event_entries WHERE id = ?");
    $stmt->execute([$entryId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

function castDeclRows(array &$rows): void {
    foreach ($rows as &$r) castDeclRow($r);
}

function castDeclRow(array &$r): void {
    $r['id'] = (int)$r['id'];
    $r['event_entry_id'] = (int)$r['event_entry_id'];
    if ($r['tech_case_id']) $r['tech_case_id'] = (int)$r['tech_case_id'];
    $r['revision'] = (int)$r['revision'];
    $r['created_by'] = (int)$r['created_by'];
    if (isset($r['received_by']) && $r['received_by']) $r['received_by'] = (int)$r['received_by'];
    if (isset($r['audited_by']) && $r['audited_by']) $r['audited_by'] = (int)$r['audited_by'];
    if (isset($r['field_count'])) $r['field_count'] = (int)$r['field_count'];
    if (isset($r['artifact_count'])) $r['artifact_count'] = (int)$r['artifact_count'];
}
