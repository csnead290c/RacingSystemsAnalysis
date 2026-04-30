<?php
/**
 * Migration v18: Tech Master Events — event_instances + backfill + bridge FK
 *
 * Part of the NHRA Tech Master Phase 1 backbone.
 * Creates event_instances table, backfills from existing parity_events,
 * and adds nullable event_instance_id FK to parity_events.
 *
 * Safe to run multiple times (IF NOT EXISTS, column checks, INSERT IGNORE).
 * Depends on: v17 (seasons, event_types)
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

$auth = rsa_getAuthUser();
if (!$auth || !in_array($auth['role'] ?? '', ['admin', 'owner'])) {
    http_response_code(403);
    echo "Forbidden: admin role required.\n";
    exit(1);
}

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== Migration v18: Tech Master Events ===\n\n";
flush();

// ── Helper ──────────────────────────────────────────────────────────────

function addColumnIfNotExistsV18(PDO $pdo, string $table, string $column, string $definition): bool {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    ");
    $stmt->execute([$table, $column]);
    if ((int)$stmt->fetchColumn() === 0) {
        $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
        echo "   Added column: $table.$column\n";
        return true;
    } else {
        echo "   Exists: $table.$column\n";
        return false;
    }
}

function addIndexSafeV18(PDO $pdo, string $name, string $ddl): void {
    try {
        $pdo->exec($ddl);
        echo "   Added: $name\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) {
            echo "   Exists: $name\n";
        } else {
            echo "   FAILED: $name — " . $e->getMessage() . "\n";
        }
    }
}

function addFkSafeV18(PDO $pdo, string $table, string $fkName, string $ddl): void {
    // Check if FK already exists
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?
    ");
    $stmt->execute([$table, $fkName]);
    if ((int)$stmt->fetchColumn() > 0) {
        echo "   Exists: FK $fkName\n";
        return;
    }
    try {
        $pdo->exec($ddl);
        echo "   Added: FK $fkName\n";
    } catch (PDOException $e) {
        echo "   FAILED: FK $fkName — " . $e->getMessage() . "\n";
    }
}

// ── 1. event_instances ──────────────────────────────────────────────────

echo "1. Creating event_instances table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS event_instances (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            uuid             VARCHAR(36) NOT NULL,
            event_type_id    INT NOT NULL,
            season_id        INT NULL,
            track_id         INT NOT NULL,
            name             VARCHAR(255) NOT NULL,
            event_code       VARCHAR(50) NULL,
            start_date_local DATE NOT NULL,
            end_date_local   DATE NOT NULL,
            race_lookup      VARCHAR(8) NULL,
            status           ENUM('scheduled','active','completed','cancelled') NOT NULL DEFAULT 'scheduled',
            created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            UNIQUE KEY uk_ei_uuid (uuid),
            UNIQUE KEY uk_ei_race_lookup (race_lookup),
            INDEX idx_ei_season (season_id),
            INDEX idx_ei_track (track_id),
            INDEX idx_ei_type (event_type_id),
            INDEX idx_ei_dates (start_date_local, end_date_local),
            CONSTRAINT fk_ei_type FOREIGN KEY (event_type_id) REFERENCES event_types(id),
            CONSTRAINT fk_ei_season FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE SET NULL,
            CONSTRAINT fk_ei_track FOREIGN KEY (track_id) REFERENCES parity_tracks(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 2. Add event_instance_id to parity_events (bridge FK) ──────────────

echo "2. Adding event_instance_id FK to parity_events...\n";
addColumnIfNotExistsV18($pdo, 'parity_events', 'event_instance_id', 'INT NULL AFTER id');
addIndexSafeV18($pdo, 'idx_pe_ei',
    "ALTER TABLE parity_events ADD INDEX idx_pe_ei (event_instance_id)");
addFkSafeV18($pdo, 'parity_events', 'fk_pe_ei',
    "ALTER TABLE parity_events ADD CONSTRAINT fk_pe_ei FOREIGN KEY (event_instance_id) REFERENCES event_instances(id) ON DELETE SET NULL");
echo "\n";

// ── 3. One-time backfill: parity_events → event_instances ───────────────

echo "3. Backfilling event_instances from parity_events...\n";
try {
    // Get the 'national' event type id (default for all backfilled events)
    $stmt = $pdo->query("SELECT id FROM event_types WHERE code = 'national' LIMIT 1");
    $nationalTypeId = (int)$stmt->fetchColumn();
    if (!$nationalTypeId) {
        echo "   ERROR: event_types 'national' not found — run v17 first.\n\n";
    } else {
        // Find parity_events that don't yet have an event_instance_id
        $stmt = $pdo->query("
            SELECT pe.id, pe.event_name, pe.season_year, pe.track_id,
                   pe.start_date_local, pe.end_date_local, pe.race_lookup, pe.event_code
            FROM parity_events pe
            WHERE pe.event_instance_id IS NULL
            ORDER BY pe.id
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $inserted = 0;
        $linked = 0;

        $insertEi = $pdo->prepare("
            INSERT IGNORE INTO event_instances
                (uuid, event_type_id, season_id, track_id, name, event_code, start_date_local, end_date_local, race_lookup, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $linkPe = $pdo->prepare("UPDATE parity_events SET event_instance_id = ? WHERE id = ?");

        foreach ($rows as $pe) {
            $uuid = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
                mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
                mt_rand(0, 0x0fff) | 0x4000,
                mt_rand(0, 0x3fff) | 0x8000,
                mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
            );

            // Resolve season_id from season_year
            $seasonId = null;
            if ($pe['season_year']) {
                $s = $pdo->prepare("SELECT id FROM seasons WHERE year = ?");
                $s->execute([(int)$pe['season_year']]);
                $seasonId = $s->fetchColumn() ?: null;
            }

            // Determine status
            $endDate = $pe['end_date_local'] ?? $pe['start_date_local'];
            $status = (strtotime($endDate) < time()) ? 'completed' : 'scheduled';

            $insertEi->execute([
                $uuid,
                $nationalTypeId,
                $seasonId,
                (int)$pe['track_id'],
                $pe['event_name'],
                $pe['event_code'] ?? null,
                $pe['start_date_local'],
                $endDate,
                $pe['race_lookup'],
                $status,
            ]);

            if ($insertEi->rowCount() > 0) {
                $inserted++;
                $eiId = (int)$pdo->lastInsertId();
            } else {
                // Already existed (race_lookup match) — look it up
                $lookup = $pdo->prepare("SELECT id FROM event_instances WHERE race_lookup = ?");
                $lookup->execute([$pe['race_lookup']]);
                $eiId = (int)$lookup->fetchColumn();
            }

            if ($eiId) {
                $linkPe->execute([$eiId, (int)$pe['id']]);
                $linked++;
            }
        }

        echo "   Backfilled: $inserted new event_instances, $linked parity_events linked\n\n";
    }
} catch (PDOException $e) {
    echo "   Backfill error: " . $e->getMessage() . "\n\n";
}

echo "=== Migration v18 Complete ===\n";
echo "Tables: event_instances\n";
echo "Bridge: parity_events.event_instance_id FK added + backfilled\n";
