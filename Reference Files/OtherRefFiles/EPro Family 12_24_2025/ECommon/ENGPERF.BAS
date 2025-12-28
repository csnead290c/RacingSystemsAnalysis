Attribute VB_Name = "EngPerf"
Option Explicit

'math variables
Private camk(0 To 6, 1 To 6) As Single

'variables needed for recommendations, functions, etc.
Private GAM As Single, crx As Single, xqs As Single, EffCR As Single, tqcfm As Single
Private hpcfm As Single, hpfps As Single, RamVEHP As Single, acrit As Single
Private epek As Single

Public Sub CalcEngPerf()
Const VSW = 0.915
Const VSTM = 0.022

Dim niv As Integer
Dim rod As Single, refbore As Single, Gulp As Single, tqmin As Single
Dim NTQ(2) As Single, NHP(2) As Single
Dim itr As Integer, i As Integer, j As Integer
    
Dim gtqcid As Single, ntqcid As Single
Dim gtqhp As Single, ntqhp As Single
Dim clk As Single, crvf As Single, lsa As Single, ilc As Single
Dim ivc As Single, ivcr As Single
Dim EFF As Single, ICFM As Single, EqvPS As Single
Dim optcam As Single, PHI As Single, phi1 As Single, icdtq As Single, icdrpm As Single
Dim CarbVETQ As Single, CarbVEHP As Single
Dim PortVETQ As Single, PortVEHP As Single
Dim ftq As Single, xrpm As Single

Dim metq As Single, mehp As Single
Dim aqf As Single, fhv As Single
Dim VETQ As Single, VEHP As Single
Dim hpcfmx As Single, tqcidx As Single
Dim tqfps As Single

Dim zmin As Single, zmax As Single

Dim efik As Single
Dim crektq As Single, crekhp As Single

Dim ivd As Single
Dim athroat As Single, astar As Single, cdi As Single
Dim psitq As Single, psihp As Single
Dim RamVETQ As Single, RamVE As Single
Dim B2QS As Single, S3QB As Single
Dim lcetq As Single, lcehp As Single
Dim cvextq As Single, cvexhp As Single

