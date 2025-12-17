# VB6 Physics Deviation Analysis

**Date:** December 17, 2024  
**Updated:** December 17, 2024 (after code review against original VB6 source)  
**Purpose:** Identify deviations between RSA TypeScript implementation and original VB6 QUARTER Jr/Pro programs  
**Triggered by:** Pat's feedback on physics discrepancies

---

## Executive Summary

Pat identified several issues with the current implementation:
1. **Converter modeling differs from original QUARTERjr**
2. **Starting line traction model produces incorrect 60ft times**
3. **Transmission handling issues** (1-speed vs 2-speed logic)
4. **Models labeled as "QUARTER Pro" appear to be "QUARTERjr" models**

This document provides a systematic code review against the original VB6 source files located at:
`Reference Files/OtherRefFiles/Original RSA File Transfers/QPro Family 1_18_2023/QCommon/`

---

## FIXES APPLIED

### Fix #1: AMin Clamp PQWT Scaling (FIXED Dec 17, 2024)

**File:** `src/domain/physics/vb6/vb6SimulationStep.ts` line 642-647

**Problem:** When acceleration was clamped to AMin, PQWT was being recalculated from scratch instead of scaled proportionally.

**VB6 (TIMESLIP.FRM line 1228):**
```vb
If AGS(L) < AMin Then PQWT = PQWT * AMin / AGS(L):  AGS(L) = AMin
```

**Old TypeScript (WRONG):**
```typescript
if (AGS_g < AMin) {
  AGS_g = AMin;
  PQWT = AMin * gc * Vel_L;  // WRONG - recalculates instead of scaling
}
```

**New TypeScript (CORRECT):**
```typescript
if (AGS_g < AMin) {
  PQWT = PQWT * AMin / AGS_g;  // Scale proportionally like VB6
  AGS_g = AMin;
}
```

**Impact:** This affects low-acceleration scenarios (near terminal velocity, high drag situations).

---

## Verified Code Sections (MATCH VB6)

### 1. CONVERTER MODELING ✅ VERIFIED CORRECT

**Location:** `src/domain/physics/vb6/vb6SimulationStep.ts` lines 503-528

**VB6 (TIMESLIP.FRM lines 1154-1172):**
```vb
If iGear = 1 Or gc_LockUp.Value = 0 Then        'non lock-up converter
    zStall = Stall
    SlipRatio = gc_Slippage.Value * LockRPM / zStall
    
    If L > 2 Then
        If SlipRatio > 0.6 Then zStall = zStall * (1 + (gc_Slippage.Value - 1) * (SlipRatio - 0.6) / ((1 / gc_Slippage.Value) - 0.6))
        SlipRatio = gc_Slippage.Value * LockRPM / zStall
    End If
    ClutchSlip = 1 / gc_Slippage.Value
      
    If EngRPM(L) < zStall Then
        EngRPM(L) = zStall
        Work = gc_TorqueMult.Value - (gc_TorqueMult.Value - 1) * SlipRatio
        ClutchSlip = Work * LockRPM / zStall
    End If
Else                                            'lock-up converter
    EngRPM(L) = 1.005 * LockRPM                 'assume 0.5% slippage
    ClutchSlip = LockRPM / EngRPM(L)
End If
```

**Status:** TypeScript implementation matches VB6 exactly. The converter modeling is correct.

### 2. STARTING LINE TRACTION ✅ VERIFIED CORRECT

**Location:** `src/domain/physics/vb6/vb6SimulationStep.ts` lines 870-904 (vb6InitState)

**VB6 (TIMESLIP.FRM lines 1020-1027):**
```vb
DragForce = CMU * gc_Weight.Value + gc_DragCoef.Value * gc_RefArea.Value * q
force = TQ * gc_GearRatio.Value * gc_Efficiency.Value / (TireSlip * TireDia / 24) - DragForce

'estimate maximum acceleration from force and weight
If gc_TransType.Value Then
    Ags0 = 0.96 * force / gc_Weight.Value  'assume 4% misc losses on initial hit of tire
Else
    Ags0 = 0.88 * force / gc_Weight.Value  'assume 12% misc losses on initial hit of tire
End If
```

**VB6 Initial TireSlip (TIMESLIP.FRM line 872):**
```vb
TireSlip = 1.02 + (gc_TractionIndex.Value - 1) * 0.005 + (TrackTempEffect - 1) * 3
```

**Status:** TypeScript implementation matches VB6 exactly. Loss factors (0.88 clutch, 0.96 converter) are correct.

---

