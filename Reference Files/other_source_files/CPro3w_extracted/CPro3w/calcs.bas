Attribute VB_Name = "Module1"
Option Explicit

Private CNTF(1 To DYNO_ROWS) As Integer

Public Function Calclbs() As String
Dim Work As Single
    If Not isBike Then
        If Not isGlide Then
            Work = gc_BasePr.Value + gc_SRate.Value * (gc_Turns.Value - gc_dRnHt.Value * gc_ThrdpI.Value)
        Else
            Work = gc_BasePr.Value + gc_SRate.Value * gc_Turns.Value
        End If
        
        Calclbs = Round(Work, 5)
    Else
        Work = gc_BasePr.Value + gc_SRate.Value * (gc_ThrdpI.Value - gc_dRnHt.Value)
        Calclbs = Round(Work, 2)
    End If
End Function

Public Function CalcTurns() As String
Dim Work As Single
    If Not isBike Then
        If Not isGlide Then
            Work = (gc_Static.Value - gc_BasePr.Value) / gc_SRate.Value + gc_dRnHt.Value * gc_ThrdpI.Value
        Else
            Work = (gc_Static.Value - gc_BasePr.Value) / gc_SRate.Value
        End If
        
        CalcTurns = Round(Work, 0.01)
    Else
        Work = (gc_Static.Value - gc_BasePr.Value) / gc_SRate.Value + gc_dRnHt.Value
        CalcTurns = Round(Work, 0.001)
    End If
End Function

Public Sub CalcDetails()
Dim CF1D0 As Single, CF2D0 As Single, RetLbf1D0 As Single, RetLbf2D0 As Single
Dim CF1D As Single, CF2D As Single, RetLbf1D As Single, RetLbf2D As Single
Dim add As Single, add2 As Single, add4 As Single
Dim i As Integer, iround As Single, Work As Single, iShow As Boolean
Dim zRPM(1 To 3) As Single
'Dim tq0 As Single, yval As Single
Dim FH1 As Integer, LT0 As Integer, LT1 As Integer, H1 As Integer, DH As Integer
        
    #If ISCLUTCHJR Then
        With frmClutch
        DH = 300:   FH1 = 1875:     LT0 = 1200:     LT1 = 1545:     H1 = 0
        
        gc_LaunchRPM.Value = gc_dRPM1.Value 'forces GRAPH1 to display
        LaunchRPMSave = gc_LaunchRPM.Value  'these two data points
        
        zRPM(1) = gc_dRPM1.Value:   zRPM(2) = gc_dRPM2.Value:   zRPM(3) = gc_dRPM3.Value
    
    #Else   'CLUTCH Pro
        With frmDetails
        DH = 360:   FH1 = 2280:     LT0 = 1440:    LT1 = 1740:      H1 = 2835
        
        If Not isBike Then
            zRPM(1) = Abs(gc_LaunchRPM.Value)
        Else
            zRPM(1) = RoundUp(RPM(1), 500)
        End If
        
        zRPM(2) = RoundDown(RPMLO, 500)
        If zRPM(2) < zRPM(1) Then SWAP zRPM(2), zRPM(1)
        If zRPM(2) = zRPM(1) Then zRPM(2) = zRPM(1) + 500
        
        zRPM(3) = RoundDown(RPM(NTQ), 500)
        If zRPM(3) < zRPM(2) Then SWAP zRPM(3), zRPM(2)
        If zRPM(3) = zRPM(2) Then zRPM(2) = zRPM(3) - 500
        If zRPM(3) > zRPM(2) + 2000 Then zRPM(3) = zRPM(3) - 500
        If zRPM(3) > zRPM(2) + 2000 Then zRPM(3) = zRPM(3) - 500
        
        For i = 1 To 3:     .lblRPM(i) = zRPM(i):   Next
    #End If
        
        'Calculate baseline CFs for all conditions with Zero AirGap
        CalcCF 0, 0, 0, 0, 0, CF1D, CF2D, RetLbf1D, RetLbf2D
        CF1D0 = CF1D:           CF2D0 = CF2D
        RetLbf1D0 = RetLbf1D:   RetLbf2D0 = RetLbf2D
        
        
        'add 1 arm - w/o Counter Wt (and w/o return spring for bikes)
        add = 1
        'calculate required grams per arm change for CalcCF sybroutine
        add2 = gc_CWt1.Value * (gc_NArm1.Value / (gc_NArm1.Value + 1) - 1)
        
        If isBike And AData(gc_Mfg1.Value, 8) > 0 Then
            .Label1(0).caption = "+1 arm - w/o Return Spring"
            'calculate required return spring per arm change for CalcCF sybroutine
            add4 = gc_ArmDepth1.Value * (gc_NArm1.Value / (gc_NArm1.Value + 1) - 1)
        Else
            .Label1(0).caption = "+1 arm, w/o Counter Wt"
            add4 = 0
        End If
        
        CalcCF 0, add, add2, 0, add4, CF1D, CF2D, RetLbf1D, RetLbf2D
        For i = 1 To 3
            Work = TotalLbs(gc_Static.Value, CF1D, RetLbf1D, CF2D, RetLbf2D, zRPM(i))
            Work = Work - TotalLbs(gc_Static.Value, CF1D0, RetLbf1D0, CF2D0, RetLbf2D0, zRPM(i))
            If Not isBike Then
                .Label1(i) = Round(Work, 2)
            Else
                .Label1(i) = Format(Round(Work, 0.2), "###.0")
            End If
        Next
        
        
        'add 1 gram - Total Counter Wt
        add = 1 / gc_NArm1.Value    'convert to grams per arm for CalcCF subroutine
        CalcCF 0, 0, add, 0, 0, CF1D, CF2D, RetLbf1D, RetLbf2D
        For i = 1 To 3
            Work = TotalLbs(gc_Static.Value, CF1D, RetLbf1D, CF2D, RetLbf2D, zRPM(i))
            Work = Work - TotalLbs(gc_Static.Value, CF1D0, RetLbf1D0, CF2D0, RetLbf2D0, zRPM(i))
            iround = IIf(Not isBike, 0.2, 0.1)
            .Label2(i) = Format(Round(Work, iround), "###.0")
        Next
        
        
        'decide to show Ring Height or not
        iShow = True:   If isGlide Then iShow = False
        For i = 0 To 3: .Label3(i).Visible = iShow:  Next
        
        If iShow Then
            'add .010 inch - Ring Height
            add = 0.01
            CalcCF 0, 0, 0, add, 0, CF1D, CF2D, RetLbf1D, RetLbf2D
            For i = 1 To 3
                Work = TotalLbs(gc_Static.Value, CF1D, RetLbf1D, CF2D, RetLbf2D, zRPM(i))
                Work = Work - TotalLbs(gc_Static.Value, CF1D0, RetLbf1D0, CF2D0, RetLbf2D0, zRPM(i))
                If Not isBike Then
                    .Label3(i) = Round(Work, 1)
                Else
                    .Label3(i) = Format(Round(Work, 0.1), "###.0")
                End If
            Next
            FH1 = FH1 + DH:     LT0 = LT0 + DH:     LT1 = LT1 + DH:     H1 = H1 + DH
        End If
        
        
        'decide to show Arm Depth/Return Spring or not
        iShow = True:   If AData(gc_Mfg1.Value, 8) = 0 Then iShow = False
        For i = 0 To 3: .Label4(i).Visible = iShow:  Next
        
        If iShow Then
            .Frame1.Height = FH1:   .Label4(0).Top = LT0 + 15
            For i = 1 To 3:         .Label4(i).Top = LT0:   Next
            .Label6.Top = LT1
            #If Not ISCLUTCHJR Then
                .Height = H1
            #End If
            
            'add .010 inch - Arm Depth or 1 lbs - Return Spring
            If Not isBike Then
                .Label4(0).caption = "+.010 inch - Arm Depth"
                add = 0.01
                CalcCF 0, 0, 0, 0, add, CF1D, CF2D, RetLbf1D, RetLbf2D
                For i = 1 To 3
                    Work = TotalLbs(gc_Static.Value, CF1D, RetLbf1D, CF2D, RetLbf2D, zRPM(i))
                    Work = Work - TotalLbs(gc_Static.Value, CF1D0, RetLbf1D0, CF2D0, RetLbf2D0, zRPM(i))
                    .Label4(i) = Round(Work, 1)
                Next
            Else
                .Label4(0).caption = "+1 lbs - Return Spring"
                add = 1
                CalcCF 0, 0, 0, 0, add, CF1D, CF2D, RetLbf1D, RetLbf2D
                For i = 1 To 3
                    Work = TotalLbs(gc_Static.Value, CF1D, RetLbf1D, CF2D, RetLbf2D, zRPM(i))
                    Work = Work - TotalLbs(gc_Static.Value, CF1D0, RetLbf1D0, CF2D0, RetLbf2D0, zRPM(i))
                    .Label4(i) = Format(Round(Work, 0.1), "###.0")
                Next
            End If
            FH1 = FH1 + DH:     LT0 = LT0 + DH:     LT1 = LT1 + DH:     H1 = H1 + DH
        End If
        
        
        'add 1/2 turn - Adjuster Location or .020 inch - Shim Thickness
        .Frame1.Height = FH1:   .Label5(0).Top = LT0 + 15
        For i = 1 To 3:         .Label5(i).Top = LT0:   Next
        .Label6.Top = LT1
        #If Not ISCLUTCHJR Then
            .Height = H1
        #End If
        
        If Not isBike Then
            .Label5(0).caption = "+1/2 turn - Adjuster Location"
            add = 0.5:  Work = Round(gc_SRate.Value * add, 1)
            .Label5(1) = Work
        Else
            .Label5(0).caption = "+.020 inch - Shim Thickness"
            add = 0.02: Work = Round(gc_SRate.Value * add, 0.1)
            .Label5(1) = Format(Work, "###.0")
        End If
        .Label5(2) = .Label5(1):    .Label5(3) = .Label5(1)
        
        
        'equivalent counterweight per bare arm
        Work = .Label1(2) / .Label2(2)
        .Label6 = "note: 1 arm, w/o Counter Wt = " & Format(Work, "###.0") & " grams of Total Counter Wt"
     
     
        '#If Not isclutchjr Then
            'estimated plate force to lower low gear lockup by 100 RPM
            'Call TABY(RPM(), ETQLO(), NTQ, 1, RPMLO, tq0)
            'Call TABY(RPM(), ETQLO(), NTQ, 1, RPMLO - 100, yval)
            'Work = (yval / tq0) * TotalLbs(gc_Static.Value, CF1D0, RetLbf1D0, CF2D0, RetLbf2D0, RPMLO)
            
            'Work = Work - TotalLbs(gc_Static.Value, CF1D0, RetLbf1D0, CF2D0, RetLbf2D0, RPMLO - 100)
            'Pat Hale - make this work better, or eliminate it - 11/26/02
            'If gc_LaunchRPM.Value > 0 Then Work = Work * (gc_LaunchRPM.Value / RPMLO) ^ 2.1
            'iround = IIf(Not isBike, 5, 1): Work = Round(Work, iround)
            '.Label7.caption = "+" & Work & " lbs of Plate Force @ " & .lblRPM(2) & " RPM is estimated to lower the Low Gear Lockup from " & Round(RPMLO, 20) & " to " & Round(RPMLO - 100, 20) & " RPM."
        '#End If
   End With
