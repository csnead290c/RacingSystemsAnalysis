Attribute VB_Name = "CPro"
Option Explicit

Private vbreply As Integer

Public Function CalcArea() As String
Dim BArea As Single
Dim SArea As Single
Dim HArea As Single
Dim Work As Single
    BArea = PI * (gc_DiskOD.Value ^ 2 - gc_DiskID.Value ^ 2) / 4
    SArea = gc_NSlot.Value * gc_SlotWD.Value * (gc_DiskOD.Value - gc_DiskID.Value) / 2
    HArea = gc_NHole.Value * PI * gc_HoleDia.Value ^ 2 / 4
    
    Work = 100 * (BArea - SArea - HArea) / BArea
    CalcArea = Round(Work, 0.1)
End Function

Public Sub GSTOT60(GFLG As Integer, amax As Single, T60 As Single)
Dim k1 As Single
Dim exp As Single
    If Not isBike Then
        k1 = 1.732:     exp = 0.534
    Else
        k1 = 1.782:     exp = 0.534
    End If
    
    If GFLG = 1 Then
        T60 = k1 / amax ^ exp
    Else
        amax = (k1 / T60) ^ (1 / exp)
    End If
End Sub

Public Sub EngCalc()
Dim BPMOI As Single, CPMOI As Single
Dim ETQ(1 To DYNO_ROWS) As Single
Dim gs As Single
Dim i As Integer
Dim NDOTHI As Single, NDOTLO As Single
Dim WDOTHI As Single, WDOTLO As Single
Dim TGLO As Single, TGHI As Single
Dim MPH As Single
Dim z As Single, z1 As Single, z2 As Single, z3 As Single, ztd As Single
Dim rgr As Single

    'load dyno grid data into local variables
    With gc_grdDyno
        For i = 1 To DYNO_ROWS
            RPM(i) = .GridArray(0, i - 1)
            TQ(i) = .GridArray(2, i - 1)
        Next
    End With
    
    'determine weather corrected peak TQ and the number of dyno data values
    NTQ = 1
    ETQ(1) = gc_HPTQMult.Value * TQ(1) / HPC
    PTQ = ETQ(1)
    
    For i = 2 To DYNO_ROWS
        ETQ(i) = gc_HPTQMult.Value * TQ(i) / HPC
        If ETQ(i) > PTQ Then PTQ = ETQ(i)
        If RPM(i) = 0 Then Exit For Else NTQ = i
    Next

    'calculate clutch disk PMI for cars and bikes
    CPMOI = 0.6 * gc_DiskWt.Value * (gc_DiskOD.Value / 2) ^ 2 / 386
    If isBike Then  'calculate clutch basket PMI instead
        BPMOI = 0.5 * gc_FlywheelWt.Value * (gc_FlywheelDia.Value / 2) ^ 2 / 386 - CPMOI
        CPMOI = BPMOI / gc_PDRatio.Value    'reference to engine RPM
    End If
    z = gc_EnginePMI.Value - CPMOI
    
    'calculate tire circumference in feet
    With gc_TireDia
        If .UOM = UOM_NORMAL Then
            ztd = PI * .Value / 12
        Else
            ztd = .Value / 12
        End If
    End With
  
    'calculate "equivalent car" rear gear ratio (RGR) for bikes
    rgr = gc_GearRatio.Value / (gc_HighGear.Value * gc_PDRatio.Value)
    
    'Estimate Low Gear axle and engine NDot (holding Amax constant)
    TGLO = 0.96
    'gs = gc_Amax.Value * 0.75
    'For i = 1 To 6
    '    WDOTLO = gs * grav * 60 / (TGLO * ztd)
    '    NDOTLO = WDOTLO * gc_PDRatio.Value * gc_LowGear.Value * rgr
    '    gs = gc_Amax.Value * (PTQ - z * NDOTLO / ZPI) / PTQ
    'Next
    WDOTLO = 0.98 * gc_Amax.Value * grav * 60 / (TGLO * ztd)
    NDOTLO = WDOTLO * gc_PDRatio.Value * gc_LowGear.Value * rgr
    
    'Estimate 1320 foot MPH, tire growth and High Gear axle and engine NDot
    'MPH = 104 / (gc_T60.Value - 0.5):   TGHI = 1 + 0.0003 * MPH
    'WDOTHI = 0.3 * gc_Amax.Value * grav * 60 / (TGHI * ztd)
    
    'Estimate 660 foot MPH, tire growth and High Gear axle and engine NDot
    MPH = 83 / (gc_T60.Value - 0.5):   TGHI = 1 + 0.0003 * MPH
    WDOTHI = 0.33 * gc_Amax.Value * grav * 60 / (TGHI * ztd)
    NDOTHI = WDOTHI * gc_PDRatio.Value * gc_HighGear.Value * rgr
    'NDOTHI = 0.45 * NDOTLO * (gc_HighGear.Value / gc_LowGear.Value) * (TGLO / TGHI)

    'correct Engine Dyno TQ for Ndots and reference to Clutch RPM (for bikes)
    ZLO = z * NDOTLO / ZPI:     ZHI = z * NDOTHI / ZPI
    For i = 1 To NTQ
        ETQLO(i) = (ETQ(i) - ZLO) * gc_PDRatio.Value
        ETQHI(i) = (ETQ(i) - ZHI) * gc_PDRatio.Value
    Next
    
    'calculate low gear clutch TQ capacity reduction
    'due to downstream inertia effects at Clutch RPM
    z1 = CPMOI * gc_PDRatio.Value    'for bikes, reference back to clutch RPM
    'z2 = 0.6 * gc_TransPMI.Value + 0.4 * gc_TransPMI.Value / gc_LowGear.Value
    z2 = gc_TransPMI.Value / gc_LowGear.Value
    z3 = gc_TiresPMI.Value / (gc_LowGear.Value * rgr)
    ZLO = (z1 + z2 + z3) * (NDOTLO / gc_PDRatio.Value) / ZPI

    'calculate high gear clutch TQ capacity reduction
    'due to downstream inertia effects at Clutch RPM
    z1 = CPMOI * gc_PDRatio.Value    'for bikes, reference back to clutch RPM
    'z2 = 0.6 * gc_TransPMI.Value + 0.4 * gc_TransPMI.Value / gc_HighGear.Value
    z2 = gc_TransPMI.Value / gc_HighGear.Value
    z3 = gc_TiresPMI.Value / (gc_HighGear.Value * rgr)
    ZHI = (z1 + z2 + z3) * (NDOTHI / gc_PDRatio.Value) / ZPI
    
    'estimate effect of traction index on ZLO and ZHI
    ZLO = ZLO * (1 - 0.03 * (gc_TractionIndex.Value - 1))
    ZHI = ZHI * (1 - 0.03 * (gc_TractionIndex.Value - 1))
