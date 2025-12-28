VERSION 5.00
Object = "{827E9F53-96A4-11CF-823E-000021570103}#1.0#0"; "GRAPHS32.OCX"
Begin VB.Form frmDetails 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "ENGINE Pro Mechanical Details"
   ClientHeight    =   8070
   ClientLeft      =   105
   ClientTop       =   2205
   ClientWidth     =   7185
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   8070
   ScaleWidth      =   7185
   ShowInTaskbar   =   0   'False
   StartUpPosition =   1  'CenterOwner
   Begin VB.Frame Frame3 
      Caption         =   "Data @ x,xxx RPM"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   4230
      Left            =   3450
      TabIndex        =   17
      Top             =   0
      Width           =   3720
      Begin VB.ListBox lbxData 
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
         Left            =   90
         TabIndex        =   18
         TabStop         =   0   'False
         ToolTipText     =   "click on one of the four engine rating points to change the detailed data"
         Top             =   705
         Width           =   3525
      End
      Begin VB.Label Label3 
         Caption         =   "ATDC    inch    FPM   FPS  accel"
         BeginProperty Font 
            Name            =   "Courier New"
            Size            =   9
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   255
         Left            =   165
         TabIndex        =   20
         Top             =   465
         Width           =   3405
      End
      Begin VB.Label Label4 
         Caption         =   " deg   depth  Piston Speeds  g's"
         BeginProperty Font 
            Name            =   "Courier New"
            Size            =   9
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   255
         Left            =   165
         TabIndex        =   19
         Top             =   240
         Width           =   3405
      End
   End
   Begin VB.Frame Frame2 
      Caption         =   "Geometric Data Summary"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1785
      Left            =   30
      TabIndex        =   6
      Top             =   2190
      Width           =   3360
      Begin VB.Label lblGeometric 
         Caption         =   "Bore to Stroke Ratio"
         Height          =   240
         Index           =   0
         Left            =   150
         TabIndex        =   16
         Top             =   300
         Width           =   2400
      End
      Begin VB.Label lblGeometric 
         Caption         =   "Rod to Stroke Ratio"
         Height          =   240
         Index           =   1
         Left            =   150
         TabIndex        =   15
         Top             =   585
         Width           =   2400
      End
      Begin VB.Label lblGeometric 
         Caption         =   "Piston to Head / Rod Length"
         Height          =   240
         Index           =   2
         Left            =   150
         TabIndex        =   14
         Top             =   870
         Width           =   2400
      End
      Begin VB.Label lblGeometric 
         Caption         =   "Intake Throat / Bore Area Ratio"
         Height          =   240
         Index           =   3
         Left            =   150
         TabIndex        =   13
         Top             =   1155
         Width           =   2400
      End
      Begin VB.Label lblGeometric 
         Caption         =   "Intake Valve Lift / Diameter Ratio"
         Height          =   240
         Index           =   4
         Left            =   150
         TabIndex        =   12
         Top             =   1440
         Width           =   2400
      End
      Begin VB.Label lblRatio 
         Alignment       =   1  'Right Justify
         BackColor       =   &H80000005&
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   0
         Left            =   2610
         TabIndex        =   11
         Top             =   270
         Width           =   615
      End
      Begin VB.Label lblRatio 
         Alignment       =   1  'Right Justify
         BackColor       =   &H80000005&
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   1
         Left            =   2610
         TabIndex        =   10
         Top             =   555
         Width           =   615
      End
      Begin VB.Label lblRatio 
         Alignment       =   1  'Right Justify
         BackColor       =   &H80000005&
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   2
         Left            =   2610
         TabIndex        =   9
         Top             =   840
         Width           =   615
      End
      Begin VB.Label lblRatio 
         Alignment       =   1  'Right Justify
         BackColor       =   &H80000005&
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   3
         Left            =   2610
         TabIndex        =   8
         Top             =   1125
         Width           =   615
      End
      Begin VB.Label lblRatio 
         Alignment       =   1  'Right Justify
         BackColor       =   &H80000005&
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   4
         Left            =   2610
         TabIndex        =   7
         Top             =   1410
         Width           =   615
      End
   End
   Begin VB.Frame Frame1 
      Caption         =   "Piston Speed Summary - FPM"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   2190
      Left            =   30
      TabIndex        =   0
      Top             =   0
      Width           =   3360
      Begin VB.ListBox lbxRating 
         BeginProperty Font 
            Name            =   "Courier New"
            Size            =   9
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   960
         Left            =   300
         TabIndex        =   1
         TabStop         =   0   'False
         ToolTipText     =   "click on one of the four engine rating points to change the detailed data"
         Top             =   465
         Width           =   2760
      End
      Begin VB.Label Label1 
         Caption         =   "Rating    RPM   Avg   Max*"
         BeginProperty Font 
            Name            =   "Courier New"
            Size            =   9
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   210
         Left            =   360
         TabIndex        =   5
         Top             =   240
         Width           =   2730
      End
      Begin VB.Label lblTDC 
         Alignment       =   2  'Center
         Caption         =   "*Maximum Piston Speed occurs @ xx.x degrees after TDC"
         Height          =   390
         Left            =   330
         TabIndex        =   4
         Top             =   1425
         Width           =   2235
      End
      Begin VB.Label Label2 
         Caption         =   "Est. Cranking Compression - psig"
         Height          =   240
         Left            =   150
         TabIndex        =   3
         Top             =   1860
         Width           =   2400
      End
      Begin VB.Label lblRatio 
         Alignment       =   1  'Right Justify
         BackColor       =   &H80000005&
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   5
         Left            =   2610
         TabIndex        =   2
         Top             =   1830
         Width           =   615
      End
   End
   Begin GraphsLib.Graph gphMechDet 
      Height          =   3825
      Left            =   15
      TabIndex        =   21
      TabStop         =   0   'False
      Top             =   4230
      Width           =   7155
      _Version        =   327680
      _ExtentX        =   12621
      _ExtentY        =   6747
      _StockProps     =   96
      BorderStyle     =   1
      AutoInc         =   0
      Background      =   "15~-1~-1~-1~-1~-1~-1"
      GraphType       =   6
      GridStyle       =   3
      OverlayColor    =   "12"
      OverlayGraph    =   2
      OverlayPattern  =   "3"
      OverlaySymbol   =   "0"
      XAxisPos        =   2
      XAxisStyle      =   2
      YAxisPos        =   "1~2"
      YAxisStyle      =   "2~2"
      OverlayTrendSets=   "0"
   End
   Begin VB.Label Label7 
      Alignment       =   1  'Right Justify
      Caption         =   "vs Angle"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      ForeColor       =   &H00400000&
      Height          =   240
      Left            =   2460
      TabIndex        =   24
      Top             =   3960
      Width           =   915
   End
   Begin VB.Label Label6 
      Alignment       =   1  'Right Justify
      Caption         =   "&& Depth"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      ForeColor       =   &H000040C0&
      Height          =   240
      Left            =   1560
      TabIndex        =   23
      Top             =   3960
      Width           =   840
   End
   Begin VB.Label Label5 
      Alignment       =   1  'Right Justify
      Caption         =   "Piston Speed"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      ForeColor       =   &H00800000&
      Height          =   240
      Left            =   105
      TabIndex        =   22
      Top             =   3960
      Width           =   1410
   End
