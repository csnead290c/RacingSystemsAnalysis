VERSION 5.00
Begin VB.Form frmSplash 
   Appearance      =   0  'Flat
   BackColor       =   &H00C0C0C0&
   BorderStyle     =   0  'None
   ClientHeight    =   4635
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
   Icon            =   "SPLASHQ.frx":0000
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   309
   ScaleMode       =   3  'Pixel
   ScaleWidth      =   565
   ShowInTaskbar   =   0   'False
   StartUpPosition =   2  'CenterScreen
   Begin VB.Frame frmSplash 
      Height          =   4725
      Left            =   0
      TabIndex        =   0
      Top             =   -90
      Width           =   8475
      Begin VB.Timer Timer1 
         Enabled         =   0   'False
         Interval        =   500
         Left            =   1200
         Top             =   360
      End
      Begin VB.Frame frmApplication 
         Height          =   975
         Left            =   1800
         TabIndex        =   7
         Top             =   1185
         Width           =   4800
         Begin VB.Label lblApplication 
            Alignment       =   2  'Center
            Caption         =   "Application"
            BeginProperty Font 
               Name            =   "MS Reference Sans Serif"
               Size            =   14.25
               Charset         =   0
               Weight          =   700
               Underline       =   0   'False
               Italic          =   0   'False
               Strikethrough   =   0   'False
            EndProperty
            ForeColor       =   &H00FF0000&
            Height          =   390
            Left            =   1050
            TabIndex        =   9
            Top             =   360
            Width           =   2400
         End
         Begin VB.Label Label1 
            Appearance      =   0  'Flat
            BackColor       =   &H80000005&
            BackStyle       =   0  'Transparent
            Caption         =   "TM"
            ForeColor       =   &H80000008&
            Height          =   255
            Left            =   3600
            TabIndex        =   8
            Top             =   360
            Width           =   375
         End
      End
      Begin VB.Image imgApp 
         Height          =   480
         Left            =   2280
         Picture         =   "SPLASHQ.frx":030A
         Top             =   240
         Visible         =   0   'False
         Width           =   480
      End
      Begin VB.Label lblVersion 
         Appearance      =   0  'Flat
         BackColor       =   &H80000005&
         BackStyle       =   0  'Transparent
         Caption         =   "Version 3.0"
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
         Left            =   1920
         TabIndex        =   6
         Top             =   2280
         Width           =   1695
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
         Left            =   3870
         TabIndex        =   5
         Top             =   2280
         Width           =   2100
         WordWrap        =   -1  'True
      End
      Begin VB.Label lblOwner 
         BackStyle       =   0  'Transparent
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
         Left            =   1920
         TabIndex        =   4
         Top             =   3420
         Width           =   3255
      End
      Begin VB.Label lblOwner 
         BackStyle       =   0  'Transparent
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
         Left            =   1920
         TabIndex        =   3
         Top             =   3135
         Width           =   3975
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
         Left            =   1920
         TabIndex        =   2
         Top             =   2880
         Width           =   1335
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
         Left            =   360
         TabIndex        =   1
         Top             =   4200
         Width           =   7455
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
    lblApplication.caption = App.Title
    
    version = "Version " & App.Major & "." & App.Minor & "." & App.Revision
    lblVersion.caption = version
    lblCopyRight.caption = App.LegalCopyright
    frmApplication.left = (Me.width / 2) - (frmApplication.width / 2)
    
    winOnTop Me, True
    winCenter Me
    
    If BIsAbout Then
        Timer1.Interval = 4500
    Else
        Timer1.Interval = 1500
    End If
    
    Timer1.Enabled = True
End Sub

Private Sub winOnTop(frmTop As Form, bSetOnTop As Boolean)
    If bSetOnTop = True Then
        'Set the window to topmost window
        Call SetWindowPos(frmTop.hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOSIZE Or SWP_NOMOVE Or SWP_NOACTIVATE)
    Else
        'Set the window to not topmost window
        Call SetWindowPos(frmTop.hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, SWP_NOSIZE Or SWP_NOMOVE Or SWP_NOACTIVATE)
    End If
End Sub

Private Sub winCenter(frm As Form)
Dim lOffset
Dim tOffset
    lOffset = (Screen.width - frm.width) / 2
    tOffset = (Screen.height - frm.height) / 2
    
    frm.Move lOffset, tOffset
End Sub

Private Sub Form_KeyPress(KeyAscii As Integer)
    Unload Me
    If Not BIsAbout Then
        FrmMDI.Enabled = True
        DoEvents
        FrmMDI.mnuFile_Click MNU_FILE_OPEN
    End If
End Sub

Private Sub Timer1_Timer()
    Unload Me
    If Not BIsAbout Then
        FrmMDI.Enabled = True
        DoEvents
        FrmMDI.mnuFile_Click MNU_FILE_OPEN
    End If
End Sub

Public Property Get BIsAbout() As Boolean
    BIsAbout = mBIsAbout
End Property

Public Property Let BIsAbout(vNewValue As Boolean)
    mBIsAbout = vNewValue
End Property
