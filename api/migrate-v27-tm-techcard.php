<?php
/**
 * Migration v27 — Tech Card Audit Foundation
 *
 * Creates 3 tables:
 *   1. techcard_declarations    — declaration header per event entry
 *   2. techcard_declaration_fields — normalized field/value pairs
 *   3. techcard_artifacts       — file metadata for card scans/photos
 *
 * Seeds a first-pass declaration field template for common categories.
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/tm-helpers.php';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Auth: CLI skips web auth; web requires admin
if (php_sapi_name() !== 'cli') {
    $auth = rsa_requireAuth();
    tm_requireAdmin($pdo, $auth);
}

$results = [];

// ── 1. techcard_declarations ────────────────────────────────────────────

$pdo->exec("
    CREATE TABLE IF NOT EXISTS techcard_declarations (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        uuid            VARCHAR(36)  NOT NULL,
        event_entry_id  INT          NOT NULL,
        tech_case_id    INT          NULL,
        card_status     ENUM('missing','uploaded','under_review','audited','discrepancy_found','closed') NOT NULL DEFAULT 'missing',
        card_type       VARCHAR(100) NULL,
        category        VARCHAR(100) NULL,
        class_index     VARCHAR(50)  NULL,
        revision        INT          NOT NULL DEFAULT 1,
        received_at     TIMESTAMP    NULL,
        received_by     INT          NULL,
        audited_at      TIMESTAMP    NULL,
        audited_by      INT          NULL,
        notes           TEXT         NULL,
        created_by      INT          NOT NULL,
        created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uk_tcd_uuid (uuid),
        INDEX idx_tcd_entry (event_entry_id),
        INDEX idx_tcd_status (card_status),
        INDEX idx_tcd_case (tech_case_id),
        CONSTRAINT fk_tcd_entry FOREIGN KEY (event_entry_id) REFERENCES event_entries(id) ON DELETE CASCADE,
        CONSTRAINT fk_tcd_case FOREIGN KEY (tech_case_id) REFERENCES tech_cases(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
$results[] = 'techcard_declarations: created/exists';

// ── 2. techcard_declaration_fields ──────────────────────────────────────

$pdo->exec("
    CREATE TABLE IF NOT EXISTS techcard_declaration_fields (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        declaration_id  INT          NOT NULL,
        field_key       VARCHAR(100) NOT NULL,
        field_label     VARCHAR(255) NOT NULL,
        field_group     VARCHAR(100) NULL,
        field_type      ENUM('text','number','boolean','select') NOT NULL DEFAULT 'text',
        declared_value  TEXT         NULL,
        sort_order      INT          NOT NULL DEFAULT 0,
        created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_tcdf_decl (declaration_id, sort_order),
        INDEX idx_tcdf_key (field_key),
        CONSTRAINT fk_tcdf_decl FOREIGN KEY (declaration_id) REFERENCES techcard_declarations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
$results[] = 'techcard_declaration_fields: created/exists';

// ── 3. techcard_artifacts ───────────────────────────────────────────────

$pdo->exec("
    CREATE TABLE IF NOT EXISTS techcard_artifacts (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        uuid              VARCHAR(36)   NOT NULL,
        declaration_id    INT           NOT NULL,
        original_filename VARCHAR(500)  NOT NULL,
        storage_path      VARCHAR(1024) NULL,
        mime_type         VARCHAR(100)  NULL,
        file_size_bytes   INT           NULL,
        page_count        INT           NULL,
        uploaded_by       INT           NOT NULL,
        uploaded_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

        UNIQUE KEY uk_tca_uuid (uuid),
        INDEX idx_tca_decl (declaration_id),
        CONSTRAINT fk_tca_decl FOREIGN KEY (declaration_id) REFERENCES techcard_declarations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");
$results[] = 'techcard_artifacts: created/exists';

// ── 4. Seed first-pass declaration field templates ──────────────────────
// These are stored as a JSON config that the API uses to auto-create fields
// when a new declaration is created for a given category/class.
// We store them in a lightweight config table or as a PHP constant.
// For MVP, the field template is defined in the API code itself (tm-techcard.php).
// No separate config table needed yet.

$results[] = 'Field templates defined in API code (no config table needed for MVP)';

// ── Output ──────────────────────────────────────────────────────────────

if (php_sapi_name() === 'cli') {
    echo "=== Migration v27: Tech Card Audit Foundation ===\n";
    foreach ($results as $r) echo "$r\n";
    echo "=== Migration v27 Complete ===\n";
} else {
    tm_json(['migration' => 'v27', 'results' => $results]);
}
