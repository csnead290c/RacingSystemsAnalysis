VERSION 5.00
Object = "{0BA686C6-F7D3-101A-993E-0000C0EF6F5E}#1.0#0"; "threed32.ocx"
Begin VB.Form frmSpring 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   " Static Plate Force Worksheet"
   ClientHeight    =   2760
   ClientLeft      =   3255
   ClientTop       =   3390
   ClientWidth     =   4470
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   2760
   ScaleWidth      =   4470
   ShowInTaskbar   =   0   'False
   Begin VB.TextBox txtSSRate 
      Height          =   285
      Left            =   2700
      MaxLength       =   7
      TabIndex        =   4
      Top             =   675
      Width           =   540
   End
   Begin VB.TextBox txtSBasePr 
      Height          =   285
      Left            =   2700
      MaxLength       =   7
      TabIndex        =   2
      Top             =   375
      Width           =   540
   End
   Begin VB.TextBox txtNSpring 
      Height          =   285
      Left            =   3300
      MaxLength       =   7
      TabIndex        =   0
      Top             =   75
      Width           =   540
   End
   Begin VB.TextBox txtBasePr 
      Height          =   285
      Left            =   3300
      MaxLength       =   7
      TabIndex        =   1
      Top             =   375
      Width           =   540
   End
   Begin VB.TextBox txtSRate 
      Height          =   285
      Left            =   3300
      MaxLength       =   7
      TabIndex        =   3
      Top             =   675
      Width           =   540
   End
   Begin VB.TextBox txtTurns 
      Height          =   285
      Left            =   3300
      MaxLength       =   7
      TabIndex        =   5
      Top             =   975
      Width           =   540
   End
   Begin VB.TextBox txtThrdpI 
      Height          =   285
      Left            =   3300
      MaxLength       =   7
      TabIndex        =   6
      Top             =   1275
      Width           =   540
   End
   Begin VB.TextBox txtdRnHt 
      Height          =   285
      Left            =   3300
      MaxLength       =   7
      TabIndex        =   8
      Top             =   1575
      Width           =   540
   End
   Begin Threed.SSPanel PnlInput 
      Height          =   420
      Index           =   0
      Left            =   30
      TabIndex        =   14
      Top             =   2310
      Width           =   2550
      _Version        =   65536
      _ExtentX        =   4498
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
      Left            =   2610
      TabIndex        =   15
      Top             =   2310
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
      Left            =   3540
      TabIndex        =   16
      Top             =   2310
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
      Alignment       =   2  'Center
      BackColor       =   &H0080FFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "-1-"
      Height          =   285
      Index           =   8
      Left            =   2700
      TabIndex        =   19
      Top             =   75
      Width           =   540
   End
   Begin VB.Label lbl 
      Caption         =   "Number of Springs"
      Height          =   195
      Index           =   7
      Left            =   660
      TabIndex        =   18
      Top             =   120
      Width           =   2010
   End
   Begin VB.Label lbl 
      Caption         =   "Spring Base Pressure - lbs"
      Height          =   195
      Index           =   6
      Left            =   660
      TabIndex        =   17
      Top             =   420
      Width           =   2010
   End
   Begin VB.Label lbl 
      Caption         =   "Spring Rate - lbs/turn"
      Height          =   195
      Index           =   4
      Left            =   660
      TabIndex        =   13
      Top             =   720
      Width           =   2010
   End
   Begin VB.Label lbl 
      Caption         =   "Adjuster Location - turns"
      Height          =   195
      Index           =   0
      Left            =   660
      TabIndex        =   9
      Top             =   1020
      Width           =   2010
   End
   Begin VB.Label lbl 
      Caption         =   "Adjuster threads per inch"
      Height          =   195
      Index           =   1
      Left            =   660
      TabIndex        =   10
      Top             =   1320
      Width           =   2010
   End
   Begin VB.Label lbl 
      Caption         =   "Delta Ring Height - inches"
      Height          =   195
      Index           =   5
      Left            =   660
      TabIndex        =   7
      Top             =   1620
      Width           =   2010
   End
   Begin VB.Label lbl 
      Alignment       =   1  'Right Justify
      BackColor       =   &H0080FFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "0"
      Height          =   285
      Index           =   3
      Left            =   3300
      TabIndex        =   12
      Top             =   1980
      Width           =   540
   End
   Begin VB.Label lbl 
      Caption         =   "Static Plate Force - lbs ="
      Height          =   195
      Index           =   2
      Left            =   660
      TabIndex        =   11
      Top             =   2010
      Width           =   2010
   End
   Begin VB.Line line1 
      BorderColor     =   &H00000000&
      X1              =   660
      X2              =   3825
      Y1              =   1920
      Y2              =   1920
   End
