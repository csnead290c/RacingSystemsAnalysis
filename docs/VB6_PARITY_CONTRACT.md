# VB6 Parity Contract

This document tracks exact VB6 source line mappings for all ported calculations to ensure 100% parity.

## ET/MPH Rounding - CRITICAL PARITY REQUIREMENT

**Status:** ✅ IMPLEMENTED (2026-01-12)

### Why ET/MPH Uses Banker's Rounding

VB6 Quarter Pro uses **banker's rounding (round-half-to-even)** for ET/MPH display formatting, NOT the custom `Round()` function found in some VB6 modules.

### VB6 Evidence

**TIMESLIP.FRM - ET/MPH Display Formatting:**
- Line 1496: `Mid(prtline, 3, 6) = RightAlign(5, 2, time(L))` - ET with 2 decimals
- Line 1508: `Mid(prtline, 22, 5) = RightAlign(4, 1, Work)` - MPH with 1 decimal
- Line 1450-1456: `tsv(x).caption = Format(TIMESLIP(x), "##.00")` - UI display uses `Format()`

**CVALUE.CLS - RightAlign Implementation:**
- Line 557: `RSet Work = Format(Value, fmt)` - Uses VB6 built-in `Format()` function
- VB6 `Format()` applies **banker's rounding** (IEEE 754 round-half-to-even)

**NOT Used for ET/MPH:**
- Custom `Round()` function in RSALIB.bas/Module1.bas uses round-half-up
- This is only for intermediate calculations (gear ratios, PMI, etc.)
- ET/MPH display goes through `RightAlign()` → `Format()` → banker's rounding

### Canonical Implementation

**Location:** `src/domain/physics/vb6/exactMath.ts`

```typescript
export function vb6Round(x: number, places = 0): number {
  const p = Math.pow(10, places);
  const v = Math.fround(x * p);  // Float32 precision
  const f = Math.floor(v);
  const frac = v - f;
  
  if (frac > 0.5) return (f + 1) / p;
  if (frac < 0.5) return f / p;
  
  // Exactly 0.5: round to even (banker's rounding)
  return (f % 2 === 0 ? f : f + 1) / p;
}
```

**Wrapper Functions:** `src/domain/physics/vb6/constants.ts`

```typescript
// Import banker's rounding from exactMath.ts
import { vb6Round } from './exactMath';

export function roundET(et_s: number, decimals: number = 2): number {
  return vb6Round(et_s, decimals);
}

export function roundMPH(mph: number, decimals: number = 1): number {
  return vb6Round(mph, decimals);
}
```

### Usage in VB6Exact Model

**Location:** `src/domain/physics/models/vb6Exact.ts`

```typescript
import { roundET, roundMPH } from '../vb6/constants';

// Final ET/MPH output rounding
const et_s = applyRounding ? roundET(et_s_raw, etDecimals) : et_s_raw;
const mph = applyRounding ? roundMPH(mph_raw, mphDecimals) : mph_raw;

// Timeslip rounding
const roundedTimeslip = applyRounding 
  ? timeslip.map(t => ({
      d_ft: t.d_ft,
      t_s: roundET(t.t_s, etDecimals),
      v_mph: roundMPH(t.v_mph, mphDecimals),
    }))
  : timeslip;
```

### Test Coverage

**Micro Truth Table:** `src/integration-tests/vb6.rounding.spec.ts`
- 35 tests validating banker's rounding behavior
- Proves round-half-to-even for all boundary cases

**Parity Contract:** `src/integration-tests/vb6.rounding.parity.spec.ts`
- Real-world VB6 printout values (Pro Stock, Super Comp, etc.)
- Boundary cases (x.xx5 values that expose rounding method)
- Regression protection (fails if changed to round-half-up)
- 50+ tests with VB6 evidence citations

### Examples

**Banker's Rounding (Correct):**
- `6.805s` → `6.80s` (round to even)
- `6.815s` → `6.82s` (round to even)
- `202.25 mph` → `202.2 mph` (round to even)
- `202.35 mph` → `202.4 mph` (round to even)

**Round-Half-Up (Incorrect for ET/MPH):**
- `6.805s` → `6.81s` ❌ WRONG
- `202.25 mph` → `202.3 mph` ❌ WRONG

### Regression Protection

The parity contract tests will **FAIL** if anyone changes to round-half-up or any other rounding method. This ensures VB6 parity is maintained.

---

## Engine Pro Parity

## P0 Parity Issues - Current Status

### MECHANICAL DETAILS

#### P0.2: Ratio Rounding (3 decimals required)
**VB6 Source:** ENGPERF.BAS lines 61, 64
```vb
BQS = bore / stroke        ' line 61
LRQS = rod / stroke        ' line 64
DQR = (gc_Deck.Value + gc_Gasket.Value) / rod  ' line 67
```

