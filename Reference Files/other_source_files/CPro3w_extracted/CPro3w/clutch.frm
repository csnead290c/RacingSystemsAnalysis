VERSION 5.00
Object = "{0BA686C6-F7D3-101A-993E-0000C0EF6F5E}#1.0#0"; "threed32.ocx"
Object = "{00028C01-0000-0000-0000-000000000046}#1.0#0"; "DBGRID32.OCX"
Object = "{827E9F53-96A4-11CF-823E-000021570103}#1.0#0"; "GRAPHS32.OCX"
Object = "{F9043C88-F6F2-101A-A3C9-08002B2F49FB}#1.2#0"; "COMDLG32.OCX"
Begin VB.Form frmClutch 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "CLUTCH Pro for Windows"
   ClientHeight    =   7980
   ClientLeft      =   15
   ClientTop       =   615
   ClientWidth     =   12000
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   7980
   ScaleWidth      =   12000
   Begin MSComDlg.CommonDialog CommonDialog1 
      Left            =   120
      Top             =   2700
      _ExtentX        =   847
      _ExtentY        =   847
      _Version        =   393216
   End
   Begin VB.Frame Frame11 
      Caption         =   "Racetrack Data"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1080
      Left            =   30
      TabIndex        =   73
      Top             =   1875
      Width           =   3090
      Begin VB.TextBox txtAmax 
         Height          =   285
         Left            =   2490
         MaxLength       =   7
         TabIndex        =   8
         Top             =   450
         Width           =   540
      End
      Begin VB.TextBox txtT60 
         Height          =   285
         Left            =   2490
         MaxLength       =   7
         TabIndex        =   7
         Top             =   180
         Width           =   540
      End
      Begin VB.CommandButton btnTractionIndex 
         Caption         =   "?"
         Height          =   270
         Left            =   2160
         TabIndex        =   38
         ToolTipText     =   "Press this button to display Help for the Traction Index"
         Top             =   735
         Width           =   270
      End
      Begin VB.TextBox txtTractionIndex 
         Height          =   285
         Left            =   2490
         MaxLength       =   7
         TabIndex        =   9
         Top             =   720
         Width           =   540
      End
      Begin VB.Label Label1 
         Caption         =   "Traction Index"
         Height          =   195
         Index           =   22
         Left            =   120
         TabIndex        =   76
         Top             =   765
         Width           =   1800
      End
      Begin VB.Label Label1 
         Caption         =   "Maximum Acceleration - g's"
         Height          =   195
         Index           =   15
         Left            =   120
         TabIndex        =   75
         Top             =   495
         Width           =   2100
      End
      Begin VB.Label Label1 
         Caption         =   "Estimated 60 ft Time - sec"
         Height          =   195
         Index           =   14
         Left            =   120
         TabIndex        =   74
         Top             =   225
         Width           =   2490
      End
   End
   Begin VB.Frame Frame10 
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
      Height          =   1890
      Left            =   30
      TabIndex        =   69
      Top             =   -30
      Width           =   3090
      Begin VB.TextBox txtLowGear 
         Height          =   285
         Left            =   2490
         MaxLength       =   7
         TabIndex        =   4
         Top             =   990
         Width           =   540
      End
      Begin VB.TextBox txtGearRatio 
         Height          =   285
         Left            =   2490
         MaxLength       =   7
         TabIndex        =   5
         Top             =   1260
         Width           =   540
      End
      Begin VB.TextBox txtTireDia 
         Height          =   285
         Left            =   2490
         MaxLength       =   7
         TabIndex        =   6
         Top             =   1530
         Width           =   540
      End
      Begin VB.CommandButton btnGearRatio 
         Caption         =   ">>"
         Height          =   270
         Left            =   2100
         TabIndex        =   37
         ToolTipText     =   "Press this button to display the Motorcycle Final Drive Ratio Worksheet"
         Top             =   1290
         Visible         =   0   'False
         Width           =   330
      End
      Begin VB.TextBox txtTemperature 
         Height          =   285
         Left            =   2490
         MaxLength       =   7
         TabIndex        =   2
         Top             =   450
         Width           =   540
      End
      Begin VB.TextBox txtBarometer 
         Height          =   285
         Left            =   2490
         MaxLength       =   7
         TabIndex        =   1
         Top             =   180
         Width           =   540
      End
      Begin VB.TextBox txtHumidity 
         Height          =   285
         Left            =   2490
         MaxLength       =   7
         TabIndex        =   3
         Top             =   720
         Width           =   540
      End
      Begin VB.Label Label1 
         Caption         =   "Low Gear Ratio"
         Height          =   195
         Index           =   1
         Left            =   120
         TabIndex        =   92
         Top             =   1035
         Width           =   2100
      End
      Begin VB.Label Label1 
         Caption         =   "Rear Gear Ratio"
         Height          =   195
         Index           =   19
         Left            =   120
         TabIndex        =   78
         Top             =   1305
         Width           =   1800
      End
      Begin VB.Label Label1 
         Caption         =   "Tire Diameter - inches"
         Height          =   195
         Index           =   20
         Left            =   120
         TabIndex        =   77
         Top             =   1575
         Width           =   2100
      End
      Begin VB.Label Label1 
         Caption         =   "Temperature - deg F"
         Height          =   195
         Index           =   2
         Left            =   120
         TabIndex        =   72
         Top             =   495
         Width           =   2100
      End
      Begin VB.Label Label1 
         Caption         =   "Barometer - in Hg"
         Height          =   195
         Index           =   3
         Left            =   120
         TabIndex        =   71
         Top             =   225
         Width           =   2100
      End
      Begin VB.Label Label1 
         Caption         =   "Relative Humidity - %"
         Height          =   195
         Index           =   4
         Left            =   120
         TabIndex        =   70
         Top             =   765
         Width           =   2100
      End
   End
   Begin VB.Frame Frame9 
      Caption         =   "Engine RPM    HP    Torque"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   3510
      Left            =   30
      TabIndex        =   66
      Top             =   4125
      Width           =   3090
      Begin VB.TextBox txtHPTQMult 
         Height          =   285
         Left            =   1710
         MaxLength       =   7
         TabIndex        =   36
         Top             =   3165
         Width           =   540
      End
      Begin VB.ComboBox cbxFuelSystem 
         Height          =   315
         Left            =   990
         Style           =   2  'Dropdown List
         TabIndex        =   35
         Top             =   2805
         Width           =   2055
      End
      Begin VB.CommandButton btnDynoData 
         Height          =   300
         Left            =   2745
         Picture         =   "clutch.frx":0000
         Style           =   1  'Graphical
         TabIndex        =   46
         ToolTipText     =   "Press this button to display the Engine Dyno Data Graph"
         Top             =   2475
         Width           =   300
      End
      Begin Threed.SSCommand btnRecalc 
         Height          =   315
         Left            =   2280
         TabIndex        =   47
         ToolTipText     =   "Press this button to multiply the Engine Dyno Data by the HP/Torque Multiplier"
         Top             =   3150
         Width           =   765
         _Version        =   65536
         _ExtentX        =   1349
         _ExtentY        =   556
         _StockProps     =   78
         Caption         =   "Recalc"
         ForeColor       =   8388608
         BeginProperty Font {0BE35203-8F91-11CE-9DE3-00AA004BB851} 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
      End
      Begin MSDBGrid.DBGrid grdDyno 
         Height          =   2565
         Left            =   450
         OleObjectBlob   =   "clutch.frx":0102
         TabIndex        =   34
         Top             =   210
         Width           =   2265
      End
      Begin VB.Label Label1 
         Caption         =   "Fuel System"
         Height          =   195
         Index           =   28
         Left            =   90
         TabIndex        =   68
         Top             =   2865
         Width           =   870
      End
      Begin VB.Label Label1 
         Caption         =   "HP/Torque Multiplier"
         Height          =   195
         Index           =   29
         Left            =   90
         TabIndex        =   67
         Top             =   3210
         Width           =   1800
      End
   End
   Begin VB.Frame Frame8 
      Caption         =   "Clutch Plate Force - lbs"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   3510
      Left            =   3165
      TabIndex        =   65
      Top             =   4125
      Width           =   6045
      Begin Threed.SSPanel sspTotal 
         Height          =   300
         Left            =   2790
         TabIndex        =   114
         Top             =   315
         Width           =   600
         _Version        =   65536
         _ExtentX        =   1058
         _ExtentY        =   529
         _StockProps     =   15
         Caption         =   "Total"
         BackColor       =   14737632
         BeginProperty Font {0BE35203-8F91-11CE-9DE3-00AA004BB851} 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         BorderWidth     =   1
         BevelOuter      =   0
         BevelInner      =   2
      End
      Begin Threed.SSPanel sspStatic 
         Height          =   300
         Left            =   2100
         TabIndex        =   113
         Top             =   2640
         Width           =   690
         _Version        =   65536
         _ExtentX        =   1217
         _ExtentY        =   529
         _StockProps     =   15
         Caption         =   "Static"
         BackColor       =   14737632
         BeginProperty Font {0BE35203-8F91-11CE-9DE3-00AA004BB851} 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         BorderWidth     =   1
         BevelOuter      =   0
         BevelInner      =   2
      End
      Begin MSDBGrid.DBGrid grdClutch 
         Height          =   2775
         Left            =   4200
         OleObjectBlob   =   "clutch.frx":0C71
         TabIndex        =   110
         Top             =   420
         Width           =   1800
      End
      Begin GraphsLib.Graph gph1 
         Height          =   3270
         Left            =   30
         TabIndex        =   111
         TabStop         =   0   'False
         Top             =   195
         Width           =   4155
         _Version        =   327680
         _ExtentX        =   7329
         _ExtentY        =   5768
         _StockProps     =   96
         BorderStyle     =   1
         AutoInc         =   0
         Background      =   "14~-1~-1~-1~-1~-1~-1"
         ColorData       =   "8~0~8~0"
         CurveSteps      =   10
         FontName        =   "Arial Narrow~Arial Narrow~Arial~Arial"
         FontSize        =   "125~125~75~100"
         Foreground      =   "16~16~16~16~16~16~16~16~16~16~16~12~16~16~16"
         GraphData       =   "6.2~2.2~3.1~4.2~5"
         GraphStyle      =   4
         GraphType       =   6
         GridLineStyle   =   2
         GridStyle       =   3
         NumSets         =   4
         OverlayColor    =   "15"
         OverlayGraph    =   1
         OverlayGraphData=   "2~7~5~6~4"
         OverlayGraphStyle=   1
         OverlayPattern  =   "2"
         OverlaySymbol   =   "13"
         PatternData     =   "1~2~0~1"
         RandomData      =   0
         SymbolData      =   "0~0~0~0"
         SymbolSize      =   160
         XAxisPos        =   2
         XAxisStyle      =   2
         XPosData        =   "1~2~3~4~5"
         YAxisPos        =   "1~0"
         YAxisStyle      =   "2~0"
         OverlayTrendSets=   "0"
         OverlayXPosData =   "1~2~3~4~5"
         TrendSets       =   "0"
      End
   End
   Begin VB.Frame Frame7 
      Caption         =   "Clutch Arm Data"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1890
      Left            =   3165
      TabIndex        =   64
      Top             =   -30
      Width           =   3300
      Begin VB.CommandButton btnMfgStyle 
         Caption         =   "?"
         Height          =   270
         Left            =   1530
         TabIndex        =   42
         ToolTipText     =   "Press this button to display Help for the Mfg.Style Code"
         Top             =   180
         Width           =   270
      End
      Begin VB.TextBox txtArmDepth2 
         Height          =   285
         Left            =   2700
         MaxLength       =   7
         TabIndex        =   24
         Top             =   1530
         Width           =   540
      End
      Begin VB.TextBox txtRingHt2 
         Height          =   285
         Left            =   2700
         MaxLength       =   7
         TabIndex        =   23
         Top             =   1260
         Width           =   540
      End
      Begin VB.TextBox txtCWt2 
         Height          =   285
         Left            =   2700
         MaxLength       =   7
         TabIndex        =   22
         Top             =   990
         Width           =   540
      End
      Begin VB.TextBox txtTCWt2 
         Height          =   285
         Left            =   2700
         MaxLength       =   7
         TabIndex        =   21
         Top             =   720
         Width           =   540
      End
      Begin VB.TextBox txtNArm2 
         Height          =   285
         Left            =   2700
         MaxLength       =   7
         TabIndex        =   20
         Top             =   450
         Width           =   540
      End
      Begin VB.TextBox txtMfg2 
         Height          =   285
         Left            =   2625
         MaxLength       =   7
         TabIndex        =   19
         Top             =   180
         Width           =   615
      End
      Begin VB.TextBox txtArmDepth1 
         Height          =   285
         Left            =   1950
         MaxLength       =   7
         TabIndex        =   18
         Top             =   1530
         Width           =   540
      End
      Begin VB.TextBox txtRingHt1 
         Height          =   285
         Left            =   1950
         MaxLength       =   7
         TabIndex        =   17
         Top             =   1260
         Width           =   540
      End
      Begin VB.TextBox txtCwt1 
         Height          =   285
         Left            =   1950
         MaxLength       =   7
         TabIndex        =   16
         Top             =   990
         Width           =   540
      End
      Begin VB.TextBox txtTCWt1 
         Height          =   285
         Left            =   1950
         MaxLength       =   7
         TabIndex        =   15
         Top             =   720
         Width           =   540
      End
      Begin VB.TextBox txtNArm1 
         Height          =   285
         Left            =   1950
         MaxLength       =   7
         TabIndex        =   14
         Top             =   450
         Width           =   540
      End
      Begin VB.TextBox txtMfg1 
         Height          =   285
         Left            =   1875
         MaxLength       =   7
         TabIndex        =   13
         Top             =   180
         Width           =   615
      End
      Begin VB.Label Label1 
         Caption         =   "Arm Depth - inches"
         Height          =   195
         Index           =   38
         Left            =   120
         TabIndex        =   91
         Top             =   1575
         Width           =   1800
      End
      Begin VB.Label Label1 
         Caption         =   "Ring Height - inches"
         Height          =   195
         Index           =   37
         Left            =   120
         TabIndex        =   90
         Top             =   1305
         Width           =   1800
      End
      Begin VB.Label Label1 
         Caption         =   "Counter Wt/Arm - grams"
         Height          =   195
         Index           =   36
         Left            =   120
         TabIndex        =   89
         Top             =   1035
         Width           =   1800
      End
      Begin VB.Label Label1 
         Caption         =   "Total Counter Wt - grams"
         Height          =   195
         Index           =   34
         Left            =   120
         TabIndex        =   88
         Top             =   765
         Width           =   1800
      End
      Begin VB.Label Label1 
         Caption         =   "Number of Arms"
         Height          =   195
         Index           =   30
         Left            =   120
         TabIndex        =   87
         Top             =   495
         Width           =   1800
      End
      Begin VB.Label Label1 
         Caption         =   "Mfg.Style Code"
         Height          =   195
         Index           =   27
         Left            =   120
         TabIndex        =   86
         Top             =   225
         Width           =   1800
      End
   End
   Begin VB.Frame Frame6 
      Caption         =   "Clutch Spring and Disk Data"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   525
      Left            =   3165
      TabIndex        =   63
      Top             =   1875
      Width           =   3300
      Begin VB.CommandButton btnStatic 
         Caption         =   "..."
         Height          =   270
         Left            =   2370
         TabIndex        =   43
         ToolTipText     =   "Press this button to display the Static Plate Force Worksheet"
         Top             =   195
         Width           =   270
      End
      Begin VB.TextBox txtStatic 
         Height          =   285
         Left            =   2700
         MaxLength       =   7
         TabIndex        =   25
         Top             =   180
         Width           =   540
      End
      Begin VB.Label Label1 
         Caption         =   "Static Plate Force - lbs"
         Height          =   195
         Index           =   26
         Left            =   120
         TabIndex        =   85
         Top             =   225
         Width           =   2100
      End
   End
   Begin VB.Frame Frame5 
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1830
      Left            =   3165
      TabIndex        =   62
      Top             =   2280
      Width           =   3300
      Begin VB.CommandButton btnFriction 
         Caption         =   "?"
         Height          =   270
         Left            =   2370
         TabIndex        =   45
         ToolTipText     =   "Press this button to display Help for the Friction Coefficient"
         Top             =   1515
         Width           =   270
      End
      Begin VB.CommandButton btnClArea 
         Caption         =   "..."
         Height          =   270
         Left            =   2370
         TabIndex        =   44
         ToolTipText     =   "Press this button to display the Effective Friction Area Worksheet"
         Top             =   1245
         Width           =   270
      End
      Begin VB.TextBox txtNDisk 
         Height          =   285
         Left            =   2700
         MaxLength       =   7
         TabIndex        =   26
         Top             =   150
         Width           =   540
      End
      Begin VB.TextBox txtDiskWt 
         Height          =   285
         Left            =   2700
         MaxLength       =   7
         TabIndex        =   27
         Top             =   420
         Width           =   540
      End
      Begin VB.TextBox txtDiskOD 
         Height          =   285
         Left            =   2700
         MaxLength       =   7
         TabIndex        =   28
         Top             =   690
         Width           =   540
      End
      Begin VB.TextBox txtDiskID 
         Height          =   285
         Left            =   2700
         MaxLength       =   7
         TabIndex        =   29
         Top             =   960
         Width           =   540
      End
      Begin VB.TextBox txtClArea 
         Height          =   285
         Left            =   2700
         MaxLength       =   7
         TabIndex        =   30
         Top             =   1230
         Width           =   540
      End
      Begin VB.TextBox txtCMU 
         Height          =   285
         Left            =   2700
         MaxLength       =   7
         TabIndex        =   31
         Top             =   1500
         Width           =   540
      End
      Begin VB.Label Label1 
         Caption         =   "Friction Coefficient"
         Height          =   195
         Index           =   25
         Left            =   120
         TabIndex        =   84
         Top             =   1545
         Width           =   2100
      End
      Begin VB.Label Label1 
         Caption         =   "Number of Disks"
         Height          =   195
         Index           =   24
         Left            =   120
         TabIndex        =   83
         Top             =   195
         Width           =   2100
      End
      Begin VB.Label Label1 
         Caption         =   "Total Disk Weight - lbs"
         Height          =   195
         Index           =   23
         Left            =   120
         TabIndex        =   82
         Top             =   465
         Width           =   2100
      End
      Begin VB.Label Label1 
         Caption         =   "Outer Disk Diameter - inches"
         Height          =   195
         Index           =   21
         Left            =   120
         TabIndex        =   81
         Top             =   735
         Width           =   2100
      End
      Begin VB.Label Label1 
         Caption         =   "Inner Disk Diameter - inches"
         Height          =   195
         Index           =   18
         Left            =   120
         TabIndex        =   80
         Top             =   1005
         Width           =   2100
      End
      Begin VB.Label Label1 
         Caption         =   "Effective Friction Area - %"
         Height          =   195
         Index           =   16
         Left            =   120
         TabIndex        =   79
         Top             =   1275
         Width           =   2100
      End
   End
   Begin VB.Frame Frame4 
      Caption         =   "Polar Moments of Inertia"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1080
      Left            =   30
      TabIndex        =   58
      Top             =   3030
      Width           =   3090
      Begin VB.CommandButton btnEnginePMI 
         Caption         =   "..."
         Height          =   270
         Left            =   2160
         TabIndex        =   39
         ToolTipText     =   "Press this button to display the Engine PMI Worksheet"
         Top             =   210
         Width           =   270
      End
      Begin VB.TextBox txtTiresPMI 
         Height          =   285
         Left            =   2490
         MaxLength       =   7
         TabIndex        =   12
         Top             =   720
         Width           =   540
      End
      Begin VB.TextBox txtTransPMI 
         Height          =   285
         Left            =   2490
         MaxLength       =   7
         TabIndex        =   11
         Top             =   450
         Width           =   540
      End
      Begin VB.TextBox txtEnginePMI 
         Height          =   285
         Left            =   2490
         MaxLength       =   7
         TabIndex        =   10
         Top             =   180
         Width           =   540
      End
      Begin VB.CommandButton btnTransPMI 
         Caption         =   "..."
         Height          =   270
         Left            =   2160
         TabIndex        =   40
         ToolTipText     =   "Press this button to display the Transmission PMI worksheet"
         Top             =   465
         Width           =   270
      End
      Begin VB.CommandButton btnTiresPMI 
         Caption         =   "..."
         Height          =   270
         Left            =   2160
         TabIndex        =   41
         ToolTipText     =   "Press this button to display the Final Drive PMI Worksheet"
         Top             =   735
         Width           =   270
      End
      Begin VB.Label Label1 
         Caption         =   "Tires + Wheels + Ring Gear"
         Height          =   195
         Index           =   31
         Left            =   120
         TabIndex        =   61
         Top             =   765
         Width           =   2100
      End
      Begin VB.Label Label1 
         Caption         =   "Transmission + Driveshaft"
         Height          =   195
         Index           =   32
         Left            =   120
         TabIndex        =   60
         Top             =   495
         Width           =   2100
      End
      Begin VB.Label Label1 
         Caption         =   "Engine + Flywheel + Clutch"
         Height          =   195
         Index           =   33
         Left            =   120
         TabIndex        =   59
         Top             =   225
         Width           =   2100
      End
   End
   Begin VB.Frame Frame3 
      Caption         =   "Clutch Torque Capacity - ft lbs"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   4140
      Left            =   6510
      TabIndex        =   57
      Top             =   -30
      Width           =   5460
      Begin Threed.SSPanel sspLowGear 
         Height          =   300
         Left            =   2490
         TabIndex        =   116
         Top             =   3330
         Width           =   1320
         _Version        =   65536
         _ExtentX        =   2328
         _ExtentY        =   529
         _StockProps     =   15
         Caption         =   "Low Gear"
         BackColor       =   14737632
         BeginProperty Font {0BE35203-8F91-11CE-9DE3-00AA004BB851} 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         BorderWidth     =   1
         BevelOuter      =   0
         BevelInner      =   2
      End
      Begin Threed.SSPanel sspHighGear 
         Height          =   300
         Left            =   3780
         TabIndex        =   115
         Top             =   300
         Width           =   1410
         _Version        =   65536
         _ExtentX        =   2487
         _ExtentY        =   529
         _StockProps     =   15
         Caption         =   "High Gear"
         BackColor       =   14737632
         BeginProperty Font {0BE35203-8F91-11CE-9DE3-00AA004BB851} 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         BorderWidth     =   1
         BevelOuter      =   0
         BevelInner      =   2
      End
      Begin GraphsLib.Graph gph2 
         Height          =   3900
         Left            =   30
         TabIndex        =   112
         TabStop         =   0   'False
         Top             =   210
         Width           =   5385
         _Version        =   327680
         _ExtentX        =   9499
         _ExtentY        =   6879
         _StockProps     =   96
         BorderStyle     =   1
         AutoInc         =   0
         Background      =   "14~-1~-1~-1~-1~-1~-1"
         ColorData       =   "12~12~8~8~12~12~0~0"
         CurveSteps      =   10
         FontName        =   "Arial Narrow~Arial Narrow~Arial~Arial"
         FontSize        =   "125~125~75~100"
         GraphData       =   "6.2~2.2~3.1~4.2~5"
         GraphType       =   6
         GridLineStyle   =   2
         GridStyle       =   3
         Labels          =   2
         NumSets         =   8
         OverlayColor    =   "15"
         OverlayGraph    =   1
         OverlayGraphData=   "2~7~5~6~4"
         OverlayGraphStyle=   1
         OverlayPattern  =   "2"
         OverlaySymbol   =   "13"
         PatternData     =   "1~1~1~1~2~2~2~2"
         RandomData      =   0
         SymbolSize      =   133
         XAxisPos        =   2
         XAxisStyle      =   2
         XPosData        =   "1~2~3~4~5"
         YAxisPos        =   "1~0"
         YAxisStyle      =   "2~0"
         OverlayTrendSets=   "0"
         OverlayXPosData =   "1~2~3~4~5"
         TrendSets       =   "0~0~0~0"
      End
   End
   Begin VB.Frame Frame2 
      Caption         =   "Clutch Forces @ Launch"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   540
      Left            =   9270
      TabIndex        =   55
      Top             =   5535
      Width           =   2700
      Begin VB.TextBox txtLaunchRPM 
         Height          =   285
         Left            =   2100
         MaxLength       =   7
         TabIndex        =   32
         Top             =   180
         Width           =   540
      End
      Begin VB.Label Label1 
         Caption         =   "Launch RPM"
         Height          =   195
         Index           =   13
         Left            =   120
         TabIndex        =   56
         Top             =   240
         Width           =   1500
      End
   End
   Begin VB.Frame Frame1 
      Caption         =   "Clutch Forces @ Lockup"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1350
      Left            =   9270
      TabIndex        =   50
      Top             =   4125
      Width           =   2700
      Begin VB.Label Label7 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "Label7"
         Height          =   285
         Left            =   2100
         TabIndex        =   109
         Top             =   450
         Width           =   540
      End
      Begin VB.Label Label8 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "Label8"
         Height          =   285
         Left            =   2100
         TabIndex        =   108
         Top             =   720
         Width           =   540
      End
      Begin VB.Label Label9 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "Label9"
         Height          =   285
         Left            =   2100
         TabIndex        =   107
         Top             =   990
         Width           =   540
      End
      Begin VB.Label Label4 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "Label4"
         Height          =   285
         Left            =   1305
         TabIndex        =   106
         Top             =   450
         Width           =   540
      End
      Begin VB.Label Label5 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "Label5"
         Height          =   285
         Left            =   1305
         TabIndex        =   105
         Top             =   720
         Width           =   540
      End
      Begin VB.Label Label6 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "Label6"
         Height          =   285
         Left            =   1305
         TabIndex        =   104
         Top             =   990
         Width           =   540
      End
      Begin VB.Label Label1 
         Caption         =   "Friction PSI"
         Height          =   195
         Index           =   17
         Left            =   120
         TabIndex        =   54
         Top             =   1020
         Width           =   1200
      End
      Begin VB.Label Label1 
         Caption         =   "Plate Force - lbs"
         Height          =   195
         Index           =   12
         Left            =   120
         TabIndex        =   53
         Top             =   750
         Width           =   1200
      End
      Begin VB.Label Label1 
         Caption         =   "Lockup RPM"
         Height          =   195
         Index           =   11
         Left            =   120
         TabIndex        =   52
         Top             =   480
         Width           =   1200
      End
      Begin VB.Label Label1 
         Caption         =   "Calculated ---- Low Gear  High Gear"
         Height          =   195
         Index           =   10
         Left            =   120
         TabIndex        =   51
         Top             =   210
         Width           =   2550
      End
   End
   Begin Threed.SSPanel pnlInput 
      Height          =   270
      Index           =   1
      Left            =   10125
      TabIndex        =   0
      Top             =   7665
      Width           =   900
      _Version        =   65536
      _ExtentX        =   1588
      _ExtentY        =   476
      _StockProps     =   15
      BackColor       =   -2147483644
      BeginProperty Font {0BE35203-8F91-11CE-9DE3-00AA004BB851} 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
   End
   Begin Threed.SSPanel pnlInput 
      Height          =   270
      Index           =   2
      Left            =   11055
      TabIndex        =   48
      Top             =   7665
      Width           =   900
      _Version        =   65536
      _ExtentX        =   1588
      _ExtentY        =   476
      _StockProps     =   15
      BackColor       =   -2147483644
      BeginProperty Font {0BE35203-8F91-11CE-9DE3-00AA004BB851} 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
   End
   Begin Threed.SSPanel pnlInput 
      Height          =   270
      Index           =   0
      Left            =   60
      TabIndex        =   49
      Top             =   7665
      Width           =   10035
      _Version        =   65536
      _ExtentX        =   17701
      _ExtentY        =   476
      _StockProps     =   15
      BackColor       =   -2147483644
      BeginProperty Font {0BE35203-8F91-11CE-9DE3-00AA004BB851} 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Alignment       =   1
   End
   Begin VB.Frame Frame12 
      Height          =   765
      Left            =   9270
      TabIndex        =   93
      Top             =   5955
      Width           =   2700
      Begin VB.TextBox txtAirGap 
         Height          =   285
         Left            =   2100
         MaxLength       =   7
         TabIndex        =   33
         Top             =   150
         Width           =   540
      End
      Begin VB.Label Label1 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "Label1"
         Height          =   285
         Index           =   6
         Left            =   2100
         TabIndex        =   100
         Top             =   420
         Width           =   540
      End
      Begin VB.Label Label1 
         Caption         =   "Plate Force - lbs"
         Height          =   195
         Index           =   5
         Left            =   120
         TabIndex        =   95
         Top             =   480
         Width           =   1500
      End
      Begin VB.Label Label1 
         Caption         =   "With Air Gap - inches"
         Height          =   195
         Index           =   0
         Left            =   120
         TabIndex        =   94
         Top             =   210
         Width           =   1500
      End
   End
   Begin VB.Frame Frame13 
      Height          =   1035
      Left            =   9270
      TabIndex        =   96
      Top             =   6600
      Width           =   2700
      Begin VB.Label Label3 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "Label3"
         Height          =   285
         Left            =   2100
         TabIndex        =   103
         Top             =   690
         Width           =   540
      End
      Begin VB.Label Label2 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "Label2"
         Height          =   285
         Left            =   2100
         TabIndex        =   102
         Top             =   420
         Width           =   540
      End
      Begin VB.Label Label0 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "0.000"
         Height          =   285
         Left            =   2100
         TabIndex        =   101
         Top             =   150
         Width           =   540
      End
      Begin VB.Label Label1 
         Caption         =   "Plate Force - lbs"
         Height          =   195
         Index           =   8
         Left            =   120
         TabIndex        =   99
         Top             =   450
         Width           =   1500
      End
      Begin VB.Label Label1 
         Caption         =   "Zero Air Gap - inches"
         Height          =   195
         Index           =   7
         Left            =   120
         TabIndex        =   98
         Top             =   180
         Width           =   1500
      End
      Begin VB.Label Label1 
         Caption         =   "Friction PSI"
         Height          =   195
         Index           =   9
         Left            =   120
         TabIndex        =   97
         Top             =   720
         Width           =   1500
      End
   End
   Begin VB.Menu mnuFileMain 
      Caption         =   "&File"
      Begin VB.Menu mnuFile 
         Caption         =   "&Open"
         Index           =   0
      End
      Begin VB.Menu mnuFile 
         Caption         =   "&Save"
         Index           =   1
      End
      Begin VB.Menu mnuFile 
         Caption         =   "Save &As"
         Index           =   2
      End
      Begin VB.Menu mnuFile 
         Caption         =   "-"
         Index           =   3
      End
      Begin VB.Menu mnuFile 
         Caption         =   "&Restore"
         Index           =   4
      End
      Begin VB.Menu mnuFile 
         Caption         =   "-"
         Index           =   5
      End
      Begin VB.Menu mnuFile 
         Caption         =   "&Print"
         Index           =   6
      End
      Begin VB.Menu mnuFile 
         Caption         =   "&Exit"
         Index           =   7
      End
   End
   Begin VB.Menu mnuSave 
      Caption         =   "&Save"
   End
   Begin VB.Menu mnuRestore 
      Caption         =   "&Restore"
   End
   Begin VB.Menu mnuHelp 
      Caption         =   "&Help"
   End
