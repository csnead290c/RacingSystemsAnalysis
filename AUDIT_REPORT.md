# RSA Full Audit Report
**Date:** December 21, 2024

## Executive Summary

This audit compares RSA against Crew Chief Pro (the industry leader), verifies VB6 physics accuracy, and evaluates customer experience. Overall, RSA has a solid foundation with accurate physics, but has gaps in competitive features and some UX inconsistencies.

---

## 1. Feature Comparison: RSA vs Crew Chief Pro

### ✅ Features RSA Has (Competitive Parity)

| Feature | RSA Status | Notes |
|---------|------------|-------|
| **ET Prediction** | ✅ Complete | VB6 exact physics model |
| **Weather Correction** | ✅ Complete | Temp, humidity, baro, elevation |
| **Run Logbook** | ✅ Complete | History page with full incrementals |
| **Margin of Victory** | ✅ Complete | `marginOfVictory.ts` calculation |
| **Run Completion** | ✅ Complete | VB6 physics matching (just fixed) |
| **Similar Runs Lookup** | ✅ Complete | Density altitude matching |
| **Opponent Tracking** | ✅ Complete | Opponents page with prediction |
| **Weather Impact Analysis** | ✅ Complete | ET change breakdown |
| **Split Time Intervals** | ✅ Complete | 60-330, 330-660, etc. |
| **Multiple Vehicles** | ✅ Complete | Vehicle manager with profiles |
| **Tech Card Printing** | ✅ Complete | TechCard page |
| **Race Day Dashboard** | ✅ Complete | Live dial-in tracking |
| **Calculators** | ✅ Complete | Gear ratio, weight transfer, etc. |

### ⚠️ Features RSA Partially Has

| Feature | RSA Status | Gap |
|---------|------------|-----|
| **Throttle Stop Prediction** | ⚠️ Partial | Vehicle supports throttle stop config, but no dedicated prediction workflow |
| **Custom Prediction Factors** | ⚠️ Partial | No user-adjustable DA/AA ratios per vehicle |
| **Wind Correction Factors** | ⚠️ Partial | Wind in simulation but no adjustable wind factors |
| **Reports/Printing** | ⚠️ Partial | No dedicated racing reports menu |
| **Data Acquisition Integration** | ⚠️ Partial | DataImport exists but hidden |

### ❌ Features RSA is Missing (vs Crew Chief Pro)

| Feature | Priority | Recommendation |
|---------|----------|----------------|
| **Combinations/Databases** | 🔴 High | CCP's killer feature - separate prediction formulas per setup. RSA should allow multiple "setups" per vehicle with different tuning factors |
| **Paging Weather Station Integration** | 🟡 Medium | Real-time weather input from external hardware |
| **Auto-Factor Calculation** | 🟡 Medium | CCP analyzes runs to auto-calculate prediction factors |
| **"Similar Runs" at Prediction Time** | 🟢 Low | Show similar runs during ET prediction workflow |
| **Competition Ladder Display** | 🟢 Low | We have the page, just hidden |
| **Video Integration** | 🟢 Low | Link video files to runs |
| **Accounting/Expense Tracking** | 🟢 Low | Nice-to-have |
| **iCard/Transponder Integration** | 🟢 Low | Auto-capture run times |

---

## 2. VB6 Physics Model Accuracy

### ✅ Verified Accurate

The VB6 exact physics model in `src/domain/physics/models/vb6Exact.ts` appears to be a faithful port:

1. **Air Density Calculation** - Uses standard ISA atmosphere with humidity correction
2. **HP Correction Factor** - Matches VB6 formula (rho_lbm_ft3 based)
3. **Launch Simulation** - Tire slip, clutch/converter stall behavior
4. **Shift Logic** - Gear changes at specified RPM points
5. **Aerodynamic Drag** - Cd, frontal area, lift coefficient
6. **Timeslip Recording** - Standard checkpoints (60, 330, 660, 1000, 1320)
7. **Rollout Handling** - Configurable rollout distance

