# Critical VB6 vs TypeScript Differences

## Issue Found: Single Precision Had No Effect
The Float32Array Single precision emulation produced **identical** results to double precision, proving the issue is **NOT** floating-point precision differences.

## This Means
The discrepancy must be in:
1. **Formula differences** - A formula was ported incorrectly
2. **Calculation order** - Variables are updated in the wrong order
3. **Variable scope** - Module-level variables in VB6 behave differently than expected
4. **Missing calculations** - Something is calculated in VB6 but not in TypeScript

## Systematic Review Needed

### VB6 Module-Level Variables (from ENGPERF.BAS line 8)
```vb
Private GAM As Single, crx As Single, xqs As Single, EffCR As Single, tqcfm As Single
Private hpcfm As Single, hpfps As Single, RamVEHP As Single, acrit As Single
Private epek As Single
```

These are **module-level** and persist across function calls. The `Friction` function accesses:
- `bore` (module-level, set at line 54)
- `stroke` (module-level, set at line 55)
- `EffCR` (module-level, updated at lines 234 and 330)
- `crx` (module-level, set at line 75/77/79)
- `CID` (module-level, calculated)
- `gc_NoCyl.Value`, `gc_Inline.Value`, `gc_CamType.Value`, `gc_NoInValves.Value` (global controls)

### Key Questions to Answer
1. Is `EffCR` being used correctly in the friction calculation?
2. Are there any VB6 implicit type conversions that affect calculations?
3. Is there a formula that uses a different exponent or coefficient?
4. Are there any VB6-specific behaviors (like integer division) that differ?

### Next Steps
1. Add detailed logging to both VB6 and TypeScript to compare intermediate values
2. Focus on the first iteration to see where values diverge
3. Check if there are any differences in how constants are defined
4. Verify all array indexing (VB6 uses 1-based, TypeScript uses 0-based)

## Array Indexing Issue?
VB6: `camk(gc_CamType.Value, 1)` - uses 1-based indexing
TypeScript: `camk[1]` - uses 0-based indexing

**CRITICAL**: Need to verify CAM_FACTORS array is indexed correctly!
