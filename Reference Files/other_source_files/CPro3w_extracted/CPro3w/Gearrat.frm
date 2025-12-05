VERSION 5.00
Object = "{0BA686C6-F7D3-101A-993E-0000C0EF6F5E}#1.0#0"; "threed32.ocx"
Begin VB.Form frmGearRatio 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   " Motorcycle Final Drive Ratio Worksheet"
   ClientHeight    =   2160
   ClientLeft      =   3105
   ClientTop       =   1335
   ClientWidth     =   4695
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   2160
   ScaleWidth      =   4695
   ShowInTaskbar   =   0   'False
   Begin VB.TextBox txtHighGear 
      Height          =   285
      Left            =   3150
      MaxLength       =   7
      TabIndex        =   1
      Top             =   375
      Width           =   540
   End
   Begin VB.TextBox txtRearWheel 
      Height          =   285
      Left            =   3150
      MaxLength       =   7
      TabIndex        =   4
      Top             =   975
      Width           =   540
   End
   Begin VB.TextBox txtCountershaft 
      Height          =   285
      Left            =   3150
      MaxLength       =   7
      TabIndex        =   3
      Top             =   675
      Width           =   540
   End
   Begin VB.TextBox txtPDRatio 
      Height          =   285
      Left            =   3150
      MaxLength       =   7
      TabIndex        =   0
      Top             =   75
      Width           =   540
   End
   Begin Threed.SSPanel PnlInput 
      Height          =   420
      Index           =   0
      Left            =   30
      TabIndex        =   7
      Top             =   1710
      Width           =   2790
      _Version        =   65536
      _ExtentX        =   4921
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
      Left            =   2850
      TabIndex        =   8
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
      Left            =   3780
      TabIndex        =   9
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
      Caption         =   "High Gear Ratio"
      Height          =   195
      Index           =   5
      Left            =   750
      TabIndex        =   12
      Top             =   420
      Width           =   2340
   End
   Begin VB.Label lbl 
      Caption         =   "Rear Wheel Sprocket Teeth"
      Height          =   195
      Index           =   4
      Left            =   750
      TabIndex        =   11
      Top             =   1020
      Width           =   2340
   End
   Begin VB.Label lbl 
      Alignment       =   1  'Right Justify
      BackColor       =   &H0080FFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "0"
      Height          =   285
      Index           =   3
      Left            =   3150
      TabIndex        =   10
      Top             =   1380
      Width           =   540
   End
   Begin VB.Line line1 
      BorderColor     =   &H00000000&
      X1              =   750
      X2              =   3675
      Y1              =   1320
      Y2              =   1320
   End
   Begin VB.Label lbl 
      Caption         =   "Final Drive Ratio ="
      Height          =   195
      Index           =   2
      Left            =   750
      TabIndex        =   6
      Top             =   1410
      Width           =   2340
   End
   Begin VB.Label lbl 
      Caption         =   "Countershaft Sprocket Teeth"
      Height          =   195
      Index           =   1
      Left            =   750
      TabIndex        =   5
      Top             =   720
      Width           =   2340
   End
   Begin VB.Label lbl 
      Caption         =   "Primary Drive Speed Reduction"
      Height          =   195
      Index           =   0
      Left            =   750
      TabIndex        =   2
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

Public fc_GearRatio As New CValue
Public fc_Value As Object
Private bFileDirty As Boolean

Private Sub Form_Activate()
    fc_GearRatio.Value = CalcGearRatio()
End Sub

Private Sub Form_Load()
    Set fc_Value = gc_GearRatio
    
    fc_GearRatio.AllowDecimals = True
    fc_GearRatio.DecimalPlaces_Normal = 2
    fc_GearRatio.UOM = UOM_NORMAL
    fc_GearRatio.StatusMsg = "The calculated overall final drive ratio."
    fc_GearRatio.Labelctl = lbl(2)
    fc_GearRatio.ClsControl = lbl(3)
    fc_GearRatio.Value = CalcGearRatio()
    
    gc_PDRatio.Labelctl = lbl(0)
    gc_HighGear.Labelctl = lbl(5)
    gc_Countershaft.Labelctl = lbl(1)
    gc_RearWheel.Labelctl = lbl(4)
    
    gc_PDRatio.ClsControl = txtPDRatio
    gc_HighGear.ClsControl = txtHighGear
    gc_Countershaft.ClsControl = txtCountershaft
    gc_RearWheel.ClsControl = txtRearWheel
