VERSION 5.00
Begin VB.Form frmQuarter 
   BorderStyle     =   0  'None
   Caption         =   "Input Data"
   ClientHeight    =   6600
   ClientLeft      =   15
   ClientTop       =   1005
   ClientWidth     =   9540
   ControlBox      =   0   'False
   Icon            =   "QUARTER.frx":0000
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MDIChild        =   -1  'True
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   6600
   ScaleWidth      =   9540
   ShowInTaskbar   =   0   'False
   Begin VB.TextBox txtEngineTQ 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   9
      Left            =   5160
      MaxLength       =   7
      TabIndex        =   48
      Top             =   3120
      Width           =   540
   End
   Begin VB.TextBox txtEngineTQ 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   10
      Left            =   5160
      MaxLength       =   7
      TabIndex        =   49
      Top             =   3420
      Width           =   540
   End
   Begin VB.TextBox txtEngineTQ 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   11
      Left            =   5160
      MaxLength       =   7
      TabIndex        =   50
      Top             =   3720
      Width           =   540
   End
   Begin VB.TextBox txtEngineTQ 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   1
      Left            =   5160
      MaxLength       =   7
      TabIndex        =   40
      Top             =   720
      Width           =   540
   End
   Begin VB.TextBox txtEngineTQ 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   2
      Left            =   5160
      MaxLength       =   7
      TabIndex        =   41
      Top             =   1020
      Width           =   540
   End
   Begin VB.TextBox txtEngineTQ 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   3
      Left            =   5160
      MaxLength       =   7
      TabIndex        =   42
      Top             =   1320
      Width           =   540
   End
   Begin VB.TextBox txtEngineTQ 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   4
      Left            =   5160
      MaxLength       =   7
      TabIndex        =   43
      Top             =   1620
      Width           =   540
   End
   Begin VB.TextBox txtEngineTQ 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   5
      Left            =   5160
      MaxLength       =   7
      TabIndex        =   44
      Top             =   1920
      Width           =   540
   End
   Begin VB.TextBox txtEngineTQ 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   6
      Left            =   5160
      MaxLength       =   7
      TabIndex        =   45
      Top             =   2220
      Width           =   540
   End
   Begin VB.TextBox txtEngineTQ 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   7
      Left            =   5160
      MaxLength       =   7
      TabIndex        =   46
      Top             =   2520
      Width           =   540
   End
   Begin VB.TextBox txtEngineTQ 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   8
      Left            =   5160
      MaxLength       =   7
      TabIndex        =   47
      Top             =   2820
      Width           =   540
   End
   Begin VB.TextBox txtEngineHP 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   9
      Left            =   4560
      MaxLength       =   7
      TabIndex        =   37
      Top             =   3120
      Width           =   540
   End
   Begin VB.TextBox txtEngineHP 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   10
      Left            =   4560
      MaxLength       =   7
      TabIndex        =   38
      Top             =   3420
      Width           =   540
   End
   Begin VB.TextBox txtEngineHP 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   11
      Left            =   4560
      MaxLength       =   7
      TabIndex        =   39
      Top             =   3720
      Width           =   540
   End
   Begin VB.TextBox txtEngineHP 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   1
      Left            =   4560
      MaxLength       =   7
      TabIndex        =   29
      Top             =   720
      Width           =   540
   End
   Begin VB.TextBox txtEngineHP 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   2
      Left            =   4560
      MaxLength       =   7
      TabIndex        =   30
      Top             =   1020
      Width           =   540
   End
   Begin VB.TextBox txtEngineHP 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   3
      Left            =   4560
      MaxLength       =   7
      TabIndex        =   31
      Top             =   1320
      Width           =   540
   End
   Begin VB.TextBox txtEngineHP 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   4
      Left            =   4560
      MaxLength       =   7
      TabIndex        =   32
      Top             =   1620
      Width           =   540
   End
   Begin VB.TextBox txtEngineHP 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   5
      Left            =   4560
      MaxLength       =   7
      TabIndex        =   33
      Top             =   1920
      Width           =   540
   End
   Begin VB.TextBox txtEngineHP 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   6
      Left            =   4560
      MaxLength       =   7
      TabIndex        =   34
      Top             =   2220
      Width           =   540
   End
   Begin VB.TextBox txtEngineHP 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   7
      Left            =   4560
      MaxLength       =   7
      TabIndex        =   35
      Top             =   2520
      Width           =   540
   End
   Begin VB.TextBox txtEngineHP 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   8
      Left            =   4560
      MaxLength       =   7
      TabIndex        =   36
      Top             =   2820
      Width           =   540
   End
   Begin VB.TextBox txtEngineRPM 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   9
      Left            =   3960
      MaxLength       =   7
      TabIndex        =   26
      Top             =   3120
      Width           =   540
   End
   Begin VB.TextBox txtEngineRPM 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   10
      Left            =   3960
      MaxLength       =   7
      TabIndex        =   27
      Top             =   3420
      Width           =   540
   End
   Begin VB.TextBox txtEngineRPM 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   11
      Left            =   3960
      MaxLength       =   7
      TabIndex        =   28
      Top             =   3720
      Width           =   540
   End
   Begin VB.TextBox txtEngineRPM 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   8
      Left            =   3960
      MaxLength       =   7
      TabIndex        =   25
      Top             =   2820
      Width           =   540
   End
   Begin VB.TextBox txtEngineRPM 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   7
      Left            =   3960
      MaxLength       =   7
      TabIndex        =   24
      Top             =   2520
      Width           =   540
   End
   Begin VB.TextBox txtEngineRPM 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   6
      Left            =   3960
      MaxLength       =   7
      TabIndex        =   23
      Top             =   2220
      Width           =   540
   End
   Begin VB.TextBox txtEngineRPM 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   5
      Left            =   3960
      MaxLength       =   7
      TabIndex        =   22
      Top             =   1920
      Width           =   540
   End
   Begin VB.TextBox txtEngineRPM 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   4
      Left            =   3960
      MaxLength       =   7
      TabIndex        =   21
      Top             =   1620
      Width           =   540
   End
   Begin VB.TextBox txtEngineRPM 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   3
      Left            =   3960
      MaxLength       =   7
      TabIndex        =   20
      Top             =   1320
      Width           =   540
   End
   Begin VB.TextBox txtEngineRPM 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   2
      Left            =   3960
      MaxLength       =   7
      TabIndex        =   19
      Top             =   1020
      Width           =   540
   End
   Begin VB.TextBox txtEngineRPM 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   1
      Left            =   3960
      MaxLength       =   7
      TabIndex        =   18
      Top             =   720
      Width           =   540
   End
   Begin VB.TextBox txtShiftRPM 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   6
      Left            =   8760
      MaxLength       =   7
      TabIndex        =   77
      Top             =   4020
      Width           =   540
   End
   Begin VB.TextBox txtShiftRPM 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   5
      Left            =   8760
      MaxLength       =   7
      TabIndex        =   76
      Top             =   3720
      Width           =   540
   End
   Begin VB.TextBox txtShiftRPM 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   4
      Left            =   8760
      MaxLength       =   7
      TabIndex        =   75
      Top             =   3420
      Width           =   540
   End
   Begin VB.TextBox txtShiftRPM 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   3
      Left            =   8760
      MaxLength       =   7
      TabIndex        =   74
      Top             =   3120
      Width           =   540
   End
   Begin VB.TextBox txtShiftRPM 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   2
      Left            =   8760
      MaxLength       =   7
      TabIndex        =   73
      Top             =   2820
      Width           =   540
   End
   Begin VB.TextBox txtShiftRPM 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   1
      Left            =   8760
      MaxLength       =   7
      TabIndex        =   72
      Top             =   2520
      Width           =   540
   End
   Begin VB.TextBox txtTransEff 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   6
      Left            =   8040
      MaxLength       =   7
      TabIndex        =   71
      Top             =   4020
      Width           =   540
   End
   Begin VB.TextBox txtTransEff 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   5
      Left            =   8040
      MaxLength       =   7
      TabIndex        =   70
      Top             =   3720
      Width           =   540
   End
   Begin VB.TextBox txtTransEff 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   4
      Left            =   8040
      MaxLength       =   7
      TabIndex        =   69
      Top             =   3420
      Width           =   540
   End
   Begin VB.TextBox txtTransEff 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   3
      Left            =   8040
      MaxLength       =   7
      TabIndex        =   68
      Top             =   3120
      Width           =   540
   End
   Begin VB.TextBox txtTransEff 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   2
      Left            =   8040
      MaxLength       =   7
      TabIndex        =   67
      Top             =   2820
      Width           =   540
   End
   Begin VB.TextBox txtTransEff 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   1
      Left            =   8040
      MaxLength       =   7
      TabIndex        =   66
      Top             =   2520
      Width           =   540
   End
   Begin VB.TextBox txtTransGR 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   1
      Left            =   7320
      MaxLength       =   7
      TabIndex        =   60
      Top             =   2520
      Width           =   540
   End
   Begin VB.TextBox txtTransGR 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   2
      Left            =   7320
      MaxLength       =   7
      TabIndex        =   61
      Top             =   2820
      Width           =   540
   End
   Begin VB.TextBox txtTransGR 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   3
      Left            =   7320
      MaxLength       =   7
      TabIndex        =   62
      Top             =   3120
      Width           =   540
   End
   Begin VB.TextBox txtTransGR 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   4
      Left            =   7320
      MaxLength       =   7
      TabIndex        =   63
      Top             =   3420
      Width           =   540
   End
   Begin VB.TextBox txtTransGR 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   5
      Left            =   7320
      MaxLength       =   7
      TabIndex        =   64
      Top             =   3720
      Width           =   540
   End
   Begin VB.TextBox txtTransGR 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   6
      Left            =   7320
      MaxLength       =   7
      TabIndex        =   65
      Top             =   4020
      Width           =   540
   End
   Begin VB.CheckBox chkLockup 
      Height          =   210
      Left            =   9030
      TabIndex        =   149
      Top             =   1680
      Width           =   240
   End
   Begin VB.CommandButton btnRecalc 
      Caption         =   "Recalc"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   315
      Left            =   5580
      TabIndex        =   145
      Top             =   4470
      Width           =   765
   End
   Begin VB.OptionButton optTransType 
      Alignment       =   1  'Right Justify
      Caption         =   "Torque Converter"
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
      Index           =   0
      Left            =   6660
      TabIndex        =   144
      ToolTipText     =   "Press this option button for a torque converter style transmission"
      Top             =   540
      Width           =   1860
   End
   Begin VB.OptionButton optTransType 
      Alignment       =   1  'Right Justify
      Caption         =   "Clutch"
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
      Left            =   8520
      TabIndex        =   143
      ToolTipText     =   "Press this option button for a clutch type transmission"
      Top             =   540
      Width           =   900
   End
   Begin VB.TextBox txtXCG 
      Height          =   285
      Left            =   5130
      MaxLength       =   7
      TabIndex        =   139
      Top             =   6270
      Width           =   540
   End
   Begin VB.TextBox txtYCG 
      Height          =   285
      Left            =   2310
      MaxLength       =   7
      TabIndex        =   138
      Top             =   6270
      Width           =   540
   End
   Begin VB.TextBox txtStaticFWt 
      Height          =   285
      Left            =   7830
      MaxLength       =   7
      TabIndex        =   142
      Top             =   6270
      Width           =   540
   End
   Begin VB.TextBox txtOverhang 
      Height          =   285
      Left            =   2310
      MaxLength       =   7
      TabIndex        =   13
      Top             =   3810
      Width           =   540
   End
   Begin VB.PictureBox picGraph 
      BorderStyle     =   0  'None
      Height          =   300
      Left            =   6000
      ScaleHeight     =   300
      ScaleWidth      =   300
      TabIndex        =   135
      TabStop         =   0   'False
      Top             =   600
      Visible         =   0   'False
      Width           =   300
   End
   Begin VB.TextBox txtTrackTemp 
      Height          =   285
      Left            =   2310
      MaxLength       =   7
      TabIndex        =   7
      Top             =   2205
      Width           =   540
   End
   Begin VB.TextBox txtWindAngle 
      Height          =   285
      Left            =   2310
      MaxLength       =   7
      TabIndex        =   6
      Top             =   1815
      Width           =   540
   End
   Begin VB.ComboBox cbxTrack 
      Height          =   315
      Left            =   780
      Style           =   2  'Dropdown List
      TabIndex        =   8
      Top             =   2040
      Width           =   2070
   End
   Begin VB.CommandButton btnDynoData 
      Height          =   300
      Left            =   5970
      Picture         =   "QUARTER.frx":030A
      Style           =   1  'Graphical
      TabIndex        =   85
      ToolTipText     =   "Press this button to display the Engine Dyno Data Graph"
      Top             =   3750
      Width           =   300
   End
   Begin VB.CommandButton btnDragCoef 
      Caption         =   "?"
      Height          =   270
      Left            =   4830
      TabIndex        =   87
      ToolTipText     =   "Press this button to display Help for the Drag Coefficient"
      Top             =   5355
      Width           =   270
   End
   Begin VB.TextBox txtNote 
      Height          =   285
      Left            =   660
      TabIndex        =   0
      Top             =   0
      Width           =   8790
   End
   Begin VB.CommandButton btnGearRatio 
      Caption         =   "..."
      Height          =   270
      Left            =   2010
      TabIndex        =   83
      ToolTipText     =   "Press this button to display the Motorcycle Final Drive Gear Ratio Worksheet"
      Top             =   4335
      Visible         =   0   'False
      Width           =   270
   End
   Begin VB.ComboBox cbxFuelSystem 
      Height          =   315
      Left            =   4290
      Style           =   2  'Dropdown List
      TabIndex        =   51
      Top             =   4125
      Width           =   2070
   End
   Begin VB.CommandButton btnTiresPMI 
      Caption         =   "..."
      Height          =   270
      Left            =   8550
      TabIndex        =   90
      ToolTipText     =   "Press this button to display the Final Drive PMI Worksheet"
      Top             =   5625
      Width           =   270
   End
   Begin VB.CommandButton btnTransPMI 
      Caption         =   "..."
      Height          =   270
      Left            =   8550
      TabIndex        =   89
      ToolTipText     =   "Press this button to display the Transmission PMI worksheet"
      Top             =   5355
      Width           =   270
   End
   Begin VB.TextBox txtEnginePMI 
      Height          =   285
      Left            =   8850
      MaxLength       =   7
      TabIndex        =   78
      Top             =   5070
      Width           =   540
   End
   Begin VB.TextBox txtTransPMI 
      Height          =   285
      Left            =   8850
      MaxLength       =   7
      TabIndex        =   79
      Top             =   5340
      Width           =   540
   End
   Begin VB.TextBox txtTiresPMI 
      Height          =   285
      Left            =   8850
      MaxLength       =   7
      TabIndex        =   80
      Top             =   5610
      Width           =   540
   End
   Begin VB.CommandButton btnEnginePMI 
      Caption         =   "..."
      Height          =   270
      Left            =   8550
      TabIndex        =   88
      ToolTipText     =   "Press this button to display the Engine PMI Worksheet"
      Top             =   5085
      Width           =   270
   End
   Begin VB.TextBox txtHPTQMult 
      Height          =   285
      Left            =   5010
      MaxLength       =   7
      TabIndex        =   52
      Top             =   4485
      Width           =   540
   End
   Begin VB.CommandButton btnRefArea 
      Caption         =   "..."
      Height          =   270
      Left            =   4830
      TabIndex        =   86
      ToolTipText     =   "Press this button to display the Frontal Area Worksheet"
      Top             =   5085
      Width           =   270
   End
   Begin VB.TextBox txtLift 
      Height          =   285
      Left            =   5130
      MaxLength       =   7
      TabIndex        =   55
      Top             =   5610
      Width           =   540
   End
   Begin VB.TextBox txtDrag 
      Height          =   285
      Left            =   5130
      MaxLength       =   7
      TabIndex        =   54
      Top             =   5340
      Width           =   540
   End
   Begin VB.TextBox txtRefArea 
      Height          =   285
      Left            =   5130
      MaxLength       =   7
      TabIndex        =   53
      Top             =   5070
      Width           =   540
   End
   Begin VB.TextBox txtSlippage 
      Height          =   285
      Left            =   8850
      MaxLength       =   7
      TabIndex        =   58
      Top             =   1335
      Width           =   540
   End
   Begin VB.TextBox txtTorqueMult 
      Height          =   285
      Left            =   8850
      MaxLength       =   7
      TabIndex        =   59
      Top             =   1905
      Width           =   540
   End
   Begin VB.TextBox txtEfficiency 
      Height          =   285
      Left            =   2310
      MaxLength       =   7
      TabIndex        =   15
      Top             =   4590
      Width           =   540
   End
   Begin VB.TextBox txtTractionIndex 
      Height          =   285
      Left            =   2310
      MaxLength       =   7
      TabIndex        =   9
      Top             =   2475
      Width           =   540
   End
   Begin VB.TextBox txtTireWidth 
      Height          =   285
      Left            =   2310
      MaxLength       =   7
      TabIndex        =   17
      Top             =   5130
      Width           =   540
   End
   Begin VB.CommandButton btnTractionIndex 
      Caption         =   "?"
      Height          =   270
      Left            =   2010
      TabIndex        =   82
      ToolTipText     =   "Press this button to display Help for the Traction Index"
      Top             =   2490
      Width           =   270
   End
   Begin VB.CommandButton btnTireWidth 
      Caption         =   "..."
      Height          =   270
      Left            =   2010
      TabIndex        =   84
      ToolTipText     =   "Press this button to display the Tire Width Worksheet"
      Top             =   5145
      Width           =   270
   End
   Begin VB.TextBox txtTireDia 
      Height          =   285
      Left            =   2310
      MaxLength       =   7
      TabIndex        =   16
      Top             =   4860
      Width           =   540
   End
   Begin VB.TextBox txtGearRatio 
      Height          =   285
      Left            =   2310
      MaxLength       =   7
      TabIndex        =   14
      Top             =   4320
      Width           =   540
   End
   Begin VB.TextBox txtLaunchRPM 
      Height          =   285
      Left            =   8850
      MaxLength       =   7
      TabIndex        =   56
      Top             =   765
      Width           =   540
   End
   Begin VB.TextBox txtSlipStallRPM 
      Height          =   285
      Left            =   8850
      MaxLength       =   7
      TabIndex        =   57
      Top             =   1050
      Width           =   540
   End
   Begin VB.CommandButton btnWindAngle 
      Caption         =   "?"
      Height          =   270
      Left            =   2010
      TabIndex        =   81
      ToolTipText     =   "Press this button to display the Wind Speed Worksheet"
      Top             =   1830
      Width           =   270
   End
   Begin VB.TextBox txtRollout 
      Height          =   285
      Left            =   2310
      MaxLength       =   7
      TabIndex        =   12
      Top             =   3540
      Width           =   540
   End
   Begin VB.TextBox txtWheelbase 
      Height          =   285
      Left            =   2310
      MaxLength       =   7
      TabIndex        =   11
      Top             =   3270
      Width           =   540
   End
   Begin VB.TextBox txtWeight 
      Height          =   285
      Left            =   2310
      MaxLength       =   7
      TabIndex        =   10
      Top             =   3000
      Width           =   540
   End
   Begin VB.TextBox txtWindSpeed 
      Height          =   285
      Left            =   2310
      MaxLength       =   7
      TabIndex        =   5
      Top             =   1545
      Width           =   540
   End
   Begin VB.TextBox txtHumidity 
      Height          =   285
      Left            =   2310
      MaxLength       =   7
      TabIndex        =   4
      Top             =   1275
      Width           =   540
   End
   Begin VB.TextBox txtBarometer 
      Height          =   285
      Left            =   2310
      MaxLength       =   7
      TabIndex        =   2
      Top             =   735
      Width           =   540
   End
   Begin VB.TextBox txtTemperature 
      Height          =   285
      Left            =   2310
      MaxLength       =   7
      TabIndex        =   3
      Top             =   1005
      Width           =   540
   End
   Begin VB.TextBox txtElevation 
      Height          =   285
      Left            =   2310
      MaxLength       =   7
      TabIndex        =   1
      Top             =   465
      Width           =   540
   End
   Begin VB.Label label1 
      Caption         =   "Lock-up option?"
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
      Index           =   12
      Left            =   6750
      TabIndex        =   150
      Top             =   1665
      Width           =   2100
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00FFFFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(2)"
      Height          =   300
      Index           =   2
      Left            =   8550
      TabIndex        =   148
      Top             =   5985
      Width           =   900
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00FFFFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(1)"
      Height          =   300
      Index           =   1
      Left            =   7620
      TabIndex        =   147
      Top             =   5985
      Width           =   900
   End
   Begin VB.Label lblHELP 
      BackColor       =   &H00FFFFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(0)"
      Height          =   300
      Index           =   0
      Left            =   60
      TabIndex        =   146
      Top             =   5985
      Width           =   7560
   End
   Begin VB.Label label1 
      Caption         =   "Horizontal CG - inches"
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
      Index           =   40
      Left            =   3210
      TabIndex        =   141
      Top             =   6315
      Width           =   1920
   End
   Begin VB.Label label1 
      Caption         =   "Vertical CG - inches"
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
      Index           =   39
      Left            =   240
      TabIndex        =   140
      Top             =   6315
      Width           =   1920
   End
   Begin VB.Label label1 
      Caption         =   "Front Weight - lbs"
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
      Index           =   38
      Left            =   5910
      TabIndex        =   137
      Top             =   6315
      Width           =   1920
   End
   Begin VB.Label label1 
      Caption         =   "Overhang - inches"
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
      Index           =   37
      Left            =   210
      TabIndex        =   136
      Top             =   3855
      Width           =   2100
   End
   Begin VB.Line Line4 
      BorderColor     =   &H00808080&
      X1              =   105
      X2              =   2910
      Y1              =   2130
      Y2              =   2130
   End
   Begin VB.Line Line3 
      BorderColor     =   &H00FFFFFF&
      X1              =   120
      X2              =   2895
      Y1              =   2145
      Y2              =   2145
   End
   Begin VB.Label label1 
      Alignment       =   2  'Center
      AutoSize        =   -1  'True
      Caption         =   "Vehicle Data"
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
      Index           =   36
      Left            =   900
      TabIndex        =   134
      Top             =   2835
      Width           =   1110
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00404040&
      Height          =   1230
      Index           =   7
      Left            =   90
      Top             =   2925
      Width           =   2820
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00FFFFFF&
      Height          =   1230
      Index           =   6
      Left            =   90
      Top             =   2925
      Width           =   2820
   End
   Begin VB.Label label1 
      Caption         =   "Track Temp - deg F"
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
      Index           =   35
      Left            =   210
      TabIndex        =   133
      Top             =   2250
      Width           =   1800
   End
   Begin VB.Label label1 
      Caption         =   "Wind Angle - degs"
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
      Index           =   34
      Left            =   210
      TabIndex        =   132
      Top             =   1860
      Width           =   1950
   End
   Begin VB.Label label1 
      Caption         =   "Track:"
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
      Index           =   17
      Left            =   180
      TabIndex        =   131
      Top             =   2100
      Width           =   570
   End
   Begin VB.Line Line2 
      BorderColor     =   &H00FFFFFF&
      X1              =   6645
      X2              =   9435
      Y1              =   2295
      Y2              =   2295
   End
   Begin VB.Line Line1 
      BorderColor     =   &H00808080&
      X1              =   6630
      X2              =   9435
      Y1              =   2220
      Y2              =   2220
   End
   Begin VB.Label Label9 
      Caption         =   "RPM       HP    Torque"
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
      Left            =   3900
      TabIndex        =   130
      Top             =   510
      Width           =   1980
   End
   Begin VB.Label Label8 
      Caption         =   "6th -"
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
      Left            =   6750
      TabIndex        =   129
      Top             =   4080
      Width           =   480
   End
   Begin VB.Label Label7 
      Caption         =   "5th -"
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
      Left            =   6750
      TabIndex        =   128
      Top             =   3780
      Width           =   480
   End
   Begin VB.Label Label6 
      Caption         =   "4th -"
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
      Left            =   6750
      TabIndex        =   127
      Top             =   3480
      Width           =   480
   End
   Begin VB.Label Label5 
      Caption         =   "3rd -"
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
      Left            =   6750
      TabIndex        =   126
      Top             =   3180
      Width           =   480
   End
   Begin VB.Label Label4 
      Caption         =   "2nd -"
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
      Left            =   6750
      TabIndex        =   125
      Top             =   2880
      Width           =   480
   End
   Begin VB.Label Label3 
      Caption         =   "1st -"
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
      Left            =   6750
      TabIndex        =   124
      Top             =   2580
      Width           =   480
   End
   Begin VB.Label Label2 
      Caption         =   "Gear:  Ratio  Efficiency Shift@"
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
      Left            =   6720
      TabIndex        =   123
      Top             =   2310
      Width           =   2640
   End
   Begin VB.Label label1 
      Alignment       =   2  'Center
      AutoSize        =   -1  'True
      Caption         =   "Polar Moments of Inertia (in-lbs sec*sec)"
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
      Index           =   30
      Left            =   5925
      TabIndex        =   119
      Top             =   4905
      Width           =   3450
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00404040&
      Height          =   975
      Index           =   12
      Left            =   5820
      Top             =   4980
      Width           =   3630
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00FFFFFF&
      Height          =   975
      Index           =   13
      Left            =   5820
      Top             =   4980
      Width           =   3630
   End
   Begin VB.Label label1 
      Caption         =   "Engine + Flexplate + Converter"
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
      Index           =   33
      Left            =   5910
      TabIndex        =   122
      Top             =   5115
      Width           =   2640
   End
   Begin VB.Label label1 
      Caption         =   "Transmission + Driveshaft"
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
      Index           =   32
      Left            =   5910
      TabIndex        =   121
      Top             =   5385
      Width           =   2640
   End
   Begin VB.Label label1 
      Caption         =   "Tires + Wheels + Ring Gear"
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
      Index           =   31
      Left            =   5910
      TabIndex        =   120
      Top             =   5655
      Width           =   2640
   End
   Begin VB.Label label1 
      Caption         =   "HP/Torque Multiplier"
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
      Index           =   29
      Left            =   3210
      TabIndex        =   118
      Top             =   4530
      Width           =   1800
   End
   Begin VB.Label label1 
      Caption         =   "Fuel System:"
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
      Index           =   28
      Left            =   3210
      TabIndex        =   117
      Top             =   4185
      Width           =   1125
   End
   Begin VB.Label label1 
      Alignment       =   2  'Center
      AutoSize        =   -1  'True
      Caption         =   "Aerodynamic Data"
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
      Index           =   24
      Left            =   3630
      TabIndex        =   113
      Top             =   4905
      Width           =   1560
   End
   Begin VB.Label label1 
      Caption         =   "Lift Coefficient"
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
      Index           =   27
      Left            =   3210
      TabIndex        =   116
      Top             =   5655
      Width           =   1620
   End
   Begin VB.Label label1 
      Caption         =   "Drag Coefficient"
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
      Index           =   26
      Left            =   3210
      TabIndex        =   115
      Top             =   5385
      Width           =   1620
   End
   Begin VB.Label label1 
      Caption         =   "Frontal Area - sq ft"
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
      Index           =   25
      Left            =   3210
      TabIndex        =   114
      Top             =   5115
      Width           =   1620
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00FFFFFF&
      Height          =   975
      Index           =   11
      Left            =   3120
      Top             =   4980
      Width           =   2580
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00404040&
      Height          =   975
      Index           =   10
      Left            =   3120
      Top             =   4980
      Width           =   2580
   End
   Begin VB.Label label1 
      Alignment       =   2  'Center
      AutoSize        =   -1  'True
      Caption         =   "Final Drive Data"
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
      Index           =   18
      Left            =   855
      TabIndex        =   107
      Top             =   4155
      Width           =   1410
   End
   Begin VB.Label label1 
      Caption         =   "Efficiency"
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
      Index           =   23
      Left            =   210
      TabIndex        =   112
      Tag             =   "ISQUARTERPRO"
      Top             =   4635
      Width           =   2100
   End
   Begin VB.Label label1 
      Caption         =   "Traction Index"
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
      Index           =   22
      Left            =   210
      TabIndex        =   111
      Top             =   2520
      Width           =   1800
   End
   Begin VB.Label label1 
      Caption         =   "Tire Width - inches"
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
      Index           =   21
      Left            =   210
      TabIndex        =   110
      Top             =   5175
      Width           =   1800
   End
   Begin VB.Label label1 
      Caption         =   "Tire Diameter - inches"
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
      Index           =   20
      Left            =   210
      TabIndex        =   109
      Top             =   4905
      Width           =   2100
   End
   Begin VB.Label label1 
      Caption         =   "Gear Ratio"
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
      Index           =   19
      Left            =   210
      TabIndex        =   108
      Top             =   4365
      Width           =   1800
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00FFFFFF&
      Height          =   1230
      Index           =   9
      Left            =   90
      Top             =   4245
      Width           =   2820
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00404040&
      Height          =   1230
      Index           =   8
      Left            =   90
      Top             =   4245
      Width           =   2820
   End
   Begin VB.Label label1 
      Caption         =   "Launch@ RPM"
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
      Index           =   13
      Left            =   6750
      TabIndex        =   106
      Top             =   810
      Width           =   2100
   End
   Begin VB.Label label1 
      Caption         =   "Slip/Stall RPM"
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
      Index           =   11
      Left            =   6750
      TabIndex        =   105
      Top             =   1095
      Width           =   2100
   End
   Begin VB.Label label1 
      Caption         =   "Torque Multiplication"
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
      Index           =   10
      Left            =   6750
      TabIndex        =   104
      Top             =   1950
      Width           =   2100
   End
   Begin VB.Label label1 
      Caption         =   "Slippage"
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
      Index           =   9
      Left            =   6750
      TabIndex        =   103
      Top             =   1380
      Width           =   2100
   End
   Begin VB.Label label1 
      Caption         =   "Rollout - inches"
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
      Index           =   8
      Left            =   210
      TabIndex        =   102
      Top             =   3585
      Width           =   2100
   End
   Begin VB.Label label1 
      Caption         =   "Wheelbase - inches"
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
      Index           =   7
      Left            =   210
      TabIndex        =   101
      Top             =   3315
      Width           =   2100
   End
   Begin VB.Label label1 
      Caption         =   "Weight - lbs"
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
      Index           =   6
      Left            =   210
      TabIndex        =   100
      Top             =   3045
      Width           =   2100
   End
   Begin VB.Label label1 
      Caption         =   "Wind Velocity - MPH"
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
      Index           =   5
      Left            =   210
      TabIndex        =   99
      Top             =   1590
      Width           =   1800
   End
   Begin VB.Label label1 
      Caption         =   "Relative Humidity - %"
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
      Index           =   4
      Left            =   210
      TabIndex        =   98
      Top             =   1320
      Width           =   2100
   End
   Begin VB.Label label1 
      Caption         =   "Barometer - in Hg"
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
      Index           =   3
      Left            =   210
      TabIndex        =   97
      Top             =   780
      Width           =   2100
   End
   Begin VB.Label label1 
      Caption         =   "Temperature - deg F"
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
      Index           =   2
      Left            =   210
      TabIndex        =   96
      Top             =   1050
      Width           =   2100
   End
   Begin VB.Label label1 
      Caption         =   "Elevation - ft"
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
      Left            =   210
      TabIndex        =   95
      Top             =   510
      Width           =   2100
   End
   Begin VB.Label label1 
      Alignment       =   2  'Center
      AutoSize        =   -1  'True
      Caption         =   "Transmission Data"
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
      Index           =   16
      Left            =   7110
      TabIndex        =   94
      Top             =   330
      Width           =   1590
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00404040&
      Height          =   3975
      Index           =   0
      Left            =   6630
      Top             =   375
      Width           =   2820
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00FFFFFF&
      Height          =   3975
      Index           =   1
      Left            =   6630
      Top             =   375
      Width           =   2820
   End
   Begin VB.Label label1 
      Alignment       =   2  'Center
      AutoSize        =   -1  'True
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
      Index           =   0
      Left            =   120
      TabIndex        =   93
      Top             =   45
      Width           =   480
   End
   Begin VB.Label label1 
      Alignment       =   2  'Center
      AutoSize        =   -1  'True
      Caption         =   "General Data"
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
      Index           =   14
      Left            =   855
      TabIndex        =   92
      Top             =   330
      Width           =   1140
   End
   Begin VB.Label label1 
      Alignment       =   2  'Center
      AutoSize        =   -1  'True
      Caption         =   "Engine Dyno Data"
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
      Index           =   15
      Left            =   3780
      TabIndex        =   91
      Top             =   300
      Width           =   1560
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00FFFFFF&
      Height          =   2445
      Index           =   3
      Left            =   90
      Top             =   375
      Width           =   2820
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00404040&
      Height          =   2445
      Index           =   2
      Left            =   90
      Top             =   375
      Width           =   2820
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00FFFFFF&
      Height          =   4500
      Index           =   5
      Left            =   3120
      Top             =   375
      Width           =   3270
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00404040&
      Height          =   4500
      Index           =   4
      Left            =   3120
      Top             =   375
      Width           =   3270
   End
