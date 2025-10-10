VERSION 5.00
Begin VB.Form frmMain 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Racing Systems Analysis - www.QUARTERjr.com - Copyright 2022 RSA"
   ClientHeight    =   3165
   ClientLeft      =   45
   ClientTop       =   330
   ClientWidth     =   7215
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   3165
   ScaleWidth      =   7215
   StartUpPosition =   2  'CenterScreen
   Begin VB.Frame Frame1 
      Caption         =   "Converter Slip Calculator"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   12
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   3060
      Left            =   120
      TabIndex        =   0
      Top             =   0
      Width           =   7000
      Begin VB.CommandButton BtnCalculate 
         Caption         =   "Calculate"
         Enabled         =   0   'False
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   375
         Left            =   660
         TabIndex        =   7
         Top             =   2430
         Width           =   1695
      End
      Begin VB.TextBox txtMPH 
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   420
         Left            =   5400
         MaxLength       =   5
         TabIndex        =   4
         Text            =   "Text4"
         Top             =   1515
         Width           =   750
      End
      Begin VB.TextBox txtRPM 
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   420
         Left            =   5400
         MaxLength       =   5
         TabIndex        =   3
         Text            =   "Text3"
         Top             =   1065
         Width           =   750
      End
      Begin VB.TextBox txtGearRatio 
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   420
         Left            =   2400
         MaxLength       =   5
         TabIndex        =   2
         Text            =   "Text2"
         Top             =   1515
         Width           =   750
      End
      Begin VB.TextBox txtTireDiameter 
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   420
         Left            =   2400
         MaxLength       =   5
         TabIndex        =   1
         Text            =   "Text1"
         Top             =   1065
         Width           =   750
      End
      Begin VB.Line Line1 
         X1              =   300
         X2              =   6150
         Y1              =   2190
         Y2              =   2190
      End
      Begin VB.Label Label1 
         Caption         =   "Rear Gear Ratio"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   375
         Index           =   2
         Left            =   300
         TabIndex        =   12
         Top             =   1560
         Width           =   2100
      End
      Begin VB.Label Label1 
         Caption         =   "Tire Diameter - in"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   375
         Index           =   1
         Left            =   300
         TabIndex        =   11
         Top             =   1110
         Width           =   2100
      End
      Begin VB.Label Label9 
         Caption         =   "Enter your vehicle data in the fields below.  Press the Calculate button to display the estimated torque converter slip."
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   495
         Left            =   300
         TabIndex        =   10
         Top             =   360
         Width           =   5700
      End
      Begin VB.Label lblCSlip 
         BorderStyle     =   1  'Fixed Single
         Caption         =   "lblCSlip"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   360
         Left            =   4890
         TabIndex        =   9
         Top             =   2430
         Width           =   750
      End
      Begin VB.Label Label3 
         Caption         =   "Converter Slip - %"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   300
         Left            =   2700
         TabIndex        =   8
         Top             =   2460
         Width           =   2100
      End
      Begin VB.Label Label1 
         Caption         =   "Top Speed - MPH"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   375
         Index           =   4
         Left            =   3360
         TabIndex        =   6
         Top             =   1560
         Width           =   1935
      End
      Begin VB.Label Label1 
         Caption         =   "Finish Line RPM"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   12
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   375
         Index           =   3
         Left            =   3360
         TabIndex        =   5
         Top             =   1110
         Width           =   1935
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
        gc_TireDiameter.ClsControl = txtTireDiameter
        gc_GearRatio.ClsControl = txtGearRatio
        gc_RPM.ClsControl = txtRPM
        gc_MPH.ClsControl = txtMPH
        
        'set default values
        gc_TireDiameter.Value = 28
        gc_GearRatio.Value = 4.56
        gc_RPM.Value = 6800
        gc_MPH.Value = 120
        
        btnCalculate_Click
        IsLoaded = True
    End If
End Sub


Private Sub Clear()
    lblCSlip = ""
    BtnCalculate.Enabled = True
End Sub

Private Sub btnCalculate_Click()
    CalcConvSlip
    BtnCalculate.Enabled = False
End Sub

Private Sub Form_Unload(Cancel As Integer)
    End
End Sub


Private Sub txtTireDiameter_GotFocus()
    SelTextBoxText txtTireDiameter
End Sub

Private Sub txtTireDiameter_KeyPress(KeyAscii As Integer)
    Clear
    gc_TireDiameter.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtTireDiameter_LostFocus()
    gc_TireDiameter.Value = val(txtTireDiameter.Text)
End Sub


Private Sub txtGearRatio_GotFocus()
    SelTextBoxText txtGearRatio
End Sub

Private Sub txtGearRatio_KeyPress(KeyAscii As Integer)
    Clear
    gc_GearRatio.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtGearRatio_LostFocus()
    gc_GearRatio.Value = val(txtGearRatio.Text)
End Sub


Private Sub txtRPM_GotFocus()
    SelTextBoxText txtRPM
End Sub

Private Sub txtRPM_KeyPress(KeyAscii As Integer)
    Clear
    gc_RPM.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtRPM_LostFocus()
    gc_RPM.Value = val(txtRPM.Text)
End Sub


Private Sub txtMPH_GotFocus()
    SelTextBoxText txtMPH
End Sub

Private Sub txtMPH_KeyPress(KeyAscii As Integer)
    Clear
    gc_MPH.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtMPH_LostFocus()
    gc_MPH.Value = val(txtMPH.Text)
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
