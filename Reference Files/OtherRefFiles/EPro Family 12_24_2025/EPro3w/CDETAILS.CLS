VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
  Persistable = 0  'NotPersistable
  DataBindingBehavior = 0  'vbNone
  DataSourceBehavior  = 0  'vbNone
  MTSTransactionMode  = 0  'NotAnMTSObject
END
Attribute VB_Name = "cDetail"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

Private mRatingName(1 To 4) As String   'Peak TQ, Peak HP, Shift, Redline strings
Private mRatingRPMs(1 To 4) As Integer  'Peak TQ, Peak HP, Shift, Redline RPM values
Private mRatings(1 To 4) As String      'lines in Piston Speed Summary listbox
Private mDataMech(1 To 15) As String    'lines in Mechanical Details listbox
Private mDataFlow(1 To 12) As String    'lines in Mechanical Details listbox
Private mHeadings(1 To 7) As String     '1 = Data @ RPM - Rating label,
                                        '2-6 = column headers, 7 = AngMPS label

Public Property Get RatingName(Index As Integer) As String
    RatingName = mRatingName(Index)
End Property

Public Property Get RatingRPMs(Index As Integer) As Integer
    RatingRPMs = mRatingRPMs(Index)
End Property

Public Property Let RatingRPMs(Index As Integer, vNewRPM As Integer)
    mRatingRPMs(Index) = vNewRPM
End Property

Public Property Get RatingLine(Index As Integer) As String
    RatingLine = mRatings(Index)
End Property

Public Property Let Rating(Index As Integer, vNewRPM As Single)
Dim string25 As String * 25
    mRatingRPMs(Index) = vNewRPM
    string25 = Space(25)
    string25 = mRatingName(Index)
    
    Mid(string25, 9, 5) = RightAlign(5, 0, vNewRPM)
    Mid(string25, 15, 5) = RightAlign(5, 0, vNewRPM * 2 * stroke / 12)
    Mid(string25, 21, 5) = RightAlign(5, 0, vNewRPM * PI * flrqs * stroke / 12)
    
    mRatings(Index) = string25
End Property

Public Property Get DataMech(Index As Integer) As String
    DataMech = mDataMech(Index)
End Property

Public Property Get DataFlow(Index As Integer) As String
    DataFlow = mDataFlow(Index)
End Property

Public Property Let DataFlow(Index As Integer, vNewString As String)
    mDataFlow(Index) = vNewString
End Property

Public Property Get Headings(Index As Integer) As String
Dim work As String
Dim i As Integer
    If Index = 7 Then
        'insert max piston speed angle into label
        work = mHeadings(7)
        i = InStr(work, "@") + 1
        Mid(work, i, 5) = RightAlign(4, 1, AngMPS)
        mHeadings(7) = work
    End If
    
    Headings = mHeadings(Index)
End Property

Public Property Let Headings(Index As Integer, vNewValue As String)
    mHeadings(Index) = vNewValue
End Property

Private Sub Class_Initialize()
    mRatingName(1) = "Peak TQ"
    mRatingName(2) = "Peak HP"
    mRatingName(3) = "Shift"
    mRatingName(4) = "Redline"
    
    mHeadings(2) = "  deg   depth  Piston Speeds  g's"
    mHeadings(3) = " ATDC    inch    FPM   FPS  accel"
    mHeadings(4) = "     Valve   Flow   Piston Flow   Flowbench"
    mHeadings(5) = "deg   Lift   Area   Speed Demand  Vel  Test"
    mHeadings(6) = "ATDC  inch   sq in    FPM   CFM   FPS inH2O"
    mHeadings(7) = "*Maximum Piston Speed occurs @ xx.x degree after TDC"
End Sub


