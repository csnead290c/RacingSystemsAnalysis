# Legacy Physics Code - DO NOT USE IN PRODUCTION

This folder contains deprecated physics code that has been quarantined for historical reference and debugging purposes only.

## ⚠️ IMPORTANT: Use VB6Exact Instead

**All production code must use `VB6Exact`** - the canonical physics engine that provides exact VB6 TIMESLIP.FRM parity.

## Why VB6Exact is Canonical

1. **Line-by-line VB6 port** - Exact replication of VB6 TIMESLIP.FRM (Reference Files/QCommon/TIMESLIP.FRM)
2. **VB6 source line references** - Every calculation cites VB6 source file and line number
3. **100% UI adoption** - All production pages (Predict, Log, DialIn, RaceDay) use VB6Exact
4. **Parity test coverage** - Extensive validation against VB6 printouts
5. **Float32 precision** - Matches VB6 Single (32-bit float) exactly using Math.fround()
6. **Banker's rounding** - Uses VB6 Format() rounding (round-half-to-even) for ET/MPH outputs

## Legacy Models Status

### RSACLASSIC (models/rsaclassic.ts)
- **Status:** QUARANTINED (2026-01-12)
- **Reason:** Replaced by VB6Exact for exact VB6 parity
- **Last Used:** Legacy parity harness (now should use VB6Exact)
- **Keep Reason:** Historical reference, regression comparison during debugging
- **VB6 Source:** Partial port of TIMESLIP.FRM with simplifications
- **DO NOT IMPORT:** Use VB6Exact instead

### SimpleV1 (inline in index.ts)
- **Status:** LEGACY
- **Reason:** Cube-root approximation, not VB6-accurate
- **Keep Reason:** Historical reference
- **DO NOT USE:** Use VB6Exact instead

### Blend (models/blend.ts)
- **Status:** EXPERIMENTAL (unused)
- **Reason:** ML wrapper around RSACLASSIC, never adopted
- **Keep Reason:** Potential future ML integration research
- **DO NOT USE:** Use VB6Exact instead

## Migration Guide

If you find code importing from legacy models:

```typescript
// ❌ OLD (deprecated):
import { RSACLASSIC } from './models/rsaclassic';
const model = getModel('RSACLASSIC');

// ✅ NEW (canonical):
import { simulateVB6Exact } from './models/vb6Exact';
const model = getModel('VB6Exact');
const result = simulateVB6Exact(simInputs);
```

## Multi-Model Registry Pattern

The physics engine preserves a multi-model registry for:
- **Regression comparison** - Compare VB6Exact vs RSACLASSIC outputs during debugging
- **Historical reference** - Understand evolution of physics engine
- **Legacy tests** - Some tests may still reference old models

However, **all production UI code must use VB6Exact**.

## Dead Code Cleanup (2026-01-12)

The following files were deleted as they had zero imports/references:

### Debug/Diagnostic Scripts (~58 files deleted)
- `vb6/debug*.ts` (15 files) - Development diagnostics
- `vb6/diagnose*.ts` (12 files) - Development diagnostics
- `vb6/compare*.ts` (8 files) - Development diagnostics
- `vb6/test*.ts` (10 files) - Ad-hoc tests (not in test suite)
- `vb6/trace*.ts` (2 files) - Development diagnostics
- `vb6/verify*.ts` (6 files) - Development diagnostics
- `vb6/analyze*.ts` (2 files) - Development diagnostics
- `vb6/check*.ts` (1 file) - Development diagnostics
- `vb6/decode*.ts` (2 files) - Development diagnostics

### Engine Debug Scripts (~25 files deleted)
- `engine/debug*.ts` (4 files) - Debug scripts
- `engine/test*.ts` (11 files) - Ad-hoc tests
- `engine/trace*.ts` (3 files) - Debug scripts
- `engine/compare*.ts` (1 file) - Debug scripts
- `engine/diagnose*.ts` (1 file) - Debug scripts
- `engine/verify*.ts` (3 files) - Debug scripts
- `engine/run*.ts` (2 files) - Debug scripts

### Duplicate/Unused Models
- `models/fourLink.ts` - Unused suspension simulation
- `models/dragDyno.ts` - Unused dyno simulation
- `models/weather.ts` - Duplicate of vb6/air.ts
- `engine/enginePerfVB6.ts` - Duplicate of enginePerf.ts
- `engine/enginePerfVB6Precision.ts` - Unused precision variant
- `engine/engineProDetailsVB6Exact.ts` - Empty file (0 bytes)

**Total:** ~68 files, ~460KB of dead code removed

## Evidence-Based Testing

All VB6 parity claims are backed by:

1. **VB6 Source References** - Every formula cites Reference Files/ location
2. **Micro Truth Tables** - Core helpers validated against VB6 behavior
3. **Golden Master Tests** - Stable benchmarks locked to VB6 printout values
4. **Parity Test Suite** - Comprehensive validation against all benchmarks

See `src/integration-tests/vb6.rounding.spec.ts` for example of evidence-based testing.

## Rounding Consolidation (2026-01-12)

**CRITICAL FIX:** VB6 uses **banker's rounding** (round-half-to-even) for ET/MPH display formatting.

**Evidence:**
- VB6 Source: `Reference Files/QCommon/TIMESLIP.FRM:1496,1508` - Uses RightAlign() for ET/MPH
- VB6 Source: `Reference Files/QCommon/CVALUE.CLS:557` - RightAlign() uses Format()
- VB6 Behavior: Format() applies banker's rounding (round-half-to-even)

**Changes:**
- ✅ `vb6/exactMath.ts:vb6Round()` - CORRECT (banker's rounding)
- ❌ `vb6/constants.ts:vb6Round()` - DELETED (was round-half-up, incorrect for ET/MPH)
- ✅ `vb6/constants.ts:roundET/roundMPH` - Now import from exactMath.ts

**Test Coverage:**
- `src/integration-tests/vb6.rounding.spec.ts` - Proves banker's rounding behavior with VB6 evidence

## Contact

For questions about VB6 parity or physics engine architecture, refer to:
- `AUDIT-AND-ROADMAP.md` - Feature parity and roadmap
- `VB6-PARITY-TEST-SUMMARY.md` - Test suite documentation
- `docs/VB6_PARITY_CONTRACT.md` - VB6 source line mappings
