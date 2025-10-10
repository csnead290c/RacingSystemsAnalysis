Attribute VB_Name = "Declares"
Option Explicit
Option Compare Text

'constants
Public Const ERR_TYP_INPUT = vbInformation
Public Const ERR_ANSWER = True
Public Const ERR_CAP_RANGE = "Input Data Outside Min/Max Limits!"

Public Const UOM_NORMAL = True
Public Const UOM_ALTERNATE = False

Public Const PI = 3.141593

'class variables
Public gc_ER As New CError

Public gc_TireDiameter As New CValue
Public gc_GearRatio As New CValue
Public gc_RPM As New CValue
Public gc_MPH As New CValue
