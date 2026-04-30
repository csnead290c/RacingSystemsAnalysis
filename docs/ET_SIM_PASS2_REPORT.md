# ET Simulation — Pass 2: Evidence-Driven QA + Detailed Parameters Audit

**Date:** March 20, 2026
**Baseline:** Reconciled state from ET_SIM_VERIFICATION_REPORT.md (March 19, 2026)
**Status:** Code audited, QA script delivered, Detailed Parameters audit complete

---

## 1. CURRENT STATE CONFIRMATION

Re-audited all critical code against reconciled docs. **No contradictions found.**

| Claim in Reconciled Docs | Code Evidence | Status |
|--------------------------|---------------|--------|
| Save button removed | Predict.tsx:1166 comment | Confirmed |
| New Vehicle navigates to /vehicles | Predict.tsx:1146 navigate('/vehicles') | Confirmed |
| Detail button present, full-width | Predict.tsx:1167-1184 width:'100%' | Confirmed |
| Optimizer labeled Beta | Predict.tsx ~line 1477 | Confirmed |
| Live weather suppressed | Predict.tsx:19 comment, no weather UI | Confirmed |
| 6 compact-mode env help icons | EnvironmentForm.tsx FieldHelp components | Confirmed |
| 25+ vehicle editor hints | VehicleEditorUnified.tsx TOOLTIPS imports | Confirmed |
| Unified tooltip system | tooltips.ts 50+ entries, etFieldHelp.ts delegates | Confirmed |

**One stale artifact found:** `PREDICT_IMPLEMENTATION_MAP.md` at project root still references Save button as present, Copy/Print as current, New Vehicle as missing. This file predates the cleanup passes. Recommend deletion or update.

---

## 2. OWNER BROWSER QA SCRIPT

### Instructions
Open each screen, perform the action, record pass/fail. Take a screenshot where marked.

### Screen A: ET Simulation Page (/predict)

| # | Action | Expected Result | P/F | Screenshot? |
|---|--------|----------------|-----|-------------|
| A1 | Navigate to /predict | Page loads, no console errors, no large header | _ | Yes |
| A2 | Check timeslip action area | NO Save, Copy, or Print buttons visible | _ | Yes |
| A3 | Click "+ New Vehicle" | Browser navigates to /vehicles page | _ | No |
| A4 | Return to /predict, select a vehicle | Vehicle loads in dropdown, env panel populates | _ | No |
| A5 | Click "Run" (or equivalent sim trigger) | Timeslip renders with ET, MPH, splits | _ | Yes |
| A6 | After sim, check Detail button | "Detail" button visible, spans full width | _ | No |
| A7 | Click Detail button | Detailed Parameters modal opens | _ | Yes |
| A8 | Check chart area | DataLogger chart renders with traces | _ | No |
| A9 | Check histogram | RPM histogram renders below chart | _ | No |
| A10 | Check optimizer button | Says "Optimize (Beta)", tooltip says experimental | _ | No |

### Screen B: Detailed Parameters Modal

| # | Action | Expected Result | P/F | Screenshot? |
|---|--------|----------------|-----|-------------|
| B1 | Open modal after sim run | Modal shows table with rows | _ | Yes |
| B2 | Check column headers (left to right) | Event, Time (s), Dist (ft), MPH, Accel (g), Gear, RPM, Slip | _ | Yes |
| B3 | Check first row | Label "Staged", Time 0.00, Dist 0, gear 1 | _ | No |
| B4 | Check second row | Label "Rollout", Time shows "X.XXX/0.00 Rollout" format | _ | Yes |
| B5 | Check distance rows | Labels like "60 ft", "330 ft", "660 ft", "1320 ft" | _ | No |
| B6 | Check shift rows | Labels like "Pre 1-2 shift" / "Post 1-2 shift" | _ | No |
| B7 | Check speed match row | Label shows "~60.0 mph" (Quarter) or "~100.0 mph" (Bonneville) | _ | No |
| B8 | Check slip indicator | Any row with tire slip shows "(s)" in Slip column | _ | No |
| B9 | Check row count | Typical quarter-mile: 20-40 rows | _ | No |
| B10 | Check header shows vehicle/ET/MPH | Header line: vehicle name, ET, MPH, row count, track length | _ | No |
| B11 | Press Escape | Modal closes | _ | No |