Public Sub CalcMechDetails(Index As Integer)
Dim string32 As String * 32
Dim RPM As Single, ivd As Single
Dim lrqs2 As Single, lrqsq As Single, lrqs4 As Single
Dim zsin As Single, zcos As Single, zsin2 As Single, zcos2 As Single
Dim zhp As Single, zxs As Single, zy As Single
Dim pxs As Single, vxs As Single, axs As Single, cfmxs As Single
Dim degr As Single, spd As Single
Dim dt As Single, zang As Single, zsinhp As Single
Dim i As Integer, Angles(1 To 15) As Single, ang As Single
Dim DY As Single, ysave As Integer, angx As Single

    Angles(1) = 5:      Angles(2) = 15:     Angles(3) = 30
    Angles(4) = 45:     Angles(5) = 60:     Angles(6) = AngMPS
    Angles(7) = 80:     Angles(8) = 85:     Angles(9) = 90
    Angles(10) = 105:   Angles(11) = 120:   Angles(12) = 135
    Angles(13) = 150:   Angles(14) = 165:   Angles(15) = 180
    
    RPM = RatingRPMs(Index)
    Headings(1) = "Data @ " & Format(RPM, "##,###") & " RPM - " & RatingName(Index)
    
    ivd = gc_ValveDia.Value:    If Not gc_ValveDia.Inches Then ivd = ivd / ZM
    
    zhp = RPM * PI * stroke / 12
    lrqs2 = 2 * LRQS:     lrqsq = lrqs2 ^ 2:    lrqs4 = 4 * LRQS
    degr = 60 + 459.67:   spd = Sqr(1.4 * GC * RSTD * degr)
    
    For i = 1 To 15
        ang = Angles(i) * PI / 180:     zsin = Sin(ang):        zcos = Cos(ang)
                                        zsin2 = Sin(2 * ang):   zcos2 = Cos(2 * ang)
                                        zy = Sqr(1 - zsin ^ 2 / lrqsq)
        
        'calculate piston position - inch
        pxs = (stroke / 2) * (1 + lrqs2 - zcos - Sqr(lrqsq - zsin ^ 2))
        
        'calculate piston speed - ft/min
        vxs = zhp * (zsin + (zsin2 / lrqs4) / zy)
        If vxs < 0 Then vxs = 0
        
        'calculate piston acceleration - g's
        zxs = zcos + (zcos2 / lrqs2) / zy + (zsin2 ^ 2 / (4 * lrqs2 ^ 3)) / zy ^ 3
        zxs = zxs / (stroke / 24)
        axs = (zhp / 60) ^ 2 * zxs / GC
        
        string32 = Space(32)
        If Angles(i) = AngMPS Then
            Mid(string32, 1, 4) = RightAlign(3, 1, Angles(i))
        Else
            Mid(string32, 2, 3) = RightAlign(3, 0, Angles(i))
        End If
        
        Mid(string32, 7, 6) = RightAlign(5, 3, pxs)
        Mid(string32, 15, 5) = RightAlign(5, 0, vxs)
        Mid(string32, 21, 5) = RightAlign(5, 0, vxs / 60)
        Mid(string32, 28, 5) = RightAlign(5, 0, axs)
        
        mDataMech(i) = string32
    Next
    
    'always update the graph
    With frmDetails.gphMechDet
        .DataReset = 1                 'graphdata
        .DataReset = 8                 'xposdata
        .DataReset = 19                'Overlaygraphdata
        .DataReset = 23                'Overlayxposdata
        .ClipGraph = 1
        
        'this stuff used to test B&W graphing
        '.ColorData = 0
        '.PatternData = 0
        '.OverlayColor = 0
        '.OverlayPattern = 1
        '.OverlayPatternedLines = 1
        
        'specify the required ticks for x axis (crank angle)
        .XAxisMin = 0
        .XAxisMax = 180
        .XAxisTicks = (.XAxisMax - .XAxisMin) / 30
        
        .YAxisUse = 0                  'first axis (piston speed)
        .YAxisMin = 0
        .YAxisMax = RPM * PI * flrqs * stroke / 12
        
        'select delta y to provide the required ticks
        .YAxisTicks = 5
        DY = (.YAxisMax - .YAxisMin) / .YAxisTicks
        
        Select Case DY
            Case Is <= 100:  DY = 100
            Case Is <= 200:  DY = 200
            Case Is <= 400:  DY = 400
            Case Is <= 500:  DY = 500
            Case Is <= 800:  DY = 800
            Case Is <= 1000: DY = 1000
            Case Is <= 2000: DY = 2000
            Case Is <= 4000: DY = 4000
            Case Else:       DY = 5000
        End Select
        
        'drop off one tick and see if it was really needed
        .YAxisTicks = .YAxisTicks - 1
        If .YAxisMax > .YAxisMin + .YAxisTicks * DY Then
            .YAxisTicks = .YAxisTicks + 1
        End If
        
        'drop off another y tick to make better looking graph
        If .YAxisMin + .YAxisTicks * DY > .YAxisMax + DY Then
            .YAxisTicks = .YAxisTicks - 1
        End If
        
        'and finally calculate .YAxisMax (used by graph control)
        .YAxisMax = .YAxisMin + .YAxisTicks * DY
        If .YAxisTicks = 3 Then .YAxisTicks = 6
        ysave = .YAxisTicks
        
        .YAxisUse = 1                   'second axis (piston depth)
        .YAxisMin = 0
        .YAxisMax = stroke
        
        'select delta y to match the number of flow axis yticks
        .YAxisTicks = ysave
        DY = (.YAxisMax - .YAxisMin) / .YAxisTicks
        
        Select Case DY
            Case Is <= 0.1:  DY = 0.1
            Case Is <= 0.2:  DY = 0.2
            Case Is <= 0.4:  DY = 0.4
            Case Is <= 0.5:  DY = 0.5
            Case Is <= 0.8:  DY = 0.8
            Case Is <= 1:    DY = 1
            Case Is <= 2:    DY = 2
            Case Else:       DY = 4
        End Select
        
        'make sure data doesn't exceed .YAxisMax as this is ClipGraph
        If .YAxisMax > .YAxisMin + .YAxisTicks * DY Then
            Select Case DY
                Case Is <= 0.1:  DY = 0.2
                Case Is <= 0.2:  DY = 0.4
                Case Is <= 0.4:  DY = 0.5
                Case Is <= 0.5:  DY = 0.8
                Case Is <= 0.8:  DY = 1
                Case Is <= 1:    DY = 2
                Case Is <= 2:    DY = 4
                Case Else:       DY = 5
            End Select
        End If
        .YAxisMax = .YAxisMin + .YAxisTicks * DY
        
        
        .NumPoints = 100
        
        For i = 1 To .NumPoints
            .ThisPoint = i
            angx = (i - 1) * 180 / (.NumPoints - 1)
            ang = angx * PI / 180:  zsin = Sin(ang):        zcos = Cos(ang)
                                    zsin2 = Sin(2 * ang):   zcos2 = Cos(2 * ang)
            
            'calculate piston position - inch
            pxs = (stroke / 2) * (1 + lrqs2 - zcos - Sqr(lrqsq - zsin ^ 2))
            
            'calculate piston speed - FPM
            vxs = zhp * (zsin + (zsin2 / lrqs4) / Sqr(1 - zsin ^ 2 / lrqsq))
            
            .XPosData = angx
            .GraphData = vxs
            
            .OverlayXPosData = angx
            .OverlayGraphData = pxs
        Next
        
        .DrawMode = graphBlit
    End With
