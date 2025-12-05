VERSION 5.00
Object = "{0BA686C6-F7D3-101A-993E-0000C0EF6F5E}#1.0#0"; "threed32.ocx"
Begin VB.Form frmPolarTires 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   " Polar Moment of Inertia Worksheet"
   ClientHeight    =   2145
   ClientLeft      =   3105
   ClientTop       =   3240
   ClientWidth     =   4770
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   2145
   ScaleWidth      =   4770
   ShowInTaskbar   =   0   'False
   Begin VB.TextBox txtTireWt 
      Height          =   285
      Left            =   3540
      MaxLength       =   7
      TabIndex        =   0
      Top             =   75
      Width           =   540
   End
   Begin VB.TextBox txtWSTireDia 
      Height          =   285
      Left            =   3540
      MaxLength       =   7
      TabIndex        =   1
      Top             =   375
      Width           =   540
   End
   Begin VB.TextBox txtWheelWt 
      Height          =   285
      Left            =   3540
      MaxLength       =   7
      TabIndex        =   2
      Top             =   675
      Width           =   540
   End
   Begin VB.TextBox txtWheelDia 
      Height          =   285
      Left            =   3540
      MaxLength       =   7
      TabIndex        =   3
      Top             =   975
      Width           =   540
   End
   Begin Threed.SSPanel PnlInput 
      Height          =   420
      Index           =   0
      Left            =   30
      TabIndex        =   8
      Top             =   1710
      Width           =   2850
      _Version        =   65536
      _ExtentX        =   5027
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
      Left            =   2910
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
   Begin Threed.SSPanel PnlInput 
      Height          =   420
      Index           =   2
      Left            =   3840
      TabIndex        =   10
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
      Caption         =   "Tire Weight"
      Height          =   195
      Index           =   4
      Left            =   630
      TabIndex        =   12
      Top             =   120
      Width           =   2910
   End
   Begin VB.Label lbl 
      Caption         =   "Tire Diameter"
      Height          =   195
      Index           =   0
      Left            =   630
      TabIndex        =   5
      Top             =   420
      Width           =   2910
   End
   Begin VB.Label lbl 
      Caption         =   "Wheel Weight"
      Height          =   195
      Index           =   1
      Left            =   630
      TabIndex        =   6
      Top             =   720
      Width           =   2910
   End
   Begin VB.Label lbl 
      Caption         =   "Wheel Diameter"
      Height          =   195
      Index           =   5
      Left            =   630
      TabIndex        =   4
      Top             =   1020
      Width           =   2910
   End
   Begin VB.Label lbl 
      Alignment       =   1  'Right Justify
      BackColor       =   &H0080FFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "0"
      Height          =   285
      Index           =   3
      Left            =   3540
      TabIndex        =   11
      Top             =   1380
      Width           =   540
   End
   Begin VB.Label lbl 
      Caption         =   "Polar Moment of Inertia - in lbs sec*sec ="
      Height          =   195
      Index           =   2
      Left            =   630
      TabIndex        =   7
      Top             =   1410
      Width           =   2910
   End
   Begin VB.Line line1 
      BorderColor     =   &H00000000&
      X1              =   630
      X2              =   4050
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
    Set fc_Value = gc_TiresPMI
    
    fc_TiresPMI.AllowDecimals = True
    fc_TiresPMI.DecimalPlaces_Normal = 1
    fc_TiresPMI.UOM = UOM_NORMAL
    fc_TiresPMI.StatusMsg = "The estimated Polar Moment of Inertia for the final drive components."
    fc_TiresPMI.Labelctl = lbl(2)
    fc_TiresPMI.ClsControl = lbl(3)
    fc_TiresPMI.Value = CalcPMI()
    
    gc_TireWt.Labelctl = lbl(4)
    gc_WSTireDia.Labelctl = lbl(0)
    gc_WheelWt.Labelctl = lbl(1)
    gc_WheelDia.Labelctl = lbl(5)
    
    gc_TireWt.ClsControl = txtTireWt
    gc_WSTireDia.ClsControl = txtWSTireDia
    gc_WheelWt.ClsControl = txtWheelWt
    gc_WheelDia.ClsControl = txtWheelDia
End Sub

Private Sub Form_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_RESET, fc_Value
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


Private Sub lbl_DblClick(Index As Integer)
    If Index = 3 Then
        gc_TiresPMI.Value = val(lbl(3).caption)
        EngCalc
        ClutchCalc
        Unload Me
    End If
End Sub

Private Sub lbl_MouseMove(Index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    If Index = 3 Then
        setpanels Me, PNL_SET, fc_TiresPMI
    End If
End Sub


Private Sub txtTireWt_GotFocus()
    setpanels Me, PNL_SAVE, gc_TireWt
End Sub

Private Sub txtTireWt_KeyPress(KeyAscii As Integer)
    gc_TireWt.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtTireWt_Check
End Sub

Private Sub txtTireWt_LostFocus()
    gc_TireWt.Value = val(txtTireWt.Text)
    txtTireWt_Check
End Sub

Private Sub txtTireWt_Check()
    If gc_TireWt.IsChanged Then
        fc_TiresPMI.Value = CalcPMI()
    End If
End Sub

Private Sub txtTireWt_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_TireWt
End Sub


Private Sub txtWSTireDia_GotFocus()
    setpanels Me, PNL_SAVE, gc_WSTireDia
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
    If gc_WSTireDia.IsChanged Then
        fc_TiresPMI.Value = CalcPMI()
    End If
End Sub

Private Sub txtWSTireDia_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_WSTireDia
End Sub


Private Sub txtWheelWt_GotFocus()
    setpanels Me, PNL_SAVE, gc_WheelWt
End Sub

Private Sub txtWheelWt_KeyPress(KeyAscii As Integer)
    gc_WheelWt.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtWheelWt_Check
End Sub

Private Sub txtWheelWt_LostFocus()
    gc_WheelWt.Value = val(txtWheelWt.Text)
    txtWheelWt_Check
End Sub

Private Sub txtWheelWt_Check()
    If gc_WheelWt.IsChanged Then
        fc_TiresPMI.Value = CalcPMI()
    End If
End Sub

Private Sub txtWheelWt_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_WheelWt
End Sub


Private Sub txtWheelDia_GotFocus()
    setpanels Me, PNL_SAVE, gc_WheelDia
End Sub

Private Sub txtWheelDia_KeyPress(KeyAscii As Integer)
    gc_WheelDia.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtWheelDia_Check
End Sub

Private Sub txtWheelDia_LostFocus()
    gc_WheelDia.Value = val(txtWheelDia.Text)
    txtWheelDia_Check
End Sub

Private Sub txtWheelDia_Check()
    If gc_WheelDia.IsChanged Then
        fc_TiresPMI.Value = CalcPMI()
    End If
End Sub

Private Sub txtWheelDia_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_WheelDia
End Sub


Private Function CalcPMI() As String
Dim Work As Single
Dim ztd As Single
    With gc_WSTireDia
        If .UOM = UOM_NORMAL Then
            ztd = .Value
        Else
            ztd = .Value / PI
        End If
    End With
    
    Work = (0.8 * gc_TireWt.Value * (ztd / 2) ^ 2 + 0.75 * gc_WheelWt.Value * (0.93 * gc_WheelDia.Value / 2) ^ 2) / 386
    Work = 1.15 * Work   'to account for misc rear end and front wheel and tire parts
    
    If Not isBike Then Work = 2 * Work
    CalcPMI = Round(Work, 0.1)
End Function

Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