End
Attribute VB_Name = "frmQuarter"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit
Option Compare Text

Public fc_Value As Object
Public fc_Note As New CValue

Private bFileDirty As Boolean
Private mofn As String

Public Sub ReDisplay()
    Form_Activate
End Sub

Private Sub Form_Activate()
Static IsLoaded As Boolean
Dim i As Integer, gap As Integer
    If Not IsLoaded Then
        fc_Note.ClsControl = txtNote
        
        gc_Elevation.ClsControl = txtElevation
        gc_Temperature.ClsControl = txtTemperature
        gc_Barometer.ClsControl = txtBarometer
        gc_Humidity.ClsControl = txtHumidity
        gc_WindSpeed.ClsControl = txtWindSpeed
        gc_WindAngle.ClsControl = txtWindAngle
        gc_Weight.ClsControl = txtWeight
        gc_Wheelbase.ClsControl = txtWheelbase
        
        #If Not ISBVPRO Then    'QUARTER Pro
            gc_TrackTemp.ClsControl = txtTrackTemp
            gc_EnginePMI.ClsControl = txtEnginePMI
            gc_TransPMI.ClsControl = txtTransPMI
            gc_TiresPMI.ClsControl = txtTiresPMI
            
            gc_Rollout.ClsControl = txtRollout
            gc_Overhang.ClsControl = txtOverhang
        
            gc_LaunchRPM.ClsControl = txtLaunchRPM
        #Else                   'Bonneville Pro
            gc_Track.ClsControl = cbxTrack
        #End If
        
        gc_RefArea.ClsControl = txtRefArea
        gc_DragCoef.ClsControl = txtDrag
        gc_LiftCoef.ClsControl = txtLift
        
        gc_TransType.ClsControl = optTransType(0)
        gc_SlipStallRPM.ClsControl = txtSlipStallRPM
        gc_TorqueMult.ClsControl = txtTorqueMult
        gc_Slippage.ClsControl = txtSlippage
        gc_LockUp.ClsControl = chkLockup
        
        For i = 1 To 11
            clsVals("EngineRPM", i).ClsControl = txtEngineRPM(i)
            clsVals("EngineHP", i).ClsControl = txtEngineHP(i)
            clsVals("EngineTQ", i).ClsControl = txtEngineTQ(i)
        Next
        
        gc_HPTQMult.ClsControl = txtHPTQMult
        gc_FuelSystem.ClsControl = cbxFuelSystem
        
        For i = 1 To 6
            clsVals("TransGR", i).ClsControl = txtTransGR(i)
            clsVals("TransEff", i).ClsControl = txtTransEff(i)
            clsVals("ShiftRPM", i).ClsControl = txtShiftRPM(i)
        Next
        
        gc_GearRatio.ClsControl = txtGearRatio
        gc_Efficiency.ClsControl = txtEfficiency
        gc_TireDia.ClsControl = txtTireDia
        gc_TireWidth.ClsControl = txtTireWidth
        gc_TractionIndex.ClsControl = txtTractionIndex
        
        IsLoaded = True
        Me.Visible = True
        Set fc_Value = gc_Elevation
    End If
    
    SetTransTypeStrings
    SetTireDiaStrings
    SetWSTireDiaStrings
    
    If gc_HPTQMult.Value = 1 Then
        btnRecalc.Enabled = False
    Else
        btnRecalc.Enabled = True
    End If
    
    optTransType(0).Value = gc_TransType.Value
    optTransType(1).Value = Not gc_TransType.Value
    optTransType(0).TabStop = gc_TransType.Value
    optTransType(1).TabStop = Not gc_TransType.Value
    
    Label1(10).Visible = gc_TransType.Value
    txtTorqueMult.Visible = gc_TransType.Value
    
    chkLockup.Value = gc_LockUp.Value
    
    SetBarometer
    SetElevation
    SetTrackTemp
    SetWeight
    SetLaunchRPM
    SetSlipStallRPM
    SetShiftRPM
    SetTireWidth
    
    HideForms
