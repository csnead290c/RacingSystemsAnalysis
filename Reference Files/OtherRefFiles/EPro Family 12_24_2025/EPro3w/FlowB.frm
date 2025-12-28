VERSION 5.00
Object = "{827E9F53-96A4-11CF-823E-000021570103}#1.0#0"; "GRAPHS32.OCX"
Begin VB.Form frmFlowB 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Intake Port Flowbench Data @"
   ClientHeight    =   7155
   ClientLeft      =   45
   ClientTop       =   435
   ClientWidth     =   11010
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   7155
   ScaleWidth      =   11010
   StartUpPosition =   2  'CenterScreen
   Begin VB.Frame Frame3 
      Caption         =   "Intake Flow && Flow Velocity Index vs. Lift"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   7065
      Left            =   4215
      TabIndex        =   32
      Top             =   30
      Width           =   6750
      Begin GraphsLib.Graph gphFlowB 
         Height          =   6765
         Left            =   30
         TabIndex        =   81
         TabStop         =   0   'False
         Top             =   255
         Width           =   6675
         _Version        =   327680
         _ExtentX        =   11774
         _ExtentY        =   11933
         _StockProps     =   96
         BorderStyle     =   1
         AutoInc         =   0
         Background      =   "15~-1~-1~-1~-1~-1~-1"
         ColorData       =   "9"
         GraphStyle      =   4
         GraphType       =   6
         GridLineStyle   =   2
         GridStyle       =   3
         NumPoints       =   11
         OverlayColor    =   "12"
         OverlayGraph    =   2
         OverlayGraphStyle=   4
         OverlayPattern  =   "3"
         OverlaySymbol   =   "5"
         XAxisPos        =   2
         XAxisStyle      =   2
         YAxisPos        =   "1~2"
         YAxisStyle      =   "2~2"
         OverlayTrendSets=   "0"
         TrendSets       =   "0"
      End
   End
   Begin VB.Frame Frame2 
      Caption         =   "Flow Bench Data"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   4110
      Left            =   60
      TabIndex        =   31
      Top             =   2460
      Width           =   4110
      Begin VB.TextBox txtFlowVal 
         Alignment       =   1  'Right Justify
         BackColor       =   &H8000000F&
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
         Height          =   285
         Left            =   720
         Locked          =   -1  'True
         TabIndex        =   82
         TabStop         =   0   'False
         Text            =   "flow"
         Top             =   3735
         Width           =   600
      End
      Begin VB.TextBox txtFVIndex 
         Alignment       =   1  'Right Justify
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
         Height          =   285
         Left            =   3420
         TabIndex        =   29
         Text            =   "fvi"
         Top             =   3735
         Width           =   600
      End
      Begin VB.TextBox txtFlowFlux 
         Alignment       =   1  'Right Justify
         BackColor       =   &H8000000F&
         Height          =   285
         Left            =   2730
         TabIndex        =   28
         Text            =   "flux"
         Top             =   3735
         Width           =   600
      End
      Begin VB.TextBox txtFlowVel 
         Alignment       =   1  'Right Justify
         BackColor       =   &H8000000F&
         Height          =   285
         Left            =   2040
         TabIndex        =   27
         Text            =   "vel"
         Top             =   3735
         Width           =   600
      End
      Begin VB.TextBox txtCSArea 
         Alignment       =   1  'Right Justify
         Height          =   285
         Left            =   1350
         TabIndex        =   26
         Text            =   "area"
         Top             =   3735
         Width           =   600
      End
      Begin VB.TextBox txtValveLift 
         Height          =   285
         Left            =   90
         TabIndex        =   25
         Text            =   "maxl"
         Top             =   3735
         Width           =   600
      End
      Begin VB.TextBox txtIntFlow 
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
         Height          =   285
         Index           =   9
         Left            =   720
         TabIndex        =   24
         Text            =   "flow9"
         Top             =   3090
         Width           =   600
      End
      Begin VB.TextBox txtIntFlow 
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
         Height          =   285
         Index           =   8
         Left            =   720
         TabIndex        =   22
         Text            =   "flow8"
         Top             =   2820
         Width           =   600
      End
      Begin VB.TextBox txtIntFlow 
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
         Height          =   285
         Index           =   7
         Left            =   720
         TabIndex        =   20
         Text            =   "flow7"
         Top             =   2550
         Width           =   600
      End
      Begin VB.TextBox txtIntFlow 
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
         Height          =   285
         Index           =   6
         Left            =   720
         TabIndex        =   18
         Text            =   "flow6"
         Top             =   2280
         Width           =   600
      End
      Begin VB.TextBox txtIntFlow 
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
         Height          =   285
         Index           =   5
         Left            =   720
         TabIndex        =   16
         Text            =   "flow5"
         Top             =   2010
         Width           =   600
      End
      Begin VB.TextBox txtIntFlow 
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
         Height          =   285
         Index           =   4
         Left            =   720
         TabIndex        =   14
         Text            =   "flow4"
         Top             =   1740
         Width           =   600
      End
      Begin VB.TextBox txtIntFlow 
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
         Height          =   285
         Index           =   3
         Left            =   720
         TabIndex        =   12
         Text            =   "flow3"
         Top             =   1470
         Width           =   600
      End
      Begin VB.TextBox txtIntFlow 
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
         Height          =   285
         Index           =   2
         Left            =   720
         TabIndex        =   10
         Text            =   "flow2"
         Top             =   1200
         Width           =   600
      End
      Begin VB.TextBox txtIntFlow 
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
         Height          =   285
         Index           =   1
         Left            =   720
         TabIndex        =   8
         Text            =   "flow1"
         Top             =   930
         Width           =   600
      End
      Begin VB.TextBox txtIntFlow 
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
         Height          =   285
         Index           =   0
         Left            =   720
         TabIndex        =   6
         Text            =   "flow0"
         Top             =   660
         Width           =   600
      End
      Begin VB.TextBox txtIntLift 
         Height          =   285
         Index           =   9
         Left            =   90
         TabIndex        =   23
         Text            =   "lift9"
         Top             =   3090
         Width           =   600
      End
      Begin VB.TextBox txtIntLift 
         Height          =   285
         Index           =   8
         Left            =   90
         TabIndex        =   21
         Text            =   "lift8"
         Top             =   2820
         Width           =   600
      End
      Begin VB.TextBox txtIntLift 
         Height          =   285
         Index           =   7
         Left            =   90
         TabIndex        =   19
         Text            =   "lift7"
         Top             =   2550
         Width           =   600
      End
      Begin VB.TextBox txtIntLift 
         Height          =   285
         Index           =   6
         Left            =   90
         TabIndex        =   17
         Text            =   "lift6"
         Top             =   2280
         Width           =   600
      End
      Begin VB.TextBox txtIntLift 
         Height          =   285
         Index           =   5
         Left            =   90
         TabIndex        =   15
         Text            =   "lift5"
         Top             =   2010
         Width           =   600
      End
      Begin VB.TextBox txtIntLift 
         Height          =   285
         Index           =   4
         Left            =   90
         TabIndex        =   13
         Text            =   "lift4"
         Top             =   1740
         Width           =   600
      End
      Begin VB.TextBox txtIntLift 
         Height          =   285
         Index           =   3
         Left            =   90
         TabIndex        =   11
         Text            =   "lift3"
         Top             =   1470
         Width           =   600
      End
      Begin VB.TextBox txtIntLift 
         Height          =   285
         Index           =   2
         Left            =   90
         TabIndex        =   9
         Text            =   "lift2"
         Top             =   1200
         Width           =   600
      End
      Begin VB.TextBox txtIntLift 
         Height          =   285
         Index           =   1
         Left            =   90
         TabIndex        =   7
         Text            =   "lift1"
         Top             =   930
         Width           =   600
      End
      Begin VB.TextBox txtIntLift 
         Height          =   285
         Index           =   0
         Left            =   90
         TabIndex        =   5
         Text            =   "lift0"
         Top             =   660
         Width           =   600
      End
      Begin VB.Label Label5 
         Alignment       =   2  'Center
         Caption         =   "calculated values @ input maximum intake valve lift:"
         Height          =   195
         Left            =   120
         TabIndex        =   80
         Top             =   3495
         Width           =   3870
      End
      Begin VB.Label lblBot 
         Caption         =   "   inch      CFM    sq inch     ft/sec  CFM/sq in  Index-%"
         Height          =   180
         Left            =   210
         TabIndex        =   78
         Top             =   420
         Width           =   3870
      End
      Begin VB.Label lblFVI 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "fvi9"
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
         Height          =   255
         Index           =   9
         Left            =   3420
         TabIndex        =   77
         Top             =   3105
         Width           =   600
      End
      Begin VB.Label lblFVI 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "fvi8"
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
         Height          =   255
         Index           =   8
         Left            =   3420
         TabIndex        =   76
         Top             =   2835
         Width           =   600
      End
      Begin VB.Label lblFVI 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "fvi7"
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
         Height          =   255
         Index           =   7
         Left            =   3420
         TabIndex        =   75
         Top             =   2565
         Width           =   600
      End
      Begin VB.Label lblFVI 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "fvi6"
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
         Height          =   255
         Index           =   6
         Left            =   3420
         TabIndex        =   74
         Top             =   2295
         Width           =   600
      End
      Begin VB.Label lblFVI 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "fvi5"
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
         Height          =   255
         Index           =   5
         Left            =   3420
         TabIndex        =   73
         Top             =   2025
         Width           =   600
      End
      Begin VB.Label lblFVI 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "fvi4"
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
         Height          =   255
         Index           =   4
         Left            =   3420
         TabIndex        =   72
         Top             =   1755
         Width           =   600
      End
      Begin VB.Label lblFVI 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "fvi3"
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
         Height          =   255
         Index           =   3
         Left            =   3420
         TabIndex        =   71
         Top             =   1485
         Width           =   600
      End
      Begin VB.Label lblFVI 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "fvi2"
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
         Height          =   255
         Index           =   2
         Left            =   3420
         TabIndex        =   70
         Top             =   1215
         Width           =   600
      End
      Begin VB.Label lblFVI 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "fvi1"
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
         Height          =   255
         Index           =   1
         Left            =   3420
         TabIndex        =   69
         Top             =   945
         Width           =   600
      End
      Begin VB.Label lblFVI 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "fvi0"
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
         Height          =   255
         Index           =   0
         Left            =   3420
         TabIndex        =   68
         Top             =   675
         Width           =   600
      End
      Begin VB.Label lblFlux 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "flux9"
         Height          =   255
         Index           =   9
         Left            =   2730
         TabIndex        =   67
         Top             =   3105
         Width           =   600
      End
      Begin VB.Label lblFlux 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "flux8"
         Height          =   255
         Index           =   8
         Left            =   2730
         TabIndex        =   66
         Top             =   2835
         Width           =   600
      End
      Begin VB.Label lblFlux 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "flux7"
         Height          =   255
         Index           =   7
         Left            =   2730
         TabIndex        =   65
         Top             =   2565
         Width           =   600
      End
      Begin VB.Label lblFlux 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "flux6"
         Height          =   255
         Index           =   6
         Left            =   2730
         TabIndex        =   64
         Top             =   2295
         Width           =   600
      End
      Begin VB.Label lblFlux 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "flux5"
         Height          =   255
         Index           =   5
         Left            =   2730
         TabIndex        =   63
         Top             =   2025
         Width           =   600
      End
      Begin VB.Label lblFlux 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "flux4"
         Height          =   255
         Index           =   4
         Left            =   2730
         TabIndex        =   62
         Top             =   1755
         Width           =   600
      End
      Begin VB.Label lblFlux 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "flux3"
         Height          =   255
         Index           =   3
         Left            =   2730
         TabIndex        =   61
         Top             =   1485
         Width           =   600
      End
      Begin VB.Label lblFlux 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "flux2"
         Height          =   255
         Index           =   2
         Left            =   2730
         TabIndex        =   60
         Top             =   1215
         Width           =   600
      End
      Begin VB.Label lblFlux 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "flux1"
         Height          =   255
         Index           =   1
         Left            =   2730
         TabIndex        =   59
         Top             =   945
         Width           =   600
      End
      Begin VB.Label lblFlux 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "flux0"
         Height          =   255
         Index           =   0
         Left            =   2730
         TabIndex        =   58
         Top             =   675
         Width           =   600
      End
      Begin VB.Label lblVel 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "vel9"
         Height          =   255
         Index           =   9
         Left            =   2040
         TabIndex        =   57
         Top             =   3105
         Width           =   600
      End
      Begin VB.Label lblVel 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "vel8"
         Height          =   255
         Index           =   8
         Left            =   2040
         TabIndex        =   56
         Top             =   2835
         Width           =   600
      End
      Begin VB.Label lblVel 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "vel7"
         Height          =   255
         Index           =   7
         Left            =   2040
         TabIndex        =   55
         Top             =   2565
         Width           =   600
      End
      Begin VB.Label lblVel 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "vel6"
         Height          =   255
         Index           =   6
         Left            =   2040
         TabIndex        =   54
         Top             =   2295
         Width           =   600
      End
      Begin VB.Label lblVel 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "vel5"
         Height          =   255
         Index           =   5
         Left            =   2040
         TabIndex        =   53
         Top             =   2025
         Width           =   600
      End
      Begin VB.Label lblVel 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "vel4"
         Height          =   255
         Index           =   4
         Left            =   2040
         TabIndex        =   52
         Top             =   1755
         Width           =   600
      End
      Begin VB.Label lblVel 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "vel3"
         Height          =   255
         Index           =   3
         Left            =   2040
         TabIndex        =   51
         Top             =   1485
         Width           =   600
      End
      Begin VB.Label lblVel 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "vel2"
         Height          =   255
         Index           =   2
         Left            =   2040
         TabIndex        =   50
         Top             =   1215
         Width           =   600
      End
      Begin VB.Label lblVel 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "vel1"
         Height          =   255
         Index           =   1
         Left            =   2040
         TabIndex        =   49
         Top             =   945
         Width           =   600
      End
      Begin VB.Label lblVel 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "vel0"
         Height          =   255
         Index           =   0
         Left            =   2040
         TabIndex        =   48
         Top             =   675
         Width           =   600
      End
      Begin VB.Label lblArea 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "area9"
         Height          =   255
         Index           =   9
         Left            =   1350
         TabIndex        =   47
         Top             =   3105
         Width           =   600
      End
      Begin VB.Label lblArea 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "area8"
         Height          =   255
         Index           =   8
         Left            =   1350
         TabIndex        =   46
         Top             =   2835
         Width           =   600
      End
      Begin VB.Label lblArea 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "area7"
         Height          =   255
         Index           =   7
         Left            =   1350
         TabIndex        =   45
         Top             =   2565
         Width           =   600
      End
      Begin VB.Label lblArea 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "area6"
         Height          =   255
         Index           =   6
         Left            =   1350
         TabIndex        =   44
         Top             =   2295
         Width           =   600
      End
      Begin VB.Label lblArea 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "area5"
         Height          =   255
         Index           =   5
         Left            =   1350
         TabIndex        =   43
         Top             =   2025
         Width           =   600
      End
      Begin VB.Label lblArea 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "area4"
         Height          =   255
         Index           =   4
         Left            =   1350
         TabIndex        =   42
         Top             =   1755
         Width           =   600
      End
      Begin VB.Label lblArea 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "area3"
         Height          =   255
         Index           =   3
         Left            =   1350
         TabIndex        =   41
         Top             =   1485
         Width           =   600
      End
      Begin VB.Label lblArea 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "area2"
         Height          =   255
         Index           =   2
         Left            =   1350
         TabIndex        =   40
         Top             =   1215
         Width           =   600
      End
      Begin VB.Label lblArea 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "area1"
         Height          =   255
         Index           =   1
         Left            =   1350
         TabIndex        =   39
         Top             =   945
         Width           =   600
      End
      Begin VB.Label lblArea 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "area0"
         Height          =   255
         Index           =   0
         Left            =   1350
         TabIndex        =   38
         Top             =   675
         Width           =   600
      End
      Begin VB.Line Line1 
         BorderColor     =   &H00000000&
         BorderStyle     =   3  'Dot
         X1              =   45
         X2              =   4050
         Y1              =   3450
         Y2              =   3450
      End
      Begin VB.Label lblTop 
         Caption         =   "     Lift      Flow      Area    Velocity  Flow Flux  Flow Vel"
         Height          =   180
         Left            =   210
         TabIndex        =   37
         Top             =   225
         Width           =   3870
      End
   End
   Begin VB.Frame Frame1 
      Caption         =   "Intake Valve Seat Throat Data"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   2400
      Left            =   255
      TabIndex        =   30
      Top             =   30
      Width           =   3750
      Begin VB.TextBox txtStemDia 
         Height          =   285
         Left            =   3045
         TabIndex        =   4
         Text            =   "vstmd"
         Top             =   2025
         Width           =   600
      End
      Begin VB.TextBox txtVSWidth 
         Height          =   330
         Left            =   3045
         TabIndex        =   3
         Text            =   "vswd"
         Top             =   1725
         Width           =   600
      End
      Begin VB.TextBox txtVSAngle 
         Height          =   330
         Left            =   3045
         TabIndex        =   2
         Text            =   "vsang"
         Top             =   1425
         Width           =   600
      End
      Begin VB.TextBox txtSeatPer 
         Height          =   285
         Left            =   3045
         TabIndex        =   1
         Text            =   "vsper"
         Top             =   1125
         Width           =   600
      End
      Begin VB.TextBox txtSeatDia 
         Height          =   285
         Left            =   3045
         TabIndex        =   0
         Text            =   "vsd"
         Top             =   825
         Width           =   600
      End
      Begin VB.Label Label7 
         Caption         =   "Valve Seat Width - inch"
         Height          =   240
         Left            =   135
         TabIndex        =   86
         Top             =   1770
         Width           =   2835
      End
      Begin VB.Label Label6 
         Caption         =   "Valve Seat Angle - degree"
         Height          =   240
         Left            =   135
         TabIndex        =   85
         Top             =   1470
         Width           =   2835
      End
      Begin VB.Label lblNIV 
         BorderStyle     =   1  'Fixed Single
         Caption         =   "niv"
         Height          =   255
         Left            =   3045
         TabIndex        =   84
         Top             =   255
         Width           =   600
      End
      Begin VB.Label Label0 
         Caption         =   "Number of Valves per Cylinder"
         Height          =   225
         Left            =   150
         TabIndex        =   83
         Top             =   285
         Width           =   2835
      End
      Begin VB.Label lblIVD 
         BorderStyle     =   1  'Fixed Single
         Caption         =   "vd"
         Height          =   255
         Left            =   3045
         TabIndex        =   79
         Top             =   540
         Width           =   600
      End
      Begin VB.Label Label4 
         Caption         =   "valve stem diameter"
         Height          =   255
         Left            =   150
         TabIndex        =   36
         Top             =   2070
         Width           =   2835
      End
      Begin VB.Label Label3 
         Caption         =   "Valve Seat Throat Percentage - %"
         Height          =   285
         Left            =   150
         TabIndex        =   35
         Top             =   1170
         Width           =   2835
      End
      Begin VB.Label Label2 
         Caption         =   "valve throat diameter"
         Height          =   285
         Left            =   150
         TabIndex        =   34
         Top             =   870
         Width           =   2835
      End
      Begin VB.Label Label1 
         Caption         =   "valve diameter"
         Height          =   225
         Left            =   150
         TabIndex        =   33
         Top             =   570
         Width           =   2835
      End
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00E0E0E0&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(2)"
      Height          =   240
      Index           =   2
      Left            =   3195
      TabIndex        =   89
      Top             =   6840
      Width           =   960
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00E0E0E0&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(1)"
      Height          =   240
      Index           =   1
      Left            =   3195
      TabIndex        =   88
      Top             =   6600
      Width           =   960
   End
   Begin VB.Label lblHELP 
      BackColor       =   &H00E0E0E0&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(0)"
      Height          =   480
      Index           =   0
      Left            =   60
      TabIndex        =   87
      Top             =   6600
      Width           =   3120
   End
