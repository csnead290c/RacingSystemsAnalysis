VERSION 5.00
Begin VB.Form frmRecommend 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "ENGINE Pro Recommendations"
   ClientHeight    =   4740
   ClientLeft      =   105
   ClientTop       =   3270
   ClientWidth     =   7635
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   4740
   ScaleWidth      =   7635
   ShowInTaskbar   =   0   'False
   StartUpPosition =   2  'CenterScreen
   Begin VB.Frame Frame4 
      Caption         =   "Exhaust System:"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   -1  'True
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1410
      Left            =   3840
      TabIndex        =   32
      Top             =   2520
      Width           =   3720
      Begin VB.Label Label1 
         Caption         =   "Primary Tube Length - inch"
         Height          =   255
         Index           =   15
         Left            =   180
         TabIndex        =   38
         Top             =   330
         Width           =   2595
      End
      Begin VB.Label Label1 
         Caption         =   "Primary Tube Diameter - inch"
         Height          =   255
         Index           =   16
         Left            =   180
         TabIndex        =   37
         Top             =   690
         Width           =   2595
      End
      Begin VB.Label Label1 
         Caption         =   "Collector Diameter - inch"
         Height          =   255
         Index           =   17
         Left            =   180
         TabIndex        =   36
         Top             =   1050
         Width           =   2595
      End
      Begin VB.Label lblRec 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   15
         Left            =   2940
         TabIndex        =   35
         Top             =   300
         Width           =   600
      End
      Begin VB.Label lblRec 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   16
         Left            =   2940
         TabIndex        =   34
         Top             =   660
         Width           =   600
      End
      Begin VB.Label lblRec 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   17
         Left            =   2940
         TabIndex        =   33
         Top             =   1020
         Width           =   600
      End
   End
   Begin VB.Frame Frame3 
      Caption         =   "Camshaft:"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   -1  'True
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1410
      Left            =   90
      TabIndex        =   25
      Top             =   2520
      Width           =   3675
      Begin VB.Label lblRec 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   7
         Left            =   2940
         TabIndex        =   31
         Top             =   300
         Width           =   600
      End
      Begin VB.Label Label1 
         Caption         =   "Lobe Separation Angle - deg"
         Height          =   195
         Index           =   7
         Left            =   180
         TabIndex        =   30
         Top             =   330
         Width           =   2475
      End
      Begin VB.Label Label1 
         Caption         =   "Intake Lobe Centerline - deg"
         Height          =   195
         Index           =   8
         Left            =   180
         TabIndex        =   29
         Top             =   690
         Width           =   2475
      End
      Begin VB.Label Label1 
         Caption         =   "Exhaust Duration @ .050 inch - deg"
         Height          =   195
         Index           =   9
         Left            =   180
         TabIndex        =   28
         ToolTipText     =   "based on Recommended Exhaust Port Flow"
         Top             =   1050
         Width           =   2700
      End
      Begin VB.Label lblRec 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   8
         Left            =   2940
         TabIndex        =   27
         Top             =   660
         Width           =   600
      End
      Begin VB.Label lblRec 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   9
         Left            =   2940
         TabIndex        =   26
         ToolTipText     =   "based on Recommended Exhaust Port Flow"
         Top             =   1020
         Width           =   600
      End
   End
   Begin VB.Frame Frame2 
      Caption         =   "Exhaust Port:"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   -1  'True
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   2490
      Left            =   3840
      TabIndex        =   13
      Top             =   30
      Width           =   3720
      Begin VB.Label lblRec 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   12
         Left            =   2940
         TabIndex        =   24
         ToolTipText     =   "at valve seat throat"
         Top             =   1650
         Width           =   600
      End
      Begin VB.Label lblRec 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   11
         Left            =   2940
         TabIndex        =   23
         ToolTipText     =   "net valve lift, less lash"
         Top             =   1290
         Width           =   600
      End
      Begin VB.Label lblRec 
         Alignment       =   2  'Center
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   10
         Left            =   2820
         TabIndex        =   22
         Top             =   930
         Width           =   810
      End
      Begin VB.Label Label1 
         Caption         =   "Minimum Flow Area - sq inch"
         Height          =   195
         Index           =   12
         Left            =   180
         TabIndex        =   21
         ToolTipText     =   "at valve seat throat"
         Top             =   1680
         Width           =   2595
      End
      Begin VB.Label Label1 
         Caption         =   "Exhaust Valve Lift - inch"
         Height          =   195
         Index           =   11
         Left            =   180
         TabIndex        =   20
         ToolTipText     =   "net valve lift, less lash"
         Top             =   1320
         Width           =   2595
      End
      Begin VB.Label Label1 
         Caption         =   "Exhaust Valve Diameter - "
         Height          =   195
         Index           =   10
         Left            =   180
         TabIndex        =   19
         Top             =   960
         Width           =   2550
      End
      Begin VB.Label Label1 
         Caption         =   "Maximum Flow Area - sq inch"
         Height          =   195
         Index           =   13
         Left            =   180
         TabIndex        =   18
         ToolTipText     =   "at exhaust flange of cylinder head"
         Top             =   2040
         Width           =   2595
      End
      Begin VB.Label Label1 
         Caption         =   "Exhaust Port Flow - CFM @ 28 inch H2O"
         Height          =   195
         Index           =   14
         Left            =   180
         TabIndex        =   17
         ToolTipText     =   "flowed with exhaust pipe attached to cylinder head"
         Top             =   330
         Width           =   3300
      End
      Begin VB.Label lblRec 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   13
         Left            =   2940
         TabIndex        =   16
         ToolTipText     =   "at exhaust flange of cylinder head"
         Top             =   2010
         Width           =   600
      End
      Begin VB.Label lblRec 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   14
         Left            =   2820
         TabIndex        =   15
         ToolTipText     =   "flowed with exhaust pipe attached to cylinder head"
         Top             =   540
         Width           =   810
      End
      Begin VB.Label Label2 
         Caption         =   "and 4.125 inch bore diameter"
         Height          =   195
         Index           =   14
         Left            =   180
         TabIndex        =   14
         ToolTipText     =   "flowed with exhaust pipe attached to cylinder head"
         Top             =   570
         Width           =   2625
      End
   End
   Begin VB.Frame Frame1 
      Caption         =   "Intake System:"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   700
         Underline       =   -1  'True
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   2490
      Left            =   90
      TabIndex        =   0
      Top             =   30
      Width           =   3675
      Begin VB.Label Label1 
         Caption         =   "Minimum Flow Area - sq inch"
         Height          =   195
         Index           =   2
         Left            =   180
         TabIndex        =   12
         ToolTipText     =   "at valve seat throat"
         Top             =   690
         Width           =   2475
      End
      Begin VB.Label Label1 
         Caption         =   "Intake Valve Lift - inch"
         Height          =   195
         Index           =   1
         Left            =   180
         TabIndex        =   11
         ToolTipText     =   "net valve lift, less lash"
         Top             =   330
         Width           =   2475
      End
      Begin VB.Label Label1 
         Caption         =   "Total Intake Track Length - inch"
         Height          =   255
         Index           =   3
         Left            =   180
         TabIndex        =   10
         Top             =   1050
         Width           =   2475
      End
      Begin VB.Label Label1 
         Caption         =   "Maximum Flow Area - sq inch"
         Height          =   255
         Index           =   4
         Left            =   180
         TabIndex        =   9
         Top             =   1410
         Width           =   2475
      End
      Begin VB.Label Label1 
         Caption         =   "Total Intake Track Volume - c.c."
         Height          =   255
         Index           =   5
         Left            =   180
         TabIndex        =   8
         Top             =   1770
         Width           =   2475
      End
      Begin VB.Label lblRec 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   3
         Left            =   2940
         TabIndex        =   7
         Top             =   1020
         Width           =   600
      End
      Begin VB.Label lblRec 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   1
         Left            =   2940
         TabIndex        =   6
         ToolTipText     =   "net valve lift, less lash"
         Top             =   300
         Width           =   600
      End
      Begin VB.Label lblRec 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   2
         Left            =   2940
         TabIndex        =   5
         ToolTipText     =   "at valve seat throat"
         Top             =   660
         Width           =   600
      End
      Begin VB.Label lblRec 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   4
         Left            =   2940
         TabIndex        =   4
         Top             =   1380
         Width           =   600
      End
      Begin VB.Label lblRec 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   5
         Left            =   2940
         TabIndex        =   3
         Top             =   1740
         Width           =   600
      End
      Begin VB.Label Label1 
         Caption         =   "Plenum Volume - cubic inch"
         Height          =   255
         Index           =   6
         Left            =   180
         TabIndex        =   2
         Top             =   2130
         Width           =   2475
      End
      Begin VB.Label lblRec 
         Alignment       =   1  'Right Justify
         BorderStyle     =   1  'Fixed Single
         Height          =   255
         Index           =   6
         Left            =   2940
         TabIndex        =   1
         Top             =   2100
         Width           =   600
      End
   End
   Begin VB.Label Label3 
      Alignment       =   2  'Center
      BackColor       =   &H00E0E0E0&
      BorderStyle     =   1  'Fixed Single
      Caption         =   $"RECOMD.frx":0000
      Height          =   675
      Left            =   90
      TabIndex        =   39
      Top             =   3990
      Width           =   7470
   End
