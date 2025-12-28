VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
  Persistable = 0  'NotPersistable
  DataBindingBehavior = 0  'vbNone
  DataSourceBehavior  = 0  'vbNone
  MTSTransactionMode  = 0  'NotAnMTSObject
END
Attribute VB_Name = "cGraph"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

Private mGtype As Integer
Private mPeakHP As Single
Private mRPMHP As Integer
Private mPeakTQ As Single
Private mRPMTQ As Integer
Private mYMax As Integer
Private mYMin As Integer
Private mYTicks As Integer
Private XMin As Integer
Private XMax As Integer
Private SX(1 To 17) As Single
Private sy(1 To 85) As Single
Private sz(1 To 5) As Single
Private NX As Integer
Private mXLabels() As Integer
Private mTQValues() As Single
Private mHPValues() As Single
Private RPMpts() As Single
Private TQpts() As Single
Private HPpts() As Single

Public Property Get Gtype() As Integer
    Gtype = mGtype
End Property

Public Property Let Gtype(vNewValue As Integer)
    If vNewValue = 1 Then
        mGtype = vNewValue
        CalcGraph
    End If
End Property

Public Property Get PeakTQ() As Single
    PeakTQ = mPeakTQ
End Property

Public Property Let PeakTQ(vNewValue As Single)
    mPeakTQ = vNewValue
End Property

Public Property Get PeakHP() As Single
    PeakHP = mPeakHP
End Property

Public Property Let PeakHP(vNewValue As Single)
    mPeakHP = vNewValue
End Property

Public Property Get RPMHP() As Integer
    RPMHP = mRPMHP
End Property

Public Property Let RPMHP(vNewValue As Integer)
    mRPMHP = vNewValue
End Property

Public Property Get RPMTQ() As Integer
    RPMTQ = mRPMTQ
End Property

Public Property Let RPMTQ(vNewValue As Integer)
    mRPMTQ = vNewValue
End Property

Private Sub Class_Initialize()
                   sz(1) = 0.7:    sz(2) = 1.2:    sz(3) = 1.7:    sz(4) = 2.5:    sz(5) = 3.4
    
    SX(1) = 0.25:  sy(1) = 0.53:   sy(18) = 0.365: sy(35) = 0.24:  sy(52) = 0.1:   sy(69) = 0
    SX(2) = 0.5:   sy(2) = 0.975:  sy(19) = 0.87:  sy(36) = 0.79:  sy(53) = 0.7:   sy(70) = 0.63
    SX(3) = 0.6:   sy(3) = 1.098:  sy(20) = 1.018: sy(37) = 0.96:  sy(54) = 0.894: sy(71) = 0.84
    SX(4) = 0.65:  sy(4) = 1.13:   sy(21) = 1.066: sy(38) = 1.023: sy(55) = 0.972: sy(72) = 0.924
    SX(5) = 0.7:   sy(5) = 1.152:  sy(22) = 1.11:  sy(39) = 1.08:  sy(56) = 1.04:  sy(73) = 1
    SX(6) = 0.75:  sy(6) = 1.16:   sy(23) = 1.129: sy(40) = 1.106: sy(57) = 1.08:  sy(74) = 1.055
    SX(7) = 0.8:   sy(7) = 1.153:  sy(24) = 1.132: sy(41) = 1.117: sy(58) = 1.096: sy(75) = 1.079
    SX(8) = 0.85:  sy(8) = 1.122:  sy(25) = 1.11:  sy(42) = 1.102: sy(59) = 1.09:  sy(76) = 1.082
    SX(9) = 0.9:   sy(9) = 1.086:  sy(26) = 1.079: sy(43) = 1.074: sy(60) = 1.069: sy(77) = 1.064
    SX(10) = 0.95: sy(10) = 1.045: sy(27) = 1.042: sy(44) = 1.04:  sy(61) = 1.037: sy(78) = 1.035
    SX(11) = 1:    sy(11) = 1:     sy(28) = 1:     sy(45) = 1:     sy(62) = 1:     sy(79) = 1
    SX(12) = 1.02: sy(12) = 0.978: sy(29) = 0.977: sy(46) = 0.976: sy(63) = 0.974: sy(80) = 0.973
    SX(13) = 1.05: sy(13) = 0.938: sy(30) = 0.935: sy(47) = 0.932: sy(64) = 0.928: sy(81) = 0.923
    SX(14) = 1.1:  sy(14) = 0.865: sy(31) = 0.855: sy(48) = 0.845: sy(65) = 0.83:  sy(82) = 0.815
    SX(15) = 1.15: sy(15) = 0.795: sy(32) = 0.762: sy(49) = 0.736: sy(66) = 0.698: sy(83) = 0.662
    SX(16) = 1.2:  sy(16) = 0.72:  sy(33) = 0.66:  sy(50) = 0.612: sy(67) = 0.55:  sy(84) = 0.49
    SX(17) = 1.25: sy(17) = 0.63:  sy(34) = 0.54:  sy(51) = 0.474: sy(68) = 0.39:  sy(85) = 0.31
 End Sub