End
Attribute VB_Name = "frmFlowB"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Public fc_Value As Object

Private Cancel As Boolean
Private LastRow As Integer
Private xlift(1 To 10) As Single, yflow(1 To 10) As Single, yfvi(1 To 10) As Single
Private FlowVal As Single
Private bFileDirty As Boolean

Private Sub Form_Load()
Dim i As Integer
Dim inc As Single
Dim lqd As Single
Dim coef As Single
Dim xlqd(1 To 17) As Single
Dim ycoef(1 To 17) As Single
Dim ivd As Single
Dim work As Single
    Me.caption = "Intake Port Flowbench Data @ " & gc_DeltaP.Formatted & " inches H2O Worksheet"
    'setpanels Me, PNL_SAVE, fc_Value
    SetHelp Me, HELP_SAVE, fc_Value
    
    'estimate flowbench data as required (old EPro v3.0 and v3.0.1 data files), or if
    'this is the first time opening from the BaseCase since it has no flowbench data.
    If gc_IntLift(0).Value = 0 Then
        'based on 1998 work for intake valve with 90% throat
        xlqd(1) = 0.05:     ycoef(1) = 1.145
        xlqd(2) = 0.075:    ycoef(2) = 1.11
        xlqd(3) = 0.1:      ycoef(3) = 1.069
        xlqd(4) = 0.125:    ycoef(4) = 1.028
        xlqd(5) = 0.15:     ycoef(5) = 0.958
        xlqd(6) = 0.175:    ycoef(6) = 0.905
        xlqd(7) = 0.2:      ycoef(7) = 0.866
        xlqd(8) = 0.225:    ycoef(8) = 0.855
        xlqd(9) = 0.25:     ycoef(9) = 0.895
        xlqd(10) = 0.275:   ycoef(10) = 0.934
        xlqd(11) = 0.3:     ycoef(11) = 0.954
        xlqd(12) = 0.325:   ycoef(12) = 0.962
        xlqd(13) = 0.35:    ycoef(13) = 0.966
        xlqd(14) = 0.375:   ycoef(14) = 0.969
        xlqd(15) = 0.4:     ycoef(15) = 0.97
        xlqd(16) = 0.425:   ycoef(16) = 0.971
        xlqd(17) = 0.45:    ycoef(17) = 0.971
        
        ivd = gc_ValveDia.Value:    If Not gc_ValveDia.Inches Then ivd = ivd / ZM
        inc = 0.1:                  If ivd < 1.35 Then inc = 0.05
        
        For i = 0 To 9
            work = (i + 1) * inc:   lqd = work / ivd
            
            If lqd <= 0.4 Then
                gc_IntLift(i).Value = Round(work, 0.01)
                
                Call TABY(xlqd(), ycoef(), 17, 2, lqd, coef)
                CalcWSCSArea work
                gc_IntFlow(i).Value = gc_WSCSArea.Value * coef * VSTD / 2.4
            Else
                gc_IntLift(i).Value = 0
                gc_IntFlow(i).Value = 0
            End If
        
            CalcFlowBench i
        Next
        
        With gc_ValveLift
            'make sure maximum intake valve lift has reasonable value (since no flowbench data)
            Select Case gc_CamType.Value    'same table as Recommendations
                Case 0:     work = 0.38
                Case 1:     work = 0.38
                Case 2:     work = 0.33
                Case 3:     work = 0.31
                Case 4:     work = 0.31
                Case 5:     work = 0.29
                Case Else:  work = 0.26
            End Select
            work = work - 0.07
            If .Value < work * ivd Then .Value = RoundUp(work * ivd, 0.05)
            
            'find the FlowVal corresponding to the maximum intake valve lift
            FindLastRow
            Call TABY(xlift(), yflow(), LastRow + 1, 1, .Value, FlowVal)
        End With
        
        'if the scaling is too large, increase the maximum intake valve lift
        work = gc_MaxInFlow.Value / FlowVal
        If work > 1.1 Then
            With gc_ValveLift
                .Value = RoundUp(work * .Value, 0.05)
                
                'make sure maximum intake valve lift has reasonable value
                Select Case gc_CamType.Value    'same table as Recommendations
                    Case 0:     work = 0.38
                    Case 1:     work = 0.38
                    Case 2:     work = 0.33
                    Case 3:     work = 0.31
                    Case 4:     work = 0.31
                    Case 5:     work = 0.29
                    Case Else:  work = 0.26
                End Select
                work = work + 0.01
                If .Value > work * ivd Then .Value = RoundDown(work * ivd, 0.05)
                Call TABY(xlift(), yflow(), LastRow + 1, 1, .Value, FlowVal)
            End With
        End If
        
        'scale the default flowbench data to match the input maximum intake flow value
        For i = 0 To 9
            With gc_IntFlow(i)
                .Value = .Value * gc_MaxInFlow.Value / FlowVal: .Value = val(.Formatted)
            End With
            CalcFlowBench i
        Next
    
        'make sure that LastRow FVIndex is not greater than MaxVal (since no flowbench data)
        If yfvi(LastRow + 1) > gc_FVIndex.MaxVal Then
            'calculate required cross-section area (larger)
            CalcWSCSArea gc_IntLift(LastRow).Value
            With gc_CSArea
                .IsCalc = True
                .Value = RoundUp(gc_WSCSArea.Value * yfvi(LastRow + 1) / gc_FVIndex.MaxVal, 0.001)
            End With
        
            'calculate new seat diameter to get the desired CSArea
            EstSeatDia
            SetVSWidth
        End If
    End If
    
    CalcSeatPer 'use data file seat diameter (or calc above) to calculate seat percentage
    
    'now calculate all the remaining flowbench parameters (for both cases)
    For i = 0 To 9:     CalcFlowBench i:    Next
    
    CheckFlow
    If Not Cancel Then
        FindLastRow
        Call TABY(xlift(), yflow(), LastRow + 1, 1, gc_ValveLift.Value, FlowVal)
        CalcCSArea
        CalcFlowStuff FlowVal
    End If
    
    LoadScreen
    bFileDirty = False