End
Attribute VB_Name = "frmClutch"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Public fc_Value As Object
Private bFileDirty As Boolean
Private GridChanged As Boolean
Private LastFile As String
Private Mfg1SaveText As String
Private Mfg2SaveText As String
Private BarometerCaptionSave As String
Private NDiskSave As Single
Private DiskODSave As Single
Private vbreply As Integer

Private Sub Form_Activate()
Static IsLoaded As Boolean
    If Not IsLoaded Then
        gc_Barometer.ClsControl = txtBarometer
        gc_Temperature.ClsControl = txtTemperature
        gc_Humidity.ClsControl = txtHumidity
        gc_LowGear.ClsControl = txtLowGear
        gc_GearRatio.ClsControl = txtGearRatio
        gc_TireDia.ClsControl = txtTireDia
    
        gc_T60.ClsControl = txtT60
        gc_Amax.ClsControl = txtAmax
        gc_TractionIndex.ClsControl = txtTractionIndex
    
        gc_EnginePMI.ClsControl = txtEnginePMI
        gc_TransPMI.ClsControl = txtTransPMI
        gc_TiresPMI.ClsControl = txtTiresPMI
        
        gc_FuelSystem.ClsControl = cbxFuelSystem
        gc_HPTQMult.ClsControl = txtHPTQMult
    
        gc_Mfg1.ClsControl = txtMfg1
        gc_NArm1.ClsControl = txtNArm1
        gc_TCWt1.ClsControl = txtTCWt1
        gc_CWt1.ClsControl = txtCwt1
        gc_RingHt1.ClsControl = txtRingHt1
        gc_ArmDepth1.ClsControl = txtArmDepth1

        gc_Mfg2.ClsControl = txtMfg2
        gc_NArm2.ClsControl = txtNArm2
        gc_TCWt2.ClsControl = txtTCWt2
        gc_CWt2.ClsControl = txtCWt2
        gc_RingHt2.ClsControl = txtRingHt2
        gc_ArmDepth2.ClsControl = txtArmDepth2

        gc_Static.ClsControl = txtStatic
        gc_NDisk.ClsControl = txtNDisk
        gc_DiskWt.ClsControl = txtDiskWt
        gc_DiskOD.ClsControl = txtDiskOD
        gc_DiskID.ClsControl = txtDiskID
        gc_ClArea.ClsControl = txtClArea
        gc_CMU.ClsControl = txtCMU
    
        gc_LaunchRPM.ClsControl = txtLaunchRPM
        gc_AirGap.ClsControl = txtAirGap
    
        FileName = App.Path & "\Clutch.RSA"
        LoadFromSave FileName
        IsLoaded = True
    End If
