import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Page from '../shared/components/Page';
import PeekCard from '../shared/components/PeekCard';
import EnvironmentForm from '../shared/components/EnvironmentForm';
import { calculate } from '../workerBridge';
import { completeRun, type CompletionResult } from '../domain/quarter/completion';
import { createModel, update } from '../domain/learning/model';
import { extractFeatures } from '../domain/learning/features';
import { getModel, saveModel } from '../state/models';
import { storage } from '../state/storage';
import { hasFeature, getEntitlements, CURRENT_TIER } from '../domain/config/entitlements';
import { DEFAULT_ENV } from '../domain/schemas/env.schema';
import { parseCsv, mapWeatherRow, csvToObjects } from '../shared/utils/csvImport';
import type { RunRecordV1 } from '../domain/schemas/run.schema';
import type { RaceLength } from '../domain/config/raceLengths';
import type { Env } from '../domain/schemas/env.schema';
import type { PredictResult, PredictRequest } from '../domain/quarter/types';

function Log() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Section A: Run Context
  const [vehicleId, setVehicleId] = useState('');
  const [raceLength, setRaceLength] = useState<RaceLength>('QUARTER');
  const [env, setEnv] = useState<Env>(DEFAULT_ENV);
  const [baselineRequest, setBaselineRequest] = useState<PredictRequest | null>(null);
  const [baselineResult, setBaselineResult] = useState<PredictResult | null>(null);
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [features, setFeatures] = useState<number[] | null>(null);

  // Section B: Run Completion
  const [splitDistance, setSplitDistance] = useState<number>(660);
  const [splitTime, setSplitTime] = useState('');
  const [splitMph, setSplitMph] = useState('');
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);

  // Section C: Actual Result & Save
  const [actualET, setActualET] = useState('');
  const [actualMPH, setActualMPH] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleImportWeatherCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseCsv(file);
      const objects = csvToObjects(parsed);
      
      if (objects.length === 0) {
        alert('CSV file has no data rows');
        return;
      }

      // Try to map first row
      const mappedEnv = mapWeatherRow(objects[0]);
      
      if (mappedEnv) {
        setEnv(mappedEnv);
        alert(`✓ Weather data imported from CSV`);
      } else {
        alert('Couldn\'t detect required columns (elevation, temperature, barometer, humidity)');
      }
    } catch (error) {
      console.error('Failed to import CSV:', error);
      alert('Failed to parse CSV file');
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleComputeBaseline = async () => {
    setBaselineError(null);
    setBaselineResult(null);
    setFeatures(null);
    setCompletionResult(null);

    if (!vehicleId.trim()) {
      setBaselineError('Vehicle ID is required');
      return;
    }

    setBaselineLoading(true);

    try {
      // Dummy vehicle for baseline calculation
      const vehicle = {
        id: vehicleId,
        name: vehicleId,
        weightLb: 3000,
        tireDiaIn: 28,
        rearGear: 3.73,
        rolloutIn: 12,
        powerHP: 400,
        defaultRaceLength: raceLength,
      };

      const req: PredictRequest = { vehicle, env, raceLength };
      const result = await calculate(req);
      
      setBaselineRequest(req);
      setBaselineResult(result);

      // Extract features for learning
      const extracted = extractFeatures(req, result);
      setFeatures(extracted.x);

      setBaselineLoading(false);
    } catch (err) {
      setBaselineError(err instanceof Error ? err.message : 'Failed to compute baseline');
      setBaselineLoading(false);
    }
  };

  const handleCompleteRun = () => {
    setCompletionError(null);
    setCompletionResult(null);

    if (!baselineResult) {
      setCompletionError('Compute baseline first');
      return;
    }

    if (!splitTime) {
      setCompletionError('Split time is required');
      return;
    }

    if (!baselineRequest) {
      setCompletionError('Compute baseline first');
      return;
    }

    try {
      const req = baselineRequest;

      const anchor = {
        d_ft: splitDistance,
        t_s: parseFloat(splitTime),
        mph: splitMph ? parseFloat(splitMph) : undefined,
      };

      const result = completeRun(req, [anchor]);
      setCompletionResult(result);
    } catch (err) {
      setCompletionError(err instanceof Error ? err.message : 'Failed to complete run');
    }
  };

  const handleSaveRun = async () => {
    setSaveError(null);

    if (!baselineResult) {
      setSaveError('Compute baseline first');
      return;
    }

    if (!actualET) {
      setSaveError('Actual ET is required');
      return;
    }

    // Check runs limit
    const entitlements = getEntitlements(CURRENT_TIER);
    const existingRuns = await storage.loadRuns();
    if (existingRuns.length >= entitlements.runs) {
      setSaveError(`Run limit reached (${entitlements.runs} runs on ${CURRENT_TIER} tier). Upgrade to save more runs.`);
      return;
    }

    setSaving(true);

    try {
      const actualETValue = parseFloat(actualET);
      const actualMPHValue = actualMPH ? parseFloat(actualMPH) : undefined;

      // Update learning model
      if (features) {
        const observedError = actualETValue - baselineResult.baseET_s;
        
        const m0 = getModel(vehicleId) ?? createModel(features.length);
        const m1 = update(m0, features, observedError);
        saveModel(vehicleId, m1);
      }

      // Build and save run record
      const run: RunRecordV1 = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        vehicleId,
        raceLength,
        env,
        prediction: {
          et_s: baselineResult.baseET_s,
          mph: baselineResult.baseMPH,
        },
        outcome: {
          slipET_s: actualETValue,
          slipMPH: actualMPHValue,
        },
        increments: baselineResult.timeslip,
        notes: notes.trim() || undefined,
      };

      await storage.saveRun(run);

      // Show success toast and navigate
      alert('✓ Run saved successfully! Model updated.');
      navigate('/history');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save run');
      setSaving(false);
    }
  };

  // Available splits based on entitlements
  const hasFullCompletion = hasFeature(CURRENT_TIER, 'runCompletionFull');
  const has60Completion = hasFeature(CURRENT_TIER, 'runCompletion60');
  
  let availableSplits: number[] = [];
  if (hasFullCompletion) {
    // Full access: all splits except finish line
    availableSplits = raceLength === 'EIGHTH' ? [60, 330] : [60, 330, 660, 1000];
  } else if (has60Completion) {
    // Basic access: 60' only
    availableSplits = [60];
  }

  return (
    <Page title="Log Run">
      {/* Section A: Run Context */}
      <div className="card mb-6">
        <h2 className="mb-4" style={{ fontSize: '1.25rem', color: 'var(--color-text)' }}>
          A) Run Context
        </h2>

        {baselineError && (
          <div className="error mb-4">
            <p style={{ margin: 0 }}>{baselineError}</p>
          </div>
        )}

        <div className="grid grid-2 gap-4 mb-4">
          <div>
            <label className="label" htmlFor="vehicleId">
              Vehicle ID *
            </label>
            <input
              id="vehicleId"
              type="text"
              className="input"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              placeholder="My Car"
            />
          </div>

          <div>
            <label className="label">Race Length *</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="raceLength"
                  value="EIGHTH"
                  checked={raceLength === 'EIGHTH'}
                  onChange={(e) => setRaceLength(e.target.value as RaceLength)}
                />
                <span>1/8 Mile</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="raceLength"
                  value="QUARTER"
                  checked={raceLength === 'QUARTER'}
                  onChange={(e) => setRaceLength(e.target.value as RaceLength)}
                />
                <span>1/4 Mile</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h3 className="label" style={{ margin: 0 }}>Environment</h3>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportWeatherCsv}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
                style={{ fontSize: '0.875rem', padding: 'var(--space-2) var(--space-3)' }}
              >
                Import Weather CSV
              </button>
            </div>
          </div>
          <EnvironmentForm value={env} onChange={setEnv} />
        </div>

        <button
          onClick={handleComputeBaseline}
          className="btn btn-full mb-4"
          disabled={baselineLoading}
        >
          {baselineLoading ? 'Computing...' : 'Compute Baseline'}
        </button>

        {baselineResult && (
          <div className="card card-compact" style={{ backgroundColor: 'var(--color-surface)' }}>
            <h3 className="mb-3" style={{ fontSize: '1rem', fontWeight: '600' }}>
              Baseline Prediction
            </h3>
            <div className="grid grid-2 gap-4">
              <div>
                <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                  ET
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {baselineResult.baseET_s.toFixed(3)} s
                </div>
              </div>
              <div>
                <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                  MPH
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {baselineResult.baseMPH.toFixed(2)} mph
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section B: Run Completion (Optional) */}
      {baselineResult && (
        <div className="card mb-6">
          <h2 className="mb-4" style={{ fontSize: '1.25rem', color: 'var(--color-text)' }}>
            B) Run Completion (Optional)
          </h2>
          <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
            If you lifted early, estimate the final ET from a partial run.
          </p>

          {!has60Completion && !hasFullCompletion ? (
            <PeekCard
              title="Run Completion"
              tier="JUNIOR"
              description="Estimate final ET from partial runs. Upgrade to JUNIOR for 60' completion, or PRO for all splits."
              onLearnMore={() => alert('Upgrade to unlock Run Completion')}
            />
          ) : (
            <>
              {completionError && (
                <div className="error mb-4">
                  <p style={{ margin: 0 }}>{completionError}</p>
                </div>
              )}

              <div className="grid grid-3 gap-4 mb-4">
            <div>
              <label className="label" htmlFor="splitDistance">
                Last WOT Split
              </label>
              <select
                id="splitDistance"
                className="input"
                value={splitDistance}
                onChange={(e) => setSplitDistance(parseInt(e.target.value))}
                style={{ cursor: 'pointer' }}
              >
                {availableSplits.map((d) => (
                  <option key={d} value={d}>
                    {d} ft
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="splitTime">
                Time at Split (s) *
              </label>
              <input
                id="splitTime"
                type="number"
                step="0.001"
                className="input"
                value={splitTime}
                onChange={(e) => setSplitTime(e.target.value)}
                placeholder="6.800"
              />
            </div>
            <div>
              <label className="label" htmlFor="splitMph">
                MPH at Split
              </label>
              <input
                id="splitMph"
                type="number"
                step="0.01"
                className="input"
                value={splitMph}
                onChange={(e) => setSplitMph(e.target.value)}
                placeholder="105.50"
              />
            </div>
          </div>

          <button onClick={handleCompleteRun} className="btn btn-full mb-4">
            Complete Run
          </button>

          {completionResult && (
            <div className="card card-compact" style={{ backgroundColor: 'var(--color-surface)' }}>
              <h3 className="mb-3" style={{ fontSize: '1rem', fontWeight: '600' }}>
                Completed ET Estimate
              </h3>
              <div className="grid grid-3 gap-4">
                <div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                    ET
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {completionResult.et_s.toFixed(3)} s
                  </div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                    Method
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                    {completionResult.method}
                  </div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                    Confidence
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                    {(completionResult.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* Section C: Actual Result & Save */}
      {baselineResult && (
        <div className="card mb-6">
          <h2 className="mb-4" style={{ fontSize: '1.25rem', color: 'var(--color-text)' }}>
            C) Actual Result & Save
          </h2>

          {saveError && (
            <div className="error mb-4">
              <p style={{ margin: 0 }}>{saveError}</p>
            </div>
          )}

          <div className="grid grid-2 gap-4 mb-4">
            <div>
              <label className="label" htmlFor="actualET">
                Actual ET (s) *
              </label>
              <input
                id="actualET"
                type="number"
                step="0.001"
                className="input"
                value={actualET}
                onChange={(e) => setActualET(e.target.value)}
                placeholder="11.500"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="actualMPH">
                Actual MPH
              </label>
              <input
                id="actualMPH"
                type="number"
                step="0.01"
                className="input"
                value={actualMPH}
                onChange={(e) => setActualMPH(e.target.value)}
                placeholder="120.50"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="label" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Track conditions, setup changes, etc."
              rows={4}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSaveRun}
              className="btn btn-full"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Run'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={() => navigate('/history')}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Page>
  );
}

export default Log;