End Sub

Public Sub ClutchCalc()
Dim area As Single
Dim CMUratio As Single
Dim C1HI As Single, C1LO As Single
Dim C2 As Single
Dim geom As Single
Dim i As Integer, k As Integer
Dim k0 As Single
Dim k1 As Integer
Dim Launch As Single
Dim RetLbf As Single
Dim TFlag As Integer

Dim A As Single, B As Single, z As Single
Dim r1 As Single, R2 As Single

Dim FAG As Single, FZAG As Single, PSIZAG As Single
Dim FLO As Single, FHI As Single
Dim PSILO As Single, PSIHI As Single
Dim PSIVEL As Single
Dim iround As Single

Dim MRST As Single
Dim vbreply As Integer
    
    'set rounding value for car and bike plate forces
    iround = IIf(Not isBike, 5, 2)
    
    'CALCULATE TOTAL CLUTCH TORQUE CAPACITY USING
    'EQUATION:  CTQ = C1 * (Static + Cf * RPM ^ 2))
    
    'Calculate CFs for conditions with Zero AirGap
    'and clutch centrifugal plate forces - lbs
    CalcCF 0, 0, 0, 0, 0, CF1, CF2, RetLbf1, RetLbf2
    For k = 1 To NTQ
        CNTF(k) = TotalLbs(0, CF1, RetLbf1, CF2, RetLbf2, RPM(k))
    Next

    'load clutch grid values and update graph1
    frmClutch.grdClutch.Refresh
    For i = 0 To DYNO_ROWS - 1
        With gc_grdClutch
            If RPM(i + 1) = 0 Then
                .GridArray(0, i) = 0
                .GridArray(1, i) = 0
                .GridArray(2, i) = 0
            Else
                .GridArray(0, i) = RPM(i + 1)
                z = CNTF(i + 1):    z = Round(z, iround)
                .GridArray(1, i) = z
                .GridArray(2, i) = gc_Static.Value + z
            End If
        End With
    Next
    Graph1
    frmClutch.grdClutch.Refresh
    
    #If Not ISCLUTCHJR Then
        'calculate total friction surface area
        area = 2 * gc_NDisk.Value * (gc_ClArea.Value / 100) * PI * (gc_DiskOD.Value ^ 2 - gc_DiskID.Value ^ 2) / 4
     
        'calculate geometry constant assuming constant pressure
        geom = ((gc_DiskOD.Value ^ 3 - gc_DiskID.Value ^ 3) / (3 * (gc_DiskOD.Value ^ 2 - gc_DiskID.Value ^ 2)) / 12)
      
        'set launch RPM variable (preserve CMU heating option)
        If gc_LaunchRPM.Value > 0 Then
            Launch = gc_LaunchRPM.Value
        Else
            Launch = -gc_LaunchRPM.Value
        End If
        
        'calculate Launch conditions with Zero AirGap
        FZAG = TotalLbs(gc_Static.Value, CF1, RetLbf1, CF2, RetLbf2, Launch)
        PSIZAG = FZAG / area
        
        'Friction material temperature effect (for cars with pedal clutches only)
        If Not isBike And Not isGlide Then
            TFlag = 0
        Else
            TFlag = 1
        End If
        
        CMUratio = 1
        C1HI = 2 * gc_NDisk.Value * gc_CMU.Value * geom * (gc_ClArea.Value / 100) ^ 0.2
    
