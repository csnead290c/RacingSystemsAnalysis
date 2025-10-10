VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
  Persistable = 0  'NotPersistable
  DataBindingBehavior = 0  'vbNone
  DataSourceBehavior  = 0  'vbNone
  MTSTransactionMode  = 0  'NotAnMTSObject
END
Attribute VB_Name = "CGraph"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

Private i As Integer
Private mXMin As Single
Private mXMax As Single
Private mYMin As Single
Private mYMax As Single
Private mY2Min As Single
Private mY2Max As Single
Private mY2MaxCalc As Single
Private mPoints As Integer
Private mGtype As Integer
Private mXValues() As Single
Private mYValues() As Single
Private mY2Values() As Single

Public Property Get Points() As Integer
    Points = mPoints
End Property

Public Property Let Points(vNewValue As Integer)
    mPoints = vNewValue
    ReDim mXLabels(1 To vNewValue)
    ReDim mXValues(1 To vNewValue)
    ReDim mYValues(1 To vNewValue)
    ReDim mY2Values(1 To vNewValue)
    
    mXMin = 0:    mXMax = 0:    mYMin = 0:    mYMax = 0
End Property

Public Property Get XMax() As Single
    mXMax = 0
    For i = 1 To Points
        If XValues(i) > mXMax Then mXMax = XValues(i)
    Next
    
    If Gtype < GPH_SEPARATOR Then   'vs time (seconds)
        Select Case mXMax
            Case Is < 10: XMax = Int(RoundUp(mXMax, 1))  'round up to 1
            Case Is < 20: XMax = Int(RoundUp(mXMax, 2))  'round up to 2
            Case Is < 40: XMax = Int(RoundUp(mXMax, 4))  'round up to 4
            Case Is < 50: XMax = Int(RoundUp(mXMax, 5))  'round up to 5
            Case Else: XMax = Int(RoundUp(mXMax, 10))    'round up to 10
        End Select
    Else                            'vs distance
        #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro
            XMax = Int(Round(mXMax, 1))
        #Else                   'Bonneville Pro
            If mXMax < 10.1 Then XMax = Int(10)
            If mXMax < 5.1 Then XMax = Int(5)
            If mXMax < 3.1 Then XMax = Int(3)
            If mXMax < 2.1 Then XMax = Int(2)
            If mXMax < 1.7 Then XMax = 1.6
            If mXMax < 1.1 Then XMax = Int(1)
        #End If
    End If
End Property

Public Property Get XTicks() As Integer
    If Gtype < GPH_SEPARATOR Then   'vs time - seconds per tick
        Select Case XMax
            Case Is < 10: XTicks = XMax
            Case Is < 20: XTicks = XMax / 2
            Case Is < 40: XTicks = XMax / 4
            Case Is < 50: XTicks = XMax / 5
            Case Else: XTicks = XMax / 10
        End Select
    Else                            'vs distance - either 4 or 2X ticks
        #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro
            XTicks = 4
        #Else                   'Bonneville Pro
            Select Case XMax
                Case 1:     XTicks = 5
                Case 1.6:   XTicks = 8
                Case 3:     XTicks = 6
                Case Else:  XTicks = 10
            End Select
        #End If
    End If
End Property

Public Property Get YMax() As Integer
    mYMax = 0
    For i = 1 To Points
        If YValues(i) > mYMax Then mYMax = YValues(i)
    Next
    
    Select Case mYMax
        Case Is < 8:        YMax = Int(RoundUp(mYMax, 1))
        Case Is < 20:       YMax = Int(RoundUp(mYMax, 2))
        Case Is <= 450:     YMax = Int(RoundUp(mYMax, 50))
        Case Is <= 1000:    YMax = Int(RoundUp(mYMax, 100))
        Case Else        'must be engine RPM
            YMax = Int(RoundUp(mYMax, 1000))
    End Select
End Property

Public Property Get YMin() As Integer
    mYMin = YMax
    For i = 1 To Points
        If YValues(i) < mYMin Then mYMin = YValues(i)
    Next
    YMin = Int(RoundDown(mYMin, 1000))
End Property

Public Property Get Yticks() As Integer
    Select Case YMax
        Case 1:             Yticks = 5
        Case Is <= 4:       Yticks = YMax / 0.5
        Case Is <= 8:       Yticks = YMax
        Case Is <= 20:      Yticks = YMax / 2
        Case Is <= 100:     Yticks = 5
        Case 150:           Yticks = 6
        Case 200:           Yticks = 5
        Case Is <= 450:     Yticks = YMax / 50
        Case Is <= 1000:    Yticks = YMax / 100
        Case 1320:          Yticks = 4
        Case Else               'must be engine RPM
            Yticks = (YMax - YMin) / 500
            If Yticks <= 3 Then Yticks = 2 * Yticks
            If Yticks > 10 Then Yticks = Yticks / 2
    End Select
End Property