### ⚠️ Areas to Verify

| Area | Concern | Recommendation |
|------|---------|----------------|
| **Weather-to-ET Factors** | CCP uses specific ratios (0.00415/°F for gas, 0.00207 for alcohol) | Verify our weather impact calculations match |
| **Altitude Calculation** | CCP has separate "Corrected Altitude" vs "Density Altitude" | Ensure we're using the right one |
| **Wind Correction** | CCP has adjustable wind factors per body style | Consider adding wind adjustment factors |

### Code Quality Notes

- `vb6Exact.ts` is well-documented with VB6 line references
- Convergence history available for debugging
- Timeslip generation matches VB6 checkpoints

---

## 3. Customer Experience Audit

### ✅ Strengths

1. **Modern UI** - Clean, responsive design with dark mode
2. **Mobile Support** - Bottom nav on mobile devices
3. **Quick Actions** - Dashboard provides fast access to key features
4. **Real-time Simulation** - Instant ET updates on input changes
5. **Free Tier** - Low barrier to entry with calculator access

### ⚠️ UX Issues to Address

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| **Run Logging Fragmentation** | Medium | We just consolidated - good. History is now the main entry point |
| **Prediction Workflow** | Medium | No clear "baseline run" selection workflow like CCP |
| **Missing "What Changed" Display** | Medium | CCP shows color-coded weather changes (red/green) |
| **No Prediction Confidence** | Low | CCP shows multiple formulas, user picks best |
| **Vehicle Setup Complexity** | Low | Pro tier has many fields, could overwhelm new users |

### Recommendations

1. **Add "Quick Prediction" from History** - Select a baseline run, enter new weather, see predicted ET
2. **Color-code Weather Changes** - Green = faster, Red = slower
3. **Simplified Vehicle Wizard** - Step-by-step for new users
4. **Onboarding Flow** - Help new users understand the workflow

---

## 4. Code Quality Audit

### ✅ Strengths

- TypeScript throughout with Zod schemas
- Modular physics calculations
- React best practices (hooks, functional components)
- Web Worker for simulation (non-blocking)

### ⚠️ Technical Debt

| Issue | File(s) | Recommendation |
|-------|---------|----------------|
| **Large Page Files** | Vehicles.tsx (76KB), Predict.tsx (62KB), RaceDay.tsx (58KB) | Break into smaller components |
| **Unused Variables** | Various lint warnings | Clean up commented code |
| **Dynamic Import Warning** | vehicles.ts | Resolve static/dynamic import conflict |
| **Bundle Size** | 1.3MB main chunk | Consider code splitting |

---

## 5. Priority Action Items

### 🔴 High Priority

1. **Add "Combination" Concept** - Allow multiple tuning setups per vehicle with different prediction factors
2. **Baseline Run Selection** - Clear workflow to pick a baseline for prediction
3. **Weather Change Visualization** - Show what changed and impact direction

### 🟡 Medium Priority

4. **Throttle Stop Prediction** - Dedicated workflow for bracket racers
5. **User-Adjustable Factors** - Let experienced users tune DA/AA ratios
6. **Print Racing Reports** - PDF export of run history, tech cards

### 🟢 Low Priority

7. **Data Logger Integration** - Re-enable DataImport with better UX
8. **Competition Ladder** - Re-enable when ready
9. **Video Attachment** - Link videos to runs

---

## 6. Conclusion

**RSA is on par with Crew Chief Pro for core physics accuracy**, but lacks some of the advanced tuning features that serious bracket racers depend on. The "Combinations" concept (multiple prediction factor sets per vehicle) is CCP's key differentiator that RSA should implement.

The web-based, modern UI is a significant advantage over CCP's Windows-only desktop app. Focus on:
1. Matching CCP's prediction accuracy features
2. Maintaining physics model parity
3. Leveraging mobile/web advantages

---

*Generated by RSA Audit Tool - December 2024*
