VERSION 5.00
Begin VB.Form frmPolarTires 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   " Polar Moment of Inertia Worksheet"
   ClientHeight    =   2250
   ClientLeft      =   2310
   ClientTop       =   2640
   ClientWidth     =   4860
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   2250
   ScaleWidth      =   4860
   ShowInTaskbar   =   0   'False
   Begin VB.TextBox txtTireWt 
      Height          =   285
      Left            =   3300
      MaxLength       =   7
      TabIndex        =   0
      Top             =   75
      Width           =   540
   End
   Begin VB.TextBox txtWSTireDia 
      Height          =   285
      Left            =   3300
      MaxLength       =   7
      TabIndex        =   1
      Top             =   375
      Width           =   540
   End
   Begin VB.TextBox txtWheelWt 
      Height          =   285
      Left            =   3300
      MaxLength       =   7
      TabIndex        =   2
      Top             =   675
      Width           =   540
   End
   Begin VB.TextBox txtWheelDia 
      Height          =   285
      Left            =   3300
      MaxLength       =   7
      TabIndex        =   3
      Top             =   975
      Width           =   540
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00FFFFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(2)"
      Height          =   420
      Index           =   2
      Left            =   3870
      TabIndex        =   12
      Top             =   1710
      Width           =   900
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00FFFFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(1)"
      Height          =   420
      Index           =   1
      Left            =   2940
      TabIndex        =   11
      Top             =   1710
      Width           =   900
   End
   Begin VB.Label lblHELP 
      BackColor       =   &H00FFFFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(0)"
      Height          =   420
      Index           =   0
      Left            =   60
      TabIndex        =   10
      Top             =   1710
      Width           =   2805
   End
   Begin VB.Label lbl 
      Caption         =   "Tire Weight"
      Height          =   195
      Index           =   4
      Left            =   900
      TabIndex        =   9
      Top             =   120
      Width           =   2400
   End
   Begin VB.Label lbl 
      Caption         =   "Tire Diameter"
      Height          =   195
      Index           =   0
      Left            =   900
      TabIndex        =   5
      Top             =   420
      Width           =   2400
   End
   Begin VB.Label lbl 
      Caption         =   "Wheel Weight"
      Height          =   195
      Index           =   1
      Left            =   900
      TabIndex        =   6
      Top             =   720
      Width           =   2400
   End
   Begin VB.Label lbl 
      Caption         =   "Wheel Diameter"
      Height          =   195
      Index           =   5
      Left            =   900
      TabIndex        =   4
      Top             =   1020
      Width           =   2400
   End
   Begin VB.Label lbl 
      Alignment       =   1  'Right Justify
      BackColor       =   &H00FFFFFF&
      BackStyle       =   0  'Transparent
      BorderStyle     =   1  'Fixed Single
      Caption         =   "0"
      Height          =   285
      Index           =   3
      Left            =   3300
      TabIndex        =   8
      Top             =   1380
      Width           =   540
   End
   Begin VB.Label lbl 
      Caption         =   "Polar Moment of Inertia ="
      Height          =   195
      Index           =   2
      Left            =   900
      TabIndex        =   7
      Top             =   1410
      Width           =   2400
   End
   Begin VB.Line line1 
      BorderColor     =   &H00000000&
      X1              =   900
      X2              =   3825
      Y1              =   1320
      Y2              =   1320
   End
End
Attribute VB_Name = "frmPolarTires"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Public fc_TiresPMI As New CValue
Public fc_Value As Object
Private bFileDirty As Boolean

Private Sub Form_Activate()
    fc_TiresPMI.Value = CalcPMI()
End Sub

Private Sub Form_Load()
    Me.Move 3690, 3270
    Set fc_Value = gc_TiresPMI
    
    fc_TiresPMI.AllowDecimals = True
    fc_TiresPMI.DecimalPlaces_Normal = 1
    fc_TiresPMI.UOM = UOM_NORMAL
    fc_TiresPMI.StatusMsg = "The estimated Polar Moment of Inertia for the final drive components."
    
    gc_TireWt.Labelctl = Me.lbl(4)
    gc_WSTireDia.Labelctl = Me.lbl(0)
    gc_WheelWt.Labelctl = Me.lbl(1)
    gc_WheelDia.Labelctl = Me.lbl(5)
    
    gc_TireWt.ClsControl = txtTireWt
    gc_WSTireDia.ClsControl = txtWSTireDia
    gc_WheelWt.ClsControl = txtWheelWt
    gc_WheelDia.ClsControl = txtWheelDia
    
    fc_TiresPMI.Labelctl = Me.lbl(2)
    fc_TiresPMI.ClsControl = Me.lbl(3)
    fc_TiresPMI.Value = CalcPMI()
