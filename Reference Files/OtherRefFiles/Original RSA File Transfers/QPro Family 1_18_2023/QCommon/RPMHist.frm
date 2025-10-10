VERSION 5.00
Object = "{827E9F53-96A4-11CF-823E-000021570103}#1.0#0"; "GRAPHS32.OCX"
Begin VB.Form frmRPMHist 
   Caption         =   "Engine RPM Histogram"
   ClientHeight    =   4395
   ClientLeft      =   510
   ClientTop       =   495
   ClientWidth     =   7680
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MDIChild        =   -1  'True
   MinButton       =   0   'False
   ScaleHeight     =   4395
   ScaleWidth      =   7680
   Begin GraphsLib.Graph gphEngine 
      Height          =   4395
      Left            =   0
      TabIndex        =   0
      Top             =   0
      Width           =   7680
      _Version        =   327680
      _ExtentX        =   13547
      _ExtentY        =   7752
      _StockProps     =   96
      BorderStyle     =   1
      AutoInc         =   0
      Background      =   "15~-1~-1~-1~-1~-1~-1"
      ColorData       =   "9"
      GraphStyle      =   2
      GraphType       =   3
      GridStyle       =   3
      LegendPos       =   2
      OverlayColor    =   "12"
      OverlayGraph    =   2
      OverlayGraphStyle=   4
      OverlayPattern  =   "2"
      YAxisMax        =   "0~100"
      YAxisPos        =   "1~2"
      YAxisStyle      =   "2~2"
      YAxisTicks      =   "1~10"
      Bar2DGap        =   50
   End
End
Attribute VB_Name = "frmRPMHist"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit
Option Compare Text

Public Sub Display()
    On Error Resume Next
    Err.Clear
    
    LoadScreen
    GraphsOpenIncrement 1
    
    Me.left = 450:  Me.top = 150:  Me.height = 4800:   Me.width = 7800
    Me.Show
End Sub

Private Sub Form_Resize()
    If gphEngine.height <> Me.ScaleHeight Or gphEngine.width <> Me.ScaleWidth Then ReSizeGraph
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

Private Sub LoadScreen()
Dim i As Integer, j As Integer, npts As Integer
Dim dy As Single, T As Single, R As Single, ysum As Single
Dim xgph(1 To 11) As Single, ygph(1 To 11) As Single
Dim time(1 To 60) As Single, rpm(1 To 60) As Single

    With gphEngine
        .DataReset = 1                 'graphdata
        .DataReset = 8                 'xposdata
        
        .Legend(1) = "sec"
        .Legend(2) = "cumulative %"
        
        For i = 1 To 11
            If clsVals("EngineRPM", i).Value = 0 Then Exit For
            .NumPoints = i
            xgph(i) = clsVals("EngineRPM", i).Value
            ygph(i) = 0
        Next
        
        'load into arrays for TABY interpolation
        npts = gc_Graph(GPH_TIME_RPM).Points
        For j = 1 To npts
            time(j) = gc_Graph(GPH_TIME_RPM).XValues(j)
            rpm(j) = gc_Graph(GPH_TIME_RPM).YValues(j)
        Next
            
        'intensify the data to every .01 seconds
        For j = 1 To CInt(100 * time(gc_Graph(GPH_TIME_RPM).Points))
            T = j / 100
            TABY time(), rpm(), npts, 1, T, R
          
            'determine which engine rpm bar to use
            If R < (xgph(1) + xgph(2)) / 2 Then
                ygph(1) = ygph(1) + 0.01
            End If
            
            For i = 2 To .NumPoints - 1
                If R >= (xgph(i - 1) + xgph(i)) / 2 Then
                    If R < (xgph(i) + xgph(i + 1)) / 2 Then
                        ygph(i) = ygph(i) + 0.01
                        Exit For
                    End If
                End If
            Next
            
            If R >= (xgph(.NumPoints - 1) + xgph(.NumPoints)) / 2 Then
                ygph(.NumPoints) = ygph(.NumPoints) + 0.01
            End If
        Next
        
        .YAxisUse = 0                   'first axis
        .YAxisMin = 0
        .YAxisMax = 0
        For i = 1 To .NumPoints
            If ygph(i) > .YAxisMax Then .YAxisMax = ygph(i)
        Next
        
        'select delta y to provide the required ticks
        .YAxisTicks = 10
        dy = (.YAxisMax - .YAxisMin) / .YAxisTicks
        
        Select Case dy
            Case Is <= 0.1:  dy = 0.1
            Case Is <= 0.2:  dy = 0.2
            Case Is <= 0.25: dy = 0.25
            Case Is <= 0.4:  dy = 0.4
            Case Is <= 0.5:  dy = 0.5
            Case Is <= 0.8:  dy = 0.8
            Case Is <= 1:    dy = 1
            Case Is <= 2:    dy = 2
            Case Is <= 2.5:  dy = 2.5
            Case Is <= 4:    dy = 4
            Case Is <= 5:    dy = 5
            Case Else:       dy = 8
        End Select
        
        .YAxisMax = .YAxisMin + .YAxisTicks * dy
        If dy = 0.25 Then
            .LabelYFormat = "0.00"
        Else
            .LabelYFormat = "0.0"
        End If

        'load the data into the graph
        ysum = 0
        For i = 1 To .NumPoints
            .ThisPoint = i
            .LabelText = CStr(xgph(i))
            .GraphData = ygph(i)
            ysum = ysum + 100 * ygph(i) / time(gc_Graph(GPH_TIME_RPM).Points)
            .OverlayGraphData = ysum
        Next
        
        .DrawMode = graphDraw
    End With
End Sub

Private Sub Form_QueryUnload(Cancel As Integer, UnloadMode As Integer)
    If UnloadMode = vbFormControlMenu Then
        Cancel = True
        Me.Hide
        SetGraphEnabled GPH_RPM_HIST, True
    End If
End Sub

Private Sub Form_Unload(Cancel As Integer)
    GraphsOpenIncrement -1
End Sub
