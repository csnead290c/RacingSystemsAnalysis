VERSION 5.00
Begin VB.Form frmQuarter 
   BorderStyle     =   0  'None
   Caption         =   "Input Data"
   ClientHeight    =   5805
   ClientLeft      =   0
   ClientTop       =   1095
   ClientWidth     =   9510
   ClipControls    =   0   'False
   ControlBox      =   0   'False
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MDIChild        =   -1  'True
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   5805
   ScaleWidth      =   9510
   ShowInTaskbar   =   0   'False
   Begin VB.TextBox txtTransGR 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   6
      Left            =   5610
      MaxLength       =   7
      TabIndex        =   22
      Top             =   3450
      Width           =   540
   End
   Begin VB.TextBox txtTransGR 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   5
      Left            =   5610
      MaxLength       =   7
      TabIndex        =   21
      Top             =   3150
      Width           =   540
   End
   Begin VB.TextBox txtTransGR 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   4
      Left            =   5610
      MaxLength       =   7
      TabIndex        =   20
      Top             =   2850
      Width           =   540
   End
   Begin VB.TextBox txtTransGR 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   3
      Left            =   5610
      MaxLength       =   7
      TabIndex        =   19
      Top             =   2550
      Width           =   540
   End
   Begin VB.TextBox txtTransGR 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   2
      Left            =   5610
      MaxLength       =   7
      TabIndex        =   18
      Top             =   2250
      Width           =   540
   End
   Begin VB.TextBox txtTransGR 
      Alignment       =   1  'Right Justify
      Height          =   285
      Index           =   1
      Left            =   5610
      MaxLength       =   7
      TabIndex        =   17
      Top             =   1950
      Width           =   540
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
      Left            =   5490
      TabIndex        =   73
      ToolTipText     =   "Press this option button for a clutch type transmission"
      Top             =   600
      Width           =   900
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
      Left            =   3450
      TabIndex        =   72
      ToolTipText     =   "Press this option button for a torque converter style transmission"
      Top             =   600
      Width           =   1860
   End
   Begin VB.CheckBox chkNitrous 
      Height          =   210
      Left            =   2400
      TabIndex        =   71
      Top             =   4740
      Width           =   240
   End
   Begin VB.CheckBox chkLockup 
      Height          =   210
      Left            =   6060
      TabIndex        =   70
      Top             =   1170
      Width           =   240
   End
   Begin VB.PictureBox picGraph 
      BorderStyle     =   0  'None
      Height          =   300
      Left            =   6600
      ScaleHeight     =   300
      ScaleWidth      =   300
      TabIndex        =   66
      TabStop         =   0   'False
      Top             =   600
      Visible         =   0   'False
      Width           =   300
   End
   Begin VB.TextBox txtConvDia 
      Height          =   285
      Left            =   5880
      MaxLength       =   7
      TabIndex        =   16
      Top             =   1440
      Width           =   540
   End
   Begin VB.CommandButton btnGearRatio 
      Caption         =   "..."
      Height          =   270
      Left            =   5550
      TabIndex        =   28
      ToolTipText     =   "Press this button to display the Motorcycle Final Drive Gear Ratio Worksheet"
      Top             =   4110
      Visible         =   0   'False
      Width           =   270
   End
   Begin VB.ComboBox cbxFuelSystem 
      Height          =   315
      Left            =   1200
      Style           =   2  'Dropdown List
      TabIndex        =   10
      Top             =   3795
      Width           =   2070
   End
   Begin VB.TextBox txtShiftRPM 
      Height          =   285
      Left            =   2670
      MaxLength       =   7
      TabIndex        =   14
      Top             =   5010
      Visible         =   0   'False
      Width           =   540
   End
   Begin VB.TextBox txtRPMPeakHP 
      Height          =   285
      Left            =   2670
      MaxLength       =   7
      TabIndex        =   12
      Top             =   4410
      Visible         =   0   'False
      Width           =   540
   End
   Begin VB.TextBox txtPeakHP 
      Height          =   285
      Left            =   2670
      MaxLength       =   7
      TabIndex        =   13
      Top             =   4710
      Visible         =   0   'False
      Width           =   540
   End
   Begin VB.TextBox txtDisplacement 
      Height          =   285
      Left            =   2670
      MaxLength       =   7
      TabIndex        =   11
      Top             =   4110
      Visible         =   0   'False
      Width           =   540
   End
   Begin VB.ComboBox cbxBodyStyle 
      Height          =   315
      Left            =   1200
      Style           =   2  'Dropdown List
      TabIndex        =   8
      Top             =   2895
      Width           =   2055
   End
   Begin VB.CommandButton btnRefArea 
      Caption         =   "..."
      Height          =   270
      Left            =   2340
      TabIndex        =   27
      ToolTipText     =   "Press this button to display the Frontal Area Worksheet"
      Top             =   3210
      Width           =   270
   End
   Begin VB.TextBox txtRefArea 
      Height          =   285
      Left            =   2670
      MaxLength       =   7
      TabIndex        =   9
      Top             =   3210
      Width           =   540
   End
   Begin VB.TextBox txtTractionIndex 
      Height          =   285
      Left            =   5880
      MaxLength       =   7
      TabIndex        =   26
      Top             =   5010
      Width           =   540
   End
   Begin VB.TextBox txtTireWidth 
      Height          =   285
      Left            =   5880
      MaxLength       =   7
      TabIndex        =   25
      Top             =   4710
      Width           =   540
   End
   Begin VB.CommandButton btnTractionIndex 
      Caption         =   "?"
      Height          =   270
      Left            =   5550
      TabIndex        =   30
      ToolTipText     =   "Press this button to display Help for the Traction Index"
      Top             =   5010
      Width           =   270
   End
   Begin VB.CommandButton btnTireWidth 
      Caption         =   "..."
      Height          =   270
      Left            =   5550
      TabIndex        =   29
      ToolTipText     =   "Press this button to display the Tire Width Worksheet"
      Top             =   4710
      Width           =   270
   End
   Begin VB.TextBox txtTireDia 
      Height          =   285
      Left            =   5880
      MaxLength       =   7
      TabIndex        =   24
      Top             =   4410
      Width           =   540
   End
   Begin VB.TextBox txtGearRatio 
      Height          =   285
      Left            =   5880
      MaxLength       =   7
      TabIndex        =   23
      Top             =   4110
      Width           =   540
   End
   Begin VB.TextBox txtSlipStallRPM 
      Height          =   285
      Left            =   5880
      MaxLength       =   7
      TabIndex        =   15
      Top             =   840
      Width           =   540
   End
   Begin VB.TextBox txtRollout 
      Height          =   285
      Left            =   2670
      MaxLength       =   7
      TabIndex        =   6
      Top             =   2295
      Width           =   540
   End
   Begin VB.TextBox txtWheelbase 
      Height          =   285
      Left            =   2670
      MaxLength       =   7
      TabIndex        =   7
      Top             =   2595
      Width           =   540
   End
   Begin VB.TextBox txtWeight 
      Height          =   285
      Left            =   2670
      MaxLength       =   7
      TabIndex        =   5
      Top             =   1995
      Width           =   540
   End
   Begin VB.TextBox txtHumidity 
      Height          =   285
      Left            =   2670
      MaxLength       =   7
      TabIndex        =   4
      Top             =   1440
      Width           =   540
   End
   Begin VB.TextBox txtBarometer 
      Height          =   285
      Left            =   2670
      MaxLength       =   7
      TabIndex        =   2
      Top             =   840
      Width           =   540
   End
   Begin VB.TextBox txtTemperature 
      Height          =   285
      Left            =   2670
      MaxLength       =   7
      TabIndex        =   3
      Top             =   1140
      Width           =   540
   End
   Begin VB.TextBox txtElevation 
      Height          =   285
      Left            =   2670
      MaxLength       =   7
      TabIndex        =   1
      Top             =   540
      Width           =   540
   End
   Begin VB.TextBox txtNote 
      Height          =   285
      Left            =   660
      TabIndex        =   0
      Top             =   60
      Width           =   8790
   End
   Begin VB.Label lblHELP 
      BackColor       =   &H00FFFFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(0)"
      Height          =   300
      Index           =   0
      Left            =   30
      TabIndex        =   69
      Top             =   5400
      Width           =   7560
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00FFFFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(1)"
      Height          =   300
      Index           =   1
      Left            =   7620
      TabIndex        =   68
      Top             =   5400
      Width           =   900
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00FFFFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(2)"
      Height          =   300
      Index           =   2
      Left            =   8550
      TabIndex        =   67
      Top             =   5400
      Width           =   900
   End
   Begin VB.Label label1 
      Caption         =   "NO2 option?"
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
      Left            =   1260
      TabIndex        =   65
      Top             =   4770
      Width           =   1080
   End
   Begin VB.Line Line2 
      BorderColor     =   &H00FFFFFF&
      X1              =   3405
      X2              =   6480
      Y1              =   1845
      Y2              =   1845
   End
   Begin VB.Line Line1 
      BorderColor     =   &H00808080&
      X1              =   3390
      X2              =   6480
      Y1              =   1830
      Y2              =   1830
   End
   Begin VB.Label label1 
      Caption         =   "Transmission"
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
      Left            =   4200
      TabIndex        =   64
      Top             =   375
      Width           =   1200
   End
   Begin VB.Label Label7 
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
      Left            =   4950
      TabIndex        =   63
      Top             =   3480
      Width           =   450
   End
   Begin VB.Label Label6 
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
      Left            =   4950
      TabIndex        =   62
      Top             =   3180
      Width           =   450
   End
   Begin VB.Label Label5 
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
      Left            =   4950
      TabIndex        =   61
      Top             =   2880
      Width           =   450
   End
   Begin VB.Label Label4 
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
      Left            =   4950
      TabIndex        =   60
      Top             =   2580
      Width           =   450
   End
   Begin VB.Label Label3 
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
      Left            =   4950
      TabIndex        =   59
      Top             =   2280
      Width           =   450
   End
   Begin VB.Label Label2 
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
      Left            =   4950
      TabIndex        =   58
      Top             =   1980
      Width           =   450
   End
   Begin VB.Label label1 
      Caption         =   "Converter Diameter - inches"
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
      Left            =   3480
      TabIndex        =   57
      Top             =   1500
      Width           =   2400
   End
   Begin VB.Label label1 
      Alignment       =   2  'Center
      AutoSize        =   -1  'True
      Caption         =   "Engine"
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
      Left            =   1320
      TabIndex        =   52
      Tag             =   "ISQUARTERJR"
      Top             =   3600
      Visible         =   0   'False
      Width           =   600
   End
   Begin VB.Label label1 
      Caption         =   "Shift@ RPM"
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
      Left            =   120
      TabIndex        =   56
      Top             =   5070
      Visible         =   0   'False
      Width           =   2100
   End
   Begin VB.Label label1 
      Caption         =   "RPM@ Peak HP"
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
      Left            =   120
      TabIndex        =   55
      Top             =   4470
      Visible         =   0   'False
      Width           =   2100
   End
   Begin VB.Label label1 
      Caption         =   "Peak HP"
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
      Left            =   120
      TabIndex        =   54
      Top             =   4770
      Visible         =   0   'False
      Width           =   900
   End
   Begin VB.Label label1 
      Caption         =   "Displacement - CID"
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
      Left            =   120
      TabIndex        =   53
      Top             =   4170
      Visible         =   0   'False
      Width           =   2100
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00FFFFFF&
      Height          =   1665
      Index           =   15
      Left            =   30
      Top             =   3690
      Visible         =   0   'False
      Width           =   3270
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00404040&
      Height          =   1665
      Index           =   14
      Left            =   30
      Tag             =   "ISQUARTERJR"
      Top             =   3690
      Visible         =   0   'False
      Width           =   3270
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
      Height          =   195
      Index           =   28
      Left            =   120
      TabIndex        =   51
      Top             =   3855
      Width           =   1125
   End
   Begin VB.Label label1 
      Alignment       =   2  'Center
      AutoSize        =   -1  'True
      Caption         =   "Vehicle"
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
      Left            =   1020
      TabIndex        =   48
      Top             =   1800
      Width           =   660
   End
   Begin VB.Label label1 
      Caption         =   "Body Style:"
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
      Left            =   120
      TabIndex        =   50
      Top             =   2955
      Width           =   1035
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
      Left            =   120
      TabIndex        =   49
      Top             =   3270
      Width           =   2100
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00FFFFFF&
      Height          =   1665
      Index           =   11
      Left            =   30
      Top             =   1905
      Width           =   3270
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00404040&
      Height          =   1665
      Index           =   10
      Left            =   30
      Top             =   1905
      Width           =   3270
   End
   Begin VB.Label label1 
      Alignment       =   2  'Center
      AutoSize        =   -1  'True
      Caption         =   "Final Drive"
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
      Left            =   4320
      TabIndex        =   43
      Top             =   3930
      Width           =   930
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
      Left            =   3480
      TabIndex        =   47
      Top             =   5070
      Width           =   2020
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
      Left            =   3480
      TabIndex        =   46
      Top             =   4770
      Width           =   2020
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
      Left            =   3480
      TabIndex        =   45
      Top             =   4470
      Width           =   2020
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
      Left            =   3480
      TabIndex        =   44
      Top             =   4170
      Width           =   2020
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00FFFFFF&
      Height          =   1350
      Index           =   9
      Left            =   3390
      Top             =   4020
      Width           =   3105
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00404040&
      Height          =   1350
      Index           =   8
      Left            =   3390
      Top             =   4020
      Width           =   3105
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00FFFFFF&
      Height          =   3420
      Index           =   6
      Left            =   3390
      Top             =   450
      Width           =   3105
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00FFFFFF&
      Height          =   3420
      Index           =   7
      Left            =   3390
      Top             =   450
      Width           =   3105
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
      Left            =   3480
      TabIndex        =   42
      Top             =   900
      Width           =   2400
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
      Left            =   3480
      TabIndex        =   41
      Top             =   1200
      Width           =   2400
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
      Left            =   120
      TabIndex        =   40
      Top             =   2355
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
      Left            =   120
      TabIndex        =   39
      Top             =   2655
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
      Left            =   120
      TabIndex        =   38
      Top             =   2055
      Width           =   2100
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
      Left            =   120
      TabIndex        =   37
      Top             =   1500
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
      Left            =   120
      TabIndex        =   36
      Top             =   900
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
      Left            =   120
      TabIndex        =   35
      Top             =   1200
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
      Left            =   120
      TabIndex        =   34
      Top             =   600
      Width           =   2100
   End
   Begin VB.Label label1 
      AutoSize        =   -1  'True
      Caption         =   "Gear Ratios:"
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
      Left            =   3480
      TabIndex        =   33
      Top             =   1980
      Width           =   1080
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
      TabIndex        =   32
      Top             =   120
      Width           =   480
   End
   Begin VB.Label label1 
      Alignment       =   2  'Center
      AutoSize        =   -1  'True
      Caption         =   "General"
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
      Left            =   1200
      TabIndex        =   31
      Top             =   375
      Width           =   690
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00FFFFFF&
      Height          =   1350
      Index           =   3
      Left            =   30
      Top             =   450
      Width           =   3270
   End
   Begin VB.Shape Shape1 
      BorderColor     =   &H00404040&
      Height          =   1350
      Index           =   2
      Left            =   30
      Top             =   450
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
Dim i As Integer
Static IsLoaded As Boolean
    If Not IsLoaded Then
        fc_Note.ClsControl = txtNote
        
        gc_Elevation.ClsControl = txtElevation
        gc_Temperature.ClsControl = txtTemperature
        gc_Barometer.ClsControl = txtBarometer
        gc_Humidity.ClsControl = txtHumidity
        
        gc_Displacement.ClsControl = txtDisplacement
        gc_PeakHP.ClsControl = txtPeakHP
        gc_RPMPeakHP.ClsControl = txtRPMPeakHP
        gc_Nitrous.ClsControl = chkNitrous
        gc_ShiftRPM.ClsControl = txtShiftRPM
        gc_FuelSystem.ClsControl = cbxFuelSystem
        
        gc_TransType.ClsControl = optTransType(0)
        gc_SlipStallRPM.ClsControl = txtSlipStallRPM
        gc_LockUp.ClsControl = chkLockup
        gc_ConvDia.ClsControl = txtConvDia
        
        For i = 1 To 6
            clsVals("TransGR", i).ClsControl = txtTransGR(i)
        Next
        
        gc_Weight.ClsControl = txtWeight
        gc_Rollout.ClsControl = txtRollout
        gc_Wheelbase.ClsControl = txtWheelbase
        gc_RefArea.ClsControl = txtRefArea
        gc_BodyStyle.ClsControl = cbxBodyStyle
        
        gc_GearRatio.ClsControl = txtGearRatio
        gc_TireDia.ClsControl = txtTireDia
        gc_TireWidth.ClsControl = txtTireWidth
        gc_TractionIndex.ClsControl = txtTractionIndex
        
        IsLoaded = True
        Me.Visible = True
        Set fc_Value = gc_Elevation
    End If
    
    SetTransTypeStrings
    SetTireDiaStrings
    
    optTransType(0).Value = gc_TransType.Value
    optTransType(1).Value = Not gc_TransType.Value
    optTransType(0).TabStop = gc_TransType.Value
    optTransType(1).TabStop = Not gc_TransType.Value
    
    Label1(9).Visible = gc_TransType.Value
    txtConvDia.Visible = gc_TransType.Value
    
    chkNitrous.Value = gc_Nitrous.Value
    chkLockup.Value = gc_LockUp.Value
    
    If gc_BodyStyle.Value = 8 Then
        btnGearRatio.Visible = True
    Else
        btnGearRatio.Visible = False
    End If
    
    SetBarometer
    SetElevation
    SetTrackTemp
    SetWeight
    SetPeakHP
    SetLaunchRPM
    SetShiftRPM
    SetSlipStallRPM
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
    Me.height = FrmMDI.height - FrmMDI.picture1.top - FrmMDI.picture1.height - 870  '870 makes it look better 12/14/2022
    Me.width = FrmMDI.width - 150                                                   '150 makes it look better 12/14/2022

    fc_Note.StatusMsg = "Descriptive note or text to more fully describe this data file."
   
    ShapeShifter Shape1(2), Shape1(3), Label1(14)
    ShapeShifter Shape1(6), Shape1(7), Label1(5)
    ShapeShifter Shape1(8), Shape1(9), Label1(18)
    ShapeShifter Shape1(10), Shape1(11), Label1(24)
    ShapeShifter Shape1(14), Shape1(15), Label1(34)
    
    bFileDirty = False
