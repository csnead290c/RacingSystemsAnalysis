VERSION 5.00
Begin VB.Form frmMaxFlow 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Intake Port Flow @"
   ClientHeight    =   2190
   ClientLeft      =   1005
   ClientTop       =   3450
   ClientWidth     =   5670
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   2190
   ScaleWidth      =   5670
   ShowInTaskbar   =   0   'False
   Begin VB.CommandButton btnCSCalc 
      Caption         =   "Area Calculator"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   360
      Left            =   4140
      TabIndex        =   12
      Top             =   120
      Width           =   1500
   End
   Begin VB.TextBox txtFlowVel 
      BackColor       =   &H8000000F&
      Height          =   285
      Left            =   3480
      MaxLength       =   6
      TabIndex        =   1
      Top             =   510
      Width           =   600
   End
   Begin VB.TextBox txtCSArea 
      Height          =   285
      Left            =   3480
      MaxLength       =   6
      TabIndex        =   0
      Top             =   150
      Width           =   600
   End
   Begin VB.TextBox txtFlowFlux 
      BackColor       =   &H8000000F&
      Height          =   285
      Left            =   3480
      MaxLength       =   6
      TabIndex        =   2
      Top             =   870
      Width           =   600
   End
   Begin VB.TextBox txtFVIndex 
      Height          =   285
      Left            =   3480
      MaxLength       =   6
      TabIndex        =   3
      Top             =   1230
      Width           =   600
   End
   Begin VB.CommandButton btnCSArea 
      Caption         =   "..."
      Height          =   285
      Left            =   3150
      TabIndex        =   4
      ToolTipText     =   "Press this button to display the Minimum Cross-section Area Worksheet"
      Top             =   150
      Width           =   285
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00E0E0E0&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(2)"
      Height          =   420
      Index           =   2
      Left            =   4650
      TabIndex        =   11
      Top             =   1680
      Width           =   960
   End
   Begin VB.Label lblHELP 
      Alignment       =   2  'Center
      BackColor       =   &H00E0E0E0&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(1)"
      Height          =   420
      Index           =   1
      Left            =   3660
      TabIndex        =   10
      Top             =   1680
      Width           =   960
   End
   Begin VB.Label lblHELP 
      BackColor       =   &H00E0E0E0&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "lblHELP(0)"
      Height          =   420
      Index           =   0
      Left            =   60
      TabIndex        =   9
      Top             =   1680
      Width           =   3570
   End
   Begin VB.Label Label1 
      Caption         =   "Intake Flow Velocity - ft/sec"
      Height          =   240
      Index           =   3
      Left            =   300
      TabIndex        =   8
      Top             =   540
      Width           =   2460
   End
   Begin VB.Label Label1 
      Caption         =   "Minimum Cross-section Area - sq inch"
      Height          =   240
      Index           =   2
      Left            =   300
      TabIndex        =   7
      Top             =   180
      Width           =   2790
   End
   Begin VB.Label Label1 
      Caption         =   "Intake Flow Flux - CFM/sq inch"
      Height          =   240
      Index           =   4
      Left            =   300
      TabIndex        =   6
      Top             =   900
      Width           =   2460
   End
   Begin VB.Label Label1 
      Caption         =   "Flow Velocity Index - %"
      Height          =   240
      Index           =   5
      Left            =   300
      TabIndex        =   5
      Top             =   1260
      Width           =   2460
   End
End
Attribute VB_Name = "frmMaxFlow"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Public fc_Value As Object
Private bFileDirty As Boolean

Private Sub Form_Load()
    Me.Move 3450, 3870
    Me.caption = "Intake Port Flow @ " & gc_DeltaP.Formatted & " inch H2O Worksheet"
    'setpanels Me, PNL_SAVE, fc_Value
    SetHelp Me, HELP_SAVE, fc_Value
    
    CalcFlowStuff gc_MaxInFlow.Value
    
    LoadScreen
    bFileDirty = False
End Sub

Private Sub form_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_RESET, fc_Value
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub pnlInput_Click(Index As Integer)
    txtCSArea.SetFocus
End Sub


Private Sub btnCSArea_Click()
    btnCSCalc.Enabled = False
    frmENGINE.btnCSCalc.Enabled = False
    frmCSArea.Show vbModal
    If frmCSArea.FileDirty Then bFileDirty = True
    btnCSCalc.Enabled = True
    frmENGINE.btnCSCalc.Enabled = True
    txtCSArea.SetFocus
End Sub

Private Sub btnCSArea_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Blank
    SetHelp Me, HELP_SAVE, gc_Blank
End Sub

Private Sub btnCSArea_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Blank
    SetHelp Me, HELP_SET, gc_Blank
End Sub


