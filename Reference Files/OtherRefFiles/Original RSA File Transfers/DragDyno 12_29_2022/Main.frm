VERSION 5.00
Begin VB.Form frmMain 
   Caption         =   "Racing Systems Analysis - www.QUARTERjr.com"
   ClientHeight    =   4035
   ClientLeft      =   60
   ClientTop       =   345
   ClientWidth     =   5910
   LinkTopic       =   "Form1"
   ScaleHeight     =   4035
   ScaleWidth      =   5910
   StartUpPosition =   3  'Windows Default
   Begin VB.Frame Frame1 
      Caption         =   "Dragstrip Dyno"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   13.5
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   3945
      Left            =   60
      TabIndex        =   0
      Top             =   30
      Width           =   5775
      Begin VB.ComboBox cbxRaceStyle 
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   360
         Left            =   270
         TabIndex        =   3
         Text            =   "Race Style"
         Top             =   1950
         Width           =   1905
      End
      Begin VB.CommandButton btnCalculate 
         Caption         =   "Calculate"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   375
         Left            =   720
         TabIndex        =   7
         Top             =   3060
         Width           =   1335
      End
      Begin VB.TextBox txtHPC 
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   330
         Left            =   4740
         TabIndex        =   6
         Text            =   "Text3"
         Top             =   2010
         Width           =   660
      End
      Begin VB.OptionButton optTrans 
         Alignment       =   1  'Right Justify
         Caption         =   "or Clutch Type"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   375
         Index           =   1
         Left            =   510
         TabIndex        =   2
         Top             =   1530
         Width           =   1665
      End
      Begin VB.OptionButton optTrans 
         Alignment       =   1  'Right Justify
         Caption         =   "Torque Converter"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   375
         Index           =   0
         Left            =   240
         TabIndex        =   1
         Top             =   1200
         Value           =   -1  'True
         Width           =   1935
      End
      Begin VB.TextBox txtHP 
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   330
         Left            =   4740
         TabIndex        =   5
         Text            =   "Text2"
         Top             =   1620
         Width           =   660
      End
      Begin VB.TextBox txtWeight 
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   330
         Left            =   4740
         TabIndex        =   4
         Text            =   "Text1"
         Top             =   1230
         Width           =   660
      End
      Begin VB.Label lblMPH4 
         BorderStyle     =   1  'Fixed Single
         Caption         =   "MPH4"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   375
         Left            =   4200
         TabIndex        =   18
         Top             =   3420
         Width           =   855
      End
      Begin VB.Label lblET4 
         BorderStyle     =   1  'Fixed Single
         Caption         =   "ET4"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   375
         Left            =   4200
         TabIndex        =   17
         Top             =   2940
         Width           =   855
      End
      Begin VB.Label lblMPH8 
         BorderStyle     =   1  'Fixed Single
         Caption         =   "MPH8"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   375
         Left            =   3120
         TabIndex        =   16
         Top             =   3420
         Width           =   855
      End
      Begin VB.Label lblET8 
         BorderStyle     =   1  'Fixed Single
         Caption         =   "ET8"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   375
         Left            =   3120
         TabIndex        =   15
         Top             =   2940
         Width           =   855
      End
      Begin VB.Label Label7 
         Caption         =   "MPH"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   375
         Left            =   2400
         TabIndex        =   14
         Top             =   3420
         Width           =   615
      End
      Begin VB.Label Label6 
         Caption         =   "ET"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   375
         Left            =   2400
         TabIndex        =   13
         Top             =   2940
         Width           =   615
      End
      Begin VB.Label Label5 
         Caption         =   "1/8th mile      1/4 mile"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   375
         Left            =   3120
         TabIndex        =   12
         Top             =   2580
         Width           =   2295
      End
      Begin VB.Line Line1 
         X1              =   210
         X2              =   5610
         Y1              =   2460
         Y2              =   2460
      End
      Begin VB.Label Label2 
         Caption         =   "HP Correction Factor"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   300
         Index           =   3
         Left            =   2790
         TabIndex        =   11
         Top             =   2070
         Width           =   1935
      End
      Begin VB.Label Label2 
         Caption         =   "Engine HP"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   300
         Index           =   2
         Left            =   3660
         TabIndex        =   10
         Top             =   1680
         Width           =   1095
      End
      Begin VB.Label Label2 
         Caption         =   "Vehicle Weight - lbs"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   300
         Index           =   1
         Left            =   2820
         TabIndex        =   9
         Top             =   1290
         Width           =   2025
      End
      Begin VB.Label Label1 
         Caption         =   $"Main.frx":0000
         Height          =   780
         Left            =   240
         TabIndex        =   8
         Top             =   390
         Width           =   5295
      End
   End
