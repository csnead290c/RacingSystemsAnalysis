VERSION 5.00
Begin VB.Form frmTimeSlip 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Timeslip"
   ClientHeight    =   4200
   ClientLeft      =   6630
   ClientTop       =   930
   ClientWidth     =   2760
   ForeColor       =   &H00000000&
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MDIChild        =   -1  'True
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   4200
   ScaleWidth      =   2760
   Begin VB.CommandButton btnOutput 
      Caption         =   "Detailed Parameters"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   12
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   555
      Left            =   30
      TabIndex        =   25
      Top             =   3630
      Width           =   2700
   End
   Begin VB.Timer Timer1 
      Enabled         =   0   'False
      Interval        =   5000
      Left            =   1410
      Top             =   60
   End
   Begin VB.ListBox List1 
      Enabled         =   0   'False
      Height          =   255
      Left            =   810
      TabIndex        =   22
      Top             =   4200
      Visible         =   0   'False
      Width           =   345
   End
   Begin VB.Frame Frame1 
      Height          =   3375
      Left            =   30
      TabIndex        =   0
      Top             =   225
      Width           =   2700
      Begin VB.Label Label21 
         Caption         =   ". . ."
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Left            =   1050
         TabIndex        =   21
         Top             =   2940
         Width           =   570
      End
      Begin VB.Label Label20 
         Caption         =   ". . ."
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Left            =   1050
         TabIndex        =   20
         Top             =   2490
         Width           =   570
      End
      Begin VB.Label Label19 
         Caption         =   ". . ."
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Left            =   1050
         TabIndex        =   19
         Top             =   2040
         Width           =   570
      End
      Begin VB.Label Label18 
         Caption         =   ". . ."
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Left            =   1050
         TabIndex        =   18
         Top             =   1590
         Width           =   570
      End
      Begin VB.Label Label17 
         Caption         =   ". . ."
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Left            =   1050
         TabIndex        =   17
         Top             =   1170
         Width           =   570
      End
      Begin VB.Label Label16 
         Caption         =   ". . ."
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Left            =   1050
         TabIndex        =   16
         Top             =   690
         Width           =   570
      End
      Begin VB.Label Label15 
         Caption         =   ". . ."
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Left            =   1050
         TabIndex        =   15
         Top             =   240
         Width           =   570
      End
      Begin VB.Label tsv 
         Alignment       =   1  'Right Justify
         Caption         =   "161.95"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Index           =   7
         Left            =   1500
         TabIndex        =   14
         Top             =   2940
         Width           =   900
      End
      Begin VB.Label tsv 
         Alignment       =   1  'Right Justify
         Caption         =   "8.183"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Index           =   6
         Left            =   1500
         TabIndex        =   13
         Top             =   2490
         Width           =   900
      End
      Begin VB.Label tsv 
         Alignment       =   1  'Right Justify
         Caption         =   "6.799"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Index           =   5
         Left            =   1500
         TabIndex        =   12
         Top             =   2040
         Width           =   900
      End
      Begin VB.Label tsv 
         Alignment       =   1  'Right Justify
         Caption         =   "131.59"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Index           =   4
         Left            =   1500
         TabIndex        =   11
         Top             =   1590
         Width           =   900
      End
      Begin VB.Label tsv 
         Alignment       =   1  'Right Justify
         Caption         =   "5.175"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Index           =   3
         Left            =   1500
         TabIndex        =   10
         Top             =   1140
         Width           =   900
      End
      Begin VB.Label tsv 
         Alignment       =   1  'Right Justify
         Caption         =   "3.314"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Index           =   2
         Left            =   1500
         TabIndex        =   9
         Top             =   690
         Width           =   900
      End
      Begin VB.Label tsv 
         Alignment       =   1  'Right Justify
         Caption         =   "1.170"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Index           =   1
         Left            =   1500
         TabIndex        =   8
         Top             =   240
         Width           =   900
      End
      Begin VB.Label Label1 
         Caption         =   "MPH"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Index           =   7
         Left            =   300
         TabIndex        =   7
         Top             =   2940
         Width           =   660
      End
      Begin VB.Label Label1 
         Caption         =   "1/4"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Index           =   6
         Left            =   300
         TabIndex        =   6
         Top             =   2490
         Width           =   660
      End
      Begin VB.Label Label1 
         Caption         =   "1000'"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Index           =   5
         Left            =   300
         TabIndex        =   5
         Top             =   2040
         Width           =   660
      End
      Begin VB.Label Label1 
         Caption         =   "MPH"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Index           =   4
         Left            =   300
         TabIndex        =   4
         Top             =   1590
         Width           =   660
      End
      Begin VB.Label Label1 
         Caption         =   "660'"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Index           =   3
         Left            =   300
         TabIndex        =   3
         Top             =   1140
         Width           =   660
      End
      Begin VB.Label Label1 
         Caption         =   "330'"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Index           =   2
         Left            =   300
         TabIndex        =   2
         Top             =   690
         Width           =   660
      End
      Begin VB.Label Label1 
         Caption         =   "60'"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00800000&
         Height          =   300
         Index           =   1
         Left            =   300
         TabIndex        =   1
         Top             =   240
         Width           =   660
      End
   End
   Begin VB.Label tsv 
      Caption         =   "HPC"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      ForeColor       =   &H00800000&
      Height          =   255
      Index           =   8
      Left            =   2250
      TabIndex        =   24
      Top             =   30
      Width           =   480
   End
   Begin VB.Label tsv 
      Caption         =   "Date & Time"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      ForeColor       =   &H00800000&
      Height          =   255
      Index           =   0
      Left            =   60
      TabIndex        =   23
      Top             =   30
      Width           =   2100
   End
End
Attribute VB_Name = "frmTimeSlip"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit
Option Compare Text

Private mTimer As Boolean
Public fc_Value As Object
Public fc_Label As New CButton

'calculation variables
Dim AgsMax As Single, cmu1 As Single, ChassisPMI As Single
Dim CRTF As Single, CAXI As Single, DistToPrint(1 To 9) As Single, DownForce As Single, TimePrintInc As Single
Dim DragForce As Single, DragHP As Single
Dim LockRPM As Single, ET As Single, force As Single, HPChasPMI As Single, HPEngPMI As Single, HP As Single
Dim hpc As Single, ClutchSlip As Single, hpmax As Single, HPSave As Single
Dim i As Integer, k As Integer, kd As Integer, ShiftRPMTol As Integer
Dim DTShift As Single, TSMax As Single, AMAX As Single, Jerk As Single
Dim NHP As Integer, NGR As Integer
Dim PQWT As Single, EngAccHP As Single, ChasAccHP As Single, q As Single, rho As Single, RPM0 As Single
Dim SlipRatio As Single, Shift2PrintTime As Single
Dim Stall As Single, zStall As Single
Dim TireRadIn As Single, TireCirFt As Single, TireDia As Single, TireGrowth As Single
Dim TimePrint As Single, TQ As Single, TireSlip As Single, Time0 As Single
Dim MPHtoPrint(1 To 2) As Single
Dim NextVel As Single, VelMPHMatch As Single, VelShiftMatch As Single, VelTimeMatch As Single, VelDistMatch As Single
Dim Vel0 As Single, VelSqrd As Single

Dim deltaFWT As Single, DynamicFWT As Single, StaticRWT As Single, DynamicRWT As Single, WheelBarWT As Single

Dim DSRPM0 As Single, Dist0 As Single, z As Single, TimeStep As Single, DistStep As Single, z0 As Single, dtk1 As Single
Dim dtk2 As Single, Ags0 As Single, SaveTime As Single
Dim factor As Single, factor1 As Single, factor2 As Single, factor3 As Single
Dim iGear As Integer, PrintFlag As Integer, iMPH As Integer, iDist As Integer, LAdd As Integer
Dim DistTol As Single
Dim L As Integer, opt As Integer, opt1 As Integer, opt2 As Integer, opt3 As Integer
Dim ShiftFlag As Integer, SLIP(1 To 60) As Integer
Dim TGR(1 To 6) As Single, TGEff(1 To 6) As Single
Dim ShiftRPM(1 To 6) As Integer
Dim TIMESLIP(1 To 7) As Single, ASV(1 To 7) As Single
Dim Gear(1 To 60) As Single, AGS(1 To 60) As Single, time(1 To 60) As Single, EngRPM(1 To 60) As Single, Vel(1 To 60) As Single, Dist(1 To 60) As Single
Dim DSRPM As Single
Dim xrpm(0 To 16) As Single, yhp(0 To 16) As Single, ztq(0 To 16) As Single
Dim Work As Single

'program constants
Const Z5 = 3600 / 5280
Const JMin = -4
Const JMax = 2
Const K6 = 0.92
Const K61 = 1.08
Const AMin = 0.004          'reduced from .05 to .004 for Qjr and QPro in order
                            'to implement Buell rev limit option - 10/04/03. note: was .004 for BVPro already

#If Not ISBVPRO Then        'QUARTER jr and QUARTER Pro
    Const AX = 10.8         'reduced from 11.2 - 07/23/01
    Const CMU = 0.025
    Const CMUK = 0.01
    Const TimeTol = 0.002   'reduced from .005 - 07/11/99
    Const KV = 0.02 / Z5    'reduced from .05 - 07/11/99
    Const K7 = 9.5          'increased from 5.5 - 07/11/99
    Const KP21 = 0.15
    Const KP22 = 0.25
    Const FRCT = 1.03       'reduced from 1.08 - 03/14/03, CMU & RGEff already used