End Sub

Private Sub form_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_RESET, fc_Value
    SetHelp Me, HELP_RESET, fc_Value
End Sub


Private Sub pnlInput_Click(Index As Integer)
    txtSeatDia.SetFocus
End Sub

Private Sub txtFlowVal_DblClick()
    gc_MaxInFlow.Value = val(txtFlowVal.Text)
    CalcEngPerf
    frmENGINE.LoadScreen
    Unload Me
End Sub


Private Sub txtSeatDia_GotFocus()
    'setpanels Me, PNL_SAVE, gc_SeatDia
    SetHelp Me, HELP_SAVE, gc_SeatDia
End Sub

Private Sub txtSeatDia_KeyPress(KeyAscii As Integer)
    gc_SeatDia.TestNumericKeyPress KeyAscii, txtSeatDia
    If KeyAscii = vbKeyReturn Then
        txtSeatDia_LostFocus
        txtSeatDia.SelLength = Len(txtSeatDia.Text)
    End If
End Sub

Private Sub txtSeatDia_LostFocus()
Dim i As Integer
    With gc_SeatDia
        .Value = val(txtSeatDia.Text)
        
        If .IsChanged Then
            CalcSeatPer
            SetVSWidth
            TestFVIndex
            LoadScreen
            .IsChanged = False
            If .IsError Then txtSeatDia.SetFocus
        Else
            txtSeatDia.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtSeatDia_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_SeatDia
    SetHelp Me, HELP_SET, gc_SeatDia