End Sub

Public Sub SetDynoGrid()
Dim i As Integer
    With gc_grdDyno
        .Grd = frmClutch.grdDyno
        .Msg = "Engine Dyno Data"
        .StatusMsg = "Engine Dyno Data - enter the engine RPM, and corrected HP and Torque values."
        .MaxCol = 3
        .MaxRow = DYNO_ROWS    '.MaxRow must come after .MaxCol!
        For i = 0 To .MaxCol - 1
            frmClutch.grdDyno.Columns(i).NumberFormat = "#####;;#"
            frmClutch.grdDyno.Columns(i).Alignment = 1   'right
            .dbgCols(i) = frmClutch.grdDyno.Columns(i)
        Next
            .dbgColMins(0) = 1: .dbgColMaxs(0) = 18000
            .dbgColMins(1) = 1: .dbgColMaxs(1) = 9000
            .dbgColMins(2) = 1: .dbgColMaxs(2) = 7500
    End With
    
    frmClutch.grdDyno.col = 0
    frmClutch.grdDyno.row = 0
End Sub

Public Sub SetBarometerStrings(BarometerCaptionSave As String)
Dim MsgCap As String
    MsgCap = "Help: Ambiguous Barometer and Altimeter Input?"
    
    With gc_Barometer
        Select Case .Value
            Case 25
                If BarometerCaptionSave = .Msg_Normal Then  'was barometer
                    vbreply = MsgBox("You entered a value of 25 for the Barometer.  This value could also be a valid Altimeter reading - feet.  Do you want to use 25.00 in Hg for the Barometer?", vbExclamation + vbYesNo, MsgCap)
                    If vbreply = vbNo Then  'switch to altimeter
                        .UOM = UOM_ALTERNATE
                        .IsChanged = True
                        frmClutch.txtBarometer.Text = "25"
                        SelTextBoxText frmClutch.txtBarometer
                    End If
                Else                        'was altimeter
                    .UOM = UOM_ALTERNATE    'keep as altimeter
                    frmClutch.txtBarometer.Text = "25"
                    SelTextBoxText frmClutch.txtBarometer
                    
                    vbreply = MsgBox("You entered a value of 25 for the Altimeter.  This value could also be a valid Barometer reading - in Hg.  Do you want to use 25 feet for the Altimeter?", vbExclamation + vbYesNo, MsgCap)
                    If vbreply = vbNo Then  'switch to barometer
                        .UOM = UOM_NORMAL
                        .IsChanged = True
                        frmClutch.txtBarometer.Text = "25.00"
                        SelTextBoxText frmClutch.txtBarometer
                    End If
                End If
            
            Case 30
                If BarometerCaptionSave = .Msg_Normal Then  'was barometer
                    vbreply = MsgBox("You entered a value of 30 for the Barometer.  This value could also be a valid Altimeter reading - feet.  Do you want to use 30.00 in Hg for the Barometer?", vbExclamation + vbYesNo, MsgCap)
                    If vbreply = vbNo Then  'switch to altimeter
                        .UOM = UOM_ALTERNATE
                        .IsChanged = True
                        frmClutch.txtBarometer.Text = "30"
                        SelTextBoxText frmClutch.txtBarometer
                    End If
                Else                        'was altimeter
                    .UOM = UOM_ALTERNATE    'keep as altimeter
                    frmClutch.txtBarometer.Text = "30"
                    SelTextBoxText frmClutch.txtBarometer
                    
                    vbreply = MsgBox("You entered a value of 30 for the Altimeter.  This value could also be a valid Barometer reading - in Hg.  Do you want to use 30 feet for the Altimeter?", vbExclamation + vbYesNo, MsgCap)
                    If vbreply = vbNo Then  'switch to barometer
                        .UOM = UOM_NORMAL
                        .IsChanged = True
                        frmClutch.txtBarometer.Text = "30.00"
                        SelTextBoxText frmClutch.txtBarometer
                    End If
                End If
        End Select
        
        BarometerCaptionSave = .caption
    End With