Dim PumpVE As Single

    niv = gc_NoInValves.Value
    Rem ***** convert bore, stroke, rod and refbore to inch
    bore = gc_Bore.Value:       If Not gc_Bore.Inches Then bore = bore / ZM
    stroke = gc_Stroke.Value:   If Not gc_Stroke.Inches Then stroke = stroke / ZM
    rod = gc_Rod.Value:         If Not gc_Rod.Inches Then rod = rod / ZM
    refbore = gc_RefBore.Value: If Not gc_RefBore.Inches Then refbore = refbore / ZM
    ivd = gc_ValveDia.Value:    If Not gc_ValveDia.Inches Then ivd = ivd / ZM
    
    crvf = 1 + 1 / (gc_CR.Value - 1)    'compression ratio volume factor
    BQS = bore / stroke
    B2QS = bore * BQS
    S3QB = stroke ^ 2 / BQS
    LRQS = rod / stroke
    AngMPS = 62 + (750 * (LRQS - 0.958)) ^ 0.4027
    flrqs = 1 + (0.348 / LRQS) ^ 1.99   'max piston speed effect of lrqs
    DQR = (gc_Deck.Value + gc_Gasket.Value) / rod
    
    Gulp = CalcGulp
    clk = (1.5 / 29.92) / gc_CarbCFM.Value ^ 2  'carb loss coefficient
    
    Rem ***** Fuel Type Effect
    Select Case gc_Fuel.Value
        Case 1  'gasoline
            GAM = 1.28: aqf = 14.7: fhv = 20700: crx = 11.5
        Case 2  'racing gasoline - 01/26/00 (Rick Gold @ ERC)
            GAM = 1.28: aqf = 14.1: fhv = 20200: crx = 11.5
        Case 3  'methanol
            GAM = 1.28: aqf = 6.4:  fhv = 9700:  crx = 13.5
    End Select
    
    hpcfmx = RHOair * fhv / (550 * aqf) * 778.16 / 60 'max HP per CFM
    tqcidx = hpcfmx * Z6 / (2 * 1728)              'max TQ per CID @ 100% VE

    Rem ***** Fuel Injection - Cylinder to Cylinder Effect *****
    efik = 1
    If Not gc_Carb.Value Then
        If gc_Manifold.Value = 1 Then   'common plenum
            Select Case gc_Inline.Value
                Case 0: Select Case gc_NoCyl.Value
                            Case 3, 4:          efik = 1.005
                            Case 5, 6, 7, 8:    efik = 1.01
                            Case 9, 10, 11, 12: efik = 1.015
                        End Select
                
                Case 1: Select Case gc_NoCyl.Value
                            Case 4:             efik = 1.005
                            Case 6, 8:          efik = 1.01
                            Case 10, 12:        efik = 1.015
                        End Select
                
                Case 2: Select Case gc_NoCyl.Value
                            Case 4:             efik = 1.01
                            Case 6, 8:          efik = 1.015
                            Case 10, 12:        efik = 1.02
                        End Select
            End Select
                
        ElseIf gc_Manifold.Value >= 3 Then   'dual plane/100% divided plenum
                                             'and dual plane w/small slot
            Select Case gc_Inline.Value
                Case 0: Select Case gc_NoCyl.Value
                            Case 5, 6, 7, 8:    efik = 1.005
                            Case 9, 10, 11, 12: efik = 1.01
                        End Select
                
                Case 1, 2:  Select Case gc_NoCyl.Value
                                Case 6, 8:          efik = 1.005
                                Case 10, 12:        efik = 1.01
                            End Select
            End Select
        End If
    End If
    
    Rem ***** Large Carb Effect on Intake Ramming
    cvexhp = 0.986                  'all carburetors
    If Not gc_Carb.Value Then       'injectors
        Select Case gc_Manifold.Value
            Case 1: cvexhp = 0.987  'common plenum
            Case 2: cvexhp = 0.989  'individual runner
            Case 3: cvexhp = 0.988  'dual plane/100% divided plenum
            Case 4: cvexhp = 0.9877 'dual plane w/small slot
        End Select
    End If
    cvextq = cvexhp + 0.004
    
    Rem ***** Engine Plenum Manifold Effect on Intake Ramming
    epek = 1
    Select Case gc_Manifold.Value
        Case 1  'common plenum
            Select Case gc_Inline.Value
                Case 0: epek = 0.9
                Case 1:                 If gc_NoCyl.Value <= 4 Then epek = 0.92
                Case 2: epek = 0.98:    If gc_NoCyl.Value <= 4 Then epek = 0.92
            End Select
                                        If gc_NoCyl.Value <= 2 Then epek = 0.875
        Case 2  'individual runner
            epek = 0.85
        Case 3  'dual plane/100% divided plenum
            Select Case gc_Inline.Value
                Case 0: epek = 0.875
                Case 1: epek = 0.92:    If gc_NoCyl.Value <= 8 Then epek = 0.9
                Case 2: epek = 0.9:     If gc_NoCyl.Value <= 4 Then epek = 0.875
            End Select
                                        If gc_NoCyl.Value <= 2 Then epek = 0.85
        Case 4  'dual plane w/small slot
            Select Case gc_Inline.Value
                Case 0: epek = 0.885
                Case 1: epek = 0.94:    If gc_NoCyl.Value <= 8 Then epek = 0.92
                Case 2: epek = 0.91:    If gc_NoCyl.Value <= 4 Then epek = 0.885
            End Select
                                        If gc_NoCyl.Value <= 2 Then epek = 0.86
    End Select
                                        'all single cylinder engines are IR!
                                        If gc_NoCyl.Value = 1 Then epek = 0.85
    
    Rem ***** Curved Runner Effect on Intake Ramming
    crektq = 1: crekhp = 1
    If gc_Curved.Value Then crektq = 0.994: crekhp = 0.904
    
    Rem ** Intake Ramming - calculate cdi for psi function
    'this really needs to include intake manifold flow factor - Pat Hale 02/24/07
    ICFM = gc_MaxInFlow.Value * FlowBenchCorr * (bore / refbore) ^ 0.5
    athroat = niv * (PI / 4) * ivd ^ 2 * (VSW ^ 2 - VSTM)
    If gc_NoInValves.Value = 1 Then
        cdi = (ICFM / athroat) / 133    'single intake valve
    Else
        cdi = (ICFM / athroat) / 137    'multiple intake valves
    End If
    If cdi > 1 Then cdi = 1
    
    Rem ** Intake Pumping - derive CFM/Bore Area at 28" H2O from flowbench data
    ICFM = ICFM * (gc_ManFlow.Value / 100) / BArea
    Rem ** convert to equivalent piston speed - ft/sec
    EqvPS = ICFM * 144 / 60                         '144 / 60 == 2.4
    Rem ** normalize around bore/throat area ratio = 4.2 and 319.2 ft/sec
    Rem ** 319.2 ft/sec from 133 cfm/in^2 = maximum velocity at 28" H2O
    EqvPS = EqvPS / (319.2 / 4.2)                   '319.2 / 4.2 == 76 ft/sec
    
    
    Rem ***** INITIAL VALUES FOR ITERATION VARIABLES
    ilc = 109:      PHI = 1:    icdtq = 0.995:  icdrpm = 1
    metq = 0.818:   mehp = 0.778
    
    lcetq = 1:      PortVETQ = 0.987
    CarbVETQ = 1 - (0.135 * CID * crvf / gc_CarbCFM.Value) ^ 1.25
    zmin = 0.65: If CarbVETQ < zmin Then CarbVETQ = zmin
    
    lcehp = 1:      PortVEHP = 0.98
    CarbVEHP = 1 - (0.17 * CID * crvf / gc_CarbCFM.Value) ^ 1.25
    zmin = 0.65: If CarbVEHP < zmin Then CarbVEHP = zmin
    
    Rem ***** Begin Iteration
    For itr = 1 To 5
        xqs = 1
        ivc = ilc + 1.08 * gc_InCamDur.Value / 2
        If ivc > 180 Then
            ivcr = ivc * PI / 180
            xqs = (1 + 2 * LRQS - Cos(ivcr) - Sqr((2 * LRQS) ^ 2 - Sin(ivcr) ^ 2)) / 2
        End If
        
        
        Rem *************************** Peak TQ and RPM ****************************
        If itr = 1 Then
            acrit = 4.4
        Else
            acrit = 4.2 * (524 / (4.2 * tqfps)) ^ 0.181
        End If
        If gc_NoInValves.Value > 1 Then acrit = acrit / (137 / 133)
        If gc_Fuel.Value = 3 Then acrit = acrit / 1.06
        astar = acrit / (BArea / athroat)
        
        If astar < 1 Then
            psitq = cdi ^ 1.56 * astar ^ 0.44
        Else
            psitq = cdi ^ 1.56 * astar ^ (-3 * 0.44)
        End If
        psitq = psitq - 4.3 * (cdi - astar) ^ 2:    If psitq < 0 Then psitq = 0
    
        RamVETQ = 1 + 0.177 * epek * crektq * psitq ^ 1.52 * niv ^ 0.13
        RamVETQ = RamVETQ * icdtq * camk(gc_CamType.Value, 2) ^ 0.5 * lcetq
        
        VETQ = CarbVETQ * PortVETQ
        EffCR = CalcEffCR(VETQ * RamVETQ)
        EFF = CalcEFF(EffCR)
        
        
        Rem ******* RPM @ Peak TQ from Peak Piston Speed *******
        tqfps = (5683.2 / 60) * S3QB ^ 0.172 * bore ^ 0 * flrqs ^ 0.42
        
        Rem ***** Intake Pumping
        PumpVE = VETQ ^ 0.32 * crvf ^ -2.7 * EqvPS ^ 0.608
        PumpVE = PumpVE * camk(gc_CamType.Value, 1) ^ 0.5
        tqfps = tqfps * PumpVE
        
        Rem ***** Intake Ramming
        RamVE = RamVETQ ^ 0.015 * niv ^ 0.047
        RamVE = RamVE * icdrpm * camk(gc_CamType.Value, 1) ^ 0.5
        tqfps = tqfps * RamVE
        
        Rem ***** Compression, Fuel Burning and Friction
        tqfps = tqfps * EFF ^ -0.22 * efik ^ 0 * metq ^ 0.59
        gc_RPMPeakTQ.Value = FPStoRPM(tqfps)
           
        
        Rem *************** Gross TQ @ Peak TQ *****************
        gtqcid = 0.8827 * B2QS ^ 0.018 * stroke ^ -0.008 * flrqs ^ 0.18
        
        Rem ***** Intake Pumping
        PumpVE = VETQ ^ 0.7 * crvf ^ 1.4 * EqvPS ^ 0.187
        PumpVE = PumpVE * camk(gc_CamType.Value, 2) ^ 0.5
        gtqcid = gtqcid * PumpVE
        
        Rem ***** Intake Ramming
        gtqcid = gtqcid * RamVETQ
        
        Rem ***** Compression and Fuel Burning
        gtqcid = gtqcid * EFF ^ 1.18 * tqcidx * efik
        
        Rem ***** Friction
        ftq = Friction(gc_RPMPeakTQ.Value, VETQ)
        NTQ(1) = gtqcid * CID - ftq:    If NTQ(1) < 0 Then NTQ(1) = 0
       
        Rem ***** dampen metq effect on RPMPeakTQ iteration
        metq = 0.4 * metq + 0.6 * NTQ(1) / (gtqcid * CID)
    
        
        Rem ****************** Net TQ @ Peak TQ ********************
        ntqcid = 0.6966 * B2QS ^ 0.058 * stroke ^ -0.016 * flrqs ^ 0.62
        
        Rem ***** Intake Pumping
        PumpVE = VETQ ^ 1.66 * crvf ^ 1.76 * EqvPS ^ 0.221
        PumpVE = PumpVE * camk(gc_CamType.Value, 3) ^ 0.5
        ntqcid = ntqcid * PumpVE
        
        Rem ***** Intake Ramming
        RamVE = 1 + 0.218 * epek * crektq * psitq ^ 1.22 * niv ^ 0.039
        RamVE = RamVE * icdtq * camk(gc_CamType.Value, 3) ^ 0.5 * lcetq
        ntqcid = ntqcid * RamVE
        
        Rem ***** Compression, Fuel Burning and Friction
        ntqcid = ntqcid * EFF ^ 1.22 * tqcidx * efik * metq ^ 0.075
        NTQ(2) = ntqcid * CID:          If NTQ(2) < 0 Then NTQ(2) = 0
        
        
        Rem ********** Carb Pumping Losses at Peak TQ RPM **********
        tqcfm = VETQ * crvf * (CID / 1728) * gc_RPMPeakTQ.Value / 2  'Pat Hale - missing RamVETQ
        CarbVETQ = 1 - clk * (Gulp * tqcfm) ^ 2
        zmin = 0.65: If CarbVETQ < zmin Then CarbVETQ = zmin
        
        Rem ***** Port Pumping Losses at Peak TQ RPM
        PortVETQ = HeadLoss(tqfps)
        
        Rem ***** Large Carb Effect on Intake Ramming
        lcetq = 1
        If CarbVETQ > cvextq Then lcetq = ((1 - CarbVETQ) / (1 - cvextq)) ^ 0.3
        
        
        Rem *************************** Peak HP and RPM ****************************
        If itr = 1 Then
            acrit = 4.4
        Else
            acrit = 4.2 * (622 / (4.2 * hpfps)) ^ 0.152
        End If
        If gc_NoInValves.Value > 1 Then acrit = acrit / (137 / 133)
        If gc_Fuel.Value = 3 Then acrit = acrit / 1.06
        astar = acrit / (BArea / athroat)
        
        If astar < 1 Then
            psihp = cdi ^ 1.52 * astar ^ 0.48
        Else
            psihp = cdi ^ 1.52 * astar ^ (-3 * 0.48)
        End If
        psihp = psihp - 1.5 * (cdi - astar) ^ 2:    If psihp < 0 Then psihp = 0
    
        RamVEHP = 1 + 0.202 * epek * crekhp * psihp ^ 1.9 * niv ^ 0.145
        RamVEHP = RamVEHP * icdtq * camk(gc_CamType.Value, 5) ^ 0.5 * lcehp
        
        VEHP = CarbVEHP * PortVEHP
        EffCR = CalcEffCR(VEHP * RamVEHP)
        EFF = CalcEFF(EffCR)
    
        
        Rem ******* RPM @ Peak HP from Peak Piston Speed *******
        hpfps = (6896.4 / 60) * S3QB ^ 0.198 * bore ^ 0 * flrqs ^ 1.25
        
        Rem ***** Intake Pumping
        PumpVE = VEHP ^ 0.14 * crvf ^ -1.2 * EqvPS ^ 0.604
        PumpVE = PumpVE * camk(gc_CamType.Value, 4) ^ 0.5
        hpfps = hpfps * PumpVE
        
        Rem ***** Intake Ramming
        RamVE = RamVEHP ^ -0.035 * niv ^ 0.049
        RamVE = RamVE * icdrpm * camk(gc_CamType.Value, 4) ^ 0.5
        hpfps = hpfps * RamVE
        
        Rem ***** Compression, Fuel Burning and Friction
        hpfps = hpfps * EFF ^ 0.07 * efik ^ 0 * mehp ^ 0.49
        gc_RPMPeakHP.Value = FPStoRPM(hpfps)
       
        
        Rem *************** Gross TQ @ Peak HP *****************
        gtqhp = 0.6261 * B2QS ^ 0.022 * stroke ^ 0.032 * flrqs ^ -0.48
        
        Rem ***** Intake Pumping
        PumpVE = VEHP ^ -0.02 * crvf ^ 0.36 * EqvPS ^ 0.184
        PumpVE = PumpVE * camk(gc_CamType.Value, 5) ^ 0.5
        gtqhp = gtqhp * PumpVE
        
        Rem ***** Intake Ramming
        gtqhp = gtqhp * RamVEHP
        
        Rem ***** Compression and Fuel Burning
        gtqhp = gtqhp * EFF ^ 0.76 * tqcidx * efik
        
        Rem ***** Friction
        ftq = Friction(gc_RPMPeakHP.Value, VEHP)
        NHP(1) = (gtqhp * CID - ftq) * gc_RPMPeakHP.Value / Z6: If NHP(1) < 0 Then NHP(1) = 0
        
        Rem ***** dampen mehp effect on RPMPeakHP iteration
        mehp = 0.4 * mehp + 0.6 * NHP(1) / (gtqhp * CID * gc_RPMPeakHP.Value / Z6)
        
        
        Rem **************** Net TQ @ Peak HP ******************
        ntqhp = 0.4506 * B2QS ^ 0.111 * stroke ^ 0.037 * flrqs ^ 0.16
        
        Rem ***** Intake Pumping
        PumpVE = VEHP ^ 0.88 * crvf ^ 0.72 * EqvPS ^ 0.19
        PumpVE = PumpVE * camk(gc_CamType.Value, 6) ^ 0.5
        ntqhp = ntqhp * PumpVE
        
        Rem ***** Intake Ramming
        RamVE = 1 + 0.243 * epek * crekhp * psihp ^ 1.7 * niv ^ 0.082
        RamVE = RamVE * icdtq * camk(gc_CamType.Value, 6) ^ 0.5 * lcehp
        ntqhp = ntqhp * RamVE
        
        Rem ***** Compression, Fuel Burning and Friction
        ntqhp = ntqhp * EFF ^ 0.86 * tqcidx * efik * mehp ^ 0.065
        NHP(2) = ntqhp * CID * gc_RPMPeakHP.Value / Z6: If NHP(2) < 0 Then NHP(2) = 0
        
        
        Rem ********** Carb Pumping Losses at Peak HP RPM **********
        hpcfm = VEHP * crvf * (CID / 1728) * gc_RPMPeakHP.Value / 2  'Pat Hale - missing RamVEHP
        CarbVEHP = 1 - clk * (Gulp * hpcfm) ^ 2
        zmin = 0.65: If CarbVEHP < zmin Then CarbVEHP = zmin
        
        Rem ***** Port Pumping Losses at Peak HP RPM
        PortVEHP = HeadLoss(hpfps)
    
        Rem ***** Large Carb Effect on Intake Ramming
        lcehp = 1
        If CarbVEHP > cvexhp Then lcehp = ((1 - CarbVEHP) / (1 - cvexhp)) ^ 0.3
        
        
        Rem ********************* Off-design Camshaft Modelling ********************
        optcam = 148.1 + 3.8 * gc_CR.Value + 12 / (gc_RPMPeakTQ.Value * stroke / KRPM)
        optcam = optcam + 0.007 * gc_RPMPeakTQ.Value ^ 0.77 * bore ^ 0.27 * stroke ^ 1.47
        
        If niv > 1 Then optcam = optcam - 18.9
        
        zmin = 200: If optcam < zmin Then optcam = zmin
        zmax = 330: If optcam > zmax Then optcam = zmax

        PHI = gc_InCamDur.Value / optcam
        icdrpm = 1:         icdtq = 1
        
        If PHI < 0.99 Then
            phi1 = PHI + 0.01:       icdrpm = phi1 ^ 0.85
            icdtq = phi1 ^ 0.15     'ICDHP exp = 1.00
        ElseIf PHI > 1.01 Then
            phi1 = PHI - 0.01:       icdrpm = phi1 ^ 0.35
            icdtq = phi1 ^ -0.9     'ICDHP exp = -0.55
        End If
        
        Rem ***** Recommended Lobe Seperation Angle
        lsa = 100 + 1.2 * gc_RPMPeakHP.Value / 1000
        lsa = lsa * (gc_InCamDur.Value / 270) ^ 0.5 + (1.8 / LRQS) ^ 4 - 1
        zmin = 102: If lsa < zmin Then lsa = zmin
        zmax = 116: If lsa > zmax Then lsa = zmax
    
        Rem ***** Recommended Intake Lobe Centerline
        ilc = lsa - (1 - EffCR / crx) * 15
        zmin = 100: If ilc < zmin Then ilc = zmin
        zmax = 118: If ilc > zmax Then ilc = zmax
    Next
    
    gc_LobeSepAng.Value = RoundUp(lsa, 1)
    gc_InLobeCL.Value = Round(ilc, 1)
    
    Rem ************** Calculate Summary Values ****************
    gc_TQ.Value = (NTQ(1) + NTQ(2)) / 2:    gc_TQperCID.Value = gc_TQ.Value / CID
    gc_HP.Value = (NHP(1) + NHP(2)) / 2:    gc_HPperCID.Value = gc_HP.Value / CID

    Rem ***** is Peak TQ value properly related to TQ @ Peak HP?
    ntqhp = gc_HP.Value * Z6 / gc_RPMPeakHP.Value
    xrpm = gc_RPMPeakTQ.Value / gc_RPMPeakHP.Value
    tqmin = ntqhp * (1 + 0.31 * ((1 / xrpm) - 1))
    If gc_TQ.Value < tqmin Then gc_TQ.Value = tqmin
    
    gc_TQperCID.Value = gc_TQ.Value / CID
    
    With gc_Redline
        .Value = 1.24 * KRPM / (flrqs * stroke * Sqr(BQS))
        If .Value > 1.25 * gc_RPMPeakHP.Value Then
            .Value = 1.25 * gc_RPMPeakHP.Value
        ElseIf .Value < gc_RPMPeakHP.Value Then
            .Value = gc_RPMPeakHP.Value
        End If
    End With
    
    With gc_Shift
        .Value = 1.08 * gc_RPMPeakHP.Value
        If .Value > gc_Redline.Value Then .Value = gc_Redline.Value
    End With

    gc_RPMPeakTQ.Value = Round(gc_RPMPeakTQ.Value, 50)
    gc_RPMPeakHP.Value = Round(gc_RPMPeakHP.Value, 50)
    gc_Shift.Value = Round(gc_Shift.Value, 50)
    gc_Redline.Value = Round(gc_Redline.Value, 50)
    
    #If ISENGINEPRO Then
        Rem ***** Cranking Compression Pressure
        CCP = (xqs * (gc_CR.Value - 1) + 1) ^ 1.25      'gam = 1.25
        CCP = 0.95 * 14.5 * (CCP - 1)    'leakage, ambient pressure
        CCP = RoundDown(CCP, 5)
    #End If
End Sub

Public Sub LoadCAMK()
Dim i As Integer
Dim j As Integer
'cam types: overhead, roller, mushroom, high rate, solid, hydraulic roller, hydraulic
'correlation: RPMTQ, GTQCID, NTQCID, RPMHP, GTQHP, NTQHP
    camk(0, 1) = 1.028:  camk(0, 2) = 1.037:  camk(0, 3) = 1.019
    camk(0, 4) = 1.075:  camk(0, 5) = 1.043:  camk(0, 6) = 1.019
  
    camk(1, 1) = 1:      camk(1, 2) = 1:      camk(1, 3) = 1
    camk(1, 4) = 1:      camk(1, 5) = 1:      camk(1, 6) = 1
  
    camk(2, 1) = 0.996:  camk(2, 2) = 0.992:  camk(2, 3) = 0.995
    camk(2, 4) = 0.999:  camk(2, 5) = 0.975:  camk(2, 6) = 0.972
  
    camk(3, 1) = 0.995:  camk(3, 2) = 0.99:   camk(3, 3) = 0.993
    camk(3, 4) = 0.998:  camk(3, 5) = 0.969:  camk(3, 6) = 0.965
  
    camk(4, 1) = 0.992:  camk(4, 2) = 0.985:  camk(4, 3) = 0.99
    camk(4, 4) = 0.998:  camk(4, 5) = 0.951:  camk(4, 6) = 0.946
  
    camk(5, 1) = 0.948:  camk(5, 2) = 0.951:  camk(5, 3) = 0.966
    camk(5, 4) = 0.978:  camk(5, 5) = 0.927:  camk(5, 6) = 0.937
  
    camk(6, 1) = 0.92:   camk(6, 2) = 0.934:  camk(6, 3) = 0.93
    camk(6, 4) = 0.956:  camk(6, 5) = 0.905:  camk(6, 6) = 0.93