418         C1LO = C1HI * CMUratio
        C1HI = C1HI * CMUratio ^ 0.1
        
        'convert total plate load to clutch torque capacity
        For k = 1 To NTQ
            z = gc_Static.Value + CNTF(k)
            CTQLO(k) = C1LO * z
            CTQHI(k) = C1HI * z
        Next
        
        'combine CFs and RetLbfs for intersection calculations.
        'note: this method is not strictly correct for bikes with
        'return springs.  It is correct for all car clutches.
        C2 = (CF1 + CF2) / gc_PDRatio.Value ^ 2 'convert to engine RPM
        RetLbf = RetLbf1 + RetLbf2
        
        'calculate Low Gear Lockup RPM, plate load and friction PSI
        RPMLO = 1
        For k = 2 To NTQ
            k1 = k - 1
            B = (ETQLO(k) - ETQLO(k1)) / (RPM(k) - RPM(k1))
            A = ETQLO(k) - RPM(k) * B
            
            If C2 * RPM(k1) ^ 2 <= RetLbf Then
                r1 = 0:     R2 = 0
                If B <> 0 Then r1 = (C1LO * gc_Static.Value - ZLO - A) / B
            Else
                z = 4 * (C1LO * C2) * (C1LO * (gc_Static.Value - RetLbf) - ZLO - A)
                If B ^ 2 > z Then z = Sqr(B ^ 2 - z) Else z = 0
                If C2 <> 0 Then
                    r1 = (B - z) / (2 * C1LO * C2)
                    R2 = (B + z) / (2 * C1LO * C2)
                End If
            End If
            
            If r1 < RPM(k1) And k > 2 Then r1 = 0
            If R2 < RPM(k1) And k > 2 Then R2 = 0
            If r1 > RPM(k) And k < NTQ Then r1 = 0
            If R2 > RPM(k) And k < NTQ Then R2 = 0
            If r1 > 0 Then RPMLO = r1
            If R2 > 0 Then RPMLO = R2
        Next
        
        FLO = TotalLbs(gc_Static.Value, CF1, RetLbf1, CF2, RetLbf2, RPMLO)
        PSILO = FLO / area
        
        'Friction material temperature effect
        If gc_LaunchRPM.Value > 0 And TFlag = 0 Then
            k0 = 2 - 0.05 * (gc_TractionIndex.Value - 1)
            z = k0 * Launch * PSIZAG - (k0 - 1) * RPMLO * PSILO
            
            If z < 0 Then z = 0
            CMUratio = (z / (RPMLO * PSILO)) ^ 0.07
            If CMUratio < 0.86 Then CMUratio = 0.86
            If CMUratio > 1.02 Then CMUratio = 1.02
            
            TFlag = 1
            GoTo 418
        End If
    
        'Calculate High Gear Lockup RPM, plate load and friction PSI
        RPMHI = 1
        For k = 2 To NTQ
            k1 = k - 1
            B = (ETQHI(k) - ETQHI(k1)) / (RPM(k) - RPM(k1))
            A = ETQHI(k) - RPM(k) * B
            
            If C2 * RPM(k1) ^ 2 <= RetLbf Then
                r1 = 0:     R2 = 0
                If B <> 0 Then r1 = (C1HI * gc_Static.Value - ZHI - A) / B
            Else
                z = 4 * (C1HI * C2) * (C1HI * (gc_Static.Value - RetLbf) - ZHI - A)
                If B ^ 2 > z Then z = Sqr(B ^ 2 - z) Else z = 0
                If C2 <> 0 Then
                    r1 = (B - z) / (2 * C1HI * C2)
                    R2 = (B + z) / (2 * C1HI * C2)
                End If
            End If
            
            If r1 < RPM(k1) And k > 2 Then r1 = 0
            If R2 < RPM(k1) And k > 2 Then R2 = 0
            If r1 > RPM(k) And k < NTQ Then r1 = 0
            If R2 > RPM(k) And k < NTQ Then R2 = 0
            If r1 > 0 Then RPMHI = r1
            If R2 > 0 Then RPMHI = R2
        Next
        
        FHI = TotalLbs(gc_Static.Value, CF1, RetLbf1, CF2, RetLbf2, RPMHI)
        PSIHI = FHI / area
            
        'calculate CF for Launch conditions with user input AirGap
        CalcCF gc_AirGap.Value, 0, 0, 0, 0, CF1, CF2, RetLbf1, RetLbf2
        z = gc_SRate.Value * gc_AirGap.Value * gc_ThrdpI.Value
        FAG = TotalLbs(gc_Static.Value + z, CF1, RetLbf1, CF2, RetLbf2, Launch)
        
        'load calculated values into label controls and update graph2
        With frmClutch
            .Label1(6).caption = Round(FAG, iround)
            .Label2.caption = Round(FZAG, iround)
            .Label3.caption = Format(Round(PSIZAG, 0.1), "###.0")
            .Label4.caption = Round(RPMLO, 20)
            .Label5.caption = Round(FLO, iround)
            .Label6.caption = Format(Round(PSILO, 0.1), "###.0")
            .Label7.caption = Round(RPMHI, 20)
            .Label8.caption = Round(FHI, iround)
            .Label9.caption = Format(Round(PSIHI, 0.1), "###.0")
            .sspLowGear.caption = "Low = " & .Label4.caption
            .sspHighGear.caption = "High = " & .Label7.caption
        End With
        
        'reset calculated CFs for conditions with Zero AirGap
        CalcCF 0, 0, 0, 0, 0, CF1, CF2, RetLbf1, RetLbf2
        Graph2
        DoEvents    'added to force graph/grid update prior to error checking
        
        'check for excessive clutch loading or heat generation
        PSIVEL = PSIHI * (RPMHI / gc_PDRatio.Value) * PI * gc_DiskOD.Value / 12
        If Not isBike Then
            'Pat Hale - check these constants again!
            If PSIHI > 60 Or PSIVEL > 750000 Then
                MsgBox "You probably need more surface area for this clutch setup.  Either add another clutch disk of this Mfg.Style to the clutch pack . . . or change to a larger diameter Mfg.Style clutch.", vbExclamation, "Warning: Friction PSI is very high!"
            End If
        Else
            'Pat Hale - check these constants again!
            If PSIHI > 6 Or PSIVEL > 75000 Then
                MsgBox "You probably need more surface area for this clutch setup.  Either add another clutch disk of this Mfg.Style to the clutch pack . . . or change to a larger diameter Mfg.Style clutch.", vbExclamation, "Warning: Friction PSI is very high!"
            End If
           
           'check for minimum required static plate force at
           'starting line - since clutch arms are not spinning.
           'MRST = 0.44 * PTQ * gc_PDRatio.Value / C1LO    'v1.26
            MRST = 0.48 * PTQ * gc_PDRatio.Value / C1LO    'v3.0
            MRST = Round(MRST, 5)
    
            If gc_Static.Value < MRST Then
                vbreply = MsgBox("The input Static Plate Force of " & Format(gc_Static.Value, "####0") & " lbs may be too low!  To avoid damaging the clutch when leaving the starting line, a minimum Static Plate Force of " & Format(MRST, "#####") & " lbs is recommended.  Would you like to use the recommended " & Format(MRST, "#####") & " lbs instead?", vbYesNo + vbExclamation, "Warning: Static Plate Force")
                
                If vbreply = vbYes Then
                    gc_Static.Value = MRST
                    ClutchCalc
                    SelTextBoxText frmClutch.txtStatic
                End If
            End If
        End If
    #End If
End Sub

Public Sub CalcCF(AIRGAP As Single, add1 As Single, add2 As Single, add3 As Single, add4 As Single, CF1 As Single, CF2 As Single, RetLbf1 As Single, RetLbf2 As Single)
Dim ATypeI(1 To 2) As Integer, NARM(1 To 2) As Integer
Dim MCW(1 To 2) As Single, RNGHT(1 To 2) As Single, ADPTH(1 To 2) As Single

Dim i As Integer, j As Integer
Dim ALR As Single
Dim Angle As Single
Dim CF As Single
Dim CGLR As Single
Dim DCG As Single
Dim DCW As Single
Dim Denom As Single
Dim drnht As Single
Dim DPlate As Single
Dim EAD As Single
Dim Height As Single, Length As Single
Dim RetLbf As Single
Dim RTSLVR As Single

Dim XJ(1 To 8)
Dim XJ1 As Single, XJ2 As Single, XJ3 As Single, XJ4 As Single
Dim XJMAX As Integer
Dim HUNTName As String
Dim TOLJ As Single, ER As Single
Dim IGO As Integer
    
    'Z5 = 60 ^ 2 * 12 * 453.6 * grav / (2 * PI ^ 2)
    Const Z5 = (60 / PI) ^ 2 * 6 * 453.6 * grav
    
    'put arm stuff into local variables for easy usage
    ATypeI(1) = gc_Mfg1.Value:              ATypeI(2) = gc_Mfg2.Value
    NARM(1) = gc_NArm1.Value + add1:        NARM(2) = gc_NArm2.Value
    MCW(1) = gc_CWt1.Value + add2:          MCW(2) = gc_CWt2.Value
    RNGHT(1) = gc_RingHt1.Value + add3:     RNGHT(2) = gc_RingHt2.Value
    ADPTH(1) = gc_ArmDepth1.Value + add4:   ADPTH(2) = gc_ArmDepth2.Value
    
    'set up information for HUNT iteration
    XJ(1) = 0
    XJ1 = 0:    XJ2 = -2:   XJ3 = XJ1:  XJ4 = -XJ2
    XJMAX = 15: HUNTName = "arcsine":   TOLJ = 0.0005
    
    'calculate CF and RetLbf for subroutine input AirGap
    For j = 1 To 2
        CF = 0: RetLbf = 0
        
        If ATypeI(j) > 0 Then
            i = ATypeI(j)
            Angle = AData(i, 9)
            drnht = AData(i, 6) - RNGHT(j)
                  
            'check for arm depth adjustment capability
            If Not isBike And AData(i, 8) > 0 Then
                DPlate = AData(i, 2)
                'check for fixed pivot option
                If AData(i, 1) < 0 Then DPlate = AData(i, 2) + 2 * AData(i, 3) * Cos(Angle * PI180)
                
                'calculate length from plate pin to arm depth checking diameter
                Length = (DPlate - AData(i, 8)) / 2
                ALR = Length / (AData(i, 3) * Cos(Angle * PI180))
                
                'calculate expected arm depth value due only to
                'ring height change from reference conditions
                EAD = AData(i, 7) + (ALR - 1) * drnht
                
                'calculate equivalent arm height for HUNT iteration
                Height = Length * Tan(Angle * PI180) + (EAD - ADPTH(j)) - ALR * (drnht + AIRGAP)
            Else
                'calculate pivot pin height for HUNT iteration
                Height = AData(i, 3) * Sin(Angle * PI180) - (drnht + AIRGAP)
            End If

425         If Not isBike And AData(i, 8) > 0 Then  'include arm depth
                ER = Length * Tan(Angle * PI180) - Height
            Else                                    'no arm depth
                ER = AData(i, 3) * Sin(Angle * PI180) - Height
            End If
                 
            'find the angle that gives the desired Height value (i.e. ER = 0)
            Call HUNT(Angle, ER, XJ1, XJ2, XJ3, XJ4, TOLJ, XJMAX, XJ(), IGO, HUNTName)
            DoEvents
            If IGO = 1 Then GoTo 425
                 
            DPlate = AData(i, 2)
            Denom = AData(i, 3) * Cos(Angle * PI180)
            
            'check for fixed pivot option
            If AData(i, 1) < 0 Then DPlate = AData(i, 2) + 2 * Denom
                 
            DCW = DPlate - 2 * AData(i, 4) * Cos((Angle + AData(i, 10)) * PI180)
            ALR = (AData(i, 4) * Sin((Angle + AData(i, 10)) * PI180)) / Denom
            CF = NARM(j) * MCW(j) * DCW * ALR
                        
            DCG = DPlate - 2 * AData(i, 5) * Cos((Angle + AData(i, 11)) * PI180)
            CGLR = (AData(i, 5) * Sin((Angle + AData(i, 11)) * PI180)) / Denom
            CF = CF + NARM(j) * Abs(AData(i, 1)) * DCG * CGLR
        
            If isBike And AData(i, 8) > 0 Then  'check for bike with return springs
                RTSLVR = (0.5 * (DPlate - AData(i, 8)) - Denom) / Denom
                RetLbf = NARM(j) * ADPTH(j) * RTSLVR    'ADPTH = Return Spring Force
            End If
        End If
        
        'load public variables with CF and RetLbf values
        If j = 1 Then CF1 = CF / Z5: RetLbf1 = RetLbf
        If j = 2 Then CF2 = CF / Z5: RetLbf2 = RetLbf
    Next