End Sub

Public Sub SetBikeStrings()
    If Not isBike Then
        With gc_GearRatio
            .Msg = "Rear Gear Ratio"
            frmClutch.Label1(19).caption = .Msg
        End With
        
        With frmClutch
            .btnGearRatio.Visible = False
        
            .txtGearRatio.Enabled = True
            .txtGearRatio.BackColor = &H80000005
        End With
    Else
        With gc_GearRatio
            .Msg = "Final Drive Ratio"
            frmClutch.Label1(19).caption = .Msg
        End With
        
        With frmClutch
            .btnGearRatio.Visible = True
        
            .txtGearRatio.Enabled = False
            .txtGearRatio.BackColor = &H80FFFF
        End With
    End If

    SetLaunchStrings
End Sub

Public Sub SetLaunchStrings()
    With frmClutch
        If Not isBike And Not isGlide Then
            .Frame2.Visible = True:     .Frame12.Visible = True:    .Frame13.Visible = True
        Else
            .Frame2.Visible = False:    .Frame12.Visible = False:   .Frame13.Visible = False
        End If
    End With
End Sub

Public Sub SetDiskWT()
    With gc_DiskWt
        .MaxVal_Normal = gc_NDisk.Value * (PI * gc_DiskOD.Value ^ 2 / 4) * (gc_DiskOD.Value / 20) * 0.25
        .MinVal_Normal = 0.25 * .MaxVal_Normal
    End With
    SetMinMax gc_DiskWt
End Sub

Public Sub SetDiskOD()
    With gc_DiskOD
        .MinVal_Normal = AData(gc_Mfg1.Value, 12) - 0.75
        .MaxVal_Normal = AData(gc_Mfg1.Value, 12) + 1
    End With
    SetMinMax gc_DiskOD
End Sub

Public Sub SetDiskID()
    With gc_DiskID
        .MinVal_Normal = 0.5 * gc_DiskOD.Value
        .MaxVal_Normal = 0.8 * gc_DiskOD.Value
    End With
    SetMinMax gc_DiskID