### 3. TRANSMISSION HANDLING (1-SPEED/2-SPEED LOGIC) ⚠️ MEDIUM PRIORITY

**Location:** `src/domain/physics/models/vb6Exact.ts` lines 491-493

**Current Implementation:**
```typescript
const gearRatios = drivetrain?.gearRatios ?? (vehicle as any).gearRatios ?? [2.5, 1.8, 1.4, 1.1, 1.0];
const finalDrive = drivetrain?.finalDriveRatio ?? (vehicle as any).finalDrive ?? vehicle.rearGear ?? 3.73;
const NGR = gearRatios.length;
```

**Pat's Observation:** "for the A/Fuel model I created with no transmission, it initially included a low gear ratio. after I changed it to 2 speed and input 1.0 for 1st gear it then reset with that ratio as a one speed transmission"

**Potential Issues:**
1. Default gear ratios `[2.5, 1.8, 1.4, 1.1, 1.0]` may not match VB6 defaults
2. Logic for handling 1-speed vs multi-speed transmissions may differ
3. When user enters 1.0 for 1st gear, system may be incorrectly treating it as single-speed

**VB6 Behavior:** Need to verify how VB6 handles:
- No transmission (direct drive)
- 1-speed transmission
- 2-speed transmission with 1.0 ratio in first gear

---

### 4. QUARTERJR vs QUARTERPRO MODE DETECTION

**Location:** `src/domain/physics/models/vb6Exact.ts` lines 486-594

**Current Implementation:**
```typescript
if (isQuarterJr && quarterJrParams) {
  // QuarterJr Mode: Calculate all derived parameters
  // ...
} else {
  // QuarterPro Mode: Use user-provided values
  // ...
}
```

**Detection Logic:**
```typescript
// From extractHPCurve():
if (xrpm.length >= 2) {
  return { xrpm, yhp, NHP: xrpm.length, isQuarterJr: false };
}
// QuarterJr mode: Generate synthetic curve
```

**Pat's Observation:** "even though the data sets are named QUARTER Pro models, they appear to be QUARTERjr models"

**Potential Issues:**
1. Mode detection based solely on HP curve length may be incorrect
2. QuarterJr auto-calculated parameters may be overriding user-provided Pro values
3. The synthetic HP curve generation may differ from VB6's ENGINE() subroutine

---

## Secondary Findings

### 5. TIRE SLIP CALCULATION (DURING RUN)

**Location:** `src/domain/physics/vb6/vb6SimulationStep.ts` lines 414-420

```typescript
// Quarter Pro: TIMESLIP.FRM:1098-1101
const Work_slip = 0.005 * (env.TractionIndex - 1) + 3 * (env.TrackTempEffect - 1);
TireSlip = 1.02 + Work_slip * (1 - Math.pow(state.Dist0_ft / 1320, 2));
```

**Question:** The distance-based reduction `(1 - (Dist0/1320)^2)` - is this exact VB6 formula?

---

### 6. TRANSMISSION EFFICIENCY CALCULATION (QuarterJr)

**Location:** `src/domain/physics/vb6/quarterJr.ts` lines 138-163

```typescript
if (!isConverter) {
  // Clutch type trans: TGEff(i) = 0.99 - (NGR - i) * 0.005
  const teff = 0.99;
  for (let i = 1; i <= NGR; i++) {
    efficiencies.push(teff - (NGR - i) * 0.005);
  }
} else {
  // Converter type trans: TGEff(i) = teff - (NGR - i) * 2 * 0.005
  const teff = NGR >= 3 ? 0.985 : 0.99;
  for (let i = 1; i <= NGR; i++) {
    efficiencies.push(teff - (NGR - i) * 2 * 0.005);
  }
}
```

**Question:** Verify these formulas match VB6 TIMESLIP.FRM lines 721-737

---

### 7. CONVERTER PARAMETER CALCULATION (QuarterJr)

**Location:** `src/domain/physics/vb6/quarterJr.ts` lines 169-207

```typescript
// VB6: lrat = Work / (200 * (7 / gc_ConvDia.Value) ^ 4)
const lrat = work / (200 * Math.pow(7 / converterDia_in, 4));

// VB6: gc_Slippage.Value = 1.01 + lrat / 20 + Work / 8000
const slippage = 1.01 + lrat / 20 + work / 8000;

// VB6: TQMult = 2.633 - lrat ^ 0.3 - Work / 1500
let torqueMult = 2.633 - Math.pow(lrat, 0.3) - work / 1500;
```

**Question:** These formulas need verification. The constants (200, 7, 20, 8000, 2.633, 1500) must match VB6 exactly.

