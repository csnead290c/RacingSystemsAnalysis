VERSION 5.00
Begin VB.Form frmTireWidth 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   " Tire Width Worksheet"
   ClientHeight    =   1905
   ClientLeft      =   1965
   ClientTop       =   2280
   ClientWidth     =   4935
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   1905
   ScaleWidth      =   4935
   ShowInTaskbar   =   0   'False
   Begin VB.TextBox txtGrooveWidth 
      Height          =   285
      Left            =   3405
      MaxLength       =   7
      TabIndex        =   2
      Top             =   675
      Width           =   540
   End
   Begin VB.TextBox txtGrooves 
      Height          =   285
      Left            =   3405
      MaxLength       =   7
      TabIndex        =   1
      Top             =   375
      Width           =   540
   End
   Begin VB.TextBox txtTreadWidth 
      Height          =   285
      Left            =   3405
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
      Left            =   3990
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
      Left            =   3060
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
      Left            =   60
      TabIndex        =   8
      Top             =   1410
      Width           =   2970
   End
   Begin VB.Label lbl 
      Caption         =   "Each Groove Width"
      Height          =   195
      Index           =   4
      Left            =   975
      TabIndex        =   7
      Top             =   720
      Width           =   2310
   End
   Begin VB.Label lbl 
      Alignment       =   1  'Right Justify
      BackColor       =   &H00FFFFFF&
      BackStyle       =   0  'Transparent
      BorderStyle     =   1  'Fixed Single
      Caption         =   "0"
      Height          =   285
      Index           =   3
      Left            =   3405
      TabIndex        =   6
      Top             =   1080
      Width           =   540
   End
   Begin VB.Line line1 
      BorderColor     =   &H00000000&
      X1              =   975
      X2              =   3945
      Y1              =   1020
      Y2              =   1020
   End
   Begin VB.Label lbl 
      Caption         =   "Effective Tire Width ="
      Height          =   195
      Index           =   2
      Left            =   975
      TabIndex        =   5
      Top             =   1110
      Width           =   2310
   End
   Begin VB.Label lbl 
      Caption         =   "Number of Grooves"
      Height          =   195
      Index           =   1
      Left            =   975
      TabIndex        =   4
      Top             =   420
      Width           =   2310
   End
   Begin VB.Label lbl 
      Caption         =   "Tread Width"
      Height          =   195
      Index           =   0
      Left            =   975
      TabIndex        =   3
      Top             =   120
      Width           =   2310
   End
End
Attribute VB_Name = "frmTireWidth"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit
Option Compare Text

Public fc_TireWidth As New CValue
Public fc_Value As Object

Private bFileDirty As Boolean

Private Sub Form_Activate()
    fc_TireWidth.Value = CalcTireWidth()
End Sub

Private Sub Form_Load()
    Me.Move 3000, 2850
    Set fc_Value = gc_TireWidth
    
    fc_TireWidth.AllowDecimals = True
    fc_TireWidth.DecimalPlaces_Normal = 2
    fc_TireWidth.UOM = UOM_NORMAL
    fc_TireWidth.StatusMsg = "The Effective Tire Width (in inches) of rubber on the racing surface for each tire."
    
    gc_TreadWidth.Labelctl = Me.lbl(0)
    gc_Grooves.Labelctl = Me.lbl(1)
    gc_GrooveWidth.Labelctl = Me.lbl(4)
    
    gc_TreadWidth.ClsControl = txtTreadWidth
    gc_Grooves.ClsControl = txtGrooves
    gc_GrooveWidth.ClsControl = txtGrooveWidth
    
    fc_TireWidth.Labelctl = Me.lbl(2)
    fc_TireWidth.ClsControl = Me.lbl(3)
    fc_TireWidth.Value = CalcTireWidth()
End Sub

Private Sub Form_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub lbl_DblClick(index As Integer)
    If index = 3 Then
        gc_TireWidth.Value = val(lbl(3).caption)
        Unload Me
    End If
End Sub

Private Sub lbl_MouseMove(index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    If index = 3 Then SetHelp Me, HELP_SET, fc_TireWidth
End Sub


Private Sub txtTreadWidth_GotFocus()
    SetHelp Me, HELP_SAVE, gc_TreadWidth
End Sub

Private Sub txtTreadWidth_KeyPress(KeyAscii As Integer)
    gc_TreadWidth.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_TireWidth.Value = CalcTireWidth()
End Sub

Private Sub txtTreadWidth_LostFocus()
    gc_TreadWidth.Value = val(txtTreadWidth.Text)
    fc_TireWidth.Value = CalcTireWidth()
End Sub

Private Sub txtTreadWidth_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_TreadWidth
End Sub


Private Sub txtGrooves_GotFocus()
    SetHelp Me, HELP_SAVE, gc_Grooves
End Sub

Private Sub txtGrooves_KeyPress(KeyAscii As Integer)
    gc_Grooves.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_TireWidth.Value = CalcTireWidth()
End Sub

Private Sub txtGrooves_LostFocus()
    gc_Grooves.Value = val(txtGrooves.Text)
    fc_TireWidth.Value = CalcTireWidth()
End Sub

Private Sub txtGrooves_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_Grooves
End Sub


Private Sub txtGrooveWidth_GotFocus()
    SetHelp Me, HELP_SAVE, gc_GrooveWidth
End Sub

Private Sub txtGrooveWidth_KeyPress(KeyAscii As Integer)
    gc_GrooveWidth.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_TireWidth.Value = CalcTireWidth()
End Sub

Private Sub txtGrooveWidth_LostFocus()
    gc_GrooveWidth.Value = val(txtGrooveWidth.Text)
    fc_TireWidth.Value = CalcTireWidth()
End Sub

Private Sub txtGrooveWidth_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_GrooveWidth
End Sub


Private Function CalcTireWidth() As String
Dim Work As Single
    Work = gc_TreadWidth.Value - gc_Grooves.Value * gc_GrooveWidth.Value
    If Work < 0 Then Work = 0
    CalcTireWidth = Round(Work, 0.01)
End Function

Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
