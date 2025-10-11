# VB6 Launch Block - Exact Code Transcription

## File: TIMESLIP.FRM

### Constants (Lines 542-548)

```vb
'program constants
Const Z5 = 3600 / 5280
Const JMin = -4
Const JMax = 2
Const K6 = 0.92
Const K61 = 1.08
Const AMin = 0.004          'reduced from .05 to .004 for Qjr and QPro in order
                            'to implement Buell rev limit option - 10/04/03. note: was .004 for BVPro already
```

### Initialization (Lines 1002-1059)

```vb
    iGear = 1:  ShiftFlag = 0:  iDist = 0:      iMPH = 1:       LAdd = 1:       SaveTime = 0
    L = 1:      Time0 = 0:      time(L) = 0:    Vel(L) = 0:     Dist(L) = 0:    DSRPM = 0
    
    Rem**  calculate launch conditions at starting line (static)
    EngRPM(L) = gc_LaunchRPM.Value
    Gear(L) = iGear
    DownForce = gc_Weight.Value
    
    Call TABY(xrpm(), yhp(), NHP, 1, EngRPM(L), HP)
    HP = gc_HPTQMult.Value * HP / hpc
    HPSave = HP
    TQ = Z6 * HP / EngRPM(L)
    TQ = TQ * gc_TorqueMult.Value * TGR(iGear) * TGEff(iGear)
    
    WindFPS = Sqr(Vel(L) ^ 2 + 2 * Vel(L) * (gc_WindSpeed.Value / Z5) * Cos(PI * gc_WindAngle.Value / 180) + (gc_WindSpeed.Value / Z5) ^ 2)
    q = Sgn(WindFPS) * rho * Abs(WindFPS) ^ 2 / (2 * gc)
    
    DragForce = CMU * gc_Weight.Value + gc_DragCoef.Value * gc_RefArea.Value * q
    force = TQ * gc_GearRatio.Value * gc_Efficiency.Value / (TireSlip * TireDia / 24) - DragForce
    
    'estimate maximum acceleration from force and weight
    If gc_TransType.Value Then
        Ags0 = 0.96 * force / gc_Weight.Value  'assume 4% misc losses on initial hit of tire
    Else
        Ags0 = 0.88 * force / gc_Weight.Value  'assume 12% misc losses on initial hit of tire
    End If
    AgsMax = Ags0    'save AgsMax for print tolerance selection
    
    'assume YCG is 3.75" above static rear axle centerline (to match Pro Stock)
    gc_YCG.IsCalc = True
    gc_YCG.Value = (TireDia / 2) + 3.75
    'gc_YCG.Value = 19  'dynamic CG height for Pro Stock
    
    Tire TireGrowth, TireCirFt
    TireRadIn = 12 * TireCirFt / (2 * PI)
    deltaFWT = (Ags0 * gc_Weight.Value * ((gc_YCG.Value - TireRadIn) + (FRCT / gc_Efficiency.Value) * TireRadIn) + DragForce * gc_YCG.Value) / gc_Wheelbase.Value
    
    'calculate dynamic front weight and static rear weight for launch conditions
    'set the required static front weight for perfect balance at launch
    DynamicFWT = 0
    gc_StaticFWt.IsCalc = True
    gc_StaticFWt.Value = deltaFWT + DynamicFWT
    'gc_StaticFWt.Value = 1230  'for Pro Stock
    
    'estimate static rear weight = total weight - estimated static front weight
    StaticRWT = DownForce - gc_StaticFWt.Value: If StaticRWT < 0 Then StaticRWT = gc_Weight.Value
    
    'calculate initial max tire force limit based on estimated static rear weight
    CAXI = (1 - (gc_TractionIndex.Value - 1) * 0.01) / (TrackTempEffect ^ 0.25)
    CRTF = CAXI * AX * TireDia * (gc_TireWidth.Value + 1) * (0.92 + 0.08 * (StaticRWT / 1900) ^ 2.15)
    If gc_BodyStyle.Value = 8 Then CRTF = 0.5 * CRTF
    
    AMAX = (CRTF - DragForce) / gc_Weight.Value
    SLIP(L) = 0:    If Ags0 > AMAX Then Ags0 = AMAX:    SLIP(L) = 1
                    If Ags0 < AMin Then Ags0 = AMin
    AGS(L) = Ags0
    'Work = time(L) + Dist(L) + Vel(L) + Ags(L) + Gear(L) + EngRPM(L)    'debug
    AddListLine
```

### Velocity Step Calculation (Lines 1090-1139)