End Sub

Private Sub Form_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_RESET, fc_Value
End Sub

Private Sub Form_Unload(Cancel As Integer)
    gc_PDRatio.Labelctl = Nothing
    gc_HighGear.Labelctl = Nothing
    gc_Countershaft.Labelctl = Nothing
    gc_RearWheel.Labelctl = Nothing
    
    gc_PDRatio.ClsControl = Nothing
    gc_HighGear.ClsControl = Nothing
    gc_Countershaft.ClsControl = Nothing
    gc_RearWheel.ClsControl = Nothing
    
    fc_GearRatio.Labelctl = Nothing
    fc_GearRatio.ClsControl = Nothing
End Sub

Private Sub lbl_DblClick(Index As Integer)
    If Index = 3 Then Unload Me
End Sub

Private Sub lbl_MouseMove(Index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    If Index = 3 Then
        setpanels Me, PNL_SET, fc_GearRatio
    End If
End Sub


Private Sub txtPDRatio_GotFocus()
    setpanels Me, PNL_SAVE, gc_PDRatio
End Sub

Private Sub txtPDRatio_KeyPress(KeyAscii As Integer)
    gc_PDRatio.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtPDRatio_Check
End Sub

Private Sub txtPDRatio_LostFocus()
    gc_PDRatio.Value = val(txtPDRatio.Text)
    txtPDRatio_Check
End Sub

Private Sub txtPDRatio_Check()
    If gc_PDRatio.IsChanged Then
        fc_GearRatio.Value = CalcGearRatio()
        gc_GearRatio.Value = fc_GearRatio.Value
        
        EngCalc
        ClutchCalc
    End If
End Sub

Private Sub txtPDRatio_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_PDRatio
End Sub


Private Sub txtHighGear_GotFocus()
    setpanels Me, PNL_SAVE, gc_HighGear
End Sub

Private Sub txtHighGear_KeyPress(KeyAscii As Integer)
    gc_HighGear.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtHighGear_Check
End Sub

Private Sub txtHighGear_LostFocus()
    gc_HighGear.Value = val(txtHighGear.Text)
    txtHighGear_Check
End Sub

Private Sub txtHighGear_Check()
    If gc_HighGear.IsChanged Then
        fc_GearRatio.Value = CalcGearRatio()
        gc_GearRatio.Value = fc_GearRatio.Value
        
        EngCalc
        ClutchCalc
    End If
End Sub

Private Sub txtHighGear_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_HighGear
End Sub


Private Sub txtCountershaft_GotFocus()
    setpanels Me, PNL_SAVE, gc_Countershaft
End Sub

Private Sub txtCountershaft_KeyPress(KeyAscii As Integer)
    gc_Countershaft.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtCountershaft_Check
End Sub

Private Sub txtCountershaft_LostFocus()
    gc_Countershaft.Value = val(txtCountershaft.Text)
    txtCountershaft_Check
End Sub

Private Sub txtCountershaft_Check()
    If gc_Countershaft.IsChanged Then
        fc_GearRatio.Value = CalcGearRatio()
        gc_GearRatio.Value = fc_GearRatio.Value
        
        EngCalc
        ClutchCalc
    End If
End Sub

Private Sub txtCountershaft_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_Countershaft
End Sub


Private Sub txtRearWheel_GotFocus()
    setpanels Me, PNL_SAVE, gc_RearWheel
End Sub

Private Sub txtRearWheel_KeyPress(KeyAscii As Integer)
    gc_RearWheel.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtRearWheel_Check
End Sub

Private Sub txtRearWheel_LostFocus()
    gc_RearWheel.Value = val(txtRearWheel.Text)
    txtRearWheel_Check
End Sub

Private Sub txtRearWheel_Check()
    If gc_RearWheel.IsChanged Then
        fc_GearRatio.Value = CalcGearRatio()
        gc_GearRatio.Value = fc_GearRatio.Value
        
        EngCalc
        ClutchCalc
    End If
End Sub

Private Sub txtRearWheel_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_RearWheel
End Sub


Private Function CalcGearRatio() As String
Dim Work As Single
    Work = 0
    If gc_Countershaft.Value > 0 Then
        Work = gc_PDRatio.Value * gc_HighGear.Value * gc_RearWheel.Value / gc_Countershaft.Value
    End If
    CalcGearRatio = Round(Work, 0.01)
End Function

Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
