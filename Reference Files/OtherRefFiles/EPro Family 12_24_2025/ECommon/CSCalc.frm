VERSION 5.00
Begin VB.Form frmCSCalc 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Cross-section Area Calculator"
   ClientHeight    =   3255
   ClientLeft      =   45
   ClientTop       =   330
   ClientWidth     =   6390
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   3255
   ScaleWidth      =   6390
   ShowInTaskbar   =   0   'False
   Begin VB.Frame Frame4 
      Caption         =   "Annular Area Worksheet"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1575
      Left            =   3435
      TabIndex        =   30
      Top             =   1635
      Width           =   2910
      Begin VB.TextBox txtA 
         Height          =   285
         Index           =   0
         Left            =   2100
         TabIndex        =   10
         Text            =   "Text0"
         Top             =   270
         Width           =   600
      End
      Begin VB.TextBox txtA 
         Height          =   285
         Index           =   1
         Left            =   2100
         TabIndex        =   11
         Text            =   "Text1"
         Top             =   570
         Width           =   600
      End
      Begin VB.TextBox txtA 
         Height          =   285
         Index           =   2
         Left            =   2100
         TabIndex        =   12
         Text            =   "Text2"
         Top             =   870
         Width           =   600
      End
      Begin VB.Label Label16 
         Caption         =   "Outer Diameter"
         Height          =   240
         Left            =   180
         TabIndex        =   35
         Top             =   330
         Width           =   1500
      End
      Begin VB.Label Label17 
         Caption         =   "Inner Diameter"
         Height          =   240
         Left            =   180
         TabIndex        =   34
         Top             =   630
         Width           =   1500
      End
      Begin VB.Label Label18 
         Caption         =   "Stem Diameter"
         Height          =   240
         Left            =   180
         TabIndex        =   33
         Top             =   930
         Width           =   1500
      End
      Begin VB.Label Label19 
         Caption         =   "Cross-section Area"
         Height          =   240
         Left            =   180
         TabIndex        =   32
         Top             =   1230
         Width           =   1500
      End
      Begin VB.Label lblA 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "lblA"
         Height          =   255
         Left            =   2100
         TabIndex        =   31
         Top             =   1200
         Width           =   600
      End
   End
   Begin VB.Frame Frame3 
      Caption         =   "Rectangular Area Worksheet"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1875
      Left            =   60
      TabIndex        =   23
      Top             =   1335
      Width           =   3285
      Begin VB.TextBox txtR 
         Height          =   285
         Index           =   0
         Left            =   2100
         TabIndex        =   3
         Text            =   "Text0"
         Top             =   270
         Width           =   600
      End
      Begin VB.TextBox txtR 
         Height          =   285
         Index           =   1
         Left            =   2100
         TabIndex        =   4
         Text            =   "Text1"
         Top             =   570
         Width           =   600
      End
      Begin VB.TextBox txtR 
         Height          =   285
         Index           =   2
         Left            =   2100
         TabIndex        =   5
         Text            =   "Text2"
         Top             =   870
         Width           =   600
      End
      Begin VB.TextBox txtR 
         Height          =   285
         Index           =   3
         Left            =   2100
         TabIndex        =   6
         Text            =   "Text3"
         Top             =   1170
         Width           =   600
      End
      Begin VB.Label Label10 
         Caption         =   "Height"
         Height          =   240
         Left            =   180
         TabIndex        =   29
         Top             =   330
         Width           =   1500
      End
      Begin VB.Label Label11 
         Caption         =   "Width"
         Height          =   240
         Left            =   180
         TabIndex        =   28
         Top             =   630
         Width           =   1500
      End
      Begin VB.Label Label12 
         Caption         =   "Corner Diameter"
         Height          =   240
         Left            =   180
         TabIndex        =   27
         Top             =   930
         Width           =   1500
      End
      Begin VB.Label Label13 
         Caption         =   "Stem Diameter"
         Height          =   240
         Left            =   180
         TabIndex        =   26
         Top             =   1230
         Width           =   1500
      End
      Begin VB.Label Label14 
         Caption         =   "Cross-section Area"
         Height          =   240
         Left            =   180
         TabIndex        =   25
         Top             =   1530
         Width           =   1500
      End
      Begin VB.Label lblR 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "lblR"
         Height          =   255
         Left            =   2100
         TabIndex        =   24
         Top             =   1500
         Width           =   600
      End
   End
   Begin VB.Frame Frame2 
      Caption         =   "Elliptical Area Worksheet"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1575
      Left            =   3435
      TabIndex        =   17
      Top             =   30
      Width           =   2910
      Begin VB.TextBox txtE 
         Height          =   285
         Index           =   0
         Left            =   2100
         TabIndex        =   7
         Text            =   "Text0"
         Top             =   270
         Width           =   600
      End
      Begin VB.TextBox txtE 
         Height          =   285
         Index           =   1
         Left            =   2100
         TabIndex        =   8
         Text            =   "Text1"
         Top             =   570
         Width           =   600
      End
      Begin VB.TextBox txtE 
         Height          =   285
         Index           =   2
         Left            =   2100
         TabIndex        =   9
         Text            =   "Text2"
         Top             =   870
         Width           =   600
      End
      Begin VB.Label Label5 
         Caption         =   "Major Diameter"
         Height          =   240
         Left            =   180
         TabIndex        =   22
         Top             =   330
         Width           =   1500
      End
      Begin VB.Label Label6 
         Caption         =   "Minor Diameter"
         Height          =   240
         Left            =   180
         TabIndex        =   21
         Top             =   630
         Width           =   1500
      End
      Begin VB.Label Label7 
         Caption         =   "Stem Diameter"
         Height          =   240
         Left            =   180
         TabIndex        =   20
         Top             =   930
         Width           =   1500
      End
      Begin VB.Label Label8 
         Caption         =   "Cross-section Area"
         Height          =   240
         Left            =   180
         TabIndex        =   19
         Top             =   1230
         Width           =   1500
      End
      Begin VB.Label lblE 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "lblE"
         Height          =   255
         Left            =   2100
         TabIndex        =   18
         Top             =   1200
         Width           =   600
      End
   End
   Begin VB.Frame Frame1 
      Caption         =   "Circular Area Worksheet"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1275
      Left            =   75
      TabIndex        =   0
      Top             =   30
      Width           =   3270
      Begin VB.TextBox txtC 
         Height          =   285
         Index           =   0
         Left            =   2100
         TabIndex        =   1
         Text            =   "Text0"
         Top             =   270
         Width           =   600
      End
      Begin VB.TextBox txtC 
         Height          =   285
         Index           =   1
         Left            =   2100
         TabIndex        =   2
         Text            =   "Text1"
         Top             =   570
         Width           =   600
      End
      Begin VB.Label Label1 
         Caption         =   "Diameter"
         Height          =   240
         Left            =   180
         TabIndex        =   16
         Top             =   330
         Width           =   1500
      End
      Begin VB.Label Label2 
         Caption         =   "Stem Diameter"
         Height          =   240
         Left            =   180
         TabIndex        =   15
         Top             =   630
         Width           =   1500
      End
      Begin VB.Label Label3 
         Caption         =   "Cross-section Area"
         Height          =   240
         Left            =   180
         TabIndex        =   14
         Top             =   930
         Width           =   1500
      End
      Begin VB.Label lblC 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Caption         =   "lblC"
         Height          =   255
         Left            =   2100
         TabIndex        =   13
         Top             =   900
         Width           =   600
      End
   End