```vb
    Vel0 = Vel(L):      Ags0 = AGS(L)
    Tire TireGrowth, TireCirFt
    RPM0 = EngRPM(L):   Time0 = time(L)
    If RPM0 = gc_LaunchRPM.Value And Time0 = 0 Then
        RPM0 = Stall:   If gc_LaunchRPM.Value < Stall Then Time0 = gc_EnginePMI.Value * (Stall - gc_LaunchRPM.Value) / 250000
    End If
    Dist0 = Dist(L)
    
    #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro only!
        'calc tire slip from traction index, track temp and downtrack location
        Work = 0.005 * (gc_TractionIndex.Value - 1) + 3 * (TrackTempEffect - 1)
        TireSlip = 1.02 + Work * (1 - (Dist0 / 1320) ^ 2)
    #End If
    
    DSRPM0 = DSRPM:     L = L + LAdd:   Gear(L) = iGear:  LAdd = 0
        
    Rem**  SELECT NEXT VELOCITY TO MEET VARIOUS OBJECTIVES (ShiftFlag < 2)
    Vel(L) = Vel0 + Ags0 * gc * TimeStep + Jerk * gc * TimeStep ^ 2 / 2
    
    If ShiftFlag = 2 Then GoTo 270
    
    'don't let TimeStep exceed K7 steps per TimePrintInc
    If TimeStep > (TimePrintInc / K7) Then TimeStep = TimePrintInc / K7
    'don't let TimeStep exceed TimePrint
    If TimeStep > (TimePrint - Time0) Then TimeStep = TimePrint - Time0
    'don't let TimeStep exceed 4.5 steps to distance print
    If iDist > 1 Then
        Work = ((DistToPrint(iDist) - DistToPrint(iDist - 1)) / Vel0) / 4.5 'increased from 2.0 7/11/99
        If TimeStep > Work Then TimeStep = Work
    End If
    If TimeStep > 0.05 Then TimeStep = 0.05     'reduced from .2 7/11/99
    
    Vel(L) = Vel0 + Ags0 * gc * TimeStep + Jerk * gc * TimeStep * TimeStep / 2
        
    'don't let TimeStep exceed shift points
    If Vel0 > 0 And RPM0 > Stall And iGear < NGR Then
        Work = Vel0 * (ShiftRPM(iGear) + 5) / RPM0
        If Vel(L) > Work Then
            Vel(L) = Work:      TimeStep = (Vel(L) - Vel0) / (Ags0 * gc)
        End If
    End If
    
    'don't let TimeStep exceed distance print
    DistStep = Dist0 + Vel0 * TimeStep + Ags0 * gc * TimeStep ^ 2 / 2
    If DistStep >= (DistToPrint(iDist) - DistTol) Then
        Vel(L) = Sqr(Vel0 ^ 2 + 2 * Ags0 * gc * (DistToPrint(iDist) - Dist0))
    End If

270 Rem**  ENTRY POINT FOR VELOCITY REVISION TO MATCH DISTANCE, TIME, OR SHIFT POINT PRINTS
    VelSqrd = Vel(L) ^ 2 - Vel0 ^ 2
```

### FIRST PQWT/AGS Calculation (Lines 1210-1229) - Before Iteration

```vb
    'calculate dynamic force on rear tires
    DynamicRWT = DownForce - DynamicFWT - WheelBarWT:   If DynamicRWT < 0 Then DynamicRWT = gc_Weight.Value
    'RWT(L) = dynamicRWT    'QProRxCode
    CRTF = CAXI * AX * TireDia * (gc_TireWidth.Value + 1) * (0.92 + 0.08 * (DynamicRWT / 1900) ^ 2.15)
    If gc_BodyStyle.Value = 8 Then CRTF = 0.5 * CRTF
    
    AMAX = ((CRTF / TireGrowth) - DragForce) / gc_Weight.Value
        
    'CALCULATE RESIDUAL HORSEPOWER AVAILABLE (limit to AMax)
    HP = HP * TGEff(iGear) * gc_Efficiency.Value / TireSlip
    HP = HP - DragHP
    PQWT = 550 * gc * HP / gc_Weight.Value:     AGS(L) = PQWT / (Vel(L) * gc)
    
    SLIP(L) = 0
    If AGS(L) > AMAX Then
        SLIP(L) = 1
        PQWT = PQWT * (AMAX - (AGS(L) - AMAX)) / AGS(L):    AGS(L) = AMAX - (AGS(L) - AMAX)
    End If
    If AGS(L) < AMin Then PQWT = PQWT * AMin / AGS(L):          AGS(L) = AMin
    time(L) = VelSqrd / (2 * PQWT) + Time0
```

### Iteration Loop (Lines 1231-1276) - SECOND PQWT/AGS with Inertia

