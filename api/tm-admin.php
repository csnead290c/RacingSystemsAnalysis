<?php
/**
 * NHRA Tech Master — Admin / Configuration API
 * Batch 10: Template Admin + Compliance Workflow Strengthening
 *
 * Actions:
 *   ── Inspection Template Admin ──
 *   GET  listInspectionTemplates       — all templates (incl inactive)
 *   GET  getInspectionTemplate         — single template with items
 *   POST upsertInspectionTemplate      — create/update template header
 *   POST saveInspectionTemplateItems   — replace items for a template
 *   POST toggleInspectionTemplate      — activate/deactivate
 *
 *   ── Teardown Template Admin ──
 *   GET  listTeardownTemplates         — all templates (incl inactive)
 *   GET  getTeardownTemplate           — single template with items
 *   POST upsertTeardownTemplate        — create/update template header
 *   POST saveTeardownTemplateItems     — replace items for a template
 *   POST toggleTeardownTemplate        — activate/deactivate
 *
 *   ── Scale Rule Admin ──
 *   GET  listScaleRules                — all rules (incl inactive)
 *   POST upsertScaleRule               — create/update rule
 *   POST toggleScaleRule               — activate/deactivate
 *
 *   ── Fuel Rule Admin ──
 *   GET  listFuelRules                 — all rules (incl inactive)
 *   POST upsertFuelRule                — create/update rule
 *   POST toggleFuelRule                — activate/deactivate
 *
 *   ── Required Module Config ──
 *   GET  listRequiredModules           — all configs, filterable by category/class
 *   POST upsertRequiredModule          — create/update config
 *   POST deleteRequiredModule          — remove config
 *
 *   ── Findings Resolution ──
 *   POST resolveFinding                — change disposition + add audit history
 *   GET  findingHistory                — audit trail for a finding
 *
 *   ── Entry Holds / Escalation (Batch 11) ──
 *   GET  listEntryHolds                — active holds for an entry or event
 *   POST placeHold                     — place a hold on an entry
 *   POST clearHold                     — clear/remove a hold
 *   GET  holdHistory                   — audit trail for an entry's holds
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/tm-helpers.php';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$auth = rsa_requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($action) {
    // ── Inspection Template Admin ──
    case 'listInspectionTemplates':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleListInspectionTemplates($pdo);
        break;
    case 'getInspectionTemplate':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleGetInspectionTemplate($pdo);
        break;
    case 'upsertInspectionTemplate':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleUpsertInspectionTemplate($pdo, $userId);
        break;
    case 'saveInspectionTemplateItems':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleSaveInspectionTemplateItems($pdo, $userId);
        break;
    case 'toggleInspectionTemplate':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleToggleInspectionTemplate($pdo);
        break;

    // ── Teardown Template Admin ──
    case 'listTeardownTemplates':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleListTeardownTemplates($pdo);
        break;
    case 'getTeardownTemplate':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleGetTeardownTemplate($pdo);
        break;
    case 'upsertTeardownTemplate':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleUpsertTeardownTemplate($pdo, $userId);
        break;
    case 'saveTeardownTemplateItems':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleSaveTeardownTemplateItems($pdo, $userId);
        break;
    case 'toggleTeardownTemplate':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleToggleTeardownTemplate($pdo);
        break;

    // ── Scale Rule Admin ──
    case 'listScaleRules':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleListScaleRules($pdo);
        break;
    case 'upsertScaleRule':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleUpsertScaleRule($pdo, $userId);
        break;
    case 'toggleScaleRule':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleToggleScaleRule($pdo);
        break;

    // ── Fuel Rule Admin ──
    case 'listFuelRules':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleListFuelRules($pdo);
        break;
    case 'upsertFuelRule':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleUpsertFuelRule($pdo, $userId);
        break;
    case 'toggleFuelRule':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleToggleFuelRule($pdo);
        break;

    // ── Required Module Config ──
    case 'listRequiredModules':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleListRequiredModules($pdo);
        break;
    case 'upsertRequiredModule':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleUpsertRequiredModule($pdo, $userId);
        break;
    case 'deleteRequiredModule':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleDeleteRequiredModule($pdo);
        break;

    // ── Findings Resolution ──
    case 'resolveFinding':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleResolveFinding($pdo, $userId);
        break;
    case 'findingHistory':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleFindingHistory($pdo);
        break;

    // ── Entry Holds / Escalation ──
    case 'listEntryHolds':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleListEntryHolds($pdo);
        break;
    case 'placeHold':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handlePlaceHold($pdo, $userId);
        break;
    case 'clearHold':
        if ($method !== 'POST') tm_error('POST required', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleClearHold($pdo, $userId);
        break;
    case 'holdHistory':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleHoldHistory($pdo);
        break;

    default:
        tm_error("Unknown action: $action", 400);
}

// ═══════════════════════════════════════════════════════════════════════════
// INSPECTION TEMPLATE ADMIN
// ═══════════════════════════════════════════════════════════════════════════

function handleListInspectionTemplates(PDO $pdo): void {
    $category = $_GET['category'] ?? null;
    $classIndex = $_GET['classIndex'] ?? null;

    $where = '1=1';
    $params = [];
    if ($category) { $where .= ' AND t.category = ?'; $params[] = $category; }
    if ($classIndex) { $where .= ' AND t.class_index = ?'; $params[] = $classIndex; }

    $stmt = $pdo->prepare("
        SELECT t.*,
               (SELECT COUNT(*) FROM inspection_template_items WHERE template_id = t.id) AS item_count
        FROM inspection_templates t
        WHERE $where
        ORDER BY t.is_active DESC, t.sort_order, t.label
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['sort_order'] = (int)$r['sort_order'];
        $r['is_active'] = (int)$r['is_active'];
        $r['item_count'] = (int)$r['item_count'];
    }
    tm_json(['templates' => $rows, 'count' => count($rows)]);
}

function handleGetInspectionTemplate(PDO $pdo): void {
    $id = (int)($_GET['templateId'] ?? 0);
    if (!$id) tm_error('Missing templateId');

    $stmt = $pdo->prepare("SELECT * FROM inspection_templates WHERE id = ?");
    $stmt->execute([$id]);
    $tpl = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$tpl) tm_error('Template not found', 404);

    $items = $pdo->prepare("SELECT * FROM inspection_template_items WHERE template_id = ? ORDER BY sort_order, id");
    $items->execute([$id]);
    $itemRows = $items->fetchAll(PDO::FETCH_ASSOC);
    foreach ($itemRows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['template_id'] = (int)$r['template_id'];
        $r['sort_order'] = (int)$r['sort_order'];
        $r['is_required'] = (int)$r['is_required'];
    }

    $tpl['id'] = (int)$tpl['id'];
    $tpl['is_active'] = (int)$tpl['is_active'];
    $tpl['sort_order'] = (int)$tpl['sort_order'];
    $tpl['items'] = $itemRows;
    tm_json(['template' => $tpl]);
}

function handleUpsertInspectionTemplate(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $id = isset($body['id']) ? (int)$body['id'] : null;
    $templateType = tm_optionalParam($body, 'template_type', 'general_tech');
    $category = tm_requireParam($body, 'category');
    $classIndex = tm_optionalParam($body, 'class_index', '*');
    $label = tm_requireParam($body, 'label');
    $description = tm_optionalParam($body, 'description');
    $sortOrder = tm_optionalInt($body, 'sort_order', 0);
    $seasonYear = isset($body['season_year']) ? (int)$body['season_year'] : null;
    $isActive = (int)($body['is_active'] ?? 1);

    if ($id) {
        $pdo->prepare("
            UPDATE inspection_templates
            SET template_type = ?, category = ?, class_index = ?, label = ?, description = ?,
                sort_order = ?, season_year = ?, is_active = ?
            WHERE id = ?
        ")->execute([$templateType, $category, $classIndex, $label, $description, $sortOrder, $seasonYear, $isActive, $id]);
        tm_json(['upserted' => true, 'id' => $id, 'action' => 'updated']);
    } else {
        $uuid = tm_uuid();
        $pdo->prepare("
            INSERT INTO inspection_templates (uuid, template_type, category, class_index, label, description, sort_order, season_year, is_active, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ")->execute([$uuid, $templateType, $category, $classIndex, $label, $description, $sortOrder, $seasonYear, $isActive, $userId]);
        tm_json(['upserted' => true, 'id' => (int)$pdo->lastInsertId(), 'action' => 'created'], 201);
    }
}

function handleSaveInspectionTemplateItems(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $templateId = tm_requireInt($body, 'template_id');
    $items = $body['items'] ?? [];
    if (!is_array($items)) tm_error('items must be an array');

    // Verify template exists
    $exists = $pdo->prepare("SELECT id FROM inspection_templates WHERE id = ?");
    $exists->execute([$templateId]);
    if (!$exists->fetch()) tm_error('Template not found', 404);

    $pdo->beginTransaction();
    try {
        // Delete old items
        $pdo->prepare("DELETE FROM inspection_template_items WHERE template_id = ?")->execute([$templateId]);

        // Insert new items
        $ins = $pdo->prepare("
            INSERT INTO inspection_template_items
                (template_id, item_type, label, sort_order, is_required, spec_min, spec_max, spec_unit, expected_value)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        foreach ($items as $i => $item) {
            $ins->execute([
                $templateId,
                $item['item_type'] ?? 'checkbox',
                $item['label'] ?? "Item " . ($i + 1),
                $item['sort_order'] ?? ($i + 1),
                (int)($item['is_required'] ?? 1),
                isset($item['spec_min']) ? (float)$item['spec_min'] : null,
                isset($item['spec_max']) ? (float)$item['spec_max'] : null,
                $item['spec_unit'] ?? null,
                $item['expected_value'] ?? null,
            ]);
        }
        $pdo->commit();
        tm_json(['saved' => true, 'template_id' => $templateId, 'item_count' => count($items)]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handleToggleInspectionTemplate(PDO $pdo): void {
    $body = tm_readBody();
    $id = tm_requireInt($body, 'template_id');
    $active = (int)($body['is_active'] ?? 0);

    $pdo->prepare("UPDATE inspection_templates SET is_active = ? WHERE id = ?")->execute([$active, $id]);
    $affected = $pdo->prepare("SELECT ROW_COUNT()")->fetchColumn();
    tm_json(['toggled' => true, 'template_id' => $id, 'is_active' => $active]);
}

// ═══════════════════════════════════════════════════════════════════════════
// TEARDOWN TEMPLATE ADMIN
// ═══════════════════════════════════════════════════════════════════════════

function handleListTeardownTemplates(PDO $pdo): void {
    $category = $_GET['category'] ?? null;
    $classIndex = $_GET['classIndex'] ?? null;

    $where = '1=1';
    $params = [];
    if ($category) { $where .= ' AND t.category = ?'; $params[] = $category; }
    if ($classIndex) { $where .= ' AND t.class_index = ?'; $params[] = $classIndex; }

    $stmt = $pdo->prepare("
        SELECT t.*,
               (SELECT COUNT(*) FROM teardown_template_items WHERE template_id = t.id) AS item_count
        FROM teardown_templates t
        WHERE $where
        ORDER BY t.is_active DESC, t.sort_order, t.label
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['sort_order'] = (int)$r['sort_order'];
        $r['is_active'] = (int)$r['is_active'];
        $r['item_count'] = (int)$r['item_count'];
    }
    tm_json(['templates' => $rows, 'count' => count($rows)]);
}

function handleGetTeardownTemplate(PDO $pdo): void {
    $id = (int)($_GET['templateId'] ?? 0);
    if (!$id) tm_error('Missing templateId');

    $stmt = $pdo->prepare("SELECT * FROM teardown_templates WHERE id = ?");
    $stmt->execute([$id]);
    $tpl = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$tpl) tm_error('Template not found', 404);

    $items = $pdo->prepare("SELECT * FROM teardown_template_items WHERE template_id = ? ORDER BY sort_order, id");
    $items->execute([$id]);
    $itemRows = $items->fetchAll(PDO::FETCH_ASSOC);
    foreach ($itemRows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['template_id'] = (int)$r['template_id'];
        $r['sort_order'] = (int)$r['sort_order'];
        $r['is_required'] = (int)$r['is_required'];
    }

    $tpl['id'] = (int)$tpl['id'];
    $tpl['is_active'] = (int)$tpl['is_active'];
    $tpl['sort_order'] = (int)$tpl['sort_order'];
    $tpl['items'] = $itemRows;
    tm_json(['template' => $tpl]);
}

function handleUpsertTeardownTemplate(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $id = isset($body['id']) ? (int)$body['id'] : null;
    $category = tm_requireParam($body, 'category');
    $classIndex = tm_requireParam($body, 'class_index');
    $label = tm_requireParam($body, 'label');
    $description = tm_optionalParam($body, 'description');
    $sortOrder = tm_optionalInt($body, 'sort_order', 0);
    $isActive = (int)($body['is_active'] ?? 1);

    if ($id) {
        $pdo->prepare("
            UPDATE teardown_templates
            SET category = ?, class_index = ?, label = ?, description = ?,
                sort_order = ?, is_active = ?
            WHERE id = ?
        ")->execute([$category, $classIndex, $label, $description, $sortOrder, $isActive, $id]);
        tm_json(['upserted' => true, 'id' => $id, 'action' => 'updated']);
    } else {
        $uuid = tm_uuid();
        $pdo->prepare("
            INSERT INTO teardown_templates (uuid, category, class_index, label, description, sort_order, is_active, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ")->execute([$uuid, $category, $classIndex, $label, $description, $sortOrder, $isActive, $userId]);
        tm_json(['upserted' => true, 'id' => (int)$pdo->lastInsertId(), 'action' => 'created'], 201);
    }
}

function handleSaveTeardownTemplateItems(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $templateId = tm_requireInt($body, 'template_id');
    $items = $body['items'] ?? [];
    if (!is_array($items)) tm_error('items must be an array');

    $exists = $pdo->prepare("SELECT id FROM teardown_templates WHERE id = ?");
    $exists->execute([$templateId]);
    if (!$exists->fetch()) tm_error('Template not found', 404);

    $pdo->beginTransaction();
    try {
        $pdo->prepare("DELETE FROM teardown_template_items WHERE template_id = ?")->execute([$templateId]);

        $ins = $pdo->prepare("
            INSERT INTO teardown_template_items
                (template_id, item_category, item_label, item_type, description, sort_order, is_required, spec_min, spec_max, spec_unit, declaration_key)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        foreach ($items as $i => $item) {
            $ins->execute([
                $templateId,
                $item['item_category'] ?? 'General',
                $item['item_label'] ?? "Item " . ($i + 1),
                $item['item_type'] ?? 'visual_check',
                $item['description'] ?? null,
                $item['sort_order'] ?? ($i + 1),
                (int)($item['is_required'] ?? 1),
                isset($item['spec_min']) ? (float)$item['spec_min'] : null,
                isset($item['spec_max']) ? (float)$item['spec_max'] : null,
                $item['spec_unit'] ?? null,
                $item['declaration_key'] ?? null,
            ]);
        }
        $pdo->commit();
        tm_json(['saved' => true, 'template_id' => $templateId, 'item_count' => count($items)]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handleToggleTeardownTemplate(PDO $pdo): void {
    $body = tm_readBody();
    $id = tm_requireInt($body, 'template_id');
    $active = (int)($body['is_active'] ?? 0);

    $pdo->prepare("UPDATE teardown_templates SET is_active = ? WHERE id = ?")->execute([$active, $id]);
    tm_json(['toggled' => true, 'template_id' => $id, 'is_active' => $active]);
}

// ═══════════════════════════════════════════════════════════════════════════
// SCALE RULE ADMIN
// ═══════════════════════════════════════════════════════════════════════════

function handleListScaleRules(PDO $pdo): void {
    $category = $_GET['category'] ?? null;

    $where = '1=1';
    $params = [];
    if ($category) { $where .= ' AND category = ?'; $params[] = $category; }

    $stmt = $pdo->prepare("SELECT * FROM scale_rules WHERE $where ORDER BY is_active DESC, category, class_index");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['is_active'] = (int)$r['is_active'];
        $r['rear_axle_required'] = (int)$r['rear_axle_required'];
        $r['driver_weigh_required'] = (int)$r['driver_weigh_required'];
    }
    tm_json(['rules' => $rows, 'count' => count($rows)]);
}

function handleUpsertScaleRule(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $id = isset($body['id']) ? (int)$body['id'] : null;
    $category = tm_requireParam($body, 'category');
    $classIndex = tm_requireParam($body, 'class_index');
    $seasonYear = isset($body['season_year']) ? (int)$body['season_year'] : null;
    $isActive = (int)($body['is_active'] ?? 1);

    if ($id) {
        $pdo->prepare("
            UPDATE scale_rules SET
                category = ?, class_index = ?, season_year = ?,
                min_total_weight = ?, min_rear_axle_weight = ?,
                rear_axle_required = ?, driver_weigh_required = ?,
                is_active = ?, notes = ?
            WHERE id = ?
        ")->execute([
            $category, $classIndex, $seasonYear,
            isset($body['min_total_weight']) ? (float)$body['min_total_weight'] : null,
            isset($body['min_rear_axle_weight']) ? (float)$body['min_rear_axle_weight'] : null,
            (int)($body['rear_axle_required'] ?? 0),
            (int)($body['driver_weigh_required'] ?? 0),
            $isActive,
            tm_optionalParam($body, 'notes'),
            $id,
        ]);
        tm_json(['upserted' => true, 'id' => $id, 'action' => 'updated']);
    } else {
        $pdo->prepare("
            INSERT INTO scale_rules (category, class_index, season_year, min_total_weight, min_rear_axle_weight, rear_axle_required, driver_weigh_required, is_active, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ")->execute([
            $category, $classIndex, $seasonYear,
            isset($body['min_total_weight']) ? (float)$body['min_total_weight'] : null,
            isset($body['min_rear_axle_weight']) ? (float)$body['min_rear_axle_weight'] : null,
            (int)($body['rear_axle_required'] ?? 0),
            (int)($body['driver_weigh_required'] ?? 0),
            $isActive,
            tm_optionalParam($body, 'notes'),
        ]);
        tm_json(['upserted' => true, 'id' => (int)$pdo->lastInsertId(), 'action' => 'created'], 201);
    }
}

function handleToggleScaleRule(PDO $pdo): void {
    $body = tm_readBody();
    $id = tm_requireInt($body, 'rule_id');
    $active = (int)($body['is_active'] ?? 0);

    $pdo->prepare("UPDATE scale_rules SET is_active = ? WHERE id = ?")->execute([$active, $id]);
    tm_json(['toggled' => true, 'rule_id' => $id, 'is_active' => $active]);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUEL RULE ADMIN
// ═══════════════════════════════════════════════════════════════════════════

function handleListFuelRules(PDO $pdo): void {
    $category = $_GET['category'] ?? null;

    $where = '1=1';
    $params = [];
    if ($category) { $where .= ' AND category = ?'; $params[] = $category; }

    $stmt = $pdo->prepare("SELECT * FROM fuel_rules WHERE $where ORDER BY is_active DESC, category, class_index");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['is_active'] = (int)$r['is_active'];
        $r['temperature_compensate'] = (int)$r['temperature_compensate'];
    }
    tm_json(['rules' => $rows, 'count' => count($rows)]);
}

function handleUpsertFuelRule(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $id = isset($body['id']) ? (int)$body['id'] : null;
    $category = tm_requireParam($body, 'category');
    $classIndex = tm_requireParam($body, 'class_index');
    $seasonYear = isset($body['season_year']) ? (int)$body['season_year'] : null;
    $isActive = (int)($body['is_active'] ?? 1);

    if ($id) {
        $pdo->prepare("
            UPDATE fuel_rules SET
                category = ?, class_index = ?, season_year = ?,
                fuel_type_required = ?, sg_min = ?, sg_max = ?,
                dielectric_min = ?, dielectric_max = ?,
                temperature_compensate = ?, is_active = ?, notes = ?
            WHERE id = ?
        ")->execute([
            $category, $classIndex, $seasonYear,
            tm_optionalParam($body, 'fuel_type_required'),
            isset($body['sg_min']) ? (float)$body['sg_min'] : null,
            isset($body['sg_max']) ? (float)$body['sg_max'] : null,
            isset($body['dielectric_min']) ? (float)$body['dielectric_min'] : null,
            isset($body['dielectric_max']) ? (float)$body['dielectric_max'] : null,
            (int)($body['temperature_compensate'] ?? 0),
            $isActive,
            tm_optionalParam($body, 'notes'),
            $id,
        ]);
        tm_json(['upserted' => true, 'id' => $id, 'action' => 'updated']);
    } else {
        $pdo->prepare("
            INSERT INTO fuel_rules (category, class_index, season_year, fuel_type_required, sg_min, sg_max, dielectric_min, dielectric_max, temperature_compensate, is_active, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ")->execute([
            $category, $classIndex, $seasonYear,
            tm_optionalParam($body, 'fuel_type_required'),
            isset($body['sg_min']) ? (float)$body['sg_min'] : null,
            isset($body['sg_max']) ? (float)$body['sg_max'] : null,
            isset($body['dielectric_min']) ? (float)$body['dielectric_min'] : null,
            isset($body['dielectric_max']) ? (float)$body['dielectric_max'] : null,
            (int)($body['temperature_compensate'] ?? 0),
            $isActive,
            tm_optionalParam($body, 'notes'),
        ]);
        tm_json(['upserted' => true, 'id' => (int)$pdo->lastInsertId(), 'action' => 'created'], 201);
    }
}

function handleToggleFuelRule(PDO $pdo): void {
    $body = tm_readBody();
    $id = tm_requireInt($body, 'rule_id');
    $active = (int)($body['is_active'] ?? 0);

    $pdo->prepare("UPDATE fuel_rules SET is_active = ? WHERE id = ?")->execute([$active, $id]);
    tm_json(['toggled' => true, 'rule_id' => $id, 'is_active' => $active]);
}

// ═══════════════════════════════════════════════════════════════════════════
// REQUIRED MODULE CONFIG
// ═══════════════════════════════════════════════════════════════════════════

function handleListRequiredModules(PDO $pdo): void {
    $category = $_GET['category'] ?? null;
    $classIndex = $_GET['classIndex'] ?? null;

    $where = '1=1';
    $params = [];
    if ($category) { $where .= ' AND category = ?'; $params[] = $category; }
    if ($classIndex) { $where .= ' AND class_index = ?'; $params[] = $classIndex; }

    $stmt = $pdo->prepare("SELECT * FROM required_module_config WHERE $where ORDER BY category, class_index, module_key");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['is_required'] = (int)$r['is_required'];
    }
    tm_json(['configs' => $rows, 'count' => count($rows)]);
}

function handleUpsertRequiredModule(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $category = tm_requireParam($body, 'category');
    $classIndex = tm_optionalParam($body, 'class_index', '*');
    $moduleKey = tm_requireParam($body, 'module_key');
    $context = tm_optionalParam($body, 'context', 'pre_race');
    $isRequired = (int)($body['is_required'] ?? 1);
    $notes = tm_optionalParam($body, 'notes');

    $validModules = ['scale', 'fuel', 'inspection', 'techcard', 'teardown'];
    if (!in_array($moduleKey, $validModules)) {
        tm_error("Invalid module_key. Must be one of: " . implode(', ', $validModules));
    }

    $pdo->prepare("
        INSERT INTO required_module_config (category, class_index, module_key, context, is_required, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE is_required = VALUES(is_required), notes = VALUES(notes)
    ")->execute([$category, $classIndex, $moduleKey, $context, $isRequired, $notes, $userId]);

    tm_json(['upserted' => true, 'category' => $category, 'class_index' => $classIndex, 'module_key' => $moduleKey]);
}

function handleDeleteRequiredModule(PDO $pdo): void {
    $body = tm_readBody();
    $id = tm_requireInt($body, 'config_id');

    $pdo->prepare("DELETE FROM required_module_config WHERE id = ?")->execute([$id]);
    tm_json(['deleted' => true, 'config_id' => $id]);
}

// ═══════════════════════════════════════════════════════════════════════════
// FINDINGS RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════

function handleResolveFinding(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $findingId = tm_requireInt($body, 'finding_id');
    $newDisposition = tm_requireParam($body, 'disposition');
    $notes = tm_optionalParam($body, 'notes');

    $validDispositions = ['open', 'resolved', 'deferred', 'penalized', 'waived'];
    if (!in_array($newDisposition, $validDispositions)) {
        tm_error("Invalid disposition. Must be one of: " . implode(', ', $validDispositions));
    }

    // Load current finding
    $stmt = $pdo->prepare("SELECT id, disposition FROM tech_findings WHERE id = ?");
    $stmt->execute([$findingId]);
    $finding = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$finding) tm_error('Finding not found', 404);

    $oldDisposition = $finding['disposition'];

    $pdo->beginTransaction();
    try {
        // Update finding disposition
        $resolvedAt = in_array($newDisposition, ['resolved', 'penalized', 'waived']) ? date('Y-m-d H:i:s') : null;
        $followUp = $newDisposition === 'deferred' ? 1 : 0;

        $pdo->prepare("
            UPDATE tech_findings
            SET disposition = ?, resolved_at = ?, resolved_by = ?, follow_up_required = ?, notes = COALESCE(?, notes)
            WHERE id = ?
        ")->execute([$newDisposition, $resolvedAt, $userId, $followUp, $notes, $findingId]);

        // Insert audit history
        $pdo->prepare("
            INSERT INTO finding_status_history (finding_id, old_disposition, new_disposition, notes, changed_by)
            VALUES (?, ?, ?, ?, ?)
        ")->execute([$findingId, $oldDisposition, $newDisposition, $notes, $userId]);

        $pdo->commit();
        tm_json([
            'resolved' => true,
            'finding_id' => $findingId,
            'old_disposition' => $oldDisposition,
            'new_disposition' => $newDisposition,
            'resolved_at' => $resolvedAt,
        ]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handleFindingHistory(PDO $pdo): void {
    $findingId = (int)($_GET['findingId'] ?? 0);
    if (!$findingId) tm_error('Missing findingId');

    // Get finding info
    $stmt = $pdo->prepare("
        SELECT tf.*, tc.case_type, tc.status AS case_status
        FROM tech_findings tf
        JOIN tech_cases tc ON tf.tech_case_id = tc.id
        WHERE tf.id = ?
    ");
    $stmt->execute([$findingId]);
    $finding = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$finding) tm_error('Finding not found', 404);

    $finding['id'] = (int)$finding['id'];
    $finding['tech_case_id'] = (int)$finding['tech_case_id'];
    $finding['follow_up_required'] = (int)$finding['follow_up_required'];

    // Get history
    $hist = $pdo->prepare("
        SELECT fsh.*, u.username AS changed_by_name
        FROM finding_status_history fsh
        LEFT JOIN users u ON fsh.changed_by = u.id
        WHERE fsh.finding_id = ?
        ORDER BY fsh.changed_at DESC
    ");
    $hist->execute([$findingId]);
    $history = $hist->fetchAll(PDO::FETCH_ASSOC);
    foreach ($history as &$h) {
        $h['id'] = (int)$h['id'];
        $h['finding_id'] = (int)$h['finding_id'];
        $h['changed_by'] = (int)$h['changed_by'];
    }

    tm_json(['finding' => $finding, 'history' => $history, 'history_count' => count($history)]);
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY HOLDS / ESCALATION
// ═══════════════════════════════════════════════════════════════════════════

function handleListEntryHolds(PDO $pdo): void {
    $entryId = isset($_GET['entryId']) ? (int)$_GET['entryId'] : null;
    $eventId = isset($_GET['eventInstanceId']) ? (int)$_GET['eventInstanceId'] : null;
    $activeOnly = (int)($_GET['activeOnly'] ?? 1);

    if (!$entryId && !$eventId) tm_error('Missing entryId or eventInstanceId');

    $where = [];
    $params = [];

    if ($entryId) {
        $where[] = 'eh.event_entry_id = ?';
        $params[] = $entryId;
    } elseif ($eventId) {
        $where[] = 'ee.event_instance_id = ?';
        $params[] = $eventId;
    }

    if ($activeOnly) {
        $where[] = 'eh.is_active = 1';
    }

    $whereClause = implode(' AND ', $where);

    $stmt = $pdo->prepare("
        SELECT eh.*, ee.competition_number, p.display_name AS person_name,
               u1.username AS placed_by_name, u2.username AS cleared_by_name
        FROM entry_holds eh
        JOIN event_entries ee ON eh.event_entry_id = ee.id
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN users u1 ON eh.placed_by = u1.id
        LEFT JOIN users u2 ON eh.cleared_by = u2.id
        WHERE $whereClause
        ORDER BY eh.placed_at DESC
    ");
    $stmt->execute($params);
    $holds = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($holds as &$h) {
        $h['id'] = (int)$h['id'];
        $h['event_entry_id'] = (int)$h['event_entry_id'];
        $h['placed_by'] = (int)$h['placed_by'];
        $h['cleared_by'] = $h['cleared_by'] ? (int)$h['cleared_by'] : null;
        $h['is_active'] = (int)$h['is_active'];
    }

    tm_json(['holds' => $holds, 'count' => count($holds)]);
}

function handlePlaceHold(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $entryId = tm_requireInt($body, 'entry_id');
    $holdType = tm_optionalParam($body, 'hold_type', 'tech_hold');
    $reason = tm_requireParam($body, 'reason');
    $notes = tm_optionalParam($body, 'notes');

    $validTypes = ['compliance_hold', 'tech_hold', 'escalation', 'flag'];
    if (!in_array($holdType, $validTypes)) {
        tm_error("Invalid hold_type. Must be one of: " . implode(', ', $validTypes));
    }

    // Verify entry exists
    $entryStmt = $pdo->prepare("SELECT id FROM event_entries WHERE id = ?");
    $entryStmt->execute([$entryId]);
    if (!$entryStmt->fetch()) tm_error('Entry not found', 404);

    $pdo->beginTransaction();
    try {
        // Insert hold
        $pdo->prepare("
            INSERT INTO entry_holds (event_entry_id, hold_type, reason, notes, placed_by)
            VALUES (?, ?, ?, ?, ?)
        ")->execute([$entryId, $holdType, $reason, $notes, $userId]);
        $holdId = (int)$pdo->lastInsertId();

        // Insert history
        $pdo->prepare("
            INSERT INTO entry_hold_history (entry_hold_id, action, new_reason, notes, changed_by)
            VALUES (?, 'placed', ?, ?, ?)
        ")->execute([$holdId, $reason, $notes, $userId]);

        $pdo->commit();
        tm_json(['placed' => true, 'hold_id' => $holdId, 'entry_id' => $entryId], 201);
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handleClearHold(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $holdId = tm_requireInt($body, 'hold_id');
    $notes = tm_optionalParam($body, 'notes');

    // Load hold
    $holdStmt = $pdo->prepare("SELECT id, event_entry_id, reason, is_active FROM entry_holds WHERE id = ?");
    $holdStmt->execute([$holdId]);
    $hold = $holdStmt->fetch(PDO::FETCH_ASSOC);
    if (!$hold) tm_error('Hold not found', 404);
    if (!(int)$hold['is_active']) tm_error('Hold already cleared', 400);

    $pdo->beginTransaction();
    try {
        // Clear hold
        $pdo->prepare("
            UPDATE entry_holds SET is_active = 0, cleared_by = ?, cleared_at = NOW() WHERE id = ?
        ")->execute([$userId, $holdId]);

        // Insert history
        $pdo->prepare("
            INSERT INTO entry_hold_history (entry_hold_id, action, old_reason, notes, changed_by)
            VALUES (?, 'cleared', ?, ?, ?)
        ")->execute([$holdId, $hold['reason'], $notes, $userId]);

        $pdo->commit();
        tm_json(['cleared' => true, 'hold_id' => $holdId, 'entry_id' => (int)$hold['event_entry_id']]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handleHoldHistory(PDO $pdo): void {
    $entryId = (int)($_GET['entryId'] ?? 0);
    if (!$entryId) tm_error('Missing entryId');

    // Get all holds for entry
    $holdsStmt = $pdo->prepare("
        SELECT eh.*, u1.username AS placed_by_name, u2.username AS cleared_by_name
        FROM entry_holds eh
        LEFT JOIN users u1 ON eh.placed_by = u1.id
        LEFT JOIN users u2 ON eh.cleared_by = u2.id
        WHERE eh.event_entry_id = ?
        ORDER BY eh.placed_at DESC
    ");
    $holdsStmt->execute([$entryId]);
    $holds = $holdsStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($holds as &$h) {
        $h['id'] = (int)$h['id'];
        $h['event_entry_id'] = (int)$h['event_entry_id'];
        $h['placed_by'] = (int)$h['placed_by'];
        $h['cleared_by'] = $h['cleared_by'] ? (int)$h['cleared_by'] : null;
        $h['is_active'] = (int)$h['is_active'];

        // Get history for this hold
        $histStmt = $pdo->prepare("
            SELECT ehh.*, u.username AS changed_by_name
            FROM entry_hold_history ehh
            LEFT JOIN users u ON ehh.changed_by = u.id
            WHERE ehh.entry_hold_id = ?
            ORDER BY ehh.changed_at ASC
        ");
        $histStmt->execute([$h['id']]);
        $history = $histStmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($history as &$hist) {
            $hist['id'] = (int)$hist['id'];
            $hist['entry_hold_id'] = (int)$hist['entry_hold_id'];
            $hist['changed_by'] = (int)$hist['changed_by'];
        }
        $h['history'] = $history;
    }

    tm_json(['entry_id' => $entryId, 'holds' => $holds, 'total_holds' => count($holds)]);
}
