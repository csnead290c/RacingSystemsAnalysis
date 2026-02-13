/**
 * Audit Snapshot Panel
 *
 * Lightweight dev panel showing current access state and a link to SITE_AUDIT.md.
 * Displays plan/role/tier, the 4 main access gates, and route counts.
 */

import { useCapabilities } from '../../domain/config/useCapabilities';
import { useSubscription } from '../../domain/config/useSubscription';
import { useAuth } from '../../domain/auth';
import { useAccessDiagnostics } from '../../domain/config/guards';

// ── Styles ───────────────────────────────────────────────────────────

const s = {
  container: { fontSize: '0.85rem', lineHeight: 1.5 } as const,
  section: {
    marginBottom: '1rem',
    padding: '0.75rem',
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
  } as const,
  sectionTitle: {
    fontWeight: 700,
    marginBottom: '0.5rem',
    fontSize: '0.8rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: 'var(--color-muted)',
  } as const,
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.25rem 0',
    borderBottom: '1px solid var(--color-border)',
  } as const,
  label: { color: 'var(--color-muted)' } as const,
  badge: (ok: boolean) => ({
    display: 'inline-block',
    padding: '0 0.4rem',
    borderRadius: '3px',
    fontSize: '0.75rem',
    fontWeight: 600,
    backgroundColor: ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
    color: ok ? '#16a34a' : '#dc2626',
  }) as const,
  link: {
    display: 'inline-block',
    marginTop: '0.5rem',
    padding: '0.4rem 0.75rem',
    backgroundColor: 'var(--color-primary, #3b82f6)',
    color: '#fff',
    borderRadius: 'var(--radius-sm)',
    textDecoration: 'none',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  } as const,
  muted: { color: 'var(--color-muted)', fontSize: '0.8rem' } as const,
};

// ── Gate summary row ─────────────────────────────────────────────────

function GateRow({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <div style={s.row}>
      <span>{label}</span>
      <span style={s.badge(allowed)}>{allowed ? 'ALLOW' : 'BLOCK'}</span>
    </div>
  );
}

// ── Route counts (static, matches SITE_AUDIT.md) ────────────────────

const ROUTE_COUNTS = {
  total: 34,
  public: 7,
  loginOnly: 11,
  featureGated: 11,
  productGated: 4,
  roleGated: 1,
};

// ── Component ────────────────────────────────────────────────────────

export default function AuditSnapshot() {
  const { plan, role, isOverrideActive } = useCapabilities();
  const { tier } = useSubscription();
  const { user } = useAuth();
  const diags = useAccessDiagnostics();

  return (
    <div style={s.container}>
      <p style={s.muted}>
        Quick view of current access state and site health.
        See <code>src/dev/SITE_AUDIT.md</code> for the full audit.
      </p>

      {/* Identity */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Current Identity</div>
        <div style={s.row}>
          <span style={s.label}>User</span>
          <span>{user?.email ?? '(none)'}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Plan / Role</span>
          <span>{plan} / {role}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Subscription tier</span>
          <span>{tier}</span>
        </div>
        <div style={{ ...s.row, borderBottom: 'none' }}>
          <span style={s.label}>View As active</span>
          <span style={s.badge(isOverrideActive)}>{isOverrideActive ? 'YES' : 'NO'}</span>
        </div>
      </div>

      {/* Access gates */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Access Gates</div>
        <GateRow label="ET Sim (et_sim)" allowed={diags.etSim.allowed} />
        <GateRow label="Race Tools (race_tools)" allowed={diags.raceTools.allowed} />
        <GateRow label="Run Logging (run_logging)" allowed={diags.runLogging.allowed} />
        <GateRow label="Vehicles (save_vehicles)" allowed={diags.vehicles.allowed} />
      </div>

      {/* Route inventory summary */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Route Inventory</div>
        <div style={s.row}>
          <span style={s.label}>Total routes</span>
          <span>{ROUTE_COUNTS.total}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Public</span>
          <span>{ROUTE_COUNTS.public}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Login-only</span>
          <span>{ROUTE_COUNTS.loginOnly}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Feature-gated</span>
          <span>{ROUTE_COUNTS.featureGated}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Product-gated</span>
          <span>{ROUTE_COUNTS.productGated}</span>
        </div>
        <div style={{ ...s.row, borderBottom: 'none' }}>
          <span style={s.label}>Role-gated</span>
          <span>{ROUTE_COUNTS.roleGated}</span>
        </div>
      </div>

      {/* Audit doc link */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Audit Document</div>
        <p style={{ ...s.muted, margin: '0 0 0.5rem 0' }}>
          Full site audit with tier contract, architecture snapshot, and 90-day backlog.
        </p>
        <code style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>
          src/dev/SITE_AUDIT.md
        </code>
        <p style={{ ...s.muted, margin: '0 0 0.25rem 0' }}>
          Refresh route table:
        </p>
        <code style={{ fontSize: '0.75rem', display: 'block' }}>
          npx tsx src/dev/scripts/scanRoutes.ts
        </code>
      </div>
    </div>
  );
}
