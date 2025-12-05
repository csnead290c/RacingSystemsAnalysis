VERSION 5.00
Object = "{00028C01-0000-0000-0000-000000000046}#1.0#0"; "DBGRID32.OCX"
Object = "{0BA686C6-F7D3-101A-993E-0000C0EF6F5E}#1.0#0"; "threed32.ocx"
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
   Begin VB.Frame Frame1 
      Caption         =   "Change in Plate Force - lbs @ Engine RPM"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   2475
      Left            =   7290
      TabIndex        =   27
      Top             =   30
      Width           =   4620
      Begin VB.TextBox txtdRPM3 
         Height          =   285
         Left            =   3960
         MaxLength       =   7
         TabIndex        =   24
         Top             =   195
         Width           =   540
      End
      Begin VB.TextBox txtdRPM2 
         Height          =   285
         Left            =   3195
         MaxLength       =   7
         TabIndex        =   23
         Top             =   195
         Width           =   540
      End
      Begin VB.TextBox txtdRPM1 
         Height          =   285
         Left            =   2400
         MaxLength       =   7
         TabIndex        =   22
         Top             =   195
         Width           =   540
      End
      Begin VB.Label Label1 
         Caption         =   "Launch, Lockup && Maximum"
         Height          =   255
         Index           =   5
         Left            =   120
         TabIndex        =   77
         Top             =   240
         Width           =   2100
      End
      Begin VB.Label Label1 
         Caption         =   "+1 arm - w/o Counter Wt"
         Height          =   255
         Index           =   0
         Left            =   120
         TabIndex        =   68
         Top             =   615
         Width           =   2100
      End
      Begin VB.Label Label2 
         Caption         =   "+1 gram - Total Counter Wt"
         Height          =   255
         Index           =   0
         Left            =   120
         TabIndex        =   67
         Top             =   915
         Width           =   2100
      End
      Begin VB.Label Label3 
         Caption         =   "+.010 inch - Ring Height"
         Height          =   255
         Index           =   0
         Left            =   120
         TabIndex        =   66
         Top             =   1215
         Width           =   2100
      End
      Begin VB.Label Label4 
         Caption         =   "+.010 inch - Arm Depth"
         Height          =   255
         Index           =   0
         Left            =   120
         TabIndex        =   65
         Top             =   1515
         Width           =   2100
      End
      Begin VB.Label Label5 
         Caption         =   "+1 turn - Adjuster Location"
         Height          =   255
         Index           =   0
         Left            =   120
         TabIndex        =   64
         Top             =   1815
         Width           =   2100
      End
      Begin VB.Label Label1 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "XXX.X"
         BeginProperty DataFormat 
            Type            =   1
            Format          =   "0.0"
            HaveTrueFalseNull=   0
            FirstDayOfWeek  =   0
            FirstWeekOfYear =   0
            LCID            =   1033
            SubFormatType   =   1
         EndProperty
         Height          =   285
         Index           =   1
         Left            =   2400
         TabIndex        =   63
         Top             =   600
         Width           =   540
      End
      Begin VB.Label Label1 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "XXX.X"
         BeginProperty DataFormat 
            Type            =   1
            Format          =   "0.0"
            HaveTrueFalseNull=   0
            FirstDayOfWeek  =   0
            FirstWeekOfYear =   0
            LCID            =   1033
            SubFormatType   =   1
         EndProperty
         Height          =   285
         Index           =   2
         Left            =   3180
         TabIndex        =   62
         Top             =   600
         Width           =   540
      End
      Begin VB.Label Label1 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "XXX.X"
         BeginProperty DataFormat 
            Type            =   1
            Format          =   "0.0"
            HaveTrueFalseNull=   0
            FirstDayOfWeek  =   0
            FirstWeekOfYear =   0
            LCID            =   1033
            SubFormatType   =   1
         EndProperty
         Height          =   285
         Index           =   3
         Left            =   3960
         TabIndex        =   61
         Top             =   600
         Width           =   540
      End
      Begin VB.Label Label2 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "XXX.X"
         BeginProperty DataFormat 
            Type            =   1
            Format          =   "0.0"
            HaveTrueFalseNull=   0
            FirstDayOfWeek  =   0
            FirstWeekOfYear =   0
            LCID            =   1033
            SubFormatType   =   1
         EndProperty
         Height          =   285
         Index           =   1
         Left            =   2400
         TabIndex        =   60
         Top             =   900
         Width           =   540
      End
      Begin VB.Label Label2 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "XXX.X"
         BeginProperty DataFormat 
            Type            =   1
            Format          =   "0.0"
            HaveTrueFalseNull=   0
            FirstDayOfWeek  =   0
            FirstWeekOfYear =   0
            LCID            =   1033
            SubFormatType   =   1
         EndProperty
         Height          =   285
         Index           =   2
         Left            =   3180
         TabIndex        =   59
         Top             =   900
         Width           =   540
      End
      Begin VB.Label Label2 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "XXX.X"
         BeginProperty DataFormat 
            Type            =   1
            Format          =   "0.0"
            HaveTrueFalseNull=   0
            FirstDayOfWeek  =   0
            FirstWeekOfYear =   0
            LCID            =   1033
            SubFormatType   =   1
         EndProperty
         Height          =   285
         Index           =   3
         Left            =   3960
         TabIndex        =   58
         Top             =   900
         Width           =   540
      End
      Begin VB.Label Label3 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "XXX.X"
         BeginProperty DataFormat 
            Type            =   1
            Format          =   "0.0"
            HaveTrueFalseNull=   0
            FirstDayOfWeek  =   0
            FirstWeekOfYear =   0
            LCID            =   1033
            SubFormatType   =   1
         EndProperty
         Height          =   285
         Index           =   3
         Left            =   3960
         TabIndex        =   57
         Top             =   1200
         Width           =   540
      End
      Begin VB.Label Label3 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "XXX.X"
         BeginProperty DataFormat 
            Type            =   1
            Format          =   "0.0"
            HaveTrueFalseNull=   0
            FirstDayOfWeek  =   0
            FirstWeekOfYear =   0
            LCID            =   1033
            SubFormatType   =   1
         EndProperty
         Height          =   285
         Index           =   2
         Left            =   3180
         TabIndex        =   56
         Top             =   1200
         Width           =   540
      End
      Begin VB.Label Label3 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "XXX.X"
         BeginProperty DataFormat 
            Type            =   1
            Format          =   "0.0"
            HaveTrueFalseNull=   0
            FirstDayOfWeek  =   0
            FirstWeekOfYear =   0
            LCID            =   1033
            SubFormatType   =   1
         EndProperty
         Height          =   285
         Index           =   1
         Left            =   2400
         TabIndex        =   55
         Top             =   1200
         Width           =   540
      End
      Begin VB.Label Label4 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "XXX.X"
         BeginProperty DataFormat 
            Type            =   1
            Format          =   "0.0"
            HaveTrueFalseNull=   0
            FirstDayOfWeek  =   0
            FirstWeekOfYear =   0
            LCID            =   1033
            SubFormatType   =   1
         EndProperty
         Height          =   285
         Index           =   3
         Left            =   3960
         TabIndex        =   54
         Top             =   1500
         Width           =   540
      End
      Begin VB.Label Label4 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "XXX.X"
         BeginProperty DataFormat 
            Type            =   1
            Format          =   "0.0"
            HaveTrueFalseNull=   0
            FirstDayOfWeek  =   0
            FirstWeekOfYear =   0
            LCID            =   1033
            SubFormatType   =   1
         EndProperty
         Height          =   285
         Index           =   2
         Left            =   3180
         TabIndex        =   53
         Top             =   1500
         Width           =   540
      End
      Begin VB.Label Label4 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "XXX.X"
         BeginProperty DataFormat 
            Type            =   1
            Format          =   "0.0"
            HaveTrueFalseNull=   0
            FirstDayOfWeek  =   0
            FirstWeekOfYear =   0
            LCID            =   1033
            SubFormatType   =   1
         EndProperty
         Height          =   285
         Index           =   1
         Left            =   2400
         TabIndex        =   52
         Top             =   1500
         Width           =   540
      End
      Begin VB.Label Label5 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "XXX.X"
         BeginProperty DataFormat 
            Type            =   1
            Format          =   "0.0"
            HaveTrueFalseNull=   0
            FirstDayOfWeek  =   0
            FirstWeekOfYear =   0
            LCID            =   1033
            SubFormatType   =   1
         EndProperty
         Height          =   285
         Index           =   3
         Left            =   3960
         TabIndex        =   51
         Top             =   1800
         Width           =   540
      End
      Begin VB.Label Label5 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "XXX.X"
         BeginProperty DataFormat 
            Type            =   1
            Format          =   "0.0"
            HaveTrueFalseNull=   0
            FirstDayOfWeek  =   0
            FirstWeekOfYear =   0
            LCID            =   1033
            SubFormatType   =   1
         EndProperty
         Height          =   285
         Index           =   2
         Left            =   3180
         TabIndex        =   50
         Top             =   1800
         Width           =   540
      End
      Begin VB.Label Label5 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "XXX.X"
         BeginProperty DataFormat 
            Type            =   1
            Format          =   "0.0"
            HaveTrueFalseNull=   0
            FirstDayOfWeek  =   0
            FirstWeekOfYear =   0
            LCID            =   1033
            SubFormatType   =   1
         EndProperty
         Height          =   285
         Index           =   1
         Left            =   2400
         TabIndex        =   49
         Top             =   1800
         Width           =   540
      End
      Begin VB.Line Line2 
         X1              =   90
         X2              =   4500
         Y1              =   540
         Y2              =   540
      End
      Begin VB.Label Label6 
         Caption         =   "Label6"
         Height          =   225
         Left            =   90
         TabIndex        =   48
         Top             =   2130
         Width           =   4485
      End
   End
   Begin VB.Frame Frame6 
      Caption         =   "Clutch Spring Data"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   2475
      Left            =   3600
      TabIndex        =   26
      Top             =   30
      Width           =   3570
      Begin VB.TextBox txtdRnHt 
         Height          =   285
         Left            =   2910
         MaxLength       =   7
         TabIndex        =   21
         Top             =   2100
         Width           =   540
      End
      Begin VB.TextBox txtThrdpI 
         Height          =   285
         Left            =   2910
         MaxLength       =   7
         TabIndex        =   20
         Top             =   1800
         Width           =   540
      End
      Begin VB.TextBox txtTurns 
         Height          =   285
         Left            =   2910
         MaxLength       =   7
         TabIndex        =   19
         Top             =   1500
         Width           =   540
      End
      Begin VB.TextBox txtSRate 
         Height          =   285
         Left            =   2910
         MaxLength       =   7
         TabIndex        =   18
         Top             =   1200
         Width           =   540
      End
      Begin VB.TextBox txtBasePr 
         Height          =   285
         Left            =   2910
         MaxLength       =   7
         TabIndex        =   17
         Top             =   900
         Width           =   540
      End
      Begin VB.TextBox txtNSpring 
         Height          =   285
         Left            =   2910
         MaxLength       =   7
         TabIndex        =   16
         Top             =   600
         Width           =   540
      End
      Begin VB.TextBox txtSBasePr 
         Height          =   285
         Left            =   2160
         MaxLength       =   7
         TabIndex        =   14
         Top             =   900
         Width           =   540
      End
      Begin VB.TextBox txtSSRate 
         Height          =   285
         Left            =   2160
         MaxLength       =   7
         TabIndex        =   15
         Top             =   1200
         Width           =   540
      End
      Begin VB.TextBox txtStatic 
         Height          =   285
         Left            =   2160
         MaxLength       =   7
         TabIndex        =   13
         Top             =   195
         Width           =   540
      End
      Begin VB.Line line1 
         BorderColor     =   &H00000000&
         X1              =   90
         X2              =   3450
         Y1              =   540
         Y2              =   540
      End
      Begin VB.Label lbl 
         Caption         =   "Delta Ring Height - inches"
         Height          =   195
         Index           =   5
         Left            =   120
         TabIndex        =   46
         Top             =   2145
         Width           =   2010
      End
      Begin VB.Label lbl 
         Caption         =   "Adjuster threads per inch"
         Height          =   195
         Index           =   1
         Left            =   120
         TabIndex        =   45
         Top             =   1845
         Width           =   2010
      End
      Begin VB.Label lbl 
         Caption         =   "Adjuster Location - turns"
         Height          =   195
         Index           =   0
         Left            =   120
         TabIndex        =   44
         Top             =   1545
         Width           =   2010
      End
      Begin VB.Label lbl 
         Caption         =   "Spring Rate - lbs/turn"
         Height          =   195
         Index           =   4
         Left            =   120
         TabIndex        =   43
         Top             =   1245
         Width           =   2010
      End
      Begin VB.Label lbl 
         Caption         =   "Spring Base Pressure - lbs"
         Height          =   195
         Index           =   6
         Left            =   120
         TabIndex        =   42
         Top             =   945
         Width           =   2010
      End
      Begin VB.Label lbl 
         Caption         =   "Number of Springs"
         Height          =   195
         Index           =   7
         Left            =   120
         TabIndex        =   41
         Top             =   645
         Width           =   2010
      End
      Begin VB.Label lbl 
         Alignment       =   2  'Center
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "-1-"
         Height          =   285
         Index           =   8
         Left            =   2160
         TabIndex        =   40
         Top             =   600
         Width           =   540
      End
      Begin VB.Label Label1 
         Caption         =   "Static Plate Force - lbs"
         Height          =   195
         Index           =   26
         Left            =   120
         TabIndex        =   39
         Top             =   240
         Width           =   2100
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
      Height          =   5115
      Left            =   90
      TabIndex        =   28
      Top             =   2505
      Width           =   11820
      Begin VB.PictureBox Picture1 
         Height          =   4995
         Left            =   2175
         ScaleHeight     =   4935
         ScaleWidth      =   7830
         TabIndex        =   78
         Top             =   90
         Width           =   7890
         Begin Threed.SSPanel sspTotal 
            Height          =   300
            Left            =   6825
            TabIndex        =   79
            Top             =   675
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
            Left            =   3960
            TabIndex        =   80
            Top             =   3780
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
         Begin VB.Line Line3 
            BorderColor     =   &H000000FF&
            BorderWidth     =   3
            X1              =   3870
            X2              =   3870
            Y1              =   345
            Y2              =   4470
         End
      End
      Begin GraphsLib.Graph gph1 
         Height          =   5010
         Left            =   2190
         TabIndex        =   38
         TabStop         =   0   'False
         Top             =   90
         Visible         =   0   'False
         Width           =   7875
         _Version        =   327680
         _ExtentX        =   13891
         _ExtentY        =   8837
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
      Begin MSDBGrid.DBGrid grdClutch 
         Height          =   2775
         Left            =   180
         OleObjectBlob   =   "Clutch.frx":0000
         TabIndex        =   47
         Top             =   1290
         Width           =   1800
      End
      Begin VB.Label Label1 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "Label1"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   300
         Index           =   4
         Left            =   10530
         TabIndex        =   76
         Top             =   870
         Width           =   810
      End
      Begin VB.Label Label2 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "Label2"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   300
         Index           =   4
         Left            =   10530
         TabIndex        =   75
         Top             =   2010
         Width           =   810
      End
      Begin VB.Label Label3 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "Label3"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   300
         Index           =   4
         Left            =   10530
         TabIndex        =   74
         Top             =   3150
         Width           =   810
      End
      Begin VB.Label Label4 
         Alignment       =   1  'Right Justify
         BackColor       =   &H0080FFFF&
         BorderStyle     =   1  'Fixed Single
         Caption         =   "Label4"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   300
         Index           =   4
         Left            =   10530
         TabIndex        =   73
         Top             =   4290
         Width           =   810
      End
      Begin VB.Label Label10 
         Alignment       =   2  'Center
         Caption         =   "Engine RPM"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   300
         Left            =   10185
         TabIndex        =   72
         Top             =   510
         Width           =   1500
      End
      Begin VB.Label Label7 
         Alignment       =   2  'Center
         Caption         =   "------ lbs"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   300
         Left            =   10185
         TabIndex        =   71
         Top             =   1650
         Width           =   1500
      End
      Begin VB.Label Label8 
         Alignment       =   2  'Center
         Caption         =   "------- lbs"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00808080&
         Height          =   300
         Left            =   10185
         TabIndex        =   70
         Top             =   2790
         Width           =   1500
      End
      Begin VB.Label Label9 
         Alignment       =   2  'Center
         Caption         =   "difference"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   300
         Left            =   10185
         TabIndex        =   69
         Top             =   3930
         Width           =   1500
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
      Height          =   2175
      Left            =   90
      TabIndex        =   25
      Top             =   30
      Width           =   3390
      Begin VB.CommandButton btnMfgStyle 
         Caption         =   "?"
         Height          =   270
         Left            =   1530
         TabIndex        =   12
         ToolTipText     =   "Press this button to display Help for the Mfg.Style Code"
         Top             =   195
         Width           =   270
      End
      Begin VB.TextBox txtArmDepth2 
         Height          =   285
         Left            =   2730
         MaxLength       =   7
         TabIndex        =   11
         Top             =   1695
         Width           =   540
      End
      Begin VB.TextBox txtRingHt2 
         Height          =   285
         Left            =   2730
         MaxLength       =   7
         TabIndex        =   10
         Top             =   1395
         Width           =   540
      End
      Begin VB.TextBox txtCWt2 
         Height          =   285
         Left            =   2730
         MaxLength       =   7
         TabIndex        =   9
         Top             =   1095
         Width           =   540
      End
      Begin VB.TextBox txtTCWt2 
         Height          =   285
         Left            =   2730
         MaxLength       =   7
         TabIndex        =   8
         Top             =   795
         Width           =   540
      End
      Begin VB.TextBox txtNArm2 
         Height          =   285
         Left            =   2730
         MaxLength       =   7
         TabIndex        =   7
         Top             =   495
         Width           =   540
      End
      Begin VB.TextBox txtMfg2 
         Height          =   285
         Left            =   2655
         MaxLength       =   7
         TabIndex        =   6
         Top             =   195
         Width           =   615
      End
      Begin VB.TextBox txtArmDepth1 
         Height          =   285
         Left            =   1980
         MaxLength       =   7
         TabIndex        =   5
         Top             =   1695
         Width           =   540
      End
      Begin VB.TextBox txtRingHt1 
         Height          =   285
         Left            =   1980
         MaxLength       =   7
         TabIndex        =   4
         Top             =   1395
         Width           =   540
      End
      Begin VB.TextBox txtCwt1 
         Height          =   285
         Left            =   1980
         MaxLength       =   7
         TabIndex        =   3
         Top             =   1095
         Width           =   540
      End
      Begin VB.TextBox txtTCWt1 
         Height          =   285
         Left            =   1980
         MaxLength       =   7
         TabIndex        =   2
         Top             =   795
         Width           =   540
      End
      Begin VB.TextBox txtNArm1 
         Height          =   285
         Left            =   1980
         MaxLength       =   7
         TabIndex        =   1
         Top             =   495
         Width           =   540
      End
      Begin VB.TextBox txtMfg1 
         Height          =   285
         Left            =   1905
         MaxLength       =   7
         TabIndex        =   0
         Top             =   195
         Width           =   615
      End
      Begin VB.Label Label1 
         Caption         =   "Arm Depth - inches"
         Height          =   195
         Index           =   38
         Left            =   120
         TabIndex        =   34
         Top             =   1740
         Width           =   1800
      End
      Begin VB.Label Label1 
         Caption         =   "Ring Height - inches"
         Height          =   195
         Index           =   37
         Left            =   120
         TabIndex        =   33
         Top             =   1440
         Width           =   1800
      End
      Begin VB.Label Label1 
         Caption         =   "Counter Wt/Arm - grams"
         Height          =   195
         Index           =   36
         Left            =   120
         TabIndex        =   32
         Top             =   1140
         Width           =   1800
      End
      Begin VB.Label Label1 
         Caption         =   "Total Counter Wt - grams"
         Height          =   195
         Index           =   34
         Left            =   120
         TabIndex        =   31
         Top             =   840
         Width           =   1800
      End
      Begin VB.Label Label1 
         Caption         =   "Number of Arms"
         Height          =   195
         Index           =   30
         Left            =   120
         TabIndex        =   30
         Top             =   540
         Width           =   1800
      End
      Begin VB.Label Label1 
         Caption         =   "Mfg.Style Code"
         Height          =   195
         Index           =   27
         Left            =   120
         TabIndex        =   29
         Top             =   240
         Width           =   1800
      End
   End
   Begin MSComDlg.CommonDialog CommonDialog1 
      Left            =   2970
      Top             =   2220
      _ExtentX        =   847
      _ExtentY        =   847
      _Version        =   393216
   End
   Begin Threed.SSPanel PnlInput 
      Height          =   270
      Index           =   1
      Left            =   10125
      TabIndex        =   35
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
   Begin Threed.SSPanel PnlInput 
      Height          =   270
      Index           =   2
      Left            =   11055
      TabIndex        =   36
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
   Begin Threed.SSPanel PnlInput 
      Height          =   270
      Index           =   0
      Left            =   60
      TabIndex        =   37
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
Private vbreply As Integer