End
Attribute VB_Name = "frmCSCalc"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Private bFileDirty As Boolean

Private Sub Form_Load()
    Me.Move 480, 3000
    
    CalcCir
    CalcEll
    CalcRec
    CalcAnn
    LoadScreen
    bFileDirty = False
End Sub


Private Sub txtC_GotFocus(Index As Integer)
    SelTextBoxText txtC(Index)
End Sub

Private Sub txtC_KeyPress(Index As Integer, KeyAscii As Integer)
    gc_C(Index).TestNumericKeyPress KeyAscii, txtC(Index)
    If KeyAscii = vbKeyReturn Then
        txtC_LostFocus Index
        txtC(Index).SelLength = Len(txtC(Index).Text)
    End If
End Sub

Private Sub txtC_LostFocus(Index As Integer)
Dim i As Integer
    With gc_C(Index)
        .Value = val(txtC(Index).Text)
        
        If .IsChanged Then
            For i = 0 To 2: gc_C(i).Inches = gc_C(Index).Inches:    Next
            CalcCir
            LoadScreen
            .IsChanged = False
        Else
            txtC(Index).Text = .Formatted
        End If
    End With
End Sub


Private Sub txtE_GotFocus(Index As Integer)
    SelTextBoxText txtE(Index)
End Sub

Private Sub txtE_KeyPress(Index As Integer, KeyAscii As Integer)
    gc_E(Index).TestNumericKeyPress KeyAscii, txtE(Index)
    If KeyAscii = vbKeyReturn Then
        txtE_LostFocus Index
        txtE(Index).SelLength = Len(txtE(Index).Text)
    End If
