VERSION 5.00
Begin VB.Form frmGraph 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Clutch Plate Force - lbs"
   ClientHeight    =   7620
   ClientLeft      =   45
   ClientTop       =   435
   ClientWidth     =   11610
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   7620
   ScaleWidth      =   11610
   StartUpPosition =   1  'CenterOwner
   Begin VB.PictureBox Picture1 
      Height          =   7500
      Left            =   60
      ScaleHeight     =   7440
      ScaleWidth      =   9540
      TabIndex        =   0
      Top             =   60
      Width           =   9600
      Begin VB.Line Line1 
         BorderColor     =   &H000000FF&
         BorderWidth     =   3
         X1              =   5160
         X2              =   5160
         Y1              =   570
         Y2              =   6570
      End
   End
   Begin VB.Label Label9 
      Alignment       =   2  'Center
      Caption         =   "difference"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   13.5
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   375
      Left            =   9810
      TabIndex        =   8
      Top             =   4680
      Width           =   1650
   End
   Begin VB.Label Label8 
      Alignment       =   2  'Center
      Caption         =   "------- lbs"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   13.5
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      ForeColor       =   &H00808080&
      Height          =   375
      Left            =   9810
      TabIndex        =   7
      Top             =   3480
      Width           =   1650
   End
   Begin VB.Label Label7 
      Alignment       =   2  'Center
      Caption         =   "------ lbs"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   13.5
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   375
      Left            =   9810
      TabIndex        =   6
      Top             =   2280
      Width           =   1650
   End
   Begin VB.Label Label6 
      Alignment       =   2  'Center
      Caption         =   "Engine RPM"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   13.5
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   375
      Left            =   9810
      TabIndex        =   5
      Top             =   1080
      Width           =   1650
   End
   Begin VB.Label Label4 
      Alignment       =   1  'Right Justify
      BackColor       =   &H0080FFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "Label4"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   13.5
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   420
      Left            =   10230
      TabIndex        =   4
      Top             =   5199
      Width           =   810
   End
   Begin VB.Label Label3 
      Alignment       =   1  'Right Justify
      BackColor       =   &H0080FFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "Label3"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   13.5
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   420
      Left            =   10230
      TabIndex        =   3
      Top             =   3900
      Width           =   810
   End
   Begin VB.Label Label2 
      Alignment       =   1  'Right Justify
      BackColor       =   &H0080FFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "Label2"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   13.5
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   420
      Left            =   10230
      TabIndex        =   2
      Top             =   2700
      Width           =   810
   End
   Begin VB.Label Label1 
      Alignment       =   1  'Right Justify
      BackColor       =   &H0080FFFF&
      BorderStyle     =   1  'Fixed Single
      Caption         =   "Label1"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   13.5
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   420
      Left            =   10230
      TabIndex        =   1
      Top             =   1500
      Width           =   810
   End
End
Attribute VB_Name = "frmGraph"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Dim s1 As Single
Dim s2 As Single
Dim s3 As Single
Dim xmax As Single
Dim zRPM As Single

Private Sub Form_Load()
Dim ymax As Single
    Picture1.Picture = frmClutch.gph1.Picture
    
    xmax = RoundUp(RPM(NTQ), 2000)
    ymax = TotalLbs(gc_Static.Value, CF1, RetLbf1, CF2, RetLbf2, xmax)
    
    s1 = IIf(ymax >= 1000, 1245, 1110)
    s2 = 8550:  s3 = xmax / (s2 - s1)
    
    zRPM = frmClutch.Label4.caption:    SetLabels
End Sub

Private Sub Form_KeyDown(KeyCode As Integer, shift As Integer)
Dim dz As Single
    Select Case KeyCode
        Case vbKeyLeft:     dz = -50
        Case vbKeyRight:    dz = 50
        Case vbKeyDown:     dz = -250
        Case vbKeyUp:       dz = 250
        Case Else:          Exit Sub
    End Select
    
    zRPM = Round(zRPM + dz, 50):        SetLabels
End Sub

Private Sub picture1_MouseDown(Button As Integer, shift As Integer, X As Single, Y As Single)
    zRPM = Round(s3 * (X - s1), 50):    SetLabels
End Sub

Private Sub SetLabels()
Dim newval As Single
Dim oldVal As Single
Dim difVal As Single
Dim iround As Single
    If zRPM < 0 Then
        zRPM = 0:       Line1.X1 = s1
    ElseIf zRPM > xmax Then
        zRPM = xmax:    Line1.X1 = s2
    Else
        Line1.X1 = Round(s1 + (zRPM / s3), 15)
    End If
    Line1.X2 = Line1.X1
    
    newval = TotalLbs(gc_Static.Value, CF1, RetLbf1, CF2, RetLbf2, zRPM)
    oldVal = TotalLbs(StaticSave, CF1Save, RetLbf1Save, CF2Save, RetLbf2Save, zRPM)
    
    'set rounding value for car and bike clutch plate forces
    iround = IIf(Not isBike, 5, 2)
    newval = Round(newval, iround): oldVal = Round(oldVal, iround)
    difVal = newval - oldVal
    
    Label1.caption = zRPM:          Label2.caption = newval
    Label3.caption = oldVal:        Label4.caption = difVal
End Sub