#Else                       'Bonneville Pro
    Const AX = 9.7          'reduced from 10.0 - 07/23/01
    Const CMU = 0.03
    Const CMUK = 0
    Const TimeTol = 0.002
    Const KV = 0.05 / Z5
    Const K7 = 5.5
    Const KP21 = 0
    Const KP22 = 0
    Const FRCT = 1.01       'reduced from 1.04 - 03/14/03, CMU & RGEff already used
#End If

Private Sub btnOutput_Click()
Dim i As Integer
Dim max As Long
Dim TopHt As Integer
    frmTimeSlip.btnOutput.Enabled = False
    
    With frmOutput.lstLbxOutput
        If .Listcount > 0 Then .Clear
        For i = 0 To List1.Listcount - 1
            .AddItem List1.List(i)
        Next
    
        max = Screen.height - 1620  '1620 is for what?
        TopHt = 690                 '690 for WXP, was 600 before
        .height = max - TopHt       'for debug help
    
        If .Listcount < 60 Then     'for debug help
            .height = 60 + 210 * frmTimeSlip.List1.Listcount
    
            If .height + TopHt <= max Then
                max = .height + TopHt
            Else
                .height = max - TopHt
            End If
        End If
    End With
    
    With frmOutput
        .Visible = False
        .top = 60
        .height = max
        .left = 300
        .width = 5880
        .Label1.caption = "Time        Distance     MPH   Acceleration  Gear     RPM"
        .lstLbxOutput.width = 5700
        .Visible = True
    End With
End Sub

Private Sub btnOutput_GotFocus()
    SetHelp Me, HELP_SAVE, gc_OutputBtn
End Sub

Private Sub btnOutput_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_OutputBtn
End Sub


Public Sub Display()
Dim left As Long
Dim qrhs As Long
Dim top As Long
    DoEvents
    
    setGraphEnabledAll True
    SetPrintEnabled True
    frmTimeSlip.btnOutput.Enabled = True
    
    #If ISQUARTERPRO Then
        'old code from day with the very small screens
        'left = frmQuarter.left + frmQuarter.width - (frmTimeSlip.width + 120)
        'qrhs = frmQuarter.txtNote.left + frmQuarter.txtNote.width + 150
        'If left > qrhs Then left = qrhs
        'top = frmQuarter.top + 660
        
        left = 9600
        top = 600
    #Else
        left = 6600
        top = 600
        
        'activate this code to hide HPC on Timeslip
        'tsv(8).Visible = False
        'tsv(8).Enabled = False
    #End If
        
    frmTimeSlip.Move left, top
    frmTimeSlip.Show
End Sub

Private Sub Form_Load()
    DoEvents
End Sub

Private Sub Form_QueryUnload(Cancel As Integer, UnloadMode As Integer)
    If UnloadMode = vbFormControlMenu Then
        Cancel = True
        HideForms
    End If
End Sub

Public Function CalcOutput() As Boolean
Dim r1 As Single, r2 As Single
Dim atf As Single, B As Single, c As Single
Dim k1 As Integer
Dim estCID As Single, teff As Single, shp As Single, stq As Single
Dim lrat As Single
Dim TQMult As Single
Dim MsgTxt As String, MsgCap As String
Dim vmax As Single
Dim RefArea2 As Single, WindFPS As Single, TrackTempEffect As Single
Dim ftd As Single
Dim ovradj As Single

    mTimer = False
    Timer1.Enabled = True
    
    If List1.Listcount > 0 Then List1.Clear
    For i = 1 To 7:     TIMESLIP(i) = 0:    Next
    
    Weather rho, hpc
    If gc_TireDia.UOM = UOM_NORMAL Then
        TireDia = gc_TireDia.Value
    Else
        TireDia = gc_TireDia.Value / PI
    End If

    For i = 1 To 6
        If clsVals("TransGR", i).Value = 0 Then Exit For
        NGR = i
        TGR(i) = clsVals("TransGR", i).Value
        #If ISQUARTERPRO Then
            TGEff(i) = clsVals("TransEff", i).Value
            ShiftRPM(i) = clsVals("ShiftRPM", i).Value
        #End If
    Next
    
    #If ISQUARTERPRO Then
        'CalcBodyStyle  frmQuarter.btnGearRatio
        
        DTShift = 0.2                                'Clutch shift time
        If gc_TransType.Value Then DTShift = 0.25    'Converter shift time
        
        gc_PeakHP.Value = 1
        For i = 1 To 11
            If clsVals("EngineRPM", i).Value = 0 Then Exit For
            NHP = i
            xrpm(i) = clsVals("EngineRPM", i).Value
            yhp(i) = clsVals("EngineHP", i).Value
            ztq(i) = clsVals("EngineTQ", i).Value
            If yhp(i) > gc_PeakHP.Value Then gc_PeakHP.Value = yhp(i)
        Next
    #Else                             'QUARTER jr stuff
        ENGINE
        For i = 1 To NHP:    ztq(i) = yhp(i) * (Z6 / xrpm(i)):    Next
        
        gc_TorqueMult.IsCalc = True
        gc_Slippage.IsCalc = True
        
        If Not gc_TransType.Value Then
            DTShift = 0.2                  'Clutch type trans
            teff = 0.99
            For i = 1 To NGR
                TGEff(i) = teff - (NGR - i) * 0.005
                ShiftRPM(i) = gc_ShiftRPM.Value
            Next
            
            gc_TorqueMult.Value = 1
            gc_Slippage.Value = 1.0025 + gc_SlipStallRPM.Value / 1000000
        Else
            DTShift = 0.25                 'Converter type trans
            teff = 0.99: If NGR >= 3 Then teff = 0.985
            For i = 1 To NGR
                TGEff(i) = teff - (NGR - i) * 2 * 0.005
                ShiftRPM(i) = gc_ShiftRPM.Value
            Next
            
            If gc_SlipStallRPM.Value > 220 Then
                Stall = gc_SlipStallRPM.Value
                Call TABY(xrpm(), yhp(), NHP, 1, Stall, shp)
                stq = shp * (Z6 / Stall) / hpc
                Work = (Stall / 1000) * (Stall / stq)
            Else
                Work = gc_SlipStallRPM.Value
            End If
               
            lrat = Work / (200 * (7 / gc_ConvDia.Value) ^ 4)
            gc_Slippage.Value = 1.01 + lrat / 20 + Work / 8000
                
            TQMult = 2.633 - lrat ^ 0.3 - Work / 1500
            If TQMult < 1 Then TQMult = 1
            If TQMult > 2 Then TQMult = 2
            gc_TorqueMult.Value = TQMult
            
            If lrat < 0.36 Then MsgBox "A larger diameter torque converter may be needed for this engine.", vbInformation, "Help: Torque Converter Diameter"
            If lrat > 1 Then MsgBox "A smaller diameter torque converter may be needed for this engine.", vbInformation, "Help: Torque Converter Diameter"
        End If
            
        gc_Efficiency.IsCalc = True
        If gc_BodyStyle.Value = 8 Then
            gc_Efficiency.Value = 0.985
        Else
            gc_Efficiency.Value = 0.97
        End If
            
        gc_DragCoef.IsCalc = True:              gc_LiftCoef.IsCalc = True
        Select Case gc_BodyStyle.Value
            Case 1:  gc_DragCoef.Value = 0.66:  gc_LiftCoef.Value = 0.8:  gc_Overhang.Value = 30
            Case 2:  gc_DragCoef.Value = 0.5:   gc_LiftCoef.Value = 0.2:  gc_Overhang.Value = 30
            Case 3:  gc_DragCoef.Value = 0.52:  gc_LiftCoef.Value = 0.8:  gc_Overhang.Value = 40
            Case 4:  gc_DragCoef.Value = 0.52:  gc_LiftCoef.Value = 0.1:  gc_Overhang.Value = 30
            Case 5:  gc_DragCoef.Value = 0.28:  gc_LiftCoef.Value = 0.1:  gc_Overhang.Value = 30
            Case 6:  gc_DragCoef.Value = 0.4:   gc_LiftCoef.Value = 0.1:  gc_Overhang.Value = 24
            Case 7:  gc_DragCoef.Value = 0.46:  gc_LiftCoef.Value = 0.1:  gc_Overhang.Value = 18
            Case 8:  gc_DragCoef.Value = 0.54:  gc_LiftCoef.Value = 0.1:  gc_Overhang.Value = 12
        End Select
    #End If
            
    #If ISQUARTERJR Or ISBVPRO Then
        #If ISQUARTERJR Then    'QUARTER jr
            estCID = gc_Displacement.Value
        #Else                   'Bonneville Pro
            estCID = (gc_PeakHP.Value / 1.2) * (3800 / gc_RPMPeakHP.Value) / CalcWork
        #End If
        
        If gc_FuelSystem.Value <= 5 Then    'naturally aspirated
            gc_EnginePMI.Value = estCID / 120
        Else                                'supercharged
            gc_EnginePMI.Value = estCID / 90
        End If
            
        If Not gc_TransType.Value Then
            gc_TransPMI.Value = NGR * gc_EnginePMI.Value / 50
        Else
            gc_TransPMI.Value = (NGR - 1) * gc_EnginePMI.Value / 10
        End If
            
        gc_TiresPMI.Value = 2 * (1.15 * 0.8 * (0.08 * TireDia * gc_TireWidth.Value) * (TireDia / 2) ^ 2 / 386)
            
        If gc_BodyStyle.Value = 8 Then
            gc_EnginePMI.Value = estCID / 240
            gc_TransPMI.Value = gc_TransPMI.Value / (240 / 120)
            gc_TiresPMI.Value = gc_TiresPMI.Value / 2
        End If
    #End If
    
    #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro
        'calculate adjustment for front overhang assuming
        'no less than 24" front tire diameter - ftd
        ftd = 2 * gc_Rollout.Value:     If ftd < 24 Then ftd = 24
        ovradj = (gc_Overhang.Value + 0.25 * ftd) / 12
        If ovradj < 0.5 * ftd / 12 Then ovradj = 0.5 * ftd / 12
        
        DistToPrint(1) = gc_Rollout.Value / 12: If DistToPrint(1) = 0 Then DistToPrint(1) = 1
        DistToPrint(2) = 30:        DistToPrint(3) = 60:        DistToPrint(4) = 330:      DistToPrint(5) = 594
        DistToPrint(6) = 660:       DistToPrint(7) = 1000:      DistToPrint(8) = 1254:     DistToPrint(9) = 1320
        MPHtoPrint(1) = 60 / Z5:    MPHtoPrint(2) = 100 / Z5
    #Else                   'Bonneville Pro
        Select Case gc_Track.Value
            Case 1
                DistToPrint(1) = gc_Rollout.Value / 12:     If DistToPrint(1) = 0 Then DistToPrint(1) = 1
                DistToPrint(2) = 660:       DistToPrint(3) = 1320:    DistToPrint(4) = 1980:     DistToPrint(5) = 2640
                DistToPrint(6) = 3300:      DistToPrint(7) = 3960:    DistToPrint(8) = 4620:     DistToPrint(9) = 5280
                MPHtoPrint(1) = 60 / Z5: MPHtoPrint(2) = 100 / Z5
            Case 2
                DistToPrint(1) = gc_Rollout.Value / 12:     If DistToPrint(1) = 0 Then DistToPrint(1) = 1
                DistToPrint(2) = 660:       DistToPrint(3) = 1320:    DistToPrint(4) = 2640:     DistToPrint(5) = 3960
                DistToPrint(6) = 5280:      DistToPrint(7) = 5808:    DistToPrint(8) = 6336:     DistToPrint(9) = 6864
                MPHtoPrint(1) = 100 / Z5: MPHtoPrint(2) = 200 / Z5
            Case 3
                DistToPrint(1) = gc_Rollout.Value / 12:     If DistToPrint(1) = 0 Then DistToPrint(1) = 1
                DistToPrint(2) = 660:       DistToPrint(3) = 1320:    DistToPrint(4) = 2640:     DistToPrint(5) = 3960
                DistToPrint(6) = 5280:      DistToPrint(7) = 6600:    DistToPrint(8) = 7260:     DistToPrint(9) = 7920
                MPHtoPrint(1) = 100 / Z5: MPHtoPrint(2) = 200 / Z5
            Case 4