End Sub

Private Sub Form_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    If X >= cbxFuelSystem.left - 20 And X <= cbxFuelSystem.left + cbxFuelSystem.width Then
        If Y >= cbxFuelSystem.top - 20 And Y <= cbxFuelSystem.top + cbxFuelSystem.height Then
            SetHelp Me, HELP_SET, gc_FuelSystem
            Exit Sub
        End If
    Else
        If X >= cbxBodyStyle.left - 20 And X <= cbxBodyStyle.left + cbxBodyStyle.width Then
            If Y >= cbxBodyStyle.top - 20 And Y <= cbxBodyStyle.top + cbxBodyStyle.height Then
                SetHelp Me, HELP_SET, gc_BodyStyle
                Exit Sub
            End If
        End If
    End If
    SetHelp Me, HELP_RESET, fc_Value
End Sub


Private Sub btnGearRatio_Click()
    frmGearRatio.Show vbModal
    If frmGearRatio.FileDirty Then bFileDirty = True
End Sub

Private Sub btnGearRatio_GotFocus()
    SetHelp Me, HELP_SAVE, gc_GearRatioBtn
End Sub

Private Sub btnGearRatio_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_GearRatioBtn
End Sub


Private Sub btnRefArea_Click()
    frmRefArea.Show vbModal
    If frmRefArea.FileDirty Then bFileDirty = True
