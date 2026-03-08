<?php
/**
 * Migration v16: Incident Analysis tables
 *
 * Creates:
 *   1. incident_analysis_sessions   — one per incident, saves analysis layout/state
 *   2. incident_analysis_datasets   — uploaded telemetry files linked to a session
 *   3. incident_analysis_channels   — parsed channel metadata per dataset
 *   4. incident_analysis_videos     — video file references per session
 *   5. incident_analysis_measurements — cursor measurements (time deltas, value deltas)
 *
 * Safe to run multiple times (IF NOT EXISTS).
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

echo "=== Migration v16: Incident Analysis ===\n\n";
flush();

// ── 1. incident_analysis_sessions ─────────────────────────────────────────

echo "── incident_analysis_sessions ──\n";
$pdo->exec("
    CREATE TABLE IF NOT EXISTS incident_analysis_sessions (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        incident_id   INT NOT NULL,
        layout_json   JSON NULL DEFAULT NULL COMMENT 'Saved UI layout: visible channels, chart config, video positions, zoom range',
        created_by    INT NOT NULL,
        created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by    INT NULL DEFAULT NULL,
        updated_at    TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ias_incident (incident_id),
        CONSTRAINT fk_ias_incident FOREIGN KEY (incident_id) REFERENCES run_incidents(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
echo "  Table incident_analysis_sessions OK\n";

// ── 2. incident_analysis_datasets ─────────────────────────────────────────

echo "\n── incident_analysis_datasets ──\n";
$pdo->exec("
    CREATE TABLE IF NOT EXISTS incident_analysis_datasets (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        session_id    INT NOT NULL,
        name          VARCHAR(255) NOT NULL COMMENT 'Display name (usually filename)',
        file_path     VARCHAR(1024) NOT NULL COMMENT 'Server-side path to raw file',
        file_size     INT UNSIGNED NOT NULL DEFAULT 0,
        file_mime     VARCHAR(100) NULL DEFAULT NULL,
        time_column   VARCHAR(100) NULL DEFAULT NULL COMMENT 'Detected or user-specified time column name',
        time_unit     VARCHAR(20) NOT NULL DEFAULT 'seconds' COMMENT 'seconds | milliseconds | minutes',
        time_offset   DOUBLE NOT NULL DEFAULT 0.0 COMMENT 'Manual offset in seconds applied to this dataset',
        sample_count  INT UNSIGNED NOT NULL DEFAULT 0,
        time_min      DOUBLE NULL DEFAULT NULL COMMENT 'Min time value (after unit normalization)',
        time_max      DOUBLE NULL DEFAULT NULL COMMENT 'Max time value (after unit normalization)',
        color         VARCHAR(20) NULL DEFAULT NULL COMMENT 'Dataset accent color for UI',
        created_by    INT NOT NULL,
        created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_iad_session (session_id),
        CONSTRAINT fk_iad_session FOREIGN KEY (session_id) REFERENCES incident_analysis_sessions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
echo "  Table incident_analysis_datasets OK\n";

// ── 3. incident_analysis_channels ─────────────────────────────────────────

echo "\n── incident_analysis_channels ──\n";
$pdo->exec("
    CREATE TABLE IF NOT EXISTS incident_analysis_channels (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        dataset_id    INT NOT NULL,
        name          VARCHAR(255) NOT NULL COMMENT 'Channel name from CSV header or user-defined',
        unit          VARCHAR(50) NULL DEFAULT NULL COMMENT 'Engineering unit if known',
        source        VARCHAR(20) NOT NULL DEFAULT 'imported' COMMENT 'imported | derived',
        expression    VARCHAR(1024) NULL DEFAULT NULL COMMENT 'For derived channels: safe math expression',
        sample_count  INT UNSIGNED NOT NULL DEFAULT 0,
        min_value     DOUBLE NULL DEFAULT NULL,
        max_value     DOUBLE NULL DEFAULT NULL,
        mean_value    DOUBLE NULL DEFAULT NULL,
        color         VARCHAR(20) NULL DEFAULT NULL COMMENT 'Channel line color for chart',
        visible       TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether shown in chart by default',
        sort_order    SMALLINT NOT NULL DEFAULT 0,
        INDEX idx_iac_dataset (dataset_id),
        CONSTRAINT fk_iac_dataset FOREIGN KEY (dataset_id) REFERENCES incident_analysis_datasets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
echo "  Table incident_analysis_channels OK\n";

// ── 4. incident_analysis_videos ───────────────────────────────────────────

echo "\n── incident_analysis_videos ──\n";
$pdo->exec("
    CREATE TABLE IF NOT EXISTS incident_analysis_videos (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        session_id    INT NOT NULL,
        name          VARCHAR(255) NOT NULL COMMENT 'Display name',
        file_path     VARCHAR(1024) NOT NULL COMMENT 'Server-side path to video file',
        file_size     INT UNSIGNED NOT NULL DEFAULT 0,
        file_mime     VARCHAR(100) NULL DEFAULT NULL,
        duration      DOUBLE NULL DEFAULT NULL COMMENT 'Duration in seconds if known',
        time_offset   DOUBLE NOT NULL DEFAULT 0.0 COMMENT 'Manual offset in seconds for sync',
        created_by    INT NOT NULL,
        created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_iav_session (session_id),
        CONSTRAINT fk_iav_session FOREIGN KEY (session_id) REFERENCES incident_analysis_sessions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
echo "  Table incident_analysis_videos OK\n";

// ── 5. incident_analysis_measurements ─────────────────────────────────────

echo "\n── incident_analysis_measurements ──\n";
$pdo->exec("
    CREATE TABLE IF NOT EXISTS incident_analysis_measurements (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        session_id    INT NOT NULL,
        label         VARCHAR(255) NULL DEFAULT NULL COMMENT 'User-given name for this measurement',
        t1            DOUBLE NOT NULL COMMENT 'Start time (seconds)',
        t2            DOUBLE NOT NULL COMMENT 'End time (seconds)',
        channel_id    INT NULL DEFAULT NULL COMMENT 'Optional: channel for value delta',
        delta_time    DOUBLE GENERATED ALWAYS AS (t2 - t1) STORED COMMENT 'Time delta in seconds',
        notes         TEXT NULL DEFAULT NULL,
        created_by    INT NOT NULL,
        created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_iam_session (session_id),
        CONSTRAINT fk_iam_session FOREIGN KEY (session_id) REFERENCES incident_analysis_sessions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
echo "  Table incident_analysis_measurements OK\n";

// ── Ensure uploads directory exists ───────────────────────────────────────

$uploadDir = __DIR__ . '/../uploads/incident_analysis';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
    echo "\n  Created uploads directory: $uploadDir\n";
} else {
    echo "\n  Uploads directory already exists: $uploadDir\n";
}

// .htaccess to prevent direct access to uploads
$htaccess = $uploadDir . '/.htaccess';
if (!file_exists($htaccess)) {
    file_put_contents($htaccess, "Deny from all\n");
    echo "  Created .htaccess in uploads directory\n";
}

echo "\n=== Migration v16 complete ===\n";
