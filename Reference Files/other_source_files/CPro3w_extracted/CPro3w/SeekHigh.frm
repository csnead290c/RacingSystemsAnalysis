VERSION 5.00
Begin VB.Form frmSeekHigh 
   BorderStyle     =   4  'Fixed ToolWindow
   Caption         =   "Select: High Gear Lockup RPM"
   ClientHeight    =   1095
   ClientLeft      =   8115
   ClientTop       =   7005
   ClientWidth     =   2970
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   1095
   ScaleWidth      =   2970
   ShowInTaskbar   =   0   'False
   Begin VB.TextBox txtRPM 
      Alignment       =   1  'Right Justify
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   360
      Left            =   2250
      MaxLength       =   5
      TabIndex        =   1
      Text            =   "RPM"
      ToolTipText     =   "Enter you desired High Gear Lockup RPM"
      Top             =   60
      Width           =   630
   End
   Begin VB.CommandButton cmdCWT 
      Caption         =   "Counter Weight"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   540
      Left            =   90
      TabIndex        =   2
      Top             =   465
      Width           =   900
   End
   Begin VB.CommandButton cmdLBS 
      Caption         =   "Static"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   540
      Left            =   1035
      TabIndex        =   3
      Top             =   465
      Width           =   900
   End
   Begin VB.CommandButton cmdRPM 
      Caption         =   "Launch RPM"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   540
      Left            =   1980
      TabIndex        =   4
      Top             =   465
      Width           =   900
   End
   Begin VB.Label Label1 
      Caption         =   "High Gear Lockup RPM"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   240
      Left            =   120
      TabIndex        =   0
      Top             =   105
      Width           =   2115
   End
End
Attribute VB_Name = "frmSeekHigh"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Private XJ(1 To 8)
Private XJ1 As Single
Private XJ2 As Single
Private XJ3 As Single
Private XJ4 As Single
Private XJMAX As Integer
Private HUNTName As String
Private TOLJ As Single
Private ER As Single
Private IGO As Integer

Private bFileDirty As Boolean

Private Sub Form_Load()
    'set up generic information for HUNT iterations
    XJ(1) = 0:  XJ1 = 0:    XJ3 = XJ1:  XJMAX = 20: TOLJ = 20
    
    'If Not isBike and Not isGlide Then
    '    cmdRPM.Visible = True
    'Else
        cmdRPM.Visible = False  'always not visible for SeekHigh
    'End If
    
    With gc_SeekHiRPM
        .ClsControl = txtRPM
        .MinVal = RoundDown(RPM(1), 20)
        .MaxVal = RoundUp(RPM(NTQ), 20)
    End With
    
    txtRPM_Check
    SelTextBoxText txtRPM
End Sub

Private Sub Form_Unload(Cancel As Integer)
    gc_SeekHiRPM.ClsControl = Nothing
End Sub


Private Sub txtRPM_KeyPress(KeyAscii As Integer)
    gc_SeekHiRPM.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtRPM_Check
End Sub

Private Sub txtRPM_LostFocus()
    gc_SeekHiRPM.Value = val(txtRPM.Text)
    txtRPM_Check
End Sub

Private Sub txtRPM_Check()
    With gc_SeekHiRPM
        .Value = Round(.Value, 20)
        txtRPM.Text = .Value
    End With
End Sub


Private Sub cmdCWT_Click()
Dim CWT As Single
    'set up specific information for HUNT iteration
    XJ2 = -1:   XJ4 = -XJ2: HUNTName = "SeekCWT"
    CWT = gc_CWt1.Value
    
100 gc_CWt1.Value = CWT
    gc_TCWt1.Value = gc_NArm1.Value * gc_CWt1.Value
    ClutchCalc
    ER = gc_SeekHiRPM.Value - val(frmClutch.Label7.caption)
                 
    'find the CWT that gives the desired Low Gear Lockup RPM value (i.e. ER = 0)
    Call HUNT(CWT, ER, XJ1, XJ2, XJ3, XJ4, TOLJ, XJMAX, XJ(), IGO, HUNTName)
    If IGO = 1 Then GoTo 100
    
    gc_CWt1.Value = Round(gc_CWt1.Value, 0.1)
    gc_TCWt1.Value = gc_NArm1.Value * gc_CWt1.Value
    ClutchCalc
    
    Unload Me
    frmClutch.txtTCWt1.SetFocus
End Sub

Private Sub cmdLBS_Click()
Dim LBS As Single
Dim iround As Single
    'set up specific information for HUNT iteration
    XJ2 = -50:  XJ4 = -XJ2: HUNTName = "SeekLBS"
    LBS = gc_Static.Value
    
100 gc_Static.Value = LBS
    ClutchCalc
    If isBike Then LBS = gc_Static.Value    'in case of Min Static Recommendation reset
    ER = gc_SeekHiRPM.Value - val(frmClutch.Label7.caption)
                 
    'find the Static that gives the desired Low Gear Lockup RPM value (i.e. ER = 0)
    Call HUNT(LBS, ER, XJ1, XJ2, XJ3, XJ4, TOLJ, XJMAX, XJ(), IGO, HUNTName)
    If IGO = 1 Then GoTo 100
    
    iround = IIf(isBike, 1, 2)  'tighter than normal to force better match
    gc_Static.Value = Round(gc_Static.Value, iround)
    ClutchCalc
    
    Unload Me
    frmClutch.txtStatic.SetFocus
End Sub

Private Sub cmdRPM_Click()
Dim RPM As Single
    'set up specific information for HUNT iteration
    XJ2 = -100: XJ4 = -XJ2: HUNTName = "SeekRPM"
    RPM = gc_LaunchRPM.Value
    
100 gc_LaunchRPM.Value = RPM
    ClutchCalc
    ER = gc_SeekHiRPM.Value - val(frmClutch.Label7.caption)
                 
    'find the Launch RPM that gives the desired Low Gear Lockup RPM value (i.e. ER = 0)
    Call HUNT(RPM, ER, XJ1, XJ2, XJ3, XJ4, TOLJ, XJMAX, XJ(), IGO, HUNTName)
    If IGO = 1 Then GoTo 100
    
    gc_LaunchRPM.Value = Round(gc_LaunchRPM.Value, 20)
    ClutchCalc
    
    Unload Me
    frmClutch.txtLaunchRPM.SetFocus
End Sub


Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