End Sub

Public Function TotalLbs(StaticLbs As Single, Coef1 As Single, RetLbs1 As Single, Coef2 As Single, RetLbs2 As Single, Rev As Single)
Dim cLbs1 As Single
Dim cLbs2 As Single
    cLbs1 = Coef1 * (Rev / gc_PDRatio.Value) ^ 2 - RetLbs1
    If cLbs1 < 0 Then cLbs1 = 0

    cLbs2 = Coef2 * (Rev / gc_PDRatio.Value) ^ 2 - RetLbs2
    If cLbs2 < 0 Then cLbs2 = 0
    
    TotalLbs = StaticLbs + cLbs1 + cLbs2
End Function

Public Sub Graph1()
Dim i As Integer
Dim dy As Single
Dim nst As Integer
Dim npts As Integer
Dim z As Single, z1 As Single, z2 As Single, zRPM As Single
    
    With frmClutch.gph1
        .NumSets = 2
        'isBike with two arm style columns, one having return springs
        If isBike And gc_NArm1.Value * gc_NArm2.Value > 0 Then
            If AData(gc_Mfg1.Value, 8) > 0 Or AData(gc_Mfg2.Value, 8) > 0 Then
                .NumSets = 4
            End If
        End If
        
        .DataReset = 1      'graphdata
        .DataReset = 8      'xposdata
        .DataReset = 19     'overlaydata
        .DataReset = 23     'overlayxposdata
        .ClipGraph = 1
        .MissingData = 1
        
        'select the required ticks for x axis
        .XAxisMin = 0
        .XAxisMax = RoundUp(RPM(NTQ), 2000)
        
        .XAxisTicks = (.XAxisMax - .XAxisMin) / 2000
        If .XAxisTicks = 2 Then .XAxisTicks = 4
        If .XAxisTicks = 3 Then .XAxisTicks = 6
        If .XAxisTicks = 4 Then .XAxisTicks = 8
        
        'select delta y to provide the required ticks
        .YAxisMin = 0
        .YAxisMax = gc_Static.Value + CNTF(NTQ)
        .YAxisTicks = 5
        dy = (.YAxisMax - .YAxisMin) / .YAxisTicks
        
        Select Case dy
            Case Is <= 10:   dy = 10
            Case Is <= 20:   dy = 20
            Case Is <= 40:   dy = 40
            Case Is <= 50:   dy = 50
            Case Is <= 80:   dy = 80
            Case Is <= 100:  dy = 100
            Case Is <= 200:  dy = 200
            Case Is <= 400:  dy = 400
            Case Is <= 500:  dy = 500
            Case Is <= 800:  dy = 800
            Case Is <= 1000: dy = 1000
            Case Is <= 2000: dy = 2000
            Case Else:       dy = 4000
        End Select
        
        .YAxisMax = RoundUp(.YAxisMax, dy)
        .YAxisTicks = .YAxisTicks - 1
        'check to see if another y tick is needed now
        If .YAxisMax > .YAxisMin + .YAxisTicks * dy Then
            .YAxisTicks = .YAxisTicks + 1
        End If
        
        'drop off one y ticks to make better looking graph
        If .YAxisMin + .YAxisTicks * dy > .YAxisMax + dy Then
            .YAxisTicks = .YAxisTicks - 1
        End If
        .YAxisMax = .YAxisMin + .YAxisTicks * dy
        
        'now load static and total plate force
        'data points into the graph control
        nst = 12:   npts = 25:  .NumPoints = nst + npts
        z = (.XAxisMax - .XAxisMin) / (npts - 1)
        
        'on program load, before save is ever pressed
        'note:   StaticSave = CFSave = RetLbfSave = 0
        For i = nst To 1 Step -1
            zRPM = .XAxisMin + (i - 1) * z
            
            If StaticSave > 0 Then
                .ThisSet = 1:       .ThisPoint = nst + 1 - i
                .XPosData = zRPM:   .GraphData = StaticSave
            End If

            .ThisSet = 2:           .ThisPoint = nst + 1 - i
            .XPosData = zRPM:       .GraphData = gc_Static.Value
        Next
        
        For i = 1 To npts
            zRPM = .XAxisMin + (i - 1) * z

            If CF1Save > 0 Or CF2Save > 0 Then
                .ThisSet = 1:       .ThisPoint = nst + i
                .XPosData = zRPM
                .GraphData = TotalLbs(StaticSave, CF1Save, RetLbf1Save, CF2Save, RetLbf2Save, zRPM)
                
                'isBike with two arm style columns, one having return springs
                If .NumSets = 4 Then
                    .ThisSet = 3:       .ThisPoint = nst + i
                    .XPosData = zRPM
                    z1 = TotalLbs(StaticSave, CF1Save, RetLbf1Save, 0, 0, zRPM)
                    z2 = TotalLbs(StaticSave, 0, 0, CF2Save, RetLbf2Save, zRPM)
                    If z1 > z2 Then
                        .GraphData = z1
                    Else
                        .GraphData = z2
                    End If
                End If
            End If
            
            .ThisSet = 2:           .ThisPoint = nst + i
            .XPosData = zRPM
            .GraphData = TotalLbs(gc_Static.Value, CF1, RetLbf1, CF2, RetLbf2, zRPM)
            
            'isBike with two arm style columns, one having return springs
            If .NumSets = 4 Then
                .ThisSet = 4:       .ThisPoint = nst + i
                .XPosData = zRPM
                z1 = TotalLbs(gc_Static.Value, CF1, RetLbf1, 0, 0, zRPM)
                z2 = TotalLbs(gc_Static.Value, 0, 0, CF2, RetLbf2, zRPM)
                If z1 > z2 Then
                    .GraphData = z1
                Else
                    .GraphData = z2
                End If
            End If
        Next

        'use the overlay graph option to put a symbol at the
        'intersection of the saved & new plate force lines
        .ThisPoint = 1
        If CF1 + CF2 = CF1Save + CF2Save Then
            .OverlayGraphData = -100:       .OverlayXPosData = 0
            If StaticSave = gc_Static.Value Then
                .OverlayGraphData = gc_Static.Value
            End If
        Else
            'Pat Hale - this root solution method when RetLbf > 0 is not strictly
            'correct.  Ignores the hold back effect properly modeled in TotalLbs.
            'The only perfect fix is to use HUNT to find the solution.
            z = ((StaticSave - gc_Static.Value) - (RetLbf1Save + RetLbf2Save - RetLbf1 - RetLbf2)) / (CF1 + CF2 - CF1Save - CF2Save)
            z = z * gc_PDRatio.Value ^ 2
            
            If z >= 0 Then
                z = z ^ 0.5:                .OverlayXPosData = z
                .OverlayGraphData = TotalLbs(StaticSave, CF1Save, RetLbf1Save, CF2Save, RetLbf2Save, z)
            Else
                .OverlayGraphData = -100:   .OverlayXPosData = 0
                If StaticSave = gc_Static.Value Then
                    .OverlayGraphData = gc_Static.Value
                End If
            End If
        End If
        
        'use the overlay graph option to put a symbol at the
        'launch RPM points on the saved & new plate load lines
        If Not isBike Then
            .ThisPoint = 2
            zRPM = Abs(gc_LaunchRPM.Value): .OverlayXPosData = zRPM
            .OverlayGraphData = TotalLbs(gc_Static.Value, CF1, RetLbf1, CF2, RetLbf2, zRPM)
        
            .ThisPoint = 3
            zRPM = Abs(LaunchRPMSave):      .OverlayXPosData = zRPM
            .OverlayGraphData = TotalLbs(StaticSave, CF1Save, RetLbf1Save, CF2Save, RetLbf2Save, zRPM)
        End If
        
        .DrawMode = graphBlit
    End With

    #If ISCLUTCHJR Then
        frmClutch.Picture1.Picture = frmClutch.gph1.Picture
    #End If
End Sub

Public Sub LoadArmData()
Dim i As Integer

