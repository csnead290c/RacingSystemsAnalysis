VERSION 5.00
Begin VB.Form frmPolarEngine 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   " Polar Moment of Inertia Worksheet"
   ClientHeight    =   2580
   ClientLeft      =   3180
   ClientTop       =   2850
   ClientWidth     =   4770
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   2580
   ScaleWidth      =   4770
   ShowInTaskbar   =   0   'False
   Begin VB.TextBox txtCrankWt 
      Height          =   285
      Left            =   3540
      MaxLength       =   7
      TabIndex        =   0
      Top             =   75
      Width           =   540
   End
   Begin VB.TextBox txtCrankStroke 
      Height          =   285
      Left            =   3540
      MaxLength       =   7
      TabIndex        =   1
      Top             =   375
      Width           =   540
   End
   Begin VB.TextBox txtFlywheelWt 
      Height          =   285
      Left            =   3540
      MaxLength       =   7
      TabIndex        =   2
      Top             =   675
      Width           =   540
   End
   Begin VB.TextBox txtFlywheelDia 
      Height          =   285
      Left            =   3540
      MaxLength       =   7
      TabIndex        =   3
      Top             =   975
      Width           =   540
   End
   Begin VB.Label lblHELP 
      BackColor       =   &H00FFFFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(0)"
      Height          =   420
      Index           =   0
      Left            =   30
      TabIndex        =   13
      Top             =   1710
      Width           =   2805
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00FFFFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(1)"
      Height          =   420
      Index           =   1
      Left            =   2880
      TabIndex        =   12
      Top             =   1710
      Width           =   900
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00FFFFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(2)"
      Height          =   420
      Index           =   2
      Left            =   3840
      TabIndex        =   11
      Top             =   1710
      Width           =   900
   End
   Begin VB.Label lbl 
      BackColor       =   &H00C0FFFF&
      Caption         =   "note: this worksheet is using a primary drive speed reduction of x.xx for the engine polar moment of inertia calculations."
      Height          =   405
      Index           =   4
      Left            =   240
      TabIndex        =   10
      Top             =   2160
      Width           =   4275
   End
   Begin VB.Label lbl 
      Caption         =   "Crankshaft Weight"
      Height          =   195
      Index           =   0
      Left            =   855
      TabIndex        =   4
      Top             =   120
      Width           =   2560
   End
   Begin VB.Label lbl 
      Caption         =   "Crankshaft Stroke"
      Height          =   195
      Index           =   1
      Left            =   855
      TabIndex        =   5
      Top             =   420
      Width           =   2560
   End
   Begin VB.Label lbl 
      Caption         =   "Flywheel + Clutch Weight"
      Height          =   195
      Index           =   5
      Left            =   855
      TabIndex        =   8
      Top             =   720
      Width           =   2560
   End
   Begin VB.Label lbl 
      Caption         =   "FlyWheel Diameter"
      Height          =   195
      Index           =   6
      Left            =   855
      TabIndex        =   9
      Top             =   1020
      Width           =   2560
   End
   Begin VB.Label lbl 
      Alignment       =   1  'Right Justify
      BackColor       =   &H00FFFFFF&
      BackStyle       =   0  'Transparent
      BorderStyle     =   1  'Fixed Single
      Caption         =   "0"
      Height          =   285
      Index           =   3
      Left            =   3540
      TabIndex        =   7
      Top             =   1380
      Width           =   540
   End
   Begin VB.Label lbl 
      Caption         =   "Polar Moment of Inertia ="
      Height          =   195
      Index           =   2
      Left            =   855
      TabIndex        =   6
      Top             =   1410
      Width           =   2560
   End
   Begin VB.Line line1 
      BorderColor     =   &H00000000&
      X1              =   840
      X2              =   4260
      Y1              =   1320
      Y2              =   1320
   End
End
Attribute VB_Name = "frmPolarEngine"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Public fc_EnginePMI As New CValue
Public fc_Value As Object
Private bFileDirty As Boolean

Private Sub Form_Activate()
    fc_EnginePMI.Value = CalcPMI()
End Sub

