VERSION 5.00
Object = "{0BA686C6-F7D3-101A-993E-0000C0EF6F5E}#1.0#0"; "threed32.ocx"
Begin VB.Form frmCustom 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   " Custom Clutch Arm Worksheet: CUS.1"
   ClientHeight    =   4560
   ClientLeft      =   3255
   ClientTop       =   1320
   ClientWidth     =   4380
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   4560
   ScaleWidth      =   4380
   ShowInTaskbar   =   0   'False
   Begin VB.Frame Frame1 
      BackColor       =   &H00C0FFFF&
      Caption         =   "Custom Clutch Arm Drawing"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1920
      Left            =   30
      TabIndex        =   21
      Top             =   30
      Width           =   4305
      Begin VB.Label Label1 
         BackStyle       =   0  'Transparent
         Caption         =   "+ ----------------------- radius - R ------------------------>"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   240
         Index           =   6
         Left            =   90
         TabIndex        =   28
         Top             =   1560
         Width           =   4050
      End
      Begin VB.Label Label1 
         BackStyle       =   0  'Transparent
         Caption         =   "|    bearing                                  pivot      plate"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   240
         Index           =   5
         Left            =   120
         TabIndex        =   27
         Top             =   1320
         Width           =   4050
      End
      Begin VB.Label Label1 
         BackStyle       =   0  'Transparent
         Caption         =   "|     T/O +                                          +             +  "
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   240
         Index           =   4
         Left            =   120
         TabIndex        =   26
         Top             =   1080
         Width           =   4050
      End
      Begin VB.Label Label1 
         BackStyle       =   0  'Transparent
         Caption         =   "Z                                          cg +"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   240
         Index           =   3
         Left            =   90
         TabIndex        =   25
         Top             =   840
         Width           =   4050
      End
      Begin VB.Label Label1 
         BackStyle       =   0  'Transparent
         Caption         =   "|"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   240
         Index           =   2
         Left            =   120
         TabIndex        =   24
         Top             =   600
         Width           =   4050
      End
      Begin VB.Label Label1 
         BackStyle       =   0  'Transparent
         Caption         =   "^                                                              +"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   240
         Index           =   1
         Left            =   90
         TabIndex        =   23
         Top             =   420
         Width           =   4050
      End
      Begin VB.Label Label1 
         BackStyle       =   0  'Transparent
         Caption         =   "                                                             cwt     "
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   240
         Index           =   0
         Left            =   120
         TabIndex        =   22
         Top             =   210
         Width           =   4050
      End
   End
   Begin VB.TextBox txtCGDR 
      Height          =   285
      Left            =   2370
      MaxLength       =   7
      TabIndex        =   5
      Top             =   3150
      Width           =   540
   End
   Begin VB.TextBox txtCWTDR 
      Height          =   285
      Left            =   2370
      MaxLength       =   7
      TabIndex        =   3
      Top             =   2865
      Width           =   540
   End
   Begin VB.TextBox txtPVTDR 
      Height          =   285
      Left            =   2370
      MaxLength       =   7
      TabIndex        =   1
      Top             =   2565
      Width           =   540
   End
   Begin VB.TextBox txtADATA2 
      Height          =   285
      Left            =   1770
      MaxLength       =   7
      TabIndex        =   0
      Top             =   2265
      Width           =   540
   End
   Begin VB.TextBox txtPVTDZ 
      Height          =   285
      Left            =   2970
      MaxLength       =   7
      TabIndex        =   2
      Top             =   2565
      Width           =   540
   End
   Begin VB.TextBox txtCWTDZ 
      Height          =   285
      Left            =   2970
      MaxLength       =   7
      TabIndex        =   4
      Top             =   2865
      Width           =   540
   End
   Begin VB.TextBox txtCGDZ 
      Height          =   285
      Left            =   2970
      MaxLength       =   7
      TabIndex        =   6
      Top             =   3165
      Width           =   540
   End
   Begin VB.TextBox txtADATA1 
      Height          =   285
      Left            =   2970
      MaxLength       =   7
      TabIndex        =   8
      Top             =   3465
      Width           =   540
   End
   Begin VB.TextBox txtADATA6 
      Height          =   285
      Left            =   2970
      MaxLength       =   7
      TabIndex        =   9
      Top             =   3765
      Width           =   540
   End
   Begin Threed.SSPanel PnlInput 
      Height          =   420
      Index           =   0
      Left            =   30
      TabIndex        =   17
      Top             =   4110
      Width           =   2490
      _Version        =   65536
      _ExtentX        =   4392
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
      Left            =   2550
      TabIndex        =   18
      Top             =   4110
      Width           =   870
      _Version        =   65536
      _ExtentX        =   1535
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
      Left            =   3450
      TabIndex        =   19
      Top             =   4110
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
      Caption         =   "Diameter  dR      dZ"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   195
      Index           =   0
      Left            =   1680
      TabIndex        =   20
      Top             =   2040
      Width           =   1710
   End
   Begin VB.Label lbl 
      Alignment       =   2  'Center
      BackColor       =   &H00C0FFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   ".000"
      Height          =   285
      Index           =   22
      Left            =   2970
      TabIndex        =   16
      Top             =   2265
      Width           =   540
   End
   Begin VB.Label lbl 
      Alignment       =   2  'Center
      BackColor       =   &H00C0FFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   ".000"
      Height          =   285
      Index           =   21
      Left            =   2370
      TabIndex        =   15
      Top             =   2265
      Width           =   540
   End
   Begin VB.Label lbl 
      Caption         =   "plate label"
      Height          =   195
      Index           =   1
      Left            =   660
      TabIndex        =   14
      Top             =   2310
      Width           =   1050
   End
   Begin VB.Label lbl 
      Caption         =   "pivot label"
      Height          =   195
      Index           =   2
      Left            =   660
      TabIndex        =   13
      Top             =   2610
      Width           =   1050
   End
   Begin VB.Label lbl 
      Caption         =   "counterweight label"
      Height          =   195
      Index           =   3
      Left            =   660
      TabIndex        =   12
      Top             =   2910
      Width           =   1650
   End
   Begin VB.Label lbl 
      Caption         =   "cg label"
      Height          =   195
      Index           =   4
      Left            =   660
      TabIndex        =   10
      Top             =   3210
      Width           =   1650
   End
   Begin VB.Label lbl 
      Caption         =   "arm mass label"
      Height          =   195
      Index           =   5
      Left            =   660
      TabIndex        =   11
      Top             =   3510
      Width           =   1650
   End
   Begin VB.Label lbl 
      Caption         =   "reference ring height label"
      Height          =   195
      Index           =   6
      Left            =   660
      TabIndex        =   7
      Top             =   3810
      Width           =   2250
   End