End Sub

Private Sub Form_Load()
Dim ctl As Control
    Me.ZOrder 1
    For Each ctl In Me.Controls
        ctl.Visible = True
    Next ctl
    
    SetRunEnabled True
    
    Me.Visible = False
    Me.height = FrmMDI.height - FrmMDI.picture1.top - FrmMDI.picture1.height - 600 'was 1050 before removing grid
    Me.width = FrmMDI.width - 150
    
    fc_Note.StatusMsg = "Descriptive note or text to more fully describe this data file."
   
    ShapeShifter Shape1(0), Shape1(1), Label1(16)
    ShapeShifter Shape1(2), Shape1(3), Label1(14)
    ShapeShifter Shape1(4), Shape1(5), Label1(15)
    ShapeShifter Shape1(7), Shape1(6), Label1(36)
    ShapeShifter Shape1(8), Shape1(9), Label1(18)
    ShapeShifter Shape1(10), Shape1(11), Label1(24)
    ShapeShifter Shape1(12), Shape1(13), Label1(30)
    
    Label1(38).Visible = False
    txtStaticFWt.Visible = False
    txtStaticFWt.Enabled = False
    
    Label1(39).Visible = False
    txtYCG.Visible = False
    txtYCG.Enabled = False
    
    Label1(40).Visible = False
    txtXCG.Visible = False
    txtXCG.Enabled = False
    
    #If Not ISBVPRO Then    'QUARTER Pro
        Label1(17).Visible = False
        cbxTrack.Visible = False
        cbxTrack.Enabled = False
    #Else                   'Bonneville Pro
        Label1(35).Visible = False
        txtTrackTemp.Visible = False
        txtTrackTemp.Enabled = False
        
        Label1(17).left = Label1(35).left
        Label1(17).top = Label1(35).top - 30
        cbxTrack.left = Label1(17).left + Label1(17).width
        cbxTrack.top = Label1(17).top - 60
            
        Label1(17).Visible = True
        cbxTrack.Visible = True
        cbxTrack.Enabled = True
            
        Label1(8).Visible = False
        txtRollout.Visible = False
        txtRollout.Enabled = False
        
        Label1(37).Visible = False
        txtOverhang.Visible = False
        txtOverhang.Enabled = False
        
        Label1(13).Visible = False
        txtLaunchRPM.Visible = False
        txtLaunchRPM.Enabled = False
        
        Label1(30).Visible = False
        Shape1(12).Visible = False
        Shape1(13).Visible = False
            
        Label1(33).Visible = False
        btnEnginePMI.Visible = False
        btnEnginePMI.Enabled = False
        txtEnginePMI.Visible = False:   txtEnginePMI.Enabled = False
            
        Label1(32).Visible = False
        btnTransPMI.Visible = False:    btnTransPMI.Enabled = False
        txtTransPMI.Visible = False:    txtTransPMI.Enabled = False
            
        Label1(31).Visible = False
        btnTiresPMI.Visible = False:    btnTiresPMI.Enabled = False
        txtTiresPMI.Visible = False:    txtTiresPMI.Enabled = False
    #End If
    
    bFileDirty = False