Dim isACE As Boolean
Dim isACE6 As Boolean
Dim isAFT9 As Boolean
Dim isAFT10 As Boolean
Dim isBNF As Boolean
Dim isCRW9 As Boolean
Dim isCRW10 As Boolean
Dim isCGL10 As Boolean
Dim isEW7 As Boolean
Dim isEW8 As Boolean
Dim isHay8 As Boolean
Dim isHay10 As Boolean
Dim isLaT As Boolean
Dim isPIR As Boolean
Dim isRAM As Boolean
Dim isRAM10 As Boolean
Dim isRFE As Boolean
Dim isTTN As Boolean
    
    isRSA = True
    'set app.title and product name to CLUTCH Pro for car software
    isACE = False Or isRSA
    isACE6 = False Or isRSA
    isAFT9 = False Or isRSA
    isAFT10 = False Or isRSA
    isBNF = False Or isRSA
    isCRW9 = False Or isRSA
    isCRW10 = False Or isRSA
    isCGL10 = False Or isRSA
    isEW7 = False Or isRSA
    isEW8 = False Or isRSA
    isHay8 = False Or isRSA
    isHay10 = False Or isRSA
    isLaT = False Or isRSA
    isPIR = False Or isRSA
    isRAM = False Or isRSA
    isRAM10 = False Or isRSA
    isRFE = False Or isRSA
    isTTN = False Or isRSA
    
    'set app.title and product name to CLUTCH Pro M for bike software
    isBike = False Or isRSA
        
    '1 = weight of arm (negative value used for fixed pivot option)
    '2 = fixed diameter of arm (plate or pivot - based on #1)
    '3 = radius from the plate to pivot
    '4 = radius from the plate to weight
    '5 = radius from the plate to arm cg
    '6 = reference ring height for pivot angle (or pack clearance for "glide")
    '7 = reference arm depth for pivot angle   (or return spring force in lbs)
    '8 = reference arm depth checking diameter (return spring location diameter)
    '9 = orientation angle from plate to pivot
    '10= delta angle from the pivot to weight
    '11= delta angle from the pivot to arm cg
    '12= nominal disk outer diameter
    
    'motorcycle clutches are a little different
    '7 = default return spring force in lbs
    '8 = fixed diameter of the arm return spring location
    
    nMfg = 0:   MfgName(nMfg) = "": nArmMfg(nMfg) = 1
    i = 0:      AName(i) = "   .0": ADesc(i) = ""
    
    If isACE Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "ACE Manufacturing: 7.0, 7.6 && 8.0 inch"
        nArmMfg(nMfg) = 4
        
        i = i + 1
        AName(i) = "ACE.1"  'ACE-R700401 - .180" thick
        ADesc(i) = "ACE.1 = w/std over the hat 38 gram arm"
        AData(i, 1) = -37.9 'fixed pivot
        AData(i, 2) = 6.172
        AData(i, 3) = 0.505
        AData(i, 4) = 0.984
        AData(i, 5) = 0.82
        AData(i, 6) = 0.85
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -6.65
        AData(i, 10) = 69.76
        AData(i, 11) = 36.8
        AData(i, 12) = 7
        
        i = i + 1
        AName(i) = "ACE.2"  'ACE-R700402
        ADesc(i) = "ACE.2 = w/less aggressive 30 gram arm"
        AData(i, 1) = -29.6 'fixed pivot
        AData(i, 2) = 6.172
        AData(i, 3) = 0.505
        AData(i, 4) = 0.975
        AData(i, 5) = 0.9
        AData(i, 6) = 0.85
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -6.65
        AData(i, 10) = 58.8
        AData(i, 11) = 28.7
        AData(i, 12) = 7
        
        i = i + 1
        AName(i) = "ACE.3"  'ACE-R700403 - Pat Hale - improve estimate based on real arm
        ADesc(i) = "ACE.3 = w/shaved 33 gram arm (estimate)"
        AData(i, 1) = -33.5 'fixed pivot (estimate)
        AData(i, 2) = 6.172
        AData(i, 3) = 0.505
        AData(i, 4) = 0.984
        AData(i, 5) = 0.88
        AData(i, 6) = 0.85
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -6.65
        AData(i, 10) = 69.76
        AData(i, 11) = 31.5
        AData(i, 12) = 7
        
        i = i + 1
        AName(i) = "ACE.4"  'thin ACE-R700401 - .125" thick
        ADesc(i) = "ACE.4 = w/thin (.125"") over the hat 27 gram arm"
        AData(i, 1) = -26.7 'fixed pivot
        AData(i, 2) = 6.172
        AData(i, 3) = 0.505
        AData(i, 4) = 0.984
        AData(i, 5) = 0.82
        AData(i, 6) = 0.85
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -6.65
        AData(i, 10) = 69.76
        AData(i, 11) = 36.8
        AData(i, 12) = 7
    End If
 
    If isACE6 Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "ACE Manufacturing: 6.25 inch"
        nArmMfg(nMfg) = 1
        
        i = i + 1
        AName(i) = "ACE.5"
        ADesc(i) = "ACE.5 = w/std over the hat 25 gram arm"
        AData(i, 1) = -25.3 'fixed pivot
        AData(i, 2) = 4.91
        AData(i, 3) = 0.4
        AData(i, 4) = 0.86
        AData(i, 5) = 0.676
        AData(i, 6) = 0.85
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 5.31
        AData(i, 10) = 66.54
        AData(i, 11) = 47.1
        AData(i, 12) = 6.25
    End If
 
    If isAFT9 Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "Applied Friction Technology: 9 inch"
        nArmMfg(nMfg) = 1
       
        i = i + 1
        AName(i) = "AFT.1"
        ADesc(i) = "AFT.1 = w/std under the hat 70 gram arm"
        AData(i, 1) = 70    'fixed plate
        AData(i, 2) = 7.875
        AData(i, 3) = 0.552
        AData(i, 4) = 1.021
        AData(i, 5) = 0.35
        AData(i, 6) = 1.655
        AData(i, 7) = 0.66
        AData(i, 8) = 3.855
        AData(i, 9) = 0
        AData(i, 10) = 131.28
        AData(i, 11) = 18
        AData(i, 12) = 9
    End If
    
    If isAFT10 Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "Applied Friction Technology: 10 && 11 inch"
        nArmMfg(nMfg) = 4
       
        i = i + 1
        AName(i) = "AFT.2"
        ADesc(i) = "AFT.2 = 10"" w/std under the hat 72 gram arm"
        AData(i, 1) = 72    'fixed plate
        AData(i, 2) = 8.875
        AData(i, 3) = 0.552
        AData(i, 4) = 1.021
        AData(i, 5) = 0.45
        AData(i, 6) = 1.655
        AData(i, 7) = 0.66
        AData(i, 8) = 4.855
        AData(i, 9) = 0
        AData(i, 10) = 131.28
        AData(i, 11) = 14
        AData(i, 12) = 10
        
        i = i + 1
        AName(i) = "AFT.3"
        ADesc(i) = "AFT.3 = 10"" w/under the hat 101 gram arm"
        AData(i, 1) = 101   'fixed plate
        AData(i, 2) = 8.875
        AData(i, 3) = 0.552
        AData(i, 4) = 1.021
        AData(i, 5) = 0.55
        AData(i, 6) = 1.655
        AData(i, 7) = 0.66
        AData(i, 8) = 4.855
        AData(i, 9) = 0
        AData(i, 10) = 131.28
        AData(i, 11) = 14
        AData(i, 12) = 10
        
        i = i + 1
        AName(i) = "AFT.4"
        ADesc(i) = "AFT.4 = 10.5"" w/std under the hat 79 gram arm"
        AData(i, 1) = 79    'fixed plate
        AData(i, 2) = 9.875 - 0.355 'per Frank @ AFT 08/26/04
        AData(i, 3) = 0.552
        AData(i, 4) = 1.021
        AData(i, 5) = 0.55
        AData(i, 6) = 1.655
        AData(i, 7) = 0.66
        AData(i, 8) = 5.855 - 0.355 'per Frank @ AFT 08/26/04
        AData(i, 9) = 0
        AData(i, 10) = 131.28
        AData(i, 11) = 11
        AData(i, 12) = 10.5
        
        i = i + 1
        AName(i) = "AFT.5"
        ADesc(i) = "AFT.5 = 11"" w/std under the hat 79 gram arm"
        AData(i, 1) = 79    'fixed plate
        AData(i, 2) = 9.875
        AData(i, 3) = 0.552
        AData(i, 4) = 1.021
        AData(i, 5) = 0.55
        AData(i, 6) = 1.655
        AData(i, 7) = 0.66
        AData(i, 8) = 5.855
        AData(i, 9) = 0
        AData(i, 10) = 131.28
        AData(i, 11) = 11
        AData(i, 12) = 11
    End If
    
    If isBNF Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "Boninfante Clutches:"
        nArmMfg(nMfg) = 3
        
        i = i + 1
        AName(i) = "BNF.1"
        ADesc(i) = "BNF.1 = 6.6"" w/std over the hat 26 gram arm"
        AData(i, 1) = -26.2 'fixed pivot
        AData(i, 2) = 4.78
        AData(i, 3) = 0.41
        AData(i, 4) = 0.94
        AData(i, 5) = 0.68
        AData(i, 6) = 0.69
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 0
        AData(i, 10) = 68.91
        AData(i, 11) = 41
        AData(i, 12) = 6.6
        
        i = i + 1
        AName(i) = "BNF.2"
        ADesc(i) = "BNF.2 = 8"" w/std arm (estimate)"
        AData(i, 1) = -37.9 'fixed pivot
        AData(i, 2) = 6.172
        AData(i, 3) = 0.505
        AData(i, 4) = 0.984
        AData(i, 5) = 0.82
        AData(i, 6) = 0.93
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -6.65
        AData(i, 10) = 69.76
        AData(i, 11) = 36.8
        AData(i, 12) = 8
        
        i = i + 1
        AName(i) = "BNF.3"
        ADesc(i) = "BNF.3 = 10"" w/std arm (estimate)"
        AData(i, 1) = -59   'fixed pivot
        AData(i, 2) = 7.88
        AData(i, 3) = 0.622
        AData(i, 4) = 0.948
        AData(i, 5) = 1.215
        AData(i, 6) = 0.702
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 0
        AData(i, 10) = 54.49
        AData(i, 11) = 16
        AData(i, 12) = 10
    End If
 
    If isCRW9 Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "Crower Clutches: 9 inch"
        nArmMfg(nMfg) = 2
        
        i = i + 1
        AName(i) = "CRW.4"
        ADesc(i) = "CRW.4 = w/std over the hat 42 gram arm"
        AData(i, 1) = -41.5 'fixed pivot
        AData(i, 2) = 6.88
        AData(i, 3) = 0.673
        AData(i, 4) = 1.066
        AData(i, 5) = 1.135
        AData(i, 6) = 0.702
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 0
        AData(i, 10) = 45.8
        AData(i, 11) = 16
        AData(i, 12) = 9
        
        i = i + 1
        AName(i) = "CRW.5"
        ADesc(i) = "CRW.5 = w/over the hat 46 gram arm"
        AData(i, 1) = -45.6 'fixed pivot
        AData(i, 2) = 6.88
        AData(i, 3) = 0.673
        AData(i, 4) = 1.066
        AData(i, 5) = 1.1
        AData(i, 6) = 0.702
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 0
        AData(i, 10) = 45.8
        AData(i, 11) = 13.5
        AData(i, 12) = 9
    End If
    
    If isCRW10 Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "Crower Clutches: 10.0 && 10.7 inch"
        nArmMfg(nMfg) = 3
        
        i = i + 1
        AName(i) = "CRW.1"
        ADesc(i) = "CRW.1 = 10"" w/std over the hat 59 gram arm"
        AData(i, 1) = -59    'fixed pivot
        AData(i, 2) = 7.88
        AData(i, 3) = 0.622
        AData(i, 4) = 0.948
        AData(i, 5) = 1.215
        AData(i, 6) = 0.702
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 0
        AData(i, 10) = 54.49
        AData(i, 11) = 16
        AData(i, 12) = 10
        
        i = i + 1
        AName(i) = "CRW.2"
        ADesc(i) = "CRW.2 = 10"" w/over the hat 53 gram arm"
        AData(i, 1) = -52.6 'fixed pivot
        AData(i, 2) = 7.88
        AData(i, 3) = 0.623
        AData(i, 4) = 1.048
        AData(i, 5) = 1.205
        AData(i, 6) = 0.702
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 0
        AData(i, 10) = 45.37
        AData(i, 11) = 11.5
        AData(i, 12) = 10
        
        i = i + 1
        AName(i) = "CRW.3"
        ADesc(i) = "CRW.3 = 10.7"" w/over the hat 76 gram arm"
        AData(i, 1) = -75.4 'fixed pivot
        AData(i, 2) = 7.88
        AData(i, 3) = 0.627
        AData(i, 4) = 1.014
        AData(i, 5) = 1.155
        AData(i, 6) = 0.702
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 6.74
        AData(i, 10) = 52.54
        AData(i, 11) = 16
        AData(i, 12) = 10.7
    End If
    
    If isCGL10 Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "Crowerglide Clutches: 10 && 11 inch"
        nArmMfg(nMfg) = 8
        
        i = i + 1
        AName(i) = "CGL.1"
        ADesc(i) = "CGL.1 = 86 gram arm with .125"" nose radius"
        AData(i, 1) = -86  'fixed pivot
        AData(i, 2) = 8.125
        AData(i, 3) = 0.5645
        AData(i, 4) = 1.1605
        AData(i, 5) = 1.401
        AData(i, 6) = 0.04
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 19.4
        AData(i, 10) = 36.91
        AData(i, 11) = -0.22
        AData(i, 12) = 10
        
        i = i + 1
        AName(i) = "CGL.2"
        ADesc(i) = "CGL.2 = 86 gram arm with .156"" nose radius"
        AData(i, 1) = -85.9 'fixed pivot
        AData(i, 2) = 8.125
        AData(i, 3) = 0.5255
        AData(i, 4) = 1.1175
        AData(i, 5) = 1.362
        AData(i, 6) = 0.04
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 17.33
        AData(i, 10) = 39.43
        AData(i, 11) = 1.04
        AData(i, 12) = 10
        
        i = i + 1
        AName(i) = "CGL.3"
        ADesc(i) = "CGL.3 = 86 gram arm with .187"" nose radius"
        AData(i, 1) = -85.8 'fixed pivot
        AData(i, 2) = 8.125
        AData(i, 3) = 0.487
        AData(i, 4) = 1.075
        AData(i, 5) = 1.323
        AData(i, 6) = 0.04
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 14.94
        AData(i, 10) = 42.25
        AData(i, 11) = 2.59
        AData(i, 12) = 10
        
        i = i + 1
        AName(i) = "CGL.4"
        ADesc(i) = "CGL.4 = 86 gram arm with .218"" nose radius"
        AData(i, 1) = -85.7 'fixed pivot
        AData(i, 2) = 8.125
        AData(i, 3) = 0.4495
        AData(i, 4) = 1.032
        AData(i, 5) = 1.284
        AData(i, 6) = 0.04
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 12.13
        AData(i, 10) = 45.59
        AData(i, 11) = 4.49
        AData(i, 12) = 10
        
        i = i + 1
        AName(i) = "CGL.5"
        ADesc(i) = "CGL.5 = 103 gram arm with .125"" nose radius"
        AData(i, 1) = -103.5  'fixed pivot
        AData(i, 2) = 8.125
        AData(i, 3) = 0.5645
        AData(i, 4) = 1.1605
        AData(i, 5) = 1.401
        AData(i, 6) = 0.04
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 19.4
        AData(i, 10) = 36.91
        AData(i, 11) = -0.22
        AData(i, 12) = 10
        
        i = i + 1
        AName(i) = "CGL.6"
        ADesc(i) = "CGL.6 = 103 gram arm with .156"" nose radius"
        AData(i, 1) = -103.4 'fixed pivot
        AData(i, 2) = 8.125
        AData(i, 3) = 0.5255
        AData(i, 4) = 1.1175
        AData(i, 5) = 1.362
        AData(i, 6) = 0.04
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 17.33
        AData(i, 10) = 39.43
        AData(i, 11) = 1.04
        AData(i, 12) = 10
        
        i = i + 1
        AName(i) = "CGL.7"
        ADesc(i) = "CGL.7 = 103 gram arm with .187"" nose radius"
        AData(i, 1) = -103.3 'fixed pivot
        AData(i, 2) = 8.125
        AData(i, 3) = 0.487
        AData(i, 4) = 1.075
        AData(i, 5) = 1.323
        AData(i, 6) = 0.04
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 14.94
        AData(i, 10) = 42.25
        AData(i, 11) = 2.59
        AData(i, 12) = 10
        
        i = i + 1
        AName(i) = "CGL.8"
        ADesc(i) = "CGL.8 = 103 gram arm with .218"" nose radius"
        AData(i, 1) = -103.2 'fixed pivot
        AData(i, 2) = 8.125
        AData(i, 3) = 0.4495
        AData(i, 4) = 1.032
        AData(i, 5) = 1.284
        AData(i, 6) = 0.04
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 12.13
        AData(i, 10) = 45.59
        AData(i, 11) = 4.49
        AData(i, 12) = 10
    End If
    
    If isEW7 Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "East West Engineering: 7.0 && 7.5 inch"
        nArmMfg(nMfg) = 1

        i = i + 1
        AName(i) = "E&W.6"
        ADesc(i) = "E&&W.6 = w/std 35 gram arm (estimate)"
        AData(i, 1) = 35    'fixed plate
        AData(i, 2) = 6.97
        AData(i, 3) = 0.4
        AData(i, 4) = 0.957
        AData(i, 5) = 0.72
        AData(i, 6) = 0.935
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -4.74
        AData(i, 10) = 75.54
        AData(i, 11) = 41
        AData(i, 12) = 7.5
    End If
    
    If isEW8 Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "East West Engineering: 8 && 9 inch"
        nArmMfg(nMfg) = 5

        i = i + 1
        AName(i) = "E&W.1"
        ADesc(i) = "E&&W.1 = w/std over the hat 36 gram arm"
        AData(i, 1) = 36.1  'fixed plate
        AData(i, 2) = 7.188
        AData(i, 3) = 0.509
        AData(i, 4) = 0.99
        AData(i, 5) = 0.805
        AData(i, 6) = 0.935
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -3.69
        AData(i, 10) = 69.41
        AData(i, 11) = 36.5
        AData(i, 12) = 8
    
        i = i + 1
        AName(i) = "E&W.2"
        ADesc(i) = "E&&W.2 = w/under the hat arm"
        AData(i, 1) = 34.5  'fixed plate
        AData(i, 2) = 7.188
        AData(i, 3) = 0.509
        AData(i, 4) = 0.99
        AData(i, 5) = 0.778
        AData(i, 6) = 0.935
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -3.69
        AData(i, 10) = 69.41
        AData(i, 11) = 8.3
        AData(i, 12) = 8
     
        i = i + 1
        AName(i) = "E&W.3"
        ADesc(i) = "E&&W.3 = w/shaved over the hat arm"
        AData(i, 1) = 32.8  'fixed plate
        AData(i, 2) = 7.188
        AData(i, 3) = 0.509
        AData(i, 4) = 0.99
        AData(i, 5) = 0.85
        AData(i, 6) = 0.935
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -3.69
        AData(i, 10) = 69.41
        AData(i, 11) = 32.5
        AData(i, 12) = 8
     
        i = i + 1
        AName(i) = "E&W.4"
        ADesc(i) = "E&&W.4 = w/thin (.132"") over the hat arm"
        AData(i, 1) = 27.2  'fixed plate
        AData(i, 2) = 7.188
        AData(i, 3) = 0.509
        AData(i, 4) = 0.99
        AData(i, 5) = 0.805
        AData(i, 6) = 0.935
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -3.69
        AData(i, 10) = 69.41
        AData(i, 11) = 36.5
        AData(i, 12) = 8
        
        i = i + 1
        AName(i) = "E&W.5"
        ADesc(i) = "E&&W.5 = w/less aggressive 32 gram arm"
        AData(i, 1) = 32.1  'fixed plate
        AData(i, 2) = 7.188
        AData(i, 3) = 0.509
        AData(i, 4) = 0.968
        AData(i, 5) = 0.83
        AData(i, 6) = 0.935
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -3.69
        AData(i, 10) = 56.04
        AData(i, 11) = 32
        AData(i, 12) = 8
    End If
    
    If isHay8 Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "Hays Clutches - Mr Gasket: 8 inch"
        nArmMfg(nMfg) = 2
        
        i = i + 1
        AName(i) = "HAY.1"
        ADesc(i) = "HAY.1 = w/std over the hat 31 gram arm"
        AData(i, 1) = -30.6 'fixed pivot
        AData(i, 2) = 6.173
        AData(i, 3) = 0.509
        AData(i, 4) = 0.91
        AData(i, 5) = 0.86
        AData(i, 6) = 0.82
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -3.69
        AData(i, 10) = 57.14
        AData(i, 11) = 32
        AData(i, 12) = 8
        
        i = i + 1
        AName(i) = "HAY.2"
        ADesc(i) = "HAY.2 = w/over the hat 36 gram arm"
        AData(i, 1) = -35.1 'fixed pivot
        AData(i, 2) = 6.173
        AData(i, 3) = 0.509
        AData(i, 4) = 0.952
        AData(i, 5) = 0.83
        AData(i, 6) = 0.82
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -3.69
        AData(i, 10) = 73.05
        AData(i, 11) = 36
        AData(i, 12) = 8
    End If
    
    If isHay10 Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "Hays Clutches - Mr Gasket: 10 inch"
        nArmMfg(nMfg) = 5
        
        i = i + 1
        AName(i) = "HAY.3"
        ADesc(i) = "HAY.3 = 75 gram arm, short tip (97X06049)"
        AData(i, 1) = 74.6  'fixed plate
        AData(i, 2) = 8.28
        AData(i, 3) = 0.562
        AData(i, 4) = 1.007
        AData(i, 5) = 0.5
        AData(i, 6) = 0.4
        AData(i, 7) = 1
        AData(i, 8) = 6
        AData(i, 9) = 0
        AData(i, 10) = 132.83
        AData(i, 11) = 10
        AData(i, 12) = 10
        
        i = i + 1
        AName(i) = "HAY.4"
        ADesc(i) = "HAY.4 = 73 gram arm, long tip (97X06052)"
        AData(i, 1) = 72.6  'fixed plate
        AData(i, 2) = 8.28
        AData(i, 3) = 0.562
        AData(i, 4) = 1.007
        AData(i, 5) = 0.58
        AData(i, 6) = 0.4
        AData(i, 7) = 1
        AData(i, 8) = 6
        AData(i, 9) = 0
        AData(i, 10) = 132.83
        AData(i, 11) = 10
        AData(i, 12) = 10
        
        i = i + 1
        AName(i) = "HAY.5"
        ADesc(i) = "HAY.5 = 105 gram arm, short tip, lo cwt (97006117)"
        AData(i, 1) = 104.9 'fixed plate
        AData(i, 2) = 8.28
        AData(i, 3) = 0.562
        AData(i, 4) = 1.096
        AData(i, 5) = 0.64
        AData(i, 6) = 0.4
        AData(i, 7) = 1
        AData(i, 8) = 6
        AData(i, 9) = 0
        AData(i, 10) = 136.99
        AData(i, 11) = 10
        AData(i, 12) = 10
        
        i = i + 1
        AName(i) = "HAY.6"
        ADesc(i) = "HAY.6 = 105 gram arm, short tip, hi cwt (97006117)"
        AData(i, 1) = 104.9 'fixed plate
        AData(i, 2) = 8.28
        AData(i, 3) = 0.562
        AData(i, 4) = 1.329
        AData(i, 5) = 0.64
        AData(i, 6) = 0.4
        AData(i, 7) = 1
        AData(i, 8) = 6
        AData(i, 9) = 0
        AData(i, 10) = 126.72
        AData(i, 11) = 10
        AData(i, 12) = 10
        
        i = i + 1
        AName(i) = "HAY.7"
        ADesc(i) = "HAY.7 = 75 gram arm, long tip (97X06053)"
        AData(i, 1) = 74.4  'fixed plate
        AData(i, 2) = 8.28
        AData(i, 3) = 0.562
        AData(i, 4) = 1.007
        AData(i, 5) = 0.58
        AData(i, 6) = 0.4
        AData(i, 7) = 1
        AData(i, 8) = 6
        AData(i, 9) = 0
        AData(i, 10) = 132.83
        AData(i, 11) = 10
        AData(i, 12) = 10
    End If
    
    If isLaT Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "L&&T Clutches: 8 inch"
        nArmMfg(nMfg) = 4
        
        i = i + 1
        AName(i) = "L&T.1"
        ADesc(i) = "L&&T.1 = aluminum w/std over the hat arm"
        AData(i, 1) = 36.1  'fixed plate
        AData(i, 2) = 7.188
        AData(i, 3) = 0.509
        AData(i, 4) = 0.99
        AData(i, 5) = 0.805
        AData(i, 6) = 0.82
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -3.69
        AData(i, 10) = 69.41
        AData(i, 11) = 36.5
        AData(i, 12) = 8
    
        i = i + 1
        AName(i) = "L&T.2"
        ADesc(i) = "L&&T.2 = aluminum w/under the hat arm"
        AData(i, 1) = 34.5  'fixed plate
        AData(i, 2) = 7.188
        AData(i, 3) = 0.509
        AData(i, 4) = 0.99
        AData(i, 5) = 0.778
        AData(i, 6) = 0.82
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -3.69
        AData(i, 10) = 69.41
        AData(i, 11) = 8.3
        AData(i, 12) = 8
     
        i = i + 1
        AName(i) = "L&T.3"
        ADesc(i) = "L&&T.3 = aluminum w/shaved over the hat arm"
        AData(i, 1) = 32.8  'fixed plate
        AData(i, 2) = 7.188
        AData(i, 3) = 0.509
        AData(i, 4) = 0.99
        AData(i, 5) = 0.85
        AData(i, 6) = 0.82
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -3.69
        AData(i, 10) = 69.41
        AData(i, 11) = 32.5
        AData(i, 12) = 8
     
        i = i + 1
        AName(i) = "L&T.4"
        ADesc(i) = "L&&T.4 = aluminum w/thin (.132"") over the hat arm"
        AData(i, 1) = 27.2  'fixed plate
        AData(i, 2) = 7.188
        AData(i, 3) = 0.509
        AData(i, 4) = 0.99
        AData(i, 5) = 0.805
        AData(i, 6) = 0.82
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -3.69
        AData(i, 10) = 69.41
        AData(i, 11) = 36.5
        AData(i, 12) = 8
    End If
    
    If isPIR Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "Performance Industries Clutches"
        nArmMfg(nMfg) = 4
       
        i = i + 1
        AName(i) = "PIR.1"
        ADesc(i) = "PIR.1 = 7.3"" w/std under the hat 59 gram arm"
        AData(i, 1) = -54   'fixed pivot
        AData(i, 2) = 5.125
        AData(i, 3) = 0.601
        AData(i, 4) = 1.199
        AData(i, 5) = 0.415
        AData(i, 6) = 2
        AData(i, 7) = 0.87
        AData(i, 8) = 4.1875
        AData(i, 9) = 16.9
        AData(i, 10) = 138.38
        AData(i, 11) = 15.6
        AData(i, 12) = 7.3
        
        i = i + 1
        AName(i) = "PIR.2"
        ADesc(i) = "PIR.2 = 8.4"" && 9.0"" w/std 70 gram arm"
        AData(i, 1) = -65.4 'fixed pivot
        AData(i, 2) = 6.25
        AData(i, 3) = 0.585
        AData(i, 4) = 1.178
        AData(i, 5) = 0.73
        AData(i, 6) = 2
        AData(i, 7) = 0.87
        AData(i, 8) = 5
        AData(i, 9) = 10.7
        AData(i, 10) = 137.46
        AData(i, 11) = 9.4
        AData(i, 12) = 8.4
        
        i = i + 1
        AName(i) = "PIR.3"
        ADesc(i) = "PIR.3 = 8.4"" && 9.0"" w/84 gram arm"
        AData(i, 1) = -78.7 'fixed pivot
        AData(i, 2) = 6.25
        AData(i, 3) = 0.585
        AData(i, 4) = 1.178
        AData(i, 5) = 0.725
        AData(i, 6) = 2
        AData(i, 7) = 0.87
        AData(i, 8) = 5
        AData(i, 9) = 10.7
        AData(i, 10) = 137.46
        AData(i, 11) = 6.9
        AData(i, 12) = 8.4
        
        i = i + 1
        AName(i) = "PIR.4"  'Pat Hale - need to revise based on production item
        ADesc(i) = "PIR.4 = 8.4"" && 9.0"" w/64 gram arm (estimate)"
        AData(i, 1) = -61   'fixed pivot
        AData(i, 2) = 6.25
        AData(i, 3) = 0.585
        AData(i, 4) = 1.178
        AData(i, 5) = 0.72
        AData(i, 6) = 2
        AData(i, 7) = 0.87
        AData(i, 8) = 5
        AData(i, 9) = 10.7
        AData(i, 10) = 137.46
        AData(i, 11) = 3.2
        AData(i, 12) = 8.4
    End If
    
    If isRAM Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "RAM Clutches: 7 && 8 inch"
        nArmMfg(nMfg) = 3
        
        i = i + 1
        AName(i) = "RAM.1"
        ADesc(i) = "RAM.1 = 7"" billet w/std over the hat 29 gram arm"
        AData(i, 1) = -28.8 'fixed pivot
        AData(i, 2) = 5.25
        AData(i, 3) = 0.5115
        AData(i, 4) = 0.7115
        AData(i, 5) = 0.745
        AData(i, 6) = 0.2
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 12.27
        AData(i, 10) = 64.6
        AData(i, 11) = 25
        AData(i, 12) = 7
        
        i = i + 1
        AName(i) = "RAM.2"
        ADesc(i) = "RAM.2 = 7"" billet w/over the hat 39 gram arm"
        AData(i, 1) = -39.2 'fixed pivot
        AData(i, 2) = 5.25
        AData(i, 3) = 0.5115
        AData(i, 4) = 1.0995
        AData(i, 5) = 0.79
        AData(i, 6) = 0.2
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 12.27
        AData(i, 10) = 72.6
        AData(i, 11) = 37
        AData(i, 12) = 7
        
        i = i + 1
        AName(i) = "RAM.3"
        ADesc(i) = "RAM.3 = 8"" billet w/std over the hat 36 gram arm"
        AData(i, 1) = -37.8 'fixed pivot
        AData(i, 2) = 6.25
        AData(i, 3) = 0.5115
        AData(i, 4) = 1.002
        AData(i, 5) = 0.825
        AData(i, 6) = 0.2
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 12.27
        AData(i, 10) = 71.7
        AData(i, 11) = 25
        AData(i, 12) = 8
    End If
    
    If isRAM10 Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "RAM Clutches: 10 inch"
        nArmMfg(nMfg) = 3
        
        i = i + 1
        AName(i) = "RAM.4"
        ADesc(i) = "RAM.4 = billet w/std over the hat 68 gram arm"
        AData(i, 1) = -68   'fixed pivot
        AData(i, 2) = 7.375
        AData(i, 3) = 0.5135
        AData(i, 4) = 0.846
        AData(i, 5) = 1.06
        AData(i, 6) = 0.2
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 12.5
        AData(i, 10) = 60.14
        AData(i, 11) = 8
        AData(i, 12) = 10
        
        i = i + 1
        AName(i) = "RAM.5"
        ADesc(i) = "RAM.5 = billet w/over the hat 73 gram arm"
        AData(i, 1) = -73.4 'fixed pivot
        AData(i, 2) = 7.375
        AData(i, 3) = 0.514
        AData(i, 4) = 1.2755
        AData(i, 5) = 1.05
        AData(i, 6) = 0.2
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 12.5
        AData(i, 10) = 54.8
        AData(i, 11) = 13.5
        AData(i, 12) = 10
        
        i = i + 1
        AName(i) = "RAM.6"
        ADesc(i) = "RAM.6 = billet w/over the hat 75 gram arm"
        AData(i, 1) = -74.6 'fixed pivot
        AData(i, 2) = 7.375
        AData(i, 3) = 0.5145
        AData(i, 4) = 1.163
        AData(i, 5) = 1.03
        AData(i, 6) = 0.2
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 12.5
        AData(i, 10) = 73.42
        AData(i, 11) = 13
        AData(i, 12) = 10
    End If
    
    If isRFE Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "Ray Franks Enterprises"
        nArmMfg(nMfg) = 2
        
        i = i + 1
        AName(i) = "RFE.1"
        ADesc(i) = "RFE.1 = 8"" aluminum w/std over the hat arm"
        AData(i, 1) = 36.5  'fixed plate
        AData(i, 2) = 7.188
        AData(i, 3) = 0.511
        AData(i, 4) = 0.99
        AData(i, 5) = 0.805
        AData(i, 6) = 0.86
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -3.69
        AData(i, 10) = 69.37
        AData(i, 11) = 36.5
        AData(i, 12) = 8
        
        i = i + 1
        AName(i) = "RFE.2"
        ADesc(i) = "RFE.2 = 7"" titanium w/shaved 28 gram arm"
        AData(i, 1) = 27.5  'fixed plate
        AData(i, 2) = 6.188
        AData(i, 3) = 0.511
        AData(i, 4) = 0.935
        AData(i, 5) = 0.715
        AData(i, 6) = 1.08
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = -3.69
        AData(i, 10) = 84.66
        AData(i, 11) = 44.5
        AData(i, 12) = 7
    End If

    If isTTN Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "Titan Speed Engineering: 10 inch"
        nArmMfg(nMfg) = 1
        
        i = i + 1
        AName(i) = "TTN.1"
        ADesc(i) = "TTN.1 = w/std under the hat 92 gram arm (PT1155)"
        AData(i, 1) = 92    'fixed plate
        AData(i, 2) = 8.68
        AData(i, 3) = 0.55
        AData(i, 4) = 1.037
        AData(i, 5) = 0.873
        AData(i, 6) = 1.5
        AData(i, 7) = 0.7
        AData(i, 8) = 5
        AData(i, 9) = 0
        AData(i, 10) = 127.93
        AData(i, 11) = 5
        AData(i, 12) = 10
    End If
    
    If isBike Then
        nMfg = nMfg + 1
        MfgName(nMfg) = "Motorcycle Clutches:"
        nArmMfg(nMfg) = 3
        
        i = i + 1
        AName(i) = "BND.1"
        ADesc(i) = "BND.1 = Bandit 3 arm motorcycle clutch"
        AData(i, 1) = -14.5 'fixed pivot
        AData(i, 2) = 3.2
        AData(i, 3) = 0.495
        AData(i, 4) = 1.216
        AData(i, 5) = 0.658
        AData(i, 6) = 0.1
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 36.13
        AData(i, 10) = 37.3
        AData(i, 11) = 27.3
        AData(i, 12) = 6
    
        i = i + 1
        AName(i) = "BNS.1"
        ADesc(i) = "BNS.1 = Banshee 6 arm motorcycle clutch"
        AData(i, 1) = -16.1 'fixed pivot
        AData(i, 2) = 3.2
        AData(i, 3) = 0.55
        AData(i, 4) = 1.27
        AData(i, 5) = 0.66
        AData(i, 6) = 0.125
        AData(i, 7) = 0
        AData(i, 8) = 0
        AData(i, 9) = 41.6
        AData(i, 10) = 34
        AData(i, 11) = 29
        AData(i, 12) = 6
    
        i = i + 1
        AName(i) = "MTC.1"
        ADesc(i) = "MTC.1 = MTC 6 arm motorcycle clutch"
        AData(i, 1) = -18   'fixed pivot
        AData(i, 2) = 3.115
        AData(i, 3) = 0.526
        AData(i, 4) = 1.192
        AData(i, 5) = 0.565
        AData(i, 6) = 0.107
        AData(i, 7) = 5
        AData(i, 8) = 1.65
        AData(i, 9) = 27.24
        AData(i, 10) = 43.7
        AData(i, 11) = 9.1
        AData(i, 12) = 6
    
        If isRSA Then isBike = False
    End If
    
    nMfg = nMfg + 1:    MfgName(nMfg) = "Custom Clutches"
                        nArmMfg(nMfg) = 1
    
    i = i + 1:          AName(i) = "CUS.1"
                        ADesc(i) = "CUS.1 = custom arm"
    
    NARMD = i
End Sub
