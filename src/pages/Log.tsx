import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Page from '../shared/components/Page';

// Lazy load time slip scanner
const TimeslipScanner = lazy(() => import('../shared/components/TimeslipScanner'));
import EnvironmentForm from '../shared/components/EnvironmentForm';
import { storage } from '../state/storage';
import { useSubscription } from '../domain/config/useSubscription';
import { DEFAULT_ENV } from '../domain/schemas/env.schema';
import { loadVehicles, saveVehicle, type VehicleLite } from '../state/vehicles';
import { formatHp, formatLb, formatIn } from '../shared/format/formatNumber';
import { RoundTypes, type RunRecordV1 } from '../domain/schemas/run.schema';
import { calculateMOV, formatMOV, describeRaceOutcome } from '../domain/physics/calculations/marginOfVictory';
import { correctToStandard, type WeatherInput } from '../domain/physics/calculations/runCorrection';
import { solveBarometerForDensityAltitude } from '../domain/physics/calculations/weatherImpact';
import type { RaceLength } from '../domain/config/raceLengths';
import type { Env } from '../domain/schemas/env.schema';

/** Convert MM/DD/YYYY (timeslip format) → YYYY-MM-DD (HTML date input). */
function parseSlipDate(d: string): string {
  const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return d;
  const [, mo, dy, yr] = m;
  return `${yr.padStart(4, '20')}-${mo.padStart(2, '0')}-${dy.padStart(2, '0')}`;
}

/** Convert HH:MM:SS or H:MM:SS → HH:MM for HTML time input. */
function parseSlipTime(t: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

const logRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', minHeight: '44px',
  padding: '2px 0', gap: '8px',
  borderBottom: '1px solid var(--color-border)',
};
const logLabelStyle: React.CSSProperties = {
  minWidth: '72px', maxWidth: '88px', fontSize: '0.8rem',
  color: 'var(--color-text-muted)', fontWeight: 500, flexShrink: 0,
};
const logInputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)', fontSize: '0.9rem',
};

function FormRow({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div style={logRowStyle}>
      <div style={logLabelStyle}>{label}{req && <span style={{ color: '#ef4444' }}>*</span>}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function LogSection({ title, open, onToggle, badge, children }: {
  title: string; open: boolean; onToggle: () => void; badge?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--color-border)' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '11px 0', background: 'none',
          border: 'none', cursor: 'pointer', color: 'var(--color-text)',
          fontSize: '0.9rem', fontWeight: 600,
        }}
      >
        <span>
          {title}
          {badge && (
            <span style={{
              marginLeft: '8px', fontSize: '0.7rem', color: '#10b981',
              background: 'rgba(16,185,129,0.12)', padding: '1px 7px',
              borderRadius: '99px', fontWeight: 400,
            }}>{badge}</span>
          )}
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem',
          display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {open && <div style={{ paddingBottom: '8px' }}>{children}</div>}
    </div>
  );
}