```vb
    EngAccHP = gc_EnginePMI.Value * EngRPM(L) * (EngRPM(L) - RPM0)
    If EngAccHP < 0 Then
        If Not gc_TransType.Value Then
            EngAccHP = KP21 * EngAccHP
        Else
            EngAccHP = KP22 * EngAccHP
        End If
    End If
    
    ChasAccHP = ChassisPMI * DSRPM * (DSRPM - DSRPM0):          If ChasAccHP < 0 Then ChasAccHP = 0
    
    k = 0

280 Rem**  ITERATION TO CONVERGE INERTIA TRANSIENT check QProRxCode
    k = k + 1
    dtk1 = time(L) - Time0
    Work = (2 * PI / 60) ^ 2 / (12 * 550 * dtk1)
    HPEngPMI = EngAccHP * Work:    HPChasPMI = ChasAccHP * Work
    
    HP = (HPSave - HPEngPMI) * ClutchSlip
    HP = ((HP * TGEff(iGear) * gc_Efficiency.Value - HPChasPMI) / TireSlip) - DragHP
    PQWT = 550 * gc * HP / gc_Weight.Value
    AGS(L) = PQWT / (Vel(L) * gc)
    
    'steady iteration progress by using jerk limits
    Jerk = 0:   If dtk1 <> 0 Then Jerk = (AGS(L) - Ags0) / dtk1
    If Jerk < JMin Then Jerk = JMin:    AGS(L) = Ags0 + Jerk * dtk1:    PQWT = AGS(L) * gc * Vel(L)
    If Jerk > JMax Then Jerk = JMax:    AGS(L) = Ags0 + Jerk * dtk1:    PQWT = AGS(L) * gc * Vel(L)
    
    'and observe min/max Ags limits
    SLIP(L) = 0
    If AGS(L) > AMAX Then
        SLIP(L) = 1
        PQWT = PQWT * (AMAX - (AGS(L) - AMAX)) / AGS(L):    AGS(L) = AMAX - (AGS(L) - AMAX)
    End If
    If AGS(L) < AMin Then PQWT = PQWT * AMin / AGS(L):          AGS(L) = AMin
    
    time(L) = VelSqrd / (2 * PQWT) + Time0
    dtk2 = time(L) - Time0
    If k = 12 Or Abs(100 * (dtk2 - dtk1) / dtk2) <= 0.01 Then GoTo 300
    
    z = HP / HPSave
    If z < K6 Then z = K6
    If z > K61 Then z = K61
    time(L) = Time0 + dtk1 + z * (dtk2 - dtk1)
    GoTo 280

300 Rem**  CONVERGED VELOCITY STEP
```

### Distance Calculation (Line 1280)

```vb
    Dist(L) = ((2 * PQWT * (time(L) - Time0) + Vel0 ^ 2) ^ 1.5 - Vel0 ^ 3) / (3 * PQWT) + Dist0
```

---

## KEY FORMULAS EXTRACTED

### 1. PQWT (Wheel Thrust) Calculation

**First pass (Line 1221):**
```vb
HP = HP * TGEff(iGear) * gc_Efficiency.Value / TireSlip
HP = HP - DragHP
PQWT = 550 * gc * HP / gc_Weight.Value
```

**Second pass in iteration (Lines 1250-1252):**
```vb
HP = (HPSave - HPEngPMI) * ClutchSlip
HP = ((HP * TGEff(iGear) * gc_Efficiency.Value - HPChasPMI) / TireSlip) - DragHP
PQWT = 550 * gc * HP / gc_Weight.Value
```

**Unit transforms:**
- HP is in horsepower
- 550 converts HP to ft·lbf/s (550 ft·lbf/s = 1 HP)
- gc = 32.174 ft/s² (gravitational constant)
- Result: PQWT is in ft/s² (acceleration units when divided by weight)

### 2. AGS (Acceleration) Calculation

**Formula (Lines 1221, 1253):**
```vb
AGS(L) = PQWT / (Vel(L) * gc)
```

**NO VELOCITY FLOOR APPLIED IN THIS FORMULA**
- VB6 divides by `Vel(L)` directly
- At launch, `Vel(L) = 0`, so this would be division by zero
- However, VB6 uses a different integration method that doesn't rely on this formula at launch

### 3. AMax Clamp (Lines 1224-1227, 1262-1265)

```vb
If AGS(L) > AMAX Then
    SLIP(L) = 1
    PQWT = PQWT * (AMAX - (AGS(L) - AMAX)) / AGS(L):    AGS(L) = AMAX - (AGS(L) - AMAX)
End If
```

**Breakdown:**
- If acceleration exceeds traction limit
- Set slip flag
- Rescale PQWT: `PQWT_new = PQWT * (AMAX - (AGS - AMAX)) / AGS = PQWT * (2*AMAX - AGS) / AGS`
- Set AGS: `AGS_new = AMAX - (AGS - AMAX) = 2*AMAX - AGS`

### 4. AMin Clamp (Lines 1228, 1266)

```vb
If AGS(L) < AMin Then PQWT = PQWT * AMin / AGS(L):          AGS(L) = AMin
```

