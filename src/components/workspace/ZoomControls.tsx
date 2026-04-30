/**
 * ZoomControls — Toolbar for zoom/pan operations
 */

import React from 'react';

export interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitAll: () => void;
  onPanLeft: () => void;
  onPanRight: () => void;
  onZoomToSelection: () => void;
  onToggleLock: () => void;
  isLocked: boolean;
  hasSelection: boolean;
  disabled?: boolean;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onFitAll,
  onPanLeft,
  onPanRight,
  onZoomToSelection,
  onToggleLock,
  isLocked,
  hasSelection,
  disabled = false,
}) => {
  const buttonStyle: React.CSSProperties = {
    padding: '0.3rem 0.5rem',
    background: disabled ? '#333' : '#2a2a3a',
    color: disabled ? '#666' : '#fff',
    border: '1px solid #444',
    borderRadius: 3,
    fontSize: '0.7rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#3b82f6',
    borderColor: '#3b82f6',
  };

  return (
    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', padding: '0.25rem', background: '#1e1e2e', borderRadius: 4 }}>
      <button
        onClick={onPanLeft}
        disabled={disabled || isLocked}
        style={buttonStyle}
        title="Pan left (Shift+←)"
      >
        ◀
      </button>
      
      <button
        onClick={onPanRight}
        disabled={disabled || isLocked}
        style={buttonStyle}
        title="Pan right (Shift+→)"
      >
        ▶
      </button>

      <div style={{ width: 1, height: 20, background: '#444', margin: '0 0.25rem' }} />

      <button
        onClick={onZoomIn}
        disabled={disabled || isLocked}
        style={buttonStyle}
        title="Zoom in (+)"
      >
        +
      </button>

      <button
        onClick={onZoomOut}
        disabled={disabled || isLocked}
        style={buttonStyle}
        title="Zoom out (-)"
      >
        −
      </button>

      <button
        onClick={onFitAll}
        disabled={disabled}
        style={buttonStyle}
        title="Fit all data (F)"
      >
        Fit
      </button>

      {hasSelection && (
        <button
          onClick={onZoomToSelection}
          disabled={disabled || isLocked}
          style={buttonStyle}
          title="Zoom to selection"
        >
          Zoom Sel
        </button>
      )}

      <div style={{ width: 1, height: 20, background: '#444', margin: '0 0.25rem' }} />

      <button
        onClick={onToggleLock}
        disabled={disabled}
        style={isLocked ? activeButtonStyle : buttonStyle}
        title="Lock/unlock zoom"
      >
        {isLocked ? '🔒' : '🔓'}
      </button>
    </div>
  );
};