Dim s1 As Single, s2 As Single, s3 As Single
Dim xmax As Single, zRPM As Single

Private Sub Form_Activate()
Static IsLoaded As Boolean
    If Not IsLoaded Then
        gc_Mfg1.ClsControl = txtMfg1:               gc_Mfg2.ClsControl = txtMfg2
        gc_NArm1.ClsControl = txtNArm1:             gc_NArm2.ClsControl = txtNArm2
        gc_TCWt1.ClsControl = txtTCWt1:             gc_TCWt2.ClsControl = txtTCWt2
        gc_CWt1.ClsControl = txtCwt1:               gc_CWt2.ClsControl = txtCWt2
        gc_RingHt1.ClsControl = txtRingHt1:         gc_RingHt2.ClsControl = txtRingHt2
        gc_ArmDepth1.ClsControl = txtArmDepth1:     gc_ArmDepth2.ClsControl = txtArmDepth2

        gc_Static.ClsControl = txtStatic
        
        gc_NSpring.Labelctl = lbl(7)
        gc_BasePr.Labelctl = lbl(6):                gc_SBasePr.Labelctl = lbl(6)
        gc_SRate.Labelctl = lbl(4):                 gc_SSRate.Labelctl = lbl(4)
        gc_Turns.Labelctl = lbl(0)
        gc_ThrdpI.Labelctl = lbl(1)
        gc_dRnHt.Labelctl = lbl(5)
        
        gc_NSpring.ClsControl = txtNSpring
        gc_BasePr.ClsControl = txtBasePr:           gc_SBasePr.ClsControl = txtSBasePr
        gc_SRate.ClsControl = txtSRate:             gc_SSRate.ClsControl = txtSSRate
        gc_Turns.ClsControl = txtTurns
        gc_ThrdpI.ClsControl = txtThrdpI
        gc_dRnHt.ClsControl = txtdRnHt
            
        gc_dRPM1.ClsControl = txtdRPM1
        gc_dRPM2.ClsControl = txtdRPM2
        gc_dRPM3.ClsControl = txtdRPM3
        
        gc_PDRatio.Value = 1    'always equal to 1.0 for CLUTCHjr
        NTQ = DYNO_ROWS         'always equal to Dyno_Rows (= 10) for CLUTCHjr
        
        FileName = App.Path & "\Clutch.RSA"
        LoadFromSave FileName
        IsLoaded = True
    End If