End Sub

Private Sub Form_Load()
    SetDynoGrid
    SetClutchGrid
End Sub

Private Sub Form_QueryUnload(Cancel As Integer, UnloadMode As Integer)
    If TestDirty() = vbCancel Then Cancel = True
End Sub

Private Sub gph1_DblClick()
    frmGraph.Show vbModal
End Sub

Private Sub gph2_DblClick()
    frmDetails.Show vbModal
End Sub

Private Sub mnuFile_Click(Index As Integer)
    On Error GoTo SubExit
    
    Select Case Index
        Case 0: If TestDirty() = vbCancel Then Exit Sub
        
                With CommonDialog1
                    .DialogTitle = "Open CLUTCH Pro Data File"
                    .Flags = cdlOFNHideReadOnly Or cdlOFNFileMustExist
                    .InitDir = App.Path
                    .FileName = "*.RSA"
                    .DefaultExt = "RSA"
                    .Filter = "CLUTCH Pro 3.0 Files"
                    .ShowOpen
                
                    If .FileName <> "" And .FileName <> "*.RSA" Then
                        FileName = Trim(.FileName)
                        Me.caption = App.Title & " - " & NameOnly(FileName)
                        LoadFromSave FileName
                    End If
                End With
        
        Case 1: mnuSave_Click
        Case 2: With CommonDialog1
                    .DialogTitle = "Save CLUTCH Pro Data File"
                    .Flags = cdlOFNOverwritePrompt Or cdlOFNPathMustExist
                    .InitDir = App.Path
                    .FileName = "*.RSA"
                    .DefaultExt = "RSA"
                    .Filter = "CLUTCH Pro 3.0 Files"
                    .ShowSave
                    
                    If .FileName <> "" And .FileName <> "*.RSA" Then
                        FileName = Trim(.FileName)
                        Me.caption = App.Title & " - " & NameOnly(FileName)
                        mnuSave_Click
                    End If
                End With
            
        Case 3: 'separater
        Case 4: mnuRestore_Click
        Case 5: 'separater
        
        Case 6: With CommonDialog1
                    .CancelError = True
                    .Flags = &H40&
                    .ShowPrinter
                End With
                
                MousePointer = vbHourglass
                Printer.FontName = "Courier New"
                PrintPage
                MousePointer = vbDefault
        
        Case 7: If TestDirty() = vbCancel Then Exit Sub
                End
    End Select

SubExit:
End Sub

Private Sub mnuSave_Click()
Dim i As Integer
Dim alt As Single, pbar As Single, z As Single
    MousePointer = vbHourglass
    
    SetSave 1
    Graph1
    Graph2
    
    If FileName = "" Or FileName = "(Untitled)" Then
        FileName = App.Path & "\Clutch.RSA"
        Me.caption = App.Title & " - " & NameOnly(FileName)
    End If
    
    'preserve old version 2.0 convention for pressure
    With gc_Barometer
        If .UOM = UOM_NORMAL Then
            alt = 0:        pbar = .Value
        Else
            alt = .Value:   pbar = 29.92
        End If
    End With
    
    On Error GoTo CloseSave
    
    Open FileName For Output As #1
    Write #1, "3.0"
    Write #1, alt, pbar, gc_Temperature.Value, gc_Humidity.Value, gc_FuelSystem.Value, gc_LowGear.Value, gc_GearRatio.Value
    Write #1, gc_TireDia.Value, gc_TractionIndex.Value, gc_Amax.Value, gc_EnginePMI.Value, gc_TransPMI.Value, gc_TiresPMI.Value
    
    Write #1, gc_Mfg1.Value, gc_NArm1.Value, gc_TCWt1.Value, gc_RingHt1.Value, gc_ArmDepth1.Value
    Write #1, gc_Mfg2.Value, gc_NArm2.Value, gc_TCWt2.Value, gc_RingHt2.Value, gc_ArmDepth2.Value
    
    Write #1, gc_PDRatio.Value, gc_HighGear.Value, gc_Countershaft.Value, gc_RearWheel.Value, gc_ArmDepth2.Value
    Write #1, gc_Static.Value, gc_NDisk.Value, gc_DiskWt.Value, gc_DiskOD.Value, gc_DiskID.Value, gc_ClArea.Value, gc_CMU.Value
    
    With gc_grdDyno
        For i = 0 To DYNO_ROWS - 1
            RPM(i + 1) = .GridArray(0, i)
            HP(i + 1) = .GridArray(1, i)
        Next
    End With
    
    Write #1, RPM(1), RPM(2), RPM(3), RPM(4), RPM(5), RPM(6)
    Write #1, RPM(7), RPM(8), RPM(9), RPM(10), RPM(11)
    Write #1, HP(1), HP(2), HP(3), HP(4), HP(5), HP(6)
    Write #1, HP(7), HP(8), HP(9), HP(10), HP(11)
    
    Write #1, gc_HPTQMult.Value, gc_LaunchRPM.Value, gc_AirGap.Value
    
    Write #1, gc_CrankWt.Value, gc_CrankStroke.Value, gc_FlywheelWt.Value, gc_FlywheelDia.Value, z
    Write #1, gc_WSTransType.Value, gc_TransWt.Value, gc_CaseDia.Value, z
    Write #1, gc_TireWt.Value, gc_WSTireDia.Value, gc_WheelWt.Value, gc_WheelDia.Value, z
    Write #1, gc_NSlot.Value, gc_SlotWD.Value, gc_NHole.Value, gc_HoleDia.Value, z
    Write #1, gc_NSpring.Value, gc_BasePr.Value, gc_SRate.Value, gc_Turns.Value, gc_ThrdpI.Value, gc_dRnHt.Value, z
    Write #1, gc_SeekLoRPM.Value, gc_SeekHiRPM.Value
    
    Write #1, AData(NARMD, 1), AData(NARMD, 2), AData(NARMD, 3), AData(NARMD, 4), AData(NARMD, 5), AData(NARMD, 6)
    Write #1, AData(NARMD, 7), AData(NARMD, 8), AData(NARMD, 9), AData(NARMD, 10), AData(NARMD, 11)
    
    LastFile = FileName
    bFileDirty = False
    
CloseSave:
    Close #1
    MousePointer = vbDefault
End Sub

Private Sub mnuRestore_Click()
    MousePointer = vbHourglass
    LoadFromSave LastFile
    MousePointer = vbDefault
End Sub

Private Sub mnuHelp_Click()
    MousePointer = vbHourglass
    frmSplash.BIsAbout = True
    frmSplash.Show vbModal
    MousePointer = vbDefault
End Sub

Private Sub Form_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_RESET, fc_Value
End Sub

Private Sub Frame8_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    With grdClutch
        If X >= .Left - 20 And X <= .Left + .Width Then
            If Y >= .Top - 20 And Y <= .Top + .Height Then
                setpanels Me, PNL_SET, gc_grdClutch, -2
                Exit Sub
            End If
        End If
    End With

    setpanels Me, PNL_RESET, fc_Value
End Sub

Private Sub Frame9_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    With cbxFuelSystem
        If X >= .Left - 20 And X <= .Left + .Width Then
            If Y >= .Top - 20 And Y <= .Top + .Height Then
                setpanels Me, PNL_SET, gc_FuelSystem
                Exit Sub
            End If
        End If
    End With
    
    setpanels Me, PNL_RESET, fc_Value
End Sub


Private Sub btnGearRatio_Click()
    frmGearRatio.Show vbModal
    If frmGearRatio.FileDirty Then bFileDirty = True
    If Not isBike Then txtGearRatio.SetFocus
End Sub

Private Sub btnGearRatio_GotFocus()
    setpanels Me, PNL_SAVE, gc_GearRatioBtn
End Sub

Private Sub btnGearRatio_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_GearRatioBtn
End Sub


Private Sub btnStatic_Click()
    frmSpring.Show vbModal
    If frmSpring.FileDirty Then bFileDirty = True
    txtStatic.SetFocus
End Sub

Private Sub btnStatic_GotFocus()
    setpanels Me, PNL_SAVE, gc_StaticBtn
End Sub

Private Sub btnStatic_MouseDown(Button As Integer, shift As Integer, X As Single, Y As Single)
Dim Work As Single
    If Button = 2 Then
        Work = (gc_Static.Value - gc_BasePr.Value) / gc_SRate.Value
        
        If Not isBike Then
            If Not isGlide Then
                gc_Turns.Value = Round(Work + gc_dRnHt.Value * gc_ThrdpI.Value, 0.01)
            Else
                gc_Turns.Value = Round(Work - gc_dRnHt.Value * gc_ThrdpI.Value, 0.01)
            End If
        Else
            gc_ThrdpI.Value = Round(Work + gc_dRnHt.Value, 0.001)
        End If
        
        btnStatic_Click
    End If
