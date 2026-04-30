# Worksheet Interaction Semantic Matrix - VB6 vs TypeScript

**Date:** March 18, 2026  
**Purpose:** Product-by-product worksheet transfer behavior audit

---

## VB6 MANUAL EVIDENCE

### QUARTER Pro/Jr (QPRO3W.txt page 2-5, QJR3W.txt page 2-5)
> "Note that the calculated frontal area from the worksheet **does not automatically transfer** to the QUARTER Pro Input Data screen. **You must still input any new value for yourself.**"

**Transfer Semantic:** MANUAL_ENTRY_ONLY

### ENGINE Pro/Jr (EPRO3W.txt page 2-5, EJR3W.txt page 2-5)
> "Note that the calculated compression ratio from the worksheet **does not automatically transfer** to the main screen. You must still input any new value for yourself. **However, if you double-click on the calculated value on the worksheet, the worksheet will close and the new value will be transfered to the main ENGINE Pro screen.**"

**Transfer Semantic:** DOUBLE_CLICK_RESULT_TRANSFERS

---

## WORKSHEET SEMANTIC MATRIX

| Product Family | Worksheet Name | Formula Parity | VB6 Close Behavior | VB6 Transfer Mechanism | VB6 Transfer Trigger | TS Implementation | TS Matches VB6 |
|---|---|---|---|---|---|---|---|
| **QUARTER Pro** | Frontal Area | ✅ EXACT | Close without transfer | NONE - manual entry only | N/A | ❌ Apply button auto-transfers | ❌ NO |
| **QUARTER Pro** | Tire Width | ✅ EXACT | Close without transfer | NONE - manual entry only | N/A | ❌ Apply button auto-transfers | ❌ NO |
| **QUARTER Pro** | Engine PMI | ✅ EXACT | Close without transfer | NONE - manual entry only | N/A | ❌ Apply button auto-transfers | ❌ NO |
| **QUARTER Pro** | Trans PMI | ✅ EXACT | Close without transfer | NONE - manual entry only | N/A | ❌ Apply button auto-transfers | ❌ NO |
| **QUARTER Pro** | Tires PMI | ✅ EXACT | Close without transfer | NONE - manual entry only | N/A | ❌ Apply button auto-transfers | ❌ NO |
| **QUARTER Pro** | Gear Ratio | ✅ EXACT | Close without transfer | NONE - manual entry only | N/A | ❌ Apply button auto-transfers | ❌ NO |
| **QUARTER Pro** | Tire Rollout | ✅ EXACT | Close without transfer | NONE - manual entry only | N/A | ❌ Apply button auto-transfers | ❌ NO |
| **QUARTER Pro** | Vehicle Rollout | ✅ EXACT | Close without transfer | NONE - manual entry only | N/A | ❌ Apply button auto-transfers | ❌ NO |
| **QUARTER Jr** | Frontal Area | ✅ EXACT | Close without transfer | NONE - manual entry only | N/A | ❌ Apply button auto-transfers | ❌ NO |
| **QUARTER Jr** | Tire Width | ✅ EXACT | Close without transfer | NONE - manual entry only | N/A | ❌ Apply button auto-transfers | ❌ NO |
| **QUARTER Jr** | Gear Ratio | ✅ EXACT | Close without transfer | NONE - manual entry only | N/A | ❌ Apply button auto-transfers | ❌ NO |
| **QUARTER Jr** | Tire Rollout | ✅ EXACT | Close without transfer | NONE - manual entry only | N/A | ❌ Apply button auto-transfers | ❌ NO |
| **QUARTER Jr** | Vehicle Rollout | ✅ EXACT | Close without transfer | NONE - manual entry only | N/A | ❌ Apply button auto-transfers | ❌ NO |
| **ENGINE Pro** | Carb CFM | ✅ EXACT | Close without transfer | Double-click result transfers | Double-click calculated CFM | ✅ Button with VB6 comment | ⚠️ PARTIAL (button not double-click) |
| **ENGINE Pro** | CSA (Circular) | ✅ EXACT | Close without transfer | Double-click result transfers | Double-click calculated area | ✅ Button with VB6 comment | ⚠️ PARTIAL (button not double-click) |
| **ENGINE Pro** | CSA (Elliptical) | ✅ EXACT | Close without transfer | Double-click result transfers | Double-click calculated area | ✅ Button with VB6 comment | ⚠️ PARTIAL (button not double-click) |
| **ENGINE Pro** | CSA (Rectangular) | ✅ EXACT | Close without transfer | Double-click result transfers | Double-click calculated area | ✅ Button with VB6 comment | ⚠️ PARTIAL (button not double-click) |
| **ENGINE Pro** | Intake Flow | ✅ EXACT | Close without transfer | Double-click result transfers | Double-click calculated flow | ✅ Button with VB6 comment | ⚠️ PARTIAL (button not double-click) |
| **ENGINE Pro** | Flow Bench | ✅ EXACT | Close without transfer | Double-click result transfers | Double-click calculated flow | ✅ Button with VB6 comment | ⚠️ PARTIAL (button not double-click) |
| **ENGINE Jr** | Carb CFM | ✅ EXACT | Close without transfer | Double-click result transfers | Double-click calculated CFM | ✅ Button with VB6 comment | ⚠️ PARTIAL (button not double-click) |
| **ENGINE Jr** | CSA (Circular) | ✅ EXACT | Close without transfer | Double-click result transfers | Double-click calculated area | ✅ Button with VB6 comment | ⚠️ PARTIAL (button not double-click) |
| **ENGINE Jr** | CSA (Elliptical) | ✅ EXACT | Close without transfer | Double-click result transfers | Double-click calculated area | ✅ Button with VB6 comment | ⚠️ PARTIAL (button not double-click) |
| **ENGINE Jr** | CSA (Rectangular) | ✅ EXACT | Close without transfer | Double-click result transfers | Double-click calculated area | ✅ Button with VB6 comment | ⚠️ PARTIAL (button not double-click) |
| **ENGINE Jr** | Intake Flow | ✅ EXACT | Close without transfer | Double-click result transfers | Double-click calculated flow | ✅ Button with VB6 comment | ⚠️ PARTIAL (button not double-click) |

