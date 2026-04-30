<?php
/**
 * Migration: Add slope_grade_pct to parity_tracks
 *
 * slope_grade_pct DECIMAL(5,3) NULL
 *   Sign convention: positive = downhill (finish line lower than start line, e.g. Pomona ≈ +1.440)
 *                    negative = uphill
 *   Formula source: Drag Racing Pro Book p. 11-2 (Patrick Hale, 2014)
 *
 * Safe to re-run — uses IF NOT EXISTS / IGNORE.
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

try {
    if (!defined('DB_HOST')) { require_once __DIR__ . '/config.php'; }
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $exists = $pdo->query("
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parity_tracks' AND COLUMN_NAME = 'slope_grade_pct'
    ")->fetchColumn();
    if ($exists) {
        echo "Column slope_grade_pct already exists. Nothing to do.\n";
    } else {
        $pdo->exec("
            ALTER TABLE parity_tracks
            ADD COLUMN slope_grade_pct DECIMAL(5,3) NULL DEFAULT NULL
                COMMENT 'Track slope grade pct. Positive=downhill. DR Pro Book p.11-2'
        ");
        echo "Migration complete: parity_tracks.slope_grade_pct added.\n";
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
