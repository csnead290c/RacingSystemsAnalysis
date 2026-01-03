# VB6 Engine Pro Fields Reference

## Complete Field List from ENGINE.FRM and ENGPERF.BAS

### Basic Engine Design
- **Number of Cylinders** (gc_NoCyl): 1-12, typically 4-8
- **Engine Layout** (gc_Inline): 0=Inline, 1=Vee, 2=Flat/Opposed
- **Bore** (gc_Bore): 2.0-5.0 inches typical
- **Stroke** (gc_Stroke): 2.0-5.0 inches typical
- **Rod Length** (gc_Rod): 4.0-8.0 inches typical
- **Compression Ratio** (gc_CR): 7.0-16.0 typical
- **Deck Height** (gc_Deck): 0.0-0.050 inches
- **Head Gasket Thickness** (gc_Gasket): 0.018-0.060 inches

### Camshaft
- **Cam Type** (gc_CamType): 0-6 (Overhead Cam, Roller, Mushroom, High Rate Flat, Normal Flat, Hydraulic Roller, Hydraulic Flat)
- **Intake Cam Duration @ 0.050"** (gc_InCamDur): 180-320 degrees, even numbers only
- **Lobe Separation Angle** (gc_LobeSepAng): **CALCULATED** 102-116 degrees
  - Formula: `lsa = 100 + 1.2 * RPMPeakHP / 1000`
  - Adjusted by: `lsa = lsa * (InCamDur / 270)^0.5 + (1.8 / LRQS)^4 - 1`
  - Clamped: 102° min, 116° max
- **Intake Lobe Centerline** (gc_InLobeCL): **CALCULATED** 100-118 degrees
  - Formula: `ilc = lsa - (1 - EffCR / crx) * 15`
  - Clamped: 100° min, 118° max

### Throttle/Carburetor
- **Throttle CFM @ 1.5" Hg** (gc_CarbCFM): 200-3000 CFM
- **Carb vs EFI** (gc_Carb): Boolean (0=EFI, 1=Carb)

### Fuel Type
- **Fuel** (gc_Fuel): 1=Gasoline, 2=Racing Gasoline, 3=Methanol

### Intake Manifold
- **Manifold Type** (gc_Manifold): 1=Plenum, 2=Individual Runner, 3=Dual Plane Divided, 4=Dual Plane Slot
- **Runner Style** (gc_Curved): Boolean (curved vs straight)
- **Manifold Flow Factor** (gc_ManFlow): 70-100%

### Cylinder Head
- **Number of Intake Valves** (gc_NoInValves): 1, 2, or 3
- **Intake Valve Diameter** (gc_ValveDia): 1.0-3.0 inches
- **Max Intake Flow** (gc_MaxInFlow): 50-500 CFM @ 28" H2O
- **Flow Test Pressure** (gc_FlowTestP): 10-28" H2O
- **Reference Bore** (gc_RefBore): Within 2% of actual bore

### Calculated/Derived Values (from CalcEngPerf)
- **Displacement** (CID): Calculated from bore, stroke, cylinders
- **Peak HP** (gc_HP): Calculated
- **RPM @ Peak HP** (gc_RPMPeakHP): Calculated
- **Peak TQ** (gc_TQ): Calculated
- **RPM @ Peak TQ** (gc_RPMPeakTQ): Calculated
- **Shift Point** (gc_Shift): Calculated
- **Redline** (gc_Redline): Calculated

### Dynamic Validation Rules (from Cvalue.cls)
Each field has:
- **MinVal/MaxVal**: Numeric limits
- **MinVal_Normal/MaxVal_Normal**: Limits in primary units (inches)
- **MinVal_Alternate/MaxVal_Alternate**: Limits in alternate units (mm)
- **HasMinMax**: Boolean flag for validation
- **Inches**: Boolean for unit system

### Tooltips (from ENGINE.FRM)
- **InCamDur**: "only even numbers will be accepted"
- **CarbCFM Button**: "Press this button to display the Throttle CFM @ 1.5 inches Hg Worksheet"
- **Carb Option**: "Press this option button to select carburetors"
- **EFI Option**: "Press this option button to select either electronic or mechanical fuel injection"

## Implementation Strategy

1. **Extend EngineSimConfig** with all Engine Pro fields
2. **Add calculated defaults** for LSA and ILC that update when dependencies change
3. **Make LSA and ILC editable** - user can override calculated values
4. **Implement dynamic validation** based on VB6 min/max rules
5. **Add tooltips** matching VB6 descriptions
6. **Show/hide fields** based on mode (Simple vs Advanced)