End Sub

Private Sub SetLine()
Dim ymax As Single
    xmax = RoundUp(RPM(NTQ), 2000)      'follow the logic of Graph1 to set xmax
    ymax = TotalLbs(gc_Static.Value, CF1, RetLbf1, CF2, RetLbf2, xmax)

    s1 = IIf(ymax >= 1000, 780, 720)    'depending on the y-axis, select the zero location
    s2 = 7150:  s3 = xmax / (s2 - s1)   'set the x-axix max, and calculate the scaling ratio

    If zRPM = 0 Then zRPM = gc_dRPM2.Value
    SetLabels
End Sub

Private Sub Form_KeyDown(KeyCode As Integer, shift As Integer)
Dim dz As Single
    Select Case KeyCode
        Case vbKeyLeft:     dz = -50
        Case vbKeyRight:    dz = 50
        Case vbKeyDown:     dz = -250
        Case vbKeyUp:       dz = 250
        Case Else:          Exit Sub
    End Select
    
    zRPM = Round(zRPM + dz, 50):        SetLabels
End Sub

Private Sub picture1_MouseDown(Button As Integer, shift As Integer, X As Single, Y As Single)
    zRPM = Round(s3 * (X - s1), 50):    SetLabels
End Sub

Private Sub SetLabels()
Dim newval As Single
Dim oldval As Single
Dim difVal As Single
Dim iround As Single
    If zRPM < 0 Then
        zRPM = 0:       Line3.X1 = s1
    ElseIf zRPM > xmax Then
        zRPM = xmax:    Line3.X1 = s2
    Else
        Line3.X1 = Round(s1 + (zRPM / s3), 15)
    End If
    Line3.X2 = Line3.X1
    
    newval = TotalLbs(gc_Static.Value, CF1, RetLbf1, CF2, RetLbf2, zRPM)
    oldval = TotalLbs(StaticSave, CF1Save, RetLbf1Save, CF2Save, RetLbf2Save, zRPM)
    
    'set rounding value for car and bike clutch plate forces
    iround = IIf(Not isBike, 5, 2)
    newval = Round(newval, iround): oldval = Round(oldval, iround)
    difVal = newval - oldval
    
    Label1(4).caption = zRPM:          Label2(4).caption = newval
    Label3(4).caption = oldval:        Label4(4).caption = difVal