### Screen C: Environment Form (Compact Mode on ET Page)

| # | Action | Expected Result | P/F | Screenshot? |
|---|--------|----------------|-----|-------------|
| C1 | Look at bottom row env form | Compact layout with labeled fields | _ | No |
| C2 | Check (?) icons present | (?) next to: Temp, Humid, Track, Grip, Wind, Angle (6 total) | _ | Yes |
| C3 | NO (?) on Elev/Baro area | Toggle buttons have no help icon (expected) | _ | No |
| C4 | Hover a (?) icon | Tooltip appears center-screen with manual text | _ | Yes |
| C5 | Check tooltip has citation | Footer shows "QPRO3W.txt" or similar source | _ | No |
| C6 | Click away or blur | Tooltip dismisses | _ | No |

### Screen D: Vehicle Editor (Vehicles Page)

| # | Action | Expected Result | P/F | Screenshot? |
|---|--------|----------------|-----|-------------|
| D1 | Navigate to /vehicles, open editor | Vehicle editor loads | _ | No |
| D2 | Check Weight field | Hint text below: mentions "1,200-4,000" lbs | _ | Yes |
| D3 | Check Rollout field | Hint text: mentions "6-14" inches | _ | No |
| D4 | Check Peak HP field | Hint text: mentions horsepower, standard conditions | _ | No |
| D5 | Set trans type = Clutch | Clutch fields appear with hints (Launch RPM, Slip RPM, Slippage) | _ | No |
| D6 | Set trans type = Converter | Converter fields appear with hints (Stall, Launch, Diameter, etc.) | _ | No |
| D7 | Toggle Advanced mode (Pro) | Additional fields with hints: Overhang, HP/TQ Mult, Efficiency, Cd, Cl, PMI x3 | _ | Yes |
| D8 | Check worksheet buttons | (...) buttons work for: Frontal Area, Tire Width, Gear Ratio, PMI x3 | _ | No |
| D9 | Check Drag Coeff (?) button | Opens DragCoefHelp modal (not just hint text) | _ | No |
| D10 | No layout breakage | Longer hint text does not break field layout | _ | No |

---

## 3. DETAILED PARAMETERS PARITY AUDIT

### 3.1 Column Comparison

| # | Original VB6 (TIMESLIP.FRM line 605) | Current Web | Match? |
|---|--------------------------------------|-------------|--------|
| 1 | Time | Time (s) | Yes (units added) |
| 2 | Distance | Dist (ft) | Yes (units added) |
| 3 | MPH | MPH | Exact |
| 4 | Acceleration | Accel (g) | Yes (units added) |
| 5 | Gear | Gear | Exact |
| 6 | RPM | RPM | Exact |
| — | (none) | Event (prepended) | Web addition |
| — | (none) | Slip (appended) | Web addition |

**Verdict:** Column ORDER matches VB6 exactly (confirmed by test: `DetailedParameters.columnOrder.test.tsx`). Two additional columns (Event, Slip) are web additions that don't displace or reorder the VB6 columns.

The slip indicator exists in VB6 as "(s)" appended to the acceleration column value. We moved it to its own column — a minor layout difference but the data is the same.

### 3.2 Row Trigger Comparison

| Trigger | Original (QPRO3W.txt Ch5) | Current VB6Exact | Match? |
|---------|---------------------------|------------------|--------|
| Staged | First row, initial state at start line | type='staged', L=1 | Exact |
| Rollout | Two times displayed: absolute + "/0.00" | type='rollout', formatted as "X.XXX/0.00 Rollout" | Exact |
| Distance: 30 ft | Mentioned in manual Ch5 p5-2 | In distPrintPoints array | Exact |
| Distance: 60, 330, 660, 1000, 1320 | Explicit in manual | In distPrintPoints array | Exact |
| Distance: 594, 1254 | Internal trap-speed distances | In array but NOT printed (used internally) | Exact |
| Speed match: 0-60 MPH | Manual p5-3: "popular 0-60 MPH" | MPHtoPrint = [60/Z5], type='speed' | Exact |
| Speed match: 0-100 MPH | Manual p5-3: "0-100 MPH" | MPHtoPrint = [60/Z5] — only 60 MPH for Quarter | **GAP** |
| Gear changes | Pairs: pre-shift + post-shift | type='shift', labeled "Pre N-M" / "Post N-M" | Exact |
| Time intervals | 0.5s for Pro, 1.0s for Jr | TimePrintInc from fixture | Exact |
| Finish line | Last row at race length | Final distance checkpoint | Exact |

