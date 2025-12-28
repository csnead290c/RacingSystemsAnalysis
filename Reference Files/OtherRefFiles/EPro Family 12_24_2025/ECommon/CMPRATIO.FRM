VERSION 5.00
Begin VB.Form frmCR 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Compression Ratio Worksheet"
   ClientHeight    =   2610
   ClientLeft      =   1860
   ClientTop       =   3495
   ClientWidth     =   5400
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   2610
   ScaleWidth      =   5400
   ShowInTaskbar   =   0   'False
   Begin VB.TextBox txtDeck 
      Height          =   285
      Left            =   3600
      MaxLength       =   6
      TabIndex        =   1
      Top             =   510
      Width           =   600
   End
   Begin VB.TextBox txtGasket 
      Height          =   285
      Left            =   3600
      MaxLength       =   6
      TabIndex        =   2
      Top             =   870
      Width           =   600
   End
   Begin VB.TextBox txtDome 
      Height          =   285
      Left            =   3600
      MaxLength       =   6
      TabIndex        =   3
      Top             =   1230
      Width           =   600
   End
   Begin VB.TextBox txtChamber 
      Height          =   285
      Left            =   3600
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
      TabIndex        =   12
      Top             =   2040
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
      TabIndex        =   11
      Top             =   2040
      Width           =   960
   End
   Begin VB.Label lblHELP 
      BackColor       =   &H00E0E0E0&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(0)"
      Height          =   420
      Index           =   0
      Left            =   60
      TabIndex        =   10
      Top             =   2040
      Width           =   3300
   End
   Begin VB.Label lblWSCR 
      Alignment       =   1  'Right Justify
      BorderStyle     =   1  'Fixed Single
      Height          =   255
      Left            =   3600
      TabIndex        =   9
      Top             =   1680
      Width           =   600
   End
   Begin VB.Label Label2 
      Caption         =   "Compression Ratio"
      Height          =   240
      Left            =   960
      TabIndex        =   8
      Top             =   1710
      Width           =   2400
   End
   Begin VB.Line Line1 
      X1              =   960
      X2              =   4200
      Y1              =   1590
      Y2              =   1590
   End
   Begin VB.Label Label1 
      Caption         =   "Combustion Chamber Volume - c.c."
      Height          =   240
      Index           =   3
      Left            =   960
      TabIndex        =   7
      Top             =   180
      Width           =   2490
   End
   Begin VB.Label Label1 
      Caption         =   "Piston Dome Volume - c.c."
      Height          =   240
      Index           =   2
      Left            =   960
      TabIndex        =   6
      Top             =   1260
      Width           =   2400
   End
   Begin VB.Label Label1 
      Caption         =   "Head Gasket Thickness - inch"
      Height          =   240
      Index           =   1
      Left            =   960
      TabIndex        =   5
      Top             =   900
      Width           =   2400
   End
   Begin VB.Label Label1 
      Caption         =   "Piston to Deck Height - inch"
      Height          =   240
      Index           =   0
      Left            =   960
      TabIndex        =   4
      Top             =   540
      Width           =   2400
   End
End
Attribute VB_Name = "frmCR"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Public fc_Value As Object
Private bFileDirty As Boolean

Private Sub Form_Load()
    Me.Move 1860, 3240
    'setpanels Me, PNL_SAVE, gc_Chamber
    SetHelp Me, HELP_SAVE, gc_Chamber
    
    CalcCompRatio
    LoadScreen
    bFileDirty = False
End Sub

Private Sub form_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_RESET, fc_Value
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub pnlInput_Click(Index As Integer)
    txtChamber.SetFocus
End Sub

Private Sub lblWSCR_DblClick()
    gc_CR.Value = val(lblWSCR.caption)
    CalcEngPerf
    frmENGINE.LoadScreen
    Unload Me
End Sub


Private Sub txtChamber_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Chamber
    SetHelp Me, HELP_SAVE, gc_Chamber
End Sub

Private Sub txtChamber_KeyPress(KeyAscii As Integer)
    gc_Chamber.TestNumericKeyPress KeyAscii, txtChamber
    If KeyAscii = vbKeyReturn Then
        txtChamber_LostFocus
        txtChamber.SelLength = Len(txtChamber.Text)
    End If