2                DistToPrint(1) = gc_Rollout.Value / 12:    If DistToPrint(1) = 0 Then DistToPrint(1) = 1
                DistToPrint(2) = 660:       DistToPrint(3) = 1320:    DistToPrint(4) = 2640:     DistToPrint(5) = 5280
                DistToPrint(6) = 6600:      DistToPrint(7) = 7920:    DistToPrint(8) = 9240:     DistToPrint(9) = 10560
                MPHtoPrint(1) = 100 / Z5: MPHtoPrint(2) = 200 / Z5
            Case 5
                DistToPrint(1) = gc_Rollout.Value / 12:     If DistToPrint(1) = 0 Then DistToPrint(1) = 1
                DistToPrint(2) = 2640:      DistToPrint(3) = 5280:    DistToPrint(4) = 7920:     DistToPrint(5) = 10560
                DistToPrint(6) = 11880:     DistToPrint(7) = 13200:   DistToPrint(8) = 14520:    DistToPrint(9) = 15840
                MPHtoPrint(1) = 100 / Z5: MPHtoPrint(2) = 200 / Z5
            Case 6
                DistToPrint(1) = gc_Rollout.Value / 12:     If DistToPrint(1) = 0 Then DistToPrint(1) = 1
                DistToPrint(2) = 5280:      DistToPrint(3) = 10560:   DistToPrint(4) = 13200:    DistToPrint(5) = 15840
                DistToPrint(6) = 18480:     DistToPrint(7) = 21120:   DistToPrint(8) = 23760:    DistToPrint(9) = 26400
                MPHtoPrint(1) = 100 / Z5: MPHtoPrint(2) = 200 / Z5
            Case 7
                DistToPrint(1) = gc_Rollout.Value / 12:     If DistToPrint(1) = 0 Then DistToPrint(1) = 1
                DistToPrint(2) = 5280:      DistToPrint(3) = 10560:   DistToPrint(4) = 21120:    DistToPrint(5) = 31680
                DistToPrint(6) = 36960:     DistToPrint(7) = 42240:   DistToPrint(8) = 47520:    DistToPrint(9) = 52800
                MPHtoPrint(1) = 100 / Z5: MPHtoPrint(2) = 200 / Z5
        End Select
    #End If
        
   'calc rpm tolerance for shifting and printout
    ShiftRPMTol = 10:    If ShiftRPM(1) > 8000 Then ShiftRPMTol = 20
   
   'calc initial tire slip from traction index and track temperature
    #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro
       'calc track temperature effect using modified original GoldMind logic
        If gc_TrackTemp.Value > 100 Then
            TrackTempEffect = 1 + 0.0000025 * Abs(100 - gc_TrackTemp.Value) ^ 2.5
        Else
            TrackTempEffect = 1 + 0.000002 * Abs(100 - gc_TrackTemp.Value) ^ 2.5
        End If
        If TrackTempEffect > 1.04 Then TrackTempEffect = 1.04
        
        TireSlip = 1.02 + (gc_TractionIndex.Value - 1) * 0.005 + (TrackTempEffect - 1) * 3
    #Else                   'Bonneville Pro
        TrackTempEffect = 1
        TireSlip = 1.01 + (gc_TractionIndex.Value - 1) * 0.01
    #End If
   
   'calc printout interval to fill screen
    hpmax = (gc_PeakHP.Value * gc_HPTQMult.Value / hpc) * TGEff(1) * gc_Efficiency.Value / (gc_Slippage.Value * TireSlip)
    
    #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro
        ET = (TrackTempEffect ^ 0.25) * (1.8 + 4.2 * (hpmax / gc_Weight.Value) ^ (-1 / 3))
    #Else                   'Bonneville Pro
        vmax = 0.95 * (2 * gc * 550 * hpmax / (rho * gc_DragCoef.Value * gc_RefArea.Value)) ^ (1 / 3)
        vmax = vmax * (hpmax / gc_Weight.Value) ^ 0.2
        ET = DistToPrint(9) / (vmax * 0.72)
    #End If
    If gc_BodyStyle.Value = 8 Then ET = 1.04 * ET
      
    #If ISQUARTERPRO Then
        #If ISBVPRO Then
            kd = 29
        #Else
            kd = 33
        #End If
        If gc_BodyStyle.Value = 8 Then kd = kd - 1
    #Else
        kd = 28
        If gc_BodyStyle.Value = 8 Then kd = kd - 7
    #End If
    
    TimePrintInc = 0.25: z = ET / TimePrintInc + 2 * (NGR - 1): If z < kd Then GoTo settprnt
    TimePrintInc = 0.5: z = ET / TimePrintInc + 2 * (NGR - 1): If z < kd Then GoTo settprnt
    TimePrintInc = 1: z = ET / TimePrintInc + 2 * (NGR - 1): If z < kd Then GoTo settprnt
    TimePrintInc = 2: z = ET / TimePrintInc + 2 * (NGR - 1): If z < kd Then GoTo settprnt
    TimePrintInc = 3: z = ET / TimePrintInc + 2 * (NGR - 1): If z < kd Then GoTo settprnt
    TimePrintInc = 4: z = ET / TimePrintInc + 2 * (NGR - 1): If z < kd Then GoTo settprnt
    TimePrintInc = 5: z = ET / TimePrintInc + 2 * (NGR - 1): If z < kd Then GoTo settprnt
    TimePrintInc = 10: z = ET / TimePrintInc + 2 * (NGR - 1): If z < kd Then GoTo settprnt
    TimePrintInc = 15: z = ET / TimePrintInc + 2 * (NGR - 1): If z < kd Then GoTo settprnt
    TimePrintInc = 20: z = ET / TimePrintInc + 2 * (NGR - 1): If z < kd Then GoTo settprnt
    TimePrintInc = 25: z = ET / TimePrintInc + 2 * (NGR - 1): If z < kd Then GoTo settprnt
    TimePrintInc = 30: z = ET / TimePrintInc + 2 * (NGR - 1): If z < kd Then GoTo settprnt
    TimePrintInc = 35: z = ET / TimePrintInc + 2 * (NGR - 1): If z < kd Then GoTo settprnt
    TimePrintInc = 40: z = ET / TimePrintInc + 2 * (NGR - 1): If z < kd Then GoTo settprnt
    TimePrintInc = 50: z = ET / TimePrintInc + 2 * (NGR - 1): If z > kd Then TimePrintInc = 100
