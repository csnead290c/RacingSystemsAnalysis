/**
 * Danger Zone Panel
 *
 * Contains destructive actions that require typed confirmation.
 * Only visible to owners (or in DEV mode).
 */

import { useState } from 'react';
import { useAuth } from '../../domain/auth';

// ── Styles ───────────────────────────────────────────────────────────

const s = {
  container: { padding: '1rem' } as React.CSSProperties,
  warning: {
    padding: '1rem',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1.5rem',
    fontSize: '0.82rem',
    lineHeight: 1.6,
    color: 'var(--color-text)',
  } as React.CSSProperties,
  section: {
    padding: '1rem',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1rem',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
    color: '#ef4444',
  } as React.CSSProperties,
  description: {
    fontSize: '0.78rem',
    color: 'var(--color-muted)',
    marginBottom: '0.75rem',
    lineHeight: 1.5,
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    fontSize: '0.82rem',
    marginBottom: '0.5rem',
    fontFamily: 'monospace',
  } as React.CSSProperties,
  btn: {
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: 600,
  } as React.CSSProperties,
  btnDanger: {
    backgroundColor: '#ef4444',
    color: 'white',
  } as React.CSSProperties,
  btnDisabled: {
    backgroundColor: '#6b7280',
    color: '#d1d5db',
    cursor: 'not-allowed',
  } as React.CSSProperties,
  muted: {
    color: 'var(--color-muted)',
    fontSize: '0.72rem',
  } as React.CSSProperties,
};

// ── Confirmation phrase ──────────────────────────────────────────────

const RESET_AUTH_PHRASE = 'RESET AUTH DATA';

// ── Component ────────────────────────────────────────────────────────

export default function DangerZone() {
  const auth = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [resetDone, setResetDone] = useState(false);

  const canReset = confirmText === RESET_AUTH_PHRASE;

  const handleResetAuth = () => {
    if (!canReset) return;
    auth.resetAuthData();
    setResetDone(true);
    setConfirmText('');
    // Reload after a short delay so user sees the confirmation
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <div style={s.container}>
      <div style={s.warning}>
        <strong>⚠️ Danger Zone</strong>
        <br />
        Actions on this page are <strong>destructive and irreversible</strong>.
        Each action requires typing a confirmation phrase before the button is enabled.
      </div>

      {/* Reset All Auth Data */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Reset All Auth Data</div>
        <div style={s.description}>
          Wipes all authentication data from localStorage: current user session, user database,
          roles, and products. Resets everything to factory defaults and reloads the page.
          <br />
          <strong>This cannot be undone.</strong> API-side user data is not affected.
        </div>

        {resetDone ? (
          <div style={{ color: '#22c55e', fontWeight: 600, fontSize: '0.82rem' }}>
            ✅ Auth data reset. Reloading…
          </div>
        ) : (
          <>
            <label style={s.muted}>
              Type <code style={{ fontWeight: 600 }}>{RESET_AUTH_PHRASE}</code> to confirm:
            </label>
            <input
              style={s.input}
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={RESET_AUTH_PHRASE}
              spellCheck={false}
              autoComplete="off"
            />
            <button
              onClick={handleResetAuth}
              disabled={!canReset}
              style={{
                ...s.btn,
                ...(canReset ? s.btnDanger : s.btnDisabled),
              }}
            >
              Reset All Auth Data
            </button>
          </>
        )}
      </div>
    </div>
  );
}