End Sub

Private Sub btnStatic_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_StaticBtn
End Sub


Private Sub btnClArea_Click()
    frmEffArea.Show vbModal
    If frmEffArea.FileDirty Then bFileDirty = True
    txtClArea.SetFocus
End Sub

Private Sub btnClArea_GotFocus()
    setpanels Me, PNL_SAVE, gc_ClAreaBtn
End Sub

Private Sub btnClArea_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_ClAreaBtn
End Sub


Private Sub btnFriction_Click()
    frmFriction.Show vbModal
    txtCMU.SetFocus
End Sub

Private Sub btnFriction_GotFocus()
    setpanels Me, PNL_SAVE, gc_FrictionBtn
End Sub

Private Sub btnFriction_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_FrictionBtn
End Sub


Private Sub btnMfgStyle_Click()
    If isRSA Then
        frmMfgStyle.Show vbModal
    Else
        frmMfgList.Show vbModal
    End If
    txtMfg1.SetFocus
End Sub

Private Sub btnMfgStyle_GotFocus()
    setpanels Me, PNL_SAVE, gc_MfgStyleBtn
End Sub

Private Sub btnMfgStyle_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_MfgStyleBtn
End Sub


Private Sub btnTractionIndex_Click()
    frmTractionIndex.Show vbModal
    txtTractionIndex.SetFocus
End Sub

Private Sub btnTractionIndex_GotFocus()
    setpanels Me, PNL_SAVE, gc_TractionIndexBtn
End Sub

Private Sub btnTractionIndex_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_TractionIndexBtn
End Sub


Private Sub btnEnginePMI_Click()
    frmPolarEngine.Show vbModal
    If frmPolarEngine.FileDirty Then bFileDirty = True
    txtEnginePMI.SetFocus
End Sub

Private Sub btnEnginePMI_GotFocus()
    setpanels Me, PNL_SAVE, gc_EnginePMIBtn
End Sub

Private Sub btnEnginePMI_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_EnginePMIBtn
End Sub


Private Sub btnTransPMI_Click()
    frmPolarTrans.Show vbModal
    If frmPolarTrans.FileDirty Then bFileDirty = True
    txtTransPMI.SetFocus
End Sub

Private Sub btnTransPMI_GotFocus()
    setpanels Me, PNL_SAVE, gc_TransPMIBtn
End Sub

Private Sub btnTransPMI_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_TransPMIBtn
End Sub


Private Sub btnTiresPMI_Click()
    frmPolarTires.Show vbModal
    If frmPolarTires.FileDirty Then bFileDirty = True
    txtTiresPMI.SetFocus
End Sub

Private Sub btnTiresPMI_GotFocus()
    setpanels Me, PNL_SAVE, gc_TiresPMIBtn
End Sub

Private Sub btnTiresPMI_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_TiresPMIBtn
End Sub


Private Sub cbxFuelSystem_Change()
    gc_FuelSystem.Value = cbxFuelSystem.ItemData(cbxFuelSystem.ListIndex)
    
    If gc_FuelSystem.IsChanged Then
        gc_FuelSystem.IsChanged = False
        
        Weather
        EngCalc
        ClutchCalc
        
        If gc_FuelSystem.IsError Then cbxFuelSystem.SetFocus
    Else
        cbxFuelSystem.ListIndex = gc_FuelSystem.Value - 1
    End If
End Sub

Private Sub cbxFuelSystem_Click()
    cbxFuelSystem_Change
End Sub

Private Sub cbxFuelSystem_GotFocus()
    setpanels Me, PNL_SAVE, gc_FuelSystem
End Sub

Private Sub cbxFuelSystem_LostFocus()
    cbxFuelSystem_Change
End Sub


Private Sub btnDynoData_Click()
    frmDynoData.Show vbModal
End Sub

Private Sub btnDynoData_GotFocus()
    setpanels Me, PNL_SAVE, gc_DynoDataBtn
End Sub

Private Sub btnDynoData_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_DynoDataBtn
End Sub


Private Sub btnRecalc_Click()
Dim i As Integer
    vbreply = MsgBox("You are about to permanently change the Engine Dyno Data.  Every HP and Torque value will be mulitplied by the HP/Torque Multiplier.  Are you sure you want to proceed with this calculation?", 256 + vbExclamation + vbYesNo, "Help: Engine Dyno Data - Recalc")
    If vbreply = vbYes Then
        
        With gc_grdDyno
            For i = 0 To .MaxRow - 1
                If .GridArray(0, i) = 0 Then Exit For
                .GridArray(1, i) = .GridArray(1, i) * gc_HPTQMult.Value
                .GridArray(2, i) = .GridArray(2, i) * gc_HPTQMult.Value
            Next
        End With
        grdDyno.Refresh
        
        gc_HPTQMult.Value = 1
        btnRecalc.Enabled = False
        bFileDirty = True
    End If
End Sub

Private Sub btnRecalc_GotFocus()
    setpanels Me, PNL_SAVE, gc_RecalcBtn
End Sub

Private Sub btnRecalc_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_RecalcBtn
End Sub


Private Sub grdDyno_AfterColUpdate(ByVal ColIndex As Integer)
    ForceGridUpdate grdDyno
End Sub

Private Sub grdDyno_BeforeColUpdate(ByVal ColIndex As Integer, OldValue As Variant, Cancel As Integer)
Dim clm As Column
Dim i As Integer
Dim ThisRow As Integer
Dim LastRow As Integer
Dim MsgTxt As String
Dim MsgCap As String
    Set clm = grdDyno.Columns(ColIndex)
    GridChanged = False
    
    'If clm.Value = OldValue Then Cancel = True:  Exit Sub
    If clm.Value = OldValue Then Exit Sub
    
    With gc_grdDyno
        MsgCap = "Help: Engine Dyno Data"
        ThisRow = grdDyno.row

        For i = 0 To .MaxRow - 1    'find the LastRow
            If .GridArray(0, i) > 0 Then
                LastRow = i
            Else
                Exit For
            End If
        Next

        'check for logical errors on data input first
        Select Case ColIndex
            Case 0
                'check for a gap in the row
                If ThisRow > LastRow + 1 Then
                    MsgTxt = "RPM values must be entered in sequential order!  Blank rows are not allowed."
                    MsgBox MsgTxt, vbExclamation, MsgCap
                    Cancel = True:  clm.Value = OldValue
                    SetGridFocus grdDyno, ColIndex, LastRow + 1
                    Exit Sub
                End If
    
                'check for blank or 0 to clear remaining rows
                If clm.Text = "" Or val(clm.Text) = 0 Then
                    vbreply = MsgBox("You are about to permanently change the Engine Dyno Data.  Every HP and Torque value from this RPM down will be left blank.  Are you sure you want to proceed?", 256 + vbExclamation + vbYesNo, MsgCap)
                    If vbreply = vbYes Then
                        For i = ThisRow To .MaxRow - 1
                            .GridArray(0, i) = Empty
                            .GridArray(1, i) = Empty
                            .GridArray(2, i) = Empty
                        Next
                        ForceGridUpdate grdDyno
                        grdDyno.SetFocus
                        bFileDirty = True
                        grdDyno_LostFocus
                    Else
                        Cancel = True:  clm.Value = OldValue:  grdDyno.Refresh
                        SetGridFocus grdDyno, ColIndex, ThisRow
                    End If
                    Exit Sub
                End If
            
                'check for smaller value than previous row
                If ThisRow > 0 Then
                    If val(clm.Text) <= .GridArray(ColIndex, ThisRow - 1) Then
                        MsgTxt = "yes"
                    End If
                End If
                
                'check for larger value than next row
                If ThisRow < LastRow Then
                    If val(clm.Text) >= .GridArray(ColIndex, ThisRow + 1) Then
                        MsgTxt = "yes"
                    End If
                End If
                
                If MsgTxt = "yes" Then
                    If ThisRow = 0 Then
                        vbreply = MsgBox("Are you going to change all the Engine Dyno Data values?  Would you like the remaining Engine Dyno Data rows cleared?", 256 + vbExclamation + vbYesNo, MsgCap)
                    Else
                        vbreply = vbNo
                    End If
                    
                    If vbreply = vbYes Then
                        For i = 1 To .MaxRow - 1
                            .GridArray(0, i) = Empty
                            .GridArray(1, i) = Empty
                            .GridArray(2, i) = Empty
                        Next
                        'ForceGridUpdate grdDyno
                        grdDyno.SetFocus
                    Else
                        MsgTxt = "RPM values must always be in ascending order!  This RPM value must be larger than the previous row and smaller than the next row."
                        MsgBox MsgTxt, vbExclamation, MsgCap
                        Cancel = True:  clm.Value = OldValue:  grdDyno.Refresh
                        SetGridFocus grdDyno, ColIndex, ThisRow:  Exit Sub
                    End If
                End If
            
            Case 1, 2
                If .GridArray(0, ThisRow) = 0 Then
                    MsgTxt = "RPM value must always be entered before the HP and Torque values!"
                    MsgBox MsgTxt, vbExclamation, MsgCap
                    Cancel = True:  clm.Value = OldValue
                    SetGridFocus grdDyno, 0, LastRow + 1
                    Exit Sub
                End If
        End Select

        'now check against the column min/max limits
        Select Case ColIndex
            Case 0: MsgTxt = "RPM"
            Case 1:  MsgTxt = "HP"
            Case 2:  MsgTxt = "Torque"
        End Select
        MsgTxt = "Engine Dyno Data " & MsgTxt & " must be between " & Format(.dbgColMins(ColIndex), grdDyno.Columns(ColIndex).NumberFormat) & " and " & Format(.dbgColMaxs(ColIndex), grdDyno.Columns(ColIndex).NumberFormat)
    
        If clm.Text = "" Or clm.Value < .dbgColMins(ColIndex) Then
            MsgTxt = MsgTxt & "." & Chr$(13) & "A value of " & Format(.dbgColMins(ColIndex), grdDyno.Columns(ColIndex).NumberFormat) & " will be used instead!"
            MsgBox MsgTxt, ERR_TYP_INPUT, ERR_CAP_RANGE
            clm.Value = .dbgColMins(ColIndex)
            
        ElseIf clm.Value > .dbgColMaxs(ColIndex) Then
            MsgTxt = MsgTxt & "." & Chr$(13) & "A value of " & Format(.dbgColMaxs(ColIndex), grdDyno.Columns(ColIndex).NumberFormat) & " will be used instead!"
            MsgBox MsgTxt, ERR_TYP_INPUT, ERR_CAP_RANGE
            clm.Value = .dbgColMaxs(ColIndex)
        End If
        
        'and finally calculate the other column value
        .GridArray(ColIndex, ThisRow) = clm.Value
        Select Case ColIndex
            Case 0, 1
                .GridArray(2, ThisRow) = Z6 * .GridArray(1, ThisRow) / .GridArray(0, ThisRow)
            Case 2
                .GridArray(1, ThisRow) = .GridArray(2, ThisRow) * .GridArray(0, ThisRow) / Z6
        End Select
        
        GridChanged = True:     bFileDirty = True
        grdDyno_LostFocus
    End With
End Sub

Private Sub grdDyno_DblClick()
    frmDynoData.Show vbModal
End Sub

Private Sub grdDyno_GotFocus()
    setpanels Me, PNL_SAVE, gc_grdDyno, grdDyno.col
    SelGridText grdDyno
End Sub

Private Sub grdDyno_LostFocus()
Dim i As Integer
Dim LastRow As Integer
Dim MsgTxt As String
Dim MsgCap As String
    If Not GridChanged Then Exit Sub
    
    With gc_grdDyno
        For i = 0 To .MaxRow - 1    'find the LastRow
            If .GridArray(0, i) > 0 Then
                LastRow = i
            Else
                Exit For
            End If
        Next
    
        'check for missing HP and Torque data
        MsgTxt = ""
        For i = 0 To LastRow
            If IsNull(.GridArray(1, i)) Then
                MsgTxt = "yes":  Exit For
            ElseIf .GridArray(1, i) = 0 Then
                MsgTxt = "yes":  Exit For
            End If
        Next
    
        If MsgTxt = "yes" Then
            MsgTxt = "HP and Torque values are required for every RPM!"
            MsgCap = "Help: Engine Dyno Data"
            MsgBox MsgTxt, vbExclamation, MsgCap
            grdDyno.Refresh
            SetGridFocus grdDyno, 1, i
        Else
            If GridChanged Then
                GridChanged = False
                EngCalc
                ClutchCalc
            End If
        End If
    End With
End Sub

Private Sub grdDyno_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_grdDyno, grdDyno.ColContaining(X)
End Sub

Private Sub grdDyno_UnboundReadData(ByVal RowBuf As RowBuffer, StartLocation As Variant, ByVal ReadPriorRows As Boolean)
    gc_grdDyno.UnboundReadData RowBuf, StartLocation, ReadPriorRows
End Sub

Private Sub grdDyno_UnboundWriteData(ByVal RowBuf As RowBuffer, WriteLocation As Variant)
    gc_grdDyno.UnboundWriteData RowBuf, WriteLocation
End Sub


Private Sub grdClutch_AfterColUpdate(ByVal ColIndex As Integer)
    ForceGridUpdate grdClutch
End Sub

Private Sub grdClutch_BeforeColUpdate(ByVal ColIndex As Integer, OldValue As Variant, Cancel As Integer)
Dim clm As Column
    Set clm = grdClutch.Columns(ColIndex)
    'If clm.Value = OldValue Then Cancel = True:  Exit Sub
    If clm.Value = OldValue Then Exit Sub
End Sub

Private Sub grdClutch_GotFocus()
    setpanels Me, PNL_SAVE, gc_grdClutch, grdClutch.col
    SelGridText grdClutch
End Sub

Private Sub grdClutch_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_grdClutch, grdClutch.ColContaining(X)
End Sub

Private Sub grdClutch_UnboundReadData(ByVal RowBuf As RowBuffer, StartLocation As Variant, ByVal ReadPriorRows As Boolean)
    gc_grdClutch.UnboundReadData RowBuf, StartLocation, ReadPriorRows
End Sub

