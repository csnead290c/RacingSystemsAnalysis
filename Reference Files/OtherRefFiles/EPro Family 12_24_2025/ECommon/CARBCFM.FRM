VERSION 5.00
Begin VB.Form frmCarb 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Throttle CFM @ 1.5 inches Hg Worksheet"
   ClientHeight    =   2670
   ClientLeft      =   1020
   ClientTop       =   3030
   ClientWidth     =   5490
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   2670
   ScaleWidth      =   5490
   ShowInTaskbar   =   0   'False
   Begin VB.TextBox txtTVDiaS 
      Height          =   285
      Left            =   3900
      MaxLength       =   6
      TabIndex        =   5
      Top             =   960
      Width           =   600
   End
   Begin VB.TextBox txtTBDiaS 
      Height          =   285
      Left            =   3900
      MaxLength       =   6
      TabIndex        =   4
      Top             =   600
      Width           =   600
   End
   Begin VB.TextBox txtNoTBS 
      Height          =   285
      Left            =   3900
      MaxLength       =   6
      TabIndex        =   3
      Top             =   240
      Width           =   600
   End
   Begin VB.OptionButton optTBType 
      Alignment       =   1  'Right Justify
      Caption         =   "Slide Valve"
      Height          =   195
      Index           =   1
      Left            =   3330
      TabIndex        =   8
      ToolTipText     =   "Press this option button for a Slide Valve throttle plate"
      Top             =   1350
      Width           =   1110
   End
   Begin VB.OptionButton optTBType 
      Alignment       =   1  'Right Justify
      Caption         =   "Butterfly"
      Height          =   195
      Index           =   0
      Left            =   2160
      TabIndex        =   6
      ToolTipText     =   "Press this option button for a Butterfly throttle plate"
      Top             =   1350
      Width           =   870
   End
   Begin VB.TextBox txtTVDia 
      Height          =   285
      Left            =   3000
      MaxLength       =   6
      TabIndex        =   2
      Top             =   960
      Width           =   600
   End
   Begin VB.TextBox txtTBDia 
      Height          =   285
      Left            =   3000
      MaxLength       =   6
      TabIndex        =   1
      Top             =   600
      Width           =   600
   End
   Begin VB.TextBox txtNoTB 
      Height          =   285
      Left            =   3000
      MaxLength       =   6
      TabIndex        =   0
      Top             =   240
      Width           =   600
   End
   Begin VB.Label lblHELP 
      BackColor       =   &H00E0E0E0&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(0)"
      Height          =   420
      Index           =   0
      Left            =   60
      TabIndex        =   18
      Top             =   2160
      Width           =   3300
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00E0E0E0&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(1)"
      Height          =   420
      Index           =   1
      Left            =   3390
      TabIndex        =   17
      Top             =   2160
      Width           =   960
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
      Top             =   2160
      Width           =   960
   End
   Begin VB.Label Label1 
      Caption         =   "Secondary"
      Height          =   240
      Index           =   5
      Left            =   3810
      TabIndex        =   15
      Top             =   30
      Width           =   780
   End
   Begin VB.Label Label1 
      Caption         =   "Primary"
      Height          =   240
      Index           =   4
      Left            =   3030
      TabIndex        =   14
      Top             =   30
      Width           =   780
   End
   Begin VB.Label Label1 
      Caption         =   "Throttle Style:"
      Height          =   240
      Index           =   3
      Left            =   750
      TabIndex        =   13
      Top             =   1350
      Width           =   990
   End
   Begin VB.Label Label1 
      Caption         =   "Venturi Diameter - millimeters"
      Height          =   240
      Index           =   2
      Left            =   750
      TabIndex        =   12
      Top             =   990
      Width           =   2100
   End
   Begin VB.Label Label1 
      Caption         =   "Throttle Diameter - millimeters"
      Height          =   240
      Index           =   1
      Left            =   750
      TabIndex        =   11
      Top             =   630
      Width           =   2100
   End
   Begin VB.Label Label1 
      Caption         =   "Number of Throttle Bores"
      Height          =   240
      Index           =   0
      Left            =   750
      TabIndex        =   10
      Top             =   270
      Width           =   2100
   End
   Begin VB.Line Line1 
      X1              =   750
      X2              =   4500
      Y1              =   1680
      Y2              =   1680
   End
   Begin VB.Label Label2 
      Caption         =   "Throttle CFM @ 1.5 inch Hg"
      Height          =   240
      Left            =   750
      TabIndex        =   9
      Top             =   1800
      Width           =   2250
   End
   Begin VB.Label lblWSCarb 
      Alignment       =   1  'Right Justify
      BorderStyle     =   1  'Fixed Single
      Height          =   255
      Left            =   3450
      TabIndex        =   7
      Top             =   1770
      Width           =   600
   End
End
Attribute VB_Name = "frmCarb"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Public fc_Value As Object
Private bFileDirty As Boolean