End Sub

Private Sub Form_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub Form_Unload(Cancel As Integer)
    gc_TireWt.Labelctl = Nothing
    gc_WSTireDia.Labelctl = Nothing
    gc_WheelWt.Labelctl = Nothing
    gc_WheelDia.Labelctl = Nothing
    
    gc_TireWt.ClsControl = Nothing
    gc_WSTireDia.ClsControl = Nothing
    gc_WheelWt.ClsControl = Nothing
    gc_WheelDia.ClsControl = Nothing
    
    fc_TiresPMI.Labelctl = Nothing
    fc_TiresPMI.ClsControl = Nothing
End Sub

Private Sub lbl_DblClick(index As Integer)
    If index = 3 Then
        gc_TiresPMI.Value = val(lbl(3).caption)
        Unload Me
    End If
End Sub

Private Sub lbl_MouseMove(index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    If index = 3 Then SetHelp Me, HELP_SET, fc_TiresPMI
End Sub


Private Sub txtTireWt_GotFocus()
    SetHelp Me, HELP_SAVE, gc_TireWt
End Sub

Private Sub txtTireWt_KeyPress(KeyAscii As Integer)
    gc_TireWt.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_TiresPMI.Value = CalcPMI()
End Sub

Private Sub txtTireWt_LostFocus()
    gc_TireWt.Value = val(txtTireWt.Text)
    fc_TiresPMI.Value = CalcPMI()
End Sub

Private Sub txtTireWt_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TireWt
End Sub


Private Sub txtWSTireDia_GotFocus()
    SetHelp Me, HELP_SAVE, gc_WSTireDia
End Sub

Private Sub txtWSTireDia_KeyPress(KeyAscii As Integer)
    gc_WSTireDia.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtWSTireDia_Check
End Sub

Private Sub txtWSTireDia_LostFocus()
    gc_WSTireDia.Value = val(txtWSTireDia.Text)
    txtWSTireDia_Check
End Sub

Private Sub txtWSTireDia_Check()
    fc_TiresPMI.Value = CalcPMI()
    SetWSTireDiaStrings
End Sub

Private Sub txtWSTireDia_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_WSTireDia
End Sub


Private Sub txtWheelWt_GotFocus()
    SetHelp Me, HELP_SAVE, gc_WheelWt
End Sub

Private Sub txtWheelWt_KeyPress(KeyAscii As Integer)
    gc_WheelWt.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_TiresPMI.Value = CalcPMI()
End Sub

Private Sub txtWheelWt_LostFocus()
    gc_WheelWt.Value = val(txtWheelWt.Text)
    fc_TiresPMI.Value = CalcPMI()
End Sub

Private Sub txtWheelWt_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_WheelWt
End Sub


Private Sub txtWheelDia_GotFocus()
    SetHelp Me, HELP_SAVE, gc_WheelDia
End Sub

Private Sub txtWheelDia_KeyPress(KeyAscii As Integer)
    gc_WheelDia.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_TiresPMI.Value = CalcPMI()
End Sub

Private Sub txtWheelDia_LostFocus()
    gc_WheelDia.Value = val(txtWheelDia.Text)
    fc_TiresPMI.Value = CalcPMI()
End Sub

Private Sub txtWheelDia_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_WheelDia
End Sub


Private Function CalcPMI() As String
Dim ntires As Integer
Dim Work As Single
Dim ztd As Single
    ntires = 2:     If gc_BodyStyle.Value = 8 Then ntires = 1
    
    If gc_WSTireDia.UOM = UOM_NORMAL Then
        ztd = gc_WSTireDia.Value
    Else
        ztd = gc_WSTireDia.Value / PI
    End If
    
    Work = ntires * (0.8 * gc_TireWt.Value * (ztd / 2) ^ 2 + 0.75 * gc_WheelWt.Value * (0.93 * gc_WheelDia.Value / 2) ^ 2) / 386
    Work = 1.15 * Work      'account for misc rear end and front wheel and tire parts
    
    CalcPMI = Round(Work, 0.1)
End Function

Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
