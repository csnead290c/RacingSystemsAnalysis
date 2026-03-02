<?php
/**
 * Regression test: Ingest Idempotency
 *
 * Verifies that importing the same dataset twice does NOT create duplicate rows
 * in parity_runs. The unique index uk_pr_race_hash(race_lookup, row_hash) must
 * catch duplicates and skip them gracefully.
 *
 * Usage: php api/__tests__/ingest-idempotency.php
 * Runs against the configured database (use a test DB if available).
 *
 * This test:
 * 1. Creates a test import record
 * 2. Inserts a small set of synthetic runs
 * 3. Counts rows
 * 4. Re-inserts the same runs (simulating a duplicate import)
 * 5. Asserts row count did NOT increase
 * 6. Asserts deduped count matches expected
 * 7. Cleans up test data
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../functions.php';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

header('Content-Type: text/plain; charset=utf-8');

echo "=== Ingest Idempotency Regression Test ===\n\n";

$testRaceLookup = 'T9999999';  // Synthetic race that won't collide with real data
$testImportUuid1 = 'test-idem-import-1-' . bin2hex(random_bytes(4));
$testImportUuid2 = 'test-idem-import-2-' . bin2hex(random_bytes(4));
$passed = 0;
$failed = 0;

function assert_eq($label, $expected, $actual) {
    global $passed, $failed;
    if ($expected === $actual) {
        echo "  PASS: {$label} (expected={$expected})\n";
        $passed++;
    } else {
        echo "  FAIL: {$label} — expected={$expected} actual={$actual}\n";
        $failed++;
    }
}

function assert_true($label, $condition) {
    global $passed, $failed;
    if ($condition) {
        echo "  PASS: {$label}\n";
        $passed++;
    } else {
        echo "  FAIL: {$label}\n";
        $failed++;
    }
}

// Synthetic test rows — each needs unique source_ref (matches real OData source_ref behavior)
$testRows = [
    ['hash' => hash('sha256', 'run-A'), 'driver' => 'Test Driver A', 'ft1320' => 3.701, 'mph1320' => 330.1, 'source_ref' => 'test-idem-A'],
    ['hash' => hash('sha256', 'run-B'), 'driver' => 'Test Driver B', 'ft1320' => 3.702, 'mph1320' => 330.2, 'source_ref' => 'test-idem-B'],
    ['hash' => hash('sha256', 'run-C'), 'driver' => 'Test Driver C', 'ft1320' => 3.703, 'mph1320' => 330.3, 'source_ref' => 'test-idem-C'],
    ['hash' => hash('sha256', 'run-D'), 'driver' => 'Test Driver D', 'ft1320' => 3.704, 'mph1320' => 330.4, 'source_ref' => 'test-idem-D'],
    ['hash' => hash('sha256', 'run-E'), 'driver' => 'Test Driver E', 'ft1320' => 3.705, 'mph1320' => 330.5, 'source_ref' => 'test-idem-E'],
];

try {
    // ── Cleanup any leftover test data from previous failed runs ──
    $pdo->prepare("DELETE FROM parity_runs WHERE race_lookup = ?")->execute([$testRaceLookup]);
    $pdo->prepare("DELETE FROM parity_run_imports WHERE race_lookup = ?")->execute([$testRaceLookup]);

    // ── Step 1: Create first import record ──
    $count = count($testRows);
    echo "Step 1: Create import record + insert {$count} runs...\n";
    $pdo->prepare("
        INSERT INTO parity_run_imports (uuid, race_lookup, requested_at_utc, fetched_at_utc, status, row_count, source_url, created_by_user_id)
        VALUES (?, ?, '2099-01-01 00:00:01', '2099-01-01 00:00:01', 'success', ?, 'test://idempotency', NULL)
    ")->execute([$testImportUuid1, $testRaceLookup, count($testRows)]);
    $importId1 = (int)$pdo->lastInsertId();

    $stmtRun = $pdo->prepare("
        INSERT INTO parity_runs (uuid, import_id, race_lookup, run_timestamp_utc, category, class_index, round, lane, driver_name, car_number, dial_in, rt, ft60, ft330, ft660, mph660, ft1000, mph1000, ft1320, mph1320, win_flag, dq_flag, mov, place, source_ref, row_hash)
        VALUES (?, ?, ?, '2099-01-01 12:00:00', 'TEST', 'TEST', 'Q1', 'L', ?, '999', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, 0, 0, NULL, NULL, ?, ?)
    ");

    $inserted1 = 0;
    $deduped1 = 0;
    foreach ($testRows as $row) {
        try {
            $uuid = sprintf('%s-%s', 'test', bin2hex(random_bytes(16)));
            $stmtRun->execute([$uuid, $importId1, $testRaceLookup, $row['driver'], $row['ft1320'], $row['mph1320'], $row['source_ref'], $row['hash']]);
            $inserted1++;
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Duplicate') !== false) {
                $deduped1++;
            } else {
                throw $e;
            }
        }
    }

    assert_eq('First import: all rows inserted', count($testRows), $inserted1);
    assert_eq('First import: zero deduped', 0, $deduped1);

    // ── Step 2: Count rows after first import ──
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM parity_runs WHERE race_lookup = ?");
    $stmt->execute([$testRaceLookup]);
    $countAfterFirst = (int)$stmt->fetchColumn();
    assert_eq('Row count after first import', count($testRows), $countAfterFirst);

    // ── Step 3: Re-insert same rows (second import) ──
    echo "\nStep 3: Re-insert same " . $count . " runs (second import)...\n";
    $pdo->prepare("
        INSERT INTO parity_run_imports (uuid, race_lookup, requested_at_utc, fetched_at_utc, status, row_count, source_url, created_by_user_id)
        VALUES (?, ?, '2099-01-01 00:00:02', '2099-01-01 00:00:02', 'success', ?, 'test://idempotency-2', NULL)
    ")->execute([$testImportUuid2, $testRaceLookup, count($testRows)]);
    $importId2 = (int)$pdo->lastInsertId();

    $inserted2 = 0;
    $deduped2 = 0;
    foreach ($testRows as $row) {
        try {
            $uuid = sprintf('%s-%s', 'test2', bin2hex(random_bytes(16)));
            $stmtRun->execute([$uuid, $importId2, $testRaceLookup, $row['driver'], $row['ft1320'], $row['mph1320'], $row['source_ref'], $row['hash']]);
            $inserted2++;
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Duplicate') !== false) {
                $deduped2++;
            } else {
                throw $e;
            }
        }
    }

    assert_eq('Second import: zero inserted', 0, $inserted2);
    assert_eq('Second import: all deduped', count($testRows), $deduped2);

    // ── Step 4: Verify row count unchanged ──
    $stmt->execute([$testRaceLookup]);
    $countAfterSecond = (int)$stmt->fetchColumn();
    assert_eq('Row count after second import (unchanged)', $countAfterFirst, $countAfterSecond);

    // ── Step 5: Verify dedup works across different imports ──
    echo "\nStep 5: Verify cross-import dedup...\n";
    assert_true('Import IDs are different', $importId1 !== $importId2);
    assert_true('Dedup works across imports (same race_lookup + row_hash)', $countAfterSecond === $countAfterFirst);

} catch (Exception $e) {
    echo "\nERROR: " . $e->getMessage() . "\n";
    $failed++;
} finally {
    // ── Cleanup ──
    echo "\nCleaning up test data...\n";
    $pdo->prepare("DELETE FROM parity_runs WHERE race_lookup = ?")->execute([$testRaceLookup]);
    $pdo->prepare("DELETE FROM parity_run_imports WHERE race_lookup = ?")->execute([$testRaceLookup]);
    echo "  Cleaned up.\n";
}

echo "\n=== Results: {$passed} passed, {$failed} failed ===\n";
exit($failed > 0 ? 1 : 0);
