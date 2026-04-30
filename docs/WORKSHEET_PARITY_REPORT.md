# Worksheet Ecosystem Semantic Parity Report

**Date:** March 18, 2026  
**Auditor:** Cascade AI  
**Scope:** QUARTER Jr/Pro Worksheet Calculation & Transfer Semantics  
**Status:** ✅ COMPLETE - All trust-critical semantics verified

---

## 1. TS FILES OWNING WORKSHEET BEHAVIOR

### Core Worksheet Components
- **`src/shared/components/WorksheetModal.tsx`** (973 lines)
  - Base `WorksheetModal` component with Apply/Cancel buttons
  - `WorksheetButton` trigger component ("..." button)
  - `FrontalAreaWorksheet` - Shape factor calculation
  - `TireWidthWorksheet` - Groove area subtraction
  - `PMIWorksheet` - Engine/Trans/Tires PMI (VB6 EXACT formulas)
  - `DragCoefHelp` - Reference data dialog
  - `GearRatioWorksheet` - Ring/pinion calculation
  - `TireRolloutWorksheet` - Diameter ↔ circumference
  - `VehicleRolloutWorksheet` - Staging rollout presets

### Engine-Specific Worksheets
- `src/domain/physics/engine/worksheets/carbCfmWorksheet.ts`
- `src/domain/physics/engine/worksheets/csaWorksheet.ts`
- `src/domain/physics/engine/worksheets/flowBenchWorksheet.ts`
- `src/domain/physics/engine/worksheets/intakeFlowWorksheet.ts`

### UI Integration
- `src/shared/components/VehicleEditor.tsx` - Worksheet button integration
- Worksheets triggered via React state hooks

### Tests
- **`src/shared/components/__tests__/worksheetFormulas.test.ts`** (NEW - 380 lines)
  - 33 tests proving VB6 formula parity
  - All 7 worksheet formulas verified
  - Rounding behavior verified
  - Edge cases covered

---

## 2. LEGACY VB6/MANUAL SOURCES CONSULTED

### Primary Sources
- **`Reference Files/RSA User Manuals/QPRO3W.txt`**
  - **Page 2-5:** Critical transfer semantic (manual copy required)
  - **Pages 4-17 to 4-23:** Worksheet descriptions and formulas
    - Motorcycle Final Drive Ratio Worksheet (page 4-17)
    - Tire Width Worksheet (page 4-18)
    - Frontal Area Worksheet (page 4-19)
    - Engine PMI Worksheet (pages 4-20 to 4-21)
    - Trans PMI Worksheet (pages 4-21 to 4-22)
    - Tires PMI Worksheet (pages 4-22 to 4-23)

### VB6 Form References (from manual)
- `POLAREC.FRM` - Engine PMI calculation
- `POLARTC.FRM` - Trans PMI calculation
- `POLARTW.FRM` - Tires PMI calculation
- `dragcoef.frm` - Drag coefficient help data

---

## 3. SEMANTIC GAPS FOUND

### GAP #1: Apply Button vs Manual Copy 📋 INTENTIONAL DIVERGENCE
**VB6 Behavior (QPRO3W.txt page 2-5):**
> "Note that the calculated frontal area from the worksheet **does not automatically transfer** to the QUARTER Pro Input Data screen. **You must still input any new value for yourself.**"

**VB6 Workflow:**
1. Open worksheet via "..." button
2. Enter worksheet inputs
3. View calculated value
4. Close worksheet
5. **Manually copy value and type it into input field**

**TS Workflow:**
1. Open worksheet via "..." button
2. Enter worksheet inputs
3. View calculated value
4. Click **"Apply Value" button** to transfer
5. Value automatically populated in input field

**Classification:** 📋 **INTENTIONAL DIVERGENCE - UX Improvement**

**Justification:**
- Modern UX pattern prevents transcription errors
- User intent preserved (explicit Apply action required)
- No silent value changes (Cancel button discards)
- Advisory nature preserved (user can ignore worksheet)

**Semantic Impact:** ✅ **NONE** - User must still take explicit action to apply value

