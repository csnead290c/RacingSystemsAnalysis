VERSION 4.00
Begin VB.Form frmHPTQCalc 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   "HP and TQ Multiplier Worksheet"
   ClientHeight    =   690
   ClientLeft      =   1485
   ClientTop       =   2760
   ClientWidth     =   3420
   Height          =   1095
   KeyPreview      =   -1  'True
   Left            =   1425
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   690
   ScaleWidth      =   3420
   ShowInTaskbar   =   0   'False
   Top             =   2415
   Width           =   3540
   Begin VB.TextBox txtHPTQ 
      Height          =   285
      Left            =   2640
      MaxLength       =   7
      TabIndex        =   0
      Top             =   180
      Width           =   540
   End
   Begin VB.Label lbl 
      Caption         =   "HP Torque Multiplier"
      Height          =   270
      Index           =   0
      Left            =   180
      TabIndex        =   1
      Top             =   180
      Width           =   2355
   End
End
Attribute VB_Name = "frmHPTQCalc"
Attribute VB_Creatable = False
Attribute VB_Exposed = False
Option Explicit
Public fc_Value As Object
Private bFileDirty As Boolean

Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property

Private Sub Form_Activate()
    'gc_HPTQMult.Value = 1
    txtHPTQ.SetFocus
End Sub

Private Sub Form_Load()
    Me.Move 2400, 3600
    Set fc_Value = gc_HPTQMult
    
    'gc_HPTQMult.ClsControl = txtHPTQ
    gc_HPTQMult.Labelctl = lbl(0)
End Sub

Private Sub txtHPTQ_GotFocus()
    setpanels Me, PNL_SAVE, gc_HPTQMult
End Sub

Private Sub txtHPTQ_KeyPress(KeyAscii As Integer)
    gc_HPTQMult.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtHPTQ_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_HPTQMult
End Sub

Private Sub txtHPTQ_LostFocus()
    gc_HPTQMult.Value = Val(txtHPTQ.Text)
End Sub
