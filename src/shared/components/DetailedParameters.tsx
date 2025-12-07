/**
 * Detailed Parameters Component
 * 
 * Shows detailed simulation output similar to VB6 Quarter Pro's
 * "Detailed Parameters" screen - a tabular view of all calculated
 * vehicle performance data during the run.
 */

import { useState } from 'react';

interface TracePoint {
  t_s: number;
  v_mph: number;
  a_g: number;
  s_ft: number;
  rpm: number;
  gear: number;
  hp?: number;
}

interface DetailedParametersProps {
  traces: TracePoint[];
  raceLengthFt: number;
  collapsed?: boolean;
}

// Key distance triggers (like VB6)
const DISTANCE_TRIGGERS = [0, 30, 60, 330, 660, 1000, 1320, 2640, 5280, 10560, 26400];

// Key speed triggers
const SPEED_TRIGGERS = [60, 100, 150, 200, 250, 300];

export default function DetailedParameters({ traces, raceLengthFt, collapsed = true }: DetailedParametersProps) {
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  
  if (!traces || traces.length === 0) {
    return null;
  }

  // Find key events in the trace data
  const keyEvents: (TracePoint & { event: string })[] = [];
  
  // Add initial conditions
  if (traces[0]) {
    keyEvents.push({ ...traces[0], event: 'Start' });
  }
  
  // Find distance triggers
  for (const dist of DISTANCE_TRIGGERS) {
    if (dist > raceLengthFt) break;
    const point = traces.find(t => t.s_ft >= dist);
    if (point && !keyEvents.some(e => e.s_ft === point.s_ft && e.event.includes("'"))) {
      const label = dist === 660 ? '1/8 mi' : 
                    dist === 1320 ? '1/4 mi' :
                    dist === 2640 ? '1/2 mi' :
                    dist === 5280 ? '1 mi' :
                    dist === 10560 ? '2 mi' :
                    dist === 26400 ? '5 mi' :
                    `${dist}'`;
      keyEvents.push({ ...point, event: label });
    }
  }
  
  // Find speed triggers (0-60, 0-100, etc.)
  for (const speed of SPEED_TRIGGERS) {
    const point = traces.find(t => t.v_mph >= speed);
    if (point && !keyEvents.some(e => Math.abs(e.t_s - point.t_s) < 0.01)) {
      keyEvents.push({ ...point, event: `0-${speed} mph` });
    }
  }
  
  // Find gear changes
  let lastGear = traces[0]?.gear ?? 1;
  for (let i = 1; i < traces.length; i++) {
    if (traces[i].gear !== lastGear) {
      // Add point before shift
      if (traces[i-1]) {
        keyEvents.push({ ...traces[i-1], event: `Shift ${lastGear}→${traces[i].gear}` });
      }
      lastGear = traces[i].gear;
    }
  }
  
  // Add finish
  const finish = traces[traces.length - 1];
  if (finish) {
    keyEvents.push({ ...finish, event: 'Finish' });
  }
  
  // Sort by time and remove duplicates
  keyEvents.sort((a, b) => a.t_s - b.t_s);
  const uniqueEvents = keyEvents.filter((e, i, arr) => 
    i === 0 || Math.abs(e.t_s - arr[i-1].t_s) > 0.001
  );

  return (
    <div className="card" style={{ padding: '12px 16px' }}>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: isExpanded ? '12px' : 0,
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span style={{ fontWeight: '600', color: 'var(--color-text)', fontSize: '0.8rem' }}>
          Detailed Parameters
        </span>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            padding: '4px 8px',
          }}
        >
          {isExpanded ? '▼ Collapse' : '▶ Expand'}
        </button>
      </div>
      
      {isExpanded && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: '0.75rem',
            fontFamily: 'monospace',
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', whiteSpace: 'nowrap' }}>Event</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>Time (s)</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>Dist (ft)</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>MPH</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>Accel (g)</th>
                <th style={{ textAlign: 'center', padding: '6px 8px' }}>Gear</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>RPM</th>
                {uniqueEvents.some(e => e.hp !== undefined) && (
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>HP</th>
                )}
              </tr>
            </thead>
            <tbody>
              {uniqueEvents.map((event, i) => (
                <tr 
                  key={i} 
                  style={{ 
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: event.event === 'Finish' ? 'rgba(34, 197, 94, 0.1)' :
                                     event.event.includes('Shift') ? 'rgba(59, 130, 246, 0.05)' :
                                     'transparent',
                  }}
                >
                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', fontWeight: event.event === 'Finish' ? '600' : 'normal' }}>
                    {event.event}
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 8px' }}>{event.t_s.toFixed(3)}</td>
                  <td style={{ textAlign: 'right', padding: '6px 8px' }}>{event.s_ft.toFixed(1)}</td>
                  <td style={{ textAlign: 'right', padding: '6px 8px' }}>{event.v_mph.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '6px 8px' }}>{event.a_g.toFixed(3)}</td>
                  <td style={{ textAlign: 'center', padding: '6px 8px' }}>{event.gear}</td>
                  <td style={{ textAlign: 'right', padding: '6px 8px' }}>{Math.round(event.rpm).toLocaleString()}</td>
                  {uniqueEvents.some(e => e.hp !== undefined) && (
                    <td style={{ textAlign: 'right', padding: '6px 8px' }}>
                      {event.hp !== undefined ? Math.round(event.hp) : '-'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Summary stats */}
          <div style={{ 
            marginTop: '12px', 
            paddingTop: '12px', 
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
            fontSize: '0.75rem',
          }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Peak Accel: </span>
              <span style={{ fontWeight: '600' }}>
                {Math.max(...traces.map(t => t.a_g)).toFixed(3)} g
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Peak RPM: </span>
              <span style={{ fontWeight: '600' }}>
                {Math.max(...traces.map(t => t.rpm)).toLocaleString()}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Avg Accel: </span>
              <span style={{ fontWeight: '600' }}>
                {(traces.reduce((sum, t) => sum + t.a_g, 0) / traces.length).toFixed(3)} g
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Data Points: </span>
              <span style={{ fontWeight: '600' }}>
                {traces.length.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
