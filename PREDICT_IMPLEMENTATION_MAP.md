# ET Simulation Page - Implementation Map

**Last Updated:** March 20, 2026 (Post-reconciliation)

## Primary File
- `src/pages/Predict.tsx` (~1546 lines) - Main ET simulation page

## Component Structure

### Page Wrapper
- Uses `<Page>` component with `<HelpLink manual="quarter" label="Manual" />` in actions
- No large header (removed in cleanup pass)

### Timeslip Panel
- ET slip styled component with paper texture
- **CURRENT BUTTONS:**
  - Detail button — full-width, opens DetailedParametersModal
  - Save, Copy, Print **REMOVED** (not verified as faithful to original)

### Vehicle Selector
- Dropdown in timeslip area
- Edit button (gear icon) opens VehicleEditorPopup
- "+ New Vehicle" button navigates to `/vehicles`

### Environment Controls
- EnvironmentForm component (compact mode)
- 6 FieldHelp (?) icons with QPRO3W.txt-cited tooltips
- Race length selector with "Drag Racing" and "Land Speed" optgroups
- Live weather **SUPPRESSED** (incomplete track list)

### Optimizer Controls
- "Optimize (Beta)" button opens OptimizerModal
- Labeled as experimental

### Help/Manual Entry Points
- HelpLink component in Page actions
- Links to "quarter" manual

### Vehicle Creation/Edit Flow
- VehicleEditorPopup modal — opens from gear button (requires existing vehicle)
- New vehicles created via /vehicles page

## Services/Dependencies
- `simulate()` from workerBridge
- `loadVehicles()`, `saveVehicle()` from state/vehicles
- `useSharedEnv()` for sticky environment
- `calculateWeatherImpact()` for comparison weather breakdown
- `useSubscription()`, `useCapabilities()` for feature gating
- Live weather imports removed

## Modals/Overlays
- OptimizerModal (lazy loaded)
- VehicleEditorPopup (lazy loaded)
- DetailedParametersModal (lazy loaded)
- VB6Inputs side panel (strict mode)

## Tooltip/Help System
- `src/domain/config/tooltips.ts` — 50+ entries with QPRO3W.txt citations (single source of truth)
- `src/domain/help/etFieldHelp.ts` — delegates to tooltips.ts for structured FieldHelpEntry
- `src/shared/components/FieldHelp.tsx` — (?) icon with center-screen popup for environment fields
- VehicleEditorUnified.tsx — 25+ fields use `hint={TOOLTIPS.*}` for inline help text

## Detailed Parameters
- `src/shared/components/DetailedParameters.tsx` — Modal UI
- `src/shared/utils/buildVb6DetailedParameters.ts` — Row builder (primary: VB6PrintedRow[], fallback: traces)
- `src/domain/physics/vb6/vb6PrintedRow.ts` — VB6-exact formatting
- Columns: Event, Time (s), Dist (ft), MPH, Accel (g), Gear, RPM, Slip
- Row types: staged, rollout, distance, time, shift, speed
- See `docs/VB6_DETAILED_PARAMETERS.md` for full spec

## Remaining Open Items
- Optimizer not verified as complete/faithful (labeled Beta)
- Print capability not implemented (see ET_SIM_PASS2_REPORT.md Section 5)
- Motorcycle Final Drive Worksheet not implemented (low priority)