End Sub

Public Sub SetNDisk()
    With gc_NDisk
        If Not isBike Then
            .MaxVal_Normal = 6
        Else
            .MaxVal_Normal = 12
        End If
    End With
    SetMinMax gc_NDisk
End Sub

Public Sub TestDiskID()
Dim MsgTxt As String
Dim MsgCap As String
    MsgTxt = ""
    If gc_DiskID.Value < gc_DiskID.MinVal Then
        MsgTxt = "The clutch disk inner diameter is now too small for the outer diameter!  The inner diameter will now be increased to the limit value of " & gc_DiskID.MinVal & " inches!"
    End If
    
    If gc_DiskOD.Value <= gc_DiskID.Value Then
        MsgTxt = "The clutch disk inner diameter is now larger than the outer diameter!  The inner diameter will now be decreased to the limit value of " & gc_DiskID.MinVal & " inches!"
    End If
    
    If MsgTxt <> "" Then
        MsgCap = "Minimum Clutch Disk Inner Diameter Error!"
        MsgBox MsgTxt, vbExclamation, MsgCap
        gc_DiskID.IsCalc = True
        gc_DiskID.Value = RoundUp(gc_DiskID.MinVal, 0.05)
    End If
End Sub

Public Sub TestDiskOD()
Dim MsgTxt As String
Dim MsgCap As String
    MsgTxt = ""
    If gc_DiskOD.Value <= AData(gc_Mfg1.Value, 12) - 0.4 Then
        MsgTxt = "The clutch disk outer diameter is now too small for the Mfg.Style code!  The outer diameter will now be increased to a value of " & AData(gc_Mfg1.Value, 12) & " inches!"
    End If
    
    If gc_DiskOD.Value >= AData(gc_Mfg1.Value, 12) + 0.4 Then
        MsgTxt = "The clutch disk outer diameter is now too large for the Mfg.Style code!  The outer diameter will now be decreased to a value of " & AData(gc_Mfg1.Value, 12) & " inches!"
    End If
    
    If MsgTxt <> "" Then
        MsgCap = "Clutch Disk Diameter Error!"
        MsgBox MsgTxt, vbExclamation, MsgCap
        
        gc_DiskOD.IsCalc = True:    gc_DiskOD.Value = AData(gc_Mfg1.Value, 12)
        gc_DiskID.IsCalc = True:    gc_DiskID.Value = RoundDown(0.7 * gc_DiskOD.Value, 0.05)
        
        SetDiskID
        SetDiskWT
    End If
End Sub

Public Sub TestDiskWt(NDiskSave As Single, DiskODSave As Single)
Dim Work As Single
Dim MsgTxt As String
Dim MsgCap As String
Dim vbreply As Integer
    MsgTxt = ""
    
    If gc_NDisk.Value <> NDiskSave Then
        Work = Round(gc_DiskWt.Value * gc_NDisk.Value / NDiskSave, 0.1)
        MsgTxt = "The number of clutch disks has changed!  Do you want to change the clutch disk weight to " & Format(Work, "###.0") & " lbs at this time?"
    ElseIf Abs(gc_DiskOD.Value - DiskODSave) > 0.125 Then
        Work = Round(gc_DiskWt.Value * (gc_DiskOD.Value / DiskODSave) ^ 2, 0.1)
        MsgTxt = "The clutch disk diameter has changed!  Do you want to change the clutch disk weight to " & Format(Work, "###.0") & " lbs at this time?"
    End If
    
    If MsgTxt <> "" Then
        MsgCap = "Clutch Disks Have Changed!"
        vbreply = MsgBox(MsgTxt, vbExclamation + vbYesNo, MsgCap)
        If vbreply = vbYes Then gc_DiskWt.Value = Work
    End If
End Sub

