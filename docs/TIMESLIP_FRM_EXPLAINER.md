# TIMESLIP.FRM Explainer

**Purpose:** Map VB6 TIMESLIP.FRM to TypeScript implementation  
**VB6 Source:** `Reference Files/QCommon/TIMESLIP.FRM`  
**TypeScript Files:**
- `src/domain/physics/models/vb6Exact.ts` - Simulation orchestration
- `src/domain/physics/vb6/vb6SimulationStep.ts` - Core physics

---

## Key Sections

### 1. Constants (Lines 541-570)
**VB6:**
```vb
Const Z5 = 3600 / 5280    ' fps to mph
Const JMin = -4, JMax = 2  ' jerk limits (g/s)
Const AMin = 0.004         ' min acceleration (g)
Const AX = 10.8            ' traction coefficient
Const CMU = 0.025          ' rolling resistance
Const FRCT = 1.03          ' driveline friction
```
**TS:** `src/domain/physics/vb6/constants.ts` ✅ MATCH

---

### 2. Track Temperature Effect (Lines 865-870)
**VB6:**
```vb
If gc_TrackTemp.Value > 100 Then
    TrackTempEffect = 1 + 0.0000025 * Abs(100 - gc_TrackTemp.Value) ^ 2.5
Else
    TrackTempEffect = 1 + 0.000002 * Abs(100 - gc_TrackTemp.Value) ^ 2.5
End If
If TrackTempEffect > 1.04 Then TrackTempEffect = 1.04
```
**TS:** `vb6SimulationStep.ts` → `calculateTrackTempEffect()` ✅ MATCH

---

### 3. Initial Tire Slip (Line 872)
**VB6:**
```vb
TireSlip = 1.02 + (gc_TractionIndex.Value - 1) * 0.005 + (TrackTempEffect - 1) * 3
```
**TS:** `vb6SimulationStep.ts` line ~875 ✅ MATCH

---

### 4. Stall RPM from Lambda (Lines 920-946)
**VB6:** Quadratic solve to find RPM where torque curve intersects absorption
**TS:** `quarterJr.ts` → `calcStallRPMFromIndex()` ✅ FIXED Dec 2024

---

### 5. Launch HP Calculation (Lines 1010-1011)
**VB6:**
```vb
Call TABY(xrpm(), yhp(), NHP, 1, EngRPM(L), HP)
HP = gc_HPTQMult.Value * HP / hpc    ' <<< HPTQMult applied!
```
**TS:** `vb6SimulationStep.ts` line ~730 ✅ FIXED Dec 2024 (was missing HPTQMult)

---

### 6. Launch Loss Factors (Lines 1023-1027)
**VB6:**
```vb
If gc_TransType.Value Then
    Ags0 = 0.96 * force / gc_Weight.Value  ' Converter: 4% loss
Else
    Ags0 = 0.88 * force / gc_Weight.Value  ' Clutch: 12% loss
End If
```
**TS:** `vb6SimulationStep.ts` → `vb6InitState()` ✅ MATCH

---

### 7. CRTF Calculation (Lines 1050-1052)
**VB6:**
```vb
CAXI = (1 - (gc_TractionIndex.Value - 1) * 0.01) / (TrackTempEffect ^ 0.25)
CRTF = CAXI * AX * TireDia * (gc_TireWidth.Value + 1) * (0.92 + 0.08 * (StaticRWT / 1900) ^ 2.15)
If gc_BodyStyle.Value = 8 Then CRTF = 0.5 * CRTF
```
**TS:** `vb6SimulationStep.ts` lines 590-616 ✅ MATCH

---

### 8. Converter Slip Logic (Lines 1154-1172)
**VB6:**
```vb
If iGear = 1 Or gc_LockUp.Value = 0 Then        'non lock-up
    zStall = Stall
    SlipRatio = gc_Slippage.Value * LockRPM / zStall
    If L > 2 Then
        If SlipRatio > 0.6 Then zStall = zStall * (1 + (gc_Slippage.Value - 1) * (SlipRatio - 0.6) / ((1 / gc_Slippage.Value) - 0.6))
    End If
    ClutchSlip = 1 / gc_Slippage.Value
    If EngRPM(L) < zStall Then
        EngRPM(L) = zStall
        Work = gc_TorqueMult.Value - (gc_TorqueMult.Value - 1) * SlipRatio
        ClutchSlip = Work * LockRPM / zStall
    End If
Else                                            'lock-up
    EngRPM(L) = 1.005 * LockRPM
    ClutchSlip = LockRPM / EngRPM(L)
End If
```
**TS:** `vb6SimulationStep.ts` lines 503-560 ✅ MATCH

---

### 9. Drag Force (Lines 1180-1194)
**VB6:**
```vb
WindFPS = Sqr(Vel(L)^2 + 2*Vel(L)*(gc_WindSpeed.Value/Z5)*Cos(PI*gc_WindAngle.Value/180) + (gc_WindSpeed.Value/Z5)^2)
q = Sgn(WindFPS) * rho * Abs(WindFPS)^2 / (2 * gc)
DownForce = gc_Weight.Value + gc_LiftCoef.Value * RefArea2 * q
cmu1 = CMU - (Dist0 / 1320) * CMUK
DragForce = cmu1 * DownForce + 0.0001 * DownForce * (Z5 * Vel(L)) + gc_DragCoef.Value * RefArea2 * q
```
**TS:** `vb6SimulationStep.ts` lines 552-588 ✅ MATCH

---

