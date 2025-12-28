VERSION 5.00
Object = "{827E9F53-96A4-11CF-823E-000021570103}#1.0#0"; "GRAPHS32.OCX"
Begin VB.Form frmFlowDet 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "ENGINE Pro Intake Port Flow Details"
   ClientHeight    =   8070
   ClientLeft      =   45
   ClientTop       =   435
   ClientWidth     =   9255
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   8070
   ScaleWidth      =   9255
   StartUpPosition =   1  'CenterOwner
   Begin VB.Frame Frame2 
      Caption         =   "Camshaft Description"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1545
      Left            =   30
      TabIndex        =   29
      Top             =   1560
      Width           =   3090
      Begin VB.TextBox txtWSValveLift 
         Alignment       =   1  'Right Justify
         Height          =   285
         Left            =   2385
         TabIndex        =   2
         Text            =   "wsvl"
         Top             =   1155
         Width           =   600
      End
      Begin VB.TextBox txtWSInCamDur 
         Alignment       =   1  'Right Justify
         Height          =   285
         Left            =   2385
         TabIndex        =   0
         Text            =   "wsdur"
         Top             =   555
         Width           =   600
      End
      Begin VB.TextBox txtWSInLobeCL 
         Alignment       =   1  'Right Justify
         Height          =   285
         Left            =   2385
         TabIndex        =   1
         Text            =   "wsilc"
         Top             =   855
         Width           =   600
      End
      Begin VB.Label lblCam1Label 
         Caption         =   "Type:"
         Height          =   210
         Left            =   150
         TabIndex        =   34
         Top             =   300
         Width           =   390
      End
      Begin VB.Label lblCam2Label 
         Caption         =   "Intake Duration @ .050"" - deg"
         Height          =   210
         Left            =   150
         TabIndex        =   33
         Top             =   600
         Width           =   2160
      End
      Begin VB.Label lblCam3Label 
         Caption         =   "Intake Lobe Centerline - deg"
         Height          =   210
         Left            =   150
         TabIndex        =   32
         Top             =   900
         Width           =   2160
      End
      Begin VB.Label lblCam4Label 
         Caption         =   "Maximum Valve Lift - inch"
         Height          =   210
         Left            =   150
         TabIndex        =   31
         Top             =   1200
         Width           =   2160
      End
      Begin VB.Label lblCam1Value 
         BorderStyle     =   1  'Fixed Single
         Caption         =   "cam1"
         Height          =   255
         Left            =   630
         TabIndex        =   30
         Top             =   270
         Width           =   2340
      End
   End
   Begin VB.Frame Frame3 
      Caption         =   "Data @ x,xxx RPM - Peak HP"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   3615
      Left            =   3150
      TabIndex        =   6
      Top             =   0
      Width           =   6090
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
         Height          =   2760
         Left            =   1485
         TabIndex        =   7
         TabStop         =   0   'False
         ToolTipText     =   "click on one of the four engine rating points to change the detailed data"
         Top             =   795
         Width           =   4545
      End
      Begin VB.Label Label19 
         Caption         =   "ATDC  inch   sq in   FPM   CFM   FPS inH2O"
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
         Left            =   1635
         TabIndex        =   23
         Top             =   570
         Width           =   4455
      End
      Begin VB.Label lblFlow 
         Caption         =   "30 deg ABDC"
         Height          =   255
         Index           =   11
         Left            =   90
         TabIndex        =   22
         Top             =   3090
         Width           =   1380
      End
      Begin VB.Label lblFlow 
         Caption         =   "60 deg ATDC"
         Height          =   255
         Index           =   4
         Left            =   90
         TabIndex        =   21
         Top             =   1515
         Width           =   1380
      End
      Begin VB.Label lblFlow 
         Caption         =   "120 deg ATDC"
         Height          =   255
         Index           =   8
         Left            =   90
         TabIndex        =   20
         Top             =   2415
         Width           =   1380
      End
      Begin VB.Label Label4 
         Caption         =   "Event"
         BeginProperty Font 
            Name            =   "Courier New"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   -1  'True
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   255
         Left            =   360
         TabIndex        =   19
         Top             =   540
         Width           =   585
      End
      Begin VB.Label lblFlow 
         Caption         =   "150 deg ATDC"
         Height          =   255
         Index           =   9
         Left            =   90
         TabIndex        =   18
         Top             =   2640
         Width           =   1380
      End
      Begin VB.Label lblFlow 
         Caption         =   "90 degree"
         Height          =   255
         Index           =   6
         Left            =   90
         TabIndex        =   17
         Top             =   1965
         Width           =   1380
      End
      Begin VB.Label lblFlow 
         Caption         =   "30 deg ATDC"
         Height          =   255
         Index           =   3
         Left            =   90
         TabIndex        =   16
         Top             =   1290
         Width           =   1380
      End
      Begin VB.Label lblFlow 
         Caption         =   "IVC @ .050"""
         Height          =   255
         Index           =   12
         Left            =   90
         TabIndex        =   15
         Top             =   3315
         Width           =   1380
      End
      Begin VB.Label lblFlow 
         Caption         =   "BDC"
         Height          =   255
         Index           =   10
         Left            =   90
         TabIndex        =   14
         Top             =   2865
         Width           =   1380
      End
      Begin VB.Label lblFlow 
         Caption         =   "ILC - Max Lift"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   255
         Index           =   7
         Left            =   90
         TabIndex        =   13
         Top             =   2190
         Width           =   1380
      End
      Begin VB.Label lblFlow 
         Caption         =   "Max Piston FPM"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   255
         Index           =   5
         Left            =   90
         TabIndex        =   12
         Top             =   1740
         Width           =   1380
      End
      Begin VB.Label lblFlow 
         Caption         =   "TDC"
         Height          =   255
         Index           =   2
         Left            =   90
         TabIndex        =   11
         Top             =   1065
         Width           =   1380
      End
      Begin VB.Label lblFlow 
         Caption         =   "IVO @ .050"""
         Height          =   255
         Index           =   1
         Left            =   90
         TabIndex        =   10
         Top             =   840
         Width           =   1380
      End
      Begin VB.Label Label3 
         Caption         =   "deg   Lift   Area  Speed Demand  Vel  Test"
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
         Left            =   1635
         TabIndex        =   9
         Top             =   375
         Width           =   4455
      End
      Begin VB.Label Label2 
         Caption         =   "     Valve   Flow  Piston Flow   Flowbench"
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
         Left            =   1635
         TabIndex        =   8
         Top             =   195
         Width           =   4455
      End
   End
   Begin VB.Frame Frame1 
      Caption         =   "Piston Speed Summary"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1545
      Left            =   30
      TabIndex        =   3
      Top             =   0
      Width           =   3090
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
         Left            =   165
         TabIndex        =   4
         TabStop         =   0   'False
         ToolTipText     =   "click on one of the four engine rating points to change the detailed data"
         Top             =   480
         Width           =   2760
      End
      Begin VB.Label Label1 
         Caption         =   "Rating    RPM   Avg   Max"
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
         Left            =   225
         TabIndex        =   5
         Top             =   240
         Width           =   2730
      End
   End
   Begin GraphsLib.Graph gphFlowDet 
      Height          =   4425
      Left            =   30
      TabIndex        =   25
      TabStop         =   0   'False
      Top             =   3615
      Width           =   9195
      _Version        =   327680
      _ExtentX        =   16219
      _ExtentY        =   7805
      _StockProps     =   96
      BorderStyle     =   1
      AutoInc         =   0
      Background      =   "15~-1~-1~-1~-1~-1~-1"
      ColorData       =   "9~12"
      GraphType       =   6
      GridStyle       =   3
      NumSets         =   2
      OverlayColor    =   "10"
      OverlayGraph    =   2
      OverlayPattern  =   "3"
      OverlaySymbol   =   "0"
      XAxisPos        =   2
      XAxisStyle      =   2
      YAxisPos        =   "1~2"
      YAxisStyle      =   "2~2"
      OverlayTrendSets=   "0"
   End
   Begin VB.Label Label8 
      Alignment       =   2  'Center
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
      ForeColor       =   &H00000000&
      Height          =   240
      Left            =   2175
      TabIndex        =   28
      Top             =   3345
      Width           =   915
   End
   Begin VB.Label Label7 
      Alignment       =   2  'Center
      Caption         =   "Flowbench Velocity"
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
      Left            =   105
      TabIndex        =   27
      Top             =   3345
      Width           =   2025
   End
   Begin VB.Label Label6 
      Alignment       =   2  'Center
      Caption         =   "Piston Demand &&"
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
      Left            =   1275
      TabIndex        =   26
      Top             =   3120
      Width           =   1800
   End
   Begin VB.Label Label5 
      Alignment       =   2  'Center
      Caption         =   "Flow Area,"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      ForeColor       =   &H0000C000&
      Height          =   240
      Left            =   105
      TabIndex        =   24
      Top             =   3120
      Width           =   1110
   End
