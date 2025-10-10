VERSION 5.00
Begin VB.Form frmShapeFactor 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   " Help for Shape Factor"
   ClientHeight    =   1455
   ClientLeft      =   3645
   ClientTop       =   4545
   ClientWidth     =   3990
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   1455
   ScaleWidth      =   3990
   ShowInTaskbar   =   0   'False
   Begin VB.Frame frame1 
      Height          =   1470
      Left            =   0
      TabIndex        =   0
      Top             =   -60
      Width           =   3975
      Begin VB.Label lbl 
         Caption         =   "Rectangle         =  100"
         Height          =   195
         Index           =   0
         Left            =   1080
         TabIndex        =   4
         Top             =   225
         Width           =   1590
      End
      Begin VB.Label lbl 
         Caption         =   "Typical Sedan   =   90"
         Height          =   195
         Index           =   1
         Left            =   1080
         TabIndex        =   3
         Top             =   525
         Width           =   1590
      End
      Begin VB.Label lbl 
         Caption         =   "Circle                 =   79"
         Height          =   195
         Index           =   2
         Left            =   1080
         TabIndex        =   2
         Top             =   825
         Width           =   1590
      End
      Begin VB.Label lbl 
         Appearance      =   0  'Flat
         Caption         =   "Triangle             =   50"
         ForeColor       =   &H80000008&
         Height          =   195
         Index           =   3
         Left            =   1080
         TabIndex        =   1
         Top             =   1125
         Width           =   1590
      End
   End
End
Attribute VB_Name = "frmShapeFactor"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit
Option Compare Text

Private Sub lbl_DblClick(Index As Integer)
    Select Case Index
        Case 0:     gc_ShapeFactor.Value = 100
        Case 1:     gc_ShapeFactor.Value = 90
        Case 2:     gc_ShapeFactor.Value = 79
        Case 3:     gc_ShapeFactor.Value = 50
    End Select
    
    Unload Me
End Sub

