# VB6 Parity Test Suite - Summary

## ✅ Complete - Comprehensive VB6 Validation Tests Created

### Goal
Create rigorous parity tests that validate RSACLASSIC against Quarter Pro/Jr benchmark targets with tight tolerances and detailed debugging output.

---

## Test File Created

**`src/integration-tests/vb6.parity.spec.ts`**

Comprehensive test suite that validates our VB6-compatible physics implementation against legacy VB6 printout targets.

---

## Test Structure

### 1. Tight Tolerances ✅

```typescript
const TIGHT_TOLERANCE = {
  ET_S: 0.05,   // ±0.05s for ET (tighter than benchmark defaults)
  MPH: 1.0,     // ±1.0 mph for trap speed (tighter than benchmark defaults)
};
```

**Purpose:** Enforce strict VB6 parity, not just "close enough"

### 2. Benchmark Configuration Loader ✅

```typescript
function buildSimInputs(
  configName: string,
  raceLength: RaceLength
): SimInputs
```

**Features:**
- Loads exact vehicle parameters from `BENCHMARK_CONFIGS`
- Builds complete `ExtendedVehicle` with all VB6 parameters
- Includes:
  - Weight, tire dimensions, rollout
  - Frontal area, Cd, lift coefficient
  - Gear ratios, shift points, transmission efficiency
  - Converter/clutch parameters
  - Full torque curves
  - Environmental conditions

### 3. Split Comparison Table ✅

```typescript
function formatSplitTable(
  result: SimResult,
  vb6ET: number,
  vb6MPH: number
): string
```

**Output Format:**
```
=== VB6 PARITY SPLIT COMPARISON ===

| Distance | t_VB6  | t_TS   | Δt     | v_VB6  | v_TS   | Δv    |
|----------|--------|--------|--------|--------|--------|-------|
|   60'    | N/A    | 1.010  | N/A    | N/A    | 45.2   | N/A   |
|  330'    | N/A    | 3.314  | N/A    | N/A    | 98.5   | N/A   |
|  660'    | N/A    | 5.175  | N/A    | N/A    | 131.6  | N/A   |
| 1000'    | N/A    | 6.799  | N/A    | N/A    | 152.3  | N/A   |
| 1320'    | 6.800  | 6.850  | +0.050 | 202.3  | 201.5  | -0.8  |
```

**Note:** Intermediate VB6 splits not available in benchmark data, only final ET/MPH

### 4. Early Trace Dump ✅

```typescript
function formatEarlyTrace(result: SimResult): string
```

**Output Format:**
```
=== EARLY TRACE (First 200ms) ===

| t_s   | s_ft  | v_mph | a_g  | rpm   | gear |
|-------|-------|-------|------|-------|------|
| 0.000 |   0.0 |   0.0 | 0.00 |  7200 | 1    |
| 0.020 |   0.5 |  12.3 | 1.45 |  7250 | 1    |
| 0.040 |   2.1 |  24.1 | 1.42 |  7300 | 1    |
| 0.060 |   4.8 |  35.4 | 1.38 |  7350 | 1    |
...
```

**Purpose:** Debug launch behavior, clutch slip, early acceleration

---

## Test Coverage

### Quarter Pro Benchmarks ✅

Tests all Quarter Pro benchmarks:
1. **SuperGas_Pro** - EIGHTH & QUARTER
2. **TA_Dragster_Pro** - EIGHTH & QUARTER
3. **ProStock_Pro** - EIGHTH & QUARTER
4. **FunnyCar_Pro** - EIGHTH & QUARTER
5. **Motorcycle_Pro** - EIGHTH & QUARTER
6. **SuperComp_Pro** - EIGHTH & QUARTER

**Total:** 12 test cases (6 vehicles × 2 race lengths)

### Quarter Jr Benchmarks ✅

Tests all Quarter Jr benchmarks:
1. **Motorcycle_Jr** - EIGHTH & QUARTER
2. **ETRacer_Jr** - EIGHTH & QUARTER
3. **EXP_Jr** - EIGHTH & QUARTER
4. **EXP_050523_Jr** - EIGHTH & QUARTER

