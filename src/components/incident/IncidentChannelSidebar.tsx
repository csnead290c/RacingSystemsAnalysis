/**
 * IncidentChannelSidebar — Grouped channel selector with search
 * 
 * Features:
 * - Channels grouped by category (engine, chassis, driver_input, etc.)
 * - Search/filter channels
 * - Toggle channel visibility
 * - Add channel to plot
 * - Show channel metadata (unit, min/max)
 */

import React, { useState, useMemo } from 'react';
import type { ProcessedChannel } from '../../services/incidentAnalysisApi';

interface IncidentChannelSidebarProps {
  channels: ProcessedChannel[];
  visibleChannels: Set<string>;
  onToggleChannel: (channelKey: string) => void;
  onAddToPlot: (channelKey: string, plotId: string) => void;
  plots: Array<{ id: string; title: string }>;
}

const GROUP_LABELS: Record<string, string> = {
  engine: '🔧 Engine',
  chassis: '🚗 Chassis',
  driver_input: '🎮 Driver Input',
  race_control: '🏁 Race Control',
  weather: '🌤 Weather',
  gps: '📍 GPS',
  derived: '📊 Derived',
  other: '📋 Other',
};

const GROUP_ORDER = ['engine', 'chassis', 'driver_input', 'race_control', 'weather', 'gps', 'derived', 'other'];

export const IncidentChannelSidebar: React.FC<IncidentChannelSidebarProps> = ({
  channels,
  visibleChannels,
  onToggleChannel,
  onAddToPlot,
  plots,
}) => {
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(GROUP_ORDER));
  const [addToPlotChannel, setAddToPlotChannel] = useState<string | null>(null);

  const filteredChannels = useMemo(() => {
    const q = search.toLowerCase();
    return channels.filter(ch =>
      ch.label.toLowerCase().includes(q) ||
      ch.key.toLowerCase().includes(q) ||
      (ch.unit && ch.unit.toLowerCase().includes(q))
    );
  }, [channels, search]);

  const groupedChannels = useMemo(() => {
    const groups: Record<string, ProcessedChannel[]> = {};
    filteredChannels.forEach(ch => {
      const group = ch.group || 'other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(ch);
    });
    return groups;
  }, [filteredChannels]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const selectAll = () => {
    filteredChannels.forEach(ch => {
      if (!visibleChannels.has(ch.key)) {
        onToggleChannel(ch.key);
      }
    });
  };

  const selectNone = () => {
    filteredChannels.forEach(ch => {
      if (visibleChannels.has(ch.key)) {
        onToggleChannel(ch.key);
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e1e2e' }}>
      {/* Header */}
      <div style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}>
        <div style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '0.5rem' }}>
          Channels ({channels.length})
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search channels..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.4rem',
            background: '#2a2a3a',
            border: '1px solid #444',
            borderRadius: 4,
            color: '#fff',
            fontSize: '0.7rem',
            marginBottom: '0.5rem',
          }}
        />

        {/* Select all/none */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={selectAll}
            style={{
              flex: 1,
              padding: '0.3rem',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 3,
              fontSize: '0.65rem',
              cursor: 'pointer',
            }}
          >
            Select All
          </button>
          <button
            onClick={selectNone}
            style={{
              flex: 1,
              padding: '0.3rem',
              background: '#444',
              color: '#fff',
              border: 'none',
              borderRadius: 3,
              fontSize: '0.65rem',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Channel groups */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
        {GROUP_ORDER.map(groupKey => {
          const groupChannels = groupedChannels[groupKey];
          if (!groupChannels || groupChannels.length === 0) return null;

          const isExpanded = expandedGroups.has(groupKey);
          const visibleCount = groupChannels.filter(ch => visibleChannels.has(ch.key)).length;

          return (
            <div key={groupKey} style={{ marginBottom: '0.5rem' }}>
              {/* Group header */}
              <div
                onClick={() => toggleGroup(groupKey)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.3rem 0.5rem',
                  background: '#2a2a3a',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  marginBottom: '0.25rem',
                }}
              >
                <span>
                  {isExpanded ? '▼' : '▶'} {GROUP_LABELS[groupKey] || groupKey}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#666' }}>
                  {visibleCount}/{groupChannels.length}
                </span>
              </div>

              {/* Channel list */}
              {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', paddingLeft: '0.5rem' }}>
                  {groupChannels.map(ch => (
                    <div
                      key={ch.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.25rem 0.4rem',
                        background: visibleChannels.has(ch.key) ? '#2a3a4a' : 'transparent',
                        borderRadius: 3,
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => {
                        if (!visibleChannels.has(ch.key)) {
                          e.currentTarget.style.background = '#2a2a3a';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!visibleChannels.has(ch.key)) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                      onClick={() => onToggleChannel(ch.key)}
                    >
                      <input
                        type="checkbox"
                        checked={visibleChannels.has(ch.key)}
                        onChange={() => {}}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#fff' }}>{ch.label}</span>
                        {ch.unit && <span style={{ color: '#666', marginLeft: '0.25rem' }}>({ch.unit})</span>}
                      </div>
                      {plots.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddToPlotChannel(ch.key);
                          }}
                          style={{
                            padding: '0.1rem 0.3rem',
                            background: 'transparent',
                            color: '#3b82f6',
                            border: 'none',
                            fontSize: '0.6rem',
                            cursor: 'pointer',
                          }}
                          title="Add to plot"
                        >
                          +
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredChannels.length === 0 && (
          <div style={{ fontSize: '0.65rem', color: '#666', textAlign: 'center', padding: '2rem 1rem' }}>
            No channels found matching "{search}"
          </div>
        )}
      </div>

      {/* Add to plot modal */}
      {addToPlotChannel && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setAddToPlotChannel(null)}
        >
          <div
            style={{
              background: '#1e1e2e',
              border: '1px solid #333',
              borderRadius: 8,
              padding: '1rem',
              minWidth: 250,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.8rem' }}>
              Add to Plot
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {plots.map(plot => (
                <button
                  key={plot.id}
                  onClick={() => {
                    onAddToPlot(addToPlotChannel, plot.id);
                    setAddToPlotChannel(null);
                  }}
                  style={{
                    padding: '0.5rem',
                    background: '#2a2a3a',
                    color: '#fff',
                    border: '1px solid #444',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {plot.title}
                </button>
              ))}
              <button
                onClick={() => setAddToPlotChannel(null)}
                style={{
                  padding: '0.5rem',
                  background: '#444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  marginTop: '0.25rem',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