End Sub

Private Function CalcEffCR(vef As Single) As Single
Dim zmin As Single
Dim zmax As Single
    CalcEffCR = vef * (xqs * (gc_CR.Value - 1) + 1)
    zmin = 2:   If CalcEffCR < zmin Then CalcEffCR = zmin
    zmax = crx: If CalcEffCR > zmax Then CalcEffCR = zmax
End Function

Private Function CalcEFF(EffCR As Single) As Single
    CalcEFF = 1 - EffCR ^ -(GAM - 1)
    If CalcEFF <= 0 Then CalcEFF = 0.01
End Function

Private Function RPMtoFPS(RPM As Single) As Single
    RPMtoFPS = (RPM / 60) * (PI * flrqs * stroke / 12)
End Function

Private Function FPStoRPM(fps As Single) As Single
    FPStoRPM = (fps * 60) / (PI * flrqs * stroke / 12)
End Function

Private Function HeadLoss(fps As Single) As Single
    'assumes a loss coefficient = 2.0
    HeadLoss = 1 - 2 * (RHOair * fps ^ 2 / (2 * GC * 144)) / PSIA
End Function

Private Function CalcGulp() As Single
Dim Gulp As Single
    Select Case gc_Manifold.Value
        Case 1                              'common plenum manifold
            Select Case gc_NoCyl.Value
                Case 1:     Gulp = 2.5
                Case 2:     Gulp = 1.721
                Case 3:     Gulp = 1.384
                Case 4:     Gulp = 1.186
                Case 5:     Gulp = 1.052
                Case 6:     Gulp = 1.009
                Case Else:  Gulp = 1        'Gulp VALue for 7-12 cyl engines
            End Select
        
        Case 2:             Gulp = 2.5      'adjustment for IR manifold
        
        Case 3                              'adjustment for divided plenum
            Select Case gc_NoCyl.Value
                Case 1:     Gulp = 2.5
                Case 2:     Gulp = 2.5
                Case 3:     Gulp = 2.008
                Case 4:     Gulp = 1.721
                Case 5:     Gulp = 1.526
                Case 6:     Gulp = 1.384
                Case 7:     Gulp = 1.274
                Case 8:     Gulp = 1.186
                Case 9:     Gulp = 1.113
                Case 10:    Gulp = 1.052
                Case 11:    Gulp = 1.028
                Case Else:  Gulp = 1.009
            End Select
        
        Case 4                              'adjustment for dual plane w/small slot
            Select Case gc_NoCyl.Value
                Case 1:     Gulp = 2.5
                Case 2:     Gulp = 2.008
                Case 3:     Gulp = 1.721
                Case 4:     Gulp = 1.526
                Case 5:     Gulp = 1.384
                Case 6:     Gulp = 1.274
                Case 7:     Gulp = 1.186
                Case 8:     Gulp = 1.113
                Case 9:     Gulp = 1.052
                Case 10:    Gulp = 1.028
                Case Else:  Gulp = 1.009
            End Select
    End Select
    
    CalcGulp = Gulp
End Function

Private Function Friction(RPM As Single, vef As Single) As Single
Dim fcid As Single
Dim icid As Single
Dim nrb As Integer
Dim nmb As Integer
Dim ptq As Single
Dim rtq As Single
    Rem ***** friction torque that does not vary with RPM *****
    
    Rem ***** compute effective CID friction torque for model
    fcid = 0.268 * gc_NoCyl.Value ^ 0.96 * bore ^ 1.6 * stroke
    fcid = fcid * (EffCR / crx) ^ 0.5    'compression ratio effect
    
    Rem ***** inline engine friction model - 01/07/00
    Rem ***** correlation increases fcid by 8% for 4I vs 4V
    icid = 0
    If gc_Inline.Value = 0 And gc_NoCyl.Value > 1 Then
        nrb = gc_NoCyl.Value
        nmb = 1 + gc_NoCyl.Value / 2
        icid = 0.08 * ((4 + 5) / (4 + 3)) * ((nrb + nmb)) / (nrb + nrb + 1)
    End If
    fcid = fcid * (1 + icid)
    
    Rem ***** overhead cam friction model - 02/17/00
    If gc_CamType.Value = 0 Then fcid = 0.95 * fcid
    
    Rem ***** number of valves friction model - 01/19/00
    fcid = fcid * gc_NoInValves.Value ^ 0.1
    
    Rem ***** pumping torque (assumed to only vary with VE%)
    ptq = CID * (1.01 - vef) * PSIA / 12
    
    
    Rem ***** friction torque that varies with RPM *****
    rtq = 1.07 * fcid * (RPM * stroke ^ 0.8 / KRPM) ^ 1.6
    
    Rem ***** and finally, sum all the friction torques *****
    Friction = fcid + ptq + rtq
End Function

Public Sub CalcKCDGH()
    BArea = PI * bore ^ 2 / 4
    cylCID = BArea * stroke
    CID = cylCID * gc_NoCyl.Value
    Dcid = BArea * gc_Deck.Value
    Gcid = BArea * gc_Gasket.Value
    Hcid = gc_Chamber.Value / ZM3
End Sub

Public Sub CalcVelStd()
Dim vel As Single
' ***** format for using isothermal equation 1-6 Crane: pg 1-8
'   vel = (PSTD ^ 2 - (PSTD - gc_DeltaP.Value) ^ 2) / (PSTD ^ 2 - (PSTD - 28) ^ 2)
'   'constant results in VSTD = 315.0047 (131.25 cfm/in^2) @ 28" H2O
'   VSTD = 329 * Sqr(vel) * YFactor
'   'this is wrong in multiplication of YFactor.  should be divide like below.

' ***** format for using Darcy formula 1-11 Crane: pg 1-9
    vel = Sqr((gc_DeltaP.Value / PSTD) * 144 * PSIA * 2 * GC / RHOair)
    If gc_NoInValves.Value = 1 Then
        'constant results in VSTD = 319.2 (133 cfm/in^2) @ 28" H2O
        'VSTD = 0.910944 * vel * YFactor    '04/30/03
        VSTD = 0.910944 * vel / YFactor
    Else
        'constant results in VSTD = 328.8 (137 cfm/in^2) @ 28" H2O
        'VSTD = 0.938341 * vel * YFactor    '04/30/03
        VSTD = 0.938341 * vel / YFactor
    End If
    
    SetFlowVel
    SetFlowFlux
    SetMaxInFlow
End Sub

Private Function YFactor()
    '.618 Y factor slope coefficient from Crane: pg A-22 for K = 2 line
    '1.044429 results in YFactor == 1 @ 28" H2O
    YFactor = 1.044429 * (1 - 0.618 * gc_DeltaP.Value / PSTD)
End Function

Public Function FlowBenchCorr()
    FlowBenchCorr = Sqr(28 / gc_DeltaP.Value) * YFactor
End Function