End Sub


Private Sub txtSeatPer_GotFocus()
    'setpanels Me, PNL_SAVE, gc_SeatPer
    SetHelp Me, HELP_SAVE, gc_SeatPer
End Sub

Private Sub txtSeatPer_KeyPress(KeyAscii As Integer)
    gc_SeatPer.TestNumericKeyPress KeyAscii, txtSeatPer
    If KeyAscii = vbKeyReturn Then
        txtSeatPer_LostFocus
        txtSeatPer.SelLength = Len(txtSeatPer.Text)
    End If
End Sub

Private Sub txtSeatPer_LostFocus()
Dim i As Integer
    With gc_SeatPer
        .Value = val(txtSeatPer.Text)
        
        If .IsChanged Then
            CalcSeatDia
            SetVSWidth
            TestFVIndex
            LoadScreen
            .IsChanged = False
            If .IsError Then txtSeatPer.SetFocus
        Else
            txtSeatPer.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtSeatPer_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_SeatPer
    SetHelp Me, HELP_SET, gc_SeatPer
End Sub


Private Sub txtVSAngle_GotFocus()
    'setpanels Me, PNL_SAVE, gc_VSAngle
    SetHelp Me, HELP_SAVE, gc_VSAngle
End Sub

Private Sub txtVSAngle_KeyPress(KeyAscii As Integer)
    gc_VSAngle.TestNumericKeyPress KeyAscii, txtVSAngle
    If KeyAscii = vbKeyReturn Then
        txtVSAngle_LostFocus
        txtVSAngle.SelLength = Len(txtVSAngle.Text)
    End If
End Sub

Private Sub txtVSAngle_LostFocus()
Dim i As Integer
    With gc_VSAngle
        .Value = val(txtVSAngle.Text)
        
        If .IsChanged Then
            SetVSWidth
            TestFVIndex
            LoadScreen
            .IsChanged = False
            If .IsError Then txtVSAngle.SetFocus
        Else
            txtVSAngle.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtVSAngle_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_VSAngle
    SetHelp Me, HELP_SET, gc_VSAngle
End Sub


Private Sub txtVSWidth_GotFocus()
    'setpanels Me, PNL_SAVE, gc_VSWidth
    SetHelp Me, HELP_SAVE, gc_VSWidth
End Sub

Private Sub txtVSWidth_KeyPress(KeyAscii As Integer)
    gc_VSWidth.TestNumericKeyPress KeyAscii, txtVSWidth
    If KeyAscii = vbKeyReturn Then
        txtVSWidth_LostFocus
        txtVSWidth.SelLength = Len(txtVSWidth.Text)
    End If
End Sub

Private Sub txtVSWidth_LostFocus()
Dim i As Integer
    With gc_VSWidth
        .Value = val(txtVSWidth.Text)
        
        If .IsChanged Then
            TestFVIndex
            LoadScreen
            .IsChanged = False
            If .IsError Then txtVSWidth.SetFocus
        Else
            txtVSWidth.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtVSWidth_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_VSWidth
    SetHelp Me, HELP_SET, gc_VSWidth
End Sub


Private Sub txtStemDia_GotFocus()
    'setpanels Me, PNL_SAVE, gc_StemDia
    SetHelp Me, HELP_SAVE, gc_StemDia
End Sub

Private Sub txtStemDia_KeyPress(KeyAscii As Integer)
    gc_StemDia.TestNumericKeyPress KeyAscii, txtStemDia
    If KeyAscii = vbKeyReturn Then
        txtStemDia_LostFocus
        txtStemDia.SelLength = Len(txtStemDia.Text)
    End If
End Sub