End Sub

Private Sub Form_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    If X >= cbxFuelSystem.left - 20 And X <= cbxFuelSystem.left + cbxFuelSystem.width Then
        If Y >= cbxFuelSystem.top - 20 And Y <= cbxFuelSystem.top + cbxFuelSystem.height Then
            SetHelp Me, HELP_SET, gc_FuelSystem
            Exit Sub
        End If
    
    #If ISBVPRO Then
        ElseIf X >= cbxTrack.left - 20 And X <= cbxTrack.left + cbxTrack.width Then
            If Y >= cbxTrack.top - 20 And Y <= cbxTrack.top + cbxTrack.height Then
                SetHelp Me, HELP_SET, gc_Track
                Exit Sub
            End If
    #End If
    
    End If
    SetHelp Me, HELP_RESET, fc_Value
End Sub


#If ISQUARTERPRO And Not ISBVPRO Then   'PMI worksheets in QPro only
Private Sub btnEnginePMI_Click()
    frmPolarEngine.Show vbModal
    If frmPolarEngine.FileDirty Then bFileDirty = True
End Sub

Private Sub btnTiresPMI_Click()
    frmPolarTires.Show vbModal
    If frmPolarTires.FileDirty Then bFileDirty = True
End Sub

Private Sub btnTransPMI_Click()
    frmPolarTrans.Show vbModal
    If frmPolarTrans.FileDirty Then bFileDirty = True