Private Sub btnCSCalc_Click()
    btnCSCalc.Enabled = False
    frmENGINE.btnCSCalc.Enabled = False
    frmCSCalc.Show vbModal
    If frmCSCalc.FileDirty Then bFileDirty = True
    btnCSCalc.Enabled = True
    frmENGINE.btnCSCalc.Enabled = True
    txtCSArea.SetFocus
End Sub

Private Sub btnCSCalc_GotFocus()
    'setpanels Me, PNL_SAVE, gc_Blank
    SetHelp Me, HELP_SAVE, gc_Blank
End Sub

Private Sub btnCSCalc_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_Blank
    SetHelp Me, HELP_SET, gc_Blank
End Sub


Private Sub txtCSArea_GotFocus()
    'setpanels Me, PNL_SAVE, gc_CSArea
    SetHelp Me, HELP_SAVE, gc_CSArea
End Sub

Private Sub txtCSArea_KeyPress(KeyAscii As Integer)
    gc_CSArea.TestNumericKeyPress KeyAscii, txtCSArea
    If KeyAscii = vbKeyReturn Then
        txtCSArea_LostFocus
        txtCSArea.SelLength = Len(txtCSArea.Text)
    End If
End Sub

Private Sub txtCSArea_LostFocus()
Dim Work As String
    With gc_CSArea
        .Value = val(txtCSArea.Text)
        
        CalcFlowStuff gc_MaxInFlow.Value
        txtCSArea.Text = gc_CSArea.Formatted
        txtFlowVel.Text = gc_FlowVel.Formatted
        txtFlowFlux.Text = gc_FlowFlux.Formatted
        txtFVIndex.Text = gc_FVIndex.Formatted
        
        If .IsChanged Then
            If gc_FVIndex.Value > gc_FVIndex.MaxVal Then
                'make sure that the FVIndex is not greater than MaxVal
                Work = .Formatted
                .Value = RoundUp(.Value * gc_FVIndex.Value / gc_FVIndex.MaxVal, 0.002)
                MsgBox "The calculated intake port flow velocity is now too high based on the input minimum cross-section area of " & Work & " sq inch!" & Chr(13) & Chr(13) & "This engine design requires more intake port cross-section area - at least " & .Formatted & " sq inch.  The Intake Port Flow Worksheet will now use a value of " & .Formatted & " sq inch instead of the input " & Work & " sq inch.", 64, "Intake Port Flow Velocity Warning!"
                txtCSArea.Text = .Formatted
            ElseIf gc_FVIndex.Value < gc_FVIndex.MinVal Then
                'make sure that the FVIndex is not less than MaxVal
                Work = .Formatted
                .Value = RoundDown(.Value * gc_FVIndex.Value / gc_FVIndex.MinVal, 0.002)
                MsgBox "The calculated intake port flow velocity is now too low based on the input minimum cross-section area of " & Work & " sq inch!" & Chr(13) & Chr(13) & "This engine design requires less intake port cross-section area - no more than " & .Formatted & " sq inch.  The Intake Port Flow Worksheet will now use a value of " & .Formatted & " sq inch instead of the input " & Work & " sq inch.", 64, "Intake Port Flow Velocity Warning!"
                txtCSArea.Text = .Formatted
            End If
            
            EstSeatDia
            CalcSeatPer
            SetVSWidth
            CalcFlowStuff gc_MaxInFlow.Value
            
            LoadScreen
            .IsChanged = False
            If .IsError Then txtCSArea.SetFocus
        Else
            txtCSArea.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtCSArea_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_CSArea
    SetHelp Me, HELP_SET, gc_CSArea
End Sub


Private Sub txtFlowVel_GotFocus()
    'setpanels Me, PNL_SAVE, gc_FlowVel
    SetHelp Me, HELP_SAVE, gc_FlowVel
End Sub

Private Sub txtFlowVel_KeyPress(KeyAscii As Integer)
    gc_FlowVel.TestNumericKeyPress KeyAscii, txtFlowVel
    If KeyAscii = vbKeyReturn Then
        txtFlowVel_LostFocus
        txtFlowVel.SelLength = Len(txtFlowVel.Text)
    End If
End Sub

Private Sub txtFlowVel_LostFocus()
    With gc_FlowVel
        .Value = val(txtFlowVel.Text)
        
        If .IsChanged Then
            CalcFromFlowVel
            CalcEngPerf
            frmENGINE.LoadScreen
            
            LoadScreen
            .IsChanged = False
            If .IsError Then txtFlowVel.SetFocus
        Else
            txtFlowVel.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtFlowVel_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_FlowVel
    SetHelp Me, HELP_SET, gc_FlowVel
End Sub


Private Sub txtFlowFlux_GotFocus()
    'setpanels Me, PNL_SAVE, gc_FlowFlux
    SetHelp Me, HELP_SAVE, gc_FlowFlux
