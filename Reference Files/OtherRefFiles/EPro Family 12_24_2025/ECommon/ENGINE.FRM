VERSION 5.00
Object = "{F9043C88-F6F2-101A-A3C9-08002B2F49FB}#1.2#0"; "comdlg32.ocx"
Begin VB.Form frmENGINE 
   Caption         =   "ENGINE jr for Windows"
   ClientHeight    =   6375
   ClientLeft      =   60
   ClientTop       =   630
   ClientWidth     =   9285
   Icon            =   "ENGINE.frx":0000
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   6375
   ScaleMode       =   0  'User
   ScaleWidth      =   9285
   WindowState     =   2  'Maximized
   Begin VB.CommandButton btnPrint 
      Height          =   360
      Left            =   1380
      Picture         =   "ENGINE.frx":0442
      Style           =   1  'Graphical
      TabIndex        =   85
      Top             =   90
      Width           =   360
   End
   Begin VB.CommandButton btnSave 
      Height          =   360
      Left            =   990
      Picture         =   "ENGINE.frx":0544
      Style           =   1  'Graphical
      TabIndex        =   84
      Top             =   90
      Width           =   360
   End
   Begin VB.CommandButton btnOpen 
      Height          =   360
      Left            =   600
      Picture         =   "ENGINE.frx":0A36
      Style           =   1  'Graphical
      TabIndex        =   83
      Top             =   90
      Width           =   360
   End
   Begin VB.Frame Frame7 
      Height          =   510
      Left            =   60
      TabIndex        =   77
      Top             =   -30
      Width           =   9120
      Begin VB.CommandButton btnCSCalc 
         Caption         =   "Area Calculator"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   360
         Left            =   2055
         TabIndex        =   82
         Top             =   120
         Width           =   1500
      End
      Begin VB.CommandButton btnGraph 
         Caption         =   "Dyno Data"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   360
         Left            =   3585
         TabIndex        =   81
         Top             =   120
         Width           =   1110
      End
      Begin VB.CommandButton btnDetails 
         Caption         =   "Mech Details"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   360
         Left            =   4725
         TabIndex        =   80
         Top             =   120
         Width           =   1320
      End
      Begin VB.CommandButton btnFlowDet 
         Caption         =   "Flow Details"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   360
         Left            =   6075
         TabIndex        =   79
         Top             =   120
         Width           =   1230
      End
      Begin VB.CommandButton btnRecom 
         Caption         =   "Recommendations"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   360
         Left            =   7335
         TabIndex        =   78
         Top             =   120
         Width           =   1740
      End
   End
   Begin VB.Frame Frame6 
      Height          =   1470
      Left            =   750
      TabIndex        =   65
      Top             =   2460
      Width           =   4080
      Begin VB.TextBox txtCarbCFM 
         Height          =   285
         Left            =   3285
         MaxLength       =   6
         TabIndex        =   72
         Top             =   810
         Width           =   600
      End
      Begin VB.TextBox txtInCamDur 
         Height          =   285
         Left            =   3285
         MaxLength       =   6
         TabIndex        =   71
         ToolTipText     =   "only even numbers will be accepted"
         Top             =   480
         Width           =   600
      End
      Begin VB.ComboBox cbxCamType 
         Height          =   315
         ItemData        =   "ENGINE.frx":0F28
         Left            =   1260
         List            =   "ENGINE.frx":0F2A
         Style           =   2  'Dropdown List
         TabIndex        =   70
         Top             =   120
         Width           =   2625
      End
      Begin VB.CommandButton btnCFM 
         Caption         =   "..."
         Height          =   285
         Left            =   2925
         TabIndex        =   69
         ToolTipText     =   "Press this button to display the Throttle CFM @ 1.5 inches Hg Worksheet"
         Top             =   810
         Width           =   285
      End
      Begin VB.OptionButton optCarb 
         Alignment       =   1  'Right Justify
         Caption         =   "Carb"
         Height          =   195
         Index           =   0
         Left            =   120
         TabIndex        =   68
         ToolTipText     =   "Press this option button to select carburetors"
         Top             =   1170
         Width           =   630
      End
      Begin VB.OptionButton optCarb 
         Alignment       =   1  'Right Justify
         Caption         =   "EFI"
         Height          =   195
         Index           =   1
         Left            =   825
         TabIndex        =   67
         ToolTipText     =   "Press this option button to select either electronic or mechanical fuel injection"
         Top             =   1170
         Width           =   540
      End
      Begin VB.ComboBox cbxFuel 
         Height          =   315
         Left            =   2535
         Style           =   2  'Dropdown List
         TabIndex        =   66
         Top             =   1110
         Width           =   1350
      End
      Begin VB.Label Label1 
         Caption         =   "Throttle CFM @ 1.5 inch Hg"
         Height          =   240
         Index           =   5
         Left            =   135
         TabIndex        =   76
         Top             =   840
         Width           =   2160
      End
      Begin VB.Label Label1 
         Caption         =   "Intake Duration @ .050 inch - degree"
         Height          =   240
         Index           =   7
         Left            =   135
         TabIndex        =   75
         ToolTipText     =   "only even numbers will be accepted"
         Top             =   510
         Width           =   2850
      End
      Begin VB.Label Label1 
         Caption         =   "Camshaft Type:"
         Height          =   240
         Index           =   8
         Left            =   135
         TabIndex        =   74
         Top             =   180
         Width           =   1110
      End
      Begin VB.Label Label3 
         Caption         =   "Fuel Type:"
         Height          =   240
         Left            =   1725
         TabIndex        =   73
         Top             =   1170
         Width           =   750
      End
   End
   Begin VB.Frame Frame5 
      Height          =   1800
      Left            =   750
      TabIndex        =   50
      Top             =   765
      Width           =   4080
      Begin VB.OptionButton optInline 
         Alignment       =   1  'Right Justify
         Caption         =   "Vee"
         Height          =   240
         Index           =   1
         Left            =   2745
         TabIndex        =   59
         ToolTipText     =   "Press this option button for a typical ""vee"" engine configuration"
         Top             =   150
         Width           =   585
      End
      Begin VB.OptionButton optInline 
         Alignment       =   1  'Right Justify
         Caption         =   "Inline"
         Height          =   240
         Index           =   0
         Left            =   2025
         TabIndex        =   58
         ToolTipText     =   "Press this option button for an ""inline"" engine configuration"
         Top             =   150
         Width           =   675
      End
      Begin VB.TextBox txtCR 
         Height          =   285
         Left            =   3270
         MaxLength       =   6
         TabIndex        =   57
         Top             =   1440
         Width           =   600
      End
      Begin VB.TextBox txtRod 
         Height          =   285
         Left            =   3270
         MaxLength       =   6
         TabIndex        =   56
         Top             =   1110
         Width           =   600
      End
      Begin VB.TextBox txtStroke 
         Height          =   285
         Left            =   3270
         MaxLength       =   6
         TabIndex        =   55
         Top             =   780
         Width           =   600
      End
      Begin VB.TextBox txtBore 
         Height          =   285
         Left            =   3270
         MaxLength       =   6
         TabIndex        =   54
         Top             =   450
         Width           =   600
      End
      Begin VB.TextBox txtNoCyl 
         Height          =   285
         Left            =   1590
         MaxLength       =   6
         TabIndex        =   53
         Top             =   120
         Width           =   390
      End
      Begin VB.CommandButton btnCR 
         Caption         =   "..."
         Height          =   285
         Left            =   2910
         TabIndex        =   52
         ToolTipText     =   "Press this button to display the Compression Ratio Worksheet"
         Top             =   1440
         Width           =   285
      End
      Begin VB.OptionButton optInline 
         Alignment       =   1  'Right Justify
         Caption         =   "Flat"
         Height          =   240
         Index           =   2
         Left            =   3375
         TabIndex        =   51
         ToolTipText     =   "Press this option button for a ""flat"" or ""opposed"" engine configuration"
         Top             =   150
         Width           =   585
      End
      Begin VB.Label Label1 
         Caption         =   "Number of Cylinders"
         Height          =   240
         Index           =   0
         Left            =   120
         TabIndex        =   64
         Top             =   150
         Width           =   1410
      End
      Begin VB.Label Label1 
         Caption         =   "Bore Diameter - millimeters"
         Height          =   240
         Index           =   1
         Left            =   120
         TabIndex        =   63
         Top             =   480
         Width           =   1860
      End
      Begin VB.Label Label1 
         Caption         =   "Stroke Length - millimeters"
         Height          =   240
         Index           =   2
         Left            =   120
         TabIndex        =   62
         Top             =   810
         Width           =   1860
      End
      Begin VB.Label Label1 
         Caption         =   "Rod Length - millimeters"
         Height          =   240
         Index           =   3
         Left            =   120
         TabIndex        =   61
         Top             =   1140
         Width           =   1860
      End
      Begin VB.Label Label1 
         Caption         =   "Compression Ratio"
         Height          =   240
         Index           =   4
         Left            =   120
         TabIndex        =   60
         Top             =   1470
         Width           =   1860
      End
   End
   Begin VB.Frame Frame4 
      Height          =   1305
      Left            =   4800
      TabIndex        =   42
      Top             =   765
      Width           =   4080
      Begin VB.OptionButton optCurved 
         Alignment       =   1  'Right Justify
         Caption         =   "Straight"
         Height          =   195
         Index           =   1
         Left            =   3030
         TabIndex        =   46
         ToolTipText     =   "Press this option button if the intake manifold runners are straight.  This is typical for sheet metal manifolds"
         Top             =   630
         Width           =   840
      End
      Begin VB.OptionButton optCurved 
         Alignment       =   1  'Right Justify
         Caption         =   "Curved"
         Height          =   195
         Index           =   0
         Left            =   1980
         TabIndex        =   45
         ToolTipText     =   $"ENGINE.frx":0F2C
         Top             =   630
         Width           =   840
      End
      Begin VB.TextBox txtFlowFactor 
         Height          =   285
         Left            =   3270
         MaxLength       =   6
         TabIndex        =   44
         Top             =   930
         Width           =   600
      End
      Begin VB.ComboBox cbxManifold 
         Height          =   315
         ItemData        =   "ENGINE.frx":0FB8
         Left            =   1710
         List            =   "ENGINE.frx":0FBA
         Style           =   2  'Dropdown List
         TabIndex        =   43
         Top             =   240
         Width           =   2190
      End
      Begin VB.Label Label1 
         Caption         =   "Manifold Runner Style:"
         Height          =   240
         Index           =   15
         Left            =   120
         TabIndex        =   49
         Top             =   630
         Width           =   1620
      End
      Begin VB.Label Label1 
         Caption         =   "Intake Manifold Type:"
         Height          =   240
         Index           =   6
         Left            =   120
         TabIndex        =   48
         Top             =   300
         Width           =   1545
      End
      Begin VB.Label Label1 
         Caption         =   "Intake Manifold Flow Factor - %"
         Height          =   240
         Index           =   9
         Left            =   120
         TabIndex        =   47
         Top             =   960
         Width           =   2220
      End
   End
   Begin VB.Frame Frame3 
      Height          =   1965
      Left            =   4800
      TabIndex        =   30
      Top             =   1965
      Width           =   4080
      Begin VB.TextBox txtNoInValves 
         Height          =   285
         Left            =   3330
         MaxLength       =   6
         TabIndex        =   36
         ToolTipText     =   "2 valves per cylinder are not allowed for this camshaft type"
         Top             =   240
         Width           =   600
      End
      Begin VB.TextBox txtMaxInFlow 
         Height          =   285
         Left            =   3330
         MaxLength       =   6
         TabIndex        =   35
         Top             =   900
         Width           =   600
      End
      Begin VB.TextBox txtRefBore 
         Height          =   285
         Left            =   3330
         MaxLength       =   6
         TabIndex        =   34
         Top             =   1560
         Width           =   600
      End
      Begin VB.TextBox txtDeltaP 
         Height          =   285
         Left            =   3330
         MaxLength       =   6
         TabIndex        =   33
         Top             =   1230
         Width           =   600
      End
      Begin VB.CommandButton btnIntake 
         Caption         =   "..."
         Height          =   285
         Left            =   2970
         TabIndex        =   32
         ToolTipText     =   "Press this button to display the Maximum Intake Port Flow - CFM Worksheet"
         Top             =   900
         Width           =   285
      End
      Begin VB.TextBox txtValveDia 
         Height          =   285
         Left            =   3330
         MaxLength       =   6
         TabIndex        =   31
         Top             =   570
         Width           =   600
      End
      Begin VB.Label Label1 
         Caption         =   "Intake Valve Diameter - millimeters"
         Height          =   240
         Index           =   16
         Left            =   180
         TabIndex        =   41
         Top             =   600
         Width           =   2430
      End
      Begin VB.Label Label1 
         Caption         =   "   @ Test Pressure - inch H20"
         Height          =   240
         Index           =   10
         Left            =   120
         TabIndex        =   40
         Top             =   1260
         Width           =   2280
      End
      Begin VB.Label Label1 
         Caption         =   "   @ Reference Bore Diameter - millimeters"
         Height          =   240
         Index           =   11
         Left            =   120
         TabIndex        =   39
         Top             =   1590
         Width           =   3000
      End
      Begin VB.Label Label1 
         Caption         =   "Maximum Intake Port Flow - CFM"
         Height          =   240
         Index           =   12
         Left            =   180
         TabIndex        =   38
         Top             =   930
         Width           =   2400
      End
      Begin VB.Label Label1 
         Caption         =   "Number of Intake Valves per Cylinder"
         Height          =   240
         Index           =   13
         Left            =   180
         TabIndex        =   37
         Top             =   270
         Width           =   2640
      End
   End
   Begin VB.Frame Frame2 
      Caption         =   "Frame2"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1740
      Left            =   750
      TabIndex        =   6
      Top             =   4500
      Width           =   8130
      Begin VB.Frame Frame1 
         Caption         =   "SI Units"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   1380
         Left            =   5550
         TabIndex        =   7
         Top             =   240
         Width           =   2340
         Begin VB.Label lblNm 
            Alignment       =   1  'Right Justify
            BorderStyle     =   1  'Fixed Single
            Height          =   255
            Left            =   1620
            TabIndex        =   13
            Top             =   960
            Width           =   600
         End
         Begin VB.Label lblkW 
            Alignment       =   1  'Right Justify
            BorderStyle     =   1  'Fixed Single
            Height          =   255
            Left            =   1620
            TabIndex        =   12
            Top             =   600
            Width           =   600
         End
         Begin VB.Label lblliter 
            Alignment       =   1  'Right Justify
            BorderStyle     =   1  'Fixed Single
            Height          =   255
            Left            =   1620
            TabIndex        =   11
            Top             =   240
            Width           =   600
         End
         Begin VB.Label label2 
            Caption         =   "Peak Torque - Nm"
            Height          =   255
            Index           =   11
            Left            =   120
            TabIndex        =   10
            Top             =   990
            Width           =   1500
         End
         Begin VB.Label label2 
            Caption         =   "Peak Power - kW"
            Height          =   255
            Index           =   10
            Left            =   120
            TabIndex        =   9
            Top             =   630
            Width           =   1500
         End
         Begin VB.Label label2 
            Caption         =   "Displacement - liter"
            Height          =   255
            Index           =   9
            Left            =   120
            TabIndex        =   8
            Top             =   270
            Width           =   1500
         End
      End
      Begin VB.Label label2 
         Caption         =   "Peak HP"
         Height          =   240
         Index           =   1
         Left            =   120
         TabIndex        =   29
         Top             =   315
         Width           =   1350
      End
      Begin VB.Label label2 
         Caption         =   "RPM @ Peak HP"
         Height          =   240
         Index           =   2
         Left            =   120
         TabIndex        =   28
         Top             =   675
         Width           =   1350
      End
      Begin VB.Label label2 
         Caption         =   "Peak HP/CID"
         Height          =   240
         Index           =   3
         Left            =   120
         TabIndex        =   27
         Top             =   1035
         Width           =   1350
      End
      Begin VB.Label label2 
         Caption         =   "Shift RPM"
         Height          =   240
         Index           =   4
         Left            =   120
         TabIndex        =   26
         Top             =   1395
         Width           =   1350
      End
      Begin VB.Label lblPeakHP 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Left            =   1470
         TabIndex        =   25
         Top             =   285
         Width           =   600
      End
      Begin VB.Label lblRPMPeakHP 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Left            =   1470
         TabIndex        =   24
         Top             =   645
         Width           =   600
      End
      Begin VB.Label lblHPperCID 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Left            =   1470
         TabIndex        =   23
         Top             =   1005
         Width           =   600
      End
      Begin VB.Label lblShift 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Left            =   1470
         TabIndex        =   22
         Top             =   1365
         Width           =   600
      End
      Begin VB.Label lblRedline 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Left            =   4350
         TabIndex        =   21
         Top             =   1365
         Width           =   600
      End
      Begin VB.Label lblTQperCID 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Left            =   4350
         TabIndex        =   20
         Top             =   1005
         Width           =   600
      End
      Begin VB.Label lblRPMPeakTQ 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Left            =   4350
         TabIndex        =   19
         Top             =   645
         Width           =   600
      End
      Begin VB.Label lblPeakTQ 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Left            =   4350
         TabIndex        =   18
         Top             =   285
         Width           =   600
      End
      Begin VB.Label label2 
         Caption         =   "Redline RPM"
         Height          =   240
         Index           =   8
         Left            =   2700
         TabIndex        =   17
         Top             =   1395
         Width           =   1620
      End
      Begin VB.Label label2 
         Caption         =   "Peak Torque/CID"
         Height          =   240
         Index           =   7
         Left            =   2700
         TabIndex        =   16
         Top             =   1035
         Width           =   1620
      End
      Begin VB.Label label2 
         Caption         =   "RPM @ Peak Torque"
         Height          =   240
         Index           =   6
         Left            =   2700
         TabIndex        =   15
         Top             =   675
         Width           =   1620
      End
      Begin VB.Label label2 
         Caption         =   "Peak Torque - ft lbs"
         Height          =   240
         Index           =   5
         Left            =   2700
         TabIndex        =   14
         Top             =   315
         Width           =   1620
      End
   End
   Begin VB.PictureBox picGraph 
      Height          =   375
      Left            =   150
      ScaleHeight     =   315
      ScaleWidth      =   315
      TabIndex        =   2
      Top             =   1500
      Visible         =   0   'False
      Width           =   375
   End
   Begin VB.TextBox txtNote 
      Height          =   285
      Left            =   750
      TabIndex        =   0
      Top             =   480
      Width           =   8430
   End
   Begin MSComDlg.CommonDialog cdlFile 
      Left            =   105
      Top             =   945
      _ExtentX        =   847
      _ExtentY        =   847
      _Version        =   393216
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00E0E0E0&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(2)"
      Height          =   420
      Index           =   2
      Left            =   8220
      TabIndex        =   5
      Top             =   3960
      Width           =   975
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00E0E0E0&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(1)"
      Height          =   420
      Index           =   1
      Left            =   7230
      TabIndex        =   4
      Top             =   3960
      Width           =   975
   End
   Begin VB.Label lblHELP 
      BackColor       =   &H00E0E0E0&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(0)"
      Height          =   420
      Index           =   0
      Left            =   450
      TabIndex        =   3
      Top             =   3960
      Width           =   6765
   End
   Begin VB.Label lblFile 
      Caption         =   "Note:"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   195
      Index           =   1
      Left            =   150
      TabIndex        =   1
      Top             =   525
      Width           =   450
   End
   Begin VB.Menu mnuEngine 
      Caption         =   "&File"
      Index           =   0
      Begin VB.Menu mnuFile 
         Caption         =   "&Open..."
         Index           =   0
      End
      Begin VB.Menu mnuFile 
         Caption         =   "&Save"
         Enabled         =   0   'False
         Index           =   1
      End
      Begin VB.Menu mnuFile 
         Caption         =   "Save &As..."
         Index           =   2
      End
      Begin VB.Menu mnuFile 
         Caption         =   "-"
         Index           =   3
      End
      Begin VB.Menu mnuFile 
         Caption         =   "&Print"
         Index           =   4
      End
      Begin VB.Menu mnuFile 
         Caption         =   "-"
         Index           =   6
      End
      Begin VB.Menu mnuFile 
         Caption         =   "E&xit"
         Index           =   7
      End
   End
   Begin VB.Menu mnuEngine 
      Caption         =   "&Help"
      Index           =   1
      Begin VB.Menu mnuHelp 
         Caption         =   "About"
         Index           =   0
      End
   End
