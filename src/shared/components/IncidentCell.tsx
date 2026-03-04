/**
 * IncidentCell — shared table cell for incident icon + badge.
 *
 * Renders:
 *   count == 0 && canCreate  → ＋ (add) button
 *   count > 0                → ⚠️ N badge button
 *   otherwise                → nothing
 *
 * Clicking opens the IncidentDrawer in the parent via onClick.
 */

import React from 'react';

export interface IncidentCellProps {
  count: number;
  canCreate: boolean;
  onClick: () => void;
}

const S_BADGE: React.CSSProperties = {
  position: 'absolute',
  top: -4,
  right: -6,
  minWidth: 14,
  height: 14,
  borderRadius: 7,
  background: '#f59e0b',
  color: '#fff',
  fontSize: '0.55rem',
  fontWeight: 700,
  lineHeight: '14px',
  textAlign: 'center',
  padding: '0 3px',
  pointerEvents: 'none',
};

const S_WRAP: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const S_BTN: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
};

export default function IncidentCell({ count, canCreate, onClick }: IncidentCellProps) {
  if (count > 0) {
    return (
      <span style={S_WRAP}>
        <button
          style={{ ...S_BTN, fontSize: '0.85rem' }}
          title={`${count} incident(s)`}
          onClick={onClick}
          data-testid="incident-icon"
        >
          ⚠️
        </button>
        <span style={S_BADGE} data-testid="incident-badge">{count}</span>
      </span>
    );
  }

  if (canCreate) {
    return (
      <button
        style={{ ...S_BTN, fontSize: '0.7rem', color: 'var(--color-muted, #666)' }}
        onClick={onClick}
        title="Add incident"
        data-testid="incident-add-icon"
      >
        ＋
      </button>
    );
  }

  return null;
}
