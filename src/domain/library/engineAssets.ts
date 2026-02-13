/**
 * Engine Asset Domain Model
 *
 * Defines the types and helper converters for the Engine Asset ecosystem.
 * An Engine Asset represents a reusable engine configuration that can be
 * "installed" into a Vehicle with a pinned revision reference.
 *
 * Three kinds of engine assets:
 *  - "sim"         — created from Engine Sim (full config + result summary)
 *  - "manual_peak" — user-entered peak HP/RPM values
 *  - "dyno_curve"  — user-entered or imported dyno curve points
 *
 * Design decisions:
 *  - Scope supports "personal" (default) and "team" (for future team sharing).
 *  - Revision number increments on each update, enabling pinned references.
 *  - Payloads are discriminated by `kind` for type safety.
 *  - Helper converters produce the exact input shapes that QuarterJr and
 *    QuarterPro simulations expect, so the vehicle sim layer doesn't need
 *    to know which kind of asset it's working with.
 */

import type { EngineSimConfig } from '../physics/engine/engineAdapter';

// ── Enums / Literals ────────────────────────────────────────────────

export type EngineAssetScope = 'personal' | 'team';
export type EngineAssetKind = 'sim' | 'manual_peak' | 'dyno_curve';

// ── Base ────────────────────────────────────────────────────────────

export interface EngineAssetBase {
  id: string;
  name: string;
  scope: EngineAssetScope;
  kind: EngineAssetKind;
  tags?: string[];
  notes?: string;
  createdAt: string;   // ISO-8601
  updatedAt: string;   // ISO-8601
  createdByUserId?: string;
  revision: number;    // starts at 1, increments on update
}

// ── Payloads ────────────────────────────────────────────────────────

export interface EngineResultSummary {
  peakHP: number;
  peakHpRpm: number;
  peakTQ: number;
  peakTqRpm: number;
  displacement_ci: number;
  numCylinders: number;
  camshaftType: string;
}

export interface EngineAssetSimPayload {
  engineSimConfig: EngineSimConfig;
  engineSimResultSummary: EngineResultSummary;
}

export interface EngineAssetManualPeakPayload {
  peakHP: number;
  peakHpRpm: number;
  peakTQ?: number;
  peakTqRpm?: number;
}

export interface DynoCurvePoint {
  rpm: number;
  hp: number;
  tq: number;
}

export interface EngineAssetDynoCurvePayload {
  points: DynoCurvePoint[];
  source?: 'user' | 'import';
}

// ── Discriminated Union ─────────────────────────────────────────────

export interface EngineAssetSim extends EngineAssetBase {
  kind: 'sim';
  payload: EngineAssetSimPayload;
}

export interface EngineAssetManualPeak extends EngineAssetBase {
  kind: 'manual_peak';
  payload: EngineAssetManualPeakPayload;
}

export interface EngineAssetDynoCurve extends EngineAssetBase {
  kind: 'dyno_curve';
  payload: EngineAssetDynoCurvePayload;
}

export type EngineAsset = EngineAssetSim | EngineAssetManualPeak | EngineAssetDynoCurve;

// ── Vehicle Install Types ───────────────────────────────────────────

/**
 * Override patch applied on top of a pinned engine asset.
 * Keeps the scope small: multiplier for dyno curves, direct fields for peaks.
 */
export interface EngineOverridePatch {
  peakHP?: number;
  peakHpRpm?: number;
  peakTQ?: number;
  peakTqRpm?: number;
  /** Multiplier applied to all HP/TQ values in a dyno curve (e.g. 1.05 = +5%) */
  dynoCurveMultiplier?: number;
}

/**
 * Pinned engine install on a vehicle.
 * The vehicle stores the asset ID + the revision it was pinned at.
 * Overrides are optional and layered on top of the pinned data.
 */
export interface EngineInstall {
  engineAssetId: string;
  pinnedRevision: number;
  overrides?: EngineOverridePatch;
}

/**
 * Manual engine entry on a vehicle (no asset link).
 * Supports the same two modes as QuarterJr/Pro.
 */
export interface EngineManualEntry {
  mode: 'manual_peak' | 'dyno_curve';
  manualPeak?: {
    peakHP: number;
    peakHpRpm: number;
    peakTQ?: number;
    peakTqRpm?: number;
  };
  dynoCurve?: {
    points: DynoCurvePoint[];
  };
}

// ── Converter Outputs ───────────────────────────────────────────────

