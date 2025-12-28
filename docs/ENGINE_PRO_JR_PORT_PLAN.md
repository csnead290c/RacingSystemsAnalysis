# Engine Pro/Jr VB6 Port Plan

## Overview
Port VB6 Engine Pro and Engine Jr programs to TypeScript with 100% accuracy matching original VB6 output.

## Reference Files Location
`Reference Files\OtherRefFiles\EPro Family 12_24_2025\`

## VB6 File Structure

### Engine Pro (EPro3w/)
- **ENGPRO.EXE** - Compiled executable
- **CDETAILS.CLS** - Details class (27KB)
- **DETAILS.FRM** - Details form (15KB)
- **FDetail.frm** - Flow details form (23KB)
- **FlowB.frm** - Flow bench form (80KB)
- **RECOMD.FRM** - Recommendations form (18KB)
- **BASECASE.ENG** - Base case engine file (205 bytes)

### Engine Jr (Ejr3w/)
- **ENGJR.EXE** - Compiled executable
- **CSAREA.FRM** - Cross-sectional area form (13KB)
- **MAXFLOW.FRM** - Max flow form (15KB)
- **BASECASE.ENG** - Base case engine file (432 bytes)

### Common Files (ECommon/)
- **ENGPERF.BAS** - Core engine performance calculations (85KB) ⭐ CRITICAL
- **ENGINE.FRM** - Main engine form (77KB)
- **DECLARES.BAS** - Global declarations (5KB)
- **RSAMAIN.BAS** - Main module (2KB)
- **Print.bas** - Print utilities (29KB)
- **Cgraph.CLS** - Graph class (11KB)
- **Cvalue.CLS** - Value class (13KB)
- **CARBCFM.FRM** - Carburetor CFM form (15KB)
- **CMPRATIO.FRM** - Compression ratio form (10KB)
- **CSCalc.frm** - Cross-section calculator (17KB)
- **GRAPH.FRM** - Graph form (10KB)
- **PRINT.FRM** - Print form (26KB)

## Core Physics (ENGPERF.BAS Analysis)

### Key Calculations Identified:
1. **CalcEngPerf()** - Main engine performance calculation
   - Fuel type effects (gasoline, racing gas, methanol)
   - Compression ratio effects
   - Intake ramming calculations
   - Volumetric efficiency (VE) calculations
   - Torque and HP curves generation

2. **Key Variables:**
   - `bore`, `stroke`, `rod` - Engine geometry
   - `CID` - Cubic inch displacement
   - `gc_CR.Value` - Compression ratio
   - `gc_CarbCFM.Value` - Carburetor CFM
   - `gc_MaxInFlow.Value` - Max intake flow
   - `gc_Fuel.Value` - Fuel type (1=gas, 2=racing gas, 3=methanol)
   - `gc_Manifold.Value` - Manifold type
   - `gc_NoCyl.Value` - Number of cylinders
   - `gc_NoInValves.Value` - Number of intake valves

3. **Physics Constants:**
   - `GAM` - Gamma (specific heat ratio)
   - `aqf` - Air/fuel ratio
   - `fhv` - Fuel heating value
   - `crx` - Compression ratio factor
   - `hpcfmx` - Max HP per CFM
   - `tqcidx` - Max torque per CID

4. **Effects Modeled:**
   - Fuel injection cylinder-to-cylinder effects
   - Large carb effect on intake ramming
   - Engine plenum manifold effects
   - Curved runner effects
   - Intake pumping and flow bench corrections

## Port Strategy

### Phase 1: Study & Document (Current)
- [x] List all VB6 files
- [ ] Read and document ENGPERF.BAS completely
- [ ] Read and document ENGINE.FRM
- [ ] Read and document DECLARES.BAS
- [ ] Understand .ENG file format
- [ ] Document all input parameters
- [ ] Document all output values

### Phase 2: Core Engine Physics Port
- [ ] Create `src/domain/physics/engine/enginePerf.ts`
- [ ] Port CalcEngPerf() function
- [ ] Port all physics calculations
- [ ] Port all constants and formulas
- [ ] Maintain exact VB6 calculation order

### Phase 3: Test Cases
- [ ] Parse BASECASE.ENG files
- [ ] Create test suite with VB6 output
- [ ] Verify 100% accuracy (no tolerance)
- [ ] Test all fuel types
- [ ] Test all manifold configurations
- [ ] Test all cylinder counts

### Phase 4: Engine Pro UI
- [ ] Create Engine Pro page matching site design
- [ ] Input form for all parameters
- [ ] Output display for HP/TQ curves
- [ ] Graph visualization
- [ ] Recommendations display
- [ ] Export functionality

### Phase 5: Engine Jr UI
- [ ] Create Engine Jr page (simplified version)
- [ ] Simplified input form
- [ ] Basic output display
- [ ] Match site design patterns

### Phase 6: Integration
- [ ] Re-enable engine sim links in navigation
- [ ] Add to main menu
- [ ] Test end-to-end workflow
- [ ] Documentation

## Success Criteria
- ✅ 100% match with VB6 output (no tolerance)
- ✅ All VB6 physics formulas ported exactly
- ✅ All test cases pass
- ✅ UI matches site design
- ✅ Both Engine Pro and Engine Jr functional

## Next Steps
1. Continue reading ENGPERF.BAS to understand full calculation flow
2. Read ENGINE.FRM to understand UI and data flow
3. Parse .ENG file format
4. Start TypeScript port of core calculations