End
Attribute VB_Name = "frmFlowDet"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Private Sub Form_Load()
Dim ivd As Single
Dim work As Single
    With gc_WSInCamDur
        .HasMinMax = True
        .IsCalc = True:         .Value = gc_InCamDur.Value
        .MinVal = .Value - 8:   .MaxVal = .Value + 8
    End With
    
    With gc_WSInLobeCL
        .HasMinMax = True
        .IsCalc = True:         .Value = gc_InLobeCL.Value
        .MinVal = .Value - 4:   .MaxVal = .Value + 4
    End With
    
    With gc_WSValveLift
        .AllowDecimals = True:  .DecimalPlaces = 3
        .HasMinMax = True
        
        'make sure intake valve lift has reasonable value if no flowbench data
        If gc_IntLift(0).Value = 0 Then
            ivd = gc_ValveDia.Value:    If Not gc_ValveDia.Inches Then ivd = ivd / ZM
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
            If gc_ValveLift.Value < work * ivd Then
                gc_ValveLift.Value = RoundUp(work * ivd, 0.05)
            End If
        End If
        
        .IsCalc = True:         .Value = gc_ValveLift.Value
        .MinVal = .Value - 0.1: If .MinVal < gc_ValveLift.MinVal Then .MinVal = gc_ValveLift.MinVal
        .MaxVal = .Value + 0.1: If .MaxVal > gc_ValveLift.MaxVal Then .MaxVal = gc_ValveLift.MaxVal
    End With
    
    SetRatingRPMs
    LoadlbxRating
    lbxRating.ListIndex = 1
    
    lblCam1Value.caption = AddAmpersand(gc_CamType.List(gc_CamType.Value))
    
    txtWSInCamDur.Text = gc_WSInCamDur.Formatted:   txtWSInCamDur.SelLength = Len(txtWSInCamDur.Text)
    txtWSInLobeCL.Text = gc_WSInLobeCL.Formatted:   txtWSInLobeCL.SelLength = Len(txtWSInLobeCL.Text)
    txtWSValveLift.Text = gc_WSValveLift.Formatted: txtWSValveLift.SelLength = Len(txtWSValveLift.Text)
