<?php
/**
 * Engines API — DB-backed engine library with versioning
 *
 * Endpoints:
 *   GET    /engines.php              — list user's engines (+ current revision summary)
 *   GET    /engines.php?id=UUID      — get engine + specific or latest revision
 *   GET    /engines.php?id=UUID&rev=N — get engine + pinned revision N
 *   POST   /engines.php              — create new engine (Save As) + first revision
 *   PUT    /engines.php?id=UUID      — create new revision on existing engine (Save)
 *   DELETE /engines.php?id=UUID      — delete engine + all revisions
 *
 * Capability: library.save.engine (basic+)
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/capabilities.php';
rsa_setCorsHeaders();

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$auth = rsa_getAuthUser();

switch ($method) {
    case 'GET':
        handleGet($pdo, $auth);
        break;
    case 'POST':
        handlePost($pdo, $auth);
        break;
    case 'PUT':
        handlePut($pdo, $auth);
        break;
    case 'DELETE':
        handleDelete($pdo, $auth);
        break;
    default:
        rsa_jsonResponse(['error' => 'Method not allowed'], 405);
}

// ── GET ─────────────────────────────────────────────────────────────────

function handleGet($pdo, $auth) {
    $uuid = $_GET['id'] ?? null;

    if ($uuid) {
        // Single engine + revision
        $rev = isset($_GET['rev']) ? (int)$_GET['rev'] : null;
        $engine = getEngineByUuid($pdo, $uuid, $auth);
        if (!$engine) {
            rsa_jsonResponse(['error' => 'Engine not found'], 404);
        }

        $revisionRow = getRevision($pdo, $engine['id'], $rev);
        if (!$revisionRow) {
            rsa_jsonResponse(['error' => 'Revision not found'], 404);
        }

        rsa_jsonResponse([
            'engine' => formatEngine($engine, $revisionRow),
        ]);
    } else {
        // List all user's engines with current revision summary
        if (!$auth) {
            rsa_jsonResponse(['error' => 'Unauthorized'], 401);
        }
        $userId = rsa_resolveUserId($pdo, $auth);

        $stmt = $pdo->prepare("
            SELECT e.*, er.peak_hp, er.rpm_at_peak_hp, er.displacement_cid,
                   er.hp_curve, er.peak_torque, er.rpm_at_peak_torque,
                   er.fuel_type, er.engine_sim_config, er.engine_sim_doc_id, er.notes as rev_notes
            FROM engines e
            JOIN engine_revisions er ON er.engine_id = e.id AND er.revision = e.current_revision
            WHERE e.user_id = ?
            ORDER BY e.updated_at DESC
        ");
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $engines = array_map(function($row) {
            return formatEngineFromJoin($row);
        }, $rows);

        rsa_jsonResponse(['engines' => $engines]);
    }
}

// ── POST (Save As — new engine + first revision) ───────────────────────

function handlePost($pdo, $auth) {
    if (!$auth) {
        rsa_jsonResponse(['error' => 'Unauthorized'], 401);
    }
    $userId = rsa_resolveUserId($pdo, $auth);
    $role = rsa_getUserRole($pdo, $userId);
    rsa_requireCapability($pdo, $userId, $role, 'library.save.engine');

    $input = rsa_getJsonInput();
    $name = trim($input['name'] ?? '');
    if (!$name) {
        rsa_jsonResponse(['error' => 'Engine name required'], 400);
    }

    $peakHp = $input['peak_hp'] ?? null;
    $rpmAtPeakHp = $input['rpm_at_peak_hp'] ?? null;
    if ($peakHp === null || $rpmAtPeakHp === null) {
        rsa_jsonResponse(['error' => 'peak_hp and rpm_at_peak_hp required'], 400);
    }

    $source = $input['source'] ?? 'enginePro';
    $scope = $input['scope'] ?? 'personal';

    $uuid = generateEngineUUID();

    $pdo->beginTransaction();
    try {
        // Create engine
        $stmt = $pdo->prepare("
            INSERT INTO engines (uuid, user_id, name, source, scope, current_revision)
            VALUES (?, ?, ?, ?, ?, 1)
        ");
        $stmt->execute([$uuid, $userId, $name, $source, $scope]);
        $engineId = (int)$pdo->lastInsertId();

        // Create first revision
        $revId = insertRevision($pdo, $engineId, 1, $input);

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        rsa_jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }

    // Fetch back for response
    $engine = getEngineById($pdo, $engineId);
    $revisionRow = getRevision($pdo, $engineId, 1);

    rsa_jsonResponse([
        'success' => true,
        'engine' => formatEngine($engine, $revisionRow),
    ], 201);
}

// ── PUT (Save — new revision on existing engine) ────────────────────────

function handlePut($pdo, $auth) {
    if (!$auth) {
        rsa_jsonResponse(['error' => 'Unauthorized'], 401);
    }
    $userId = rsa_resolveUserId($pdo, $auth);
    $role = rsa_getUserRole($pdo, $userId);
    rsa_requireCapability($pdo, $userId, $role, 'library.save.engine');

    $uuid = $_GET['id'] ?? null;
    if (!$uuid) {
        rsa_jsonResponse(['error' => 'Engine ID required'], 400);
    }

    $engine = getEngineByUuid($pdo, $uuid, $auth);
    if (!$engine) {
        rsa_jsonResponse(['error' => 'Engine not found'], 404);
    }

    // Only owner or admin can update
    if ($engine['user_id'] != $userId) {
        $authRole = rsa_getUserRole($pdo, $userId);
        if (!in_array($authRole, ['owner', 'admin'])) {
            rsa_jsonResponse(['error' => 'Permission denied'], 403);
        }
    }

    $input = rsa_getJsonInput();
    $newName = trim($input['name'] ?? '');
    $newRevision = $engine['current_revision'] + 1;

    $pdo->beginTransaction();
    try {
        // Create new revision
        insertRevision($pdo, $engine['id'], $newRevision, $input);

        // Update engine header
        $updateFields = ['current_revision = ?'];
        $updateParams = [$newRevision];

        if ($newName) {
            $updateFields[] = 'name = ?';
            $updateParams[] = $newName;
        }
        if (isset($input['source'])) {
            $updateFields[] = 'source = ?';
            $updateParams[] = $input['source'];
        }

        $updateParams[] = $engine['id'];
        $pdo->prepare("UPDATE engines SET " . implode(', ', $updateFields) . " WHERE id = ?")
            ->execute($updateParams);

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        rsa_jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }

    // Fetch back
    $engine = getEngineById($pdo, $engine['id']);
    $revisionRow = getRevision($pdo, $engine['id'], $newRevision);

    rsa_jsonResponse([
        'success' => true,
        'engine' => formatEngine($engine, $revisionRow),
    ]);
}

// ── DELETE ───────────────────────────────────────────────────────────────

function handleDelete($pdo, $auth) {
    if (!$auth) {
        rsa_jsonResponse(['error' => 'Unauthorized'], 401);
    }
    $userId = rsa_resolveUserId($pdo, $auth);
    $role = rsa_getUserRole($pdo, $userId);
    rsa_requireCapability($pdo, $userId, $role, 'library.save.engine');

    $uuid = $_GET['id'] ?? null;
    if (!$uuid) {
        rsa_jsonResponse(['error' => 'Engine ID required'], 400);
    }

    $engine = getEngineByUuid($pdo, $uuid, $auth);
    if (!$engine) {
        rsa_jsonResponse(['error' => 'Engine not found'], 404);
    }

    // Only owner or admin can delete
    if ($engine['user_id'] != $userId) {
        if (!in_array($role, ['owner', 'admin'])) {
            rsa_jsonResponse(['error' => 'Permission denied'], 403);
        }
    }

    // CASCADE will delete revisions
    $stmt = $pdo->prepare("DELETE FROM engines WHERE id = ?");
    $stmt->execute([$engine['id']]);

    rsa_jsonResponse(['success' => true]);
}

// ── Helpers ─────────────────────────────────────────────────────────────

function generateEngineUUID(): string {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

function getEngineByUuid($pdo, string $uuid, $auth): ?array {
    $stmt = $pdo->prepare("SELECT * FROM engines WHERE uuid = ?");
    $stmt->execute([$uuid]);
    $engine = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$engine) return null;

    // Access check: own engines, or admin/owner
    if ($auth) {
        $userId = is_numeric($auth['user_id']) ? (int)$auth['user_id'] : null;
        if ($userId === null) {
            // Clerk user — resolve
            try {
                $userId = rsa_resolveUserId($pdo, $auth);
            } catch (Exception $e) {
                return null;
            }
        }
        $role = rsa_getUserRole($pdo, $userId);
        if ($engine['user_id'] != $userId && !in_array($role, ['owner', 'admin'])) {
            return null;
        }
    }

    return $engine;
}

function getEngineById($pdo, int $id): ?array {
    $stmt = $pdo->prepare("SELECT * FROM engines WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

function getRevision($pdo, int $engineId, ?int $revision): ?array {
    if ($revision !== null) {
        $stmt = $pdo->prepare("SELECT * FROM engine_revisions WHERE engine_id = ? AND revision = ?");
        $stmt->execute([$engineId, $revision]);
    } else {
        // Latest
        $stmt = $pdo->prepare("SELECT * FROM engine_revisions WHERE engine_id = ? ORDER BY revision DESC LIMIT 1");
        $stmt->execute([$engineId]);
    }
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

function insertRevision($pdo, int $engineId, int $revision, array $input): int {
    $stmt = $pdo->prepare("
        INSERT INTO engine_revisions
            (engine_id, revision, peak_hp, rpm_at_peak_hp, peak_torque, rpm_at_peak_torque,
             displacement_cid, fuel_type, hp_curve, engine_sim_config, engine_sim_doc_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $engineId,
        $revision,
        $input['peak_hp'],
        $input['rpm_at_peak_hp'],
        $input['peak_torque'] ?? null,
        $input['rpm_at_peak_torque'] ?? null,
        $input['displacement_cid'] ?? null,
        $input['fuel_type'] ?? null,
        isset($input['hp_curve']) ? json_encode($input['hp_curve']) : null,
        isset($input['engine_sim_config']) ? json_encode($input['engine_sim_config']) : null,
        $input['engine_sim_doc_id'] ?? null,
        $input['notes'] ?? null,
    ]);
    return (int)$pdo->lastInsertId();
}

function formatEngine(array $engine, array $revision): array {
    return [
        'id' => $engine['uuid'],
        'name' => $engine['name'],
        'source' => $engine['source'],
        'scope' => $engine['scope'],
        'current_revision' => (int)$engine['current_revision'],
        'revision' => (int)$revision['revision'],
        'peak_hp' => (float)$revision['peak_hp'],
        'rpm_at_peak_hp' => (int)$revision['rpm_at_peak_hp'],
        'peak_torque' => $revision['peak_torque'] !== null ? (float)$revision['peak_torque'] : null,
        'rpm_at_peak_torque' => $revision['rpm_at_peak_torque'] !== null ? (int)$revision['rpm_at_peak_torque'] : null,
        'displacement_cid' => $revision['displacement_cid'] !== null ? (float)$revision['displacement_cid'] : null,
        'fuel_type' => $revision['fuel_type'],
        'hp_curve' => $revision['hp_curve'] ? json_decode($revision['hp_curve'], true) : null,
        'engine_sim_config' => $revision['engine_sim_config'] ? json_decode($revision['engine_sim_config'], true) : null,
        'engine_sim_doc_id' => $revision['engine_sim_doc_id'],
        'notes' => $revision['notes'],
        'created_at' => $engine['created_at'],
        'updated_at' => $engine['updated_at'],
        'revision_created_at' => $revision['created_at'],
    ];
}

function formatEngineFromJoin(array $row): array {
    return [
        'id' => $row['uuid'],
        'name' => $row['name'],
        'source' => $row['source'],
        'scope' => $row['scope'],
        'current_revision' => (int)$row['current_revision'],
        'revision' => (int)$row['current_revision'],
        'peak_hp' => (float)$row['peak_hp'],
        'rpm_at_peak_hp' => (int)$row['rpm_at_peak_hp'],
        'peak_torque' => $row['peak_torque'] !== null ? (float)$row['peak_torque'] : null,
        'rpm_at_peak_torque' => $row['rpm_at_peak_torque'] !== null ? (int)$row['rpm_at_peak_torque'] : null,
        'displacement_cid' => $row['displacement_cid'] !== null ? (float)$row['displacement_cid'] : null,
        'fuel_type' => $row['fuel_type'],
        'hp_curve' => $row['hp_curve'] ? json_decode($row['hp_curve'], true) : null,
        'engine_sim_config' => $row['engine_sim_config'] ? json_decode($row['engine_sim_config'], true) : null,
        'engine_sim_doc_id' => $row['engine_sim_doc_id'],
        'notes' => $row['rev_notes'] ?? null,
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
    ];
}