End
Attribute VB_Name = "frmENGINE"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Public fc_Value As Object
Public fc_Note As New cValue

Private bFileDirty As Boolean
Private bFileExists As Boolean
Private lastfile As String
Private MenuPrint As Boolean

Public Sub Display(Optional mode As Variant)
Dim imode As Integer
    If IsMissing(mode) Then
        imode = vbModeless
    Else
        imode = mode
    End If
   
   'Required set up process goes here
    Me.Show imode
   'Me.Refresh
End Sub


Private Sub btnCR_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Blank
    SetHelp Me, HELP_SAVE, gc_Blank
End Sub

Private Sub btnCR_Click()
    frmCR.Show vbModal
    If frmCR.FileDirty Then bFileDirty = True
    txtCR.SetFocus
End Sub

Private Sub btnCR_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Blank
    SetHelp Me, HELP_SET, gc_Blank
End Sub


Private Sub btnCFM_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Blank
    SetHelp Me, HELP_SAVE, gc_Blank
End Sub

Private Sub btnCFM_Click()
    frmCarb.Show vbModal
    If frmCarb.FileDirty Then bFileDirty = True
    txtCarbCFM.SetFocus
End Sub

Private Sub btnCFM_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Blank
    SetHelp Me, HELP_SET, gc_Blank
