VERSION 5.00
Object = "{827E9F53-96A4-11CF-823E-000021570103}#1.0#0"; "GRAPHS32.OCX"
Begin VB.Form frmGraph 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Engine Dyno Data"
   ClientHeight    =   6240
   ClientLeft      =   75
   ClientTop       =   705
   ClientWidth     =   9270
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   6240
   ScaleMode       =   0  'User
   ScaleWidth      =   9270
   ShowInTaskbar   =   0   'False
   StartUpPosition =   2  'CenterScreen
   Begin VB.PictureBox Picture1 
      Height          =   450
      Left            =   7140
      Picture         =   "GRAPH.frx":0000
      ScaleHeight     =   390
      ScaleWidth      =   1890
      TabIndex        =   10
      Top             =   1650
      Width           =   1950
   End
   Begin VB.Frame Frame1 
      Caption         =   "Peak Values"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1260
      Left            =   7140
      TabIndex        =   2
      Top             =   180
      Width           =   1950
      Begin VB.Label Label4 
         Caption         =   "RPM"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   240
         Left            =   1335
         TabIndex        =   9
         Top             =   240
         Width           =   450
      End
      Begin VB.Label Label5 
         Caption         =   "HP"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H000040C0&
         Height          =   240
         Left            =   75
         TabIndex        =   8
         Top             =   510
         Width           =   300
      End
      Begin VB.Label Label6 
         Caption         =   "TQ"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00C00000&
         Height          =   240
         Left            =   75
         TabIndex        =   7
         Top             =   870
         Width           =   300
      End
      Begin VB.Label lblHP 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "HP"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H000040C0&
         Height          =   270
         Left            =   465
         TabIndex        =   6
         Top             =   480
         Width           =   600
      End
      Begin VB.Label lblRPMHP 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "RPMHP"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   270
         Left            =   1215
         TabIndex        =   5
         Top             =   480
         Width           =   600
      End
      Begin VB.Label lblTQ 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "TQ"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   270
         Left            =   465
         TabIndex        =   4
         Top             =   840
         Width           =   600
      End
      Begin VB.Label lblRPMTQ 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "RPMTQ"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   270
         Left            =   1215
         TabIndex        =   3
         Top             =   840
         Width           =   600
      End
   End
   Begin VB.ListBox lstDynoData 
      BeginProperty Font 
         Name            =   "Courier New"
         Size            =   9
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   3435
      Left            =   7140
      TabIndex        =   1
      Top             =   2040
      Width           =   1950
   End
   Begin GraphsLib.Graph gphEngine 
      Height          =   6120
      Left            =   60
      TabIndex        =   0
      Top             =   60
      Width           =   6900
      _Version        =   327680
      _ExtentX        =   12171
      _ExtentY        =   10795
      _StockProps     =   96
      BorderStyle     =   1
      AutoInc         =   0
      Background      =   "15~-1~-1~-1~-1~-1~-1"
      ColorData       =   "12~9"
      FontSize        =   "100~100~100~100"
      GraphStyle      =   4
      GraphType       =   6
      GridLineStyle   =   2
      GridStyle       =   3
      LabelEvery      =   4
      LegendPos       =   2
      OverlayColor    =   "9"
      OverlayGraph    =   1
      OverlayPattern  =   "3"
      OverlaySymbol   =   "0"
      TickEvery       =   4
      YAxisStyle      =   "2~0"
      OverlayTrendSets=   "0"
   End
End
Attribute VB_Name = "frmGraph"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Private Sub Form_Load()
    With frmENGINE
        lblHP.caption = .lblPeakHP.caption
        lblTQ.caption = .lblPeakTQ.caption
        lblRPMHP.caption = .lblRPMPeakHP.caption
        lblRPMTQ.caption = .lblRPMPeakTQ.caption
    End With
    
    DrawGraph
    
    LoadDynoData
    lstDynoData.ListIndex = 0
End Sub

Public Sub DrawGraph()
Dim i As Integer
    With gphEngine
        'this stuff used to test B&W printing, and is also in PrintGraph
        '.ColorData = 0
        '.PatternData = 0
        '.OverlayColor = 0
        '.OverlayPattern = 1
        '.OverlayPatternedLines = 1
        
        .NumPoints = gc_Graph.Points
        .YAxisMin = gc_Graph.YMin
        .YAxisMax = gc_Graph.YMax
        .YAxisTicks = gc_Graph.YTicks
        
        For i = 1 To gc_Graph.Points
            .ThisPoint = i
            .GraphData = gc_Graph.HPValues(i)
            .OverlayGraphData = gc_Graph.TQValues(i)
            .LabelText = Format(gc_Graph.XLabels(i), "#####")
        Next
        
        .DrawMode = 2
    End With
End Sub

Private Sub LoadDynoData()
Dim i As Integer
Dim String18 As String * 18
Dim nd As Integer
Dim nd2 As Integer
    If lstDynoData.Listcount > 0 Then lstDynoData.Clear
    
    With gc_Graph
        lstDynoData.Height = 240 * (.Points + 1) / 2
        
        nd = 0
        If gc_HP.Value < 100 Then nd = 1
        If gc_HP.Value < 10 Then nd = 2
        
        nd2 = 0
        If nd > 0 Then nd2 = 1
        
        For i = 1 To .Points Step 2
            String18 = Space(18)
            
            Mid(String18, 1, 5) = RightAlign(5, 0, .XLabels(i))
            Mid(String18, 7, 5) = RightAlign(5 - nd2, nd, .HPValues(i))
            Mid(String18, 13, 5) = RightAlign(5 - nd2, nd, .TQValues(i))
            
            lstDynoData.AddItem String18
        Next
    End With
End Sub