---

## CURRENT TS IMPLEMENTATION ANALYSIS

### Shared WorksheetModal Component
**File:** `src/shared/components/WorksheetModal.tsx`

**Current Behavior:**
- Hardcoded "Apply Value" button on line 130-132
- `handleApply` function (lines 36-39) calls `onApply(calculatedValue)` then `onClose()`
- No product family differentiation
- No double-click handler on calculated result
- Over-generalizes behavior across all product families

**Props Interface (lines 11-21):**
```typescript
interface WorksheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: number) => void;  // ❌ Forces all worksheets to have transfer
  title: string;
  children: ReactNode;
  calculatedValue: number;
  calculatedLabel: string;
  unit?: string;
  helpText?: string;
}
```

**Problem:** No way to configure transfer semantics per product family.

---

### QUARTER Worksheet Usage
**Files:** `src/pages/Vehicles.tsx`, `src/shared/components/VehicleEditor.tsx`

**Current Behavior:**
- All QUARTER worksheets use WorksheetModal with `onApply` callback
- Example (Vehicles.tsx lines 1603-1607):
```typescript
<FrontalAreaWorksheet
  isOpen={showFrontalAreaWorksheet}
  onClose={() => setShowFrontalAreaWorksheet(false)}
  onApply={(value) => updateForm('frontalAreaFt2', value)}  // ❌ Auto-transfers
/>
```

**VB6 Requirement:** NO transfer mechanism - manual entry only  
**TS Behavior:** Apply button auto-transfers  
**Verdict:** ❌ **SEMANTIC MISMATCH**

---

### ENGINE Worksheet Usage
**Files:** `src/pages/EngineSim.tsx`, `src/pages/EngineSimDashboard.tsx`

**Current Behavior:**
- ENGINE worksheets are inline tabs, not modal dialogs
- Transfer via explicit "Use this value" buttons
- VB6 comments acknowledge double-click behavior:
  - Line 1651: `"VB6: double-click lblWSCarb transfers value to main form Throttle CFM input"`
  - Line 1819: `"VB6: double-click lblWSCSArea transfers value to Intake Port Flow csArea"`

**Example (EngineSim.tsx lines 1648-1654):**
```typescript
<button
  style={{ ...styles.tabButton, padding: '6px 16px', fontSize: '12px' }}
  onClick={applyCarbWSToMain}
  title="VB6: double-click lblWSCarb transfers value to main form Throttle CFM input"
>
  Use this value ({formatCfm(carbWSResult.cfmTotal)} CFM)
</button>
```