#If ISENGINEPRO Then
Public Sub CalcRecommendations()
Dim vd As Single
Dim tbd As Single
Dim tbds As Single
Dim area As Single
Dim area1 As Single
Dim carea As Single
Dim expd As Single
Dim pca As Single
Dim nev As Integer
Dim wave As Integer
Dim avgica As Single
Dim zsin As Single
Dim zitv As Single
Dim zy As Single
Dim pxs As Single
Dim vxs As Single
Dim dt As Single
Dim da As Single
Dim dur As Single
Dim dur1 As Single
Dim dur2 As Single
Dim spd1 As Single
Dim ritl1 As Single
Dim ritl2 As Single
Dim InAdvDur As Single
Dim ExAdvDur As Single
Dim RPM As Single
Dim zmin As Single
Dim zmax As Single
Dim degr As Single
Dim ang As Single
Dim spd As Single
Dim lrqs2 As Single
Dim bin As Single
Dim npipes As Single
Dim ExLobeCL As Single
Dim zvsw As Single
Dim nrev As Integer
Dim fpsk As Single

    Rem ***** convert intake valve and throttle bore diameters to inch
    vd = gc_ValveDia.Value:     If Not gc_ValveDia.Inches Then vd = vd / ZM
    tbd = gc_TBDia.Value:       If Not gc_TBDia.Inches Then tbd = tbd / ZM
    tbds = gc_TBDiaS.Value:     If Not gc_TBDiaS.Inches Then tbds = tbds / ZM
    
    
    Rem ***** Adv Intake Cam Duration *****
    InAdvDur = 1.08 * gc_InCamDur.Value + 10
        
        
    Rem ***** .050" and Adv Exhaust Cam Durations *****
    With gc_ExCamDur
        .Value = gc_InCamDur.Value * (flrqs / 1.038)
        'intake runner pressure effect during overlap
        .Value = .Value + epek ^ 6 * 12
    End With
    ExAdvDur = 1.08 * gc_ExCamDur.Value + 10
    ExLobeCL = 2 * gc_LobeSepAng.Value - gc_InLobeCL.Value
    
    
    Rem ***** Speed of Sound calculation for Intake Recommendations *****
    If gc_Fuel.Value = 3 Then
        degr = 0 + 459.67   'methanol - Pat Hale should be warmer
    Else
        degr = 30 + 459.67  'all gasoline - Pat Hale should be warmer
    End If
    spd = Sqr(1.4 * GC * RSTD * degr)
    
    
    Rem ***** Intake Valve Maximum Lift *****
    Select Case gc_CamType.Value
        Case 0:     bin = 0.38
        Case 1:     bin = 0.38
        Case 2:     bin = 0.33
        Case 3:     bin = 0.31
        Case 4:     bin = 0.31
        Case 5:     bin = 0.29
        Case Else:  bin = 0.26
    End Select
    
    With gc_InMaxValveLift
        .Value = bin * vd * (hpfps / 130) ^ 0.5     'piston speed effect
        
        zmin = 0.24 * vd:   zmax = 0.41 * vd
        If .Value < zmin Then .Value = zmin
        If .Value > zmax Then .Value = zmax
    End With
    
    
    Rem ***** Minimum Intake Cross-section Area *****
    With gc_InMinFlowArea
        'bare minimum based on benchmark flow flux of 133 cfm/in^2 @ 28" H2O
        If gc_NoInValves.Value = 1 Then
            .Value = gc_MaxInFlow.Value * FlowBenchCorr / 133
        Else
            'multiple intake valves based on 137 cfm/in^2 @ 28" H2O
            .Value = gc_MaxInFlow.Value * FlowBenchCorr / 137
        End If
        
        'raise minimum throat area based on various geometric considerations
        zmin = 0.18 * BArea                                 '18% of bore area rule
        If zmin < cylCID / 17.4 Then zmin = cylCID / 17.4   '17.4 cid/in^2 rule
               
        '625 fps max throat velocity rule at Peak HP (intake pumping)
        'fpsk = 0.57618886 * spd     'from Mach number at 30 degF = 625 ft/sec
        'using fpsk below will change methanol answers
        If BArea * hpfps / zmin > 625 Then zmin = BArea * hpfps / 625
        
        '352 fps avg throat velocity at Peak TQ (gasoline - intake pumping)
        fpsk = 0.3245096 * spd     'from Mach number at 30 degF = 352 ft/sec
        If gc_Fuel.Value = 3 Then fpsk = fpsk / 1.06    'methanol = 332 ft/sec
        'Pat Hale - fixing the above method below will change methanol answers
        zy = (2.4 * tqcfm / gc_NoCyl.Value) / (fpsk / 4)
        'note: the factor 4 is used above since intake pumping only lasts for 90 degrees
        If zmin < zy Then zmin = zy
        If .Value < zmin Then .Value = zmin
        
        'acrit maximum area ratio rule (intake ramming @ peak HP RPM)
        zmax = BArea / acrit:   If .Value > zmax Then .Value = zmax
        
        zvsw = 0.94                         '94% throat area rule
        zmax = gc_NoInValves.Value * (PI * vd ^ 2 / 4) * (zvsw ^ 2 - 0.02)
        If .Value > zmax Then .Value = zmax
    End With
    
    
    Rem ***** Intake Track Tuned Length *****
    wave = 2                                        'suction wave created at MPS
    RPM = 0.75 * gc_RPMPeakTQ.Value + 0.25 * gc_RPMPeakHP.Value
    
    lrqs2 = 2 * LRQS                                'convert rod ratio
    ang = AngMPS * PI / 180:    zsin = Sin(ang)
    zy = Sqr(1 - (zsin / lrqs2) ^ 2)
    pxs = (stroke / 2) * (1 + lrqs2 - Cos(ang) - Sqr(lrqs2 ^ 2 - zsin ^ 2))
    vxs = (RPM * PI * stroke / 12) * (zsin + (Sin(2 * ang) / (2 * lrqs2)) / zy)
    dt = ((pxs + 0.1 * vd) / 12) / (spd - vxs / 60) 'lag time to traverse cyl
    da = (dt / 60) * RPM * 360                      'corresponding lag angle
    dur1 = gc_InLobeCL.Value + (InAdvDur / 2) - (AngMPS + da)   'advertised dur to IVC
    spd1 = spd - 0.95 * (vxs / 60) / (gc_CSArea.Value / BArea)
    zmin = spd - 0.6 * spd
    If spd1 < zmin Then spd1 = zmin
    ritl1 = 12 * (dur1 / 360) / (RPM / 60) / (1 / spd1 + 3 / spd)
   
    wave = 4                                    'closing wave created at IVC
    RPM = gc_Shift.Value
    dur2 = 720 - InAdvDur                       'adv dur from IVC to IVO
    ritl2 = (dur2 / 360) * 60 * spd * 12 / (2 * wave * RPM)
   
    With gc_InTrackLen
        .Value = 0.6 * ritl1 + 0.4 * ritl2       'weight both values
        If .Value < ritl1 Then .Value = ritl1    'RITL1 is always minimum length
    End With
    
    
    Rem ***** Intake Track Volume *****
    With gc_InTrackVol
        .Value = 1.2 * cylCID * flrqs * (PI * dur1 / 720) ^ 2   'advertised dur to IVC
        
        'make sure there is at least some taper in the runner
        zmin = 1.1 * gc_InTrackLen.Value * gc_InMinFlowArea.Value
        If .Value < zmin Then .Value = zmin
    End With

    
    Rem ***** Maximum Intake Cross-section Area (at entry) *****
    With gc_InMaxFlowArea
        avgica = gc_InTrackVol.Value / gc_InTrackLen.Value
        .Value = avgica + 2.6 * (avgica - gc_InMinFlowArea.Value)
    
        '390 fps max inlet velocity rule at Peak HP (intake pumping)
        fpsk = 0.3595419 * spd    'from Mach number at 30 degF = 390 ft/sec
        'using fpsk below will change methanol answers
        If BArea * hpfps / .Value > 390 Then .Value = BArea * hpfps / 390
    
        If gc_Manifold.Value = 2 And (tbd > 0 Or tbds > 0) Then 'IR design
            .Value = PI * (tbd ^ 2 + tbds ^ 2) / 4
            If .Value < gc_InMinFlowArea.Value Then .Value = gc_InMinFlowArea.Value
        
            zmax = gc_InMinFlowArea.Value * (1 + 0.05) ^ (gc_InTrackLen.Value - vd / 3)
            If .Value > zmax Then .Value = zmax   '5% da%/dl rule
        
            'now check previous intake track volume (area ruling)
            zitv = gc_InTrackLen.Value * (gc_InMinFlowArea.Value + .Value) / 2
        
            zmin = 0.9 * zitv:      zmax = 1.1 * zitv
            If gc_InTrackVol.Value < zmin Then gc_InTrackVol.Value = zmin
            If gc_InTrackVol.Value > zmax Then gc_InTrackVol.Value = zmax
        End If
    End With
   
    
    Rem ***** Plenum Volume *****
    npipes = gc_NoCyl.Value
    If gc_Manifold.Value >= 3 Then   'divided plenum
        npipes = Int(gc_NoCyl.Value / 2)
        If npipes = 0 Then npipes = 1
    End If
    
    nrev = npipes / 2   'tune at required per rev based on npipes
    'NHRA V8 Pro Stock engines are tuned at 2/rev (not 4/rev = npipes / 2)
    If gc_NoCyl.Value >= 8 Then nrev = npipes / 4
    'If gc_NoCyl.Value >= 4 Then nrev = npipes / 4
    'Pat Hale - this better matches V6 and modern 4 cylinder.  thus always tune at 2/rev
    If nrev = 0 Then nrev = 1
    
    With gc_PlenVol
        .Value = gc_InTrackVol.Value + gc_NoCyl.Value * CID * (79 / (nrev * gc_RPMPeakTQ.Value / 60)) ^ 2
        zmin = cylCID:    zmax = CID    'Pat Hale - raise zmin to be some mulitple (NPipes?) of cylCID
        If .Value < zmin Then .Value = zmin
        If .Value > zmax Then .Value = zmax
    End With
    
    
    Rem ***** Speed of Sound calculation for Exhaust Recommendations *****
    If gc_Fuel.Value = 3 Then
        degr = 1100 + 459.67  'methanol - Pat Hale should be 1000 deg F
    Else
        degr = 1250 + 459.67  'all gasoline
    End If
    spd = Sqr(GAM * GC * RSTD * degr)
    
    
    Rem ***** Exhaust Port Flow *****
    With gc_ExRecFlow
        'port flow based on Peak HP total engine airflow
        .Value = (RamVEHP * hpcfm / gc_NoCyl.Value) / FlowBenchCorr / 725
        dur = ExLobeCL + ExAdvDur / 2         'TDC - EVO @ adv dur
        .Value = .Value * gc_RPMPeakHP.Value ^ 0.8 * (270 / dur) ^ 0.8
        .Value = .Value / (EffCR / crx) ^ 0.5 / (flrqs / 1.038)
        
        'observe min/max exhaust to intake flow ratio
        zmin = 0.64 * gc_MaxInFlow.Value:   zmax = 0.86 * gc_MaxInFlow.Value
        If .Value < zmin Then .Value = zmin
        If .Value > zmax Then .Value = zmax
    End With
    
    
    Rem ***** Exhaust Minimum Cross-section Area *****
    With gc_ExMinFlowArea
        'bare minimum based on benchmark flow flux of 195 cfm/in^2 @ 28" H2O
        If gc_NoInValves.Value = 1 Then
            .Value = gc_ExRecFlow.Value * FlowBenchCorr / 195
        Else
            'multiple exhaust valves based on 180 cfm/in^2 @ 28" H2O
            .Value = gc_ExRecFlow.Value * FlowBenchCorr / 180
        End If
        
        'raise minimum throat area based on various geometric considerations
        zmin = 0.11 * BArea                     '11% of bore area rule
        
        '1450 fps max throat velocity rule
        'fpsk = 0.7481824 * spd    'from Mach number at 1250 degF = 1450 ft/sec
        'using fpsk below will change methanol answers
        If BArea * hpfps / zmin > 1450 Then zmin = BArea * hpfps / 1450
        
        zy = 0.46 * gc_InMinFlowArea.Value      '46% of intake CSA rule
        If zmin < zy Then zmin = zy
        If .Value < zmin Then .Value = zmin
            
        
        Rem ***** Exhaust Valve Diameter *****
        If gc_NoInValves.Value = 1 Then
            nev = 1:    zvsw = 0.91:    zmax = 0.48
        Else
            nev = 2:    zvsw = 0.88:    zmax = 0.61
        End If
        If gc_Manifold.Value = 2 Then zvsw = zvsw - 0.02    'IR bias toward low lift flow
        gc_ExValveDia.Value = Sqr((.Value / nev) * 4 / (PI * (zvsw ^ 2 - 0.03)))
        
        'check if there is room for this exhaust valve head area
        zmax = zmax * bore ^ 2 - gc_NoInValves.Value * vd ^ 2
        If zmax > 0 Then
            zmax = Sqr(zmax / nev)
            If gc_ExValveDia.Value > zmax Then
                gc_ExValveDia.Value = zmax
            
                zvsw = 0.925
                If gc_Manifold.Value = 2 Then zvsw = zvsw - 0.02    'IR bias toward low lift flow
                .Value = nev * (PI * gc_ExValveDia.Value ^ 2 / 4) * (zvsw ^ 2 - 0.03)
            
                If .Value < zmin Then
                    .Value = zmin
                    gc_ExValveDia.Value = Sqr((.Value / nev) * 4 / (PI * (zvsw ^ 2 - 0.03)))
                End If
            End If
        End If
    End With
    
    
    Rem ***** Exhaust Valve Max Lift *****
    Select Case gc_CamType.Value
        Case 0:     bin = 0.46
        Case 1:     bin = 0.46
        Case 2:     bin = 0.4
        Case 3:     bin = 0.38
        Case 4:     bin = 0.38
        Case 5:     bin = 0.36
        Case Else:  bin = 0.33
    End Select
    
    With gc_ExMaxValveLift
        .Value = bin * gc_ExValveDia.Value * (hpfps / 130) ^ 0.5   'piston speed effect
        
        zmin = 0.3 * gc_ExValveDia.Value:   zmax = 0.5 * gc_ExValveDia.Value
        If .Value < zmin Then .Value = zmin
        If .Value > zmax Then .Value = zmax
    End With

    
    Rem ***** Exhaust Port Maximum Flow Area *****
    gc_ExMaxFlowArea.Value = 1.45 * gc_ExMinFlowArea.Value
    
    
    Rem ***** Primary Exhaust Pipe Tuned Length *****
    dur = ExLobeCL + ExAdvDur / 2          'TDC - EVO @ adv dur
    wave = 2:   RPM = gc_RPMPeakHP.Value
    With gc_PriTubeLen
        .Value = spd * 12 * (dur / 360) / (2 * wave * RPM / 60)
        .Value = .Value - 2 * gc_ExValveDia.Value
    End With
    
    
    Rem ***** Primary Exhaust Pipe Diameter *****
    '440 fps avg throat velocity rule at Peak HP (exhaust pumping)
    'fpsk = 0.22703464 * spd     'from Mach number at 1250 degF = 440 ft/sec
    'using fpsk below will change methanol answers
    area = (2.4 * RamVEHP * hpcfm / gc_NoCyl.Value) / (440 / 4)
    'note: the factor 4 is used above since exhaust pumping only lasts for 90 degrees
    
    'Helmholtz resonator theory
    area1 = 2 * BArea * stroke / gc_PriTubeLen.Value
    area1 = 0.9 * area1                     'modify for stepped pipe to get 1st area
    area = 0.6 * area + 0.4 * area1         'weight the two areas
    
    '575 fps max throat velocity rule at Peak HP (exhaust pumping)
    'fpsk = 0.296693 * spd     'from Mach number at 1250 degF = 575 ft/sec
    'using fpsk below will change methanol answers
    zmin = BArea * hpfps / 575:     If area < zmin Then area = zmin
    expd = Sqr(4 * area / PI)
    gc_PriTubeDia.Value = expd + 2 * 0.05   '+.050" wall tubing
   
    
    Rem ***** Exhaust Collector Diameter *****
    If gc_NoCyl.Value >= 3 Then
        npipes = gc_NoCyl.Value
        If gc_NoCyl.Value >= 6 Then npipes = Int(gc_NoCyl.Value / 2)
        
        gc_CollectDia.Value = expd * Sqr(7.2 - npipes) + 2 * 0.05
    Else
        gc_CollectDia.Value = 0
    End If
   
    If CID > 10 Then
        Rem ***** Round-off Recommendations for normal engine printout
        gc_InMaxValveLift.Value = Round(gc_InMaxValveLift.Value, 0.02)
        gc_InMinFlowArea.Value = RoundUp(gc_InMinFlowArea.Value, 0.05)
        gc_InTrackLen.Value = RoundUp(gc_InTrackLen.Value, 0.25)
        gc_InMaxFlowArea.Value = RoundUp(gc_InMaxFlowArea.Value, 0.05)
        gc_InTrackVol.Value = RoundUp(ZM3 * gc_InTrackVol.Value, 5)
        gc_PlenVol.Value = Round(gc_PlenVol.Value, 5)
    
        gc_ExCamDur.Value = Round(gc_ExCamDur.Value, 2)
    
        If gc_ValveDia.Inches Then
            gc_ExValveDia.Value = RoundUp(gc_ExValveDia.Value, 0.02)
            gc_ExRecFlow.Value = RoundDown(gc_ExRecFlow.Value, 5)
        Else
            gc_ExValveDia.Inches = False
            gc_ExValveDia.Value = RoundUp(ZM * gc_ExValveDia.Value, 0.5)
            gc_ExRecFlow.Value = RoundDown(gc_ExRecFlow.Value, 2)
        End If
        gc_ExMaxValveLift.Value = Round(gc_ExMaxValveLift.Value, 0.02)
        gc_ExMinFlowArea.Value = RoundUp(gc_ExMinFlowArea.Value, 0.02)
        gc_ExMaxFlowArea.Value = RoundUp(gc_ExMaxFlowArea.Value, 0.02)
    
        gc_PriTubeLen.Value = RoundUp(gc_PriTubeLen.Value, 0.5)
        gc_PriTubeDia.Value = RoundDown(gc_PriTubeDia.Value, 0.125)
        gc_CollectDia.Value = Round(gc_CollectDia.Value, 0.25)
    Else
        Rem ***** Round-off Recommendations for small engine printout
        gc_InMaxValveLift.Value = Round(gc_InMaxValveLift.Value, 0.01)
        gc_InMinFlowArea.Value = RoundUp(gc_InMinFlowArea.Value, 0.01)
        gc_InTrackLen.Value = RoundUp(gc_InTrackLen.Value, 0.25)
        gc_InMaxFlowArea.Value = RoundUp(gc_InMaxFlowArea.Value, 0.01)
        gc_InTrackVol.Value = RoundUp(ZM3 * gc_InTrackVol.Value, 2)
        gc_PlenVol.Value = Round(gc_PlenVol.Value, 2)
    
        gc_ExCamDur.Value = Round(gc_ExCamDur.Value, 2)
    
        If gc_ValveDia.Inches Then
            gc_ExValveDia.Value = RoundUp(gc_ExValveDia.Value, 0.01)
            gc_ExRecFlow.Value = RoundDown(gc_ExRecFlow.Value, 1)
        Else
            gc_ExValveDia.Inches = False
            gc_ExValveDia.Value = RoundUp(ZM * gc_ExValveDia.Value, 0.2)
            gc_ExRecFlow.Value = RoundDown(gc_ExRecFlow.Value, 1)
        End If
        gc_ExMaxValveLift.Value = Round(gc_ExMaxValveLift.Value, 0.01)
        gc_ExMinFlowArea.Value = RoundUp(gc_ExMinFlowArea.Value, 0.01)
        gc_ExMaxFlowArea.Value = RoundUp(gc_ExMaxFlowArea.Value, 0.01)
    
        gc_PriTubeLen.Value = RoundUp(gc_PriTubeLen.Value, 0.5)
        gc_PriTubeDia.Value = RoundDown(gc_PriTubeDia.Value, 0.05)
        gc_CollectDia.Value = Round(gc_CollectDia.Value, 0.1)
    End If
