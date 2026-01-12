# VB6 Parity Contract - Engine Pro

This document tracks exact VB6 source line mappings for all ported calculations to ensure 100% parity.

## P0 Parity Issues - Current Status

### MECHANICAL DETAILS

#### P0.2: Ratio Rounding (3 decimals required)
**VB6 Source:** ENGPERF.BAS lines 61, 64
```vb
BQS = bore / stroke        ' line 61
LRQS = rod / stroke        ' line 64
DQR = (gc_Deck.Value + gc_Gasket.Value) / rod  ' line 67
```

**VB6 Display Format:** Need to find in DETAILS.FRM
- Bore/Stroke ratio: ? decimals
- Rod/Stroke ratio: ? decimals

**RSA Status:** NEEDS INVESTIGATION
- Current: Unknown formatting
- Required: Match VB6 exactly

#### P0.3: Piston-to-Head Ratio Mismatch
**Issue:** RSA=0.0032 vs VB6=0.0092

**VB6 Source:** ENGPERF.BAS line 67
```vb
DQR = (gc_Deck.Value + gc_Gasket.Value) / rod
```

**RSA Status:** NEEDS INVESTIGATION
- Need to verify inputs: deck height, gasket thickness, rod length
- Need to verify units (inches vs mm)
- Need to trace calculation step-by-step

#### P0.3: Intake Throat Ratio Mismatch
**Issue:** RSA=0.188 vs VB6=0.191

**VB6 Source:** Need to find throat area calculation
**RSA Status:** NEEDS INVESTIGATION

### FLOW DETAILS

#### P0.4: Camshaft Description Fields
**VB6 Source:** Need to examine FDetail.frm to see exact fields shown

**RSA Status:** NEEDS INVESTIGATION
- Need to verify which fields VB6 shows
- Remove LSA/exhaust duration if VB6 doesn't show them

#### P0.5: Override Behavior
**VB6 Source:** Need to examine FDetail.frm for editable fields

**RSA Status:** NOT IMPLEMENTED
- VB6 allows editing: duration, ILC, max lift
- RSA needs: editable fields + live recompute + reset button

#### P0.7: Flow Details Numeric Parity
**VB6 Source:** CDETAILS.CLS lines 274-465

**Current Parity Status:** 
- ✅ vpd calculation: FIXED (54 inH2O at 30°)
- ✅ CFM calculation: FIXED
- ✅ Velocity calculation: FIXED
- ⚠️ Need to verify: flow area, piston speed match VB6 exactly

### RECOMMENDATIONS

#### P0.8: Total Intake Tract Volume
**VB6 Source:** Need to find in RECOMD.FRM or ENGPERF.BAS

**RSA Status:** MISSING FEATURE

#### P0.9: Intake Lobe Centerline Mismatch
**Issue:** RSA=106 vs VB6=105

**VB6 Source:** Need to verify if this is input or calculated
**RSA Status:** NEEDS INVESTIGATION

#### P0.10: Exhaust Port Formatting
**VB6 Source:** Need to examine RECOMD.FRM

**RSA Status:** NEEDS FIXES
- Add percentage display
- Round valve diameter to 2 decimals
- Add min/max flow area

### COMPRESSION RATIO CALCULATOR

#### P0.11: Extra Input Fields
**VB6 Source:** Need to examine CR calculator form

**RSA Status:** NEEDS INVESTIGATION
- VB6 does NOT ask for bore/stroke in CR worksheet
- RSA needs to remove extra fields

#### P0.12: CR Rounding
**VB6 Source:** Format specification in CR calculator

**RSA Status:** NEEDS FIX
- Round to 1 decimal place

### FLOWBENCH DATA

#### P0.13: Area Saturation/Cap
**VB6 Source:** Need to find area calculation in FlowB.frm

**RSA Status:** NOT IMPLEMENTED

#### P0.14: Derived Columns
**VB6 Source:** FlowB.frm calculations

**RSA Status:** NEEDS VERIFICATION
- Velocity
- Flow flux
- Flow vel index

#### P0.15: Missing Chart
**VB6 Source:** FlowB.frm chart configuration

**RSA Status:** MISSING FEATURE

#### P0.16: Editable Workflow
**VB6 Source:** FlowB.frm field properties

**RSA Status:** NOT IMPLEMENTED

## Next Steps

1. **INVESTIGATION PHASE** (Current)
   - Map all VB6 source lines for each calculation
   - Document exact formulas, units, rounding
   - Create VB6_TRACE outputs for comparison

2. **FIX PHASE**
   - Fix each issue with VB6 source citation
   - Add tests with strict assertions
   - Verify with VB6 screenshots

3. **VERIFICATION PHASE**
   - Run golden-master tests
   - Generate VB6_TRACE outputs
   - Visual comparison with VB6 screenshots

## VB6 Source File Map

- **ENGPERF.BAS** - Core engine performance calculations
- **CDETAILS.CLS** - Mechanical details and flow details calculations
- **DETAILS.FRM** - Mechanical details UI
- **FDetail.frm** - Flow details UI
- **RECOMD.FRM** - Recommendations UI
- **FlowB.frm** - Flowbench data UI