Private Sub Form_Load()
    Me.Move 3780, 3000
    Set fc_Value = gc_EnginePMI
    
    fc_EnginePMI.AllowDecimals = True
    fc_EnginePMI.DecimalPlaces_Normal = 2
    fc_EnginePMI.UOM = UOM_NORMAL
    fc_EnginePMI.StatusMsg = "The estimated Polar Moment of Inertia for the engine and clutch components."
    
    gc_CrankWt.Labelctl = Me.lbl(0)
    gc_CrankStroke.Labelctl = Me.lbl(1)
    gc_FlywheelWt.Labelctl = Me.lbl(5)
    gc_FlywheelDia.Labelctl = Me.lbl(6)
    
    gc_CrankWt.ClsControl = txtCrankWt
    gc_CrankStroke.ClsControl = txtCrankStroke
    gc_FlywheelWt.ClsControl = txtFlywheelWt
    gc_FlywheelDia.ClsControl = txtFlywheelDia
    
    fc_EnginePMI.Labelctl = Me.lbl(2)
    fc_EnginePMI.ClsControl = Me.lbl(3)
    fc_EnginePMI.Value = CalcPMI()
    
    If gc_BodyStyle.Value = 8 Then
        lbl(4).caption = "note: this worksheet is using a primary drive speed reduction of " & Format(gc_Primary.Value, "#.00") & " for the engine polar moment of inertia calculations."
        lbl(4).Visible = True
        Me.height = 3060
    Else
        lbl(4).caption = ""
        lbl(4).Visible = False
        Me.height = 2640
    End If
End Sub

Private Sub Form_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub Form_Unload(Cancel As Integer)
    gc_CrankWt.Labelctl = Nothing
    gc_CrankStroke.Labelctl = Nothing
    gc_FlywheelWt.Labelctl = Nothing
    gc_FlywheelDia.Labelctl = Nothing
    
    gc_CrankWt.ClsControl = Nothing
    gc_CrankStroke.ClsControl = Nothing
    gc_FlywheelWt.ClsControl = Nothing
    gc_FlywheelDia.ClsControl = Nothing
    
    fc_EnginePMI.Labelctl = Nothing
    fc_EnginePMI.ClsControl = Nothing
End Sub

Private Sub lbl_DblClick(index As Integer)
    If index = 3 Then
        gc_EnginePMI.Value = val(lbl(3).caption)
        Unload Me
    End If
End Sub

Private Sub lbl_MouseMove(index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    If index = 3 Then SetHelp Me, HELP_SET, fc_EnginePMI
End Sub


Private Sub txtCrankWt_GotFocus()
    SetHelp Me, HELP_SAVE, gc_CrankWt
End Sub

Private Sub txtCrankWt_KeyPress(KeyAscii As Integer)
    gc_CrankWt.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_EnginePMI.Value = CalcPMI()
End Sub

Private Sub txtCrankWt_LostFocus()
    gc_CrankWt.Value = val(txtCrankWt.Text)
    fc_EnginePMI.Value = CalcPMI()
End Sub

Private Sub txtCrankWt_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_CrankWt
End Sub


Private Sub txtCrankStroke_GotFocus()
    SetHelp Me, HELP_SAVE, gc_CrankStroke
End Sub

Private Sub txtCrankStroke_KeyPress(KeyAscii As Integer)
    gc_CrankStroke.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_EnginePMI.Value = CalcPMI()
End Sub

Private Sub txtCrankStroke_LostFocus()
    gc_CrankStroke.Value = val(txtCrankStroke.Text)
    fc_EnginePMI.Value = CalcPMI()
End Sub

Private Sub txtCrankStroke_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_CrankStroke
End Sub


Private Sub txtFlywheelWt_GotFocus()
    SetHelp Me, HELP_SAVE, gc_FlywheelWt
End Sub

Private Sub txtFlywheelWt_KeyPress(KeyAscii As Integer)
    gc_FlywheelWt.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_EnginePMI.Value = CalcPMI()
End Sub

Private Sub txtFlywheelWt_LostFocus()
    gc_FlywheelWt.Value = val(txtFlywheelWt.Text)
    fc_EnginePMI.Value = CalcPMI()
End Sub

Private Sub txtFlywheelWt_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_FlywheelWt
End Sub


Private Sub txtFlywheelDia_GotFocus()
    SetHelp Me, HELP_SAVE, gc_FlywheelDia
End Sub

Private Sub txtFlywheelDia_KeyPress(KeyAscii As Integer)
    gc_FlywheelDia.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then fc_EnginePMI.Value = CalcPMI()
End Sub

Private Sub txtFlywheelDia_LostFocus()
    gc_FlywheelDia.Value = val(txtFlywheelDia.Text)
    fc_EnginePMI.Value = CalcPMI()
End Sub

Private Sub txtFlywheelDia_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_SET, gc_FlywheelDia
End Sub


Private Function CalcPMI() As Single
Dim Work As Single
Dim PDRatio As Single
    PDRatio = 1:    If gc_BodyStyle.Value = 8 Then PDRatio = gc_Primary.Value
    
    Work = 0.5 * gc_CrankWt.Value * gc_CrankStroke.Value ^ 2
    Work = Work + (0.5 * gc_FlywheelWt.Value * (gc_FlywheelDia.Value / 2) ^ 2) / PDRatio
    Work = Work / 386
    CalcPMI = Round(1.333 * Work, 0.02)
End Function

Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