End Sub

Private Sub btnRefArea_GotFocus()
    SetHelp Me, HELP_SAVE, gc_RefAreaBtn
End Sub

Private Sub btnRefArea_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_RefAreaBtn
End Sub


Private Sub btnTireWidth_Click()
    frmTireWidth.Show vbModal
    If frmTireWidth.FileDirty Then bFileDirty = True
End Sub

Private Sub btnTireWidth_GotFocus()
    SetHelp Me, HELP_SAVE, gc_TireWidthBtn
End Sub

Private Sub btnTireWidth_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TireWidthBtn
End Sub


Private Sub btnTractionIndex_Click()
    frmTractionIndex.Show vbModal
End Sub

Private Sub btnTractionIndex_GotFocus()
    SetHelp Me, HELP_SAVE, gc_TractionIndexBtn
End Sub

Private Sub btnTractionIndex_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TractionIndexBtn
End Sub


Private Sub cbxBodyStyle_Change()
    gc_BodyStyle.Value = cbxBodyStyle.ItemData(cbxBodyStyle.ListIndex)
    
    If gc_BodyStyle.IsChanged Then
        TestRefArea
        gc_BodyStyle.IsChanged = False
        If gc_BodyStyle.IsError Then cbxBodyStyle.SetFocus
    Else
        cbxBodyStyle.ListIndex = gc_BodyStyle.Value - 1
    End If
    
    If gc_BodyStyle.Value = 8 Then
        btnGearRatio.Visible = True
    Else
        btnGearRatio.Visible = False
    End If