End Sub

Private Sub Form_Load()
    SetClutchGrid
End Sub

Private Sub Form_QueryUnload(Cancel As Integer, UnloadMode As Integer)
    If TestDirty() = vbCancel Then Cancel = True
End Sub


Private Sub mnuFile_Click(Index As Integer)
    On Error GoTo SubExit
    
    Select Case Index
        Case 0: If TestDirty() = vbCancel Then Exit Sub
        
                With CommonDialog1
                    .DialogTitle = "Open CLUTCHjr Data File"
                    .Flags = cdlOFNHideReadOnly Or cdlOFNFileMustExist
                    .InitDir = App.Path
                    .FileName = "*.RSA"
                    .DefaultExt = "RSA"
                    .Filter = "CLUTCHjr 3.0 Files"
                    .ShowOpen
                
                    If .FileName <> "" And .FileName <> "*.RSA" Then
                        FileName = Trim(.FileName)
                        Me.caption = App.Title & " - " & NameOnly(FileName)
                        LoadFromSave FileName
                    End If
                End With
        
        Case 1: mnuSave_Click
        Case 2: With CommonDialog1
                    .DialogTitle = "Save CLUTCHjr Data File"
                    .Flags = cdlOFNOverwritePrompt Or cdlOFNPathMustExist
                    .InitDir = App.Path
                    .FileName = "*.RSA"
                    .DefaultExt = "RSA"
                    .Filter = "CLUTCHjr 3.0 Files"
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
    MousePointer = vbHourglass
    
    SetSave 1
    Graph1
    
    If FileName = "" Or FileName = "(Untitled)" Then
        FileName = App.Path & "\Clutch.RSA"
        Me.caption = App.Title & " - " & NameOnly(FileName)
    End If
    
    On Error GoTo CloseSave
    
    Open FileName For Output As #1
    Write #1, "3.0", zRPM
    Write #1, gc_Mfg1.Value, gc_NArm1.Value, gc_TCWt1.Value, gc_RingHt1.Value, gc_ArmDepth1.Value
    Write #1, gc_Mfg2.Value, gc_NArm2.Value, gc_TCWt2.Value, gc_RingHt2.Value, gc_ArmDepth2.Value
    
    Write #1, gc_Static.Value
    Write #1, gc_NSpring.Value, gc_BasePr.Value, gc_SRate.Value, gc_Turns.Value, gc_ThrdpI.Value, gc_dRnHt.Value
    
    Write #1, gc_dRPM1.Value, gc_dRPM2.Value, gc_dRPM3.Value
    
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


