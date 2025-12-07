import { useState, useEffect, useMemo } from 'react';
import Page from '../shared/components/Page';

// Types
interface OpponentRun {
  id: string;
  date: string;
  round?: string;
  lane?: 'left' | 'right';
  reactionTime?: number;
  et60?: number;
  et330?: number;
  et660?: number;
  etMph660?: number;
  et1000?: number;
  et1320?: number;
  mph1320?: number;
  dialIn?: number;
  result?: 'win' | 'loss' | 'breakout' | 'redlight' | 'dq';
  notes?: string;
  weather?: {
    tempF?: number;
    humidity?: number;
    altitude?: number;
    densityAltitude?: number;
  };
}

interface Opponent {
  id: string;
  name: string;
  car?: string;
  class?: string;
  number?: string;
  photo?: string;
  notes?: string;
  runs: OpponentRun[];
  createdAt: string;
  updatedAt: string;
}

interface OpponentStats {
  totalRuns: number;
  avgET: number;
  bestET: number;
  worstET: number;
  avgReaction: number;
  bestReaction: number;
  consistency: number; // standard deviation
  trend: 'improving' | 'declining' | 'stable';
  predictedNextET: number;
  confidenceLevel: number;
  headToHead: {
    wins: number;
    losses: number;
    winPct: number;
  };
}

// Storage helpers
const STORAGE_KEY = 'rsa_opponents';

function loadOpponents(): Opponent[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveOpponents(opponents: Opponent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(opponents));
}

