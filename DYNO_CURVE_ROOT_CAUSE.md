# Dyno Curve Mismatch - Root Cause Analysis

## Problem Statement
RSA dyno curve shows **335 HP @ 4500 RPM** vs VB6's **327 HP** (2.45% error)

## Investigation Results

### 1. Peak Values ✓ CORRECT
- RSA: 461.3 HP @ 6650 RPM, 414.6 TQ @ 5450 RPM
- VB6: 461 HP @ 6650 RPM, 415 TQ @ 5450 RPM
- Error: < 0.1% - **NOT THE ISSUE**

### 2. Constants ✓ CORRECT
- PI = 3.141593 (matches VB6)
- Z6 = 5252.112542904189 (matches VB6)
- All other constants verified

### 3. CID Calculation ✓ CORRECT
- RSA: 355.115153
- VB6: 355.1
- Error: 0.0043% - **NOT THE ISSUE**

### 4. Lookup Tables ✓ CORRECT
- SX, sz, sy arrays verified against VB6 source
- DTABY interpolation tested and matches exactly
- At RPMR=0.6, HPCID=1.298: TQR = 1.0066 (matches)

### 5. Single vs Double Precision ✓ NOT THE ISSUE
- Tested float32 vs float64
- Precision differences < 0.001%
- Cannot explain 2.45% error

### 6. Curve Generation Algorithm ✗ **THIS IS THE ISSUE**
- Our 29-point curve interpolation gives: **TQ = 391.39 @ 4500 RPM**
- VB6 expects: **TQ = 382 @ 4500 RPM**
- Error: **9.39 TQ (2.46%)**

## Hypothesis: VB6 Dyno Table Source

The VB6 dyno table might NOT come from Cgraph.CLS interpolation at all!

### Evidence:
1. VB6 shows values at 250 RPM increments (4500, 4750, 5000...)
2. Cgraph generates 125 RPM increments, displays every other point
3. But our interpolation at those exact RPM points still doesn't match

### Possible Explanations:

#### A. VB6 Rounds/Formats Values Before Display
- Check if `RightAlign()` function rounds values
- Check if VB6 uses `Format()` or `Val()` conversions
- **Status**: Need to find RightAlign() implementation

#### B. VB6 Uses Different CID for Curve Generation
- Cgraph.CLS uses global `CID` variable
- Maybe VB6 rounds CID before passing to Cgraph?
- **Status**: Tested - rounding doesn't fix it

#### C. DTABY/TABY Are External Library Functions
- Not defined in VB6 source files
- Might be in a compiled DLL with different interpolation
- **Status**: Need to find library or reverse-engineer from behavior

#### D. VB6 Curve Stretching Formula Differs
- Lines 186-208 in Cgraph.CLS stretch the curve
- Maybe our implementation has subtle differences?
- **Status**: Need to verify formula exactly

## Next Steps

1. **Find DTABY/TABY implementation** - Search for DLL or external library
2. **Test VB6 program directly** - Run VB6 with debug output to get exact 29-point curve
3. **Check curve stretching formulas** - Verify lines 186-208 match exactly
4. **Verify XMin/XMax calculation** - Lines 211-222 determine RPM range
5. **Check if VB6 rounds intermediate values** - Test with VB6 debugger

## Critical Question

**Where do VB6's dyno table values (327, 358, 387...) actually come from?**

Options:
- A. Cgraph.CLS CalcGraph() - most likely
- B. Separate calculation in ENGPERF.BAS - need to check
- C. Formatted/rounded from Cgraph values - need to verify

## Action Required

Need to either:
1. Run VB6 program with debugger to capture exact intermediate values
2. Find DTABY/TABY library source code
3. Reverse-engineer by testing many input combinations

Without VB6 debug output or library source, we're guessing at the exact algorithm.