End
Attribute VB_Name = "frmDetails"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Private Sub Form_Load()
Dim ivd As Single
    SetRatingRPMs
    LoadlbxRating
    lbxRating.ListIndex = 1
    
    ivd = gc_ValveDia.Value: If Not gc_ValveDia.Inches Then ivd = gc_ValveDia.Value / ZM
    
    lblTDC.caption = gc_Detail.Headings(7)
    
    lblRatio(0).caption = RightAlign(5, 2, BQS)
    lblRatio(1).caption = RightAlign(5, 2, LRQS)
    lblRatio(2).caption = RightAlign(5, 4, DQR)
    lblRatio(3).caption = RightAlign(5, 3, gc_CSArea.Value / BArea)
    lblRatio(4).caption = RightAlign(5, 3, gc_ValveLift.Value / ivd)
    lblRatio(5).caption = RightAlign(5, 0, CCP)
        
End Sub

Private Sub LoadlbxRating()
    With lbxRating
        If .Listcount > 0 Then lbxRating.Clear
    
        .AddItem gc_Detail.RatingLine(1)
        .ItemData(.NewIndex) = gc_RPMPeakTQ.Value
    
        .AddItem gc_Detail.RatingLine(2)
        .ItemData(.NewIndex) = gc_RPMPeakHP.Value
    
        .AddItem gc_Detail.RatingLine(3)
        .ItemData(.NewIndex) = gc_Shift.Value
    
        .AddItem gc_Detail.RatingLine(4)
        .ItemData(.NewIndex) = gc_Redline.Value
    End With
End Sub

Private Sub lbxData_Click()
    'if user clicks on detailed data, set focus back to rating summary
    With lbxData
        If .ListIndex > -1 Then
            .ListIndex = -1
            lbxRating.SetFocus
        End If
    End With
End Sub

Private Sub lbxRating_Click()
    With lbxRating
        If .ListIndex > -1 Then
            MousePointer = vbHourglass
            LoadMechData .ListIndex + 1
            MousePointer = vbDefault
        End If
    End With
End Sub

Private Sub LoadMechData(Index As Integer)
Dim i As Integer
    If lbxData.Listcount > 0 Then lbxData.Clear
    
    gc_Detail.CalcMechDetails Index
    Frame3.caption = gc_Detail.Headings(1)
    
    For i = 1 To 15
        lbxData.AddItem gc_Detail.DataMech(i)
    Next
End Sub