Private Sub Form_Load()
    Me.Move 1800, 840
    'setpanels Me, PNL_SAVE, fc_Value
    SetHelp Me, HELP_SAVE, fc_Value
    
    optTBType(0).Value = gc_TBType.Value
    optTBType(1).Value = Not gc_TBType.Value
    
    CalcCarb
    LoadScreen
    bFileDirty = False
End Sub


Private Sub optTBType_Click(Index As Integer)
    With gc_TBType
        .Value = IIf(Index = 0, True, False)
        
        If .IsChanged Then
            CalcCarb
            LoadScreen
            .IsChanged = False
        End If
    End With
End Sub

Private Sub optTBType_GotFocus(Index As Integer)
    'setpanels Me, PNL_SAVE, gc_Blank
    SetHelp Me, HELP_SAVE, gc_Blank
End Sub

Private Sub optTBType_MouseMove(Index As Integer, Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Blank
    SetHelp Me, HELP_SET, gc_Blank
End Sub


Private Sub form_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_RESET, fc_Value
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub pnlInput_Click(Index As Integer)
    txtNoTB.SetFocus
End Sub

Private Sub lblWSCarb_DblClick()
    gc_CarbCFM.Value = val(lblWSCarb.caption)
    CalcEngPerf
    frmENGINE.LoadScreen
    Unload Me
End Sub


Private Sub txtNoTB_GotFocus()
    'setpanels Me, PNL_SAVE, gc_NoTB
    SetHelp Me, HELP_SAVE, gc_NoTB
End Sub

Private Sub txtNoTB_KeyPress(KeyAscii As Integer)
    gc_NoTB.TestNumericKeyPress KeyAscii, txtNoTB
    If KeyAscii = vbKeyReturn Then
        txtNoTB_LostFocus
        txtNoTB.SelLength = Len(txtNoTB.Text)
    End If
End Sub

Private Sub txtNoTB_LostFocus()
    With gc_NoTB
        .Value = val(txtNoTB.Text)
        
        If .IsChanged Then
            CalcCarb
            LoadScreen
            .IsChanged = False
            If .IsError Then txtNoTB.SetFocus
        Else
            txtNoTB.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtNoTB_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_NoTB
    SetHelp Me, HELP_SET, gc_NoTB
End Sub


Private Sub txtNoTBS_GotFocus()
    'setpanels Me, PNL_SAVE, gc_NoTBS
    SetHelp Me, HELP_SAVE, gc_NoTBS
End Sub

Private Sub txtNoTBS_KeyPress(KeyAscii As Integer)
    gc_NoTBS.TestNumericKeyPress KeyAscii, txtNoTBS
    If KeyAscii = vbKeyReturn Then
        txtNoTBS_LostFocus
        txtNoTBS.SelLength = Len(txtNoTBS.Text)
    End If
End Sub

Private Sub txtNoTBS_LostFocus()
    With gc_NoTBS
        .Value = val(txtNoTBS.Text)
        
        If .IsChanged Then
            If .Value = 0 Then
                gc_TBDiaS.IsCalc = True:    gc_TBDiaS.Value = 0
                gc_TVDiaS.IsCalc = True:    gc_TVDiaS.Value = 0
            End If
            
            CalcCarb
            LoadScreen
            .IsChanged = False
            If .IsError Then txtNoTBS.SetFocus
        Else
            txtNoTBS.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtNoTBS_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_NoTBS
    SetHelp Me, HELP_SET, gc_NoTBS
End Sub


Private Sub txtTBDia_GotFocus()
    'setpanels Me, PNL_SAVE, gc_TBDia
    SetHelp Me, HELP_SAVE, gc_TBDia
End Sub

Private Sub txtTBDia_KeyPress(KeyAscii As Integer)
    gc_TBDia.TestNumericKeyPress KeyAscii, txtTBDia
    If KeyAscii = vbKeyReturn Then
        txtTBDia_LostFocus
        txtTBDia.SelLength = Len(txtTBDia.Text)
    End If
End Sub

Private Sub txtTBDia_LostFocus()
    With gc_TBDia
        .Value = val(txtTBDia.Text)
        
        If .IsChanged Then
            SetTVDia
            If .Unit <> gc_TBDiaS.Unit Then
                If .Unit = "inches" Then
                    gc_TBDiaS.Value = gc_TBDiaS.Value / ZM
                Else
                    gc_TBDiaS.Value = gc_TBDiaS.Value * ZM
                End If
            End If
            
            CalcCarb
            LoadScreen
            .IsChanged = False
            If .IsError Then txtTBDia.SetFocus
        Else
            txtTBDia.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtTBDia_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_TBDia
    SetHelp Me, HELP_SET, gc_TBDia
End Sub


Private Sub txtTBDiaS_GotFocus()
    'setpanels Me, PNL_SAVE, gc_TBDiaS
    SetHelp Me, HELP_SAVE, gc_TBDiaS
End Sub

Private Sub txtTBDiaS_KeyPress(KeyAscii As Integer)
    gc_TBDiaS.TestNumericKeyPress KeyAscii, txtTBDiaS
    If KeyAscii = vbKeyReturn Then
        txtTBDiaS_LostFocus
        txtTBDiaS.SelLength = Len(txtTBDiaS.Text)
    End If
End Sub

Private Sub txtTBDiaS_LostFocus()
    With gc_TBDiaS
        .Value = val(txtTBDiaS.Text)
        
        If .IsChanged Then
            SetTVDiaS
            If .Unit <> gc_TBDia.Unit Then
                If .Unit = "inches" Then
                    gc_TBDia.Value = gc_TBDia.Value / ZM
                Else
                    gc_TBDia.Value = gc_TBDia.Value * ZM
                End If
            End If
            
            CalcCarb
            LoadScreen
            .IsChanged = False
            If .IsError Then txtTBDiaS.SetFocus
        Else
            txtTBDiaS.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtTBDiaS_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_TBDiaS
    SetHelp Me, HELP_SET, gc_TBDiaS
End Sub


Private Sub txtTVDia_GotFocus()
    'setpanels Me, PNL_SAVE, gc_TVDia
    SetHelp Me, HELP_SAVE, gc_TVDia
End Sub

Private Sub txtTVDia_KeyPress(KeyAscii As Integer)
    gc_TVDia.TestNumericKeyPress KeyAscii, txtTVDia
    If KeyAscii = vbKeyReturn Then
        txtTVDia_LostFocus
        txtTVDia.SelLength = Len(txtTVDia.Text)
    End If
End Sub

Private Sub txtTVDia_LostFocus()
    With gc_TVDia
        .Value = val(txtTVDia.Text)
        
        If .IsChanged Then
            If .Unit <> gc_TVDiaS.Unit Then
                If .Unit = "inches" Then
                    gc_TVDiaS.Value = gc_TVDiaS.Value / ZM
                Else
                    gc_TVDiaS.Value = gc_TVDiaS.Value * ZM
                End If
            End If
            
            CalcCarb
            LoadScreen
            .IsChanged = False
            If .IsError Then txtTVDia.SetFocus
        Else
            txtTVDia.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtTVDia_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_TVDia
    SetHelp Me, HELP_SET, gc_TVDia
End Sub


Private Sub txtTVDiaS_GotFocus()
    'setpanels Me, PNL_SAVE, gc_TVDiaS
    SetHelp Me, HELP_SAVE, gc_TVDiaS
End Sub

Private Sub txtTVDiaS_KeyPress(KeyAscii As Integer)
    gc_TVDiaS.TestNumericKeyPress KeyAscii, txtTVDiaS
    If KeyAscii = vbKeyReturn Then
        txtTVDiaS_LostFocus
        txtTVDiaS.SelLength = Len(txtTVDiaS.Text)
    End If
End Sub

Private Sub txtTVDiaS_LostFocus()
    With gc_TVDiaS
        .Value = val(txtTVDiaS.Text)
        
        If .IsChanged Then
            If .Unit <> gc_TVDia.Unit Then
                If .Unit = "inches" Then
                    gc_TVDia.Value = gc_TVDia.Value / ZM
                Else
                    gc_TVDia.Value = gc_TVDia.Value * ZM
                End If
            End If
            
            CalcCarb
            LoadScreen
            .IsChanged = False
            If .IsError Then txtTVDiaS.SetFocus
        Else
            txtTVDiaS.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtTVDiaS_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_TVDiaS
    SetHelp Me, HELP_SET, gc_TVDiaS
End Sub


Private Sub LoadScreen()
Dim ZCFM As Single
    Label1(1).caption = "Throttle Diameter - " & gc_TBDia.Unit
    Label1(2).caption = "Venturi Diameter - " & gc_TVDia.Unit
    
    txtNoTB.Text = gc_NoTB.Formatted
    txtTBDia.Text = gc_TBDia.Formatted
    txtTVDia.Text = gc_TVDia.Formatted
    
    txtNoTBS.Text = gc_NoTBS.Formatted
    txtTBDiaS.Text = gc_TBDiaS.Formatted
    txtTVDiaS.Text = gc_TVDiaS.Formatted
    
    lblWSCarb.caption = gc_WSCarbCFM.Formatted
    
    If gc_WSCarbCFM.Value > 100 Then
        ZCFM = Round(gc_WSCarbCFM.Value * Sqr(3 / 1.5), 10)
    Else
        ZCFM = Round(gc_WSCarbCFM.Value * Sqr(3 / 1.5), 2)
    End If
    lblWSCarb.ToolTipText = "Throttle CFM @ 3.0 inch Hg = " & Format(ZCFM, "0")
    Label2.ToolTipText = lblWSCarb.ToolTipText
    
    bFileDirty = True
End Sub

Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