End Sub
#End If

Public Sub CalcCarb()
Dim ZCarb As Single
Dim ZCarbV As Single
Dim ZCarbT As Single
Dim ZCarbS As Single
Dim ZCarbVS As Single
Dim ZCarbTS As Single
    If gc_TBType.Value Then
        ZCarb = gc_NoTB.Value * 51 * gc_TVDia.Value ^ 1.36 * gc_TBDia.Value ^ 1.69
        If Not gc_TVDia.Inches Then ZCarb = ZCarb * (1 / ZM) ^ 1.36
        If Not gc_TBDia.Inches Then ZCarb = ZCarb * (1 / ZM) ^ 1.69
        
        ZCarbV = 123 * gc_NoTB.Value * PI * gc_TVDia.Value ^ 2 / 4
        If Not gc_TVDia.Inches Then ZCarbV = ZCarbV / ZM2
        If ZCarb > ZCarbV Then ZCarb = ZCarbV
        
        ZCarbT = 91 * gc_NoTB.Value * PI * gc_TBDia.Value ^ 2 / 4
        If Not gc_TBDia.Inches Then ZCarbT = ZCarbT / ZM2
        If ZCarb > ZCarbT Then ZCarb = ZCarbT
        
        If gc_NoTBS.Value > 0 Then
            ZCarbS = gc_NoTBS.Value * 51 * gc_TVDiaS.Value ^ 1.36 * gc_TBDiaS.Value ^ 1.69
            If Not gc_TVDiaS.Inches Then ZCarbS = ZCarbS * (1 / ZM) ^ 1.36
            If Not gc_TBDiaS.Inches Then ZCarbS = ZCarbS * (1 / ZM) ^ 1.69
        
            ZCarbVS = 123 * gc_NoTBS.Value * PI * gc_TVDiaS.Value ^ 2 / 4
            If Not gc_TVDiaS.Inches Then ZCarbVS = ZCarbVS / ZM2
            If ZCarbS > ZCarbVS Then ZCarbS = ZCarbVS
        
            ZCarbTS = 91 * gc_NoTBS.Value * PI * gc_TBDiaS.Value ^ 2 / 4
            If Not gc_TBDiaS.Inches Then ZCarbTS = ZCarbTS / ZM2
            If ZCarbS > ZCarbTS Then ZCarbS = ZCarbTS
            ZCarb = ZCarb + ZCarbS
        End If
    Else
        ZCarb = 140 * gc_NoTB.Value * PI * gc_TVDia.Value ^ 2 / 4
        If Not gc_TVDia.Inches Then ZCarb = ZCarb / ZM2
        
        ZCarbT = 125 * gc_NoTB.Value * PI * gc_TBDia.Value ^ 2 / 4
        If Not gc_TBDia.Inches Then ZCarbT = ZCarbT / ZM2
        If ZCarb > ZCarbT Then ZCarb = ZCarbT
        
        If gc_NoTBS.Value > 0 Then
            ZCarbS = 140 * gc_NoTBS.Value * PI * gc_TVDiaS.Value ^ 2 / 4
            If Not gc_TVDiaS.Inches Then ZCarbS = ZCarbS / ZM2
        
            ZCarbTS = 125 * gc_NoTBS.Value * PI * gc_TBDiaS.Value ^ 2 / 4
            If Not gc_TBDiaS.Inches Then ZCarbTS = ZCarbTS / ZM2
            If ZCarbS > ZCarbTS Then ZCarbS = ZCarbTS
            ZCarb = ZCarb + ZCarbS
        End If
    End If
        
    With gc_WSCarbCFM
        .IsCalc = True:
        If .Value > 100 Then
            .Value = Round(ZCarb, 10)
        Else
            .Value = Round(ZCarb, 2)
        End If
    End With
End Sub

Public Sub CalcCompRatio()
Dim denom As Single
    Pcid = gc_Dome.Value / ZM3
    denom = Dcid + Gcid - Pcid + Hcid
        
    With gc_WSCR
        .IsCalc = True: .Value = (cylCID + denom) / denom
    End With
    
    SetWSCRStuff
End Sub

Public Sub CalcDomeVolume(CR As Single)
    Pcid = (cylCID / (1 - CR)) + Dcid + Gcid + Hcid
        
    With gc_Dome
        .IsCalc = True: .Value = Pcid * ZM3
        .IsCalc = True: .Value = val(.Formatted)
    End With
End Sub

Public Sub CalcFlowStuff(FlowVal As Single)
    With gc_FlowFlux
        .IsCalc = True: .Value = FlowVal / gc_CSArea.Value
        .IsCalc = True: .Value = val(.Formatted)
    End With
    
    With gc_FlowVel
        .IsCalc = True: .Value = 2.4 * (FlowVal / gc_CSArea.Value)
        .IsCalc = True: .Value = val(.Formatted)
    End With
    
    With gc_FVIndex
        .IsCalc = True: .Value = 100 * (2.4 * FlowVal / gc_CSArea.Value) / VSTD
        .IsCalc = True: .Value = val(.Formatted)
    End With
End Sub

Public Sub CalcSeatDia()
Dim vsd As Single
    If gc_SeatPer.Value = 0 Then
        EstSeatDia
        CalcSeatPer
        SetVSWidth
        Exit Sub
    End If
    
    If gc_ValveDia.Inches = gc_SeatDia.Inches Then  'vd and vsd are same units
        vsd = gc_ValveDia.Value * gc_SeatPer.Value / 100
    Else
        If gc_ValveDia.Inches Then                  'vd is inch, vsd is mm
            vsd = ZM * gc_ValveDia.Value * gc_SeatPer.Value / 100
        Else                                        'vd is mm, vsd is inch
            vsd = (gc_ValveDia.Value / ZM) * gc_SeatPer.Value / 100
        End If
    End If
    
    With gc_SeatDia
        .IsCalc = True: .Value = vsd
        .IsCalc = True: .Value = val(.Formatted)
    End With
End Sub

Public Sub CalcSeatPer()
Dim vsp As Single
    If gc_SeatDia.Value = 0 Then EstSeatDia
        
    If gc_SeatDia.Inches = gc_ValveDia.Inches Then  'vsd and vd are same units
        vsp = 100 * gc_SeatDia.Value / gc_ValveDia.Value
    Else
        If gc_SeatDia.Inches Then                   'vsd is inch, vd is mm
            vsp = 100 * gc_SeatDia.Value / (gc_ValveDia.Value / ZM)
        Else                                        'vsd is mm, vd is inch
            vsp = 100 * gc_SeatDia.Value / (gc_ValveDia.Value * ZM)
        End If
    End If
        
    With gc_SeatPer
        .IsCalc = True: .Value = vsp
        .IsCalc = True: .Value = val(.Formatted)
    End With
End Sub

Public Sub EstSeatDia()
Dim a3 As Single
Dim vsd As Single
Dim vstmd As Single
Dim work As String
Dim r1 As Single
    vstmd = gc_StemDia.Value: If Not gc_StemDia.Inches Then vstmd = vstmd / ZM
    
    vsd = Sqr(4 * gc_CSArea.Value / gc_NoInValves.Value / PI + vstmd ^ 2)
    
    With gc_SeatDia
        If vsd < .MinVal_In Then
            vsd = .MinVal_In
            a3 = gc_NoInValves.Value * PI * (vsd ^ 2 - vstmd ^ 2) / 4
            r1 = 10 ^ -gc_CSArea.DecimalPlaces
            work = Format(Round(a3, r1), gc_CSArea.ValFmt)
            MsgBox "Something is seriously wrong with the minimum cross-section area of this engine design!  It needs to be larger than " & work & " sq inch.  Use the Minimum Cross-section Area Worksheet to determine to proper value.", 48, "Minimum Cross-section Area Error!"
        
        ElseIf vsd > .MaxVal_In Then
            vsd = .MaxVal_In
            a3 = gc_NoInValves.Value * PI * (vsd ^ 2 - vstmd ^ 2) / 4
            r1 = 10 ^ -gc_CSArea.DecimalPlaces
            work = Format(Round(a3, r1), gc_CSArea.ValFmt)
            MsgBox "Something is seriously wrong with the minimum cross-section area of this engine design!  It needs to be smaller than " & work & " sq inch.  Use the Minimum Cross-section Area Worksheet to determine to proper value.", 48, "Minimum Cross-section Area Error!"
        End If
        
        .IsCalc = True
        If .Inches Then .Value = vsd Else .Value = vsd / ZM
        .IsCalc = True: .Value = val(.Formatted)
    End With
End Sub

Public Sub CalcCSArea()
    CalcWSCSArea gc_ValveLift.Value
    
    gc_CSArea.IsCalc = True
    gc_CSArea.Value = gc_WSCSArea.Value
End Sub

Public Sub CalcWSCSArea(vl As Single)
Dim vd As Single
Dim vsd As Single
Dim vsa As Double
Dim vstmd As Single
Dim sinb As Single
Dim cosb As Single
Dim tanb As Single
Dim w As Single
Dim H As Single
Dim a1 As Single
Dim a2 As Single
Dim a3 As Single
Dim work As Single
    vd = gc_ValveDia.Value:   If Not gc_ValveDia.Inches Then vd = vd / ZM
    vsd = gc_SeatDia.Value:   If Not gc_SeatDia.Inches Then vsd = vsd / ZM
    vstmd = gc_StemDia.Value: If Not gc_StemDia.Inches Then vstmd = vstmd / ZM
        
    'calculate trig functions for valve seat angle
    vsa = gc_VSAngle.Value * PI / 180
    sinb = Sin(vsa):    cosb = Cos(vsa):    tanb = Tan(vsa)
    
    'convert input valve seat width to Heywood definition for calculations
    w = gc_VSWidth.Value * cosb
    
    'very low lift - where valve seat really controls
    a1 = gc_NoInValves.Value * PI * (vl * cosb) * (vd - 2 * w + vl * sinb * cosb)
    
    'valve curtain area - moderate valve lift
    H = Sqr((vl - w * tanb) ^ 2 + w ^ 2)
    If vl = 0 Then H = 0
    a2 = gc_NoInValves.Value * PI * (vd - w) * H
    
    'valve throat area - high valve lift
    a3 = gc_NoInValves.Value * PI * (vsd ^ 2 - vstmd ^ 2) / 4
        
    'now choose the controling flow area
    If vl < w / (sinb * cosb) Then
        work = a1
    Else
        work = a2
        If a3 < work Then work = a3
    End If
    
    With gc_WSCSArea
        .IsCalc = True: .Value = work
        .IsCalc = True: .Value = val(.Formatted)
    End With
End Sub

Public Sub SetVSWidth()
Dim vd As Single
Dim vsd As Single
Dim min As Single
Dim max As Single
    vd = gc_ValveDia.Value:   If Not gc_ValveDia.Inches Then vd = vd / ZM
    vsd = gc_SeatDia.Value:   If Not gc_SeatDia.Inches Then vsd = vsd / ZM
    
    'use cosine for max valve seat angle and reduce to 75%
    max = 0.75 * ((vd - vsd) / 2) / Cos(gc_VSAngle.MaxVal * PI / 180)
    If max <= 0.02 Then max = 0.02
    
    'use cosine for min valve seat angle
    min = 0.01 * vd / Cos(gc_VSAngle.MinVal * PI / 180)
    If min >= max Then min = max - 0.05
    If min < 0 Then min = 0
    
    gc_VSWidth.MaxVal_In = RoundDown(max, 0.01)
    gc_VSWidth.MinVal_In = Round(min, 0.01)
    
    SetMinMax gc_VSWidth