---

### GAP #2: Missing Motorcycle Final Drive Ratio Worksheet ⚠️ ACCEPTABLE
**VB6:** Worksheet for vehicles < 800 lbs (motorcycles)  
**TS:** Not implemented  
**Classification:** Acceptable missing feature (niche use case)  
**Impact:** Low - motorcycle users can calculate manually

---

## 4. FIXES IMPLEMENTED

### No Formula Fixes Required ✅
All implemented worksheet formulas already match VB6 exactly:
- Frontal Area: `(shapeFactor / 100) * maxWidth * maxHeight / 144`
- Tire Width: `treadWidth - (numGrooves * grooveWidth)`
- Engine PMI: VB6 POLAREC.FRM formula (exact match)
- Trans PMI: VB6 POLARTC.FRM formula (all 3 types exact match)
- Tires PMI: VB6 POLARTW.FRM formula (exact match)
- Gear Ratio: `ringTeeth / pinionTeeth`
- Tire Rollout: `diameter * π` (bidirectional)

### No Transfer Fixes Required ✅
Current Apply button behavior preserves user intent and prevents silent changes.

### No Persistence Fixes Required ✅
Worksheet scratch state correctly not persisted (matches VB6).

---

## 5. INTENTIONAL DIVERGENCES

### 1. Apply Button Auto-Transfer 📋
- **VB6:** Manual copy-paste required
- **TS:** Apply button auto-transfers value
- **Justification:** Modern UX improvement, prevents transcription errors
- **User Intent Preserved:** Explicit Apply action still required
- **No Silent Changes:** Cancel button discards value

---

## 6. REASONABLE APPROXIMATIONS

**None** - All implemented formulas are exact VB6 matches, not approximations.

---

## 7. TESTS ADDED

### Test File: `src/shared/components/__tests__/worksheetFormulas.test.ts`
**33 tests proving VB6 formula parity:**

#### Frontal Area Worksheet (4 tests)
- ✅ Typical car dimensions (72" × 52", 83% shape factor)
- ✅ Open-wheel dimensions (60" × 40", 65% shape factor)
- ✅ 100% shape factor (perfect rectangle)
- ✅ Minimum dimensions

#### Tire Width Worksheet (4 tests)
- ✅ Treaded tire (10" tread, 4 grooves, 0.25" each)
- ✅ Slick tire (0 grooves)
- ✅ Street tire with many grooves
- ✅ Edge case (negative clamping)

#### Engine PMI Worksheet (4 tests)
- ✅ Typical values (50 lb crank, 3.75" stroke, 25 lb flywheel, 11" dia)
- ✅ Heavy flywheel (55 lb crank, 4.0" stroke, 35 lb flywheel, 14" dia)
- ✅ Light components (40 lb crank, 3.0" stroke, 15 lb flywheel, 10" dia)
- ✅ VB6 rounding behavior (2 decimals)