End Sub

Private Sub txtFlowFlux_KeyPress(KeyAscii As Integer)
    gc_FlowFlux.TestNumericKeyPress KeyAscii, txtFlowFlux
    If KeyAscii = vbKeyReturn Then
        txtFlowFlux_LostFocus
        txtFlowFlux.SelLength = Len(txtFlowFlux.Text)
    End If
End Sub

Private Sub txtFlowFlux_LostFocus()
    With gc_FlowFlux
        .Value = val(txtFlowFlux.Text)
        
        If .IsChanged Then
            CalcFromFlowFlux
            CalcEngPerf
            frmENGINE.LoadScreen
            
            LoadScreen
            .IsChanged = False
            If .IsError Then txtFlowFlux.SetFocus
        Else
            txtFlowFlux.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtFlowFlux_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_FlowFlux
    SetHelp Me, HELP_SET, gc_FlowFlux
End Sub


Private Sub txtFVIndex_GotFocus()
    'setpanels Me, PNL_SAVE, gc_FVIndex
    SetHelp Me, HELP_SAVE, gc_FVIndex
End Sub

Private Sub txtFVIndex_KeyPress(KeyAscii As Integer)
    gc_FVIndex.TestNumericKeyPress KeyAscii, txtFVIndex
    If KeyAscii = vbKeyReturn Then
        txtFVIndex_LostFocus
        txtFVIndex.SelLength = Len(txtFVIndex.Text)
    End If
End Sub

Private Sub txtFVIndex_LostFocus()
    With gc_FVIndex
        .Value = val(txtFVIndex.Text)
        
        If .IsChanged Then
            CalcFromFVIndex
            CalcEngPerf
            frmENGINE.LoadScreen
            
            LoadScreen
            .IsChanged = False
            If .IsError Then txtFVIndex.SetFocus
        Else
            txtFVIndex.Text = .Formatted
        End If
    End With
End Sub

Private Sub txtFVIndex_MouseMove(Button As Integer, Shift As Integer, X As Single, Y As Single)
    'setpanels Me, PNL_SET, gc_FVIndex
    SetHelp Me, HELP_SET, gc_FVIndex
End Sub


Private Sub CalcFromFlowVel()
    gc_FVIndex.IsCalc = True
    gc_FVIndex.Value = 100 * gc_FlowVel.Value / VSTD
    
    gc_FlowFlux.IsCalc = True
    gc_FlowFlux.Value = gc_FlowVel.Value / 2.4
    
    SetVals
End Sub

Private Sub CalcFromFlowFlux()
    gc_FlowVel.IsCalc = True
    gc_FlowVel.Value = gc_FlowFlux.Value * 2.4
    
    gc_FVIndex.IsCalc = True
    gc_FVIndex.Value = 100 * gc_FlowVel.Value / VSTD
    
    SetVals
End Sub

Private Sub CalcFromFVIndex()
    gc_FlowVel.IsCalc = True
    gc_FlowVel.Value = VSTD * gc_FVIndex.Value / 100
    
    gc_FlowFlux.IsCalc = True
    gc_FlowFlux.Value = gc_FlowVel.Value / 2.4
    
    SetVals
End Sub

Private Sub SetVals()
Dim r1 As Single
    'recalculates the flow velocity stuff to be consistent with max flow limit
    With gc_MaxInFlow
        r1 = 10 ^ -.DecimalPlaces
        .Value = Round(gc_CSArea.Value * gc_FlowFlux.Value, r1)
        
        If .Value >= .MaxVal Or .Value <= .MinVal Then
            gc_FlowFlux.IsCalc = True
            gc_FlowFlux.Value = .Value / gc_CSArea.Value
            
            gc_FlowVel.IsCalc = True
            gc_FlowVel.Value = gc_FlowFlux.Value * 2.4
            
            gc_FVIndex.IsCalc = True
            gc_FVIndex.Value = 100 * gc_FlowVel.Value / VSTD
        End If
    End With
    
    With gc_FlowVel
        .IsCalc = True
        r1 = 10 ^ -.DecimalPlaces
        .Value = Round(.Value, r1)
    End With
    
    With gc_FlowFlux
        .IsCalc = True
        r1 = 10 ^ -.DecimalPlaces
        .Value = Round(.Value, r1)
    End With
    
    With gc_FVIndex
        .IsCalc = True
        r1 = 10 ^ -.DecimalPlaces
        .Value = Round(.Value, r1)
    End With
End Sub

Public Sub LoadScreen()
    txtCSArea.Text = gc_CSArea.Formatted
    txtFlowVel.Text = gc_FlowVel.Formatted
    txtFlowFlux.Text = gc_FlowFlux.Formatted
    txtFVIndex.Text = gc_FVIndex.Formatted

    bFileDirty = True
End Sub

Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
