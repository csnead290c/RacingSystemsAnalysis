/**
 * IncidentPlotWorkspace — Multi-plot synchronized workspace
 * 
 * Features:
 * - Multiple stacked plots
 * - Shared cursor across all plots
 * - Add/remove plots
 * - Reorder plots (future)
 * - Synchronized zoom (future)
 */

import React from 'react';
import { UPlotChart, type UPlotChannel, type UPlotMarker } from './UPlotChart';
import type { ProcessedChannel } from '../../services/incidentAnalysisApi';

interface Plot {
  id: string;
  title: string;
  channelKeys: string[];
}

interface IncidentPlotWorkspaceProps {
  plots: Plot[];
  channels: ProcessedChannel[];
  timeValues: number[];
  cursorTime: number | null;
  onCursorChange: (time: number | null) => void;
  markers: UPlotMarker[];
  selection: { start: number; end: number } | null;
  onRemovePlot: (plotId: string) => void;
  onRemoveChannelFromPlot: (plotId: string, channelKey: string) => void;
  onChartClick?: (time: number) => void;
}

const CHANNEL_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
];

export const IncidentPlotWorkspace: React.FC<IncidentPlotWorkspaceProps> = ({
  plots,
  channels,
  timeValues,
  cursorTime,
  onCursorChange,
  markers,
  selection,
  onRemovePlot,
  onRemoveChannelFromPlot,
  onChartClick,
}) => {
  if (plots.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        color: '#666',
      }}>
        <div style={{ fontSize: '2rem', opacity: 0.3 }}>📊</div>
        <div style={{ fontSize: '0.8rem' }}>No plots yet. Click "+ Add Plot" to create one.</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem', overflowY: 'auto' }}>
      {plots.map((plot, plotIdx) => {
        const plotChannels: UPlotChannel[] = plot.channelKeys
          .map((key, i) => {
            const ch = channels.find(c => c.key === key);
            if (!ch) return null;
            return {
              key: ch.key,
              label: ch.label,
              unit: ch.unit,
              color: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
              values: ch.values,
            };
          })
          .filter((ch): ch is UPlotChannel => ch !== null);

        if (plotChannels.length === 0) {
          return (
            <div
              key={plot.id}
              style={{
                background: '#1e1e2e',
                border: '1px solid #333',
                borderRadius: 4,
                padding: '1rem',
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#aaa' }}>
                {plot.title}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#666' }}>
                No channels in this plot. Add channels from the sidebar.
              </div>
              <button
                onClick={() => onRemovePlot(plot.id)}
                style={{
                  padding: '0.3rem 0.6rem',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 3,
                  fontSize: '0.65rem',
                  cursor: 'pointer',
                  marginTop: '0.5rem',
                }}
              >
                Remove Plot
              </button>
            </div>
          );
        }

        return (
          <div
            key={plot.id}
            style={{
              background: '#1e1e2e',
              border: '1px solid #333',
              borderRadius: 4,
              padding: '0.5rem',
            }}
          >
            {/* Plot header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.75rem' }}>
                {plot.title}
              </div>
              <button
                onClick={() => onRemovePlot(plot.id)}
                style={{
                  padding: '0.2rem 0.4rem',
                  background: 'transparent',
                  color: '#ef4444',
                  border: 'none',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                }}
                title="Remove plot"
              >
                ✕
              </button>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.65rem' }}>
              {plotChannels.map((ch, i) => (
                <div
                  key={ch.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.2rem 0.4rem',
                    background: '#2a2a3a',
                    borderRadius: 3,
                  }}
                >
                  <div style={{ width: 12, height: 2, background: ch.color }} />
                  <span style={{ color: '#fff' }}>{ch.label}</span>
                  {ch.unit && <span style={{ color: '#666' }}>({ch.unit})</span>}
                  <button
                    onClick={() => onRemoveChannelFromPlot(plot.id, ch.key)}
                    style={{
                      padding: 0,
                      background: 'transparent',
                      color: '#666',
                      border: 'none',
                      fontSize: '0.6rem',
                      cursor: 'pointer',
                      marginLeft: '0.2rem',
                    }}
                    title="Remove channel from plot"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Chart */}
            <UPlotChart
              timeValues={timeValues}
              channels={plotChannels}
              cursorTime={cursorTime}
              onCursorChange={onCursorChange}
              markers={markers}
              selection={selection}
              height={300}
              onChartClick={onChartClick}
            />
          </div>
        );
      })}
    </div>
  );
};
