/**
 * IncidentWorkspaceToolbar — Workspace controls and actions
 * 
 * Features:
 * - Session title display
 * - Workspace selector dropdown
 * - Save workspace
 * - New workspace
 * - Add plot
 * - Fit all / reset zoom
 * - Play/pause controls
 */

import React, { useState } from 'react';
import type { AnalysisWorkspace } from '../../services/incidentAnalysisApi';

interface IncidentWorkspaceToolbarProps {
  sessionId: number;
  sessionTitle: string;
  workspaces: AnalysisWorkspace[];
  currentWorkspaceId: number | null;
  onLoadWorkspace: (workspaceId: number) => void;
  onSaveWorkspace: (name?: string) => void;
  onNewWorkspace: () => void;
  onAddPlot: () => void;
  onFitAll: () => void;
  playing: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  onBack: () => void;
  canEdit: boolean;
}

export const IncidentWorkspaceToolbar: React.FC<IncidentWorkspaceToolbarProps> = ({
  sessionId,
  sessionTitle,
  workspaces,
  currentWorkspaceId,
  onLoadWorkspace,
  onSaveWorkspace,
  onNewWorkspace,
  onAddPlot,
  onFitAll,
  playing,
  onTogglePlay,
  playbackSpeed,
  onSpeedChange,
  onBack,
  canEdit,
}) => {
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);

  const handleNewWorkspace = () => {
    if (!newWorkspaceName.trim()) return;
    onNewWorkspace();
    setShowNewWorkspaceModal(false);
    setNewWorkspaceName('');
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.5rem 1rem',
        background: '#1e1e2e',
        borderBottom: '1px solid #333',
        flexWrap: 'wrap',
      }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          padding: '0.4rem 0.6rem',
          background: 'transparent',
          color: '#aaa',
          border: '1px solid #444',
          borderRadius: 4,
          fontSize: '0.7rem',
          cursor: 'pointer',
        }}
        title="Back to Parity Portal"
      >
        ◀ Back
      </button>

      {/* Session title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.05rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
          {sessionTitle}
        </div>
        <div style={{ fontSize: '0.6rem', color: '#666' }}>
          Session #{sessionId}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Workspace selector */}
      {workspaces.length > 0 && (
        <select
          value={currentWorkspaceId || ''}
          onChange={(e) => {
            const id = parseInt(e.target.value);
            if (!isNaN(id)) onLoadWorkspace(id);
          }}
          style={{
            padding: '0.4rem 0.6rem',
            background: '#2a2a3a',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: 4,
            fontSize: '0.7rem',
            cursor: 'pointer',
          }}
        >
          <option value="">Select Workspace...</option>
          {workspaces.map(w => (
            <option key={w.id} value={w.id}>
              {w.name} {w.is_default ? '(default)' : ''}
            </option>
          ))}
        </select>
      )}

      {/* Save workspace */}
      {canEdit && (
        <button
          onClick={() => onSaveWorkspace()}
          style={{
            padding: '0.4rem 0.8rem',
            background: currentWorkspace ? '#22c55e' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: '0.7rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
          title={currentWorkspace ? 'Save changes to workspace' : 'Save as new workspace'}
        >
          💾 {currentWorkspace ? 'Save' : 'Save Workspace'}
        </button>
      )}

      {/* New workspace */}
      {canEdit && (
        <button
          onClick={() => setShowNewWorkspaceModal(true)}
          style={{
            padding: '0.4rem 0.8rem',
            background: '#444',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: '0.7rem',
            cursor: 'pointer',
          }}
          title="Create new workspace"
        >
          + New
        </button>
      )}

      {/* Add plot */}
      <button
        onClick={onAddPlot}
        style={{
          padding: '0.4rem 0.8rem',
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          fontSize: '0.7rem',
          cursor: 'pointer',
        }}
        title="Add new plot"
      >
        + Plot
      </button>

      {/* Fit all */}
      <button
        onClick={onFitAll}
        style={{
          padding: '0.4rem 0.6rem',
          background: 'transparent',
          color: '#aaa',
          border: '1px solid #444',
          borderRadius: 4,
          fontSize: '0.7rem',
          cursor: 'pointer',
        }}
        title="Fit all data (reset zoom)"
      >
        ⊡ Fit
      </button>

      {/* Playback controls */}
      <button
        onClick={onTogglePlay}
        style={{
          padding: '0.4rem 0.8rem',
          background: playing ? '#ef4444' : '#22c55e',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          fontSize: '0.7rem',
          cursor: 'pointer',
        }}
      >
        {playing ? '⏸ Pause' : '▶ Play'}
      </button>

      <select
        value={playbackSpeed}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
        style={{
          padding: '0.4rem 0.6rem',
          background: '#2a2a3a',
          color: '#fff',
          border: '1px solid #444',
          borderRadius: 4,
          fontSize: '0.7rem',
          cursor: 'pointer',
        }}
      >
        {[0.25, 0.5, 1, 2, 4].map(s => (
          <option key={s} value={s}>{s}×</option>
        ))}
      </select>

      {/* New workspace modal */}
      {showNewWorkspaceModal && (
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
          onClick={() => setShowNewWorkspaceModal(false)}
        >
          <div
            style={{
              background: '#1e1e2e',
              border: '1px solid #333',
              borderRadius: 8,
              padding: '1.5rem',
              minWidth: 350,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem' }}>
              Create New Workspace
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.7rem', color: '#aaa', display: 'block', marginBottom: '0.5rem' }}>
                Workspace Name
              </label>
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNewWorkspace();
                  if (e.key === 'Escape') setShowNewWorkspaceModal(false);
                }}
                placeholder="e.g., Launch Analysis, Full Run Review"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: '#2a2a3a',
                  border: '1px solid #444',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: '0.75rem',
                }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleNewWorkspace}
                disabled={!newWorkspaceName.trim()}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: newWorkspaceName.trim() ? '#3b82f6' : '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: '0.75rem',
                  cursor: newWorkspaceName.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNewWorkspaceModal(false);
                  setNewWorkspaceName('');
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
      )}
    </div>
  );
};
