<?php
/**
 * Migration v15: Run Incidents foundation tables
 *
 * Creates:
 *   1. incident_types     — catalog of incident kinds (crash, explosion, record, etc.)
 *   2. run_incidents       — incidents linked to parity_runs
 *   3. incident_media      — photos/videos attached to an incident
 *   4. incident_links      — cross-references (other runs, news articles, etc.)
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

echo "=== Migration v15: Run Incidents ===\n\n";
flush();

// ── 1. incident_types ────────────────────────────────────────────────────

echo "── incident_types ──\n";
$pdo->exec("
    CREATE TABLE IF NOT EXISTS incident_types (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        `key`       VARCHAR(50)  NOT NULL UNIQUE,
        label       VARCHAR(120) NOT NULL,
        severity_min TINYINT UNSIGNED NULL DEFAULT NULL,
        severity_max TINYINT UNSIGNED NULL DEFAULT NULL,
        sort_order  SMALLINT NOT NULL DEFAULT 0,
        is_active   TINYINT(1) NOT NULL DEFAULT 1,
        created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
echo "  Table incident_types OK\n";

// Seed default types (idempotent via INSERT IGNORE on unique key)
$seeds = [
    ['crash',           'Crash / Wreck',        3, 5, 10],
    ['fire',            'Fire',                  3, 5, 20],
    ['explosion',       'Explosion',             4, 5, 30],
    ['mechanical',      'Mechanical Failure',    2, 4, 40],
    ['tire_failure',    'Tire Failure',          2, 4, 50],
    ['oil_down',        'Oil Down',              1, 3, 60],
    ['red_light',       'Red Light / Foul',      1, 1, 70],
    ['record',          'Track / National Record',0, 0, 80],
    ['protest',         'Protest / Tech Issue',  1, 2, 90],
    ['weather_delay',   'Weather Delay',         1, 2, 100],
    ['other',           'Other',                 1, 5, 999],
];
$seedStmt = $pdo->prepare("
    INSERT IGNORE INTO incident_types (`key`, label, severity_min, severity_max, sort_order)
    VALUES (?, ?, ?, ?, ?)
");
foreach ($seeds as $s) {
    $seedStmt->execute($s);
}
echo "  Seeded " . count($seeds) . " default incident types (INSERT IGNORE)\n";

// ── 2. run_incidents ─────────────────────────────────────────────────────

echo "\n── run_incidents ──\n";
$pdo->exec("
    CREATE TABLE IF NOT EXISTS run_incidents (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        run_id           INT NOT NULL,
        incident_type_id INT NOT NULL,
        occurred_at_utc  DATETIME NULL DEFAULT NULL,
        lane             VARCHAR(10) NULL DEFAULT NULL,
        track_segment    VARCHAR(50) NULL DEFAULT NULL,
        severity         TINYINT UNSIGNED NULL DEFAULT NULL,
        summary          VARCHAR(500) NOT NULL DEFAULT '',
        details          TEXT NULL,
        created_by       INT NOT NULL,
        created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by       INT NULL DEFAULT NULL,
        updated_at       TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ri_run (run_id),
        INDEX idx_ri_created_by (created_by),
        CONSTRAINT fk_ri_run FOREIGN KEY (run_id) REFERENCES parity_runs(id) ON DELETE CASCADE,
        CONSTRAINT fk_ri_type FOREIGN KEY (incident_type_id) REFERENCES incident_types(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
echo "  Table run_incidents OK\n";

// ── 3. incident_media ────────────────────────────────────────────────────

echo "\n── incident_media ──\n";
$pdo->exec("
    CREATE TABLE IF NOT EXISTS incident_media (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        incident_id  INT NOT NULL,
        kind         VARCHAR(30) NOT NULL DEFAULT 'photo',
        url_or_key   VARCHAR(1024) NOT NULL,
        caption      VARCHAR(500) NULL DEFAULT NULL,
        created_by   INT NOT NULL,
        created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_im_incident (incident_id),
        CONSTRAINT fk_im_incident FOREIGN KEY (incident_id) REFERENCES run_incidents(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
echo "  Table incident_media OK\n";

// ── 4. incident_links ────────────────────────────────────────────────────

echo "\n── incident_links ──\n";
$pdo->exec("
    CREATE TABLE IF NOT EXISTS incident_links (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        incident_id  INT NOT NULL,
        link_type    VARCHAR(50) NOT NULL DEFAULT 'url',
        ref          VARCHAR(1024) NOT NULL,
        meta_json    JSON NULL DEFAULT NULL,
        created_by   INT NOT NULL,
        created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_il_incident (incident_id),
        CONSTRAINT fk_il_incident FOREIGN KEY (incident_id) REFERENCES run_incidents(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
echo "  Table incident_links OK\n";

echo "\n=== Migration v15 complete ===\n";
