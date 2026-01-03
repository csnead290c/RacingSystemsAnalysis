# CRITICAL DISCREPANCIES FOUND IN ENGINE PERFORMANCE CALCULATIONS

## Issue 1: RamVEHP calculation uses wrong icdtq instead of icdrpm

### VB6 ENGPERF.BAS Line 327:
```vb
RamVEHP = 1 + 0.202 * epek * crekhp * psihp ^ 1.9 * niv ^ 0.145
RamVEHP = RamVEHP * icdtq * camk(gc_CamType.Value, 5) ^ 0.5 * lcehp
```

**VB6 uses `icdtq` on line 327**

### TypeScript enginePerf.ts Line 373-374:
```ts
const RamVEHP = (1 + 0.202 * epek * crekhp * Math.pow(psihp, 1.9) * Math.pow(noInValves, 0.145))
                * icdtq * Math.pow(camk[5], 0.5) * lcehp;
```

**TypeScript also uses `icdtq`**

**STATUS: ✓ MATCHES - This is NOT the issue**

Wait, let me re-check the VB6 code more carefully...

Looking at VB6 lines 230-231 for Peak TQ:
```vb
RamVETQ = 1 + 0.177 * epek * crektq * psitq ^ 1.52 * niv ^ 0.13
RamVETQ = RamVETQ * icdtq * camk(gc_CamType.Value, 2) ^ 0.5 * lcetq
```

And VB6 lines 326-327 for Peak HP:
```vb
RamVEHP = 1 + 0.202 * epek * crekhp * psihp ^ 1.9 * niv ^ 0.145
RamVEHP = RamVEHP * icdtq * camk(gc_CamType.Value, 5) ^ 0.5 * lcehp
```

**WAIT! VB6 uses `icdtq` for BOTH RamVETQ and RamVEHP!**

But looking at the off-design camshaft modeling section (VB6 lines 414-423):
```vb
PHI = gc_InCamDur.Value / optcam
icdrpm = 1:         icdtq = 1

If PHI < 0.99 Then
    phi1 = PHI + 0.01:       icdrpm = phi1 ^ 0.85
    icdtq = phi1 ^ 0.15     'ICDHP exp = 1.00
ElseIf PHI > 1.01 Then
    phi1 = PHI - 0.01:       icdrpm = phi1 ^ 0.35
    icdtq = phi1 ^ -0.9     'ICDHP exp = -0.55
End If
```

The comment says "ICDHP exp = 1.00" and "ICDHP exp = -0.55"

This suggests:
- `icdtq` is for TQ calculations
- `icdrpm` is for HP/RPM calculations

But the VB6 code uses `icdtq` for BOTH! Let me check the RPM calculations...

VB6 Line 248 (Peak TQ RPM calculation):
```vb
RamVE = RamVETQ ^ 0.015 * niv ^ 0.047
RamVE = RamVE * icdrpm * camk(gc_CamType.Value, 1) ^ 0.5
```

VB6 Line 344 (Peak HP RPM calculation):
```vb
RamVE = RamVEHP ^ -0.035 * niv ^ 0.049
RamVE = RamVE * icdrpm * camk(gc_CamType.Value, 4) ^ 0.5
```

**AH HA! The RamVE calculations for RPM use `icdrpm`, not `icdtq`!**

So the pattern is:
- RamVETQ and RamVEHP (torque values) use `icdtq`
- RamVE (for RPM calculations) uses `icdrpm`

This matches our TypeScript implementation. So this is NOT the issue.

## Issue 2: Need to verify all constants match exactly

Let me check CONSTANTS more carefully...

VB6 DECLARES.BAS:
```vb
Public Const PI = 3.141593
Public Const PSIA = 14.696
Public Const PSTD = 406.78
Public Const RSTD = 53.345  'Patrick - should be 53.3478
Public Const Z6 = (60 / (2 * PI)) * 550
Public Const RHOair = 0.07634  'Patrick - should be 0.07633
Public Const KRPM = (144 / PI) * 60 * 12
Public Const GC = 32.174
```

TypeScript engineConstants.ts:
```ts
PI: 3.141593,
PSIA: 14.696,
PSTD: 406.78,
RSTD: 53.345,
Z6: (60 / (2 * 3.141593)) * 550,
RHOair: 0.07634,
KRPM: (144 / 3.141593) * 60 * 12,
GC: 32.174,
```

**STATUS: ✓ ALL CONSTANTS MATCH**

## Issue 3: Check if there's a precision issue with the calculations

The VB6 code uses Single precision (32-bit float), while JavaScript uses Double precision (64-bit float).

This could cause small differences that accumulate through the iterations.

Let me check if there's a VB6 precision version...

YES! There is `enginePerfVB6Precision.ts` that uses Single precision emulation!

Let me check if that's being used...
