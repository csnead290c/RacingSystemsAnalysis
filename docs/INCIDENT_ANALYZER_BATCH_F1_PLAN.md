# Incident Analyzer Batch F.1 — Derived Channel Hardening Plan

**Date:** March 16, 2026  
**Purpose:** Audit current derived-channel implementation and plan hardening for safety, correctness, and robustness

---

## Current Implementation Audit

### Expression Parsing (Current)

**Location:** `src/pages/IncidentAnalysis.tsx` lines 105-164

**Method:**
1. Replace channel names with placeholder variables (`__v0`, `__v1`, etc.)
2. Replace helper functions (abs, min, max) with Math equivalents
3. Validate safe characters: `[0-9+\-*/(). _a-zA-Z,]`
4. Build evaluation context with variable values
5. **Execute using `new Function()` constructor** ⚠️

**Code:**
```typescript
const fn = new Function(...varNames, 'Math', `"use strict"; return (${expr});`);
const result = fn(...varValues, Math);
```

**CRITICAL FINDING:** Despite comment claiming "NO eval(), NO Function constructor", the implementation **DOES USE Function constructor** at line 153. This is dynamic code execution.

### Channel Reference System (Current)

**Method:** Formulas reference channels **by display name**, not stable keys.

**Example:**
- User types: `Speed * 2.237`
- System looks up channel with `name === "Speed"`
- Replaces with `__v0 * 2.237`
- Evaluates

**Problems:**
1. **Brittle:** Renaming a channel breaks formulas
2. **Ambiguous:** Two channels with same name cause conflicts
3. **Fragile:** Spaces, special characters in names cause issues
4. **No stability:** Display names are user-facing, not machine keys

### Derived-on-Derived Support (Current)

**Status:** NOT SUPPORTED

