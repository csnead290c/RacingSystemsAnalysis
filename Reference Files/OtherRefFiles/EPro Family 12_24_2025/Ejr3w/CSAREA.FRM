VERSION 5.00
Begin VB.Form frmCSArea 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Minimum Cross-section Area Worksheet"
   ClientHeight    =   3255
   ClientLeft      =   1305
   ClientTop       =   3660
   ClientWidth     =   5400
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   3255
   ScaleWidth      =   5400
   ShowInTaskbar   =   0   'False
   Begin VB.TextBox txtVSWidth 
      Height          =   285
      Left            =   3975
      MaxLength       =   6
      TabIndex        =   3
      Top             =   1230
      Width           =   600
   End
   Begin VB.TextBox txtVSAngle 
      Height          =   285
      Left            =   3975
      MaxLength       =   6
      TabIndex        =   2
      Top             =   870
      Width           =   600
   End
   Begin VB.TextBox txtValveLift 
      Height          =   285
      Left            =   3975
      MaxLength       =   6
      TabIndex        =   5
      Top             =   1950
      Width           =   600
   End
   Begin VB.TextBox txtStemDia 
      Height          =   285
      Left            =   3975
      MaxLength       =   6
      TabIndex        =   4
      Top             =   1590
      Width           =   600
   End
   Begin VB.TextBox txtSeatPer 
      Height          =   285
      Left            =   3975
      MaxLength       =   6
      TabIndex        =   1
      Top             =   510
      Width           =   600
   End
   Begin VB.TextBox txtSeatDia 
      Height          =   285
      Left            =   3975
      MaxLength       =   6
      TabIndex        =   0
      Top             =   150
      Width           =   600
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00E0E0E0&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(2)"
      Height          =   420
      Index           =   2
      Left            =   4380
      TabIndex        =   16
      Top             =   2760
      Width           =   960
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00E0E0E0&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(1)"
      Height          =   420
      Index           =   1
      Left            =   3390
      TabIndex        =   15
      Top             =   2760
      Width           =   960
   End
   Begin VB.Label lblHELP 
      BackColor       =   &H00E0E0E0&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(0)"
      Height          =   420
      Index           =   0
      Left            =   60
      TabIndex        =   14
      Top             =   2760
      Width           =   3300
   End
   Begin VB.Label Label1 
      Caption         =   "Valve Seat Width - inch"
      Height          =   240
      Index           =   6
      Left            =   1035
      TabIndex        =   13
      Top             =   1260
      Width           =   2850
   End
   Begin VB.Label Label1 
      Caption         =   "Valve Seat Angle - degree"
      Height          =   240
      Index           =   5
      Left            =   1035
      TabIndex        =   12
      Top             =   900
      Width           =   2850
   End
   Begin VB.Label Label1 
      Caption         =   "Maximum Intake Valve Lift - inch"
      Height          =   240
      Index           =   3
      Left            =   1035
      TabIndex        =   11
      Top             =   1980
      Width           =   2850
   End
   Begin VB.Label Label1 
      Caption         =   "Valve Seat Throat Area - sq inch"
      Height          =   240
      Index           =   4
      Left            =   1035
      TabIndex        =   10
      Top             =   2430
      Width           =   2850
   End
   Begin VB.Label Label1 
      Caption         =   "Valve Stem Diameter - millimeter"
      Height          =   240
      Index           =   2
      Left            =   1035
      TabIndex        =   9
      Top             =   1620
      Width           =   2850
   End
   Begin VB.Label Label1 
      Caption         =   "Valve Seat Throat Percentage - %"
      Height          =   240
      Index           =   1
      Left            =   1035
      TabIndex        =   8
      Top             =   540
      Width           =   2850
   End
   Begin VB.Label Label1 
      Caption         =   "Valve Seat Throat Diameter - millimeter"
      Height          =   240
      Index           =   0
      Left            =   1035
      TabIndex        =   7
      Top             =   180
      Width           =   2850
   End
   Begin VB.Label lblWSCSArea 
      Alignment       =   1  'Right Justify
      BorderStyle     =   1  'Fixed Single
      Height          =   255
      Left            =   3975
      TabIndex        =   6
      Top             =   2400
      Width           =   600
   End
   Begin VB.Line Line1 
      X1              =   1035
      X2              =   4566
      Y1              =   2310
      Y2              =   2310
   End
