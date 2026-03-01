<?php
/**
 * Unit tests for timezone conversion functions.
 * Run with: php api/__tests__/timezone-conversion.php
 *
 * Tests:
 *   1. parity_parseTimestampLocal — OData /Date(...)/ → local datetime
 *   2. parity_localToUtc — local → UTC with DST awareness
 *   3. parity_utcToLocal — UTC → local with DST awareness
 *   4. DST boundary: same local time in EST vs EDT → different UTC
 *   5. Weather join offset thresholds
 */

require_once __DIR__ . '/../lib/parity.php';

$passed = 0;
$failed = 0;

function assert_eq($label, $expected, $actual) {
    global $passed, $failed;
    if ($expected === $actual) {
        echo "  ✓ $label\n";
        $passed++;
    } else {
        echo "  ✗ $label\n    Expected: " . var_export($expected, true) . "\n    Actual:   " . var_export($actual, true) . "\n";
        $failed++;
    }
}

echo "=== Timezone Conversion Tests ===\n\n";

// ── 1. parity_parseTimestampLocal ─────────────────────────────────────────
echo "1. parity_parseTimestampLocal\n";

// OData v2 /Date(...)/ format
// epoch_ms = 1730312400000 → gmdate = "2024-10-30 15:00:00"
// This value represents local wall-clock time per NHRA convention.
assert_eq(
    '/Date(1730312400000)/ → 2024-10-30 15:00:00',
    '2024-10-30 15:00:00',
    parity_parseTimestampLocal('/Date(1730312400000)/')
);

// Midnight epoch
assert_eq(
    '/Date(0)/ → 1970-01-01 00:00:00',
    '1970-01-01 00:00:00',
    parity_parseTimestampLocal('/Date(0)/')
);

// ISO 8601 with offset — strip offset, keep local digits
assert_eq(
    'ISO with offset → local digits only',
    '2025-03-15 14:30:00',
    parity_parseTimestampLocal('2025-03-15T14:30:00-04:00')
);

// Bare datetime string
assert_eq(
    'bare datetime → as-is',
    '2025-06-20 11:45:30',
    parity_parseTimestampLocal('2025-06-20 11:45:30')
);

// Null / empty
assert_eq('null → null', null, parity_parseTimestampLocal(null));
assert_eq('empty → null', null, parity_parseTimestampLocal(''));

echo "\n";

// ── 2. parity_localToUtc — DST boundary tests ───────────────────────────
echo "2. parity_localToUtc (DST boundaries)\n";

// 2025-01-15 12:00:00 in New York = EST (UTC-5) → UTC 17:00:00
assert_eq(
    'EST (winter) NY 12:00 → UTC 17:00',
    '2025-01-15 17:00:00',
    parity_localToUtc('2025-01-15 12:00:00', 'America/New_York')
);

// 2025-06-15 12:00:00 in New York = EDT (UTC-4) → UTC 16:00:00
assert_eq(
    'EDT (summer) NY 12:00 → UTC 16:00',
    '2025-06-15 16:00:00',
    parity_localToUtc('2025-06-15 12:00:00', 'America/New_York')
);

// Same wall-clock time, different UTC result (proving DST awareness)
$estUtc = parity_localToUtc('2025-01-15 12:00:00', 'America/New_York');
$edtUtc = parity_localToUtc('2025-06-15 12:00:00', 'America/New_York');
assert_eq(
    'EST and EDT produce different UTC for same local time',
    true,
    $estUtc !== $edtUtc
);

// Las Vegas: America/Los_Angeles, PST (UTC-8) in winter
assert_eq(
    'PST Vegas 10:00 → UTC 18:00',
    '2025-02-15 18:00:00',
    parity_localToUtc('2025-02-15 10:00:00', 'America/Los_Angeles')
);

// Las Vegas: PDT (UTC-7) in summer
assert_eq(
    'PDT Vegas 10:00 → UTC 17:00',
    '2025-06-15 17:00:00',
    parity_localToUtc('2025-06-15 10:00:00', 'America/Los_Angeles')
);

// Gainesville, FL: America/New_York
assert_eq(
    'EDT Gainesville 14:30 → UTC 18:30',
    '2025-05-20 18:30:00',
    parity_localToUtc('2025-05-20 14:30:00', 'America/New_York')
);

// Null handling
assert_eq('null local → null', null, parity_localToUtc(null, 'America/New_York'));
assert_eq('empty local → null', null, parity_localToUtc('', 'America/New_York'));

echo "\n";

// ── 3. parity_utcToLocal ─────────────────────────────────────────────────
echo "3. parity_utcToLocal\n";

assert_eq(
    'UTC 17:00 → NY EST 12:00',
    '2025-01-15 12:00:00',
    parity_utcToLocal('2025-01-15 17:00:00', 'America/New_York')
);

assert_eq(
    'UTC 16:00 → NY EDT 12:00',
    '2025-06-15 12:00:00',
    parity_utcToLocal('2025-06-15 16:00:00', 'America/New_York')
);

assert_eq(
    'UTC 18:00 → Vegas PST 10:00',
    '2025-02-15 10:00:00',
    parity_utcToLocal('2025-02-15 18:00:00', 'America/Los_Angeles')
);

assert_eq('null utc → null', null, parity_utcToLocal(null, 'America/New_York'));

echo "\n";

// ── 4. Round-trip: local → UTC → local ──────────────────────────────────
echo "4. Round-trip consistency\n";

$testCases = [
    ['2025-03-09 01:30:00', 'America/New_York'],  // Just before spring-forward
    ['2025-03-09 03:30:00', 'America/New_York'],  // Just after spring-forward
    ['2025-11-02 01:30:00', 'America/New_York'],  // During fall-back (ambiguous)
    ['2025-07-04 15:00:00', 'America/Los_Angeles'],
    ['2025-12-25 09:00:00', 'America/Chicago'],
];

foreach ($testCases as [$local, $tz]) {
    $utc = parity_localToUtc($local, $tz);
    $back = parity_utcToLocal($utc, $tz);
    // Note: fall-back ambiguous times may not round-trip perfectly
    assert_eq("Round-trip $local ($tz)", $local, $back);
}

echo "\n";

// ── 5. Weather match offset thresholds ──────────────────────────────────
echo "5. Weather match offset warning thresholds\n";

// Threshold logic: warn if avgOffset > 20 min or maxOffset > 60 min
function shouldWarn(?float $avgMin, ?float $maxMin): bool {
    return ($avgMin !== null && $avgMin > 20) || ($maxMin !== null && $maxMin > 60);
}

assert_eq('0 avg, 0 max → no warn', false, shouldWarn(0, 0));
assert_eq('5 avg, 10 max → no warn', false, shouldWarn(5, 10));
assert_eq('19 avg, 59 max → no warn', false, shouldWarn(19, 59));
assert_eq('21 avg, 10 max → WARN', true, shouldWarn(21, 10));
assert_eq('5 avg, 61 max → WARN', true, shouldWarn(5, 61));
assert_eq('25 avg, 120 max → WARN', true, shouldWarn(25, 120));
assert_eq('null, null → no warn', false, shouldWarn(null, null));

echo "\n";

// ── Summary ──────────────────────────────────────────────────────────────
echo "=== Results: $passed passed, $failed failed ===\n";
exit($failed > 0 ? 1 : 0);