Public Sub Graph2()
Dim i As Integer
Dim dy As Single, YVAL As Single
    
    With frmClutch.gph2
        .DataReset = 1      'graphdata
        .DataReset = 8      'xposdata
        .DataReset = 19     'overlaydata
        .DataReset = 23     'overlayxposdata
        .ClipGraph = 1
        .MissingData = 1
        
        .XAxisMin = RoundDown(RPM(1), 500)
        .XAxisMax = RoundUp(RPM(NTQ), 500)
        .YAxisMin = CTQLO(1) - ZLO
        .YAxisMax = CTQLO(NTQ - 1) - ZLO    '-1 to make better looking graph
        
        .NumPoints = NTQ
        For i = 1 To .NumPoints
            If ETQLO(i) < .YAxisMin Then .YAxisMin = ETQLO(i)
            If ETQHI(i) > .YAxisMax Then .YAxisMax = ETQHI(i)
            
            If ETQLOSave(i) > 0 And ETQLOSave(i) < .YAxisMin Then
                .YAxisMin = ETQLOSave(i)
            End If
            If ETQHISave(i) > 0 And ETQHISave(i) > .YAxisMax Then
                .YAxisMax = ETQHISave(i)
            End If
        Next
        
        .XAxisTicks = (.XAxisMax - .XAxisMin) / 500
        If .XAxisTicks <= 2 Then .XAxisTicks = 5
        If .XAxisTicks = 3 Then .XAxisTicks = 6
        If .XAxisTicks = 4 Then .XAxisTicks = 5
        
        'select delta y to provide the required ticks
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
            Case Else:       dy = 2000
        End Select
        
        .YAxisMin = RoundDown(.YAxisMin, dy)
        'check to see if another y tick is needed now
        If .YAxisMax > .YAxisMin + .YAxisTicks * dy Then
            .YAxisTicks = .YAxisTicks + 1
        End If
        
        'drop off up to two y ticks to make better looking graph
        If .YAxisMin + .YAxisTicks * dy > .YAxisMax + dy Then
            .YAxisTicks = .YAxisTicks - 1
        End If
        If .YAxisMin + .YAxisTicks * dy > .YAxisMax + dy Then
            .YAxisTicks = .YAxisTicks - 1
        End If
        .YAxisMax = .YAxisMin + .YAxisTicks * dy
        
        'check to see if another y tick is needed to keep the data
        'within dy/2 over the upper grid, move axis down if needed
        If .YAxisMax - dy / 2 > .YAxisMin + .YAxisTicks * dy Then
            .YAxisMin = .YAxisMin + dy
        End If
        
        'position graph in range to look better
        If .YAxisMin + .YAxisTicks * dy > .YAxisMax + 2 * dy Then
            .YAxisMin = .YAxisMin - dy
        End If
        .YAxisMax = .YAxisMin + .YAxisTicks * dy
        
        'now load the engine and clutch torque
        'capacity data points into the graph
        For i = 1 To .NumPoints
            'on program load, before save is ever
            'pressed note: all xxxSave = 0
            .ThisSet = 1:               .ThisPoint = i
            .GraphData = ETQHISave(i):  .XPosData = RPM(i)
            
            .ThisSet = 2:               .ThisPoint = i
            .GraphData = ETQLOSave(i):  .XPosData = RPM(i)
            
            YVAL = CTQHISave(i) - ZHISave
            If YVAL > ETQLOSave(i) - 1 Then '-1 to fix bike graph with static = 0
                .ThisSet = 3:           .ThisPoint = i
                .GraphData = YVAL:      .XPosData = RPM(i)
            End If
            
            YVAL = CTQLOSave(i) - ZLOSave
            If YVAL < ETQHISave(i) Then
                .ThisSet = 4:           .ThisPoint = i
                .GraphData = YVAL:      .XPosData = RPM(i)
            End If
            
            '---------------------------------------------
            .ThisSet = 5:               .ThisPoint = i
            .GraphData = ETQHI(i):      .XPosData = RPM(i)
            
            .ThisSet = 6:               .ThisPoint = i
            .GraphData = ETQLO(i):      .XPosData = RPM(i)
            
            YVAL = CTQHI(i) - ZHI
            If YVAL > ETQLO(i) - 1 Then '-1 to fix bike graph with static = 0
                .ThisSet = 7:           .ThisPoint = i
                .GraphData = YVAL:      .XPosData = RPM(i)
            End If
            
            YVAL = CTQLO(i) - ZLO
            If YVAL < ETQHI(i) Then
                .ThisSet = 8:           .ThisPoint = i
                .GraphData = YVAL:      .XPosData = RPM(i)
            End If
        Next
        
        'use the overlay graph option to put symbols at the inter-
        'section of the engine and clutch torque capacity lines
        .ThisPoint = 1: .OverlayXPosData = RPMLO
        TABY RPM(), ETQLO(), NTQ, 1, RPMLO, YVAL
        .OverlayGraphData = YVAL
        
        .ThisPoint = 2: .OverlayXPosData = RPMHI
        TABY RPM(), ETQHI(), NTQ, 1, RPMHI, YVAL
        .OverlayGraphData = YVAL
        
        .ThisPoint = 3: .OverlayXPosData = RPMLOSave
        TABY RPM(), ETQLOSave(), NTQ, 1, RPMLOSave, YVAL
        .OverlayGraphData = YVAL
        
        .ThisPoint = 4: .OverlayXPosData = RPMHISave
        TABY RPM(), ETQHISave(), NTQ, 1, RPMHISave, YVAL
        .OverlayGraphData = YVAL
        
        .DrawMode = graphBlit
    End With