Public Property Get Points() As Integer
    Points = NX
End Property

Public Property Get YMin() As Integer
    YMin = mYMin
End Property

Private Property Let YMin(vNewValue As Integer)
    mYMin = vNewValue
End Property

Public Property Get YMax() As Integer
    YMax = mYMax
End Property

Private Property Let YMax(vNewValue As Integer)
    mYMax = vNewValue
End Property

Public Property Get HPValues(Index As Integer) As Single
    HPValues = mHPValues(Index)
End Property

Private Property Let HPValues(Index As Integer, vNewValue As Single)
    mHPValues(Index) = vNewValue
End Property

Public Property Get TQValues(Index As Integer) As Single
    TQValues = mTQValues(Index)
End Property

Private Property Let TQValues(Index As Integer, vNewValue As Single)
    mTQValues(Index) = vNewValue
End Property

Public Property Get XLabels(Index As Integer) As Integer
    XLabels = mXLabels(Index)
End Property

Private Property Let XLabels(Index As Integer, vNewValue As Integer)
    mXLabels(Index) = vNewValue
End Property

Public Property Get YTicks() As Integer
    YTicks = mYTicks
End Property

Private Property Let YTicks(vNewValue As Integer)
    mYTicks = vNewValue
End Property

Public Sub CalcGraph()
Dim NHP As Integer
    NHP = 29
ReDim xxrpm(1 To NHP) As Single
ReDim yyhp(1 To NHP) As Single
ReDim yytq(1 To NHP) As Single

Dim k As Integer
Dim DRPM As Single
Dim DY As Single
Dim TQMax As Single
Dim TQRPM As Single
Dim DTQ As Single
Dim DMNMX As Single
    
    Call ENGINE(xxrpm(), yytq())
    
    Rem ***** find the peak TQ point on the DTABY generated 29
    Rem ***** point curve that goes through the peak HP point
    TQMax = 0:    TQRPM = 0
    For k = 1 To NHP
        If yytq(k) > TQMax Then
            TQMax = yytq(k)
            TQRPM = xxrpm(k)
        End If
    Next
    
    Rem ***** stretch the RPM data along the X-axis, pivoting about the
    Rem ***** peak HP RPM point . . . and stretch the TQ data along the Y-axis,
    Rem ***** pivoting about the peak HP TQ point, to match peak TQ.
    DRPM = RPMTQ - TQRPM
    DTQ = PeakTQ / TQMax - 1
    For k = 1 To NHP
        If xxrpm(k) <= TQRPM Then
            yytq(k) = yytq(k) + (PeakTQ - TQMax)
        ElseIf xxrpm(k) > TQRPM And xxrpm(k) < RPMHP Then
            yytq(k) = yytq(k) * (1 + DTQ * ((RPMHP - xxrpm(k)) / (RPMHP - TQRPM)) ^ 2)
        ElseIf xxrpm(k) >= RPMHP Then
            yytq(k) = yytq(k) * (1 + 0.8 * DTQ * ((RPMHP - xxrpm(k)) / (RPMHP - TQRPM)) ^ 2)
        End If
        
        If xxrpm(k) <= TQRPM Then
            xxrpm(k) = xxrpm(k) + DRPM
        ElseIf xxrpm(k) > TQRPM And xxrpm(k) < RPMHP Then
            xxrpm(k) = xxrpm(k) + DRPM * (RPMHP - xxrpm(k)) / (RPMHP - TQRPM)
        ElseIf xxrpm(k) >= RPMHP Then
            xxrpm(k) = xxrpm(k) + 0.8 * DRPM * (RPMHP - xxrpm(k)) / (RPMHP - TQRPM)
        End If
        
        yyhp(k) = yytq(k) * xxrpm(k) / Z6
        If yyhp(k) > PeakHP Then
            yyhp(k) = PeakHP
            yytq(k) = yyhp(k) * Z6 / xxrpm(k)
        End If
    Next
  
    Rem ***** SELECT THE X-AXIS START AND END POINTS
    XMin = RoundDown(0.9 * RPMTQ, 500): If XMin < 0 Then XMin = 0
   
    XMax = RoundUp(gc_Redline.Value, 500)
    If XMax > gc_Shift.Value + 500 Then XMax = RoundUp(gc_Shift.Value, 500)
    If XMax < RPMHP + 1000 Then XMax = RoundUp(RPMHP + 500, 500)
    
    Rem ***** CREATE nx POINTS FROM XMIN TO XMAX FOR GRAPH
    DRPM = 125:            NX = ((XMax - XMin) / DRPM) + 1
    If NX > 33 Then
        XMin = XMin + (NX - 33) * DRPM
        NX = 33
    End If

