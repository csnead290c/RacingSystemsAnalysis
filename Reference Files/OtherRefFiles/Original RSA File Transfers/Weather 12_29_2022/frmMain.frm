VERSION 5.00
Begin VB.Form frmMain 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Racing Systems Analysis - www.QUARTERjr.com - Copyright 2022 RSA"
   ClientHeight    =   3345
   ClientLeft      =   45
   ClientTop       =   330
   ClientWidth     =   6450
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   3345
   ScaleWidth      =   6450
   StartUpPosition =   3  'Windows Default
   Begin VB.Frame Frame1 
      Caption         =   "Weather Station"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   12
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   3255
      Left            =   120
      TabIndex        =   0
      Top             =   0
      Width           =   6255
      Begin VB.CommandButton BtnCalculate 
         Caption         =   "Calculate"
         Enabled         =   0   'False
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
         Left            =   480
         TabIndex        =   9
         Top             =   2040
         Width           =   1695
      End
      Begin VB.OptionButton optPressure 
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   450
         Index           =   1
         Left            =   300
         TabIndex        =   6
         Top             =   1080
         Width           =   300
      End
      Begin VB.OptionButton optPressure 
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   450
         Index           =   0
         Left            =   300
         TabIndex        =   5
         Top             =   720
         Value           =   -1  'True
         Width           =   300
      End
      Begin VB.TextBox txtHumidity 
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
         Left            =   5400
         TabIndex        =   4
         Text            =   "Text4"
         Top             =   1200
         Width           =   600
      End
      Begin VB.TextBox txtTemperature 
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
         Left            =   5400
         TabIndex        =   3
         Text            =   "Text3"
         Top             =   840
         Width           =   600
      End
      Begin VB.TextBox txtBarometer 
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
         Left            =   2640
         TabIndex        =   2
         Text            =   "Text2"
         Top             =   1200
         Width           =   600
      End
      Begin VB.TextBox txtAltimeter 
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
         Left            =   2640
         TabIndex        =   1
         Text            =   "Text1"
         Top             =   840
         Width           =   600
      End
      Begin VB.Line Line1 
         X1              =   480
         X2              =   5880
         Y1              =   1680
         Y2              =   1680
      End
      Begin VB.Label Label1 
         Caption         =   "Abs Barometer - in Hg"
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
         Index           =   2
         Left            =   630
         TabIndex        =   19
         Top             =   1200
         Width           =   2055
      End
      Begin VB.Label Label1 
         Caption         =   "Std Altimeter - ft"
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
         Left            =   630
         TabIndex        =   18
         Top             =   840
         Width           =   1935
      End
      Begin VB.Label Label2 
         Caption         =   "*note: HP Correction Factor is valid for naturally aspirated, gasoline engines only!"
         Height          =   255
         Left            =   300
         TabIndex        =   17
         Top             =   2880
         Width           =   5700
      End
      Begin VB.Label Label9 
         Caption         =   $"frmMain.frx":0000
         Height          =   495
         Left            =   360
         TabIndex        =   16
         Top             =   360
         Width           =   5700
      End
      Begin VB.Label lblDNDX 
         BorderStyle     =   1  'Fixed Single
         Caption         =   "lblADI"
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
         Left            =   4920
         TabIndex        =   15
         Top             =   2520
         Width           =   600
      End
      Begin VB.Label lblHPC 
         BorderStyle     =   1  'Fixed Single
         Caption         =   "lblHPC"
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
         Left            =   4920
         TabIndex        =   14
         Top             =   2160
         Width           =   600
      End
      Begin VB.Label lblDALT 
         BorderStyle     =   1  'Fixed Single
         Caption         =   "lblDALT"
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
         Left            =   4920
         TabIndex        =   13
         Top             =   1800
         Width           =   600
      End
      Begin VB.Label Label5 
         Caption         =   "Air Density Index - %"
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
         Left            =   2520
         TabIndex        =   12
         Top             =   2520
         Width           =   2100
      End
      Begin VB.Label Label4 
         Caption         =   "HP Correction Factor*"
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
         Left            =   2520
         TabIndex        =   11
         Top             =   2160
         Width           =   2100
      End
      Begin VB.Label Label3 
         Caption         =   "Density Altitude - ft"
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
         Left            =   2520
         TabIndex        =   10
         Top             =   1800
         Width           =   2100
      End
      Begin VB.Label Label1 
         Caption         =   "Relative Humidity - %"
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
         Index           =   4
         Left            =   3360
         TabIndex        =   8
         Top             =   1200
         Width           =   1935
      End
      Begin VB.Label Label1 
         Caption         =   "Temperature - deg F"
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
         Index           =   3
         Left            =   3360
         TabIndex        =   7
         Top             =   840
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
        SetAllValues
        
        gc_Altimeter.ClsControl = txtAltimeter
        gc_Barometer.ClsControl = txtBarometer
        gc_Temperature.ClsControl = txtTemperature
        gc_Humidity.ClsControl = txtHumidity
        'decided early on to limit to naturally aspirated gasoline engines only
        'gc_FuelSystem.ClsControl = cbxFuelSystem
        
        'set baseline values
        optPressure_Click (0)
        gc_Altimeter.Value = 0
        'gc_Barometer.Value = 29.92
        gc_Temperature.Value = 60
        gc_Humidity.Value = 0
        
        btnCalculate_Click
        IsLoaded = True
    End If