End
Attribute VB_Name = "frmCustom"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Public fc_Value As Object
Private bFileDirty As Boolean

Private Sub Form_Load()
Dim AngPvt As Single
Dim AngCWt As Single
Dim AngCG As Single
    gc_ADATA1.Value = AData(NARMD, 1)
    gc_ADATA2.Value = AData(NARMD, 2)
    gc_ADATA6.Value = AData(NARMD, 6)
    
    AngPvt = AData(NARMD, 9) * PI / 180
    gc_PVTDR.Value = Round(AData(NARMD, 3) * Cos(AngPvt), 0.001)
    gc_PVTDZ.Value = Round(AData(NARMD, 3) * Sin(AngPvt), 0.001)
    
    AngCWt = (AData(NARMD, 9) + AData(NARMD, 10)) * PI / 180
    gc_CWTDR.Value = Round(AData(NARMD, 4) * Cos(AngCWt), 0.001)
    gc_CWTDZ.Value = Round(AData(NARMD, 4) * Sin(AngCWt), 0.001)
    
    AngCG = (AData(NARMD, 9) + AData(NARMD, 11)) * PI / 180
    gc_CGDR.Value = Round(AData(NARMD, 5) * Cos(AngCG), 0.001)
    gc_CGDZ.Value = Round(AData(NARMD, 5) * Sin(AngCG), 0.001)
    
    gc_ADATA2.Labelctl = lbl(1)
    gc_PVTDR.Labelctl = lbl(2)
    gc_PVTDZ.Labelctl = lbl(2)
    gc_CWTDR.Labelctl = lbl(3)
    gc_CWTDZ.Labelctl = lbl(3)
    gc_CGDR.Labelctl = lbl(4)
    gc_CGDZ.Labelctl = lbl(4)
    gc_ADATA1.Labelctl = lbl(5)
    gc_ADATA6.Labelctl = lbl(6)
    
    gc_ADATA2.ClsControl = txtADATA2
    gc_PVTDR.ClsControl = txtPVTDR
    gc_PVTDZ.ClsControl = txtPVTDZ
    gc_CWTDR.ClsControl = txtCWTDR
    gc_CWTDZ.ClsControl = txtCWTDZ
    gc_CGDR.ClsControl = txtCGDR
    gc_CGDZ.ClsControl = txtCGDZ
    gc_ADATA1.ClsControl = txtADATA1
    gc_ADATA6.ClsControl = txtADATA6

    bFileDirty = False
