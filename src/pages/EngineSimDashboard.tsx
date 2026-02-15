/**
 * Engine Sim - Single Page Dashboard
 * Compact, no-scroll layout similar to ET Sim
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Page from '../shared/components/Page';
import { simulateEngine, type EngineSimConfig } from '../domain/physics/engine/engineAdapter';
import { generateVB6DynoCurve } from '../domain/physics/engine/vb6CurveGen';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calculator, Lock, FilePlus, FolderOpen, Save, Upload } from 'lucide-react';
import { CompressionRatioCalculator } from '../shared/components/CompressionRatioCalculator';
import { useCapabilities } from '../domain/config/useCapabilities';
import {
  calcMechDetails,
  calcFlowDetails,
  calcFlowDetailsGraph,
  calcFlowDetailsAxisInputs,
  calcRecommendations,
  type MechDetailPoint,
  type FlowDetailPoint,
  type FlowDetailGraphPoint,
  type FlowDetailsConfig,
  type EngineRecommendations,
} from '../domain/physics/engine/engineProDetails';
import { getCalculatedCamDefaults } from '../domain/physics/engine/camDefaults';
import {
  calcMechDetailsForRPM,
  calcPistonSpeedSummary,
  calcCrankingCompression,
  type PistonKinematicsPoint,
} from '../domain/physics/engine/vb6Kinematics';
import {
  calcGeometricRatios,
  formatVB6GeometricRatios,
} from '../domain/physics/engine/vb6GeometricRatios';
import {
  fmtCamDeg,
} from '../domain/physics/engine/engineProFormatters';
import {
  createEngineSimDocument,
  type EngineSimDocumentV1,
} from '../domain/physics/engine/engineSimDocument';
import { uploadEngFile } from '../domain/physics/engine/engineSimFileIO';
import { parseLegacyEngToConfig } from '../domain/physics/engine/engFileParser';
import {
  commitConfigField,
  commitCamTypeChange,
} from '../domain/physics/engine/engineConstraintBridge';
import {
  fmtLiters, fmtKw, fmtNm, fmtTqPerCid,
} from '../domain/physics/engine/engineUnitConversions';
import {
  listEngineSims,
  getEngineSim,
  createEngineSim,
  updateEngineSim,
  deleteEngineSim,
  type EngineSimListItem,
} from '../state/engineSims';
import { createEngineAsset, updateEngineAsset, getEngineAsset } from '../state/engineAssets';
import { createEngineFromSim, saveSavedEngine } from '../state/components';
import type { EngineResultSummary } from '../domain/library/engineAssets';
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
} from '../domain/physics/engine/worksheets/carbCfmWorksheet';
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
  calcFlowBenchWorksheet,
  estimateDefaultFlowbenchData,
  validateLiftOrder,
  hasValidFlowBenchData,
  hydrateFlowBenchFromConfig,
  normalizeFlowBenchForStorage,
  type FlowBenchSeatData,
  type FlowBenchContext,
  MAX_FLOW_BENCH_ROWS,
} from '../domain/physics/engine/worksheets/flowBenchWorksheet';
import {
  flowBenchXAxis,
  flowBenchFlowYAxis,
  flowBenchFviYAxis,
  flowDetailsXAxis,
  flowDetailsLeftYAxis,
  flowDetailsAreaYAxis,
  flowBenchDenseInterpolation,
} from '../shared/utils/chartScaling';
import {
  vb6Lift, vb6Flow, vb6Area3, vb6Vel1, vb6Flux, vb6FVI,
  vb6AngleInt, vb6Dim3, vb6Area, vb6Int,
  vb6Depth, vb6Speed,
  vb6Fixed, vb6PerCID, vb6MaxFlow,
} from '../shared/utils/vb6Format';

export function EngineSimDashboard() {
  const { can } = useCapabilities();
  const isProMode = can('engine.proMode');

  // Default configuration
  const [config, setConfig] = useState<EngineSimConfig>({
    numCylinders: 8,
    layout: 'vee',
    bore_in: 4.030,
    stroke_in: 3.480,
    rodLength_in: 5.850,
    compressionRatio: 12.9,
    camshaftType: 'normal_flat_tappet',
    intakeDuration050_deg: 264,
    throttleCFM_at_1_5inHg: 750,
    isEFI: false,
    fuelType: 'gasoline',
    intakeManifoldType: 'plenum',
    runnerStyle: 'curved',
    intakeManifoldFlowFactor_pct: 96.0,
    numIntakeValvesPerCyl: 1,
    intakeValveDia_in: 2.050,
    maxIntakeFlow_cfm: 250.0,
    flowTestPressure_inH2O: 28.0,
    flowTestBoreDia_in: 4.000,
    maxIntakeValveLift_in: 0.550,
  });

  const [showCRCalculator, setShowCRCalculator] = useState(false);
  const [showCarbWSModal, setShowCarbWSModal] = useState(false);
  const [showIntakeFlowModal, setShowIntakeFlowModal] = useState(false);
  const [showCSAModal, setShowCSAModal] = useState(false);
  const [proUpgradeTab, setProUpgradeTab] = useState<string | null>(null);
  type WsTab = 'dyno_data' | 'flow_bench' | 'mech_details' | 'flow_details' | 'recommendations';
  const [wsTab, setWsTab] = useState<WsTab>('dyno_data');
  const [notes, setNotes] = useState('');

  // Escape key + body scroll lock for ALL modals (worksheets + CR calculator)
  const anyModalOpen = showCarbWSModal || showIntakeFlowModal || showCRCalculator || showCSAModal;
  useEffect(() => {
    if (!anyModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCarbWSModal(false);
        setShowIntakeFlowModal(false);
        setShowCSAModal(false);
        setShowCRCalculator(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [anyModalOpen]);

  // Focus trap helper: keeps Tab cycling inside a modal container.
  // Filters out disabled elements; handles empty containers gracefully.
  function getFocusableElements(container: HTMLElement): HTMLElement[] {
    const all = container.querySelectorAll<HTMLElement>(
      'input:not(:disabled), button:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"]):not(:disabled)'
    );
    return Array.from(all).filter(el => el.offsetParent !== null); // skip hidden
  }

  const trapFocus = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const focusable = getFocusableElements(e.currentTarget);
    if (focusable.length === 0) { e.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);


  // --- File I/O state (DB-backed) ---
  const [docName, setDocName] = useState<string>('Unsaved Simulation');
  const [docId, setDocId] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileBusy, setFileBusy] = useState(false);
  const [savedConfigJSON, setSavedConfigJSON] = useState<string>(() => JSON.stringify(config));
  const isDirty = useMemo(() => JSON.stringify(config) !== savedConfigJSON, [config, savedConfigJSON]);
  // Library panel state
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState<EngineSimListItem[]>([]);
  const [showSaveAsPrompt, setShowSaveAsPrompt] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  // Engine asset ID — tracks the library asset linked to this sim document
  const [engineAssetId, setEngineAssetId] = useState<string | null>(null);
  // SavedEngine ID — tracks the vehicle component linked to this sim document
  const [savedEngineId, setSavedEngineId] = useState<string | null>(null);
  // Save feedback toast
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const saveToastTimer = useRef<ReturnType<typeof setTimeout>>();

  const markClean = useCallback((cfg: EngineSimConfig) => {
    setSavedConfigJSON(JSON.stringify(cfg));
  }, []);

  const confirmIfDirty = useCallback((): boolean => {
    if (!isDirty) return true;
    return window.confirm('You have unsaved changes. Discard them?');
  }, [isDirty]);

  const buildDoc = useCallback((): EngineSimDocumentV1 => {
    // Normalize flowbench arrays to active-only (trim trailing zeros) before save
    const normalized = normalizeFlowBenchForStorage(config.flowBenchLifts_in, config.flowBenchFlows_cfm);
    const saveConfig: EngineSimConfig = normalized
      ? { ...config, flowBenchLifts_in: normalized.lifts, flowBenchFlows_cfm: normalized.flows }
      : config;
    return createEngineSimDocument(saveConfig, docName !== 'Unsaved Simulation' ? docName : undefined, notes || undefined);
  }, [config, docName, notes]);

  const DEFAULT_CONFIG: EngineSimConfig = useMemo(() => ({
    numCylinders: 8, layout: 'vee', bore_in: 4.030, stroke_in: 3.480,
    rodLength_in: 5.850, compressionRatio: 12.9, camshaftType: 'normal_flat_tappet',
    intakeDuration050_deg: 264, throttleCFM_at_1_5inHg: 750, isEFI: false,
    fuelType: 'gasoline', intakeManifoldType: 'plenum', runnerStyle: 'curved',
    intakeManifoldFlowFactor_pct: 96.0, numIntakeValvesPerCyl: 1,
    intakeValveDia_in: 2.050, maxIntakeFlow_cfm: 250.0,
    flowTestPressure_inH2O: 28.0, flowTestBoreDia_in: 4.000, maxIntakeValveLift_in: 0.550,
  }), []);

  // --- File operation handlers (DB-backed) ---
  const handleNew = useCallback(() => {
    if (!confirmIfDirty()) return;
    setConfig(DEFAULT_CONFIG);
    setNotes('');
    setDocName('Unsaved Simulation');
    setDocId(null);
    setSavedEngineId(null);
    markClean(DEFAULT_CONFIG);
    setFileError(null);
    setWsTab('dyno_data');
    resetFlowBenchState();
  }, [confirmIfDirty, DEFAULT_CONFIG, markClean]);

  const handleOpenLibrary = useCallback(async () => {
    if (!confirmIfDirty()) return;
    setFileError(null);
    setFileBusy(true);
    try {
      const items = await listEngineSims();
      setLibraryItems(items);
      setShowLibrary(true);
    } catch (e: unknown) {
      setFileError(e instanceof Error ? e.message : 'Failed to load library.');
    } finally {
      setFileBusy(false);
    }
  }, [confirmIfDirty]);

  const handleLoadFromLibrary = useCallback(async (id: string) => {
    setFileError(null);
    setFileBusy(true);
    try {
      const record = await getEngineSim(id);
      if (!record) { setFileError('Simulation not found.'); return; }
      const cfg = record.doc.config;
      setConfig(cfg);
      setNotes(record.doc.notes ?? '');
      setDocName(record.name);
      setDocId(record.id);
      setSavedEngineId(null);
      markClean(cfg);
      setShowLibrary(false);
      // Hydrate flowbench from saved data, or reset so auto-init generates defaults
      if (hasValidFlowBenchData(cfg.flowBenchLifts_in, cfg.flowBenchFlows_cfm).valid) {
        applyFlowBenchHydration(cfg);
      } else {
        resetFlowBenchState();
      }
    } catch (e: unknown) {
      setFileError(e instanceof Error ? e.message : 'Failed to load simulation.');
    } finally {
      setFileBusy(false);
    }
  }, [markClean]);

  const handleDeleteFromLibrary = useCallback(async (id: string) => {
    if (!window.confirm('Delete this simulation permanently?')) return;
    setFileError(null);
    try {
      await deleteEngineSim(id);
      setLibraryItems(prev => prev.filter(s => s.id !== id));
      if (docId === id) { setDocId(null); setDocName('Unsaved Simulation'); }
    } catch (e: unknown) {
      setFileError(e instanceof Error ? e.message : 'Failed to delete.');
    }
  }, [docId]);

  // Ref to hold syncEngineAsset so save handlers can call it without stale closures
  const syncAssetRef = useRef<((name: string) => number | undefined) | null>(null);

  const handleSave = useCallback(async () => {
    setFileError(null);
    if (!docId) {
      // No existing record — prompt for name (Save As)
      setSaveAsName(docName !== 'Unsaved Simulation' ? docName : '');
      setShowSaveAsPrompt(true);
      return;
    }
    setFileBusy(true);
    try {
      const doc = buildDoc();
      await updateEngineSim(docId, docName, doc);
      markClean(config);
      const rev = syncAssetRef.current?.(docName);
      clearTimeout(saveToastTimer.current);
      setSaveToast(rev ? `Updated Engine Library (rev ${rev})` : 'Saved to Engine Library');
      saveToastTimer.current = setTimeout(() => setSaveToast(null), 3000);
    } catch (e: unknown) {
      setFileError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setFileBusy(false);
    }
  }, [docId, docName, buildDoc, config, markClean]);

  const handleSaveAsConfirm = useCallback(async (name: string) => {
    setFileError(null);
    setFileBusy(true);
    setShowSaveAsPrompt(false);
    try {
      const doc = createEngineSimDocument(config, name, notes || undefined);
      const record = await createEngineSim(name, doc);
      setDocId(record.id);
      setDocName(record.name);
      markClean(config);
      const rev = syncAssetRef.current?.(name);
      clearTimeout(saveToastTimer.current);
      setSaveToast(rev ? `Updated Engine Library (rev ${rev})` : 'Saved to Engine Library');
      saveToastTimer.current = setTimeout(() => setSaveToast(null), 3000);
    } catch (e: unknown) {
      setFileError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setFileBusy(false);
    }
  }, [config, markClean]);

  const handleImportEng = useCallback(async () => {
    if (!confirmIfDirty()) return;
    setFileError(null);
    try {
      const file = await uploadEngFile();
      if (!file) return;
      const { config: parsed, description } = parseLegacyEngToConfig(file.text);
      setConfig(parsed);
      const name = description || file.fileName.replace(/\.[^.]+$/, '');
      setDocName(name);
      setDocId(null); // Not yet saved to DB
      // Mark dirty so user is prompted to Save
      setSavedConfigJSON('');
      // .eng files don't contain flowbench arrays; hydrate if present, else reset
      if (hasValidFlowBenchData(parsed.flowBenchLifts_in, parsed.flowBenchFlows_cfm).valid) {
        applyFlowBenchHydration(parsed);
      } else {
        resetFlowBenchState();
      }
    } catch (e: unknown) {
      setFileError(e instanceof Error ? e.message : 'Failed to import .eng file.');
    }
  }, [confirmIfDirty]);

  // --- Carb CFM Worksheet state ---
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

  function commitCarbWSField(field: keyof CarbWorksheetInputs, raw: string) {
    const parsed = parseNumericInput(raw);
    setCarbWS(prev => {
      const next = { ...prev };
      switch (field) {
        case 'numBoresPrimary': next.numBoresPrimary = clampNumBoresPrimary(parsed); break;
        case 'throttleDiaPrimary': {
          next.throttleDiaPrimary = clampThrottleDia(parsed);
          next.venturiDiaPrimary = clampVenturiDia(next.venturiDiaPrimary, next.throttleDiaPrimary);
          break;
        }
        case 'venturiDiaPrimary': next.venturiDiaPrimary = clampVenturiDia(parsed, next.throttleDiaPrimary); break;
        case 'numBoresSecondary': {
          next.numBoresSecondary = clampNumBoresSecondary(parsed);
          if (next.numBoresSecondary === 0) { next.throttleDiaSecondary = 0; next.venturiDiaSecondary = 0; }
          break;
        }
        case 'throttleDiaSecondary': {
          next.throttleDiaSecondary = clampThrottleDia(parsed);
          next.venturiDiaSecondary = clampVenturiDia(next.venturiDiaSecondary, next.throttleDiaSecondary);
          break;
        }
        case 'venturiDiaSecondary': next.venturiDiaSecondary = clampVenturiDia(parsed, next.throttleDiaSecondary); break;
        default: break;
      }
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

  function applyCarbWSToMain() {
    updateConfig({ throttleCFM_at_1_5inHg: carbWSResult.cfmTotal });
  }


  // --- Intake Flow Worksheet state ---
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
    flowVel: formatDec1(0), flowFlux: formatDec1(0), fvIndex: formatDec1(0),
  });

  const intakeVSTD = useMemo(
    () => calcVelStd(config.flowTestPressure_inH2O, config.numIntakeValvesPerCyl),
    [config.flowTestPressure_inH2O, config.numIntakeValvesPerCyl]
  );
  const intakeWSCSArea = useMemo(
    () => calcWSCSArea(intakeCS, { valveDia: config.intakeValveDia_in, noInValves: config.numIntakeValvesPerCyl }),
    [intakeCS, config.intakeValveDia_in, config.numIntakeValvesPerCyl]
  );
  const intakeFlowResult = useMemo(
    () => calcFlowStuff(config.maxIntakeFlow_cfm, intakeFlow.csArea, intakeVSTD),
    [config.maxIntakeFlow_cfm, intakeFlow.csArea, intakeVSTD]
  );

  function commitIntakeCSField(field: keyof CSAreaInputs, raw: string) {
    const parsed = parseWSInput(raw);
    setIntakeCS(prev => {
      const next = { ...prev };
      switch (field) {
        case 'seatDia': { next.seatDia = parsed; next.seatPer = calcSeatPer(next.seatDia, config.intakeValveDia_in); break; }
        case 'seatPer': { next.seatPer = clampSeatPer(parsed); next.seatDia = calcSeatDia(next.seatPer, config.intakeValveDia_in); break; }
        case 'vsAngle': next.vsAngle = clampVSAngle(parsed); break;
        case 'vsWidth': next.vsWidth = parsed; break;
        case 'stemDia': next.stemDia = parsed; break;
        case 'valveLift': next.valveLift = parsed; break;
      }
      setIntakeCSTxt({
        seatDia: formatDim3(next.seatDia), seatPer: formatDec1(next.seatPer),
        vsAngle: formatDec1(next.vsAngle), vsWidth: formatDim3(next.vsWidth),
        stemDia: formatDim3(next.stemDia), valveLift: formatDim3(next.valveLift),
      });
      return next;
    });
  }

  function applyWSCSAreaToFlow() {
    setIntakeFlow(prev => {
      const next = { ...prev, csArea: intakeWSCSArea };
      setIntakeFlowTxt(t => ({ ...t, csArea: formatDim3(next.csArea) }));
      return next;
    });
  }

  function commitIntakeFlowField(field: keyof FlowInputs, raw: string) {
    const parsed = parseWSInput(raw);
    setIntakeFlow(prev => {
      let next = { ...prev };
      switch (field) {
        case 'csArea': {
          next.csArea = parsed;
          const r = calcFlowStuff(config.maxIntakeFlow_cfm, next.csArea, intakeVSTD);
          next.flowFlux = r.flowFlux; next.flowVel = r.flowVel; next.fvIndex = r.fvIndex;
          const newSD = estSeatDia(next.csArea, config.numIntakeValvesPerCyl, intakeCS.stemDia);
          const newSP = calcSeatPer(newSD, config.intakeValveDia_in);
          setIntakeCS(p => {
            const u = { ...p, seatDia: newSD, seatPer: newSP };
            setIntakeCSTxt({ seatDia: formatDim3(u.seatDia), seatPer: formatDec1(u.seatPer), vsAngle: formatDec1(u.vsAngle), vsWidth: formatDim3(u.vsWidth), stemDia: formatDim3(u.stemDia), valveLift: formatDim3(u.valveLift) });
            return u;
          });
          break;
        }
        case 'flowVel': { const r = calcFromFlowVel(parsed, next.csArea, intakeVSTD); next = { ...next, ...r }; break; }
        case 'flowFlux': { const r = calcFromFlowFlux(parsed, next.csArea, intakeVSTD); next = { ...next, ...r }; break; }
        case 'fvIndex': { const r = calcFromFVIndex(clampFVIndex(parsed), next.csArea, intakeVSTD); next = { ...next, ...r }; break; }
      }
      setIntakeFlowTxt({ csArea: formatDim3(next.csArea), flowVel: formatDec1(next.flowVel), flowFlux: formatDec1(next.flowFlux), fvIndex: formatDec1(next.fvIndex) });
      return next;
    });
  }

  // --- Flow Bench Worksheet state (Pro only) ---
  const [fbLifts, setFbLifts] = useState<number[]>(() => []);
  const [fbFlows, setFbFlows] = useState<number[]>(() => []);
  const [fbLiftTxt, setFbLiftTxt] = useState<string[]>(() => Array(MAX_FLOW_BENCH_ROWS).fill(''));
  const [fbFlowTxt, setFbFlowTxt] = useState<string[]>(() => Array(MAX_FLOW_BENCH_ROWS).fill(''));
  const [fbInitialized, setFbInitialized] = useState(false);

  /**
   * Apply saved flowbench data from a loaded config into React state.
   * Used by Load/Import when config has valid flowbench arrays.
   * Does NOT propagate maxIntakeValveLift — saved data is user-entered.
   */
  function applyFlowBenchHydration(cfg: EngineSimConfig) {
    const h = hydrateFlowBenchFromConfig(
      cfg.flowBenchLifts_in!, cfg.flowBenchFlows_cfm!, vb6Lift,
    );
    setFbLifts(h.fbLifts);
    setFbFlows(h.fbFlows);
    setFbLiftTxt(h.fbLiftTxt);
    setFbFlowTxt(h.fbFlowTxt);
    setFbInitialized(true);  // prevents auto-init from overwriting
  }

  /**
   * Clear flowbench UI state so the auto-init useEffect will re-fire
   * and generate fresh defaults on the next render cycle.
   */
  function resetFlowBenchState() {
    setFbLifts([]);
    setFbFlows([]);
    setFbLiftTxt(Array(MAX_FLOW_BENCH_ROWS).fill(''));
    setFbFlowTxt(Array(MAX_FLOW_BENCH_ROWS).fill(''));
    setFbInitialized(false);  // triggers auto-init useEffect
  }

  const fbSeatData = useMemo<FlowBenchSeatData>(() => ({
    seatDia_in: config.seatDia_in ?? 1.794,
    seatPer: config.seatPer ?? 87.5,
    vsAngle_deg: config.vsAngle_deg ?? 45,
    vsWidth_in: config.vsWidth_in ?? 0.08,
    stemDia_in: config.stemDia_in ?? 0.344,
  }), [config.seatDia_in, config.seatPer, config.vsAngle_deg, config.vsWidth_in, config.stemDia_in]);

  const fbCtx = useMemo<FlowBenchContext>(() => ({
    valveDia_in: config.intakeValveDia_in,
    noInValves: config.numIntakeValvesPerCyl,
    deltaP_inH2O: config.flowTestPressure_inH2O,
    maxValveLift_in: config.maxIntakeValveLift_in ?? 0.55,
  }), [config.intakeValveDia_in, config.numIntakeValvesPerCyl, config.flowTestPressure_inH2O, config.maxIntakeValveLift_in]);

  const fbResult = useMemo(
    () => calcFlowBenchWorksheet(fbLifts, fbFlows, fbSeatData, fbCtx),
    [fbLifts, fbFlows, fbSeatData, fbCtx]
  );

  // VB6-style 5x linear interpolation for Flow Bench chart (FlowB.frm Graph2 lines 2276-2300).
  // Uses extracted utility so the same logic is unit-testable.
  const fbChartDense = useMemo(
    () => flowBenchDenseInterpolation(fbResult.rows),
    [fbResult],
  );

  // VB6-consistent axis domains for Flow Bench chart
  const fbChartAxes = useMemo(() => {
    const rows = fbResult.rows;
    if (rows.length < 2) return null;
    const lastLift = rows[rows.length - 1].lift_in;
    const maxFlow = rows[rows.length - 1].flow_cfm;
    const fviValues = rows.map(r => r.fvIndex_pct);
    const xAx = flowBenchXAxis(lastLift);
    const flowAx = flowBenchFlowYAxis(maxFlow);
    const fviAx = flowBenchFviYAxis(fviValues, flowAx.tickCount);
    return { xAx, flowAx, fviAx };
  }, [fbResult]);

  /**
   * Initialize flowbench with estimated default data (VB6 FlowB.frm Form_Load).
   *
   * @param propagateLift — When true AND the estimation adjusts maxValveLift
   *   upward (VB6 scaling > 1.1 logic), write the adjusted value back into
   *   config.maxIntakeValveLift_in.  This should ONLY be true on the initial
   *   auto-generation path (no user-entered rows exist).  The "Re-generate
   *   Defaults" button passes false so it never silently overwrites the
   *   user's configured max lift.
   */
  function initFlowBench(propagateLift: boolean) {
    const camTypeMap: Record<string, number> = {
      'overhead_cam': 0, 'roller': 1, 'mushroom_tappet': 2,
      'high_rate_flat_tappet': 3, 'normal_flat_tappet': 4,
      'hydraulic_roller': 5, 'hydraulic_flat_tappet': 6,
    };
    const camNum = camTypeMap[config.camshaftType] ?? 4;
    const currentLift = config.maxIntakeValveLift_in ?? 0.55;
    const { data, adjustedMaxLift_in } = estimateDefaultFlowbenchData(
      config.intakeValveDia_in, config.numIntakeValvesPerCyl,
      config.maxIntakeFlow_cfm, config.flowTestPressure_inH2O,
      fbSeatData, camNum, currentLift,
    );
    const lifts = data.map(p => p.lift);
    const flows = data.map(p => p.flow);
    setFbLifts(lifts);
    setFbFlows(flows);
    const lTxt = Array(MAX_FLOW_BENCH_ROWS).fill('');
    const fTxt = Array(MAX_FLOW_BENCH_ROWS).fill('');
    for (let i = 0; i < data.length; i++) {
      lTxt[i] = vb6Lift(data[i].lift);
      fTxt[i] = String(data[i].flow);
    }
    setFbLiftTxt(lTxt);
    setFbFlowTxt(fTxt);
    setFbInitialized(true);
    // VB6 FlowB.frm Form_Load adjusts gc_ValveLift upward when scaling > 1.1.
    // Only propagate on the initial auto-gen path (no user rows existed).
    const configUpdate: Partial<typeof config> = { flowBenchLifts_in: lifts, flowBenchFlows_cfm: flows };
    if (propagateLift && adjustedMaxLift_in !== currentLift) {
      configUpdate.maxIntakeValveLift_in = adjustedMaxLift_in;
    }
    updateConfig(configUpdate);
  }

  // Auto-initialize flowbench when no valid data exists (mount, New, Load w/o data, Import).
  // Fires whenever fbInitialized flips to false OR isProMode becomes true.
  useEffect(() => {
    if (!fbInitialized && isProMode) initFlowBench(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbInitialized, isProMode]);

  function commitFbLift(i: number, raw: string) {
    const val = parseFloat(raw) || 0;
    setFbLifts(prev => {
      const next = [...prev];
      while (next.length <= i) next.push(0);
      next[i] = val;
      const v = validateLiftOrder(next);
      if (!v.valid) { return prev; } // reject invalid
      updateConfig({ flowBenchLifts_in: next });
      return next;
    });
    setFbLiftTxt(prev => {
      const next = [...prev];
      next[i] = val > 0 ? vb6Lift(val) : '';
      return next;
    });
  }

  function commitFbFlow(i: number, raw: string) {
    const val = parseFloat(raw) || 0;
    setFbFlows(prev => {
      const next = [...prev];
      while (next.length <= i) next.push(0);
      next[i] = val;
      updateConfig({ flowBenchFlows_cfm: next });
      return next;
    });
    setFbFlowTxt(prev => {
      const next = [...prev];
      next[i] = val > 0 ? String(Math.round(val)) : '';
      return next;
    });
  }

  const updateConfig = (updates: Partial<EngineSimConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // --- Constraint layer feedback ---
  const [constraintNotice, setConstraintNotice] = useState<string | null>(null);

  /** Run constraint chain on blur/Enter for a constrained numeric field. */
  const commitField = useCallback((configKey: keyof EngineSimConfig) => {
    setConfig(prev => {
      const result = commitConfigField(prev, configKey);
      if (result.adjustedLabels.length > 0) {
        setConstraintNotice(`Adjusted to valid range: ${result.adjustedLabels.join(', ')}`);
      } else {
        setConstraintNotice(null);
      }
      return result.config;
    });
  }, []);

  /** Run constraint chain when camshaft type dropdown changes. */
  const commitCamType = useCallback((newCamType: EngineSimConfig['camshaftType']) => {
    setConfig(prev => {
      const next = { ...prev, camshaftType: newCamType };
      const result = commitCamTypeChange(next);
      if (result.adjustedLabels.length > 0) {
        setConstraintNotice(`Cam type change adjusted: ${result.adjustedLabels.join(', ')}`);
      } else {
        setConstraintNotice(null);
      }
      return result.config;
    });
  }, []);

  // Calculate displacement
  const displacement = useMemo(
    () => (Math.PI / 4) * Math.pow(config.bore_in, 2) * config.stroke_in * config.numCylinders,
    [config.bore_in, config.stroke_in, config.numCylinders]
  );

  // Run simulation
  const result = useMemo(() => simulateEngine(config), [config]);

  // Keep syncAssetRef up to date with current result/displacement/config
  // Also syncs a SavedEngine so VehicleEditor's engine dropdown auto-populates
  syncAssetRef.current = (name: string): number | undefined => {
    try {
      const summary: EngineResultSummary = {
        peakHP: result.peakHP,
        peakHpRpm: result.rpmPeakHP,
        peakTQ: result.peakTQ,
        peakTqRpm: result.rpmPeakTQ,
        displacement_ci: displacement,
        numCylinders: config.numCylinders,
        camshaftType: config.camshaftType,
      };
      let revision: number | undefined;
      if (engineAssetId && getEngineAsset(engineAssetId)) {
        const updated = updateEngineAsset(engineAssetId, {
          name,
          payload: { engineSimConfig: config, engineSimResultSummary: summary },
        } as any);
        revision = updated?.revision;
      } else {
        const asset = createEngineAsset({
          name, scope: 'personal', kind: 'sim',
          payload: { engineSimConfig: config, engineSimResultSummary: summary },
        } as Parameters<typeof createEngineAsset>[0]);
        setEngineAssetId(asset.id);
        revision = asset.revision;
      }

      // Auto-sync a SavedEngine so VehicleEditor can reference it via engineRef
      const vb6Curve = generateVB6DynoCurve(
        result.peakHP, result.rpmPeakHP,
        result.peakTQ, result.rpmPeakTQ,
        result.redline, displacement
      );
      const hpCurve = vb6Curve.map((p: { rpm: number; hp: number }) => ({ rpm: p.rpm, hp: Math.round(p.hp) }));
      const engine = createEngineFromSim(name, result.peakHP, result.rpmPeakHP, hpCurve, 'enginePro', config);
      // Reuse existing SavedEngine ID on subsequent saves to avoid duplicates
      if (savedEngineId) engine.id = savedEngineId;
      engine.peakTorque = result.peakTQ;
      engine.rpmAtPeakTorque = result.rpmPeakTQ;
      engine.displacement = displacement;
      engine.fuelType = config.fuelType ?? 'Gasoline';
      const saved = saveSavedEngine(engine);
      setSavedEngineId(saved.id);

      // Notify VehicleEditor (same-tab) that the engine list changed
      window.dispatchEvent(new Event('rsa-engines-updated'));

      return revision;
    } catch (e: unknown) {
      console.error('Failed to sync engine asset:', e);
      return undefined;
    }
  };

  // Generate dyno curve
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

  // Helper: resolve RPM label for VB6-style headers
  function rpmLabel(rpm: number): string {
    if (rpm === result.rpmPeakTQ) return 'Peak TQ';
    if (rpm === result.rpmPeakHP) return 'Peak HP';
    if (rpm === result.shift) return 'Shift';
    if (rpm === result.redline) return 'Redline';
    return '';
  }

  // --- Pro tab: Mech Details ---
  const [mechRPM, setMechRPM] = useState(0); // 0 = use rpmPeakHP
  // Smooth curve for chart (every 5 deg, 0-180)
  const mechChartData = useMemo<MechDetailPoint[]>(() => {
    if (!isProMode) return [];
    const rpm = mechRPM || result.rpmPeakHP;
    return calcMechDetails(rpm, config.stroke_in, config.rodLength_in, true);
  }, [isProMode, mechRPM, result.rpmPeakHP, config.stroke_in, config.rodLength_in]);
  // VB6 15-row table (5,15,30,45,60,AngMPS,80,85,90,105,120,135,150,165,180)
  const mechTableData = useMemo<PistonKinematicsPoint[]>(() => {
    if (!isProMode) return [];
    const rpm = mechRPM || result.rpmPeakHP;
    return calcMechDetailsForRPM(rpm, config.stroke_in, config.rodLength_in);
  }, [isProMode, mechRPM, result.rpmPeakHP, config.stroke_in, config.rodLength_in]);
  // Piston speed summary (4 rating points) — VB6 DETAILS.FRM Frame1
  const pistonSpeedSummary = useMemo(() => {
    if (!isProMode) return [];
    const ratings = [
      { name: 'Peak TQ', rpm: result.rpmPeakTQ },
      { name: 'Peak HP', rpm: result.rpmPeakHP },
      { name: 'Shift', rpm: result.shift },
      { name: 'Redline', rpm: result.redline },
    ];
    return ratings.filter(r => r.rpm > 0).map(r => ({
      ...r,
      ...calcPistonSpeedSummary(r.rpm, config.stroke_in, config.rodLength_in),
    }));
  }, [isProMode, result.rpmPeakTQ, result.rpmPeakHP, result.shift, result.redline, config.stroke_in, config.rodLength_in]);
  // Cranking compression
  const crankingCompression = useMemo(() => {
    return calcCrankingCompression(config.compressionRatio);
  }, [config.compressionRatio]);
  // Geometric Data Summary (VB6 DETAILS.FRM Frame2)
  const geometricRatios = useMemo(() => {
    if (!isProMode) return null;
    const ratios = calcGeometricRatios({
      bore_in: config.bore_in,
      stroke_in: config.stroke_in,
      rodLength_in: config.rodLength_in,
      deckHeight_in: config.pistonToDeckHeight_in ?? 0.015,
      gasketThickness_in: config.headGasketThickness_in ?? 0.039,
      intakeValveDia_in: config.intakeValveDia_in,
      maxIntakeValveLift_in: config.maxIntakeValveLift_in ?? 0.55,
      seatDia_in: config.seatDia_in ?? 1.794,
      stemDia_in: config.stemDia_in ?? 0.344,
      numIntakeValvesPerCyl: config.numIntakeValvesPerCyl,
      compressionRatio: config.compressionRatio,
    });
    return formatVB6GeometricRatios(ratios);
  }, [isProMode, config.bore_in, config.stroke_in, config.rodLength_in,
      config.pistonToDeckHeight_in, config.headGasketThickness_in,
      config.intakeValveDia_in, config.maxIntakeValveLift_in,
      config.seatDia_in, config.stemDia_in, config.numIntakeValvesPerCyl,
      config.compressionRatio]);

  // --- Pro tab: cam defaults for Flow Details & Recommendations ---
  const camTypeMap: Record<string, number> = {
    'overhead_cam': 0, 'roller': 1, 'mushroom_tappet': 2,
    'high_rate_flat_tappet': 3, 'normal_flat_tappet': 4,
    'hydraulic_roller': 5, 'hydraulic_flat_tappet': 6,
  };
  const camTypeNum = camTypeMap[config.camshaftType] ?? 4;

  const camDefaults = useMemo(() => {
    const effCR = result.calculatedValues?.EffCR ?? config.compressionRatio;
    return getCalculatedCamDefaults(
      result.rpmPeakHP, config.intakeDuration050_deg,
      config.rodLength_in, config.stroke_in,
      config.compressionRatio, config.fuelType, effCR,
    );
  }, [result.rpmPeakHP, result.calculatedValues?.EffCR, config.intakeDuration050_deg,
      config.rodLength_in, config.stroke_in, config.compressionRatio, config.fuelType]);

  const resolvedLSA = config.lobeSeparationAngle_deg ?? camDefaults.lobeSeparationAngle_deg;
  const resolvedILC = config.intakeLobeCenterline_deg ?? camDefaults.intakeLobeCenterline_deg;

  // --- Pro tab: Flow Details ---
  const [flowRPM, setFlowRPM] = useState(6000);
  // Local cam overrides for Flow Details only (VB6 FDetail.frm Frame2 editable fields)
  // null = use base config value; number = overridden value (clamped to ±8° / ±0.1")
  const [fdDurationOverride, setFdDurationOverride] = useState<number | null>(null);
  const [fdIlcOverride, setFdIlcOverride] = useState<number | null>(null);
  const [fdMaxLiftOverride, setFdMaxLiftOverride] = useState<number | null>(null);
  const fdDuration = fdDurationOverride ?? config.intakeDuration050_deg;
  const fdILC = fdIlcOverride ?? resolvedILC;
  const fdMaxLift = fdMaxLiftOverride ?? (config.maxIntakeValveLift_in ?? 0.55);

  // Build FlowDetailsConfig from real flowbench data (if initialized)
  const flowDetailsConfig = useMemo<FlowDetailsConfig | undefined>(() => {
    if (fbLifts.length === 0) return undefined;
    // Build 1-indexed arrays for TABY (VB6 convention: element 0 is dummy)
    const lifts1 = [0, ...fbLifts];
    const flows1 = [0, ...fbFlows];
    let lastRow = 0;
    for (let i = 0; i < fbLifts.length; i++) {
      if (fbLifts[i] > 0) lastRow = i + 1; else break;
    }
    return {
      flowbenchLifts_1idx: lifts1,
      flowbenchFlows_1idx: flows1,
      lastRow,
      testPressure_inH2O: config.flowTestPressure_inH2O,
      seatDia_in: config.seatDia_in ?? 1.794,
      seatAngle_deg: config.vsAngle_deg ?? 45,
      seatWidth_in: config.vsWidth_in ?? 0.08,
      stemDia_in: config.stemDia_in ?? 0.344,
    };
  }, [fbLifts, fbFlows, config.flowTestPressure_inH2O, config.seatDia_in, config.vsAngle_deg, config.vsWidth_in, config.stemDia_in]);

  const flowData = useMemo<FlowDetailPoint[]>(() => {
    if (!isProMode) return [];
    const rpm = flowRPM || result.rpmPeakHP;
    return calcFlowDetails(
      rpm, config.stroke_in, config.rodLength_in, config.bore_in,
      config.intakeValveDia_in, config.numIntakeValvesPerCyl,
      fdDuration, fdILC,
      fdMaxLift, camTypeNum,
      flowDetailsConfig,
    );
  }, [isProMode, flowRPM, result.rpmPeakHP, config.stroke_in, config.rodLength_in,
      config.bore_in, config.intakeValveDia_in, config.numIntakeValvesPerCyl,
      fdDuration, fdILC, fdMaxLift, camTypeNum,
      flowDetailsConfig]);

  // 100-point smooth curve for Flow Details chart (VB6 CDETAILS.CLS graph loop)
  const flowGraphData = useMemo<FlowDetailGraphPoint[]>(() => {
    if (!isProMode) return [];
    const rpm = flowRPM || result.rpmPeakHP;
    return calcFlowDetailsGraph(
      rpm, config.stroke_in, config.rodLength_in, config.bore_in,
      config.intakeValveDia_in, config.numIntakeValvesPerCyl,
      fdDuration, fdILC,
      fdMaxLift, camTypeNum,
      flowDetailsConfig,
    );
  }, [isProMode, flowRPM, result.rpmPeakHP, config.stroke_in, config.rodLength_in,
      config.bore_in, config.intakeValveDia_in, config.numIntakeValvesPerCyl,
      fdDuration, fdILC, fdMaxLift, camTypeNum,
      flowDetailsConfig]);

  // VB6-consistent axis domains for Flow Details chart
  // Uses VB6-specific index rules: FlowDemand(6), FlowArea(7), Angles(1)/Angles(12)
  const fdChartAxes = useMemo(() => {
    if (flowData.length < 2) return null;
    const seeds = calcFlowDetailsAxisInputs(flowData);
    const xAx = flowDetailsXAxis(seeds.firstAngle, seeds.lastAngle);
    const leftAx = flowDetailsLeftYAxis(seeds.leftYMax);
    const areaAx = flowDetailsAreaYAxis(seeds.rightYMax, leftAx.tickCount);
    return { xAx, leftAx, areaAx };
  }, [flowData]);

  // VB6 ClipGraph=1: render is clipped to axis bounds but data is NOT modified.
  // We use a Recharts <defs>/<clipPath> on the chart SVG so lines are visually
  // clipped to the plot area. Tooltip shows raw (unclipped) values — this matches
  // VB6 behavior where off-scale data simply isn't drawn but values are real.
  // Previous approach clamped data values, which altered tooltip display.

  // --- Pro tab: Recommendations ---
  const recsData = useMemo<EngineRecommendations | null>(() => {
    if (!isProMode) return null;
    const cv = result.calculatedValues;
    if (!cv) return null;
    return calcRecommendations(
      config, result.peakHP, result.rpmPeakHP, result.peakTQ, result.rpmPeakTQ, cv,
    );
  }, [isProMode, config, result]);

  return (
    <Page wide>
      <style>{`
        .esd-input-row {
          display: grid;
          gap: 12px;
          grid-template-columns: 1fr 1fr;
        }
        .esd-input-row > * { min-width: 0; }
        .esd-perf-grid {
          display: grid;
          gap: 8px;
          grid-template-columns: repeat(4, 1fr);
        }
        .esd-perf-grid > * { min-width: 0; }
        .esd-recs-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: 1fr 1fr;
        }
        .esd-recs-grid > * { min-width: 0; }
        .esd-detail-row {
          display: flex;
          gap: 12px;
          align-items: stretch;
        }
        .esd-detail-row > .esd-detail-chart { flex: 1; min-width: 0; min-height: 350px; }
        .esd-detail-row > .esd-detail-table {
          flex-shrink: 0;
          overflow-y: auto;
          max-height: 500px;
        }
        .esd-flow-top {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 10px;
        }
        .esd-ws-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .esd-fb-summary {
          display: flex;
          gap: 16px;
          font-size: 13px;
          flex-wrap: wrap;
        }
        /* ≤1024px: stack to 1 column */
        @media (max-width: 1024px) {
          .esd-input-row {
            grid-template-columns: 1fr;
          }
          .esd-perf-grid {
            grid-template-columns: 1fr 1fr;
          }
          .esd-recs-grid {
            grid-template-columns: 1fr;
          }
          .esd-ws-2col {
            grid-template-columns: 1fr;
          }
          .esd-detail-row {
            flex-direction: column;
          }
          .esd-detail-row > .esd-detail-table {
            width: 100%;
          }
          .esd-flow-top {
            grid-template-columns: 1fr;
          }
        }
        /* ≥1280px: keep 2 col inputs */
        @media (min-width: 1280px) {
          .esd-input-row {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
      {showCRCalculator && (
        <CompressionRatioCalculator
          isOpen={showCRCalculator}
          onClose={() => setShowCRCalculator(false)}
          onApply={(cr) => {
            updateConfig({ compressionRatio: cr });
            setShowCRCalculator(false);
          }}
        />
      )}

      <div style={styles.dashboard}>
        {/* File toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
            {docName}{isDirty ? ' •' : ''}
          </span>
          {docId ? (
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>saved</span>
          ) : (
            <span style={{ fontSize: '11px', color: '#f59e0b' }}>unsaved</span>
          )}
          <span style={{ flex: 1 }} />
          <button style={{ ...styles.fileBtn, padding: '4px 10px', fontSize: '12px' }} onClick={handleNew} disabled={fileBusy}>
            <FilePlus size={12} /> New
          </button>
          <button style={{ ...styles.fileBtn, padding: '4px 10px', fontSize: '12px' }} onClick={handleOpenLibrary} disabled={fileBusy}>
            <FolderOpen size={12} /> Open
          </button>
          <button style={{ ...styles.fileBtn, padding: '4px 10px', fontSize: '12px', ...(isDirty ? styles.fileBtnPrimary : {}) }} onClick={handleSave} disabled={fileBusy}>
            <Save size={12} /> {isDirty ? 'Save *' : 'Save'}
          </button>
          <button style={{ ...styles.fileBtn, padding: '4px 10px', fontSize: '12px' }} onClick={handleImportEng} disabled={fileBusy}>
            <Upload size={12} /> Import .eng
          </button>
        </div>
        {fileError && (
          <div style={{ ...styles.fileError, marginBottom: '8px' }}>
            {fileError}
            <button style={{ marginLeft: '8px', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 600 }} onClick={() => setFileError(null)}>✕</button>
          </div>
        )}
        {saveToast && (
          <div style={{ marginBottom: '8px', padding: '6px 12px', borderRadius: '5px', fontSize: '12px', fontWeight: 500, color: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            {saveToast}
          </div>
        )}
        {/* Name prompt (shown on first save of a new simulation) */}
        {showSaveAsPrompt && (
          <div style={{ marginBottom: '8px', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Name:</span>
              <input
                type="text" placeholder="Simulation name"
                style={{ ...styles.input, flex: 1, maxWidth: '280px' }}
                value={saveAsName}
                onChange={e => setSaveAsName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && saveAsName.trim()) handleSaveAsConfirm(saveAsName.trim()); }}
                autoFocus
              />
              <button style={{ ...styles.fileBtn, ...styles.fileBtnPrimary, padding: '4px 10px', fontSize: '12px' }} disabled={!saveAsName.trim() || fileBusy} onClick={() => handleSaveAsConfirm(saveAsName.trim())}>Save</button>
              <button style={{ ...styles.fileBtn, padding: '4px 10px', fontSize: '12px' }} onClick={() => setShowSaveAsPrompt(false)}>Cancel</button>
            </div>
          </div>
        )}
        {/* Library panel (inline at top) */}
        {showLibrary && (
          <div style={{ marginBottom: '8px', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600 }}>Saved Simulations</div>
              <button style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '14px' }} onClick={() => setShowLibrary(false)}>✕</button>
            </div>
            {libraryItems.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', padding: '4px 0' }}>No saved simulations yet.</div>
            ) : (
              <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {libraryItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px', borderBottom: '1px solid var(--color-border)', fontSize: '12px' }}>
                    <button
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 500, textAlign: 'left', flex: 1, padding: 0 }}
                      disabled={fileBusy}
                      onClick={() => handleLoadFromLibrary(item.id)}
                    >{item.name}</button>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '8px', whiteSpace: 'nowrap' }}>
                      {new Date(item.updated_at).toLocaleDateString()}
                    </span>
                    <button
                      style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginLeft: '8px', fontSize: '12px' }}
                      onClick={() => handleDeleteFromLibrary(item.id)}
                      title="Delete"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Constraint adjustment notice */}
        {constraintNotice && (
          <div style={styles.constraintNotice}>
            {constraintNotice}
            <button style={{ marginLeft: '8px', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 600 }} onClick={() => setConstraintNotice(null)}>✕</button>
          </div>
        )}

        {/* Input Cards — always visible */}
        <div className="esd-input-row">
          {/* Engine Design */}
          <div style={styles.inputCard}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Number of Cylinders</label>
              <input
                type="number"
                style={{ ...styles.input, flex: '0 0 50px' }}
                value={config.numCylinders}
                onChange={e => updateConfig({ numCylinders: parseInt(e.target.value) || 8 })}
                min={1}
                max={12}
              />
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {(['inline', 'vee', 'flat'] as const).map(v => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', color: 'var(--color-text)', cursor: 'pointer' }}>
                    <input type="radio" name="layout" checked={config.layout === v} onChange={() => updateConfig({ layout: v })} style={{ margin: 0 }} />
                    {v === 'inline' ? 'Inline' : v === 'vee' ? 'Vee' : 'Flat'}
                  </label>
                ))}
              </div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Bore Diameter (in)</label>
              <input
                type="number"
                style={styles.input}
                value={config.bore_in}
                onChange={e => updateConfig({ bore_in: parseFloat(e.target.value) || 4.0 })}
                onBlur={() => commitField('bore_in')}
                step={0.001}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Stroke Length (in)</label>
              <input
                type="number"
                style={styles.input}
                value={config.stroke_in}
                onChange={e => updateConfig({ stroke_in: parseFloat(e.target.value) || 3.5 })}
                onBlur={() => commitField('stroke_in')}
                step={0.001}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Rod Length (in)</label>
              <input
                type="number"
                style={styles.input}
                value={config.rodLength_in}
                onChange={e => updateConfig({ rodLength_in: parseFloat(e.target.value) || 6.0 })}
                onBlur={() => commitField('rodLength_in')}
                step={0.001}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Compression Ratio</label>
              <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                <input
                  type="number"
                  style={{ ...styles.input, flex: 1 }}
                  value={config.compressionRatio}
                  onChange={e => updateConfig({ compressionRatio: parseFloat(e.target.value) || 10 })}
                  onBlur={() => setConstraintNotice(null)}
                  step={0.1}
                />
                <button
                  onClick={() => setShowCRCalculator(true)}
                  style={styles.iconButton}
                  title="CR Calculator"
                >
                  <Calculator size={14} />
                </button>
              </div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Camshaft Type</label>
              <select
                style={styles.select}
                value={config.camshaftType}
                onChange={e => commitCamType(e.target.value as EngineSimConfig['camshaftType'])}
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
            <div style={styles.inputGroup}>
              <label style={styles.label}>Intake Duration @ .050 inch (deg)</label>
              <input
                type="number"
                style={styles.input}
                value={config.intakeDuration050_deg || 264}
                onChange={e => updateConfig({ intakeDuration050_deg: parseFloat(e.target.value) || 264 })}
                onBlur={() => setConstraintNotice(null)}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Fuel Type</label>
              <select
                style={styles.select}
                value={config.fuelType}
                onChange={e => updateConfig({ fuelType: e.target.value as any })}
              >
                <option value="gasoline">Gasoline</option>
                <option value="racing_gasoline">Racing Gas</option>
                <option value="methanol">Methanol</option>
              </select>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {([false, true] as const).map(efi => (
                  <label key={String(efi)} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', color: 'var(--color-text)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <input type="radio" name="carbEfi" checked={config.isEFI === efi} onChange={() => updateConfig({ isEFI: efi })} style={{ margin: 0 }} />
                    {efi ? 'EFI' : 'Carb'}
                  </label>
                ))}
              </div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Throttle CFM @ 1.5 inHg</label>
              <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                <input
                  type="number"
                  style={{ ...styles.input, flex: 1 }}
                  value={config.throttleCFM_at_1_5inHg}
                  onChange={e => updateConfig({ throttleCFM_at_1_5inHg: parseFloat(e.target.value) || 750 })}
                  onBlur={() => commitField('throttleCFM_at_1_5inHg')}
                />
                <button
                  onClick={() => setShowCarbWSModal(true)}
                  style={styles.iconButton}
                  title="Carb CFM Worksheet"
                >
                  <Calculator size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Camshaft + Cylinder Head */}
          <div style={styles.inputCard}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Intake Manifold Type</label>
              <select
                style={styles.select}
                value={config.intakeManifoldType}
                onChange={e => updateConfig({ intakeManifoldType: e.target.value as any })}
              >
                <option value="plenum">Common Plenum</option>
                <option value="individual_runner">Individual Runner</option>
                <option value="dual_plane_divided">Dual Plane Divided</option>
                <option value="dual_plane_slot">Dual Plane Slot</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Manifold Runner Style</label>
              <select
                style={styles.select}
                value={config.runnerStyle}
                onChange={e => updateConfig({ runnerStyle: e.target.value as any })}
              >
                <option value="curved">Curved</option>
                <option value="straight">Straight</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Intake Manifold Flow Factor (%)</label>
              <input
                type="number"
                style={styles.input}
                value={config.intakeManifoldFlowFactor_pct}
                onChange={e => updateConfig({ intakeManifoldFlowFactor_pct: parseFloat(e.target.value) || 96 })}
                onBlur={() => setConstraintNotice(null)}
                step={0.1}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Intake Valves per Cylinder</label>
              <input
                type="number"
                style={styles.input}
                value={config.numIntakeValvesPerCyl}
                onChange={e => updateConfig({ numIntakeValvesPerCyl: parseInt(e.target.value) || 1 })}
                onBlur={() => commitField('numIntakeValvesPerCyl')}
                min={1}
                max={4}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Intake Valve Diameter (in)</label>
              <input
                type="number"
                style={styles.input}
                value={config.intakeValveDia_in}
                onChange={e => updateConfig({ intakeValveDia_in: parseFloat(e.target.value) || 2.0 })}
                onBlur={() => commitField('intakeValveDia_in')}
                step={0.001}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Maximum Intake Port Flow (CFM)</label>
              <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                <input
                  type="number"
                  style={{ ...styles.input, flex: 1 }}
                  value={config.maxIntakeFlow_cfm}
                  onChange={e => updateConfig({ maxIntakeFlow_cfm: parseFloat(e.target.value) || 250 })}
                  onBlur={() => commitField('maxIntakeFlow_cfm')}
                />
                <button
                  onClick={() => {
                    if (isProMode) { setWsTab('flow_bench'); }
                    else { setShowIntakeFlowModal(true); }
                  }}
                  style={styles.iconButton}
                  title={isProMode ? 'Open Flow Bench' : 'Intake Flow Worksheet'}
                >
                  <Calculator size={14} />
                </button>
              </div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>@ Test Pressure (inH₂O)</label>
              <input
                type="number"
                style={styles.input}
                value={config.flowTestPressure_inH2O}
                onChange={e => updateConfig({ flowTestPressure_inH2O: parseFloat(e.target.value) || 28 })}
                onBlur={() => commitField('flowTestPressure_inH2O')}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>@ Reference Bore Diameter (in)</label>
              <input
                type="number"
                style={styles.input}
                value={config.flowTestBoreDia_in}
                onChange={e => updateConfig({ flowTestBoreDia_in: parseFloat(e.target.value) || 4.0 })}
                onBlur={() => commitField('flowTestBoreDia_in')}
                step={0.001}
              />
            </div>
          </div>
          {/* Notes */}
          <div style={{ ...styles.inputCard, gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '2px' }}>Notes</div>
            <textarea
              style={{ ...styles.input, minHeight: '60px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.4 }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Engine build notes..."
            />
          </div>
        </div>

        {/* Estimated Performance */}
        <div style={styles.resultsCard}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>Estimated Performance</span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{vb6Fixed(displacement, 1)} CID · {fmtLiters(displacement)} L</span>
          </div>
          <div className="esd-perf-grid">
            <div style={styles.resultBox}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                <span style={styles.resultLabel}>Peak HP</span>
                <span style={styles.resultValueLarge}>{vb6Fixed(result.peakHP, 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span style={styles.resultSubtext}>@ {result.rpmPeakHP} RPM · {fmtKw(result.peakHP)} kW</span>
                <span style={styles.resultSubtext}>HP/CID: <strong>{vb6PerCID(result.hpPerCID)}</strong></span>
              </div>
            </div>
            <div style={styles.resultBox}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                <span style={styles.resultLabel}>Peak Torque (ft lbs)</span>
                <span style={styles.resultValueLarge}>{vb6Fixed(result.peakTQ, 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span style={styles.resultSubtext}>@ {result.rpmPeakTQ} RPM · {fmtNm(result.peakTQ)} N·m</span>
                <span style={styles.resultSubtext}>TQ/CID: <strong>{fmtTqPerCid(result.peakTQ, displacement)}</strong></span>
              </div>
            </div>
            <div style={styles.resultBox}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                <span style={styles.resultLabel}>Shift RPM</span>
                <span style={styles.resultValueLarge}>{result.shift}</span>
              </div>
            </div>
            <div style={styles.resultBox}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                <span style={styles.resultLabel}>Redline RPM</span>
                <span style={styles.resultValueLarge}>{result.redline}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={styles.wsTabBar}>
          <button style={{ ...styles.wsTabBtn, ...(wsTab === 'dyno_data' ? styles.wsTabBtnActive : {}) }} onClick={() => setWsTab('dyno_data')}>Dyno Data</button>
          <span  />
          <button
            style={{ ...styles.wsTabBtn, ...(wsTab === 'flow_bench' ? styles.wsTabBtnActive : {}), ...(!isProMode ? styles.wsTabBtnDisabled : {}) }}
            onClick={() => { if (isProMode) setWsTab('flow_bench'); else setProUpgradeTab('Flow Bench'); }}
            title={isProMode ? 'Intake Port Flowbench Data' : 'Engine Pro feature — upgrade to access'}
          >Flow Bench {!isProMode && <Lock size={10} style={{ marginLeft: 3 }} />}</button>
          <button
            style={{ ...styles.wsTabBtn, ...(wsTab === 'mech_details' ? styles.wsTabBtnActive : {}), ...(!isProMode ? styles.wsTabBtnDisabled : {}) }}
            onClick={() => { if (isProMode) setWsTab('mech_details'); else setProUpgradeTab('Mech Details'); }}
            title={isProMode ? 'Mechanical Details' : 'Engine Pro feature — upgrade to access'}
          >Mechanical Details {!isProMode && <Lock size={10} style={{ marginLeft: 3 }} />}</button>
          <button
            style={{ ...styles.wsTabBtn, ...(wsTab === 'flow_details' ? styles.wsTabBtnActive : {}), ...(!isProMode ? styles.wsTabBtnDisabled : {}) }}
            onClick={() => { if (isProMode) setWsTab('flow_details'); else setProUpgradeTab('Flow Details'); }}
            title={isProMode ? 'Flow Details' : 'Engine Pro feature — upgrade to access'}
          >Flow Details {!isProMode && <Lock size={10} style={{ marginLeft: 3 }} />}</button>
          <button
            style={{ ...styles.wsTabBtn, ...(wsTab === 'recommendations' ? styles.wsTabBtnActive : {}), ...(!isProMode ? styles.wsTabBtnDisabled : {}) }}
            onClick={() => { if (isProMode) setWsTab('recommendations'); else setProUpgradeTab('Recommendations'); }}
            title={isProMode ? 'Recommendations' : 'Engine Pro feature — upgrade to access'}
          >Recommendations {!isProMode && <Lock size={10} style={{ marginLeft: 3 }} />}</button>
        </div>

        {/* Pro upgrade prompt */}
        {proUpgradeTab && (
          <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔒</div>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{proUpgradeTab} requires Engine Pro</div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '12px' }}>
              Upgrade to Pro to access Flow Bench, Mechanical Details, Flow Details, and Recommendations.
            </div>
            <button style={{ ...styles.iconButton, padding: '6px 16px' }} onClick={() => setProUpgradeTab(null)}>Dismiss</button>
          </div>
        )}

        {/* Dyno Data tab */}
        {wsTab === 'dyno_data' && (
          <div style={styles.wsPanel}>
            <div style={styles.cardTitle}>Dyno Curve</div>
            <div className="esd-detail-row">
              <div className="esd-detail-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                    <XAxis
                      dataKey="rpm"
                      label={{ value: 'RPM', position: 'insideBottom', offset: -5 }}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="left"
                      label={{ value: 'HP', angle: -90, position: 'insideLeft' }}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'Torque (lb-ft)', angle: 90, position: 'insideRight' }}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip contentStyle={{ fontSize: '12px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} labelStyle={{ color: 'var(--color-text)' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="hp" stroke="#3b82f6" strokeWidth={2} name="HP" dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="torque" stroke="#ef4444" strokeWidth={2} name="Torque" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="esd-detail-table">
                <table style={styles.proTable}>
                  <thead>
                    <tr>
                      <th style={styles.proTh}>RPM</th>
                      <th style={{ ...styles.proTh, color: '#3b82f6' }}>HP</th>
                      <th style={{ ...styles.proTh, color: '#ef4444' }}>TQ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((p, i) => (
                      <tr key={i} style={i % 2 === 0 ? styles.proTrEven : undefined}>
                        <td style={styles.proTd}>{p.rpm.toLocaleString()}</td>
                        <td style={{ ...styles.proTd, color: '#3b82f6' }}>{p.hp}</td>
                        <td style={{ ...styles.proTd, color: '#ef4444' }}>{p.torque}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Carb CFM Worksheet Modal */}
        {showCarbWSModal && (() => {
          const tvLimitsP = venturiDiaLimits(carbWS.throttleDiaPrimary);
          const tvLimitsS = venturiDiaLimits(carbWS.throttleDiaSecondary);
          return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setShowCarbWSModal(false)}>
            <div style={{ backgroundColor: 'var(--color-surface, #1e293b)', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxWidth: '520px', width: '100%', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()} onKeyDown={trapFocus}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calculator size={20} color="#3b82f6" />
                  <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Throttle CFM @ 1.5" Hg Worksheet</h2>
                </div>
                <button style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }} onClick={() => setShowCarbWSModal(false)}>✕</button>
              </div>
              <div style={{ padding: '20px' }}>
                <div className="esd-ws-2col">
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>Primary</div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Throttle Bores</label>
                      <input type="text" style={styles.input} value={carbWSTxt.numBoresPrimary}
                        onChange={e => setCarbWSTxt(p => ({ ...p, numBoresPrimary: e.target.value }))}
                        onBlur={e => commitCarbWSField('numBoresPrimary', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCarbWSField('numBoresPrimary', (e.target as HTMLInputElement).value); }} />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Throttle Dia (in)</label>
                      <input type="text" style={styles.input} value={carbWSTxt.throttleDiaPrimary}
                        onChange={e => setCarbWSTxt(p => ({ ...p, throttleDiaPrimary: e.target.value }))}
                        onBlur={e => commitCarbWSField('throttleDiaPrimary', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCarbWSField('throttleDiaPrimary', (e.target as HTMLInputElement).value); }} />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Venturi Dia (in)</label>
                      <input type="text" style={styles.input} value={carbWSTxt.venturiDiaPrimary}
                        onChange={e => setCarbWSTxt(p => ({ ...p, venturiDiaPrimary: e.target.value }))}
                        onBlur={e => commitCarbWSField('venturiDiaPrimary', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCarbWSField('venturiDiaPrimary', (e.target as HTMLInputElement).value); }} />
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{formatDia(tvLimitsP.min)}–{formatDia(tvLimitsP.max)}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>Secondary</div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Throttle Bores</label>
                      <input type="text" style={styles.input} value={carbWSTxt.numBoresSecondary}
                        onChange={e => setCarbWSTxt(p => ({ ...p, numBoresSecondary: e.target.value }))}
                        onBlur={e => commitCarbWSField('numBoresSecondary', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCarbWSField('numBoresSecondary', (e.target as HTMLInputElement).value); }} />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Throttle Dia (in)</label>
                      <input type="text" style={styles.input} value={carbWSTxt.throttleDiaSecondary}
                        onChange={e => setCarbWSTxt(p => ({ ...p, throttleDiaSecondary: e.target.value }))}
                        onBlur={e => commitCarbWSField('throttleDiaSecondary', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCarbWSField('throttleDiaSecondary', (e.target as HTMLInputElement).value); }} />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Venturi Dia (in)</label>
                      <input type="text" style={styles.input} value={carbWSTxt.venturiDiaSecondary}
                        onChange={e => setCarbWSTxt(p => ({ ...p, venturiDiaSecondary: e.target.value }))}
                        onBlur={e => commitCarbWSField('venturiDiaSecondary', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCarbWSField('venturiDiaSecondary', (e.target as HTMLInputElement).value); }} />
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{formatDia(tvLimitsS.min)}–{formatDia(tvLimitsS.max)}</span>
                    </div>
                  </div>
                </div>
                <div style={{ backgroundColor: 'var(--color-primary-light, #1e3a5f)', border: '2px solid var(--color-primary)', borderRadius: '8px', padding: '12px', textAlign: 'center', marginTop: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Calculated CFM @ 1.5" Hg</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-primary)' }}>{formatCfm(carbWSResult.cfmTotal)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
                <button style={{ flex: 1, padding: '10px 16px', fontSize: '14px', fontWeight: 500, border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }} onClick={() => setShowCarbWSModal(false)}>Cancel</button>
                <button style={{ flex: 1, padding: '10px 16px', fontSize: '14px', fontWeight: 500, border: 'none', borderRadius: '6px', backgroundColor: 'var(--color-primary)', color: 'white', cursor: 'pointer' }} onClick={() => { applyCarbWSToMain(); setShowCarbWSModal(false); }}>Apply ({formatCfm(carbWSResult.cfmTotal)} CFM)</button>
              </div>
            </div>
          </div>
          );
        })()}

        {/* Intake Flow Worksheet Modal */}
        {showIntakeFlowModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setShowIntakeFlowModal(false)}>
            <div style={{ backgroundColor: 'var(--color-surface, #1e293b)', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxWidth: '560px', width: '100%', border: '1px solid var(--color-border)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()} onKeyDown={trapFocus}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calculator size={20} color="#3b82f6" />
                  <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Intake Port Flow @ {config.flowTestPressure_inH2O}" H₂O</h2>
                </div>
                <button style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }} onClick={() => setShowIntakeFlowModal(false)}>✕</button>
              </div>
              <div style={{ padding: '20px' }}>
                <div className="esd-ws-2col">
                  <div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>CS Area (sq in)</label>
                      <input type="text" style={styles.input} value={intakeFlowTxt.csArea}
                        onChange={e => setIntakeFlowTxt(p => ({ ...p, csArea: e.target.value }))}
                        onBlur={e => commitIntakeFlowField('csArea', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitIntakeFlowField('csArea', (e.target as HTMLInputElement).value); }} />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Flow Vel (ft/s)</label>
                      <input type="text" style={styles.input} value={intakeFlowTxt.flowVel}
                        onChange={e => setIntakeFlowTxt(p => ({ ...p, flowVel: e.target.value }))}
                        onBlur={e => commitIntakeFlowField('flowVel', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitIntakeFlowField('flowVel', (e.target as HTMLInputElement).value); }} />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Flow Flux (CFM/in²)</label>
                      <input type="text" style={styles.input} value={intakeFlowTxt.flowFlux}
                        onChange={e => setIntakeFlowTxt(p => ({ ...p, flowFlux: e.target.value }))}
                        onBlur={e => commitIntakeFlowField('flowFlux', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitIntakeFlowField('flowFlux', (e.target as HTMLInputElement).value); }} />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>FV Index (%)</label>
                      <input type="text" style={styles.input} value={intakeFlowTxt.fvIndex}
                        onChange={e => setIntakeFlowTxt(p => ({ ...p, fvIndex: e.target.value }))}
                        onBlur={e => commitIntakeFlowField('fvIndex', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitIntakeFlowField('fvIndex', (e.target as HTMLInputElement).value); }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', marginBottom: '4px' }}><span style={{ color: 'var(--color-text-muted)' }}>Flow Velocity:</span> <strong>{formatDec1(intakeFlowResult.flowVel)} ft/s</strong></div>
                    <div style={{ fontSize: '12px', marginBottom: '4px' }}><span style={{ color: 'var(--color-text-muted)' }}>Flow Flux:</span> <strong>{formatDec1(intakeFlowResult.flowFlux)} CFM/in²</strong></div>
                    <div style={{ fontSize: '12px', marginBottom: '4px' }}><span style={{ color: 'var(--color-text-muted)' }}>FV Index:</span> <strong>{formatDec1(intakeFlowResult.fvIndex)}%</strong></div>
                    <div style={{ fontSize: '12px', marginTop: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}><span style={{ color: 'var(--color-text-muted)' }}>Max Intake Port Flow:</span> <strong>{vb6MaxFlow(config.maxIntakeFlow_cfm)} CFM</strong></div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '12px', paddingTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Valve Seat Throat Area: <strong>{formatDim3(intakeWSCSArea)} sq in</strong></span>
                  <button
                    style={{ ...styles.iconButton, fontSize: '12px', padding: '4px 10px' }}
                    onClick={() => setShowCSAModal(true)}
                  >CS Area Calculator</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
                <button style={{ flex: 1, padding: '10px 16px', fontSize: '14px', fontWeight: 500, border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }} onClick={() => setShowIntakeFlowModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}


        {/* Cross-Sectional Area Calculator Modal */}
        {showCSAModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '16px' }} onClick={() => setShowCSAModal(false)}>
            <div style={{ backgroundColor: 'var(--color-surface, #1e293b)', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxWidth: '480px', width: '100%', border: '1px solid var(--color-border)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()} onKeyDown={trapFocus}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calculator size={20} color="#3b82f6" />
                  <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Minimum Cross-Section Area</h2>
                </div>
                <button style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }} onClick={() => setShowCSAModal(false)}>✕</button>
              </div>
              <div style={{ padding: '20px' }}>
                <div className="esd-ws-2col">
                  <div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Seat Dia (in)</label>
                      <input type="text" style={styles.input} value={intakeCSTxt.seatDia}
                        onChange={e => setIntakeCSTxt(p => ({ ...p, seatDia: e.target.value }))}
                        onBlur={e => commitIntakeCSField('seatDia', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitIntakeCSField('seatDia', (e.target as HTMLInputElement).value); }} />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Seat % (75-100)</label>
                      <input type="text" style={styles.input} value={intakeCSTxt.seatPer}
                        onChange={e => setIntakeCSTxt(p => ({ ...p, seatPer: e.target.value }))}
                        onBlur={e => commitIntakeCSField('seatPer', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitIntakeCSField('seatPer', (e.target as HTMLInputElement).value); }} />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Seat Angle (deg)</label>
                      <input type="text" style={styles.input} value={intakeCSTxt.vsAngle}
                        onChange={e => setIntakeCSTxt(p => ({ ...p, vsAngle: e.target.value }))}
                        onBlur={e => commitIntakeCSField('vsAngle', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitIntakeCSField('vsAngle', (e.target as HTMLInputElement).value); }} />
                    </div>
                  </div>
                  <div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Seat Width (in)</label>
                      <input type="text" style={styles.input} value={intakeCSTxt.vsWidth}
                        onChange={e => setIntakeCSTxt(p => ({ ...p, vsWidth: e.target.value }))}
                        onBlur={e => commitIntakeCSField('vsWidth', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitIntakeCSField('vsWidth', (e.target as HTMLInputElement).value); }} />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Stem Dia (in)</label>
                      <input type="text" style={styles.input} value={intakeCSTxt.stemDia}
                        onChange={e => setIntakeCSTxt(p => ({ ...p, stemDia: e.target.value }))}
                        onBlur={e => commitIntakeCSField('stemDia', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitIntakeCSField('stemDia', (e.target as HTMLInputElement).value); }} />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Valve Lift (in)</label>
                      <input type="text" style={styles.input} value={intakeCSTxt.valveLift}
                        onChange={e => setIntakeCSTxt(p => ({ ...p, valveLift: e.target.value }))}
                        onBlur={e => commitIntakeCSField('valveLift', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitIntakeCSField('valveLift', (e.target as HTMLInputElement).value); }} />
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '8px', paddingTop: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Valve Seat Throat Area: <strong>{formatDim3(intakeWSCSArea)} sq in</strong></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
                <button style={{ flex: 1, padding: '10px 16px', fontSize: '14px', fontWeight: 500, border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }} onClick={() => setShowCSAModal(false)}>Close</button>
                <button style={{ flex: 1, padding: '10px 16px', fontSize: '14px', fontWeight: 500, border: 'none', borderRadius: '6px', backgroundColor: 'var(--color-primary)', color: 'white', cursor: 'pointer' }} onClick={() => { applyWSCSAreaToFlow(); setShowCSAModal(false); }}>Apply Area ({formatDim3(intakeWSCSArea)} sq in)</button>
              </div>
            </div>
          </div>
        )}

        {/* Flow Bench — Pro */}
        {wsTab === 'flow_bench' && (
          <div style={styles.wsPanel}>
            <div style={styles.cardTitle}>
              Intake Port Flowbench Data @ {config.flowTestPressure_inH2O}" H₂O
            </div>

            {!fbInitialized ? (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                  No flowbench data loaded. Generate estimated data from current engine configuration?
                </p>
                <button style={{ ...styles.iconButton, padding: '6px 16px', fontSize: '12px' }} onClick={() => initFlowBench(true)}>
                  Generate Default Flowbench Data
                </button>
              </div>
            ) : (
              <>
                {/* VB6 FlowB.frm Frame1: "Intake Valve Seat Throat Data" — editable fields */}
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Intake Valve Seat Throat Data</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '4px 12px', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                  {/* Read-only: Valves/Cyl and Valve Dia (VB6 lblNIV, lblIVD) */}
                  <span style={{ lineHeight: '24px' }}>Valves/Cyl: <strong>{config.numIntakeValvesPerCyl}</strong></span>
                  <span style={{ lineHeight: '24px' }}>Valve Dia: <strong>{vb6Fixed(config.intakeValveDia_in, 3)}"</strong></span>
                  {/* Editable: Seat Dia (VB6 txtSeatDia — 3 dec, recalcs SeatPer) */}
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Seat Dia:
                    <input type="text"
                      key={`sd-${fbSeatData.seatDia_in}`}
                      defaultValue={vb6Fixed(fbSeatData.seatDia_in, 3)}
                      style={{ ...styles.input, width: '65px', padding: '2px 4px', fontSize: '12px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}
                      onBlur={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v > 0) {
                          const rounded = Math.round(v * 1000) / 1000;
                          const pct = Math.round(100 * rounded / config.intakeValveDia_in * 10) / 10;
                          updateConfig({ seatDia_in: rounded, seatPer: pct });
                        } else { e.target.value = vb6Fixed(fbSeatData.seatDia_in, 3); }
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    />"
                  </label>
                  {/* Editable: Seat % (VB6 txtSeatPer — 1 dec, 75–100, recalcs SeatDia) */}
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Seat %:
                    <input type="text"
                      key={`sp-${fbSeatData.seatPer}`}
                      defaultValue={vb6Fixed(fbSeatData.seatPer, 1)}
                      style={{ ...styles.input, width: '50px', padding: '2px 4px', fontSize: '12px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}
                      onBlur={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= 75 && v <= 100) {
                          const pct = Math.round(v * 10) / 10;
                          const dia = Math.round(config.intakeValveDia_in * pct / 100 * 1000) / 1000;
                          updateConfig({ seatPer: pct, seatDia_in: dia });
                        } else { e.target.value = vb6Fixed(fbSeatData.seatPer, 1); }
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    />
                  </label>
                  {/* Editable: Seat Angle (VB6 txtVSAngle — 1 dec, 30–60°) */}
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Seat Angle:
                    <input type="text"
                      key={`sa-${fbSeatData.vsAngle_deg}`}
                      defaultValue={vb6Fixed(fbSeatData.vsAngle_deg, 1)}
                      style={{ ...styles.input, width: '45px', padding: '2px 4px', fontSize: '12px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}
                      onBlur={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= 30 && v <= 60) {
                          updateConfig({ vsAngle_deg: Math.round(v * 10) / 10 });
                        } else { e.target.value = vb6Fixed(fbSeatData.vsAngle_deg, 1); }
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    />°
                  </label>
                  {/* Editable: Seat Width (VB6 txtVSWidth — 3 dec) */}
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Seat Width:
                    <input type="text"
                      key={`sw-${fbSeatData.vsWidth_in}`}
                      defaultValue={vb6Fixed(fbSeatData.vsWidth_in, 3)}
                      style={{ ...styles.input, width: '65px', padding: '2px 4px', fontSize: '12px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}
                      onBlur={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v > 0) {
                          updateConfig({ vsWidth_in: Math.round(v * 1000) / 1000 });
                        } else { e.target.value = vb6Fixed(fbSeatData.vsWidth_in, 3); }
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    />"
                  </label>
                  {/* Editable: Stem Dia (VB6 txtStemDia — 3 dec) */}
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Stem Dia:
                    <input type="text"
                      key={`st-${fbSeatData.stemDia_in}`}
                      defaultValue={vb6Fixed(fbSeatData.stemDia_in, 3)}
                      style={{ ...styles.input, width: '65px', padding: '2px 4px', fontSize: '12px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}
                      onBlur={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v > 0) {
                          updateConfig({ stemDia_in: Math.round(v * 1000) / 1000 });
                        } else { e.target.value = vb6Fixed(fbSeatData.stemDia_in, 3); }
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    />"
                  </label>
                </div>

                {/* Table + Chart side-by-side */}
                <div className="esd-detail-row">
                  <div className="esd-detail-table">
                    <table style={styles.proTable}>
                      <thead>
                        <tr>
                          <th style={styles.proTh}>#</th>
                          <th style={styles.proTh}>Lift (in)</th>
                          <th style={styles.proTh}>Flow (CFM)</th>
                          <th style={styles.proTh}>Area</th>
                          <th style={styles.proTh}>Vel</th>
                          <th style={styles.proTh}>Flux</th>
                          <th style={styles.proTh}>FV%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: MAX_FLOW_BENCH_ROWS }).map((_, i) => {
                          const row = fbResult.rows[i];
                          return (
                            <tr key={i} style={i % 2 === 0 ? styles.proTrEven : undefined}>
                              <td style={{ ...styles.proTd, color: 'var(--color-text-muted)', fontSize: '11px' }}>{i + 1}</td>
                              <td style={styles.proTd}>
                                <input
                                  type="text" style={{ ...styles.input, width: '60px', fontSize: '12px', textAlign: 'right', padding: '2px 4px' }}
                                  value={fbLiftTxt[i] || ''}
                                  onChange={e => setFbLiftTxt(p => { const n = [...p]; n[i] = e.target.value; return n; })}
                                  onBlur={e => commitFbLift(i, e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') commitFbLift(i, (e.target as HTMLInputElement).value); }}
                                />
                              </td>
                              <td style={styles.proTd}>
                                <input
                                  type="text" style={{ ...styles.input, width: '60px', fontSize: '12px', textAlign: 'right', padding: '2px 4px' }}
                                  value={fbFlowTxt[i] || ''}
                                  onChange={e => setFbFlowTxt(p => { const n = [...p]; n[i] = e.target.value; return n; })}
                                  onBlur={e => commitFbFlow(i, e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') commitFbFlow(i, (e.target as HTMLInputElement).value); }}
                                />
                              </td>
                              <td style={styles.proTd}>{row ? vb6Area3(row.area_sqin) : ''}</td>
                              <td style={styles.proTd}>{row ? vb6Vel1(row.velocity_fps) : ''}</td>
                              <td style={styles.proTd}>{row ? vb6Flux(row.flowFlux) : ''}</td>
                              <td style={styles.proTd}>{row ? vb6FVI(row.fvIndex_pct) : ''}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Chart */}
                  {fbChartDense.length > 1 && fbChartAxes && (
                    <div className="esd-detail-chart">
                      <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Intake Flow &amp; FV Index vs. Lift</div>
                      <div style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
                        <ResponsiveContainer width="100%" height={360}>
                          <LineChart data={fbChartDense} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis
                              dataKey="lift_in"
                              label={{ value: 'Lift (in)', position: 'insideBottom', offset: -3, style: { fontSize: 10 } }}
                              tick={{ fontSize: 10 }}
                              type="number"
                              domain={[fbChartAxes.xAx.min, fbChartAxes.xAx.max]}
                              ticks={fbChartAxes.xAx.ticks}
                              tickFormatter={(v: number) => v.toFixed(1)}
                            />
                            <YAxis
                              yAxisId="left"
                              label={{ value: 'Flow (CFM)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                              tick={{ fontSize: 10 }}
                              domain={[fbChartAxes.flowAx.min, fbChartAxes.flowAx.max]}
                              ticks={fbChartAxes.flowAx.ticks}
                              tickFormatter={(v: number) => String(Math.round(v))}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              label={{ value: 'FV Index (%)', angle: 90, position: 'insideRight', style: { fontSize: 10 } }}
                              tick={{ fontSize: 10 }}
                              domain={[fbChartAxes.fviAx.min, fbChartAxes.fviAx.max]}
                              ticks={fbChartAxes.fviAx.ticks}
                              tickFormatter={(v: number) => String(Math.round(v))}
                            />
                            <Tooltip
                              contentStyle={{ fontSize: '12px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                              labelStyle={{ color: 'var(--color-text)' }}
                              formatter={(value: number, name: string) => [
                                typeof value === 'number' ? vb6Fixed(value, 1) : value,
                                name,
                              ]}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                            <Line yAxisId="left" type="linear" dataKey="flow_cfm" stroke="#3b82f6" strokeWidth={2} name="Intake Flow (CFM)" dot={false} />
                            <Line yAxisId="right" type="linear" dataKey="fvIndex_pct" stroke="#f59e0b" strokeWidth={2} name="FV Index (%)" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary at max valve lift */}
                <div style={{ marginTop: '10px', padding: '8px', background: 'var(--color-surface)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Calculated values @ max intake valve lift: {vb6Lift(config.maxIntakeValveLift_in ?? 0.55)}"
                  </div>
                  <div className="esd-fb-summary">
                    <span>Flow: <strong>{vb6Flow(fbResult.summary.flow_cfm)} CFM</strong></span>
                    <span>CS Area: <strong>{vb6Area3(fbResult.summary.csArea_sqin)} sq in</strong></span>
                    <span>Velocity: <strong>{vb6Vel1(fbResult.summary.velocity_fps)} ft/s</strong></span>
                    <span>Flux: <strong>{vb6Flux(fbResult.summary.flowFlux)} CFM/in²</strong></span>
                    <span>FV Index: <strong>{vb6FVI(fbResult.summary.fvIndex_pct)}%</strong></span>
                  </div>
                </div>

                {/* Re-generate button */}
                <div style={{ marginTop: '8px' }}>
                  <button style={{ ...styles.iconButton, fontSize: '12px', padding: '4px 10px' }} onClick={() => initFlowBench(false)}>
                    Re-generate Defaults
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Mech Details — Pro */}
        {wsTab === 'mech_details' && (() => {
          const effMechRPM = mechRPM || result.rpmPeakHP;
          const mechLabel = rpmLabel(effMechRPM);
          return (
          <div style={styles.wsPanel}>
            {/* Top row: Piston Speed Summary (left) + Cranking Compression & Geometric Data (right) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Piston Speed Summary (FPM)</div>
                <table style={styles.proTable}>
                  <thead>
                    <tr>
                      <th style={styles.proTh}>Rating</th>
                      <th style={styles.proTh}>RPM</th>
                      <th style={styles.proTh}>Avg</th>
                      <th style={styles.proTh}>Max*</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pistonSpeedSummary.map((r, i) => {
                      const selected = r.rpm === effMechRPM;
                      return (
                      <tr key={i}
                        style={{ ...(i % 2 === 0 ? styles.proTrEven : undefined), cursor: 'pointer',
                          ...(selected ? { backgroundColor: 'var(--color-primary)', color: '#fff' } : {}) }}
                        onClick={() => setMechRPM(r.rpm)}>
                        <td style={{ ...styles.proTd, fontWeight: 500, ...(selected ? { color: '#fff' } : {}) }}>{r.name}</td>
                        <td style={{ ...styles.proTd, ...(selected ? { color: '#fff' } : {}) }}>{r.rpm.toLocaleString()}</td>
                        <td style={{ ...styles.proTd, ...(selected ? { color: '#fff' } : {}) }}>{vb6Speed(r.avgSpeed_fpm)}</td>
                        <td style={{ ...styles.proTd, ...(selected ? { color: '#fff' } : {}) }}>{vb6Speed(r.maxSpeed_fpm)}</td>
                      </tr>);
                    })}
                  </tbody>
                </table>
                {pistonSpeedSummary.length > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    *Max piston speed occurs @ {vb6Fixed(pistonSpeedSummary[0]?.maxSpeedAngle_deg ?? 0, 1)}° ATDC
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Est. Cranking Compression: {crankingCompression} psig</div>
                {geometricRatios && (
                  <>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Geometric Data Summary</div>
                    <table style={styles.proTable}>
                      <tbody>
                        {[
                          ['Bore / Stroke', geometricRatios.boreToStrokeRatio],
                          ['Rod / Stroke', geometricRatios.rodToStrokeRatio],
                          ['Piston-Head / Rod Length', geometricRatios.pistonToHeadRodLengthRatio],
                          ['Intake Throat / Bore Area', geometricRatios.intakeThroatBoreAreaRatio],
                          ['Valve Lift / Diameter', geometricRatios.intakeValveLiftDiameterRatio],
                        ].map(([label, value], i) => (
                          <tr key={i} style={i % 2 === 0 ? styles.proTrEven : undefined}>
                            <td style={{ ...styles.proTd, fontWeight: 500 }}>{label}</td>
                            <td style={{ ...styles.proTd, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </div>

            {/* VB6-style header */}
            <div style={styles.cardTitle}>
              Data @ {effMechRPM.toLocaleString()} RPM{mechLabel ? ` — ${mechLabel}` : ''}
            </div>

            {/* Chart + Data Table side-by-side */}
            <div className="esd-detail-row">
              <div className="esd-detail-chart">
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={mechChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                    <XAxis dataKey="angle_deg" label={{ value: 'Crank Angle (deg ATDC)', position: 'insideBottom', offset: -5 }} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" label={{ value: 'Speed (fpm)', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: 'Depth (in)', angle: 90, position: 'insideRight' }} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ fontSize: '12px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                      labelStyle={{ color: 'var(--color-text)' }}
                      formatter={(value: number, name: string) => [
                        name.includes('Depth') ? vb6Fixed(value, 3) : vb6Fixed(value, 1),
                        name,
                      ]}
                      labelFormatter={(label: number) => `${vb6Fixed(label, 1)}° ATDC`}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="pistonSpeed_fpm" stroke="#3b82f6" strokeWidth={2} name="Piston Speed (fpm)" dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="pistonDepth_in" stroke="#ef4444" strokeWidth={2} name="Piston Depth (in)" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="esd-detail-table">
                <table style={styles.proTable}>
                  <thead>
                    <tr>
                      <th style={styles.proTh}>deg ATDC</th>
                      <th style={styles.proTh}>Depth (in)</th>
                      <th style={{ ...styles.proTh, color: '#3b82f6' }}>Speed (fpm)</th>
                      <th style={{ ...styles.proTh, color: '#3b82f6' }}>Speed (fps)</th>
                      <th style={styles.proTh}>Accel (g)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mechTableData.map((p, i) => {
                      const isAngMPS = p.angle_deg % 1 !== 0;
                      return <tr key={i} style={i % 2 === 0 ? styles.proTrEven : undefined}>
                        <td style={styles.proTd}>{isAngMPS ? vb6Fixed(p.angle_deg, 1) : vb6AngleInt(p.angle_deg)}</td>
                        <td style={styles.proTd}>{vb6Depth(p.pistonDepth_in)}</td>
                        <td style={{ ...styles.proTd, color: '#3b82f6' }}>{vb6Speed(p.pistonSpeed_fpm)}</td>
                        <td style={{ ...styles.proTd, color: '#3b82f6' }}>{vb6Speed(p.pistonSpeed_fps)}</td>
                        <td style={styles.proTd}>{p.pistonAccel_gs}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>);
        })()}

        {/* Flow Details — Pro */}
        {wsTab === 'flow_details' && (() => {
          const effFlowRPM = flowRPM || result.rpmPeakHP;
          const flowLabel = rpmLabel(effFlowRPM);
          return (
          <div style={styles.wsPanel}>
            {/* Top: Camshaft Description (left) + Piston Speed Summary (right) */}
            <div className="esd-flow-top">
              <div>
                {/* VB6 FDetail.frm Frame2: "Camshaft Description" — editable overrides */}
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Camshaft Description</div>
                <table style={{ fontSize: '12px', color: 'var(--color-text-muted)', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '3px 8px 3px 0', whiteSpace: 'nowrap' }}>Type:</td>
                      <td style={{ padding: '3px 0', color: 'var(--color-text)' }}>{{
                        overhead_cam: 'Overhead Cam', roller: 'Roller Cam & Lifter',
                        mushroom_tappet: 'Mushroom Tappet', high_rate_flat_tappet: 'High Rate-of-Lift Flat Tappet',
                        normal_flat_tappet: 'Normal Flat Tappet & Solid Lifter', hydraulic_roller: 'Hydraulic Roller Cam & Lifter',
                        hydraulic_flat_tappet: 'Normal Hydraulic Cam & Lifter',
                      }[config.camshaftType] ?? config.camshaftType}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px 3px 0', whiteSpace: 'nowrap' }}>Duration @ .050" (deg):</td>
                      <td style={{ padding: '3px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input type="text" key={`fd-dur-${fdDuration}`} defaultValue={String(fdDuration)}
                          title={`Base: ${config.intakeDuration050_deg}° · Range: ${config.intakeDuration050_deg - 8}–${config.intakeDuration050_deg + 8}°`}
                          style={{ ...styles.input, width: '55px', padding: '2px 4px', fontSize: '12px', fontVariantNumeric: 'tabular-nums', textAlign: 'right', flex: 'none',
                            ...(fdDurationOverride !== null ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary)' } : {}) }}
                          onBlur={e => { const v = parseInt(e.target.value); if (!isNaN(v)) { const clamped = Math.max(config.intakeDuration050_deg - 8, Math.min(config.intakeDuration050_deg + 8, v)); setFdDurationOverride(clamped === config.intakeDuration050_deg ? null : clamped); } else { e.target.value = String(fdDuration); } }}
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        />°
                        {fdDurationOverride !== null && (
                          <button onClick={() => setFdDurationOverride(null)} title={`Reset to base (${config.intakeDuration050_deg}°)`}
                            style={{ fontSize: '10px', padding: '1px 5px', border: '1px solid var(--color-border)', borderRadius: '3px', background: 'var(--color-bg)', color: 'var(--color-text-muted)', cursor: 'pointer', lineHeight: '16px' }}>
                            ↩ {config.intakeDuration050_deg}
                          </button>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px 3px 0', whiteSpace: 'nowrap' }}>Lobe Centerline (deg):</td>
                      <td style={{ padding: '3px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input type="text" key={`fd-ilc-${fdILC}`} defaultValue={String(fdILC)}
                          title={`Base: ${resolvedILC}° · Range: ${resolvedILC - 4}–${resolvedILC + 4}°`}
                          style={{ ...styles.input, width: '50px', padding: '2px 4px', fontSize: '12px', fontVariantNumeric: 'tabular-nums', textAlign: 'right', flex: 'none',
                            ...(fdIlcOverride !== null ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary)' } : {}) }}
                          onBlur={e => { const v = parseInt(e.target.value); if (!isNaN(v)) { const clamped = Math.max(resolvedILC - 4, Math.min(resolvedILC + 4, v)); setFdIlcOverride(clamped === resolvedILC ? null : clamped); } else { e.target.value = String(fdILC); } }}
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        />
                        {fdIlcOverride !== null && (
                          <button onClick={() => setFdIlcOverride(null)} title={`Reset to base (${resolvedILC}°)`}
                            style={{ fontSize: '10px', padding: '1px 5px', border: '1px solid var(--color-border)', borderRadius: '3px', background: 'var(--color-bg)', color: 'var(--color-text-muted)', cursor: 'pointer', lineHeight: '16px' }}>
                            ↩ {resolvedILC}
                          </button>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px 3px 0', whiteSpace: 'nowrap' }}>Max Valve Lift (in):</td>
                      <td style={{ padding: '3px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input type="text" key={`fd-lift-${fdMaxLift}`} defaultValue={vb6Fixed(fdMaxLift, 3)}
                          title={`Base: ${vb6Fixed(config.maxIntakeValveLift_in ?? 0.55, 3)}" · Range: ±0.100"`}
                          style={{ ...styles.input, width: '60px', padding: '2px 4px', fontSize: '12px', fontVariantNumeric: 'tabular-nums', textAlign: 'right', flex: 'none',
                            ...(fdMaxLiftOverride !== null ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary)' } : {}) }}
                          onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) { const base = config.maxIntakeValveLift_in ?? 0.55; const clamped = Math.max(base - 0.1, Math.min(base + 0.1, v)); const rounded = Math.round(clamped * 1000) / 1000; setFdMaxLiftOverride(rounded === base ? null : rounded); } else { e.target.value = vb6Fixed(fdMaxLift, 3); } }}
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        />
                        {fdMaxLiftOverride !== null && (
                          <button onClick={() => setFdMaxLiftOverride(null)} title={`Reset to base (${vb6Fixed(config.maxIntakeValveLift_in ?? 0.55, 3)}")`}
                            style={{ fontSize: '10px', padding: '1px 5px', border: '1px solid var(--color-border)', borderRadius: '3px', background: 'var(--color-bg)', color: 'var(--color-text-muted)', cursor: 'pointer', lineHeight: '16px' }}>
                            ↩ {vb6Fixed(config.maxIntakeValveLift_in ?? 0.55, 3)}
                          </button>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px 3px 0', whiteSpace: 'nowrap' }}>LSA:</td>
                      <td style={{ padding: '3px 0', color: 'var(--color-text)' }}>{fmtCamDeg(resolvedLSA)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Piston Speed Summary — row selection */}
              {pistonSpeedSummary.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Piston Speed Summary (FPM)</div>
                  <table style={styles.proTable}>
                    <thead>
                      <tr>
                        <th style={styles.proTh}>Rating</th>
                        <th style={styles.proTh}>RPM</th>
                        <th style={styles.proTh}>Avg</th>
                        <th style={styles.proTh}>Max*</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pistonSpeedSummary.map((r, i) => {
                        const selected = r.rpm === effFlowRPM;
                        return (
                        <tr key={i}
                          style={{ ...(i % 2 === 0 ? styles.proTrEven : undefined), cursor: 'pointer',
                            ...(selected ? { backgroundColor: 'var(--color-primary)', color: '#fff' } : {}) }}
                          onClick={() => setFlowRPM(r.rpm)}>
                          <td style={{ ...styles.proTd, fontWeight: 500, ...(selected ? { color: '#fff' } : {}) }}>{r.name}</td>
                          <td style={{ ...styles.proTd, ...(selected ? { color: '#fff' } : {}) }}>{r.rpm.toLocaleString()}</td>
                          <td style={{ ...styles.proTd, ...(selected ? { color: '#fff' } : {}) }}>{vb6Speed(r.avgSpeed_fpm)}</td>
                          <td style={{ ...styles.proTd, ...(selected ? { color: '#fff' } : {}) }}>{vb6Speed(r.maxSpeed_fpm)}</td>
                        </tr>);
                      })}
                    </tbody>
                  </table>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    *Max piston speed occurs @ {vb6Fixed(pistonSpeedSummary[0]?.maxSpeedAngle_deg ?? 0, 1)}° ATDC
                  </div>
                </div>
              )}
            </div>

            {!flowDetailsConfig && (
              <div style={{ fontSize: '12px', color: 'var(--color-warning, #f59e0b)', marginBottom: '8px', padding: '6px 10px', background: 'var(--color-surface)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                No flowbench data loaded. Open the <strong>Flow Bench</strong> tab and generate data for accurate flow demand and test pressure calculations.
              </div>
            )}

            {/* VB6-style header */}
            <div style={styles.cardTitle}>
              Data @ {effFlowRPM.toLocaleString()} RPM{flowLabel ? ` — ${flowLabel}` : ''}
            </div>

            {/* Chart + Data Table side-by-side */}
            <div className="esd-detail-row">
              {/* Chart */}
              {flowGraphData.length > 1 && fdChartAxes && (
                <div className="esd-detail-chart">
                  <div style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
                    <ResponsiveContainer width="100%" height={360}>
                      <LineChart data={flowGraphData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis
                          dataKey="angle_deg"
                          label={{ value: 'Crank Angle (deg ATDC)', position: 'insideBottom', offset: -3, style: { fontSize: 10 } }}
                          tick={{ fontSize: 10 }}
                          type="number"
                          domain={[fdChartAxes.xAx.min, fdChartAxes.xAx.max]}
                          ticks={fdChartAxes.xAx.ticks}
                          tickFormatter={(v: number) => String(Math.round(v))}
                        />
                        <YAxis
                          yAxisId="left"
                          allowDataOverflow={true}
                          label={{ value: 'CFM / ft/s', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                          tick={{ fontSize: 10 }}
                          domain={[fdChartAxes.leftAx.min, fdChartAxes.leftAx.max]}
                          ticks={fdChartAxes.leftAx.ticks}
                          tickFormatter={(v: number) => String(Math.round(v))}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          allowDataOverflow={true}
                          label={{ value: 'Flow Area (sq in)', angle: 90, position: 'insideRight', style: { fontSize: 10 } }}
                          tick={{ fontSize: 10 }}
                          domain={[fdChartAxes.areaAx.min, fdChartAxes.areaAx.max]}
                          ticks={fdChartAxes.areaAx.ticks}
                          tickFormatter={(v: number) => v % 1 === 0 ? String(v) : v.toFixed(1)}
                        />
                        <Tooltip
                          contentStyle={{ fontSize: '12px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                          labelStyle={{ color: 'var(--color-text)' }}
                          formatter={(value: number, name: string) => [
                            typeof value === 'number'
                              ? (name.includes('Area') ? vb6Fixed(value, 3) : vb6Fixed(value, 0))
                              : value,
                            name,
                          ]}
                          labelFormatter={(label: number) => `${vb6Fixed(label, 0)}° ATDC`}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Line yAxisId="left" type="monotone" dataKey="flowDemand_cfm" stroke="#ef4444" strokeWidth={2} name="Piston Demand (CFM)" dot={false} />
                        <Line yAxisId="left" type="monotone" dataKey="flowVelocity_fps" stroke="#22c55e" strokeWidth={2} name="Flowbench Velocity (ft/s)" dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="flowArea_sqin" stroke="#06b6d4" strokeWidth={2} name="Flow Area (sq in)" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {/* Data Table */}
              <div className="esd-detail-table">
                <table style={styles.proTable}>
                  <thead>
                    <tr>
                      <th style={styles.proTh}>Event</th>
                      <th style={styles.proTh}>Angle</th>
                      <th style={styles.proTh}>Lift</th>
                      <th style={{ ...styles.proTh, color: '#06b6d4' }}>Area</th>
                      <th style={{ ...styles.proTh, color: '#3b82f6' }}>FPM</th>
                      <th style={{ ...styles.proTh, color: '#ef4444' }}>CFM</th>
                      <th style={{ ...styles.proTh, color: '#22c55e' }}>Vel</th>
                      <th style={{ ...styles.proTh, color: '#a855f7' }}>Test P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flowData.map((p, i) => {
                      const isAngMPS = p.eventLabel === 'Max Piston FPM';
                      return <tr key={i} style={i % 2 === 0 ? styles.proTrEven : undefined}>
                        <td style={{ ...styles.proTd, fontWeight: 500, fontSize: '11px' }}>{p.eventLabel}</td>
                        <td style={styles.proTd}>{isAngMPS ? vb6Fixed(p.angle_deg, 1) : vb6AngleInt(p.angle_deg)}</td>
                        <td style={styles.proTd}>{vb6Dim3(p.valveLift_in)}</td>
                        <td style={{ ...styles.proTd, color: '#06b6d4' }}>{vb6Area(p.flowArea_sqin)}</td>
                        <td style={{ ...styles.proTd, color: '#3b82f6' }}>{vb6Int(p.pistonSpeed_fpm)}</td>
                        <td style={{ ...styles.proTd, color: '#ef4444' }}>{vb6Int(p.flowDemand_cfm)}</td>
                        <td style={{ ...styles.proTd, color: '#22c55e' }}>{p.valveLift_in > 0.05 ? vb6Int(p.flowVelocity_fps) : '—'}</td>
                        <td style={{ ...styles.proTd, color: '#a855f7' }}>{p.testPressure_inH2O > 0 ? vb6Int(p.testPressure_inH2O) : '—'}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>);
        })()}

        {/* Recommendations — Pro */}
        {wsTab === 'recommendations' && (
          <div style={styles.wsPanel}>
            <div style={styles.cardTitle}>Recommendations</div>
            {!recsData ? (
              <div style={styles.stubNotice}>
                <div style={styles.stubTitle}>Calculation data unavailable</div>
                <div style={styles.stubText}>
                  The engine simulation did not produce the intermediate values required for recommendations.
                  Ensure all inputs are valid and re-run.
                </div>
              </div>
            ) : (
              <div className="esd-recs-grid">
                {/* VB6 RECOMD.FRM: 2x2 grid — Intake System / Exhaust Port / Camshaft / Exhaust System */}
                {/* Frame1: Intake System (top-left) */}
                <div style={styles.recsSection}>
                  <div style={styles.recsSectionTitle}>Intake System</div>
                  <div style={styles.recsRow}><span style={styles.recsLabel}>Intake Valve Lift - inch</span><span style={styles.recsValue}>{vb6Dim3(recsData.intakeValveLift_in)}</span></div>
                  <div style={styles.recsRow}><span style={styles.recsLabel}>Minimum Flow Area - sq inch</span><span style={styles.recsValue}>{vb6Fixed(recsData.intakeMinFlowArea_sqin ?? 0, 3)}</span></div>
                  <div style={styles.recsRow}><span style={styles.recsLabel}>Total Intake Track Length - inch</span><span style={styles.recsValue}>{vb6Fixed(recsData.intakeTrackLength_in, 1)}</span></div>
                  <div style={styles.recsRow}><span style={styles.recsLabel}>Maximum Flow Area - sq inch</span><span style={styles.recsValue}>{vb6Fixed(recsData.intakeMaxFlowArea_sqin ?? 0, 3)}</span></div>
                  <div style={styles.recsRow}><span style={styles.recsLabel}>Total Intake Track Volume - c.c.</span><span style={styles.recsValue}>{vb6Fixed(recsData.intakeTrackVolume_cc, 0)}</span></div>
                  {config.intakeManifoldType !== 'individual_runner' && (
                    <div style={styles.recsRow}><span style={styles.recsLabel}>Plenum Volume - cubic inch</span><span style={styles.recsValue}>{vb6Fixed(recsData.intakePlenumVolume_ci, 0)}</span></div>
                  )}
                </div>
                {/* Frame2: Exhaust Port (top-right) */}
                <div style={styles.recsSection}>
                  <div style={styles.recsSectionTitle}>Exhaust Port</div>
                  <div style={styles.recsRow}><span style={styles.recsLabel}>Exhaust Port Flow - CFM @ {config.flowTestPressure_inH2O}" H₂O</span><span style={styles.recsValue}>{vb6Fixed(recsData.exhaustFlow_cfm, 0)} = {vb6Fixed(recsData.exhaustFlow_pctIntake, 0)}%</span></div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', paddingLeft: '4px' }}>@ {vb6Fixed(config.flowTestBoreDia_in, 3)}" Ref. Bore Diameter</div>
                  <div style={styles.recsRow}><span style={styles.recsLabel}>Exhaust Valve Diameter - inch</span><span style={styles.recsValue}>{vb6Fixed(recsData.exhaustValveDiaMin_in ?? recsData.exhaustValveDia_in, 2)}-{vb6Fixed(recsData.exhaustValveDiaMax_in ?? recsData.exhaustValveDia_in, 2)}</span></div>
                  <div style={styles.recsRow}><span style={styles.recsLabel}>Exhaust Valve Lift - inch</span><span style={styles.recsValue}>{vb6Dim3(recsData.exhaustValveLift_in)}</span></div>
                  <div style={styles.recsRow}><span style={styles.recsLabel}>Minimum Flow Area - sq inch</span><span style={styles.recsValue}>{vb6Fixed(recsData.exhaustMinFlowArea_sqin ?? 0, 3)}</span></div>
                  <div style={styles.recsRow}><span style={styles.recsLabel}>Maximum Flow Area - sq inch</span><span style={styles.recsValue}>{vb6Fixed(recsData.exhaustMaxFlowArea_sqin ?? 0, 3)}</span></div>
                </div>
                {/* Frame3: Camshaft (bottom-left) */}
                <div style={styles.recsSection}>
                  <div style={styles.recsSectionTitle}>Camshaft</div>
                  <div style={styles.recsRow}><span style={styles.recsLabel}>Lobe Separation Angle - deg</span><span style={styles.recsValue}>{fmtCamDeg(recsData.lobeSeparationAngle_deg)}</span></div>
                  <div style={styles.recsRow}><span style={styles.recsLabel}>Intake Lobe Centerline - deg</span><span style={styles.recsValue}>{fmtCamDeg(recsData.intakeLobeCenterline_deg)}</span></div>
                  <div style={styles.recsRow}><span style={styles.recsLabel}>Exhaust Duration @ .050 inch - deg</span><span style={styles.recsValue}>{fmtCamDeg(recsData.exhaustDuration_deg)}</span></div>
                </div>
                {/* Frame4: Exhaust System (bottom-right) */}
                <div style={styles.recsSection}>
                  <div style={styles.recsSectionTitle}>Exhaust System</div>
                  <div style={styles.recsRow}><span style={styles.recsLabel}>Primary Tube Length - inch</span><span style={styles.recsValue}>{vb6Fixed(recsData.exhaustPrimaryLength_in, 1)}</span></div>
                  <div style={styles.recsRow}><span style={styles.recsLabel}>Primary Tube Diameter - inch</span><span style={styles.recsValue}>{vb6Fixed(recsData.exhaustPrimaryDia_in, 3)}</span></div>
                  {config.numCylinders > 1 && (
                    <div style={styles.recsRow}><span style={styles.recsLabel}>Collector Diameter - inch</span><span style={styles.recsValue}>{vb6Fixed(recsData.exhaustCollectorDia_in, 3)}</span></div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        

      </div>

      {/* DEV-only: VB6 Comparison Mode — axis debug block for side-by-side validation */}
      {import.meta.env.DEV && isProMode && fdChartAxes && fbChartAxes && (() => {
        const seeds = flowData.length >= 2 ? calcFlowDetailsAxisInputs(flowData) : null;
        const debugLines = [
          '=== Flow Details Axes ===',
          seeds ? `Seeds: FlowDemand(6)=${seeds.leftYMax.toFixed(2)}  FlowArea(7)=${seeds.rightYMax.toFixed(4)}` : 'Seeds: (no data)',
          seeds ? `  maxVelocity=${seeds.leftYMax.toFixed(2)}  Angles(1)=${seeds.firstAngle}  Angles(12)=${seeds.lastAngle}` : '',
          `X:  min=${fdChartAxes.xAx.min}  max=${fdChartAxes.xAx.max}  tickCount=${fdChartAxes.xAx.tickCount}  step=${((fdChartAxes.xAx.max - fdChartAxes.xAx.min) / fdChartAxes.xAx.tickCount).toFixed(2)}`,
          `Left Y:  min=${fdChartAxes.leftAx.min}  max=${fdChartAxes.leftAx.max}  step=${fdChartAxes.leftAx.step}`,
          `Right Y: min=${fdChartAxes.areaAx.min}  max=${fdChartAxes.areaAx.max}  step=${fdChartAxes.areaAx.step}`,
          '',
          '=== Flow Bench Axes ===',
          `X:  min=${fbChartAxes.xAx.min}  max=${fbChartAxes.xAx.max}  step=${fbChartAxes.xAx.step}`,
          `Left Y:  min=${fbChartAxes.flowAx.min}  max=${fbChartAxes.flowAx.max}  step=${fbChartAxes.flowAx.step}`,
          `Right Y: min=${fbChartAxes.fviAx.min}  max=${fbChartAxes.fviAx.max}  step=${fbChartAxes.fviAx.step}`,
        ].filter(Boolean).join('\n');

        return (
          <div style={{ margin: '12px', padding: '10px', border: '2px dashed #f59e0b', borderRadius: '8px', background: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>🔧 DEV: VB6 Comparison Mode</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  { label: 'BASECASE V8', cfg: { numCylinders: 8, layout: 'vee' as const, bore_in: 4.03, stroke_in: 3.48, rodLength_in: 5.85, compressionRatio: 12.9, camshaftType: 'normal_flat_tappet' as const, intakeDuration050_deg: 264, throttleCFM_at_1_5inHg: 750, isEFI: false, fuelType: 'gasoline' as const, intakeManifoldType: 'plenum' as const, runnerStyle: 'curved' as const, intakeManifoldFlowFactor_pct: 96, numIntakeValvesPerCyl: 1, intakeValveDia_in: 2.05, maxIntakeFlow_cfm: 250, flowTestPressure_inH2O: 28, flowTestBoreDia_in: 4.0, maxIntakeValveLift_in: 0.55 } },
                  { label: 'Big Block 454', cfg: { numCylinders: 8, layout: 'vee' as const, bore_in: 4.25, stroke_in: 4.0, rodLength_in: 6.135, compressionRatio: 10.25, camshaftType: 'hydraulic_flat_tappet' as const, intakeDuration050_deg: 224, throttleCFM_at_1_5inHg: 780, isEFI: false, fuelType: 'gasoline' as const, intakeManifoldType: 'dual_plane_divided' as const, runnerStyle: 'curved' as const, intakeManifoldFlowFactor_pct: 90, numIntakeValvesPerCyl: 1, intakeValveDia_in: 2.19, maxIntakeFlow_cfm: 280, flowTestPressure_inH2O: 28, flowTestBoreDia_in: 4.25, maxIntakeValveLift_in: 0.48 } },
                  { label: 'SBC 350 Mild', cfg: { numCylinders: 8, layout: 'vee' as const, bore_in: 4.0, stroke_in: 3.48, rodLength_in: 5.7, compressionRatio: 9.5, camshaftType: 'hydraulic_flat_tappet' as const, intakeDuration050_deg: 218, throttleCFM_at_1_5inHg: 600, isEFI: false, fuelType: 'gasoline' as const, intakeManifoldType: 'dual_plane_divided' as const, runnerStyle: 'curved' as const, intakeManifoldFlowFactor_pct: 92, numIntakeValvesPerCyl: 1, intakeValveDia_in: 1.94, maxIntakeFlow_cfm: 200, flowTestPressure_inH2O: 28, flowTestBoreDia_in: 4.0, maxIntakeValveLift_in: 0.45 } },
                  { label: 'High-Rev 302', cfg: { numCylinders: 8, layout: 'vee' as const, bore_in: 4.0, stroke_in: 3.0, rodLength_in: 5.09, compressionRatio: 13.5, camshaftType: 'roller' as const, intakeDuration050_deg: 290, throttleCFM_at_1_5inHg: 830, isEFI: false, fuelType: 'racing_gasoline' as const, intakeManifoldType: 'individual_runner' as const, runnerStyle: 'straight' as const, intakeManifoldFlowFactor_pct: 100, numIntakeValvesPerCyl: 1, intakeValveDia_in: 2.08, maxIntakeFlow_cfm: 320, flowTestPressure_inH2O: 28, flowTestBoreDia_in: 4.0, maxIntakeValveLift_in: 0.65 } },
                  { label: 'Inline 6 (250)', cfg: { numCylinders: 6, layout: 'inline' as const, bore_in: 3.875, stroke_in: 3.53, rodLength_in: 5.72, compressionRatio: 8.5, camshaftType: 'hydraulic_flat_tappet' as const, intakeDuration050_deg: 204, throttleCFM_at_1_5inHg: 350, isEFI: false, fuelType: 'gasoline' as const, intakeManifoldType: 'plenum' as const, runnerStyle: 'curved' as const, intakeManifoldFlowFactor_pct: 85, numIntakeValvesPerCyl: 1, intakeValveDia_in: 1.72, maxIntakeFlow_cfm: 160, flowTestPressure_inH2O: 28, flowTestBoreDia_in: 3.875, maxIntakeValveLift_in: 0.40 } },
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => setConfig(prev => ({ ...prev, ...p.cfg }))}
                    style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', cursor: 'pointer' }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <pre style={{ fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'pre', margin: 0, padding: '6px', background: 'var(--color-bg)', borderRadius: '4px', border: '1px solid var(--color-border)', lineHeight: 1.5 }}>
              {debugLines}
            </pre>
            <button
              onClick={() => navigator.clipboard.writeText(debugLines)}
              style={{ marginTop: '4px', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', cursor: 'pointer' }}
            >
              📋 Copy debug text
            </button>
          </div>
        );
      })()}

    </Page>
  );
}

const styles = {
  dashboard: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    overflow: 'auto',
    maxWidth: '100%',
  },
  topRow: {
    display: 'grid',
    gap: '12px',
    minHeight: '300px',
  },
  bottomRow: {
    display: 'grid',
    gap: '12px',
    overflow: 'visible',
  },
  resultsCard: {
    backgroundColor: 'var(--color-bg)',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column' as const,
    minWidth: 0,
  },
  inputCard: {
    backgroundColor: 'var(--color-bg)',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    minWidth: 0,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: '600' as const,
    marginBottom: '10px',
    color: 'var(--color-text)',
    borderBottom: '2px solid var(--color-primary)',
    paddingBottom: '6px',
  },
  resultBox: {
    padding: '8px 12px',
    backgroundColor: 'var(--color-surface)',
    borderRadius: '5px',
    border: '1px solid var(--color-border)',
  },
  resultLabel: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase' as const,
    fontWeight: '500' as const,
    whiteSpace: 'nowrap' as const,
  },
  resultValueLarge: {
    fontSize: '22px',
    fontWeight: '700' as const,
    color: 'var(--color-primary)',
    lineHeight: 1,
  },
  resultSubtext: {
    fontSize: '11px',
    color: 'var(--color-muted)',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    minWidth: '170px',
    flex: '0 0 170px',
  },
  input: {
    padding: '5px 8px',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: '12px',
    flex: 1,
    backgroundColor: 'var(--color-input-bg)',
    color: 'var(--color-text)',
  },
  select: {
    padding: '5px 8px',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: '12px',
    flex: 1,
    backgroundColor: 'var(--color-input-bg)',
    color: 'var(--color-text)',
  },
  iconButton: {
    padding: '5px 10px',
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
  },
  wsTabBar: {
    display: 'flex',
    gap: '2px',
    borderBottom: '2px solid var(--color-border)',
    paddingBottom: '0',
    overflowX: 'auto' as const,
    overflowY: 'hidden' as const,
    flexWrap: 'nowrap' as const,
    WebkitOverflowScrolling: 'touch' as const,
    scrollbarWidth: 'thin' as const,
  },
  wsTabBtn: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '500' as const,
    color: 'var(--color-text-muted)',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    marginBottom: '-2px',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  wsTabBtnActive: {
    color: 'var(--color-primary)',
    borderBottomColor: 'var(--color-primary)',
    fontWeight: '600' as const,
  },
  wsPanel: {
    backgroundColor: 'var(--color-bg)',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'visible',
    minWidth: 0,
  },
  wsTabSeparator: {
    display: 'inline-block',
    width: '1px',
    alignSelf: 'stretch',
    backgroundColor: 'var(--color-border)',
    margin: '4px 4px',
  },
  wsTabBtnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  stubNotice: {
    padding: '24px',
    border: '2px dashed var(--color-border)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-surface)',
    textAlign: 'center' as const,
  },
  stubTitle: {
    fontSize: '14px',
    fontWeight: '600' as const,
    color: 'var(--color-text-muted)',
    marginBottom: '8px',
  },
  stubText: {
    fontSize: '12px',
    color: 'var(--color-muted)',
    lineHeight: 1.6,
    maxWidth: '500px',
    margin: '0 auto',
  },
  // Pro detail tables (Mech Details, Flow Details)
  proTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '12px',
    color: 'var(--color-text)',
    minWidth: 0,
  },
  proTh: {
    padding: '5px 8px',
    textAlign: 'right' as const,
    fontWeight: 600 as const,
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    borderBottom: '2px solid var(--color-border)',
    whiteSpace: 'nowrap' as const,
  },
  proTd: {
    padding: '4px 8px',
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap' as const,
  },
  proTrEven: {
    backgroundColor: 'var(--color-surface)',
  },
  // Recommendations key/value sections
  recsSection: {
    padding: '12px',
    backgroundColor: 'var(--color-surface)',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
  },
  recsSectionTitle: {
    fontSize: '13px',
    fontWeight: 700 as const,
    color: 'var(--color-primary)',
    marginBottom: '8px',
    paddingBottom: '4px',
    borderBottom: '1px solid var(--color-border)',
  },
  recsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '12px',
    borderBottom: '1px dotted var(--color-border)',
  },
  recsLabel: {
    color: 'var(--color-text-muted)',
  },
  recsValue: {
    fontWeight: 600 as const,
    color: 'var(--color-text)',
    fontVariantNumeric: 'tabular-nums' as const,
  },
  // File I/O panel
  fileError: {
    padding: '8px 12px',
    marginBottom: '10px',
    borderRadius: '6px',
    fontSize: '12px',
    backgroundColor: 'var(--color-warning-bg)',
    border: '1px solid var(--color-warning-border)',
    color: 'var(--color-text)',
    display: 'flex',
    alignItems: 'center',
  },
  fileBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 14px',
    fontSize: '12px',
    fontWeight: 500 as const,
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    cursor: 'pointer',
  },
  fileBtnPrimary: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    borderColor: 'var(--color-primary)',
  },
  constraintNotice: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 500 as const,
    color: 'var(--color-text)',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
  },
};