End Sub

Public Sub SetStroke()
Dim Min1_In As Single
Dim Max1_In As Single
    If gc_Rod.Inches Then               'set rod length/stroke ratio limits
        Min1_In = gc_Rod.Value / 4
        Max1_In = gc_Rod.Value / 1.25
    Else
        Min1_In = gc_Rod.Value / ZM / 4
        Max1_In = gc_Rod.Value / ZM / 1.25
    End If
    
    With gc_Stroke
        If gc_Bore.Inches Then          'set bore/stroke ratio limits
            .MinVal_In = gc_Bore.Value / 2.1
            .MaxVal_In = gc_Bore.Value / 0.6
        Else
            .MinVal_In = gc_Bore.Value / ZM / 2.1
            .MaxVal_In = gc_Bore.Value / ZM / 0.6
        End If
        
        'select tightest overall limits
        If Max1_In < .MaxVal_In Then
            If Max1_In > .MinVal_In And Max1_In > Min1_In Then
                .MaxVal_In = Max1_In
            End If
        End If
        If Min1_In > .MinVal_In Then
            If Min1_In < .MaxVal_In And Min1_In < Max1_In Then
                .MinVal_In = Min1_In
            End If
        End If
                
        .MinVal_MM = .MinVal_In * ZM
        .MaxVal_MM = .MaxVal_In * ZM
    End With
    
    SetMinMax gc_Stroke
End Sub

Public Sub SetRod()
'min of 1.25 * stroke, max of 3.6 * stroke or 11.5, whichever is less
Dim s36 As Single
    s36 = gc_Stroke.Value * 3.6
    With gc_Rod
        If gc_Stroke.Inches Then
            .MinVal_In = gc_Stroke.Value * 1.25
            .MaxVal_In = IIf(s36 < 11.5, s36, 11.5)
            .MinVal_MM = .MinVal_In * ZM
            .MaxVal_MM = .MaxVal_In * ZM
        Else
            .MinVal_MM = gc_Stroke.Value * 1.25
            .MaxVal_MM = IIf(s36 < (11.5 * ZM), s36, (11.5 * ZM))
            .MinVal_In = .MinVal_MM / ZM
            .MaxVal_In = .MaxVal_MM / ZM
        End If
    End With
    
    SetMinMax gc_Rod
End Sub

Public Sub SetCarbCFM() '01/16/03
Dim cfd As Single
Dim RPM As Single
Dim Gulp As Single
Dim r1 As Single
    cfd = gc_NoCyl.Value * (PI * bore * bore / 4) * stroke / 1728

    'use 6150 fpm avg piston speed to determine max RPM for carb sizing
    RPM = 6150 / (2 * stroke / 12)
    Gulp = CalcGulp
    
    '1.414 = sqr(20/10), i.e. max size carbs to operate at 10 inch H2O
    '  1.3 = maximum volumetric efficiency
    With gc_CarbCFM
        .MaxVal_In = 1.414 * Gulp * 1.3 * (RPM / 2) * cfd
        If .MaxVal_In <= 1000 Then r1 = 20 Else r1 = 100
        
        .MaxVal_In = RoundUp(.MaxVal_In, r1)
        
        .MinVal_In = 0.05 * .MaxVal_In
        .MinVal_In = RoundUp(.MinVal_In, r1 / 5)
    End With
    
    SetMinMax gc_CarbCFM
End Sub

Public Sub SetMaxInFlow()
Const VSW = 0.925
Const VSTM = 0.022

Dim i As Integer
Dim vd As Single
Dim area As Single
    vd = gc_ValveDia.Value: If Not gc_ValveDia.Inches Then vd = vd / ZM
    
    area = gc_NoInValves.Value * (PI / 4) * vd ^ 2 * (VSW ^ 2 - VSTM)
    gc_MaxInFlow.MinVal_In = RoundDown(area * gc_FlowFlux.MinVal_In, 1)
    gc_MaxInFlow.MaxVal_In = RoundUp(area * gc_FlowFlux.MaxVal_In, 1)
    
    SetMinMax gc_MaxInFlow

    #If ISENGINEPRO Then
        For i = 0 To 9
            gc_IntFlow(i).MinVal_In = 0
            gc_IntFlow(i).MaxVal_In = RoundUp(1.005 * area * gc_FlowFlux.MaxVal_In, 1)
    
            SetMinMax gc_IntFlow(i)
        Next
    #End If
End Sub

Public Sub TestMaxInFlow()
    If gc_MaxInFlow.Value > gc_MaxInFlow.MaxVal Then
        MsgBox "The maximum intake port flow is now too great for a " & gc_ValveDia.Formatted & " intake valve diameter!  The maximum intake port flow will be reduced to the limit value of " & gc_MaxInFlow.MaxVal & " CFM!", 48, "Maximum Intake Port Flow Error!"
        gc_MaxInFlow.Value = gc_MaxInFlow.MaxVal
    End If
End Sub

Public Sub SetNIV()
Dim MsgTxt As String
    With gc_NoInValves
        .MinVal = 1
        Select Case gc_CamType.Value
            Case 0:     .MaxVal = 3 'Overhead Cam
                MsgTxt = " intake valves are"
            Case 1:     .MaxVal = 2 'Roller Cam & Lifter
                MsgTxt = " intake valves are"
            Case Else:  .MaxVal = 1
                MsgTxt = " intake valve is"
        End Select
                
        frmENGINE.txtNoInValves.ToolTipText = "no more than " & .MaxVal & MsgTxt & " allowed for this camshaft type"
    End With
End Sub

Public Sub SetRefBore()
    With gc_RefBore
        If gc_Bore.Inches Then
            .MinVal_In = Round(gc_Bore.Value * 0.95, 0.005)
            .MaxVal_In = Round(gc_Bore.Value * 1.05, 0.005)
            .MinVal_MM = .MinVal_In * ZM
            .MaxVal_MM = .MaxVal_In * ZM
        Else
            .MinVal_MM = gc_Bore.Value * 0.95
            .MaxVal_MM = gc_Bore.Value * 1.05
            .MinVal_In = Round(.MinVal_MM / ZM, 0.005)
            .MaxVal_In = Round(.MaxVal_MM / ZM, 0.005)
        End If
    End With
    
    SetMinMax gc_RefBore
End Sub

Public Sub SetWSCRStuff()
    With gc_Deck
        .MinVal_In = (cylCID + (1 - gc_WSCR.MaxVal_In) * (Gcid - Pcid + Hcid)) / (gc_WSCR.MaxVal_In - 1) / BArea
        .MaxVal_In = (cylCID + (1 - gc_WSCR.MinVal_In) * (Gcid - Pcid + Hcid)) / (gc_WSCR.MinVal_In - 1) / BArea
        If .MinVal_In < -gc_Gasket.Value Then .MinVal_In = -gc_Gasket.Value
        If .MaxVal_In > 0.15 Then .MaxVal_In = 0.15
    End With
    SetMinMax gc_Deck
    
    With gc_Gasket
        .MinVal_In = (cylCID + (1 - gc_WSCR.MaxVal_In) * (Dcid - Pcid + Hcid)) / (gc_WSCR.MaxVal_In - 1) / BArea
        .MaxVal_In = (cylCID + (1 - gc_WSCR.MinVal_In) * (Dcid - Pcid + Hcid)) / (gc_WSCR.MinVal_In - 1) / BArea
        If .MinVal_In < -gc_Deck.Value Then .MinVal_In = -gc_Deck.Value
        If .MinVal_In < 0 Then .MinVal_In = 0
        If .MaxVal_In > 0.15 Then .MaxVal_In = 0.15
    End With
    SetMinMax gc_Gasket
    
    With gc_Dome
        .MinVal_In = -1 * ZM3 * (cylCID + (1 - gc_WSCR.MinVal_In) * (Dcid + Gcid + Hcid)) / (gc_WSCR.MinVal_In - 1)
        .MaxVal_In = -1 * ZM3 * (cylCID + (1 - gc_WSCR.MaxVal_In) * (Dcid + Gcid + Hcid)) / (gc_WSCR.MaxVal_In - 1)
    End With
    SetMinMax gc_Dome
    
    With gc_Chamber
        .MinVal_In = ZM3 * (cylCID + (1 - gc_WSCR.MaxVal_In) * (Dcid + Gcid - Pcid)) / (gc_WSCR.MaxVal_In - 1)
        .MaxVal_In = ZM3 * (cylCID + (1 - gc_WSCR.MinVal_In) * (Dcid + Gcid - Pcid)) / (gc_WSCR.MinVal_In - 1)
        If .MinVal_In < 0 Then .MinVal_In = 0
    End With
    SetMinMax gc_Chamber
End Sub

Public Sub SetTVDia()
    With gc_TVDia
        If gc_TBDia.Inches Then
            .MinVal_In = gc_TBDia.Value / 2
            .MaxVal_In = gc_TBDia.Value
            .MinVal_MM = .MinVal_In * ZM
            .MaxVal_MM = .MaxVal_In * ZM
        Else
            .MinVal_MM = gc_TBDia.Value / 2
            .MaxVal_MM = gc_TBDia.Value
            .MinVal_In = .MinVal_MM / ZM
            .MaxVal_In = .MaxVal_MM / ZM
        End If
    End With
    
    SetMinMax gc_TVDia
End Sub

Public Sub SetTVDiaS()
    With gc_TVDiaS
        If gc_TBDiaS.Inches Then
            .MinVal_In = gc_TBDiaS.Value / 2
            .MaxVal_In = gc_TBDiaS.Value
            .MinVal_MM = .MinVal_In * ZM
            .MaxVal_MM = .MaxVal_In * ZM
        Else
            .MinVal_MM = gc_TBDiaS.Value / 2
            .MaxVal_MM = gc_TBDiaS.Value
            .MinVal_In = .MinVal_MM / ZM
            .MaxVal_In = .MaxVal_MM / ZM
        End If
    End With
    
    SetMinMax gc_TVDiaS
End Sub

Public Sub SetValveDia()
    With gc_ValveDia
        .MinVal_In = Sqr(0.16 * bore ^ 2 / gc_NoInValves.Value)
        
        If gc_NoInValves.Value = 1 Then
            .MaxVal_In = Sqr(0.32 * bore ^ 2 / gc_NoInValves.Value)
        Else
            .MaxVal_In = Sqr(0.36 * bore ^ 2 / gc_NoInValves.Value)
        End If
        
        .MinVal_MM = .MinVal_In * ZM
        .MaxVal_MM = .MaxVal_In * ZM
    End With
    
    SetMinMax gc_ValveDia
End Sub

Public Sub TestValveDia()
    If gc_ValveDia.Value > gc_ValveDia.MaxVal Then
        MsgBox "The intake valve diameter is now too large for the bore diameter!  The intake valve diameter will be reduced to the limit value of " & gc_ValveDia.MaxVal & "!", 48, "Intake Valve Diameter Error!"
        gc_ValveDia.Value = gc_ValveDia.MaxVal
    End If
End Sub

Public Sub SetValveLift()
Dim i As Single
    With gc_ValveLift
        If gc_ValveDia.Inches Then
            .MinVal_In = Round(gc_ValveDia.Value * 0.19, 0.01)
            .MaxVal_In = Round(gc_ValveDia.Value * 0.45, 0.01)
            If gc_CamType.Value = 0 Then .MaxVal_In = Round(gc_ValveDia.Value * 0.5, 0.01)
            
            .MinVal_MM = .MinVal_In * ZM
            .MaxVal_MM = .MaxVal_In * ZM
        Else
            .MinVal_MM = gc_ValveDia.Value * 0.19
            .MaxVal_MM = gc_ValveDia.Value * 0.45
            If gc_CamType.Value = 0 Then .MaxVal_MM = gc_ValveDia.Value * 0.5
            
            .MinVal_In = Round(.MinVal_MM / ZM, 0.01)
            .MaxVal_In = Round(.MaxVal_MM / ZM, 0.01)
        End If
    End With
    
    SetMinMax gc_ValveLift
    
    #If ISENGINEPRO Then
        For i = 0 To 9
            gc_IntLift(i).MinVal_In = 0
            gc_IntLift(i).MaxVal_In = gc_ValveLift.MaxVal_In
    
            SetMinMax gc_IntLift(i)
        Next
    #End If
End Sub