Private Property Get Y2MaxCalc() As Integer
    mY2MaxCalc = 0
    For i = 1 To Points
        If Y2Values(i) > mY2MaxCalc Then mY2MaxCalc = Y2Values(i)
    Next
    
    Select Case mY2MaxCalc
        Case Is < 8:        Y2MaxCalc = Int(RoundUp(mY2MaxCalc, 1))
        Case Is < 20:       Y2MaxCalc = Int(RoundUp(mY2MaxCalc, 2))
        Case Is <= 450:     Y2MaxCalc = Int(RoundUp(mY2MaxCalc, 50))
        Case Is <= 1000:    Y2MaxCalc = Int(RoundUp(mY2MaxCalc, 100))
        Case Else               'must be distance
            Y2MaxCalc = Int(Round(mY2MaxCalc, 1))
    End Select
End Property

Public Property Get Y2Min() As Integer
    mY2Min = Y2MaxCalc
    For i = 1 To Points
        If Y2Values(i) < mY2Min Then mY2Min = Y2Values(i)
    Next
    Y2Min = Int(RoundDown(mY2Min, 1000))
End Property

Public Property Get Y2Ticks() As Integer
Dim y2minsave As Integer
Dim y2maxsave As Integer
Dim yticksave As Integer
Dim dy As Single
Dim ntx As Integer
    y2minsave = Y2Min
    y2maxsave = Y2MaxCalc
    yticksave = Yticks
    
    Select Case y2maxsave
            Case 1:             Y2Ticks = 5
            Case Is <= 4:       Y2Ticks = y2maxsave / 0.5
            Case Is <= 8:       Y2Ticks = y2maxsave
            Case Is <= 20:      Y2Ticks = y2maxsave / 2
            Case Is <= 100:     Y2Ticks = 5
            Case 150:           Y2Ticks = 6
            Case 200:           Y2Ticks = 5
            Case Is <= 450:     Y2Ticks = y2maxsave / 50
            Case Is <= 1000:    Y2Ticks = y2maxsave / 100
            Case 1320:          Y2Ticks = 4     'QPro/Qjr
            Case Else:          Y2Ticks = 8     'BVPro
    End Select
    mY2Max = 0
    
    If Y2Ticks <> yticksave Then
        ntx = yticksave - Y2Ticks
        If ntx > 0 Then     'more ticks are needed
            If Gtype = GPH_TIME_G Then
                If ntx = 4 Then
                    Y2Ticks = Y2Ticks + ntx
                End If
            Else
                dy = (y2maxsave - y2minsave) / Y2Ticks
                Y2Ticks = Y2Ticks + ntx
                If Gtype = GPH_TIME_RPM Or Gtype = GPH_DIST_RPM Then
                    Select Case dy
                        Case 25:    If Y2Ticks * 20 >= y2maxsave Then dy = 20
                        Case 40:    If Y2Ticks * 25 >= y2maxsave Then dy = 25
                        Case 50:    If Y2Ticks * 40 >= y2maxsave Then dy = 40
                        Case 100:   If Y2Ticks * 50 >= y2maxsave Then dy = 50
                    End Select
                End If
                Y2Max = Y2Ticks * dy
            End If
        Else                'less ticks are allowed for MPH only
            If Gtype = GPH_TIME_RPM Or Gtype = GPH_DIST_RPM Then
                dy = (y2maxsave - y2minsave) / Y2Ticks
                Y2Ticks = Y2Ticks + ntx
                Select Case dy
                    Case 20:   dy = 25:  If Y2Ticks * 20 >= y2maxsave Then dy = 20
                    Case 25:   dy = 40:  If Y2Ticks * 25 >= y2maxsave Then dy = 25
                    Case 40:   dy = 50:  If Y2Ticks * 40 >= y2maxsave Then dy = 40
                    Case 50:   dy = 100: If Y2Ticks * 50 >= y2maxsave Then dy = 50
                    Case 100:  dy = 200: If Y2Ticks * 100 >= y2maxsave Then dy = 100
                End Select
                Y2Max = Y2Ticks * dy
            End If
        End If
    End If
End Property

Public Property Get Gtype() As Integer
    Gtype = mGtype
End Property

Public Property Let Gtype(vNewValue As Integer)
    mGtype = vNewValue
End Property

Public Property Get XValues(Index As Integer) As Single
    XValues = mXValues(Index)
End Property

Public Property Let XValues(Index As Integer, vNewValue As Single)
    mXValues(Index) = vNewValue
End Property

Public Property Get YValues(Index As Integer) As Single
    YValues = mYValues(Index)
End Property

Public Property Let YValues(Index As Integer, vNewValue As Single)
    mYValues(Index) = vNewValue
End Property

Public Property Get Y2Values(Index As Integer) As Single
    Y2Values = mY2Values(Index)
End Property

Public Property Let Y2Values(Index As Integer, vNewValue As Single)
    mY2Values(Index) = vNewValue
End Property

Public Property Get Y2Max() As Single
    If mY2Max = 0 Then mY2Max = Y2MaxCalc
    Y2Max = mY2Max
End Property

Private Property Let Y2Max(ByVal vNewValue As Single)
    mY2Max = vNewValue
End Property