End Sub

Private Sub Form_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_RESET, fc_Value
End Sub

Private Sub Form_Unload(Cancel As Integer)
    gc_ADATA2.Labelctl = Nothing
    gc_PVTDR.Labelctl = Nothing
    gc_PVTDZ.Labelctl = Nothing
    gc_CWTDR.Labelctl = Nothing
    gc_CWTDZ.Labelctl = Nothing
    gc_CGDR.Labelctl = Nothing
    gc_CGDZ.Labelctl = Nothing
    gc_ADATA1.Labelctl = Nothing
    gc_ADATA6.Labelctl = Nothing
    
    gc_ADATA2.ClsControl = Nothing
    gc_PVTDR.ClsControl = Nothing
    gc_PVTDZ.ClsControl = Nothing
    gc_CWTDR.ClsControl = Nothing
    gc_CWTDZ.ClsControl = Nothing
    gc_CGDR.ClsControl = Nothing
    gc_CGDZ.ClsControl = Nothing
    gc_ADATA1.ClsControl = Nothing
    gc_ADATA6.ClsControl = Nothing
End Sub


Private Sub txtADATA1_GotFocus()
    setpanels Me, PNL_SAVE, gc_ADATA1
End Sub

Private Sub txtADATA1_KeyPress(KeyAscii As Integer)
    gc_ADATA1.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtADATA1_Check
End Sub

Private Sub txtADATA1_LostFocus()
    gc_ADATA1.Value = val(txtADATA1.Text)
    txtADATA1_Check
End Sub

Private Sub txtADATA1_Check()
    If gc_ADATA1.IsChanged Then
        CalcCustom
    End If
End Sub

Private Sub txtADATA1_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_ADATA1
End Sub


Private Sub txtADATA2_GotFocus()
    setpanels Me, PNL_SAVE, gc_ADATA2
End Sub

Private Sub txtADATA2_KeyPress(KeyAscii As Integer)
    gc_ADATA2.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtADATA2_Check
End Sub

Private Sub txtADATA2_LostFocus()
    gc_ADATA2.Value = val(txtADATA2.Text)
    txtADATA2_Check
End Sub

Private Sub txtADATA2_Check()
    If gc_ADATA2.IsChanged Then
        CalcCustom
    End If
End Sub

Private Sub txtADATA2_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_ADATA2
End Sub


Private Sub txtADATA6_GotFocus()
    setpanels Me, PNL_SAVE, gc_ADATA6
End Sub

Private Sub txtADATA6_KeyPress(KeyAscii As Integer)
    gc_ADATA6.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtADATA6_Check
End Sub

Private Sub txtADATA6_LostFocus()
    gc_ADATA6.Value = val(txtADATA6.Text)
    txtADATA6_Check
End Sub

Private Sub txtADATA6_Check()
    If gc_ADATA6.IsChanged Then
        CalcCustom
    End If
End Sub

Private Sub txtADATA6_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_ADATA6
End Sub


Private Sub txtPVTDR_GotFocus()
    setpanels Me, PNL_SAVE, gc_PVTDR
End Sub

Private Sub txtPVTDR_KeyPress(KeyAscii As Integer)
    gc_PVTDR.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtPVTDR_Check
End Sub

Private Sub txtPVTDR_LostFocus()
    gc_PVTDR.Value = val(txtPVTDR.Text)
    txtPVTDR_Check
End Sub

Private Sub txtPVTDR_Check()
    If gc_PVTDR.IsChanged Then
        CalcCustom
    End If
End Sub

Private Sub txtPVTDR_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_PVTDR
End Sub


Private Sub txtPVTDZ_GotFocus()
    setpanels Me, PNL_SAVE, gc_PVTDZ
End Sub

Private Sub txtPVTDZ_KeyPress(KeyAscii As Integer)
    gc_PVTDZ.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtPVTDZ_Check
End Sub

Private Sub txtPVTDZ_LostFocus()
    gc_PVTDZ.Value = val(txtPVTDZ.Text)
    txtPVTDZ_Check
End Sub

Private Sub txtPVTDZ_Check()
    If gc_PVTDZ.IsChanged Then
        CalcCustom
    End If
End Sub

Private Sub txtPVTDZ_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_PVTDZ
End Sub