End Sub

Private Sub Form_Unload(Cancel As Integer)
    'on Unload, set values back to original for use on the other forms
    gc_WSInCamDur.Value = gc_InCamDur.Value
    gc_WSInLobeCL.Value = gc_InLobeCL.Value
    gc_WSValveLift.Value = gc_ValveLift.Value
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
            LoadFlowData .ListIndex + 1
            MousePointer = vbDefault
        End If
    End With
End Sub

Private Sub LoadFlowData(Index As Integer)
Dim i As Integer
    If lbxData.Listcount > 0 Then lbxData.Clear
    
    gc_Detail.CalcFlowDetails Index
    Frame3.caption = gc_Detail.Headings(1)
    
    For i = 1 To 12
        lbxData.AddItem gc_Detail.DataFlow(i)
    Next
End Sub


'Private Sub txtWSInCamDur_GotFocus()
'    setpanels Me, PNL_SAVE, gc_WSInCamDur
'End Sub

Private Sub txtWSInCamDur_KeyPress(KeyAscii As Integer)
    gc_WSInCamDur.TestNumericKeyPress KeyAscii, txtWSInCamDur
    If KeyAscii = vbKeyReturn Then
        txtWSInCamDur_LostFocus
        txtWSInCamDur.SelLength = Len(txtWSInCamDur.Text)
    End If
