/**
 * Weather ET Predictor (manual-first)
 *
 * Flow: select vehicle -> select a baseline logged run -> review the baseline's
 * actual weather & ET -> enter the upcoming/expected weather manually -> see the
 * corrected baseline (RSA Standard Day), the predicted ET for the upcoming
 * weather, and the delta from the baseline. Optionally save the scenario.
 *
 * Manual entry is the reliable core and never depends on any external API. A
 * "Fetch Forecast" affordance is a deferred stub: it only ever pre-fills the
 * editable manual fields and fails quietly.
 */

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Page from '../shared/components/Page';
import EnvironmentForm from '../shared/components/EnvironmentForm';
import HelpLink from '../shared/components/HelpLink';
import { storage } from '../state/storage';
import { loadVehicles, type VehicleLite } from '../state/vehicles';
import { DEFAULT_ENV, type Env } from '../domain/schemas/env.schema';
import type { RunRecordV1 } from '../domain/schemas/run.schema';
import {
  predictET,
  RSA_STANDARD_DAY_LABEL,
  type FuelType,
  type WeatherInput,
} from '../domain/physics/calculations/runCorrection';

interface LocationState {
  baselineRunId?: string;
}

/** Pull the most representative actual ET out of a run record. */
function runActualET(run: RunRecordV1): number | undefined {
  return (
    run.outcome?.slipET_s ??
    (run.raceLength === 'QUARTER' ? run.quarterMileET : run.eighthMileET) ??
    run.runCompletion?.completedET ??
    undefined
  );
}

function fuelTypeOf(vehicle: VehicleLite | undefined): FuelType {
  const raw = `${vehicle?.fuelSystem ?? ''} ${vehicle?.fuelType ?? ''}`.toLowerCase();
  if (raw.includes('alc') || raw.includes('methanol') || raw.includes('nitro')) {
    return 'alcohol';
  }
  return 'gasoline';
}

function envToWeather(env: Env): WeatherInput {
  return {
    temperatureF: env.temperatureF,
    humidityPct: env.humidityPct,
    barometerInHg: env.barometerInHg,
    elevation: env.elevation,
    windMph: env.windMph,
    windAngleDeg: env.windAngleDeg,
  };
}