**Current behavior:**
- Derived channels are added to `allChannels` list
- But evaluation only pulls from raw channel values
- Derived channels cannot reference other derived channels
- No circular dependency detection (because feature doesn't exist)

**Code evidence:**
```typescript
// Line 629-634: Only raw channels populate channelValues
const channelValues: Record<string, number | null> = {};
for (const ch of allChannels) {
  if (!ch.isDerived) {
    channelValues[String(ch.id)] = row[`ch_${ch.id}`] ?? null;
  }
}
```

### Invalid Formula Handling (Current)

**Validation:** `validateExpression()` at lines 167-205

**Checks:**
1. Non-empty expression
2. Valid characters
3. Balanced parentheses
4. Test evaluation with dummy data (1.0 for all channels)

**On invalid formula:**
- Returns `{ valid: false, error: "message" }`
- Blocks save in UI
- Shows error in modal

**On missing channel:**
- If channel name doesn't match any channel, regex replacement fails silently
- Expression evaluates with unreplaced text
- Function constructor throws error
- Caught and returned as error

**Problem:** No explicit unknown-channel detection before evaluation attempt.

### Restore/Load Behavior (Current)

**Persistence:** Derived channels saved in workspace layout

**Fields saved:**
- `id` (string)
- `label` (string)
- `expression` (string)
- `unit` (optional string)
- `color` (optional string)
- `error` (optional string) - NOT currently saved

**On load:**
- Derived channels restored from `layout.derivedChannels || []`
- No revalidation on load
- Invalid formulas may exist in loaded state
- No migration for old name-based formulas (none exist yet)

**Code:**
```typescript
const derivedChannels = layout.derivedChannels || [];
```

**Problem:** No validation on restore. Broken formulas persist silently.

### Panel Config Safety (Current)

**On derived channel edit:**
- Formula updated in `derivedChannels` array
- Panel configs unchanged
- Panels continue referencing same channel ID

**On derived channel remove:**
- Channel removed from `derivedChannels` array
- `handleRemoveDerivedChannel` removes from all plots:
  - Filters `channelIds` arrays
  - Clears XY config if X or Y matches
  - Clears histogram config if channel matches

**Result:** Panel configs are cleaned up safely on remove.

### Existing mathChannels.ts Utility

**Location:** `src/domain/workspace/mathChannels.ts`

**Key features:**
1. **Stable key references:** Uses `$channelKey` syntax
2. **Dependency extraction:** `extractDependencies()` parses `$key` tokens
3. **Dependency ordering:** `resolveDependencyOrder()` with circular detection
4. **Point-by-point evaluation:** Evaluates per time sample
5. **Also uses Function constructor** ⚠️ (line 110)

**Differences from current implementation:**
- Uses `$key` syntax instead of display names
- Has dependency tracking
- Has circular dependency detection
- Designed for derived-on-derived support
- More structured architecture

**Status:** NOT currently integrated into live workspace

---

## Risk Assessment

### CRITICAL RISKS

1. **Dynamic Code Execution**
   - **Risk:** Function constructor allows arbitrary code execution
   - **Attack vector:** Malicious formulas could execute JavaScript
   - **Severity:** HIGH
   - **Example:** `constructor.constructor('alert(1)')()`

2. **Name-Based References**
   - **Risk:** Formulas break when channels renamed
   - **Impact:** User confusion, broken analysis
   - **Severity:** MEDIUM
   - **Example:** Rename "Speed" to "Velocity" breaks all formulas

3. **No Unknown Channel Detection**
   - **Risk:** Typos in channel names fail silently or with cryptic errors
   - **Impact:** User confusion, invalid results
   - **Severity:** MEDIUM
   - **Example:** `Spedd * 2` fails with "Spedd is not defined"

4. **No Revalidation on Load**
   - **Risk:** Broken formulas persist across sessions
   - **Impact:** Silent failures, stale errors
   - **Severity:** LOW
   - **Example:** Delete channel, reload workspace, formula still references it

### MODERATE RISKS

5. **No Self-Reference Protection**
   - **Risk:** Formula referencing its own channel could cause issues
   - **Impact:** Undefined behavior
   - **Severity:** LOW (currently impossible since derived-on-derived not supported)

6. **No Circular Dependency Detection**
   - **Risk:** If derived-on-derived added, circular deps could crash
   - **Impact:** Workspace unusable
   - **Severity:** LOW (feature doesn't exist yet)

---

## Target Behavior (Batch F.1)

### 1. Truly Safe Evaluation

**Target:** Zero dynamic code execution

**Approach:** Implement deterministic parser/evaluator
- Tokenize expression
- Parse to AST or RPN
- Evaluate with controlled operations
- No Function constructor
- No eval
- No indirect execution

**Grammar:**
```
expression := term (('+' | '-') term)*
term       := factor (('*' | '/') factor)*
factor     := number | channel | function | '(' expression ')' | '-' factor
function   := ('abs' | 'min' | 'max') '(' args ')'
channel    := '$' identifier
number     := [0-9]+ ('.' [0-9]+)?
```

### 2. Stable Key-Based References

**Target:** Formulas bind to machine keys, not display names

**Syntax:** `$channelKey` (adopt from mathChannels.ts)

**Examples:**
- `$ch_17 * 2.237` (raw channel key)
- `$derived_1234567890 + 10` (derived channel key)

**Benefits:**
- Immune to label changes
- Unambiguous
- Stable across renames
- Machine-parseable

**UI Translation:**
- Editor can show friendly labels
- Insert channel action adds `$key` syntax
- Display can show labels in preview
- Storage uses keys

### 3. Explicit Dependency Tracking

**Target:** Know exactly what each formula depends on

**Method:**
- Parse `$key` tokens from expression
- Store in `dependencies: string[]` field
- Validate all dependencies exist
- Detect unknown references before evaluation

**Benefits:**
- Clear error messages
- Dependency ordering
- Circular detection
- Safe derived-on-derived

### 4. Circular Dependency Protection

**Target:** Detect and block circular dependencies

**Cases:**
1. **Self-reference:** `A = $A + 1` → BLOCKED
2. **Direct cycle:** `A = $B`, `B = $A` → BLOCKED
3. **Indirect cycle:** `A = $B`, `B = $C`, `C = $A` → BLOCKED

**Method:** Topological sort with cycle detection (from mathChannels.ts)

**Error:** "Circular dependency detected: A → B → C → A"

### 5. Unknown Reference Detection

**Target:** Validate all channel references exist

**Method:**
- Extract dependencies from expression
- Check each against available channels
- Fail validation if any unknown

**Error:** "Unknown channel: $ch_999"

### 6. Revalidation on Load

**Target:** Validate formulas when workspace loads

**Method:**
- Load derived channels from layout
- Revalidate each formula
- Mark invalid formulas with error
- Display clearly in UI
- Don't crash workspace

**Behavior:**
- Valid formulas: work normally
- Invalid formulas: marked with ⚠️, show error, don't evaluate

### 7. Improved Editor UX

**Target:** Make formula creation safer and clearer

**Features:**
- Show available channels with keys
- Insert channel button adds `$key`
- Live validation feedback
- Clear syntax help
- Preview of parsed dependencies

**Not required:**
- Advanced autocomplete
- Syntax highlighting
- Multi-line editor

### 8. Derived-on-Derived Support (Optional)

**Decision:** SUPPORT IT PROPERLY or BLOCK IT EXPLICITLY

**If supported:**
- Dependency ordering
- Circular detection
- Evaluation in correct order
- Clear errors

**If blocked:**
- Validation rejects derived channel references
- Clear error: "Derived channels cannot reference other derived channels in v1"
- Document limitation

**Recommendation:** SUPPORT IT (mathChannels.ts already has the logic)

---

## Implementation Strategy

### Phase 1: Safe Parser/Evaluator

**Replace:** Lines 105-164 in IncidentAnalysis.tsx

**Approach:** Adapt or rewrite based on mathChannels.ts patterns

**Components:**
1. Tokenizer: Split expression into tokens
2. Parser: Build AST or RPN
3. Evaluator: Execute with controlled operations
4. No Function constructor

**Supported:**
- Numbers: `123`, `45.67`
- Operators: `+`, `-`, `*`, `/`
- Parentheses: `(`, `)`
- Unary minus: `-x`
- Functions: `abs(x)`, `min(a,b)`, `max(a,b)`
- Channel refs: `$ch_17`, `$derived_123`

### Phase 2: Stable Key Migration

**Changes:**
1. Update expression syntax to use `$key`
2. Update validation to parse `$key` tokens
3. Update evaluation to resolve `$key` references
4. Update UI to show key-based syntax
5. Add channel insertion helper

**Backward compatibility:**
- Old workspaces have no derived channels yet (Batch F just shipped)
- No migration needed

### Phase 3: Dependency Tracking

**Changes:**
1. Add `dependencies: string[]` to DerivedChannel interface
2. Extract dependencies on create/update
3. Validate dependencies exist
4. Store dependencies for ordering

**Benefits:**
- Enables derived-on-derived
- Enables circular detection
- Better error messages

### Phase 4: Circular Detection

**Changes:**
1. Implement topological sort (from mathChannels.ts)
2. Detect cycles during validation
3. Block circular formulas
4. Clear error messages

**Algorithm:** resolveDependencyOrder() from mathChannels.ts

### Phase 5: Revalidation on Load

**Changes:**
1. After loading derived channels, revalidate each
2. Mark invalid with error field
3. Display errors in UI
4. Don't crash on invalid

**Behavior:**
- Valid: evaluate normally
- Invalid: show ⚠️, don't evaluate, show error

### Phase 6: Editor UX

**Changes:**
1. Show available channels in modal
2. Add "Insert Channel" button
3. Show live validation
4. Show parsed dependencies
5. Clear syntax help

**Keep simple:** Don't overbuild

---

## Success Criteria

This hardening pass succeeds only if:

1. ✅ Zero dynamic code execution (no Function, no eval)
2. ✅ Formulas use stable `$key` references
3. ✅ Unknown channel references detected and blocked
4. ✅ Self-reference detected and blocked
5. ✅ Circular dependencies detected and blocked
6. ✅ Invalid formulas fail gracefully with clear errors
7. ✅ Formulas revalidated on workspace load
8. ✅ Derived-on-derived supported OR explicitly blocked
9. ✅ Editor UX improved for safety
10. ✅ All panel types still work (time-series, XY, histogram)
11. ✅ No regressions to existing features
12. ✅ Build passes
13. ✅ All 30 validation tests pass

---

## Files to Modify

1. **`src/pages/IncidentAnalysis.tsx`**
   - Replace evaluateExpression (lines 105-164)
   - Replace validateExpression (lines 167-205)
   - Update DerivedChannel interface (add dependencies)
   - Update derived channel handlers
   - Update derived channel modal UI
   - Update chart data evaluation

2. **`src/domain/workspace/mathChannels.ts`** (reference/adapt)
   - Use as reference for safe patterns
   - May extract utilities if helpful
   - Don't duplicate, integrate

---

## Timeline

**Estimated effort:** 3-4 hours

**Phases:**
1. Safe parser/evaluator: 90 min
2. Stable key migration: 45 min
3. Dependency tracking: 30 min
4. Circular detection: 20 min
5. Revalidation on load: 15 min
6. Editor UX: 30 min
7. Testing (30 tests): 45 min
8. Documentation: 30 min

**Total:** ~4.5 hours

---

## Next Steps

1. Implement safe parser/evaluator (no Function constructor)
2. Switch to `$key` syntax
3. Add dependency tracking
4. Add circular detection
5. Add revalidation on load
6. Improve editor UX
7. Validate all 30 tests
8. Document in Batch F.1 report

---

**Status:** AUDIT COMPLETE — Ready for implementation
