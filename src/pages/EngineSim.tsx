import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Calculator } from 'lucide-react';
import Page from '../shared/components/Page';
import { useSubscription } from '../domain/config/useSubscription';
import {
  simulateEngine,
  createDefaultEngineProConfig,
  calcDisplacement,
  type EngineSimConfig,
} from '../domain/physics/engine/engineAdapter';
import type { EngineOutputs } from '../domain/physics/engine/engineTypes';
import { generateVB6DynoCurve } from '../domain/physics/engine/vb6CurveGen';
import { calcMechDetails, calcFlowDetails, calcRecommendations } from '../domain/physics/engine/engineProDetails';
import { CompressionRatioCalculator } from '../shared/components/CompressionRatioCalculator';
import {
  calcCarbCfm,
  clampNumBoresPrimary,
  clampNumBoresSecondary,
  clampThrottleDia,
  clampVenturiDia,
  venturiDiaLimits,
  parseNumericInput,
  formatCfm,
  formatDia,
  CARB_WS_DEFAULTS,
  type CarbWorksheetInputs,
  type ThrottleType,
} from '../domain/physics/engine/worksheets/carbCfmWorksheet';
import {
  calcCircularArea,
  calcEllipticalArea,
  calcRectangularArea,
  calcAnnularArea,
  parseCSAInput,
  formatDimension,
  formatArea,
  CSA_DEFAULTS,
  type CSAWorksheetState,
} from '../domain/physics/engine/worksheets/csaWorksheet';
import {
  calcWSCSArea,
  calcFlowStuff,
  calcSeatPer,
  calcSeatDia,
  estSeatDia,
  calcVelStd,
  calcFromFlowVel,
  calcFromFlowFlux,
  calcFromFVIndex,
  clampSeatPer,
  clampVSAngle,
  clampFVIndex,
  parseWSInput,
  formatDim3,
  formatDec1,
  CS_AREA_DEFAULTS as INTAKE_CS_DEFAULTS,
  FLOW_DEFAULTS as INTAKE_FLOW_DEFAULTS,
  type CSAreaInputs,
  type FlowInputs,
} from '../domain/physics/engine/worksheets/intakeFlowWorksheet';
import {
  initAllFieldConstraints,
  setValue,
  vb6Val,
  formatValue,
  updateField,
  recomputeOnCommit,
  recomputeOnCamTypeChange,
  type FieldKey,
  type FieldConstraint,
} from '../domain/physics/engine/engineConstraints';

// Cam type mapping for flow details
const CAM_TYPE_MAP: Record<string, number> = {
  'overhead_cam': 0,
  'roller': 1,
  'mushroom_tappet': 2,
  'high_rate_flat_tappet': 3,
  'normal_flat_tappet': 4,
  'hydraulic_roller': 5,
  'hydraulic_flat_tappet': 6,
};

// VB6 manifold type: 1=plenum, 2=IR, 3=dual_plane_divided, 4=dual_plane_slot
const MANIFOLD_TYPE_MAP: Record<string, number> = {
  'plenum': 1,
  'individual_runner': 2,
  'dual_plane_divided': 3,
  'dual_plane_slot': 4,
};