settprnt:
    TimePrint = TimePrintInc
   
    Rem**  CALCULATE STALL SPEED IF LAMBDA WAS INPUT
    If gc_SlipStallRPM.Value > 220 Then
        Stall = gc_SlipStallRPM.Value
    Else
        Stall = 0
        atf = 1 / (1000 * gc_SlipStallRPM.Value)
        For k = 2 To NHP
            k1 = k - 1
            B = gc_HPTQMult.Value * (ztq(k) - ztq(k1)) / (hpc * (xrpm(k) - xrpm(k1)))
            c = gc_HPTQMult.Value * ztq(k) / hpc - xrpm(k) * B
            z = B ^ 2 + 4 * atf * c
            r1 = 0
            r2 = 0
            
            If z > 0 Then
                z = Sqr(z)
                r1 = (B + z) / (2 * atf): r2 = (B - z) / (2 * atf)
            End If
            
            If r1 < xrpm(k1) And k > 2 Then r1 = 0
            If r2 < xrpm(k1) And k > 2 Then r2 = 0
            If r1 > xrpm(k) And k < NHP Then r1 = 0
            If r2 > xrpm(k) And k < NHP Then r2 = 0
            If r1 > 0 Then Stall = r1
            If r2 > 0 Then Stall = r2
        Next
        Stall = Round(Stall, 20)
        
        'check calculated stall RPM against limits
        If Stall < xrpm(1) Then
            If gc_TransType.Value Then
                MsgCap = "Help: Stall Index"
                MsgTxt = "Stall Index is too low!  It results in a Stall RPM below the Engine Dyno Data.  The lowest Engine RPM will be used for the Stall RPM instead."
            Else
                MsgCap = "Help: Slip Index"
                MsgTxt = "Slip Index is too low!  It results in a Slip RPM below the Engine Dyno Data.  The lowest Engine RPM will be used for the Slip RPM instead."
            End If
            MsgBox MsgTxt, vbExclamation, MsgCap
            Stall = xrpm(1)
        End If
        
        If ShiftRPM(1) > 0 And Stall >= ShiftRPM(1) Then
            If gc_TransType.Value Then
                MsgCap = "Help: Stall Index"
                MsgTxt = "Stall Index is too high!  It results in a Stall RPM above the Shift@ RPM in low gear.  The Shift@ RPM in low gear less 100 RPM will be used for the Stall RPM instead."
            Else
                MsgCap = "Help: Slip Index"
                MsgTxt = "Slip Index is too high!  It results in a Slip RPM above the Shift@ RPM in low gear.  The Shift@ RPM in low gear less 100 RPM will be used for the Slip RPM instead."
            End If
            MsgBox MsgTxt, vbExclamation, MsgCap
            Stall = ShiftRPM(1) - 100
        End If
        
        #If ISQUARTERPRO Then
            If gc_TransType.Value Then
                If gc_LaunchRPM.Value > Stall Then
                    MsgCap = "Help: Stall Index"
                    MsgTxt = "Stall Index is too low!  It results in a Stall RPM below the Launch@ RPM.  The Launch@ RPM will be used for the Stall RPM instead."
                    MsgBox MsgTxt, vbExclamation, MsgCap
                    Stall = gc_LaunchRPM.Value
                End If
            End If
        #End If
        
        #If ISQUARTERJR Then
            If Not gc_TransType.Value Then
                gc_Slippage.Value = 1.0025 + Stall / 1000000
            End If
        #End If
    End If
        
    #If ISQUARTERJR Or ISBVPRO Then
        gc_LaunchRPM.Value = Stall
    #End If
        
    Rem**  INITIALIZE VARIOUS CONSTANTS
    #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro
        DistTol = 0.005
    #Else                   'Bonneville Pro
        DistTol = 1
    #End If
    
    iGear = 1:  ShiftFlag = 0:  iDist = 0:      iMPH = 1:       LAdd = 1:       SaveTime = 0
    L = 1:      Time0 = 0:      time(L) = 0:    Vel(L) = 0:     Dist(L) = 0:    DSRPM = 0
    
    Rem**  calculate launch conditions at starting line (static)
    EngRPM(L) = gc_LaunchRPM.Value
    Gear(L) = iGear
    DownForce = gc_Weight.Value
    
    Call TABY(xrpm(), yhp(), NHP, 1, EngRPM(L), HP)
    HP = gc_HPTQMult.Value * HP / hpc
    HPSave = HP
    TQ = Z6 * HP / EngRPM(L)
    TQ = TQ * gc_TorqueMult.Value * TGR(iGear) * TGEff(iGear)
    
    WindFPS = Sqr(Vel(L) ^ 2 + 2 * Vel(L) * (gc_WindSpeed.Value / Z5) * Cos(PI * gc_WindAngle.Value / 180) + (gc_WindSpeed.Value / Z5) ^ 2)
    q = Sgn(WindFPS) * rho * Abs(WindFPS) ^ 2 / (2 * gc)
    
    DragForce = CMU * gc_Weight.Value + gc_DragCoef.Value * gc_RefArea.Value * q
    force = TQ * gc_GearRatio.Value * gc_Efficiency.Value / (TireSlip * TireDia / 24) - DragForce
    
    'estimate maximum acceleration from force and weight
    If gc_TransType.Value Then
        Ags0 = 0.96 * force / gc_Weight.Value  'assume 4% misc losses on initial hit of tire
    Else
        Ags0 = 0.88 * force / gc_Weight.Value  'assume 12% misc losses on initial hit of tire
    End If
    AgsMax = Ags0    'save AgsMax for print tolerance selection
    
    'assume YCG is 3.75" above static rear axle centerline (to match Pro Stock)
    gc_YCG.IsCalc = True
    gc_YCG.Value = (TireDia / 2) + 3.75
    'gc_YCG.Value = 19  'dynamic CG height for Pro Stock
    
    Tire TireGrowth, TireCirFt
    TireRadIn = 12 * TireCirFt / (2 * PI)
    deltaFWT = (Ags0 * gc_Weight.Value * ((gc_YCG.Value - TireRadIn) + (FRCT / gc_Efficiency.Value) * TireRadIn) + DragForce * gc_YCG.Value) / gc_Wheelbase.Value
    
    'calculate dynamic front weight and static rear weight for launch conditions
    'set the required static front weight for perfect balance at launch
    DynamicFWT = 0
    gc_StaticFWt.IsCalc = True
    gc_StaticFWt.Value = deltaFWT + DynamicFWT
    'gc_StaticFWt.Value = 1230  'for Pro Stock
    
    'estimate static rear weight = total weight - estimated static front weight
    StaticRWT = DownForce - gc_StaticFWt.Value: If StaticRWT < 0 Then StaticRWT = gc_Weight.Value
    
    'calculate initial max tire force limit based on estimated static rear weight
    CAXI = (1 - (gc_TractionIndex.Value - 1) * 0.01) / (TrackTempEffect ^ 0.25)
    CRTF = CAXI * AX * TireDia * (gc_TireWidth.Value + 1) * (0.92 + 0.08 * (StaticRWT / 1900) ^ 2.15)
    If gc_BodyStyle.Value = 8 Then CRTF = 0.5 * CRTF
    
    AMAX = (CRTF - DragForce) / gc_Weight.Value
    SLIP(L) = 0:    If Ags0 > AMAX Then Ags0 = AMAX:    SLIP(L) = 1
                    If Ags0 < AMin Then Ags0 = AMin
    AGS(L) = Ags0
    'Work = time(L) + Dist(L) + Vel(L) + Ags(L) + Gear(L) + EngRPM(L)    'debug
    AddListLine
    
    'select a time step to get about 15 calcs during the rollout distance
    #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro
        TSMax = DistToPrint(1) * 0.11 * (HP * gc_TorqueMult.Value / gc_Weight.Value) ^ (-1 / 3)
        TSMax = TSMax / 15: If TSMax < 0.005 Then TSMax = 0.005
    #Else                   'Bonneville Pro
        TSMax = 0.1
    #End If
    iDist = 1

230 Rem**  TOP OF LOOP FOR GEAR CHANGE
    Shift2PrintTime = time(L) + DTShift
    TimeStep = DTShift
    
    Rem**  CALCULATE THE TOTAL CHASSIS INERTIA FOR THIS GEAR
    ChassisPMI = gc_TiresPMI.Value + gc_TransPMI.Value * gc_GearRatio.Value ^ 2 * TGR(iGear) ^ 2
    If L > 1 Then GoTo 250

240 Rem**  TOP OF LOOP FOR VELOCITY STEP INCREMENT
    'AddListLine 'debug - add to show every converged step
    'Work = time(L) + Dist(L) + Vel(L) + Ags(L) + Gear(L) + EngRPM(L)    'debug
    'AddListLine
    TimeStep = TSMax * (AgsMax / Ags0) ^ 4  'QProRxCode
    