End Sub

Private Sub txtWSInCamDur_LostFocus()
    txtWSInCamDur.Text = Str(Round(val(txtWSInCamDur.Text), 2))
    With gc_WSInCamDur
        .Value = val(txtWSInCamDur.Text)
        txtWSInCamDur.Text = .Formatted
        txtWSInCamDur.SelLength = Len(txtWSInCamDur.Text)
    
        If .IsChanged Then
            lbxRating_Click
            .IsChanged = False
            If .IsError Then txtWSInCamDur.SetFocus
        End If
    End With
End Sub

'Private Sub txtWSInCamDur_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
'    setpanels Me, PNL_SET, gc_WSInCamDur
'End Sub


'Private Sub txtWSInLobeCL_GotFocus()
'    setpanels Me, PNL_SAVE, gc_WSInLobeCL
'End Sub

Private Sub txtWSInLobeCL_KeyPress(KeyAscii As Integer)
    gc_WSInLobeCL.TestNumericKeyPress KeyAscii, txtWSInLobeCL
    If KeyAscii = vbKeyReturn Then
        txtWSInLobeCL_LostFocus
        txtWSInLobeCL.SelLength = Len(txtWSInLobeCL.Text)
    End If
End Sub

Private Sub txtWSInLobeCL_LostFocus()
    With gc_WSInLobeCL
        .Value = val(txtWSInLobeCL.Text)
        txtWSInLobeCL.Text = .Formatted
        txtWSInLobeCL.SelLength = Len(txtWSInLobeCL.Text)
    
        If .IsChanged Then
            lbxRating_Click
            .IsChanged = False
            If .IsError Then txtWSInLobeCL.SetFocus
        End If
    End With
End Sub

'Private Sub txtWSInLobeCL_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
'    setpanels Me, PNL_SET, gc_WSInLobeCL
'End Sub


'Private Sub txtWSValveLift_GotFocus()
'    setpanels Me, PNL_SAVE, gc_WSValveLift
'End Sub

Private Sub txtWSValveLift_KeyPress(KeyAscii As Integer)
    gc_WSValveLift.TestNumericKeyPress KeyAscii, txtWSValveLift
    If KeyAscii = vbKeyReturn Then
        txtWSValveLift_LostFocus
        txtWSValveLift.SelLength = Len(txtWSValveLift.Text)
    End If
End Sub

Private Sub txtWSValveLift_LostFocus()
    txtWSValveLift.Text = Str(Round(val(txtWSValveLift.Text), 0.01))
    With gc_WSValveLift
        .Value = val(txtWSValveLift.Text)
        txtWSValveLift.Text = .Formatted
        txtWSValveLift.SelLength = Len(txtWSValveLift.Text)
    
        If .IsChanged Then
            lbxRating_Click
            .IsChanged = False
            If .IsError Then txtWSValveLift.SetFocus
        End If
    End With
End Sub

'Private Sub txtWSValveLift_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
'    setpanels Me, PNL_SET, gc_WSValveLift
'End Sub