Private Sub grdClutch_UnboundWriteData(ByVal RowBuf As RowBuffer, WriteLocation As Variant)
    gc_grdClutch.UnboundWriteData RowBuf, WriteLocation
End Sub


Private Sub sspHighGear_Click()
    MsgBox "The High Gear Lockup RPM occurs at the intersection (white circle) of the upper clutch torque capacity (black line) and engine torque (red line) on the Clutch Torque Capacity graph.  Beyond this RPM in high gear, the clutch has more torque capacity than the engine does and will remain locked-up.", vbInformation, "High Gear Lockup RPM"
End Sub

Private Sub sspLowGear_Click()
    MsgBox "The Low Gear Lockup RPM occurs at the intersection (white circle) of the lower clutch torque capacity (black line) and engine torque (red line) on the Clutch Torque Capacity graph.  Beyond this RPM in low gear, the clutch has more torque capacity than the engine does and will remain locked-up.", vbInformation, "Low Gear Lockup RPM"
End Sub

Private Sub sspStatic_Click()
    MsgBox "The Static plate force is always constant with RPM.", vbInformation, "Clutch Plate Force"
End Sub

Private Sub sspTotal_Click()
    MsgBox "The Total plate force is the sum of the Static and Centrifugal forces.  The Centrifugal plate force always increases at higher RPM.", vbInformation, "Clutch Plate Force"
End Sub


Private Sub Label4_Click()
    sspLowGear_Click
End Sub

Private Sub Label4_MouseDown(Button As Integer, shift As Integer, X As Single, Y As Single)
    If Button = 2 Then frmSeekLow.Show vbModal
End Sub

Private Sub Label7_Click()
    sspHighGear_Click
End Sub

Private Sub Label7_MouseDown(Button As Integer, shift As Integer, X As Single, Y As Single)
    If Button = 2 Then frmSeekHigh.Show vbModal
End Sub


Private Sub txtBarometer_GotFocus()
    setpanels Me, PNL_SAVE, gc_Barometer
End Sub

Private Sub txtBarometer_KeyPress(KeyAscii As Integer)
    gc_Barometer.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then
        gc_Barometer.IsLoad = False
        txtBarometer_Check
    End If
End Sub

Private Sub txtBarometer_LostFocus()
    gc_Barometer.Value = val(txtBarometer.Text)
    gc_Barometer.IsLoad = True
    txtBarometer_Check
End Sub

Private Sub txtBarometer_Check()
    With gc_Barometer
        If .IsChanged Then
            SetBarometerStrings BarometerCaptionSave
            Weather
            EngCalc
            ClutchCalc
            
            'set false since SetBarometerStrings may have triggered ischanged
            .IsChanged = False
            .IsLoad = True
        Else
            If Not .IsLoad And (.Value = 25 Or .Value = 30) Then
                SetBarometerStrings BarometerCaptionSave
                If .IsChanged Then
                    Weather
                    EngCalc
                    ClutchCalc
                    
                    'set false since SetBarometerStrings triggered ischanged
                    .IsChanged = False
                End If
            End If
        End If
    End With
End Sub

Private Sub txtBarometer_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_Barometer
End Sub


Private Sub txtTemperature_GotFocus()
    setpanels Me, PNL_SAVE, gc_Temperature
End Sub

Private Sub txtTemperature_KeyPress(KeyAscii As Integer)
    gc_Temperature.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtTemperature_Check
End Sub

Private Sub txtTemperature_LostFocus()
    gc_Temperature.Value = val(txtTemperature.Text)
    txtTemperature_Check
End Sub

Private Sub txtTemperature_Check()
    If gc_Temperature.IsChanged Then
        Weather
        EngCalc
        ClutchCalc
    End If
End Sub

Private Sub txtTemperature_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_Temperature
End Sub


Private Sub txtHumidity_GotFocus()
    setpanels Me, PNL_SAVE, gc_Humidity
End Sub

Private Sub txtHumidity_KeyPress(KeyAscii As Integer)
    gc_Humidity.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtHumidity_Check
End Sub

Private Sub txtHumidity_LostFocus()
    gc_Humidity.Value = val(txtHumidity.Text)
    txtHumidity_Check
End Sub

Private Sub txtHumidity_Check()
    If gc_Humidity.IsChanged Then
        Weather
        EngCalc
        ClutchCalc
    End If
End Sub

Private Sub txtHumidity_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_Humidity
End Sub


Private Sub txtLowGear_GotFocus()
    setpanels Me, PNL_SAVE, gc_LowGear
End Sub

Private Sub txtLowGear_KeyPress(KeyAscii As Integer)
    gc_LowGear.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtLowGear_Check
End Sub

Private Sub txtLowGear_LostFocus()
    gc_LowGear.Value = val(txtLowGear.Text)
    txtLowGear_Check
End Sub

Private Sub txtLowGear_Check()
    If gc_LowGear.IsChanged Then
        EngCalc
        ClutchCalc
    End If
End Sub

Private Sub txtLowGear_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_LowGear
End Sub


Private Sub txtGearRatio_GotFocus()
    setpanels Me, PNL_SAVE, gc_GearRatio
End Sub

Private Sub txtGearRatio_KeyPress(KeyAscii As Integer)
    gc_GearRatio.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtGearRatio_Check
End Sub

Private Sub txtGearRatio_LostFocus()
    gc_GearRatio.Value = val(txtGearRatio.Text)
    txtGearRatio_Check
End Sub

Private Sub txtGearRatio_Check()
    If gc_GearRatio.IsChanged Then
        EngCalc
        ClutchCalc
    End If
End Sub

Private Sub txtGearRatio_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_GearRatio
End Sub


Private Sub txtTireDia_GotFocus()
    setpanels Me, PNL_SAVE, gc_TireDia
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
        gc_WSTireDia.IsCalc = True
        gc_WSTireDia.UOM = gc_TireDia.UOM
        gc_WSTireDia.Value = gc_TireDia.Value
            
        EngCalc
        ClutchCalc
    End If
End Sub

Private Sub txtTireDia_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_TireDia
End Sub


Private Sub txtT60_GotFocus()
    setpanels Me, PNL_SAVE, gc_T60
End Sub

Private Sub txtT60_KeyPress(KeyAscii As Integer)
    gc_T60.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtT60_Check
End Sub

Private Sub txtT60_LostFocus()
    gc_T60.Value = val(txtT60.Text)
    txtT60_Check
End Sub

Private Sub txtT60_Check()
Dim gs As Single
    If gc_T60.IsChanged Then
        GSTOT60 0, gs, gc_T60.Value
        gc_Amax.Value = Round(gs, 0.01)
            
        EngCalc
        ClutchCalc
    End If
End Sub

Private Sub txtT60_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_T60
End Sub


Private Sub txtAmax_GotFocus()
    setpanels Me, PNL_SAVE, gc_Amax
End Sub

Private Sub txtAmax_KeyPress(KeyAscii As Integer)
    gc_Amax.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtAmax_Check
End Sub

Private Sub txtAmax_LostFocus()
    gc_Amax.Value = val(txtAmax.Text)
    txtAmax_Check
End Sub

Private Sub txtAmax_Check()
Dim T60 As Single
    If gc_Amax.IsChanged Then
        GSTOT60 1, gc_Amax.Value, T60
        gc_T60.Value = Round(T60, 0.01)
        
        EngCalc
        ClutchCalc
    End If
End Sub

Private Sub txtAmax_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_Amax
End Sub


Private Sub txtTractionIndex_GotFocus()
    setpanels Me, PNL_SAVE, gc_TractionIndex
End Sub

Private Sub txtTractionIndex_KeyPress(KeyAscii As Integer)
    gc_TractionIndex.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtTractionIndex_Check
End Sub

Private Sub txtTractionIndex_LostFocus()
    gc_TractionIndex.Value = val(txtTractionIndex.Text)
    txtTractionIndex_Check
End Sub

Private Sub txtTractionIndex_Check()
    If gc_TractionIndex.IsChanged Then
        EngCalc
        ClutchCalc
    End If
End Sub

Private Sub txtTractionIndex_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_TractionIndex
End Sub


Private Sub txtEnginePMI_GotFocus()
    setpanels Me, PNL_SAVE, gc_EnginePMI
End Sub

Private Sub txtEnginePMI_KeyPress(KeyAscii As Integer)
    gc_EnginePMI.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtEnginePMI_Check
End Sub

Private Sub txtEnginePMI_LostFocus()
    gc_EnginePMI.Value = val(txtEnginePMI.Text)
    txtEnginePMI_Check
End Sub

Private Sub txtEnginePMI_Check()
    If gc_EnginePMI.IsChanged Then
        EngCalc
        ClutchCalc
    End If
End Sub

Private Sub txtEnginePMI_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_EnginePMI
End Sub


Private Sub txtTransPMI_GotFocus()
    setpanels Me, PNL_SAVE, gc_TransPMI
End Sub

Private Sub txtTransPMI_KeyPress(KeyAscii As Integer)
    gc_TransPMI.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtTransPMI_Check
End Sub

Private Sub txtTransPMI_LostFocus()
    gc_TransPMI.Value = val(txtTransPMI.Text)
    txtTransPMI_Check
End Sub

Private Sub txtTransPMI_Check()
    If gc_TransPMI.IsChanged Then
        EngCalc
        ClutchCalc
    End If
End Sub

Private Sub txtTransPMI_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_TransPMI
End Sub


Private Sub txtTiresPMI_GotFocus()
    setpanels Me, PNL_SAVE, gc_TiresPMI
End Sub

Private Sub txtTiresPMI_KeyPress(KeyAscii As Integer)
    gc_TiresPMI.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtTiresPMI_Check
End Sub

Private Sub txtTiresPMI_LostFocus()
    gc_TiresPMI.Value = val(txtTiresPMI.Text)
    txtTiresPMI_Check
End Sub

Private Sub txtTiresPMI_Check()
    If gc_TiresPMI.IsChanged Then
        EngCalc
        ClutchCalc
    End If
End Sub

Private Sub txtTiresPMI_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_TiresPMI
End Sub


Private Sub txtHPTQMult_GotFocus()
    setpanels Me, PNL_SAVE, gc_HPTQMult
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
        
    If gc_HPTQMult.IsChanged Then
        EngCalc
        ClutchCalc
    End If
End Sub

Private Sub txtHPTQMult_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_HPTQMult
End Sub


Private Sub txtMfg1_GotFocus()
    setpanels Me, PNL_SAVE, gc_Mfg1
End Sub

Private Sub txtMfg1_KeyPress(KeyAscii As Integer)
    If KeyAscii = vbKeyReturn Then
        txtMfg1_Check
        
        If gc_Mfg1.Value = NARMD Then
            frmCustom.Show vbModal
            If frmCustom.FileDirty Then bFileDirty = True
        End If
    End If
End Sub

Private Sub txtMfg1_LostFocus()
    txtMfg1_Check
End Sub

Public Sub txtMfg1_Check()
Dim MfgSave As Integer
Dim ifound As Integer
Dim i As Integer
Dim wasBike As Boolean
Dim DoSetSave As Boolean
    DoSetSave = False
    MfgSave = gc_Mfg1.Value
    txtMfg1.Text = UCase(txtMfg1.Text)
    
    ifound = 0
    For i = 1 To NARMD
        If txtMfg1.Text = AName(i) Then
            If gc_Mfg2.Value > 0 Then
                If Left(txtMfg1.Text, 3) = Left(txtMfg2.Text, 3) Then
                    If AData(i, 12) = AData(gc_Mfg2.Value, 12) Then
                        ifound = i: Exit For
                    End If
                End If
            Else
                ifound = i: Exit For
            End If
        End If
    Next
    
    If ifound = 0 And (MfgSave > 0 Or txtMfg1.Text <> AName(0)) Then
        If isRSA Then
            Beep
            gc_Mfg1.Value = MfgSave
            txtMfg1.Text = AName(MfgSave)
            SelTextBoxText txtMfg2
        Else
            If Not frmMfgList.Visible Then
                Beep
                frmMfgList.Show vbModal
                gc_Mfg1.Value = MfgSave
                txtMfg1.Text = AName(MfgSave)
                SelTextBoxText txtMfg1
            End If
        End If
    Else
        gc_Mfg1.Value = ifound
        If gc_Mfg1.IsChanged Then
            If isRSA And gc_Mfg2.Value = 0 And Mfg1SaveText <> Left(txtMfg1.Text, 3) Then
                'DoSetSave = True   'Pat Hale - for Ramon Velez (gets RSA version)
                
                wasBike = isBike:   isBike = False
                If gc_Mfg1.Value = NARMD - 3 Or gc_Mfg1.Value = NARMD - 2 Or gc_Mfg1.Value = NARMD - 1 Then isBike = True
                If gc_Mfg1.Value = NARMD Then
                    If MfgSave = NARMD - 3 Or MfgSave = NARMD - 2 Or MfgSave = NARMD - 1 Then isBike = True
                End If
                
                If isBike <> wasBike Then
                    SetNDisk
                    SetDefaults gc_Mfg1.Value
                    SetBikeStrings
                    SetDiskID
                    LoadEngineGrid
                    Weather
                    DoEvents
                    DoSetSave = True
                End If
            End If
            
            SetIsGlide
            SetClutchStrings
            SetStatic
            SetRingHt
            SetArmDepth
            SetDiskOD
            
            If MfgSave = 0 Then
                gc_NArm1.Value = 1
                SetTCWt
                gc_TCWt1.Value = gc_NArm1.Value * gc_CWt1.Value
                gc_RingHt1.Value = AData(gc_Mfg1.Value, 6)
            Else
                If Mfg1SaveText <> Left(txtMfg1.Text, 3) Then
                    gc_RingHt1.Value = AData(gc_Mfg1.Value, 6)
                Else
                    If AData(gc_Mfg1.Value, 6) <> AData(MfgSave, 6) Then
                        gc_RingHt1.Value = AData(gc_Mfg1.Value, 6)
                    End If
                End If
            End If
            
            DoEvents
            gc_ArmDepth1.Value = AData(gc_Mfg1.Value, 7)
            
            TestDiskOD
            TestDiskWt NDiskSave, DiskODSave
            
            NDiskSave = gc_NDisk.Value
            DiskODSave = gc_DiskOD.Value
            
            EngCalc
            ClutchCalc
            
            'this code resets saved graphs to prevent certain clutch comparisons:
            'currently prevents only car and bike comparisons (see Pat Hale rem above)
            If DoSetSave Then
                SetSave 1
                Graph1
                Graph2
            End If
            
            Mfg1SaveText = Left(txtMfg1.Text, 3)
            txtMfg1.SetFocus
            SelTextBoxText txtMfg1
        End If
    End If
