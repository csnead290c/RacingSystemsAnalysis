# VB6 UI Element Matching

## Critical Fixes Applied

### ✓ FIXED: Inline Parameter Mapping
**Issue**: Layout mapping was backwards
- **VB6 Correct**: 0=Inline, 1=Vee, 2=Flat/Opposed
- **TypeScript Was**: 0=Vee, 1=Inline, 2=Flat (WRONG!)
- **Fixed In**: `src/domain/physics/engine/engineAdapter.ts` line 78-82

### ✓ FIXED: Cam Type Labels
**Issue**: Labels didn't match VB6 exactly
- Updated all cam type dropdowns to use exact VB6 labels:
  - 0: "Overhead Cam"
  - 1: "Roller Cam & Lifter"
  - 2: "Mushroom Tappet"
  - 3: "High Rate-of-Lift Flat Tappet"
  - 4: "Normal Flat Tappet & Solid Lifter"
  - 5: "Hydraulic Roller Cam & Lifter"
  - 6: "Normal Hydraulic Cam & Lifter"

## VB6 Elements to Verify/Implement

### Engine Design Section
- [x] Number of Cylinders (1-12)
- [x] Layout (Inline/Vee/Flat)
- [x] Bore (inches)
- [x] Stroke (inches)
- [x] Rod Length (inches)
- [x] Compression Ratio

### Camshaft Section
- [x] Cam Type (dropdown with exact VB6 labels)
- [x] Intake Duration @ 0.050" (degrees)
- [ ] Intake Valve Lift (inches) - ENGINE Pro only
- [ ] Lobe Separation Angle (degrees) - ENGINE Pro only
- [ ] Intake Lobe Centerline (degrees) - ENGINE Pro only

### Intake System Section
- [x] Carburetor/EFI toggle
- [x] Carburetor CFM
- [x] Fuel Type (Gasoline/Racing Gasoline/Methanol)
- [x] Manifold Type (Common Plenum/Individual Runner/Dual Plane/Dual Plane w/Slot)
- [x] Runner Style (Curved/Straight)
- [x] Manifold Flow Factor (%)

### Cylinder Head Section
- [x] Number of Intake Valves per Cylinder
- [x] Intake Valve Diameter (inches)
- [x] Max Intake Flow (CFM)
- [x] Flow Test Pressure (inches H2O)
- [x] Flow Test Bore Diameter (inches)

### Compression Ratio Worksheet (ENGINE Pro)
- [ ] Combustion Chamber Volume (cc)
- [ ] Piston to Deck Height (inches)
- [ ] Head Gasket Thickness (inches)
- [ ] Piston Dome Volume (cc)

### Output Sections to Add

#### Mechanical Details (ENGINE Pro)
- [ ] Displacement (CID)
- [ ] Bore/Stroke Ratio
- [ ] Rod/Stroke Ratio
- [ ] Piston Speed @ Peak TQ (ft/sec)
- [ ] Piston Speed @ Peak HP (ft/sec)
- [ ] Mean Piston Speed @ Peak TQ (ft/sec)
- [ ] Mean Piston Speed @ Peak HP (ft/sec)

#### Flow Details (ENGINE Pro)
- [ ] Intake Flow @ Peak TQ (CFM)
- [ ] Intake Flow @ Peak HP (CFM)
- [ ] Volumetric Efficiency @ Peak TQ (%)
- [ ] Volumetric Efficiency @ Peak HP (%)
- [ ] Intake Ram Effect @ Peak TQ
- [ ] Intake Ram Effect @ Peak HP

#### Recommendations (ENGINE Pro)
- [ ] Recommended Lobe Separation Angle (degrees)
- [ ] Recommended Intake Lobe Centerline (degrees)
- [ ] Recommended Shift RPM
- [ ] Recommended Redline RPM

## VB6 Form Elements Reference

### From ENGINE.FRM
- `gc_NoCyl` - Number of Cylinders
- `gc_Inline` - Layout (0=Inline, 1=Vee, 2=Flat)
- `gc_Bore` - Bore diameter
- `gc_Stroke` - Stroke length
- `gc_Rod` - Rod length
- `gc_CR` - Compression ratio
- `gc_CamType` - Cam type (0-6)
- `gc_InCamDur` - Intake duration @ 0.050"
- `gc_Carb` - Carburetor (True/False)
- `gc_CarbCFM` - Carburetor CFM
- `gc_Fuel` - Fuel type (1=Gas, 2=Racing Gas, 3=Methanol)
- `gc_Manifold` - Manifold type (1-4)
- `gc_Curved` - Curved runners (True/False)
- `gc_ManFlow` - Manifold flow factor (%)
- `gc_NoInValves` - Number of intake valves per cylinder
- `gc_ValveDia` - Intake valve diameter
- `gc_MaxInFlow` - Max intake flow (CFM)
- `gc_DeltaP` - Flow test pressure (inches H2O)
- `gc_RefBore` - Flow test bore diameter

### ENGINE Pro Additional Elements (DETAILS.FRM)
- Mechanical details display
- Flow details display
- Recommendations display

## Next Steps
1. ✓ Fix inline parameter mapping
2. ✓ Update cam type labels
3. [ ] Add ENGINE Pro output sections (Mechanical Details, Flow Details, Recommendations)
4. [ ] Verify all input ranges match VB6
5. [ ] Add compression ratio worksheet
6. [ ] Test all combinations to ensure 100% VB6 parity
