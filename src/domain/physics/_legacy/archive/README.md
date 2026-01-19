# Archived Debug and Diagnostic Scripts

This folder contains legacy debug, diagnostic, and test scripts that were used during VB6 parity development but are no longer actively maintained or referenced in the codebase.

## Why These Files Were Archived

These files served their purpose during the intensive VB6 parity verification phase but are no longer needed because:

1. **Golden Master Test Suite**: The new `vb6exact.golden.spec.ts` test suite provides comprehensive parity validation with 5 canonical benchmark cases covering diverse vehicle configurations.

2. **Stable Test Coverage**: We now have 85+ passing tests covering:
   - VB6Exact golden master parity (10 tests)
   - Banker's rounding behavior (35 tests)
   - Rounding parity contract (40 tests)

3. **No External References**: All archived files were proven to have zero imports outside their own folders, making them safe to archive without breaking any runtime behavior.

## What Was Archived

### VB6 Folder (54 files)
- **Debug scripts**: `debug*.ts` (16 files) - Early debugging tools for VB6 simulation steps
- **Diagnostic scripts**: `diagnose*.ts` (10 files) - Detailed diagnostic tools for specific cases
- **Compare scripts**: `compare*.ts` (8 files) - Comparison tools for VB6 vs TypeScript outputs
- **Test scripts**: `test*.ts` (12 files) - Ad-hoc test runners for specific scenarios
- **Verify scripts**: `verify*.ts` (6 files) - Verification tools for specific parameters
- **Decode scripts**: `decode*.ts` (2 files) - DAT file parsers

### Engine Folder (19 files)
- **Debug scripts**: `debug*.ts` (3 files) - Engine calculation debugging tools
- **Diagnostic scripts**: `diagnose*.ts` (1 file) - Curve mismatch diagnostics
- **Compare scripts**: `compare*.ts` (1 file) - VB6 comparison tools
- **Test scripts**: `test*.ts` (8 files) - Engine-specific test runners
- **Trace scripts**: `trace*.ts` (3 files) - Detailed execution traces
- **Verify scripts**: `verify*.ts` (2 files) - Lookup table verification
- **Run scripts**: `run*.ts` (1 file) - Baseline test runners

## How to Restore

If you need to restore any of these files:

1. **Find the file in git history**:
   ```bash
   git log --all --full-history -- "**/filename.ts"
   ```

2. **Restore from this archive** (files are preserved with git history):
   ```bash
   git mv src/domain/physics/_legacy/archive/vb6/filename.ts src/domain/physics/vb6/
   ```

3. **Or restore from a specific commit**:
   ```bash
   git checkout <commit-hash> -- path/to/file.ts
   ```

## Archived Date

**Date**: January 18, 2026  
**Commit**: See git log for exact commit hash  
**Reason**: Cleanup after golden master test suite implementation  
**Protection**: Golden master suite (`vb6exact.golden.spec.ts`) now provides comprehensive parity validation

## Notes

- All files were proven unreferenced before archiving
- Git history is preserved (files were moved with `git mv`)
- No runtime behavior was changed
- All 85+ tests continue to pass after archiving
- TypeScript compilation remains clean
