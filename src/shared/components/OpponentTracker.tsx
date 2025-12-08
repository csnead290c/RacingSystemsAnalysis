/**
 * Opponent Tracker
 * 
 * Log opponent runs, calculate margin of victory, and track head-to-head statistics.
 */

import { useState, useMemo } from 'react';

interface OpponentRun {
  id: string;
  name: string;
  dialIn: number;
  et: number;
  rt: number;
  lane: 'left' | 'right';
  timestamp: Date;
}

interface HeadToHead {
  opponentName: string;
  wins: number;
  losses: number;
  avgMOV: number;
  runs: OpponentRun[];
}

export default function OpponentTracker() {
  const [opponents, setOpponents] = useState<OpponentRun[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dialIn: 0,
    et: 0,
    rt: 0,
    lane: 'left' as 'left' | 'right',
  });

  // Calculate head-to-head stats grouped by opponent name
  const headToHeadStats = useMemo(() => {
    const stats: Record<string, HeadToHead> = {};
    
    opponents.forEach(run => {
      if (!stats[run.name]) {
        stats[run.name] = {
          opponentName: run.name,
          wins: 0,
          losses: 0,
          avgMOV: 0,
          runs: [],
        };
      }
      stats[run.name].runs.push(run);
    });

    // Calculate averages
    Object.values(stats).forEach(stat => {
      const movs = stat.runs.map(r => r.et - r.dialIn);
      stat.avgMOV = movs.reduce((a, b) => a + b, 0) / movs.length;
    });

    return Object.values(stats).sort((a, b) => b.runs.length - a.runs.length);
  }, [opponents]);

  // Recent runs (last 10)
  const recentRuns = useMemo(() => {
    return [...opponents].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 10);
  }, [opponents]);

  const handleAddRun = () => {
    if (!formData.name || formData.et <= 0) return;
    
    const newRun: OpponentRun = {
      id: crypto.randomUUID(),
      ...formData,
      timestamp: new Date(),
    };
    
    setOpponents(prev => [...prev, newRun]);
    setFormData({ name: '', dialIn: 0, et: 0, rt: 0, lane: 'left' });
    setShowForm(false);
  };

  const handleDeleteRun = (id: string) => {
    setOpponents(prev => prev.filter(r => r.id !== id));
  };

  // Calculate margin of victory (positive = breakout, negative = under dial)
  const calculateMOV = (run: OpponentRun) => {
    return run.et - run.dialIn;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Opponent Tracker</h3>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Log Run'}
        </button>
      </div>

      {/* Add Run Form */}
      {showForm && (
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
            <div>
              <label className="label">Opponent Name</label>
              <input
                type="text"
                className="input"
                placeholder="Name or car #"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Dial-In</label>
              <input
                type="number"
                step="0.001"
                className="input"
                value={formData.dialIn || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, dialIn: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="label">ET</label>
              <input
                type="number"
                step="0.001"
                className="input"
                value={formData.et || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, et: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="label">RT</label>
              <input
                type="number"
                step="0.001"
                className="input"
                value={formData.rt || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, rt: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="label">Lane</label>
              <select
                className="input"
                value={formData.lane}
                onChange={(e) => setFormData(prev => ({ ...prev, lane: e.target.value as 'left' | 'right' }))}
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>
          <button 
            className="btn btn-primary"
            style={{ marginTop: '12px' }}
            onClick={handleAddRun}
          >
            Save Run
          </button>
        </div>
      )}

      {/* Stats Summary */}
      {opponents.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          <div className="card" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Runs Logged</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{opponents.length}</div>
          </div>
          <div className="card" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Unique Opponents</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{headToHeadStats.length}</div>
          </div>
          <div className="card" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Avg Opponent MOV</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {opponents.length > 0 
                ? (opponents.reduce((sum, r) => sum + calculateMOV(r), 0) / opponents.length).toFixed(3)
                : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Head-to-Head Stats */}
      {headToHeadStats.length > 0 && (
        <div className="card" style={{ padding: '16px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>Head-to-Head</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {headToHeadStats.map(stat => (
              <div 
                key={stat.opponentName}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{stat.opponentName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {stat.runs.length} run{stat.runs.length !== 1 ? 's' : ''} logged
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontSize: '0.9rem', 
                    fontWeight: 600,
                    color: stat.avgMOV > 0 ? '#ef4444' : '#22c55e',
                  }}>
                    {stat.avgMOV >= 0 ? '+' : ''}{stat.avgMOV.toFixed(3)} avg MOV
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Best: {Math.min(...stat.runs.map(r => r.et)).toFixed(3)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Runs */}
      {recentRuns.length > 0 && (
        <div className="card" style={{ padding: '16px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>Recent Runs</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 4px' }}>Opponent</th>
                  <th style={{ textAlign: 'right', padding: '8px 4px' }}>Dial</th>
                  <th style={{ textAlign: 'right', padding: '8px 4px' }}>ET</th>
                  <th style={{ textAlign: 'right', padding: '8px 4px' }}>RT</th>
                  <th style={{ textAlign: 'right', padding: '8px 4px' }}>MOV</th>
                  <th style={{ textAlign: 'center', padding: '8px 4px' }}>Lane</th>
                  <th style={{ textAlign: 'center', padding: '8px 4px' }}></th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map(run => {
                  const mov = calculateMOV(run);
                  return (
                    <tr key={run.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 500 }}>{run.name}</td>
                      <td style={{ textAlign: 'right', padding: '8px 4px' }}>{run.dialIn.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '8px 4px' }}>{run.et.toFixed(3)}</td>
                      <td style={{ textAlign: 'right', padding: '8px 4px' }}>{run.rt.toFixed(3)}</td>
                      <td style={{ 
                        textAlign: 'right', 
                        padding: '8px 4px',
                        color: mov > 0 ? '#ef4444' : '#22c55e',
                        fontWeight: 600,
                      }}>
                        {mov >= 0 ? '+' : ''}{mov.toFixed(3)}
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                        {run.lane === 'left' ? 'L' : 'R'}
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                        <button
                          onClick={() => handleDeleteRun(run.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                          }}
                          title="Delete"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {opponents.length === 0 && !showForm && (
        <div 
          className="card" 
          style={{ 
            padding: '32px', 
            textAlign: 'center',
            color: 'var(--color-text-muted)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏁</div>
          <div style={{ marginBottom: '4px' }}>No opponent runs logged yet</div>
          <div style={{ fontSize: '0.85rem' }}>
            Click "+ Log Run" to start tracking your competition
          </div>
        </div>
      )}
    </div>
  );
}