// Statistics calculations
function calculateStats(opponent: Opponent): OpponentStats {
  const runs = opponent.runs.filter(r => r.et1320 != null);
  const ets = runs.map(r => r.et1320!).filter(et => et > 0);
  const reactions = runs.map(r => r.reactionTime).filter((r): r is number => r != null && r > 0);
  
  if (ets.length === 0) {
    return {
      totalRuns: opponent.runs.length,
      avgET: 0,
      bestET: 0,
      worstET: 0,
      avgReaction: 0,
      bestReaction: 0,
      consistency: 0,
      trend: 'stable',
      predictedNextET: 0,
      confidenceLevel: 0,
      headToHead: { wins: 0, losses: 0, winPct: 0 },
    };
  }
  
  const avgET = ets.reduce((a, b) => a + b, 0) / ets.length;
  const bestET = Math.min(...ets);
  const worstET = Math.max(...ets);
  
  // Standard deviation for consistency
  const variance = ets.reduce((sum, et) => sum + Math.pow(et - avgET, 2), 0) / ets.length;
  const consistency = Math.sqrt(variance);
  
  // Trend analysis (last 5 runs vs previous 5)
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (ets.length >= 6) {
    const recent = ets.slice(-5);
    const previous = ets.slice(-10, -5);
    if (previous.length >= 3) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
      const diff = recentAvg - prevAvg;
      if (diff < -0.05) trend = 'improving';
      else if (diff > 0.05) trend = 'declining';
    }
  }
  
  // Predict next ET using weighted moving average
  let predictedNextET = avgET;
  let confidenceLevel = 0;
  if (ets.length >= 3) {
    // Weight recent runs more heavily
    const weights = ets.slice(-5).map((_, i, arr) => (i + 1) / arr.length);
    const recentETs = ets.slice(-5);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    predictedNextET = recentETs.reduce((sum, et, i) => sum + et * weights[i], 0) / weightSum;
    
    // Confidence based on consistency and sample size
    confidenceLevel = Math.min(95, Math.max(30, 
      100 - (consistency * 50) - (10 / Math.sqrt(ets.length))
    ));
  }
  
  // Head to head record
  const wins = runs.filter(r => r.result === 'win').length;
  const losses = runs.filter(r => r.result === 'loss' || r.result === 'breakout' || r.result === 'redlight').length;
  const total = wins + losses;
  
  return {
    totalRuns: opponent.runs.length,
    avgET,
    bestET,
    worstET,
    avgReaction: reactions.length > 0 ? reactions.reduce((a, b) => a + b, 0) / reactions.length : 0,
    bestReaction: reactions.length > 0 ? Math.min(...reactions) : 0,
    consistency,
    trend,
    predictedNextET,
    confidenceLevel,
    headToHead: {
      wins,
      losses,
      winPct: total > 0 ? (wins / total) * 100 : 0,
    },
  };
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export default function Opponents() {
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<Opponent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [editingRun, setEditingRun] = useState<OpponentRun | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'runs' | 'avgET' | 'recent'>('recent');
  
  // Form state for new opponent
  const [newOpponent, setNewOpponent] = useState({
    name: '',
    car: '',
    class: '',
    number: '',
    notes: '',
  });
  
  // Form state for new run
  const [newRun, setNewRun] = useState<Partial<OpponentRun>>({
    date: new Date().toISOString().split('T')[0],
    round: '',
    lane: undefined,
    reactionTime: undefined,
    et60: undefined,
    et330: undefined,
    et660: undefined,
    etMph660: undefined,
    et1000: undefined,
    et1320: undefined,
    mph1320: undefined,
    dialIn: undefined,
    result: undefined,
    notes: '',
  });
  
  // Load opponents on mount
  useEffect(() => {
    setOpponents(loadOpponents());
  }, []);
  
  // Save opponents when changed
  useEffect(() => {
    if (opponents.length > 0) {
      saveOpponents(opponents);
    }
  }, [opponents]);
  
  // Filtered and sorted opponents
  const filteredOpponents = useMemo(() => {
    let filtered = opponents.filter(o => 
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.car?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.class?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Sort
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'runs':
        filtered.sort((a, b) => b.runs.length - a.runs.length);
        break;
      case 'avgET':
        filtered.sort((a, b) => {
          const statsA = calculateStats(a);
          const statsB = calculateStats(b);
          return (statsA.avgET || 999) - (statsB.avgET || 999);
        });
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
    }
    
    return filtered;
  }, [opponents, searchTerm, sortBy]);
  
  // Add new opponent
  const handleAddOpponent = () => {
    if (!newOpponent.name.trim()) return;
    
    const opponent: Opponent = {
      id: generateId(),
      name: newOpponent.name.trim(),
      car: newOpponent.car.trim() || undefined,
      class: newOpponent.class.trim() || undefined,
      number: newOpponent.number.trim() || undefined,
      notes: newOpponent.notes.trim() || undefined,
      runs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setOpponents([...opponents, opponent]);
    setNewOpponent({ name: '', car: '', class: '', number: '', notes: '' });
    setShowAddModal(false);
    setSelectedOpponent(opponent);
  };
  
  // Delete opponent
  const handleDeleteOpponent = (id: string) => {
    if (!confirm('Delete this opponent and all their runs?')) return;
    setOpponents(opponents.filter(o => o.id !== id));
    if (selectedOpponent?.id === id) setSelectedOpponent(null);
  };
  
  // Add/update run
  const handleSaveRun = () => {
    if (!selectedOpponent) return;
    
    const run: OpponentRun = {
      id: editingRun?.id || generateId(),
      date: newRun.date || new Date().toISOString().split('T')[0],
      round: newRun.round || undefined,
      lane: newRun.lane,
      reactionTime: newRun.reactionTime,
      et60: newRun.et60,
      et330: newRun.et330,
      et660: newRun.et660,
      etMph660: newRun.etMph660,
      et1000: newRun.et1000,
      et1320: newRun.et1320,
      mph1320: newRun.mph1320,
      dialIn: newRun.dialIn,
      result: newRun.result,
      notes: newRun.notes || undefined,
    };
    
    const updatedOpponent = {
      ...selectedOpponent,
      runs: editingRun 
        ? selectedOpponent.runs.map(r => r.id === editingRun.id ? run : r)
        : [...selectedOpponent.runs, run],
      updatedAt: new Date().toISOString(),
    };
    
    setOpponents(opponents.map(o => o.id === selectedOpponent.id ? updatedOpponent : o));
    setSelectedOpponent(updatedOpponent);
    setShowRunModal(false);
    setEditingRun(null);
    setNewRun({
      date: new Date().toISOString().split('T')[0],
      round: '',
      lane: undefined,
      reactionTime: undefined,
      et60: undefined,
      et330: undefined,
      et660: undefined,
      etMph660: undefined,
      et1000: undefined,
      et1320: undefined,
      mph1320: undefined,
      dialIn: undefined,
      result: undefined,
      notes: '',
    });
  };
  
  // Delete run
  const handleDeleteRun = (runId: string) => {
    if (!selectedOpponent || !confirm('Delete this run?')) return;
    
    const updatedOpponent = {
      ...selectedOpponent,
      runs: selectedOpponent.runs.filter(r => r.id !== runId),
      updatedAt: new Date().toISOString(),
    };
    
    setOpponents(opponents.map(o => o.id === selectedOpponent.id ? updatedOpponent : o));
    setSelectedOpponent(updatedOpponent);
  };
  
  // Edit run
  const handleEditRun = (run: OpponentRun) => {
    setEditingRun(run);
    setNewRun({ ...run });
    setShowRunModal(true);
  };
  
  // Selected opponent stats
  const selectedStats = selectedOpponent ? calculateStats(selectedOpponent) : null;
  
  return (
    <Page title="Opponent Tracker">
      <div style={{ display: 'flex', gap: 'var(--space-4)', height: 'calc(100vh - 120px)', padding: 'var(--space-4)' }}>
        {/* Left Panel - Opponent List */}
        <div className="card" style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <h2 style={{ fontSize: '1rem', margin: 0 }}>Opponents</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn"
                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
              >
                + Add
              </button>
            </div>
            <input
              type="text"
              placeholder="Search opponents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: '0.85rem',
              }}
            />
            <div style={{ display: 'flex', gap: '4px', marginTop: '8px', fontSize: '0.7rem' }}>
              {(['recent', 'name', 'runs', 'avgET'] as const).map(sort => (
                <button
                  key={sort}
                  onClick={() => setSortBy(sort)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: sortBy === sort ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: sortBy === sort ? 'white' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {sort === 'avgET' ? 'ET' : sort.charAt(0).toUpperCase() + sort.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredOpponents.length === 0 ? (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                {opponents.length === 0 ? 'No opponents yet. Add your first!' : 'No matches found'}
              </div>
            ) : (
              filteredOpponents.map(opponent => {
                const stats = calculateStats(opponent);
                return (
                  <div
                    key={opponent.id}
                    onClick={() => setSelectedOpponent(opponent)}
                    style={{
                      padding: 'var(--space-3)',
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      backgroundColor: selectedOpponent?.id === opponent.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      borderLeft: selectedOpponent?.id === opponent.id ? '3px solid var(--color-accent)' : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{opponent.name}</div>
                        {opponent.car && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{opponent.car}</div>
                        )}
                        {opponent.class && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-accent)' }}>{opponent.class}</div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.75rem' }}>
                        <div style={{ fontWeight: 600 }}>{stats.avgET > 0 ? stats.avgET.toFixed(3) : '—'}</div>
                        <div style={{ color: 'var(--color-text-muted)' }}>{opponent.runs.length} runs</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {/* Right Panel - Opponent Details */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: 0 }}>
          {selectedOpponent ? (
            <>
              {/* Header */}
              <div className="card" style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{selectedOpponent.name}</h1>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: '4px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {selectedOpponent.car && <span>{selectedOpponent.car}</span>}
                      {selectedOpponent.class && <span style={{ color: 'var(--color-accent)' }}>{selectedOpponent.class}</span>}
                      {selectedOpponent.number && <span>#{selectedOpponent.number}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => { setEditingRun(null); setShowRunModal(true); }}
                      className="btn"
                      style={{ padding: '8px 16px' }}
                    >
                      + Log Run
                    </button>
                    <button
                      onClick={() => handleDeleteOpponent(selectedOpponent.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid #ef4444',
                        backgroundColor: 'transparent',
                        color: '#ef4444',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Stats Cards */}
              {selectedStats && selectedStats.totalRuns > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
                  {/* Predicted ET */}
                  <div className="card" style={{ padding: 'var(--space-3)', textAlign: 'center', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Predicted Next ET</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                      {selectedStats.predictedNextET > 0 ? selectedStats.predictedNextET.toFixed(3) : '—'}
                    </div>
                    {selectedStats.confidenceLevel > 0 && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        {selectedStats.confidenceLevel.toFixed(0)}% confidence
                      </div>
                    )}
                  </div>
                  
                  {/* Average ET */}
                  <div className="card" style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Average ET</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                      {selectedStats.avgET > 0 ? selectedStats.avgET.toFixed(3) : '—'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      ±{selectedStats.consistency.toFixed(3)} consistency
                    </div>
                  </div>
                  
                  {/* Best/Worst */}
                  <div className="card" style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Best / Worst</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                      <span style={{ color: '#22c55e' }}>{selectedStats.bestET.toFixed(3)}</span>
                      {' / '}
                      <span style={{ color: '#ef4444' }}>{selectedStats.worstET.toFixed(3)}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      Range: {(selectedStats.worstET - selectedStats.bestET).toFixed(3)}
                    </div>
                  </div>
                  
                  {/* Reaction Time */}
                  <div className="card" style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Avg Reaction</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                      {selectedStats.avgReaction > 0 ? selectedStats.avgReaction.toFixed(3) : '—'}
                    </div>
                    {selectedStats.bestReaction > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#22c55e' }}>
                        Best: {selectedStats.bestReaction.toFixed(3)}
                      </div>
                    )}
                  </div>
                  
                  {/* Trend */}
                  <div className="card" style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Trend</div>
                    <div style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: 600,
                      color: selectedStats.trend === 'improving' ? '#22c55e' : 
                             selectedStats.trend === 'declining' ? '#ef4444' : 'var(--color-text)',
                    }}>
                      {selectedStats.trend === 'improving' ? '📈 Getting Faster' :
                       selectedStats.trend === 'declining' ? '📉 Slowing Down' : '➡️ Stable'}
                    </div>
                  </div>
                  
                  {/* Head to Head */}
                  <div className="card" style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Head-to-Head</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                      <span style={{ color: '#22c55e' }}>{selectedStats.headToHead.wins}W</span>
                      {' - '}
                      <span style={{ color: '#ef4444' }}>{selectedStats.headToHead.losses}L</span>
                    </div>
                    {(selectedStats.headToHead.wins + selectedStats.headToHead.losses) > 0 && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        {selectedStats.headToHead.winPct.toFixed(0)}% win rate
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Run History */}
              <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
                  Run History ({selectedOpponent.runs.length})
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {selectedOpponent.runs.length === 0 ? (
                    <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No runs logged yet. Click "Log Run" to add one.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Round</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>RT</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>60'</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>330'</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>1/8</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>1/4 ET</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>MPH</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Result</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...selectedOpponent.runs].reverse().map(run => (
                          <tr key={run.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '8px 12px' }}>{new Date(run.date).toLocaleDateString()}</td>
                            <td style={{ padding: '8px 12px' }}>{run.round || '—'}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                              {run.reactionTime?.toFixed(3) || '—'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                              {run.et60?.toFixed(3) || '—'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                              {run.et330?.toFixed(3) || '—'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                              {run.et660?.toFixed(3) || '—'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                              {run.et1320?.toFixed(3) || '—'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                              {run.mph1320?.toFixed(2) || '—'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {run.result && (
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  backgroundColor: run.result === 'win' ? 'rgba(34, 197, 94, 0.2)' :
                                                   run.result === 'loss' ? 'rgba(239, 68, 68, 0.2)' :
                                                   'rgba(245, 158, 11, 0.2)',
                                  color: run.result === 'win' ? '#22c55e' :
                                         run.result === 'loss' ? '#ef4444' : '#f59e0b',
                                }}>
                                  {run.result.toUpperCase()}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <button
                                onClick={() => handleEditRun(run)}
                                style={{
                                  padding: '2px 8px',
                                  marginRight: '4px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--color-border)',
                                  backgroundColor: 'transparent',
                                  color: 'var(--color-text-muted)',
                                  cursor: 'pointer',
                                  fontSize: '0.7rem',
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteRun(run.id)}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #ef4444',
                                  backgroundColor: 'transparent',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: '0.7rem',
                                }}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>🏁</div>
                <div style={{ fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>Select an opponent</div>
                <div style={{ fontSize: '0.9rem' }}>or add a new one to start tracking</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Add Opponent Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card" style={{ width: '400px', padding: 'var(--space-4)' }}>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>Add Opponent</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Name *</label>
                <input
                  type="text"
                  value={newOpponent.name}
                  onChange={(e) => setNewOpponent({ ...newOpponent, name: e.target.value })}
                  placeholder="Driver name"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Car</label>
                <input
                  type="text"
                  value={newOpponent.car}
                  onChange={(e) => setNewOpponent({ ...newOpponent, car: e.target.value })}
                  placeholder="e.g., '69 Camaro"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Class</label>
                  <input
                    type="text"
                    value={newOpponent.class}
                    onChange={(e) => setNewOpponent({ ...newOpponent, class: e.target.value })}
                    placeholder="e.g., Super Pro"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Car #</label>
                  <input
                    type="text"
                    value={newOpponent.number}
                    onChange={(e) => setNewOpponent({ ...newOpponent, number: e.target.value })}
                    placeholder="e.g., 42"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Notes</label>
                <textarea
                  value={newOpponent.notes}
                  onChange={(e) => setNewOpponent({ ...newOpponent, notes: e.target.value })}
                  placeholder="Any notes about this racer..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddOpponent}
                className="btn"
                disabled={!newOpponent.name.trim()}
              >
                Add Opponent
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Log Run Modal */}
      {showRunModal && selectedOpponent && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card" style={{ width: '500px', maxHeight: '90vh', overflow: 'auto', padding: 'var(--space-4)' }}>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>
              {editingRun ? 'Edit Run' : 'Log Run'} - {selectedOpponent.name}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {/* Date and Round */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem' }}>Date</label>
                  <input
                    type="date"
                    value={newRun.date}
                    onChange={(e) => setNewRun({ ...newRun, date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem' }}>Round</label>
                  <input
                    type="text"
                    value={newRun.round || ''}
                    onChange={(e) => setNewRun({ ...newRun, round: e.target.value })}
                    placeholder="Q1, E1, etc."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem' }}>Lane</label>
                  <select
                    value={newRun.lane || ''}
                    onChange={(e) => setNewRun({ ...newRun, lane: e.target.value as 'left' | 'right' | undefined })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                    }}
                  >
                    <option value="">—</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
              
              {/* Timing */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Timing</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>RT</label>
                    <input
                      type="number"
                      step="0.001"
                      value={newRun.reactionTime ?? ''}
                      onChange={(e) => setNewRun({ ...newRun, reactionTime: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="0.000"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>60'</label>
                    <input
                      type="number"
                      step="0.001"
                      value={newRun.et60 ?? ''}
                      onChange={(e) => setNewRun({ ...newRun, et60: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="0.000"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>330'</label>
                    <input
                      type="number"
                      step="0.001"
                      value={newRun.et330 ?? ''}
                      onChange={(e) => setNewRun({ ...newRun, et330: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="0.000"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>1/8 ET</label>
                    <input
                      type="number"
                      step="0.001"
                      value={newRun.et660 ?? ''}
                      onChange={(e) => setNewRun({ ...newRun, et660: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="0.000"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>1/8 MPH</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newRun.etMph660 ?? ''}
                      onChange={(e) => setNewRun({ ...newRun, etMph660: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>1000'</label>
                    <input
                      type="number"
                      step="0.001"
                      value={newRun.et1000 ?? ''}
                      onChange={(e) => setNewRun({ ...newRun, et1000: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="0.000"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>1/4 ET</label>
                    <input
                      type="number"
                      step="0.001"
                      value={newRun.et1320 ?? ''}
                      onChange={(e) => setNewRun({ ...newRun, et1320: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="0.000"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>1/4 MPH</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newRun.mph1320 ?? ''}
                      onChange={(e) => setNewRun({ ...newRun, mph1320: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Dial-in and Result */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem' }}>Dial-In</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newRun.dialIn ?? ''}
                    onChange={(e) => setNewRun({ ...newRun, dialIn: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="0.000"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem' }}>Result (vs You)</label>
                  <select
                    value={newRun.result || ''}
                    onChange={(e) => setNewRun({ ...newRun, result: e.target.value as OpponentRun['result'] || undefined })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                    }}
                  >
                    <option value="">—</option>
                    <option value="win">You Won</option>
                    <option value="loss">You Lost</option>
                    <option value="breakout">Opponent Broke Out</option>
                    <option value="redlight">Opponent Red Light</option>
                    <option value="dq">Opponent DQ</option>
                  </select>
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem' }}>Notes</label>
                <textarea
                  value={newRun.notes || ''}
                  onChange={(e) => setNewRun({ ...newRun, notes: e.target.value })}
                  placeholder="Any notes about this run..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              <button
                onClick={() => { setShowRunModal(false); setEditingRun(null); }}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRun}
                className="btn"
              >
                {editingRun ? 'Update Run' : 'Save Run'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