/** Input shape for QuarterJr simulation (peak HP/RPM only). */
export interface QuarterJrEngineInput {
  peakHP: number;
  peakHpRpm: number;
  peakTQ?: number;
  peakTqRpm?: number;
}

/** Input shape for QuarterPro simulation (full dyno curve). */
export interface QuarterProEngineInput {
  dynoPoints: DynoCurvePoint[];
}

// ── Converters ──────────────────────────────────────────────────────

/**
 * Extract QuarterJr engine input from any EngineAsset kind.
 * Applies overrides if provided.
 */
export function toQuarterJrEngineInput(
  asset: EngineAsset,
  overrides?: EngineOverridePatch,
): QuarterJrEngineInput {
  let result: QuarterJrEngineInput;

  switch (asset.kind) {
    case 'sim': {
      const s = asset.payload.engineSimResultSummary;
      result = {
        peakHP: s.peakHP,
        peakHpRpm: s.peakHpRpm,
        peakTQ: s.peakTQ,
        peakTqRpm: s.peakTqRpm,
      };
      break;
    }
    case 'manual_peak': {
      const p = asset.payload;
      result = {
        peakHP: p.peakHP,
        peakHpRpm: p.peakHpRpm,
        peakTQ: p.peakTQ,
        peakTqRpm: p.peakTqRpm,
      };
      break;
    }
    case 'dyno_curve': {
      // Derive peak from curve points
      const pts = asset.payload.points;
      let maxHp = 0;
      let maxTq = 0;
      let hpRpm = 0;
      let tqRpm = 0;
      for (const pt of pts) {
        if (pt.hp > maxHp) { maxHp = pt.hp; hpRpm = pt.rpm; }
        if (pt.tq > maxTq) { maxTq = pt.tq; tqRpm = pt.rpm; }
      }
      result = { peakHP: maxHp, peakHpRpm: hpRpm, peakTQ: maxTq, peakTqRpm: tqRpm };
      break;
    }
  }

  // Apply overrides
  if (overrides) {
    if (overrides.peakHP !== undefined) result.peakHP = overrides.peakHP;
    if (overrides.peakHpRpm !== undefined) result.peakHpRpm = overrides.peakHpRpm;
    if (overrides.peakTQ !== undefined) result.peakTQ = overrides.peakTQ;
    if (overrides.peakTqRpm !== undefined) result.peakTqRpm = overrides.peakTqRpm;
    // dynoCurveMultiplier affects HP/TQ values
    if (overrides.dynoCurveMultiplier !== undefined && overrides.dynoCurveMultiplier !== 1) {
      result.peakHP *= overrides.dynoCurveMultiplier;
      if (result.peakTQ !== undefined) result.peakTQ *= overrides.dynoCurveMultiplier;
    }
  }

  return result;
}

/**
 * Extract QuarterPro engine input from any EngineAsset kind.
 * Applies overrides if provided.
 *
 * For "manual_peak" assets, synthesizes a single-point "curve" so the
 * caller always gets an array. The vehicle sim layer can decide whether
 * to use the curve or fall back to peak values.
 */
export function toQuarterProEngineInput(
  asset: EngineAsset,
  overrides?: EngineOverridePatch,
): QuarterProEngineInput {
  let points: DynoCurvePoint[];

  switch (asset.kind) {
    case 'sim': {
      // Sim assets don't store a dyno curve in the asset payload (the curve
      // is generated at runtime from the config). Synthesize from summary.
      const s = asset.payload.engineSimResultSummary;
      points = [
        { rpm: s.peakTqRpm, hp: s.peakTQ * s.peakTqRpm / 5252, tq: s.peakTQ },
        { rpm: s.peakHpRpm, hp: s.peakHP, tq: s.peakHP * 5252 / s.peakHpRpm },
      ];
      break;
    }
    case 'manual_peak': {
      const p = asset.payload;
      const tq = p.peakTQ ?? (p.peakHP * 5252 / p.peakHpRpm);
      points = [{ rpm: p.peakHpRpm, hp: p.peakHP, tq }];
      break;
    }
    case 'dyno_curve': {
      points = [...asset.payload.points];
      break;
    }
  }

  // Apply overrides
  if (overrides?.dynoCurveMultiplier !== undefined && overrides.dynoCurveMultiplier !== 1) {
    const m = overrides.dynoCurveMultiplier;
    points = points.map(pt => ({ rpm: pt.rpm, hp: pt.hp * m, tq: pt.tq * m }));
  }

  return { dynoPoints: points };
}