End Sub

Public Sub Weather()
Dim delta As Single
Dim dtx As Single
Dim icarb As Integer, ifuel As Integer
Dim kwar As Single
Dim mech As Single
Dim pair As Single, pamb As Single
Dim psdry As Double, PWV As Single
Dim px As Single
Dim RGAS As Single, rgrs As Single
Dim theta As Single
Dim tx As Single
Dim WAR As Single
    
Static IsLoaded As Boolean
Static cps(1 To 6) As Double
    
    If Not IsLoaded Then
        IsLoaded = True
        cps(1) = 0.0205558:         cps(2) = 0.00118163
        cps(3) = 0.0000154988:      cps(4) = 0.00000040245
        cps(5) = 0.000000000434856: cps(6) = 0.00000000002096
    End If
    
   'partial pressure of dry air from relative humidity
    psdry = cps(1) + cps(2) * gc_Temperature.Value + cps(3) * gc_Temperature.Value ^ 2 + cps(4) * gc_Temperature.Value ^ 3 + cps(5) * gc_Temperature.Value ^ 4 + cps(6) * gc_Temperature.Value ^ 5
    PWV = (gc_Humidity.Value / 100) * psdry
    
    With gc_Barometer
        If .UOM = UOM_NORMAL Then
            pamb = PSTD * .Value / BSTD
        Else    'barometer really holds altimeter reading
            pamb = PSTD * ((TSTD - 0.00356616 * .Value) / TSTD) ^ 5.25588
        End If
    End With
    
    pair = pamb - PWV:  delta = pair / PSTD
    WAR = (PWV * WTH2O) / (pair * WTAIR)
    
   'ambient air theta and density
    theta = (gc_Temperature.Value + 459.67) / TSTD
    RGAS = RSTD * ((1 / WTAIR) + (WAR / WTH2O)) / (1 + WAR)
    rgrs = RGAS / (RSTD / WTAIR)
    
   'set ifuel and icarb values
   'ifuel:  1 = gas     2 = methanol    3 = nitro
   'icarb:  1 = carb    2 = injector    3 = supercharger
    
    Select Case gc_FuelSystem.Value
        Case 1: ifuel = 1:  icarb = 1
        Case 2: ifuel = 1:  icarb = 2
        Case 3: ifuel = 2:  icarb = 1
        Case 4: ifuel = 2:  icarb = 2
        Case 5: ifuel = 3:  icarb = 2
        Case 6: ifuel = 1:  icarb = 3
        Case 7: ifuel = 2:  icarb = 3
        Case 8: ifuel = 3:  icarb = 3
    End Select
    
   'eliminate loss in thermal efficiency due to war
   'from taylor, vol 1, page 431, fr=1.0 data
    kwar = 1 + 2.48 * WAR ^ 1.5
    
    Select Case ifuel
        Case 1: px = 1:     tx = 0.6:   mech = 0.15
        Case 2: px = 1:     tx = 0.3:   mech = 0.13
        Case 3: px = 0.85:  tx = 0.5:   mech = 0.055
    End Select
    
    If icarb = 2 Then mech = mech - 0.005
    
    If icarb = 3 Then
        px = 0.95
        dtx = (1.35 - 1) / 1.35:    dtx = dtx / 0.85
        px = px - dtx * tx
        tx = tx + dtx
        mech = 0.6 * mech
    End If
    
    HPC = delta ^ px / (Sqr(rgrs) * theta ^ tx)
    HPC = (1 + mech) * kwar / HPC - mech
End Sub