End
Attribute VB_Name = "frmMain"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit
Option Compare Text

Private bFileDirty As Boolean

Private Sub Form_Activate()
Static IsLoaded As Boolean
    If Not IsLoaded Then
        gc_RaceStyle.ClsControl = cbxRaceStyle
        gc_Weight.ClsControl = txtWeight
        gc_HP.ClsControl = txtHP
        gc_HPC.ClsControl = txtHPC
        
        'set default values
        gc_RaceStyle.Value = 2
        gc_Weight.Value = 3150
        gc_HP.Value = 500
        gc_HPC.Value = 1.08
        
        optTrans_Click (0)
        
        IsLoaded = True
    End If
End Sub

Private Sub Clear()
    lblET8 = "":    lblMPH8 = "":   lblET4 = "":    lblMPH4 = ""
    btnCalculate.Enabled = True
End Sub

Private Sub btnCalculate_Click()
    CalcPerf
    btnCalculate.Enabled = False
End Sub

Private Sub Form_Unload(Cancel As Integer)
    End
End Sub


Private Sub optTrans_Click(Index As Integer)
    If Index = 0 Then
        gc_TransType.Value = True
    Else
        gc_TransType.Value = False
    End If
    
    btnCalculate_Click
End Sub


Private Sub cbxRaceStyle_Change()
    gc_RaceStyle.Value = cbxRaceStyle.ItemData(cbxRaceStyle.ListIndex)

    If gc_RaceStyle.IsChanged Then
        'gc_RaceStyle.IsChanged = False
        If gc_RaceStyle.IsError Then cbxRaceStyle.SetFocus
        
        btnCalculate_Click
    Else
        cbxRaceStyle.ListIndex = gc_RaceStyle.Value - 1
    End If
End Sub

Private Sub cbxRaceStyle_Click()
    cbxRaceStyle_Change
End Sub

Private Sub cbxRaceStyle_LostFocus()
    cbxRaceStyle_Change
End Sub


Private Sub txtWeight_GotFocus()
    SelTextBoxText txtWeight
End Sub

Private Sub txtWeight_KeyPress(KeyAscii As Integer)
    Clear
    gc_Weight.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtWeight_LostFocus()
    gc_Weight.Value = Val(txtWeight.Text)
End Sub


Private Sub txtHP_GotFocus()
    SelTextBoxText txtHP
End Sub

Private Sub txtHP_KeyPress(KeyAscii As Integer)
    Clear
    gc_HP.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtHP_LostFocus()
    gc_HP.Value = Val(txtHP.Text)
End Sub


Private Sub txtHPC_GotFocus()
    SelTextBoxText txtHPC
End Sub

Private Sub txtHPC_KeyPress(KeyAscii As Integer)
    Clear
    gc_HPC.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtHPC_LostFocus()
    gc_HPC.Value = Val(txtHPC.Text)
End Sub


Private Sub SelTextBoxText(txt As TextBox)
    If Len(txt.Text) > 0 Then
        txt.SelStart = 0
        txt.SelLength = Len(txt.Text)
    End If
End Sub


Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
