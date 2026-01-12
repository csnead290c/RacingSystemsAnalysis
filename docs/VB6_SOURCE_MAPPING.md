# VB6 Source Mapping - Engine Pro Parity

This document maps exact VB6 source lines to RSA implementation for 100% parity verification.

## MECHANICAL DETAILS - Geometric Ratios

### VB6 Source: ENGPERF.BAS lines 61-67
```vb
BQS = bore / stroke                                    ' line 61
B2QS = bore * BQS                                      ' line 62
S3QB = stroke ^ 2 / BQS                                ' line 63
LRQS = rod / stroke                                    ' line 64
AngMPS = 62 + (750 * (LRQS - 0.958)) ^ 0.4027         ' line 65
flrqs = 1 + (0.348 / LRQS) ^ 1.99                     ' line 66
DQR = (gc_Deck.Value + gc_Gasket.Value) / rod         ' line 67
```

### VB6 Display Format: DETAILS.FRM lines 386-391
```vb
lblRatio(0).caption = RightAlign(5, 2, BQS)                          ' Bore/Stroke - 2 decimals
lblRatio(1).caption = RightAlign(5, 2, LRQS)                         ' Rod/Stroke - 2 decimals
lblRatio(2).caption = RightAlign(5, 4, DQR)                          ' Piston-to-head - 4 decimals
lblRatio(3).caption = RightAlign(5, 3, gc_CSArea.Value / BArea)      ' Throat/Bore - 3 decimals
lblRatio(4).caption = RightAlign(5, 3, gc_ValveLift.Value / ivd)     ' Lift/Valve Dia - 3 decimals
lblRatio(5).caption = RightAlign(5, 0, CCP)                          ' Cranking Compression - 0 decimals
```

**CORRECTION:** User claimed bore/stroke and rod/stroke need 3 decimals, but VB6 uses **2 decimals**.

### Piston-to-Head Ratio (DQR) Investigation

**Issue:** RSA=0.0032 vs VB6=0.0092

**VB6 Formula:** `DQR = (gc_Deck.Value + gc_Gasket.Value) / rod`

**Base Case Values (from VB6 screenshots):**
- Rod length: 5.850 inches
- Deck height: ? (need to verify)
- Gasket thickness: ? (need to verify)

**Expected Calculation:**
```
DQR = (deck + gasket) / rod
0.0092 = (deck + gasket) / 5.850
deck + gasket = 0.0092 * 5.850 = 0.05382 inches
```

**RSA Calculation (if showing 0.0032):**
```
0.0032 = (deck + gasket) / 5.850
deck + gasket = 0.0032 * 5.850 = 0.01872 inches
```

**Discrepancy:** RSA is using wrong deck/gasket values OR wrong rod length.

**Action Required:**
1. Verify base case deck height and gasket thickness from VB6 .ENG file
2. Verify rod length units (inches vs mm)
3. Add VB6_TRACE to show: deck, gasket, rod, DQR calculation

### Throat/Bore Area Ratio Investigation

**Issue:** RSA=0.188 vs VB6=0.191

**VB6 Formula:** `gc_CSArea.Value / BArea`

Where:
- `BArea = PI * bore ^ 2 / 4` (bore area)
- `gc_CSArea.Value` = minimum cross-section area (throat area)

**VB6 Throat Area Calculation:** ENGPERF.BAS lines 1262-1298 (CalcWSCSArea)
```vb
' Valve seat area - low valve lift
a1 = gc_NoInValves.Value * PI * vd * H

' Valve curtain area - mid valve lift  
a2 = gc_NoInValves.Value * PI * (vd - w) * H

' Valve throat area - high valve lift
a3 = gc_NoInValves.Value * PI * (vsd ^ 2 - vstmd ^ 2) / 4

' Choose controlling flow area
gc_WSCSArea.Value = minimum of (a1, a2, a3)
```

**Base Case Values:**
- Bore: 4.030 inches
- BArea = PI * 4.030^2 / 4 = 12.7547 sq in
- Expected throat area = 0.191 * 12.7547 = 2.436 sq in
- RSA throat area (if 0.188) = 0.188 * 12.7547 = 2.398 sq in

**Discrepancy:** 0.038 sq in difference in throat area calculation

**Action Required:**
1. Verify valve diameter, seat diameter, stem diameter inputs
2. Verify valve lift used for throat calculation
3. Add VB6_TRACE to show: vd, vsd, vstmd, H, a1, a2, a3, final area

## FLOW DETAILS

