/**
 * Engine Sim Report Model — pure data builder for the print report.
 *
 * Takes (config, outputs, isProMode, recsData) and returns a stable,
 * serializable data structure that the print component renders.
 * This keeps rendering logic separate from data assembly and makes
 * the report shape easy to unit-test.
 */

import type { EngineSimConfig } from './engineAdapter';
import type { EngineOutputs } from './engineTypes';
import type { FlowDetailPoint, EngineRecommendations } from './engineProDetails';
import { cidToLiters, hpToKw, lbftToNm, tqPerCid } from './engineUnitConversions';

// ── Report model types ──────────────────────────────────────────────

export interface ReportInputRow {
  label: string;
  value: string;
}

export interface ReportInputSection {
  title: string;
  rows: ReportInputRow[];
}

export interface ReportPerformance {
  peakHP: number;
  rpmPeakHP: number;
  peakTQ: number;
  rpmPeakTQ: number;
  displacement_ci: number;
  displacement_L: number;
  peakHP_kW: number;
  peakTQ_Nm: number;
  hpPerCID: number;
  tqPerCID: number;
  shift: number;
  redline: number;
}

export interface DynoPoint {
  rpm: number;
  hp: number;
  tq: number;
}

export interface ReportProSections {
  flowDetails: FlowDetailPoint[] | null;
  recommendations: EngineRecommendations | null;
}

export interface EngineSimReportModel {
  title: string;
  simName: string;
  generatedAt: string;
  inputs: ReportInputSection[];
  performance: ReportPerformance;
  dynoSeries: DynoPoint[];
  pro: ReportProSections | null;
}

// ── Label maps ──────────────────────────────────────────────────────

const LAYOUT_LABELS: Record<string, string> = {
  inline: 'Inline', vee: 'V', flat: 'Flat/Opposed',
};

const CAM_LABELS: Record<string, string> = {
  overhead_cam: 'Overhead Cam',
  roller: 'Roller',
  mushroom_tappet: 'Mushroom Tappet',
  high_rate_flat_tappet: 'High-Rate Flat Tappet',
  normal_flat_tappet: 'Normal Flat Tappet',
  hydraulic_roller: 'Hydraulic Roller',
  hydraulic_flat_tappet: 'Hydraulic Flat Tappet',
};

const FUEL_LABELS: Record<string, string> = {
  gasoline: 'Gasoline', racing_gasoline: 'Racing Gasoline', methanol: 'Methanol',
};

const MANIFOLD_LABELS: Record<string, string> = {
  plenum: 'Plenum', individual_runner: 'Individual Runner',
  dual_plane_divided: 'Dual Plane (Divided)', dual_plane_slot: 'Dual Plane (Slot)',
};

// ── Builder ─────────────────────────────────────────────────────────

export function buildEngineSimReport(
  config: EngineSimConfig,
  outputs: EngineOutputs,
  displacement_ci: number,
  simName: string,
  isProMode: boolean,
  flowDetails: FlowDetailPoint[] | null,
  recommendations: EngineRecommendations | null,
  dynoSeries: DynoPoint[] = [],
): EngineSimReportModel {
  const inputs: ReportInputSection[] = [
    {
      title: 'Engine Design',
      rows: [
        { label: 'Configuration', value: `${config.numCylinders}-cyl ${LAYOUT_LABELS[config.layout] ?? config.layout}` },
        { label: 'Bore', value: `${config.bore_in.toFixed(3)} in` },
        { label: 'Stroke', value: `${config.stroke_in.toFixed(3)} in` },
        { label: 'Rod Length', value: `${config.rodLength_in.toFixed(3)} in` },
        { label: 'Compression Ratio', value: `${config.compressionRatio.toFixed(1)}:1` },
        { label: 'Displacement', value: `${displacement_ci.toFixed(1)} ci` },
      ],
    },
    {
      title: 'Camshaft',
      rows: [
        { label: 'Type', value: CAM_LABELS[config.camshaftType] ?? config.camshaftType },
        { label: 'Intake Duration @.050"', value: `${config.intakeDuration050_deg}°` },
        ...(config.lobeSeparationAngle_deg != null
          ? [{ label: 'Lobe Separation Angle', value: `${config.lobeSeparationAngle_deg}°` }]
          : []),
        ...(config.intakeLobeCenterline_deg != null
          ? [{ label: 'Intake Lobe Centerline', value: `${config.intakeLobeCenterline_deg}°` }]
          : []),
        ...(config.maxIntakeValveLift_in != null
          ? [{ label: 'Max Intake Valve Lift', value: `${config.maxIntakeValveLift_in.toFixed(3)} in` }]
          : []),
      ],
    },
    {
      title: 'Induction',
      rows: [
        { label: 'Fuel System', value: config.isEFI ? 'EFI' : 'Carburetor' },
        { label: 'Throttle CFM @1.5" Hg', value: `${config.throttleCFM_at_1_5inHg}` },
        { label: 'Fuel Type', value: FUEL_LABELS[config.fuelType] ?? config.fuelType },
        { label: 'Intake Manifold', value: MANIFOLD_LABELS[config.intakeManifoldType] ?? config.intakeManifoldType },
        { label: 'Runner Style', value: config.runnerStyle === 'curved' ? 'Curved' : 'Straight' },
        { label: 'Manifold Flow Factor', value: `${config.intakeManifoldFlowFactor_pct}%` },
      ],
    },
    {
      title: 'Cylinder Head',
      rows: [
        { label: 'Intake Valves/Cyl', value: `${config.numIntakeValvesPerCyl}` },
        { label: 'Intake Valve Dia', value: `${config.intakeValveDia_in.toFixed(3)} in` },
        { label: 'Max Intake Flow', value: `${config.maxIntakeFlow_cfm} CFM` },
        { label: 'Flow Test Pressure', value: `${config.flowTestPressure_inH2O} inH₂O` },
        { label: 'Flow Test Bore Dia', value: `${config.flowTestBoreDia_in.toFixed(3)} in` },
      ],
    },
  ];

  const performance: ReportPerformance = {
    peakHP: outputs.peakHP,
    rpmPeakHP: outputs.rpmPeakHP,
    peakTQ: outputs.peakTQ,
    rpmPeakTQ: outputs.rpmPeakTQ,
    displacement_ci,
    displacement_L: cidToLiters(displacement_ci),
    peakHP_kW: hpToKw(outputs.peakHP),
    peakTQ_Nm: lbftToNm(outputs.peakTQ),
    hpPerCID: outputs.hpPerCID,
    tqPerCID: tqPerCid(outputs.peakTQ, displacement_ci),
    shift: outputs.shift,
    redline: outputs.redline,
  };

  const pro: ReportProSections | null = isProMode
    ? { flowDetails, recommendations }
    : null;

  return {
    title: 'Engine Sim Report',
    simName,
    generatedAt: new Date().toLocaleString(),
    inputs,
    performance,
    dynoSeries,
    pro,
  };
}

// ── Dyno table sampling ──────────────────────────────────────────────

/** Sample dyno points for the fallback table. Always includes first and last. */
export function sampleDynoPoints(points: DynoPoint[]): DynoPoint[] {
  if (points.length <= 20) return points;
  const step = 2;
  const result: DynoPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    if (i % step === 0) result.push(points[i]);
  }
  // Guarantee last point is included
  if (result[result.length - 1] !== points[points.length - 1]) {
    result.push(points[points.length - 1]);
  }
  return result;
}
