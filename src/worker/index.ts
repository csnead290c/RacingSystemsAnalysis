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
 * Normalize VB6-style inputs to modern format.
 * Handles engineHP array conversion and fuel multiplier application.
 */
function normalizeEngineParams(input: any): any {
  // If already has engineParams.powerHP, return as-is
  if (input?.engineParams?.powerHP || input?.engineParams?.torqueCurve) {
    return input;
  }

  const hpMult = input?.fuel?.hpTorqueMultiplier ?? 1;

  // Support VB6-style engineHP: [[rpm, hp], ...] OR [{rpm, hp}, ...]
  const vb6HP = input?.engineHP;
  if (Array.isArray(vb6HP) && vb6HP.length >= 2) {
    const powerHP: PowerPt[] = vb6HP
      .map((pt: any) => {
        if (Array.isArray(pt)) {
          const [rpm, hp] = pt;
          return { rpm: Number(rpm), hp: Number(hp) * hpMult };
        }
        return { rpm: Number(pt.rpm), hp: Number(pt.hp) * hpMult };
      })
      .filter((p) => Number.isFinite(p.rpm) && Number.isFinite(p.hp))
      .sort((a, b) => a.rpm - b.rpm);

    input.engineParams = { ...(input.engineParams ?? {}), powerHP };
  }

  return input;
}

/**
 * Normalize field name variations.
 * Handles different naming conventions from Dev Portal.
 */
function normalizeFieldNames(input: any): any {
  // Handle shiftsRPM → shiftRPM
  if (input?.drivetrain?.shiftsRPM && !input.drivetrain.shiftRPM) {
    input.drivetrain.shiftRPM = input.drivetrain.shiftsRPM;
  }

  // Handle overallEfficiency → overallEff
  if (input?.drivetrain?.overallEfficiency && !input.drivetrain.overallEff) {
    input.drivetrain.overallEff = input.drivetrain.overallEfficiency;
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
      // Normalize VB6-style inputs
      let normalized = normalizeEngineParams(message.payload);
      normalized = normalizeFieldNames(normalized);

      // Execute physics model simulation
      const model = getModel(message.model);
      const result = model.simulate(normalized);

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
