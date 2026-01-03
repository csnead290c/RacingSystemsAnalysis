# VB6 Curve Generation Debug Script

To identify the exact source of the 3-4 HP discrepancy, add this debug code to VB6 Cgraph.CLS:

## Add to CalcGraph() after line 169 (after Call ENGINE):

```vb
' DEBUG: Output initial 29-point curve from ENGINE function
Open "C:\curve_debug.txt" For Output As #1
Print #1, "=== Initial 29-Point Curve from ENGINE ==="
Print #1, "PeakHP: " & PeakHP & " @ " & RPMHP
Print #1, "CID: " & CID
Print #1, "HP/CID: " & PeakHP / CID
Print #1, "TQPHP: " & Z6 * PeakHP / RPMHP
Print #1, ""
Print #1, "n,RPM,TQ"
For k = 1 To NHP
    Print #1, k & "," & xxrpm(k) & "," & yytq(k)
Next
```

## Add after line 179 (after finding TQMax):

```vb
' DEBUG: Output peak values on initial curve
Print #1, ""
Print #1, "=== Peak Values on Initial Curve ==="
Print #1, "TQMax: " & TQMax & " @ " & TQRPM & " RPM"
Print #1, "Target PeakTQ: " & PeakTQ & " @ " & RPMTQ & " RPM"
Print #1, "DRPM: " & DRPM
Print #1, "DTQ: " & DTQ
Print #1, ""
```

## Add after line 208 (after adjustment loop):

```vb
' DEBUG: Output adjusted 29-point curve
Print #1, "=== Adjusted 29-Point Curve ==="
Print #1, "n,RPM,TQ,HP"
For k = 1 To NHP
    Print #1, k & "," & xxrpm(k) & "," & yytq(k) & "," & yyhp(k)
Next
Print #1, ""
```

## Add after line 241 (after final interpolation):

```vb
' DEBUG: Output final interpolated curve
Print #1, "=== Final Interpolated Curve (125 RPM increments) ==="
Print #1, "XMin: " & XMin & ", XMax: " & XMax & ", NX: " & NX
Print #1, ""
Print #1, "k,RPM,TQ,HP"
For k = 1 To NX
    Print #1, k & "," & RPMpts(k) & "," & TQpts(k) & "," & HPpts(k)
Next
Close #1
```

## Run the VB6 program with these test inputs:

- Peak HP: 461 @ 6650 RPM
- Peak TQ: 415 @ 5450 RPM
- Redline: 7200 RPM
- Displacement: 355.1 CID

The debug output will be written to `C:\curve_debug.txt`. Send me this file and I can identify the exact discrepancy.

## Alternative: Test DTABY function directly

Add this to a button click event to test DTABY interpolation:

```vb
Private Sub btnTestDTABY_Click()
    Dim TQR As Single
    Dim RPMR As Single
    Dim HPCID As Single
    
    RPMR = 1.0  ' Test at peak HP RPM ratio
    HPCID = 461 / 355.1  ' 1.298 HP/CID
    
    Call DTABY(SX(), sz(), sy(), 17, 5, 3, 2, RPMR, HPCID, TQR)
    
    MsgBox "DTABY Test:" & vbCrLf & _
           "RPMR: " & RPMR & vbCrLf & _
           "HPCID: " & HPCID & vbCrLf & _
           "TQR: " & TQR
End Sub
```

This will help verify if my DTABY implementation matches VB6 exactly.