250 Jerk = 0    'jerk has units of g's per second
    Work = time(L) - Time0
    If Work > 0 Then Jerk = (AGS(L) - Ags0) / Work
    If Jerk < JMin Then Jerk = JMin
    If Jerk > JMax Then Jerk = JMax
    
    Vel0 = Vel(L):      Ags0 = AGS(L)
    Tire TireGrowth, TireCirFt
    RPM0 = EngRPM(L):   Time0 = time(L)
    If RPM0 = gc_LaunchRPM.Value And Time0 = 0 Then
        RPM0 = Stall:   If gc_LaunchRPM.Value < Stall Then Time0 = gc_EnginePMI.Value * (Stall - gc_LaunchRPM.Value) / 250000
    End If
    Dist0 = Dist(L)
    
    #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro only!
        'calc tire slip from traction index, track temp and downtrack location
        Work = 0.005 * (gc_TractionIndex.Value - 1) + 3 * (TrackTempEffect - 1)
        TireSlip = 1.02 + Work * (1 - (Dist0 / 1320) ^ 2)
    #End If
    
    DSRPM0 = DSRPM:     L = L + LAdd:   Gear(L) = iGear:  LAdd = 0
        
    Rem**  SELECT NEXT VELOCITY TO MEET VARIOUS OBJECTIVES (ShiftFlag < 2)
    Vel(L) = Vel0 + Ags0 * gc * TimeStep + Jerk * gc * TimeStep ^ 2 / 2
    
    If ShiftFlag = 2 Then GoTo 270
    
    'don't let TimeStep exceed K7 steps per TimePrintInc
    If TimeStep > (TimePrintInc / K7) Then TimeStep = TimePrintInc / K7
    'don't let TimeStep exceed TimePrint
    If TimeStep > (TimePrint - Time0) Then TimeStep = TimePrint - Time0
    'don't let TimeStep exceed 4.5 steps to distance print
    If iDist > 1 Then
        Work = ((DistToPrint(iDist) - DistToPrint(iDist - 1)) / Vel0) / 4.5 'increased from 2.0 7/11/99
        If TimeStep > Work Then TimeStep = Work
    End If
    If TimeStep > 0.05 Then TimeStep = 0.05     'reduced from .2 7/11/99
    
    Vel(L) = Vel0 + Ags0 * gc * TimeStep + Jerk * gc * TimeStep * TimeStep / 2
        
    'don't let TimeStep exceed shift points
    If Vel0 > 0 And RPM0 > Stall And iGear < NGR Then
        Work = Vel0 * (ShiftRPM(iGear) + 5) / RPM0
        If Vel(L) > Work Then
            Vel(L) = Work:      TimeStep = (Vel(L) - Vel0) / (Ags0 * gc)
        End If
    End If
    
    'don't let TimeStep exceed distance print
    DistStep = Dist0 + Vel0 * TimeStep + Ags0 * gc * TimeStep ^ 2 / 2
    If DistStep >= (DistToPrint(iDist) - DistTol) Then
        Vel(L) = Sqr(Vel0 ^ 2 + 2 * Ags0 * gc * (DistToPrint(iDist) - Dist0))
    End If

270 Rem**  ENTRY POINT FOR VELOCITY REVISION TO MATCH DISTANCE, TIME, OR SHIFT POINT PRINTS
    VelSqrd = Vel(L) ^ 2 - Vel0 ^ 2
    DSRPM = TireSlip * Vel(L) * 60 / TireCirFt
    DoEvents
    If mTimer Then GoTo calcoutputexit  'Patrick - see QProRxCode for other tests
        
    Rem**  PERFORM CLUTCH AND CONVERTER CALCULATIONS
    LockRPM = DSRPM * gc_GearRatio.Value * TGR(iGear)
    EngRPM(L) = gc_Slippage.Value * LockRPM
    
    If Not gc_TransType.Value Then                      'clutch
        If EngRPM(L) < Stall Then
            If iGear = 1 Or gc_LockUp.Value = 0 Then EngRPM(L) = Stall
        End If
        ClutchSlip = LockRPM / EngRPM(L)
    Else
        If iGear = 1 Or gc_LockUp.Value = 0 Then        'non lock-up converter
            zStall = Stall
            SlipRatio = gc_Slippage.Value * LockRPM / zStall
            
            If L > 2 Then
                If SlipRatio > 0.6 Then zStall = zStall * (1 + (gc_Slippage.Value - 1) * (SlipRatio - 0.6) / ((1 / gc_Slippage.Value) - 0.6))
                SlipRatio = gc_Slippage.Value * LockRPM / zStall
            End If
            ClutchSlip = 1 / gc_Slippage.Value
              
            If EngRPM(L) < zStall Then
                EngRPM(L) = zStall
                Work = gc_TorqueMult.Value - (gc_TorqueMult.Value - 1) * SlipRatio
                ClutchSlip = Work * LockRPM / zStall
            End If
        Else                                            'lock-up converter
            EngRPM(L) = 1.005 * LockRPM                 'assume 0.5% slippage
            ClutchSlip = LockRPM / EngRPM(L)
        End If
    End If
    If ClutchSlip > 1 Then ClutchSlip = 1
        
    Call TABY(xrpm(), yhp(), NHP, 1, EngRPM(L), HP) 'Patrick - 2nd order in QProRx
    HP = gc_HPTQMult.Value * HP / hpc
    HPSave = HP:    HP = HP * ClutchSlip
        
    Rem**  CALCULATE DRAG FORCES (FRICTION, VISCOUS AND AERODYNAMIC)    'Patrick - QProRx includes prevailing wind speed
    WindFPS = Sqr(Vel(L) ^ 2 + 2 * Vel(L) * (gc_WindSpeed.Value / Z5) * Cos(PI * gc_WindAngle.Value / 180) + (gc_WindSpeed.Value / Z5) ^ 2)
    q = Sgn(WindFPS) * rho * Abs(WindFPS) ^ 2 / (2 * gc)
    
    Rem **  increase frontal area based on tire growth (crude method! - check QProRxCode Patrick)
    If gc_BodyStyle.Value = 8 Then
        RefArea2 = gc_RefArea.Value + ((TireGrowth - 1) * TireDia / 2) * gc_TireWidth.Value / 144
    Else
        RefArea2 = gc_RefArea.Value + ((TireGrowth - 1) * TireDia / 2) * (2 * gc_TireWidth.Value) / 144
    End If
    
    DownForce = gc_Weight.Value + gc_LiftCoef.Value * RefArea2 * q
    cmu1 = CMU - (Dist0 / 1320) * CMUK
    DragForce = cmu1 * DownForce + 0.0001 * DownForce * (Z5 * Vel(L)) + gc_DragCoef.Value * RefArea2 * q
    DragHP = DragForce * Vel(L) / 550
        
    'calculate dynamic weight on front tires
    TireRadIn = 12 * TireCirFt / (2 * PI)
    'FRCT should really be variable at this point, getting closer to 1 downtrack
    deltaFWT = (Ags0 * gc_Weight.Value * ((gc_YCG.Value - TireRadIn) + (FRCT / gc_Efficiency.Value) * TireRadIn) + DragForce * gc_YCG.Value) / gc_Wheelbase.Value
    DynamicFWT = gc_StaticFWt.Value - deltaFWT
    
    'calculate wheelie bar weight
    WheelBarWT = 0
    If DynamicFWT < 0 Then
        'assume 64" wheelie bar as required to keep dynamic front weight = 0
        WheelBarWT = -DynamicFWT * gc_Wheelbase.Value / 64
        DynamicFWT = 0
    End If
    
    'calculate dynamic force on rear tires
    DynamicRWT = DownForce - DynamicFWT - WheelBarWT:   If DynamicRWT < 0 Then DynamicRWT = gc_Weight.Value
    'RWT(L) = dynamicRWT    'QProRxCode
    CRTF = CAXI * AX * TireDia * (gc_TireWidth.Value + 1) * (0.92 + 0.08 * (DynamicRWT / 1900) ^ 2.15)
    If gc_BodyStyle.Value = 8 Then CRTF = 0.5 * CRTF
    
    AMAX = ((CRTF / TireGrowth) - DragForce) / gc_Weight.Value
        
    'CALCULATE RESIDUAL HORSEPOWER AVAILABLE (limit to AMax)
    HP = HP * TGEff(iGear) * gc_Efficiency.Value / TireSlip
    HP = HP - DragHP
    PQWT = 550 * gc * HP / gc_Weight.Value:     AGS(L) = PQWT / (Vel(L) * gc)
    
    SLIP(L) = 0
    If AGS(L) > AMAX Then
        SLIP(L) = 1
        PQWT = PQWT * (AMAX - (AGS(L) - AMAX)) / AGS(L):    AGS(L) = AMAX - (AGS(L) - AMAX)
    End If
    If AGS(L) < AMin Then PQWT = PQWT * AMin / AGS(L):          AGS(L) = AMin
    time(L) = VelSqrd / (2 * PQWT) + Time0
    
    EngAccHP = gc_EnginePMI.Value * EngRPM(L) * (EngRPM(L) - RPM0)
    If EngAccHP < 0 Then
        If Not gc_TransType.Value Then
            EngAccHP = KP21 * EngAccHP
        Else
            EngAccHP = KP22 * EngAccHP
        End If
    End If
    
    ChasAccHP = ChassisPMI * DSRPM * (DSRPM - DSRPM0):          If ChasAccHP < 0 Then ChasAccHP = 0
    
    k = 0