End
Attribute VB_Name = "frmCSArea"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Public fc_Value As Object
Private bFileDirty As Boolean

Private Sub Form_Load()
    Me.Move 1470, 2955
    'setpanels Me, PNL_SAVE, gc_SeatDia
    SetHelp Me, HELP_SAVE, gc_SeatDia
    
    EstSeatDia  'always recalculate seat diameter based on current CSArea value
    CalcSeatPer
    SetVSWidth
    LoadScreen
    bFileDirty = False
End Sub

Private Sub form_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_RESET, fc_Value
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub pnlInput_Click(Index As Integer)
    txtSeatDia.SetFocus
End Sub

Private Sub lblWSCSArea_DblClick()
    gc_CSArea.Value = val(lblWSCSArea.caption)
    CalcFlowStuff gc_MaxInFlow.Value
    frmMaxFlow.LoadScreen
    Unload Me
End Sub


Private Sub txtSeatDia_GotFocus()
    'setpanels Me, PNL_SAVE, gc_SeatDia
    SetHelp Me, HELP_SAVE, gc_SeatDia
End Sub

Private Sub txtSeatDia_KeyPress(KeyAscii As Integer)
    gc_SeatDia.TestNumericKeyPress KeyAscii, txtSeatDia
    If KeyAscii = vbKeyReturn Then
        txtSeatDia_LostFocus
        txtSeatDia.SelLength = Len(txtSeatDia.Text)
    End If
End Sub

Private Sub txtSeatDia_LostFocus()
    With gc_SeatDia
        .Value = val(txtSeatDia.Text)
        
        If .IsChanged Then
            CalcSeatPer
            SetVSWidth
            
            LoadScreen
            .IsChanged = False
            If .IsError Then txtSeatDia.SetFocus
        Else
            txtSeatDia.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtSeatDia_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_SeatDia
    SetHelp Me, HELP_SET, gc_SeatDia
End Sub


Private Sub txtSeatPer_GotFocus()
    'setpanels Me, PNL_SAVE, gc_SeatPer
    SetHelp Me, HELP_SAVE, gc_SeatPer
End Sub

Private Sub txtSeatPer_KeyPress(KeyAscii As Integer)
    gc_SeatPer.TestNumericKeyPress KeyAscii, txtSeatPer
    If KeyAscii = vbKeyReturn Then
        txtSeatPer_LostFocus
        txtSeatPer.SelLength = Len(txtSeatPer.Text)
    End If
End Sub

Private Sub txtSeatPer_LostFocus()
    With gc_SeatPer
        .Value = val(txtSeatPer.Text)
        
        If .IsChanged Then
            CalcSeatDia
            SetVSWidth
            
            LoadScreen
            .IsChanged = False
            If .IsError Then txtSeatPer.SetFocus
        Else
            txtSeatPer.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtSeatPer_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_SeatPer
    SetHelp Me, HELP_SET, gc_SeatPer
End Sub


Private Sub txtVSAngle_GotFocus()
    'setpanels Me, PNL_SAVE, gc_VSAngle
    SetHelp Me, HELP_SAVE, gc_VSAngle
End Sub

Private Sub txtVSAngle_KeyPress(KeyAscii As Integer)
    gc_VSAngle.TestNumericKeyPress KeyAscii, txtVSAngle
    If KeyAscii = vbKeyReturn Then
        txtVSAngle_LostFocus
        txtVSAngle.SelLength = Len(txtVSAngle.Text)
    End If
End Sub

