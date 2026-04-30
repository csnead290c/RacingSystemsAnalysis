# Return to VB6 Semantic Parity - Work Plan

**Date:** March 19, 2026  
**Context:** Admin portal deployed, now pivoting back to core product priorities

---

## PRIORITY STATEMENT

The core mission is **VB6 semantic duplication in TypeScript**, not just matching outputs.

This means:
- Understanding VB6 calculation sequences
- Preserving intermediate state transitions
- Matching rounding/precision behavior
- Duplicating worksheet interaction patterns
- Maintaining document lifecycle semantics

**Not just:** "Does the final ET match?"  
**But:** "Does every calculation step match VB6's exact sequence?"

---

## CURRENT VB6 PARITY STATUS

### ✅ What Is Semantically Duplicated

**QUARTER Engine (QuarterJr/QuarterPro):**
- Core physics calculations match VB6
- Worksheet interaction patterns preserved
- Input validation matches VB6
- Output formatting matches VB6

**ENGINE Simulator:**
- Basic engine calculations match VB6
- Dyno curve handling matches VB6
- Power/torque calculations match VB6

**Data Structures:**
- Vehicle schema matches VB6 worksheet structure
- Run history matches VB6 log format
- Settings/preferences match VB6 INI files

### ⚠️ What Is Partially Duplicated

**Worksheet Interaction:**
- Some input fields match VB6
- Some validation matches VB6
- But: Not all edge cases tested
- But: Some rounding differences possible

**Document Lifecycle:**
- Save/load works
- But: VB6 file format compatibility not verified
- But: Migration paths not tested

**Main Screen Recalc:**
- Basic recalc works
- But: Exact sequence vs VB6 not verified
- But: Intermediate state transitions not proven

### ❌ What Is NOT Duplicated

**VB6-Specific Behaviors:**
- Exact rounding in all edge cases
- Exact error handling sequences
- Exact validation order
- Exact worksheet cell update order

**Advanced Features:**
- Some VB6 advanced options not implemented
- Some VB6 edge case handling missing
- Some VB6 optimization paths not duplicated

---

## RECOMMENDED WORK PRIORITIES

### PRIORITY 1: Worksheet Interaction Parity Closure

**Objective:** Prove that TypeScript worksheet interactions match VB6 exactly.

**Tasks:**
1. Document VB6 worksheet interaction sequence
   - Input field tab order
   - Validation trigger points
   - Recalc trigger conditions
   - Error display behavior

2. Create VB6 vs TypeScript comparison tests
   - Same inputs → same validation errors
   - Same edit sequence → same recalc triggers
   - Same save → same file format

3. Fix any discrepancies found
   - Adjust TypeScript to match VB6
   - Document intentional differences
   - Add regression tests

**Success Criteria:**
- All worksheet interactions match VB6 behavior
- No unexpected validation differences
- No unexpected recalc differences

**Estimated Effort:** 2-3 days

---

### PRIORITY 2: Document Lifecycle Semantic Parity

**Objective:** Prove that TypeScript document lifecycle matches VB6 exactly.

**Tasks:**
1. Document VB6 document lifecycle
   - New document initialization
   - Open existing document
   - Save document
   - Save As document
   - Close document (with/without save prompt)

2. Test VB6 file format compatibility
   - Can TypeScript open VB6-saved files?
   - Can VB6 open TypeScript-saved files?
   - Are all fields preserved?
   - Are all settings preserved?

3. Fix any compatibility issues
   - Adjust file format if needed
   - Add migration logic if needed
   - Document breaking changes

**Success Criteria:**
- TypeScript can open VB6 files
- VB6 can open TypeScript files (if possible)
- All data preserved in round-trip

**Estimated Effort:** 2-3 days

---

### PRIORITY 3: Main Screen Input/Edit/Recalc Semantic Parity

**Objective:** Prove that TypeScript main screen behavior matches VB6 exactly.

**Tasks:**
1. Document VB6 main screen behavior
   - Input field change → recalc trigger
   - Validation sequence
   - Error display timing
   - Result update sequence

2. Create side-by-side comparison
   - Same vehicle in VB6 and TypeScript
   - Same edit sequence
   - Compare intermediate states
   - Compare final results

