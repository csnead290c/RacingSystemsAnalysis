/**
 * Web Worker for quarter-mile predictions.
 * Handles message-based communication with the main thread.
 */

import { predictBaseline } from './pipeline';
import type { PredictRequest } from '../domain/quarter/types';
import { getModel, type PhysicsModelId, type SimInputs, type SimResult } from '../domain/physics';

/**
 * Power point for engine curve.
 */
type PowerPt = { rpm: number; hp: number };

/**
 * Add field name aliases for compatibility.
 * Handles: shiftsRPM → shiftRPM, overallEfficiency → overallEff, ratios ↔ gearRatios
 */
function aliasFields(input: any): any {
  // Drivetrain aliases
  if (input?.drivetrain) {
    const dt = input.drivetrain;
    
    // shiftsRPM → shiftRPM
    if (dt.shiftsRPM && !dt.shiftRPM) {
      dt.shiftRPM = dt.shiftsRPM;
    }
    // overallEfficiency → overallEff
    if (dt.overallEfficiency !== undefined && dt.overallEff === undefined) {
      dt.overallEff = dt.overallEfficiency;
    }
    // Bidirectional: ratios ↔ gearRatios
    if (dt.ratios && !dt.gearRatios) {
      dt.gearRatios = dt.ratios;
    }
    if (dt.gearRatios && !dt.ratios) {
      dt.ratios = dt.gearRatios;
    }
  }
  
  // Vehicle aliases (same pattern)
  if (input?.vehicle) {
    const v = input.vehicle;
    if (v.ratios && !v.gearRatios) {
      v.gearRatios = v.ratios;
    }
    if (v.gearRatios && !v.ratios) {
      v.ratios = v.gearRatios;
    }
  }
  
  return input;
}

/**
 * Convert torque curve point to HP.
 * If point has hp, use it directly. If point has torque, compute hp = torque * rpm / 5252.
 */
function torquePtToHP(pt: any, mult: number): PowerPt | null {
  const rpm = Number(pt?.rpm);
  if (!Number.isFinite(rpm)) return null;
  
  // If hp is present, use it directly
  if (Number.isFinite(pt?.hp)) {
    return { rpm, hp: Number(pt.hp) * mult };
  }
  // If torque is present, convert: hp = torque * rpm / 5252
  if (Number.isFinite(pt?.torque)) {
    const hp = (Number(pt.torque) * rpm / 5252) * mult;
    return { rpm, hp };
  }
  // Also check tq_lbft alias
  if (Number.isFinite(pt?.tq_lbft)) {
    const hp = (Number(pt.tq_lbft) * rpm / 5252) * mult;
    return { rpm, hp };
  }
  return null;
}

/**
 * Ensure engineParams.powerHP exists.
 * Converts VB6-style engineHP array or torqueCurve to modern format with fuel multiplier.
 */
function ensurePowerHP(input: any): any {
  // Already has powerHP?
  if (Array.isArray(input?.engineParams?.powerHP) && input.engineParams.powerHP.length >= 2) {
    return input;
  }
  
  const hpMult = input?.fuel?.hpTorqueMultiplier ?? 1;
  let powerHP: PowerPt[] = [];
  
  // Try engineHP first (VB6 format)
  if (Array.isArray(input?.engineHP) && input.engineHP.length >= 2) {
    powerHP = input.engineHP
      .map((pt: any) => {
        if (Array.isArray(pt)) {
          return { rpm: Number(pt[0]), hp: Number(pt[1]) * hpMult };
        }
        return torquePtToHP(pt, hpMult);
      })
      .filter((p: PowerPt | null): p is PowerPt => p !== null && Number.isFinite(p.rpm) && Number.isFinite(p.hp))
      .sort((a: PowerPt, b: PowerPt) => a.rpm - b.rpm);
  }
  
  // Try engineParams.torqueCurve
  if (powerHP.length < 2 && Array.isArray(input?.engineParams?.torqueCurve) && input.engineParams.torqueCurve.length >= 2) {
    powerHP = input.engineParams.torqueCurve
      .map((pt: any) => torquePtToHP(pt, hpMult))
      .filter((p: PowerPt | null): p is PowerPt => p !== null && Number.isFinite(p.rpm) && Number.isFinite(p.hp))
      .sort((a: PowerPt, b: PowerPt) => a.rpm - b.rpm);
  }
  
  // Try vehicle.torqueCurve
  if (powerHP.length < 2 && Array.isArray(input?.vehicle?.torqueCurve) && input.vehicle.torqueCurve.length >= 2) {
    powerHP = input.vehicle.torqueCurve
      .map((pt: any) => torquePtToHP(pt, hpMult))
      .filter((p: PowerPt | null): p is PowerPt => p !== null && Number.isFinite(p.rpm) && Number.isFinite(p.hp))
      .sort((a: PowerPt, b: PowerPt) => a.rpm - b.rpm);
  }
  
  if (powerHP.length >= 2) {
    input.engineParams = { ...(input.engineParams ?? {}), powerHP };
  }
  
  return input;
}