End Sub

Private Sub cbxBodyStyle_Click()
    cbxBodyStyle_Change
End Sub

Private Sub cbxBodyStyle_GotFocus()
    SetHelp Me, HELP_SAVE, gc_BodyStyle
End Sub

Private Sub cbxBodyStyle_LostFocus()
    cbxBodyStyle_Change
End Sub


Private Sub cbxFuelSystem_Change()
    gc_FuelSystem.Value = cbxFuelSystem.ItemData(cbxFuelSystem.ListIndex)
    
    If gc_FuelSystem.IsChanged Then
        SetPeakHP
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


Private Sub txtNote_GotFocus()
    SetHelp Me, HELP_SAVE, fc_Note
End Sub

Private Sub txtNote_KeyPress(KeyAscii As Integer)
    bFileDirty = True
End Sub

Private Sub txtNote_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, fc_Note
End Sub

Private Sub txtElevation_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Elevation
End Sub


Private Sub txtElevation_KeyPress(KeyAscii As Integer)
    gc_Elevation.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then
        If gc_Elevation.IsChanged Then SetBarometer
    End If
End Sub

Private Sub txtElevation_LostFocus()
    gc_Elevation.Value = val(txtElevation.Text)
    If gc_Elevation.IsChanged Then SetBarometer
End Sub