/** True when the viewport is tablet/desktop width. Re-evaluates on resize. */
function useIsDesktop(): boolean {
  const [wide, setWide] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const h = () => setWide(window.innerWidth >= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return wide;
}

/** Convert an Env record to the WeatherInput shape used by run correction. */
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

function Log() {
  const navigate = useNavigate();
  const { runLimit, canSaveRun, tierInfo, canCreateVehicle, vehicleLimit } = useSubscription();
  const isDesktop = useIsDesktop();

  // Vehicles list
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);

  // Section 1: Run Info
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [raceLength, setRaceLength] = useState<RaceLength>('QUARTER');
  const [runDate, setRunDate] = useState(new Date().toISOString().split('T')[0]);
  const [runTime, setRunTime] = useState(new Date().toTimeString().slice(0, 5));
  const [round, setRound] = useState('T1');
  const [lane, setLane] = useState<'left' | 'right'>('left');

  // Section 2: Time Slip
  const [reactionTime, setReactionTime] = useState('');
  const [dialIn, setDialIn] = useState('');
  const [sixtyFt, setSixtyFt] = useState('');
  const [threeThirtyFt, setThreeThirtyFt] = useState('');
  const [eighthET, setEighthET] = useState('');
  const [eighthMPH, setEighthMPH] = useState('');
  const [thousandFt, setThousandFt] = useState('');
  const [quarterET, setQuarterET] = useState('');
  const [quarterMPH, setQuarterMPH] = useState('');

  // Section 3: Weather
  const [env, setEnv] = useState<Env>(DEFAULT_ENV);
  const [weatherSource, setWeatherSource] = useState<'manual' | 'timeslip' | 'apple_weather'>('manual');
  const [barometerEstimated, setBarometerEstimated] = useState(false);

  // Quick/All detail toggle
  const [mode, setMode] = useState<'quick' | 'all'>('quick');

  // Section collapse state
  const [showRaceInfo, setShowRaceInfo] = useState(true);
  const [showMyRun, setShowMyRun] = useState(true);
  const [showWeather, setShowWeather] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // Opponent autocomplete (derived from saved runs)
  const [knownOpponents, setKnownOpponents] = useState<Array<{ name: string; carNumber: string }>>([]);

  // Section 4: Notes & Opponent
  const [notes, setNotes] = useState('');
  const [showOpponent, setShowOpponent] = useState(false);
  const [opponentName, setOpponentName] = useState('');
  const [opponentCarNumber, setOpponentCarNumber] = useState('');
  const [opponentNotes, setOpponentNotes] = useState('');
  const [opponentDialIn, setOpponentDialIn] = useState('');
  const [opponentRT, setOpponentRT] = useState('');
  const [opponentSixtyFt, setOpponentSixtyFt] = useState('');
  const [opponentThirtyFt, setOpponentThirtyFt] = useState('');
  const [opponentEighthET, setOpponentEighthET] = useState('');
  const [opponentEighthMPH, setOpponentEighthMPH] = useState('');
  const [opponentThousandFt, setOpponentThousandFt] = useState('');
  const [opponentET, setOpponentET] = useState('');
  const [opponentMPH, setOpponentMPH] = useState('');

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedRunId, setSavedRunId] = useState<string | null>(null);

  // Quick Add Vehicle (inline, minimal)
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickRaceLength, setQuickRaceLength] = useState<RaceLength>('QUARTER');
  const [quickFuelType, setQuickFuelType] = useState<'gasoline' | 'alcohol'>('gasoline');
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  // Time Slip Scanner
  const [showScanner, setShowScanner] = useState(false);

  // Load known opponents from run history for autocomplete
  useEffect(() => {
    storage.loadRuns().then(runs => {
      const seen = new Set<string>();
      const result: Array<{ name: string; carNumber: string }> = [];
      for (const run of runs) {
        if (run.opponent?.name) {
          const key = run.opponent.name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            result.push({ name: run.opponent.name, carNumber: run.opponent.carNumber || '' });
          }
        }
      }
      setKnownOpponents(result.slice(0, 50));
    }).catch(() => {});
  }, []);

  // Load vehicles on mount
  useEffect(() => {
    loadVehicles().then(v => {
      setVehicles(v);
      if (v.length > 0) {
        setSelectedVehicleId(v[0].id);
        setRaceLength(v[0].defaultRaceLength);
      }
    });
  }, []);

  // Get selected vehicle object
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) ?? null;

  // The race-length-appropriate final ET / MPH (the one required to save).
  const finalET = raceLength === 'QUARTER' ? quarterET : eighthET;
  const finalMPH = raceLength === 'QUARTER' ? quarterMPH : eighthMPH;

  
  const [userCarNumber, setUserCarNumber] = useState('');

  // Handle import from time slip scanner
  const handleTimeslipImport = (data: {
    user: {
      carNumber?: string;
      reactionTime?: number;
      sixtyFt?: number;
      threeThirtyFt?: number;
      eighthMileET?: number;
      eighthMileMPH?: number;
      thousandFt?: number;
      quarterMileET?: number;
      quarterMileMPH?: number;
      dialIn?: number;
    };
    opponent: {
      name?: string;
      carNumber?: string;
      notes?: string;
      dialIn?: number;
      reactionTime?: number;
      sixtyFt?: number;
      threeThirtyFt?: number;
      eighthMileET?: number;
      eighthMileMPH?: number;
      thousandFt?: number;
      et?: number;
      mph?: number;
    };
    raceInfo: {
      date?: string;
      time?: string;
      trackName?: string;
      round?: string;
      runNumber?: number;
      userWon?: boolean | null;
      margin?: number;
    };
    weather?: {
      temperatureF?: number;
      humidityPct?: number;
      densityAltitude?: number;
    };
  }) => {
    // Import user timing data
    if (data.user.reactionTime) setReactionTime(data.user.reactionTime.toString());
    if (data.user.dialIn) setDialIn(data.user.dialIn.toString());
    if (data.user.carNumber) setUserCarNumber(data.user.carNumber);
    if (data.user.sixtyFt) setSixtyFt(data.user.sixtyFt.toString());
    if (data.user.threeThirtyFt) setThreeThirtyFt(data.user.threeThirtyFt.toString());
    if (data.user.eighthMileET) setEighthET(data.user.eighthMileET.toString());
    if (data.user.eighthMileMPH) setEighthMPH(data.user.eighthMileMPH.toString());
    if (data.user.thousandFt) setThousandFt(data.user.thousandFt.toString());
    
    if (data.user.quarterMileET) setQuarterET(data.user.quarterMileET.toString());
    if (data.user.quarterMileMPH) setQuarterMPH(data.user.quarterMileMPH.toString());
    
    // Import opponent data
    if (data.opponent.name || data.opponent.et || data.opponent.carNumber) setShowOpponent(true);
    if (data.opponent.name) setOpponentName(data.opponent.name);
    if (data.opponent.carNumber) setOpponentCarNumber(data.opponent.carNumber);
    if (data.opponent.notes) setOpponentNotes(data.opponent.notes);
    if (data.opponent.dialIn) setOpponentDialIn(data.opponent.dialIn.toString());
    if (data.opponent.reactionTime) setOpponentRT(data.opponent.reactionTime.toString());
    if (data.opponent.sixtyFt) setOpponentSixtyFt(data.opponent.sixtyFt.toString());
    if (data.opponent.threeThirtyFt) setOpponentThirtyFt(data.opponent.threeThirtyFt.toString());
    if (data.opponent.eighthMileET) setOpponentEighthET(data.opponent.eighthMileET.toString());
    if (data.opponent.eighthMileMPH) setOpponentEighthMPH(data.opponent.eighthMileMPH.toString());
    if (data.opponent.thousandFt) setOpponentThousandFt(data.opponent.thousandFt.toString());
    if (data.opponent.et) setOpponentET(data.opponent.et.toString());
    if (data.opponent.mph) setOpponentMPH(data.opponent.mph.toString());
    
    // Import race info — convert MM/DD/YYYY → YYYY-MM-DD for the date input
    if (data.raceInfo.date) setRunDate(parseSlipDate(data.raceInfo.date));
    // Normalise time: single-digit hour or trailing seconds → HH:MM for <input type="time">
    if (data.raceInfo.time) setRunTime(parseSlipTime(data.raceInfo.time));
    if (data.raceInfo.round) setRound(data.raceInfo.round);
    if (data.raceInfo.trackName) {
      setNotes(prev => prev ? `${prev}\nTrack: ${data.raceInfo.trackName}` : `Track: ${data.raceInfo.trackName}`);
    }

    // Import weather (temp / humidity from the slip's summary row). Env stores
    // barometer + elevation rather than DA, so when the slip reports a density
    // altitude we back-calculate the barometer that reproduces that DA under the
    // app's own DA math (keeping temp/humidity/elevation fixed). This keeps the
    // imported weather internally consistent with the correction engine instead
    // of just stashing DA in a note.
    if (data.weather) {
      const { temperatureF, humidityPct, densityAltitude } = data.weather;
      let baroWasEstimated = false;
      setEnv(prev => {
        const tempF = temperatureF ?? prev.temperatureF;
        const humidity = humidityPct ?? prev.humidityPct;
        let barometerInHg = prev.barometerInHg;
        if (densityAltitude !== undefined) {
          const solved = solveBarometerForDensityAltitude(
            densityAltitude,
            tempF,
            humidity,
            prev.elevation,
          );
          barometerInHg = solved.barometerInHg;
          baroWasEstimated = true;
        }
        return {
          ...prev,
          temperatureF: tempF,
          humidityPct: humidity,
          barometerInHg,
        };
      });
      if (data.weather.temperatureF || data.weather.humidityPct || data.weather.densityAltitude) {
        setWeatherSource('timeslip');
        setBarometerEstimated(baroWasEstimated);
      }
      if (densityAltitude !== undefined) {
        setNotes(prev => {
          const tag = `Slip DA: ${densityAltitude} ft (barometer back-calculated)`;
          return prev ? `${prev}\n${tag}` : tag;
        });
      }
    }
  };

  const resetForm = () => {
    setReactionTime('');
    setDialIn('');
    setSixtyFt('');
    setThreeThirtyFt('');
    setEighthET('');
    setEighthMPH('');
    setThousandFt('');
    setQuarterET('');
    setQuarterMPH('');
    setNotes('');
    setUserCarNumber('');
    setShowOpponent(false);
    setOpponentName('');
    setOpponentCarNumber('');
    setOpponentNotes('');
    setOpponentDialIn('');
    setOpponentRT('');
    setOpponentSixtyFt('');
    setOpponentThirtyFt('');
    setOpponentEighthET('');
    setOpponentEighthMPH('');
    setOpponentThousandFt('');
    setOpponentET('');
    setOpponentMPH('');
    setSaveError(null);
    setRunDate(new Date().toISOString().split('T')[0]);
    setRunTime(new Date().toTimeString().slice(0, 5));
  };

  const handleLogAnother = () => {
    setSavedRunId(null);
    resetForm();
  };

  const handleQuickAddVehicle = async () => {
    setQuickError(null);
    const name = quickName.trim();
    if (!name) {
      setQuickError('Enter a vehicle name');
      return;
    }
    if (!canCreateVehicle(vehicles.length)) {
      setQuickError(
        `Vehicle limit reached (${vehicleLimit === Infinity ? '\u221e' : vehicleLimit} on ${tierInfo.name}). Upgrade for more.`
      );
      return;
    }
    setQuickSaving(true);
    try {
      const id = crypto.randomUUID();
      // Minimal but schema-valid vehicle with sane QuarterJr defaults.
      // Fully editable later in the Vehicle Manager.
      const vehicle: VehicleLite = {
        id,
        name,
        defaultRaceLength: quickRaceLength,
        transmissionType: 'clutch',
        weightLb: 3000,
        rolloutIn: 12,
        tireDiaIn: 28,
        rearGear: 3.73,
        powerHP: 400,
        rpmAtPeakHP: 6500,
        editorMode: 'simple',
        fuelType: quickFuelType,
      } as VehicleLite;
      await saveVehicle(vehicle);
      // Optimistically add + select so the user can log immediately, even if
      // the (possibly offline) backend reload would not surface it yet.
      setVehicles(prev => [...prev, vehicle]);
      setSelectedVehicleId(id);
      setRaceLength(quickRaceLength);
      setShowQuickAdd(false);
      setQuickName('');
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : 'Failed to create vehicle');
    } finally {
      setQuickSaving(false);
    }
  };

  const handleSaveRun = async () => {
    setSaveError(null);

    if (!selectedVehicleId) {
      setSaveError('Select or add a vehicle first');
      return;
    }
    if (!finalET) {
      setSaveError(`${raceLength === 'QUARTER' ? '1/4' : '1/8'} mile ET is required`);
      return;
    }

    const existingRuns = await storage.loadRuns();
    if (!canSaveRun(existingRuns.length)) {
      setSaveError(`Run limit reached (${runLimit} runs on ${tierInfo.name} tier). Upgrade to save more runs.`);
      return;
    }

    setSaving(true);
    try {
      const finalETValue = parseFloat(finalET);
      const finalMPHValue = finalMPH ? parseFloat(finalMPH) : undefined;

      const opponent = opponentName || opponentCarNumber || opponentET ? {
        name: opponentName || undefined,
        carNumber: opponentCarNumber.trim() || undefined,
        notes: opponentNotes.trim() || undefined,
        dialIn: opponentDialIn ? parseFloat(opponentDialIn) : undefined,
        reactionTime: opponentRT ? parseFloat(opponentRT) : undefined,
        sixtyFt: opponentSixtyFt ? parseFloat(opponentSixtyFt) : undefined,
        threeThirtyFt: opponentThirtyFt ? parseFloat(opponentThirtyFt) : undefined,
        eighthMileET: opponentEighthET ? parseFloat(opponentEighthET) : undefined,
        eighthMileMPH: opponentEighthMPH ? parseFloat(opponentEighthMPH) : undefined,
        thousandFt: opponentThousandFt ? parseFloat(opponentThousandFt) : undefined,
        et: opponentET ? parseFloat(opponentET) : undefined,
        mph: opponentMPH ? parseFloat(opponentMPH) : undefined,
      } : undefined;

      // Corrected ET to RSA Standard Day (normalization for display/history).
      // Non-fatal: a failure here must never block saving the run.
      let correctedET: number | undefined;
      let correctionFactor: number | undefined;
      try {
        const c = correctToStandard(finalETValue, envToWeather(env));
        correctedET = c.correctedET;
        correctionFactor = c.correctionFactor;
      } catch {
        // ignore — corrected ET is a display enhancement only
      }

      const clientId = crypto.randomUUID();
      const run: RunRecordV1 = {
        id: clientId,
        clientId,
        runKind: 'logged',
        createdAt: Date.now(),
        vehicleId: selectedVehicleId,
        vehicleName: selectedVehicle?.name,
        raceLength,
        env,
        weatherSource,
        barometerEstimated: barometerEstimated || undefined,
        runDate,
        runTime,
        round,
        lane,
        carNumber: userCarNumber.trim() || undefined,
        reactionTime: reactionTime ? parseFloat(reactionTime) : undefined,
        dialIn: dialIn ? parseFloat(dialIn) : undefined,
        sixtyFt: sixtyFt ? parseFloat(sixtyFt) : undefined,
        threeThirtyFt: threeThirtyFt ? parseFloat(threeThirtyFt) : undefined,
        eighthMileET: eighthET ? parseFloat(eighthET) : undefined,
        eighthMileMPH: eighthMPH ? parseFloat(eighthMPH) : undefined,
        thousandFt: raceLength === 'QUARTER' && thousandFt ? parseFloat(thousandFt) : undefined,
        quarterMileET: raceLength === 'QUARTER' && quarterET ? parseFloat(quarterET) : undefined,
        quarterMileMPH: raceLength === 'QUARTER' && quarterMPH ? parseFloat(quarterMPH) : undefined,
        correctedET,
        correctionFactor,
        outcome: {
          slipET_s: finalETValue,
          slipMPH: finalMPHValue,
        },
        notes: notes.trim() || undefined,
        opponent,
      };

      await storage.saveRun(run);
      setSavedRunId(clientId);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save run');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Log Run">
      {/* Time Slip Scanner Modal */}
      <Suspense fallback={null}>
        <TimeslipScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onImport={handleTimeslipImport}
        />
      </Suspense>

      {/* Success state */}
      {savedRunId && (
        <div className="card mb-6" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginBottom: 'var(--space-2)' }}>
            ✓ Run saved
          </div>
          <p className="text-muted mb-4">Your run was added to history.</p>
          <div className="flex gap-4" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => navigate('/history')}>View History</button>
            <button className="btn btn-secondary" onClick={() => navigate('/predict-weather', { state: { baselineRunId: savedRunId } })}>
              Predict from This Run
            </button>
            <button className="btn btn-secondary" onClick={handleLogAnother}>Log Another</button>
          </div>
        </div>
      )}

      {/* Quick Add Vehicle — inline card */}
      {!savedRunId && showQuickAdd && (
        <div className="card mb-4">
          <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Quick Add Vehicle</h3>
          {quickError && <div className="error mb-3"><p style={{ margin: 0 }}>{quickError}</p></div>}
          <FormRow label="Name" req>
            <input style={logInputStyle} value={quickName} onChange={e => setQuickName(e.target.value)} placeholder="My Dragster" autoFocus />
          </FormRow>
          <FormRow label="Race">
            <div style={{ display: 'flex', gap: '16px' }}>
              {(['EIGHTH', 'QUARTER'] as RaceLength[]).map(rl => (
                <label key={rl} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="radio" name="quickRL" checked={quickRaceLength === rl} onChange={() => setQuickRaceLength(rl)} />
                  {rl === 'EIGHTH' ? '1/8 Mile' : '1/4 Mile'}
                </label>
              ))}
            </div>
          </FormRow>
          <FormRow label="Fuel">
            <div style={{ display: 'flex', gap: '16px' }}>
              {(['gasoline', 'alcohol'] as const).map(ft => (
                <label key={ft} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="radio" name="quickFT" checked={quickFuelType === ft} onChange={() => setQuickFuelType(ft)} />
                  {ft === 'gasoline' ? 'Gasoline' : 'Alcohol'}
                </label>
              ))}
            </div>
          </FormRow>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button className="btn" onClick={handleQuickAddVehicle} disabled={quickSaving}>{quickSaving ? 'Adding…' : 'Add Vehicle'}</button>
            <button className="btn btn-secondary" onClick={() => { setShowQuickAdd(false); setQuickError(null); }}>Cancel</button>
            <Link to="/vehicles" className="btn btn-secondary">Full Setup</Link>
          </div>
        </div>
      )}

      {/* No vehicles */}
      {!savedRunId && vehicles.length === 0 && !showQuickAdd && (
        <div className="card mb-4" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
          <p className="text-muted mb-4">No vehicles yet. Add one to start logging.</p>
          <div className="flex gap-3" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={() => setShowQuickAdd(true)}>Quick Add Vehicle</button>
            <Link to="/vehicles" className="btn btn-secondary">Vehicle Manager</Link>
          </div>
        </div>
      )}

      {/* ── Responsive form: single-column mobile, two-column desktop ── */}
      {!savedRunId && vehicles.length > 0 && (
        <div style={{ maxWidth: '1100px', paddingBottom: isDesktop ? '24px' : '80px' }}>

          {/* Top controls bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', marginBottom: '4px', borderBottom: '2px solid var(--color-border)', flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => setShowScanner(true)}>📸 Scan Time Slip</button>
            <div style={{ display: 'flex', gap: '2px' }}>
              <button type="button" onClick={() => setMode('quick')} className={mode === 'quick' ? 'btn btn-small' : 'btn btn-small btn-secondary'}>Quick</button>
              <button type="button" onClick={() => setMode('all')} className={mode === 'all' ? 'btn btn-small' : 'btn btn-small btn-secondary'}>All</button>
            </div>
          </div>

          {/* Vehicle + Race (full-width) */}
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '2px', marginBottom: '8px' }}>
            <FormRow label="Vehicle" req>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <select
                  style={{ ...logInputStyle, cursor: 'pointer', flex: 1 }}
                  value={selectedVehicleId}
                  onChange={e => {
                    setSelectedVehicleId(e.target.value);
                    const v = vehicles.find(v => v.id === e.target.value);
                    if (v) setRaceLength(v.defaultRaceLength);
                  }}
                >
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 8px', whiteSpace: 'nowrap' }} onClick={() => { setShowQuickAdd(true); setQuickError(null); }}>+ New</button>
              </div>
              {selectedVehicle && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                  {formatLb(selectedVehicle.weightLb)} lb · {formatHp(selectedVehicle.powerHP)} HP · {formatIn(selectedVehicle.tireDiaIn)}" tire
                  {selectedVehicle.fuelType && <span style={{ marginLeft: '6px' }}>· {selectedVehicle.fuelType}</span>}
                </div>
              )}
            </FormRow>
            <FormRow label="Race">
              <div style={{ display: 'flex', gap: '16px' }}>
                {(['EIGHTH', 'QUARTER'] as RaceLength[]).map(rl => (
                  <label key={rl} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="radio" name="raceLength" checked={raceLength === rl} onChange={() => setRaceLength(rl)} />
                    {rl === 'EIGHTH' ? '1/8 Mile' : '1/4 Mile'}
                  </label>
                ))}
              </div>
            </FormRow>
          </div>

          {/* Main grid: 2-col on desktop, 1-col on mobile */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
            gap: isDesktop ? '0 32px' : '0',
            alignItems: 'start',
          }}>

            {/* LEFT: Race Info + My Run */}
            <div>
              <LogSection title="Race Info" open={showRaceInfo} onToggle={() => setShowRaceInfo(o => !o)}>
                <FormRow label="Date"><input type="date" style={logInputStyle} value={runDate} onChange={e => setRunDate(e.target.value)} /></FormRow>
                <FormRow label="Time"><input type="time" style={logInputStyle} value={runTime} onChange={e => setRunTime(e.target.value)} /></FormRow>
                <FormRow label="Round">
                  <select style={{ ...logInputStyle, cursor: 'pointer' }} value={round} onChange={e => setRound(e.target.value)}>
                    {RoundTypes.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </FormRow>
                <FormRow label="Lane">
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {(['left', 'right'] as const).map(l => (
                      <label key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                        <input type="radio" name="lane" checked={lane === l} onChange={() => setLane(l)} />
                        {l === 'left' ? 'Left' : 'Right'}
                      </label>
                    ))}
                  </div>
                </FormRow>
              </LogSection>

              <LogSection title="My Run" open={showMyRun} onToggle={() => setShowMyRun(o => !o)}>
                <FormRow label="Car #"><input style={logInputStyle} value={userCarNumber} onChange={e => setUserCarNumber(e.target.value)} placeholder="211A" /></FormRow>
                <FormRow label="Dial-In"><input type="number" step="0.001" style={logInputStyle} value={dialIn} onChange={e => setDialIn(e.target.value)} placeholder="9.500" /></FormRow>
                <FormRow label="R/T"><input type="number" step="0.001" style={logInputStyle} value={reactionTime} onChange={e => setReactionTime(e.target.value)} placeholder="0.015" /></FormRow>
                <FormRow label="60'"><input type="number" step="0.001" style={logInputStyle} value={sixtyFt} onChange={e => setSixtyFt(e.target.value)} placeholder="1.250" /></FormRow>
                {mode === 'all' && <FormRow label="330'"><input type="number" step="0.001" style={logInputStyle} value={threeThirtyFt} onChange={e => setThreeThirtyFt(e.target.value)} placeholder="3.500" /></FormRow>}
                <FormRow label={raceLength === 'EIGHTH' ? '1/8 ET *' : '1/8 ET'}>
                  <input type="number" step="0.001" style={logInputStyle} value={eighthET} onChange={e => setEighthET(e.target.value)} placeholder="6.800" />
                </FormRow>
                {mode === 'all' && <FormRow label="1/8 MPH"><input type="number" step="0.01" style={logInputStyle} value={eighthMPH} onChange={e => setEighthMPH(e.target.value)} placeholder="105.5" /></FormRow>}
                {(mode === 'all' || raceLength === 'QUARTER') && (
                  <FormRow label="1000'"><input type="number" step="0.001" style={logInputStyle} value={thousandFt} onChange={e => setThousandFt(e.target.value)} placeholder="10.000" /></FormRow>
                )}
                {raceLength === 'QUARTER' && <>
                  <FormRow label="1/4 ET *"><input type="number" step="0.001" style={logInputStyle} value={quarterET} onChange={e => setQuarterET(e.target.value)} placeholder="13.500" /></FormRow>
                  <FormRow label="1/4 MPH"><input type="number" step="0.01" style={logInputStyle} value={quarterMPH} onChange={e => setQuarterMPH(e.target.value)} placeholder="104.5" /></FormRow>
                </>}
              </LogSection>

              {/* Desktop: Save in left-column footer below My Run */}
              {isDesktop && (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px', marginTop: '4px' }}>
                  {saveError && <div className="error mb-3"><p style={{ margin: 0 }}>{saveError}</p></div>}
                  <button
                    className="btn"
                    style={{ width: '100%', fontSize: '1rem', padding: '13px' }}
                    onClick={handleSaveRun}
                    disabled={saving || !selectedVehicleId || !finalET}
                  >
                    {saving ? 'Saving…' : 'Save Run'}
                  </button>
                  {!finalET && selectedVehicleId && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '5px' }}>
                      Enter {raceLength === 'QUARTER' ? '1/4 ET' : '1/8 ET'} to save
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: Opponent + Weather + Notes */}
            <div>
              <LogSection
                title="Opponent"
                open={showOpponent}
                onToggle={() => setShowOpponent(o => !o)}
                badge={opponentName || opponentCarNumber ? (opponentName || `#${opponentCarNumber}`) : undefined}
              >
                <FormRow label="Name">
                  <input
                    style={logInputStyle}
                    list="opp-names-list"
                    value={opponentName}
                    onChange={e => {
                      setOpponentName(e.target.value);
                      const match = knownOpponents.find(o => o.name.toLowerCase() === e.target.value.toLowerCase());
                      if (match && match.carNumber && !opponentCarNumber) setOpponentCarNumber(match.carNumber);
                    }}
                    placeholder="Driver name"
                  />
                  <datalist id="opp-names-list">
                    {knownOpponents.map((o, i) => <option key={i} value={o.name} />)}
                  </datalist>
                </FormRow>
                <FormRow label="Car #">
                  <input style={logInputStyle} value={opponentCarNumber} onChange={e => setOpponentCarNumber(e.target.value)} placeholder="211A" />
                </FormRow>
                <FormRow label="Dial">
                  <input type="number" step="0.001" style={logInputStyle} value={opponentDialIn} onChange={e => setOpponentDialIn(e.target.value)} placeholder="9.500" />
                </FormRow>
                <FormRow label="R/T">
                  <input type="number" step="0.001" style={logInputStyle} value={opponentRT} onChange={e => setOpponentRT(e.target.value)} placeholder="0.015" />
                </FormRow>
                {mode === 'all' && <>
                  <FormRow label="60'"><input type="number" step="0.001" style={logInputStyle} value={opponentSixtyFt} onChange={e => setOpponentSixtyFt(e.target.value)} placeholder="1.250" /></FormRow>
                  <FormRow label="330'"><input type="number" step="0.001" style={logInputStyle} value={opponentThirtyFt} onChange={e => setOpponentThirtyFt(e.target.value)} placeholder="3.500" /></FormRow>
                  <FormRow label="1/8 ET"><input type="number" step="0.001" style={logInputStyle} value={opponentEighthET} onChange={e => setOpponentEighthET(e.target.value)} placeholder="6.800" /></FormRow>
                  <FormRow label="1/8 MPH"><input type="number" step="0.01" style={logInputStyle} value={opponentEighthMPH} onChange={e => setOpponentEighthMPH(e.target.value)} placeholder="105.5" /></FormRow>
                  <FormRow label="1000'"><input type="number" step="0.001" style={logInputStyle} value={opponentThousandFt} onChange={e => setOpponentThousandFt(e.target.value)} placeholder="10.000" /></FormRow>
                </>}
                <FormRow label="ET">
                  <input type="number" step="0.001" style={logInputStyle} value={opponentET} onChange={e => setOpponentET(e.target.value)} placeholder="13.500" />
                </FormRow>
                <FormRow label="MPH">
                  <input type="number" step="0.01" style={logInputStyle} value={opponentMPH} onChange={e => setOpponentMPH(e.target.value)} placeholder="104.5" />
                </FormRow>
                {mode === 'all' && (
                  <FormRow label="Notes">
                    <textarea style={{ ...logInputStyle, minHeight: '56px', resize: 'vertical', fontFamily: 'inherit' }} value={opponentNotes} onChange={e => setOpponentNotes(e.target.value)} placeholder="Car description, outcome…" />
                  </FormRow>
                )}
                {(opponentName || opponentCarNumber) && (
                  <div style={{ marginTop: '4px' }}>
                    <Link
                      to={`/history?search=${encodeURIComponent(opponentName || opponentCarNumber)}`}
                      style={{ fontSize: '0.8rem', color: 'var(--color-accent)', textDecoration: 'none' }}
                      target="_blank" rel="noopener noreferrer"
                    >🔍 View Opponent History</Link>
                  </div>
                )}
                {dialIn && reactionTime && finalET && opponentDialIn && opponentRT && opponentET && (() => {
                  const mov = calculateMOV(
                    { dialIn: parseFloat(dialIn), reactionTime: parseFloat(reactionTime), et: parseFloat(finalET) },
                    { dialIn: parseFloat(opponentDialIn), reactionTime: parseFloat(opponentRT), et: parseFloat(opponentET) }
                  );
                  const youWon = mov.winner === 'racer1';
                  return (
                    <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: youWon ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${youWon ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                      <span style={{ fontWeight: 700, color: youWon ? '#10b981' : '#ef4444' }}>{youWon ? 'WIN' : 'LOSS'}</span>
                      <span style={{ marginLeft: '8px', fontFamily: 'monospace', fontSize: '0.9rem' }}>{formatMOV(mov)}</span>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                        {describeRaceOutcome(mov, 'You', opponentName || opponentCarNumber || 'Opponent')}
                      </div>
                    </div>
                  );
                })()}
              </LogSection>

              <LogSection title="Weather" open={showWeather} onToggle={() => setShowWeather(o => !o)}>
                {/* Weather source selector */}
                <div style={{ display: 'flex', gap: '2px', marginBottom: '10px', marginTop: '2px' }}>
                  {(['timeslip', 'manual', 'apple_weather'] as const).map(src => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setWeatherSource(src)}
                      style={{
                        flex: 1, padding: '5px 4px', fontSize: '0.75rem', fontWeight: 600,
                        border: '1px solid var(--color-border)', cursor: 'pointer',
                        borderRadius: src === 'timeslip' ? 'var(--radius-sm) 0 0 var(--radius-sm)' : src === 'apple_weather' ? '0 var(--radius-sm) var(--radius-sm) 0' : '0',
                        background: weatherSource === src ? 'var(--color-accent)' : 'var(--color-bg)',
                        color: weatherSource === src ? '#fff' : 'var(--color-text-muted)',
                      }}
                    >
                      {src === 'timeslip' ? 'Timeslip' : src === 'manual' ? 'Manual' : 'Apple \u2600\ufe0f'}
                    </button>
                  ))}
                </div>
                {weatherSource === 'apple_weather' && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '8px', padding: '6px 8px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    Apple WeatherKit requires backend setup. Use the Fetch Forecast feature from the Weather ET Predictor, or enter weather manually.
                  </div>
                )}
                {barometerEstimated && weatherSource === 'timeslip' && (
                  <div style={{ fontSize: '0.75rem', color: '#d97706', marginBottom: '6px' }}>
                    ⚠ Barometer back-calculated from timeslip DA. Verify or override below.
                  </div>
                )}
                <EnvironmentForm value={env} onChange={setEnv} defaultShowOptional={false} />
              </LogSection>

              <LogSection title="Notes" open={showNotes} onToggle={() => setShowNotes(o => !o)}>
                <textarea
                  style={{ ...logInputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit', marginTop: '4px' }}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Track conditions, setup changes, observations…"
                />
              </LogSection>
            </div>
          </div>

          {/* Mobile: sticky save bar */}
          {!isDesktop && (
            <>
              {saveError && <div className="error mt-4"><p style={{ margin: 0 }}>{saveError}</p></div>}
              <div style={{
                position: 'sticky', bottom: 0,
                background: 'var(--color-bg)',
                borderTop: '1px solid var(--color-border)',
                padding: '12px 0 12px',
                marginTop: '16px',
                zIndex: 10,
              }}>
                <button
                  className="btn"
                  style={{ width: '100%', fontSize: '1rem', padding: '13px' }}
                  onClick={handleSaveRun}
                  disabled={saving || !selectedVehicleId || !finalET}
                >
                  {saving ? 'Saving…' : 'Save Run'}
                </button>
                {!finalET && selectedVehicleId && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '5px' }}>
                    Enter {raceLength === 'QUARTER' ? '1/4 ET' : '1/8 ET'} to save
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </Page>
  );
}

export default Log;
