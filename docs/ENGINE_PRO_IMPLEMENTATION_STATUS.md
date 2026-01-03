# Engine Pro Implementation Status

## Current Status

### ✅ Completed
1. **VB6 Physics Calculation** - `calcEngPerf` ported from ENGPERF.BAS
   - Exact VB6 formulas implemented
   - Peak HP, Peak TQ, RPM values match VB6 exactly
   
2. **Dyno Curve Generation** - `generateVB6DynoCurve` ported from Cgraph.CLS
   - Empirical lookup tables (SX, sz, sy) match VB6 exactly
   - DTABY 2D interpolation implemented
   - TABY 1D interpolation implemented
   - Curve adjustment algorithm matches VB6
   - 125 RPM increment spacing matches VB6
   - **Issue**: 3-4 HP average error (0.84%) - likely due to DTABY/TABY implementation difference

3. **Engine Pro UI** - Basic layout matching VB6
   - Configuration inputs
   - Results display
   - Dyno graph
   - Buttons for Mechanical Details, Flow Details, Recommendations

### 🚧 In Progress
1. **Mechanical Details** - Partially implemented in `engineProDetails.ts`
   - `calcMechDetails()` function created
   - Calculates piston position, speed, acceleration at 15 angles
   - Needs UI modal integration
   - Needs VB6 verification

2. **Flow Details** - Partially implemented in `engineProDetails.ts`
   - `calcFlowDetails()` function created
   - Calculates valve lift, flow area, flow demand
   - Needs complete cam profile interpolation
   - Needs UI modal integration
   - Needs VB6 verification

3. **Recommendations** - Stub implemented in `engineProDetails.ts`
   - `calcRecommendations()` function created
   - Needs complete port from ENGPERF.BAS CalcRecommendations (lines 668-1050)
   - Needs UI modal integration
   - Needs VB6 verification

### ❌ Not Started
1. **DTABY/TABY Exact Implementation**
   - VB6 source not found (likely external library)
   - Need VB6 debug output to verify interpolation behavior
   - May need to reverse-engineer from VB6 output

2. **Complete Recommendations Port**
   - Large function (380+ lines in VB6)
   - Complex calculations for intake/exhaust systems
   - Requires many VB6 global variables

3. **UI Modals**
   - Mechanical Details modal
   - Flow Details modal
   - Recommendations modal

## Files Created
- `src/domain/physics/engine/engineProDetails.ts` - Mechanical/Flow/Recommendations calculations
- `public/test-vb6-engine-function.html` - Test page for ENGINE function
- `docs/VB6_CURVE_DEBUG_SCRIPT.md` - VB6 debug script to get exact values

## Next Steps

### To Fix Dyno Curve (3-4 HP error)
1. Run VB6 debug script to get exact intermediate values
2. Compare VB6 DTABY/TABY output with TypeScript implementation
3. Adjust interpolation to match VB6 exactly

### To Complete Mechanical Details
1. Integrate `calcMechDetails()` into UI
2. Create modal to display results
3. Verify output matches VB6 CDETAILS.CLS CalcMechDetails

### To Complete Flow Details
1. Complete cam profile interpolation (DTABY for lift curve)
2. Integrate `calcFlowDetails()` into UI
3. Create modal to display results
4. Verify output matches VB6 CDETAILS.CLS CalcFlowDetails

### To Complete Recommendations
1. Port complete CalcRecommendations from ENGPERF.BAS (lines 668-1050)
2. Port all helper calculations (speed of sound, flow areas, etc.)
3. Integrate into UI
4. Create modal to display results
5. Verify output matches VB6

## VB6 Reference Files
- `EPro Family 12_24_2025\ECommon\ENGPERF.BAS` - Physics calculations, recommendations
- `EPro Family 12_24_2025\ECommon\Cgraph.CLS` - Dyno curve generation
- `EPro Family 12_24_2025\EPro3w\CDETAILS.CLS` - Mechanical/Flow details
- `EPro Family 12_24_2025\EPro3w\RECOMD.FRM` - Recommendations UI
- `EPro Family 12_24_2025\EPro3w\DETAILS.FRM` - Details UI

## Testing Strategy
1. Create HTML test pages for each section
2. Compare TypeScript output with VB6 output
3. Iterate until 100% match
4. Document any VB6 quirks or special cases