End Sub


Private Sub btnCSCalc_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Blank
    SetHelp Me, HELP_SAVE, gc_Blank
End Sub

Private Sub btnCSCalc_Click()
    btnCSCalc.Enabled = False
    frmCSCalc.Show vbModal
    If frmCSCalc.FileDirty Then bFileDirty = True
    btnCSCalc.Enabled = True
    btnCSCalc.SetFocus
End Sub

Private Sub btnCSCalc_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Blank
    SetHelp Me, HELP_SET, gc_Blank
End Sub


Private Sub btnIntake_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Blank
    SetHelp Me, HELP_SAVE, gc_Blank
End Sub

Private Sub btnIntake_Click()
    #If ISENGINEPRO Then
        Unload frmFlowB
        frmFlowB.Show vbModal
        If frmFlowB.FileDirty Then bFileDirty = True
    #Else
        frmMaxFlow.Show vbModal
        If frmMaxFlow.FileDirty Then bFileDirty = True
    #End If
    txtMaxInFlow.SetFocus
End Sub

Private Sub btnIntake_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Blank
    SetHelp Me, HELP_SET, gc_Blank
End Sub


Private Sub btnGraph_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Blank
    SetHelp Me, HELP_SAVE, gc_Blank
End Sub

Private Sub BtnGraph_Click()
    MousePointer = vbHourglass
    btnGraph.Enabled = False
    Unload frmGraph
    SetfrmGraph
    frmGraph.Show vbModal
    btnGraph.Enabled = True
    btnGraph.SetFocus
    MousePointer = vbDefault
End Sub

Private Sub btnGraph_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Blank
    SetHelp Me, HELP_SET, gc_Blank
End Sub


Private Sub btnRecom_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Blank
    SetHelp Me, HELP_SAVE, gc_Blank
End Sub

Private Sub BtnRecom_Click()
#If ISENGINEPRO Then
    btnRecom.Enabled = False
    frmRecommend.Show vbModal
    btnRecom.Enabled = True
    btnRecom.SetFocus
#End If
End Sub

Private Sub btnRecom_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Blank
    SetHelp Me, HELP_SET, gc_Blank
End Sub


Private Sub btnDetails_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Blank
    SetHelp Me, HELP_SAVE, gc_Blank
End Sub

Private Sub btnDetails_Click()
#If ISENGINEPRO Then
    btnDetails.Enabled = False
    frmDetails.Show vbModal
    btnDetails.Enabled = True
    btnDetails.SetFocus
#End If
End Sub

Private Sub btnDetails_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Blank
    SetHelp Me, HELP_SET, gc_Blank
End Sub


Private Sub btnFlowDet_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Blank
    SetHelp Me, HELP_SAVE, gc_Blank
End Sub

Private Sub btnFlowDet_Click()
#If ISENGINEPRO Then
    MousePointer = vbHourglass
    btnFlowDet.Enabled = False
    Unload frmFlowDet
    frmFlowDet.Show vbModal
    btnFlowDet.Enabled = True
    btnFlowDet.SetFocus
    MousePointer = vbDefault
#End If
End Sub

Private Sub btnFlowDet_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Blank
    SetHelp Me, HELP_SET, gc_Blank
End Sub


Private Sub btnOpen_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Blank
    SetHelp Me, HELP_SAVE, gc_Blank
End Sub

Private Sub BtnOpen_Click()
    mnufile_Click 0
    txtNote.SetFocus
End Sub

Private Sub btnOpen_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Blank
    SetHelp Me, HELP_SET, gc_Blank
End Sub


Private Sub btnPrint_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Blank
    SetHelp Me, HELP_SAVE, gc_Blank
End Sub

Private Sub BtnPrint_Click()
    MenuPrint = False
    mnufile_Click 4
    txtNote.SetFocus
End Sub

Private Sub btnPrint_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Blank
    SetHelp Me, HELP_SET, gc_Blank
End Sub


Private Sub btnSave_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Blank
    SetHelp Me, HELP_SAVE, gc_Blank
End Sub

Private Sub btnSave_Click()
    If bFileDirty And bFileExists Then
        mnufile_Click 1
    Else
        mnufile_Click 2
    End If
    txtNote.SetFocus
End Sub

Private Sub btnSave_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Blank
    SetHelp Me, HELP_SET, gc_Blank
End Sub