End Sub
#End If


Private Sub btnDynoData_Click()
    frmDynoData.Show vbModal
End Sub

Private Sub btnGearRatio_Click()
    frmGearRatio.Show vbModal
    If frmGearRatio.FileDirty Then bFileDirty = True
End Sub


Private Sub btnRecalc_Click()
Dim i As Integer, j As Integer, vbReply As Integer
    vbReply = MsgBox("You are about to permanently change the Engine Dyno Data.  Every HP and Torque value will be mulitplied by the HP/Torque Multiplier.  Are you sure you want to proceed with this calculation?", 256 + vbExclamation + vbYesNo, "Help: Engine Dyno Data - Recalc")
    If vbReply = vbYes Then
        For i = 1 To 11
            If clsVals("EngineRPM", i).Value = 0 Then Exit For
            clsVals("EngineHP", i).Value = clsVals("EngineHP", i).Value * gc_HPTQMult.Value
            clsVals("EngineTQ", i).Value = clsVals("EngineTQ", i).Value * gc_HPTQMult.Value
        Next
        
        gc_HPTQMult.Value = 1
        btnRecalc.Enabled = False
        bFileDirty = True
    End If
End Sub

Private Sub btnRecalc_GotFocus()
    SetHelp Me, HELP_SAVE, gc_RecalcBtn
End Sub

Private Sub btnRecalc_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_RecalcBtn
End Sub


Private Sub btnRefArea_Click()
    frmRefArea.Show vbModal
    If frmRefArea.FileDirty Then bFileDirty = True
End Sub

Private Sub btnDragCoef_Click()
    FrmDragCoef.Show vbModal
End Sub

Private Sub btnTireWidth_Click()
    frmTireWidth.Show vbModal
    If frmTireWidth.FileDirty Then bFileDirty = True
End Sub

Private Sub btnTractionIndex_Click()
    frmTractionIndex.Show vbModal
End Sub

Private Sub btnWindAngle_Click()
    frmApproach.Show vbModal
End Sub


Private Sub cbxFuelSystem_Change()
    gc_FuelSystem.Value = cbxFuelSystem.ItemData(cbxFuelSystem.ListIndex)
    
    If gc_FuelSystem.IsChanged Then
        SetWeight
        gc_FuelSystem.IsChanged = False
        If gc_FuelSystem.IsError Then cbxFuelSystem.SetFocus
    Else
        cbxFuelSystem.ListIndex = gc_FuelSystem.Value - 1
    End If
End Sub

Private Sub cbxFuelSystem_Click()
    cbxFuelSystem_Change
End Sub

Private Sub cbxFuelSystem_GotFocus()
    SetHelp Me, HELP_SAVE, gc_FuelSystem
End Sub

Private Sub cbxFuelSystem_LostFocus()
    cbxFuelSystem_Change
End Sub


Private Sub cbxTrack_Change()
    gc_Track.Value = cbxTrack.ItemData(cbxTrack.ListIndex)
    
    If gc_Track.IsChanged Then
        gc_Track.IsChanged = False
        If gc_Track.IsError Then cbxTrack.SetFocus
    Else
        cbxTrack.ListIndex = gc_Track.Value - 1
    End If
End Sub

Private Sub cbxTrack_Click()
    cbxTrack_Change
End Sub

Private Sub cbxTrack_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Track
End Sub

Private Sub cbxTrack_LostFocus()
    cbxTrack_Change
End Sub


Private Sub chkLockUp_Click()
    gc_LockUp.Value = chkLockup.Value
End Sub

Private Sub chkLockUP_GotFocus()
    SetHelp Me, HELP_SAVE, gc_LockUp
End Sub

Private Sub chkLockUp_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_LockUp
End Sub


Private Sub optTransType_Click(index As Integer)
    If index = 0 Then
        gc_TransType.Value = True
    Else
        gc_TransType.Value = False
    End If
    
    Label1(10).Visible = gc_TransType.Value
    txtTorqueMult.Visible = gc_TransType.Value
    
    If Not gc_TransType.Value Then gc_TorqueMult.Value = 1
    
    If gc_TransType.IsChanged Then
        SetTransTypeStrings
        TestSlipStallRPM
        SetLaunchRPM
        SetSlipStallRPM
        SetShiftRPM
    End If
End Sub

Private Sub optTransType_GotFocus(index As Integer)
    SetHelp Me, HELP_SAVE, gc_TransType
End Sub