End Sub

Private Sub txtMfg1_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_Mfg1
End Sub


Private Sub txtNArm1_GotFocus()
    setpanels Me, PNL_SAVE, gc_NArm1
End Sub

Private Sub txtNArm1_KeyPress(KeyAscii As Integer)
    gc_NArm1.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtNArm1_Check
End Sub

Private Sub txtNArm1_LostFocus()
    gc_NArm1.Value = val(txtNArm1.Text)
    txtNArm1_Check
End Sub

Private Sub txtNArm1_Check()
    If gc_NArm1.IsChanged Then
        SetTCWt
        gc_TCWt1.Value = gc_NArm1.Value * gc_CWt1.Value
        
        ClutchCalc
    End If
End Sub

Private Sub txtNArm1_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_NArm1
End Sub


Private Sub txtTCWt1_GotFocus()
    setpanels Me, PNL_SAVE, gc_TCWt1
End Sub

Private Sub txtTCWt1_KeyPress(KeyAscii As Integer)
    gc_TCWt1.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtTCWt1_Check
End Sub

Private Sub txtTCWt1_LostFocus()
    gc_TCWt1.Value = val(txtTCWt1.Text)
    txtTCWt1_Check
End Sub

Private Sub txtTCWt1_Check()
    If gc_TCWt1.IsChanged Then
        gc_CWt1.Value = Round(gc_TCWt1.Value / gc_NArm1.Value, 0.1)
        
        ClutchCalc
    End If
End Sub

Private Sub txtTCWt1_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_TCWt1
End Sub


Private Sub txtCwt1_GotFocus()
    setpanels Me, PNL_SAVE, gc_CWt1
End Sub

Private Sub txtCwt1_KeyPress(KeyAscii As Integer)
    gc_CWt1.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtCwt1_Check
End Sub

Private Sub txtCwt1_LostFocus()
    gc_CWt1.Value = val(txtCwt1.Text)
    txtCwt1_Check
End Sub

Private Sub txtCwt1_Check()
    If gc_CWt1.IsChanged Then
        gc_TCWt1.Value = gc_NArm1.Value * gc_CWt1.Value
        
        ClutchCalc
    End If
End Sub

Private Sub txtCwt1_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_CWt1
End Sub


Private Sub txtRingHt1_GotFocus()
    setpanels Me, PNL_SAVE, gc_RingHt1
End Sub

Private Sub txtRingHt1_KeyPress(KeyAscii As Integer)
    gc_RingHt1.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtRingHt1_Check
End Sub

Private Sub txtRingHt1_LostFocus()
    gc_RingHt1.Value = val(txtRingHt1.Text)
    txtRingHt1_Check
End Sub

Private Sub txtRingHt1_Check()
    If gc_RingHt1.IsChanged Then
        If gc_Mfg2.Value > 0 Then gc_RingHt2.Value = gc_RingHt1.Value
        
        If Not isGlide Then
            MsgBox "Changing the clutch ring height may require a change to the static plate force.  Use the Static Plate Force Worksheet to determine the effect of changing the clutch ring height.", vbInformation, "Warning: Clutch Ring Height Changed!"
        Else
            MsgBox "Changing the clutch pack clearance will require a change to the static plate force.  Use the Static Plate Force Worksheet to determine the effect of changing the clutch pack clearance.", vbInformation, "Warning: Clutch Pack Clearance Changed!"
            btnStatic_Click
        End If
        
        ClutchCalc
    End If
End Sub

Private Sub txtRingHt1_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_RingHt1
End Sub


Private Sub txtArmDepth1_GotFocus()
    setpanels Me, PNL_SAVE, gc_ArmDepth1
End Sub

Private Sub txtArmDepth1_KeyPress(KeyAscii As Integer)
    gc_ArmDepth1.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtArmDepth1_Check
End Sub

Private Sub txtArmDepth1_LostFocus()
    gc_ArmDepth1.Value = val(txtArmDepth1.Text)
    txtArmDepth1_Check
End Sub

Private Sub txtArmDepth1_Check()
    If gc_ArmDepth1.IsChanged Then
        If Not isBike Then
            MsgBox "Changing the clutch arm depth may require a change to the static plate force.  Use the Static Plate Force Worksheet to determine the effect of changing the arm depth.", vbInformation, "Warning: Arm Depth Changed!"
        End If
        
        ClutchCalc
    End If
End Sub

Private Sub txtArmDepth1_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_ArmDepth1
End Sub


Private Sub txtMfg2_GotFocus()
    setpanels Me, PNL_SAVE, gc_Mfg2
End Sub

Private Sub txtMfg2_KeyPress(KeyAscii As Integer)
    If KeyAscii = vbKeyReturn Then txtMfg2_Check
End Sub

Private Sub txtMfg2_LostFocus()
    txtMfg2_Check
End Sub

Private Sub txtMfg2_Check()
Dim MfgSave As Integer
Dim ifound As Integer
Dim i As Integer
Dim wasBike As Boolean
Dim DoSetSave As Boolean
    DoSetSave = False
    MfgSave = gc_Mfg2.Value
    txtMfg2.Text = UCase(txtMfg2.Text)
    
    ifound = 0
    For i = 1 To NARMD
        If txtMfg2.Text = AName(i) Then
            If gc_Mfg1.Value > 0 Then
                If Left(txtMfg2.Text, 3) = Left(txtMfg1.Text, 3) Then
                    If AData(i, 12) = AData(gc_Mfg1.Value, 12) Then
                        ifound = i: Exit For
                    End If
                End If
            Else
                ifound = i: Exit For
            End If
        End If
    Next
    
    If ifound = 0 And (MfgSave > 0 Or txtMfg2.Text <> AName(0)) Then
        If isRSA Then
            Beep
            gc_Mfg2.Value = MfgSave
            txtMfg2.Text = AName(MfgSave)
            SelTextBoxText txtMfg2
        Else
            If Not frmMfgList.Visible Then
                Beep
                frmMfgList.Show vbModal
                gc_Mfg2.Value = MfgSave
                txtMfg2.Text = AName(MfgSave)
                SelTextBoxText txtMfg2
            End If
        End If
    Else
        gc_Mfg2.Value = ifound
        If gc_Mfg2.IsChanged Then
            If isRSA And gc_Mfg1.Value = 0 And Mfg2SaveText <> Left(txtMfg2.Text, 3) Then
                'DoSetSave = True   'Pat Hale - for Ramon Velez (gets RSA version)
                
                wasBike = isBike:   isBike = False
                If gc_Mfg2.Value = NARMD - 3 Or gc_Mfg2.Value = NARMD - 2 Or gc_Mfg2.Value = NARMD - 1 Then isBike = True
                If gc_Mfg2.Value = NARMD Then
                    If MfgSave = NARMD - 3 Or MfgSave = NARMD - 2 Or MfgSave = NARMD - 1 Then isBike = True
                End If
                
                If isBike <> wasBike Then
                    SetNDisk
                    SetDefaults gc_Mfg2.Value
                    SetBikeStrings
                    SetDiskID
                    LoadEngineGrid
                    Weather
                    DoEvents
                    DoSetSave = True
                End If
            End If
            
            SetIsGlide
            SetClutchStrings
            SetStatic
            SetRingHt
            SetArmDepth
            SetDiskOD
            
            If MfgSave = 0 Then
                gc_NArm2.Value = 1
                SetTCWt
                gc_TCWt2.Value = gc_NArm2.Value * gc_CWt2.Value
                If gc_Mfg1.Value > 0 Then
                    gc_RingHt2.Value = gc_RingHt1.Value
                Else
                    gc_RingHt2.Value = AData(gc_Mfg2.Value, 6)
                End If
            Else
                If Mfg2SaveText <> Left(txtMfg2.Text, 3) Then
                    gc_RingHt2.Value = AData(gc_Mfg2.Value, 6)
                Else
                    If AData(gc_Mfg2.Value, 6) <> AData(MfgSave, 6) Then
                        gc_RingHt2.Value = AData(gc_Mfg2.Value, 6)
                    End If
                End If
            End If
            
            DoEvents
            gc_ArmDepth2.Value = AData(gc_Mfg2.Value, 7)
            
            TestDiskOD
            TestDiskWt NDiskSave, DiskODSave
            
            NDiskSave = gc_NDisk.Value
            DiskODSave = gc_DiskOD.Value
            
            EngCalc
            ClutchCalc
            
            'this code resets saved graphs to prevent certain clutch comparisons:
            'currently prevents only car and bike comparisons (see Pat Hale rem above)
            If DoSetSave Then
                SetSave 1
                Graph1
                Graph2
            End If
            
            Mfg2SaveText = Left(txtMfg2.Text, 3)
            txtMfg2.SetFocus
            SelTextBoxText txtMfg2
        End If
    End If
End Sub

Private Sub txtMfg2_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_Mfg2
End Sub


Private Sub txtNArm2_GotFocus()
    setpanels Me, PNL_SAVE, gc_NArm2
End Sub

Private Sub txtNArm2_KeyPress(KeyAscii As Integer)
    gc_NArm2.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtNArm2Check
End Sub

Private Sub txtNArm2_LostFocus()
    gc_NArm2.Value = val(txtNArm2.Text)
    txtNArm2Check
End Sub

Private Sub txtNArm2Check()
    If gc_NArm2.IsChanged Then
        If gc_NArm2.Value = 0 Then
            txtMfg2.Text = AName(0)
            gc_Mfg2.Value = 0
            gc_TCWt2.Value = 0
            gc_CWt2.Value = 0
            gc_RingHt2.IsCalc = True:   gc_RingHt2.Value = 0
            gc_ArmDepth2.IsCalc = True: gc_ArmDepth2.Value = 0
            SetIsGlide
            SetClutchStrings
            SetStatic
            txtMfg1.SetFocus:  SelTextBoxText txtMfg1
        Else
            If gc_Mfg2.Value = 0 And gc_TCWt2.Value = 0 And gc_CWt2.Value = 0 And gc_RingHt2.Value = 0 And gc_ArmDepth2.Value = 0 Then
                txtMfg2.Text = txtMfg1.Text
                gc_Mfg2.Value = gc_Mfg1.Value
                SetRingHt
                SetArmDepth
                gc_RingHt2.Value = gc_RingHt1.Value
                gc_ArmDepth2.Value = gc_ArmDepth1.Value
            End If
            SetTCWt
            gc_TCWt2.Value = gc_NArm2.Value * gc_CWt2.Value
        End If
        
        ClutchCalc
    End If
End Sub

Private Sub txtNArm2_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_NArm2
End Sub


Private Sub txtTCWt2_GotFocus()
    setpanels Me, PNL_SAVE, gc_TCWt2
End Sub

Private Sub txtTCWt2_KeyPress(KeyAscii As Integer)
    gc_TCWt2.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtTCWt2_Check
End Sub

Private Sub txtTCWt2_LostFocus()
    gc_TCWt2.Value = val(txtTCWt2.Text)
    txtTCWt2_Check
End Sub

Private Sub txtTCWt2_Check()
    If gc_TCWt2.IsChanged Then
        If gc_Mfg2.Value > 0 Then
            gc_CWt2.Value = Round(gc_TCWt2.Value / gc_NArm2.Value, 0.1)
            
            ClutchCalc
        Else
            gc_TCWt2.Value = 0
        End If
    End If
End Sub

Private Sub txtTCWt2_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_TCWt2
End Sub


Private Sub txtCwt2_GotFocus()
    setpanels Me, PNL_SAVE, gc_CWt2
End Sub

Private Sub txtCwt2_KeyPress(KeyAscii As Integer)
    gc_CWt2.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtCWt2_Check
End Sub

Private Sub txtCwt2_LostFocus()
    gc_CWt2.Value = val(txtCWt2.Text)
    txtCWt2_Check
End Sub

Private Sub txtCWt2_Check()
    If gc_CWt2.IsChanged Then
        If gc_Mfg2.Value > 0 Then
            gc_TCWt2.Value = gc_NArm2.Value * gc_CWt2.Value
            
            ClutchCalc
        Else
            gc_CWt2.Value = 0
        End If
    End If
End Sub

Private Sub txtCwt2_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_CWt2
End Sub


Private Sub txtRingHt2_GotFocus()
    setpanels Me, PNL_SAVE, gc_RingHt2
End Sub

Private Sub txtRingHt2_KeyPress(KeyAscii As Integer)
    gc_RingHt2.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtRingHt2_Check
End Sub

Private Sub txtRingHt2_LostFocus()
    gc_RingHt2.Value = val(txtRingHt2.Text)
    txtRingHt2_Check
End Sub

Private Sub txtRingHt2_Check()
    If gc_RingHt2.IsChanged Then
        If gc_Mfg2.Value > 0 Then
            If gc_Mfg1.Value > 0 Then gc_RingHt1.Value = gc_RingHt2.Value
            
            If Not isGlide Then
                MsgBox "Changing the clutch ring height may require a change to the static plate force.  Use the Static Plate Force Worksheet to determine the effect of changing the clutch ring height.", vbInformation, "Warning: Clutch Ring Height Changed!"
            Else
                MsgBox "Changing the clutch pack clearance will require a change to the static plate force.  Use the Static Plate Force Worksheet to determine the effect of changing the clutch pack clearance.", vbInformation, "Warning: Clutch Pack Clearance Changed!"
                btnStatic_Click
            End If
            
            ClutchCalc
        Else
            gc_RingHt2.Value = 0
        End If
    End If
End Sub

Private Sub txtRingHt2_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_RingHt2
End Sub


Private Sub txtArmDepth2_GotFocus()
    setpanels Me, PNL_SAVE, gc_ArmDepth2
End Sub

Private Sub txtArmDepth2_KeyPress(KeyAscii As Integer)
    gc_ArmDepth2.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtArmDepth2_Check
End Sub

Private Sub txtArmDepth2_LostFocus()
    gc_ArmDepth2.Value = val(txtArmDepth2.Text)
    txtArmDepth2_Check
