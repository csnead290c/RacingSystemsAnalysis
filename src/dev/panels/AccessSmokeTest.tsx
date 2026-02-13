/**
 * Access Smoke Test Panel
 *
 * Quick-verification panel that shows the current effective access state
 * across all three access-control systems. Useful for confirming that
 * View As overrides are working correctly.
 *
 * Includes:
 * - Mismatch banner when legacy/capability/subscription disagree
 * - Sim gate table with per-row mismatch indicators
 * - Guided checklist with expected route visibility + clickable "Open" links
 */

import { Link } from 'react-router-dom';
import { useSimAccessDiagnostics, type SimGateDiag } from '../../domain/config/guards';
import { useCapabilities } from '../../domain/config/useCapabilities';
import { useSubscription } from '../../domain/config/useSubscription';
import { useAuth } from '../../domain/auth';
import { getExpectedRoutes, hasAnyMismatch } from '../../domain/config/viewAsPresets';

// ── Styles ───────────────────────────────────────────────────────────

const s = {
  container: { padding: '1rem' } as React.CSSProperties,
  section: {
    marginBottom: '1.25rem',
    padding: '0.75rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-surface)',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '0.8rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    color: 'var(--color-muted)',
    marginBottom: '0.5rem',
  } as React.CSSProperties,
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.3rem 0',
    fontSize: '0.82rem',
    borderBottom: '1px solid var(--color-border)',
  } as React.CSSProperties,
  label: { color: 'var(--color-text)' } as React.CSSProperties,
  pass: { color: '#22c55e', fontWeight: 600 } as React.CSSProperties,
  fail: { color: '#ef4444', fontWeight: 600 } as React.CSSProperties,
  muted: { color: 'var(--color-muted)', fontSize: '0.75rem' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.8rem' } as React.CSSProperties,
  th: {
    textAlign: 'left' as const,
    padding: '0.3rem 0.4rem',
    borderBottom: '2px solid var(--color-border)',
    color: 'var(--color-muted)',
    fontWeight: 600,
    fontSize: '0.72rem',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  td: {
    padding: '0.3rem 0.4rem',
    borderBottom: '1px solid var(--color-border)',
  } as React.CSSProperties,
  banner: {
    padding: '0.6rem 1rem',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '2px solid #ef4444',
    borderRadius: 'var(--radius-md)',
    color: '#ef4444',
    fontWeight: 700,
    fontSize: '0.82rem',
    marginBottom: '1rem',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  openLink: {
    fontSize: '0.72rem',
    color: 'var(--color-primary)',
    textDecoration: 'underline',
    cursor: 'pointer',
  } as React.CSSProperties,
};

function Dot({ ok }: { ok: boolean }) {
  return <span style={ok ? s.pass : s.fail}>{ok ? '✅' : '❌'}</span>;
}

function Badge({ value }: { value: boolean }) {
  return <span style={value ? s.pass : s.fail}>{value ? '✅ true' : '❌ false'}</span>;
}

// ── Sim gate table row ───────────────────────────────────────────────

function GateRow({ label, pages, diag }: { label: string; pages: string; diag: SimGateDiag }) {
  const mismatch = !(diag.legacy === diag.capability && diag.capability === diag.subscription);
  return (
    <tr style={mismatch ? { backgroundColor: 'rgba(239, 68, 68, 0.08)' } : undefined}>
      <td style={s.td}>
        <strong>{label}</strong>
        <br />
        <span style={s.muted}>{pages}</span>
        {mismatch && (
          <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.7rem', marginTop: '2px' }}>
            ⚠ MISMATCH
          </div>
        )}
      </td>
      <td style={{ ...s.td, textAlign: 'center' }}><Dot ok={diag.legacy} /></td>
      <td style={{ ...s.td, textAlign: 'center' }}><Dot ok={diag.capability} /></td>
      <td style={{ ...s.td, textAlign: 'center' }}><Dot ok={diag.subscription} /></td>
      <td style={{ ...s.td, textAlign: 'center' }}>
        <span style={diag.allowed ? s.pass : s.fail}>
          {diag.allowed ? 'ALLOW' : 'BLOCK'}
        </span>
      </td>
    </tr>
  );
}

// ── Component ────────────────────────────────────────────────────────

// ── Capability-only check row ────────────────────────────────────────

const CAP_ONLY_CHECKS = [
  { cap: 'engine.proMode',        label: 'Engine Pro Mode',       desc: 'Advanced engine sim worksheets' },
  { cap: 'library.install.engine', label: 'Install Engine',       desc: 'Install from shared library' },
  { cap: 'library.install.clutch', label: 'Install Clutch',       desc: 'Install from shared library' },
  { cap: 'library.install.fourLink', label: 'Install Four-Link',  desc: 'Install from shared library' },
  { cap: 'library.save.engine',   label: 'Save Engine',           desc: 'Save to personal library' },
  { cap: 'library.save.clutch',   label: 'Save Clutch',           desc: 'Save to personal library' },
  { cap: 'library.save.fourLink', label: 'Save Four-Link',        desc: 'Save to personal library' },
] as const;

export default function AccessSmokeTest() {
  const { plan, role, isOverrideActive, can } = useCapabilities();
  const { tier, features } = useSubscription();
  const { user } = useAuth();
  const diags = useSimAccessDiagnostics();

  const mismatchDetected = hasAnyMismatch(diags);
  const expectedRoutes = getExpectedRoutes(diags);
  const allowedRoutes = expectedRoutes.filter((r) => r.expected === 'ALLOW');
  const blockedRoutes = expectedRoutes.filter((r) => r.expected === 'BLOCK');

  return (
    <div style={s.container}>
      {/* Mismatch banner */}
      {mismatchDetected && (
        <div style={s.banner}>
          ⚠ Access systems disagree — do not trust results until fixed.
        </div>
      )}

      <p style={s.muted}>
        Shows the effective access state across all three systems.
        Change View As to verify overrides propagate instantly.
      </p>

      {/* Identity */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Current Identity</div>
        <div style={s.row}>
          <span style={s.label}>Real user</span>
          <span>{user?.email ?? '(none)'} / {user?.roleId ?? '?'}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Effective plan</span>
          <span>{plan}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Effective role</span>
          <span>{role}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Subscription tier</span>
          <span>{tier}</span>
        </div>
        <div style={{ ...s.row, borderBottom: 'none' }}>
          <span style={s.label}>View As override active</span>
          <Badge value={isOverrideActive} />
        </div>
      </div>

      {/* Sim page gates — compact table */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Sim Page Gates</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Gate</th>
              <th style={{ ...s.th, textAlign: 'center' }}>Legacy</th>
              <th style={{ ...s.th, textAlign: 'center' }}>Cap</th>
              <th style={{ ...s.th, textAlign: 'center' }}>Sub</th>
              <th style={{ ...s.th, textAlign: 'center' }}>Verdict</th>
            </tr>
          </thead>
          <tbody>
            <GateRow label="ET Sim" pages="/et-sim, /predict" diag={diags.etSim} />
            <GateRow label="Race Tools" pages="/race-day, /dial-in, /opponents, /ladder, /tech-card, /import" diag={diags.raceTools} />
            <GateRow label="Run Logging" pages="/log, /history" diag={diags.runLogging} />
            <GateRow label="Vehicles" pages="/vehicles" diag={diags.vehicles} />
          </tbody>
        </table>
      </div>

      {/* Capability-only checks */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Capability-Only Checks</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Capability</th>
              <th style={{ ...s.th, textAlign: 'center' }}>Verdict</th>
            </tr>
          </thead>
          <tbody>
            {CAP_ONLY_CHECKS.map((c) => {
              const allowed = can(c.cap as Parameters<typeof can>[0]);
              return (
                <tr key={c.cap}>
                  <td style={s.td}>
                    <strong>{c.label}</strong>
                    <br />
                    <span style={s.muted}>{c.cap} — {c.desc}</span>
                  </td>
                  <td style={{ ...s.td, textAlign: 'center' }}>
                    <span style={allowed ? s.pass : s.fail}>
                      {allowed ? 'ALLOW' : 'BLOCK'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Guided checklist */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Route Checklist</div>
        <p style={{ ...s.muted, marginBottom: '0.5rem' }}>
          Click "Open" to navigate and verify the expected behavior.
        </p>

        {allowedRoutes.length > 0 && (
          <>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#22c55e', marginBottom: '0.25rem' }}>
              Should be VISIBLE ({allowedRoutes.length})
            </div>
            {allowedRoutes.map((r) => (
              <div key={r.path} style={{ ...s.row, borderBottom: '1px solid var(--color-border)' }}>
                <span>
                  <span style={{ fontWeight: 600 }}>{r.label}</span>
                  <span style={s.muted}> {r.path}</span>
                  {r.note && <span style={{ ...s.muted, fontStyle: 'italic' }}> — {r.note}</span>}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={s.pass}>ALLOW</span>
                  <Link to={r.path} style={s.openLink}>Open</Link>
                </span>
              </div>
            ))}
          </>
        )}

        {blockedRoutes.length > 0 && (
          <>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', marginTop: '0.75rem', marginBottom: '0.25rem' }}>
              Should be HIDDEN / BLOCKED ({blockedRoutes.length})
            </div>
            {blockedRoutes.map((r) => (
              <div key={r.path} style={{ ...s.row, borderBottom: '1px solid var(--color-border)' }}>
                <span>
                  <span style={{ fontWeight: 600 }}>{r.label}</span>
                  <span style={s.muted}> {r.path}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={s.fail}>BLOCK</span>
                  <Link to={r.path} style={s.openLink}>Open</Link>
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Subscription features snapshot */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Subscription Features (tier: {tier})</div>
        {(Object.keys(features) as Array<keyof typeof features>).map((key) => (
          <div key={key} style={s.row}>
            <span style={s.label}>{key}</span>
            <Badge value={features[key]} />
          </div>
        ))}
      </div>
    </div>
  );
}
