<?php
/**
 * Database Migration v6b — NHRA Tech Parity Index Hardening
 *
 * Adds:
 *   - UNIQUE(race_lookup, source_ref) on parity_runs  (cross-import dedupe by DumbyID)
 *   - INDEX(race_lookup, source_ref) on parity_runs_raw (for fast lookups)
 *
 * Safe to run multiple times (catches duplicate-key errors).
 *
 * Usage:
 *   php api/migrate-v6b-parity-indexes.php
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== RSA Database Migration v6b — Parity Index Hardening ===\n\n";

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

echo "1. Connecting to database...\n";
try {
    $pdo = getDB();
    echo "   OK\n\n";
} catch (Exception $e) {
    echo "   FAILED: " . $e->getMessage() . "\n";
    exit(1);
}

function addIndexSafeV6b(PDO $pdo, string $name, string $ddl): void {
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

// ── 2. Add UNIQUE(race_lookup, source_ref) on parity_runs ──────────────
// This enables cross-import dedupe when source_ref (DumbyID) is present.
// The existing uk_pr_race_hash still works as fallback for rows without source_ref.

echo "2. Adding unique index on parity_runs(race_lookup, source_ref)...\n";
// source_ref can be NULL for rows without DumbyID, so we use a regular unique index.
// MySQL allows multiple NULLs in a UNIQUE index, so rows without source_ref won't conflict.
addIndexSafeV6b($pdo, 'uk_pr_race_sourceref',
    "ALTER TABLE parity_runs ADD UNIQUE KEY uk_pr_race_sourceref (race_lookup, source_ref)"
);
echo "\n";

// ── 3. Add index on parity_runs_raw for cross-import lookups ───────────

echo "3. Adding index on parity_runs_raw(row_hash) for cross-import lookups...\n";
addIndexSafeV6b($pdo, 'idx_prr_rowhash',
    "ALTER TABLE parity_runs_raw ADD INDEX idx_prr_rowhash (row_hash)"
);
echo "\n";

echo "=== Migration v6b Complete ===\n";
