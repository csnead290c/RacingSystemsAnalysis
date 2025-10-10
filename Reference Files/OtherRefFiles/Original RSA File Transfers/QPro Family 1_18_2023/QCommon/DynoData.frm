VERSION 5.00
Object = "{827E9F53-96A4-11CF-823E-000021570103}#1.0#0"; "GRAPHS32.OCX"
Begin VB.Form frmDynoData 
   Caption         =   "Engine Dyno Data Graph"
   ClientHeight    =   5190
   ClientLeft      =   60
   ClientTop       =   345
   ClientWidth     =   7785
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   5190
   ScaleWidth      =   7785
   StartUpPosition =   2  'CenterScreen
   Begin GraphsLib.Graph gphEngine 
      Height          =   5190
      Left            =   0
      TabIndex        =   0
      Top             =   0
      Width           =   7785
      _Version        =   327680
      _ExtentX        =   13732
      _ExtentY        =   9155
      _StockProps     =   96
      BorderStyle     =   1
      AutoInc         =   0
      Backdrop        =   "c:\RSA\QCOMMON\RSABACK.BMP"
      Background      =   "15~-1~-1~-1~-1~-1~-1"
      ColorData       =   "9"
      GraphData       =   "0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~9^0"
      GraphStyle      =   5
      GraphType       =   6
      GridStyle       =   3
      IndexStyle      =   1
      LegendPos       =   2
      LegendText      =   "HP~MPH"
      NumPoints       =   60
      OverlayColor    =   "12"
      OverlayGraph    =   2
      OverlayGraphData=   "0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~7.03"
      OverlayGraphStyle=   5
      OverlayPattern  =   "2"
      OverlaySymbol   =   "7"
      PatternData     =   "2"
      RandomData      =   0
      SymbolData      =   "3"
      SymbolSize      =   75
      XAxisMax        =   1320
      XAxisPos        =   2
      XAxisStyle      =   2
      XAxisTicks      =   4
      XPosData        =   "0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~1320"
      YAxisMax        =   "9~8"
      YAxisMin        =   "2~0"
      YAxisPos        =   "1~2"
      YAxisStyle      =   "2~2"
      RangeMax        =   60
      OverlayTrendSets=   "0"
      OverlayXPosData =   "0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~1320"
      TrendSets       =   "0"
   End
End
Attribute VB_Name = "frmDynoData"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit
Option Compare Text

Private Sub Form_Resize()
    If gphEngine.width <> Me.ScaleWidth Or gphEngine.height <> Me.ScaleHeight Then ReSizeGraph
End Sub

Public Sub ReSizeGraph()
    With gphEngine
        .Visible = False
        .height = Me.ScaleHeight
        .width = Me.ScaleWidth
        .DrawMode = graphBlit
        .Visible = True
    End With
End Sub

Private Sub Form_Load()
Dim i As Integer, ysave As Integer
Dim dy As Single
    'note: this Sub does not use HP/Torque Multiplier!
    
    With gphEngine
        .DataReset = 1                 'graphdata
        .DataReset = 8                 'xposdata
        .DataReset = 19                'Overlaygraphdata
        .DataReset = 23                'Overlayxposdata
        
        .Legend(1) = "HP"
        .Legend(2) = "Torque"
        
        .YAxisUse = 0                  'first axis
        .XAxisMin = RoundDown(clsVals("EngineRPM", 1).Value, 500)
        .XAxisMax = 0
        .YAxisMin = 9999
        .YAxisMax = 0
        
        For i = 1 To 11
            If clsVals("EngineRPM", i).Value = 0 Then Exit For
            .NumPoints = i
            
            If clsVals("EngineRPM", i).Value > .XAxisMax Then .XAxisMax = clsVals("EngineRPM", i).Value
            If clsVals("EngineHP", i).Value < .YAxisMin Then .YAxisMin = clsVals("EngineHP", i).Value
            If clsVals("EngineHP", i).Value > .YAxisMax Then .YAxisMax = clsVals("EngineHP", i).Value
        Next
        
        .XAxisMax = RoundUp(.XAxisMax, 500)
        .XAxisTicks = (.XAxisMax - .XAxisMin) / 500
        If .XAxisTicks <= 2 Then .XAxisTicks = 5
        If .XAxisTicks = 3 Then .XAxisTicks = 6
        
        'select delta y to provide the required ticks
        .YAxisTicks = 7
        dy = (.YAxisMax - .YAxisMin) / .YAxisTicks
        
        Select Case dy
            Case Is <= 1:    dy = 1
            Case Is <= 2:    dy = 2
            Case Is <= 4:    dy = 4
            Case Is <= 5:    dy = 5
            Case Is <= 8:    dy = 8
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
            Case Else:       dy = 1000
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
        ysave = .YAxisTicks
        
        .YAxisUse = 1                   'second axis
        .YAxisMin = 9999
        .YAxisMax = 0
        For i = 1 To .NumPoints
            If clsVals("EngineTQ", i).Value < .YAxisMin Then
                .YAxisMin = clsVals("EngineTQ", i).Value
            End If
            
            If clsVals("EngineTQ", i).Value > .YAxisMax Then
                .YAxisMax = clsVals("EngineTQ", i).Value
            End If
        Next
        
        'select delta y to match the number of HP yticks
        .YAxisTicks = ysave
        dy = (.YAxisMax - .YAxisMin) / .YAxisTicks
        
        Select Case dy
            Case Is <= 1:    dy = 1
            Case Is <= 2:    dy = 2
            Case Is <= 4:    dy = 4
            Case Is <= 5:    dy = 5
            Case Is <= 8:    dy = 8
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
            Case Else:       dy = 1000
        End Select
        
        .YAxisMin = RoundDown(.YAxisMin, dy)
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
        
        'now load the points into the graph
        For i = 1 To .NumPoints
            .ThisPoint = i
            .GraphData = clsVals("EngineHP", i).Value
            .OverlayGraphData = clsVals("EngineTQ", i).Value
            .XPosData = clsVals("EngineRPM", i).Value
            .OverlayXPosData = clsVals("EngineRPM", i).Value
        Next
        
        .DrawMode = graphBlit
    End With
End Sub
