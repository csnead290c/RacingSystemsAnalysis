VERSION 5.00
Begin VB.Form frmPolarTrans 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   " Polar Moment of Inertia Worksheet"
   ClientHeight    =   1890
   ClientLeft      =   1770
   ClientTop       =   2730
   ClientWidth     =   5355
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   1890
   ScaleWidth      =   5355
   ShowInTaskbar   =   0   'False
   Begin VB.ComboBox cbxWSTransType 
      Height          =   315
      Left            =   2265
      Style           =   2  'Dropdown List
      TabIndex        =   0
      Top             =   75
      Width           =   1995
   End
   Begin VB.TextBox txtCaseDia 
      Height          =   285
      Left            =   3720
      MaxLength       =   7
      TabIndex        =   2
      Top             =   675
      Width           =   540
   End
   Begin VB.TextBox txtTransWt 
      Height          =   285
      Left            =   3720
      MaxLength       =   7
      TabIndex        =   1
      Top             =   375
      Width           =   540
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00FFFFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(2)"
      Height          =   420
      Index           =   2
      Left            =   4440
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
      Left            =   3510
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
      Width           =   3450
   End
   Begin VB.Label lbl 
      Caption         =   "Case Diameter"
      Height          =   195
      Index           =   4
      Left            =   855
      TabIndex        =   7
      Top             =   720
      Width           =   2655
   End
   Begin VB.Label lbl 
      Alignment       =   1  'Right Justify
      BackColor       =   &H00FFFFFF&
      BackStyle       =   0  'Transparent
      BorderStyle     =   1  'Fixed Single
      Caption         =   "0"
      Height          =   285
      Index           =   3
      Left            =   3720
      TabIndex        =   6
      Top             =   1080
      Width           =   540
   End
   Begin VB.Line line1 
      BorderColor     =   &H00000000&
      X1              =   855
      X2              =   4260
      Y1              =   1020
      Y2              =   1020
   End
   Begin VB.Label lbl 
      Caption         =   "Polar Moment of Inertia = "
      Height          =   195
      Index           =   2
      Left            =   855
      TabIndex        =   5
      Top             =   1110
      Width           =   2655
   End
   Begin VB.Label lbl 
      Caption         =   "Transmission Weight"
      Height          =   195
      Index           =   1
      Left            =   855
      TabIndex        =   4
      Top             =   420
      Width           =   2655
   End
   Begin VB.Label lbl 
      Caption         =   "Transmission Type:"
      Height          =   195
      Index           =   0
      Left            =   855
      TabIndex        =   3
      Top             =   120
      Width           =   1410
   End
End
Attribute VB_Name = "frmPolarTrans"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Public fc_TransPMI As New CValue
Public fc_Value As Object
Private bFileDirty As Boolean

Private Sub cbxWSTransType_Change()
    gc_WSTransType.Value = cbxWSTransType.ItemData(cbxWSTransType.ListIndex)
    fc_TransPMI.Value = CalcPMI()
End Sub

Private Sub cbxWSTransType_Click()
    gc_WSTransType.Value = cbxWSTransType.ItemData(cbxWSTransType.ListIndex)
    fc_TransPMI.Value = CalcPMI()
End Sub

Private Sub Form_Activate()
    fc_TransPMI.Value = CalcPMI()
End Sub

Private Sub Form_Load()
    Me.Move 3480, 3570
    Set fc_Value = gc_TransPMI
    
    fc_TransPMI.AllowDecimals = True
    fc_TransPMI.DecimalPlaces_Normal = 3
    fc_TransPMI.UOM = UOM_NORMAL
    fc_TransPMI.StatusMsg = "The estimated Polar Moment of Inertia for the transmission components."
    
    gc_WSTransType.Labelctl = Me.lbl(0)
    gc_TransWt.Labelctl = Me.lbl(1)
    gc_CaseDia.Labelctl = Me.lbl(4)
    
    gc_WSTransType.ClsControl = cbxWSTransType
    gc_WSTransType.LoadTypes
    cbxWSTransType.ListIndex = gc_WSTransType.Value - 1
    gc_TransWt.ClsControl = txtTransWt
    gc_CaseDia.ClsControl = txtCaseDia
    
    fc_TransPMI.Labelctl = Me.lbl(2)
    fc_TransPMI.ClsControl = Me.lbl(3)
    fc_TransPMI.Value = CalcPMI()
End Sub

Private Sub Form_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    If X >= cbxWSTransType.left - 20 And X <= cbxWSTransType.left + cbxWSTransType.width Then
        If Y >= cbxWSTransType.top - 20 And Y <= cbxWSTransType.top + cbxWSTransType.height Then
            SetHelp Me, HELP_SET, gc_WSTransType
            Exit Sub
        End If
    End If
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub Form_Unload(Cancel As Integer)
    gc_WSTransType.Labelctl = Nothing
    gc_TransWt.Labelctl = Nothing
    gc_CaseDia.Labelctl = Nothing
    
    gc_WSTransType.ClsControl = Nothing
    gc_TransWt.ClsControl = Nothing
    gc_CaseDia.ClsControl = Nothing
    
    fc_TransPMI.Labelctl = Nothing
    fc_TransPMI.ClsControl = Nothing
End Sub

Private Sub lbl_DblClick(index As Integer)
    If index = 3 Then
        gc_TransPMI.Value = val(lbl(3).caption)
        Unload Me
    End If
End Sub

Private Sub lbl_MouseMove(index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    If index = 3 Then SetHelp Me, HELP_SET, fc_TransPMI
End Sub

Private Sub cbxWSTransType_GotFocus()
    SetHelp Me, HELP_SAVE, gc_WSTransType
End Sub


Private Sub txtTransWt_GotFocus()
    SetHelp Me, HELP_SAVE, gc_TransWt
End Sub

Private Sub txtTransWt_KeyPress(KeyAscii As Integer)
    gc_TransWt.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_TransPMI.Value = CalcPMI()
End Sub

Private Sub txtTransWt_LostFocus()
    gc_TransWt.Value = val(txtTransWt.Text)
    fc_TransPMI.Value = CalcPMI()
End Sub

Private Sub txtTransWt_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TransWt
End Sub


Private Sub txtCaseDia_GotFocus()
    SetHelp Me, HELP_SAVE, gc_CaseDia
End Sub

Private Sub txtCaseDia_KeyPress(KeyAscii As Integer)
    gc_CaseDia.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_TransPMI.Value = CalcPMI()
End Sub

Private Sub txtCaseDia_LostFocus()
    gc_CaseDia.Value = val(txtCaseDia.Text)
    fc_TransPMI.Value = CalcPMI()
End Sub

Private Sub txtCaseDia_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_CaseDia
End Sub


Private Function CalcPMI() As Single
Dim Work As Single
    Select Case gc_WSTransType.Value
        Case 1:  Work = 0.49 * ((0.33 * gc_TransWt.Value) * (0.92 * gc_CaseDia.Value / 2) ^ 2) / 386
        Case 2:  Work = 0.45 * ((0.55 * gc_TransWt.Value) * (0.46 * gc_CaseDia.Value / 2) ^ 2) / 386
        Case 3:  Work = 0.49 * ((0.31 * gc_TransWt.Value) * (0.92 * gc_CaseDia.Value / 2) ^ 2) / 386
    End Select
    CalcPMI = Round(Work, 0.001)
End Function

Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
