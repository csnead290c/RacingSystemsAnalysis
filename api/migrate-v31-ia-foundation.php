<?php
/**
 * Migration v31: Incident Analyzer Workspace Foundation
 *
 * Creates:
 *   1. incident_analysis_processed_sessions — canonical normalized session payloads
 *   2. incident_analysis_workspaces         — saved workspace layouts (plots, channels, zoom)
 *   3. incident_analysis_bookmarks          — time-based annotations and notes
 *   4. Extends incident_analysis_channels   — adds channel_key and channel_group
 *
 * Safe to run multiple times (IF NOT EXISTS, ADD COLUMN IF NOT EXISTS).
 *
 * MUST BE RUN after deploying Incident Analyzer Workspace Foundation.
 * Requires admin/owner auth token in Authorization header.
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

// Admin gate
$auth = rsa_getAuthUser();
if (!$auth || !in_array($auth['role'] ?? '', ['admin', 'owner'])) {
    http_response_code(403);
    echo "Forbidden: admin role required.\n";
    exit(1);
}

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== Migration v31: Incident Analyzer Workspace Foundation ===\n\n";
flush();

// ── 1. incident_analysis_processed_sessions ───────────────────────────────

echo "── incident_analysis_processed_sessions ──\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS incident_analysis_processed_sessions (
            id                    INT AUTO_INCREMENT PRIMARY KEY,
            session_id            INT NOT NULL,
            title                 VARCHAR(255) NOT NULL,
            source_type           VARCHAR(50) NOT NULL DEFAULT 'csv' COMMENT 'csv | motec | racepak | aim',
            processed_file_path   VARCHAR(1024) NOT NULL COMMENT 'Path to gzipped JSON payload',
            processed_status      ENUM('pending','processing','ready','failed') NOT NULL DEFAULT 'pending',
            duration_seconds      DOUBLE NULL DEFAULT NULL,
            sample_count          INT UNSIGNED NULL DEFAULT NULL,
            channel_count         INT UNSIGNED NULL DEFAULT NULL,
            metadata_json         JSON NULL DEFAULT NULL COMMENT 'Parse warnings, source file info, etc.',
            created_by            INT NOT NULL,
            created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_iaps_session (session_id),
            INDEX idx_iaps_status (processed_status),
            CONSTRAINT fk_iaps_session FOREIGN KEY (session_id) REFERENCES incident_analysis_sessions(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "  Table incident_analysis_processed_sessions created\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'already exists') !== false) {
        echo "  Table incident_analysis_processed_sessions already exists\n";
    } else {
        throw $e;
    }
}

// ── 2. incident_analysis_workspaces ───────────────────────────────────────

echo "\n── incident_analysis_workspaces ──\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS incident_analysis_workspaces (
            id                    INT AUTO_INCREMENT PRIMARY KEY,
            session_id            INT NOT NULL,
            name                  VARCHAR(255) NOT NULL,
            description           TEXT NULL DEFAULT NULL,
            layout_json           JSON NOT NULL COMMENT 'plots[], visible_channels[], zoom_range, bookmarks_visible, derived_channels[], etc.',
            is_default            TINYINT(1) NOT NULL DEFAULT 0,
            created_by            INT NOT NULL,
            created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_iaw_session (session_id),
            INDEX idx_iaw_default (is_default),
            CONSTRAINT fk_iaw_session FOREIGN KEY (session_id) REFERENCES incident_analysis_sessions(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "  Table incident_analysis_workspaces created\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'already exists') !== false) {
        echo "  Table incident_analysis_workspaces already exists\n";
    } else {
        throw $e;
    }
}

// ── 3. incident_analysis_bookmarks ────────────────────────────────────────

echo "\n── incident_analysis_bookmarks ──\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS incident_analysis_bookmarks (
            id                    INT AUTO_INCREMENT PRIMARY KEY,
            session_id            INT NOT NULL,
            workspace_id          INT NULL DEFAULT NULL COMMENT 'Optional: associate with specific workspace',
            time_sec              DOUBLE NOT NULL COMMENT 'Bookmark time in seconds',
            end_time_sec          DOUBLE NULL DEFAULT NULL COMMENT 'For range bookmarks',
            label                 VARCHAR(255) NOT NULL,
            note                  TEXT NULL DEFAULT NULL,
            color                 VARCHAR(20) NULL DEFAULT NULL COMMENT 'Hex color for bookmark marker',
            created_by            INT NOT NULL,
            created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_iab_session (session_id),
            INDEX idx_iab_workspace (workspace_id),
            INDEX idx_iab_time (time_sec),
            CONSTRAINT fk_iab_session FOREIGN KEY (session_id) REFERENCES incident_analysis_sessions(id) ON DELETE CASCADE,
            CONSTRAINT fk_iab_workspace FOREIGN KEY (workspace_id) REFERENCES incident_analysis_workspaces(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "  Table incident_analysis_bookmarks created\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'already exists') !== false) {
        echo "  Table incident_analysis_bookmarks already exists\n";
    } else {
        throw $e;
    }
}

// ── 4. Extend incident_analysis_channels ──────────────────────────────────

echo "\n── Extend incident_analysis_channels ──\n";

// Add channel_key column
try {
    $pdo->exec("
        ALTER TABLE incident_analysis_channels
        ADD COLUMN channel_key VARCHAR(100) NULL DEFAULT NULL COMMENT 'Stable machine key (e.g., rpm, throttle_pos)'
        AFTER name
    ");
    echo "  Added column: channel_key\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column') !== false) {
        echo "  Column channel_key already exists\n";
    } else {
        throw $e;
    }
}

// Add channel_group column
try {
    $pdo->exec("
        ALTER TABLE incident_analysis_channels
        ADD COLUMN channel_group VARCHAR(50) NULL DEFAULT NULL COMMENT 'engine | chassis | driver_input | race_control | weather | derived'
        AFTER channel_key
    ");
    echo "  Added column: channel_group\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column') !== false) {
        echo "  Column channel_group already exists\n";
    } else {
        throw $e;
    }
}

// Add index on channel_key for faster lookups
try {
    $pdo->exec("
        ALTER TABLE incident_analysis_channels
        ADD INDEX idx_iac_key (channel_key)
    ");
    echo "  Added index: idx_iac_key\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate key') !== false || strpos($e->getMessage(), 'already exists') !== false) {
        echo "  Index idx_iac_key already exists\n";
    } else {
        throw $e;
    }
}

// Add index on channel_group for filtering
try {
    $pdo->exec("
        ALTER TABLE incident_analysis_channels
        ADD INDEX idx_iac_group (channel_group)
    ");
    echo "  Added index: idx_iac_group\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate key') !== false || strpos($e->getMessage(), 'already exists') !== false) {
        echo "  Index idx_iac_group already exists\n";
    } else {
        throw $e;
    }
}

// ── Ensure processed directory exists ─────────────────────────────────────

$processedDir = __DIR__ . '/../uploads/incident_analysis/processed';
if (!is_dir($processedDir)) {
    mkdir($processedDir, 0755, true);
    echo "\n  Created processed sessions directory: $processedDir\n";
} else {
    echo "\n  Processed sessions directory already exists: $processedDir\n";
}

echo "\n=== Migration v31 complete ===\n";
echo "\nNext steps:\n";
echo "1. Deploy updated api/incident-analysis.php with new endpoints\n";
echo "2. Deploy updated frontend with workspace UI\n";
echo "3. Test session processing pipeline\n";
echo "4. Verify workspace save/load\n";
echo "5. Test bookmark creation\n";
