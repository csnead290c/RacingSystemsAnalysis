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
  type FuelType,
  type WeatherInput,
} from '../domain/physics/calculations/runCorrection';
import { computeRsaHpc, type WeatherImpact } from '../domain/physics/calculations/weatherImpact';
import {
  computeSensitivities,
  DEFAULT_SENSITIVITY_CONFIG,
  type SensitivityBaseValues,
  type SensitivityConfig,
  type SensitivityResult,
} from '../domain/physics/calculations/sensitivityAnalysis';

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
  const [mathExpanded, setMathExpanded] = useState(false);
  const [sensExpanded, setSensExpanded] = useState(false);
  const [sensConfig, setSensConfig] = useState<SensitivityConfig>(DEFAULT_SENSITIVITY_CONFIG);
  const [sensMPH, setSensMPH] = useState<string>('');

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

  const sensitivities = useMemo<SensitivityResult | null>(() => {
    if (!prediction) return null;
    const mph = sensMPH !== '' ? parseFloat(sensMPH) : undefined;
    return computeSensitivities(
      sensConfig,
      prediction.baselineActualET,
      { fuelType: effectiveFuelType, baseMPH: mph && mph > 0 ? mph : undefined }
    );
  }, [prediction, sensConfig, sensMPH, effectiveFuelType]);

  /**
   * Deferred forecast stub. Manual entry remains the source of truth; this only
   * ever pre-fills editable fields and fails quietly. No external dependency yet.
   */
  const handleFetchForecast = () => {
    setForecastNote('Forecast unavailable — enter weather manually.');
  };

  const handleUseBaseRunValues = () => {
    if (!baselineRun?.env) return;
    const env = baselineRun.env as Env;
    const hpc = computeRsaHpc(envToWeather(env), effectiveFuelType);
    setSensConfig(prev => ({
      ...prev,
      base: {
        barometerInHg: env.barometerInHg,
        temperatureF: env.temperatureF,
        humidityPct: env.humidityPct,
        hpCorrectionFactor: Math.round(hpc * 10000) / 10000,
        weightLb: prev.base.weightLb,
      },
    }));
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>4) Predicted ET</h2>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#d97706', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '4px', padding: '2px 7px', letterSpacing: '0.04em' }}>BETA</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#d97706', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '5px 10px', marginBottom: '10px', marginTop: '4px' }}>
            <strong>BETA:</strong> RSA weather prediction under validation. Values are close but not yet certified.
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '12px', marginTop: '0' }}>
            Baseline is corrected to RSA Standard Day, then projected to target weather.{' '}
            Weather-only — vehicle power/weight/induction not used.{' '}
            <strong>Correction type: {effectiveFuelType === 'gasoline' ? 'Gasoline' : 'Alcohol'}.</strong>
            {!vehicleHasFuelType && ' (manually selected — set on vehicle to persist)'}
          </p>

          {/* Main stats row */}
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <Stat label="Baseline ET" value={`${prediction.baselineActualET.toFixed(3)} s`} />
            <Stat label={`Step 1: RSA Standard Day`} value={`${prediction.standardET.toFixed(3)} s`} />
            <Stat label="Step 2: Predicted ET" value={`${prediction.predictedET.toFixed(3)} s`} strong />
            <Stat
              label="Δ vs Baseline"
              value={`${prediction.deltaFromBaseline >= 0 ? '+' : ''}${prediction.deltaFromBaseline.toFixed(3)} s`}
              color={prediction.deltaFromBaseline > 0.001 ? '#ef4444' : prediction.deltaFromBaseline < -0.001 ? '#10b981' : undefined}
            />
          </div>

          {/* Per-step factor chips */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            <span>Step 1 factor: <strong style={{ color: 'var(--color-text)' }}>{prediction.factorToStandard.toFixed(5)}</strong></span>
            <span>Step 2 factor: <strong style={{ color: 'var(--color-text)' }}>{prediction.factorToTarget.toFixed(5)}</strong></span>
            <span>Net factor: <strong style={{ color: 'var(--color-text)' }}>{prediction.netFactor.toFixed(5)}</strong></span>
          </div>

          {/* Math Details collapsible */}
          <div style={{ marginTop: '14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <button
              type="button"
              onClick={() => setMathExpanded(e => !e)}
              style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-accent)', display: 'flex', justifyContent: 'space-between' }}
            >
              Math Details (two-step RSA path)
              <span>{mathExpanded ? '▲' : '▼'}</span>
            </button>
            {mathExpanded && (
              <div style={{ padding: '12px', borderTop: '1px solid var(--color-border)', fontSize: '0.8rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 16px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--color-text-muted)' }}>Baseline Weather</div>
                    {baselineRun?.env && (
                      <WeatherSummary env={baselineRun.env as Env} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--color-text-muted)' }}>RSA Standard Day</div>
                    <WeatherSummary env={{ temperatureF: 60, humidityPct: 0, barometerInHg: 29.92, elevation: 0, windMph: 0, windAngleDeg: 0 } as Env} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--color-text-muted)' }}>Target Weather</div>
                    <WeatherSummary env={upcomingEnv} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <BreakdownTable label={`Step 1: Baseline → RSA Std Day (factor ${prediction.factorToStandard.toFixed(5)})`} items={prediction.breakdownToStandard} />
                  <BreakdownTable label={`Step 2: RSA Std Day → Target (factor ${prediction.factorToTarget.toFixed(5)})`} items={prediction.breakdownToTarget} />
                </div>
                <div style={{ marginTop: '10px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <span className="text-muted">Baseline DA: <strong>{prediction.baselineDensityAltitude.toLocaleString()} ft</strong></span>
                  <span className="text-muted">Target DA: <strong>{prediction.targetDensityAltitude.toLocaleString()} ft</strong></span>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>DA is display-only; correction uses temp/humidity/barometer/elevation directly.</span>
                </div>
                {prediction.windNote && (
                  <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    ⚠ {prediction.windNote}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Run Data Analysis Sensitivities */}
          {sensitivities && (
            <div style={{ marginTop: '14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <button
                type="button"
                onClick={() => setSensExpanded(e => !e)}
                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-accent)', display: 'flex', justifyContent: 'space-between' }}
              >
                Run Data Analysis Sensitivities
                <span>{sensExpanded ? '▲' : '▼'}</span>
              </button>
              {sensExpanded && (
                <div style={{ padding: '12px', borderTop: '1px solid var(--color-border)' }}>
                  <SensitivityPanel
                    result={sensitivities}
                    mph={sensMPH}
                    onMPHChange={setSensMPH}
                    onConfigChange={setSensConfig}
                    onUseBaseRunValues={handleUseBaseRunValues}
                    hasBaseRun={!!baselineRun?.env}
                  />
                </div>
              )}
            </div>
          )}

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

function WeatherSummary({ env }: { env: Env }) {
  return (
    <div style={{ lineHeight: 1.6 }}>
      <div>{env.temperatureF}°F</div>
      <div>{env.humidityPct}% RH</div>
      <div>{env.barometerInHg} inHg</div>
      {(env.elevation ?? 0) > 0 && <div>{(env.elevation ?? 0).toLocaleString()} ft elev</div>}
    </div>
  );
}

function BreakdownTable({ label, items }: { label: string; items: WeatherImpact[] }) {
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: '5px', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{label}</div>
      {items.map(b => (
        <div key={b.factor} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '2px 0', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>{b.factor}</span>
          <span style={{ fontWeight: 600, color: b.direction === 'slower' ? '#ef4444' : b.direction === 'faster' ? '#10b981' : undefined }}>
            {b.etChange >= 0 ? '+' : ''}{b.etChange.toFixed(3)} s
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Sensitivity Panel ───────────────────────────────────────────────────────

function SensitivityPanel({
  result,
  mph,
  onMPHChange,
  onConfigChange,
  onUseBaseRunValues,
  hasBaseRun,
}: {
  result: SensitivityResult;
  mph: string;
  onMPHChange: (v: string) => void;
  onConfigChange: (c: SensitivityConfig) => void;
  onUseBaseRunValues: () => void;
  hasBaseRun: boolean;
}) {
  const cfg = result.config;

  const BASE_KEYS: Array<keyof SensitivityBaseValues> = [
    'barometerInHg', 'temperatureF', 'humidityPct', 'hpCorrectionFactor', 'weightLb',
  ];
  const CHANGE_KEYS: Array<keyof Omit<SensitivityConfig, 'base'>> = [
    'barometerChangeInHg', 'temperatureChangeF', 'humidityChangePct',
    'hpCorrectionFactorChange', 'weightChangeLb',
  ];
  const BASE_STEPS   = ['0.01', '1', '1', '0.001', '1'];
  const CHANGE_STEPS = ['0.01', '1', '1', '0.001', '1'];

  const inputStyle: React.CSSProperties = {
    width: '72px', textAlign: 'right', padding: '2px 4px',
    fontSize: '0.78rem', border: '1px solid var(--color-border)',
    borderRadius: '4px', background: 'var(--color-surface)',
    color: 'var(--color-text)',
  };

  function setBase(idx: number, raw: string) {
    const key = BASE_KEYS[idx];
    const val = parseFloat(raw);
    if (!isNaN(val)) onConfigChange({ ...cfg, base: { ...cfg.base, [key]: val } });
  }

  function setChange(idx: number, raw: string) {
    const key = CHANGE_KEYS[idx];
    const val = parseFloat(raw);
    if (!isNaN(val)) onConfigChange({ ...cfg, [key]: val });
  }

  return (
    <div style={{ fontSize: '0.8rem' }}>
      <p style={{ margin: '0 0 6px', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
        Shows the independent ET/MPH effect of changing one parameter at a time.
        Edit <strong>Base Value</strong> and <strong>Change</strong> values below.
        Defaults match the original RSA Run Data Analysis reference (standard day).
      </p>
      <div style={{ marginBottom: '10px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => onConfigChange(DEFAULT_SENSITIVITY_CONFIG)}
          style={{ fontSize: '0.75rem', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '0', textDecoration: 'underline' }}
        >
          Reset to RSA defaults
        </button>
        {hasBaseRun && (
          <button
            type="button"
            onClick={onUseBaseRunValues}
            style={{ fontSize: '0.75rem', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '0', textDecoration: 'underline' }}
          >
            Use Base Run values
          </button>
        )}
      </div>

      {/* Optional MPH input */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
          Trap MPH (optional)
          <input
            type="number"
            value={mph}
            onChange={e => onMPHChange(e.target.value)}
            placeholder="e.g. 145"
            style={{ ...inputStyle, width: '80px' }}
          />
        </label>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left',  padding: '4px 8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Variable</th>
              <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Base Value</th>
              <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Change</th>
              <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Δ ET (s)</th>
              {result.hasMPH && (
                <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Δ MPH</th>
              )}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => {
              const etColor = row.predictedETChange > 0.001
                ? '#ef4444'
                : row.predictedETChange < -0.001
                  ? '#10b981'
                  : undefined;
              const mphColor = (row.predictedMPHChange ?? 0) < -0.01
                ? '#ef4444'
                : (row.predictedMPHChange ?? 0) > 0.01
                  ? '#10b981'
                  : undefined;
              return (
                <tr key={row.variable} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '5px 8px', color: 'var(--color-text)' }}>
                    {row.variable}
                    {row.unit ? <span style={{ color: 'var(--color-text-muted)', marginLeft: '4px' }}>({row.unit})</span> : null}
                  </td>
                  <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                    <input
                      type="number"
                      step={BASE_STEPS[i]}
                      value={cfg.base[BASE_KEYS[i]]}
                      onChange={e => setBase(i, e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                  <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                    <input
                      type="number"
                      step={CHANGE_STEPS[i]}
                      value={row.change}
                      onChange={e => setChange(i, e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: etColor }}>
                    {!result.hasWeightRow && row.variable === 'Vehicle Weight'
                      ? <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>set weight ↑</span>
                      : `${row.predictedETChange >= 0 ? '+' : ''}${row.predictedETChange.toFixed(3)}`
                    }
                  </td>
                  {result.hasMPH && (
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: mphColor }}>
                      {row.predictedMPHChange !== null
                        ? `${row.predictedMPHChange >= 0 ? '+' : ''}${row.predictedMPHChange.toFixed(2)}`
                        : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>—</span>
                      }
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
        Base HPC (weather-derived): <strong>{result.baseHpc.toFixed(4)}</strong> (1.0000 = RSA Standard Day).
        Weather rows use RSA HPC method. Weight row uses Patrick Hale ET formula (A&nbsp;=&nbsp;1.825).
        Each row is independent — effects are not additive.
      </div>
    </div>
  );
}

export default PredictWeather;
