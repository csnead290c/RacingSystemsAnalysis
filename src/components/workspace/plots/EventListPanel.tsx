/**
 * EventListPanel — Tabular view of markers/events
 * 
 * Provides sortable list of markers with jump-to functionality.
 */

import React, { useState, useMemo } from 'react';

export interface EventListMarker {
  id: number;
  time_sec: number;
  end_time_sec: number | null;
  label: string;
  note?: string;
  color: string | null;
}

export interface EventListPanelProps {
  markers: EventListMarker[];
  onJumpToMarker?: (time: number) => void;
  onEditMarker?: (id: number) => void;
  onDeleteMarker?: (id: number) => void;
  height?: number;
}

type SortField = 'time' | 'label' | 'duration';
type SortOrder = 'asc' | 'desc';

export const EventListPanel: React.FC<EventListPanelProps> = ({
  markers,
  onJumpToMarker,
  onEditMarker,
  onDeleteMarker,
  height = 300,
}) => {
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const sortedMarkers = useMemo(() => {
    const sorted = [...markers];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'time':
          comparison = a.time_sec - b.time_sec;
          break;
        case 'label':
          comparison = a.label.localeCompare(b.label);
          break;
        case 'duration':
          const aDuration = a.end_time_sec != null ? a.end_time_sec - a.time_sec : 0;
          const bDuration = b.end_time_sec != null ? b.end_time_sec - b.time_sec : 0;
          comparison = aDuration - bDuration;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [markers, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '⇅';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (markers.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height, color: '#666' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', opacity: 0.3 }}>📋</div>
          <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
            No markers yet
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height, background: '#1e1e2e' }}>
      {/* Header */}
      <div style={{ display: 'flex', padding: '0.5rem', background: '#2a2a3a', borderBottom: '1px solid #333', fontSize: '0.7rem', fontWeight: 600 }}>
        <div style={{ flex: '0 0 80px', cursor: 'pointer' }} onClick={() => handleSort('time')}>
          Time {getSortIcon('time')}
        </div>
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleSort('label')}>
          Label {getSortIcon('label')}
        </div>
        <div style={{ flex: '0 0 80px', cursor: 'pointer' }} onClick={() => handleSort('duration')}>
          Duration {getSortIcon('duration')}
        </div>
        <div style={{ flex: '0 0 80px', textAlign: 'center' }}>
          Actions
        </div>
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sortedMarkers.map(marker => {
          const duration = marker.end_time_sec != null 
            ? (marker.end_time_sec - marker.time_sec).toFixed(3) + 's'
            : '—';

          return (
            <div
              key={marker.id}
              style={{
                display: 'flex',
                padding: '0.5rem',
                borderBottom: '1px solid #333',
                fontSize: '0.7rem',
                cursor: onJumpToMarker ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}
              onClick={() => onJumpToMarker?.(marker.time_sec)}
              onMouseEnter={(e) => {
                if (onJumpToMarker) {
                  e.currentTarget.style.background = '#2a2a3a';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ flex: '0 0 80px', fontFamily: 'monospace', color: '#3b82f6' }}>
                {marker.time_sec.toFixed(3)}s
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {marker.color && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: marker.color, flexShrink: 0 }} />
                )}
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {marker.label}
                  {marker.note && (
                    <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '0.1rem' }}>
                      {marker.note}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ flex: '0 0 80px', fontFamily: 'monospace', color: '#aaa' }}>
                {duration}
              </div>
              <div style={{ flex: '0 0 80px', display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                {onEditMarker && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditMarker(marker.id);
                    }}
                    style={{
                      padding: '0.2rem 0.4rem',
                      background: 'transparent',
                      color: '#3b82f6',
                      border: 'none',
                      fontSize: '0.65rem',
                      cursor: 'pointer',
                    }}
                    title="Edit"
                  >
                    ✎
                  </button>
                )}
                {onDeleteMarker && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMarker(marker.id);
                    }}
                    style={{
                      padding: '0.2rem 0.4rem',
                      background: 'transparent',
                      color: '#ef4444',
                      border: 'none',
                      fontSize: '0.65rem',
                      cursor: 'pointer',
                    }}
                    title="Delete"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
