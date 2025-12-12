/**
 * Quick Run Entry Component
 * 
 * A streamlined interface for logging runs quickly at the track.
 * Designed for < 30 second entry time with minimal required fields.
 * 
 * Features:
 * - Auto-increment round number
 * - Remember last vehicle and lane
 * - Large touch-friendly inputs
 * - Quick number pad for ET/MPH entry
 */

import { useState, useEffect, useCallback } from 'react';
import { storage } from '../../state/storage';
import { loadVehicles, type VehicleLite } from '../../state/vehicles';
import type { RunRecordV1 } from '../../domain/schemas/run.schema';
import type { RaceLength } from '../../domain/config/raceLengths';

interface QuickRunEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (run: RunRecordV1) => void;
  defaultVehicleId?: string;
  defaultRaceLength?: RaceLength;
}

const STORAGE_KEY = 'rsa_quick_run_state';

interface QuickRunState {
  lastVehicleId: string;
  lastRaceLength: RaceLength;
  lastLane: 'left' | 'right';
  runNumber: number;
}

function loadQuickRunState(): QuickRunState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {
    lastVehicleId: '',
    lastRaceLength: 'QUARTER',
    lastLane: 'left',
    runNumber: 1,
  };
}

function saveQuickRunState(state: QuickRunState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export default function QuickRunEntry({
  isOpen,
  onClose,
  onSaved,
  defaultVehicleId,
  defaultRaceLength,
}: QuickRunEntryProps) {
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [vehicleId, setVehicleId] = useState('');
  const [raceLength, setRaceLength] = useState<RaceLength>('QUARTER');
  const [lane, setLane] = useState<'left' | 'right'>('left');
  const [runNumber, setRunNumber] = useState(1);
  const [et, setEt] = useState('');
  const [mph, setMph] = useState('');
  const [reaction, setReaction] = useState('');
  const [dialIn, setDialIn] = useState('');

  // Load vehicles and restore state
  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);
    loadVehicles().then(v => {
      setVehicles(v);
      
      // Restore last state
      const state = loadQuickRunState();
      setVehicleId(defaultVehicleId || state.lastVehicleId || (v[0]?.id ?? ''));
      setRaceLength(defaultRaceLength || state.lastRaceLength);
      setLane(state.lastLane);
      setRunNumber(state.runNumber);
      
      setLoading(false);
    });
  }, [isOpen, defaultVehicleId, defaultRaceLength]);

  // Reset form for next run
  const resetForNextRun = useCallback(() => {
    setEt('');
    setMph('');
    setReaction('');
    // Keep dialIn, vehicle, lane - just increment run number
    setRunNumber(prev => prev + 1);
    setSuccess(false);
    setError(null);
  }, []);

  // Save run
  const handleSave = async () => {
    if (!vehicleId || !et) {
      setError('Vehicle and ET are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const etValue = parseFloat(et);
      const mphValue = mph ? parseFloat(mph) : undefined;
      const reactionValue = reaction ? parseFloat(reaction) : undefined;
      const dialInValue = dialIn ? parseFloat(dialIn) : undefined;

      const run: RunRecordV1 = {
        id: `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        vehicleId,
        raceLength,
        env: {
          elevation: 0,
          barometerInHg: 29.92,
          temperatureF: 70,
          humidityPct: 50,
        },
        runDate: new Date().toISOString().split('T')[0],
        runTime: new Date().toTimeString().slice(0, 5),
        runNumber,
        lane,
        reactionTime: reactionValue,
        dialIn: dialInValue,
        quarterMileET: raceLength === 'QUARTER' ? etValue : undefined,
        quarterMileMPH: raceLength === 'QUARTER' ? mphValue : undefined,
        eighthMileET: raceLength === 'EIGHTH' ? etValue : undefined,
        eighthMileMPH: raceLength === 'EIGHTH' ? mphValue : undefined,
        outcome: {
          slipET_s: etValue,
          slipMPH: mphValue,
        },
      };

      await storage.saveRun(run);

      // Save state for next time
      saveQuickRunState({
        lastVehicleId: vehicleId,
        lastRaceLength: raceLength,
        lastLane: lane,
        runNumber: runNumber + 1,
      });

      setSuccess(true);
      onSaved?.(run);

      // Auto-reset after 1.5 seconds
      setTimeout(resetForNextRun, 1500);

    } catch (err) {
      setError('Failed to save run');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleSave]);

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    textAlign: 'center',
    borderRadius: '8px',
    border: '2px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
    marginBottom: '4px',
    display: 'block',
  };

  const buttonStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '12px 16px',
    fontSize: '1rem',
    fontWeight: active ? 'bold' : 'normal',
    borderRadius: '8px',
    border: active ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
    backgroundColor: active ? 'rgba(59, 130, 246, 0.2)' : 'var(--color-bg)',
    color: active ? 'var(--color-accent)' : 'var(--color-text)',
    cursor: 'pointer',
  });

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'var(--color-bg)',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        zIndex: 1001,
        width: '400px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text)' }}>
              ⚡ Quick Log
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Run #{runNumber}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
              Loading...
            </div>
          ) : (
            <>
              {/* Vehicle selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Vehicle</label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  style={{
                    ...inputStyle,
                    fontSize: '1rem',
                    padding: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select vehicle...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Race length & Lane */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Distance</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setRaceLength('EIGHTH')}
                      style={buttonStyle(raceLength === 'EIGHTH')}
                    >
                      1/8
                    </button>
                    <button
                      type="button"
                      onClick={() => setRaceLength('QUARTER')}
                      style={buttonStyle(raceLength === 'QUARTER')}
                    >
                      1/4
                    </button>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Lane</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setLane('left')}
                      style={buttonStyle(lane === 'left')}
                    >
                      L
                    </button>
                    <button
                      type="button"
                      onClick={() => setLane('right')}
                      style={buttonStyle(lane === 'right')}
                    >
                      R
                    </button>
                  </div>
                </div>
              </div>

              {/* ET and MPH - the main inputs */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>ET (seconds) *</label>
                  <input
                    type="number"
                    step="0.001"
                    value={et}
                    onChange={(e) => setEt(e.target.value)}
                    placeholder="10.500"
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>MPH</label>
                  <input
                    type="number"
                    step="0.01"
                    value={mph}
                    onChange={(e) => setMph(e.target.value)}
                    placeholder="125.00"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Optional fields - collapsible */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>RT</label>
                  <input
                    type="number"
                    step="0.001"
                    value={reaction}
                    onChange={(e) => setReaction(e.target.value)}
                    placeholder=".015"
                    style={{ ...inputStyle, fontSize: '1rem', padding: '10px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Dial-In</label>
                  <input
                    type="number"
                    step="0.001"
                    value={dialIn}
                    onChange={(e) => setDialIn(e.target.value)}
                    placeholder="10.50"
                    style={{ ...inputStyle, fontSize: '1rem', padding: '10px' }}
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  padding: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  color: '#ef4444',
                  marginBottom: '16px',
                  fontSize: '0.9rem',
                }}>
                  {error}
                </div>
              )}

              {/* Success */}
              {success && (
                <div style={{
                  padding: '10px',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid #22c55e',
                  borderRadius: '8px',
                  color: '#22c55e',
                  marginBottom: '16px',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                }}>
                  ✓ Run saved! Ready for next...
                </div>
              )}

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving || !vehicleId || !et}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: success ? '#22c55e' : 'var(--color-accent)',
                  color: 'white',
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: (!vehicleId || !et) ? 0.5 : 1,
                }}
              >
                {saving ? 'Saving...' : success ? '✓ Saved!' : 'Save Run (Ctrl+Enter)'}
              </button>

              {/* Quick tips */}
              <div style={{
                marginTop: '16px',
                padding: '10px',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
              }}>
                <strong>Tips:</strong> Press Ctrl+Enter to save quickly. Run # auto-increments. Vehicle & lane are remembered.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