Private Sub sspStatic_Click()
    MsgBox "The Static plate force is always constant with RPM.", vbInformation, "Clutch Plate Force"
End Sub

Private Sub sspTotal_Click()
    MsgBox "The Total plate force is the sum of the Static and Centrifugal forces.  The Centrifugal plate force always increases at higher RPM.", vbInformation, "Clutch Plate Force"
End Sub

Private Sub Label1_MouseDown(Index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    If Index = 4 Then
        If Button = 2 Then frmMatch.Show vbModal
        SetLabels
    End If
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
                    SetDefaults gc_Mfg1.Value
                    gc_Static.IsCalc = True
                    DoEvents
                    DoSetSave = True
                End If
            End If
            
            SetIsGlide
            SetClutchStrings
            SetStatic
            SetRingHt
            SetArmDepth
            
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
            
            ClutchCalc
            SetLine
            CalcDetails
            
            'this code resets saved graphs to prevent certain clutch comparisons:
            'currently prevents only car and bike comparisons (see Pat Hale rem above)
            If DoSetSave Then
                SetSave 1
                Graph1
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
        SetLine
        CalcDetails
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
        SetLine
        CalcDetails
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
        SetLine
        CalcDetails
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
            MsgBox "Changing the clutch ring height may require a change to the static plate force.  Use the clutch spring data to determine the effect of changing the clutch ring height.", vbInformation, "Warning: Clutch Ring Height Changed!"
        End If
        
        ClutchCalc
        SetLine
        CalcDetails
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
            MsgBox "Changing the clutch arm depth may require a change to the static plate force.  Use the cltuch spring data to determine the effect of changing the arm depth.", vbInformation, "Warning: Arm Depth Changed!"
        End If
        
        ClutchCalc
        SetLine
        CalcDetails
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
                    SetDefaults gc_Mfg2.Value
                    gc_Static.IsCalc = True
                    DoEvents
                    DoSetSave = True
                End If
            End If
            
            SetIsGlide
            SetClutchStrings
            SetStatic
            SetRingHt
            SetArmDepth
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
            
            ClutchCalc
            SetLine
            CalcDetails
            
            'this code resets saved graphs to prevent certain clutch comparisons:
            'currently prevents only car and bike comparisons (see Pat Hale rem above)
            If DoSetSave Then
                SetSave 1
                Graph1
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
        SetLine
        CalcDetails
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
            SetLine
            CalcDetails
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
            SetLine
            CalcDetails
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
                MsgBox "Changing the clutch ring height may require a change to the static plate force.  Use the clutch spring data to determine the effect of changing the clutch ring height.", vbInformation, "Warning: Clutch Ring Height Changed!"
            End If
            
            ClutchCalc
            SetLine
            CalcDetails
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
                MsgBox "Changing the clutch arm depth may require a change to the static plate force.  Use the clutch spring data to determine the effect of changing the arm depth.", vbInformation, "Warning: Arm Depth Changed!"
            End If
            
            ClutchCalc
            SetLine
            CalcDetails
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
        gc_Turns.Value = CalcTurns
        
        ClutchCalc
        SetLine
        CalcDetails
    End If
End Sub

Private Sub txtStatic_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_Static
End Sub


Private Sub txtNSpring_GotFocus()
    setpanels Me, PNL_SAVE, gc_NSpring
End Sub

Private Sub txtNSpring_KeyPress(KeyAscii As Integer)
    gc_NSpring.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtNSpring_Check
End Sub

Private Sub txtNSpring_LostFocus()
    gc_NSpring.Value = val(txtNSpring.Text)
    txtNSpring_Check
End Sub

Private Sub txtNSpring_Check()
    If gc_NSpring.IsChanged Then
        gc_BasePr.Value = Round(gc_NSpring.Value * gc_SBasePr.Value, 1)
        gc_SRate.Value = Round(gc_NSpring.Value * gc_SSRate.Value, 1)
        
        gc_Static.Value = Calclbs()
        
        ClutchCalc
        SetLine
        CalcDetails
    End If
End Sub

Private Sub txtNSpring_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_NSpring
End Sub


Private Sub txtSBasePr_GotFocus()
    setpanels Me, PNL_SAVE, gc_SBasePr
End Sub

Private Sub txtSBasePr_KeyPress(KeyAscii As Integer)
    gc_SBasePr.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtSBasePr_Check
End Sub

Private Sub txtSBasePr_LostFocus()
    gc_SBasePr.Value = val(txtSBasePr.Text)
    txtSBasePr_Check
End Sub

Private Sub txtSBasePr_Check()
    If gc_SBasePr.IsChanged Then
        gc_BasePr.Value = Round(gc_NSpring.Value * gc_SBasePr.Value, 1)
        
        gc_Static.Value = Calclbs()
        
        ClutchCalc
        SetLine
        CalcDetails
    End If
End Sub

Private Sub txtSBasePr_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_SBasePr
End Sub


Private Sub txtBasePr_GotFocus()
    setpanels Me, PNL_SAVE, gc_BasePr
End Sub

Private Sub txtBasePr_KeyPress(KeyAscii As Integer)
    gc_BasePr.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtBasePr_Check
End Sub

Private Sub txtBasePr_LostFocus()
    gc_BasePr.Value = val(txtBasePr.Text)
    txtBasePr_Check
End Sub

Private Sub txtBasePr_Check()
    If gc_BasePr.IsChanged Then
        If gc_NSpring.Value > 0 Then
            gc_SBasePr.Value = Round(gc_BasePr.Value / gc_NSpring.Value, 0.1)
        End If
        
        gc_Static.Value = Calclbs()
        
        ClutchCalc
        SetLine
        CalcDetails
    End If
End Sub

Private Sub txtBasePr_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_BasePr
End Sub


Private Sub txtSSRate_GotFocus()
    setpanels Me, PNL_SAVE, gc_SSRate
End Sub

Private Sub txtSSRate_KeyPress(KeyAscii As Integer)
    gc_SSRate.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtSSRate_Check
End Sub

Private Sub txtSSRate_LostFocus()
    gc_SSRate.Value = val(txtSSRate.Text)
    txtSSRate_Check
End Sub

Private Sub txtSSRate_Check()
    If gc_SSRate.IsChanged Then
        gc_SRate.Value = Round(gc_NSpring.Value * gc_SSRate.Value, 1)
        
        gc_Static.Value = Calclbs()
        
        ClutchCalc
        SetLine
        CalcDetails
    End If
End Sub

Private Sub txtSSRate_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_SSRate
End Sub


Private Sub txtSRate_GotFocus()
    setpanels Me, PNL_SAVE, gc_SRate
End Sub

Private Sub txtSRate_KeyPress(KeyAscii As Integer)
    gc_SRate.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtSRate_Check
End Sub

Private Sub txtSRate_LostFocus()
    gc_SRate.Value = val(txtSRate.Text)
    txtSRate_Check
End Sub

Private Sub txtSRate_Check()
    If gc_SRate.IsChanged Then
        If gc_NSpring.Value > 0 Then
            gc_SSRate.Value = Round(gc_SRate.Value / gc_NSpring.Value, 0.1)
        End If
        
        gc_Static.Value = Calclbs()
        
        ClutchCalc
        SetLine
        CalcDetails
    End If
End Sub

Private Sub txtSRate_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_SRate
End Sub


Private Sub txtTurns_GotFocus()
    setpanels Me, PNL_SAVE, gc_Turns
End Sub

Private Sub txtTurns_KeyPress(KeyAscii As Integer)
    gc_Turns.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtTurns_Check
End Sub

Private Sub txtTurns_LostFocus()
    gc_Turns.Value = val(txtTurns.Text)
    txtTurns_Check
End Sub

Private Sub txtTurns_Check()
    If gc_Turns.IsChanged Then
        gc_Static.Value = Calclbs()
        
        ClutchCalc
        SetLine
        CalcDetails
    End If
End Sub

Private Sub txtTurns_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_Turns
End Sub


Private Sub txtThrdpI_GotFocus()
    setpanels Me, PNL_SAVE, gc_ThrdpI
End Sub

Private Sub txtThrdpI_KeyPress(KeyAscii As Integer)
    gc_ThrdpI.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtThrdpI_Check
End Sub

Private Sub txtThrdpI_LostFocus()
    gc_ThrdpI.Value = val(txtThrdpI.Text)
    txtThrdpI_Check
End Sub

Private Sub txtThrdpI_Check()
    If gc_ThrdpI.IsChanged Then
        gc_Static.Value = Calclbs()
        
        ClutchCalc
        SetLine
        CalcDetails
    End If
End Sub

Private Sub txtThrdpI_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_ThrdpI
End Sub


Private Sub txtdRnHt_GotFocus()
    setpanels Me, PNL_SAVE, gc_dRnHt
End Sub

Private Sub txtdRnHt_KeyPress(KeyAscii As Integer)
    gc_dRnHt.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtdRnHt_Check
End Sub

Private Sub txtdRnHt_LostFocus()
    gc_dRnHt.Value = val(txtdRnHt.Text)
    txtdRnHt_Check
End Sub

Private Sub txtdRnHt_Check()
    If gc_dRnHt.IsChanged Then
        gc_Static.Value = Calclbs()
        
        ClutchCalc
        SetLine
        CalcDetails
    End If
End Sub

Private Sub txtdRnHt_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_dRnHt
End Sub


Private Sub txtdRPM1_GotFocus()
    setpanels Me, PNL_SAVE, gc_dRPM1
End Sub

Private Sub txtdRPM1_KeyPress(KeyAscii As Integer)
    gc_dRPM1.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtdRPM1_Check
End Sub

Private Sub txtdRPM1_LostFocus()
    gc_dRPM1.Value = val(txtdRPM1.Text)
    txtdRPM1_Check
End Sub

Private Sub txtdRPM1_Check()
    If gc_dRPM1.IsChanged Then
        If gc_dRPM1.Value > gc_dRPM2.Value Then gc_dRPM1.Value = gc_dRPM2.Value
        
        CalcDetails
    End If
End Sub

Private Sub txtdRPM1_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_dRPM1
End Sub


Private Sub txtdRPM2_GotFocus()
    setpanels Me, PNL_SAVE, gc_dRPM2
End Sub

Private Sub txtdRPM2_KeyPress(KeyAscii As Integer)
    gc_dRPM2.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtdRPM2_Check
End Sub

Private Sub txtdRPM2_LostFocus()
    gc_dRPM2.Value = val(txtdRPM2.Text)
    txtdRPM2_Check
End Sub

Private Sub txtdRPM2_Check()
    If gc_dRPM2.IsChanged Then
        If gc_dRPM2.Value < gc_dRPM1.Value Then gc_dRPM2.Value = gc_dRPM1.Value
        If gc_dRPM2.Value > gc_dRPM3.Value Then gc_dRPM2.Value = gc_dRPM3.Value
        
        CalcDetails
    End If
End Sub

Private Sub txtdRPM2_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_dRPM2
End Sub


Private Sub txtdRPM3_GotFocus()
    setpanels Me, PNL_SAVE, gc_dRPM3
End Sub

Private Sub txtdRPM3_KeyPress(KeyAscii As Integer)
    gc_dRPM3.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtdRPM3_Check
End Sub

Private Sub txtdRPM3_LostFocus()
    gc_dRPM3.Value = val(txtdRPM3.Text)
    txtdRPM3_Check
End Sub

Private Sub txtdRPM3_Check()
    If gc_dRPM3.IsChanged Then
        If gc_dRPM3.Value < gc_dRPM2.Value Then gc_dRPM3.Value = gc_dRPM2.Value
        
        CalcRPMs
        ClutchCalc
        SetLine
        CalcDetails
    End If
End Sub

Private Sub txtdRPM3_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_dRPM3
End Sub


Private Sub SetDefaults(mfg As Single)
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
    gc_RingHt1.IsCalc = True:       gc_RingHt2.IsCalc = True
    gc_ArmDepth1.IsCalc = True:     gc_ArmDepth2.IsCalc = True
    gc_Static.IsCalc = True
    gc_SBasePr.IsCalc = True:       gc_BasePr.IsCalc = True
    gc_SSRate.IsCalc = True:        gc_SRate.IsCalc = True
    gc_ThrdpI.IsCalc = True
    
    gc_Mfg1.Value = mfg
    gc_RingHt1.Value = AData(gc_Mfg1.Value, 6)
    gc_ArmDepth1.Value = AData(gc_Mfg1.Value, 7)
    
    gc_Mfg2.Value = 0:              gc_NArm2.Value = 0
    gc_TCWt2.Value = 0:             gc_RingHt2.Value = 0
    gc_ArmDepth2.Value = 0
    
    gc_dRnHt.Value = 0
    
    If Not isBike Then  'car clutches
        gc_NArm1.Value = 6:         gc_TCWt1.Value = 48
        gc_Static.Value = 480:      gc_NSpring.Value = 6
        gc_BasePr.Value = 120:      gc_SRate.Value = 180
        
        gc_Turns.Value = 2
        gc_ThrdpI.Value = 16:       gc_ThrdpI.UOM = UOM_NORMAL
        
        gc_dRPM1.Value = 6500:  gc_dRPM2.Value = 8000:  gc_dRPM3.Value = 9000
        
    Else        'motorcycle clutches
        gc_NArm1.Value = 3:         gc_TCWt1.Value = 30
        gc_Static.Value = 190:      gc_NSpring.Value = 6
        gc_BasePr.Value = 180:      gc_SRate.Value = 180
        
        gc_ThrdpI.Value = 0.05:     gc_ThrdpI.UOM = UOM_ALTERNATE
        
        gc_dRPM1.Value = 6000:  gc_dRPM2.Value = 7500:  gc_dRPM3.Value = 8500
    End If
    
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
    
    CalcRPMs
    
    FileName = "(Untitled)"
    Me.caption = App.Title & " - " & FileName
    
    txtTCWt1.SetFocus
    SelTextBoxText txtTCWt1
    setpanels Me, PNL_SAVE, gc_TCWt1
End Sub

Private Sub LoadFromSave(fn As String)
Dim VER As String
Dim ATYPE As Integer, NARM As Integer, TMCW As Single, RNGHT As Single, ADPTH As Single
Dim STLBF As Single
Dim NSPRNG As Integer, BASEPR As Single, SRATE As Single, turns As Single, THRDPI As Single, drnht As Single
Dim RPM1 As Single, RPM2 As Single, RPM3 As Single

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
    gc_SBasePr.IsCalc = True:       gc_BasePr.IsCalc = True
    gc_SSRate.IsCalc = True:        gc_SRate.IsCalc = True

    Open fn For Input As #1
    Input #1, VER, zRPM
    Input #1, ATYPE, NARM, TMCW, RNGHT, ADPTH
        With gc_Mfg1
            .Value = ATYPE
            If .IsError And .Value = .MaxVal Then .Value = .MaxVal - 1
        End With
        gc_NArm1.Value = NARM:      gc_TCWt1.Value = TMCW
        gc_RingHt1.Value = RNGHT:   gc_ArmDepth1.Value = ADPTH
    
    Input #1, ATYPE, NARM, TMCW, RNGHT, ADPTH
        With gc_Mfg2
            .Value = ATYPE
            If .IsError And .Value = .MaxVal Then .Value = .MaxVal - 1
        End With
        gc_NArm2.Value = NARM:      gc_TCWt2.Value = TMCW
        gc_RingHt2.Value = RNGHT:   gc_ArmDepth2.Value = ADPTH
    
    Input #1, STLBF
        gc_Static.Value = STLBF
    
    Input #1, NSPRNG, BASEPR, SRATE, turns, THRDPI, drnht
        gc_NSpring.Value = NSPRNG:  gc_BasePr.Value = BASEPR
        gc_SRate.Value = SRATE:     gc_Turns.Value = turns
        gc_ThrdpI.Value = THRDPI:   gc_dRnHt.Value = drnht
    
    Input #1, RPM1, RPM2, RPM3
        gc_dRPM1.Value = RPM1:      gc_dRPM2.Value = RPM2:      gc_dRPM3.Value = RPM3
    
    Input #1, AData(NARMD, 1), AData(NARMD, 2), AData(NARMD, 3), AData(NARMD, 4), AData(NARMD, 5), AData(NARMD, 6)
    Input #1, AData(NARMD, 7), AData(NARMD, 8), AData(NARMD, 9), AData(NARMD, 10), AData(NARMD, 11)
     
CloseRead:
    Close #1
    
    On Error GoTo ReadError
    
    txtMfg1.Text = AName(gc_Mfg1.Value):    Mfg1SaveText = Left(txtMfg1.Text, 3)
    txtMfg2.Text = AName(gc_Mfg2.Value):    Mfg2SaveText = Left(txtMfg2.Text, 3)
    
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
    
    CalcRPMs
    
    SetIsBike
    SetIsGlide
    SetClutchStrings
    
    SetTCWt
    SetRingHt
    SetArmDepth
    SetStatic
    
    SetSave 0
    ClutchCalc
    SetSave 1
    CalcDetails
    Graph1
    SetLine
    
    FileName = fn
    Me.caption = App.Title & " - " & NameOnly(FileName)
    LastFile = FileName
    
    txtTCWt1.SetFocus
    SelTextBoxText txtTCWt1
    setpanels Me, PNL_SAVE, gc_TCWt1
    
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

Private Sub CalcRPMs()
Dim i As Integer
    For i = 1 To NTQ
        RPM(i) = gc_dRPM3.Value - (NTQ - i) * 250
    Next
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

Public Sub SetSpringStrings()
    With frmClutch  'this is in frmSpring in CLUTCH Pro
        .lbl(6).Visible = True: .txtSBasePr.Visible = True: .txtBasePr.Visible = True
        .lbl(4).Top = 1245:     .txtSSRate.Top = 1200:      .txtSRate.Top = 1200
        .lbl(0).Top = 1545:     .txtTurns.Top = 1500
            
        If Not isBike Then
            '.lbl(0).Visible = True   'this causes error in VB environment only!  OK compiled!
            .txtTurns.Visible = True
            
            gc_SSRate.UOM = UOM_NORMAL:     gc_SRate.UOM = UOM_NORMAL
            
            gc_ThrdpI.UOM = UOM_NORMAL
            gc_ThrdpI.StatusMsg = "The thread pitch on the static spring adjuster."
            .txtThrdpI.Text = gc_ThrdpI.Formatted
            
            .lbl(1).Top = 1845:             .txtThrdpI.Top = 1800
            .lbl(5).Visible = True:         .txtdRnHt.Visible = True
            .lbl(5).Top = 2145:             .txtdRnHt.Top = 2100
            .Frame6.Height = 2475
        
            If isGlide Then
                .lbl(6).Visible = False:    .txtSBasePr.Visible = False:    .txtBasePr.Visible = False
                .lbl(4).Top = 945:          .txtSSRate.Top = 900:           .txtSRate.Top = 900
                .lbl(0).Top = 1245:         .txtTurns.Top = 1200
                .lbl(1).Top = 1545:         .txtThrdpI.Top = 1500
                .lbl(5).Visible = False:    .txtdRnHt.Visible = False
                .Frame6.Height = 1875
            End If
        Else
            '.lbl(0).Visible = False  'this causes error in VB environment only!  OK compiled!
            .txtTurns.Visible = False
            
            gc_SSRate.UOM = UOM_ALTERNATE:  gc_SRate.UOM = UOM_ALTERNATE
            
            gc_ThrdpI.UOM = UOM_ALTERNATE
            gc_ThrdpI.StatusMsg = "The thickness of the added spring shims used beyond the base shims."
            .txtThrdpI.Text = gc_ThrdpI.Formatted
            
            .lbl(1).Top = 1545:         .txtThrdpI.Top = 1500
            .lbl(5).Visible = True:     .txtdRnHt.Visible = True
            .lbl(5).Top = 1845:         .txtdRnHt.Top = 1800
            .Frame6.Height = 2175
        End If
    End With
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