---

### 8. PMI CALCULATION (QuarterJr)

**Location:** `src/domain/physics/vb6/quarterJr.ts` lines 213-252

```typescript
// Engine PMI
if (isNaturallyAspirated(fuelSystem)) {
  enginePMI = estCID / 120;
} else {
  enginePMI = estCID / 90;
}

// Trans PMI
if (!isConverter) {
  transPMI = NGR * enginePMI / 50;
} else {
  transPMI = (NGR - 1) * enginePMI / 10;
}

// Tires PMI
tiresPMI = 2 * (1.15 * 0.8 * (0.08 * tireDia_in * tireWidth_in) * Math.pow(tireDia_in / 2, 2) / 386);
```

**Question:** Verify divisors (120, 90, 50, 10, 386) and multipliers match VB6 TIMESLIP.FRM lines 780-806

---

## Constants Verification Needed

| Constant | Current Value | VB6 Source | Status |
|----------|---------------|------------|--------|
| AX | 10.8 | TIMESLIP.FRM:551 | ✅ Verified |
| CMU | 0.025 | TIMESLIP.FRM:552 | ✅ Verified |
| CMUK | 0.01 | TIMESLIP.FRM:553 | ✅ Verified |
| AMin | 0.004 | TIMESLIP.FRM:547 | ✅ Verified |
| JMin | -4 | TIMESLIP.FRM:543 | ✅ Verified |
| JMax | 2 | TIMESLIP.FRM:544 | ✅ Verified |
| FRCT | 1.03 | TIMESLIP.FRM:559 | ✅ Verified |
| KP21 | 0.15 | TIMESLIP.FRM:557 | ✅ Verified |
| KP22 | 0.25 | TIMESLIP.FRM:558 | ✅ Verified |
| Loss factor (clutch) | 0.88 | TIMESLIP.FRM:1023 | ⚠️ Needs verification |
| Loss factor (converter) | 0.96 | TIMESLIP.FRM:1025 | ⚠️ Needs verification |

---

## Recommended Actions

### Immediate (Code Review)

1. **Line-by-line VB6 comparison** for:
   - Converter slip calculation (lines 1154-1172)
   - Initial traction calculation (lines 1020-1027)
   - TireSlip formula (lines 872, 1098-1101)

2. **Verify QuarterJr formulas** against TIMESLIP.FRM:
   - Transmission efficiency (lines 721-737)
   - Converter parameters (lines 739-758)
   - PMI calculations (lines 780-806)

### Short-term (Testing)

3. **Create parity test cases** with known VB6 outputs:
   - Simple clutch car (no converter complexity)
   - Simple converter car
   - A/Fuel dragster (Pat's test case)
   - Comp AND car (Pat's test case)

4. **Add step-by-step trace comparison**:
   - Log every variable at each timestep
   - Compare against VB6 trace output
   - Identify first point of divergence

### Medium-term (Architecture)

5. **Separate QuarterJr and QuarterPro code paths** more clearly
6. **Add explicit mode flag** rather than inferring from HP curve
7. **Create validation suite** that runs against VB6 golden outputs

---

## Files Requiring Review

| File | Priority | Reason |
|------|----------|--------|
| `vb6SimulationStep.ts` | HIGH | Converter logic, traction, initialization |
| `quarterJr.ts` | HIGH | Auto-calculated parameters |
| `vb6Exact.ts` | MEDIUM | Mode detection, parameter mapping |
| `traction.ts` | MEDIUM | CRTF calculation |
| `launch.ts` | MEDIUM | Initial force calculation |
| `engineCurve.ts` | LOW | Synthetic HP curve generation |

---

## Questions for Pat

1. Can you provide the exact VB6 source lines for the converter slip calculation?
2. What are the expected 60ft times for the Comp AND model?
3. What VB6 version are we comparing against (year/build)?
4. Are there any VB6 trace outputs we can use for comparison?

---

## Appendix: Key VB6 Source References

### TIMESLIP.FRM Key Sections
- Lines 550-570: Constants (AX, CMU, CMUK, etc.)
- Lines 699-806: QuarterJr initialization
- Lines 872-875: Initial tire slip
- Lines 1003-1057: Launch initialization
- Lines 1070-1280: Main simulation loop
- Lines 1144-1174: Clutch/converter calculations
- Lines 1585-1607: Tire growth model

### QTRPERF.BAS Key Sections
- Lines 152-166: Body style calculation
- Lines 256-265: CalcWork() fuel multiplier
- Lines 1290-1377: Weather/atmosphere