### 10. Weight Transfer (Lines 1196-1216)
**VB6:**
```vb
deltaFWT = (Ags0*Weight*((YCG-TireRadIn) + (FRCT/Efficiency)*TireRadIn) + DragForce*YCG) / Wheelbase
DynamicFWT = StaticFWt - deltaFWT
DynamicRWT = DownForce - DynamicFWT - WheelBarWT
CRTF = CAXI * AX * TireDia * (TireWidth+1) * (0.92 + 0.08*(DynamicRWT/1900)^2.15)
AMAX = ((CRTF / TireGrowth) - DragForce) / Weight
```
**TS:** `vb6SimulationStep.ts` lines 590-616 ✅ MATCH

---

### 11. AMax Reflection (Line 1226)
**VB6:**
```vb
PQWT = PQWT * (AMAX - (AGS(L) - AMAX)) / AGS(L)
AGS(L) = AMAX - (AGS(L) - AMAX)   ' Reflect back from AMAX
```
**TS:** `vb6SimulationStep.ts` line ~640 ✅ MATCH

---

### 12. AMin Scaling (Line 1228) ⭐ CRITICAL FIX
**VB6:**
```vb
If AGS(L) < AMin Then PQWT = PQWT * AMin / AGS(L):  AGS(L) = AMin
```
**TS:** `vb6SimulationStep.ts` line ~647 ✅ FIXED Dec 2024
- **Old (WRONG):** `PQWT = AMin * gc * Vel_L` (recalculate)
- **New (CORRECT):** `PQWT = PQWT * AMin / AGS_g` (scale proportionally)

---

### 13. PMI Iteration Loop (Lines 1244-1276)
**VB6:** 12-iteration convergence loop for inertia transients
```vb
280 k = k + 1
    dtk1 = time(L) - Time0
    Work = (2 * PI / 60)^2 / (12 * 550 * dtk1)
    HPEngPMI = EngAccHP * Work
    HPChasPMI = ChasAccHP * Work
    HP = (HPSave - HPEngPMI) * ClutchSlip
    HP = ((HP * TGEff(iGear) * Efficiency - HPChasPMI) / TireSlip) - DragHP
    ' ... jerk limits, AMAX/AMin clamping ...
    If k = 12 Or Abs(100*(dtk2-dtk1)/dtk2) <= 0.01 Then GoTo 300
```
**TS:** `vb6SimulationStep.ts` lines 683-747 ✅ MATCH

---

### 14. Distance Calculation (Line 1280)
**VB6:**
```vb
Dist(L) = ((2*PQWT*(time(L)-Time0) + Vel0^2)^1.5 - Vel0^3) / (3*PQWT) + Dist0
```
**TS:** `vb6SimulationStep.ts` line ~755 ✅ MATCH

---

### 15. Velocity Revision Loop (Lines 1344-1352)
**VB6:**
```vb
NextVel = Vel(L)
If VelDistMatch > 0 And VelDistMatch < NextVel Then NextVel = VelDistMatch
If VelTimeMatch > 0 And VelTimeMatch < NextVel Then NextVel = VelTimeMatch
If VelMPHMatch > 0 And VelMPHMatch < NextVel Then NextVel = VelMPHMatch
If VelShiftMatch > 0 And VelShiftMatch < NextVel Then NextVel = VelShiftMatch
If NextVel > Vel0 And NextVel < Vel(L) Then Vel(L) = NextVel: GoTo 270
```
**TS:** `vb6SimulationStep.ts` lines 1372-1393 ✅ MATCH

---

### 16. Shift Logic (Lines 1354-1434)
**VB6:**
```vb
If iGear < NGR And Abs(ShiftRPM(iGear) - EngRPM(L)) < ShiftRPMTol Then ShiftFlag = 1
' ...
If ShiftFlag = 1 Then ShiftFlag = 2: iGear = iGear + 1: GoTo 230
If ShiftFlag = 2 Then ShiftFlag = 0
```
**TS:** `vb6SimulationStep.ts` ✅ FIXED Dec 2024 (tolerance-based, not `>=`)

---

### 17. Tire Growth (Lines 1585-1607)
**VB6:**
```vb
TGK = (gc_TireWidth.Value^1.4 + TireDia - 16) / (0.171 * TireDia^1.7)
TireGrowth = 1 + TGK * 0.0000135 * Vel(L)^1.6
TGLinear = 1 + TGK * 0.00035 * Vel(L)
If TGLinear < TireGrowth Then TireGrowth = TGLinear
TireSQ = TireGrowth - 0.035 * Abs(Ags0)
TireCirFt = TireSQ * TireDia * PI / 12
```
**TS:** `vb6SimulationStep.ts` lines 209-245 ✅ MATCH

---

## Summary of Dec 2024 Fixes (Patrick's Feedback)

| # | Issue | VB6 Line | Fix |
|---|-------|----------|-----|
| 1 | AMin PQWT scaling | 1228 | Scale proportionally, don't recalculate |
| 2 | Stall RPM from index | 920-946 | Implement quadratic solve |
| 3 | HPTQMult in launch HP | 1011 | Add missing multiplier |
| 4 | TSMax using wrong HP | 1063 | Use corrected HP |
| 5 | Shift tolerance | 1355 | Use `Abs() < tol` not `>=` |

---

## File Cross-Reference

| VB6 Function/Section | TypeScript File | Function |
|---------------------|-----------------|----------|
| CalcOutput() main | vb6Exact.ts | runVB6ExactSimulation() |
| Line 230-340 loop | vb6SimulationStep.ts | vb6SimulationStep() |
| Weather subroutine | air.ts | calculateHPC(), calculateRho() |
| ENGINE subroutine | engineCurve.ts | generateSyntheticHPCurve() |
| Tire subroutine | vb6SimulationStep.ts | calculateTireGrowth() |
| TABY interpolation | interpolate.ts | linearInterpolate() |
| Constants | constants.ts | All exported consts |
| QuarterJr params | quarterJr.ts | calculateQuarterJrParams() |
