/**
 * EngineSim Document Model — versioned JSON format for save/load.
 *
 * Schema identifier: "rsa.engineSim"
 * Current version: 1
 *
 * Design decisions:
 *  - JSON-only (no binary). Human-readable, diffable.
 *  - `schema` + `version` fields at root for forward-compatible migration.
 *  - `config` stores the full EngineSimConfig so the sim can be reproduced exactly.
 *  - `ui` stores optional ephemeral UI state (active tab, RPM selectors).
 *  - Timestamps are ISO-8601 strings (timezone-aware).
 */

import type { EngineSimConfig } from './engineAdapter';

// ── Schema constants ────────────────────────────────────────────────

export const ENGINE_SIM_SCHEMA = 'rsa.engineSim' as const;
export const ENGINE_SIM_CURRENT_VERSION = 1 as const;
export const ENGINE_SIM_FILE_EXTENSION = '.rsaeng';

// ── Document type ───────────────────────────────────────────────────

export interface EngineSimDocumentV1 {
  schema: typeof ENGINE_SIM_SCHEMA;
  version: 1;
  createdAtIso: string;
  updatedAtIso: string;
  name?: string;
  config: EngineSimConfig;
  notes?: string;
  ui?: {
    activeTab?: string;
    selectedRpmMech?: number;
    selectedRpmFlow?: number;
  };
}

/** Union of all document versions (currently only V1). */
export type EngineSimDocument = EngineSimDocumentV1;

// ── Validation ──────────────────────────────────────────────────────

/** Minimal shape check — is this object plausibly an EngineSim document? */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Validate and migrate any raw parsed object into the current document version.
 *
 * Throws a user-friendly Error if the input is not a valid EngineSim document.
 * When future versions are added, migration logic goes here.
 */
export function migrateEngineSimDocument(raw: unknown): EngineSimDocumentV1 {
  if (!isPlainObject(raw)) {
    throw new Error('Invalid file: expected a JSON object.');
  }

  if (raw.schema !== ENGINE_SIM_SCHEMA) {
    throw new Error(
      `Invalid file: expected schema "${ENGINE_SIM_SCHEMA}", got "${String(raw.schema ?? 'undefined')}".`
    );
  }

  const version = raw.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new Error(
      `Invalid file: expected a positive integer version, got "${String(version)}".`
    );
  }

  if (version > ENGINE_SIM_CURRENT_VERSION) {
    throw new Error(
      `This file was created with a newer version of RSA (document version ${version}). ` +
      `Please update the app to open it.`
    );
  }

  // ── Version-specific migration ──
  // Currently only V1 exists. Future versions add cases here:
  //   if (version === 1) { raw = migrateV1toV2(raw); }
  //   if (version === 2) { raw = migrateV2toV3(raw); }
  //   ...

  // ── Validate V1 required fields ──
  if (!isPlainObject(raw.config)) {
    throw new Error('Invalid file: missing or invalid "config" object.');
  }

  const config = raw.config as Record<string, unknown>;

  // Check a few critical fields to catch corrupt files early
  const requiredNumericFields = ['bore_in', 'stroke_in', 'rodLength_in', 'compressionRatio'];
  for (const field of requiredNumericFields) {
    if (typeof config[field] !== 'number' || !Number.isFinite(config[field] as number)) {
      throw new Error(`Invalid file: config.${field} must be a finite number.`);
    }
  }

  // Fill timestamps if missing (e.g. hand-edited files)
  const now = new Date().toISOString();
  if (typeof raw.createdAtIso !== 'string') {
    raw.createdAtIso = now;
  }
  if (typeof raw.updatedAtIso !== 'string') {
    raw.updatedAtIso = now;
  }

  return raw as unknown as EngineSimDocumentV1;
}

// ── Serialization ───────────────────────────────────────────────────

/**
 * Serialize a document to a pretty-printed JSON string.
 * Numeric precision is preserved by JSON.stringify (IEEE 754 round-trip safe).
 */
export function serializeEngineSimDocument(doc: EngineSimDocumentV1): string {
  // Update timestamp on every serialize (= every save)
  const out: EngineSimDocumentV1 = {
    ...doc,
    updatedAtIso: new Date().toISOString(),
  };
  return JSON.stringify(out, null, 2);
}

/**
 * Parse a JSON string into a validated, migrated EngineSimDocumentV1.
 * Throws user-friendly errors for malformed input.
 */
export function parseEngineSimDocument(json: string): EngineSimDocumentV1 {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Invalid file: not valid JSON.');
  }
  return migrateEngineSimDocument(raw);
}

// ── Factory ─────────────────────────────────────────────────────────

/** Create a fresh document wrapping the given config. */
export function createEngineSimDocument(
  config: EngineSimConfig,
  name?: string,
  notes?: string,
): EngineSimDocumentV1 {
  const now = new Date().toISOString();
  return {
    schema: ENGINE_SIM_SCHEMA,
    version: ENGINE_SIM_CURRENT_VERSION,
    createdAtIso: now,
    updatedAtIso: now,
    name,
    config,
    ...(notes ? { notes } : {}),
  };
}
