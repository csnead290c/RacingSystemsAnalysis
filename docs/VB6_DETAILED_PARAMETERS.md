# VB6 Detailed Parameters — Specification

Internal dev reference for the Quarter Pro / Quarter Jr "Detailed Parameters" output.

## Source

VB6 source: `QCommon/TIMESLIP.FRM`, routine `AddListLine` (lines 1481–1536).
The VB6 sim emits printed rows at specific trigger points during the simulation loop,
**not** at every simulation step. Our TypeScript implementation lives in:

- `src/domain/physics/vb6/vb6PrintedRow.ts` — `VB6PrintedRow` interface + `formatVB6PrintedRow()`
- `src/domain/physics/vb6/vb6PrintFormat.ts` — `vb6RightAlign()`, `vb6Round()`, `sng()` (Float32)
- `src/domain/physics/vb6/vb6PrintScheduler.ts` — Print trigger logic
- `src/domain/physics/models/vb6Exact.ts` — Emits `printedRows[]` during simulation

## Columns (in order)

| # | Column    | VB6 Variable           | Format Call                          | Rounding        |
|---|-----------|------------------------|--------------------------------------|-----------------|
| 1 | Time (s)  | `time(L)`              | `RightAlign(5, 2, time(L))`         | 0.01 increment  |
| 2 | Dist (ft) | `Dist(L)`              | `RightAlign(5, 0, Dist(L))`         | 1 ft increment  |
| 3 | MPH       | `Vel(L) * Z5`          | `RightAlign(4, 1, Work)`            | 0.1 increment   |
| 4 | Accel (g) | `AGS(L)`               | `RightAlign(3, 2, AGS(L))`          | 0.01 increment  |
| 5 | RPM       | `EngRPM(L)`            | `Format(Round(EngRPM(L),10),"#,000")` | 10 RPM increment |
| 6 | Gear      | `iGear` (display gear) | `RightAlign(1, 0, iGear)`           | integer         |
| 7 | Slip      | `SLIP(L)`              | `"(s)"` if `SLIP(L)<>0 And iGear<NGR` | flag          |

Where `Z5 = 3600 / 5280` (fps → mph constant, VB6 Single precision).

### Special: Rollout row

Time column uses `RightAlign(4, 3, time(L)) & "/0.00 Rollout"` format.

### Special: Land speed runs

Distance column outputs miles (`RightAlign(5, 2, dist_miles)`) instead of feet.

## Rounding

All rounding uses the VB6 `Round()` function from `RSALIB.bas` (lines 406–419):

```
Round(Value, increment) = increment * Int((Value + increment/2) / increment)
```

This is **round-half-up** (NOT banker's rounding). All intermediate values use
`Single` (Float32) precision via `Math.fround()`.

## Row Selection Rules

Rows are emitted at these trigger points (in chronological order):

| Type       | Trigger                                                                 |
|------------|-------------------------------------------------------------------------|
| `staged`   | First row (L=1): initial state at starting line                         |
| `rollout`  | Distance reaches rollout target (VB6 `DistToPrint(1)`)                  |
| `time`     | ET reaches next time-print increment (0.5s for Pro, 1.0s for Jr)        |
| `distance` | Distance reaches a `DistToPrint(iDist)` checkpoint                      |
| `shift`    | Gear change begins (shift-match) or completes (shift-complete)          |
| `speed`    | Velocity reaches speed target (Bonneville only: 100, 200 mph, etc.)     |

### Distance checkpoints (`DistToPrint`)

**Quarter (1320 ft):** rollout, 60, 330, 594*, 660, 1000, 1254*, 1320 ft
(*594 and 1254 are internal trap-speed distances — NOT printed)

**Eighth (660 ft):** rollout, 60, 330, 594*, 660 ft

### Time-print increment

- **Quarter Pro:** every 0.5 seconds of ET
- **Quarter Jr:** every 1.0 seconds of ET

### Ordering

Rows are sorted chronologically by simulation time. Within the same timestep,
distance events come before time events, which come before speed events.

## Row Count

Row count varies by vehicle configuration:
- A typical quarter-mile Pro run produces **20–40 rows**
- Factors: number of gears (shift rows), ET (more time rows for slower cars),
  time-print increment (Pro=0.5s vs Jr=1.0s)

## Implementation

The `VB6ExactResult.printedRows` array is the **authoritative** source.
It is populated during the VB6Exact simulation loop at the exact moments
VB6 would call `AddListLine`. The Detailed Parameters UI should display
these rows directly — no post-processing or re-derivation needed.

For non-VB6 models (SimpleV1, RSACLASSIC), `printedRows` is not available.
In that case, the UI falls back to deriving approximate rows from `traces[]`
using distance checkpoints + gear changes + finish.