Private Sub Form_Load()
    MenuPrint = True
    bFileExists = False
    ofn = "(Untitled)":         lastfile = ofn
    Me.caption = App.Title & " - " & NameOnly(ofn)
    mnuHelp(0).caption = "About " & App.ProductName & "..."
    
    fc_Note.StatusMsg = "Descriptive note or text to more fully describe this data file."
    
    Me.Width = Screen.Width:    Me.Height = Screen.Height
    Left = 0:                   Top = 0
    
    txtNote.Text = "Base case for " & App.Title
    #If Not ISENGINEPRO Then
        btnDetails.Enabled = False:     btnDetails.Visible = False
        btnFlowDet.Enabled = False:     btnFlowDet.Visible = False
        btnRecom.Enabled = False:       btnRecom.Visible = False
    #End If
    
    LoadCAMK
    SetAllValues
    LoadTypes gc_CamType, cbxCamType
    LoadTypes gc_Fuel, cbxFuel
    LoadTypes gc_Manifold, cbxManifold
    
    SetConfig
    SetCarb
    SetRunner
    
    CalcEngPerf
    LoadScreen
    bFileDirty = False
End Sub

Private Sub form_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_RESET, fc_Value
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub Form_QueryUnload(Cancel As Integer, UnloadMode As Integer)
    If TestDirty() = vbCancel Then Cancel = True
    End
End Sub


Private Sub cbxFuel_Click()
    gc_Fuel.Value = cbxFuel.ItemData(cbxFuel.ListIndex)
    If gc_Fuel.IsChanged Then
        CalcEngPerf
        LoadScreen
        gc_Fuel.IsChanged = False
    End If
End Sub

Private Sub cbxFuel_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Fuel
    SetHelp Me, HELP_SAVE, gc_Fuel
End Sub


Private Sub cbxManifold_Click()
    gc_Manifold.Value = cbxManifold.ItemData(cbxManifold.ListIndex)
    If gc_Manifold.IsChanged Then
        'force IR for all single cylinder engines!
        If gc_NoCyl.Value = 1 And gc_Manifold.Value <> 2 Then
            Beep
            gc_Manifold.Value = 2
        End If
        SetCarbCFM
        
        CalcEngPerf
        LoadScreen
        gc_Manifold.IsChanged = False
    End If
End Sub

Private Sub cbxManifold_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Manifold
    SetHelp Me, HELP_SAVE, gc_Manifold
End Sub


Private Sub cbxCamType_Click()
    gc_CamType.Value = cbxCamType.ItemData(cbxCamType.ListIndex)
    If gc_CamType.IsChanged Then
        SetNIV
        
        CalcEngPerf
        LoadScreen
        gc_CamType.IsChanged = False
    End If
End Sub

Private Sub cbxCamType_GotFocus()
    'setpanels Me, PNL_SAVE, gc_CamType
    SetHelp Me, HELP_SAVE, gc_CamType
End Sub


Private Sub pnlInput_Click(Index As Integer)
    txtNote.SetFocus
End Sub

Private Sub mnuEngine_Click(Index As Integer)
    mnuFile(1).Enabled = bFileDirty And bFileExists
End Sub

Private Sub mnufile_Click(Index As Integer)
    On Error GoTo SubExit
    
    Select Case Index
        Case 0: If TestDirty() = vbCancel Then Exit Sub
        
                With cdlFile
                    .DialogTitle = "Open " & App.Title & " Data File"
                    .Flags = cdlOFNHideReadOnly Or cdlOFNFileMustExist
                    .InitDir = App.Path
                    .FileName = "*.eng"
                    .ShowOpen
            
                    If .FileName <> "" And .FileName <> "*.eng" Then
                        ofn = Trim(.FileName)
                        Me.caption = App.Title & " - " & NameOnly(ofn)
                        LoadFromFile ofn
                    End If
                End With
        
        Case 1: SaveToFile ofn
        Case 2: With cdlFile
                    .DialogTitle = "Save " & App.Title & " Data File"
                    .Flags = cdlOFNOverwritePrompt Or cdlOFNPathMustExist
                    .InitDir = App.Path
                    .FileName = "*.eng"
                    .DefaultExt = "eng"
                    .ShowSave
            
                    If .FileName <> "" And .FileName <> "*.eng" Then
                        ofn = Trim(.FileName)
                        Me.caption = App.Title & " - " & NameOnly(ofn)
                        SaveToFile ofn
                    End If
                End With
        
        Case 3: 'separator
        Case 4: 'print
                If MenuPrint Then
                    With cdlFile
                        .CancelError = True
                        .Flags = &H40&
                        .ShowPrinter
                    End With
                End If
                
                MousePointer = vbHourglass
                
                'force worksheet calculations to make current
                CalcCompRatio
                CalcCarb
                CalcFlowStuff gc_MaxInFlow.Value
                CalcSeatPer
                CalcWSCSArea gc_ValveLift.Value
    
                #If ISENGINEPRO Then
                    'force calculations to make current
                    CalcRecommendations
                    SetRatingRPMs
                #End If
    
                Note = Trim(txtNote.Text & " ")
                SetfrmGraph
                Printer.FontName = "Courier New"
                PrintPage
                MenuPrint = True
                MousePointer = vbDefault
        
        Case 5: 'not used
        Case 6: 'separator
        Case 7: If TestDirty() = vbCancel Then Exit Sub
                End
    End Select
    
SubExit:
End Sub

Private Sub mnuHelp_Click(Index As Integer)
    frmSplash.BIsAbout = True
    frmSplash.Show vbModal
End Sub


Private Sub Frame7_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_RESET, fc_Value
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub Frame2_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_RESET, fc_Value
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub Frame3_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_RESET, fc_Value
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub Frame4_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    With cbxManifold        'over combo box (no mousemove for combos)
        If (X > .Left - 100 And X < .Left + .Width + 100) Then
            If (Y > .Top - 100 And Y < .Top + .Height + 100) Then
                'setpanels Me, PNL_SET, gc_Manifold
                SetHelp Me, HELP_SET, gc_Manifold
                Exit Sub
            End If
        End If
    End With
    
    'setpanels Me, PNL_RESET, fc_Value
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub Frame5_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_RESET, fc_Value
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub Frame6_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    With cbxCamType         'over combo box (no mousemove for combos)
        If (X > .Left - 100 And X < .Left + .Width + 100) Then
            If (Y > .Top - 100 And Y < .Top + .Height + 100) Then
                'setpanels Me, PNL_SET, gc_CamType
                SetHelp Me, HELP_SET, gc_CamType
                Exit Sub
            End If
        End If
    End With
    
    With cbxFuel        'over combo box (no mousemove for combos)
        If (X > .Left - 100 And X < .Left + .Width + 100) Then
            If (Y > .Top - 100 And Y < .Top + .Height + 100) Then
                'setpanels Me, PNL_SET, gc_Fuel
                SetHelp Me, HELP_SET, gc_Fuel
                Exit Sub
            End If
        End If
    End With
    
    'setpanels Me, PNL_RESET, fc_Value
    SetHelp Me, HELP_RESET, fc_Value
End Sub


Private Sub txtNote_Change()
    bFileDirty = True
End Sub

Private Sub txtNote_GotFocus()
    'setpanels Me, PNL_SAVE, fc_Note
    SetHelp Me, HELP_SAVE, fc_Note
End Sub

Private Sub txtNote_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, fc_Note
    SetHelp Me, HELP_SET, fc_Note
End Sub


Private Sub optInline_Click(Index As Integer)
    If Index = 0 Then
        gc_Inline.Value = Index
    Else
        Select Case gc_NoCyl.Value
            Case 1, 3, 5, 7, 9, 11
                Beep
                gc_Inline.Value = 0
                SetConfig
                optInline(0).SetFocus
                
            Case 2, 4, 6, 8, 10, 12
                gc_Inline.Value = Index
        End Select
    End If
    
    If gc_Inline.IsChanged Then
        CalcEngPerf
        LoadScreen
        gc_Inline.IsChanged = False
    End If
End Sub

Private Sub optInline_GotFocus(Index As Integer)
    'setpanels Me, PNL_SAVE, gc_Blank
    SetHelp Me, HELP_SAVE, gc_Blank
End Sub