280 Rem**  ITERATION TO CONVERGE INERTIA TRANSIENT check QProRxCode
    k = k + 1
    dtk1 = time(L) - Time0
    Work = (2 * PI / 60) ^ 2 / (12 * 550 * dtk1)
    HPEngPMI = EngAccHP * Work:    HPChasPMI = ChasAccHP * Work
    
    HP = (HPSave - HPEngPMI) * ClutchSlip
    HP = ((HP * TGEff(iGear) * gc_Efficiency.Value - HPChasPMI) / TireSlip) - DragHP
    PQWT = 550 * gc * HP / gc_Weight.Value
    AGS(L) = PQWT / (Vel(L) * gc)
    
    'steady iteration progress by using jerk limits
    Jerk = 0:   If dtk1 <> 0 Then Jerk = (AGS(L) - Ags0) / dtk1
    If Jerk < JMin Then Jerk = JMin:    AGS(L) = Ags0 + Jerk * dtk1:    PQWT = AGS(L) * gc * Vel(L)
    If Jerk > JMax Then Jerk = JMax:    AGS(L) = Ags0 + Jerk * dtk1:    PQWT = AGS(L) * gc * Vel(L)
    
    'and observe min/max Ags limits
    SLIP(L) = 0
    If AGS(L) > AMAX Then
        SLIP(L) = 1
        PQWT = PQWT * (AMAX - (AGS(L) - AMAX)) / AGS(L):    AGS(L) = AMAX - (AGS(L) - AMAX)
    End If
    If AGS(L) < AMin Then PQWT = PQWT * AMin / AGS(L):          AGS(L) = AMin
    
    time(L) = VelSqrd / (2 * PQWT) + Time0
    dtk2 = time(L) - Time0
    If k = 12 Or Abs(100 * (dtk2 - dtk1) / dtk2) <= 0.01 Then GoTo 300
    
    z = HP / HPSave
    If z < K6 Then z = K6
    If z > K61 Then z = K61
    time(L) = Time0 + dtk1 + z * (dtk2 - dtk1)
    GoTo 280

300 Rem**  CONVERGED VELOCITY STEP
    PrintFlag = 0
    Dist(L) = ((2 * PQWT * (time(L) - Time0) + Vel0 ^ 2) ^ 1.5 - Vel0 ^ 3) / (3 * PQWT) + Dist0
    
    Rem**  CHECK FOR SHIFT 2 TIME PRINT OR VELOCITY REVISION
    If ShiftFlag < 2 Then GoTo 330
    If Abs(Shift2PrintTime - time(L)) >= TimeTol Then
        Work = 2 * PQWT * (Shift2PrintTime - time(L)) + Vel(L) ^ 2  'QProRx
        If Work > 0 Then Vel(L) = Sqr(Work):    GoTo 270
    End If
    
    ASV(1) = time(L):   ASV(2) = Dist(L):       ASV(3) = Vel(L):  ASV(4) = AGS(L)
    ASV(5) = SLIP(L):   ASV(6) = EngRPM(L):     ASV(7) = Gear(L)
    doOpt

305 PrintFlag = 1:  GoTo 340

330 Rem**  CHECK FOR revised DISTANCE PRINT
    VelDistMatch = 0:   DistStep = Abs(DistToPrint(iDist) - Dist(L))
    If DistStep < DistTol And (DistStep / Vel(L)) < TimeTol Then
        PrintFlag = 1
        If iDist = 1 And gc_Rollout.Value = 0 Then PrintFlag = -1
        
        #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro only!
            If iDist = 5 Or iDist = 8 And ShiftFlag < 2 Then PrintFlag = -1
        #End If
    Else
        If Dist(L) > DistToPrint(iDist) Then
            Work = 3 * PQWT * (DistToPrint(iDist) - Dist(L)) + Vel(L) ^ 3
            If Work > 0 Then VelDistMatch = Work ^ (1 / 3)
            If Dist(L) > 1.05 * DistToPrint(9) Then GoTo 350    'special check to stop endless program execution
        End If
    End If
        
    Rem**  CHECK FOR revised TIME PRINT
    VelTimeMatch = 0
    If Abs(TimePrint - time(L)) < TimeTol Then
        PrintFlag = 1
    Else
        If time(L) > TimePrint Then
            Work = 2 * PQWT * (TimePrint - time(L)) + Vel(L) ^ 2
            If Work > 0 Then VelTimeMatch = Sqr(Work)
        End If
    End If
        
    Rem**  CHECK FOR revised SPEED MATCH PRINT
    VelMPHMatch = 0
    If iMPH <= 2 Then
        If Abs(MPHtoPrint(iMPH) - Vel(L)) < KV Then
            PrintFlag = 1
        Else
            If Vel(L) > MPHtoPrint(iMPH) Then VelMPHMatch = MPHtoPrint(iMPH)
        End If
    End If
        
    Rem**  CHECK FOR revised SHIFT 1 PRINT (top of gear change) - QProRx code to shift on time instead
    VelShiftMatch = 0
    If iGear < NGR Then
        If Abs(ShiftRPM(iGear) - EngRPM(L)) < ShiftRPMTol Then
            PrintFlag = 1
        Else
            If EngRPM(L) > ShiftRPM(iGear) Then VelShiftMatch = Vel(L) * ShiftRPM(iGear) / EngRPM(L)
        End If
    End If
        
    Rem**  CHECK FOR REQUIRED VELOCITY REVISIONS
    NextVel = Vel(L)
    If VelDistMatch > 0 And VelDistMatch < NextVel Then NextVel = VelDistMatch
    If VelTimeMatch > 0 And VelTimeMatch < NextVel Then NextVel = VelTimeMatch
    If VelMPHMatch > 0 And VelMPHMatch < NextVel Then NextVel = VelMPHMatch
    If VelShiftMatch > 0 And VelShiftMatch < NextVel Then NextVel = VelShiftMatch
    
    'Patrick - when NextVel = Vel0 or NextVel = Vel(l) program just accepts the
    'non-matched answer and presses on without printline - 10/04/03
    If NextVel > Vel0 And NextVel < Vel(L) Then Vel(L) = NextVel:   GoTo 270
    
    'set value of ShiftFlag
    If iGear < NGR And Abs(ShiftRPM(iGear) - EngRPM(L)) < ShiftRPMTol Then ShiftFlag = 1

340 Rem**  BOTTOM OF PRE-PRINT CHECKS, NOW CHECK FOR PRINTING
    If PrintFlag = 0 Then GoTo 240
    
    If PrintFlag = 1 Then
        If L = 1 Then
        'If L = 1 Or iDist = 9 Then    'Patrick - motorcyc.dat ix=9 problem - 01/22/03
            AddListLine
        Else
            Rem**  AVOID TWO LINES WITH SAME TIME DISPLAY
            If Abs(CInt(100 * time(L)) - CInt(100 * time(L - 1))) >= 1 Then
                Rem**  AVOID TWO LINES WITH SAME DISTANCE DISPLAY
                If Abs(CLng(Dist(L)) - CLng(Dist(L - 1))) >= 1 Then AddListLine
            End If
        End If
    End If
        
    Rem**  CHECK FOR Distance PRINT
    DistStep = Abs(DistToPrint(iDist) - Dist(L))
    If (DistStep < DistTol And (DistStep / Vel(L)) < TimeTol) Or (ShiftFlag = 2 And Dist(L) >= DistToPrint(iDist)) Then
        
        Select Case iDist
        #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro only!
            Case 1:     DistTol = 0.1    'reduced from .25 - 07/11/99
                        If gc_Rollout.Value > 0 Then time(L) = 0
                        Dist(L) = Dist(L) + ovradj    'adjust for front overhang
            Case 2:
            Case 3:     If ShiftFlag < 2 Then TIMESLIP(1) = time(L)
                        'special test for completing shift precisely at 60 ft - Patrick 12/12/05
                        If ShiftFlag = 2 And TIMESLIP(1) = 0 Then TIMESLIP(1) = time(L)
            Case 4:     If ShiftFlag < 2 Then TIMESLIP(2) = time(L)
                        DistTol = 0.008
            Case 5:     If ShiftFlag < 2 Or SaveTime = 0 Then SaveTime = time(L)
            Case 6:
                        If ShiftFlag < 2 Then
                            TIMESLIP(3) = time(L)
                            TIMESLIP(4) = Z5 * 66 / (TIMESLIP(3) - SaveTime)
                            SaveTime = 0
                        End If
            Case 7:     If ShiftFlag < 2 Then TIMESLIP(5) = time(L)
            Case 8:     If ShiftFlag < 2 Or SaveTime = 0 Then SaveTime = time(L)
            Case 9:
                        If ShiftFlag < 2 Then
                            TIMESLIP(6) = time(L)
                            TIMESLIP(7) = Z5 * 66 / (TIMESLIP(6) - SaveTime)
                            SaveTime = 0
                        End If
                        GoTo 350
        #Else                   'Bonneville Pro
            Case 3:     If ShiftFlag < 2 Then TIMESLIP(1) = Vel(L) * Z5
            Case 4:     If ShiftFlag < 2 Then TIMESLIP(2) = Vel(L) * Z5
            Case 5:     If ShiftFlag < 2 Then TIMESLIP(3) = Vel(L) * Z5
            Case 6:     If ShiftFlag < 2 Then TIMESLIP(4) = Vel(L) * Z5
            Case 7:     If ShiftFlag < 2 Then TIMESLIP(5) = Vel(L) * Z5
            Case 8:     If ShiftFlag < 2 Then TIMESLIP(6) = Vel(L) * Z5
            Case 9:     If ShiftFlag < 2 Then TIMESLIP(7) = Vel(L) * Z5
                        GoTo 350
        #End If
        End Select
        
        If PrintFlag <> -1 Then LAdd = 1
        iDist = iDist + 1
    End If
        
    Rem**  CHECK FOR PRINT TIME INCREMENT UPDATE
    If (Abs(TimePrint - time(L)) < TimeTol) Or (ShiftFlag = 2 And time(L) >= TimePrint) Then
        TimePrint = TimePrint + TimePrintInc:                   LAdd = 1
    End If
        
    Rem**  CHECK FOR SPEED MATCH
    If iMPH <= 2 Then
        If (Abs(MPHtoPrint(iMPH) - Vel(L)) < KV) Or (ShiftFlag = 2 And Vel(L) >= MPHtoPrint(iMPH)) Then
            iMPH = iMPH + 1:                                    LAdd = 1
        End If
    End If
        
    Rem**  CHECK FOR GEAR CHANGE
    If ShiftFlag = 1 Then ShiftFlag = 2:    iGear = iGear + 1:  LAdd = 1:        GoTo 230
    If ShiftFlag = 2 Then ShiftFlag = 0:                        LAdd = 1
        
    Rem**  BOTTOM OF POST PRINT CHECKS, CONTINUE DOWN TRACK
    GoTo 240

