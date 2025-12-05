VERSION 5.00
Object = "{0BA686C6-F7D3-101A-993E-0000C0EF6F5E}#1.0#0"; "threed32.ocx"
Begin VB.Form frmEffArea 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   " Effective Friction Area Worksheet"
   ClientHeight    =   2145
   ClientLeft      =   3255
   ClientTop       =   4845
   ClientWidth     =   4200
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   2145
   ScaleWidth      =   4200
   ShowInTaskbar   =   0   'False
   Begin VB.TextBox txtNSlot 
      Height          =   285
      Left            =   2850
      MaxLength       =   7
      TabIndex        =   0
      Top             =   75
      Width           =   540
   End
   Begin VB.TextBox txtSlotWd 
      Height          =   285
      Left            =   2850
      MaxLength       =   7
      TabIndex        =   1
      Top             =   375
      Width           =   540
   End
   Begin VB.TextBox txtNHole 
      Height          =   285
      Left            =   2850
      MaxLength       =   7
      TabIndex        =   2
      Top             =   675
      Width           =   540
   End
   Begin VB.TextBox txtHoleDia 
      Height          =   285
      Left            =   2850
      MaxLength       =   7
      TabIndex        =   3
      Top             =   975
      Width           =   540
   End
   Begin Threed.SSPanel PnlInput 
      Height          =   420
      Index           =   0
      Left            =   30
      TabIndex        =   10
      Top             =   1710
      Width           =   2280
      _Version        =   65536
      _ExtentX        =   4022
      _ExtentY        =   741
      _StockProps     =   15
      BackColor       =   -2147483644
      BeginProperty Font {0BE35203-8F91-11CE-9DE3-00AA004BB851} 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Alignment       =   1
   End
   Begin Threed.SSPanel PnlInput 
      Height          =   420
      Index           =   1
      Left            =   2340
      TabIndex        =   11
      Top             =   1710
      Width           =   900
      _Version        =   65536
      _ExtentX        =   1588
      _ExtentY        =   741
      _StockProps     =   15
      BackColor       =   -2147483644
      BeginProperty Font {0BE35203-8F91-11CE-9DE3-00AA004BB851} 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
   End
   Begin Threed.SSPanel PnlInput 
      Height          =   420
      Index           =   2
      Left            =   3270
      TabIndex        =   12
      Top             =   1710
      Width           =   900
      _Version        =   65536
      _ExtentX        =   1588
      _ExtentY        =   741
      _StockProps     =   15
      BackColor       =   -2147483644
      BeginProperty Font {0BE35203-8F91-11CE-9DE3-00AA004BB851} 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
   End
   Begin VB.Label lbl 
      Caption         =   "Number of Slots"
      Height          =   195
      Index           =   4
      Left            =   750
      TabIndex        =   9
      Top             =   120
      Width           =   1800
   End
   Begin VB.Label lbl 
      Caption         =   "Slot Width - inches"
      Height          =   195
      Index           =   0
      Left            =   750
      TabIndex        =   5
      Top             =   420
      Width           =   1800
   End
   Begin VB.Label lbl 
      Caption         =   "Number of Holes"
      Height          =   195
      Index           =   1
      Left            =   750
      TabIndex        =   6
      Top             =   720
      Width           =   1800
   End
   Begin VB.Label lbl 
      Caption         =   "Hole Diameter - inches"
      Height          =   195
      Index           =   5
      Left            =   750
      TabIndex        =   4
      Top             =   1020
      Width           =   1800
   End
   Begin VB.Label lbl 
      Alignment       =   1  'Right Justify
      BackColor       =   &H0080FFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "0"
      Height          =   285
      Index           =   3
      Left            =   2850
      TabIndex        =   8
      Top             =   1380
      Width           =   540
   End
   Begin VB.Label lbl 
      Caption         =   "Effective Area - % ="
      Height          =   195
      Index           =   2
      Left            =   750
      TabIndex        =   7
      Top             =   1410
      Width           =   1800
   End
   Begin VB.Line line1 
      BorderColor     =   &H00000000&
      X1              =   750
      X2              =   3360
      Y1              =   1320
      Y2              =   1320
   End
End
Attribute VB_Name = "frmEffArea"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Public fc_ClArea As New CValue
Public fc_Value As Object
Private bFileDirty As Boolean

Private Sub Form_Activate()
    fc_ClArea.Value = CalcArea()
End Sub