Private Sub optInline_MouseMove(Index As Integer, Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Blank
    SetHelp Me, HELP_SET, gc_Blank
End Sub


Private Sub optCarb_Click(Index As Integer)
    gc_Carb.Value = IIf(Index = 0, True, False)
    
    If gc_Carb.IsChanged Then
        CalcEngPerf
        LoadScreen
        gc_Carb.IsChanged = False
    End If
End Sub

Private Sub optCarb_GotFocus(Index As Integer)
    'setpanels Me, PNL_SAVE, gc_Blank
    SetHelp Me, HELP_SAVE, gc_Blank
End Sub

Private Sub optCarb_MouseMove(Index As Integer, Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Blank
    SetHelp Me, HELP_SET, gc_Blank
End Sub


Private Sub optCurved_Click(Index As Integer)
    gc_Curved.Value = IIf(Index = 0, True, False)
    
    If gc_Curved.IsChanged Then
        CalcEngPerf
        LoadScreen
        gc_Curved.IsChanged = False
    End If
End Sub

Private Sub optCurved_GotFocus(Index As Integer)
    'setpanels Me, PNL_SAVE, gc_Blank
    SetHelp Me, HELP_SAVE, gc_Blank
End Sub

Private Sub optCurved_MouseMove(Index As Integer, Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Blank
    SetHelp Me, HELP_SET, gc_Blank
End Sub


Private Sub txtNoCyl_GotFocus()
    'setpanels Me, PNL_SAVE, gc_NoCyl
    SetHelp Me, HELP_SAVE, gc_NoCyl
End Sub

Private Sub txtNoCyl_KeyPress(KeyAscii As Integer)
    gc_NoCyl.TestNumericKeyPress KeyAscii, txtNoCyl
    If KeyAscii = vbKeyReturn Then
        txtNoCyl_LostFocus
        txtNoCyl.SelLength = Len(txtNoCyl.Text)
    End If
End Sub

Private Sub txtNoCyl_LostFocus()
    gc_NoCyl.Value = val(txtNoCyl.Text)
    If gc_NoCyl.IsChanged Then
        Select Case gc_NoCyl.Value
            Case 1, 3, 5, 7, 9, 11
                'force inline for all odd number of cylinder engines!
                If gc_Inline.Value > 0 Then
                    Beep
                    gc_Inline.Value = 0
                    SetConfig
                End If
        End Select
        
        'force IR for all single cylinder engines!
        If gc_NoCyl.Value = 1 And gc_Manifold.Value <> 2 Then
            Beep
            gc_Manifold.Value = 2
        End If
        
        SetCarbCFM
        CalcKCDGH
        
        CalcEngPerf
        LoadScreen
        gc_NoCyl.IsChanged = False
        If gc_NoCyl.IsError Then txtNoCyl.SetFocus
    Else
        txtNoCyl.Text = gc_NoCyl.Formatted
    End If
End Sub

Private Sub txtNoCyl_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_NoCyl
    SetHelp Me, HELP_SET, gc_NoCyl
End Sub


Private Sub txtBore_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Bore
    SetHelp Me, HELP_SAVE, gc_Bore
End Sub

Private Sub txtBore_KeyPress(KeyAscii As Integer)
    gc_Bore.TestNumericKeyPress KeyAscii, txtBore
    If KeyAscii = vbKeyReturn Then
        txtBore_LostFocus
        txtBore.SelLength = Len(txtBore.Text)
    End If
End Sub

Private Sub txtBore_LostFocus()
    gc_Bore.Value = val(txtBore.Text)
    If gc_Bore.IsChanged Then
        bore = gc_Bore.Value:   If Not gc_Bore.Inches Then bore = bore / ZM
        
        SetCarbCFM
        SetRefBore
        SetStroke
        SetValveDia
        TestValveDia
        SetMaxInFlow
        TestMaxInFlow
        SetCSArea
        SetVSWidth
        CalcKCDGH
        
        CalcEngPerf
        LoadScreen
        gc_Bore.IsChanged = False
        If gc_Bore.IsError Then txtBore.SetFocus
    Else
        txtBore.Text = gc_Bore.Formatted
    End If
End Sub

Private Sub txtBore_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Bore
    SetHelp Me, HELP_SET, gc_Bore
End Sub


Private Sub txtStroke_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Stroke
    SetHelp Me, HELP_SAVE, gc_Stroke
End Sub

Private Sub txtStroke_KeyPress(KeyAscii As Integer)
    gc_Stroke.TestNumericKeyPress KeyAscii, txtStroke
    If KeyAscii = vbKeyReturn Then
        txtStroke_LostFocus
        txtStroke.SelLength = Len(txtStroke.Text)
    End If
End Sub

Private Sub txtStroke_LostFocus()
Dim rod As Single
Dim vbReply As String
    'special test to see if current rod length will cause stroke MaxVal error
    rod = gc_Rod.Value:             If Not gc_Rod.Inches Then rod = rod / ZM
    
    If rod < 1.25 * stroke Then 'rod is now too short!
        With gc_Rod
            'format the txt box
            txtStroke.Text = Format(val(txtStroke.Text), gc_Stroke.ValFmt)
            
            vbReply = MsgBox("The current rod length of " & .Formatted & " " & .Unit & " is now too short for the stroke you just entered.  The piston will not clear the crankshaft at bottom dead center.  Will you be changing the rod length for this engine design?", vbExclamation + vbYesNo, "Rod Length Error!")
            If vbReply = vbYes Then
                rod = 1.25 * stroke
                If .Inches Then .Value = rod Else .Value = rod * ZM
                txtRod.Text = .Formatted
                SetStroke
            End If
        End With
    End If
    
    gc_Stroke.Value = val(txtStroke.Text)
    If gc_Stroke.IsChanged Then
        stroke = gc_Stroke.Value:   If Not gc_Stroke.Inches Then stroke = stroke / ZM
        
        SetCarbCFM
        SetRod
        CalcKCDGH
        
        CalcEngPerf
        LoadScreen
        gc_Stroke.IsChanged = False
        If gc_Stroke.IsError Then txtStroke.SetFocus
    Else
        txtStroke.Text = gc_Stroke.Formatted
    End If
End Sub

Private Sub txtStroke_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Stroke
    SetHelp Me, HELP_SET, gc_Stroke
End Sub


Private Sub txtRod_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Rod
    SetHelp Me, HELP_SAVE, gc_Rod
End Sub

Private Sub txtRod_KeyPress(KeyAscii As Integer)
    gc_Rod.TestNumericKeyPress KeyAscii, txtRod
    If KeyAscii = vbKeyReturn Then
        txtRod_LostFocus
        txtRod.SelLength = Len(txtRod.Text)
    End If
End Sub

Private Sub txtRod_LostFocus()
    gc_Rod.Value = val(txtRod.Text)
    If gc_Rod.IsChanged Then
        SetStroke
        
        CalcEngPerf
        LoadScreen
        gc_Rod.IsChanged = False
        If gc_Rod.IsError Then txtRod.SetFocus
    Else
        txtRod.Text = gc_Rod.Formatted
    End If
End Sub

Private Sub txtRod_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Rod
    SetHelp Me, HELP_SET, gc_Rod
End Sub


Private Sub txtCR_GotFocus()
    'setpanels Me, PNL_SAVE, gc_CR
    SetHelp Me, HELP_SAVE, gc_CR
End Sub

Private Sub txtCR_KeyPress(KeyAscii As Integer)
    gc_CR.TestNumericKeyPress KeyAscii, txtCR
    If KeyAscii = vbKeyReturn Then
        txtCR_LostFocus
        txtCR.SelLength = Len(txtCR.Text)
    End If
End Sub

Private Sub txtCR_LostFocus()
    gc_CR.Value = val(txtCR.Text)
    If gc_CR.IsChanged Then
        CalcEngPerf
        LoadScreen
        gc_CR.IsChanged = False
        If gc_CR.IsError Then txtCR.SetFocus
    Else
        txtCR.Text = gc_CR.Formatted
    End If
End Sub

Private Sub txtCR_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_CR
    SetHelp Me, HELP_SET, gc_CR
End Sub


Private Sub txtCarbCFM_GotFocus()
    'setpanels Me, PNL_SAVE, gc_CarbCFM
    SetHelp Me, HELP_SAVE, gc_CarbCFM
End Sub

Private Sub txtCarbCFM_KeyPress(KeyAscii As Integer)
    gc_CarbCFM.TestNumericKeyPress KeyAscii, txtCarbCFM
    If KeyAscii = vbKeyReturn Then
        txtCarbCFM_LostFocus
        txtCarbCFM.SelLength = Len(txtCarbCFM.Text)
    End If
End Sub

Private Sub txtCarbCFM_LostFocus()
    gc_CarbCFM.Value = val(txtCarbCFM.Text)
    If gc_CarbCFM.IsChanged Then
        CalcEngPerf
        LoadScreen
        gc_CarbCFM.IsChanged = False
        If gc_CarbCFM.IsError Then txtCarbCFM.SetFocus
    Else
        txtCarbCFM.Text = gc_CarbCFM.Formatted
    End If
End Sub

Private Sub txtCarbCFM_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_CarbCFM
    SetHelp Me, HELP_SET, gc_CarbCFM
End Sub


Private Sub txtFlowFactor_GotFocus()
    'setpanels Me, PNL_SAVE, gc_ManFlow
    SetHelp Me, HELP_SAVE, gc_ManFlow
End Sub

Private Sub txtFlowFactor_KeyPress(KeyAscii As Integer)
    gc_ManFlow.TestNumericKeyPress KeyAscii, txtFlowFactor
    If KeyAscii = vbKeyReturn Then
        txtFlowFactor_LostFocus
        txtFlowFactor.SelLength = Len(txtFlowFactor.Text)
    End If
End Sub

Private Sub txtFlowFactor_LostFocus()
    gc_ManFlow.Value = val(txtFlowFactor.Text)
    If gc_ManFlow.IsChanged Then
        CalcEngPerf
        LoadScreen
        gc_ManFlow.IsChanged = False
        If gc_ManFlow.IsError Then txtFlowFactor.SetFocus
    Else
        txtFlowFactor.Text = gc_ManFlow.Formatted
    End If
End Sub

Private Sub txtFlowFactor_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_ManFlow
    SetHelp Me, HELP_SET, gc_ManFlow
End Sub


Private Sub txtNoInValves_GotFocus()
    'setpanels Me, PNL_SAVE, gc_NoInValves
    SetHelp Me, HELP_SAVE, gc_NoInValves
End Sub

Private Sub txtNoInValves_KeyPress(KeyAscii As Integer)
    gc_NoInValves.TestNumericKeyPress KeyAscii, txtNoInValves
    If KeyAscii = vbKeyReturn Then
        txtNoInValves_LostFocus
        txtNoInValves.SelLength = Len(txtNoInValves.Text)
    End If
End Sub

Private Sub txtNoInValves_LostFocus()
    gc_NoInValves.Value = val(txtNoInValves.Text)
    If gc_NoInValves.IsChanged Then
        SetValveDia
        TestValveDia
        SetMaxInFlow
        TestMaxInFlow
        SetCSArea
        SetVSWidth
        
        CalcEngPerf
        LoadScreen
        gc_NoInValves.IsChanged = False
        If gc_NoInValves.IsError Then txtNoInValves.SetFocus
    Else
        txtNoInValves.Text = gc_NoInValves.Formatted
    End If
End Sub

Private Sub txtNoInValves_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_NoInValves
    SetHelp Me, HELP_SET, gc_NoInValves
End Sub


Private Sub txtValveDia_GotFocus()
    'setpanels Me, PNL_SAVE, gc_ValveDia
    SetHelp Me, HELP_SAVE, gc_ValveDia
End Sub

Private Sub txtValveDia_KeyPress(KeyAscii As Integer)
    gc_ValveDia.TestNumericKeyPress KeyAscii, txtValveDia
    If KeyAscii = vbKeyReturn Then
        txtValveDia_LostFocus
        txtValveDia.SelLength = Len(txtValveDia.Text)
    End If
End Sub

Private Sub txtValveDia_LostFocus()
    gc_ValveDia.Value = val(txtValveDia.Text)
    If gc_ValveDia.IsChanged Then
        SetMaxInFlow
        TestMaxInFlow
        SetValveLift
        SetSeatDia
        SetStemDia
        SetCSArea
        SetVSWidth
        
        CalcEngPerf
        LoadScreen
        gc_ValveDia.IsChanged = False
        If gc_ValveDia.IsError Then txtValveDia.SetFocus
    Else
        txtValveDia.Text = gc_ValveDia.Formatted
    End If
End Sub

Private Sub txtValveDia_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_ValveDia
    SetHelp Me, HELP_SET, gc_ValveDia
End Sub


Private Sub txtMaxInFlow_GotFocus()
    'setpanels Me, PNL_SAVE, gc_MaxInFlow
    SetHelp Me, HELP_SAVE, gc_MaxInFlow
End Sub

Private Sub txtMaxInFlow_KeyPress(KeyAscii As Integer)
    gc_MaxInFlow.TestNumericKeyPress KeyAscii, txtMaxInFlow
    If KeyAscii = vbKeyReturn Then
        txtMaxInFlow_LostFocus
        txtMaxInFlow.SelLength = Len(txtMaxInFlow.Text)
    End If
End Sub

Private Sub txtMaxInFlow_LostFocus()
Dim Work As Single
    gc_MaxInFlow.Value = val(txtMaxInFlow.Text)
    If gc_MaxInFlow.IsChanged Then
        SetCSArea
        
        'note:              gc_MaxInFlow.MaxVal includes 101% FVIndex.MaxVal
        Work = Round(0.98 * gc_MaxInFlow.MaxVal * (100 / gc_FVIndex.MaxVal), 1)
        If gc_MaxInFlow.Value > Work Then
            MsgBox "The maximum intake port flow you just entered exceeds 98% of the theoretical flow limit for a " & gc_ValveDia.Formatted & " diameter intake valve.  Only the very best ports from the very best head porters flow over 98%." & Chr(13) & Chr(13) & "Please check your flowbench data carefully!  A maximum intake port flow of " & Work & " CFM may be more realistic for a " & gc_ValveDia.Formatted & " intake valve diameter.", 64, "Maximum Intake Port Flow Warning!"
        End If
        
        CalcEngPerf
        LoadScreen
        gc_MaxInFlow.IsChanged = False
        If gc_MaxInFlow.IsError Then txtMaxInFlow.SetFocus
    Else
        txtMaxInFlow.Text = gc_MaxInFlow.Formatted
    End If
End Sub

Private Sub txtMaxInFlow_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_MaxInFlow
    SetHelp Me, HELP_SET, gc_MaxInFlow
End Sub


Private Sub txtDeltaP_GotFocus()
    'setpanels Me, PNL_SAVE, gc_DeltaP
    SetHelp Me, HELP_SAVE, gc_DeltaP
End Sub

Private Sub txtDeltaP_KeyPress(KeyAscii As Integer)
    gc_DeltaP.TestNumericKeyPress KeyAscii, txtDeltaP
    If KeyAscii = vbKeyReturn Then
        txtDeltaP_LostFocus
        txtDeltaP.SelLength = Len(txtDeltaP.Text)
    End If
End Sub

Private Sub txtDeltaP_LostFocus()
    gc_DeltaP.Value = val(txtDeltaP.Text)
    If gc_DeltaP.IsChanged Then
        SetCSArea
        CalcVelStd
        TestMaxInFlow
        
        CalcEngPerf
        LoadScreen
        gc_DeltaP.IsChanged = False
        If gc_DeltaP.IsError Then txtDeltaP.SetFocus
    Else
        txtDeltaP.Text = gc_DeltaP.Formatted
    End If
End Sub

Private Sub txtDeltaP_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_DeltaP
    SetHelp Me, HELP_SET, gc_DeltaP
End Sub


Private Sub txtRefBore_GotFocus()
    'setpanels Me, PNL_SAVE, gc_RefBore
    SetHelp Me, HELP_SAVE, gc_RefBore
End Sub

Private Sub txtRefBore_KeyPress(KeyAscii As Integer)
    gc_RefBore.TestNumericKeyPress KeyAscii, txtRefBore
    If KeyAscii = vbKeyReturn Then
        txtRefBore_LostFocus
        txtRefBore.SelLength = Len(txtRefBore.Text)
    End If
End Sub

Private Sub txtRefBore_LostFocus()
    gc_RefBore.Value = val(txtRefBore.Text)
    If gc_RefBore.IsChanged Then
        CalcEngPerf
        LoadScreen
        gc_RefBore.IsChanged = False
        If gc_RefBore.IsError Then txtRefBore.SetFocus
    Else
        txtRefBore.Text = gc_RefBore.Formatted
    End If
End Sub

Private Sub txtRefBore_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_RefBore
    SetHelp Me, HELP_SET, gc_RefBore
End Sub


Private Sub txtInCamDur_GotFocus()
    'setpanels Me, PNL_SAVE, gc_InCamDur
    SetHelp Me, HELP_SAVE, gc_InCamDur
End Sub

Private Sub txtInCamDur_KeyPress(KeyAscii As Integer)
    gc_InCamDur.TestNumericKeyPress KeyAscii, txtInCamDur
    If KeyAscii = vbKeyReturn Then
        txtInCamDur_LostFocus
        txtInCamDur.SelLength = Len(txtInCamDur.Text)
    End If
End Sub

Private Sub txtInCamDur_LostFocus()
    txtInCamDur.Text = Str(Round(val(txtInCamDur.Text), 2))
    gc_InCamDur.Value = val(txtInCamDur.Text)
    If gc_InCamDur.IsChanged Then
        CalcEngPerf
        LoadScreen
        gc_InCamDur.IsChanged = False
        If gc_InCamDur.IsError Then txtInCamDur.SetFocus
    Else
        txtInCamDur.Text = gc_InCamDur.Formatted
    End If
End Sub

Private Sub txtInCamDur_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_InCamDur
    SetHelp Me, HELP_SET, gc_InCamDur
End Sub


Public Sub LoadScreen()
Dim ZCFM As Single
Dim li As Integer
Dim cidfmt As String
Dim cidout As Single
    Label1(1).caption = "Bore Diameter - " & gc_Bore.Unit
    Label1(2).caption = "Stroke Length - " & gc_Stroke.Unit
    Label1(3).caption = "Rod Length - " & gc_Rod.Unit
    Label1(11).caption = "   @ Reference Bore Diameter - " & gc_RefBore.Unit
    Label1(16).caption = "Intake Valve Diameter - " & gc_ValveDia.Unit
    
    txtNoCyl.Text = gc_NoCyl.Formatted
    txtBore.Text = gc_Bore.Formatted
    txtStroke.Text = gc_Stroke.Formatted
    txtRod.Text = gc_Rod.Formatted
    txtCR.Text = gc_CR.Formatted
    
    li = gc_CamType.Value - gc_CamType.MinVal
    If cbxCamType.ListIndex <> li Then cbxCamType.ListIndex = li
    txtInCamDur.Text = gc_InCamDur.Formatted
    
    txtCarbCFM.Text = gc_CarbCFM.Formatted
    ZCFM = Round(gc_CarbCFM.Value * Sqr(3 / 1.5), 10)
    txtCarbCFM.ToolTipText = "Throttle CFM @ 3.0 inch Hg = " & Format(ZCFM, "0")
    Label1(5).ToolTipText = txtCarbCFM.ToolTipText
    
    li = gc_Fuel.Value - gc_Fuel.MinVal
    If cbxFuel.ListIndex <> li Then cbxFuel.ListIndex = li
    
    li = gc_Manifold.Value - gc_Manifold.MinVal
    If cbxManifold.ListIndex <> li Then cbxManifold.ListIndex = li
    txtFlowFactor.Text = gc_ManFlow.Formatted
    
    txtNoInValves.Text = gc_NoInValves.Formatted
    txtValveDia.Text = gc_ValveDia.Formatted
    txtMaxInFlow.Text = gc_MaxInFlow.Formatted
    txtDeltaP.Text = gc_DeltaP.Formatted
    txtRefBore.Text = gc_RefBore.Formatted
    
    If gc_Bore.Inches Or gc_Stroke.Inches Then
        cidout = CID:            cidfmt = "###.0 CID"
    Else
        cidout = CID * ZM3:      cidfmt = "##### c.c."
    End If
    Frame2.caption = "Estimated Performance for " & Trim(Format(cidout, cidfmt)) & " Engine"
    
    If gc_HP.Value >= 100 Then
        lblPeakHP.caption = gc_HP.Formatted
        lblPeakTQ.caption = gc_TQ.Formatted
    ElseIf gc_HP.Value >= 10 Then
        lblPeakHP.caption = Format(gc_HP.Value, "###.0")
        lblPeakTQ.caption = Format(gc_TQ.Value, "###.0")
    Else
        lblPeakHP.caption = Format(gc_HP.Value, "##.00")
        lblPeakTQ.caption = Format(gc_TQ.Value, "##.00")
    End If
    
    lblRPMPeakHP.caption = gc_RPMPeakHP.Formatted
    lblRPMPeakTQ.caption = gc_RPMPeakTQ.Formatted
    
    lblHPperCID.caption = gc_HPperCID.Formatted
    lblTQperCID.caption = gc_TQperCID.Formatted
    lblShift.caption = gc_Shift.Formatted
    lblRedline.caption = gc_Redline.Formatted

    If CID >= 6.1 Then
        lblliter.caption = Format(CID * ZM3 / 1000, "##.#0")
    Else
        lblliter.caption = Format(CID * ZM3 / 1000, "#.#00")
    End If
    
    If gc_HP.Value / 1.34102 >= 100 Then
        lblkW.caption = Format(gc_HP.Value / 1.34102, "#####")
        lblNm.caption = Format(gc_TQ.Value * 0.3048 * 4.44822, "#####")
    ElseIf gc_HP.Value / 1.34102 >= 10 Then
        lblkW.caption = Format(gc_HP.Value / 1.34102, "###.0")
        lblNm.caption = Format(gc_TQ.Value * 0.3048 * 4.44822, "###.0")
    Else
        lblkW.caption = Format(gc_HP.Value / 1.34102, "##.00")
        lblNm.caption = Format(gc_TQ.Value * 0.3048 * 4.44822, "##.00")
    End If
    
    bFileDirty = True
End Sub


Public Sub LoadFromFile(fn As String)
Dim ff As Integer, ofResult As Long
Dim ver As String, Note As String
Dim inline As Integer, ncyl As Integer
Dim ibore As Single, istroke As Single, rod As Single, CR As Single
Dim ifi As Integer, carb As Integer, ifuel As Integer
Dim iman As Integer, flowf As Single, curved As Integer
Dim niv As Integer, vd As Single, pif As Single, inh2o As Single, refbor As Single
Dim ctype As Integer, indur As Integer
Dim ccv As Single, dtk As Single, gtk As Single, pdv As Single
Dim nbbl As Single, tdia As Single, vdia As Single, ttype As Integer, ZCarb As Single
Dim nbblS As Single, tdiaS As Single, vdiaS As Single
Dim vl As Single, va As Single, vv As Single, vvi As Single
Dim vsd As Single, vstmd As Single, vsa As Single, vswd As Single
Dim c(0 To 1) As Single, E(0 To 2) As Single, R(0 To 3) As Single, A(0 To 2) As Single
Dim xl(0 To 9) As Single, yf(0 To 9) As Single, i As Integer
    On Error GoTo BadFileType
    
LoadFile:                    'load file named fn
    bFileExists = False
    'make sure the file exists
    If fn = "" Then Exit Sub
    
    ofResult = OpenFile(fn, g_ofstruct, OF_EXIST)
    If ofResult = -1 Then Exit Sub
    
    'set default values for reading old data files
    nbblS = 0:  tdiaS = 0:  vdiaS = 0
    vsa = 45:   vswd = 0.08
    c(0) = 0:    c(1) = 0
    E(0) = 0:    E(1) = 0:    E(2) = 0
    R(0) = 0:    R(1) = 0:    R(2) = 0:    R(3) = 0
    A(0) = 0:    A(1) = 0:    A(2) = 0
    For i = 0 To 9:     xl(i) = 0: yf(i) = 0:   Next
    
    ff = FreeFile
    Open fn For Input As ff
    Input #ff, ver
    Input #ff, Note
    txtNote.Text = Note
    
    If ver = "3" Or ver = "3.0.1" Or ver = "3.1" Then
        Input #ff, inline, ncyl, ibore, istroke, rod, CR
        Input #ff, ctype, indur, ifi, carb, ifuel
        Input #ff, iman, curved, flowf
        Input #ff, niv, vd, pif, inh2o, refbor
        Input #ff, vl, va
        Input #ff, ccv, dtk, gtk, pdv
        Input #ff, nbbl, tdia, vdia, ttype
        
        If ver = "3.0.1" Or ver = "3.1" Then
            Input #ff, nbblS, tdiaS, vdiaS
        End If
        
        If ver = "3.1" Then
            Input #ff, vsd, vstmd, vsa, vswd
        Else
            Input #ff, vsd, vstmd
        End If
        
        Input #ff, c(0), c(1)
        Input #ff, E(0), E(1), E(2)
        Input #ff, R(0), R(1), R(2), R(3)
        Input #ff, A(0), A(1), A(2)
        
        If ver = "3.1" Then
            Input #ff, xl(0), xl(1), xl(2), xl(3), xl(4)
            Input #ff, xl(5), xl(6), xl(7), xl(8), xl(9)
            Input #ff, yf(0), yf(1), yf(2), yf(3), yf(4)
            Input #ff, yf(5), yf(6), yf(7), yf(8), yf(9)
        End If
        Close #ff
        
        If ver = "3.1" Then
            gc_Inline.Value = inline
        Else
            gc_Inline.Value = inline + 1
        End If
        
        gc_Carb.Value = IIf(ifi = -1, True, False)
        gc_Fuel.Value = ifuel
        gc_Manifold.Value = iman
        gc_Curved.Value = IIf(curved = -1, True, False)
        gc_TBType.Value = IIf(ttype = -1, True, False)
    
    Else
        Input #ff, ncyl, ibore, istroke, rod, CR, carb, iman
        Input #ff, niv, pif, inh2o, refbor, flowf, ctype, indur
        Input #ff, vd, vl, va, vv, vvi
        Input #ff, dtk, gtk, pdv, ccv
        Input #ff, nbbl, tdia, vdia, ttype, ZCarb
        Input #ff, vsd, vstmd, ZCarb
        Close #ff
    
        'this stuff to make WINDOWS read old DOS data files properly
        If ibore < 0 Then ibore = -ibore * ZM:          gc_Bore.Inches = False
        If istroke < 0 Then istroke = -istroke * ZM:    gc_Stroke.Inches = False
        If rod < 0 Then rod = -rod * ZM:                gc_Rod.Inches = False
        If refbor = 0 Then refbor = ibore:              gc_RefBore.Inches = gc_Bore.Inches
        If refbor < 0 Then refbor = -refbor * ZM:       gc_RefBore.Inches = False
        If vd < 0 Then vd = -vd * ZM:                   gc_ValveDia.Inches = False
        If tdia < 0 Then tdia = -tdia:                  gc_TBDia.Inches = False
        If vdia < 0 Then vdia = -vdia:                  gc_TVDia.Inches = False
        If vsd < 0 Then vsd = -vsd:                     gc_SeatDia.Inches = False
        
        'new version 3.0 and 3.1 stuff
        Select Case ncyl
            Case 1, 2, 3, 4, 5, 7, 9, 11: gc_Inline.Value = 0
            Case 6, 8, 10, 12:            gc_Inline.Value = 1
        End Select
        
        gc_Carb.Value = True
        gc_Fuel.Value = 1
        
        Select Case iman
            Case 0: gc_Curved.Value = True
            Case 1: gc_Curved.Value = False
            Case 2: gc_Curved.Value = True
        End Select
        
        If ncyl = 1 Then
            gc_Manifold.Value = iman + 1
        Else
            gc_Manifold.Value = 2
        End If
        
        gc_TBType.Value = IIf(ttype = 0, True, False)
    End If
    
    'load the local variables into the global variables
    gc_NoCyl.Value = ncyl
    
    SetConfig
    SetCarb
    SetRunner
    
    gc_Bore.Value = ibore
    bore = gc_Bore.Value:       If Not gc_Bore.Inches Then bore = bore / ZM
    
    SetRefBore
    gc_Stroke.HasMinMax = False
    gc_Rod.HasMinMax = False
    gc_Stroke.Value = istroke
    stroke = gc_Stroke.Value:   If Not gc_Stroke.Inches Then stroke = stroke / ZM
    
    SetRod
    gc_Rod.Value = rod
    SetStroke
    gc_Stroke.HasMinMax = True
    gc_Rod.HasMinMax = True
    gc_CR.Value = CR
    SetCarbCFM
    gc_CarbCFM.Value = carb
    
    'new version 3.0.1 stuff
    If ver = "3.0.1" Or ver = "3.1" Or ctype <= 2 Then
        gc_CamType.Value = ctype
    Else
        gc_CamType.Value = ctype + 1
    End If
    
    gc_InCamDur.Value = indur:      SetNIV
    
    gc_NoInValves.Value = niv:      SetValveDia
    gc_ValveDia.Value = vd:         SetValveLift: SetSeatDia:   SetStemDia
    gc_DeltaP.Value = inh2o:        CalcVelStd
    gc_MaxInFlow.Value = pif:       gc_RefBore.Value = refbor:  SetCSArea
    gc_ManFlow.Value = flowf
                
    gc_SeatDia.Value = vsd:         CalcSeatPer
    gc_ValveLift.Value = vl:        gc_StemDia.Value = vstmd
    
    gc_CSArea.Value = va:           gc_CSArea.Value = val(gc_CSArea.Formatted)
    gc_VSAngle.Value = vsa:         gc_VSWidth.Value = vswd:    SetVSWidth
    
    gc_Deck.Value = dtk:            gc_Gasket.Value = gtk
    gc_Chamber.HasMinMax = False:   gc_Dome.HasMinMax = False
    gc_Chamber.Value = ccv:         gc_Dome.Value = pdv
    CalcKCDGH
    gc_Chamber.HasMinMax = True:    gc_Dome.HasMinMax = True
    
    If nbbl > 0 Then
        gc_NoTB.Value = nbbl
        gc_TBDia.Value = tdia:      SetTVDia
        gc_TVDia.Value = vdia
    End If
    
    If nbblS > 0 Then
        gc_NoTBS.Value = nbblS
        gc_TBDiaS.Value = tdiaS:    SetTVDiaS
        gc_TVDiaS.Value = vdiaS
    End If
    
    gc_C(0).Value = c(0):       gc_C(1).Value = c(1)
            
    gc_E(0).Value = E(0):       gc_E(1).Value = E(1):      gc_E(2).Value = E(2)
    
    gc_R(0).Value = R(0):       gc_R(1).Value = R(1)
    gc_R(2).Value = R(2):       gc_R(3).Value = R(3)
    
    gc_A(0).Value = A(0):       gc_A(1).Value = A(1):       gc_A(2).Value = A(2)
    
    'new ENGINE Pro version 3.1 stuff
    #If ISENGINEPRO Then
        For i = 0 To 9
            gc_IntLift(i).Value = xl(i)
            gc_IntFlow(i).Value = yf(i)
        Next
    #End If
    
    ofn = fn:                       lastfile = ofn
    
    CalcEngPerf
    LoadScreen
    bFileExists = True:             bFileDirty = False
    Exit Sub

BadFileType:
    MsgBox "Bad file type/format.  Data file must be in *.ENG format.", 32, "Data File Error!"
    
    If lastfile = "(Untitled)" Then
        Form_Load
    Else
        ofn = lastfile:  Me.caption = App.Title & " - " & NameOnly(ofn)
        fn = ofn:        GoTo LoadFile
    End If
    
    Exit Sub
    Resume Next
End Sub

Private Sub SaveToFile(fn As String)
Dim ff As Integer
Dim Note As String
Dim Work As Single
    bFileExists = False
    If fn = "" Then Exit Sub
    
    Note = ReplaceComma(txtNote.Text)
    Note = Trim(Note & " ")
    
    ff = FreeFile
    Open fn For Output As ff
        Print #ff, "3.1"
        Print #ff, Note
        Print #ff, gc_Inline.Value, gc_NoCyl.Value, gc_Bore.Value, gc_Stroke.Value, gc_Rod.Value, gc_CR.Value
        Print #ff, gc_CamType.Value, gc_InCamDur.Value, gc_Carb.Value, gc_CarbCFM.Value, gc_Fuel.Value
        Print #ff, gc_Manifold.Value, gc_Curved.Value, gc_ManFlow.Value
        Print #ff, gc_NoInValves.Value, gc_ValveDia.Value, gc_MaxInFlow.Value, gc_DeltaP.Value, gc_RefBore.Value
        Print #ff, gc_ValveLift.Value, gc_CSArea.Value
        Print #ff, gc_Chamber.Value, gc_Deck.Value, gc_Gasket.Value, gc_Dome.Value
        Print #ff, gc_NoTB.Value, gc_TBDia.Value, gc_TVDia.Value, gc_TBType.Value
        Print #ff, gc_NoTBS.Value, gc_TBDiaS.Value, gc_TVDiaS.Value
        Print #ff, gc_SeatDia.Value, gc_StemDia.Value, gc_VSAngle.Value, gc_VSWidth.Value
        Print #ff, gc_C(0).Value, gc_C(1).Value
        Print #ff, gc_E(0).Value, gc_E(1).Value, gc_E(2).Value
        Print #ff, gc_R(0).Value, gc_R(1).Value, gc_R(2).Value, gc_R(3).Value
        Print #ff, gc_A(0).Value, gc_A(1).Value, gc_A(2).Value
    
        #If ISENGINEPRO Then
            Print #ff, gc_IntLift(0).Value, gc_IntLift(1).Value, gc_IntLift(2).Value, gc_IntLift(3).Value, gc_IntLift(4).Value
            Print #ff, gc_IntLift(5).Value, gc_IntLift(6).Value, gc_IntLift(7).Value, gc_IntLift(8).Value, gc_IntLift(9).Value
            Print #ff, gc_IntFlow(0).Value, gc_IntFlow(1).Value, gc_IntFlow(2).Value, gc_IntFlow(3).Value, gc_IntFlow(4).Value
            Print #ff, gc_IntFlow(5).Value, gc_IntFlow(6).Value, gc_IntFlow(7).Value, gc_IntFlow(8).Value, gc_IntFlow(9).Value
        #Else
            Work = 0
            Print #ff, Work, Work, Work, Work, Work
            Print #ff, Work, Work, Work, Work, Work
            Print #ff, Work, Work, Work, Work, Work
            Print #ff, Work, Work, Work, Work, Work
        #End If
    Close #ff
    
    bFileExists = True:            bFileDirty = False
End Sub

Private Sub SetConfig()
    Select Case gc_Inline.Value
        Case 0  'Inline
            optInline(0).Value = True
            optInline(1).Value = False
            optInline(2).Value = False
        Case 1  'Vee
            optInline(0).Value = False
            optInline(1).Value = True
            optInline(2).Value = False
        Case 2  'Flat
            optInline(0).Value = False
            optInline(1).Value = False
            optInline(2).Value = True
    End Select
End Sub

Private Sub SetCarb()
    optCarb(0).Value = gc_Carb.Value
    optCarb(1).Value = Not gc_Carb.Value
End Sub

Private Sub SetRunner()
    optCurved(0).Value = gc_Curved.Value
    optCurved(1).Value = Not gc_Curved.Value
End Sub

Public Sub SetfrmGraph()
    With gc_Graph
        .PeakHP = gc_HP.Value
        .RPMHP = gc_RPMPeakHP.Value
        .PeakTQ = gc_TQ.Value
        .RPMTQ = gc_RPMPeakTQ.Value
        .Gtype = 1
    End With
End Sub

Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property

Private Function TestDirty() As Integer 'vbCancel = 2
    TestDirty = vbNo                    'vbNo = 7
    If bFileDirty Then                  'vbYes = 6
        TestDirty = MsgBox("Do you want to save the current data?", vbInformation + vbYesNoCancel, "Input Data Has Changed!")
        If TestDirty = vbYes Then
            If bFileExists Then
                mnufile_Click 1
            Else
                mnufile_Click 2
            End If
        End If
    End If
End Function