### VB6 Source: CDETAILS.CLS lines 274-465

**Current Parity Status:**
- ✅ vpd calculation (line 431): FIXED - produces 54 inH2O at 30°
- ✅ CFM calculation (line 437): FIXED
- ✅ Velocity calculation (line 441): FIXED
- ⚠️ Flow area: Need to verify matches VB6 exactly
- ⚠️ Piston speed: Need to verify negative values during exhaust

### Camshaft Description Fields

**VB6 Source:** Need to examine FDetail.frm to see exact fields displayed

**Action Required:**
1. Find VB6 FDetail.frm camshaft description section
2. Document exact fields shown (duration, ILC, LSA, etc.)
3. Remove any fields RSA shows that VB6 doesn't

### Override Behavior

**VB6 Source:** Need to examine FDetail.frm for editable field properties

**Action Required:**
1. Find which fields are editable in VB6
2. Implement same editable/calculated behavior in RSA
3. Add "Reset to calculated" functionality

## FLOWBENCH DATA

### VB6 Source: ENGPERF.BAS lines 1161-1176 (CalcFlowStuff)

```vb
' Flow Flux = Flow / Area
gc_FlowFlux.Value = FlowVal / gc_CSArea.Value

' Flow Velocity = 2.4 * (Flow / Area)
gc_FlowVel.Value = 2.4 * (FlowVal / gc_CSArea.Value)

' Flow Velocity Index = 100 * Velocity / VSTD
gc_FVIndex.Value = 100 * (2.4 * FlowVal / gc_CSArea.Value) / VSTD
```

Where `VSTD` = standard velocity (need to find value)

### Area Saturation/Cap

**VB6 Source:** ENGPERF.BAS lines 1619-1620
```vb
gc_CSArea.MinVal_In = gc_MaxInFlow.Value / gc_FlowFlux.MaxVal_In
gc_CSArea.MaxVal_In = gc_NoInValves.Value * (PI / 4) * vd ^ 2 * (VSW ^ 2 - VSTM)
```

Where:
- `VSW` = valve seat width factor
- `VSTM` = valve stem factor

**Action Required:**
1. Find VSW and VSTM constants
2. Implement area capping logic
3. Verify matches VB6 behavior

## RECOMMENDATIONS

### Total Intake Tract Volume

**VB6 Source:** Need to find in RECOMD.FRM or ENGPERF.BAS

**Action Required:**
1. Search for "intake tract volume" or "runner volume" calculation
2. Document formula and units
3. Implement in RSA

### Intake Lobe Centerline

**Issue:** RSA=106 vs VB6=105

**VB6 Source:** Need to verify if this is input or calculated

**Action Required:**
1. Check if VB6 uses input ILC directly or calculates from LSA
2. Verify base case .ENG file has ILC=105
3. Fix RSA to match

### Exhaust Port Formatting

**VB6 Source:** Need to examine RECOMD.FRM

**Action Required:**
1. Find exhaust port display section
2. Document percentage calculation
3. Document valve diameter rounding (2 decimals)
4. Document min/max flow area display

## COMPRESSION RATIO CALCULATOR

**VB6 Source:** Need to find CR calculator form

**Action Required:**
1. Find CR calculator form/worksheet
2. Document exact input fields
3. Remove any fields RSA has that VB6 doesn't
4. Verify CR rounding to 1 decimal

## CHART SCALING

### Mechanical Details Chart

**VB6 Source:** DETAILS.FRM lines 285-299 (gphMechDet properties)

**Action Required:**
1. Extract exact axis ranges from VB6 form
2. Extract gridline style (dotted vs solid)
3. Match RSA chart to VB6 exactly

### Flow Details Chart

**VB6 Source:** FDetail.frm chart properties

**Action Required:**
1. Extract exact axis ranges
2. Extract series configuration
3. Match RSA chart to VB6 exactly

### Flowbench Chart

**VB6 Source:** FlowB.frm chart properties

**Action Required:**
1. Extract chart configuration
2. Implement missing chart in RSA
3. Match axis ranges and gridlines

## NEXT STEPS

1. **IMMEDIATE:** Verify base case .ENG file values for deck/gasket
2. **IMMEDIATE:** Create VB6_TRACE outputs for DQR and throat area calculations
3. **IMMEDIATE:** Fix DQR and throat area discrepancies with exact VB6 formulas
4. **PHASE 2:** Implement missing features (override behavior, charts, etc.)
5. **PHASE 3:** Add golden-master tests with strict formatting assertions
