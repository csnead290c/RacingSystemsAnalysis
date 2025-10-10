VERSION 5.00
Begin VB.Form frmOutput 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   "Detailed Parameters"
   ClientHeight    =   4290
   ClientLeft      =   345
   ClientTop       =   390
   ClientWidth     =   5790
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MDIChild        =   -1  'True
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   4290
   ScaleWidth      =   5790
   ShowInTaskbar   =   0   'False
   Begin VB.ListBox lstLbxOutput 
      BeginProperty Font 
         Name            =   "Courier New"
         Size            =   8.25
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   4050
      Left            =   30
      TabIndex        =   0
      Top             =   180
      Width           =   5700
   End
   Begin VB.Label Label1 
      Caption         =   "Time        Distance     MPH   Acceleration  Gear     RPM"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      ForeColor       =   &H00800000&
      Height          =   195
      Left            =   480
      TabIndex        =   1
      Top             =   -15
      Width           =   6015
   End
End
Attribute VB_Name = "frmOutput"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Private Sub Form_Unload(Cancel As Integer)
    frmTimeSlip.btnOutput.Enabled = True
End Sub
