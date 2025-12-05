VERSION 5.00
Begin VB.Form frmMatch 
   BorderStyle     =   4  'Fixed ToolWindow
   Caption         =   "Match: Clutch Plate Load"
   ClientHeight    =   675
   ClientLeft      =   3345
   ClientTop       =   4125
   ClientWidth     =   2460
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   675
   ScaleWidth      =   2460
   ShowInTaskbar   =   0   'False
   Begin VB.CommandButton cmdCWT 
      Caption         =   "Counter Weight"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   540
      Left            =   60
      TabIndex        =   0
      Top             =   75
      Width           =   1140
   End
   Begin VB.CommandButton cmdLBS 
      Caption         =   "Static"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   540
      Left            =   1275
      TabIndex        =   1
      Top             =   75
      Width           =   1140
   End
End
Attribute VB_Name = "frmMatch"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Private bFileDirty As Boolean

Private Sub cmdCWT_Click()
Dim zRPM As Single, newval As Single, oldval As Single
Dim CF1D0 As Single, CF2D0 As Single, RetLbf1D0 As Single, RetLbf2D0 As Single
Dim CF1D As Single, CF2D As Single, RetLbf1D As Single, RetLbf2D As Single
Dim add As Single, LBS As Single, CWT As Single
    zRPM = val(frmClutch.Label1(4).caption)
    newval = TotalLbs(gc_Static.Value, CF1, RetLbf1, CF2, RetLbf2, zRPM)
    oldval = TotalLbs(StaticSave, CF1Save, RetLbf1Save, CF2Save, RetLbf2Save, zRPM)
    
    'Calculate baseline CFs
    CalcCF 0, 0, 0, 0, 0, CF1D, CF2D, RetLbf1D, RetLbf2D
    CF1D0 = CF1D:           CF2D0 = CF2D
    RetLbf1D0 = RetLbf1D:   RetLbf2D0 = RetLbf2D
    
    'determine the plate load change for +1 gram of Total Counter Weight at zRPM
    add = 1 / gc_NArm1.Value    'convert to grams per arm for CalcCF subroutine
    CalcCF 0, 0, add, 0, 0, CF1D, CF2D, RetLbf1D, RetLbf2D
    LBS = TotalLbs(gc_Static.Value, CF1D, RetLbf1D, CF2D, RetLbf2D, zRPM)
    LBS = LBS - TotalLbs(gc_Static.Value, CF1D0, RetLbf1D0, CF2D0, RetLbf2D0, zRPM)
    
    CWT = gc_CWt1.Value + (oldval - newval) / LBS / gc_NArm1.Value
    gc_CWt1.Value = Round(CWT, 0.1)
    gc_TCWt1.Value = gc_NArm1.Value * gc_CWt1.Value
    ClutchCalc
    
    Unload Me
    frmClutch.txtTCWt1.SetFocus
End Sub

Private Sub cmdLBS_Click()
Dim zRPM As Single, newval As Single, oldval As Single
Dim LBS As Single, iround As Single
    zRPM = val(frmClutch.Label1(4).caption)
    newval = TotalLbs(gc_Static.Value, CF1, RetLbf1, CF2, RetLbf2, zRPM)
    oldval = TotalLbs(StaticSave, CF1Save, RetLbf1Save, CF2Save, RetLbf2Save, zRPM)
    
    LBS = gc_Static.Value + (oldval - newval)
    
    iround = IIf(isBike, 2, 5)
    gc_Static.Value = Round(LBS, iround)
    gc_Turns.Value = CalcTurns
    ClutchCalc
    
    Unload Me
    frmClutch.txtStatic.SetFocus
End Sub


Public Property Get FileDirty() As Boolean
    FileDirty = bFileDirty
End Property

Public Property Let FileDirty(vNewValue As Boolean)
    bFileDirty = vNewValue
End Property