Private Sub txtStemDia_LostFocus()
Dim i As Integer
    With gc_StemDia
        .Value = val(txtStemDia.Text)
        
        If .IsChanged Then
            TestFVIndex
            LoadScreen
            .IsChanged = False
            If .IsError Then txtStemDia.SetFocus
        Else
            txtStemDia.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtStemDia_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_StemDia
    SetHelp Me, HELP_SET, gc_StemDia
End Sub


Private Sub txtCSArea_GotFocus()
    'setpanels Me, PNL_SAVE, gc_CSArea
    SetHelp Me, HELP_SAVE, gc_CSArea
End Sub

Private Sub txtCSArea_KeyPress(KeyAscii As Integer)
    gc_CSArea.TestNumericKeyPress KeyAscii, txtCSArea
    If KeyAscii = vbKeyReturn Then
        txtCSArea_LostFocus
        txtCSArea.SelLength = Len(txtCSArea.Text)
    End If
End Sub

Private Sub txtCSArea_LostFocus()
Dim i As Integer
    With gc_CSArea
        .Value = val(txtCSArea.Text)
        
        If .IsChanged Then
            EstSeatDia
            CalcSeatPer
            SetVSWidth
            TestFVIndex
            LoadScreen
            .IsChanged = False
            If .IsError Then txtCSArea.SetFocus
        Else
            txtCSArea.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtCSArea_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_CSArea
    SetHelp Me, HELP_SET, gc_CSArea
End Sub


Private Sub TestFVIndex()
Dim i As Integer
Dim oldval As Single
Dim work As String
    'update the text boxes, labels and graph prior to the warning message display
    txtSeatDia.Text = gc_SeatDia.Formatted
    txtSeatPer.Text = gc_SeatPer.Formatted
    txtVSAngle.Text = gc_VSAngle.Formatted
    txtVSWidth.Text = gc_VSWidth.Formatted
    txtStemDia.Text = gc_StemDia.Formatted
    
    For i = 0 To 9:     CalcFlowBench i:    Next
    
    CalcCSArea
    CalcFlowStuff FlowVal
    txtCSArea.Text = gc_CSArea.Formatted
    txtFlowVel.Text = gc_FlowVel.Formatted
    txtFlowFlux.Text = gc_FlowFlux.Formatted
    txtFVIndex.Text = gc_FVIndex.Formatted
    
    Graph2
    
    With gc_CSArea
        oldval = .Value:    work = val(Format(oldval, .ValFmt))
        FindLastRow
        
        'test if the LastRow FVIndex is outside Min/Max limits
        If yfvi(LastRow + 1) > gc_FVIndex.MaxVal Then
            .Value = RoundUp(oldval * yfvi(LastRow + 1) / gc_FVIndex.MaxVal, 0.001)
            MsgBox "The calculated intake port flow velocity of " & lblVel(LastRow).caption & " ft/sec at " & txtIntLift(LastRow).Text & " inch lift is now too high based on the input valve seat throat area of " & work & " sq inch!" & Chr(13) & Chr(13) & "This engine design requires more intake valve seat throat area - at least " & .Formatted & " sq inch.  The Intake Port Flow Worksheet will now use a value of " & .Formatted & " sq inch instead of the input " & work & " sq inch.", 64, "Intake Port Flow Velocity Warning!"
        ElseIf yfvi(LastRow + 1) < gc_FVIndex.MinVal Then
            .Value = RoundDown(oldval * yfvi(LastRow + 1) / gc_FVIndex.MinVal, 0.001)
            MsgBox "The calculated intake port flow velocity of " & lblVel(LastRow).caption & " ft/sec at " & txtIntLift(LastRow).Text & " inch lift is now too low based on the input valve seat throat area of " & work & " sq inch!" & Chr(13) & Chr(13) & "This engine design requires less intake valve seat throat area - no more than " & .Formatted & " sq inch.  The Intake Port Flow Worksheet will now use a value of " & .Formatted & " sq inch instead of the input " & work & " sq inch.", 64, "Intake Port Flow Velocity Warning!"
        Else
            Exit Sub
        End If
    
        txtCSArea.Text = .Formatted
    End With
    
    EstSeatDia
    CalcSeatPer
    SetVSWidth
    For i = 0 To 9:     CalcFlowBench i:    Next
    CalcCSArea
    CalcFlowStuff FlowVal
End Sub


Private Sub txtIntLift_GotFocus(Index As Integer)
    'setpanels Me, PNL_SAVE, gc_IntLift(Index)
    SetHelp Me, HELP_SAVE, gc_IntLift(Index)
End Sub

Private Sub txtIntLift_KeyPress(Index As Integer, KeyAscii As Integer)
    gc_IntLift(Index).TestNumericKeyPress KeyAscii, txtIntLift(Index)
    If KeyAscii = vbKeyReturn Then
        txtIntLift_LostFocus Index
        txtIntLift(Index).SelLength = Len(txtIntLift(Index).Text)
    End If
End Sub

Private Sub txtIntLift_LostFocus(Index As Integer)
Dim i As Integer
Dim MsgCap As String
Dim MsgTxt As String
Dim vbReply As String
    'test for totally blank row
    If txtIntLift(Index).Text = "" And txtIntFlow(Index).Text = "" Then Exit Sub
    
    MsgCap = "Help: Flowbench Data"
    FindLastRow

    'check for a gap in the row
    If Index > LastRow + 1 Then
        MsgTxt = "Lift values must be entered in sequential order!  Blank rows are not allowed."
        MsgBox MsgTxt, vbExclamation, MsgCap
        gc_IntLift(Index).Value = 0:    txtIntLift(Index).Text = ""
        txtIntLift(LastRow + 1).SetFocus
        Exit Sub
    End If

    'check for 0 or blank to clear remaining rows
    If txtIntLift(Index).Text = "" Or val(txtIntLift(Index).Text) = 0 Then
        vbReply = MsgBox("You are about to permanently change the Flowbench Data.  Every Lift and Flow value from this Lift down will be left blank.  Are you sure you want to proceed?", 256 + vbExclamation + vbYesNo, MsgCap)
        If vbReply = vbYes Then
            For i = Index To 9
                gc_IntLift(i).Value = 0:    txtIntLift(i).Text = ""
                gc_IntFlow(i).Value = 0:    txtIntFlow(i).Text = ""
                lblArea(i).caption = "":    lblFlux(i).caption = ""
                lblVel(i).caption = "":     lblFVI(i).caption = ""
            Next
            FindLastRow
            Graph2
            txtIntLift(Index).SetFocus
        Else
            gc_IntLift(Index).Value = gc_IntLift(Index).Value
            txtIntLift(Index).Text = gc_IntLift(Index).Formatted
            txtIntLift(Index).SetFocus
        End If
        Exit Sub
    End If

    'check for smaller value than previous row
    If Index > 0 Then
        If val(txtIntLift(Index).Text) <= gc_IntLift(Index - 1).Value Then
            MsgTxt = "yes"
        End If
    End If
    
    'check for larger value than next row
    If Index < LastRow Then
        If val(txtIntLift(Index).Text) >= gc_IntLift(Index + 1).Value Then
            MsgTxt = "yes"
        End If
    End If
    
    If MsgTxt = "yes" Then
        If Index = 0 Then
            vbReply = MsgBox("Are you going to change all the Flowbench Data values?  Would you like the remaining Flowbench Data rows cleared?", 256 + vbExclamation + vbYesNo, MsgCap)
        Else
            vbReply = vbNo
        End If
        
        If vbReply = vbYes Then
            For i = 1 To 9
                gc_IntLift(i).Value = 0:    txtIntLift(i).Text = ""
                gc_IntFlow(i).Value = 0:    txtIntLift(i).Text = ""
                lblArea(i).caption = "":    lblFlux(i).caption = ""
                lblVel(i).caption = "":     lblFVI(i).caption = ""
            Next
            FindLastRow
            Graph2
            txtIntLift(Index).SetFocus
        Else
            MsgTxt = "Lift values must always be in ascending order!  This Lift value must be larger than the previous row and smaller than the next row."
            MsgBox MsgTxt, vbExclamation, MsgCap
            gc_IntLift(Index).Value = gc_IntLift(Index).Value
            txtIntLift(Index).Text = gc_IntLift(Index).Formatted
            txtIntLift(Index).SetFocus
            Exit Sub
        End If
    End If
    
    With gc_IntLift(Index)
        .Value = val(txtIntLift(Index).Text)
        
        If .IsChanged Then
            If gc_IntFlow(Index).Value > 0 Then
                CalcFlowBench Index
                CheckFlow
                If Not Cancel Then
                    FindLastRow
                    Call TABY(xlift(), yflow(), LastRow + 1, 1, gc_ValveLift.Value, FlowVal)
                    CalcFlowStuff FlowVal
                End If
            End If
            
            LoadScreen
            .IsChanged = False
            If .IsError Then txtIntLift(Index).SetFocus
        Else
            txtIntLift(Index).Text = .Formatted
        End If
    End With
