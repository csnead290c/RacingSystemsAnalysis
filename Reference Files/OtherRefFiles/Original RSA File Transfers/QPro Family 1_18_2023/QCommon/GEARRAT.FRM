VERSION 5.00
Begin VB.Form frmGearRatio 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   " Motorcycle Final Drive Ratio Worksheet"
   ClientHeight    =   1935
   ClientLeft      =   2295
   ClientTop       =   2700
   ClientWidth     =   4560
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   1935
   ScaleWidth      =   4560
   ShowInTaskbar   =   0   'False
   Begin VB.TextBox txtRearWheel 
      Height          =   285
      Left            =   3000
      MaxLength       =   7
      TabIndex        =   2
      Top             =   675
      Width           =   540
   End
   Begin VB.TextBox txtCountershaft 
      Height          =   285
      Left            =   3000
      MaxLength       =   7
      TabIndex        =   1
      Top             =   375
      Width           =   540
   End
   Begin VB.TextBox txtPrimary 
      Height          =   285
      Left            =   3000
      MaxLength       =   7
      TabIndex        =   0
      Top             =   75
      Width           =   540
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00FFFFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(2)"
      Height          =   420
      Index           =   2
      Left            =   3630
      TabIndex        =   10
      Top             =   1410
      Width           =   900
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00FFFFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(1)"
      Height          =   420
      Index           =   1
      Left            =   2700
      TabIndex        =   9
      Top             =   1410
      Width           =   900
   End
   Begin VB.Label lblHELP 
      BackColor       =   &H00FFFFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(0)"
      Height          =   420
      Index           =   0
      Left            =   30
      TabIndex        =   8
      Top             =   1410
      Width           =   2640
   End
   Begin VB.Label lbl 
      Caption         =   "Rear Wheel Sprocket Teeth"
      Height          =   195
      Index           =   4
      Left            =   600
      TabIndex        =   7
      Top             =   720
      Width           =   2340
   End
   Begin VB.Label lbl 
      Alignment       =   1  'Right Justify
      BackColor       =   &H00FFFFFF&
      BackStyle       =   0  'Transparent
      BorderStyle     =   1  'Fixed Single
      Caption         =   "0"
      Height          =   285
      Index           =   3
      Left            =   3000
      TabIndex        =   6
      Top             =   1080
      Width           =   540
   End
   Begin VB.Line line1 
      BorderColor     =   &H00000000&
      X1              =   600
      X2              =   3525
      Y1              =   1020
      Y2              =   1020
   End
   Begin VB.Label lbl 
      Caption         =   "Final Drive Ratio ="
      Height          =   195
      Index           =   2
      Left            =   600
      TabIndex        =   5
      Top             =   1110
      Width           =   2340
   End
   Begin VB.Label lbl 
      Caption         =   "Countershaft Sprocket Teeth"
      Height          =   195
      Index           =   1
      Left            =   600
      TabIndex        =   4
      Top             =   420
      Width           =   2340
   End
   Begin VB.Label lbl 
      Caption         =   "Primary Drive Speed Reduction"
      Height          =   195
      Index           =   0
      Left            =   600
      TabIndex        =   3
      Top             =   120
      Width           =   2340
   End
End
Attribute VB_Name = "frmGearRatio"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit
Option Compare Text

Public fc_GearRatio As New CValue
Public fc_Value As Object
Private bFileDirty As Boolean

Private Sub Form_Activate()
    fc_GearRatio.Value = CalcGearRatio()
End Sub

Private Sub Form_Load()
    Me.Move 3000, 2700
    Set fc_Value = gc_GearRatio
    
    fc_GearRatio.AllowDecimals = True
    fc_GearRatio.DecimalPlaces_Normal = 2
    fc_GearRatio.UOM = UOM_NORMAL
    fc_GearRatio.StatusMsg = "The calculated overall final drive ratio."
    
    gc_Primary.Labelctl = Me.lbl(0)
    gc_Countershaft.Labelctl = Me.lbl(1)
    gc_RearWheel.Labelctl = Me.lbl(4)
    
    gc_Primary.ClsControl = txtPrimary
    gc_Countershaft.ClsControl = txtCountershaft
    gc_RearWheel.ClsControl = txtRearWheel
    
    fc_GearRatio.Labelctl = Me.lbl(2)
    fc_GearRatio.ClsControl = Me.lbl(3)
    fc_GearRatio.Value = CalcGearRatio()
End Sub

Private Sub Form_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub lbl_DblClick(index As Integer)
    If index = 3 Then
        gc_GearRatio.Value = val(lbl(3).caption)
        Unload Me
    End If
End Sub

Private Sub lbl_MouseMove(index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    If index = 3 Then SetHelp Me, HELP_SET, fc_GearRatio
End Sub


Private Sub txtPrimary_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Primary
End Sub

Private Sub txtPrimary_KeyPress(KeyAscii As Integer)
    gc_Primary.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_GearRatio.Value = CalcGearRatio()
End Sub

Private Sub txtPrimary_LostFocus()
    gc_Primary.Value = val(txtPrimary.Text)
    fc_GearRatio.Value = CalcGearRatio()
End Sub

Private Sub txtPrimary_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Primary
End Sub


Private Sub txtCountershaft_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Countershaft
End Sub

Private Sub txtCountershaft_KeyPress(KeyAscii As Integer)
    gc_Countershaft.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_GearRatio.Value = CalcGearRatio()
End Sub

Private Sub txtCountershaft_LostFocus()
    gc_Countershaft.Value = val(txtCountershaft.Text)
    fc_GearRatio.Value = CalcGearRatio()
End Sub

Private Sub txtCountershaft_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Countershaft
End Sub


Private Sub txtRearWheel_GotFocus()
    SetHelp Me, HELP_SAVE, gc_RearWheel
End Sub

Private Sub txtRearWheel_KeyPress(KeyAscii As Integer)
    gc_RearWheel.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_GearRatio.Value = CalcGearRatio()
End Sub

Private Sub txtRearWheel_LostFocus()
    gc_RearWheel.Value = val(txtRearWheel.Text)
    fc_GearRatio.Value = CalcGearRatio()
End Sub

Private Sub txtRearWheel_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_RearWheel
End Sub


Private Function CalcGearRatio() As String
Dim Work As Single
    Work = 0
    If gc_Countershaft.Value > 0 Then Work = gc_RearWheel.Value * gc_Primary.Value / gc_Countershaft.Value
    CalcGearRatio = Round(Work, 0.01)
End Function

Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