**Total:** 8 test cases (4 vehicles × 2 race lengths)

### Special Tests ✅

1. **Trap Speed Windows** - Verifies VB6 time-averaged method
2. **Rollout Behavior** - Verifies ET clock starts after rollout
3. **VB6 Metadata** - Verifies metadata documentation

**Total:** 3 special test cases

**Grand Total:** 23 test cases

---

## Test Output

### Pass Output ✅

```
✅ PASSED: ProStock_Pro - QUARTER (ΔET=+0.015s, ΔMPH=-0.8mph)
```

**Concise:** Shows delta but no detailed dump

### Fail Output ❌

```
❌ FAILED: ProStock_Pro - QUARTER
Expected: ET=6.800s, MPH=202.3
Actual:   ET=6.850s, MPH=201.5
Delta:    ΔET=+0.050s, ΔMPH=-0.8
Tolerance: ±0.05s, ±1.0mph

=== VB6 PARITY SPLIT COMPARISON ===
[Split table here]

=== EARLY TRACE (First 200ms) ===
[Early trace here]

=== VB6 METADATA ===
dt_s: 0.002
trapMode: time
windowsFt: {...}

=== WARNINGS ===
- [Any warnings here]
```

**Detailed:** Full debugging information for failed tests

---

## Key Features

### 1. Exact VB6 Parameters ✅

Uses exact parameters from Quarter Pro/Jr printouts:
- Weight, dimensions, rollout
- Aerodynamics (frontal area, Cd, lift)
- Drivetrain (gears, ratios, efficiency)
- Launch device (converter/clutch parameters)
- Full torque curves (not just peak HP)
- Environmental conditions

### 2. Tight Tolerances ✅

Enforces strict parity:
- ±0.05s for ET (vs ±0.10-0.35s in benchmarks)
- ±1.0 mph for trap (vs ±3.0-7.0 mph in benchmarks)

**Purpose:** Catch small discrepancies early

### 3. Detailed Debugging ✅

When tests fail, provides:
- Split-by-split comparison table
- Early trace (first 200ms) for launch analysis
- VB6 metadata verification
- Warning messages

**Purpose:** Quickly identify root cause of failures

### 4. Metadata Verification ✅

Validates VB6 compatibility metadata:
- `dt_s` = 0.002
- `trapMode` = 'time'
- `windowsFt` = {eighth: 594-660, quarter: 1254-1320}
- `timeslipPoints` = [60, 330, 660, 1000, 1320]
- `rolloutBehavior` = 'ET clock starts after rollout distance'

**Purpose:** Ensure VB6 behavior is documented and correct

---

## Usage

### Run All Tests

```bash
npm test vb6.parity
```

### Run Specific Benchmark

```bash
npm test vb6.parity -- -t "ProStock_Pro"
```

### Run Specific Race Length

```bash
npm test vb6.parity -- -t "QUARTER"
```

### Run With Verbose Output

```bash
npm test vb6.parity -- --reporter=verbose
```

---

## Expected Results

### Current Status (Stubs)

With converter/clutch stubs (pass-through), we expect:
- ❌ Most tests will FAIL
- ET will be too fast (no converter slip/multiplication)
- MPH will be too high (no converter losses)
- Launch will be too aggressive (no clutch slip)

### After VB6 Formulas

Once converter/clutch formulas are ported:
- ✅ Most tests should PASS within tight tolerances
- ET should match VB6 within ±0.05s
- MPH should match VB6 within ±1.0 mph
- Launch behavior should match VB6

---

## Debugging Workflow

### 1. Run Tests

```bash
npm test vb6.parity
```

### 2. Identify Failures

Look for ❌ FAILED output with deltas

### 3. Analyze Split Table

Check where simulation diverges from VB6:
- Early splits: Launch/clutch issues
- Mid splits: Shift timing issues
- Late splits: Aero/drag issues
- Final split: Overall accuracy

### 4. Analyze Early Trace

