# VB6 vs TypeScript Line-by-Line Comparison - CalcEngPerf

## CRITICAL DISCREPANCY FOUND: Initial icdtq value

### VB6 ENGPERF.BAS Line 192:
```vb
ilc = 109:      PHI = 1:    icdtq = 0.995:  icdrpm = 1
```

### TypeScript enginePerf.ts Line 218:
```ts
let icdtq = 0.995;
```

**STATUS: ✓ MATCHES**

## Comparing Iteration Loop Structure

### VB6 Lines 204-435 vs TypeScript Lines 249-489

Checking each calculation step by step...

### 1. xqs calculation (IVC adjustment)
**VB6 Lines 205-210:**
```vb
xqs = 1
ivc = ilc + 1.08 * gc_InCamDur.Value / 2
If ivc > 180 Then
    ivcr = ivc * PI / 180
    xqs = (1 + 2 * LRQS - Cos(ivcr) - Sqr((2 * LRQS) ^ 2 - Sin(ivcr) ^ 2)) / 2
End If
```

**TypeScript Lines 250-255:**
```ts
let xqs = 1;
const ivc = ilc + 1.08 * inCamDur / 2;
if (ivc > 180) {
  const ivcr = ivc * CONSTANTS.PI / 180;
  xqs = (1 + 2 * LRQS - Math.cos(ivcr) - Math.sqrt(Math.pow(2 * LRQS, 2) - Math.pow(Math.sin(ivcr), 2))) / 2;
}
```

**STATUS: ✓ MATCHES**

### 2. Peak TQ acrit calculation
**VB6 Lines 214-220:**
```vb
If itr = 1 Then
    acrit = 4.4
Else
    acrit = 4.2 * (524 / (4.2 * tqfps)) ^ 0.181
End If
If gc_NoInValves.Value > 1 Then acrit = acrit / (137 / 133)
If gc_Fuel.Value = 3 Then acrit = acrit / 1.06
```

**TypeScript Lines 259-265:**
```ts
if (itr === 1) {
  acrit = 4.4;
} else {
  acrit = 4.2 * Math.pow(524 / (4.2 * tqfps), 0.181);
}
if (noInValves > 1) acrit = acrit / (137 / 133);
if (fuel === 3) acrit = acrit / 1.06;
```

**STATUS: ✓ MATCHES**

### 3. psitq calculation
**VB6 Lines 221-228:**
```vb
astar = acrit / (BArea / athroat)

If astar < 1 Then
    psitq = cdi ^ 1.56 * astar ^ 0.44
Else
    psitq = cdi ^ 1.56 * astar ^ (-3 * 0.44)
End If
psitq = psitq - 4.3 * (cdi - astar) ^ 2:    If psitq < 0 Then psitq = 0
```

**TypeScript Lines 266-275:**
```ts
const astarTQ = acrit / (BArea / athroat);

let psitq: number;
if (astarTQ < 1) {
  psitq = Math.pow(cdi, 1.56) * Math.pow(astarTQ, 0.44);
} else {
  psitq = Math.pow(cdi, 1.56) * Math.pow(astarTQ, -3 * 0.44);
}
psitq = psitq - 4.3 * Math.pow(cdi - astarTQ, 2);
if (psitq < 0) psitq = 0;
```

**STATUS: ✓ MATCHES**

### 4. RamVETQ calculation
**VB6 Lines 230-231:**
```vb
RamVETQ = 1 + 0.177 * epek * crektq * psitq ^ 1.52 * niv ^ 0.13
RamVETQ = RamVETQ * icdtq * camk(gc_CamType.Value, 2) ^ 0.5 * lcetq
```

**TypeScript Lines 277-278:**
```ts
const RamVETQ = (1 + 0.177 * epek * crektq * Math.pow(psitq, 1.52) * Math.pow(noInValves, 0.13))
                * icdtq * Math.pow(camk[2], 0.5) * lcetq;
```

**STATUS: ✓ MATCHES**

### 5. VETQ and EffCR calculation
**VB6 Lines 233-235:**
```vb
VETQ = CarbVETQ * PortVETQ
EffCR = CalcEffCR(VETQ * RamVETQ)
EFF = CalcEFF(EffCR)
```

**TypeScript Lines 280-282:**
```ts
const VETQ = CarbVETQ * PortVETQ;
const EffCRTQ = calcEffCR(VETQ * RamVETQ, compressionRatio, xqs, crx);
const EFFTQ = calcEFF(EffCRTQ, GAM);
```

**STATUS: ⚠️ NEED TO VERIFY CalcEffCR and CalcEFF functions match exactly**

### 6. tqfps calculation (RPM @ Peak TQ)
**VB6 Lines 239-252:**
```vb
tqfps = (5683.2 / 60) * S3QB ^ 0.172 * bore ^ 0 * flrqs ^ 0.42

PumpVE = VETQ ^ 0.32 * crvf ^ -2.7 * EqvPS ^ 0.608
PumpVE = PumpVE * camk(gc_CamType.Value, 1) ^ 0.5
tqfps = tqfps * PumpVE

RamVE = RamVETQ ^ 0.015 * niv ^ 0.047
RamVE = RamVE * icdrpm * camk(gc_CamType.Value, 1) ^ 0.5
tqfps = tqfps * RamVE

tqfps = tqfps * EFF ^ -0.22 * efik ^ 0 * metq ^ 0.59
gc_RPMPeakTQ.Value = FPStoRPM(tqfps)
```

**TypeScript Lines 285-299:**
```ts
tqfps = (5683.2 / 60) * Math.pow(S3QB, 0.172) * Math.pow(bore, 0) * Math.pow(flrqs, 0.42);

PumpVE = Math.pow(VETQ, 0.32) * Math.pow(crvf, -2.7) * Math.pow(EqvPS, 0.608);
PumpVE = PumpVE * Math.pow(camk[1], 0.5);
tqfps = tqfps * PumpVE;

RamVE = Math.pow(RamVETQ, 0.015) * Math.pow(noInValves, 0.047);
RamVE = RamVE * icdrpm * Math.pow(camk[1], 0.5);
tqfps = tqfps * RamVE;

tqfps = tqfps * Math.pow(EFFTQ, -0.22) * Math.pow(efik, 0) * Math.pow(metq, 0.59);
rpmPeakTQ = fpsToRPM(tqfps, flrqs, stroke);
```

**STATUS: ✓ MATCHES**

## NEXT: Need to check CalcEffCR and CalcEFF functions

These are critical functions that could be causing the discrepancy.