/**
 * Message envelope for worker communication.
 */
type WorkerMessage =
  | {
      id: string;
      kind: 'quarter';
      payload: PredictRequest;
    }
  | {
      id: string;
      kind: 'physics';
      model: PhysicsModelId;
      payload: SimInputs;
    };

/**
 * Success response envelope.
 */
type WorkerSuccessResponse =
  | {
      id: string;
      ok: true;
      kind: 'quarter';
      result: ReturnType<typeof predictBaseline>;
    }
  | {
      id: string;
      ok: true;
      kind: 'physics';
      result: SimResult;
    };

/**
 * Error response envelope.
 */
interface WorkerErrorResponse {
  id: string;
  ok: false;
  error: string;
}

type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;

/**
 * Normalize field names (aliases) and ensure powerHP exists.
 * Combines aliasFields and ensurePowerHP for complete normalization.
 */
function normalizeInput(input: any): void {
  aliasFields(input);
  ensurePowerHP(input);
}

/**
 * Create debug hash of HP array to verify data integrity.
 */
function hpDebugHash(hp?: any[]): string {
  if (!Array.isArray(hp)) return 'none';
  const first = hp[0]?.rpm, last = hp[hp.length - 1]?.rpm, n = hp.length;
  return `n=${n},first=${first},last=${last}`;
}

/**
 * Handle incoming messages from the main thread.
 */
self.onmessage = async (ev: MessageEvent) => {
  try {
    const msg = ev.data;
    if (!msg?.model || !msg?.payload) throw new Error('Bad worker message');

    // 1) Deep-clone to avoid structured clone surprises
    const input = JSON.parse(JSON.stringify(msg.payload));

    // 2) Normalize field names (aliases) and ensure powerHP exists
    normalizeInput(input);

    // 3) Validate
    const hp = input?.engineParams?.powerHP;
    if (!Array.isArray(hp) || hp.length < 2) {
      console.error('[WORKER] bad powerHP', { hpLen: hp?.length, sample: hp?.slice?.(0, 2) });
      throw new Error('EngineParams must provide either torqueCurve or powerHP');
    }

    // 5) Ensure race length
    if (!Number.isFinite(input?.raceLengthFt)) {
      input.raceLengthFt = msg?.raceLengthFt ?? 1320;
    }

    const dt = input?.drivetrain ?? {};
    console.log('[WORKER:normalized.input]', {
      hasEngineParams: !!input.engineParams,
      hasPowerHP: !!hp,
      raceLengthFt: input.raceLengthFt,
      hpSummary: hpDebugHash(hp),
      hasClutch: !!dt.clutch,
      hasConverter: !!dt.converter,
      slipRPM: dt?.clutch?.slipRPM,
      stallRPM: dt?.converter?.stallRPM,
    });

    // Log tuning parameters only when present (null-safe)
    try {
      if (input?.tuning) {
        // eslint-disable-next-line no-console
        console.debug('[WORKER:TUNING]', true, input.tuning);
      }
    } catch { /* ignore */ }

    // Pipe vb6Strict flag (default true for VB6 parity)
    if (input.flags === undefined) input.flags = {};
    if (input.flags.vb6Strict === undefined) {
      input.flags.vb6Strict = msg.payload?.flags?.vb6Strict ?? true;
    }

    const model = getModel(msg.model);
    const result = await model.simulate(input);
    (self as any).postMessage({ ok: true, result });
  } catch (e: any) {
    console.error('[WORKER ERROR]', e);
    (self as any).postMessage({ ok: false, error: String(e?.message || e) });
  }
};

// Export types for use in main thread
export type { WorkerMessage, WorkerResponse, WorkerSuccessResponse, WorkerErrorResponse };
