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
 */
function aliasFields(input: any) {
  if (input?.drivetrain?.shiftsRPM && !input.drivetrain.shiftRPM) {
    input.drivetrain.shiftRPM = input.drivetrain.shiftsRPM;
  }
  if (input?.drivetrain?.overallEfficiency && !input.drivetrain?.overallEff) {
    input.drivetrain.overallEff = input.drivetrain.overallEfficiency;
  }
  return input;
}

/**
 * Ensure engineParams.powerHP exists.
 * Converts VB6-style engineHP array to modern format with fuel multiplier.
 */
function ensurePowerHP(input: any) {
  if (input?.engineParams?.powerHP || input?.engineParams?.torqueCurve) return input;
  const hpMult = input?.fuel?.hpTorqueMultiplier ?? 1;
  if (Array.isArray(input?.engineHP)) {
    const powerHP: PowerPt[] = input.engineHP
      .map((pt: any) =>
        Array.isArray(pt)
          ? { rpm: Number(pt[0]), hp: Number(pt[1]) * hpMult }
          : { rpm: Number(pt?.rpm), hp: Number(pt?.hp) * hpMult })
      .filter(p => Number.isFinite(p.rpm) && Number.isFinite(p.hp))
      .sort((a, b) => a.rpm - b.rpm);
    if (powerHP.length >= 2) {
      input.engineParams = { ...(input.engineParams ?? {}), powerHP };
    }
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
 * Normalize field names (aliases)
 */
function normalizeFieldNames(input: any) {
  if (input?.drivetrain?.shiftsRPM && !input.drivetrain.shiftRPM) {
    input.drivetrain.shiftRPM = input.drivetrain.shiftsRPM;
  }
  if (input?.drivetrain?.overallEfficiency && !input.drivetrain?.overallEff) {
    input.drivetrain.overallEff = input.drivetrain.overallEfficiency;
  }
}

/**
 * Normalize engine params from VB6 engineHP
 */
function normalizeEngineParams(input: any) {
  if (!input?.engineParams?.powerHP && Array.isArray(input?.engineHP)) {
    const hpMult = input?.fuel?.hpTorqueMultiplier ?? 1;
    const powerHP = input.engineHP
      .map((pt: any) => Array.isArray(pt)
        ? { rpm: Number(pt[0]), hp: Number(pt[1]) * hpMult }
        : { rpm: Number(pt?.rpm), hp: Number(pt?.hp) * hpMult })
      .filter((p: any) => Number.isFinite(p.rpm) && Number.isFinite(p.hp))
      .sort((a: any, b: any) => a.rpm - b.rpm);
    if (powerHP.length >= 2) {
      input.engineParams = { ...(input.engineParams ?? {}), powerHP };
    }
  }
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

    // 2) Normalize field names (aliases)
    normalizeFieldNames(input);

    // 3) Normalize power curve if only engineHP exists
    normalizeEngineParams(input);

    // 4) Validate
    const hp = input?.engineParams?.powerHP;
    if (!Array.isArray(hp) || hp.length < 2) {
      console.error('[WORKER] bad powerHP', { hpLen: hp?.length, sample: hp?.slice?.(0, 2) });
      throw new Error('EngineParams must provide either torqueCurve or powerHP');
    }

    // 5) Ensure race length
    if (!Number.isFinite(input?.raceLengthFt)) {
      input.raceLengthFt = msg?.raceLengthFt ?? 1320;
    }

    console.log('[WORKER:normalized.input]', {
      hasEngineParams: !!input.engineParams,
      hasPowerHP: !!hp,
      raceLengthFt: input.raceLengthFt,
      hpSummary: hpDebugHash(hp),
    });

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