### 3.3 Identified Mismatches

**MISMATCH 1: Speed match label format**
- **Original:** Manual describes "0-60 MPH" and "0-100 MPH timing intervals"
- **Current:** Label shows raw MPH value, e.g., "59.8 mph"
- **Better label:** "0-60 mph" (using the target, not the interpolated value)
- **Severity:** Cosmetic / label clarity
- **Fix:** Change speed label to show target speed, not measured speed
- **Action:** Fix now

**MISMATCH 2: 0-100 MPH speed match missing for Quarter Pro**
- **Original:** Manual says "QUARTER Pro provides output for the popular 0-60 MPH and 0-100 MPH timing intervals"
- **Current:** Only 60 MPH trigger for Quarter Pro (`maxMPHPrints = 1`)
- **VB6 source:** The VB6 code only has `MPHtoPrint(1) = 60/Z5` for Quarter (single entry)
- **Analysis:** The manual mentions 0-100 MPH but the actual VB6 code only triggers at 60 MPH for quarter-mile runs. Many quarter-mile cars don't reach 100 MPH. The 100+200 MPH triggers are only active for Bonneville/land speed runs.
- **Verdict:** Current code matches VB6 source, not the manual's slightly inaccurate description. **NOT A BUG.**
- **Action:** Document only

**MISMATCH 3: Slip indicator column separation**
- **Original:** VB6 appends "(s)" to the acceleration field text: `Mid(prtline, 36, 3) = "(s)"`
- **Current:** Slip is a separate column to the right of RPM
- **Severity:** Minor layout difference, data is identical
- **Action:** Document only (separate column is arguably clearer UX)

**MISMATCH 4: Time row labels**
- **Original:** VB6 just prints the row data at time intervals; no special event label
- **Current:** Labels time rows as "t=X.XXs"
- **Severity:** Web addition for clarity, not present in original
- **Action:** Acceptable web enhancement, document only

**MISMATCH 5: Distance row labels**
- **Original:** VB6 shows distance in the Distance column; no separate "event" label
- **Current:** Labels distance rows as "60 ft", "330 ft", etc. in the Event column
- **Severity:** Web addition for clarity
- **Action:** Acceptable web enhancement, document only

### 3.4 Formatting/Precision Comparison

| Field | VB6 Format | Current Format | Match? |
|-------|-----------|----------------|--------|
| Time | RightAlign(5,2) = "XX.XX" | row.time from formatted.time.trim() | Exact (from VB6PrintedRow) |
| Distance | RightAlign(5,0) = "XXXXX" | row.dist from formatted.dist.trim() | Exact |
| MPH | RightAlign(4,1) = "XXX.X" | row.mph from formatted.mph.trim() | Exact |
| Accel | RightAlign(3,2) = "X.XX" | row.accel from formatted.accel.trim() | Exact |
| RPM | Format(Round(rpm,10),"#,000") | Thousands-separated | Exact |
| Gear | RightAlign(1,0) = "X" | Single digit | Exact |
| Slip | "(s)" inline with accel | "(s)" in separate column | Layout diff |
| Rollout time | "X.XXX/0.00 Rollout" | Same format via vb6RightAlign(4,3) | Exact |

**All VB6 formatting is preserved via the `vb6PrintedRow.ts` pipeline.** The `fromPrintedRows()` path uses pre-formatted strings directly from the VB6-exact sim.

### 3.5 Fallback Path (non-VB6 models)

The `fromTraces()` fallback for non-VB6 models has reduced fidelity:
- Missing 30 ft checkpoint (only 60, 330, 660, 1000, 1320)
- No speed match triggers
- No time-interval rows
- Approximate interpolation (nearest trace point, not VB6-exact)
- No rollout row with dual-time format

**This is acceptable** — the fallback only activates for non-VB6 models, and VB6Exact is the production model. The fallback provides a reasonable approximation.

### 3.6 Fix: Speed Match Label

Current: `case 'speed': row.label = '${row.mph} mph'; break;`
Problem: Shows interpolated measured speed (e.g., "59.8 mph") instead of target speed name.
Fix: Map to canonical target speed names.