End Sub

Private Sub txtIntLift_MouseMove(Index As Integer, Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_IntLift(Index)
    SetHelp Me, HELP_SET, gc_IntLift(Index)
End Sub


Private Sub txtIntFlow_GotFocus(Index As Integer)
    'setpanels Me, PNL_SAVE, gc_IntFlow(Index)
    SetHelp Me, HELP_SAVE, gc_IntFlow(Index)
End Sub

Private Sub txtIntFlow_KeyPress(Index As Integer, KeyAscii As Integer)
    gc_IntFlow(Index).TestNumericKeyPress KeyAscii, txtIntFlow(Index)
    If KeyAscii = vbKeyReturn Then
        txtIntFlow_LostFocus Index
        txtIntFlow(Index).SelLength = Len(txtIntFlow(Index).Text)
    End If
End Sub

Private Sub txtIntFlow_LostFocus(Index As Integer)
Dim MsgCap As String
Dim MsgTxt As String
    'test for totally blank row
    If txtIntLift(Index).Text = "" And txtIntFlow(Index).Text = "" Then Exit Sub
    
    If gc_IntLift(Index).Value = 0 Then
        MsgCap = "Help: Flowbench Data"
        MsgTxt = "Lift value must always be entered before the Flow value!"
        MsgBox MsgTxt, vbExclamation, MsgCap
        gc_IntFlow(Index).Value = 0:    txtIntFlow(Index).Text = ""
        FindLastRow
        txtIntLift(LastRow + 1).SetFocus
        Exit Sub
    End If
    
    With gc_IntFlow(Index)
        .Value = val(txtIntFlow(Index).Text)
        
        If .IsChanged Then
            CalcFlowBench Index
            CheckFlow
            If Not Cancel Then
                FindLastRow
                Call TABY(xlift(), yflow(), LastRow + 1, 1, gc_ValveLift.Value, FlowVal)
                CalcFlowStuff FlowVal
            End If
            
            LoadScreen
            .IsChanged = False
            If .IsError Then txtIntFlow(Index).SetFocus
        Else
            txtIntFlow(Index).Text = .Formatted
        End If
    End With
End Sub

Private Sub txtIntFlow_MouseMove(Index As Integer, Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_IntFlow(Index)
    SetHelp Me, HELP_SET, gc_IntFlow(Index)
End Sub


Private Sub txtValveLift_GotFocus()
    'setpanels Me, PNL_SAVE, gc_ValveLift
    SetHelp Me, HELP_SAVE, gc_ValveLift
End Sub

Private Sub txtValveLift_KeyPress(KeyAscii As Integer)
    gc_ValveLift.TestNumericKeyPress KeyAscii, txtValveLift
    If KeyAscii = vbKeyReturn Then
        txtValveLift_LostFocus
        txtValveLift.SelLength = Len(txtValveLift.Text)
    End If
End Sub

Private Sub txtValveLift_LostFocus()
    With gc_ValveLift
        .Value = val(txtValveLift.Text)
        
        If .IsChanged Then
            CheckFlow
            If Not Cancel Then
                Call TABY(xlift(), yflow(), LastRow + 1, 1, .Value, FlowVal)
                CalcCSArea
                CalcFlowStuff FlowVal
            End If
            
            LoadScreen
            .IsChanged = False
            If .IsError Then txtValveLift.SetFocus
        Else
            txtValveLift.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtValveLift_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_ValveLift
    SetHelp Me, HELP_SET, gc_ValveLift
End Sub


Private Sub txtFlowVel_GotFocus()
    'setpanels Me, PNL_SAVE, gc_FlowVel
    SetHelp Me, HELP_SAVE, gc_FlowVel
End Sub

Private Sub txtFlowVel_KeyPress(KeyAscii As Integer)
    gc_FlowVel.TestNumericKeyPress KeyAscii, txtFlowVel
    If KeyAscii = vbKeyReturn Then
        txtFlowVel_LostFocus
        txtFlowVel.SelLength = Len(txtFlowVel.Text)
    End If
End Sub

Private Sub txtFlowVel_LostFocus()
Dim i As Integer
Dim oldval As Single
Dim work As String
Dim z As Single
    With gc_FlowVel
        oldval = .Value
        .Value = val(txtFlowVel.Text)
        
        If .IsChanged Then
            CalcFromFlowVel
            TestFVIndex2 "FlowVel", oldval
            CalcFromFlowVel
            CalcEngPerf
            frmENGINE.LoadScreen
            
            LoadScreen
            .IsChanged = False
            If .IsError Then txtFlowVel.SetFocus
        Else
            txtFlowVel.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtFlowVel_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_FlowVel
    SetHelp Me, HELP_SET, gc_FlowVel
End Sub


Private Sub txtFlowFlux_GotFocus()
    'setpanels Me, PNL_SAVE, gc_FlowFlux
    SetHelp Me, HELP_SAVE, gc_FlowFlux
End Sub

Private Sub txtFlowFlux_KeyPress(KeyAscii As Integer)
    gc_FlowFlux.TestNumericKeyPress KeyAscii, txtFlowFlux
    If KeyAscii = vbKeyReturn Then
        txtFlowFlux_LostFocus
        txtFlowFlux.SelLength = Len(txtFlowFlux.Text)
    End If
End Sub

Private Sub txtFlowFlux_LostFocus()
Dim i As Integer
Dim oldval As Single
Dim work As String
Dim z As Single
    With gc_FlowFlux
        oldval = .Value
        .Value = val(txtFlowFlux.Text)
        
        If .IsChanged Then
            CalcFromFlowFlux
            TestFVIndex2 "FlowFlux", oldval
            CalcFromFlowFlux
            CalcEngPerf
            frmENGINE.LoadScreen
            
            LoadScreen
            .IsChanged = False
            If .IsError Then txtFlowFlux.SetFocus
        Else
            txtFlowFlux.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtFlowFlux_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_FlowFlux
    SetHelp Me, HELP_SET, gc_FlowFlux
End Sub


Private Sub txtFVIndex_GotFocus()
    'setpanels Me, PNL_SAVE, gc_FVIndex
    SetHelp Me, HELP_SAVE, gc_FVIndex
End Sub

Private Sub txtFVIndex_KeyPress(KeyAscii As Integer)
    gc_FVIndex.TestNumericKeyPress KeyAscii, txtFVIndex
    If KeyAscii = vbKeyReturn Then
        txtFVIndex_LostFocus
        txtFVIndex.SelLength = Len(txtFVIndex.Text)
    End If
End Sub

Private Sub txtFVIndex_LostFocus()
Dim i As Integer
Dim oldval As Single
Dim work As String
Dim z As Single
    With gc_FVIndex
        oldval = .Value
        .Value = val(txtFVIndex.Text)
        
        If .IsChanged Then
            CalcFromFVIndex
            TestFVIndex2 "FVIndex", oldval
            CalcFromFVIndex
            CalcEngPerf
            frmENGINE.LoadScreen
            
            LoadScreen
            .IsChanged = False
            If .IsError Then txtFVIndex.SetFocus
        Else
            txtFVIndex.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtFVIndex_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_FVIndex
    SetHelp Me, HELP_SET, gc_FVIndex
End Sub


Private Sub TestFVIndex2(txtBox As String, oldval As Single)
Dim i As Integer
Dim work As String
Dim z As Single
Dim newval As Single
Dim d1 As Integer
    Select Case txtBox
        Case "FlowVel":     newval = gc_FlowVel.Value
        Case "FlowFlux":    newval = gc_FlowFlux.Value
        Case "FVIndex":     newval = gc_FVIndex.Value
    End Select
            
    'update the text boxes, labels and graph prior to the warning message display
    FindLastRow
    For i = 0 To LastRow
        With gc_IntFlow(i)
            .Value = .Value * newval / oldval:  .Value = val(.Formatted)
            txtIntFlow(i).Text = .Formatted
        End With
        CalcFlowBench i
    Next
    
    FlowVal = FlowVal * newval / oldval
    d1 = gc_MaxInFlow.DecimalPlaces
    txtFlowVal.Text = RightAlign(4, d1, FlowVal)
    
    txtFlowVel.Text = gc_FlowVel.Formatted
    txtFlowFlux.Text = gc_FlowFlux.Formatted
    txtFVIndex.Text = gc_FVIndex.Formatted
    Graph2

    'make sure that the LastRow FVIndex is not greater than MaxVal
    If yfvi(LastRow + 1) > gc_FVIndex.MaxVal Then
        oldval = newval:    work = Format(oldval, gc_FVIndex.ValFmt)
        newval = RoundDown(oldval * gc_FVIndex.MaxVal / yfvi(LastRow + 1), 0.1)
        
        Select Case txtBox
            Case "FlowVel"
                gc_FlowVel.Value = newval
                MsgBox "The calculated intake port flow velocity of " & lblVel(LastRow).caption & " ft/sec at " & txtIntLift(LastRow).Text & " inch lift is now too high based on the input Flow Velocity of " & work & " ft/sec for the maximum intake valve lift of " & txtValveLift.Text & " inch!" & Chr(13) & Chr(13) & "The Intake Port Flow Worksheet will now use a value of " & gc_FlowVel.Formatted & " instead of " & work & " ft/sec for the Flow Velocity.", 64, "Intake Port Flow Velocity Warning!"
                txtFlowVel.Text = gc_FlowVel.Formatted
            
            Case "FlowFlux"
                gc_FlowFlux.Value = newval
                MsgBox "The calculated intake port flow velocity of " & lblVel(LastRow).caption & " ft/sec at " & txtIntLift(LastRow).Text & " inch lift is now too high based on the input Flow Flux of " & work & " CFM/sq inch for the maximum intake valve lift of " & txtValveLift.Text & " inch!" & Chr(13) & Chr(13) & "The Intake Port Flow Worksheet will now use a value of " & gc_FlowFlux.Formatted & " instead of " & work & " CFM/sq inch for the Flow Flux.", 64, "Intake Port Flow Velocity Warning!"
                txtFlowFlux.Text = gc_FlowFlux.Formatted
            
            Case "FVIndex"
                gc_FVIndex.Value = newval
                MsgBox "The calculated intake port flow velocity of " & lblVel(LastRow).caption & " ft/sec at " & txtIntLift(LastRow).Text & " inch lift is now too high based on the input Flow Velocity Index of " & work & "% for the maximum intake valve lift of " & txtValveLift.Text & " inch!" & Chr(13) & Chr(13) & "The Intake Port Flow Worksheet will now use a value of " & gc_FVIndex.Formatted & "% instead of " & work & "% for the Flow Velocity Index.", 64, "Intake Port Flow Velocity Warning!"
                txtFVIndex.Text = gc_FVIndex.Formatted
        End Select
        
        For i = 0 To LastRow
            With gc_IntFlow(i)
                .Value = .Value * newval / oldval:  .Value = val(.Formatted)
            End With
            CalcFlowBench i
        Next
    End If
End Sub


Private Sub CalcFromFlowVel()
    gc_FVIndex.IsCalc = True
    gc_FVIndex.Value = 100 * gc_FlowVel.Value / VSTD
    
    gc_FlowFlux.IsCalc = True
    gc_FlowFlux.Value = gc_FlowVel.Value / 2.4
    
    SetVals
End Sub

Private Sub CalcFromFlowFlux()
    gc_FlowVel.IsCalc = True
    gc_FlowVel.Value = gc_FlowFlux.Value * 2.4
    
    gc_FVIndex.IsCalc = True
    gc_FVIndex.Value = 100 * gc_FlowVel.Value / VSTD
    
    SetVals
End Sub

Private Sub CalcFromFVIndex()
    gc_FlowVel.IsCalc = True
    gc_FlowVel.Value = VSTD * gc_FVIndex.Value / 100
    
    gc_FlowFlux.IsCalc = True
    gc_FlowFlux.Value = gc_FlowVel.Value / 2.4
    
    SetVals
End Sub

Private Sub SetVals()
Dim r1 As Single
    'recalculates the flow velocity stuff to be consistent with max flow limit
    With gc_MaxInFlow
        FlowVal = gc_CSArea.Value * gc_FlowFlux.Value
        r1 = 10 ^ -.DecimalPlaces
        .Value = Round(gc_CSArea.Value * gc_FlowFlux.Value, r1)
        
        If .Value >= .MaxVal Or .Value <= .MinVal Then
            FlowVal = .Value
            
            gc_FlowFlux.IsCalc = True
            gc_FlowFlux.Value = .Value / gc_CSArea.Value
            
            gc_FlowVel.IsCalc = True
            gc_FlowVel.Value = gc_FlowFlux.Value * 2.4
            
            gc_FVIndex.IsCalc = True
            gc_FVIndex.Value = 100 * gc_FlowVel.Value / VSTD
        End If
    End With
    
    With gc_FlowVel
        .IsCalc = True: .Value = val(.Formatted)
    End With
    
    With gc_FlowFlux
        .IsCalc = True: .Value = val(.Formatted)
    End With
    
    With gc_FVIndex
        .IsCalc = True: .Value = val(.Formatted)
    End With
End Sub


Private Sub CalcFlowBench(i As Integer)
Dim flux As Single
Dim vel As Single
Dim flowi As Single
Dim r1 As Single
    CalcWSCSArea gc_IntLift(i).Value
    
    If gc_WSCSArea.Value > 0 Then
        flux = gc_IntFlow(i).Value / gc_WSCSArea.Value
        vel = flux * 2.4
        flowi = 100 * vel / VSTD
        
        r1 = 10 ^ -gc_FlowFlux.DecimalPlaces:   flux = Round(flux, r1)
        r1 = 10 ^ -gc_FlowVel.DecimalPlaces:    vel = Round(vel, r1)
        r1 = 10 ^ -gc_FVIndex.DecimalPlaces:    flowi = Round(flowi, r1)
        
        lblArea(i).caption = gc_WSCSArea.Formatted
        lblFlux(i).caption = Format(flux, gc_FlowFlux.ValFmt)
        lblVel(i).caption = Format(vel, gc_FlowVel.ValFmt)
        lblFVI(i).caption = Format(flowi, gc_FVIndex.ValFmt)
    Else
        flowi = 0
        
        lblArea(i).caption = ""
        lblFlux(i).caption = ""
        lblVel(i).caption = ""
        lblFVI(i).caption = ""
    End If
    
    'load values for TABY interpolation and graph
    xlift(i + 1) = gc_IntLift(i).Value
    yflow(i + 1) = gc_IntFlow(i).Value
    yfvi(i + 1) = flowi
End Sub


Private Sub LoadScreen()
Dim i As Integer
Dim d1 As Integer
    Label1.caption = "Valve Diameter - " & gc_ValveDia.Unit
    Label2.caption = "Valve Seat Throat Diameter - " & gc_SeatDia.Unit
    Label4.caption = "Valve Stem Diameter - " & gc_StemDia.Unit
    
    lblNIV.caption = gc_NoInValves.Formatted
    lblIVD.caption = gc_ValveDia.Formatted
    txtSeatDia.Text = gc_SeatDia.Formatted
    txtSeatPer.Text = gc_SeatPer.Formatted
    txtVSAngle.Text = gc_VSAngle.Formatted
    txtVSWidth.Text = gc_VSWidth.Formatted
    txtStemDia.Text = gc_StemDia.Formatted
    
    For i = 0 To 9
        If gc_IntLift(i).Value > 0 Then
            txtIntLift(i).Text = gc_IntLift(i).Formatted
        Else
            txtIntLift(i).Text = ""
        End If
        
        If gc_IntFlow(i).Value > 0 Then
            txtIntFlow(i).Text = gc_IntFlow(i).Formatted
        Else
            txtIntFlow(i).Text = ""
        End If
    Next
    
    d1 = gc_MaxInFlow.DecimalPlaces
    txtFlowVal.Text = RightAlign(4, d1, FlowVal)
    
    txtValveLift.Text = gc_ValveLift.Formatted
    txtCSArea.Text = gc_CSArea.Formatted
    txtFlowVel.Text = gc_FlowVel.Formatted
    txtFlowFlux.Text = gc_FlowFlux.Formatted
    txtFVIndex.Text = gc_FVIndex.Formatted

    Graph2

    bFileDirty = True
End Sub

Public Sub Graph2()
Dim i As Integer
Dim j As Integer
Dim DY As Single
Dim ysave As Integer
Dim X5 As Integer
Dim glift As Single
Dim gflow As Single
    With gphFlowB
        .DataReset = 1                 'graphdata
        .DataReset = 8                 'xposdata
        .DataReset = 19                'Overlaygraphdata
        .DataReset = 23                'Overlayxposdata
        
        'this stuff used to test B&W printing, and is also found in PrintGraph2
        '.ColorData = 0
        '.PatternData = 0
        '.OverlayColor = 0
        '.OverlayPattern = 1
        '.OverlayPatternedLines = 1
        
        'select the required ticks for x axis (lift)
        .XAxisMin = 0
        .XAxisMax = RoundUp(xlift(LastRow + 1), 0.1)
        .XAxisTicks = (.XAxisMax - .XAxisMin) / 0.1
        If .XAxisTicks = 2 Then .XAxisTicks = 4
        If .XAxisTicks = 3 Then .XAxisTicks = 6
        If .XAxisTicks = 4 Then .XAxisTicks = 8
        If .XAxisTicks = 5 Then .XAxisTicks = 10
        
        .YAxisUse = 0                  'first axis (flow)
        'select delta y to provide the required ticks
        .YAxisMin = 0
        .YAxisMax = yflow(LastRow + 1)
        .YAxisTicks = 6
        DY = (.YAxisMax - .YAxisMin) / .YAxisTicks
        
        Select Case DY
            Case Is <= 1:   DY = 1
            Case Is <= 2:   DY = 2
            Case Is <= 4:   DY = 4
            Case Is <= 5:   DY = 5
            Case Is <= 8:   DY = 8
            Case Is <= 10:  DY = 10
            Case Is <= 20:  DY = 20
            Case Is <= 40:  DY = 40
            Case Is <= 50:  DY = 50
            Case Is <= 80:  DY = 80
            Case Is <= 100: DY = 100
            Case Is <= 200: DY = 200
            Case Is <= 400: DY = 400
            Case Else:      DY = 500
        End Select
        
        .YAxisMax = RoundUp(.YAxisMax, DY)
        .YAxisTicks = .YAxisTicks - 1
        'check to see if another y tick is needed now
        If .YAxisMax > .YAxisMin + .YAxisTicks * DY Then
            .YAxisTicks = .YAxisTicks + 1
        End If
        
        'drop off one y ticks to make better looking graph
        If .YAxisMin + .YAxisTicks * DY > .YAxisMax + DY Then
            .YAxisTicks = .YAxisTicks - 1
        End If
        .YAxisMax = .YAxisMin + .YAxisTicks * DY
        ysave = .YAxisTicks
        
        .YAxisUse = 1                   'second axis (flow velocity index)
        .YAxisMin = 9999
        .YAxisMax = 0
        For i = 0 To LastRow
            If yfvi(i + 1) < .YAxisMin Then .YAxisMin = yfvi(i + 1)
            If yfvi(i + 1) > .YAxisMax Then .YAxisMax = yfvi(i + 1)
        Next
        
        'select delta y to match the number of flow axis yticks
        .YAxisTicks = ysave
        DY = (.YAxisMax - .YAxisMin) / .YAxisTicks
        
        Select Case DY
            Case Is <= 10:   DY = 10
            Case Else:       DY = 20
        End Select
        
        .YAxisMin = RoundDown(.YAxisMin, DY)
        'check to see if another y tick is needed to keep the data
        'within dy/2 over the upper grid, move axis down if needed
        If .YAxisMax - DY / 2 > .YAxisMin + .YAxisTicks * DY Then
            .YAxisMin = .YAxisMin + DY
        End If
        
        'position graph in range to look better
        If .YAxisMin + .YAxisTicks * DY > .YAxisMax + DY Then
            .YAxisMin = .YAxisMin - DY
        End If
        .YAxisMax = .YAxisMin + .YAxisTicks * DY
        
        'now load the data points into the graph
        X5 = 5  'intensify the flow bench data by a factor of five
        .NumPoints = X5 * LastRow + 2
        .ThisPoint = 1
        .XPosData = 0
        .GraphData = 0
        
        .OverlayXPosData = 0
        .OverlayGraphData = yfvi(1)
        .OverlayExtraData = 1
        
        For i = 0 To LastRow - 1
            For j = 1 To X5
                .ThisPoint = X5 * i + j + 1
                
                glift = ((X5 + 1 - j) * xlift(i + 1) + (j - 1) * xlift(i + 2)) / X5
                gflow = ((X5 + 1 - j) * yflow(i + 1) + (j - 1) * yflow(i + 2)) / X5
                
                .XPosData = glift
                .GraphData = gflow
                
                .OverlayXPosData = glift
                CalcWSCSArea glift
                .OverlayGraphData = 100 * (2.4 * gflow / gc_WSCSArea.Value) / VSTD
            Next
        Next
        
        .ThisPoint = .NumPoints
        .XPosData = xlift(LastRow + 1)
        .GraphData = yflow(LastRow + 1)
        
        .OverlayXPosData = xlift(LastRow + 1)
        .OverlayGraphData = yfvi(LastRow + 1)
        
        .DrawMode = graphBlit
    End With
End Sub

Private Sub FindLastRow()
Dim i As Integer
    LastRow = 0
    For i = 0 To 9
        If gc_IntLift(i).Value > 0 Then
            LastRow = i
        Else
            Exit For
        End If
    Next
End Sub

Private Sub CheckFlow()
Dim i As Integer
Dim MsgTxt As String
    'check for missing Flow data prior to TABY interpolation
    MsgTxt = ""
    FindLastRow
    For i = 0 To LastRow
        If gc_IntFlow(i).Value = 0 Then MsgTxt = "yes": Exit For
    Next

    If MsgTxt = "yes" Then
        MsgTxt = "Flow values are required for every Lift!"
        MsgBox MsgTxt, vbExclamation, "Help: Flowbench Data"
        txtIntFlow(i).SetFocus
        Cancel = True
    Else
        Cancel = False
    End If
End Sub


Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