Private Sub optTransType_MouseMove(index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TransType
End Sub


Private Sub txtNote_GotFocus()
    SetHelp Me, HELP_SAVE, fc_Note
End Sub

Private Sub txtNote_KeyPress(KeyAscii As Integer)
    bFileDirty = True
End Sub

Private Sub txtNote_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, fc_Note
End Sub


Private Sub txtBarometer_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Barometer
End Sub

Private Sub txtBarometer_KeyPress(KeyAscii As Integer)
    gc_Barometer.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn And gc_Barometer.IsChanged Then SetElevation
End Sub

Private Sub txtBarometer_LostFocus()
    gc_Barometer.Value = val(txtBarometer.Text)
    If gc_Barometer.IsChanged Then SetElevation
End Sub

Private Sub txtBarometer_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Barometer
End Sub


Private Sub txtElevation_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Elevation
End Sub

Private Sub txtElevation_KeyPress(KeyAscii As Integer)
    gc_Elevation.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn And gc_Elevation.IsChanged Then SetBarometer
End Sub

Private Sub txtElevation_LostFocus()
    gc_Elevation.Value = val(txtElevation.Text)
    If gc_Elevation.IsChanged Then SetBarometer
End Sub

Private Sub txtElevation_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Elevation
End Sub


Private Sub txtEnginePMI_GotFocus()
    SetHelp Me, HELP_SAVE, gc_EnginePMI
End Sub

Private Sub txtEnginePMI_KeyPress(KeyAscii As Integer)
    gc_EnginePMI.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtEnginePMI_LostFocus()
    gc_EnginePMI.Value = val(txtEnginePMI.Text)
End Sub

Private Sub txtEnginePMI_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_EnginePMI
End Sub


Private Sub txtTransPMI_GotFocus()
    SetHelp Me, HELP_SAVE, gc_TransPMI
End Sub

Private Sub txtTransPMI_KeyPress(KeyAscii As Integer)
    gc_TransPMI.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtTransPMI_LostFocus()
    gc_TransPMI.Value = val(txtTransPMI.Text)
End Sub

Private Sub txtTransPMI_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TransPMI
End Sub


Private Sub txtTiresPMI_GotFocus()
    SetHelp Me, HELP_SAVE, gc_TiresPMI
End Sub

Private Sub txtTiresPMI_KeyPress(KeyAscii As Integer)
    gc_TiresPMI.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtTiresPMI_LostFocus()
    gc_TiresPMI.Value = val(txtTiresPMI.Text)
End Sub

Private Sub txtTiresPMI_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TiresPMI
End Sub


Private Sub txtEngineRPM_GotFocus(index As Integer)
    SetHelp Me, HELP_SAVE, clsVals("EngineRPM", index)
End Sub

Private Sub txtEngineRPM_KeyPress(index As Integer, KeyAscii As Integer)
Dim OldValue As Single
    OldValue = clsVals("EngineRPM", index).Value
    clsVals("EngineRPM", index).TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then CheckEngineRPM index, OldValue
End Sub

Private Sub txtEngineRPM_LostFocus(index As Integer)
Dim OldValue As Single
    OldValue = clsVals("EngineRPM", index).Value
    clsVals("EngineRPM", index).Value = val(txtEngineRPM(index).Text)
    CheckEngineRPM index, OldValue
End Sub

Private Sub txtEngineRPM_MouseMove(index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, clsVals("EngineRPM", index)
End Sub

Private Sub CheckEngineRPM(ThisRow As Integer, OldValue As Single)
Dim MsgCap As String, MsgTxt As String
Dim i As Integer, nRows As Integer, vbReply As Integer
Dim Work As Single
    If clsVals("EngineRPM", ThisRow).Value = OldValue Then Exit Sub
    
    MsgCap = "Help: Engine Dyno RPM Data"
    
    For i = 1 To 11    'find the number of rows of dyno data
        If clsVals("EngineRPM", i).Value > 0 Then nRows = i Else Exit For
    Next

    'check for logical errors on data input first
    'check for a gap in the row
    If ThisRow > nRows + 1 Then
        MsgTxt = "RPM values must be entered in sequential order!  Blank rows are not allowed."
        MsgBox MsgTxt, vbExclamation, MsgCap
        clsVals("EngineRPM", ThisRow).Value = OldValue
        'setfocus EngineRPM, nRows + 1 - Patrick
        Exit Sub
    End If

    'check for zero entry to clear all remaining rows
    If clsVals("EngineRPM", ThisRow).Value = 0 Then
        vbReply = MsgBox("You are about to permanently change the Engine Dyno Data.  Every HP and Torque value from this RPM down will be set to zero.  Are you sure you want to proceed?", 256 + vbExclamation + vbYesNo, MsgCap)
        If vbReply = vbYes Then
            For i = ThisRow To 11
                clsVals("EngineRPM", i).Value = 0
                clsVals("EngineHP", i).Value = 0
                clsVals("EngineTQ", i).Value = 0
            Next
            'SetFocus where??? - Patrick
            
            SetLaunchRPM
            SetSlipStallRPM
            SetShiftRPM
            bFileDirty = True
        Else
            clsVals("EngineRPM", ThisRow).Value = OldValue
            'setfocus EngineRPM, ThisRow - Patrick
        End If
        Exit Sub
    End If
    
    'check for smaller value than previous row
    Work = clsVals("EngineRPM", ThisRow).Value
    If ThisRow > 1 Then
        If Work <= clsVals("EngineRPM", ThisRow - 1).Value Then MsgTxt = "yes"
    End If
    
    'check for larger value than next row
    If ThisRow < nRows Then
        If Work >= clsVals("EngineRPM", ThisRow + 1).Value Then MsgTxt = "yes"
    End If
        
    If MsgTxt = "yes" Then
        If ThisRow = 1 Then
            vbReply = MsgBox("Are you going to change all the Engine Dyno Data values?  Would you like the remaining Engine Dyno Data rows cleared?", 256 + vbExclamation + vbYesNo, MsgCap)
        Else
            vbReply = vbNo
        End If
        
        If vbReply = vbYes Then
            For i = 1 To 11
                clsVals("EngineRPM", i).Value = 0
                clsVals("EngineHP", i).Value = 0
                clsVals("EngineTQ", i).Value = 0
            Next
            'SetFocus where??? - Patrick
        Else
            MsgTxt = "RPM values must always be in ascending order!  This RPM value must be larger than the previous row and smaller than the next row."
            MsgBox MsgTxt, vbExclamation, MsgCap
            clsVals("EngineRPM", ThisRow).Value = OldValue
            'SetFocus EngineRPM, ThisRow - Patrick
            Exit Sub
        End If
    End If

    'and finally calculate the TQ value for this row RPM change
    clsVals("EngineTQ", ThisRow).Value = Z6 * clsVals("EngineHP", ThisRow).Value / clsVals("EngineRPM", ThisRow).Value

    'check for missing HP and Torque data
    For i = 1 To nRows
        If clsVals("EngineHP", i).Value = 0 Then
            MsgTxt = "HP and Torque values are required for every RPM!"
            MsgCap = "Help: Engine Dyno Data"
            MsgBox MsgTxt, vbExclamation, MsgCap
            'SetFocus EngineHP, i - Patrick
            Exit For
        End If
    Next

    SetLaunchRPM
    SetSlipStallRPM
    SetShiftRPM
    bFileDirty = True
End Sub


Private Sub txtEngineHP_GotFocus(index As Integer)
    SetHelp Me, HELP_SAVE, clsVals("EngineHP", index)
End Sub

Private Sub txtEngineHP_KeyPress(index As Integer, KeyAscii As Integer)
Dim OldValue As Single
    OldValue = clsVals("EngineHP", index).Value
    clsVals("EngineHP", index).TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then CheckEngineHP index, OldValue
End Sub

Private Sub txtEngineHP_LostFocus(index As Integer)
Dim OldValue As Single
    OldValue = clsVals("EngineHP", index).Value
    clsVals("EngineHP", index).Value = val(txtEngineHP(index).Text)
    CheckEngineHP index, OldValue
End Sub

Private Sub txtEngineHP_MouseMove(index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, clsVals("EngineHP", index)
End Sub

Private Sub CheckEngineHP(ThisRow As Integer, OldValue As Single)
Dim MsgCap As String, MsgTxt As String
Dim i As Integer, nRows As Integer, vbReply As Integer
Dim Work As Single
    If clsVals("EngineHP", ThisRow).Value = OldValue Then Exit Sub
    
    MsgCap = "Help: Engine Dyno HP Data"
    
    For i = 1 To 11    'find the number of rows of dyno data
        If clsVals("EngineRPM", i).Value > 0 Then nRows = i Else Exit For
    Next
   
    If clsVals("EngineRPM", ThisRow).Value = 0 Then
        MsgTxt = "Engine RPM must alway be entered before the HP and TQ values!"
        MsgBox MsgTxt, vbExclamation, MsgCap
        clsVals("EngineRPM", ThisRow).Value = OldValue
        'setfocus EngineRPM, ThisRow - Patrick
        Exit Sub
    End If
    
    'and finally calculate the TQ value for this row HP change
    clsVals("EngineTQ", ThisRow).Value = Z6 * clsVals("EngineHP", ThisRow).Value / clsVals("EngineRPM", ThisRow).Value
    
    'check for missing HP and Torque data
    For i = 1 To nRows
        If clsVals("EngineHP", i).Value = 0 Then
            MsgTxt = "HP and Torque values are required for every RPM!"
            MsgCap = "Help: Engine Dyno Data"
            MsgBox MsgTxt, vbExclamation, MsgCap
            'SetFocus EngineHP, i - Patrick
            Exit For
        End If
    Next

    bFileDirty = True
End Sub


Private Sub txtEngineTQ_GotFocus(index As Integer)
    SetHelp Me, HELP_SAVE, clsVals("EngineTQ", index)
End Sub

Private Sub txtEngineTQ_KeyPress(index As Integer, KeyAscii As Integer)
Dim OldValue As Single
    OldValue = clsVals("EngineTQ", index).Value
    clsVals("EngineTQ", index).TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then CheckEngineTQ index, OldValue
End Sub

Private Sub txtEngineTQ_LostFocus(index As Integer)
Dim OldValue As Single
    OldValue = clsVals("EngineTQ", index).Value
    clsVals("EngineTQ", index).Value = val(txtEngineTQ(index).Text)
    CheckEngineTQ index, OldValue
End Sub

Private Sub txtEngineTQ_MouseMove(index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, clsVals("EngineTQ", index)
End Sub

Private Sub CheckEngineTQ(ThisRow As Integer, OldValue As Single)
Dim MsgCap As String, MsgTxt As String
Dim i As Integer, nRows As Integer, vbReply As Integer
Dim Work As Single
    If clsVals("EngineTQ", ThisRow).Value = OldValue Then Exit Sub
    
    MsgCap = "Help: Engine Dyno TQ Data"
    
    For i = 1 To 11    'find the number of rows of dyno data
        If clsVals("EngineRPM", i).Value > 0 Then nRows = i Else Exit For
    Next

    If clsVals("EngineRPM", ThisRow).Value = 0 Then
        MsgTxt = "Engine RPM must alway be entered before the HP and TQ values!"
        MsgBox MsgTxt, vbExclamation, MsgCap
        clsVals("EngineRPM", ThisRow).Value = OldValue
        'setfocus EngineRPM, ThisRow - Patrick
        Exit Sub
    End If
    
    'and finally calculate the HP value for this row TQ change
    clsVals("EngineHP", ThisRow).Value = clsVals("EngineTQ", ThisRow).Value * clsVals("EngineRPM", ThisRow).Value / Z6
    
    'check for missing HP and Torque data
    For i = 1 To nRows
        If clsVals("EngineHP", i).Value = 0 Then
            MsgTxt = "HP and Torque values are required for every RPM!"
            MsgCap = "Help: Engine Dyno Data"
            MsgBox MsgTxt, vbExclamation, MsgCap
            'SetFocus EngineHP, i - Patrick
            Exit For
        End If
    Next

    bFileDirty = True
End Sub


Private Sub txtHPTQMult_GotFocus()
    SetHelp Me, HELP_SAVE, gc_HPTQMult
End Sub

Private Sub txtHPTQMult_KeyPress(KeyAscii As Integer)
    gc_HPTQMult.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtHPTQMult_Check
End Sub

Private Sub txtHPTQMult_LostFocus()
    gc_HPTQMult.Value = val(txtHPTQMult.Text)
    txtHPTQMult_Check
End Sub

Private Sub txtHPTQMult_Check()
    If gc_HPTQMult.Value = 1 Then
        btnRecalc.Enabled = False
    Else
        btnRecalc.Enabled = True
    End If
End Sub

Private Sub txtHPTQMult_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_HPTQMult
End Sub


Private Sub txtLift_GotFocus()
    SetHelp Me, HELP_SAVE, gc_LiftCoef
End Sub

Private Sub txtLift_KeyPress(KeyAscii As Integer)
    gc_LiftCoef.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtLift_LostFocus()
    gc_LiftCoef.Value = val(txtLift.Text)
End Sub
    
Private Sub txtLift_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_LiftCoef
End Sub


Private Sub txtDrag_GotFocus()
    SetHelp Me, HELP_SAVE, gc_DragCoef
End Sub

Private Sub txtDrag_KeyPress(KeyAscii As Integer)
    gc_DragCoef.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtDrag_LostFocus()
    gc_DragCoef.Value = val(txtDrag.Text)
End Sub

Private Sub txtDrag_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_DragCoef
End Sub


Private Sub txtRefArea_GotFocus()
    SetHelp Me, HELP_SAVE, gc_RefArea
End Sub

Private Sub txtRefArea_KeyPress(KeyAscii As Integer)
    gc_RefArea.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn And gc_RefArea.IsChanged Then TestRefArea
End Sub

Private Sub txtRefArea_LostFocus()
    gc_RefArea.Value = val(txtRefArea.Text)
    If gc_RefArea.IsChanged Then TestRefArea
End Sub

Private Sub txtRefArea_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_RefArea
End Sub


Private Sub txtSlippage_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Slippage
End Sub

Private Sub txtSlippage_KeyPress(KeyAscii As Integer)
    gc_Slippage.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtSlippage_LostFocus()
    gc_Slippage.Value = val(txtSlippage.Text)
End Sub

Private Sub txtSlippage_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Slippage
End Sub


Private Sub txtTorqueMult_GotFocus()
    SetHelp Me, HELP_SAVE, gc_TorqueMult
End Sub

Private Sub txtTorqueMult_KeyPress(KeyAscii As Integer)
    gc_TorqueMult.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtTorqueMult_LostFocus()
    gc_TorqueMult.Value = val(txtTorqueMult.Text)
End Sub

Private Sub txtTorqueMult_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TorqueMult
End Sub


Private Sub txtTransGR_GotFocus(index As Integer)
    SetHelp Me, HELP_SAVE, clsVals("TransGR", index)
End Sub

Private Sub txtTransGR_KeyPress(index As Integer, KeyAscii As Integer)
Dim OldValue As Single
    OldValue = clsVals("TransGR", index).Value
    clsVals("TransGR", index).TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then CheckTransGR index, OldValue
End Sub

Private Sub txtTransGR_LostFocus(index As Integer)
Dim OldValue As Single
    OldValue = clsVals("TransGR", index).Value
    clsVals("TransGR", index).Value = val(txtTransGR(index).Text)
    CheckTransGR index, OldValue
End Sub

Private Sub txtTransGR_MouseMove(index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, clsVals("TransGR", index)
End Sub

Private Sub CheckTransGR(ThisGR As Integer, OldValue As Single)
Dim MsgCap As String, MsgTxt As String
Dim i As Integer, NGR As Integer, vbReply As Integer
Dim Work As Single
    If clsVals("TransGR", ThisGR).Value = OldValue Then Exit Sub
    
    MsgCap = "Help: Transmission Gear Ratio Data"
    
    For i = 1 To 6                                  'find the current NGR
        If clsVals("TransGR", i).Value > 0 Then NGR = i Else Exit For
    Next
    
    If ThisGR > NGR + 1 Then                        'check for a gap in the GR values
        MsgTxt = "Gear Ratios must be entered in sequential order!  Zero or blank values are not allowed."
        MsgBox MsgTxt, vbExclamation, MsgCap
        clsVals("TransGR", ThisGR).Value = OldValue
        Set fc_Value = clsVals("TransGR", NGR + 1)
        'setfocus where??? - Patrick
        Exit Sub 'leave bFileDirty = False
    End If

    If clsVals("TransGR", ThisGR).Value = 0 Then    'check for zero GR entry to clear remaining all values
        vbReply = MsgBox("You are about to permanently change the Transmission Data.  Every Gear Ratio, Efficiency and Shift@ RPM value from here down will be set to zero.  Are you sure you want to proceed?", 256 + vbExclamation + vbYesNo, MsgCap)
        If vbReply = vbYes Then
            For i = ThisGR To 6
                clsVals("TransGR", i).Value = 0
                clsVals("TransEff", i).Value = 0
                clsVals("ShiftRPM", i).Value = 0
            Next
            If ThisGR > 1 Then clsVals("ShiftRPM", ThisGR - 1).Value = 0
            bFileDirty = True
        Else
            clsVals("TransGR", NGR + 1).Value = OldValue
        End If
        'Patrick - what if the 1st GR was set to zero and then a value > 0 not re-entered?
        'and the need to recalc SetPeakHP in QUARTERjr? Don't want to leave with TransGR(1) = 0
        
        Set fc_Value = clsVals("TransGR", NGR + 1)
        'setfocus here - Patrick
        Exit Sub 'leave bFileDirty = False or True if reset above
    End If
    
    'check for larger GR value than previous
    Work = clsVals("TransGR", ThisGR).Value
    If ThisGR > 1 Then
        If Work >= clsVals("TransGR", ThisGR - 1).Value Then MsgTxt = "yes"
    End If
    
    'check for smaller GR value than next
    If ThisGR < NGR And Work <= clsVals("TransGR", ThisGR + 1).Value Then MsgTxt = "yes"

    If MsgTxt = "yes" Then
        If ThisGR = 1 Then
            vbReply = MsgBox("Are you going to change all the Transmission Gear Ratios?  Would you like the remaining Transmission data rows cleared?", 256 + vbExclamation + vbYesNo, MsgCap)
        Else
            vbReply = vbNo
        End If
                
        If vbReply = vbYes Then
            For i = ThisGR To 6
                clsVals("TransGR", i).Value = 0
                clsVals("TransEff", i).Value = 0
                clsVals("ShiftRPM", i).Value = 0
            Next
            Set fc_Value = clsVals("TransGR", ThisGR)
            'setfocus - Patrick
        Else
            MsgTxt = "Gear Ratio values must always be in descending order!  This Gear Ratio must be smaller than the previous value and larger than the next value."
            MsgBox MsgTxt, vbExclamation, MsgCap
            clsVals("TransGR", ThisGR).Value = OldValue
            Set fc_Value = clsVals("TransGR", ThisGR)
            'setfocus - Patrick
            Exit Sub 'leave bFileDirty = False
        End If
    End If
    
    bFileDirty = True
End Sub


Private Sub txtTransEff_GotFocus(index As Integer)
    SetHelp Me, HELP_SAVE, clsVals("TransEff", index)
End Sub

Private Sub txtTransEff_KeyPress(index As Integer, KeyAscii As Integer)
Dim OldValue As Single
    OldValue = clsVals("TransEff", index).Value
    clsVals("TransEff", index).TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then CheckTransEff index, OldValue
End Sub

Private Sub txtTransEff_LostFocus(index As Integer)
Dim OldValue As Single
    OldValue = clsVals("TransEff", index).Value
    clsVals("TransEff", index).Value = val(txtTransEff(index).Text)
    CheckTransEff index, OldValue
End Sub

Private Sub txtTransEff_MouseMove(index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, clsVals("TransEff", index)
End Sub

Private Sub CheckTransEff(ThisGR As Integer, OldValue As Single)
Dim Cancel As Boolean
Dim MsgCap As String, MsgTxt As String
Dim i As Integer, NGR As Integer, vbReply As Integer
Dim Work As Single
    If clsVals("TransEff", ThisGR).Value = OldValue Then Exit Sub
    
    MsgCap = "Help: Transmission Efficiency Data"
    
    For i = 1 To 6                                  'find the current NGR
        If clsVals("TransGR", i).Value > 0 Then NGR = i Else Exit For
    Next
    
    If clsVals("TransGR", ThisGR).Value = 0 Then
        MsgTxt = "Gear Ratio must alway be entered before the Efficiency and Shift@ RPM!"
        MsgBox MsgTxt, vbExclamation, MsgCap
        clsVals("TransEff", ThisGR).Value = OldValue
        'setfocus TransGR, ThisGR - Patrick
        Exit Sub
    End If
    
    If clsVals("TransEFF", ThisGR).Value = 0 Then
        If ThisGR = 1 Then
            If NGR = 1 Then
                clsVals("TransEFF", ThisGR).Value = 0.98
            Else
                Work = clsVals("TransEFF", ThisGR + 1).Value
                If Work = 0 Then
                    clsVals("TransEFF", ThisGR).Value = 0.98
                Else
                    clsVals("TransEFF", ThisGR).Value = Work
                End If
            End If
        Else
            clsVals("TransEFF", ThisGR).Value = clsVals("TransEFF", ThisGR - 1).Value
        End If
    End If
    'setfocus - Patrick
    
    'check for missing Efficiency data
    For i = 1 To NGR
        If clsVals("TransEff", i).Value = 0 Then
            MsgTxt = "Efficiency value in gear " & i & " is required!"
            MsgBox MsgTxt, vbExclamation, MsgCap
            'setfocus - Patrick
            Exit For
        End If
    Next
    
    bFileDirty = True
End Sub


Private Sub txtShiftRPM_GotFocus(index As Integer)
    SetHelp Me, HELP_SAVE, clsVals("ShiftRPM", index)
End Sub

Private Sub txtShiftRPM_KeyPress(index As Integer, KeyAscii As Integer)
Dim OldValue As Single
    OldValue = clsVals("ShiftRPM", index).Value
    clsVals("ShiftRPM", index).TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then CheckShiftRPM index, OldValue
End Sub

Private Sub txtShiftRPM_LostFocus(index As Integer)
Dim OldValue As Single
    OldValue = clsVals("ShiftRPM", index).Value
    clsVals("ShiftRPM", index).Value = val(txtShiftRPM(index).Text)
    CheckShiftRPM index, OldValue
End Sub

Private Sub txtShiftRPM_MouseMove(index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, clsVals("ShiftRPM", index)
End Sub

Private Sub CheckShiftRPM(ThisGR As Integer, OldValue As Single)
Dim Cancel As Boolean
Dim MsgCap As String, MsgTxt As String
Dim i As Integer, NGR As Integer, vbReply As Integer
Dim Work As Single
    If clsVals("ShiftRPM", ThisGR).Value = OldValue Then Exit Sub
    
    MsgCap = "Help: Transmission Shift@ RPM Data"
    
    For i = 1 To 6                                  'find the current NGR
        If clsVals("TransGR", i).Value > 0 Then NGR = i Else Exit For
    Next
    
    If clsVals("TransGR", ThisGR).Value = 0 Then
        MsgTxt = "Gear Ratio must alway be entered before the Efficiency and Shift@ RPM!"
        MsgBox MsgTxt, vbExclamation, MsgCap
        clsVals("ShiftRPM", ThisGR).Value = OldValue
        'setfocus TransGR, ThisGR - Patrick
        Exit Sub
    End If
    
    If clsVals("ShiftRPM", ThisGR).Value = 0 Then
        If ThisGR = 1 Then
            If NGR = 1 Then
                clsVals("ShiftRPM", ThisGR).Value = gc_RPMPeakHP.Value
            Else
                Work = clsVals("ShiftRPM", ThisGR + 1).Value
                If Work = 0 Then
                    clsVals("ShiftRPM", ThisGR).Value = gc_RPMPeakHP.Value
                Else
                    clsVals("ShiftRPM", ThisGR).Value = Work
                End If
            End If
        Else
            clsVals("ShiftRPM", ThisGR).Value = clsVals("ShiftRPM", ThisGR - 1).Value
        End If
    End If
    'setfocus - Patrick
    
    'last Shift@ RPM must be zero
    If clsVals("ShiftRPM", NGR).Value > 0 Then
        MsgTxt = "Shift@ RPM in high gear is not allowed."
        MsgBox MsgTxt, ERR_TYP_INPUT, MsgCap
        clsVals("ShiftRPM", NGR).Value = 0
    End If
    
    'check for missing Shift@ RPM data
    For i = 1 To NGR - 1
        If clsVals("ShiftRPM", i).Value = 0 Then
            MsgTxt = "Shift@ RPM value in gear " & i & " is required!"
            MsgBox MsgTxt, vbExclamation, MsgCap
            'setfocus - Patrick
            Exit For
        End If
    Next
    
    TestShiftRPM
    SetSlipStallRPM
    bFileDirty = True
End Sub


Private Sub txtEfficiency_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Efficiency
End Sub

Private Sub txtEfficiency_KeyPress(KeyAscii As Integer)
    gc_Efficiency.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtEfficiency_LostFocus()
    gc_Efficiency.Value = val(txtEfficiency.Text)
End Sub

Private Sub txtEfficiency_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Efficiency
End Sub


Private Sub txtTractionIndex_GotFocus()
    SetHelp Me, HELP_SAVE, gc_TractionIndex
End Sub

Private Sub txtTractionIndex_KeyPress(KeyAscii As Integer)
    gc_TractionIndex.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtTractionIndex_LostFocus()
    gc_TractionIndex.Value = val(txtTractionIndex.Text)
End Sub

Private Sub txtTractionIndex_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TractionIndex
End Sub


Private Sub txtTireWidth_GotFocus()
    SetHelp Me, HELP_SAVE, gc_TireWidth
End Sub

Private Sub txtTireWidth_KeyPress(KeyAscii As Integer)
    gc_TireWidth.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtTireWidth_LostFocus()
    gc_TireWidth.Value = val(txtTireWidth.Text)
End Sub

Private Sub txtTireWidth_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TireWidth
End Sub


Private Sub txtTireDia_GotFocus()
    SetHelp Me, HELP_SAVE, gc_TireDia
End Sub

Private Sub txtTireDia_KeyPress(KeyAscii As Integer)
    gc_TireDia.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtTireDia_Check
End Sub

Private Sub txtTireDia_LostFocus()
    gc_TireDia.Value = val(txtTireDia.Text)
    txtTireDia_Check
End Sub

Private Sub txtTireDia_Check()
    If gc_TireDia.IsChanged Then
        SetTireDiaStrings
        SetTireWidth
    
        gc_WSTireDia.Value = gc_TireDia.Value
        SetWSTireDiaStrings
    End If
End Sub

Private Sub txtTireDia_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TireDia
End Sub


Private Sub txtGearRatio_GotFocus()
    SetHelp Me, HELP_SAVE, gc_GearRatio
End Sub

Private Sub txtGearRatio_KeyPress(KeyAscii As Integer)
    gc_GearRatio.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtGearRatio_LostFocus()
    gc_GearRatio.Value = val(txtGearRatio.Text)
End Sub

Private Sub txtGearRatio_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_GearRatio
End Sub


Private Sub txtLaunchRPM_GotFocus()
    SetHelp Me, HELP_SAVE, gc_LaunchRPM
End Sub

Private Sub txtLaunchRPM_KeyPress(KeyAscii As Integer)
    gc_LaunchRPM.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtLaunchRPM_Check
End Sub

Private Sub txtLaunchRPM_LostFocus()
    gc_LaunchRPM.Value = val(txtLaunchRPM.Text)
    txtLaunchRPM_Check
End Sub

Private Sub txtLaunchRPM_Check()
    If gc_LaunchRPM.IsChanged Then
        TestLaunchRPM
        SetSlipStallRPM
    End If
End Sub

Private Sub txtLaunchRPM_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_LaunchRPM
End Sub


Private Sub txtSlipStallRPM_GotFocus()
    SetHelp Me, HELP_SAVE, gc_SlipStallRPM
End Sub

Private Sub txtSlipStallRPM_KeyPress(KeyAscii As Integer)
    gc_SlipStallRPM.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtSlipStallRPM_Check
End Sub

Private Sub txtSlipStallRPM_LostFocus()
    gc_SlipStallRPM.Value = val(txtSlipStallRPM.Text)
    txtSlipStallRPM_Check
End Sub

Private Sub txtSlipStallRPM_Check()
    If gc_SlipStallRPM.IsChanged Then
        SetTransTypeStrings
        TestSlipStallRPM
        SetLaunchRPM
        SetShiftRPM
    End If
End Sub

Private Sub txtSlipStallRPM_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_SlipStallRPM
End Sub


'Buell Motorcycle CG variables
Private Sub txtStaticFWt_GotFocus()
    SetHelp Me, HELP_SAVE, gc_StaticFWt
End Sub

Private Sub txtStaticFWt_KeyPress(KeyAscii As Integer)
    gc_StaticFWt.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtStaticFWt_Check
End Sub

Private Sub txtStaticFWt_LostFocus()
    gc_StaticFWt.Value = val(txtStaticFWt.Text)
    txtStaticFWt_Check
End Sub

Private Sub txtStaticFWt_Check()
    If gc_StaticFWt.IsChanged Then
        gc_XCG.IsCalc = True
        gc_XCG.Value = Round(gc_Wheelbase.Value * gc_StaticFWt.Value / gc_Weight.Value, 0.1)
    End If
End Sub

Private Sub txtStaticFWt_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_StaticFWt
End Sub


Private Sub txtYCG_GotFocus()
    SetHelp Me, HELP_SAVE, gc_YCG
End Sub

Private Sub txtYCG_KeyPress(KeyAscii As Integer)
    gc_YCG.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtYCG_LostFocus()
    gc_YCG.Value = val(txtYCG.Text)
End Sub

Private Sub txtYCG_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_YCG
End Sub


Private Sub txtXCG_GotFocus()
    SetHelp Me, HELP_SAVE, gc_XCG
End Sub

Private Sub txtXCG_KeyPress(KeyAscii As Integer)
    gc_XCG.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtXCG_Check
End Sub

Private Sub txtXCG_LostFocus()
    gc_XCG.Value = val(txtXCG.Text)
    txtXCG_Check
End Sub

Private Sub txtXCG_Check()
    If gc_XCG.IsChanged Then
        gc_StaticFWt.IsCalc = True
        gc_StaticFWt.Value = Round(gc_Weight.Value * gc_XCG.Value / gc_Wheelbase.Value, 1)
    End If
End Sub

Private Sub txtXCG_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_XCG
End Sub


Private Sub txtRollout_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Rollout
End Sub

Private Sub txtRollout_KeyPress(KeyAscii As Integer)
    gc_Rollout.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn And gc_Rollout.IsChanged Then TestRollout
End Sub

Private Sub txtRollout_LostFocus()
    gc_Rollout.Value = val(txtRollout.Text)
    If gc_Rollout.IsChanged Then TestRollout
End Sub
    
Private Sub txtRollout_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Rollout
End Sub


Private Sub txtOverhang_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Overhang
End Sub

Private Sub txtOverhang_KeyPress(KeyAscii As Integer)
    gc_Overhang.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn And gc_Overhang.IsChanged Then TestOverhang
End Sub

Private Sub txtOverhang_LostFocus()
    gc_Overhang.Value = val(txtOverhang.Text)
    If gc_Overhang.IsChanged Then TestOverhang
End Sub
    
Private Sub txtOverhang_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Overhang
End Sub


Private Sub txtWheelbase_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Wheelbase
End Sub

Private Sub txtWheelbase_KeyPress(KeyAscii As Integer)
    gc_Wheelbase.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtWheelbase_LostFocus()
    gc_Wheelbase.Value = val(txtWheelbase.Text)
End Sub

Private Sub txtWheelbase_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Wheelbase
End Sub


Private Sub txtWeight_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Weight
End Sub

Private Sub txtWeight_KeyPress(KeyAscii As Integer)
    gc_Weight.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtWeight_Check
End Sub

Private Sub txtWeight_LostFocus()
    gc_Weight.Value = val(txtWeight.Text)
    txtWeight_Check
End Sub

Private Sub txtWeight_Check()
    If gc_Weight.IsChanged Then
        CalcBodyStyle frmQuarter.btnGearRatio
        SetTireWidth
        If gc_BodyStyle.IsChanged Then TestRefArea
    End If
End Sub

Private Sub txtWeight_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Weight
End Sub


Private Sub txtWindSpeed_GotFocus()
    SetHelp Me, HELP_SAVE, gc_WindSpeed
End Sub

Private Sub txtWindSpeed_KeyPress(KeyAscii As Integer)
    gc_WindSpeed.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtWindSpeed_LostFocus()
    gc_WindSpeed.Value = val(txtWindSpeed.Text)
End Sub

Private Sub txtWindSpeed_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_WindSpeed
End Sub


Private Sub txtWindAngle_GotFocus()
    SetHelp Me, HELP_SAVE, gc_WindAngle
End Sub

Private Sub txtWindAngle_KeyPress(KeyAscii As Integer)
    gc_WindAngle.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtWindAngle_LostFocus()
    gc_WindAngle.Value = val(txtWindAngle.Text)
End Sub

Private Sub txtWindAngle_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_WindAngle
End Sub


Private Sub txtHumidity_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Humidity
End Sub

Private Sub txtHumidity_KeyPress(KeyAscii As Integer)
    gc_Humidity.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtHumidity_LostFocus()
    gc_Humidity.Value = val(txtHumidity.Text)
End Sub

Private Sub txtHumidity_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Humidity
End Sub


Private Sub txtTemperature_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Temperature
End Sub

Private Sub txtTemperature_KeyPress(KeyAscii As Integer)
    gc_Temperature.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then
        If gc_Temperature.IsChanged Then SetTrackTemp
    End If
End Sub

Private Sub txtTemperature_LostFocus()
    gc_Temperature.Value = val(txtTemperature.Text)
    If gc_Temperature.IsChanged Then SetTrackTemp
End Sub

Private Sub txtTemperature_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Temperature
End Sub


Private Sub txtTrackTemp_GotFocus()
    SetHelp Me, HELP_SAVE, gc_TrackTemp
End Sub

Private Sub txtTrackTemp_KeyPress(KeyAscii As Integer)
    gc_TrackTemp.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtTrackTemp_LostFocus()
    gc_TrackTemp.Value = val(txtTrackTemp.Text)
End Sub

Private Sub txtTrackTemp_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TrackTemp
End Sub


Private Sub btnTiresPMI_GotFocus()
    SetHelp Me, HELP_SAVE, gc_TiresPMIBtn
End Sub

Private Sub btnTiresPMI_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TiresPMIBtn
End Sub


Private Sub btnTransPMI_GotFocus()
    SetHelp Me, HELP_SAVE, gc_TransPMIBtn
End Sub

Private Sub btnTransPMI_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TransPMIBtn
End Sub


Private Sub btnEnginePMI_GotFocus()
    SetHelp Me, HELP_SAVE, gc_EnginePMIBtn
End Sub

Private Sub btnEnginePMI_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_EnginePMIBtn
End Sub


Private Sub btnRefArea_GotFocus()
    SetHelp Me, HELP_SAVE, gc_RefAreaBtn
End Sub

Private Sub btnRefArea_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_RefAreaBtn
End Sub


Private Sub btnDragCoef_GotFocus()
    SetHelp Me, HELP_SAVE, gc_DragCoefBtn
End Sub

Private Sub btnDragCoef_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_DragCoefBtn
End Sub


Private Sub btnTractionIndex_GotFocus()
    SetHelp Me, HELP_SAVE, gc_TractionIndexBtn
End Sub

Private Sub btnTractionIndex_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TractionIndexBtn
End Sub


Private Sub btnTireWidth_GotFocus()
    SetHelp Me, HELP_SAVE, gc_TireWidthBtn
End Sub

Private Sub btnTireWidth_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TireWidthBtn
End Sub


Private Sub btnWindAngle_GotFocus()
    SetHelp Me, HELP_SAVE, gc_WindAngleBtn
End Sub

Private Sub btnWindAngle_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_WindAngleBtn
End Sub


Private Sub btnDynoData_GotFocus()
    SetHelp Me, HELP_SAVE, gc_DynoDataBtn
End Sub

Private Sub btnDynoData_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_DynoDataBtn
End Sub


Private Sub btnGearRatio_GotFocus()
    SetHelp Me, HELP_SAVE, gc_GearRatioBtn
End Sub

Private Sub btnGearRatio_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_GearRatioBtn
End Sub


Public Property Get ofn() As String
    ofn = mofn
End Property

Public Property Let ofn(vNewValue As String)
    mofn = vNewValue
    UnloadForms
    frmQuarter.Show
End Property


Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property

Public Function TestDirty() As Integer 'vbCancel = 2
    TestDirty = vbNo                   'vbNo = 7
    If bFileDirty Then                 'vbYes = 6
        TestDirty = MsgBox("Do you want to save the current data?", vbInformation + vbYesNoCancel, "Input Data Has Changed!")
    End If
End Function