**VB6 Requirement:** Double-click calculated result to transfer  
**TS Behavior:** Button click to transfer (not double-click)  
**Verdict:** ⚠️ **PARTIAL MATCH** (transfer exists but wrong trigger)

---

## SEMANTIC GAPS SUMMARY

### Critical Gaps (Must Fix)

#### GAP #1: QUARTER Worksheets Have Unauthorized Transfer Mechanism ❌
**VB6:** Manual entry only, NO transfer  
**TS:** Apply button auto-transfers value  
**Impact:** **HIGH** - Violates VB6 semantic requirement  
**Fix Required:** Remove Apply button for QUARTER family, make worksheets advisory-only

#### GAP #2: ENGINE Worksheets Use Button Instead of Double-Click ⚠️
**VB6:** Double-click calculated result to transfer  
**TS:** Button click to transfer  
**Impact:** **MEDIUM** - Transfer exists but wrong interaction pattern  
**Fix Required:** Add double-click handler on calculated result display

#### GAP #3: WorksheetModal Over-Generalizes Behavior ❌
**Problem:** Single hardcoded interaction model for all product families  
**Impact:** **HIGH** - Prevents correct product-specific semantics  
**Fix Required:** Refactor to support configurable transfer modes

---

## REQUIRED TRANSFER MODES

Based on VB6 manual evidence, we need three distinct transfer modes:

### Mode 1: ADVISORY_MANUAL_ENTRY_ONLY
- **Products:** QUARTER Pro, QUARTER Jr
- **Behavior:** 
  - Worksheet displays calculated value
  - Close button only (no Apply, no transfer)
  - User must manually type value into main screen
  - Worksheet is purely advisory

### Mode 2: DOUBLE_CLICK_RESULT_TRANSFERS
- **Products:** ENGINE Pro, ENGINE Jr
- **Behavior:**
  - Worksheet displays calculated value
  - Close button closes without transfer
  - Double-clicking calculated result closes worksheet AND transfers value
  - Manual entry still possible (user can ignore worksheet)

### Mode 3: NO_WORKSHEET (for completeness)
- **Products:** Any input without worksheet support
- **Behavior:** No worksheet button, direct input only

---

## ARCHITECTURE RECOMMENDATION

Refactor `WorksheetModal` to accept a `transferMode` prop:

```typescript
type WorksheetTransferMode = 
  | 'advisory_manual_entry_only'  // QUARTER family
  | 'double_click_result_transfers'  // ENGINE family
  | 'none';  // No worksheet

interface WorksheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (value: number) => void;  // Optional - only for transfer modes
  transferMode: WorksheetTransferMode;
  title: string;
  children: ReactNode;
  calculatedValue: number;
  calculatedLabel: string;
  unit?: string;
  helpText?: string;
}
```

**Behavior by mode:**
- `advisory_manual_entry_only`: Show Close button only, no Apply, no double-click
- `double_click_result_transfers`: Show Close button, add `onDoubleClick` to calculated result div
- `none`: N/A (no worksheet)

---

## FILES REQUIRING CHANGES

### Core Components
1. **`src/shared/components/WorksheetModal.tsx`** - Add transfer mode support
2. **`src/shared/components/VehicleEditor.tsx`** - Remove Apply for QUARTER worksheets
3. **`src/pages/Vehicles.tsx`** - Remove Apply for QUARTER worksheets

### ENGINE Components (if using WorksheetModal)
4. **`src/pages/EngineSim.tsx`** - Add double-click handlers (currently inline tabs)
5. **`src/pages/EngineSimDashboard.tsx`** - Add double-click handlers (currently inline tabs)

**Note:** ENGINE worksheets are currently implemented as inline tabs, not modal dialogs. The double-click behavior is already approximated via "Use this value" buttons. May not require changes if inline tab approach is acceptable.

---

## VERDICT

**Current Status:** ❌ **SEMANTIC MISMATCH**

**QUARTER Family:** 8 worksheets with unauthorized Apply button (should be advisory-only)  
**ENGINE Family:** 6+ worksheets with button transfer (should be double-click transfer)

**Next Steps:**
1. Refactor WorksheetModal to support transfer modes
2. Remove Apply button from all QUARTER worksheets
3. Add double-click handlers to ENGINE worksheets (or accept button as reasonable approximation)
4. Add behavior tests proving correct transfer semantics
5. Update documentation
