Attribute VB_Name = "Declares"
Option Explicit

Public Const HELP_SET = 0
Public Const HELP_SAVE = 1
Public Const HELP_RESET = 2

'global math constants
Public Const PI = 3.141593
Public Const PSIA = 14.696
Public Const PSTD = 406.78
Public Const RSTD = 53.345  'Patrick - should be 53.3478
Public Const Z6 = (60 / (2 * PI)) * 550
Public Const RHOair = 0.07634  'Patrick - should be 0.07633 = 14.696 * 144 / (53.3478 * 519.67)
Public Const KRPM = (144 / PI) * 60 * 12
Public Const GC = 32.174
Public Const ZM = 25.4
Public Const ZM2 = ZM ^ 2
Public Const ZM3 = 2.54 ^ 3

'global variables
Public ofn As String
Public Note As String
Public bore As Single
Public stroke As Single
Public BQS As Single
Public LRQS As Single
Public flrqs As Single
Public AngMPS As Single
Public DQR As Single
Public BArea As Single
Public CCP As Single
Public Dcid As Single
Public Gcid As Single
Public Hcid As Single
Public Pcid As Single
Public cylCID As Single
Public CID As Single
Public VSTD As Single

'classes
Public gc_Graph As New cGraph
Public gc_ER As New CError

Public gc_Blank As New cValue

Public gc_NoCyl As New cValue
Public gc_Inline As New cValue
Public gc_Bore As New cValue
Public gc_Stroke As New cValue
Public gc_Rod As New cValue
Public gc_CR As New cValue

Public gc_CamType As New cValue
Public gc_InCamDur As New cValue
Public gc_Carb As New cValue
Public gc_CarbCFM As New cValue
Public gc_Fuel As New cValue

Public gc_Manifold As New cValue
Public gc_Curved As New cValue
Public gc_ManFlow As New cValue

Public gc_NoInValves As New cValue
Public gc_ValveDia As New cValue
Public gc_MaxInFlow As New cValue
Public gc_DeltaP As New cValue
Public gc_RefBore As New cValue

'compression ratio worksheet form
Public gc_Chamber As New cValue
Public gc_Deck As New cValue
Public gc_Gasket As New cValue
Public gc_Dome As New cValue
Public gc_WSCR As New cValue

'carb flow worksheet form
Public gc_NoTB As New cValue
Public gc_TBDia As New cValue
Public gc_TVDia As New cValue
Public gc_NoTBS As New cValue
Public gc_TBDiaS As New cValue
Public gc_TVDiaS As New cValue
Public gc_TBType As New cValue
Public gc_WSCarbCFM As New cValue

'max intake port flow worksheet form
Public gc_CSArea As New cValue
Public gc_FlowVel As New cValue
Public gc_FlowFlux As New cValue
Public gc_FVIndex As New cValue

'minimum cross-section worksheet form
Public gc_SeatDia As New cValue
Public gc_SeatPer As New cValue
Public gc_VSAngle As New cValue
Public gc_VSWidth As New cValue
Public gc_StemDia As New cValue
Public gc_ValveLift As New cValue
Public gc_WSCSArea As New cValue
        
'special cam recommendation values
Public gc_LobeSepAng As New cValue
Public gc_InLobeCL As New cValue
Public gc_WSInLobeCL As New cValue
Public gc_WSInCamDur As New cValue
Public gc_WSValveLift As New cValue

#If ISENGINEPRO Then
    'intake flowbench data worksheet form
    Public gc_IntLift(0 To 9) As New cValue
    Public gc_IntFlow(0 To 9) As New cValue
    
    'details form
    Public gc_Detail As New cDetail
    
    'recommendations form
    Public gc_InMaxValveLift As New cValue
    Public gc_InMinFlowArea As New cValue
    Public gc_InTrackLen As New cValue
    Public gc_InMaxFlowArea As New cValue
    Public gc_InTrackVol As New cValue
    Public gc_PlenVol As New cValue
    
    Public gc_ExCamDur As New cValue
    
    Public gc_ExValveDia As New cValue
    Public gc_ExMaxValveLift As New cValue
    Public gc_ExMinFlowArea As New cValue
    Public gc_ExMaxFlowArea As New cValue
    Public gc_ExRecFlow As New cValue
    
    Public gc_PriTubeLen As New cValue
    Public gc_PriTubeDia As New cValue
    Public gc_CollectDia As New cValue
#End If

'Cross-Section Area Calculator
Public gc_C(0 To 2) As New cValue
Public gc_E(0 To 3) As New cValue
Public gc_R(0 To 4) As New cValue
Public gc_A(0 To 3) As New cValue

'output performance section
Public gc_HP As New cValue
Public gc_TQ As New cValue
Public gc_RPMPeakHP As New cValue
Public gc_RPMPeakTQ As New cValue
Public gc_HPperCID As New cValue
Public gc_TQperCID As New cValue
Public gc_Shift As New cValue
Public gc_Redline As New cValue

'error message constants
Public Const ERR_TYP_INPUT = 48
Public Const ERR_ANSWER = True
Public Const ERR_CAP_RANGE = "Input Data Outside Min/Max Limits!"

    Declare Function OpenFile Lib "kernel32" (ByVal lpFileName As String, lpReOpenBuff As OFSTRUCT, ByVal wStyle As Long) As Long
    Declare Function SendMessage Lib "user32" Alias "SendMessageA" (ByVal hwnd As Long, ByVal wMsg As Long, ByVal wParam As Long, lParam As Long) As Long
    Declare Function SetWindowPos Lib "user32" (ByVal hwnd As Long, ByVal hWndInsertAfter As Long, ByVal X As Long, ByVal Y As Long, ByVal cx As Long, ByVal cy As Long, ByVal wFlags As Long) As Long
    
Public Const OFS_MAXPATHNAME = 128
Type OFSTRUCT
    cBytes As Byte
    fFixedDisk As Byte
    nErrCode As Integer
    Reserved1 As Integer
    Reserved2 As Integer
    szPathName(OFS_MAXPATHNAME) As Byte
End Type

Public g_ofstruct As OFSTRUCT
Public Const OF_EXIST = &H4000
Public Const HWND_TOPMOST = -1
Public Const HWND_NOTOPMOST = -2
Public Const SWP_NOACTIVATE = &H10
Public Const SWP_NOMOVE = &H2
Public Const SWP_NOSIZE = &H1