export default function EngineSim() {
  const { features } = useSubscription();
  const [config, setConfig] = useState<EngineSimConfig>(createDefaultEngineProConfig());
  const [activeTab, setActiveTab] = useState<'performance' | 'mech' | 'flow' | 'recommendations' | 'ws_cr' | 'ws_carb' | 'ws_intake' | 'ws_csa'>('performance');
  const [selectedRPM, setSelectedRPM] = useState<'peakTQ' | 'peakHP' | 'shift' | 'redline'>('peakHP');
  const [showCRCalculator, setShowCRCalculator] = useState(false);

  // --- VB6 cValue constraint layer ---
  const [constraints, setConstraints] = useState(() => initAllFieldConstraints());

  // Local text buffers: hold raw typing until blur/Enter commits.
  const [boreTxt, setBoreTxt] = useState(() => String(config.bore_in));
  const [strokeTxt, setStrokeTxt] = useState(() => String(config.stroke_in));
  const [rodTxt, setRodTxt] = useState(() => String(config.rodLength_in));
  const [refBoreTxt, setRefBoreTxt] = useState(() => String(config.flowTestBoreDia_in));
  const [nivTxt, setNivTxt] = useState(() => String(config.numIntakeValvesPerCyl));
  const [valveDiaTxt, setValveDiaTxt] = useState(() => String(config.intakeValveDia_in));
  const [maxInFlowTxt, setMaxInFlowTxt] = useState(() => String(config.maxIntakeFlow_cfm));
  const [deltaPTxt, setDeltaPTxt] = useState(() => String(config.flowTestPressure_inH2O));
  const [carbCFMTxt, setCarbCFMTxt] = useState(() => String(config.throttleCFM_at_1_5inHg));

  // --- Carb CFM Worksheet state (VB6: CARBCFM.FRM) ---
  const [carbWS, setCarbWS] = useState<CarbWorksheetInputs>(() => ({ ...CARB_WS_DEFAULTS }));
  const [carbWSTxt, setCarbWSTxt] = useState({
    numBoresPrimary: String(CARB_WS_DEFAULTS.numBoresPrimary),
    throttleDiaPrimary: formatDia(CARB_WS_DEFAULTS.throttleDiaPrimary),
    venturiDiaPrimary: formatDia(CARB_WS_DEFAULTS.venturiDiaPrimary),
    numBoresSecondary: String(CARB_WS_DEFAULTS.numBoresSecondary),
    throttleDiaSecondary: formatDia(CARB_WS_DEFAULTS.throttleDiaSecondary),
    venturiDiaSecondary: formatDia(CARB_WS_DEFAULTS.venturiDiaSecondary),
  });
  const carbWSResult = useMemo(() => calcCarbCfm(carbWS), [carbWS]);

  // Commit a carb worksheet field (VB6 _LostFocus semantics)
  function commitCarbWSField(field: keyof CarbWorksheetInputs, raw: string) {
    const parsed = parseNumericInput(raw);
    setCarbWS(prev => {
      const next = { ...prev };
      switch (field) {
        case 'numBoresPrimary':
          next.numBoresPrimary = clampNumBoresPrimary(parsed);
          break;
        case 'throttleDiaPrimary': {
          next.throttleDiaPrimary = clampThrottleDia(parsed);
          // VB6 SetTVDia: update venturi limits when throttle dia changes
          next.venturiDiaPrimary = clampVenturiDia(next.venturiDiaPrimary, next.throttleDiaPrimary);
          break;
        }
        case 'venturiDiaPrimary':
          next.venturiDiaPrimary = clampVenturiDia(parsed, next.throttleDiaPrimary);
          break;
        case 'numBoresSecondary': {
          next.numBoresSecondary = clampNumBoresSecondary(parsed);
          // VB6: if secondary bores set to 0, zero out secondary diameters
          if (next.numBoresSecondary === 0) {
            next.throttleDiaSecondary = 0;
            next.venturiDiaSecondary = 0;
          }
          break;
        }
        case 'throttleDiaSecondary': {
          next.throttleDiaSecondary = clampThrottleDia(parsed);
          next.venturiDiaSecondary = clampVenturiDia(next.venturiDiaSecondary, next.throttleDiaSecondary);
          break;
        }
        case 'venturiDiaSecondary':
          next.venturiDiaSecondary = clampVenturiDia(parsed, next.throttleDiaSecondary);
          break;
        default:
          break;
      }
      // Sync text buffers to clamped values
      setCarbWSTxt({
        numBoresPrimary: String(next.numBoresPrimary),
        throttleDiaPrimary: formatDia(next.throttleDiaPrimary),
        venturiDiaPrimary: formatDia(next.venturiDiaPrimary),
        numBoresSecondary: String(next.numBoresSecondary),
        throttleDiaSecondary: formatDia(next.throttleDiaSecondary),
        venturiDiaSecondary: formatDia(next.venturiDiaSecondary),
      });
      return next;
    });
  }

  // --- CSA Calculator Worksheet state (VB6: CSCalc.frm) ---
  const [csaWS, setCsaWS] = useState<CSAWorksheetState>(() => ({ ...CSA_DEFAULTS,
    circular: { ...CSA_DEFAULTS.circular },
    elliptical: { ...CSA_DEFAULTS.elliptical },
    rectangular: { ...CSA_DEFAULTS.rectangular },
    annular: { ...CSA_DEFAULTS.annular },
  }));
  const [csaTxt, setCsaTxt] = useState({
    cDia: formatDimension(0), cStem: formatDimension(0),
    eMajor: formatDimension(0), eMinor: formatDimension(0), eStem: formatDimension(0),
    rHeight: formatDimension(0), rWidth: formatDimension(0), rCorner: formatDimension(0), rStem: formatDimension(0),
    aOuter: formatDimension(0), aInner: formatDimension(0), aStem: formatDimension(0),
  });
  const csaResults = useMemo(() => ({
    circularArea: calcCircularArea(csaWS.circular),
    ellipticalArea: calcEllipticalArea(csaWS.elliptical),
    rectangularArea: calcRectangularArea(csaWS.rectangular),
    annularArea: calcAnnularArea(csaWS.annular),
  }), [csaWS]);

  // VB6 _LostFocus: parse → update state → sync text buffers
  function commitCSAField(section: keyof CSAWorksheetState, field: string, raw: string) {
    const val = parseCSAInput(raw);
    setCsaWS(prev => {
      const next = {
        ...prev,
        circular: { ...prev.circular },
        elliptical: { ...prev.elliptical },
        rectangular: { ...prev.rectangular },
        annular: { ...prev.annular },
      };
      (next[section] as Record<string, number>)[field] = val;
      return next;
    });
    // Sync all text buffers to formatted values after commit
    setCsaTxt(prev => {
      const p = { ...prev };
      const key = `${section[0]}${field.charAt(0).toUpperCase()}${field.slice(1)}` as keyof typeof prev;
      // Map section+field to text key
      const map: Record<string, keyof typeof prev> = {
        'circular.diameter': 'cDia', 'circular.stemDiameter': 'cStem',
        'elliptical.majorDiameter': 'eMajor', 'elliptical.minorDiameter': 'eMinor', 'elliptical.stemDiameter': 'eStem',
        'rectangular.height': 'rHeight', 'rectangular.width': 'rWidth', 'rectangular.cornerDiameter': 'rCorner', 'rectangular.stemDiameter': 'rStem',
        'annular.outerDiameter': 'aOuter', 'annular.innerDiameter': 'aInner', 'annular.stemDiameter': 'aStem',
      };
      const txtKey = map[`${section}.${field}`] ?? key;
      p[txtKey] = formatDimension(val);
      return p;
    });
  }

  // --- Intake Flow Worksheet state (VB6: CSAREA.FRM + MAXFLOW.FRM) ---
  const [intakeCS, setIntakeCS] = useState<CSAreaInputs>(() => ({ ...INTAKE_CS_DEFAULTS }));
  const [intakeFlow, setIntakeFlow] = useState<FlowInputs>(() => ({ ...INTAKE_FLOW_DEFAULTS }));
  const [intakeCSTxt, setIntakeCSTxt] = useState({
    seatDia: formatDim3(INTAKE_CS_DEFAULTS.seatDia),
    seatPer: formatDec1(INTAKE_CS_DEFAULTS.seatPer),
    vsAngle: formatDec1(INTAKE_CS_DEFAULTS.vsAngle),
    vsWidth: formatDim3(INTAKE_CS_DEFAULTS.vsWidth),
    stemDia: formatDim3(INTAKE_CS_DEFAULTS.stemDia),
    valveLift: formatDim3(INTAKE_CS_DEFAULTS.valveLift),
  });
  const [intakeFlowTxt, setIntakeFlowTxt] = useState({
    csArea: formatDim3(INTAKE_FLOW_DEFAULTS.csArea),
    flowVel: formatDec1(0),
    flowFlux: formatDec1(0),
    fvIndex: formatDec1(0),
  });

  // Derived: VSTD from engine context
  const intakeVSTD = useMemo(
    () => calcVelStd(constraints.deltaP.value, constraints.noInValves.value),
    [constraints.deltaP.value, constraints.noInValves.value]
  );

  // Derived: CS Area worksheet result
  const intakeWSCSArea = useMemo(
    () => calcWSCSArea(intakeCS, {
      valveDia: constraints.valveDia.value,
      noInValves: constraints.noInValves.value,
    }),
    [intakeCS, constraints.valveDia.value, constraints.noInValves.value]
  );

  // Derived: Flow results from main form maxInFlow + csArea
  const intakeFlowResult = useMemo(
    () => calcFlowStuff(constraints.maxInFlow.value, intakeFlow.csArea, intakeVSTD),
    [constraints.maxInFlow.value, intakeFlow.csArea, intakeVSTD]
  );

  // Commit CS Area sub-worksheet field (VB6 CSAREA.FRM _LostFocus)
  function commitIntakeCSField(field: keyof CSAreaInputs, raw: string) {
    const parsed = parseWSInput(raw);
    setIntakeCS(prev => {
      const next = { ...prev };
      switch (field) {
        case 'seatDia': {
          next.seatDia = parsed;
          // VB6 txtSeatDia_LostFocus: CalcSeatPer, SetVSWidth
          next.seatPer = calcSeatPer(next.seatDia, constraints.valveDia.value);
          break;
        }
        case 'seatPer': {
          next.seatPer = clampSeatPer(parsed);
          // VB6 txtSeatPer_LostFocus: CalcSeatDia, SetVSWidth
          next.seatDia = calcSeatDia(next.seatPer, constraints.valveDia.value);
          break;
        }
        case 'vsAngle':
          next.vsAngle = clampVSAngle(parsed);
          break;
        case 'vsWidth':
          next.vsWidth = parsed;
          break;
        case 'stemDia':
          next.stemDia = parsed;
          break;
        case 'valveLift':
          next.valveLift = parsed;
          break;
      }
      // Sync text buffers
      setIntakeCSTxt({
        seatDia: formatDim3(next.seatDia),
        seatPer: formatDec1(next.seatPer),
        vsAngle: formatDec1(next.vsAngle),
        vsWidth: formatDim3(next.vsWidth),
        stemDia: formatDim3(next.stemDia),
        valveLift: formatDim3(next.valveLift),
      });
      return next;
    });
  }

  // VB6 lblWSCSArea_DblClick: transfer calculated wsCSArea to flow worksheet csArea
  function applyWSCSAreaToFlow() {
    setIntakeFlow(prev => {
      const next = { ...prev, csArea: intakeWSCSArea };
      setIntakeFlowTxt(t => ({
        ...t,
        csArea: formatDim3(next.csArea),
      }));
      return next;
    });
  }

  // Commit Flow sub-worksheet field (VB6 MAXFLOW.FRM _LostFocus)
  function commitIntakeFlowField(field: keyof FlowInputs, raw: string) {
    const parsed = parseWSInput(raw);
    setIntakeFlow(prev => {
      let next = { ...prev };
      switch (field) {
        case 'csArea': {
          next.csArea = parsed;
          // VB6 txtCSArea_LostFocus: CalcFlowStuff, then check FVIndex limits
          const result = calcFlowStuff(constraints.maxInFlow.value, next.csArea, intakeVSTD);
          next.flowFlux = result.flowFlux;
          next.flowVel = result.flowVel;
          next.fvIndex = result.fvIndex;
          // VB6: EstSeatDia, CalcSeatPer, SetVSWidth after csArea change
          const newSeatDia = estSeatDia(next.csArea, constraints.noInValves.value, intakeCS.stemDia);
          const newSeatPer = calcSeatPer(newSeatDia, constraints.valveDia.value);
          setIntakeCS(p => {
            const u = { ...p, seatDia: newSeatDia, seatPer: newSeatPer };
            setIntakeCSTxt({
              seatDia: formatDim3(u.seatDia),
              seatPer: formatDec1(u.seatPer),
              vsAngle: formatDec1(u.vsAngle),
              vsWidth: formatDim3(u.vsWidth),
              stemDia: formatDim3(u.stemDia),
              valveLift: formatDim3(u.valveLift),
            });
            return u;
          });
          break;
        }
        case 'flowVel': {
          const result = calcFromFlowVel(parsed, next.csArea, intakeVSTD);
          next = { ...next, ...result };
          break;
        }
        case 'flowFlux': {
          const result = calcFromFlowFlux(parsed, next.csArea, intakeVSTD);
          next = { ...next, ...result };
          break;
        }
        case 'fvIndex': {
          const clamped = clampFVIndex(parsed);
          const result = calcFromFVIndex(clamped, next.csArea, intakeVSTD);
          next = { ...next, ...result };
          break;
        }
      }
      setIntakeFlowTxt({
        csArea: formatDim3(next.csArea),
        flowVel: formatDec1(next.flowVel),
        flowFlux: formatDec1(next.flowFlux),
        fvIndex: formatDec1(next.fvIndex),
      });
      return next;
    });
  }

  // VB6 lblWSCarb_DblClick: transfer calculated CFM to main form
  function applyCarbWSToMain() {
    const cfmStr = formatCfm(carbWSResult.cfmTotal);
    setCarbCFMTxt(cfmStr);
    commitField('carbCFM', cfmStr);
  }

  // VB6-style commit: parse → clamp → recompute all dynamic limits → sync
  function commitField(key: FieldKey, raw: string) {
    const parsed = vb6Val(raw);
    const nextField = setValue(constraints[key], parsed);
    let updatedMap = updateField(constraints, key, nextField);

    // Recompute per-field VB6 handler chain
    const camType = CAM_TYPE_MAP[config.camshaftType] ?? 4;
    const noCyl = config.numCylinders ?? 8;
    const manifoldType = MANIFOLD_TYPE_MAP[config.intakeManifoldType] ?? 1;
    const { nextMap } = recomputeOnCommit(updatedMap, { camType, committedKey: key, noCyl, manifoldType });
    updatedMap = nextMap;
    syncConstraintsToUI(updatedMap);
  }

  // Sync constraint map → config state + all text buffers
  function syncConstraintsToUI(m: Record<FieldKey, FieldConstraint>) {
    setConstraints(m);
    setConfig(prev => ({
      ...prev,
      bore_in: m.bore.value,
      stroke_in: m.stroke.value,
      rodLength_in: m.rod.value,
      flowTestBoreDia_in: m.refBore.value,
      numIntakeValvesPerCyl: m.noInValves.value,
      intakeValveDia_in: m.valveDia.value,
      maxIntakeFlow_cfm: m.maxInFlow.value,
      flowTestPressure_inH2O: m.deltaP.value,
      throttleCFM_at_1_5inHg: m.carbCFM.value,
    }));
    setBoreTxt(formatValue(m.bore));
    setStrokeTxt(formatValue(m.stroke));
    setRodTxt(formatValue(m.rod));
    setRefBoreTxt(formatValue(m.refBore));
    setNivTxt(formatValue(m.noInValves));
    setValveDiaTxt(formatValue(m.valveDia));
    setMaxInFlowTxt(formatValue(m.maxInFlow));
    setDeltaPTxt(formatValue(m.deltaP));
    setCarbCFMTxt(formatValue(m.carbCFM));
  }

  // VB6 cmbCamType_Click: recompute NIV + downstream chain on camType change
  function onCamTypeChange(newCamshaftType: string) {
    updateConfig({ camshaftType: newCamshaftType as any });
    const camType = CAM_TYPE_MAP[newCamshaftType] ?? 4;
    const { nextMap } = recomputeOnCamTypeChange(constraints, { camType });
    syncConstraintsToUI(nextMap);
  }

  // Pro features are locked behind subscription
  const hasProAccess = features.quarterProFields;

  const displacement = useMemo(
    () => calcDisplacement(config.bore_in, config.stroke_in, config.numCylinders),
    [config.bore_in, config.stroke_in, config.numCylinders]
  );

  const result: EngineOutputs = useMemo(() => simulateEngine(config), [config]);

  // Generate VB6-accurate dyno curve
  const chartData = useMemo(() => {
    const vb6Curve = generateVB6DynoCurve(
      result.peakHP,
      result.rpmPeakHP,
      result.peakTQ,
      result.rpmPeakTQ,
      result.redline,
      displacement
    );
    return vb6Curve.map((p: { rpm: number; hp: number; torque_lbft: number }) => ({
      rpm: p.rpm,
      hp: Math.round(p.hp),
      torque: Math.round(p.torque_lbft),
    }));
  }, [result, displacement]);

  // Get RPM value based on selection
  const getCurrentRPM = () => {
    switch (selectedRPM) {
      case 'peakTQ': return result.rpmPeakTQ;
      case 'peakHP': return result.rpmPeakHP;
      case 'shift': return result.shift;
      case 'redline': return result.redline;
      default: return result.rpmPeakHP;
    }
  };

  // Calculate mechanical details for Pro tabs
  const mechDetails = useMemo(() => {
    if (activeTab !== 'mech') return null;
    return calcMechDetails(
      getCurrentRPM(),
      config.stroke_in,
      config.rodLength_in
    );
  }, [activeTab, selectedRPM, result, config.stroke_in, config.rodLength_in]);

  // Calculate flow details for Pro tabs
  const flowDetails = useMemo(() => {
    if (activeTab !== 'flow') return null;
    
    // Get calculated cam defaults if not provided
    // Use nullish coalescing to handle undefined/null but not 0
    const ilc = config.intakeLobeCenterline_deg ?? 105;
    const maxLift = config.maxIntakeValveLift_in ?? 0.5;
    
    // VB6 uses advertised duration for flow details, not 0.050" duration
    // Advertised duration = 1.08 * duration@0.050 + 10
    const advDuration = 1.08 * config.intakeDuration050_deg + 10;
    
    return calcFlowDetails(
      getCurrentRPM(),
      config.stroke_in,
      config.rodLength_in,
      config.bore_in,
      config.intakeValveDia_in,
      config.numIntakeValvesPerCyl,
      advDuration,   // duration_deg (advertised duration ~295)
      ilc,           // lobeCenterline_deg (should be ~106)
      maxLift,
      CAM_TYPE_MAP[config.camshaftType] || 0
    );
  }, [activeTab, selectedRPM, result, config]);

  // Calculate recommendations for Pro tabs
  const recommendations = useMemo(() => {
    if (activeTab !== 'recommendations') return null;
    if (!result.calculatedValues) return null;  // Need calculated values from engine simulation
    return calcRecommendations(
      config,
      result.peakHP,
      result.rpmPeakHP,
      result.peakTQ,
      result.rpmPeakTQ,
      result.calculatedValues  // Pass calculated values from engine simulation
    );
  }, [activeTab, config, result]);

  const updateConfig = (updates: Partial<EngineSimConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return (
    <Page title="ENGINE Pro" wide>
      {/* Compression Ratio Calculator Modal */}
      <CompressionRatioCalculator
        isOpen={showCRCalculator}
        onClose={() => setShowCRCalculator(false)}
        onApply={(cr) => updateConfig({ compressionRatio: cr })}
        initialValues={{
          bore_in: config.bore_in,
          stroke_in: config.stroke_in,
          chamberVolume_cc: config.combustionChamberVolume_cc,
          deckHeight_in: config.pistonToDeckHeight_in,
          gasketThickness_in: config.headGasketThickness_in,
          pistonDomeVolume_cc: config.pistonDomeVolume_cc,
        }}
      />
      <div style={styles.container}>
        {/* Tabs */}
        <div style={styles.tabContainer}>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === 'performance' ? styles.tabButtonActive : {}),
            }}
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === 'mech' ? styles.tabButtonActive : {}),
            }}
            onClick={() => hasProAccess && setActiveTab('mech')}
            disabled={!hasProAccess}
          >
            Mech Details {!hasProAccess && '🔒'}
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === 'flow' ? styles.tabButtonActive : {}),
            }}
            onClick={() => hasProAccess && setActiveTab('flow')}
            disabled={!hasProAccess}
          >
            Flow Details {!hasProAccess && '🔒'}
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === 'recommendations' ? styles.tabButtonActive : {}),
            }}
            onClick={() => hasProAccess && setActiveTab('recommendations')}
            disabled={!hasProAccess}
          >
            Recommendations {!hasProAccess && '🔒'}
          </button>
          <span style={{ borderLeft: '1px solid var(--color-border)', margin: '0 4px' }} />
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === 'ws_carb' ? styles.tabButtonActive : {}),
              fontSize: '11px',
            }}
            onClick={() => setActiveTab('ws_carb')}
          >
            Carb CFM WS
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === 'ws_intake' ? styles.tabButtonActive : {}),
              fontSize: '11px',
            }}
            onClick={() => setActiveTab('ws_intake')}
          >
            Intake Flow WS
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === 'ws_csa' ? styles.tabButtonActive : {}),
              fontSize: '11px',
            }}
            onClick={() => setActiveTab('ws_csa')}
          >
            CSA Calculator
          </button>
        </div>

        {/* Main Layout */}
        <div style={styles.mainLayout}>
          {/* Left Column - Inputs */}
          <div style={styles.leftColumn}>
            {/* Basic Engine Design */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Engine Design</div>
              
              <div style={styles.inputRow}>
                <label style={styles.label}>Number of Cylinders</label>
                <input
                  type="number"
                  style={styles.input}
                  value={config.numCylinders}
                  onChange={e => updateConfig({ numCylinders: parseInt(e.target.value) || 8 })}
                  min={1}
                  max={12}
                />
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Layout</label>
                <select
                  style={styles.select}
                  value={config.layout}
                  onChange={e => updateConfig({ layout: e.target.value as any })}
                >
                  <option value="inline">Inline</option>
                  <option value="vee">Vee</option>
                  <option value="flat">Flat/Opposed</option>
                </select>
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Bore (inches)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  style={styles.input}
                  value={boreTxt}
                  onChange={e => setBoreTxt(e.target.value)}
                  onBlur={() => commitField('bore', boreTxt)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitField('bore', boreTxt); } }}
                />
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Stroke (inches)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  style={styles.input}
                  value={strokeTxt}
                  onChange={e => setStrokeTxt(e.target.value)}
                  onBlur={() => commitField('stroke', strokeTxt)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitField('stroke', strokeTxt); } }}
                />
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Rod Length (inches)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  style={styles.input}
                  value={rodTxt}
                  onChange={e => setRodTxt(e.target.value)}
                  onBlur={() => commitField('rod', rodTxt)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitField('rod', rodTxt); } }}
                />
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Compression Ratio</label>
                <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                  <input
                    type="number"
                    style={{ ...styles.input, flex: 1 }}
                    value={config.compressionRatio}
                    onChange={e => updateConfig({ compressionRatio: parseFloat(e.target.value) || 10 })}
                    step={0.1}
                  />
                  <button
                    onClick={() => setShowCRCalculator(true)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'var(--color-primary)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Compression Ratio Calculator"
                  >
                    <Calculator size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Camshaft */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Camshaft</div>
              
              <div style={styles.inputRow}>
                <label style={styles.label}>Cam Type</label>
                <select
                  style={styles.select}
                  value={config.camshaftType}
                  onChange={e => onCamTypeChange(e.target.value)}
                >
                  <option value="overhead_cam">Overhead Cam</option>
                  <option value="roller">Roller Cam & Lifter</option>
                  <option value="mushroom_tappet">Mushroom Tappet</option>
                  <option value="high_rate_flat_tappet">High Rate-of-Lift Flat Tappet</option>
                  <option value="normal_flat_tappet">Normal Flat Tappet & Solid Lifter</option>
                  <option value="hydraulic_roller">Hydraulic Roller Cam & Lifter</option>
                  <option value="hydraulic_flat_tappet">Normal Hydraulic Cam & Lifter</option>
                </select>
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Duration @ 0.050" (degrees)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={config.intakeDuration050_deg}
                  onChange={e => updateConfig({ intakeDuration050_deg: parseFloat(e.target.value) || 220 })}
                />
              </div>
            </div>

            {/* Fuel & Induction */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Fuel & Induction</div>
              
              <div style={styles.inputRow}>
                <label style={styles.label}>Fuel Type</label>
                <select
                  style={styles.select}
                  value={config.fuelType}
                  onChange={e => updateConfig({ fuelType: e.target.value as any })}
                >
                  <option value="gasoline">Gasoline</option>
                  <option value="racing_gasoline">Racing Gasoline</option>
                  <option value="methanol">Methanol</option>
                </select>
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Induction</label>
                <select
                  style={styles.select}
                  value={config.isEFI ? 'efi' : 'carb'}
                  onChange={e => updateConfig({ isEFI: e.target.value === 'efi' })}
                >
                  <option value="carb">Carburetor</option>
                  <option value="efi">Fuel Injection</option>
                </select>
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>
                  {config.isEFI ? 'Throttle Body' : 'Carburetor'} CFM @ 1.5" Hg
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  style={styles.input}
                  value={carbCFMTxt}
                  onChange={e => setCarbCFMTxt(e.target.value)}
                  onBlur={() => commitField('carbCFM', carbCFMTxt)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitField('carbCFM', carbCFMTxt); } }}
                />
              </div>
            </div>

            {/* Intake Manifold */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Intake Manifold</div>
              
              <div style={styles.inputRow}>
                <label style={styles.label}>Manifold Type</label>
                <select
                  style={styles.select}
                  value={config.intakeManifoldType}
                  onChange={e => updateConfig({ intakeManifoldType: e.target.value as any })}
                >
                  <option value="plenum">Common Plenum</option>
                  <option value="individual_runner">Individual Runner</option>
                  <option value="dual_plane_divided">Dual Plane - Divided</option>
                  <option value="dual_plane_slot">Dual Plane - Slot</option>
                </select>
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Runner Style</label>
                <select
                  style={styles.select}
                  value={config.runnerStyle}
                  onChange={e => updateConfig({ runnerStyle: e.target.value as any })}
                >
                  <option value="straight">Straight</option>
                  <option value="curved">Curved</option>
                </select>
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Flow Factor (%)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={config.intakeManifoldFlowFactor_pct}
                  onChange={e => updateConfig({ intakeManifoldFlowFactor_pct: parseFloat(e.target.value) || 96 })}
                  min={50}
                  max={100}
                />
              </div>
            </div>

            {/* Cylinder Head */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Cylinder Head</div>
              
              <div style={styles.inputRow}>
                <label style={styles.label}>Intake Valves per Cylinder</label>
                <input
                  type="text"
                  inputMode="numeric"
                  style={styles.input}
                  value={nivTxt}
                  onChange={e => setNivTxt(e.target.value)}
                  onBlur={() => commitField('noInValves', nivTxt)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitField('noInValves', nivTxt); } }}
                />
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Intake Valve Diameter (inches)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  style={styles.input}
                  value={valveDiaTxt}
                  onChange={e => setValveDiaTxt(e.target.value)}
                  onBlur={() => commitField('valveDia', valveDiaTxt)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitField('valveDia', valveDiaTxt); } }}
                />
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Max Intake Flow (CFM)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  style={styles.input}
                  value={maxInFlowTxt}
                  onChange={e => setMaxInFlowTxt(e.target.value)}
                  onBlur={() => commitField('maxInFlow', maxInFlowTxt)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitField('maxInFlow', maxInFlowTxt); } }}
                />
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Flow Test Pressure (in H2O)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  style={styles.input}
                  value={deltaPTxt}
                  onChange={e => setDeltaPTxt(e.target.value)}
                  onBlur={() => commitField('deltaP', deltaPTxt)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitField('deltaP', deltaPTxt); } }}
                />
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Flow Test Bore Diameter (inches)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  style={styles.input}
                  value={refBoreTxt}
                  onChange={e => setRefBoreTxt(e.target.value)}
                  onBlur={() => commitField('refBore', refBoreTxt)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitField('refBore', refBoreTxt); } }}
                />
              </div>
            </div>

          </div>

          {/* Right Column - Results & Chart */}
          <div style={styles.rightColumn}>
            {/* Results */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Estimated Performance</div>
              
              <div style={styles.resultsGrid}>
                <div style={styles.resultBox}>
                  <div style={styles.resultLabel}>Peak HP</div>
                  <div style={styles.resultValueLarge}>{Math.round(result.peakHP)}</div>
                  <div style={styles.resultSubtext}>@ {result.rpmPeakHP} RPM</div>
                </div>

                <div style={styles.resultBox}>
                  <div style={styles.resultLabel}>Peak Torque</div>
                  <div style={styles.resultValueLarge}>{Math.round(result.peakTQ)}</div>
                  <div style={styles.resultSubtext}>@ {result.rpmPeakTQ} RPM</div>
                </div>

                <div style={styles.resultBox}>
                  <div style={styles.resultLabel}>HP/CID</div>
                  <div style={styles.resultValueLarge}>{result.hpPerCID.toFixed(2)}</div>
                </div>

                <div style={styles.resultBox}>
                  <div style={styles.resultLabel}>TQ/CID</div>
                  <div style={styles.resultValueLarge}>{result.tqPerCID.toFixed(2)}</div>
                </div>

                <div style={styles.resultBox}>
                  <div style={styles.resultLabel}>Shift RPM</div>
                  <div style={styles.resultValueLarge}>{result.shift}</div>
                </div>

                <div style={styles.resultBox}>
                  <div style={styles.resultLabel}>Redline RPM</div>
                  <div style={styles.resultValueLarge}>{result.redline}</div>
                </div>
              </div>

              {result.lobeSepAng && result.inLobeCL && (
                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: 'var(--color-warning-bg)', borderRadius: '4px' }}>
                  <div style={styles.resultLabel}>Camshaft Recommendations:</div>
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>
                    Lobe Separation Angle: {result.lobeSepAng}°
                  </div>
                  <div style={{ fontSize: '11px' }}>
                    Intake Lobe Centerline: {result.inLobeCL}°
                  </div>
                </div>
              )}
            </div>

            {/* Performance Tab: Dyno Chart */}
            {activeTab === 'performance' && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>HP & Torque Curves</div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="rpm"
                      label={{ value: 'RPM', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis label={{ value: 'HP / TQ', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="hp"
                      stroke="#dc3545"
                      strokeWidth={2}
                      name="Horsepower"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="torque"
                      stroke="#007bff"
                      strokeWidth={2}
                      name="Torque (lb-ft)"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Mech Details Tab */}
            {activeTab === 'mech' && hasProAccess && mechDetails && (
              <>
                {/* Piston Speed & Depth Graph - Moved to top */}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>Piston Speed & Depth vs Angle</div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={mechDetails}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="angle_deg"
                        label={{ value: 'Crank Angle (deg ATDC)', position: 'insideBottom', offset: -5 }}
                        domain={[0, 180]}
                      />
                      <YAxis
                        yAxisId="left"
                        label={{ value: 'Piston Speed (FPM)', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        label={{ value: 'Piston Depth (in)', angle: 90, position: 'insideRight' }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="pistonSpeed_fpm"
                        stroke="#007bff"
                        strokeWidth={2}
                        name="Piston Speed (FPM)"
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="pistonDepth_in"
                        stroke="#dc3545"
                        strokeWidth={2}
                        name="Piston Depth (in)"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* RPM Selector and Geometric Summary */}
                <div style={styles.section}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Piston Speed Summary */}
                    <div>
                      <div style={styles.sectionTitle}>Piston Speed Summary - FPM</div>
                      <table style={styles.table}>
                        <thead>
                          <tr style={styles.tableHeaderRow}>
                            <th style={styles.tableHeader}>Rating</th>
                            <th style={styles.tableHeader}>RPM</th>
                            <th style={styles.tableHeader}>Avg</th>
                            <th style={styles.tableHeader}>Max</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: 'peakTQ' as const, label: 'Peak TQ', rpm: result.rpmPeakTQ },
                            { key: 'peakHP' as const, label: 'Peak HP', rpm: result.rpmPeakHP },
                            { key: 'shift' as const, label: 'Shift', rpm: result.shift },
                            { key: 'redline' as const, label: 'Redline', rpm: result.redline },
                          ].map(({ key, label, rpm }) => {
                            const avgSpeed = Math.round(rpm * Math.PI * config.stroke_in / 12);
                            const maxSpeed = Math.round(avgSpeed * 1.57); // Max is ~1.57x average
                            return (
                              <tr
                                key={key}
                                style={{
                                  ...styles.tableRow,
                                  ...(selectedRPM === key ? { backgroundColor: 'var(--color-primary)', color: '#ffffff', cursor: 'pointer' } : { cursor: 'pointer' }),
                                }}
                                onClick={() => setSelectedRPM(key)}
                              >
                                <td style={styles.tableCell}>{label}</td>
                                <td style={styles.tableCell}>{rpm}</td>
                                <td style={styles.tableCell}>{avgSpeed}</td>
                                <td style={styles.tableCell}>{maxSpeed}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div style={{ fontSize: '10px', marginTop: '8px', color: 'var(--color-text-secondary)' }}>
                        *Maximum Piston Speed occurs<br />
                        @ {(Math.asin(1 / Math.sqrt(1 + (config.rodLength_in / config.stroke_in) ** 2)) * 180 / Math.PI).toFixed(1)}° ATDC
                      </div>
                      <div style={{ marginTop: '12px', fontSize: '11px' }}>
                        <div style={styles.resultLabel}>Est. Cranking Compression - psig</div>
                        <input
                          type="number"
                          style={{ ...styles.input, width: '100px', marginTop: '4px' }}
                          defaultValue={230}
                        />
                      </div>
                    </div>

                    {/* Geometric Data Summary */}
                    <div>
                      <div style={styles.sectionTitle}>Geometric Data Summary</div>
                      <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
                        <div style={styles.resultRow}>
                          <span style={styles.resultLabel}>Bore to Stroke Ratio</span>
                          <span style={styles.resultValue}>{(config.bore_in / config.stroke_in).toFixed(2)}</span>
                        </div>
                        <div style={styles.resultRow}>
                          <span style={styles.resultLabel}>Rod to Stroke Ratio</span>
                          <span style={styles.resultValue}>{(config.rodLength_in / config.stroke_in).toFixed(2)}</span>
                        </div>
                        <div style={styles.resultRow}>
                          <span style={styles.resultLabel}>Piston to Head / Rod Length</span>
                          <span style={styles.resultValue}>0.0032</span>
                        </div>
                        <div style={styles.resultRow}>
                          <span style={styles.resultLabel}>Intake Throat / Bore Area Ratio</span>
                          <span style={styles.resultValue}>
                            {(config.numIntakeValvesPerCyl * Math.PI * Math.pow(config.intakeValveDia_in / 2, 2) / (Math.PI * Math.pow(config.bore_in / 2, 2))).toFixed(3)}
                          </span>
                        </div>
                        <div style={styles.resultRow}>
                          <span style={styles.resultLabel}>Intake Valve Lift / Diameter Ratio</span>
                          <span style={styles.resultValue}>0.268</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Table */}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>Data @ {getCurrentRPM()} RPM - {
                    selectedRPM === 'peakTQ' ? 'Peak TQ' :
                    selectedRPM === 'peakHP' ? 'Peak HP' :
                    selectedRPM === 'shift' ? 'Shift' : 'Redline'
                  }</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeaderRow}>
                          <th style={styles.tableHeader}>deg ATDC</th>
                          <th style={styles.tableHeader}>Depth inch</th>
                          <th style={styles.tableHeader}>Piston Speed FPM</th>
                          <th style={styles.tableHeader}>FPS</th>
                          <th style={styles.tableHeader}>accel g's</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mechDetails.map((p, i) => (
                          <tr key={i} style={styles.tableRow}>
                            <td style={styles.tableCell}>{p.angle_deg.toFixed(1)}</td>
                            <td style={styles.tableCell}>{p.pistonDepth_in.toFixed(3)}</td>
                            <td style={styles.tableCell}>{Math.round(p.pistonSpeed_fpm)}</td>
                            <td style={styles.tableCell}>{Math.round(p.pistonSpeed_fps)}</td>
                            <td style={styles.tableCell}>{Math.round(p.pistonAccel_gs)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Flow Details Tab */}
            {activeTab === 'flow' && hasProAccess && flowDetails && (
              <>
                {/* Top Row: Piston Speed Summary + Camshaft Description */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  {/* Piston Speed Summary - Clickable rows */}
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>Piston Speed Summary</div>
                    <table style={{ ...styles.table, fontSize: '11px' }}>
                      <thead>
                        <tr style={styles.tableHeaderRow}>
                          <th style={{ ...styles.tableHeader, color: '#22c55e' }}>Rating</th>
                          <th style={{ ...styles.tableHeader, color: '#ef4444' }}>RPM</th>
                          <th style={styles.tableHeader}>Avg</th>
                          <th style={styles.tableHeader}>Max</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr 
                          style={{ ...styles.tableRow, cursor: 'pointer', backgroundColor: selectedRPM === 'peakTQ' ? 'var(--color-surface-alt)' : undefined }}
                          onClick={() => setSelectedRPM('peakTQ')}
                        >
                          <td style={{ ...styles.tableCell, color: '#22c55e' }}>Peak TQ</td>
                          <td style={{ ...styles.tableCell, color: '#ef4444' }}>{result.rpmPeakTQ}</td>
                          <td style={styles.tableCell}>{Math.round(result.rpmPeakTQ * config.stroke_in / 6)}</td>
                          <td style={styles.tableCell}>{Math.round(result.rpmPeakTQ * config.stroke_in * Math.PI / 12)}</td>
                        </tr>
                        <tr 
                          style={{ ...styles.tableRow, cursor: 'pointer', backgroundColor: selectedRPM === 'peakHP' ? 'var(--color-surface-alt)' : undefined }}
                          onClick={() => setSelectedRPM('peakHP')}
                        >
                          <td style={{ ...styles.tableCell, color: '#22c55e', fontWeight: selectedRPM === 'peakHP' ? 'bold' : undefined }}>Peak HP</td>
                          <td style={{ ...styles.tableCell, color: '#ef4444', fontWeight: selectedRPM === 'peakHP' ? 'bold' : undefined }}>{result.rpmPeakHP}</td>
                          <td style={{ ...styles.tableCell, fontWeight: selectedRPM === 'peakHP' ? 'bold' : undefined }}>{Math.round(result.rpmPeakHP * config.stroke_in / 6)}</td>
                          <td style={{ ...styles.tableCell, fontWeight: selectedRPM === 'peakHP' ? 'bold' : undefined }}>{Math.round(result.rpmPeakHP * config.stroke_in * Math.PI / 12)}</td>
                        </tr>
                        <tr 
                          style={{ ...styles.tableRow, cursor: 'pointer', backgroundColor: selectedRPM === 'shift' ? 'var(--color-surface-alt)' : undefined }}
                          onClick={() => setSelectedRPM('shift')}
                        >
                          <td style={{ ...styles.tableCell, color: '#22c55e' }}>Shift</td>
                          <td style={{ ...styles.tableCell, color: '#ef4444' }}>{result.shift}</td>
                          <td style={styles.tableCell}>{Math.round(result.shift * config.stroke_in / 6)}</td>
                          <td style={styles.tableCell}>{Math.round(result.shift * config.stroke_in * Math.PI / 12)}</td>
                        </tr>
                        <tr 
                          style={{ ...styles.tableRow, cursor: 'pointer', backgroundColor: selectedRPM === 'redline' ? 'var(--color-surface-alt)' : undefined }}
                          onClick={() => setSelectedRPM('redline')}
                        >
                          <td style={{ ...styles.tableCell, color: '#22c55e' }}>Redline</td>
                          <td style={{ ...styles.tableCell, color: '#ef4444' }}>{result.redline}</td>
                          <td style={styles.tableCell}>{Math.round(result.redline * config.stroke_in / 6)}</td>
                          <td style={styles.tableCell}>{Math.round(result.redline * config.stroke_in * Math.PI / 12)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Camshaft Description - Editable inputs */}
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>Camshaft Description</div>
                    <div style={{ fontSize: '12px' }}>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Type:</span>
                        <select
                          style={{ ...styles.input, width: '180px', fontSize: '11px' }}
                          value={config.camshaftType || 'normal_flat_tappet'}
                          onChange={e => onCamTypeChange(e.target.value)}
                        >
                          <option value="overhead_cam">Overhead Cam</option>
                          <option value="roller">Roller Cam & Lifter</option>
                          <option value="mushroom_tappet">Mushroom Tappet</option>
                          <option value="high_rate_flat_tappet">High Rate-of-Lift Flat Tappet</option>
                          <option value="normal_flat_tappet">Normal Flat Tappet & Solid Lifter</option>
                          <option value="hydraulic_roller">Hydraulic Roller Cam & Lifter</option>
                          <option value="hydraulic_flat_tappet">Normal Hydraulic Cam & Lifter</option>
                        </select>
                      </div>
                      <div style={styles.inputRow}>
                        <label style={styles.label}>Intake Duration @ .050" - deg</label>
                        <input
                          type="number"
                          style={{ ...styles.input, width: '60px', color: 'var(--color-primary)', fontWeight: 'bold' }}
                          value={config.intakeDuration050_deg || 264}
                          onChange={e => updateConfig({ intakeDuration050_deg: parseFloat(e.target.value) || 264 })}
                        />
                      </div>
                      <div style={styles.inputRow}>
                        <label style={styles.label}>Intake Lobe Centerline - deg</label>
                        <input
                          type="number"
                          style={{ ...styles.input, width: '60px' }}
                          value={config.intakeLobeCenterline_deg || 105}
                          onChange={e => updateConfig({ intakeLobeCenterline_deg: parseFloat(e.target.value) || 105 })}
                        />
                      </div>
                      <div style={styles.inputRow}>
                        <label style={styles.label}>Maximum Valve Lift - inch</label>
                        <input
                          type="number"
                          style={{ ...styles.input, width: '60px' }}
                          value={config.maxIntakeValveLift_in || 0.55}
                          onChange={e => updateConfig({ maxIntakeValveLift_in: parseFloat(e.target.value) || 0.55 })}
                          step={0.001}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flow Details Table */}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>
                    Data @ {getCurrentRPM().toLocaleString()} RPM - {selectedRPM === 'peakTQ' ? 'Peak TQ' : selectedRPM === 'peakHP' ? 'Peak HP' : selectedRPM === 'shift' ? 'Shift' : 'Redline'}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeaderRow}>
                          <th style={styles.tableHeader}>Event</th>
                          <th style={styles.tableHeader}>deg<br/>ATDC</th>
                          <th style={styles.tableHeader}>Valve Lift<br/>inch</th>
                          <th style={styles.tableHeader}>Flow Area<br/>sq in</th>
                          <th style={{ ...styles.tableHeader, color: '#3b82f6' }}>Piston Speed<br/>FPM</th>
                          <th style={{ ...styles.tableHeader, color: '#ef4444' }}>Flow Demand<br/>CFM</th>
                          <th style={{ ...styles.tableHeader, color: '#22c55e' }}>Flowbench Test<br/>Vel FPS</th>
                          <th style={{ ...styles.tableHeader, color: '#22c55e' }}>inH2O</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flowDetails.map((p, i) => {
                          // Calculate flowbench test values (simplified)
                          const flowVel = p.valveLift_in > 0.05 ? Math.round(p.flowVelocity_fps) : null;
                          const flowInH2O = p.valveLift_in > 0.05 && p.flowDemand_cfm > 0 ? Math.round(Math.pow(p.flowDemand_cfm / 100, 2) * 10) : null;
                          
                          return (
                            <tr key={i} style={{
                              ...styles.tableRow,
                              backgroundColor: p.eventLabel.includes('Max Lift') ? 'rgba(59, 130, 246, 0.1)' : 
                                             p.eventLabel.includes('Max Piston') ? 'rgba(239, 68, 68, 0.1)' : undefined
                            }}>
                              <td style={{ ...styles.tableCell, fontSize: '10px', color: 'var(--color-muted)' }}>{p.eventLabel}</td>
                              <td style={styles.tableCell}>{p.angle_deg.toFixed(1)}</td>
                              <td style={styles.tableCell}>{p.valveLift_in.toFixed(3)}</td>
                              <td style={styles.tableCell}>{p.flowArea_sqin.toFixed(3)}</td>
                              <td style={{ ...styles.tableCell, color: '#3b82f6' }}>{Math.round(p.pistonSpeed_fpm)}</td>
                              <td style={{ ...styles.tableCell, color: '#ef4444' }}>{Math.round(p.flowDemand_cfm)}</td>
                              <td style={{ ...styles.tableCell, color: '#22c55e' }}>{flowVel !== null ? flowVel : '--'}</td>
                              <td style={{ ...styles.tableCell, color: '#22c55e' }}>{flowInH2O !== null ? flowInH2O : '--'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Flow Details Graph */}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>
                    <span style={{ color: '#3b82f6' }}>Flow Area</span>, <span style={{ color: '#ef4444' }}>Piston Demand</span> & <span style={{ color: '#22c55e' }}>Flowbench Velocity</span> vs Angle
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={flowDetails}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="angle_deg" 
                        label={{ value: 'Crank Angle (deg ATDC)', position: 'insideBottom', offset: -5 }}
                        domain={['dataMin', 'dataMax']}
                      />
                      <YAxis 
                        yAxisId="left"
                        label={{ value: 'Flow Area / Demand', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        label={{ value: 'Velocity (FPS)', angle: 90, position: 'insideRight' }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="flowArea_sqin"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Flow Area (sq in)"
                        dot={false}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="flowDemand_cfm"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="Piston Demand (CFM)"
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="flowVelocity_fps"
                        stroke="#22c55e"
                        strokeWidth={2}
                        name="Flow Velocity (FPS)"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {/* Recommendations Tab */}
            {activeTab === 'recommendations' && hasProAccess && recommendations && (
              <>
                {/* Intake System Recommendations */}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>Intake System:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Intake Valve Lift - inch</span>
                        <span style={styles.resultValue}>{recommendations.intakeValveLift_in.toFixed(3)}</span>
                      </div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Minimum Flow Area - sq inch</span>
                        <span style={styles.resultValue}>{recommendations.intakeMinFlowArea_sqin.toFixed(2)}</span>
                      </div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Total Intake Track Length - inch</span>
                        <span style={styles.resultValue}>{recommendations.intakeTrackLength_in.toFixed(2)}</span>
                      </div>
                    </div>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Maximum Flow Area - sq inch</span>
                        <span style={styles.resultValue}>{recommendations.intakeMaxFlowArea_sqin.toFixed(2)}</span>
                      </div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Total Intake Track Volume - c.c.</span>
                        <span style={styles.resultValue}>{recommendations.intakeTrackVolume_cc.toFixed(0)}</span>
                      </div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Plenum Volume - cubic inch</span>
                        <span style={styles.resultValue}>{recommendations.intakePlenumVolume_ci.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exhaust Port */}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>Exhaust Port:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Exhaust Flow - CFM @28.0 inches H2O,</span>
                        <span style={styles.resultValue}>{recommendations.exhaustFlow_cfm.toFixed(0)}</span>
                      </div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>@4.00 inch Bore Diameter</span>
                        <span style={styles.resultValue}>{recommendations.exhaustFlow_pctIntake.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Exhaust Valve Diameter - inch</span>
                        <span style={styles.resultValue}>{recommendations.exhaustValveDiaMin_in.toFixed(2)}-{recommendations.exhaustValveDiaMax_in.toFixed(2)}</span>
                      </div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Exhaust Valve Lift - inch</span>
                        <span style={styles.resultValue}>{recommendations.exhaustValveLift_in.toFixed(3)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginTop: '8px' }}>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Minimum Flow Area - sq inch</span>
                        <span style={styles.resultValue}>{recommendations.exhaustMinFlowArea_sqin.toFixed(2)}</span>
                      </div>
                    </div>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Maximum Flow Area - sq inch</span>
                        <span style={styles.resultValue}>{recommendations.exhaustMaxFlowArea_sqin.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exhaust System */}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>Exhaust System:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Primary Tube Length - inch</span>
                        <span style={styles.resultValue}>{recommendations.exhaustPrimaryLength_in.toFixed(1)}</span>
                      </div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Primary Tube Diameter - inch</span>
                        <span style={styles.resultValue}>{recommendations.exhaustPrimaryDia_in.toFixed(3)}</span>
                      </div>
                    </div>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Collector Diameter - inch</span>
                        <span style={styles.resultValue}>{recommendations.exhaustCollectorDia_in.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Camshaft */}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>Camshaft:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Lobe Separation Angle - deg</span>
                        <span style={styles.resultValue}>{recommendations.lobeSeparationAngle_deg.toFixed(0)}</span>
                      </div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Intake Lobe Centerline - deg</span>
                        <span style={styles.resultValue}>{recommendations.intakeLobeCenterline_deg.toFixed(0)}</span>
                      </div>
                    </div>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Exhaust Duration @ .050 inch - deg</span>
                        <span style={styles.resultValue}>{recommendations.exhaustDuration_deg.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </>
            )}

            {/* ============================================================ */}
            {/* Worksheet Tabs                                               */}
            {/* ============================================================ */}

            {/* Carb CFM Worksheet (VB6: CARBCFM.FRM — frmCarb) */}
            {activeTab === 'ws_carb' && (() => {
              const tvLimitsP = venturiDiaLimits(carbWS.throttleDiaPrimary);
              const tvLimitsS = venturiDiaLimits(carbWS.throttleDiaSecondary);
              return (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Throttle CFM @ 1.5" Hg Worksheet</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Primary */}
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>Primary</div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Number of Throttle Bores</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={carbWSTxt.numBoresPrimary}
                        onChange={e => setCarbWSTxt(p => ({ ...p, numBoresPrimary: e.target.value }))}
                        onBlur={e => commitCarbWSField('numBoresPrimary', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { commitCarbWSField('numBoresPrimary', (e.target as HTMLInputElement).value); } }}
                      />
                    </div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Throttle Diameter - inches</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={carbWSTxt.throttleDiaPrimary}
                        onChange={e => setCarbWSTxt(p => ({ ...p, throttleDiaPrimary: e.target.value }))}
                        onBlur={e => commitCarbWSField('throttleDiaPrimary', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { commitCarbWSField('throttleDiaPrimary', (e.target as HTMLInputElement).value); } }}
                      />
                    </div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Venturi Diameter - inches</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={carbWSTxt.venturiDiaPrimary}
                        onChange={e => setCarbWSTxt(p => ({ ...p, venturiDiaPrimary: e.target.value }))}
                        onBlur={e => commitCarbWSField('venturiDiaPrimary', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { commitCarbWSField('venturiDiaPrimary', (e.target as HTMLInputElement).value); } }}
                      />
                      <span style={{ fontSize: '10px', color: 'var(--color-muted)' }}>
                        range: {formatDia(tvLimitsP.min)} – {formatDia(tvLimitsP.max)}
                      </span>
                    </div>
                  </div>
                  {/* Secondary */}
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>Secondary</div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Number of Throttle Bores</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={carbWSTxt.numBoresSecondary}
                        onChange={e => setCarbWSTxt(p => ({ ...p, numBoresSecondary: e.target.value }))}
                        onBlur={e => commitCarbWSField('numBoresSecondary', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { commitCarbWSField('numBoresSecondary', (e.target as HTMLInputElement).value); } }}
                      />
                    </div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Throttle Diameter - inches</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={carbWSTxt.throttleDiaSecondary}
                        onChange={e => setCarbWSTxt(p => ({ ...p, throttleDiaSecondary: e.target.value }))}
                        onBlur={e => commitCarbWSField('throttleDiaSecondary', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { commitCarbWSField('throttleDiaSecondary', (e.target as HTMLInputElement).value); } }}
                        disabled={carbWS.numBoresSecondary === 0}
                      />
                    </div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Venturi Diameter - inches</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={carbWSTxt.venturiDiaSecondary}
                        onChange={e => setCarbWSTxt(p => ({ ...p, venturiDiaSecondary: e.target.value }))}
                        onBlur={e => commitCarbWSField('venturiDiaSecondary', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { commitCarbWSField('venturiDiaSecondary', (e.target as HTMLInputElement).value); } }}
                        disabled={carbWS.numBoresSecondary === 0}
                      />
                      {carbWS.numBoresSecondary > 0 && (
                        <span style={{ fontSize: '10px', color: 'var(--color-muted)' }}>
                          range: {formatDia(tvLimitsS.min)} – {formatDia(tvLimitsS.max)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={styles.inputRow}>
                  <label style={styles.label}>Throttle Style</label>
                  <select
                    style={styles.select}
                    value={carbWS.throttleType}
                    onChange={e => setCarbWS(prev => ({ ...prev, throttleType: e.target.value as ThrottleType }))}
                  >
                    <option value="butterfly">Butterfly</option>
                    <option value="slide">Slide Valve</option>
                  </select>
                </div>
                <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '12px', paddingTop: '8px' }}>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Throttle CFM @ 1.5" Hg</span>
                    <span style={{ ...styles.resultValue, fontSize: '16px', fontWeight: 'bold' }}>
                      {formatCfm(carbWSResult.cfmTotal)}
                    </span>
                  </div>
                  {carbWS.numBoresSecondary > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                      Primary: {formatCfm(carbWSResult.cfmPrimary)} CFM &nbsp;|&nbsp; Secondary: {formatCfm(carbWSResult.cfmSecondary)} CFM
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                    Throttle CFM @ 3.0" Hg = {formatCfm(carbWSResult.cfmAt3inHg)}
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <button
                    style={{ ...styles.tabButton, padding: '6px 16px', fontSize: '12px' }}
                    onClick={applyCarbWSToMain}
                    title="VB6: double-click lblWSCarb transfers value to main form Throttle CFM input"
                  >
                    Use this value ({formatCfm(carbWSResult.cfmTotal)} CFM)
                  </button>
                </div>
              </div>
              );
            })()}

            {/* Intake Flow Worksheet (VB6: CSAREA.FRM + MAXFLOW.FRM) */}
            {activeTab === 'ws_intake' && (
              <div style={styles.section}>
                {/* ---- Intake Port Flow sub-worksheet (VB6: MAXFLOW.FRM) ---- */}
                <div style={styles.sectionTitle}>
                  Intake Port Flow @ {formatValue(constraints.deltaP)} inch H2O Worksheet
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Minimum Cross-section Area - sq inch</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={intakeFlowTxt.csArea}
                        onChange={e => setIntakeFlowTxt(p => ({ ...p, csArea: e.target.value }))}
                        onBlur={e => commitIntakeFlowField('csArea', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { commitIntakeFlowField('csArea', (e.target as HTMLInputElement).value); } }}
                      />
                    </div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Intake Flow Velocity - ft/sec</label>
                      <input
                        type="text"
                        style={{ ...styles.input, backgroundColor: '#2a2a2a' }}
                        value={intakeFlowTxt.flowVel}
                        onChange={e => setIntakeFlowTxt(p => ({ ...p, flowVel: e.target.value }))}
                        onBlur={e => commitIntakeFlowField('flowVel', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { commitIntakeFlowField('flowVel', (e.target as HTMLInputElement).value); } }}
                      />
                    </div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Intake Flow Flux - CFM/sq inch</label>
                      <input
                        type="text"
                        style={{ ...styles.input, backgroundColor: '#2a2a2a' }}
                        value={intakeFlowTxt.flowFlux}
                        onChange={e => setIntakeFlowTxt(p => ({ ...p, flowFlux: e.target.value }))}
                        onBlur={e => commitIntakeFlowField('flowFlux', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { commitIntakeFlowField('flowFlux', (e.target as HTMLInputElement).value); } }}
                      />
                    </div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Flow Velocity Index - %</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={intakeFlowTxt.fvIndex}
                        onChange={e => setIntakeFlowTxt(p => ({ ...p, fvIndex: e.target.value }))}
                        onBlur={e => commitIntakeFlowField('fvIndex', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { commitIntakeFlowField('fvIndex', (e.target as HTMLInputElement).value); } }}
                      />
                    </div>
                  </div>
                  <div>
                    <div style={styles.resultRow}>
                      <span style={styles.resultLabel}>Flow Velocity (ft/sec)</span>
                      <span style={styles.resultValue}>{formatDec1(intakeFlowResult.flowVel)}</span>
                    </div>
                    <div style={styles.resultRow}>
                      <span style={styles.resultLabel}>Flow Flux (CFM/sq in)</span>
                      <span style={styles.resultValue}>{formatDec1(intakeFlowResult.flowFlux)}</span>
                    </div>
                    <div style={styles.resultRow}>
                      <span style={styles.resultLabel}>Flow Velocity Index (%)</span>
                      <span style={styles.resultValue}>{formatDec1(intakeFlowResult.fvIndex)}</span>
                    </div>
                    <div style={{ ...styles.resultRow, borderTop: '1px solid var(--color-border)', marginTop: '8px', paddingTop: '8px' }}>
                      <span style={{ ...styles.resultLabel, fontWeight: 'bold' }}>Maximum Intake Port Flow (CFM)</span>
                      <span style={{ ...styles.resultValue, fontWeight: 'bold' }}>{formatValue(constraints.maxInFlow)}</span>
                    </div>
                  </div>
                </div>

                {/* ---- Minimum Cross-section Area sub-worksheet (VB6: CSAREA.FRM) ---- */}
                <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '16px', paddingTop: '12px' }}>
                  <div style={{ ...styles.sectionTitle, fontSize: '13px' }}>
                    Minimum Cross-section Area Worksheet
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <div style={styles.inputRow}>
                        <label style={styles.label}>Valve Seat Throat Diameter - inch</label>
                        <input
                          type="text"
                          style={styles.input}
                          value={intakeCSTxt.seatDia}
                          onChange={e => setIntakeCSTxt(p => ({ ...p, seatDia: e.target.value }))}
                          onBlur={e => commitIntakeCSField('seatDia', e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { commitIntakeCSField('seatDia', (e.target as HTMLInputElement).value); } }}
                        />
                      </div>
                      <div style={styles.inputRow}>
                        <label style={styles.label}>Valve Seat Throat Percentage - %</label>
                        <input
                          type="text"
                          style={styles.input}
                          value={intakeCSTxt.seatPer}
                          onChange={e => setIntakeCSTxt(p => ({ ...p, seatPer: e.target.value }))}
                          onBlur={e => commitIntakeCSField('seatPer', e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { commitIntakeCSField('seatPer', (e.target as HTMLInputElement).value); } }}
                        />
                      </div>
                      <div style={styles.inputRow}>
                        <label style={styles.label}>Valve Seat Angle - degree</label>
                        <input
                          type="text"
                          style={styles.input}
                          value={intakeCSTxt.vsAngle}
                          onChange={e => setIntakeCSTxt(p => ({ ...p, vsAngle: e.target.value }))}
                          onBlur={e => commitIntakeCSField('vsAngle', e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { commitIntakeCSField('vsAngle', (e.target as HTMLInputElement).value); } }}
                        />
                      </div>
                    </div>
                    <div>
                      <div style={styles.inputRow}>
                        <label style={styles.label}>Valve Seat Width - inch</label>
                        <input
                          type="text"
                          style={styles.input}
                          value={intakeCSTxt.vsWidth}
                          onChange={e => setIntakeCSTxt(p => ({ ...p, vsWidth: e.target.value }))}
                          onBlur={e => commitIntakeCSField('vsWidth', e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { commitIntakeCSField('vsWidth', (e.target as HTMLInputElement).value); } }}
                        />
                      </div>
                      <div style={styles.inputRow}>
                        <label style={styles.label}>Valve Stem Diameter - inch</label>
                        <input
                          type="text"
                          style={styles.input}
                          value={intakeCSTxt.stemDia}
                          onChange={e => setIntakeCSTxt(p => ({ ...p, stemDia: e.target.value }))}
                          onBlur={e => commitIntakeCSField('stemDia', e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { commitIntakeCSField('stemDia', (e.target as HTMLInputElement).value); } }}
                        />
                      </div>
                      <div style={styles.inputRow}>
                        <label style={styles.label}>Maximum Intake Valve Lift - inch</label>
                        <input
                          type="text"
                          style={styles.input}
                          value={intakeCSTxt.valveLift}
                          onChange={e => setIntakeCSTxt(p => ({ ...p, valveLift: e.target.value }))}
                          onBlur={e => commitIntakeCSField('valveLift', e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { commitIntakeCSField('valveLift', (e.target as HTMLInputElement).value); } }}
                        />
                      </div>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={styles.resultRow}>
                      <span style={styles.resultLabel}>Valve Seat Throat Area - sq inch</span>
                      <span style={styles.resultValue}>{formatDim3(intakeWSCSArea)}</span>
                    </div>
                    <button
                      style={{ ...styles.tabButton, padding: '6px 16px', fontSize: '12px' }}
                      onClick={applyWSCSAreaToFlow}
                      title="VB6: double-click lblWSCSArea transfers value to Intake Port Flow csArea"
                    >
                      Use this area ({formatDim3(intakeWSCSArea)} sq in)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CSA Calculator (VB6: CSCalc.frm — frmCSCalc) */}
            {activeTab === 'ws_csa' && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Cross-section Area Calculator</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Circular Port (VB6: Frame1, gc_C(0..2), CalcCir) */}
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>Circular Area Worksheet</div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Diameter</label>
                      <input
                        type="text" style={styles.input} value={csaTxt.cDia}
                        onChange={e => setCsaTxt(p => ({ ...p, cDia: e.target.value }))}
                        onBlur={e => commitCSAField('circular', 'diameter', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCSAField('circular', 'diameter', (e.target as HTMLInputElement).value); }}
                      />
                    </div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Stem Diameter</label>
                      <input
                        type="text" style={styles.input} value={csaTxt.cStem}
                        onChange={e => setCsaTxt(p => ({ ...p, cStem: e.target.value }))}
                        onBlur={e => commitCSAField('circular', 'stemDiameter', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCSAField('circular', 'stemDiameter', (e.target as HTMLInputElement).value); }}
                      />
                    </div>
                    <div style={styles.resultRow}>
                      <span style={styles.resultLabel}>Cross-section Area</span>
                      <span style={styles.resultValue}>{formatArea(csaResults.circularArea)}</span>
                    </div>
                  </div>
                  {/* Elliptical Port (VB6: Frame2, gc_E(0..3), CalcEll) */}
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>Elliptical Area Worksheet</div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Major Diameter</label>
                      <input
                        type="text" style={styles.input} value={csaTxt.eMajor}
                        onChange={e => setCsaTxt(p => ({ ...p, eMajor: e.target.value }))}
                        onBlur={e => commitCSAField('elliptical', 'majorDiameter', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCSAField('elliptical', 'majorDiameter', (e.target as HTMLInputElement).value); }}
                      />
                    </div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Minor Diameter</label>
                      <input
                        type="text" style={styles.input} value={csaTxt.eMinor}
                        onChange={e => setCsaTxt(p => ({ ...p, eMinor: e.target.value }))}
                        onBlur={e => commitCSAField('elliptical', 'minorDiameter', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCSAField('elliptical', 'minorDiameter', (e.target as HTMLInputElement).value); }}
                      />
                    </div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Stem Diameter</label>
                      <input
                        type="text" style={styles.input} value={csaTxt.eStem}
                        onChange={e => setCsaTxt(p => ({ ...p, eStem: e.target.value }))}
                        onBlur={e => commitCSAField('elliptical', 'stemDiameter', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCSAField('elliptical', 'stemDiameter', (e.target as HTMLInputElement).value); }}
                      />
                    </div>
                    <div style={styles.resultRow}>
                      <span style={styles.resultLabel}>Cross-section Area</span>
                      <span style={styles.resultValue}>{formatArea(csaResults.ellipticalArea)}</span>
                    </div>
                  </div>
                  {/* Rectangular Port (VB6: Frame3, gc_R(0..4), CalcRec) */}
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>Rectangular Area Worksheet</div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Height</label>
                      <input
                        type="text" style={styles.input} value={csaTxt.rHeight}
                        onChange={e => setCsaTxt(p => ({ ...p, rHeight: e.target.value }))}
                        onBlur={e => commitCSAField('rectangular', 'height', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCSAField('rectangular', 'height', (e.target as HTMLInputElement).value); }}
                      />
                    </div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Width</label>
                      <input
                        type="text" style={styles.input} value={csaTxt.rWidth}
                        onChange={e => setCsaTxt(p => ({ ...p, rWidth: e.target.value }))}
                        onBlur={e => commitCSAField('rectangular', 'width', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCSAField('rectangular', 'width', (e.target as HTMLInputElement).value); }}
                      />
                    </div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Corner Diameter</label>
                      <input
                        type="text" style={styles.input} value={csaTxt.rCorner}
                        onChange={e => setCsaTxt(p => ({ ...p, rCorner: e.target.value }))}
                        onBlur={e => commitCSAField('rectangular', 'cornerDiameter', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCSAField('rectangular', 'cornerDiameter', (e.target as HTMLInputElement).value); }}
                      />
                    </div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Stem Diameter</label>
                      <input
                        type="text" style={styles.input} value={csaTxt.rStem}
                        onChange={e => setCsaTxt(p => ({ ...p, rStem: e.target.value }))}
                        onBlur={e => commitCSAField('rectangular', 'stemDiameter', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCSAField('rectangular', 'stemDiameter', (e.target as HTMLInputElement).value); }}
                      />
                    </div>
                    <div style={styles.resultRow}>
                      <span style={styles.resultLabel}>Cross-section Area</span>
                      <span style={styles.resultValue}>{formatArea(csaResults.rectangularArea)}</span>
                    </div>
                  </div>
                  {/* Annular Area (VB6: Frame4, gc_A(0..3), CalcAnn) */}
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>Annular Area Worksheet</div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Outer Diameter</label>
                      <input
                        type="text" style={styles.input} value={csaTxt.aOuter}
                        onChange={e => setCsaTxt(p => ({ ...p, aOuter: e.target.value }))}
                        onBlur={e => commitCSAField('annular', 'outerDiameter', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCSAField('annular', 'outerDiameter', (e.target as HTMLInputElement).value); }}
                      />
                    </div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Inner Diameter</label>
                      <input
                        type="text" style={styles.input} value={csaTxt.aInner}
                        onChange={e => setCsaTxt(p => ({ ...p, aInner: e.target.value }))}
                        onBlur={e => commitCSAField('annular', 'innerDiameter', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCSAField('annular', 'innerDiameter', (e.target as HTMLInputElement).value); }}
                      />
                    </div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Stem Diameter</label>
                      <input
                        type="text" style={styles.input} value={csaTxt.aStem}
                        onChange={e => setCsaTxt(p => ({ ...p, aStem: e.target.value }))}
                        onBlur={e => commitCSAField('annular', 'stemDiameter', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCSAField('annular', 'stemDiameter', (e.target as HTMLInputElement).value); }}
                      />
                    </div>
                    <div style={styles.resultRow}>
                      <span style={styles.resultLabel}>Cross-section Area</span>
                      <span style={styles.resultValue}>{formatArea(csaResults.annularArea)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </Page>
  );
}
// Styles
// ============================================================================

const styles = {
  container: {
    padding: '16px',
    maxWidth: '100%',
    margin: '0 auto',
    height: 'calc(100vh - 120px)',
    overflow: 'hidden',
  } as React.CSSProperties,
  header: {
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
  } as React.CSSProperties,
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    height: 'calc(100% - 100px)',
  } as React.CSSProperties,
  card: {
    backgroundColor: 'var(--color-bg)',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
  } as React.CSSProperties,
  cardLarge: {
    gridColumn: 'span 2',
  } as React.CSSProperties,
  cardTall: {
    gridRow: 'span 2',
  } as React.CSSProperties,
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '20px',
  } as React.CSSProperties,
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  } as React.CSSProperties,
  middleColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  } as React.CSSProperties,
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  } as React.CSSProperties,
  section: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: 'var(--shadow-sm)',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600' as const,
    marginBottom: '12px',
    color: 'var(--color-text)',
    borderBottom: '2px solid var(--color-primary)',
    paddingBottom: '6px',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  } as React.CSSProperties,
  label: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    minWidth: '100px',
    flex: '0 0 100px',
  } as React.CSSProperties,
  input: {
    padding: '4px 6px',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: '11px',
    width: '70px',
    backgroundColor: 'var(--color-input-bg)',
    color: 'var(--color-text)',
  } as React.CSSProperties,
  select: {
    padding: '4px 6px',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: '11px',
    flex: 1,
    backgroundColor: 'var(--color-input-bg)',
    color: 'var(--color-text)',
  } as React.CSSProperties,
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    borderBottom: '1px solid var(--color-border)',
  } as React.CSSProperties,
  resultLabel: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  resultValue: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--color-text)',
  } as React.CSSProperties,
  resultValueLarge: {
    fontSize: '24px',
    fontWeight: '700' as const,
    color: 'var(--color-primary)',
    margin: '4px 0',
  },
  resultValueMedium: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--color-text)',
  } as React.CSSProperties,
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  resultBox: {
    padding: '12px',
    backgroundColor: 'var(--color-background)',
    borderRadius: '6px',
    textAlign: 'center' as const,
    border: '1px solid var(--color-border)',
  },
  resultSubtext: {
    fontSize: '11px',
    color: 'var(--color-text-secondary)',
  },
  tabContainer: {
    display: 'flex',
    gap: '4px',
    marginBottom: '16px',
    borderBottom: '2px solid var(--color-border)',
    paddingBottom: '0',
  },
  tabButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '500' as const,
    border: 'none',
    borderBottom: '2px solid transparent',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '-2px',
  },
  tabButtonActive: {
    color: 'var(--color-primary)',
    borderBottomColor: 'var(--color-primary)',
    fontWeight: '600' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '12px',
  },
  tableHeaderRow: {
    backgroundColor: 'var(--color-background)',
    borderBottom: '2px solid var(--color-border)',
  },
  tableHeader: {
    padding: '8px',
    textAlign: 'left' as const,
    fontWeight: '600' as const,
    color: 'var(--color-text)',
  },
  tableRow: {
    borderBottom: '1px solid var(--color-border)',
  },
  tableCell: {
    padding: '6px 8px',
    color: 'var(--color-text)',
  },
};