Public Sub SetCSArea()
Const VSW = 0.98
Const VSTM = 0.022
Dim vd As Single
    vd = gc_ValveDia.Value: If Not gc_ValveDia.Inches Then vd = vd / ZM
    
    With gc_CSArea
        .MinVal_In = gc_MaxInFlow.Value / gc_FlowFlux.MaxVal_In
        .MaxVal_In = gc_NoInValves.Value * (PI / 4) * vd ^ 2 * (VSW ^ 2 - VSTM)
        
        If .MaxVal_In < .MinVal_In Then
            .MaxVal_In = gc_NoInValves.Value * (PI / 4) * gc_ValveDia.MaxVal_In ^ 2 * (VSW ^ 2 - VSTM)
            If .MaxVal_In < .MinVal_In Then .MaxVal_In = .MinVal_In
        End If
    End With
    
    SetMinMax gc_CSArea
End Sub

Public Sub SetFlowVel()
    gc_FlowVel.MinVal_In = VSTD * gc_FVIndex.MinVal_In / 100
    gc_FlowVel.MaxVal_In = VSTD * gc_FVIndex.MaxVal_In / 100
    
    SetMinMax gc_FlowVel
End Sub

Public Sub SetFlowFlux()
    gc_FlowFlux.MinVal_In = gc_FlowVel.MinVal_In / 2.4
    gc_FlowFlux.MaxVal_In = gc_FlowVel.MaxVal_In / 2.4
    
    SetMinMax gc_FlowFlux
End Sub

Public Sub SetSeatDia()
    With gc_SeatDia
        If gc_ValveDia.Inches Then
            .MinVal_In = (gc_SeatPer.MinVal_In / 100) * gc_ValveDia.Value
            .MinVal_MM = .MinVal_In * ZM
            .MaxVal_In = (gc_SeatPer.MaxVal_In / 100) * gc_ValveDia.Value
            .MaxVal_MM = .MaxVal_In * ZM
        Else
            .MinVal_MM = (gc_SeatPer.MinVal_In / 100) * gc_ValveDia.Value
            .MinVal_In = .MinVal_MM / ZM
            .MaxVal_MM = (gc_SeatPer.MaxVal_In / 100) * gc_ValveDia.Value
            .MaxVal_In = .MaxVal_MM / ZM
        End If
    End With
    
    SetMinMax gc_SeatDia
End Sub

Public Sub SetStemDia()
    With gc_StemDia
        If gc_ValveDia.Inches Then
            .MaxVal_In = 0.22 * gc_ValveDia.Value
        Else
            .MaxVal_In = 0.22 * gc_ValveDia.Value / ZM
        End If
        
        .MaxVal_MM = .MaxVal_In * ZM
    End With
    
    SetMinMax gc_StemDia
End Sub

Public Sub SetMinMax(p_obj As cValue)
Dim tv As Single
Dim r1 As Single
    With p_obj
        'round min values to stay within calculated limits
        tv = val(Format(.MinVal_In, .ValFmt))
        If tv < .MinVal_In Then
            r1 = 10 ^ -.DecimalPlaces_In
            .MinVal_In = tv + r1
        Else
            .MinVal_In = tv
        End If
            
        'round max values to stay within calculated limits
        tv = val(Format(.MaxVal_In, .ValFmt))
        If tv > .MaxVal_In Then
            r1 = 10 ^ -.DecimalPlaces_In
            .MaxVal_In = tv - r1
        Else
            .MaxVal_In = tv
        End If
        
        'round MM min and max values if needed
        If .AllowMM Then
            tv = val(Format(.MinVal_MM, .ValFmt))
            If tv < .MinVal_MM Then
                r1 = 10 ^ -.DecimalPlaces_MM
                .MinVal_MM = tv + r1
            Else
                .MinVal_MM = tv
            End If
            
            tv = val(Format(.MaxVal_MM, .ValFmt))
            If tv > .MaxVal_MM Then
                r1 = 10 ^ -.DecimalPlaces_MM
                .MaxVal_MM = tv - r1
            Else
                .MaxVal_MM = tv
            End If
        End If
        
        'select limit values
        If .Inches Then
            .MinVal = .MinVal_In
            .MaxVal = .MaxVal_In
        Else
            .MinVal = .MinVal_MM
            .MaxVal = .MaxVal_MM
        End If
    End With
End Sub