**VB6 Display Format:** Need to find in DETAILS.FRM
- Bore/Stroke ratio: ? decimals
- Rod/Stroke ratio: ? decimals

**RSA Status:** NEEDS INVESTIGATION
- Current: Unknown formatting
- Required: Match VB6 exactly

#### P0.3: Piston-to-Head Ratio Mismatch
**Issue:** RSA=0.0032 vs VB6=0.0092

**VB6 Source:** ENGPERF.BAS line 67
```vb
DQR = (gc_Deck.Value + gc_Gasket.Value) / rod
```

**RSA Status:** NEEDS INVESTIGATION
- Need to verify inputs: deck height, gasket thickness, rod length
- Need to verify units (inches vs mm)
- Need to trace calculation step-by-step

#### P0.3: Intake Throat Ratio Mismatch
**Issue:** RSA=0.188 vs VB6=0.191

**VB6 Source:** Need to find throat area calculation
**RSA Status:** NEEDS INVESTIGATION

### FLOW DETAILS

#### P0.4: Camshaft Description Fields
**VB6 Source:** Need to examine FDetail.frm to see exact fields shown

**RSA Status:** NEEDS INVESTIGATION
- Need to verify which fields VB6 shows
- Remove LSA/exhaust duration if VB6 doesn't show them

#### P0.5: Override Behavior
**VB6 Source:** Need to examine FDetail.frm for editable fields

**RSA Status:** NOT IMPLEMENTED
- VB6 allows editing: duration, ILC, max lift
- RSA needs: editable fields + live recompute + reset button

#### P0.7: Flow Details Numeric Parity
**VB6 Source:** CDETAILS.CLS lines 274-465

**Current Parity Status:** 
- ✅ vpd calculation: FIXED (54 inH2O at 30°)
- ✅ CFM calculation: FIXED
- ✅ Velocity calculation: FIXED
- ⚠️ Need to verify: flow area, piston speed match VB6 exactly

### RECOMMENDATIONS

#### P0.8: Total Intake Tract Volume
**VB6 Source:** Need to find in RECOMD.FRM or ENGPERF.BAS

**RSA Status:** MISSING FEATURE

#### P0.9: Intake Lobe Centerline Mismatch
**Issue:** RSA=106 vs VB6=105

**VB6 Source:** Need to verify if this is input or calculated
**RSA Status:** NEEDS INVESTIGATION

#### P0.10: Exhaust Port Formatting
**VB6 Source:** Need to examine RECOMD.FRM

**RSA Status:** NEEDS FIXES
- Add percentage display
- Round valve diameter to 2 decimals
- Add min/max flow area

### COMPRESSION RATIO CALCULATOR

#### P0.11: Extra Input Fields
**VB6 Source:** Need to examine CR calculator form

**RSA Status:** NEEDS INVESTIGATION
- VB6 does NOT ask for bore/stroke in CR worksheet
- RSA needs to remove extra fields

#### P0.12: CR Rounding
**VB6 Source:** Format specification in CR calculator

**RSA Status:** NEEDS FIX
- Round to 1 decimal place

### FLOWBENCH DATA

#### P0.13: Area Saturation/Cap
**VB6 Source:** Need to find area calculation in FlowB.frm

**RSA Status:** NOT IMPLEMENTED

#### P0.14: Derived Columns
**VB6 Source:** FlowB.frm calculations

**RSA Status:** NEEDS VERIFICATION
- Velocity
- Flow flux
- Flow vel index

#### P0.15: Missing Chart
**VB6 Source:** FlowB.frm chart configuration

**RSA Status:** MISSING FEATURE

#### P0.16: Editable Workflow
**VB6 Source:** FlowB.frm field properties

**RSA Status:** NOT IMPLEMENTED

## Next Steps

1. **INVESTIGATION PHASE** (Current)
   - Map all VB6 source lines for each calculation
   - Document exact formulas, units, rounding
   - Create VB6_TRACE outputs for comparison

2. **FIX PHASE**
   - Fix each issue with VB6 source citation
   - Add tests with strict assertions
   - Verify with VB6 screenshots

3. **VERIFICATION PHASE**
   - Run golden-master tests
   - Generate VB6_TRACE outputs
   - Visual comparison with VB6 screenshots

## VB6 Source File Map

- **ENGPERF.BAS** - Core engine performance calculations
- **CDETAILS.CLS** - Mechanical details and flow details calculations
- **DETAILS.FRM** - Mechanical details UI
- **FDetail.frm** - Flow details UI
- **RECOMD.FRM** - Recommendations UI
- **FlowB.frm** - Flowbench data UI