Check first 200ms for:
- Launch RPM
- Clutch slip behavior
- Initial acceleration
- Gear engagement

### 5. Check Metadata

Verify VB6 compatibility:
- dt_s correct?
- trapMode correct?
- windowsFt correct?

### 6. Fix Root Cause

Based on analysis:
- Converter formula issues → Fix `vb6Converter()`
- Clutch formula issues → Fix `vb6Clutch()`
- Shift timing issues → Fix `vb6CheckShift()`
- Aero issues → Fix `vb6AeroTorque()`

### 7. Re-run Tests

Verify fix resolved the issue

---

## Comparison to Existing Tests

### `physics.benchmarks.spec.ts`

**Purpose:** Loose validation with large tolerances
**Tolerances:** ±0.10-0.35s ET, ±3.0-7.0 mph
**Output:** Pass/fail only
**Use Case:** Sanity checks, regression testing

### `vb6.parity.spec.ts` (NEW)

**Purpose:** Strict VB6 parity validation
**Tolerances:** ±0.05s ET, ±1.0 mph
**Output:** Detailed debugging on failure
**Use Case:** VB6 formula verification, precision tuning

---

## Benefits

### 1. Early Detection ✅

Tight tolerances catch small discrepancies before they accumulate

### 2. Root Cause Analysis ✅

Detailed output pinpoints exact issue:
- Split table shows where divergence occurs
- Early trace shows launch behavior
- Metadata shows configuration

### 3. Confidence ✅

Passing tests prove VB6 parity, not just "close enough"

### 4. Documentation ✅

Tests serve as executable specification of VB6 behavior

### 5. Regression Prevention ✅

Any change that breaks VB6 parity is immediately caught

---

## Limitations

### 1. No Intermediate VB6 Splits

Benchmark data only includes final ET/MPH, not intermediate splits (60', 330', etc.)

**Workaround:** Compare final results, use early trace for launch analysis

### 2. No VB6 Runtime

We don't have actual VB6 engine running, only printout targets

**Workaround:** Use printout targets as "gold standard"

### 3. Limited Benchmark Coverage

Only 10 benchmark vehicles (6 Pro, 4 Jr)

**Workaround:** Add more benchmarks as VB6 printouts become available

---

## Next Steps

### Immediate

1. **Run tests** to establish baseline
2. **Document failures** to understand current gaps
3. **Port converter formula** to fix converter-related failures
4. **Port clutch formula** to fix clutch-related failures

### Short-Term

5. **Re-run tests** after each formula port
6. **Tighten tolerances** as accuracy improves
7. **Add more benchmarks** as printouts become available

### Long-Term

8. **Achieve 100% pass rate** with tight tolerances
9. **Add intermediate split validation** if VB6 data becomes available
10. **Create validation report** documenting VB6 parity

---

## Files

### Created (1)
1. **`src/integration-tests/vb6.parity.spec.ts`** - VB6 parity test suite

### Uses (3)
2. **`src/domain/physics/fixtures/benchmarks.ts`** - Benchmark targets
3. **`src/domain/physics/fixtures/benchmark-configs.ts`** - Vehicle configs
4. **`src/domain/physics/models/rsaclassic.ts`** - Physics implementation

---

## Summary

**Status: ✅ VB6 PARITY TEST SUITE COMPLETE**

We now have:
- ✅ **23 comprehensive test cases** (20 benchmarks + 3 special)
- ✅ **Tight tolerances** (±0.05s ET, ±1.0 mph)
- ✅ **Detailed debugging output** (split table, early trace, metadata)
- ✅ **Exact VB6 parameters** (from Quarter Pro/Jr printouts)
- ✅ **Metadata verification** (dt, trapMode, windows, points)
- ✅ **Typecheck passes**

**Key Achievement:**
Created a rigorous test suite that will validate VB6 parity once converter/clutch formulas are ported. The detailed debugging output will make it easy to identify and fix any discrepancies.

**Next Action:**
Run tests to establish baseline, then port converter/clutch formulas to achieve passing results.
