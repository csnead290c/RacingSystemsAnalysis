/**
 * Engine Sim → Vehicle mapping test.
 *
 * Verifies that createEngineFromSim produces a SavedEngine with the
 * correct fields, and that applying it to a Vehicle (the same way
 * VehicleEditor does) populates the expected engine fields.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createEngineFromSim, saveSavedEngine, loadSavedEngines, getSavedEngine } from '../components';
import type { SavedEngine } from '../../domain/schemas/components.schema';
import type { Vehicle } from '../../domain/schemas/vehicle.schema';

describe('Engine Sim → Vehicle mapping', () => {
  const PEAK_HP = 485;
  const RPM_PEAK_HP = 6800;
  const HP_CURVE = [
    { rpm: 3500, hp: 267 },
    { rpm: 4500, hp: 351 },
    { rpm: 5500, hp: 432 },
    { rpm: 6500, hp: 475 },
    { rpm: 6800, hp: 485 },
    { rpm: 7500, hp: 468 },
  ];

  it('createEngineFromSim produces a valid SavedEngine', () => {
    const engine: SavedEngine = createEngineFromSim(
      'Test Engine',
      PEAK_HP,
      RPM_PEAK_HP,
      HP_CURVE,
      'enginePro',
      { bore_in: 4.0, stroke_in: 3.48 }
    );

    expect(engine.id).toBeTruthy();
    expect(engine.name).toBe('Test Engine');
    expect(engine.source).toBe('enginePro');
    expect(engine.peakHP).toBe(PEAK_HP);
    expect(engine.rpmAtPeakHP).toBe(RPM_PEAK_HP);
    expect(engine.hpCurve).toHaveLength(HP_CURVE.length);
    expect(engine.hpCurve![0].rpm).toBe(3500);
    expect(engine.hpCurve![0].hp).toBe(267);
    expect(engine.createdAt).toBeGreaterThan(0);
    expect(engine.engineProConfig).toEqual({ bore_in: 4.0, stroke_in: 3.48 });
  });

  it('SavedEngine fields map correctly to Vehicle engine fields', () => {
    const engine: SavedEngine = createEngineFromSim(
      'My Engine',
      PEAK_HP,
      RPM_PEAK_HP,
      HP_CURVE,
      'enginePro'
    );
    engine.displacement = 350;
    engine.peakTorque = 420;
    engine.rpmAtPeakTorque = 4800;

    // Simulate what VehicleEditor does when user selects an engine
    // (src/shared/components/VehicleEditor.tsx lines 600-611)
    const baseVehicle: Partial<Vehicle> = {
      id: 'v1',
      name: 'Test Car',
      weightLb: 2400,
      rolloutIn: 12,
      tireDiaIn: 28,
      rearGear: 3.73,
      powerHP: 300,
      defaultRaceLength: 'QUARTER' as any,
    };

    const updatedVehicle = {
      ...baseVehicle,
      engineRef: engine.id,
      powerHP: engine.peakHP,
      rpmAtPeakHP: engine.rpmAtPeakHP,
      hpCurve: engine.hpCurve,
      displacementCID: engine.displacement,
    };

    expect(updatedVehicle.engineRef).toBe(engine.id);
    expect(updatedVehicle.powerHP).toBe(PEAK_HP);
    expect(updatedVehicle.rpmAtPeakHP).toBe(RPM_PEAK_HP);
    expect(updatedVehicle.hpCurve).toHaveLength(HP_CURVE.length);
    expect(updatedVehicle.displacementCID).toBe(350);
    // Original vehicle fields preserved
    expect(updatedVehicle.weightLb).toBe(2400);
    expect(updatedVehicle.rearGear).toBe(3.73);
  });

  it('SavedEngine without hpCurve still provides peak values', () => {
    const engine: SavedEngine = createEngineFromSim(
      'Jr Engine',
      400,
      6500,
      undefined,
      'engineJr'
    );

    expect(engine.peakHP).toBe(400);
    expect(engine.rpmAtPeakHP).toBe(6500);
    expect(engine.hpCurve).toBeUndefined();
    expect(engine.source).toBe('engineJr');
  });
});

// ============================================================================
// Full round-trip regression: save → localStorage → load → select → vehicle
// ============================================================================

describe('Engine Sim → localStorage → Vehicle Editor round-trip', () => {
  let mockStore: Record<string, string>;

  beforeEach(() => {
    mockStore = {};
    const fakeStorage = {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, value: string) => { mockStore[key] = value; },
      removeItem: (key: string) => { delete mockStore[key]; },
      clear: () => { mockStore = {}; },
      get length() { return Object.keys(mockStore).length; },
      key: (i: number) => Object.keys(mockStore)[i] ?? null,
    };
    vi.stubGlobal('localStorage', fakeStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const PEAK_HP = 510;
  const RPM_PEAK_HP = 7000;
  const HP_CURVE = [
    { rpm: 4000, hp: 300 },
    { rpm: 5500, hp: 420 },
    { rpm: 7000, hp: 510 },
    { rpm: 7500, hp: 490 },
  ];

  it('saveSavedEngine persists and loadSavedEngines retrieves it', () => {
    const engine = createEngineFromSim('Round Trip Engine', PEAK_HP, RPM_PEAK_HP, HP_CURVE, 'enginePro');
    engine.displacement = 383;
    saveSavedEngine(engine);

    const loaded = loadSavedEngines();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(engine.id);
    expect(loaded[0].name).toBe('Round Trip Engine');
    expect(loaded[0].peakHP).toBe(PEAK_HP);
    expect(loaded[0].rpmAtPeakHP).toBe(RPM_PEAK_HP);
    expect(loaded[0].hpCurve).toHaveLength(HP_CURVE.length);
    expect(loaded[0].displacement).toBe(383);
  });

  it('getSavedEngine retrieves by ID after save', () => {
    const engine = createEngineFromSim('Lookup Engine', PEAK_HP, RPM_PEAK_HP, HP_CURVE, 'enginePro');
    saveSavedEngine(engine);

    const found = getSavedEngine(engine.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('Lookup Engine');
    expect(found!.peakHP).toBe(PEAK_HP);
  });

  it('subsequent save with same ID updates in place (no duplicates)', () => {
    const engine = createEngineFromSim('Dup Test', 400, 6500, HP_CURVE, 'enginePro');
    saveSavedEngine(engine);
    expect(loadSavedEngines()).toHaveLength(1);

    // "Re-save" with updated HP but same ID
    engine.peakHP = 520;
    saveSavedEngine(engine);
    const loaded = loadSavedEngines();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].peakHP).toBe(520);
  });

  it('loaded engine maps to vehicle fields correctly (VehicleEditor contract)', () => {
    const engine = createEngineFromSim('Vehicle Map', PEAK_HP, RPM_PEAK_HP, HP_CURVE, 'enginePro');
    engine.displacement = 383;
    saveSavedEngine(engine);

    // Simulate VehicleEditor selecting this engine by ID
    const found = getSavedEngine(engine.id);
    expect(found).toBeDefined();

    const vehicle = {
      id: 'v1',
      name: 'Test Car',
      weightLb: 2400,
      powerHP: 300,
      // Apply engine (mirrors VehicleEditor onChange)
      engineRef: found!.id,
      ...(found && {
        powerHP: found.peakHP,
        rpmAtPeakHP: found.rpmAtPeakHP,
        hpCurve: found.hpCurve,
        displacementCID: found.displacement,
      }),
    };

    expect(vehicle.engineRef).toBe(engine.id);
    expect(vehicle.powerHP).toBe(PEAK_HP);
    expect(vehicle.rpmAtPeakHP).toBe(RPM_PEAK_HP);
    expect(vehicle.hpCurve).toHaveLength(HP_CURVE.length);
    expect(vehicle.displacementCID).toBe(383);
    // Original fields preserved
    expect(vehicle.weightLb).toBe(2400);
  });
});