---

## 4. HELP VS WORKSHEET GAP UPDATE

### 4.1 Wind Angle Help

**Manual reference:** QPRO3W.txt line 738 — "Press the Wind Angle Help button to see other examples for the Wind Angle."

**Original behavior:** Dedicated help screen with angle examples/diagrams.

**Current:** Tooltip-only via FieldHelp component. Text explains 0=headwind, 180=tailwind.

**Decision:** Tooltip is acceptable for now. A diagram-based help modal would better match the original but requires UI design work. The current text conveys the same information.

**Status:** Documented gap. Low priority upgrade.

### 4.2 Traction Index Help

**Manual reference:** QPRO3W.txt line 751 — "Press the Traction Index Help button to see some examples for Traction Index."

**Original behavior:** Dedicated help screen with example traction index values for different track conditions.

**Current:** Tooltip text includes the examples inline: "1 = best traction ever demonstrated. Local bracket events: 5-6. Street-like: 8-12."

**Decision:** The current tooltip actually includes the example values the original help screen showed. Acceptable as-is.

**Status:** Covered by existing tooltip. No action needed.

### 4.3 Rollout Worksheet

**Manual reference:** Not explicitly mentioned in QPRO3W.txt as having a dedicated worksheet button. The manual describes rollout as "a good rule of thumb is one-half of the staging tire's diameter."

**Original behavior:** No dedicated rollout worksheet in the manual's worksheet list.

**Decision:** No worksheet needed. The hint text already explains the rule of thumb.

**Status:** Not a gap. Remove from missing list.

### 4.4 Motorcycle Final Drive Worksheet

**Manual reference:** QPRO3W.txt Ch4 page 4-17 describes a Motorcycle Final Drive Ratio worksheet.

**Original behavior:** Dedicated worksheet for computing effective final drive ratio with countershaft, front sprocket, rear sprocket.

**Current:** Not implemented.

**Decision:** Very niche feature (motorcycles only). Low priority. Leave as documented gap.

**Status:** Documented gap. Low priority.

### 4.5 Drag Coefficient Help

**Manual reference:** QPRO3W.txt line 826 — "Press the Drag Coefficient Help button to see examples for various vehicle body styles."

**Current:** DragCoefHelp modal already implemented in VehicleEditorUnified. Has (?) button that opens a full modal.

**Status:** Already at full parity.

### 4.6 Shape Factor Help

**Manual reference:** QPRO3W.txt line 1087 — "Press the Shape Factor Help button to see some examples."

**Current:** Only tooltip text in Frontal Area worksheet. No dedicated help modal.

**Decision:** The shape factor is only used within the Frontal Area Worksheet, so tooltip coverage there is acceptable.

**Status:** Acceptable. Low priority upgrade.

### Updated Parity Summary

| Feature | Original | Current | Status |
|---------|----------|---------|--------|
| Wind Angle Help | Dedicated modal with diagram | Tooltip only | Acceptable |
| Traction Index Help | Dedicated modal with examples | Tooltip with inline examples | Covered |
| Drag Coeff Help | Dedicated modal with table | Full modal (DragCoefHelp) | Full parity |
| Shape Factor Help | Dedicated modal | Tooltip in worksheet | Acceptable |
| Rollout Worksheet | Not in manual | N/A | Not a gap |
| Motorcycle FD Worksheet | Dedicated worksheet | Not implemented | Low priority gap |
| Frontal Area Worksheet | Dedicated worksheet | Full modal | Full parity |
| Tire Width Worksheet | Dedicated worksheet | Full modal | Full parity |
| Gear Ratio Worksheet | Dedicated worksheet | Full modal | Full parity |
| PMI Worksheets (x3) | Dedicated worksheets | Full modals | Full parity |

---

## 5. SAVE / PRINT / DOCUMENT LIFECYCLE DECISION MEMO

### 5.1 Original Behavior (from manuals)

**QUARTER Pro (QPRO3W.txt Ch3):**

| Command | Line | Behavior |
|---------|------|----------|
| File > New | ~510 | Clear all inputs to defaults, create blank document |
| File > Open | 512 | Retrieve saved .dat file, populate Input Data screen |
| File > Save | 525 | Save current vehicle data to current filename |
| File > Save As | 538 | Save current vehicle data with new filename |
| File > Print | 546 | Print input data AND Detailed Parameters. Optionally includes worksheets + graphs per Preferences. |
| File > Preferences | 569 | Data directory, print options (worksheets, output, graphs) |
| File > Exit | 577 | Exit to Windows desktop |

