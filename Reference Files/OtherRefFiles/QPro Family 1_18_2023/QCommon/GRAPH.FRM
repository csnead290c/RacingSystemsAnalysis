VERSION 5.00
Object = "{827E9F53-96A4-11CF-823E-000021570103}#1.0#0"; "GRAPHS32.OCX"
Begin VB.Form frmGraph 
   Caption         =   "Quarter XX Data Graph"
   ClientHeight    =   4485
   ClientLeft      =   120
   ClientTop       =   405
   ClientWidth     =   7980
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MDIChild        =   -1  'True
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   4890
   ScaleMode       =   0  'User
   ScaleWidth      =   8100
   Begin GraphsLib.Graph gphEngine 
      Height          =   4485
      Left            =   0
      TabIndex        =   0
      Top             =   0
      Width           =   7980
      _Version        =   327680
      _ExtentX        =   14076
      _ExtentY        =   7911
      _StockProps     =   96
      BorderStyle     =   1
      AutoInc         =   0
      Backdrop        =   "c:\RSA\QCOMMON\RSABACK.BMP"
      Background      =   "15~-1~-1~-1~-1~-1~-1"
      ColorData       =   "9"
      GraphData       =   "0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~9^0"
      GraphType       =   6
      GridStyle       =   3
      IndexStyle      =   1
      LegendPos       =   2
      LegendText      =   "RPM~MPH"
      NumPoints       =   60
      OverlayColor    =   "12"
      OverlayGraph    =   2
      OverlayGraphData=   "0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~7.03"
      OverlayGraphStyle=   4
      OverlayPattern  =   "3"
      OverlaySymbol   =   "0"
      PatternData     =   "3"
      RandomData      =   0
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
Attribute VB_Name = "frmGraph"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Option Explicit    'Patrick - grpEngine is problem when Option Explicit
Option Compare Text

Private mGraphIndex As Integer

Public Sub Display(left As Long, top As Long, _
    Optional width As Long = 8100, Optional height As Long = 4890)
    'note: these defaults set the graph cascade view size
    
    On Error Resume Next
    Err.Clear
    
    LoadScreenFromClass              'also redraws graph
    GraphsOpenIncrement 1
    
    Me.left = left:      Me.top = top
    Me.width = width:    Me.height = height
    Me.Show
End Sub

Private Sub Form_Resize()
    If gphEngine.height <> Me.ScaleHeight Or gphEngine.width <> Me.ScaleWidth Then
        ReSizeGraph
    End If
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

Public Sub DrawGraph()
    If Me.Visible Then grpEngine.DrawMode = graphNoAction   'Patrick - grpEngine is problem when Option Explicit
End Sub

Private Sub LoadScreenFromClass()
Dim i As Integer
    With gphEngine
        .DataReset = 1                 'graphdata
        .DataReset = 8                 'xposdata
        .DataReset = 19                'Overlaygraphdata
        .DataReset = 23                'Overlayxposdata
        
        Select Case GraphIndex
            Case GPH_TIME_RPM
                .Legend(1) = "RPM"
                .Legend(2) = "MPH"
            
            Case GPH_TIME_G
                .Legend(1) = "g's"
                #If Not ISBVPRO Then    'QUARTERjr and QUARTER Pro
                    .Legend(2) = "ft"
                #Else                   'Bonneville Pro
                    .Legend(2) = "miles"
                #End If
            
            Case GPH_DIST_RPM
                .Legend(1) = "RPM"
                .Legend(2) = "MPH"
            
            Case GPH_DIST_G
                .Legend(1) = "g's"
                .Legend(2) = "sec"
        End Select
        
        .XAxisMin = 0
        .XAxisMax = gc_Graph(GraphIndex).XMax
        .XAxisTicks = gc_Graph(GraphIndex).XTicks
        .NumPoints = gc_Graph(GraphIndex).Points
        
        .YAxisUse = 0                   'first axis
        .YAxisMin = gc_Graph(GraphIndex).YMin
        .YAxisMax = gc_Graph(GraphIndex).YMax
        .YAxisTicks = gc_Graph(GraphIndex).Yticks
        
        .YAxisUse = 1                   'second axis
        .YAxisMin = gc_Graph(GraphIndex).Y2Min
        .YAxisMax = gc_Graph(GraphIndex).Y2Max
        .YAxisTicks = gc_Graph(GraphIndex).Y2Ticks
        .YAxisMax = gc_Graph(GraphIndex).Y2Max   'this was needed to force
                                                 'RHS axis to match LHS better
        For i = 1 To .NumPoints
            .ThisPoint = i
            .GraphData = gc_Graph(GraphIndex).YValues(i)
            .OverlayGraphData = gc_Graph(GraphIndex).Y2Values(i)
            .XPosData = gc_Graph(GraphIndex).XValues(i)
            .OverlayXPosData = gc_Graph(GraphIndex).XValues(i)
        Next
        
        .DrawMode = graphDraw
    End With
End Sub

Private Sub Form_QueryUnload(Cancel As Integer, UnloadMode As Integer)
    If UnloadMode = vbFormControlMenu Then
        Cancel = True
        Me.Hide
        SetGraphEnabled GraphIndex, True
        FrmMDI.mnuWindow(MNU_WINDOW_CASCADE).Enabled = True
        FrmMDI.mnuWindow(MNU_WINDOW_TILE).Enabled = True
    End If
End Sub

Private Sub Form_Unload(Cancel As Integer)
    GraphsOpenIncrement -1
End Sub

Public Property Get GraphIndex() As Integer
    GraphIndex = mGraphIndex
End Property

Public Property Let GraphIndex(vNewValue As Integer)
    mGraphIndex = vNewValue
End Property