Private Sub txtVSAngle_LostFocus()
    With gc_VSAngle
        .Value = val(txtVSAngle.Text)
        
        If .IsChanged Then
            SetVSWidth
            
            LoadScreen
            .IsChanged = False
            If .IsError Then txtVSAngle.SetFocus
        Else
            txtVSAngle.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtVSAngle_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_VSAngle
    SetHelp Me, HELP_SET, gc_VSAngle
End Sub


Private Sub txtVSWidth_GotFocus()
    'setpanels Me, PNL_SAVE, gc_VSWidth
    SetHelp Me, HELP_SAVE, gc_VSWidth
End Sub

Private Sub txtVSWidth_KeyPress(KeyAscii As Integer)
    gc_VSWidth.TestNumericKeyPress KeyAscii, txtVSWidth
    If KeyAscii = vbKeyReturn Then
        txtVSWidth_LostFocus
        txtVSWidth.SelLength = Len(txtVSWidth.Text)
    End If
End Sub

Private Sub txtVSWidth_LostFocus()
    With gc_VSWidth
        .Value = val(txtVSWidth.Text)
        
        If .IsChanged Then
            LoadScreen
            .IsChanged = False
            If .IsError Then txtVSWidth.SetFocus
        Else
            txtVSWidth.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtVSWidth_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_VSWidth
    SetHelp Me, HELP_SET, gc_VSWidth
End Sub


Private Sub txtStemDia_GotFocus()
    'setpanels Me, PNL_SAVE, gc_StemDia
    SetHelp Me, HELP_SAVE, gc_StemDia
End Sub

Private Sub txtStemDia_KeyPress(KeyAscii As Integer)
    gc_StemDia.TestNumericKeyPress KeyAscii, txtStemDia
    If KeyAscii = vbKeyReturn Then
        txtStemDia_LostFocus
        txtStemDia.SelLength = Len(txtStemDia.Text)
    End If
End Sub

Private Sub txtStemDia_LostFocus()
    With gc_StemDia
        .Value = val(txtStemDia.Text)
        
        If .IsChanged Then
            LoadScreen
            .IsChanged = False
            If .IsError Then txtStemDia.SetFocus
        Else
            txtStemDia.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtStemDia_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_StemDia
    SetHelp Me, HELP_SET, gc_StemDia
End Sub


Private Sub txtValveLift_GotFocus()
    'setpanels Me, PNL_SAVE, gc_ValveLift
    SetHelp Me, HELP_SAVE, gc_ValveLift
End Sub

Private Sub txtValveLift_KeyPress(KeyAscii As Integer)
    gc_ValveLift.TestNumericKeyPress KeyAscii, txtValveLift
    If KeyAscii = vbKeyReturn Then
        txtValveLift_LostFocus
        txtValveLift.SelLength = Len(txtValveLift.Text)
    End If
End Sub

Private Sub txtValveLift_LostFocus()
    With gc_ValveLift
        .Value = val(txtValveLift.Text)
        
        If .IsChanged Then
            LoadScreen
            .IsChanged = False
            If .IsError Then txtValveLift.SetFocus
        Else
            txtValveLift.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtValveLift_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_ValveLift
    SetHelp Me, HELP_SET, gc_ValveLift
End Sub


Private Sub LoadScreen()
    CalcWSCSArea gc_ValveLift.Value
    
    Label1(0).caption = "Valve Seat Throat Diameter - " & gc_SeatDia.Unit
    Label1(2).caption = "Valve Stem Diameter - " & gc_StemDia.Unit
    
    txtSeatDia.Text = gc_SeatDia.Formatted
    txtSeatPer.Text = gc_SeatPer.Formatted
    txtVSAngle.Text = gc_VSAngle.Formatted
    txtVSWidth.Text = gc_VSWidth.Formatted
    txtStemDia.Text = gc_StemDia.Formatted
    txtValveLift.Text = gc_ValveLift.Formatted
    lblWSCSArea.caption = gc_WSCSArea.Formatted

    bFileDirty = True
End Sub


Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