Private Sub txtCWTDR_GotFocus()
    setpanels Me, PNL_SAVE, gc_CWTDR
End Sub

Private Sub txtCWTDR_KeyPress(KeyAscii As Integer)
    gc_CWTDR.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtCWTDR_Check
End Sub

Private Sub txtCWTDR_LostFocus()
    gc_CWTDR.Value = val(txtCWTDR.Text)
    txtCWTDR_Check
End Sub

Private Sub txtCWTDR_Check()
    If gc_CWTDR.IsChanged Then
        CalcCustom
    End If
End Sub

Private Sub txtCWTDR_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_CWTDR
End Sub


Private Sub txtCWTDZ_GotFocus()
    setpanels Me, PNL_SAVE, gc_CWTDZ
End Sub

Private Sub txtCWTDZ_KeyPress(KeyAscii As Integer)
    gc_CWTDZ.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtCWTDZ_Check
End Sub

Private Sub txtCWTDZ_LostFocus()
    gc_CWTDZ.Value = val(txtCWTDZ.Text)
    txtCWTDZ_Check
End Sub

Private Sub txtCWTDZ_Check()
    If gc_CWTDZ.IsChanged Then
        CalcCustom
    End If
End Sub

Private Sub txtCWTDZ_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_CWTDZ
End Sub


Private Sub txtCGDR_GotFocus()
    setpanels Me, PNL_SAVE, gc_CGDR
End Sub

Private Sub txtCGDR_KeyPress(KeyAscii As Integer)
    gc_CGDR.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtCGDR_Check
End Sub

Private Sub txtCGDR_LostFocus()
    gc_CGDR.Value = val(txtCGDR.Text)
    txtCGDR_Check
End Sub

Private Sub txtCGDR_Check()
    If gc_CGDR.IsChanged Then
        CalcCustom
    End If
End Sub

Private Sub txtCGDR_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_CGDR
End Sub


Private Sub txtCGDZ_GotFocus()
    setpanels Me, PNL_SAVE, gc_CGDZ
End Sub

Private Sub txtCGDZ_KeyPress(KeyAscii As Integer)
    gc_CGDZ.TestNumericKeyPress KeyAscii
    If KeyAscii = vbKeyReturn Then txtCGDZ_Check
End Sub

Private Sub txtCGDZ_LostFocus()
    gc_CGDZ.Value = val(txtCGDZ.Text)
    txtCGDZ_Check
End Sub

Private Sub txtCGDZ_Check()
    If gc_CGDZ.IsChanged Then
        CalcCustom
    End If
End Sub

Private Sub txtCGDZ_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    setpanels Me, PNL_SET, gc_CGDZ
End Sub


Private Sub CalcCustom()
Dim AngPvt As Single
Dim AngCWt As Single
Dim AngCG As Single
    AData(NARMD, 1) = gc_ADATA1.Value
    AData(NARMD, 2) = gc_ADATA2.Value
    AData(NARMD, 6) = gc_ADATA6.Value
    AData(NARMD, 12) = RoundUp(1.1 * AData(NARMD, 2), 1)
    
    AData(NARMD, 3) = Round(Sqr(gc_PVTDZ.Value ^ 2 + gc_PVTDR.Value ^ 2), 0.001)
    If gc_PVTDR.Value <> 0 Then
        AngPvt = Atn(gc_PVTDZ.Value / gc_PVTDR.Value)
    Else
        AngPvt = 90 * PI180
    End If
    AData(NARMD, 9) = Round(AngPvt / PI180, 0.01)

    AData(NARMD, 4) = Round(Sqr(gc_CWTDZ.Value ^ 2 + gc_CWTDR.Value ^ 2), 0.001)
    If gc_CWTDR.Value <> 0 Then
        AngCWt = Atn(gc_CWTDZ.Value / gc_CWTDR.Value)
    Else
        AngCWt = 90 * PI180
    End If
    AData(NARMD, 10) = Round((AngCWt - AngPvt) / PI180, 0.01)

    AData(NARMD, 5) = Round(Sqr(gc_CGDZ.Value ^ 2 + gc_CGDR.Value ^ 2), 0.001)
    If gc_CGDR.Value <> 0 Then
        AngCG = Atn(gc_CGDZ.Value / gc_CGDR.Value)
    Else
        AngCG = 90 * PI180
    End If
    AData(NARMD, 11) = Round((AngCG - AngPvt) / PI180, 0.01)

    ClutchCalc
End Sub

Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