function PredictWeather() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialBaselineId = (location.state as LocationState | null)?.baselineRunId;

  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [runs, setRuns] = useState<RunRecordV1[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [baselineRunId, setBaselineRunId] = useState<string>('');
  const [upcomingEnv, setUpcomingEnv] = useState<Env>(DEFAULT_ENV);
  const [forecastNote, setForecastNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [manualFuelType, setManualFuelType] = useState<FuelType>('gasoline');

  // Load vehicles + runs once.
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [v, r] = await Promise.all([loadVehicles(), storage.loadRuns()]);
        setVehicles(v);
        const logged = r.filter(run => (run.runKind ?? 'logged') !== 'prediction');
        setRuns(logged);

        // Pre-select from a passed-in baseline run, else first vehicle.
        const preset = initialBaselineId
          ? logged.find(run => run.id === initialBaselineId || run.clientId === initialBaselineId)
          : undefined;
        if (preset) {
          setSelectedVehicleId(preset.vehicleId);
          setBaselineRunId(preset.id);
        } else if (v.length > 0) {
          setSelectedVehicleId(v[0].id);
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  /** True when the vehicle record has an explicit fuelType or fuelSystem field. */
  const vehicleHasFuelType = !!(selectedVehicle?.fuelType || selectedVehicle?.fuelSystem);
  /** The fuel type to use for correction: vehicle's own if set, else the user's manual override. */
  const effectiveFuelType: FuelType = vehicleHasFuelType ? fuelTypeOf(selectedVehicle) : manualFuelType;

  // Baseline runs available for the selected vehicle (must have an actual ET).
  const vehicleRuns = useMemo(
    () =>
      runs
        .filter(r => r.vehicleId === selectedVehicleId && runActualET(r) !== undefined)
        .sort((a, b) => b.createdAt - a.createdAt),
    [runs, selectedVehicleId]
  );

  const baselineRun = useMemo(
    () => vehicleRuns.find(r => r.id === baselineRunId || r.clientId === baselineRunId),
    [vehicleRuns, baselineRunId]
  );

  // Default the baseline selection + seed upcoming weather from the baseline.
  useEffect(() => {
    if (!baselineRun && vehicleRuns.length > 0) {
      setBaselineRunId(vehicleRuns[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId, vehicleRuns]);

  useEffect(() => {
    if (baselineRun?.env) {
      setUpcomingEnv({ ...DEFAULT_ENV, ...baselineRun.env });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baselineRunId]);

  const baselineActualET = baselineRun ? runActualET(baselineRun) : undefined;

  const prediction = useMemo(() => {
    if (!baselineRun || baselineActualET === undefined || !baselineRun.env) return null;
    return predictET({
      baselineActualET,
      baselineWeather: envToWeather(baselineRun.env as Env),
      upcomingWeather: envToWeather(upcomingEnv),
      fuelType: effectiveFuelType,
    });
  }, [baselineRun, baselineActualET, upcomingEnv, effectiveFuelType]);

  /**
   * Deferred forecast stub. Manual entry remains the source of truth; this only
   * ever pre-fills editable fields and fails quietly. No external dependency yet.
   */
  const handleFetchForecast = () => {
    setForecastNote('Forecast unavailable — enter weather manually.');
  };

  const handleSaveScenario = async () => {
    if (!baselineRun || !prediction) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const clientId = crypto.randomUUID();
      const scenario: RunRecordV1 = {
        id: clientId,
        clientId,
        runKind: 'prediction',
        weatherSource: 'manual',
        createdAt: Date.now(),
        vehicleId: selectedVehicleId,
        vehicleName: selectedVehicle?.name,
        raceLength: baselineRun.raceLength,
        env: upcomingEnv,
        prediction: { et_s: prediction.predictedET, mph: baselineRun.outcome?.slipMPH ?? 0 },
        correctedET: prediction.correctedBaselineET,
        notes:
          `Prediction from baseline run ${baselineRun.id} ` +
          `(baseline ET ${prediction.baselineActualET.toFixed(3)}s). ` +
          `Predicted ${prediction.predictedET.toFixed(3)}s ` +
          `(${prediction.deltaFromBaseline >= 0 ? '+' : ''}${prediction.deltaFromBaseline.toFixed(3)}s).`,
      };
      await storage.saveRun(scenario);
      setSaveMsg('Prediction scenario saved. View it in History with "Show saved predictions" enabled.');
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Failed to save prediction');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Page title="Weather ET Predictor">
        <div className="text-muted" style={{ padding: 'var(--space-6)' }}>Loading…</div>
      </Page>
    );
  }

  return (
    <Page title="Weather ET Predictor" actions={<HelpLink manual="quarter" label="Manual" />}>
      {/* Step 1: Vehicle + Baseline */}
      <div className="card mb-6">
        <h2 className="mb-4" style={{ fontSize: '1.25rem' }}>1) Vehicle &amp; Baseline Run</h2>

        {vehicles.length === 0 ? (
          <div className="text-muted">
            No vehicles yet. <Link to="/vehicles" style={{ color: 'var(--color-primary)' }}>Create one first</Link>.
          </div>
        ) : (
          <div className="grid grid-2 gap-4">
            <div>
              <label className="label">Vehicle</label>
              <select
                className="input"
                value={selectedVehicleId}
                onChange={e => { setSelectedVehicleId(e.target.value); setBaselineRunId(''); }}
                style={{ cursor: 'pointer' }}
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              {!vehicleHasFuelType && selectedVehicle && (
                <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#d97706', marginBottom: '6px' }}>Correction type not set on vehicle</div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {(['gasoline', 'alcohol'] as FuelType[]).map(ft => (
                      <label key={ft} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', cursor: 'pointer' }}>
                        <input type="radio" name="manualFuelType" checked={manualFuelType === ft} onChange={() => setManualFuelType(ft)} />
                        {ft === 'gasoline' ? 'Gasoline' : 'Alcohol'}
                      </label>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Set permanently on the vehicle to remove this prompt.
                  </div>
                </div>
              )}
              <label className="label">Baseline Run</label>
              {vehicleRuns.length === 0 ? (
                <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: 'var(--space-2)' }}>
                  No logged runs with an ET for this vehicle yet.{' '}
                  <Link to="/log" style={{ color: 'var(--color-primary)' }}>Log a run</Link>.
                </div>
              ) : (
                <select
                  className="input"
                  value={baselineRunId}
                  onChange={e => setBaselineRunId(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {vehicleRuns.map(r => {
                    const et = runActualET(r);
                    const date = r.runDate || new Date(r.createdAt).toLocaleDateString();
                    return (
                      <option key={r.id} value={r.id}>
                        {date} • {r.round || r.raceLength} • {et?.toFixed(3)}s
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Baseline weather + ET */}
      {baselineRun && baselineActualET !== undefined && baselineRun.env && (
        <div className="card mb-6">
          <h2 className="mb-4" style={{ fontSize: '1.25rem' }}>2) Baseline Conditions</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <Stat label="Actual ET" value={`${baselineActualET.toFixed(3)} s`} strong />
            <Stat label="Temp" value={`${(baselineRun.env.temperatureF ?? 0).toFixed(0)} °F`} />
            <Stat label="Humidity" value={`${(baselineRun.env.humidityPct ?? 0).toFixed(0)} %`} />
            <Stat label="Barometer" value={`${(baselineRun.env.barometerInHg ?? 0).toFixed(2)} inHg`} />
            <Stat label="Elevation" value={`${(baselineRun.env.elevation ?? 0).toFixed(0)} ft`} />
          </div>
        </div>
      )}

      {/* Step 3: Upcoming weather (manual) */}
      {baselineRun && (
        <div className="card mb-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>3) Upcoming Weather</h2>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: 'var(--space-2) var(--space-3)' }}
              onClick={handleFetchForecast}
              title="Optional. Pre-fills the manual fields if a forecast is available."
            >
              Fetch Forecast
            </button>
          </div>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>
            Enter the weather you expect for the upcoming round. Density Altitude is shown below as a calculated output.
          </p>
          {forecastNote && (
            <div className="mb-4" style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
              {forecastNote}
            </div>
          )}
          <EnvironmentForm value={upcomingEnv} onChange={setUpcomingEnv} defaultShowOptional={false} />
        </div>
      )}

      {/* Step 4: Prediction */}
      {prediction && (
        <div className="card mb-6">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>4) Predicted ET</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '16px', marginTop: 0 }}>
            Weather-only prediction based on selected baseline run's actual ET.
            Vehicle power, weight, and induction are not used — only temperature, humidity, barometer, and wind.{' '}
            <strong>Correction type: {effectiveFuelType === 'gasoline' ? 'Gasoline' : 'Alcohol'}.</strong>
            {!vehicleHasFuelType && ' (manually selected — set fuel type on vehicle to persist)'}
          </p>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <Stat label="Baseline ET" value={`${prediction.baselineActualET.toFixed(3)} s`} />
            <Stat label={`Corrected (${RSA_STANDARD_DAY_LABEL})`} value={`${prediction.correctedBaselineET.toFixed(3)} s`} />
            <Stat label="Predicted ET" value={`${prediction.predictedET.toFixed(3)} s`} strong />
            <Stat
              label="Δ vs Baseline"
              value={`${prediction.deltaFromBaseline >= 0 ? '+' : ''}${prediction.deltaFromBaseline.toFixed(3)} s`}
              color={prediction.deltaFromBaseline > 0.001 ? '#ef4444' : prediction.deltaFromBaseline < -0.001 ? '#10b981' : undefined}
            />
          </div>

          <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <Stat label="Baseline Density Alt" value={`${prediction.baselineDensityAltitude.toLocaleString()} ft`} />
            <Stat label="Upcoming Density Alt" value={`${prediction.upcomingDensityAltitude.toLocaleString()} ft`} />
          </div>

          {/* Per-variable breakdown driving the prediction: baseline -> upcoming */}
          <div className="mt-4">
            <h3 className="label" style={{ marginBottom: 'var(--space-2)' }}>
              Weather effect (Baseline → Upcoming)
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              {prediction.breakdownBaselineToUpcoming.map(b => (
                <div key={b.factor} style={{ fontSize: '0.85rem' }}>
                  <span className="text-muted">{b.factor}: </span>
                  <span style={{ color: b.direction === 'slower' ? '#ef4444' : b.direction === 'faster' ? '#10b981' : undefined }}>
                    {b.etChange >= 0 ? '+' : ''}{b.etChange.toFixed(3)} s
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <button className="btn" onClick={handleSaveScenario} disabled={saving}>
              {saving ? 'Saving…' : 'Save Prediction Scenario'}
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/history')}>
              Go to History
            </button>
          </div>
          {saveMsg && (
            <div className="mt-4" style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{saveMsg}</div>
          )}
        </div>
      )}
    </Page>
  );
}

function Stat({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <div>
      <div className="text-muted" style={{ fontSize: '0.8rem' }}>{label}</div>
      <div style={{ fontSize: strong ? '1.5rem' : '1.05rem', fontWeight: strong ? 'bold' : 600, color }}>{value}</div>
    </div>
  );
}

export default PredictWeather;