Private Sub txtElevation_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Elevation
End Sub


Private Sub txtTemperature_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Temperature
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
        SetTrackTemp
        gc_TrackTemp.Value = gc_Temperature.Value + 30
    End If
End Sub

Private Sub txtTemperature_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Temperature
End Sub


Private Sub txtBarometer_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Barometer
End Sub

Private Sub txtBarometer_KeyPress(KeyAscii As Integer)
    gc_Barometer.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then
        If gc_Barometer.IsChanged Then SetElevation
    End If
End Sub

Private Sub txtBarometer_LostFocus()
    gc_Barometer.Value = val(txtBarometer.Text)
    If gc_Barometer.IsChanged Then SetElevation
End Sub

Private Sub txtBarometer_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Barometer
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


Private Sub optTransType_Click(index As Integer)
    If index = 0 Then
        gc_TransType.Value = True
    Else
        gc_TransType.Value = False
    End If

    Label1(9).Visible = gc_TransType.Value
    txtConvDia.Visible = gc_TransType.Value

    If gc_TransType.IsChanged Then
        SetTransTypeStrings
        TestSlipStallRPM
        SetLaunchRPM
        'SetSlipStallRPM - not needed here, Launch RPM is not input in Qjr
        SetShiftRPM
        SetPeakHP
    End If