350 Rem *****  RUN COMPLETED, LOAD TIMESLIP DATA  *****
    tsv(0).caption = Now
    #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro only!
        Label1(1).caption = "60'"
        Label1(2).caption = "330'"
        Label1(3).caption = "660'"
        Label1(4).caption = "MPH"
        Label1(5).caption = "1000'"
        Label1(6).caption = "1/4"
        Label1(7).caption = "MPH"
        
        tsv(1).caption = Format(TIMESLIP(1), "##.00")
        tsv(2).caption = Format(TIMESLIP(2), "##.00")
        tsv(3).caption = Format(TIMESLIP(3), "##.00")
        tsv(4).caption = Format(TIMESLIP(4), "###.0")
        tsv(5).caption = Format(TIMESLIP(5), "##.00")
        tsv(6).caption = Format(TIMESLIP(6), "##.00")
        tsv(7).caption = Format(TIMESLIP(7), "###.0")
    #Else                   'Bonneville Pro
        For i = 1 To 7
            Label1(i).caption = Format(DistToPrint(i + 2) / 5280, "0.00")
            tsv(i).caption = Format(TIMESLIP(i), "###.0")
        Next
    #End If
    
    tsv(8).caption = Format(hpc, "#.000")
    
   'load all the graph data arrays now to save time later
    For i = GPH_TIME_RPM To GPH_DIST_G
        If i <> GPH_SEPARATOR Then frmTimeSlip.LoadGraph i
    Next
    
    CalcOutput = True

calcoutputexit:
    Timer1.Enabled = False
    If mTimer Then
        MsgBox "Something is seriously wrong with the input data!  The program is unable to complete the Timeslip calculations.  This problem usually results from a combination of large values for engine HP and/or transmission low gear ratio and/or final drive gear ratio . . . for the input tire rollout (or diameter) and/or tire width.  Please check the input data carefully.", vbExclamation, "Error: Input Data"
        SetRunEnabled True
    End If
End Function

Private Sub AddListLine(Optional newline As Variant)
Dim zr As Integer
Dim zigr As Single
Dim prtline As String * 80, zrRPM As String * 6
'Dim Ndot As Single     'eliminated Ndot - 03/13/03
    prtline = String(80, " ")
    zrRPM = String(6, " ")
    
    If IsMissing(newline) Then
        Work = Vel(L) * Z5
        zr = Round(EngRPM(L), 10)
        
        If iDist = 1 Then
            Mid(prtline, 2, 20) = RightAlign(4, 3, time(L)) & "/0.00 Rollout"
        Else
            Mid(prtline, 3, 6) = RightAlign(5, 2, time(L))
            
            #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro
                Mid(prtline, 13, 5) = RightAlign(5, 0, Dist(L))
            #Else                   'Bonneville Pro
                Mid(prtline, 14, 5) = RightAlign(4, 2, Dist(L) / 5280)
            #End If
            
            'Mid(prtline, 3, 7) = RightAlign(6, 4, t(L))  'debug
            'Mid(prtline, 11, 8) = RightAlign(7, 2, Dist(L)) 'debug
        End If
        
        Mid(prtline, 22, 5) = RightAlign(4, 1, Work)
        Mid(prtline, 32, 4) = RightAlign(3, 2, AGS(L))
        
        If SLIP(L) <> 0 Then
            If iGear < NGR Then Mid(prtline, 36, 3) = "(s)"
        End If
        
        zigr = iGear
        Mid(prtline, 42, 1) = RightAlign(1, 0, zigr)
        
        RSet zrRPM = Format(zr, "#,000")
        Mid(prtline, 45, 6) = zrRPM
    
        'Ndot = 0   'eliminated Ndot - 03/13/03
        'If L > 2 Then
        '    If Time(L) > Time(L - 1) Then Ndot = (EngRPM(L) - EngRPM(L - 1)) / (Time(L) - Time(L - 1))
        'End If
        'Ndot = Round(Ndot, 10)
        'If Ndot >= 0 Then
        '    Mid(prtline, 53, 5) = RightAlign(5, 0, Ndot)
        'Else
        '    Mid(prtline, 53, 5) = "  ---"
        'End If
    Else
        prtline = newline
    End If
    
    List1.AddItem prtline
End Sub

Public Sub LoadGraph(GraphIndex As Integer)
Dim i As Integer
    
    With gc_Graph(GraphIndex)
        .Points = L
        .Gtype = GraphIndex
    
        If .Points > 0 Then
            For i = 1 To .Points
                Select Case GraphIndex
                    Case GPH_TIME_RPM
                        .XValues(i) = time(i)
                        .YValues(i) = EngRPM(i)
                        .Y2Values(i) = Vel(i) * Z5
        
                    Case GPH_TIME_G
                        .XValues(i) = time(i)
                        .YValues(i) = AGS(i)
                        #If Not ISBVPRO Then                'QUARTERjr and QUARTER Pro
                            .Y2Values(i) = Dist(i)
                        #Else
                            .Y2Values(i) = Dist(i) / 5280   'Bonneville Pro
                        #End If
            
                    Case GPH_DIST_RPM
                        #If Not ISBVPRO Then                'QUARTERjr and QUARTER Pro
                            .XValues(i) = Dist(i)
                        #Else
                            .XValues(i) = Dist(i) / 5280    'Bonneville Pro
                        #End If
                        .YValues(i) = EngRPM(i)
                        .Y2Values(i) = Vel(i) * Z5
        
                    Case GPH_DIST_G
                        #If Not ISBVPRO Then                'QUARTERjr and QUARTER Pro
                            .XValues(i) = Dist(i)
                        #Else
                            .XValues(i) = Dist(i) / 5280    'Bonneville Pro
                        #End If
                        .YValues(i) = AGS(i)
                        .Y2Values(i) = time(i)
                End Select
            Next
        End If
    End With
End Sub

Private Sub Tire(TireGrowth As Single, TireCirFt As Single)
Dim TGK As Single, TGLinear As Single, TireSQ As Single
'Dim rsq As Single, cc As Single, cp As Single
    #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro
        TGK = (gc_TireWidth.Value ^ 1.4 + TireDia - 16) / (0.171 * TireDia ^ 1.7)
        TireGrowth = 1 + TGK * 0.0000135 * Vel(L) ^ 1.6
       'TGLinear = 1 + TGK * 0.000325 * Vel(L)
        TGLinear = 1 + TGK * 0.00035 * Vel(L)  '0.00035 works better based on Motown Missile
        If TGLinear < TireGrowth Then TireGrowth = TGLinear
    
        TireSQ = TireGrowth - 0.035 * Abs(Ags0) 'tire squat under load
        TireCirFt = TireSQ * TireDia * PI / 12
        
        'rsq = TireSQ / TireGrowth          'revised tire circumference model,
        'cc = Sqr(1 - rsq ^ 2)   'use only loaded radius - 07/21/01
        'cp = Sqr(cc ^ 2 + (1 - rsq) ^ 2)
        'TireCirFt = TireGrowth * TireDia * (PI - cp + cc) / 12
        
    #Else                   'Bonneville Pro
        TireGrowth = 1 + 0.00004 * Vel(L)
        TireCirFt = TireGrowth * TireDia * PI / 12
    #End If
End Sub

Private Sub sub310()     'DISTANCE INTERPOLATION
    factor = factor1
    time(L) = Time0 + factor * (ASV(1) - Time0)
    Dist(L) = DistToPrint(iDist)
    Vel(L) = Vel0 + factor * (ASV(3) - Vel0)
    
    Select Case iDist
    #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro
        Case 3:     TIMESLIP(1) = time(L)   '60 ft
        Case 4:     TIMESLIP(2) = time(L)   '330 ft
        Case 5:     SaveTime = time(L)      '594 ft
        Case 6:     TIMESLIP(3) = time(L)   '660 ft
                    TIMESLIP(4) = Z5 * 66 / (TIMESLIP(3) - SaveTime)
                    SaveTime = 0
        Case 7:     TIMESLIP(5) = time(L)   '1000 ft
        Case 8:     SaveTime = time(L)      '1254 ft
        Case 9:     TIMESLIP(6) = time(L)   '1320 ft
                    TIMESLIP(7) = Z5 * 66 / (TIMESLIP(6) - SaveTime)
                    SaveTime = 0
    #Else                   'Bonneville Pro
        Case 3:     TIMESLIP(1) = Vel(L) * Z5
        Case 4:     TIMESLIP(2) = Vel(L) * Z5
        Case 5:     TIMESLIP(3) = Vel(L) * Z5
        Case 6:     TIMESLIP(4) = Vel(L) * Z5
        Case 7:     TIMESLIP(5) = Vel(L) * Z5
        Case 8:     TIMESLIP(6) = Vel(L) * Z5
        Case 9:     TIMESLIP(7) = Vel(L) * Z5
    #End If
    End Select
    
    sub325
