VERSION 5.00
Begin VB.Form frmApproach 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   " Help for Wind Angle of Approach"
   ClientHeight    =   1695
   ClientLeft      =   3045
   ClientTop       =   2730
   ClientWidth     =   4170
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   1695
   ScaleWidth      =   4170
   ShowInTaskbar   =   0   'False
   Begin VB.Frame frame1 
      Height          =   1740
      Left            =   0
      TabIndex        =   0
      Top             =   -60
      Width           =   4155
      Begin VB.Label lbl 
         Caption         =   "Pure Tail Wind      = 180"
         Height          =   195
         Index           =   4
         Left            =   1080
         TabIndex        =   5
         Top             =   1425
         Width           =   1800
      End
      Begin VB.Label lbl 
         Caption         =   "Cross-Tail Wind     = 135"
         Height          =   195
         Index           =   3
         Left            =   1080
         TabIndex        =   4
         Top             =   1125
         Width           =   1800
      End
      Begin VB.Label lbl 
         Caption         =   "Pure Head Wind   =     0"
         Height          =   195
         Index           =   0
         Left            =   1080
         TabIndex        =   3
         Top             =   225
         Width           =   1800
      End
      Begin VB.Label lbl 
         Caption         =   "Cross-Head Wind  =   45"
         Height          =   195
         Index           =   1
         Left            =   1080
         TabIndex        =   2
         Top             =   525
         Width           =   1800
      End
      Begin VB.Label lbl 
         Caption         =   "Pure Cross Wind   =   90"
         Height          =   195
         Index           =   2
         Left            =   1080
         TabIndex        =   1
         Top             =   825
         Width           =   1800
      End
   End
End
Attribute VB_Name = "frmApproach"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit
Option Compare Text

Private Sub lbl_DblClick(Index As Integer)
    gc_WindAngle.Value = Index * 45
    Unload Me
End Sub