End Sub


Public Sub CalcFlowDetails(Index As Integer)
Dim string42 As String * 44
Dim RPM As Integer
Dim ivd As Single
Dim lrqs2 As Single, lrqsq As Single, lrqs4 As Single
Dim zsin As Single, zcos As Single, zsin2 As Single, zcos2 As Single
Dim zhp As Single, zxs As Single, pxs As Single, vxs As Single, cfmxs As Single
Dim degr As Single, spd As Single, i As Integer, ang As Single
Dim dt As Single, zang As Single, zsinhp As Single, zz50 As Single
Dim vl As Single, vel As Single, vpd As Single
Dim work As Single, DY As Single, ysave As Integer
Dim ang1 As Single, angx As Single, garea As Single

Dim Angles(1 To 12) As Single
Dim FlowArea(1 To 12) As Single
Dim FlowDemand(1 To 12) As Single

Dim z50(1 To 6) As Single
Dim xangle(1 To 16) As Single
Dim ylift(1 To 96) As Single

Dim xlift(1 To 10) As Single
Dim yflow(1 To 10) As Single
Dim LastRow As Integer
Dim FlowVal As Single
Dim A As Single, B As Single, c As Single, qdump As Single
    
    Angles(1) = gc_WSInLobeCL.Value - gc_WSInCamDur.Value / 2
    Angles(2) = 0
    
    If Angles(1) > 0 Then
        Angles(2) = Angles(1):  frmFlowDet.lblFlow(2) = "IVO @ .050"""
        Angles(1) = 0:          frmFlowDet.lblFlow(1) = "TDC"
    End If
    
    Angles(3) = 30
    Angles(4) = 60
    Angles(5) = AngMPS
    Angles(6) = 90
    Angles(7) = gc_WSInLobeCL.Value
    Angles(8) = 120
    Angles(9) = 150
    Angles(10) = 180
    Angles(11) = 210
    Angles(12) = gc_WSInLobeCL.Value + gc_WSInCamDur.Value / 2
    
    If Angles(12) < 240 Then
        Angles(11) = RoundDown((180 + Angles(12)) / 2, 5)
        If Angles(11) = 180 Then Angles(11) = 185
        frmFlowDet.lblFlow(11) = Trim(Str(Angles(11) - 180) & " deg ABDC")
    End If
    
    'generic cam lift profile data (half profile - assume symmetric cam lobe shape)
                        z50(1) = 69:       z50(2) = 67.75:    z50(3) = 66.5:     z50(4) = 65.25:    z50(5) = 64:       z50(6) = 62.75
    xangle(1) = 0:      ylift(1) = 100:    ylift(17) = 100:   ylift(33) = 100:   ylift(49) = 100:   ylift(65) = 100:   ylift(81) = 100
    xangle(2) = 8:      ylift(2) = 99.14:  ylift(18) = 99.05: ylift(34) = 99.02: ylift(50) = 99:    ylift(66) = 98.94: ylift(82) = 98.91
    xangle(3) = 15:     ylift(3) = 97.38:  ylift(19) = 97.15: ylift(35) = 97.04: ylift(51) = 96.94: ylift(67) = 96.76: ylift(83) = 96.69
    xangle(4) = 23:     ylift(4) = 93.81:  ylift(20) = 93.37: ylift(36) = 93.06: ylift(52) = 92.76: ylift(68) = 92.37: ylift(84) = 92.2
    xangle(5) = 31:     ylift(5) = 88.59:  ylift(21) = 87.9:  ylift(37) = 87.33: ylift(53) = 86.7:  ylift(69) = 86.04: ylift(85) = 85.66
    xangle(6) = 40:     ylift(6) = 80.59:  ylift(22) = 79.61: ylift(38) = 78.68: ylift(54) = 77.64: ylift(70) = 76.65: ylift(86) = 75.9
    xangle(7) = 50:     ylift(7) = 69:     ylift(23) = 67.75: ylift(39) = 66.5:  ylift(55) = 65.25: ylift(71) = 64:    ylift(87) = 62.75
    xangle(8) = 58:     ylift(8) = 57.97:  ylift(24) = 56.61: ylift(40) = 55.29: ylift(56) = 54.15: ylift(72) = 52.87: ylift(88) = 51.29
    xangle(9) = 66:     ylift(9) = 45.47:  ylift(25) = 44.22: ylift(41) = 43.1:  ylift(57) = 42.38: ylift(73) = 41.28: ylift(89) = 39.6
    xangle(10) = 73:    ylift(10) = 34.02: ylift(26) = 33.06: ylift(42) = 32.27: ylift(58) = 32.03: ylift(74) = 31.2:  ylift(90) = 29.69
    xangle(11) = 80:    ylift(11) = 22.96: ylift(27) = 22.45: ylift(43) = 22.02: ylift(59) = 22.15: ylift(75) = 21.6:  ylift(91) = 20.53
    xangle(12) = 87:    ylift(12) = 13.21: ylift(28) = 13.12: ylift(44) = 12.97: ylift(60) = 13.2:  ylift(76) = 12.88: ylift(92) = 12.36
    xangle(13) = 94:    ylift(13) = 5.32:  ylift(29) = 5.39:  ylift(45) = 5.38:  ylift(61) = 5.51:  ylift(77) = 5.38:  ylift(93) = 5.25
    xangle(14) = 100:   ylift(14) = 0:     ylift(30) = 0:     ylift(46) = 0:     ylift(62) = 0:     ylift(78) = 0:     ylift(94) = 0
    xangle(15) = 106:   ylift(15) = -3.97: ylift(31) = -4.12: ylift(47) = -4.19: ylift(63) = -4.28: ylift(79) = -4.2:  ylift(95) = -4.2
    xangle(16) = 114.3: ylift(16) = -7.2:  ylift(32) = -7.2:  ylift(48) = -7.2:  ylift(64) = -7.2:  ylift(80) = -7.2:  ylift(96) = -7.2
            
    'use cam type to select lift% at 50% duration   'Pat Hale - how to check?
    Select Case gc_CamType.Value
        Case 0:     zz50 = 69       'Overhead Cam
        Case 1:     zz50 = 67.1     'Roller Cam & Lifter
        Case 2:     zz50 = 66.7     'Mushroom Tappet
        Case 3:     zz50 = 66.5     'High Rate-of-Lift Flat Tappet
        Case 4:     zz50 = 66       'Normal Flat Tappet & Solid Lifter
        Case 5:     zz50 = 64       'Hydraulic Roller Cam & Lifter
        Case Else:  zz50 = 62.75    'Normal Hydraulic Cam & Lifter
   End Select

    'make sure that there is flowbench data (old data files)
    If gc_IntLift(0).Value = 0 Then
        Load frmFlowB
        Unload frmFlowB
    End If
    
    'put flowbench data in local arrays to ease TABY interpolation
    For i = 1 To 10
        xlift(i) = gc_IntLift(i - 1).Value
        yflow(i) = gc_IntFlow(i - 1).Value
        If xlift(i) > 0 Then LastRow = i
    Next
    
    RPM = gc_Detail.RatingRPMs(Index)
    gc_Detail.Headings(1) = "Data @ " & Format(RPM, "##,###") & " RPM - " & gc_Detail.RatingName(Index)
    
    ivd = gc_ValveDia.Value:    If Not gc_ValveDia.Inches Then ivd = ivd / ZM
    
    zhp = RPM * PI * stroke / 12
    lrqs2 = 2 * LRQS:     lrqsq = lrqs2 ^ 2:    lrqs4 = 4 * LRQS
    degr = 60 + 459.67:   spd = Sqr(1.4 * GC * RSTD * degr)
    
    For i = 1 To 12
        ang = Angles(i) * PI / 180:     zsin = Sin(ang):        zcos = Cos(ang)
                                        zsin2 = Sin(2 * ang):   zcos2 = Cos(2 * ang)
        'determine valve lift - inch
        Select Case i
            Case 1:     vl = 0.05
                        If Angles(1) < gc_WSInLobeCL.Value - gc_WSInCamDur.Value / 2 Then vl = 0
            
            Case Is <= 6
                        zang = 100 * (gc_WSInLobeCL.Value - Angles(i)) / (gc_WSInCamDur.Value / 2)
                        Call DTABY(xangle(), z50(), ylift(), 16, 6, 2, 1, zang, zz50, work)
                        vl = 0.05 + (gc_WSValveLift.Value - 0.05) * work / 100
            
            Case 7:     vl = gc_WSValveLift.Value

            Case Is <= 11
                        zang = 100 * (Angles(i) - gc_WSInLobeCL.Value) / (gc_WSInCamDur.Value / 2)
                        Call DTABY(xangle(), z50(), ylift(), 16, 6, 2, 1, zang, zz50, work)
                        vl = 0.05 + (gc_WSValveLift.Value - 0.05) * work / 100
            
            Case 12:    vl = 0.05
        End Select
        
        'calculate flow area - sq inch
        CalcWSCSArea vl
        FlowArea(i) = gc_WSCSArea.Value
        
        'calculate piston position - inch
        pxs = (stroke / 2) * (1 + lrqs2 - zcos - Sqr(lrqsq - zsin ^ 2))
        
        'calculate piston speed - FPM
        vxs = zhp * (zsin + (zsin2 / lrqs4) / Sqr(1 - zsin ^ 2 / lrqsq))
        
        'estimate piston induced valve flow demand - CFM
        dt = ((pxs + 0.1 * ivd) / 12) / (spd - vxs / 60)
        zang = ang - dt * (RPM / 60) * 2 * PI
        zsinhp = Sin(zang)
        zxs = zsinhp + (Sin(2 * zang) / lrqs4) / Sqr(1 - zsinhp ^ 2 / lrqsq)
        cfmxs = zhp * zxs * BArea / 144
                
        'solve quadratic equation to determine equivalent flowbench test parameters
        If gc_NoInValves.Value = 1 Then
            qdump = 1.593   '0.593q dump loss corresponds to 133 cfm/in^2
        Else
            qdump = 1.204   '0.204q dump loss corresponds to 137 cfm/in^2
        End If
        
        vpd = 0:    vel = 0
        If vl > 0.05 Then
            Call TABY(xlift(), yflow(), LastRow, 1, vl, FlowVal)
            A = (cfmxs * qdump / PSTD) ^ 2
            B = -cfmxs ^ 2 * 2 * qdump / PSTD - FlowVal ^ 2 / gc_DeltaP.Value
            c = cfmxs ^ 2
            vpd = (-B - Sqr(B ^ 2 - 4 * A * c)) / (2 * A)
            'vpd = (-B + Sqr(B ^ 2 - 4 * A * c)) / (2 * A)
        
            'adjust piston flow demand for calculated intake port operating
            'pressure drop and dump loss to get back to intake port inlet conditions
            'and to correct for not using YFactor in quadratic solution - 04/30/03
            cfmxs = cfmxs * (1 - qdump * vpd / PSTD) / (1.044429 * (1 - 0.618 * vpd / PSTD))
            FlowDemand(i) = cfmxs
            
            'calculate psuedo intake port flow velocity - ft/sec
            vel = 2.4 * cfmxs / gc_WSCSArea.Value
            If vel < 0 Then vpd = -vpd    'use the sign of velocity to set vpd
        End If
        
        'now load the values into the listbox string variable
        string42 = Space(44)
        
        If Angles(i) = AngMPS Then
            Mid(string42, 1, 4) = RightAlign(3, 1, Angles(i))
        Else
            Mid(string42, 2, 3) = RightAlign(3, 0, Angles(i))
        End If
        
        Mid(string42, 6, 6) = RightAlign(5, 3, vl)
        Mid(string42, 13, 6) = RightAlign(5, 3, FlowArea(i))
        Mid(string42, 21, 5) = RightAlign(5, 0, vxs)
        Mid(string42, 27, 5) = RightAlign(5, 0, FlowDemand(i))
        
        Mid(string42, 36, 2) = "--"
        If vl > 0.05 Then Mid(string42, 33, 5) = RightAlign(5, 0, vel)
        Mid(string42, 41, 2) = "--"
        If vpd > 0 Then Mid(string42, 38, 5) = RightAlign(5, 0, vpd)
        
        gc_Detail.DataFlow(i) = string42
    Next

    'always update the graph
    With frmFlowDet.gphFlowDet
        .DataReset = 1                 'graphdata
        .DataReset = 8                 'xposdata
        .DataReset = 19                'Overlaygraphdata
        .DataReset = 23                'Overlayxposdata
        .ClipGraph = 1
        
        'this stuff used to test B&W graphing
        '.ColorData = 0
        '.PatternData = 0
        '.OverlayColor = 0
        '.OverlayPattern = 1
        '.OverlayPatternedLines = 1
        
        'select the required ticks for x axis (crank angle)
        .XAxisMin = RoundDown(Angles(1), 45)
        .XAxisMax = RoundUp(Angles(12), 45)
        .XAxisTicks = (.XAxisMax - .XAxisMin) / 45
        If .XAxisMin < 0 Then .XAxisTicks = .XAxisTicks - 1
        
        If .XAxisTicks = 2 Then .XAxisTicks = 4
        If .XAxisTicks = 3 Then .XAxisTicks = 6
        If .XAxisTicks = 4 Then .XAxisTicks = 8
        If .XAxisTicks = 5 Then .XAxisTicks = 10
        
        .YAxisUse = 0                  'first axis (flow demand)
        .YAxisMin = 0
        .YAxisMax = FlowDemand(6)
        For i = 1 To 12
            vel = 0
            If FlowDemand(i) > 0 And FlowArea(i) > 0 Then
                vel = 2.4 * FlowDemand(i) / FlowArea(i)
            End If
            If vel > .YAxisMax Then .YAxisMax = vel
        Next
        
        'select delta y to provide the required ticks
        .YAxisTicks = 6
        DY = (.YAxisMax - .YAxisMin) / .YAxisTicks
        
        Select Case DY
            Case Is <= 1:   DY = 1
            Case Is <= 2:   DY = 2
            Case Is <= 4:   DY = 4
            Case Is <= 5:   DY = 5
            Case Is <= 8:   DY = 8
            Case Is <= 10:  DY = 10
            Case Is <= 20:  DY = 20
            Case Is <= 40:  DY = 40
            Case Is <= 50:  DY = 50
            Case Is <= 80:  DY = 80
            Case Is <= 100: DY = 100
            Case Is <= 200: DY = 200
            Case Is <= 400: DY = 400
            Case Else:      DY = 500
        End Select
        
        'drop off one tick and see if it was really needed
        .YAxisTicks = .YAxisTicks - 1
        If .YAxisMax > .YAxisMin + .YAxisTicks * DY Then
            .YAxisTicks = .YAxisTicks + 1
        End If
        
        'drop off another y tick to make better looking graph
        If .YAxisMin + .YAxisTicks * DY > .YAxisMax + DY Then
            .YAxisTicks = .YAxisTicks - 1
        End If
        
        'and finally calculate .YAxisMax (used by graph control)
        .YAxisMax = .YAxisMin + .YAxisTicks * DY
        ysave = .YAxisTicks
        
        .YAxisUse = 1                   'second axis (flow area)
        .YAxisMin = 0
        .YAxisMax = FlowArea(7)
        
        'select delta y to match the number of flow axis yticks
        .YAxisTicks = ysave
        DY = (.YAxisMax - .YAxisMin) / .YAxisTicks
        
        Select Case DY
            Case Is <= 0.1:  DY = 0.1
            Case Is <= 0.2:  DY = 0.2
            Case Is <= 0.4:  DY = 0.4
            Case Is <= 0.5:  DY = 0.5
            Case Is <= 0.8:  DY = 0.8
            Case Is <= 1:    DY = 1
            Case Is <= 2:    DY = 2
            Case Is <= 4:    DY = 4
            Case Else:       DY = 5
        End Select
        
        .YAxisMin = RoundDown(.YAxisMin, DY)
        'make sure data doesn't exceed .YAxisMax as this is ClipGraph
        If .YAxisMax > .YAxisMin + .YAxisTicks * DY Then
            Select Case DY
                Case Is <= 0.1:  DY = 0.2
                Case Is <= 0.2:  DY = 0.4
                Case Is <= 0.4:  DY = 0.5
                Case Is <= 0.5:  DY = 0.8
                Case Is <= 0.8:  DY = 1
                Case Is <= 1:    DY = 2
                Case Is <= 2:    DY = 4
                Case Is <= 4:    DY = 5
                Case Else:       DY = 8
            End Select
        End If
        
        'and finally calculate .YAxisMax (used by graph control)
        .YAxisMax = .YAxisMin + .YAxisTicks * DY
        
        
        'now prepare the data and load the graph control
        .NumPoints = 100
        ang1 = gc_WSInLobeCL.Value - gc_WSInCamDur.Value / 2
        
        For i = 1 To .NumPoints
            .ThisPoint = i
            angx = ang1 + (i - 1) * gc_WSInCamDur.Value / (.NumPoints - 1)
            ang = angx * PI / 180:  zsin = Sin(ang):        zcos = Cos(ang)
                                    zsin2 = Sin(2 * ang):   zcos2 = Cos(2 * ang)
            
            'determine valve lift - inch
            If angx < gc_WSInLobeCL.Value Then
                zang = 100 * (gc_WSInLobeCL.Value - angx) / (gc_WSInCamDur.Value / 2)
                Call DTABY(xangle(), z50(), ylift(), 16, 6, 2, 1, zang, zz50, work)
                vl = 0.05 + (gc_WSValveLift.Value - 0.05) * work / 100
                
            ElseIf angx = gc_WSInLobeCL.Value Then
                vl = gc_WSValveLift.Value
    
            ElseIf angx > gc_WSInLobeCL.Value Then
                zang = 100 * (angx - gc_WSInLobeCL.Value) / (gc_WSInCamDur.Value / 2)
                Call DTABY(xangle(), z50(), ylift(), 16, 6, 2, 1, zang, zz50, work)
                vl = 0.05 + (gc_WSValveLift.Value - 0.05) * work / 100
            End If
            
            'calculate flow area - sq inch
            CalcWSCSArea vl
            garea = gc_WSCSArea.Value
            
            'calculate piston position - inch
            pxs = (stroke / 2) * (1 + lrqs2 - zcos - Sqr(lrqsq - zsin ^ 2))
            
            'calculate piston speed - FPM
            vxs = zhp * (zsin + (zsin2 / lrqs4) / Sqr(1 - zsin ^ 2 / lrqsq))
            
            'estimate piston induced intake port flow demand - CFM
            dt = ((pxs + 0.1 * ivd) / 12) / (spd - vxs / 60)
            zang = ang - dt * (RPM / 60) * 2 * PI
            zsinhp = Sin(zang)
            zxs = zsinhp + (Sin(2 * zang) / lrqs4) / Sqr(1 - zsinhp ^ 2 / lrqsq)
            cfmxs = zhp * zxs * BArea / 144
            
            'solve quadratic equation to determine equivalent flowbench test parameters
            vpd = 0:    vel = 0
            If vl > 0.05 Then
                Call TABY(xlift(), yflow(), LastRow, 1, vl, FlowVal)
                A = (cfmxs * qdump / PSTD) ^ 2
                B = -cfmxs ^ 2 * 2 * qdump / PSTD - FlowVal ^ 2 / gc_DeltaP.Value
                c = cfmxs ^ 2
                vpd = (-B - Sqr(B ^ 2 - 4 * A * c)) / (2 * A)
                'vpd = (-b + Sqr(b ^ 2 - 4 * a * c)) / (2 * a)
            
                'adjust piston flow demand for calculated intake port operating
                'pressure drop and dump loss to get back to intake port inlet conditions
                'and to correct for not using YFactor in quadratic solution - 04/30/03
                cfmxs = cfmxs * (1 - qdump * vpd / PSTD) / (1.044429 * (1 - 0.618 * vpd / PSTD))
                'FlowDemand(i) = cfmxs
                
                'calculate psuedo intake port flow velocity - ft/sec
                vel = 2.4 * cfmxs / gc_WSCSArea.Value
                If vel < 0 Then vpd = -vpd    'use the sign of velocity to set vpd
            End If
            
            .ThisSet = 1
            .XPosData = angx
            .GraphData = cfmxs
            
            .ThisSet = 2
            .XPosData = angx
            .GraphData = vel
            
            .OverlayXPosData = angx
            .OverlayGraphData = garea
        Next
        
        .DrawMode = graphBlit
    End With
End Sub
