# VB6 Debug Script for ENGPERF.BAS

To identify the exact calculation discrepancy, add these Debug.Print statements to the VB6 code:

## Add to CalcEngPerf() after line 203 (before iteration loop):

```vb
Debug.Print "=== INITIAL VALUES ==="
Debug.Print "CID: " & CID
Debug.Print "crvf: " & crvf
Debug.Print "flrqs: " & flrqs
Debug.Print "tqcidx: " & tqcidx
Debug.Print "hpcfmx: " & hpcfmx
Debug.Print "efik: " & efik
Debug.Print "crektq: " & crektq
Debug.Print "crekhp: " & crekhp
Debug.Print "epek: " & epek
Debug.Print "BArea: " & BArea
Debug.Print "athroat: " & athroat
Debug.Print "cdi: " & cdi
Debug.Print "EqvPS: " & EqvPS
Debug.Print "CarbVETQ: " & CarbVETQ
Debug.Print "CarbVEHP: " & CarbVEHP
```

## Add inside the iteration loop (after line 204):

```vb
Debug.Print ""
Debug.Print "=== ITERATION " & itr & " ==="
```

## Add after line 253 (after tqfps calculation):

```vb
Debug.Print "TQ: rpmPeakTQ = " & gc_RPMPeakTQ.Value
Debug.Print "  VETQ = " & VETQ & ", RamVETQ = " & RamVETQ
Debug.Print "  EffCR = " & EffCR & ", EFF = " & EFF
Debug.Print "  tqfps = " & tqfps & ", metq = " & metq
Debug.Print "  xqs = " & xqs & ", ivc = " & ivc
Debug.Print "  acrit = " & acrit & ", astar = " & astar & ", psitq = " & psitq
```

## Add after line 276 (after NTQ calculations):

```vb
Debug.Print "  gtqcid = " & gtqcid & ", ftq = " & ftq
Debug.Print "  NTQ(1) = " & NTQ(1) & ", NTQ(2) = " & NTQ(2)
```

## Add after line 349 (after hpfps calculation):

```vb
Debug.Print "HP: rpmPeakHP = " & gc_RPMPeakHP.Value
Debug.Print "  VEHP = " & VEHP & ", RamVEHP = " & RamVEHP
Debug.Print "  EffCR = " & EffCR & ", EFF = " & EFF
Debug.Print "  hpfps = " & hpfps & ", mehp = " & mehp
Debug.Print "  acrit = " & acrit & ", astar = " & astar & ", psihp = " & psihp
```

## Add after line 389 (after NHP calculations):

```vb
Debug.Print "  gtqhp = " & gtqhp & ", ftq = " & ftq
Debug.Print "  NHP(1) = " & NHP(1) & ", NHP(2) = " & NHP(2)
```

## Add after line 442 (final values):

```vb
Debug.Print ""
Debug.Print "=== FINAL VALUES ==="
Debug.Print "Peak HP: " & gc_HP.Value & " @ " & gc_RPMPeakHP.Value & " RPM"
Debug.Print "Peak TQ: " & gc_TQ.Value & " @ " & gc_RPMPeakTQ.Value & " RPM"
Debug.Print "Shift: " & gc_Shift.Value & " RPM"
Debug.Print "Redline: " & gc_Redline.Value & " RPM"
```

## How to Run:

1. Open ENGINE Pro in VB6
2. Add the Debug.Print statements above to ENGPERF.BAS
3. Load BASECASE.ENG (or use the default values)
4. Ensure Curved Runners is selected
5. Run the calculation
6. Copy the Debug output from the Immediate Window
7. Paste it here so I can compare with TypeScript values

This will show exactly where the TypeScript calculation diverges from VB6.