End Sub

Private Sub Clear()
    lblDALT = "":   lblHPC = "":    lblDNDX = ""
    BtnCalculate.Enabled = True
End Sub

Private Sub btnCalculate_Click()
    CalcWeather
    BtnCalculate.Enabled = False
End Sub

Private Sub Form_Unload(Cancel As Integer)
    End
End Sub

Private Sub optPressure_Click(Index As Integer)
    If Index = 0 Then
        gc_Pressure.Value = True
        
        gc_Altimeter.Value = 0:
        Label1(1).ForeColor = &H80000012
        txtAltimeter.Enabled = True
        txtAltimeter.BackColor = &H80000005
        
        txtBarometer.Text = ""
        Label1(2).ForeColor = &H80000011
        txtBarometer.Enabled = False
        txtBarometer.BackColor = &H8000000F
    Else
        gc_Pressure.Value = False
        
        txtAltimeter.Text = ""
        Label1(1).ForeColor = &H80000011
        txtAltimeter.Enabled = False
        txtAltimeter.BackColor = &H8000000F
        
        gc_Barometer.Value = 29.92
        Label1(2).ForeColor = &H80000012
        txtBarometer.Enabled = True
        txtBarometer.BackColor = &H80000005
    End If
    
    btnCalculate_Click
End Sub


Private Sub txtAltimeter_GotFocus()
    SelTextBoxText txtAltimeter
End Sub

Private Sub txtAltimeter_KeyPress(KeyAscii As Integer)
    Clear
    gc_Altimeter.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtAltimeter_LostFocus()
    gc_Altimeter.Value = Val(txtAltimeter.Text)
End Sub


Private Sub txtBarometer_GotFocus()
    SelTextBoxText txtBarometer
End Sub

Private Sub txtBarometer_KeyPress(KeyAscii As Integer)
    Clear
    gc_Barometer.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtBarometer_LostFocus()
    gc_Barometer.Value = Val(txtBarometer.Text)
End Sub


Private Sub txtTemperature_GotFocus()
    SelTextBoxText txtTemperature
End Sub

Private Sub txtTemperature_KeyPress(KeyAscii As Integer)
    Clear
    gc_Temperature.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtTemperature_LostFocus()
    gc_Temperature.Value = Val(txtTemperature.Text)
End Sub


Private Sub txtHumidity_GotFocus()
    SelTextBoxText txtHumidity
End Sub

Private Sub txtHumidity_KeyPress(KeyAscii As Integer)
    Clear
    gc_Humidity.TestNumericKeyPress KeyAscii
End Sub

Private Sub txtHumidity_LostFocus()
    gc_Humidity.Value = Val(txtHumidity.Text)
End Sub


'Private Sub cbxFuelSystem_Change()
'    gc_FuelSystem.Value = cbxFuelSystem.ItemData(cbxFuelSystem.ListIndex)
'
'    If gc_FuelSystem.IsChanged Then
'        'gc_FuelSystem.IsChanged = False
'        If gc_FuelSystem.IsError Then cbxFuelSystem.SetFocus
'    Else
'        cbxFuelSystem.ListIndex = gc_FuelSystem.Value - 1
'    End If
'End Sub
'
'Private Sub cbxFuelSystem_Click()
'    cbxFuelSystem_Change
'End Sub
'
'Private Sub cbxFuelSystem_LostFocus()
'    cbxFuelSystem_Change
'End Sub

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