End
Attribute VB_Name = "frmRecommend"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Private Sub Form_Load()
    CalcRecommendations
    LoadScreen
End Sub

Private Sub LoadScreen()
Dim evd As Single
Dim evds As String
    lblRec(1).caption = gc_InMaxValveLift.Formatted
    lblRec(2).caption = gc_InMinFlowArea.Formatted
    lblRec(3).caption = gc_InTrackLen.Formatted
    lblRec(4).caption = gc_InMaxFlowArea.Formatted
    lblRec(5).caption = gc_InTrackVol.Formatted
    
    If gc_Manifold.Value = 2 Then   'IR engine design - no plenum
        Label1(6).Visible = False
        lblRec(6).Visible = False
    Else
        Label1(6).Visible = True
        lblRec(6).caption = gc_PlenVol.Formatted
        lblRec(6).Visible = True
    End If
    
    lblRec(7).caption = gc_LobeSepAng.Formatted
    lblRec(8).caption = gc_InLobeCL.Formatted
    lblRec(9).caption = gc_ExCamDur.Formatted
    
    Label1(10).caption = "Exhaust Valve Diameter - " & gc_ExValveDia.Unit
    If gc_ExValveDia.Inches Then
        evd = Round(gc_ExValveDia.Value + 0.04, 0.02)
        evds = Format(evd, "#.#0")
    Else
        evd = Round(gc_ExValveDia.Value + 1, 0.5)
        evds = Format(evd, "##.0")
    End If
    lblRec(10).caption = gc_ExValveDia.Formatted & "-" & evds
    
    lblRec(11).caption = gc_ExMaxValveLift.Formatted
    lblRec(12).caption = gc_ExMinFlowArea.Formatted
    lblRec(13).caption = gc_ExMaxFlowArea.Formatted
    Label1(14).caption = "Exhaust Flow - CFM @" & gc_DeltaP.Formatted & " inches H2O, %Intake"
    Label2(14).caption = "@" & gc_RefBore.Formatted & " " & gc_RefBore.Unit & " Ref. Bore Diameter"
    lblRec(14).caption = gc_ExRecFlow.Formatted & " = " & Format(100 * gc_ExRecFlow.Value / gc_MaxInFlow.Value, "##") & "%"
    
    lblRec(15).caption = gc_PriTubeLen.Formatted
    lblRec(16).caption = gc_PriTubeDia.Formatted
    
    If gc_NoCyl.Value = 1 Then  'single cylinder engine
        Label1(17).Visible = False
        lblRec(17).Visible = False
    Else
        Label1(17).Visible = True
        lblRec(17).caption = gc_CollectDia.Formatted
        lblRec(17).Visible = True
    End If
End Sub