End Sub

Private Sub txtE_LostFocus(Index As Integer)
Dim i As Integer
    With gc_E(Index)
        .Value = val(txtE(Index).Text)
        
        If .IsChanged Then
            For i = 0 To 3: gc_E(i).Inches = gc_E(Index).Inches:    Next
            CalcEll
            LoadScreen
            .IsChanged = False
        Else
            txtE(Index).Text = .Formatted
        End If
    End With
End Sub


Private Sub txtR_GotFocus(Index As Integer)
    SelTextBoxText txtR(Index)
End Sub

Private Sub txtR_KeyPress(Index As Integer, KeyAscii As Integer)
    gc_R(Index).TestNumericKeyPress KeyAscii, txtR(Index)
    If KeyAscii = vbKeyReturn Then
        txtR_LostFocus Index
        txtR(Index).SelLength = Len(txtR(Index).Text)
    End If
End Sub

Private Sub txtR_LostFocus(Index As Integer)
Dim i As Integer
    With gc_R(Index)
        .Value = val(txtR(Index).Text)
        
        If .IsChanged Then
            For i = 0 To 4: gc_R(i).Inches = gc_R(Index).Inches:    Next
            CalcRec
            LoadScreen
            .IsChanged = False
        Else
            txtR(Index).Text = .Formatted
        End If
    End With
End Sub


Private Sub txtA_GotFocus(Index As Integer)
    SelTextBoxText txtA(Index)
End Sub

Private Sub txtA_KeyPress(Index As Integer, KeyAscii As Integer)
    gc_A(Index).TestNumericKeyPress KeyAscii, txtA(Index)
    If KeyAscii = vbKeyReturn Then
        txtA_LostFocus Index
        txtA(Index).SelLength = Len(txtA(Index).Text)
    End If
End Sub

Private Sub txtA_LostFocus(Index As Integer)
Dim i As Integer
    With gc_A(Index)
        .Value = val(txtA(Index).Text)
        
        If .IsChanged Then
            For i = 0 To 3: gc_A(i).Inches = gc_A(Index).Inches:    Next
            CalcAnn
            LoadScreen
            .IsChanged = False
        Else
            txtA(Index).Text = .Formatted
        End If
    End With
End Sub


Private Sub LoadScreen()
    txtC(0).Text = gc_C(0).Formatted
    txtC(1).Text = gc_C(1).Formatted
    lblC.caption = gc_C(2).Formatted
    
    txtE(0).Text = gc_E(0).Formatted
    txtE(1).Text = gc_E(1).Formatted
    txtE(2).Text = gc_E(2).Formatted
    lblE.caption = gc_E(3).Formatted
    
    txtR(0).Text = gc_R(0).Formatted
    txtR(1).Text = gc_R(1).Formatted
    txtR(2).Text = gc_R(2).Formatted
    txtR(3).Text = gc_R(3).Formatted
    lblR.caption = gc_R(4).Formatted
    
    txtA(0).Text = gc_A(0).Formatted
    txtA(1).Text = gc_A(1).Formatted
    txtA(2).Text = gc_A(2).Formatted
    lblA.caption = gc_A(3).Formatted

    bFileDirty = True
End Sub


Private Sub CalcCir()
Dim Work As Single
    Work = PI * (gc_C(0).Value ^ 2 - gc_C(1).Value ^ 2) / 4
    
    If Work < 0 Then Work = 0
    With gc_C(2)
        .Value = Work:  .Value = val(.Formatted)
    End With
End Sub

Private Sub CalcEll()
Dim Work As Single
    Work = PI * (gc_E(0).Value * gc_E(1).Value - gc_E(2).Value ^ 2) / 4
    
    If Work < 0 Then Work = 0
    With gc_E(3)
        .Value = Work:  .Value = val(.Formatted)
    End With
End Sub

Private Sub CalcRec()
Dim Work As Single
    Work = (gc_R(0).Value * gc_R(1).Value) - (PI * gc_R(3).Value ^ 2) / 4
    Work = Work - gc_R(2).Value ^ 2 * (1 - PI / 4)
    
    If Work < 0 Then Work = 0
    With gc_R(4)
        .Value = Work:  .Value = val(.Formatted)
    End With
End Sub

Private Sub CalcAnn()
Dim Work As Single
    Work = PI * (gc_A(0).Value ^ 2 - gc_A(1).Value ^ 2 - gc_A(2).Value ^ 2) / 4
    
    If Work < 0 Then Work = 0
    With gc_A(3)
        .Value = Work:  .Value = val(.Formatted)
    End With
End Sub


Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