End Sub

Private Sub txtArmDepth2_Check()
    If gc_ArmDepth2.IsChanged Then
        If gc_Mfg2.Value > 0 Then
            If Not isBike Then
                MsgBox "Changing the clutch arm depth may require a change to the static plate force.  Use the Static Plate Force Worksheet to determine the effect of changing the arm depth.", vbInformation, "Warning: Arm Depth Changed!"
            End If
            
            ClutchCalc
        Else
            gc_ArmDepth2.Value = 0
        End If
    End If
End Sub

Private Sub txtArmDepth2_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_ArmDepth2
End Sub


Private Sub txtStatic_GotFocus()
    setpanels Me, PNL_SAVE, gc_Static
End Sub

Private Sub txtStatic_KeyPress(KeyAscii As Integer)
    gc_Static.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtStatic_Check
End Sub

Private Sub txtStatic_LostFocus()
    gc_Static.Value = val(txtStatic.Text)
    txtStatic_Check
End Sub

Private Sub txtStatic_Check()
    If gc_Static.IsChanged Then
        ClutchCalc
    End If
End Sub

Private Sub txtStatic_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_Static
End Sub


Private Sub txtNDisk_GotFocus()
    setpanels Me, PNL_SAVE, gc_NDisk
End Sub

Private Sub txtNDisk_KeyPress(KeyAscii As Integer)
    gc_NDisk.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtNDisk_Check
End Sub

Private Sub txtNDisk_LostFocus()
    gc_NDisk.Value = val(txtNDisk.Text)
    txtNDisk_Check
End Sub

Private Sub txtNDisk_Check()
    If gc_NDisk.IsChanged Then
        TestDiskWt NDiskSave, DiskODSave
        SetDiskWT
        
        EngCalc
        ClutchCalc
        NDiskSave = gc_NDisk.Value
    End If
End Sub

Private Sub txtNDisk_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_NDisk
End Sub


Private Sub txtDiskWt_GotFocus()
    setpanels Me, PNL_SAVE, gc_DiskWt
End Sub

Private Sub txtDiskWt_KeyPress(KeyAscii As Integer)
    gc_DiskWt.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtDiskWt_Check
End Sub

Private Sub txtDiskWt_LostFocus()
    gc_DiskWt.Value = val(txtDiskWt.Text)
    txtDiskWt_Check
End Sub

Private Sub txtDiskWt_Check()
    If gc_DiskWt.IsChanged Then
        EngCalc
        ClutchCalc
    End If
End Sub

Private Sub txtDiskWt_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_DiskWt
End Sub


Private Sub txtDiskOD_GotFocus()
    setpanels Me, PNL_SAVE, gc_DiskOD
End Sub

Private Sub txtDiskOD_KeyPress(KeyAscii As Integer)
    gc_DiskOD.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtDiskOD_Check
End Sub

Private Sub txtDiskOD_LostFocus()
    gc_DiskOD.Value = val(txtDiskOD.Text)
    txtDiskOD_Check
End Sub

Private Sub txtDiskOD_Check()
    If gc_DiskOD.IsChanged Then
        TestDiskWt NDiskSave, DiskODSave
        SetDiskID
        SetDiskWT
        TestDiskID
        gc_ClArea.Value = CalcArea
        
        EngCalc
        ClutchCalc
        DiskODSave = gc_DiskOD.Value
    End If
End Sub

Private Sub txtDiskOD_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_DiskOD
End Sub


Private Sub txtDiskID_GotFocus()
    setpanels Me, PNL_SAVE, gc_DiskID
End Sub

Private Sub txtDiskID_KeyPress(KeyAscii As Integer)
    gc_DiskID.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtDiskID_Check
End Sub

Private Sub txtDiskID_LostFocus()
    gc_DiskID.Value = val(txtDiskID.Text)
    txtDiskID_Check
End Sub

Private Sub txtDiskID_Check()
    If gc_DiskID.IsChanged Then
        gc_ClArea.Value = CalcArea
        
        ClutchCalc
    End If
End Sub

Private Sub txtDiskID_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_DiskID
End Sub


Private Sub txtClArea_GotFocus()
    setpanels Me, PNL_SAVE, gc_ClArea
End Sub

Private Sub txtClArea_KeyPress(KeyAscii As Integer)
    gc_ClArea.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtCLArea_Check
End Sub

Private Sub txtClArea_LostFocus()
    gc_ClArea.Value = val(txtClArea.Text)
    txtCLArea_Check
End Sub

Private Sub txtCLArea_Check()
    If gc_ClArea.IsChanged Then
        ClutchCalc
    End If
End Sub

Private Sub txtClArea_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_ClArea
End Sub


Private Sub txtCMU_GotFocus()
    setpanels Me, PNL_SAVE, gc_CMU
End Sub

Private Sub txtCMU_KeyPress(KeyAscii As Integer)
    gc_CMU.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtCMU_Check
End Sub

Private Sub txtCMU_LostFocus()
    gc_CMU.Value = val(txtCMU.Text)
    txtCMU_Check
End Sub

Private Sub txtCMU_Check()
    If gc_CMU.IsChanged Then
        ClutchCalc
    End If
End Sub

Private Sub txtCMU_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_CMU
End Sub


Private Sub txtLaunchRPM_GotFocus()
    setpanels Me, PNL_SAVE, gc_LaunchRPM
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
        gc_LaunchRPM.Value = Round(gc_LaunchRPM.Value, 20)
        ClutchCalc
    End If
End Sub

Private Sub txtLaunchRPM_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_LaunchRPM
End Sub


Private Sub txtAirGap_GotFocus()
    setpanels Me, PNL_SAVE, gc_AirGap
End Sub

Private Sub txtAirGap_KeyPress(KeyAscii As Integer)
    gc_AirGap.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtAirGap_Check
End Sub

Private Sub txtAirGap_LostFocus()
    gc_AirGap.Value = val(txtAirGap.Text)
    txtAirGap_Check
End Sub

Private Sub txtAirGap_Check()
    If gc_AirGap.IsChanged Then
        MsgBox "Make sure that all the values in the Clutch Spring Static Worksheet are correct when changing the Air Gap.", vbInformation, "Warning: Air Gap affects Launch Plate Force - lbs"
        
        ClutchCalc
    End If
End Sub

Private Sub txtAirGap_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_AirGap
End Sub

Private Sub SetDefaults(mfg As Single)
Dim i As Integer
Dim T60 As Single, z As Single
'set default values for initial program loading and in
'case there is an error reading user defined data file
    SetSave 0
    
    If Not isBike Then
        'car custom arm defaults are for L&T.1
        AData(NARMD, 1) = 37:       AData(NARMD, 2) = 7.188
        AData(NARMD, 3) = 0.509:    AData(NARMD, 4) = 0.99
        AData(NARMD, 5) = 0.805:    AData(NARMD, 6) = 0.82
        AData(NARMD, 7) = 0:        AData(NARMD, 8) = 0
        AData(NARMD, 9) = -3.69:    AData(NARMD, 10) = 69.41
        AData(NARMD, 11) = 36.5:    AData(NARMD, 12) = 8
    Else
        'bike custom arm defaults are for MTC.1
        'note: bikes really use fixed pivot, so custom arm
        '      worksheet is not strictly correct for bikes
        AData(NARMD, 1) = 18:       AData(NARMD, 2) = 4.05
        AData(NARMD, 3) = 0.526:    AData(NARMD, 4) = 1.192
        AData(NARMD, 5) = 0.565:    AData(NARMD, 6) = 0.107
        AData(NARMD, 7) = 5:        AData(NARMD, 8) = 1.65
        AData(NARMD, 9) = 27.24:    AData(NARMD, 10) = 43.7
        AData(NARMD, 11) = 9.1:     AData(NARMD, 12) = 6
    
        If isRSA Then mfg = NARMD - 1
    End If
    
    'set common values for cars and bikes
    gc_TireDia.IsCalc = True
    gc_WSTireDia.IsCalc = True
    gc_RingHt1.IsCalc = True:       gc_RingHt2.IsCalc = True
    gc_ArmDepth1.IsCalc = True:     gc_ArmDepth2.IsCalc = True
    gc_DiskWt.IsCalc = True
    gc_Static.IsCalc = True
    gc_SBasePr.IsCalc = True:       gc_BasePr.IsCalc = True
    gc_SSRate.IsCalc = True:        gc_SRate.IsCalc = True
    gc_ThrdpI.IsCalc = True
    gc_SeekLoRPM.IsCalc = True:     gc_SeekHiRPM.IsCalc = True
    
    gc_TractionIndex.Value = 3
    gc_Temperature.Value = 75:      gc_Humidity.Value = 60
    gc_FuelSystem.Value = 1:        gc_HPTQMult.Value = 1
    
    gc_Mfg1.Value = mfg
    gc_RingHt1.Value = AData(gc_Mfg1.Value, 6)
    gc_ArmDepth1.Value = AData(gc_Mfg1.Value, 7)
    
    gc_Mfg2.Value = 0:              gc_NArm2.Value = 0
    gc_TCWt2.Value = 0:             gc_RingHt2.Value = 0
    gc_ArmDepth2.Value = 0
        
    SetDiskOD
    gc_DiskOD.Value = AData(gc_Mfg1.Value, 12)
    SetDiskID
    gc_DiskID.Value = RoundDown(0.7 * gc_DiskOD.Value, 0.05)
    gc_DiskWt.Value = (PI * gc_DiskOD.Value ^ 2 / 4) * (gc_DiskOD.Value / 20) * 0.25
    gc_DiskWt.IsCalc = True
    
    gc_HighGear.Value = 1
    gc_Countershaft.Value = 19:     gc_RearWheel.Value = 44
    gc_WSTransType.Value = 2
    gc_dRnHt.Value = 0
    
    If Not isBike Then  'car clutches
        gc_Barometer.Value = 29.92
        gc_Barometer.UOM = UOM_NORMAL
        gc_LowGear.Value = 2.66:    gc_GearRatio.Value = 4.86
        gc_TireDia.Value = 101:     gc_TireDia.UOM = UOM_ALTERNATE
        gc_PDRatio.Value = 1
        gc_Amax.Value = 2.6:        gc_EnginePMI.Value = 3.7
        gc_TransPMI.Value = 0.275:  gc_TiresPMI.Value = 50.7
        
        gc_NArm1.Value = 6:         gc_TCWt1.Value = 48
        gc_Static.Value = 480:      gc_NDisk.Value = 2
        gc_DiskWt.Value = Round(0.6 * gc_NDisk.Value * gc_DiskWt.Value, 0.2)
        gc_CMU.Value = 0.2
        
        RPM(1) = 7000:  HP(1) = 1067:   RPM(6) = 8250:  HP(6) = 1229
        RPM(2) = 7250:  HP(2) = 1113:   RPM(7) = 8500:  HP(7) = 1247
        RPM(3) = 7500:  HP(3) = 1154:   RPM(8) = 8750:  HP(8) = 1259
        RPM(4) = 7750:  HP(4) = 1185:   RPM(9) = 9000:  HP(9) = 1252
        RPM(5) = 8000:  HP(5) = 1209:   RPM(10) = 9250: HP(10) = 1226
        gc_LaunchRPM.Value = 6600:  gc_AirGap.Value = 0.05
        
        gc_CrankWt.Value = 56:      gc_CrankStroke.Value = 3.65
        gc_FlywheelWt.Value = 28.5: gc_FlywheelDia.Value = 14
        gc_TransWt.Value = 100:     gc_CaseDia.Value = 9
        gc_TireWt.Value = 38
        gc_WSTireDia.Value = 101:   gc_WSTireDia.UOM = UOM_ALTERNATE
        gc_WheelWt.Value = 18:      gc_WheelDia.Value = 15
        gc_NSlot.Value = 6:         gc_SlotWD.Value = 0.312
        gc_NHole.Value = 0:         gc_HoleDia.Value = 0
        gc_NSpring.Value = 6
        gc_BasePr.Value = 120:      gc_SRate.Value = 180
        gc_Turns.Value = 2
        gc_ThrdpI.Value = 16:       gc_ThrdpI.UOM = UOM_NORMAL
        
        gc_SeekLoRPM.Value = 8100:  gc_SeekHiRPM.Value = 7960
    
    Else        'motorcycle clutches
        gc_Barometer.Value = 1200
        gc_Barometer.UOM = UOM_ALTERNATE
        gc_LowGear.Value = 2.54:    gc_GearRatio.Value = 3.75
        gc_TireDia.Value = 26:      gc_TireDia.UOM = UOM_NORMAL
        gc_PDRatio.Value = 1.62
        gc_Amax.Value = 2.2:        gc_EnginePMI.Value = 0.88
        gc_TransPMI.Value = 0.01:   gc_TiresPMI.Value = 8.6
        
        gc_NArm1.Value = 3:         gc_TCWt1.Value = 30
        gc_Static.Value = 190:      gc_NDisk.Value = 9
        gc_DiskWt.Value = Round(0.4 * gc_NDisk.Value * gc_DiskWt.Value, 0.1)
        gc_CMU.Value = 0.23
        
        RPM(1) = 4000:  HP(1) = 152:  RPM(6) = 6500:  HP(6) = 254
        RPM(2) = 4500:  HP(2) = 180:  RPM(7) = 7000:  HP(7) = 260
        RPM(3) = 5000:  HP(3) = 205:  RPM(8) = 7500:  HP(8) = 257
        RPM(4) = 5500:  HP(4) = 230:  RPM(9) = 8000:  HP(9) = 244
        RPM(5) = 6000:  HP(5) = 246:  RPM(10) = 8500: HP(10) = 210
        gc_LaunchRPM.Value = 0:     gc_AirGap.Value = 0.03
        
        gc_CrankWt.Value = 20:      gc_CrankStroke.Value = 4.5
        gc_FlywheelWt.Value = 18:   gc_FlywheelDia.Value = 6
        gc_TransWt.Value = 22:      gc_CaseDia.Value = 4
        gc_TireWt.Value = 18
        gc_WSTireDia.Value = 26:    gc_WSTireDia.UOM = UOM_NORMAL
        gc_WheelWt.Value = 12:      gc_WheelDia.Value = 15
        gc_NSlot.Value = 0:         gc_SlotWD.Value = 0
        gc_NHole.Value = 0:         gc_HoleDia.Value = 0
        gc_NSpring.Value = 6
        gc_ThrdpI.Value = 0.05:     gc_ThrdpI.UOM = UOM_ALTERNATE
        gc_BasePr.Value = 180:      gc_SRate.Value = 180
        
        gc_SeekLoRPM.Value = 5800:  gc_SeekHiRPM.Value = 6000
    End If
    
    BarometerCaptionSave = gc_Barometer.caption
    
    GSTOT60 1, gc_Amax.Value, T60
    gc_T60.Value = Round(T60, 0.01)
    
    gc_CWt1.Value = 0:      gc_CWt2.Value = 0
    If gc_NArm1.Value > 0 Then gc_CWt1.Value = Round(gc_TCWt1.Value / gc_NArm1.Value, 0.1)
    If gc_NArm2.Value > 0 Then gc_CWt2.Value = Round(gc_TCWt2.Value / gc_NArm2.Value, 0.1)
    
    gc_SBasePr.Value = 0:   gc_SSRate.Value = 0
    If gc_NSpring.Value > 0 Then
        gc_SBasePr.IsCalc = True
        gc_SBasePr.Value = Round(gc_BasePr.Value / gc_NSpring.Value, 0.1)
        
        gc_SSRate.IsCalc = True
        gc_SSRate.Value = Round(gc_SRate.Value / gc_NSpring.Value, 0.1)
    End If
    
    gc_ClArea.Value = CalcArea
    
    FileName = "(Untitled)"
    Me.caption = App.Title & " - " & FileName
    
    txtBarometer.SetFocus
    SelTextBoxText txtBarometer
    setpanels Me, PNL_SAVE, gc_Barometer
