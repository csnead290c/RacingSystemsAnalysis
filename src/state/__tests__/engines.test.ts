/**
 * DB-backed Engine Library tests.
 *
 * Tests the engines.ts state layer which wraps the DB API with
 * localStorage fallback. Since we can't hit the real DB in unit tests,
 * we mock the API and verify the fallback + mirror behavior.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEngineFromSim, saveSavedEngine, loadSavedEngines } from '../components';

// Mock the enginesApi module
vi.mock('../../services/api', () => ({
  enginesApi: {
    getAll: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { enginesApi } from '../../services/api';
import { listEngines, getEngine, createEngine, saveEngineRevision } from '../engines';
import type { EngineRevisionPayload } from '../../services/api';

describe('engines.ts — DB-backed engine library', () => {
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
    // Stub window.dispatchEvent to avoid jsdom issues
    vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const PAYLOAD: EngineRevisionPayload = {
    name: 'Test Engine',
    source: 'enginePro',
    peak_hp: 485,
    rpm_at_peak_hp: 6800,
    peak_torque: 420,
    rpm_at_peak_torque: 4800,
    displacement_cid: 350,
    fuel_type: 'Gasoline',
    hp_curve: [
      { rpm: 3500, hp: 267 },
      { rpm: 6800, hp: 485 },
    ],
    engine_sim_config: { bore_in: 4.0 },
  };

  describe('listEngines', () => {
    it('returns engines from API when available', async () => {
      const mockEngines = [{
        id: 'uuid-1', name: 'API Engine', source: 'enginePro', scope: 'personal',
        current_revision: 2, revision: 2, peak_hp: 500, rpm_at_peak_hp: 7000,
        peak_torque: null, rpm_at_peak_torque: null, displacement_cid: 383,
        fuel_type: 'Gasoline', hp_curve: null, engine_sim_config: null,
        engine_sim_doc_id: null, notes: null,
        created_at: '2025-01-01', updated_at: '2025-01-02',
      }];
      (enginesApi.getAll as any).mockResolvedValue({ engines: mockEngines });

      const result = await listEngines();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('uuid-1');
      expect(result[0].name).toBe('API Engine');
      expect(result[0].peakHP).toBe(500);
      expect(result[0].currentRevision).toBe(2);
    });

    it('falls back to localStorage when API fails', async () => {
      (enginesApi.getAll as any).mockRejectedValue(new Error('Network error'));

      // Seed localStorage with a saved engine
      const engine = createEngineFromSim('Local Engine', 400, 6500, undefined, 'enginePro');
      saveSavedEngine(engine);

      const result = await listEngines();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Local Engine');
      expect(result[0].peakHP).toBe(400);
    });
  });

  describe('getEngine', () => {
    it('returns engine detail from API', async () => {
      const mockEngine = {
        id: 'uuid-2', name: 'Detail Engine', source: 'enginePro', scope: 'personal',
        current_revision: 1, revision: 1, peak_hp: 485, rpm_at_peak_hp: 6800,
        peak_torque: 420, rpm_at_peak_torque: 4800, displacement_cid: 350,
        fuel_type: 'Gasoline', hp_curve: [{ rpm: 6800, hp: 485 }],
        engine_sim_config: { bore_in: 4.0 }, engine_sim_doc_id: null, notes: null,
        created_at: '2025-01-01', updated_at: '2025-01-01',
      };
      (enginesApi.get as any).mockResolvedValue({ engine: mockEngine });

      const result = await getEngine('uuid-2');
      expect(result).not.toBeNull();
      expect(result!.peakHP).toBe(485);
      expect(result!.hpCurve).toHaveLength(1);
      expect(result!.engineSimConfig).toEqual({ bore_in: 4.0 });
    });

    it('falls back to localStorage when API fails', async () => {
      (enginesApi.get as any).mockRejectedValue(new Error('Network error'));

      const engine = createEngineFromSim('Fallback Engine', 500, 7000, undefined, 'enginePro');
      engine.displacement = 383;
      saveSavedEngine(engine);

      const result = await getEngine(engine.id);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Fallback Engine');
      expect(result!.peakHP).toBe(500);
      expect(result!.displacementCID).toBe(383);
    });
  });

  describe('createEngine (Save As)', () => {
    it('calls API and mirrors to localStorage', async () => {
      const mockResponse = {
        id: 'new-uuid', name: 'Test Engine', source: 'enginePro', scope: 'personal',
        current_revision: 1, revision: 1, peak_hp: 485, rpm_at_peak_hp: 6800,
        peak_torque: 420, rpm_at_peak_torque: 4800, displacement_cid: 350,
        fuel_type: 'Gasoline', hp_curve: PAYLOAD.hp_curve,
        engine_sim_config: PAYLOAD.engine_sim_config, engine_sim_doc_id: null, notes: null,
        created_at: '2025-01-01', updated_at: '2025-01-01',
      };
      (enginesApi.create as any).mockResolvedValue({ success: true, engine: mockResponse });

      const result = await createEngine(PAYLOAD);
      expect(result.id).toBe('new-uuid');
      expect(result.revision).toBe(1);
      expect(result.peakHP).toBe(485);

      // Verify localStorage mirror
      const local = loadSavedEngines();
      expect(local).toHaveLength(1);
      expect(local[0].id).toBe('new-uuid');
      expect(local[0].peakHP).toBe(485);
    });

    it('falls back to localStorage when API fails', async () => {
      (enginesApi.create as any).mockRejectedValue(new Error('Network error'));

      const result = await createEngine(PAYLOAD);
      expect(result.peakHP).toBe(485);
      expect(result.revision).toBe(1);

      // Should be in localStorage
      const local = loadSavedEngines();
      expect(local).toHaveLength(1);
    });
  });

  describe('saveEngineRevision (Save)', () => {
    it('calls API update and mirrors to localStorage', async () => {
      const mockResponse = {
        id: 'existing-uuid', name: 'Updated Engine', source: 'enginePro', scope: 'personal',
        current_revision: 2, revision: 2, peak_hp: 520, rpm_at_peak_hp: 7200,
        peak_torque: 440, rpm_at_peak_torque: 5000, displacement_cid: 383,
        fuel_type: 'Gasoline', hp_curve: null,
        engine_sim_config: null, engine_sim_doc_id: null, notes: null,
        created_at: '2025-01-01', updated_at: '2025-01-02',
      };
      (enginesApi.update as any).mockResolvedValue({ success: true, engine: mockResponse });

      const updatedPayload: EngineRevisionPayload = {
        ...PAYLOAD,
        name: 'Updated Engine',
        peak_hp: 520,
        rpm_at_peak_hp: 7200,
      };

      const result = await saveEngineRevision('existing-uuid', updatedPayload);
      expect(result.id).toBe('existing-uuid');
      expect(result.revision).toBe(2);
      expect(result.peakHP).toBe(520);

      // Verify localStorage mirror updated
      const local = loadSavedEngines();
      expect(local).toHaveLength(1);
      expect(local[0].id).toBe('existing-uuid');
      expect(local[0].peakHP).toBe(520);
    });
  });
});