End
Attribute VB_Name = "frmSpring"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Public fc_Static As New CValue
Public fc_Value As Object
Private bFileDirty As Boolean

Private Sub Form_Activate()
    fc_Static.Value = Calclbs()
End Sub

Private Sub Form_Load()
    Set fc_Value = gc_Static
    
    fc_Static.UOM = UOM_NORMAL
    fc_Static.StatusMsg = "The calculated static plate force."
    fc_Static.Labelctl = lbl(2)
    fc_Static.ClsControl = lbl(3)
    fc_Static.Value = Calclbs()
    
    gc_NSpring.Labelctl = lbl(7)
    gc_BasePr.Labelctl = lbl(6)
    gc_SBasePr.Labelctl = lbl(6)
    gc_SRate.Labelctl = lbl(4)
    gc_SSRate.Labelctl = lbl(4)
    gc_Turns.Labelctl = lbl(0)
    gc_ThrdpI.Labelctl = lbl(1)
    gc_dRnHt.Labelctl = lbl(5)
    
    gc_NSpring.ClsControl = txtNSpring
    gc_BasePr.ClsControl = txtBasePr
    gc_SBasePr.ClsControl = txtSBasePr
    gc_SRate.ClsControl = txtSRate
    gc_SSRate.ClsControl = txtSSRate
    gc_Turns.ClsControl = txtTurns
    gc_ThrdpI.ClsControl = txtThrdpI
    gc_dRnHt.ClsControl = txtdRnHt
    
    If Not isBike Then
        gc_SSRate.UOM = UOM_NORMAL:     gc_SRate.UOM = UOM_NORMAL
        
        With gc_ThrdpI
            .UOM = UOM_NORMAL
            .StatusMsg = "The thread pitch on the static spring adjuster."
            txtThrdpI.Text = gc_ThrdpI.Formatted
        End With
        
        If isGlide Then
            lbl(6).Visible = False: txtSBasePr.Visible = False: txtBasePr.Visible = False
            lbl(4).Top = 420:       txtSSRate.Top = 375:        txtSRate.Top = 375
            lbl(0).Top = 720:       txtTurns.Top = 675
            lbl(1).Top = 1020:      txtThrdpI.Top = 975
            lbl(5).Visible = False: txtdRnHt.Visible = False
            
            Line1.Y1 = 1320:        Line1.Y2 = 1320
            lbl(2).Top = 1410:      lbl(3).Top = 1380
            PnlInput(0).Top = 1710: PnlInput(1).Top = 1710: PnlInput(2).Top = 1710
            Me.Height = 2640
        End If
    Else
        lbl(0).Visible = False:         txtTurns.Visible = False
        gc_SSRate.UOM = UOM_ALTERNATE:  gc_SRate.UOM = UOM_ALTERNATE
        
        With gc_ThrdpI
            .UOM = UOM_ALTERNATE
            .StatusMsg = "The thickness of the added spring shims used beyond the base shims."
            txtThrdpI.Text = gc_ThrdpI.Formatted
        End With
        
        lbl(1).Top = 1020:      txtThrdpI.Top = 975
        lbl(5).Top = 1320:      txtdRnHt.Top = 1275
        
        Line1.Y1 = 1620:        Line1.Y2 = 1620
        lbl(2).Top = 1710:      lbl(3).Top = 1680
        PnlInput(0).Top = 2010: PnlInput(1).Top = 2010: PnlInput(2).Top = 2010
        Me.Height = 2940
    End If
