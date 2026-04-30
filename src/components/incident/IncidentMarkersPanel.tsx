/**
 * IncidentMarkersPanel — Marker/bookmark management panel
 * 
 * Features:
 * - Create point markers at cursor
 * - Create range markers from selection
 * - Edit marker label/note/color
 * - Delete markers
 * - Jump to marker
 * - List all markers sorted by time
 */

import React, { useState } from 'react';
import type { AnalysisBookmark } from '../../services/incidentAnalysisApi';

interface IncidentMarkersPanelProps {
  markers: AnalysisBookmark[];
  cursorTime: number | null;
  selection: { start: number; end: number } | null;
  onCreateMarker: (data: { time_sec: number; end_time_sec?: number; label: string; note?: string; color?: string }) => void;
  onUpdateMarker: (id: number, data: { label?: string; note?: string; color?: string }) => void;
  onDeleteMarker: (id: number) => void;
  onJumpToMarker: (time: number) => void;
}

const MARKER_COLORS = [
  { value: '#22c55e', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
];

export const IncidentMarkersPanel: React.FC<IncidentMarkersPanelProps> = ({
  markers,
  cursorTime,
  selection,
  onCreateMarker,
  onUpdateMarker,
  onDeleteMarker,
  onJumpToMarker,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'point' | 'range'>('point');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ label: '', note: '', color: '#22c55e' });

  const handleCreate = () => {
    if (!formData.label.trim()) return;

    if (createType === 'point' && cursorTime != null) {
      onCreateMarker({
        time_sec: cursorTime,
        label: formData.label,
        note: formData.note || undefined,
        color: formData.color,
      });
    } else if (createType === 'range' && selection) {
      onCreateMarker({
        time_sec: selection.start,
        end_time_sec: selection.end,
        label: formData.label,
        note: formData.note || undefined,
        color: formData.color,
      });
    }

    setFormData({ label: '', note: '', color: '#22c55e' });
    setShowCreateModal(false);
  };

  const handleUpdate = (id: number) => {
    if (!formData.label.trim()) return;
    onUpdateMarker(id, {
      label: formData.label,
      note: formData.note || undefined,
      color: formData.color,
    });
    setEditingId(null);
    setFormData({ label: '', note: '', color: '#22c55e' });
  };

  const startEdit = (marker: AnalysisBookmark) => {
    setEditingId(marker.id);
    setFormData({
      label: marker.label,
      note: marker.note || '',
      color: marker.color || '#22c55e',
    });
  };

  const sortedMarkers = [...markers].sort((a, b) => a.time_sec - b.time_sec);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem' }}>
      <div style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '0.25rem' }}>
        Markers ({markers.length})
      </div>

      {/* Create buttons */}
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        <button
          style={{
            flex: 1,
            padding: '0.35rem 0.5rem',
            fontSize: '0.65rem',
            background: cursorTime != null ? '#3b82f6' : '#333',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: cursorTime != null ? 'pointer' : 'not-allowed',
            opacity: cursorTime != null ? 1 : 0.5,
          }}
          disabled={cursorTime == null}
          onClick={() => {
            setCreateType('point');
            setShowCreateModal(true);
          }}
        >
          + Point
        </button>
        <button
          style={{
            flex: 1,
            padding: '0.35rem 0.5rem',
            fontSize: '0.65rem',
            background: selection != null ? '#3b82f6' : '#333',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: selection != null ? 'pointer' : 'not-allowed',
            opacity: selection != null ? 1 : 0.5,
          }}
          disabled={selection == null}
          onClick={() => {
            setCreateType('range');
            setShowCreateModal(true);
          }}
        >
          + Range
        </button>
      </div>

      {/* Create/Edit modal */}
      {(showCreateModal || editingId != null) && (
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
          onClick={() => {
            setShowCreateModal(false);
            setEditingId(null);
            setFormData({ label: '', note: '', color: '#22c55e' });
          }}
        >
          <div
            style={{
              background: '#1e1e2e',
              border: '1px solid #333',
              borderRadius: 8,
              padding: '1rem',
              minWidth: 350,
              maxWidth: 500,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.75rem' }}>
              {editingId != null ? 'Edit Marker' : `Create ${createType === 'point' ? 'Point' : 'Range'} Marker`}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#aaa', display: 'block', marginBottom: '0.25rem' }}>
                  Label *
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Launch, Shift 1→2"
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    background: '#2a2a3a',
                    border: '1px solid #444',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: '0.75rem',
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: '#aaa', display: 'block', marginBottom: '0.25rem' }}>
                  Note (optional)
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Additional details..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    background: '#2a2a3a',
                    border: '1px solid #444',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: '0.75rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: '#aaa', display: 'block', marginBottom: '0.25rem' }}>
                  Color
                </label>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {MARKER_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setFormData({ ...formData, color: c.value })}
                      style={{
                        width: 32,
                        height: 32,
                        background: c.value,
                        border: formData.color === c.value ? '2px solid #fff' : '1px solid #444',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => {
                    if (editingId != null) {
                      handleUpdate(editingId);
                    } else {
                      handleCreate();
                    }
                  }}
                  disabled={!formData.label.trim()}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: formData.label.trim() ? '#3b82f6' : '#333',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: '0.75rem',
                    cursor: formData.label.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  {editingId != null ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingId(null);
                    setFormData({ label: '', note: '', color: '#22c55e' });
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Markers list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: 400, overflowY: 'auto' }}>
        {sortedMarkers.length === 0 && (
          <div style={{ fontSize: '0.65rem', color: '#666', textAlign: 'center', padding: '1rem 0' }}>
            No markers yet. Click "+ Point" or "+ Range" to create one.
          </div>
        )}
        {sortedMarkers.map((marker) => (
          <div
            key={marker.id}
            style={{
              background: '#2a2a3a',
              border: '1px solid #444',
              borderLeft: `3px solid ${marker.color || '#22c55e'}`,
              borderRadius: 4,
              padding: '0.4rem 0.5rem',
              fontSize: '0.7rem',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#333')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#2a2a3a')}
            onClick={() => onJumpToMarker(marker.time_sec)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
              <div style={{ fontWeight: 600, color: '#fff' }}>{marker.label}</div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(marker);
                  }}
                  style={{
                    padding: '0.1rem 0.3rem',
                    background: 'transparent',
                    color: '#3b82f6',
                    border: 'none',
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                  }}
                  title="Edit marker"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete marker "${marker.label}"?`)) {
                      onDeleteMarker(marker.id);
                    }
                  }}
                  style={{
                    padding: '0.1rem 0.3rem',
                    background: 'transparent',
                    color: '#ef4444',
                    border: 'none',
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                  }}
                  title="Delete marker"
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ fontSize: '0.65rem', color: '#aaa', fontFamily: 'monospace' }}>
              {marker.end_time_sec != null
                ? `${marker.time_sec.toFixed(3)}s → ${marker.end_time_sec.toFixed(3)}s (Δ${(marker.end_time_sec - marker.time_sec).toFixed(3)}s)`
                : `${marker.time_sec.toFixed(3)}s`}
            </div>
            {marker.note && (
              <div style={{ fontSize: '0.65rem', color: '#999', marginTop: '0.15rem', fontStyle: 'italic' }}>
                {marker.note}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