3. Fix any sequence differences
   - Adjust TypeScript recalc timing
   - Adjust validation order
   - Adjust error display

**Success Criteria:**
- Same edit → same recalc sequence
- Same validation errors at same time
- Same results displayed

**Estimated Effort:** 3-4 days

---

### PRIORITY 4: Continued QUARTER and ENGINE VB6 Duplication

**Objective:** Continue duplicating VB6 calculation semantics.

**Tasks:**
1. Identify remaining VB6 calculation paths
   - Advanced options not yet implemented
   - Edge cases not yet handled
   - Optimization paths not yet duplicated

2. Document VB6 calculation sequence
   - Step-by-step calculation order
   - Intermediate variable states
   - Rounding/precision at each step

3. Implement in TypeScript
   - Match calculation order exactly
   - Match rounding exactly
   - Match precision exactly

4. Add regression tests
   - Known VB6 inputs → known VB6 outputs
   - Edge cases
   - Boundary conditions

**Success Criteria:**
- All VB6 calculation paths duplicated
- All edge cases handled
- All regression tests pass

**Estimated Effort:** Ongoing (5-10 days per major feature)

---

## RECOMMENDED EXECUTION SEQUENCE

### Phase 1: Worksheet Interaction (Week 1)
- Document VB6 behavior
- Create comparison tests
- Fix discrepancies
- Add regression tests

### Phase 2: Document Lifecycle (Week 2)
- Document VB6 lifecycle
- Test file format compatibility
- Fix compatibility issues
- Add migration logic if needed

### Phase 3: Main Screen Recalc (Week 3)
- Document VB6 recalc sequence
- Create side-by-side comparison
- Fix sequence differences
- Add regression tests

### Phase 4: Continued Duplication (Weeks 4+)
- Identify remaining VB6 features
- Document calculation sequences
- Implement in TypeScript
- Add regression tests

---

## TESTING STRATEGY

### VB6 Reference Testing
- Keep VB6 application running
- Use same inputs in VB6 and TypeScript
- Compare outputs at each step
- Document any differences

### Regression Testing
- Create test suite with known VB6 inputs/outputs
- Run after every change
- Fail on any difference from VB6
- Document intentional differences

### Edge Case Testing
- Test boundary conditions
- Test invalid inputs
- Test extreme values
- Compare VB6 vs TypeScript behavior

---

## METRICS FOR SUCCESS

### Semantic Parity Metrics
- **Worksheet Interaction:** 100% match with VB6
- **Document Lifecycle:** 100% compatibility with VB6 files
- **Main Screen Recalc:** 100% sequence match with VB6
- **Calculation Results:** 100% match with VB6 (within rounding tolerance)

### Quality Metrics
- **Regression Tests:** >90% coverage of VB6 features
- **Edge Cases:** >80% coverage of VB6 edge cases
- **Documentation:** 100% of VB6 behavior documented

---

## ANTI-PATTERNS TO AVOID

### ❌ Don't: Just Match Final Outputs
- VB6 might get right answer via wrong path
- TypeScript must match the path, not just destination

### ❌ Don't: Assume TypeScript is Better
- VB6 behavior is the spec
- TypeScript must match VB6, even if VB6 seems wrong

### ❌ Don't: Skip Documentation
- Future maintainers need to know why code matches VB6
- Document VB6 quirks and intentional matches

### ❌ Don't: Break VB6 Compatibility
- Users may have VB6 files
- TypeScript must open them correctly

### ✅ Do: Verify Every Assumption
- Test with actual VB6 application
- Compare intermediate states
- Document differences

### ✅ Do: Preserve VB6 Semantics
- Match calculation order
- Match rounding behavior
- Match validation sequence

### ✅ Do: Add Regression Tests
- Prevent future regressions
- Document expected behavior
- Enable confident refactoring

---

## CONCLUSION

**The admin portal work is complete (pending manual verification).**

**Now we return to the core mission: VB6 semantic duplication.**

**The next 4-6 weeks should focus on:**
1. Worksheet interaction parity
2. Document lifecycle parity
3. Main screen recalc parity
4. Continued QUARTER/ENGINE duplication

**Success means:** TypeScript behaves exactly like VB6, not just produces similar outputs.
