# Engine Sim Implementation Audit

## Objective
Verify 100% accuracy between TypeScript implementation and VB6 ENGPERF.BAS

## VB6 Source Files
- `Reference Files\OtherRefFiles\EPro Family 12_24_2025\ECommon\ENGPERF.BAS` (2295 lines)
- `Reference Files\OtherRefFiles\EPro Family 12_24_2025\ECommon\ENGINE.FRM` (UI form)

## TypeScript Implementation Files
- `src/domain/physics/engine/enginePerf.ts` - Core calculations
- `src/domain/physics/engine/engineConstants.ts` - Constants and lookup tables
- `src/domain/physics/engine/engineProDetails.ts` - Flow details and recommendations
- `src/pages/EngineSim.tsx` - UI

## Critical VB6 Calculations (ENGPERF.BAS)

### 1. Basic Geometry (Lines 53-68)
- ✅ BQS = bore / stroke
- ✅ B2QS = bore * BQS
- ✅ S3QB = stroke ^ 2 / BQS
- ✅ LRQS = rod / stroke
- ✅ AngMPS = 62 + (750 * (LRQS - 0.958)) ^ 0.4027
- ✅ flrqs = 1 + (0.348 / LRQS) ^ 1.99
- ✅ DQR = (Deck + Gasket) / rod

### 2. Fuel Properties (Lines 72-80)
- ✅ Gasoline: GAM=1.28, aqf=14.7, fhv=20700, crx=11.5
- ✅ Racing Gas: GAM=1.28, aqf=14.1, fhv=20200, crx=11.5
- ✅ Methanol: GAM=1.28, aqf=6.4, fhv=9700, crx=13.5

### 3. EFI Cylinder-to-Cylinder Effect (Lines 85-123)
- ✅ efik calculation based on manifold type, layout, and cylinder count
- ✅ Common plenum, individual runner, dual plane variations

### 4. Large Carb Effect on Intake Ramming (Lines 125-135)
- ✅ cvexhp and cvextq calculations
- ✅ Different values for carb vs EFI and manifold types

### 5. Engine Plenum Manifold Effect (Lines 137-165)
- ✅ epek calculation based on manifold type, layout, cylinder count
- ✅ Special cases for single cylinder engines

### 6. Curved Runner Effect (Lines 167-169)
- ✅ crektq = 0.994, crekhp = 0.904 for curved runners

### 7. Intake Ramming - CDI Calculation (Lines 171-180)
- ✅ ICFM calculation with FlowBenchCorr
- ✅ athroat calculation
- ✅ cdi = (ICFM / athroat) / 133 (single valve) or 137 (multiple valves)

### 8. Intake Pumping - Equivalent Piston Speed (Lines 182-188)
- ✅ ICFM normalization with ManFlow and BArea
- ✅ EqvPS = ICFM * 144 / 60
- ✅ Normalize around 319.2 ft/sec and bore/throat ratio 4.2

### 9. Initial Values for Iteration (Lines 191-201)
- ✅ ilc = 109, PHI = 1, icdtq = 0.995, icdrpm = 1
- ✅ metq = 0.818, mehp = 0.778
- ✅ CarbVETQ and CarbVEHP calculations

### 10. Main Iteration Loop (Lines 203-400+)
- ✅ 5 iterations
- ✅ IVC calculation from ILC and cam duration
- ✅ xqs calculation for late IVC
- ✅ acrit calculation (dynamic after first iteration)
- ✅ astar, psitq, RamVETQ calculations
- ✅ EffCR and EFF calculations
- ✅ tqfps calculation (peak piston speed at peak TQ)
- ✅ PumpVE and RamVE adjustments
- ✅ Peak TQ RPM calculation
- ✅ Peak HP calculations with similar logic
- ✅ Friction calculations
- ✅ Final HP/TQ values

### 11. Cam Factors (camk array)
- ✅ 6 cam types × 6 factors
- ✅ Used in RamVE, PumpVE, and other calculations

### 12. Dyno Curve Generation
- ✅ VB6 uses specific curve shape between peak TQ and peak HP
- ✅ Separate calculations for TQ side and HP side
- ✅ Must match VB6 curve exactly

## Missing or Incomplete Features

### High Priority
1. ❌ **Recommendations Tab** - Not implemented
   - Intake valve diameter recommendations
   - Carb CFM recommendations
   - Cam duration recommendations
   - Compression ratio recommendations
   - VB6 has extensive recommendation logic in ENGPERF.BAS (lines 600+)

2. ⚠️ **Flow Details Accuracy** - Partially implemented
   - Basic flow details working
   - Need to verify flowbench test calculations match VB6 exactly
   - Event labels match VB6

3. ⚠️ **Dyno Curve Accuracy** - Need verification
   - Using vb6CurveGen.ts but needs testing against VB6 output
   - Must match VB6 curve point-by-point

### Medium Priority
4. ❌ **Save/Load Engine Files** - Not implemented
   - VB6 uses .ENG file format (9 lines)
   - Should support import/export

5. ❌ **Print/Export** - Not implemented
   - VB6 has print functionality

6. ⚠️ **UI Completeness** - Needs improvement
   - All inputs present but layout requires scrolling
   - Should be single-page dashboard like ET Sim

### Low Priority
7. ❌ **Help System** - Not implemented
   - VB6 has context-sensitive help

## UI Improvements Needed

### Current Issues
- Requires excessive scrolling
- Three-column layout spreads information too wide
- Results not immediately visible with inputs

### Proposed Dashboard Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Engine Sim                                    [Save] [Load]  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│ │ Engine Design   │ │ Camshaft        │ │ Results         ││
│ │ • Cylinders     │ │ • Type          │ │ HP: 450 @ 6200  ││
│ │ • Layout        │ │ • Duration      │ │ TQ: 425 @ 4800  ││
│ │ • Bore/Stroke   │ │ • Centerline    │ │ CID: 350        ││
│ │ • Rod Length    │ │ • Lift          │ │ HP/CID: 1.29    ││
│ │ • Comp Ratio    │ └─────────────────┘ └─────────────────┘│
│ └─────────────────┘                                         │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│ │ Induction       │ │ Cylinder Head   │ │ Dyno Curve      ││
│ │ • Carb/EFI      │ │ • Valves        │ │ [Graph]         ││
│ │ • CFM           │ │ • Flow          │ │                 ││
│ │ • Manifold      │ │ • Test Pressure │ │                 ││
│ └─────────────────┘ └─────────────────┘ └─────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ Tabs: [Summary] [Flow Details] [Recommendations]            │
└─────────────────────────────────────────────────────────────┘
```

## Testing Requirements

### Baseline Test Cases
1. Load VB6 baseline .ENG files
2. Compare output values:
   - Peak HP and RPM
   - Peak TQ and RPM
   - Shift and Redline RPM
   - HP/CID and TQ/CID
   - All intermediate calculations

### Accuracy Tolerance
- **0% tolerance** - Must match VB6 exactly
- Account for floating-point precision differences
- Round to same decimal places as VB6

## Next Steps

1. ✅ Complete workflow fixes (DONE)
2. 🔄 Verify all calculations match VB6 (IN PROGRESS)
3. ⏳ Implement Recommendations tab
4. ⏳ Redesign UI as single-page dashboard
5. ⏳ Test with VB6 baseline cases
6. ⏳ Add save/load functionality