Public Sub SetAllValues()
Dim i As Integer
    
    gc_Blank.StatusMsg = ""
    
    With gc_NoCyl
        .HasMinMax = True:  .MinVal = 1:    .MaxVal = 12
        .Msg = "Number of Cylinders"
        .StatusMsg = "The number of cylinders for this engine.  Normal values are between 4 and 8."
    End With
    
    With gc_Inline
        .HasMinMax = True:  .MinVal = 0:    .MaxVal = 2
        .Msg = ""
        .StatusMsg = ""
    End With
    
    With gc_Bore
        .AllowMM = True
        .AllowDecimals = True:  .DecimalPlaces_In = 3:  .DecimalPlaces_MM = 1
        .HasMinMax = True:      .MinVal_In = 1.25:      .MaxVal_In = 6
        .MinVal_MM = .MinVal_In * ZM:       .MaxVal_MM = .MaxVal_In * ZM
        .Inches = True
        .Msg = "Bore Diameter"
        .StatusMsg = "The engine cylinder bore diameter, either in inch or millimeter."
    End With

    With gc_Stroke
        .AllowMM = True
        .AllowDecimals = True:  .DecimalPlaces_In = 3:  .DecimalPlaces_MM = 1
        .HasMinMax = True
        .Inches = True
        .Msg = "Stroke Length"
        .StatusMsg = "The engine crankshaft stroke length, either in inch or millimeter."
    End With
    
    With gc_Rod
        .AllowMM = True
        .AllowDecimals = True:  .DecimalPlaces_In = 3:  .DecimalPlaces_MM = 1
        .HasMinMax = True
        .Inches = True
        .Msg = "Rod Length"
        .StatusMsg = "The engine connecting rod length, either in inch or millimeter."
    End With
    
    With gc_CR
        .AllowDecimals = True:  .DecimalPlaces_In = 1
        .HasMinMax = True:      .MinVal_In = 7: .MaxVal_In = 18
        .Inches = True
        .Msg = "Compression Ratio"
        .StatusMsg = "The engine mechanical compression ratio.  Normal values are between 9 and 14."
    End With
    
    
    With gc_CamType
        .HasMinMax = True:  .MinVal = 0:    .MaxVal = 6
        .Msg = "Camshaft Type"
        .StatusMsg = "The camshaft and lifter type selected from the drop down list."
        .HasList = True
        .List(0) = "              Overhead Cam"
        .List(1) = "           Roller Cam & Lifter"
        .List(2) = "           Mushroom Tappet"
        .List(3) = "  High Rate-of-Lift Flat Tappet"
        .List(4) = "Normal Flat Tappet & Solid Lifter"
        .List(5) = "   Hydraulic Roller Cam & Lifter"
        .List(6) = "  Normal Hydraulic Cam & Lifter"
    End With
    
    With gc_InCamDur
        .HasMinMax = True:  .MinVal = 190:  .MaxVal = 330
        .Msg = "Intake Cam Duration @ .050 inch"
        .StatusMsg = "The intake cam duration at .050 inch valve lift.  Normal values are between 200 and 280."
    End With
    
    With gc_CarbCFM
        .HasMinMax = True
        .Inches = True
        .Msg = "Throttle CFM @ 1.5 inch Hg"
        .StatusMsg = "The total airflow rating of the engine throttles, either for carburetors or electronic/mechanical fuel injection throttle bodies.  Four barrel carburetors are normally rated at 1.5 inch Hg."
    End With
    
    With gc_Fuel
        .HasMinMax = True:  .MinVal = 1:    .MaxVal = 3
        .Msg = "Fuel Type"
        .StatusMsg = "The fuel type selected from the drop down list."
        .HasList = True
        .List(1) = "Gasoline"
        .List(2) = "Racing Gas"
        .List(3) = "Methanol"
    End With
    
    
    With gc_Manifold
        .HasMinMax = True:  .MinVal = 1:    .MaxVal = 4
        .Msg = "Intake Manifold Type"
        .StatusMsg = "The intake manifold type selected from the drop down list.  The most common intake manifold type is the plenum style.  Individual runner manifolds are found on many motorcycle engines."
        .HasList = True
        .List(1) = "  Common Plenum Style"
        .List(2) = "   Individual Runner (IR)"
        .List(3) = "Dual Plane/100% divided"
        .List(4) = "  Dual Plane w/small slot"
    End With
    
    With gc_ManFlow
        .AllowDecimals = True:  .DecimalPlaces_In = 1
        .HasMinMax = True:      .MinVal_In = 80:    .MaxVal_In = 103
        .Inches = True
        .Msg = "Intake Manifold Flow Factor"
        .StatusMsg = "The percent flow factor that the addition of the bare intake manifold affects the bare cylinder head maximum intake port flow on the flowbench.  Normal values are between 90 and 98."
    End With
    
    
    With gc_NoInValves
        .HasMinMax = True
        .Msg = "Number of Intake Valves"
        .StatusMsg = "The number of intake valves per cylinder.  More than 1 intake valve per cylinder is allowed for overhead cam and roller cam && lifter engine designs.  Normal input valves are usually 1 or 2."
    End With
    
    With gc_ValveDia
        .AllowMM = True
        .AllowDecimals = True:  .DecimalPlaces_In = 3:  .DecimalPlaces_MM = 1
        .HasMinMax = True
        .Inches = True
        .Msg = "Intake Valve Diameter"
        .StatusMsg = "Diameter of the intake valve head, either in inch or millimeter."
    End With
    
    With gc_MaxInFlow
        .AllowDecimals = True:  .DecimalPlaces_In = 1
        .HasMinMax = True
        .Inches = True
        .Msg = "Maximum Intake Port Flow"
        .StatusMsg = "The intake port flow at the maximum net valve lift provided by the camshaft and rocker arm system.  This value comes from the flowbench or may be estimated using the worksheet."
    End With
    
    With gc_DeltaP
        .AllowDecimals = True:  .DecimalPlaces_In = 1
        .HasMinMax = True:      .MinVal_In = 10:    .MaxVal_In = 75
        .Inches = True
        .Msg = "Flowbench Test Pressure"
        .StatusMsg = "The test pressure used with the flowbench.  Normal values are between 10 and 28."
    End With

    With gc_RefBore
        .AllowMM = True
        .AllowDecimals = True:  .DecimalPlaces_In = 3:  .DecimalPlaces_MM = 1
        .HasMinMax = True
        .Inches = True
        .Msg = "Flowbench Reference Bore Diameter"
        .StatusMsg = "The cylinder bore diameter used with the flowbench, either in inch or millimeter."
    End With

    
    'compression ratio worksheet
    With gc_Chamber
        .AllowDecimals = True:  .DecimalPlaces_In = 1
        .HasMinMax = True
        .Inches = True
        .Msg = "Combustion Chamber Volume"
        .StatusMsg = "Cylinder head combustion chamber volume.  Normal values are between 64 and 117."
    End With
     
    With gc_Deck
        .AllowNegative = True
        .AllowDecimals = True:  .DecimalPlaces_In = 3
        .HasMinMax = True:      .MinVal_In = -0.05: .MaxVal_In = 0.15
        .Inches = True
        .Msg = "Piston to Deck Height"
        .StatusMsg = "Distance the piston is below the block deck surface, normally between .005 and .020."
    End With

    With gc_Gasket
        .AllowDecimals = True:  .DecimalPlaces_In = 3
        .HasMinMax = True:      .MinVal_In = 0: .MaxVal_In = 0.15
        .Inches = True
        .Msg = "Head Gasket Thickness"
        .StatusMsg = "Compressed thickness of the cylinder head gasket, normally between .018 and .042."
    End With
    
    With gc_Dome
        .AllowNegative = True
        .AllowDecimals = True:  .DecimalPlaces_In = 1
        .HasMinMax = True
        .Inches = True
        .Msg = "Piston Dome Volume"
        .StatusMsg = "Piston dome volume, normally between -10 for dished piston and 25 for large domed piston."
    End With
    
    With gc_WSCR
        .AllowDecimals = True:  .DecimalPlaces_In = 1
        .HasMinMax = True:      .MinVal_In = 5: .MaxVal_In = 25
        .Inches = True
        .Msg = "Calculated Compression Ratio"
    End With
    
    
    'carb flow worksheet
    With gc_NoTB
        .HasMinMax = True:  .MinVal = 1:    .MaxVal = 12
        .Msg = "Number of Throttle Bores"
        .StatusMsg = "Total number of primary throttle bores.  Normal values are between 2 and 8."
    End With

    With gc_TBDia
        .AllowMM = True
        .AllowDecimals = True:  .DecimalPlaces_In = 3:  .DecimalPlaces_MM = 1
        .HasMinMax = True:      .MinVal_In = 0:         .MaxVal_In = 6
        .MinVal_MM = .MinVal_In * ZM:                   .MaxVal_MM = .MaxVal_In * ZM
        .Inches = True
        .Msg = "Throttle Diameter"
        .StatusMsg = "Diameter of the primary throttle bore, either in inch or millimeter."
    End With

    With gc_TVDia
        .AllowMM = True
        .AllowDecimals = True:  .DecimalPlaces_In = 3:  .DecimalPlaces_MM = 1
        .HasMinMax = True
        .Inches = True
        .Msg = "Venturi Diameter"
        .StatusMsg = "Diameter of the primary throttle venturi, either in inch or millimeter."
    End With
    
    With gc_NoTBS
        .HasMinMax = True:  .MinVal = 0:    .MaxVal = 12
        .Msg = "Number of Throttle Bores"
        .StatusMsg = "Total number of secondary throttle bores.  Normal values are between 2 and 8."
    End With

    With gc_TBDiaS
        .AllowMM = True
        .AllowDecimals = True:  .DecimalPlaces_In = 3:  .DecimalPlaces_MM = 1
        .HasMinMax = True:      .MinVal_In = 0:         .MaxVal_In = 6
        .MinVal_MM = .MinVal_In * ZM:                   .MaxVal_MM = .MaxVal_In * ZM
        .Inches = True
        .Msg = "Throttle Diameter"
        .StatusMsg = "Diameter of the secondary throttle bore, either in inch or millimeter."
    End With

    With gc_TVDiaS
        .AllowMM = True
        .AllowDecimals = True:  .DecimalPlaces_In = 3:  .DecimalPlaces_MM = 1
        .HasMinMax = True
        .Inches = True
        .Msg = "Venturi Diameter"
        .StatusMsg = "Diameter of the secondary throttle venturi, either in inch or millimeter."
    End With
    
    
    'max intake port flow worksheet
    With gc_CSArea
        .AllowDecimals = True:  .DecimalPlaces_In = 3
        .HasMinMax = True
        .Inches = True
        .Msg = "Minimum Cross-section Area"
        #If ISENGINEPRO Then
            .StatusMsg = "Calculated cross-section area of the intake port for the input maximum intake valve lift."
        #Else
            .StatusMsg = "Minimum cross-section area of the intake port - at the valve seat throat or elsewhere."
        #End If
    End With

    With gc_FlowVel
        .AllowDecimals = True:  .DecimalPlaces_In = 1
        .HasMinMax = True
        .Inches = True
        .Msg = "Intake Flow Velocity"
        .StatusMsg = "Calculated mean intake port flow velocity."
    End With
    
    With gc_FlowFlux
        .AllowDecimals = True:  .DecimalPlaces_In = 1
        .HasMinMax = True
        .Inches = True
        .Msg = "Intake Flow Flux"
        .StatusMsg = "Calculated intake flow flux - flow per unit area."
    End With

    With gc_FVIndex
        .AllowDecimals = True
        .DecimalPlaces_In = 1
        .HasMinMax = True:  .MinVal_In = 50:    .MaxVal_In = 101
        .Inches = True
        .Msg = "Flow Velocity Index"
        .StatusMsg = "Intake flow velocity expressed as a percentage of the maximum theoretical limit."
    End With
    
    
    'minimum cross-section area worksheet
    With gc_SeatDia
        .AllowMM = True
        .AllowDecimals = True:  .DecimalPlaces_In = 3:  .DecimalPlaces_MM = 1
        .HasMinMax = True
        .Inches = True
        .Msg = "Valve Seat Throat Diameter"
        .StatusMsg = "Valve seat throat diameter, either in inch or millimeter."
    End With

    With gc_SeatPer
        .AllowDecimals = True:  .DecimalPlaces_In = 1
        .HasMinMax = True:      .MinVal_In = 75:    .MaxVal_In = 100
        .Inches = True
        .Msg = "Valve Seat Throat Percentage"
        .StatusMsg = "Ratio of the valve seat throat and head diameters, normally between 86 and 92."
    End With

    With gc_VSAngle
        .AllowDecimals = True
        .DecimalPlaces_In = 1
        .HasMinMax = True:  .MinVal_In = 30:    .MaxVal_In = 60
        .Inches = True
        .Msg = "Valve Seat Angle"
        .StatusMsg = "The valve seat angle, normally 45 degree."
    End With
    
    With gc_VSWidth
        .AllowDecimals = True
        .DecimalPlaces_In = 3
        .HasMinMax = True
        .Inches = True
        .Msg = "Valve Seat Width"
        .StatusMsg = "The valve seat face width, measured along the valve seat angle, usually about .080""."
    End With
    
    With gc_StemDia
        .AllowMM = True
        .MMLimit = 2
        .AllowDecimals = True:  .DecimalPlaces_In = 3:  .DecimalPlaces_MM = 1
        .HasMinMax = True
        .Inches = True
        .Msg = "Valve Stem Diameter"
        .StatusMsg = "Valve stem diameter, either in inch or millimeter."
    End With

    With gc_ValveLift
        .AllowDecimals = True:  .DecimalPlaces_In = 3
        .HasMinMax = True
        .Inches = True
        .Msg = "Intake Valve Lift"
        .StatusMsg = "Measured maximum net intake valve lift, normally between .450 and .750 inch."
    End With

    With gc_WSCSArea
        .AllowDecimals = True:  .DecimalPlaces_In = 3
        .Inches = True
    End With

   
    'Cross-section Area Calculator
    For i = 0 To 2
        gc_C(i).AllowMM = True
        gc_C(i).AllowDecimals = True
        
        If i < 2 Then
            gc_C(i).MMLimit = 10
            gc_C(i).DecimalPlaces_In = 3:   gc_C(i).DecimalPlaces_MM = 2
        Else
            gc_C(i).MMLimit = 200
            gc_C(i).DecimalPlaces_In = 3:   gc_C(i).DecimalPlaces_MM = 1
        End If
        
        gc_C(i).Inches = True
    Next
    
    For i = 0 To 3
        gc_E(i).AllowMM = True
        gc_E(i).AllowDecimals = True
        
        If i < 3 Then
            gc_E(i).MMLimit = 10
            gc_E(i).DecimalPlaces_In = 3:   gc_E(i).DecimalPlaces_MM = 2
        Else
            gc_E(i).MMLimit = 200
            gc_E(i).DecimalPlaces_In = 3:   gc_E(i).DecimalPlaces_MM = 1
        End If
        
        gc_E(i).Inches = True
    Next
    
    For i = 0 To 4
        gc_R(i).AllowMM = True
        gc_R(i).AllowDecimals = True
        
        If i < 4 Then
            gc_R(i).MMLimit = 10
            gc_R(i).DecimalPlaces_In = 3:   gc_R(i).DecimalPlaces_MM = 2
        Else
            gc_R(i).MMLimit = 200
            gc_R(i).DecimalPlaces_In = 3:   gc_R(i).DecimalPlaces_MM = 1
        End If
        
        gc_R(i).Inches = True
    Next
    
    For i = 0 To 3
        gc_A(i).AllowMM = True
        gc_A(i).AllowDecimals = True
        
        If i < 3 Then
            gc_A(i).MMLimit = 10
            gc_A(i).DecimalPlaces_In = 3:   gc_A(i).DecimalPlaces_MM = 2
        Else
            gc_A(i).MMLimit = 200
            gc_A(i).DecimalPlaces_In = 3:   gc_A(i).DecimalPlaces_MM = 1
        End If
        
        gc_A(i).Inches = True
    Next
    
    
    #If ISENGINEPRO Then
        'ENGINE Pro intake and exhaust flowbench data worksheet
        For i = 0 To 9
            With gc_IntLift(i)
                .AllowDecimals = True:  .DecimalPlaces_In = 3
                .HasMinMax = True
                .Inches = True
                .Msg = "Intake Valve Lift"
                .StatusMsg = "Intake valve lift for this flowbench data, normally between .100 and .800 inch."
            End With
            
            With gc_IntFlow(i)
                .AllowDecimals = True:  .DecimalPlaces_In = 1
                .HasMinMax = True
                .Inches = True
                .Msg = "Intake Port Flow"
                .StatusMsg = "The intake port flow at this intake valve lift measured from the flowbench."
            End With
        Next
        
        'ENGINE Pro Recommendations
        With gc_InMaxValveLift
            .AllowDecimals = True:  .DecimalPlaces_In = 3
            .Inches = True
        End With
    
        With gc_InMinFlowArea
            .AllowDecimals = True:  .DecimalPlaces_In = 2
            .Inches = True
        End With
    
        With gc_InTrackLen
            .AllowDecimals = True:  .DecimalPlaces_In = 2
            .Inches = True
        End With
    
        With gc_InMaxFlowArea
            .AllowDecimals = True:  .DecimalPlaces_In = 2
            .Inches = True
        End With
    
        With gc_ExValveDia
            .AllowMM = True
            .AllowDecimals = True:  .DecimalPlaces_In = 2:  .DecimalPlaces_MM = 1
            .Inches = True
        End With
    
        With gc_ExMaxValveLift
            .AllowDecimals = True:  .DecimalPlaces_In = 3
            .Inches = True
        End With
    
        With gc_ExMinFlowArea
            .AllowDecimals = True:  .DecimalPlaces_In = 2
            .Inches = True
        End With
    
        With gc_ExMaxFlowArea
            .AllowDecimals = True:  .DecimalPlaces_In = 2
            .Inches = True
        End With
    
        With gc_PriTubeLen
            .AllowDecimals = True:  .DecimalPlaces_In = 1
            .Inches = True
        End With
        
        With gc_PriTubeDia
            .AllowDecimals = True:  .DecimalPlaces_In = 3
            .Inches = True
        End With
        
        gc_CollectDia.AllowDecimals = True: gc_CollectDia.DecimalPlaces_In = 2
        gc_CollectDia.Inches = True
    #End If
    
    'calculated performance output parameters
    With gc_HPperCID
        .AllowDecimals = True:  .DecimalPlaces_In = 2
        .Inches = True
    End With
    
    With gc_TQperCID
        .AllowDecimals = True:  .DecimalPlaces_In = 2
        .Inches = True
    End With
    
    
    'set basecase default values
    gc_NoCyl.Value = 8:              gc_Inline.Value = 1
    gc_Bore.Value = 4.03:            bore = gc_Bore.Value:      SetRefBore
    gc_Stroke.HasMinMax = False:     gc_Rod.HasMinMax = False
    gc_Stroke.Value = 3.48:          stroke = gc_Stroke.Value:  SetRod
    gc_Rod.Value = 5.85:             SetStroke
    gc_Stroke.HasMinMax = True:      gc_Rod.HasMinMax = True
    gc_CR.Value = 12.9
    
    gc_CamType.Value = 4
    gc_InCamDur.Value = 264:         SetNIV
    
    gc_Manifold.Value = 1:           SetCarbCFM
    gc_Curved.Value = True:          gc_ManFlow.Value = 96
    
    gc_Carb.Value = True:            gc_CarbCFM.Value = 750
    gc_Fuel.Value = 1
        
    gc_NoInValves.Value = 1:        SetValveDia
    gc_ValveDia.Value = 2.05:       SetValveLift: SetSeatDia: SetStemDia
    gc_DeltaP.Value = 28:           CalcVelStd
    gc_MaxInFlow.Value = 250:       gc_RefBore.Value = 4: SetCSArea
    
    gc_Deck.Value = 0.015:          gc_Gasket.Value = 0.039
    gc_Chamber.HasMinMax = False:   gc_Dome.HasMinMax = False
    gc_Chamber.Value = 62:          gc_Dome.Value = 12
    CalcKCDGH
    gc_Chamber.HasMinMax = True:    gc_Dome.HasMinMax = True

    gc_NoTB.Value = 4
    gc_TBDia.Value = 1.688:         SetTVDia
    gc_TVDia.Value = 1.375
    gc_NoTBS.Value = 0
    gc_TBDiaS.Value = 0:            SetTVDiaS
    gc_TVDiaS.Value = 0
    gc_TBType.Value = True
    
    gc_CSArea.Value = 2.4
    gc_SeatDia.Value = 1.794
    gc_VSAngle.Value = 45:          SetVSWidth
    gc_VSWidth.Value = 0.08
    gc_StemDia.Value = 0.344
    gc_ValveLift.Value = 0.55
End Sub

Public Sub LoadTypes(p_obj As cValue, cbx As Control)
Dim i As Integer
    If TypeOf cbx Is ComboBox Then
        If p_obj.HasList Then
            If p_obj.Listcount > 0 Then
                For i = p_obj.MinVal To p_obj.MaxVal
                    cbx.AddItem p_obj.List(i)
                    cbx.ItemData(cbx.NewIndex) = i
                Next i
            End If
        End If
    End If
End Sub

#If ISENGINEPRO Then
Public Sub SetRatingRPMs()
    With gc_Detail
        .Rating(1) = gc_RPMPeakTQ.Value
        .Rating(2) = gc_RPMPeakHP.Value
        .Rating(3) = gc_Shift.Value
        .Rating(4) = gc_Redline.Value
    End With
End Sub
#End If