Private Sub Form_Load()
    Set fc_Value = gc_ClArea
    
    fc_ClArea.AllowDecimals = True
    fc_ClArea.DecimalPlaces_Normal = 1
    fc_ClArea.UOM = UOM_NORMAL
    fc_ClArea.StatusMsg = "The calculated effective area % of the clutch friction surfaces."
    fc_ClArea.Labelctl = lbl(2)
    fc_ClArea.ClsControl = lbl(3)
    fc_ClArea.Value = CalcArea()
    
    gc_NSlot.Labelctl = lbl(4)
    gc_SlotWD.Labelctl = lbl(0)
    gc_NHole.Labelctl = lbl(1)
    gc_HoleDia.Labelctl = lbl(5)
    
    gc_NSlot.ClsControl = txtNSlot
    gc_SlotWD.ClsControl = txtSlotWd
    gc_NHole.ClsControl = txtNHole
    gc_HoleDia.ClsControl = txtHoleDia
End Sub

Private Sub Form_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_RESET, fc_Value
End Sub

Private Sub Form_Unload(Cancel As Integer)
    gc_NSlot.Labelctl = Nothing
    gc_SlotWD.Labelctl = Nothing
    gc_NHole.Labelctl = Nothing
    gc_HoleDia.Labelctl = Nothing
    
    gc_NSlot.ClsControl = Nothing
    gc_SlotWD.ClsControl = Nothing
    gc_NHole.ClsControl = Nothing
    gc_HoleDia.ClsControl = Nothing

    fc_ClArea.Labelctl = Nothing
    fc_ClArea.ClsControl = Nothing
End Sub


Private Sub lbl_DblClick(Index As Integer)
    If Index = 3 Then
        gc_ClArea.Value = val(lbl(3).caption)
        ClutchCalc
        Unload Me
    End If
End Sub

Private Sub lbl_MouseMove(Index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    If Index = 3 Then
        setpanels Me, PNL_SET, fc_ClArea
    End If
End Sub


Private Sub txtNSlot_GotFocus()
    setpanels Me, PNL_SAVE, gc_NSlot
End Sub

Private Sub txtNSlot_KeyPress(KeyAscii As Integer)
    gc_NSlot.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtNSlot_Check
End Sub

Private Sub txtNSlot_LostFocus()
    gc_NSlot.Value = val(txtNSlot.Text)
    txtNSlot_Check
End Sub

Private Sub txtNSlot_Check()
    If gc_NSlot.IsChanged Then
        fc_ClArea.Value = CalcArea()
    End If
End Sub

Private Sub txtNSlot_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_NSlot
End Sub


Private Sub txtSlotWd_GotFocus()
    setpanels Me, PNL_SAVE, gc_SlotWD
End Sub

Private Sub txtSlotWd_KeyPress(KeyAscii As Integer)
    gc_SlotWD.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtSlotWd_Check
End Sub

Private Sub txtSlotWd_LostFocus()
    gc_SlotWD.Value = val(txtSlotWd.Text)
    txtSlotWd_Check
End Sub

Private Sub txtSlotWd_Check()
    If gc_SlotWD.IsChanged Then
        fc_ClArea.Value = CalcArea()
    End If
End Sub

Private Sub txtSlotWd_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_SlotWD
End Sub


Private Sub txtNHole_GotFocus()
    setpanels Me, PNL_SAVE, gc_NHole
End Sub

Private Sub txtNHole_KeyPress(KeyAscii As Integer)
    gc_NHole.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtNHole_Check
End Sub

Private Sub txtNHole_LostFocus()
    gc_NHole.Value = val(txtNHole.Text)
    txtNHole_Check
End Sub

Private Sub txtNHole_Check()
    If gc_NHole.IsChanged Then
        fc_ClArea.Value = CalcArea()
    End If
End Sub

Private Sub txtNHole_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_NHole
End Sub


Private Sub txtHoleDia_GotFocus()
    setpanels Me, PNL_SAVE, gc_HoleDia
End Sub

Private Sub txtHoleDia_KeyPress(KeyAscii As Integer)
    gc_HoleDia.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtHoleDia_Check
End Sub

Private Sub txtHoleDia_LostFocus()
    gc_HoleDia.Value = val(txtHoleDia.Text)
    txtHoleDia_Check
End Sub

Private Sub txtHoleDia_Check()
    If gc_HoleDia.IsChanged Then
        fc_ClArea.Value = CalcArea()
    End If
End Sub

Private Sub txtHoleDia_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_HoleDia
End Sub


Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
