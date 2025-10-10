VERSION 5.00
Begin VB.Form frmRefArea 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   " Frontal Area Worksheet"
   ClientHeight    =   1890
   ClientLeft      =   1770
   ClientTop       =   2505
   ClientWidth     =   5295
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   1890
   ScaleWidth      =   5295
   ShowInTaskbar   =   0   'False
   Begin VB.CommandButton cmdBtnShapeFactor 
      Caption         =   "?"
      Height          =   270
      Left            =   3330
      TabIndex        =   3
      ToolTipText     =   "Press this button to display Help for the Shape Factor"
      Top             =   690
      Width           =   270
   End
   Begin VB.TextBox txtShapeFactor 
      Height          =   285
      Left            =   3720
      MaxLength       =   7
      TabIndex        =   2
      Top             =   675
      Width           =   540
   End
   Begin VB.TextBox txtMaxHeight 
      Height          =   285
      Left            =   3720
      MaxLength       =   7
      TabIndex        =   1
      Top             =   375
      Width           =   540
   End
   Begin VB.TextBox txtMaxWidth 
      Height          =   285
      Left            =   3720
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
      Left            =   4380
      TabIndex        =   11
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
      Left            =   3450
      TabIndex        =   10
      Top             =   1410
      Width           =   900
   End
   Begin VB.Label lblHELP 
      BackColor       =   &H00FFFFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(0)"
      Height          =   420
      Index           =   0
      Left            =   0
      TabIndex        =   9
      Top             =   1410
      Width           =   3420
   End
   Begin VB.Label lbl 
      Caption         =   "Shape Factor"
      Height          =   195
      Index           =   4
      Left            =   1290
      TabIndex        =   8
      Top             =   720
      Width           =   1925
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
      TabIndex        =   7
      Top             =   1080
      Width           =   540
   End
   Begin VB.Line line1 
      BorderColor     =   &H00000000&
      X1              =   1260
      X2              =   4260
      Y1              =   1020
      Y2              =   1020
   End
   Begin VB.Label lbl 
      Caption         =   "Frontal Area - sq ft ="
      Height          =   195
      Index           =   2
      Left            =   1275
      TabIndex        =   6
      Top             =   1110
      Width           =   2310
   End
   Begin VB.Label lbl 
      Caption         =   "Maximum Height"
      Height          =   195
      Index           =   1
      Left            =   1275
      TabIndex        =   5
      Top             =   420
      Width           =   2325
   End
   Begin VB.Label lbl 
      Caption         =   "Maximum Width"
      Height          =   195
      Index           =   0
      Left            =   1275
      TabIndex        =   4
      Top             =   120
      Width           =   2355
   End
End
Attribute VB_Name = "frmRefArea"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit
Option Compare Text

Public fc_RefArea As New CValue
Public fc_Value As Object
Private bFileDirty As Boolean

Private Sub cmdBtnShapeFactor_Click()
    frmShapeFactor.Show vbModal
End Sub

Private Sub cmdBtnShapeFactor_GotFocus()
    SetHelp Me, HELP_SAVE, gc_ShapeFactorBtn
End Sub

Private Sub cmdBtnShapeFactor_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_ShapeFactorBtn
End Sub

Private Sub Form_Activate()
    fc_RefArea.Value = CalcRefArea()
End Sub

Private Sub Form_Load()
    Me.Move 3150, 2700
    Set fc_Value = gc_RefArea
    
    fc_RefArea.AllowDecimals = True
    fc_RefArea.DecimalPlaces_Normal = 1
    fc_RefArea.UOM = UOM_NORMAL
    fc_RefArea.StatusMsg = "The calculated frontal area (or reference area) of the vehicle body frontal projection."
    
    gc_MaxWidth.Labelctl = Me.lbl(0)
    gc_MaxHeight.Labelctl = Me.lbl(1)
    gc_ShapeFactor.Labelctl = Me.lbl(4)
    
    gc_MaxWidth.ClsControl = txtMaxWidth
    gc_MaxHeight.ClsControl = txtMaxHeight
    gc_ShapeFactor.ClsControl = txtShapeFactor
    
    fc_RefArea.ClsControl = Me.lbl(3)
    fc_RefArea.Labelctl = Me.lbl(2)
    fc_RefArea.Value = CalcRefArea()
End Sub

Private Sub Form_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub lbl_DblClick(index As Integer)
    If index = 3 Then
        gc_RefArea.Value = val(lbl(3).caption)
        Unload Me
    End If
End Sub

Private Sub lbl_MouseMove(index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    If index = 3 Then SetHelp Me, HELP_SET, fc_RefArea
End Sub


Private Sub txtMaxWidth_GotFocus()
    SetHelp Me, HELP_SAVE, gc_MaxWidth
End Sub

Private Sub txtMaxWidth_KeyPress(KeyAscii As Integer)
    gc_MaxWidth.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_RefArea.Value = CalcRefArea()
End Sub

Private Sub txtMaxWidth_LostFocus()
    gc_MaxWidth.Value = val(txtMaxWidth.Text)
    fc_RefArea.Value = CalcRefArea()
End Sub

Private Sub txtMaxWidth_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_MaxWidth
End Sub


Private Sub txtMaxHeight_GotFocus()
    SetHelp Me, HELP_SAVE, gc_MaxHeight
End Sub

Private Sub txtMaxHeight_KeyPress(KeyAscii As Integer)
    gc_MaxHeight.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_RefArea.Value = CalcRefArea()
End Sub

Private Sub txtMaxHeight_LostFocus()
    gc_MaxHeight.Value = val(txtMaxHeight.Text)
    fc_RefArea.Value = CalcRefArea()
End Sub

Private Sub txtMaxHeight_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_MaxHeight
End Sub


Private Sub txtShapeFactor_GotFocus()
    SetHelp Me, HELP_SAVE, gc_ShapeFactor
End Sub

Private Sub txtShapeFactor_KeyPress(KeyAscii As Integer)
    gc_ShapeFactor.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_RefArea.Value = CalcRefArea()
End Sub

Private Sub txtShapeFactor_LostFocus()
    gc_ShapeFactor.Value = val(txtShapeFactor.Text)
    fc_RefArea.Value = CalcRefArea()
End Sub

Private Sub txtShapeFactor_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_ShapeFactor
End Sub


Private Function CalcRefArea() As String
Dim Work As Single
    Work = (gc_ShapeFactor.Value / 100) * gc_MaxWidth.Value * gc_MaxHeight.Value / 144
    CalcRefArea = Round(Work, 0.1)
End Function

Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