End Sub

Private Sub sub315()     'TIME INTERPOLATION
    factor = factor2
    time(L) = TimePrint
    Dist(L) = Dist0 + factor * (ASV(2) - Dist0)
    Vel(L) = Vel0 + factor * (ASV(3) - Vel0)
    sub325
End Sub

Private Sub sub320()     'VELOCITY INTERPOLATION
    factor = factor3
    time(L) = Time0 + factor * (ASV(1) - Time0)
    Dist(L) = Dist0 + factor * (ASV(2) - Dist0)
    Vel(L) = MPHtoPrint(iMPH)
    sub325
End Sub

Private Sub sub325()     'COMMON INTERPOLATION AND PRINT
    factor = factor ^ 0.7
    AGS(L) = Ags0 + factor * (ASV(4) - Ags0)
    
    SLIP(L) = 0
    If SLIP(L - 1) = 1 And ASV(5) = 1 Then SLIP(L) = 1
    
    EngRPM(L) = RPM0 + factor * (ASV(6) - RPM0)
    Gear(L) = ASV(7)
    
    If Dist(L) = DistToPrint(iDist) Then
        #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro
            If (iDist <> 5 And iDist <> 8) Or ShiftFlag = 2 Then AddListLine
        #Else                   'Bonneville Pro
            AddListLine
        #End If
    End If
    
    If iDist < 9 Then
        L = L + 1
        time(L) = ASV(1):  Dist(L) = ASV(2):  Vel(L) = ASV(3):  AGS(L) = ASV(4)
        SLIP(L) = ASV(5): EngRPM(L) = ASV(6):  Gear(L) = ASV(7)
    End If
End Sub

Public Sub doOpt()
    opt1 = 0:     opt2 = 0:     opt3 = 0
    
    If Dist(L) >= DistToPrint(iDist) + DistTol Then
        opt1 = 1
        factor1 = (DistToPrint(iDist) - Dist0) / (ASV(2) - Dist0)
        If factor1 <= 0 Or factor1 >= 1 Then factor1 = 0: opt1 = 0
    End If
    
    If time(L) >= TimePrint + TimeTol Then
        opt2 = 1
        factor2 = (TimePrint - Time0) / (ASV(1) - Time0)
        If factor2 <= 0 Or factor2 >= 1 Then factor2 = 0: opt2 = 0
    End If
    
    If iMPH <= 2 Then
        If Vel(L) >= MPHtoPrint(iMPH) + KV Then
            opt3 = 1
            factor3 = (MPHtoPrint(iMPH) - Vel0) / (ASV(3) - Vel0)
            If factor3 <= 0 Or factor3 >= 1 Then factor3 = 0: opt3 = 0
        End If
    End If
    
    opt = opt1 + opt2 + opt3
    
    Select Case opt
        Case 1
            If opt1 = 1 Then sub310
            If opt2 = 1 Then sub315
            If opt3 = 1 Then sub320
        
        Case 2
            If opt1 = 0 Then
                If factor2 = factor3 Then sub315
                If factor2 < factor3 Then sub315: sub320
                If factor2 > factor3 Then sub320: sub315
            ElseIf opt2 = 0 Then
                If factor1 = factor3 Then sub310
                If factor1 < factor3 Then sub310: sub320
                If factor1 > factor3 Then sub320: sub310
            ElseIf opt3 = 0 Then
                If factor1 = factor2 Then sub310
                If factor1 < factor2 Then sub310: sub315
                If factor1 > factor2 Then sub315: sub310
            End If
        
        Case 3
            If factor1 = factor2 And factor2 = factor3 Then
                sub310
            ElseIf factor1 < factor2 And factor1 < factor3 Then
                sub310
                If factor2 = factor3 Then sub315
                If factor2 < factor3 Then sub315: sub320
                If factor2 > factor3 Then sub320: sub315
            ElseIf factor2 < factor1 And factor2 < factor3 Then
                sub315
                If factor1 = factor3 Then sub310
                If factor1 < factor3 Then sub310: sub320
                If factor1 > factor3 Then sub320: sub310
            ElseIf factor3 < factor1 And factor3 < factor2 Then
                sub320
                If factor1 = factor2 Then sub310
                If factor1 < factor2 Then sub310: sub315
                If factor1 > factor2 Then sub315: sub310
            ElseIf factor1 = factor2 Then
                If factor1 < factor3 Then sub310: sub320
                If factor1 > factor3 Then sub320: sub310
            ElseIf factor1 = factor3 Or factor2 = factor3 Then
                If factor1 < factor2 Then sub310: sub315
                If factor1 > factor2 Then sub315: sub310
            End If
    
    End Select
End Sub

Private Sub ENGINE()
Dim N As Integer
Dim SX(16) As Single
Dim sY(80) As Single
Dim sz(5) As Single
Dim sYS(16) As Single
Dim TQPHP As Single
Dim TQ As Single
Dim TQR As Single
Dim HPCID As Single
    sz(1) = 0.7:   sz(2) = 1.2:    sz(3) = 1.7:    sz(4) = 2.5:    sz(5) = 3.4
    
    SX(1) = 0.25:  sY(1) = 0.53:   sY(17) = 0.365: sY(33) = 0.24:  sY(49) = 0.1:   sY(65) = 0
    SX(2) = 0.5:   sY(2) = 0.975:  sY(18) = 0.87:  sY(34) = 0.79:  sY(50) = 0.7:   sY(66) = 0.63
    SX(3) = 0.6:   sY(3) = 1.098:  sY(19) = 1.018: sY(35) = 0.96:  sY(51) = 0.894: sY(67) = 0.84
    SX(4) = 0.65:  sY(4) = 1.13:   sY(20) = 1.066: sY(36) = 1.023: sY(52) = 0.972: sY(68) = 0.924
    SX(5) = 0.7:   sY(5) = 1.152:  sY(21) = 1.11:  sY(37) = 1.08:  sY(53) = 1.04:  sY(69) = 1
    SX(6) = 0.75:  sY(6) = 1.16:   sY(22) = 1.129: sY(38) = 1.106: sY(54) = 1.08:  sY(70) = 1.055
    SX(7) = 0.8:   sY(7) = 1.153:  sY(23) = 1.132: sY(39) = 1.117: sY(55) = 1.096: sY(71) = 1.079
    SX(8) = 0.85:  sY(8) = 1.122:  sY(24) = 1.11:  sY(40) = 1.102: sY(56) = 1.09:  sY(72) = 1.082
    SX(9) = 0.9:   sY(9) = 1.086:  sY(25) = 1.079: sY(41) = 1.074: sY(57) = 1.069: sY(73) = 1.064
    SX(10) = 0.95: sY(10) = 1.045: sY(26) = 1.042: sY(42) = 1.04:  sY(58) = 1.037: sY(74) = 1.035
    SX(11) = 1:    sY(11) = 1:     sY(27) = 1:     sY(43) = 1:     sY(59) = 1:     sY(75) = 1
    SX(12) = 1.05: sY(12) = 0.938: sY(28) = 0.935: sY(44) = 0.932: sY(60) = 0.928: sY(76) = 0.923
    SX(13) = 1.1:  sY(13) = 0.865: sY(29) = 0.855: sY(45) = 0.845: sY(61) = 0.83:  sY(77) = 0.815
    SX(14) = 1.15: sY(14) = 0.795: sY(30) = 0.762: sY(46) = 0.736: sY(62) = 0.698: sY(78) = 0.662
    SX(15) = 1.2:  sY(15) = 0.72:  sY(31) = 0.66:  sY(47) = 0.612: sY(63) = 0.55:  sY(79) = 0.49
    SX(16) = 1.25: sY(16) = 0.63:  sY(32) = 0.54:  sY(48) = 0.474: sY(64) = 0.39:  sY(80) = 0.31
    
    sYS(1) = 0
    sYS(2) = 0.61
    sYS(3) = 0.8
    sYS(4) = 0.9
    sYS(5) = 0.98
    sYS(6) = 1.035
    sYS(7) = 1.055
    sYS(8) = 1.06
    sYS(9) = 1.05
    sYS(10) = 1.03
    sYS(11) = 1
    sYS(12) = 0.93
    sYS(13) = 0.85
    sYS(14) = 0.765
    sYS(15) = 0.67
    sYS(16) = 0.58
    
    TQPHP = Z6 * gc_PeakHP.Value / gc_RPMPeakHP.Value
    
    HPCID = (gc_PeakHP.Value / gc_Displacement.Value) / CalcWork
    If gc_FuelSystem.Value <= 5 Then    'naturally aspirated
        If HPCID < sz(1) Then HPCID = sz(1)
    Else                                'supercharged
        If HPCID < sz(2) Then HPCID = sz(2)
    End If
    If HPCID > sz(5) Then HPCID = sz(5)
    
    NHP = 16
    For N = 1 To NHP
        xrpm(N) = SX(N) * gc_RPMPeakHP.Value
        
        If gc_FuelSystem.Value = 8 Then 'supercharged nitro
            TQ = sYS(N) * TQPHP
        Else                            'everything else
            Call DTABY(SX(), sz(), sY(), NHP, 5, 1, 1, SX(N), HPCID, TQR)
            TQ = TQR * TQPHP
        End If
        
        yhp(N) = xrpm(N) * TQ / Z6
        ztq(N) = TQ
    Next
End Sub

Private Sub Timer1_Timer()
    mTimer = True
End Sub