**Breakdown:**
- If acceleration below minimum
- Rescale PQWT: `PQWT_new = PQWT * AMin / AGS`
- Set AGS: `AGS_new = AMin`

### 5. Jerk Limits (Lines 1256-1258)

```vb
Jerk = 0:   If dtk1 <> 0 Then Jerk = (AGS(L) - Ags0) / dtk1
If Jerk < JMin Then Jerk = JMin:    AGS(L) = Ags0 + Jerk * dtk1:    PQWT = AGS(L) * gc * Vel(L)
If Jerk > JMax Then Jerk = JMax:    AGS(L) = Ags0 + Jerk * dtk1:    PQWT = AGS(L) * gc * Vel(L)
```

**Breakdown:**
- Calculate jerk (rate of change of acceleration)
- If jerk exceeds limits (JMin = -4, JMax = 2)
- Recalculate AGS based on jerk limit
- **IMPORTANT:** Rescale PQWT: `PQWT = AGS * gc * Vel(L)`

### 6. AMAX (Traction Limit) Calculation

**Lines 1213-1216:**
```vb
CRTF = CAXI * AX * TireDia * (gc_TireWidth.Value + 1) * (0.92 + 0.08 * (DynamicRWT / 1900) ^ 2.15)
If gc_BodyStyle.Value = 8 Then CRTF = 0.5 * CRTF

AMAX = ((CRTF / TireGrowth) - DragForce) / gc_Weight.Value
```

**Where:**
- CRTF = tire traction force (lbf)
- CAXI = traction index adjustment
- AX = base traction coefficient
- TireDia = tire diameter (inches)
- DynamicRWT = dynamic rear weight (lbs)
- TireGrowth = tire growth factor (>= 1.0)
- DragForce = total drag force (lbf)

### 7. Velocity Integration (Line 1107, 1122)

**VB6 uses kinematic integration:**
```vb
Vel(L) = Vel0 + Ags0 * gc * TimeStep + Jerk * gc * TimeStep ^ 2 / 2
```

**NOT:**
```vb
AGS(L) = PQWT / (Vel(L) * gc)  // This is ONLY used for convergence checking
```

### 8. Distance Integration (Line 1280)

**VB6 uses analytical solution:**
```vb
Dist(L) = ((2 * PQWT * (time(L) - Time0) + Vel0 ^ 2) ^ 1.5 - Vel0 ^ 3) / (3 * PQWT) + Dist0
```

**This assumes constant PQWT over the timestep**

---

## CRITICAL FINDINGS

### 1. VB6 Does NOT Use AGS = PQWT / (Vel * gc) for Integration

VB6 uses:
```vb
Vel(L) = Vel0 + Ags0 * gc * TimeStep + Jerk * gc * TimeStep ^ 2 / 2
```

Where `Ags0` is the **previous** acceleration, not recalculated from PQWT/Vel.

### 2. The AGS = PQWT / (Vel * gc) Formula is for Convergence

This formula appears in the iteration loop (line 1253) to check if the calculated PQWT is consistent with the velocity change. It's NOT used to integrate velocity.

### 3. At Launch (Vel = 0), VB6 Uses Initial Ags0

From lines 1022-1027:
```vb
force = TQ * gc_GearRatio.Value * gc_Efficiency.Value / (TireSlip * TireDia / 24) - DragForce

If gc_TransType.Value Then
    Ags0 = 0.96 * force / gc_Weight.Value  'assume 4% misc losses on initial hit of tire
Else
    Ags0 = 0.88 * force / gc_Weight.Value  'assume 12% misc losses on initial hit of tire
End If
```

Then clamped (lines 1055-1056):
```vb
If Ags0 > AMAX Then Ags0 = AMAX:    SLIP(L) = 1
If Ags0 < AMin Then Ags0 = AMin
```

This `Ags0` is used for the first velocity step, NOT `AGS(L) = PQWT / (Vel(L) * gc)`.

### 4. Order of Operations

1. Calculate HP from engine curve at EngRPM
2. Scale HP by ClutchSlip
3. Apply efficiencies and subtract drag HP
4. Convert to PQWT: `PQWT = 550 * gc * HP / Weight`
5. Calculate AGS from PQWT (for convergence check only)
6. Apply jerk limits (may recalculate PQWT from AGS)
7. Apply AMin/AMax clamps (rescale PQWT)
8. Integrate velocity using **Ags0** (previous acceleration), not AGS(L)
9. Integrate distance using analytical formula with PQWT

### 5. Z5 is NOT a Velocity Floor

`Z5 = 3600 / 5280` is a unit conversion factor (fps to mph), NOT a velocity floor.

There is NO velocity floor in the VB6 code to prevent division by zero in `AGS(L) = PQWT / (Vel(L) * gc)`.

VB6 simply doesn't use this formula for integration, so division by zero doesn't occur in practice.
