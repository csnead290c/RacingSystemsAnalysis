/**
 * IncidentInspectorPanel — Cursor values and selection statistics
 * 
 * Features:
 * - Current cursor time
 * - Channel values at cursor
 * - Selection time range
 * - Selection statistics (min/max/avg for visible channels)
 */

import React from 'react';
import type { ProcessedChannel } from '../../services/incidentAnalysisApi';

interface IncidentInspectorPanelProps {
  cursorTime: number | null;
  selection: { start: number; end: number } | null;
  channels: ProcessedChannel[];
  visibleChannelKeys: Set<string>;
  timeValues: number[];
}

export const IncidentInspectorPanel: React.FC<IncidentInspectorPanelProps> = ({
  cursorTime,
  selection,
  channels,
  visibleChannelKeys,
  timeValues,
}) => {
  // Find cursor index
  const cursorIdx = cursorTime != null
    ? timeValues.findIndex((t, i) => i === timeValues.length - 1 || (t <= cursorTime && timeValues[i + 1] > cursorTime))
    : null;

  // Calculate selection stats
  const selectionStats = React.useMemo(() => {
    if (!selection || timeValues.length === 0) return null;

    const startIdx = timeValues.findIndex(t => t >= selection.start);
    const endIdx = timeValues.findIndex(t => t >= selection.end);
    if (startIdx === -1 || endIdx === -1) return null;

    const stats: Record<string, { min: number; max: number; avg: number }> = {};

    channels.forEach(ch => {
      if (!visibleChannelKeys.has(ch.key)) return;

      const values = ch.values.slice(startIdx, endIdx + 1).filter((v): v is number => v != null);
      if (values.length === 0) return;

      stats[ch.key] = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      };
    });

    return stats;
  }, [selection, channels, visibleChannelKeys, timeValues]);

  const visibleChannels = channels.filter(ch => visibleChannelKeys.has(ch.key));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem', fontSize: '0.7rem' }}>
      {/* Cursor section */}
      <div>
        <div style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.75rem' }}>
          Cursor
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#aaa' }}>Time:</span>
            <span style={{ fontFamily: 'monospace', color: '#fff' }}>
              {cursorTime != null ? `${cursorTime.toFixed(3)}s` : '—'}
            </span>
          </div>

          {cursorIdx != null && visibleChannels.length > 0 && (
            <div style={{ marginTop: '0.25rem', paddingTop: '0.5rem', borderTop: '1px solid #333' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.65rem', color: '#aaa' }}>
                Values:
              </div>
              {visibleChannels.map(ch => {
                const value = ch.values[cursorIdx];
                return (
                  <div key={ch.key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                    <span style={{ color: '#aaa', fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>
                      {ch.label}:
                    </span>
                    <span style={{ fontFamily: 'monospace', color: '#fff', fontSize: '0.65rem' }}>
                      {value != null ? value.toFixed(3) : '—'}
                      {value != null && ch.unit && <span style={{ color: '#666', marginLeft: '0.2rem' }}>{ch.unit}</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {visibleChannels.length === 0 && (
            <div style={{ fontSize: '0.65rem', color: '#666', fontStyle: 'italic', marginTop: '0.25rem' }}>
              No channels visible
            </div>
          )}
        </div>
      </div>

      {/* Selection section */}
      {selection && (
        <div style={{ paddingTop: '0.5rem', borderTop: '1px solid #333' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.75rem' }}>
            Selection
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#aaa' }}>Start:</span>
              <span style={{ fontFamily: 'monospace', color: '#fff' }}>{selection.start.toFixed(3)}s</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#aaa' }}>End:</span>
              <span style={{ fontFamily: 'monospace', color: '#fff' }}>{selection.end.toFixed(3)}s</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#aaa' }}>Duration:</span>
              <span style={{ fontFamily: 'monospace', color: '#fff' }}>{(selection.end - selection.start).toFixed(3)}s</span>
            </div>

            {selectionStats && Object.keys(selectionStats).length > 0 && (
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #333' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.65rem', color: '#aaa' }}>
                  Statistics:
                </div>
                {Object.entries(selectionStats).map(([key, stats]) => {
                  const ch = channels.find(c => c.key === key);
                  if (!ch) return null;
                  return (
                    <div key={key} style={{ marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 600, marginBottom: '0.15rem' }}>
                        {ch.label}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem' }}>
                        <span style={{ color: '#aaa' }}>Min:</span>
                        <span style={{ fontFamily: 'monospace', color: '#fff' }}>
                          {stats.min.toFixed(3)}
                          {ch.unit && <span style={{ color: '#666', marginLeft: '0.2rem' }}>{ch.unit}</span>}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem' }}>
                        <span style={{ color: '#aaa' }}>Max:</span>
                        <span style={{ fontFamily: 'monospace', color: '#fff' }}>
                          {stats.max.toFixed(3)}
                          {ch.unit && <span style={{ color: '#666', marginLeft: '0.2rem' }}>{ch.unit}</span>}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem' }}>
                        <span style={{ color: '#aaa' }}>Avg:</span>
                        <span style={{ fontFamily: 'monospace', color: '#fff' }}>
                          {stats.avg.toFixed(3)}
                          {ch.unit && <span style={{ color: '#666', marginLeft: '0.2rem' }}>{ch.unit}</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!selection && (
        <div style={{ paddingTop: '0.5rem', borderTop: '1px solid #333' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.75rem' }}>
            Selection
          </div>
          <div style={{ fontSize: '0.65rem', color: '#666', fontStyle: 'italic' }}>
            Drag on chart to select time range
          </div>
        </div>
      )}
    </div>
  );
};
