Attribute VB_Name = "Declares"
Option Explicit
Option Compare Text

'constants
Public Const ERR_TYP_INPUT = vbInformation
Public Const ERR_ANSWER = True
Public Const ERR_CAP_RANGE = "Input Data Outside Min/Max Limits!"

Public Const UOM_NORMAL = True
Public Const UOM_ALTERNATE = False

'class variables
Public gc_ER As New CError
Public gc_TransType As New CValue
Public gc_RaceStyle As New CValue
Public gc_Weight As New CValue
Public gc_HP As New CValue
Public gc_HPC As New CValue
