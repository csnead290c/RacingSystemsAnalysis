import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Page from '../shared/components/Page';
import PeekCard from '../shared/components/PeekCard';
import PredictionReportCard from '../shared/components/PredictionReportCard';
import QuickRunEntry from '../shared/components/QuickRunEntry';
import { storage } from '../state/storage';
import { syncPendingRuns } from '../state/runSync';
import { loadVehicles, type VehicleLite } from '../state/vehicles';
import { hasFeature, CURRENT_TIER } from '../domain/config/entitlements';
import { runsToCsv, downloadCsv } from '../shared/utils/csv';
import type { RunRecordV1 } from '../domain/schemas/run.schema';
import type { RaceLength } from '../domain/config/raceLengths';
import { calculateMOV, formatMOV, describeRaceOutcome } from '../domain/physics/calculations/marginOfVictory';
import { calculateRunCompletion, calculateSplitIntervals } from '../domain/physics/calculations/runCompletion';
import { calculateDensityAltitude } from '../domain/physics/calculations/weatherImpact';

// Edit Run Modal Component
interface EditRunModalProps {
  run: RunRecordV1;
  vehicleName: string;
  onClose: () => void;
  onSave: (run: RunRecordV1) => void;
}

function EditRunModal({ run, vehicleName, onClose, onSave }: EditRunModalProps) {
  const [activeTab, setActiveTab] = useState<'timing' | 'opponent' | 'completion'>('timing');
  const [formData, setFormData] = useState({
    reactionTime: run.reactionTime?.toString() || '',
    sixtyFt: run.sixtyFt?.toString() || '',
    threeThirtyFt: run.threeThirtyFt?.toString() || '',
    eighthMileET: run.eighthMileET?.toString() || '',
    eighthMileMPH: run.eighthMileMPH?.toString() || '',
    thousandFt: run.thousandFt?.toString() || '',
    quarterMileET: run.quarterMileET?.toString() || '',
    quarterMileMPH: run.quarterMileMPH?.toString() || '',
    dialIn: run.dialIn?.toString() || '',
    notes: run.notes || '',
    // Opponent data
    opponentName: run.opponent?.name || '',
    opponentDialIn: run.opponent?.dialIn?.toString() || '',
    opponentRT: run.opponent?.reactionTime?.toString() || '',
    opponentET: run.opponent?.et?.toString() || '',
    opponentMPH: run.opponent?.mph?.toString() || '',
  });

  // Calculate MOV when opponent data is available
  const movResult = useMemo(() => {
    const myDialIn = parseFloat(formData.dialIn);
    const myRT = parseFloat(formData.reactionTime);
    const myET = run.raceLength === 'QUARTER' 
      ? parseFloat(formData.quarterMileET) 
      : parseFloat(formData.eighthMileET);
    const oppDialIn = parseFloat(formData.opponentDialIn);
    const oppRT = parseFloat(formData.opponentRT);
    const oppET = parseFloat(formData.opponentET);

    if (myDialIn && myRT && myET && oppDialIn && oppRT && oppET) {
      return calculateMOV(
        { dialIn: myDialIn, reactionTime: myRT, et: myET },
        { dialIn: oppDialIn, reactionTime: oppRT, et: oppET }
      );
    }
    return null;
  }, [formData, run.raceLength]);

  // Calculate run completion for brake runs
  // Uses VB6 physics model matching when predicted timeslip is available
  const completionResult = useMemo(() => {
    const actualET = run.raceLength === 'QUARTER' 
      ? parseFloat(formData.quarterMileET) 
      : parseFloat(formData.eighthMileET);
    
    // Extract predicted timeslip from run's increments array (from simulation)
    // Standard VB6 checkpoints: 60ft, 330ft, 660ft (1/8), 1000ft, 1320ft (1/4)
    const predictedTimeslip = run.increments ? {
      sixtyFt: run.increments.find(i => i.d_ft === 60)?.t_s,
      threeThirtyFt: run.increments.find(i => i.d_ft === 330)?.t_s,
      eighthMileET: run.increments.find(i => i.d_ft === 660)?.t_s,
      eighthMileMPH: run.increments.find(i => i.d_ft === 660)?.v_mph,
      thousandFt: run.increments.find(i => i.d_ft === 1000)?.t_s,
      quarterMileET: run.increments.find(i => i.d_ft === 1320)?.t_s,
      quarterMileMPH: run.increments.find(i => i.d_ft === 1320)?.v_mph,
    } : undefined;
    
    return calculateRunCompletion(
      {
        sixtyFt: parseFloat(formData.sixtyFt) || undefined,
        threeThirtyFt: parseFloat(formData.threeThirtyFt) || undefined,
        eighthMileET: parseFloat(formData.eighthMileET) || undefined,
        eighthMileMPH: parseFloat(formData.eighthMileMPH) || undefined,
        thousandFt: parseFloat(formData.thousandFt) || undefined,
        quarterMileET: parseFloat(formData.quarterMileET) || undefined,
        quarterMileMPH: parseFloat(formData.quarterMileMPH) || undefined,
      },
      actualET,
      undefined,
      run.raceLength as 'QUARTER' | 'EIGHTH',
      predictedTimeslip  // Pass predicted timeslip for simulation matching
    );
  }, [formData, run.raceLength, run.increments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedRun: RunRecordV1 = {
      ...run,
      reactionTime: parseFloat(formData.reactionTime) || undefined,
      sixtyFt: parseFloat(formData.sixtyFt) || undefined,
      threeThirtyFt: parseFloat(formData.threeThirtyFt) || undefined,
      eighthMileET: parseFloat(formData.eighthMileET) || undefined,
      eighthMileMPH: parseFloat(formData.eighthMileMPH) || undefined,
      thousandFt: parseFloat(formData.thousandFt) || undefined,
      quarterMileET: parseFloat(formData.quarterMileET) || undefined,
      quarterMileMPH: parseFloat(formData.quarterMileMPH) || undefined,
      dialIn: parseFloat(formData.dialIn) || undefined,
      notes: formData.notes || undefined,
      outcome: {
        slipET_s: run.raceLength === 'QUARTER' 
          ? parseFloat(formData.quarterMileET) || undefined 
          : parseFloat(formData.eighthMileET) || undefined,
        slipMPH: run.raceLength === 'QUARTER'
          ? parseFloat(formData.quarterMileMPH) || undefined
          : parseFloat(formData.eighthMileMPH) || undefined,
      },
      // Opponent data
      opponent: formData.opponentName || formData.opponentDialIn ? {
        name: formData.opponentName || undefined,
        dialIn: parseFloat(formData.opponentDialIn) || undefined,
        reactionTime: parseFloat(formData.opponentRT) || undefined,
        et: parseFloat(formData.opponentET) || undefined,
        mph: parseFloat(formData.opponentMPH) || undefined,
      } : undefined,
      // MOV calculation
      marginOfVictory: movResult ? {
        winner: movResult.winner === 'racer1' ? 'you' : 'opponent',
        marginSeconds: movResult.marginSeconds,
        marginFeet: movResult.marginFeet,
        marginInches: movResult.marginInches,
        breakout: movResult.racer1Breakout || movResult.racer2Breakout,
      } : undefined,
      // Run completion
      runCompletion: completionResult ? {
        didBrake: completionResult.etLost > 0.05,
        brakePoint: completionResult.brakePoint,
        completedET: completionResult.completedET,
        completedMPH: completionResult.completedMPH,
      } : undefined,
    };
    onSave(updatedRun);
  };

  const inputStyle = {
    width: '100%',
    padding: '8px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontFamily: 'monospace',
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div className="card" style={{
        maxWidth: '600px',
        width: '95%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: 'var(--space-4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ margin: 0 }}>Edit Run - {vehicleName}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text)' }}>×</button>
        </div>
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
          {(['timing', 'opponent', 'completion'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: activeTab === tab ? 'var(--color-surface)' : 'transparent',
                borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--color-text)' : 'var(--color-text-muted)',
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {tab === 'timing' ? 'Timing' : tab === 'opponent' ? 'Opponent & MOV' : 'Run Completion'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Timing Tab */}
          {activeTab === 'timing' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Dial-In</label>
                  <input type="number" step="0.001" value={formData.dialIn} onChange={(e) => setFormData(f => ({ ...f, dialIn: e.target.value }))} style={inputStyle} placeholder="0.000" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>RT</label>
                  <input type="number" step="0.001" value={formData.reactionTime} onChange={(e) => setFormData(f => ({ ...f, reactionTime: e.target.value }))} style={inputStyle} placeholder="0.000" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>60'</label>
                  <input type="number" step="0.001" value={formData.sixtyFt} onChange={(e) => setFormData(f => ({ ...f, sixtyFt: e.target.value }))} style={inputStyle} placeholder="0.000" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>330'</label>
                  <input type="number" step="0.001" value={formData.threeThirtyFt} onChange={(e) => setFormData(f => ({ ...f, threeThirtyFt: e.target.value }))} style={inputStyle} placeholder="0.000" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>1/8 ET</label>
                  <input type="number" step="0.001" value={formData.eighthMileET} onChange={(e) => setFormData(f => ({ ...f, eighthMileET: e.target.value }))} style={inputStyle} placeholder="0.000" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>1/8 MPH</label>
                  <input type="number" step="0.01" value={formData.eighthMileMPH} onChange={(e) => setFormData(f => ({ ...f, eighthMileMPH: e.target.value }))} style={inputStyle} placeholder="0.00" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>1000'</label>
                  <input type="number" step="0.001" value={formData.thousandFt} onChange={(e) => setFormData(f => ({ ...f, thousandFt: e.target.value }))} style={inputStyle} placeholder="0.000" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>1/4 ET</label>
                  <input type="number" step="0.001" value={formData.quarterMileET} onChange={(e) => setFormData(f => ({ ...f, quarterMileET: e.target.value }))} style={inputStyle} placeholder="0.000" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>1/4 MPH</label>
                  <input type="number" step="0.01" value={formData.quarterMileMPH} onChange={(e) => setFormData(f => ({ ...f, quarterMileMPH: e.target.value }))} style={inputStyle} placeholder="0.00" />
                </div>
              </div>
              
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                  style={{ ...inputStyle, minHeight: '60px', fontFamily: 'inherit' }}
                  placeholder="Run notes..."
                />
              </div>
            </>
          )}

          {/* Opponent & MOV Tab */}
          {activeTab === 'opponent' && (
            <>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-3)', color: 'var(--color-text-muted)' }}>Opponent Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                  <div style={{ gridColumn: 'span 3' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Opponent Name/Number</label>
                    <input type="text" value={formData.opponentName} onChange={(e) => setFormData(f => ({ ...f, opponentName: e.target.value }))} style={{...inputStyle, fontFamily: 'inherit'}} placeholder="Car #123 / Driver Name" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Dial-In</label>
                    <input type="number" step="0.001" value={formData.opponentDialIn} onChange={(e) => setFormData(f => ({ ...f, opponentDialIn: e.target.value }))} style={inputStyle} placeholder="0.000" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>RT</label>
                    <input type="number" step="0.001" value={formData.opponentRT} onChange={(e) => setFormData(f => ({ ...f, opponentRT: e.target.value }))} style={inputStyle} placeholder="0.000" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>ET</label>
                    <input type="number" step="0.001" value={formData.opponentET} onChange={(e) => setFormData(f => ({ ...f, opponentET: e.target.value }))} style={inputStyle} placeholder="0.000" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>MPH</label>
                    <input type="number" step="0.01" value={formData.opponentMPH} onChange={(e) => setFormData(f => ({ ...f, opponentMPH: e.target.value }))} style={inputStyle} placeholder="0.00" />
                  </div>
                </div>
              </div>

              {/* MOV Display */}
              {movResult && (
                <div style={{ 
                  padding: 'var(--space-4)', 
                  borderRadius: 'var(--radius-md)', 
                  backgroundColor: movResult.winner === 'racer1' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${movResult.winner === 'racer1' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  marginBottom: 'var(--space-4)',
                }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-2)', color: movResult.winner === 'racer1' ? '#22c55e' : '#ef4444' }}>
                    {movResult.winner === 'racer1' ? '🏆 WIN' : '❌ LOSS'}
                  </h4>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', marginBottom: 'var(--space-2)' }}>
                    {formatMOV(movResult)}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {describeRaceOutcome(movResult, 'You', formData.opponentName || 'Opponent')}
                  </div>
                  {(movResult.racer1Breakout || movResult.racer2Breakout) && (
                    <div style={{ marginTop: 'var(--space-2)', fontSize: '0.8rem', color: '#f59e0b' }}>
                      ⚠️ {movResult.racer1Breakout && 'You broke out! '}{movResult.racer2Breakout && 'Opponent broke out!'}
                    </div>
                  )}
                </div>
              )}

              {!movResult && formData.opponentDialIn && (
                <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-4)' }}>
                  Enter your dial-in, RT, ET and opponent's dial-in, RT, ET to calculate Margin of Victory
                </div>
              )}
            </>
          )}

          {/* Run Completion Tab */}
          {activeTab === 'completion' && (
            <>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-3)', color: 'var(--color-text-muted)' }}>Run Completion Analysis</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
                  Calculates what your ET would have been if you hadn't braked or lifted.
                </p>
                
                {completionResult ? (
                  <div style={{ 
                    padding: 'var(--space-4)', 
                    borderRadius: 'var(--radius-md)', 
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Completed ET</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                          {completionResult.completedET.toFixed(3)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Completed MPH</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace' }}>
                          {completionResult.completedMPH.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Brake Point</div>
                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                          ~{completionResult.brakePoint} ft
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Confidence</div>
                        <div style={{ 
                          fontSize: '0.85rem', 
                          fontWeight: 600,
                          color: completionResult.confidence === 'high' ? '#22c55e' : completionResult.confidence === 'medium' ? '#f59e0b' : '#ef4444',
                        }}>
                          {completionResult.confidence.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Show calculation method and fit factor */}
                    <div style={{ 
                      marginTop: 'var(--space-2)', 
                      padding: 'var(--space-2)', 
                      backgroundColor: completionResult.method === 'simulation' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(100, 100, 100, 0.1)', 
                      borderRadius: 'var(--radius-sm)', 
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                    }}>
                      {completionResult.method === 'simulation' ? (
                        <>
                          ✓ <strong>Physics Model Match:</strong> Using VB6 simulation data
                          {completionResult.matchedIncremental && (
                            <span> • Matched at {completionResult.matchedIncremental}</span>
                          )}
                          {completionResult.fitFactor && (
                            <span> • Fit: {((completionResult.fitFactor - 1) * 100).toFixed(1)}% {completionResult.fitFactor > 1 ? 'slower' : 'faster'}</span>
                          )}
                        </>
                      ) : (
                        <>⚠ Using ratio estimation (no simulation data available)</>
                      )}
                    </div>
                    
                    {completionResult.etLost > 0.05 && (
                      <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2)', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                        ⚡ <strong>Brake run detected:</strong> ~{completionResult.etLost.toFixed(3)}s lost from braking
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => {
                        if (run.raceLength === 'QUARTER') {
                          setFormData(f => ({ ...f, quarterMileET: completionResult.completedET.toString(), quarterMileMPH: completionResult.completedMPH.toString() }));
                        } else {
                          setFormData(f => ({ ...f, eighthMileET: completionResult.completedET.toString(), eighthMileMPH: completionResult.completedMPH.toString() }));
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ marginTop: 'var(--space-3)', width: '100%' }}
                    >
                      Use Completed ET for Predictions
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    Enter incremental times (60', 330', 1/8, 1000') in the Timing tab to calculate run completion
                  </div>
                )}
              </div>
            </>
          )}
          
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

type ViewMode = 'table' | 'logbook';

function History() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<RunRecordV1[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<RunRecordV1[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterRaceLength, setFilterRaceLength] = useState<RaceLength | 'ALL'>('ALL');
  const [showReportCard, setShowReportCard] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [editingRun, setEditingRun] = useState<RunRecordV1 | null>(null);
  const [similarRunsTarget, setSimilarRunsTarget] = useState<RunRecordV1 | null>(null);
  const [showSplitAnalysis, setShowSplitAnalysis] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  // Saved prediction scenarios are hidden from the logbook by default.
  const [showPredictions, setShowPredictions] = useState(false);

  // Pre-populate search from URL ?search= param (e.g. links from Log Run opponent section)
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const s = params.get('search');
    if (s) setSearchText(s);
  }, [location.search]);

  const loadRuns = async () => {
    setLoading(true);
    try {
      // Flush any offline-queued runs before loading the latest from the server.
      await syncPendingRuns();
      const loadedRuns = await storage.loadRuns();
      // Sort by createdAt descending (newest first)
      const sorted = loadedRuns.sort((a, b) => b.createdAt - a.createdAt);
      setRuns(sorted);
      setFilteredRuns(sorted);
    } catch (error) {
      console.error('Failed to load runs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
    // Load vehicles for name lookup
    loadVehicles().then(setVehicles).catch(console.error);
  }, []);

  // Create vehicle name lookup map
  const vehicleNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    vehicles.forEach(v => { map[v.id] = v.name; });
    return map;
  }, [vehicles]);

  const getVehicleName = useCallback((vehicleId: string) => {
    return vehicleNameMap[vehicleId] || 'Unknown Vehicle';
  }, [vehicleNameMap]);

  useEffect(() => {
    let filtered = runs;

    // Exclude saved prediction scenarios unless the user opts in.
    if (!showPredictions) {
      filtered = filtered.filter((run) => (run.runKind ?? 'logged') !== 'prediction');
    }

    // Filter by race length
    if (filterRaceLength !== 'ALL') {
      filtered = filtered.filter((run) => run.raceLength === filterRaceLength);
    }

    // Filter by search text (vehicle name, notes, opponent name/car number)
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (run) =>
          (vehicleNameMap[run.vehicleId] || '').toLowerCase().includes(search) ||
          run.vehicleId.toLowerCase().includes(search) ||
          (run.notes && run.notes.toLowerCase().includes(search)) ||
          (run.opponent?.name && run.opponent.name.toLowerCase().includes(search)) ||
          (run.opponent?.carNumber && run.opponent.carNumber.toLowerCase().includes(search))
      );
    }

    setFilteredRuns(filtered);
  }, [runs, filterRaceLength, searchText, showPredictions, vehicleNameMap]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this run?')) {
      return;
    }

    try {
      await storage.deleteRun(id);
      await loadRuns();
    } catch (error) {
      console.error('Failed to delete run:', error);
      alert('Failed to delete run');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const hasDataExport = hasFeature(CURRENT_TIER, 'dataExport');

  // Get unique vehicle IDs for report card selection
  const vehicleIds = useMemo(() => {
    const ids = new Set(runs.map(r => r.vehicleId));
    return Array.from(ids);
  }, [runs]);

  // Prepare runs for report card (only runs with both prediction and actual data)
  const reportCardRuns = useMemo(() => {
    if (!selectedVehicleId) return [];
    
    return runs
      .filter(r => r.vehicleId === selectedVehicleId)
      .filter(r => r.prediction?.et_s && r.prediction?.mph)
      .filter(r => {
        // Check for actual ET - could be in outcome.slipET_s or quarterMileET/eighthMileET
        const actualET = r.outcome?.slipET_s ?? 
          (r.raceLength === 'QUARTER' ? r.quarterMileET : r.eighthMileET);
        const actualMPH = r.outcome?.slipMPH ?? 
          (r.raceLength === 'QUARTER' ? r.quarterMileMPH : r.eighthMileMPH);
        return actualET !== undefined && actualMPH !== undefined;
      })
      .map(r => {
        const actualET = r.outcome?.slipET_s ?? 
          (r.raceLength === 'QUARTER' ? r.quarterMileET : r.eighthMileET) ?? 0;
        const actualMPH = r.outcome?.slipMPH ?? 
          (r.raceLength === 'QUARTER' ? r.quarterMileMPH : r.eighthMileMPH) ?? 0;
        
        return {
          date: new Date(r.createdAt).toLocaleDateString(),
          predictedET: r.prediction!.et_s,
          actualET,
          predictedMPH: r.prediction!.mph,
          actualMPH,
          weather: r.env ? {
            tempF: r.env.temperatureF ?? 70,
            humidity: r.env.humidityPct ?? 50,
            da: 0, // Could calculate DA if needed
          } : undefined,
        };
      });
  }, [runs, selectedVehicleId]);

  const handleShowReportCard = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setShowReportCard(true);
  };

  // Calculate similar runs by density altitude
  const similarRuns = useMemo(() => {
    if (!similarRunsTarget?.env) return [];
    
    const targetDA = calculateDensityAltitude(
      similarRunsTarget.env.temperatureF ?? 70,
      similarRunsTarget.env.barometerInHg ?? 29.92,
      similarRunsTarget.env.humidityPct ?? 50,
      similarRunsTarget.env.elevation ?? 0
    );
    
    return runs
      .filter(r => (r.runKind ?? 'logged') !== 'prediction')
      .filter(r => r.id !== similarRunsTarget.id && r.vehicleId === similarRunsTarget.vehicleId && r.env)
      .map(r => {
        const da = calculateDensityAltitude(
          r.env!.temperatureF ?? 70,
          r.env!.barometerInHg ?? 29.92,
          r.env!.humidityPct ?? 50,
          r.env!.elevation ?? 0
        );
        return { run: r, da, diff: Math.abs(da - targetDA) };
      })
      .filter(r => r.diff <= 500) // Within 500ft DA
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 10);
  }, [similarRunsTarget, runs]);

  // Get split intervals for a run
  const getSplitIntervals = useCallback((run: RunRecordV1) => {
    return calculateSplitIntervals({
      sixtyFt: run.sixtyFt,
      threeThirtyFt: run.threeThirtyFt,
      eighthMileET: run.eighthMileET,
      eighthMileMPH: run.eighthMileMPH,
      thousandFt: run.thousandFt,
      quarterMileET: run.quarterMileET,
      quarterMileMPH: run.quarterMileMPH,
    });
  }, []);

  const handleExportFiltered = () => {
    if (!hasDataExport) {
      alert('Data export requires NITRO tier. Upgrade to unlock this feature.');
      return;
    }

    try {
      // Convert filtered runs to CSV
      const csvData = runsToCsv(filteredRuns);
      
      // Download as file
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      downloadCsv(csvData, `rsa_runs_filtered_${timestamp}.csv`);
      
      alert(`✓ Exported ${filteredRuns.length} filtered run${filteredRuns.length !== 1 ? 's' : ''} to CSV`);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const handleExportAll = () => {
    if (!hasDataExport) {
      alert('Data export requires NITRO tier. Upgrade to unlock this feature.');
      return;
    }

    try {
      // Convert all runs to CSV
      const csvData = runsToCsv(runs);
      
      // Download as file
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      downloadCsv(csvData, `rsa_runs_all_${timestamp}.csv`);
      
      alert(`✓ Exported ${runs.length} run${runs.length !== 1 ? 's' : ''} to CSV`);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  return (
    <Page
      title="Run History"
      actions={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Link to="/log" className="btn btn-primary" style={{ fontWeight: 'bold' }}>
              + Full Log
            </Link>
            <button
              onClick={handleExportFiltered}
              className="btn btn-secondary"
              disabled={!hasDataExport}
              title={!hasDataExport ? 'Requires NITRO tier' : 'Export filtered runs to CSV'}
            >
              Export Filtered ({filteredRuns.length})
            </button>
            <button
              onClick={handleExportAll}
              className="btn btn-secondary"
              disabled={!hasDataExport}
              title={!hasDataExport ? 'Requires NITRO tier' : 'Export all runs to CSV'}
            >
              Export All ({runs.length})
            </button>
            {vehicleIds.length > 0 && (
              <select
                className="btn btn-secondary"
                style={{ cursor: 'pointer' }}
                value=""
                onChange={(e) => e.target.value && handleShowReportCard(e.target.value)}
              >
                <option value="">📊 Report Card...</option>
                {vehicleIds.map(id => (
                  <option key={id} value={id}>{getVehicleName(id)}</option>
                ))}
              </select>
            )}
          </div>
          {!hasDataExport && (
            <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>
              💎 CSV export requires NITRO tier
            </div>
          )}
        </div>
      }
    >
      <div className="mb-6">
        <div className="grid grid-2 gap-4">
          <div>
            <label className="label" htmlFor="search">
              Search (vehicle, notes, opponent)
            </label>
            <input
              id="search"
              type="text"
              className="input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search..."
            />
          </div>
          <div>
            <label className="label" htmlFor="filter">
              Filter by Race Length
            </label>
            <select
              id="filter"
              className="input"
              value={filterRaceLength}
              onChange={(e) => setFilterRaceLength(e.target.value as RaceLength | 'ALL')}
              style={{ cursor: 'pointer' }}
            >
              <option value="ALL">All</option>
              <option value="EIGHTH">1/8 Mile</option>
              <option value="QUARTER">1/4 Mile</option>
            </select>
          </div>
          <div>
            <label className="label">View Mode</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className={`btn btn-small ${viewMode === 'table' ? '' : 'btn-secondary'}`}
                onClick={() => setViewMode('table')}
                title="Table view"
              >
                Table
              </button>
              <button
                className={`btn btn-small ${viewMode === 'logbook' ? '' : 'btn-secondary'}`}
                onClick={() => setViewMode('logbook')}
                title="Event Logbook (spreadsheet)"
              >
                Logbook
              </button>
            </div>
          </div>
          <div>
            <label className="label">Predictions</label>
            <label className="radio-label" style={{ marginTop: '0.5rem' }}>
              <input
                type="checkbox"
                checked={showPredictions}
                onChange={(e) => setShowPredictions(e.target.checked)}
              />
              <span>Show saved predictions</span>
            </label>
          </div>
          {/* Print Button */}
          <button
            className="btn btn-small btn-secondary"
            onClick={() => window.print()}
            title="Print current view"
            style={{ marginLeft: '8px' }}
          >
            🖨️ Print
          </button>
        </div>
      </div>
      
      {/* Print Styles */}
      <style>{`
        @media print {
          /* Hide non-essential elements */
          nav, header, footer, .btn, select, input, 
          .mobile-menu-btn, .mobile-nav { display: none !important; }
          
          /* Reset background colors for printing */
          body, .card, * { 
            background: white !important; 
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Show logbook view nicely */
          .logbook-print-area {
            width: 100% !important;
            overflow: visible !important;
          }
          
          /* Page setup */
          @page {
            size: landscape;
            margin: 0.5in;
          }
          
          /* Make monospace font darker */
          [style*="monospace"] {
            font-weight: bold !important;
          }
        }
      `}</style>

      {loading ? (
        <div className="text-center text-muted" style={{ padding: 'var(--space-6)' }}>
          Loading runs...
        </div>
      ) : filteredRuns.length === 0 ? (
        <div className="card text-center">
          <p className="text-muted" style={{ margin: 0 }}>
            {runs.length === 0
              ? 'No runs logged yet. Click "Log New Run" to get started.'
              : 'No runs match your filters.'}
          </p>
        </div>
      ) : viewMode === 'logbook' ? (
        /* Event Logbook Spreadsheet View */
        <div className="card" style={{ padding: '16px', overflowX: 'auto' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px', color: 'var(--color-accent)' }}>
            Event Logbook - {filteredRuns.length} Runs
          </div>
          <div style={{ display: 'flex', gap: '2px', overflowX: 'auto' }}>
            {/* Row Labels Column */}
            <div style={{ minWidth: '120px', flexShrink: 0, fontSize: '0.7rem' }}>
              <div style={{ height: '28px', display: 'flex', alignItems: 'center', fontWeight: 600, borderBottom: '1px solid var(--color-border)' }}>Field</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface)' }}>Date</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center' }}>Time</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface)' }}>Vehicle</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center', fontWeight: 600, marginTop: '4px', borderTop: '1px solid var(--color-border)' }}>Timing</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface)' }}>R/T</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center' }}>60 ft</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface)' }}>330 ft</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center' }}>1/8 ET</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface)' }}>1/8 MPH</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center' }}>1000 ft</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface)' }}>1/4 ET</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center' }}>1/4 MPH</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center', fontWeight: 600, marginTop: '4px', borderTop: '1px solid var(--color-border)' }}>Weather</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface)' }}>Temp °F</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center' }}>Humid %</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface)' }}>Baro</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center' }}>DA</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center', fontWeight: 600, marginTop: '4px', borderTop: '1px solid var(--color-border)' }}>Splits</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface)' }}>60-330</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center' }}>330-660</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface)' }}>660-1000</div>
              <div style={{ height: '24px', display: 'flex', alignItems: 'center' }}>1000-1320</div>
            </div>
            
            {/* Run Columns */}
            {filteredRuns.slice(0, 10).map((run, idx) => {
              const splits = getSplitIntervals(run);
              const da = run.env ? calculateDensityAltitude(
                run.env.temperatureF ?? 70,
                run.env.barometerInHg ?? 29.92,
                run.env.humidityPct ?? 50,
                run.env.elevation ?? 0
              ) : null;
              
              return (
                <div key={run.id} style={{ 
                  minWidth: '90px', 
                  flexShrink: 0, 
                  fontSize: '0.7rem',
                  borderLeft: '1px solid var(--color-border)',
                  textAlign: 'center',
                }}>
                  <div style={{ height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, borderBottom: '1px solid var(--color-border)', backgroundColor: idx % 2 === 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)' }}>Run {idx + 1}</div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)' }}>{new Date(run.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{new Date(run.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getVehicleName(run.vehicleId).substring(0, 10)}</div>
                  <div style={{ height: '24px', marginTop: '4px', borderTop: '1px solid var(--color-border)' }}></div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)', fontFamily: 'monospace' }}>{run.reactionTime?.toFixed(3) || '—'}</div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>{run.sixtyFt?.toFixed(3) || '—'}</div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)', fontFamily: 'monospace' }}>{run.threeThirtyFt?.toFixed(3) || '—'}</div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>{run.eighthMileET?.toFixed(3) || '—'}</div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)', fontFamily: 'monospace' }}>{run.eighthMileMPH?.toFixed(2) || '—'}</div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>{run.thousandFt?.toFixed(3) || '—'}</div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)', fontFamily: 'monospace', fontWeight: 600, color: '#10b981' }}>{run.quarterMileET?.toFixed(3) || run.outcome?.slipET_s?.toFixed(3) || '—'}</div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>{run.quarterMileMPH?.toFixed(2) || run.outcome?.slipMPH?.toFixed(2) || '—'}</div>
                  <div style={{ height: '24px', marginTop: '4px', borderTop: '1px solid var(--color-border)' }}></div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)' }}>{run.env?.temperatureF?.toFixed(0) || '—'}</div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{run.env?.humidityPct?.toFixed(0) || '—'}</div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)' }}>{run.env?.barometerInHg?.toFixed(2) || '—'}</div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{da?.toFixed(0) || '—'}</div>
                  <div style={{ height: '24px', marginTop: '4px', borderTop: '1px solid var(--color-border)' }}></div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)', fontFamily: 'monospace' }}>{splits.sixtyToThreeThirty?.toFixed(3) || '—'}</div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>{splits.threeThirtyToEighth?.toFixed(3) || '—'}</div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)', fontFamily: 'monospace' }}>{splits.eighthToThousand?.toFixed(3) || '—'}</div>
                  <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>{splits.thousandToQuarter?.toFixed(3) || '—'}</div>
                </div>
              );
            })}
          </div>
          {filteredRuns.length > 10 && (
            <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
              Showing 10 of {filteredRuns.length} runs. Use filters to narrow results.
            </div>
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Race Length</th>
                <th className="align-right">Pred ET</th>
                <th className="align-right">Pred MPH</th>
                <th className="align-right">Actual ET</th>
                <th className="align-right">Actual MPH</th>
                <th className="align-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => (
                <React.Fragment key={run.id}>
                  <tr>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(run.createdAt)}
                    </td>
                    <td>{getVehicleName(run.vehicleId)}</td>
                    <td>{run.raceLength === 'EIGHTH' ? '1/8 Mile' : '1/4 Mile'}</td>
                    <td className="align-right mono">
                      {run.prediction?.et_s?.toFixed(3) || '—'}
                    </td>
                    <td className="align-right mono">
                      {run.prediction?.mph?.toFixed(2) || '—'}
                    </td>
                    <td className="align-right mono">
                      {run.outcome?.slipET_s?.toFixed(3) || '—'}
                    </td>
                    <td className="align-right mono">
                      {run.outcome?.slipMPH?.toFixed(2) || '—'}
                    </td>
                    <td className="align-right">
                      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {run.sixtyFt && (
                          <button
                            onClick={() => setShowSplitAnalysis(showSplitAnalysis === run.id ? null : run.id)}
                            className="btn btn-secondary"
                            style={{
                              padding: 'var(--space-1) var(--space-2)',
                              fontSize: '0.75rem',
                              backgroundColor: showSplitAnalysis === run.id ? 'var(--color-primary)' : undefined,
                              color: showSplitAnalysis === run.id ? 'white' : undefined,
                            }}
                            title="Show split time intervals"
                          >
                            Splits
                          </button>
                        )}
                        {run.env && (
                          <button
                            onClick={() => setSimilarRunsTarget(similarRunsTarget?.id === run.id ? null : run)}
                            className="btn btn-secondary"
                            style={{
                              padding: 'var(--space-1) var(--space-2)',
                              fontSize: '0.75rem',
                              backgroundColor: similarRunsTarget?.id === run.id ? 'var(--color-primary)' : undefined,
                              color: similarRunsTarget?.id === run.id ? 'white' : undefined,
                            }}
                            title="Find similar runs by density altitude"
                          >
                            Similar
                          </button>
                        )}
                        <button
                          onClick={() => navigate('/predict-weather', { state: { baselineRunId: run.id } })}
                          className="btn btn-secondary"
                          style={{
                            padding: 'var(--space-1) var(--space-2)',
                            fontSize: '0.75rem',
                          }}
                          title="Predict ET for upcoming weather using this run as the baseline"
                        >
                          Predict
                        </button>
                        <button
                          onClick={() => setEditingRun(run)}
                          className="btn btn-secondary"
                          style={{
                            padding: 'var(--space-1) var(--space-2)',
                            fontSize: '0.75rem',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(run.id)}
                          className="btn btn-secondary"
                          style={{
                            padding: 'var(--space-1) var(--space-2)',
                            fontSize: '0.75rem',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Split Analysis Row */}
                  {showSplitAnalysis === run.id && (
                    <tr>
                      <td colSpan={8} style={{ backgroundColor: 'var(--color-surface)', padding: 'var(--space-3)' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Split Time Intervals</div>
                        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                          {(() => {
                            const splits = getSplitIntervals(run);
                            return (
                              <>
                                {splits.zeroToSixty !== undefined && (
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>0-60'</div>
                                    <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{splits.zeroToSixty.toFixed(3)}s</div>
                                  </div>
                                )}
                                {splits.sixtyToThreeThirty !== undefined && (
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>60'-330'</div>
                                    <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{splits.sixtyToThreeThirty.toFixed(3)}s</div>
                                  </div>
                                )}
                                {splits.threeThirtyToEighth !== undefined && (
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>330'-1/8</div>
                                    <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{splits.threeThirtyToEighth.toFixed(3)}s</div>
                                  </div>
                                )}
                                {splits.eighthToThousand !== undefined && (
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>1/8-1000'</div>
                                    <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{splits.eighthToThousand.toFixed(3)}s</div>
                                  </div>
                                )}
                                {splits.thousandToQuarter !== undefined && (
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>1000'-1/4</div>
                                    <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{splits.thousandToQuarter.toFixed(3)}s</div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredRuns.length > 0 && (
        <div className="mt-4 text-muted text-center" style={{ fontSize: '0.875rem' }}>
          Showing {filteredRuns.length} of {runs.length} run{runs.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Similar Runs Panel */}
      {similarRunsTarget && similarRuns.length > 0 && (
        <div className="card mt-4" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>
              Similar Runs (within 500ft Density Altitude)
            </h3>
            <button
              onClick={() => setSimilarRunsTarget(null)}
              style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--color-text)' }}
            >
              ×
            </button>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
            Target run DA: {calculateDensityAltitude(
              similarRunsTarget.env?.temperatureF ?? 70,
              similarRunsTarget.env?.barometerInHg ?? 29.92,
              similarRunsTarget.env?.humidityPct ?? 50,
              similarRunsTarget.env?.elevation ?? 0
            ).toFixed(0)} ft
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {similarRuns.map(({ run, da, diff }) => (
              <div key={run.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: 'var(--space-2) var(--space-3)',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{new Date(run.createdAt).toLocaleDateString()}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    DA: {da.toFixed(0)} ft ({diff > 0 ? '+' : ''}{diff.toFixed(0)} ft)
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {run.outcome?.slipET_s?.toFixed(3) || run.quarterMileET?.toFixed(3) || run.eighthMileET?.toFixed(3) || '—'}s
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {run.outcome?.slipMPH?.toFixed(2) || run.quarterMileMPH?.toFixed(2) || run.eighthMileMPH?.toFixed(2) || '—'} mph
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasDataExport && runs.length > 0 && (
        <div className="mt-6">
          <PeekCard
            title="Data Export"
            tier="NITRO"
            description="Export your runs and analysis to CSV, JSON, or PDF for external analysis and reporting."
            onLearnMore={() => alert('Upgrade to NITRO to unlock Data Export')}
          />
        </div>
      )}

      {/* Quick Run Entry Modal */}
      <QuickRunEntry
        isOpen={showQuickEntry}
        onClose={() => setShowQuickEntry(false)}
        onSaved={() => loadRuns()}
      />

      {/* Prediction Report Card Modal */}
      {showReportCard && selectedVehicleId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            maxWidth: '600px',
            width: '95%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <PredictionReportCard
              vehicleName={getVehicleName(selectedVehicleId)}
              runs={reportCardRuns}
              onClose={() => {
                setShowReportCard(false);
                setSelectedVehicleId(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Edit Run Modal */}
      {editingRun && (
        <EditRunModal
          run={editingRun}
          vehicleName={getVehicleName(editingRun.vehicleId)}
          onClose={() => setEditingRun(null)}
          onSave={async (updatedRun) => {
            try {
              await storage.saveRun(updatedRun);
              await loadRuns();
              setEditingRun(null);
            } catch (err) {
              console.error('Failed to save run:', err);
              alert('Failed to save run');
            }
          }}
        />
      )}
    </Page>
  );
}

export default History;