End Sub

Private Sub txtChamber_LostFocus()
    With gc_Chamber
        .Value = val(txtChamber.Text)
        
        If .IsChanged Then
            CalcKCDGH
            CalcCompRatio
            If gc_WSCR.IsError Then CalcDomeVolume gc_WSCR.Value
            
            LoadScreen
            .IsChanged = False
            If .IsError Then txtChamber.SetFocus
        Else
            txtChamber.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtChamber_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Chamber
    SetHelp Me, HELP_SET, gc_Chamber
End Sub


Private Sub txtDeck_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Deck
    SetHelp Me, HELP_SAVE, gc_Deck
End Sub

Private Sub txtDeck_KeyPress(KeyAscii As Integer)
    gc_Deck.TestNumericKeyPress KeyAscii, txtDeck
    If KeyAscii = vbKeyReturn Then
        txtDeck_LostFocus
        txtDeck.SelLength = Len(txtDeck.Text)
    End If
End Sub

Private Sub txtDeck_LostFocus()
    With gc_Deck
        .Value = val(txtDeck.Text)
        
        If .IsChanged Then
            CalcKCDGH
            CalcCompRatio
            If gc_WSCR.IsError Then CalcDomeVolume gc_WSCR.Value
            
            LoadScreen
            .IsChanged = False
            If .IsError Then txtDeck.SetFocus
        Else
            txtDeck.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtDeck_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Deck
    SetHelp Me, HELP_SET, gc_Deck
End Sub


Private Sub txtGasket_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Gasket
    SetHelp Me, HELP_SAVE, gc_Gasket
End Sub

Private Sub txtGasket_KeyPress(KeyAscii As Integer)
    gc_Gasket.TestNumericKeyPress KeyAscii, txtGasket
    If KeyAscii = vbKeyReturn Then
        txtGasket_LostFocus
        txtGasket.SelLength = Len(txtGasket.Text)
    End If
End Sub

Private Sub txtGasket_LostFocus()
    With gc_Gasket
        .Value = val(txtGasket.Text)
        
        If .IsChanged Then
            CalcKCDGH
            CalcCompRatio
            If gc_WSCR.IsError Then CalcDomeVolume gc_WSCR.Value
            
            LoadScreen
            .IsChanged = False
            If .IsError Then txtGasket.SetFocus
        Else
            txtGasket.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtGasket_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Gasket
    SetHelp Me, HELP_SET, gc_Gasket
End Sub


Private Sub txtDome_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Dome
    SetHelp Me, HELP_SAVE, gc_Dome
End Sub

Private Sub txtDome_KeyPress(KeyAscii As Integer)
    gc_Dome.TestNumericKeyPress KeyAscii, txtDome
    If KeyAscii = vbKeyReturn Then
        txtDome_LostFocus
        txtDome.SelLength = Len(txtDome.Text)
    End If
End Sub

Private Sub txtDome_LostFocus()
    With gc_Dome
        .Value = val(txtDome.Text)
        
        If .IsChanged Then
            CalcKCDGH
            CalcCompRatio
            If gc_WSCR.IsError Then CalcDomeVolume gc_WSCR.Value
            
            LoadScreen
            .IsChanged = False
            If .IsError Then txtDome.SetFocus
        Else
            txtDome.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtDome_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Dome
    SetHelp Me, HELP_SET, gc_Dome
End Sub


Private Sub LoadScreen()
    'make sure bore and stroke changes on worksheet CR are handled properly
    With gc_WSCR
        If .Value < .MinVal Then
            .Value = .MinVal:   CalcDomeVolume .Value
        ElseIf .Value > .MaxVal Then
            .Value = .MaxVal:   CalcDomeVolume .Value
        End If
    End With
    
    txtChamber.Text = gc_Chamber.Formatted
    txtDeck.Text = gc_Deck.Formatted
    txtGasket.Text = gc_Gasket.Formatted
    txtDome.Text = gc_Dome.Formatted
    lblWSCR.caption = gc_WSCR.Formatted
    
    bFileDirty = True
End Sub

Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