End Sub

Private Sub optTransType_GotFocus(index As Integer)
    SetHelp Me, HELP_SAVE, gc_TransType
End Sub

Private Sub optTransType_MouseMove(index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TransType
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
        SetShiftRPM
        SetLaunchRPM
    End If
End Sub

Private Sub txtSlipStallRPM_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_SlipStallRPM
End Sub


Private Sub chkLockup_click()
    gc_LockUp.Value = chkLockup.Value
End Sub

Private Sub chkLockup_GotFocus()
    SetHelp Me, HELP_SAVE, gc_LockUp
End Sub

Private Sub chkLockUp_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_LockUp
End Sub


Private Sub txtConvDia_GotFocus()
    SetHelp Me, HELP_SAVE, gc_ConvDia
End Sub

Private Sub txtConvDia_KeyPress(KeyAscii As Integer)
    gc_ConvDia.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtConvDia_LostFocus()
    gc_ConvDia.Value = val(txtConvDia.Text)
End Sub

Private Sub txtConvDia_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_ConvDia
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
    
    MsgCap = "Help: Transmission Data"
    
    For i = 1 To 6                                  'find the current NGR
        If clsVals("TransGR", i).Value > 0 Then NGR = i Else Exit For
    Next
    
    If ThisGR > NGR + 1 Then                        'check for a gap in the GR values
        MsgTxt = "Gear Ratios must be entered in sequential order!  Zero or blank values are not allowed."
        MsgBox MsgTxt, vbExclamation, MsgCap
        clsVals("TransGR", ThisGR).Value = OldValue
        Set fc_Value = clsVals("TransGR", NGR + 1)
        'setfocus - Patrick
        Exit Sub 'leave bFileDirty = False
    End If

    If clsVals("TransGR", ThisGR).Value = 0 Then    'check for zero GR entry to clear remaining values
        vbReply = MsgBox("You are about to permanently change the Transmission Gear Ratios.  Every value from here down will be left blank.  Are you sure you want to proceed?", 256 + vbExclamation + vbYesNo, MsgCap)
        If vbReply = vbYes Then
            For i = ThisGR To 6
                clsVals("TransGR", i).Value = 0
            Next
            bFileDirty = True
        Else
            clsVals("TransGR", NGR + 1).Value = OldValue
        End If
        'Patrick - what if the 1st GR was set to zero and then a value > 0 not re-entered?
        'and the need to recalc SetPeakHP in QUARTERjr? Don't want to leave with TransGR(1) = 0
        
        Set fc_Value = clsVals("TransGR", NGR + 1)
        'setfocus - Patrick
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
            vbReply = MsgBox("Are you going to change all the Transmission Gear Ratios?  Would you like the remaining Transmission Gear Ratios cleared?", 256 + vbExclamation + vbYesNo, MsgCap)
        Else
            vbReply = vbNo
        End If
                
        If vbReply = vbYes Then
            For i = ThisGR To 6
                clsVals("TransGR", i).Value = 0
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
    
    If ThisGR = 1 Then SetPeakHP
    bFileDirty = True
End Sub


Private Sub txtDisplacement_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Displacement
End Sub

Private Sub txtDisplacement_KeyPress(KeyAscii As Integer)
    gc_Displacement.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtDisplacement_Check
End Sub

Private Sub txtDisplacement_LostFocus()
    gc_Displacement.Value = val(txtDisplacement.Text)
    txtDisplacement_Check
End Sub

Private Sub txtDisplacement_Check()
    If gc_Displacement.IsChanged Then
        SetPeakHP
        SetWeight
    End If
End Sub

Private Sub txtDisplacement_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Displacement
End Sub


Private Sub chkNitrous_Click()
    gc_Nitrous.Value = chkNitrous.Value
    SetPeakHP
    SetWeight
End Sub

Private Sub chkNitrous_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Nitrous
End Sub

Private Sub chkNitrous_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Nitrous
End Sub


Private Sub txtPeakHP_GotFocus()
    SetHelp Me, HELP_SAVE, gc_PeakHP
End Sub

Private Sub txtPeakHP_KeyPress(KeyAscii As Integer)
    gc_PeakHP.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtPeakHP_LostFocus()
    gc_PeakHP.Value = val(txtPeakHP.Text)
End Sub

Private Sub txtPeakHP_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_PeakHP
End Sub


Private Sub txtRPMPeakHP_GotFocus()
    SetHelp Me, HELP_SAVE, gc_RPMPeakHP
End Sub

Private Sub txtRPMPeakHP_KeyPress(KeyAscii As Integer)
    gc_RPMPeakHP.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtRPMPeakHP_Check
End Sub

Private Sub txtRPMPeakHP_LostFocus()
    gc_RPMPeakHP.Value = val(txtRPMPeakHP.Text)
    txtRPMPeakHP_Check
End Sub

Private Sub txtRPMPeakHP_Check()
    If gc_RPMPeakHP.IsChanged Then
        TestShiftRPM
        TestSlipStallRPM
        SetPeakHP
        SetShiftRPM
        SetSlipStallRPM
        SetLaunchRPM
    End If
End Sub

Private Sub txtRPMPeakHP_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_RPMPeakHP
End Sub


Private Sub txtShiftRPM_GotFocus()
    SetHelp Me, HELP_SAVE, gc_ShiftRPM
End Sub

Private Sub txtShiftRPM_KeyPress(KeyAscii As Integer)
    gc_ShiftRPM.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtShiftRPM_Check
End Sub

Private Sub txtShiftRPM_LostFocus()
    gc_ShiftRPM.Value = val(txtShiftRPM.Text)
    txtShiftRPM_Check
End Sub

Private Sub txtShiftRPM_Check()
    If gc_ShiftRPM.IsChanged Then
        TestShiftRPM
        SetSlipStallRPM
    End If
End Sub

Private Sub txtShiftRPM_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_ShiftRPM
End Sub


Private Sub txtRefArea_GotFocus()
    SetHelp Me, HELP_SAVE, gc_RefArea
End Sub

Private Sub txtRefArea_KeyPress(KeyAscii As Integer)
    gc_RefArea.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then
        If gc_RefArea.IsChanged Then TestRefArea
    End If
End Sub

Private Sub txtRefArea_LostFocus()
    gc_RefArea.Value = val(txtRefArea.Text)
    If gc_RefArea.IsChanged Then TestRefArea
End Sub

Private Sub txtRefArea_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_RefArea
End Sub


Private Sub txtGearRatio_GotFocus()
    SetHelp Me, HELP_SAVE, gc_GearRatio
End Sub

Private Sub txtGearRatio_KeyPress(KeyAscii As Integer)
    gc_GearRatio.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then
        If gc_GearRatio.IsChanged Then SetPeakHP
    End If
End Sub

Private Sub txtGearRatio_LostFocus()
    gc_GearRatio.Value = val(txtGearRatio.Text)
    If gc_GearRatio.IsChanged Then SetPeakHP
End Sub

Private Sub txtGearRatio_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_GearRatio
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
        SetPeakHP
    End If
End Sub

Private Sub txtTireDia_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TireDia
End Sub


Private Sub txtTireWidth_GotFocus()
    SetHelp Me, HELP_SAVE, gc_TireWidth
End Sub

Private Sub txtTireWidth_KeyPress(KeyAscii As Integer)
    gc_TireWidth.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then
        If gc_TireWidth.IsChanged Then SetPeakHP
    End If
End Sub

Private Sub txtTireWidth_LostFocus()
    gc_TireWidth.Value = val(txtTireWidth.Text)
    If gc_TireWidth.IsChanged Then SetPeakHP
End Sub

Private Sub txtTireWidth_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TireWidth
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


Private Sub txtWeight_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Weight
End Sub

Private Sub txtWeight_KeyPress(KeyAscii As Integer)
    gc_Weight.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then
        If gc_Weight.IsChanged Then SetTireWidth
    End If
End Sub

Private Sub txtWeight_LostFocus()
    gc_Weight.Value = val(txtWeight.Text)
    If gc_Weight.IsChanged Then SetTireWidth
End Sub

Private Sub txtWeight_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Weight
End Sub


Private Sub txtRollout_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Rollout
End Sub

Private Sub txtRollout_KeyPress(KeyAscii As Integer)
    gc_Rollout.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then
        If gc_Rollout.IsChanged Then TestRollout
    End If
End Sub

Private Sub txtRollout_LostFocus()
    gc_Rollout.Value = val(txtRollout.Text)
    If gc_Rollout.IsChanged Then TestRollout
End Sub
    
Private Sub txtRollout_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Rollout
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
