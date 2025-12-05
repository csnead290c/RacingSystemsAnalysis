VERSION 5.00
Object = "{0BA686C6-F7D3-101A-993E-0000C0EF6F5E}#1.0#0"; "threed32.ocx"
Begin VB.Form frmSplash 
   Appearance      =   0  'Flat
   BackColor       =   &H80000005&
   BorderStyle     =   0  'None
   ClientHeight    =   5175
   ClientLeft      =   390
   ClientTop       =   1830
   ClientWidth     =   8475
   BeginProperty Font 
      Name            =   "MS Sans Serif"
      Size            =   8.25
      Charset         =   0
      Weight          =   700
      Underline       =   0   'False
      Italic          =   0   'False
      Strikethrough   =   0   'False
   EndProperty
   ForeColor       =   &H80000008&
   Icon            =   "Splash.frx":0000
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   345
   ScaleMode       =   3  'Pixel
   ScaleWidth      =   565
   ShowInTaskbar   =   0   'False
   Begin Threed.SSPanel pnlsSspSplash 
      Height          =   5175
      Left            =   0
      TabIndex        =   0
      Top             =   0
      Width           =   8475
      _Version        =   65536
      _ExtentX        =   14949
      _ExtentY        =   9128
      _StockProps     =   15
      BackColor       =   -2147483633
      BeginProperty Font {0BE35203-8F91-11CE-9DE3-00AA004BB851} 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      BevelWidth      =   6
      RoundedCorners  =   0   'False
      Outline         =   -1  'True
      FloodShowPct    =   0   'False
      Begin VB.Timer tmrTimer1 
         Enabled         =   0   'False
         Interval        =   500
         Left            =   270
         Top             =   300
      End
      Begin Threed.SSPanel pnlsplash 
         Height          =   975
         Left            =   1650
         TabIndex        =   1
         Top             =   1200
         Width           =   5400
         _Version        =   65536
         _ExtentX        =   9525
         _ExtentY        =   1720
         _StockProps     =   15
         Caption         =   "Application Name"
         ForeColor       =   16711680
         BackColor       =   -2147483633
         BeginProperty Font {0BE35203-8F91-11CE-9DE3-00AA004BB851} 
            Name            =   "MS Sans Serif"
            Size            =   18
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         BevelWidth      =   5
         BorderWidth     =   2
         Begin VB.Label lblLabel1 
            Appearance      =   0  'Flat
            BackColor       =   &H80000005&
            BackStyle       =   0  'Transparent
            Caption         =   "TM"
            ForeColor       =   &H80000008&
            Height          =   210
            Left            =   3810
            TabIndex        =   2
            Top             =   210
            Width           =   300
         End
      End
      Begin VB.Label lblCopyright2 
         Appearance      =   0  'Flat
         BackColor       =   &H80000005&
         BackStyle       =   0  'Transparent
         Caption         =   "Licensed to:"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H80000008&
         Height          =   210
         Index           =   1
         Left            =   2100
         TabIndex        =   8
         Top             =   3000
         Width           =   1335
      End
      Begin VB.Label lblOwner 
         Caption         =   "123456789012345678901234567890"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00FF0000&
         Height          =   255
         Index           =   1
         Left            =   2100
         TabIndex        =   7
         Top             =   3300
         Width           =   3975
      End
      Begin VB.Label lblOwner 
         Caption         =   "Serial Number 00000"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00FF0000&
         Height          =   255
         Index           =   2
         Left            =   2100
         TabIndex        =   6
         Top             =   3600
         Width           =   3255
      End
      Begin VB.Label lblCopyright2 
         Alignment       =   2  'Center
         Appearance      =   0  'Flat
         BackColor       =   &H80000005&
         BackStyle       =   0  'Transparent
         Caption         =   "This program is protected by US and international copyright laws as described in Help About."
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   400
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H80000008&
         Height          =   210
         Index           =   0
         Left            =   900
         TabIndex        =   5
         Top             =   4080
         Width           =   6705
      End
      Begin VB.Label lblCopyRight 
         Appearance      =   0  'Flat
         BackColor       =   &H80000005&
         BackStyle       =   0  'Transparent
         Caption         =   "Copyright 2002 RSA"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00FF0000&
         Height          =   315
         Left            =   4500
         TabIndex        =   4
         Top             =   2400
         Width           =   2100
         WordWrap        =   -1  'True
      End
      Begin VB.Label lblVersion 
         Appearance      =   0  'Flat
         BackColor       =   &H80000005&
         BackStyle       =   0  'Transparent
         Caption         =   "Version 3.0.0"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   9.75
            Charset         =   0
            Weight          =   700
            Underline       =   0   'False
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         ForeColor       =   &H00FF0000&
         Height          =   315
         Left            =   2100
         TabIndex        =   3
         Top             =   2400
         Width           =   1695
      End
      Begin VB.Image imgApp 
         Height          =   480
         Left            =   7710
         Picture         =   "Splash.frx":0442
         Top             =   300
         Visible         =   0   'False
         Width           =   480
      End
   End
End
Attribute VB_Name = "frmSplash"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Private mBIsAbout As Boolean

Public Sub Display(Optional mode As Variant)
Dim imode As Integer
    If IsMissing(mode) Then
        imode = vbModeless
    Else
        imode = mode
    End If
    Me.Show imode
End Sub

Private Sub Form_Load()
Dim version As String
    imgApp.Left = (Me.Width - imgApp.Width) / 2
   
    pnlsplash.caption = App.Title
    version = "Version " & App.Major & "." & App.Minor & "." & App.Revision
    lblVersion.caption = version
    lblCopyRight.caption = App.LegalCopyright
    pnlsplash.Left = (Me.Width / 2) - (pnlsplash.Width / 2)
    
    winOnTop Me, True
    winCenter Me
    
    If BIsAbout Then
        tmrTimer1.Interval = 4500
    Else
        tmrTimer1.Interval = 3000
    End If
    tmrTimer1.Enabled = True
End Sub

Private Sub Form_KeyPress(KeyAscii As Integer)
    Unload Me
    If Not BIsAbout Then frmClutch.Enabled = True
End Sub

Private Sub tmrTimer1_Timer()
    Unload Me
    If Not BIsAbout Then frmClutch.Enabled = True
End Sub

Public Property Get BIsAbout() As Boolean
    BIsAbout = mBIsAbout
End Property

Public Property Let BIsAbout(vNewValue As Boolean)
    mBIsAbout = vNewValue
End Property