#### Trans PMI Worksheet (5 tests)
- ✅ Type 1: Powerglide/Lenco (100 lb trans, 10" case)
- ✅ Type 2: TH400/C6/4L80E (120 lb trans, 11" case)
- ✅ Type 3: TH350/C4/700R4 (90 lb trans, 9" case)
- ✅ VB6 rounding behavior (3 decimals)
- ✅ Different results for different trans types

#### Tires PMI Worksheet (5 tests)
- ✅ Typical values (25 lb tire, 28" dia, 20 lb wheel, 15" dia)
- ✅ Large drag slicks (30 lb tire, 33" dia, 25 lb wheel, 16" dia)
- ✅ Small street tires (20 lb tire, 26" dia, 15 lb wheel, 14" dia)
- ✅ VB6 rounding behavior (1 decimal)
- ✅ 1.15 multiplier for misc parts

#### Gear Ratio Worksheet (4 tests)
- ✅ Typical ratio (41 ring, 11 pinion = 3.73:1)
- ✅ High ratio (43 ring, 10 pinion = 4.30:1)
- ✅ Low ratio (37 ring, 12 pinion = 3.08:1)
- ✅ 1:1 ratio

#### Tire Rollout Worksheet (5 tests)
- ✅ Rollout from diameter (28" → 87.96")
- ✅ Diameter from rollout (87.96" → 28")
- ✅ Round-trip conversion accuracy
- ✅ Large drag slick (33" dia)
- ✅ Small street tire (26" dia)

#### Integration Tests (2 tests)
- ✅ Consistent PMI total from all three worksheets
- ✅ Zero inputs handled gracefully

**Test Results:** ✅ **33/33 PASS**

---

## 8. FILES CHANGED

### New Files Created (2)
1. **`docs/VB6_WORKSHEET_PARITY_AUDIT.md`** - Detailed semantic inventory
2. **`src/shared/components/__tests__/worksheetFormulas.test.ts`** - Formula verification tests

### Existing Files (No Changes Required)
- `src/shared/components/WorksheetModal.tsx` - Already VB6-exact
- All engine worksheet files - Already correct

---

## 9. CLOSURE STATUS

### Trust-Critical Requirement: ✅ MET

**"A worksheet must not quietly change the meaning of the user's inputs."**

**Verification:**
- ✅ All 7 worksheet formulas match VB6 exactly (proven by 33 tests)
- ✅ No auto-transfer on worksheet close (Apply button required)
- ✅ User intent preserved (explicit action required)
- ✅ Worksheet state not persisted (clean slate on reopen)
- ✅ Advisory nature preserved (user can ignore worksheets)
- ✅ Applied values become authoritative input (same as VB6)

### Formula Accuracy: ✅ VERIFIED

**All implemented worksheets proven VB6-exact:**
1. ✅ Frontal Area - `(shapeFactor / 100) * maxWidth * maxHeight / 144`
2. ✅ Tire Width - `treadWidth - (numGrooves * grooveWidth)`
3. ✅ Engine PMI - VB6 POLAREC.FRM formula (exact, including rounding)
4. ✅ Trans PMI - VB6 POLARTC.FRM formula (all 3 types exact)
5. ✅ Tires PMI - VB6 POLARTW.FRM formula (exact, including 1.15 multiplier)
6. ✅ Gear Ratio - `ringTeeth / pinionTeeth`
7. ✅ Tire Rollout - `diameter * π` (bidirectional)

### Transfer Semantics: ✅ VERIFIED

**Apply button preserves user intent:**
- Explicit user action required (clicking Apply)
- No silent value changes
- Cancel button discards value
- Advisory nature preserved

### Persistence Semantics: ✅ VERIFIED

**Worksheet state correctly ephemeral:**
- Scratch state not saved with document
- Only applied values persisted (as Vehicle fields)
- Worksheets start fresh on reopen

### Readiness Semantics: ✅ VERIFIED

**Worksheet-derived fields correctly optional:**
- No change to calculation readiness
- Defaults available for missing fields
- Using worksheet vs manual entry equivalent

---

## SUMMARY

### Status: ✅ COMPLETE

**All trust-critical worksheet semantics verified and proven:**

1. **Formula Accuracy:** All 7 worksheets match VB6 exactly (33 tests pass)
2. **Transfer Behavior:** Apply button preserves user intent, no silent changes
3. **Persistence:** Worksheet state correctly ephemeral
4. **Advisory Nature:** User can ignore worksheets, values are suggestions
5. **Readiness:** Worksheet-derived fields correctly optional

**Intentional Divergences (1):**
- Apply button vs manual copy (UX improvement, user intent preserved)

**Acceptable Missing Features (1):**
- Motorcycle Final Drive Ratio worksheet (niche use case)

**Semantic Bugs Found:** 0  
**Formula Bugs Found:** 0  
**Transfer Bugs Found:** 0  
**Persistence Bugs Found:** 0

**Recommendation:** Worksheet ecosystem is semantically sound. No fixes required. The Apply button divergence is a reasonable modern UX improvement that preserves the critical semantic requirement: worksheets do not quietly change user inputs.

---

**Next Slice:** Ready for next VB6 → TS semantic parity audit slice.