ReDim mHPValues(1 To NX)
ReDim mTQValues(1 To NX)
ReDim mXLabels(1 To NX)
ReDim RPMpts(1 To NX)
ReDim TQpts(1 To NX)
ReDim HPpts(1 To NX)

    For k = 1 To NX
        RPMpts(k) = XMin + (k - 1) * DRPM
        Call TABY(xxrpm(), yytq(), NHP, 2, RPMpts(k), TQpts(k))
        If TQpts(k) > PeakTQ Then TQpts(k) = PeakTQ
        
        HPpts(k) = TQpts(k) * RPMpts(k) / Z6
        If HPpts(k) > PeakHP Then
            HPpts(k) = PeakHP
            TQpts(k) = HPpts(k) * Z6 / RPMpts(k)
        End If
    Next

    YMin = 0:        YMax = 0
    Call MNMX(NX, TQpts())
    Call MNMX(NX, HPpts())
    DMNMX = YMax - YMin
    
    YTicks = 8
    DY = 0.2: If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 0.5: If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 1:   If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 2:   If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 4:   If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 5:   If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 8:   If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 10:  If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 20:  If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 25:  If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 40:  If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 50:  If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 80:  If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 100: If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 200: If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 250: If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 400: If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 500: If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 800: If DMNMX / DY < YTicks - 1 Then GoTo 504
    DY = 1000
   
504 YMin = RoundDown(YMin, DY): If YMin < 0 Then YMin = 0
    'check to see if another y tick is needed now
    If YMax > YMin + YTicks * DY Then
        YTicks = YTicks + 1
    End If
    
    'drop off up to two y ticks to make better looking graph
    If YMin + YTicks * DY > YMax + DY Then
        YTicks = YTicks - 1
    End If
    If YMin + YTicks * DY > YMax + DY Then
        YTicks = YTicks - 1
    End If
    
    YMax = YMin + YTicks * DY
    
    For k = 1 To NX
        XLabels(k) = RPMpts(k)
        TQValues(k) = TQpts(k)
        HPValues(k) = HPpts(k)
    Next
End Sub

Private Sub ENGINE(RPM() As Single, TQ() As Single)
Dim n As Integer
Dim TQPHP As Single
Dim HPCID As Single
Dim RPMR As Single
Dim TQR As Single
    
    TQPHP = Z6 * PeakHP / RPMHP
 
    HPCID = PeakHP / CID
    If HPCID < sz(1) Then HPCID = sz(1)
    If HPCID > sz(5) Then HPCID = sz(5)

    For n = 1 To 29 Step 2
        RPMR = SX((n + 3) / 2)
        RPM(n) = RPMR * RPMHP
        Call DTABY(SX(), sz(), sy(), 17, 5, 3, 2, RPMR, HPCID, TQR)
        TQ(n) = TQR * TQPHP
    Next
    
    For n = 2 To 28 Step 2
        RPMR = (SX((n + 2) / 2) + SX((n + 4) / 2)) / 2
        RPM(n) = RPMR * RPMHP
        Call DTABY(SX(), sz(), sy(), 17, 5, 3, 2, RPMR, HPCID, TQR)
        TQ(n) = TQR * TQPHP
    Next
End Sub

Private Sub MNMX(NZ As Integer, z() As Single)
Dim k As Integer
    For k = 1 To NZ
        If z(k) > 0 Then
            If YMin = 0 Then YMin = z(k)
            If YMax = 0 Then YMax = z(k)
        End If
        
        If z(k) < YMin Then YMin = z(k)
        If z(k) > YMax Then YMax = z(k)
    Next
End Sub