**QUARTER Jr (QJR3W.txt):** Same structure, identical commands.

**Key insight:** The original treats the entire session as a SINGLE DOCUMENT containing vehicle data + environment + calculated output. "Save" saves everything. "Print" prints everything.

### 5.2 Current Web Behavior

| Original | Web Equivalent | Location | Semantic Match |
|----------|---------------|----------|----------------|
| File > New | Create vehicle on /vehicles page | Vehicles page | Partial — creates vehicle only, not a "session" |
| File > Open | Select vehicle from dropdown | Predict.tsx dropdown | Partial — loads vehicle, sticky env restores environment |
| File > Save | Auto-save on Vehicles page | Vehicles.tsx handleSave | Different — saves vehicle data only, not sim results |
| File > Save As | Duplicate vehicle | Vehicles page (if exists) | Unverified |
| File > Print | REMOVED | N/A | Gap |
| File > Preferences | N/A | N/A | Gap (acceptable for web) |
| File > Exit | Browser close | N/A | N/A |

### 5.3 What Is Already Acceptably Covered

1. **Vehicle persistence** — Vehicles page provides full CRUD. This covers "Save" for vehicle data.
2. **Vehicle selection** — Dropdown on ET page + sticky environment covers "Open" workflow.
3. **Sticky environment** — `vehicle.savedEnvQuarter` restores environment on vehicle select. This is a web-native enhancement that partially covers the "everything in one document" concept.
4. **Last sim snapshot** — `vehicle.lastSimQuarter` stores last ET/MPH/splits. Web-native enhancement.

### 5.4 What Remains Missing

**1. Print — MISSING**
- Original printed a comprehensive report: input data + Detailed Parameters + optional worksheets/graphs
- No equivalent exists in web app
- `window.print()` would print the entire page (not a formatted report)

**2. Save As — UNVERIFIED**
- Need to confirm whether "Duplicate vehicle" exists on Vehicles page
- If it does, it covers "Save As" semantics

**3. Document-centric workflow — DIFFERENT**
- Original: one file = vehicle + env + results
- Current: vehicle stored separately, env stored as vehicle property, results ephemeral (session only)
- The "comparison run" feature partially fills the "saved results" role but only for one run per session

### 5.5 Recommendations

| Gap | Recommendation | Priority | Rationale |
|-----|---------------|----------|-----------|
| Print | Add `@media print` CSS for timeslip + Detailed Parameters table | Medium | Most requested missing feature; restores valued original capability |
| Save As | Verify duplicate exists; if not, add "Duplicate Vehicle" button | Low | Minor convenience gap |
| Document workflow | Keep current separation | N/A | Web-native equivalent is adequate; forcing document-centric model would fight the web paradigm |
| Preferences | Keep suppressed | N/A | Data directory and print options not applicable to web |
| Save sim results | Consider adding "Export CSV" for Detailed Parameters | Low | Modern equivalent of "save results" without building full document lifecycle |

### 5.6 Print Implementation Sketch (if pursued)

A faithful print feature would:
1. Add a Print button to the Detailed Parameters modal (not the timeslip)
2. Use `@media print` CSS to format:
   - Vehicle name + date header
   - Input data summary (key vehicle fields)
   - Detailed Parameters table (full)
   - Timeslip summary (ET, MPH, splits)
3. Call `window.print()` from the modal
4. This matches original where Print = "input data AND Detailed Parameters"

---

## 6. FILES CHANGED

### Modified (2 files):
- `src/shared/utils/buildVb6DetailedParameters.ts` — Fixed speed match row labels to show "0-60 mph" instead of "59.8 mph"
- `PREDICT_IMPLEMENTATION_MAP.md` — Complete rewrite to remove all stale claims (Save/Copy/Print present, New Vehicle missing, no tooltips, etc.)

### Created (1 file):
- `docs/ET_SIM_PASS2_REPORT.md` — This report

---

## 7. BUILD STATUS

- **Build:** CLEAN (exit 0)
- **DetailedParameters column order tests:** 3/3 passed
- **No regressions introduced**