End Sub

Private Sub LoadFromSave(fn As String)
Dim VER As String
Dim i As Integer
Dim alt As Integer, fs As Integer
Dim pbar As Single, degf As Single, rh As Single
Dim lgr As Single, rgr As Single
Dim ti As Integer
Dim troll As Single, T60 As Single, amax As Single
Dim epmi As Single, tpmi As Single, fpmi As Single
Dim ATYPE As Integer, NARM As Integer
Dim TMCW As Single, RNGHT As Single, ADPTH As Single
Dim mpdr As Single, mhgr As Single, mcst As Single, mrwst As Single
Dim NDISK As Integer
Dim STLBF As Single, WTDISK As Single
Dim OD As Single, ID As Single, CLAREA As Single, CMU As Single
Dim Launch As Integer
Dim ENGE As Single, AIRGAP As Single
Dim CRNKWT As Single, STROKE As Single, FLYWT As Single, FLYDIA As Single, ZEPMOI As Single
Dim TTYPE As Integer
Dim TRANSWT As Single, CASEDIA As Single, ZTPMOI As Single
Dim TIREWT As Single, ZTROLL As Single, WHEELWT As Single, WHEELDIA As Single, ZWPMOI As Single
Dim nslot As Integer, nhole As Integer
Dim slotwd As Single, holdia As Single, ZCLAREA As Single
Dim NSPRNG As Integer
Dim BASEPR As Single, SRATE As Single, turns As Single, THRDPI As Single, drnht As Single, ZSTLBF As Single
Dim LoRPM As Single, HiRPM As Single

Dim ofResult As Integer
    
    If fn = "" Then Exit Sub
    On Error GoTo ReadError
    
loadfile:
    'make sure that the file named fn even exists
    ofResult = OpenFile(fn, g_ofstruct, OF_EXIST)
    If ofResult = -1 Then
        If LastFile = "" Or LastFile = "(Untitled)" Then
            SetDefaults 1
            GoTo CloseRead
        Else
            fn = LastFile
            GoTo loadfile
        End If
    End If

    gc_TCWt1.IsCalc = True:         gc_TCWt2.IsCalc = True
    gc_RingHt1.IsCalc = True:       gc_RingHt2.IsCalc = True
    gc_ArmDepth1.IsCalc = True:     gc_ArmDepth2.IsCalc = True
    gc_Static.IsCalc = True
    gc_BasePr.IsCalc = True:        gc_SBasePr.IsCalc = True
    gc_SSRate.IsCalc = True:        gc_SRate.IsCalc = True
    gc_DiskWt.IsCalc = True
    gc_DiskOD.IsCalc = True:        gc_DiskID.IsCalc = True
    gc_SeekLoRPM.IsCalc = True:     gc_SeekHiRPM.IsCalc = True

    Open fn For Input As #1
    Input #1, VER
    If VER = 0 Or VER > 3 Then
        alt = VER
        Input #1, pbar, degf, rh, fs, lgr, rgr
    Else
        Input #1, alt, pbar, degf, rh, fs, lgr, rgr
    End If
    
    'Input #1, alt, pbar, degf, rh, fs, lgr, rgr
        With gc_Barometer
            If alt = 0 Then
                .Value = pbar
                .UOM = UOM_NORMAL
                txtBarometer.Text = Format(.Value, "##.00")
            Else
                .Value = alt
                .UOM = UOM_ALTERNATE
                txtBarometer.Text = Format(.Value, "#####")
            End If
            BarometerCaptionSave = .caption
        End With
        
        gc_Temperature.Value = degf:    gc_Humidity.Value = rh
        
        If fs < 1 Or fs > 8 Then fs = 1
        gc_FuelSystem.Value = fs
        
        gc_LowGear.Value = lgr:         gc_GearRatio.Value = rgr
        
    Input #1, troll, ti, amax, epmi, tpmi, fpmi
        gc_TireDia.Value = troll:       gc_TractionIndex.Value = ti
        gc_Amax.Value = amax:           gc_EnginePMI.Value = epmi
        gc_TransPMI.Value = tpmi:       gc_TiresPMI.Value = fpmi
        
    Input #1, ATYPE, NARM, TMCW, RNGHT, ADPTH
        With gc_Mfg1
            .Value = ATYPE
            If .IsError And .Value = .MaxVal Then .Value = .MaxVal - 1
        End With
        gc_NArm1.Value = NARM:          gc_TCWt1.Value = TMCW
        gc_RingHt1.Value = RNGHT:       gc_ArmDepth1.Value = ADPTH
    
    Input #1, ATYPE, NARM, TMCW, RNGHT, ADPTH
        With gc_Mfg2
            .Value = ATYPE
            If .IsError And .Value = .MaxVal Then .Value = .MaxVal - 1
        End With
        gc_NArm2.Value = NARM:          gc_TCWt2.Value = TMCW
        gc_RingHt2.Value = RNGHT:       gc_ArmDepth2.Value = ADPTH
    
    Input #1, mpdr, mhgr, mcst, mrwst, ADPTH
        gc_PDRatio.Value = mpdr:        gc_HighGear.Value = mhgr
        gc_Countershaft.Value = mcst:   gc_RearWheel.Value = mrwst
    
    Input #1, STLBF, NDISK, WTDISK, OD, ID, CLAREA, CMU
        gc_Static.Value = STLBF:        gc_NDisk.Value = NDISK
        gc_DiskWt.Value = WTDISK:       gc_DiskOD.Value = OD
        gc_DiskID.Value = ID:           gc_ClArea.Value = CLAREA
        gc_CMU.Value = CMU
    
    Input #1, RPM(1), RPM(2), RPM(3), RPM(4), RPM(5), RPM(6)
    Input #1, RPM(7), RPM(8), RPM(9), RPM(10), RPM(11)
    Input #1, HP(1), HP(2), HP(3), HP(4), HP(5), HP(6)
    Input #1, HP(7), HP(8), HP(9), HP(10), HP(11)
        
    Input #1, ENGE, Launch, AIRGAP
        gc_HPTQMult.Value = ENGE
        gc_LaunchRPM.Value = Launch
        gc_AirGap.Value = AIRGAP
    
    Input #1, CRNKWT, STROKE, FLYWT, FLYDIA, ZEPMOI
        gc_CrankWt.Value = CRNKWT
        gc_CrankStroke.Value = STROKE
        gc_FlywheelWt.Value = FLYWT
        gc_FlywheelDia.Value = FLYDIA
     
    Input #1, TTYPE, TRANSWT, CASEDIA, ZTPMOI
        gc_WSTransType.Value = TTYPE
        gc_TransWt.Value = TRANSWT
        gc_CaseDia.Value = CASEDIA
         
    Input #1, TIREWT, ZTROLL, WHEELWT, WHEELDIA, ZWPMOI
        gc_TireWt.Value = TIREWT
        With gc_WSTireDia
            If ZTROLL <= .MaxVal_Normal Then
                .UOM = UOM_NORMAL
            Else
                .UOM = UOM_ALTERNATE
            End If
            .Value = ZTROLL
        End With
        gc_WheelWt.Value = WHEELWT:     gc_WheelDia.Value = WHEELDIA
    
    Input #1, nslot, slotwd, nhole, holdia, ZCLAREA
        gc_NSlot.Value = nslot:         gc_SlotWD.Value = slotwd
        gc_NHole.Value = nhole:         gc_HoleDia.Value = holdia
        
    Input #1, NSPRNG, BASEPR, SRATE, turns, THRDPI, drnht, ZSTLBF
        gc_NSpring.Value = NSPRNG:      gc_BasePr.Value = BASEPR
        gc_SRate.Value = SRATE:         gc_Turns.Value = turns
        gc_ThrdpI.Value = THRDPI:       gc_dRnHt.Value = drnht
    
    If VER = 3 Then
        Input #1, LoRPM, HiRPM
        gc_SeekLoRPM.Value = LoRPM:     gc_SeekHiRPM.Value = HiRPM
    End If
    
    Input #1, AData(NARMD, 1), AData(NARMD, 2), AData(NARMD, 3), AData(NARMD, 4), AData(NARMD, 5), AData(NARMD, 6)
    Input #1, AData(NARMD, 7), AData(NARMD, 8), AData(NARMD, 9), AData(NARMD, 10), AData(NARMD, 11)
     
CloseRead:
    Close #1
    
    'On Error GoTo ReadError
    
    GSTOT60 1, gc_Amax.Value, T60
    gc_T60.Value = Round(T60, 0.01)
    
    txtMfg1.Text = AName(gc_Mfg1.Value):    Mfg1SaveText = Left(txtMfg1.Text, 3)
    txtMfg2.Text = AName(gc_Mfg2.Value):    Mfg2SaveText = Left(txtMfg2.Text, 3)
    NDiskSave = gc_NDisk.Value
    DiskODSave = gc_DiskOD.Value
    
    gc_CWt1.Value = 0:  gc_CWt2.Value = 0
    If gc_NArm1.Value > 0 Then gc_CWt1.Value = Round(gc_TCWt1.Value / gc_NArm1.Value, 0.1)
    If gc_NArm2.Value > 0 Then gc_CWt2.Value = Round(gc_TCWt2.Value / gc_NArm2.Value, 0.1)
    
    gc_SBasePr.Value = 0:    gc_SSRate.Value = 0
    If gc_NSpring.Value > 0 Then
        gc_SBasePr.IsCalc = True
        gc_SBasePr.Value = Round(gc_BasePr.Value / gc_NSpring.Value, 0.1)
        
        gc_SSRate.IsCalc = True
        gc_SSRate.Value = Round(gc_SRate.Value / gc_NSpring.Value, 0.1)
    End If
    
    LoadEngineGrid
    SetIsBike
    SetIsGlide
    SetClutchStrings
    SetBikeStrings
    
    SetNDisk
    SetTCWt
    SetRingHt
    SetArmDepth
    SetDiskOD
    SetDiskID
    SetDiskWT
    SetStatic
    
    If gc_HPTQMult.Value = 1 Then
        btnRecalc.Enabled = False
    Else
        btnRecalc.Enabled = True
    End If
    
    Weather
    EngCalc
    SetSave 0
    ClutchCalc
    SetSave 1
    Graph1
    Graph2
    
    FileName = fn
    Me.caption = App.Title & " - " & NameOnly(FileName)
    LastFile = FileName
    
    txtBarometer.SetFocus
    SelTextBoxText txtBarometer
    setpanels Me, PNL_SAVE, gc_Barometer
    
    bFileDirty = False
    Exit Sub
    
ReadError:
    Close #1
    MsgBox "Bad file type/format.  Data file must be in *.RSA format.", vbExclamation, "Data File Error!"

    Me.caption = App.Title & " - " & NameOnly(LastFile)
    If LastFile = "" Or LastFile = "(Untitled)" Then
        SetDefaults 1
        GoTo CloseRead
    Else
        fn = LastFile
        GoTo loadfile
    End If
    
    Exit Sub
    Resume Next
End Sub

Public Sub LoadEngineGrid()
Dim i As Integer
    For i = 0 To DYNO_ROWS - 1
        With gc_grdDyno
            .GridArray(0, i) = RPM(i + 1)
            .GridArray(1, i) = HP(i + 1)
         
            If RPM(i + 1) = 0 Then
                .GridArray(2, i) = 0
            Else
                .GridArray(2, i) = Z6 * .GridArray(1, i) / .GridArray(0, i)
            End If
        End With
    Next
    
    frmClutch.grdDyno.Refresh
End Sub

Private Sub SetIsBike()
    If isRSA Then
        If gc_Mfg1.Value = NARMD - 3 Or gc_Mfg1.Value = NARMD - 2 Or gc_Mfg1.Value = NARMD - 1 Then
            isBike = True
        Else
            isBike = False
        End If
    End If
End Sub

Private Sub SetIsGlide()
    If Left(txtMfg1.Text, 3) = "CGL" Or Left(txtMfg2.Text, 3) = "CGL" Then
        isGlide = True
    Else
        isGlide = False
    End If
End Sub

Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property

Private Function TestDirty() As Integer
Dim zs As String                        'vbCancel = 2
    TestDirty = vbNo                    'vbNo = 7
    If bFileDirty Then                  'vbYes = 6
        TestDirty = MsgBox("Do you want to Save the current data?", vbInformation + vbYesNoCancel, "Data Has Changed!")
        If TestDirty = vbYes Then
            zs = NameOnly(FileName)
            If zs = "" Or zs = "(Untitled)" Or zs = "Clutch.RSA" Then
                mnuSave_Click
            Else
                mnuFile_Click 2
            End If
        End If
    End If
End Function
