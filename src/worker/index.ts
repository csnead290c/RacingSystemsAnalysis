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
 * Handle incoming messages from the main thread.
 */
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  const { id, kind } = message;

  try {
    if (kind === 'quarter') {
      // Execute baseline prediction
      const result = predictBaseline(message.payload);

      // Send success response
      const response: WorkerSuccessResponse = {
        id,
        ok: true,
        kind: 'quarter',
        result,
      };

      self.postMessage(response);
    } else if (kind === 'physics') {
      // Accept flat input or { input } or { fixture, raceLengthFt }
      const raw = message.payload || {};
      let payload: any = (raw as any)?.fixture ? { ...((raw as any).fixture || {}) } : { ...raw };

      payload = aliasFields(payload);
      payload = ensurePowerHP(payload);

      console.log('[WORKER:normalized.input]', {
        hasEngineParams: !!payload.engineParams,
        hasPowerHP: !!payload?.engineParams?.powerHP,
        sampleHP: payload?.engineParams?.powerHP?.slice?.(0, 3),
      });

      if (!payload?.engineParams?.powerHP && !payload?.engineParams?.torqueCurve) {
        throw new Error('EngineParams must provide either torqueCurve or powerHP');
      }

      const modelId = message.model || payload.model || 'RSACLASSIC';
      const model = getModel(modelId);
      const result = model.simulate(payload);

      // Send success response
      const response: WorkerSuccessResponse = {
        id,
        ok: true,
        kind: 'physics',
        result,
      };

      self.postMessage(response);
    } else {
      throw new Error(`Unknown message kind: ${kind}`);
    }
  } catch (error) {
    // Send error response
    const errorMessage = error instanceof Error ? error.message : String(error);
    const response: WorkerErrorResponse = {
      id,
      ok: false,
      error: errorMessage,
    };

    self.postMessage(response);
  }
});

// Export types for use in main thread
export type { WorkerMessage, WorkerResponse, WorkerSuccessResponse, WorkerErrorResponse };
