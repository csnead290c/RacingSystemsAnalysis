/**
 * Dial-In Calculator Page
 * 
 * A dedicated tool for bracket racers to calculate their dial-in
 * based on predicted ET and weather conditions.
 */

import { useState, useEffect } from 'react';
import Page from '../shared/components/Page';
import EnvironmentForm from '../shared/components/EnvironmentForm';
import { DEFAULT_ENV } from '../domain/schemas/env.schema';
import type { Env } from '../domain/schemas/env.schema';
import { loadVehicles, type VehicleLite } from '../state/vehicles';
import { getAllTracks, type Track } from '../domain/config/tracks';
import { fetchTrackWeather, fetchCurrentLocationWeather, weatherToEnv } from '../services/weather';
import { simulate } from '../workerBridge';
import { fromVehicleToVB6Fixture } from '../dev/vb6/fromVehicle';
import { fixtureToSimInputs } from '../domain/physics/vb6/fixtures';
import type { RaceLength } from '../domain/config/raceLengths';

interface DialInHistory {
  id: string;
  date: string;
  predictedET: number;
  dialIn: number;
  actualET?: number;
  result?: 'win' | 'loss' | 'breakout' | 'redlight';
}

export default function DialIn() {
  // Vehicle selection
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [raceLength, setRaceLength] = useState<RaceLength>('EIGHTH');
  
  // Environment
  const [env, setEnv] = useState<Env>(DEFAULT_ENV);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  
  // Prediction
  const [predictedET, setPredictedET] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dial-in adjustments
  const [safetyMargin, setSafetyMargin] = useState(0.02); // Default 0.02 seconds safe
  const [manualAdjust, setManualAdjust] = useState(0);
  
  // History
  const [history, setHistory] = useState<DialInHistory[]>([]);

  // Load vehicles on mount
  useEffect(() => {
    loadVehicles().then(v => {
      setVehicles(v);
      if (v.length > 0) {
        setSelectedVehicleId(v[0].id);
      }
    });
    
    // Load history from localStorage
    try {
      const saved = localStorage.getItem('rsa_dialin_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  // Fetch weather
  const handleFetchWeather = async (track?: Track) => {
    setWeatherLoading(true);
    try {
      const weather = track 
        ? await fetchTrackWeather(track)
        : await fetchCurrentLocationWeather();
      
      const envUpdate = weatherToEnv(weather, track?.trackAngle);
      setEnv(prev => ({ ...prev, ...envUpdate }));
      if (track) setSelectedTrack(track);
    } catch (err) {
      console.error('Weather fetch failed:', err);
    } finally {
      setWeatherLoading(false);
    }
  };

  // Calculate prediction
  const handleCalculate = async () => {
    if (!selectedVehicle) {
      setError('Please select a vehicle');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const vb6Fixture = fromVehicleToVB6Fixture(selectedVehicle as any);
      const simInputs = fixtureToSimInputs(vb6Fixture, raceLength);
      
      simInputs.env = {
        elevation: env.elevation ?? 0,
        barometerInHg: env.barometerInHg ?? 29.92,
        temperatureF: env.temperatureF ?? 75,
        humidityPct: env.humidityPct ?? 50,
        windMph: env.windMph ?? 0,
        windAngleDeg: env.windAngleDeg ?? 0,
        trackTempF: env.trackTempF ?? 100,
        tractionIndex: env.tractionIndex ?? 5,
      };
      
      const result = await simulate('VB6Exact', simInputs);
      setPredictedET(result.et_s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  // Calculate final dial-in
  const calculatedDialIn = predictedET 
    ? Math.round((predictedET + safetyMargin + manualAdjust) * 1000) / 1000
    : null;

  // Save to history
  const handleSaveDialIn = () => {
    if (!calculatedDialIn || !predictedET) return;
    
    const entry: DialInHistory = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      predictedET,
      dialIn: calculatedDialIn,
    };
    
    const newHistory = [entry, ...history].slice(0, 50); // Keep last 50
    setHistory(newHistory);
    localStorage.setItem('rsa_dialin_history', JSON.stringify(newHistory));
  };

  // Update history entry with actual result - exported for future use
  const handleUpdateResult = (id: string, actualET: number, result: DialInHistory['result']) => {
    const newHistory = history.map(h => 
      h.id === id ? { ...h, actualET, result } : h
    );
    setHistory(newHistory);
    localStorage.setItem('rsa_dialin_history', JSON.stringify(newHistory));
  };
  // Expose for future UI (prevents unused warning)
  if (false as boolean) handleUpdateResult('', 0, 'win');

  return (
    <Page title="Dial-In Calculator">
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--space-4)' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-4)' }}>Dial-In Calculator</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
          {/* Left Column - Inputs */}
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Setup</h2>
            
            {/* Vehicle Selection */}
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label className="label">Vehicle</label>
              <select
                className="input"
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">Select vehicle...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            
            {/* Race Length */}
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label className="label">Race Length</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  className={`btn ${raceLength === 'EIGHTH' ? 'btn-primary' : ''}`}
                  onClick={() => setRaceLength('EIGHTH')}
                  style={{ flex: 1 }}
                >
                  1/8 Mile
                </button>
                <button
                  className={`btn ${raceLength === 'THOUSAND' ? 'btn-primary' : ''}`}
                  onClick={() => setRaceLength('THOUSAND')}
                  style={{ flex: 1 }}
                >
                  1000'
                </button>
                <button
                  className={`btn ${raceLength === 'QUARTER' ? 'btn-primary' : ''}`}
                  onClick={() => setRaceLength('QUARTER')}
                  style={{ flex: 1 }}
                >
                  1/4 Mile
                </button>
              </div>
            </div>
            
            {/* Track Selection */}
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label className="label">Track</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <select
                  className="input"
                  value={selectedTrack?.id || ''}
                  onChange={(e) => {
                    const track = getAllTracks().find(t => t.id === e.target.value);
                    if (track) handleFetchWeather(track);
                  }}
                  style={{ flex: 1 }}
                  disabled={weatherLoading}
                >
                  <option value="">Select track...</option>
                  {getAllTracks().map(track => (
                    <option key={track.id} value={track.id}>{track.name}</option>
                  ))}
                </select>
                <button
                  className="btn"
                  onClick={() => handleFetchWeather()}
                  disabled={weatherLoading}
                  title="Use current location"
                >
                  📍
                </button>
              </div>
            </div>
            
            {/* Environment */}
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label className="label">Weather Conditions</label>
              <EnvironmentForm value={env} onChange={setEnv} compact />
            </div>
            
            {/* Calculate Button */}
            <button
              className="btn btn-primary btn-full"
              onClick={handleCalculate}
              disabled={loading || !selectedVehicle}
              style={{ marginTop: 'var(--space-3)' }}
            >
              {loading ? 'Calculating...' : 'Calculate Dial-In'}
            </button>
            
            {error && (
              <div style={{ color: '#ef4444', marginTop: 'var(--space-2)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}
          </div>
          
          {/* Right Column - Results */}
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Dial-In</h2>
            
            {predictedET ? (
              <>
                {/* Predicted ET */}
                <div style={{ 
                  textAlign: 'center', 
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderRadius: '8px',
                  marginBottom: 'var(--space-3)',
                }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Predicted ET</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {predictedET.toFixed(3)}
                  </div>
                </div>
                
                {/* Adjustments */}
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <label className="label">Safety Margin (seconds)</label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    {[0, 0.01, 0.02, 0.03, 0.05].map(val => (
                      <button
                        key={val}
                        className={`btn ${safetyMargin === val ? 'btn-primary' : ''}`}
                        onClick={() => setSafetyMargin(val)}
                        style={{ flex: 1, padding: '6px' }}
                      >
                        +{val.toFixed(2)}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <label className="label">Manual Adjustment (seconds)</label>
                  <input
                    type="number"
                    className="input"
                    value={manualAdjust}
                    onChange={(e) => setManualAdjust(parseFloat(e.target.value) || 0)}
                    step="0.01"
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Positive = slower dial, Negative = quicker dial
                  </div>
                </div>
                
                {/* Final Dial-In */}
                <div style={{ 
                  textAlign: 'center', 
                  padding: 'var(--space-4)',
                  backgroundColor: '#22c55e',
                  color: 'white',
                  borderRadius: '8px',
                  marginBottom: 'var(--space-3)',
                }}>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Your Dial-In</div>
                  <div style={{ fontSize: '3rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {calculatedDialIn?.toFixed(2)}
                  </div>
                </div>
                
                <button
                  className="btn btn-full"
                  onClick={handleSaveDialIn}
                  style={{ marginBottom: 'var(--space-2)' }}
                >
                  Save to History
                </button>
              </>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: 'var(--space-6)',
                color: 'var(--color-text-muted)',
              }}>
                Select a vehicle and calculate to get your dial-in
              </div>
            )}
          </div>
        </div>
        
        {/* History */}
        {history.length > 0 && (
          <div className="card" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Recent Dial-Ins</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Date</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Predicted</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Dial-In</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Actual</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 10).map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px' }}>
                        {new Date(h.date).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px', fontFamily: 'monospace' }}>
                        {h.predictedET.toFixed(3)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px', fontFamily: 'monospace', fontWeight: '600' }}>
                        {h.dialIn.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px', fontFamily: 'monospace' }}>
                        {h.actualET?.toFixed(3) || '-'}
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px' }}>
                        {h.result === 'win' && '✅'}
                        {h.result === 'loss' && '❌'}
                        {h.result === 'breakout' && '💥'}
                        {h.result === 'redlight' && '🔴'}
                        {!h.result && '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Tips */}
        <div className="card" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Dial-In Tips</h2>
          <ul style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6, paddingLeft: '20px' }}>
            <li><strong>Safety Margin:</strong> Most bracket racers dial 0.01-0.03 seconds slower than predicted to avoid breakout.</li>
            <li><strong>Track Conditions:</strong> First round of the day often runs slower. Add 0.02-0.05 to your dial.</li>
            <li><strong>Temperature Changes:</strong> As the day heats up, the car typically slows down. Adjust accordingly.</li>
            <li><strong>Consistency:</strong> Track your actual ETs vs predictions to fine-tune your adjustments.</li>
            <li><strong>Wind:</strong> Headwind slows you down, tailwind speeds you up. The calculator accounts for this.</li>
          </ul>
        </div>
      </div>
    </Page>
  );
}