End Sub

Private Sub Form_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_RESET, fc_Value
End Sub

Private Sub Form_Unload(Cancel As Integer)
    gc_NSpring.Labelctl = Nothing
    gc_BasePr.Labelctl = Nothing
    gc_SBasePr.Labelctl = Nothing
    gc_SRate.Labelctl = Nothing
    gc_SSRate.Labelctl = Nothing
    gc_Turns.Labelctl = Nothing
    gc_ThrdpI.Labelctl = Nothing
    gc_dRnHt.Labelctl = Nothing
    
    gc_NSpring.ClsControl = Nothing
    gc_BasePr.ClsControl = Nothing
    gc_SBasePr.ClsControl = Nothing
    gc_SRate.ClsControl = Nothing
    gc_SSRate.ClsControl = Nothing
    gc_Turns.ClsControl = Nothing
    gc_ThrdpI.ClsControl = Nothing
    gc_dRnHt.ClsControl = Nothing

    fc_Static.Labelctl = Nothing
    fc_Static.ClsControl = Nothing
End Sub


Private Sub lbl_DblClick(Index As Integer)
    If Index = 3 Then
        gc_Static.Value = val(lbl(3).caption)
        ClutchCalc
        Unload Me
    End If
End Sub

Private Sub lbl_MouseMove(Index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    If Index = 3 Then
        setpanels Me, PNL_SET, fc_Static
    End If
End Sub


Private Sub txtNSpring_GotFocus()
    setpanels Me, PNL_SAVE, gc_NSpring
End Sub

Private Sub txtNSpring_KeyPress(KeyAscii As Integer)
    gc_NSpring.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtNSpring_Check
End Sub

Private Sub txtNSpring_LostFocus()
    gc_NSpring.Value = val(txtNSpring.Text)
    txtNSpring_Check
End Sub

Private Sub txtNSpring_Check()
    If gc_NSpring.IsChanged Then
        gc_BasePr.Value = Round(gc_NSpring.Value * gc_SBasePr.Value, 1)
        gc_SRate.Value = Round(gc_NSpring.Value * gc_SSRate.Value, 1)
        
        fc_Static.Value = Calclbs()
    End If
End Sub

Private Sub txtNSpring_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_NSpring
End Sub


Private Sub txtSBasePr_GotFocus()
    setpanels Me, PNL_SAVE, gc_SBasePr
End Sub

Private Sub txtSBasePr_KeyPress(KeyAscii As Integer)
    gc_SBasePr.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtSBasePr_Check
End Sub

Private Sub txtSBasePr_LostFocus()
    gc_SBasePr.Value = val(txtSBasePr.Text)
    txtSBasePr_Check
End Sub

Private Sub txtSBasePr_Check()
    If gc_SBasePr.IsChanged Then
        gc_BasePr.Value = Round(gc_NSpring.Value * gc_SBasePr.Value, 1)
        
        fc_Static.Value = Calclbs()
    End If
End Sub

Private Sub txtSBasePr_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_SBasePr
End Sub


Private Sub txtBasePr_GotFocus()
    setpanels Me, PNL_SAVE, gc_BasePr
End Sub

Private Sub txtBasePr_KeyPress(KeyAscii As Integer)
    gc_BasePr.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtBasePr_Check
End Sub

Private Sub txtBasePr_LostFocus()
    gc_BasePr.Value = val(txtBasePr.Text)
    txtBasePr_Check
End Sub

Private Sub txtBasePr_Check()
    If gc_BasePr.IsChanged Then
        If gc_NSpring.Value > 0 Then
            gc_SBasePr.Value = Round(gc_BasePr.Value / gc_NSpring.Value, 0.1)
        End If
        
        fc_Static.Value = Calclbs()
    End If
End Sub

Private Sub txtBasePr_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_BasePr
End Sub


Private Sub txtSSRate_GotFocus()
    setpanels Me, PNL_SAVE, gc_SSRate
End Sub

Private Sub txtSSRate_KeyPress(KeyAscii As Integer)
    gc_SSRate.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtSSRate_Check
End Sub

Private Sub txtSSRate_LostFocus()
    gc_SSRate.Value = val(txtSSRate.Text)
    txtSSRate_Check
End Sub

Private Sub txtSSRate_Check()
    If gc_SSRate.IsChanged Then
        gc_SRate.Value = Round(gc_NSpring.Value * gc_SSRate.Value, 1)
        
        fc_Static.Value = Calclbs()
    End If
End Sub

Private Sub txtSSRate_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_SSRate
End Sub


Private Sub txtSRate_GotFocus()
    setpanels Me, PNL_SAVE, gc_SRate
End Sub

Private Sub txtSRate_KeyPress(KeyAscii As Integer)
    gc_SRate.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtSRate_Check
End Sub

Private Sub txtSRate_LostFocus()
    gc_SRate.Value = val(txtSRate.Text)
    txtSRate_Check
End Sub

Private Sub txtSRate_Check()
    If gc_SRate.IsChanged Then
        If gc_NSpring.Value > 0 Then
            gc_SSRate.Value = Round(gc_SRate.Value / gc_NSpring.Value, 0.1)
        End If
        
        fc_Static.Value = Calclbs()
    End If
End Sub

Private Sub txtSRate_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_SRate
End Sub


Private Sub txtTurns_DblClick()
    gc_Turns.Value = CalcTurns
    txtTurns_Check
End Sub

Private Sub txtTurns_GotFocus()
    setpanels Me, PNL_SAVE, gc_Turns
End Sub

Private Sub txtTurns_KeyPress(KeyAscii As Integer)
    gc_Turns.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtTurns_Check
End Sub

Private Sub txtTurns_LostFocus()
    gc_Turns.Value = val(txtTurns.Text)
    txtTurns_Check
End Sub

Private Sub txtTurns_Check()
    If gc_Turns.IsChanged Then
        fc_Static.Value = Calclbs()
    End If
End Sub

Private Sub txtTurns_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_Turns
End Sub


Private Sub txtThrdpI_GotFocus()
    setpanels Me, PNL_SAVE, gc_ThrdpI
End Sub

Private Sub txtThrdpI_KeyPress(KeyAscii As Integer)
    gc_ThrdpI.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtThrdpI_Check
End Sub

Private Sub txtThrdpI_LostFocus()
    gc_ThrdpI.Value = val(txtThrdpI.Text)
    txtThrdpI_Check
End Sub

Private Sub txtThrdpI_Check()
    If gc_ThrdpI.IsChanged Then
        fc_Static.Value = Calclbs()
    End If
End Sub

Private Sub txtThrdpI_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_ThrdpI
End Sub


Private Sub txtdRnHt_GotFocus()
    setpanels Me, PNL_SAVE, gc_dRnHt
End Sub

Private Sub txtdRnHt_KeyPress(KeyAscii As Integer)
    gc_dRnHt.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtdRnHt_Check
End Sub

Private Sub txtdRnHt_LostFocus()
    gc_dRnHt.Value = val(txtdRnHt.Text)
    txtdRnHt_Check
End Sub

Private Sub txtdRnHt_Check()
    If gc_dRnHt.IsChanged Then
        fc_Static.Value = Calclbs()
    End If
End Sub

Private Sub txtdRnHt_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_dRnHt
End Sub


Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
