/**
 * Plans & Capabilities Panel
 *
 * Dev Portal panel showing:
 * - Current user's resolved plan, role, trial state, and effective capabilities
 * - All plans with their granted capabilities
 * - All roles with their permissions
 */

import {
  PLANS,
  PLAN_IDS,
  ROLES,
  ROLE_IDS,
  CAPABILITY_KEYS,
  PLAN_CAPABILITIES,
  ROLE_CAPABILITIES,
  type PlanId,
  type RoleId,
  type Capability,
} from '../../domain/config/capabilities';
import { useCapabilities } from '../../domain/config/useCapabilities';

// ── Styles ───────────────────────────────────────────────────────────

const s = {
  container: { padding: '1rem' } as React.CSSProperties,
  section: { marginBottom: '1.5rem' } as React.CSSProperties,
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: 'var(--color-muted)',
    marginBottom: '0.75rem',
  } as React.CSSProperties,
  card: {
    backgroundColor: 'var(--color-background)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  } as React.CSSProperties,
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.6rem 1rem',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.82rem',
  } as React.CSSProperties,
  badge: {
    padding: '0.2rem 0.5rem',
    borderRadius: '9999px',
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'white',
  } as React.CSSProperties,
  capGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
    gap: '0.35rem',
    padding: '0.5rem 1rem',
  } as React.CSSProperties,
  capItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.72rem',
    padding: '0.15rem 0',
  } as React.CSSProperties,
  dot: (active: boolean) => ({
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: active ? '#22c55e' : 'var(--color-border)',
    flexShrink: 0,
  }) as React.CSSProperties,
  infoBox: {
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.78rem',
    lineHeight: 1.5,
    marginBottom: '1rem',
  } as React.CSSProperties,
  label: {
    fontWeight: 600,
    marginRight: '0.35rem',
  } as React.CSSProperties,
  muted: {
    color: 'var(--color-muted)',
    fontSize: '0.72rem',
  } as React.CSSProperties,
};

// ── Helpers ──────────────────────────────────────────────────────────

function CapabilityDots({ caps, highlight }: { caps: ReadonlySet<Capability>; highlight?: Set<Capability> }) {
  return (
    <div style={s.capGrid}>
      {CAPABILITY_KEYS.map(cap => {
        const active = caps.has(cap);
        const isHighlighted = highlight?.has(cap);
        return (
          <div key={cap} style={{ ...s.capItem, opacity: active ? 1 : 0.35, fontWeight: isHighlighted ? 600 : 400 }}>
            <div style={s.dot(active)} />
            <span>{cap}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────

export default function PlansCapabilities() {
  const { plan, role, trial, ctx, capabilities, canInstall } = useCapabilities();
  const effectiveSet = new Set(capabilities);

  return (
    <div style={s.container}>
      {/* Current User Context */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Current User</div>
        <div style={s.infoBox}>
          <div>
            <span style={s.label}>Base Plan:</span>
            <span style={{ ...s.badge, backgroundColor: PLANS[plan].color }}>{PLANS[plan].name}</span>
            <span style={{ ...s.muted, marginLeft: '0.5rem' }}>{PLANS[plan].price}</span>
          </div>
          <div style={{ marginTop: '0.35rem' }}>
            <span style={s.label}>Trial:</span>
            {trial.active ? (
              <span style={{ ...s.badge, backgroundColor: '#f59e0b' }}>
                Active (target: {PLANS[trial.targetPlan].name})
              </span>
            ) : (
              <span style={s.muted}>None</span>
            )}
          </div>
          <div style={{ marginTop: '0.35rem' }}>
            <span style={s.label}>Role:</span>
            <span style={{ ...s.badge, backgroundColor: ROLES[role].color }}>{ROLES[role].name}</span>
            <span style={{ ...s.muted, marginLeft: '0.5rem' }}>{ROLES[role].description}</span>
          </div>
          <div style={{ marginTop: '0.35rem' }}>
            <span style={s.label}>Full Access:</span>
            <span>{ctx.fullAccess ? '✅ Yes' : '❌ No'}</span>
          </div>
          <div style={{ marginTop: '0.35rem' }}>
            <span style={s.label}>Can Install Components:</span>
            <span>{canInstall ? '✅ Yes' : '❌ No (Pro/Team required)'}</span>
          </div>
          <div style={{ marginTop: '0.35rem' }}>
            <span style={s.label}>Effective Capabilities:</span>
            <span>{capabilities.length} / {CAPABILITY_KEYS.length}</span>
          </div>
        </div>
        <CapabilityDots caps={effectiveSet} />
      </div>

      {/* Plans */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Plans (Subscription Tiers)</div>
        <div style={s.card}>
          {PLAN_IDS.map((pid: PlanId) => {
            const p = PLANS[pid];
            const caps = PLAN_CAPABILITIES[pid];
            return (
              <div key={pid}>
                <div style={s.row}>
                  <span style={{ ...s.badge, backgroundColor: p.color }}>{p.name}</span>
                  <span style={{ flex: 1, fontSize: '0.78rem' }}>{p.description}</span>
                  <span style={s.muted}>{p.price}</span>
                  <span style={s.muted}>{caps.size} caps</span>
                </div>
                <CapabilityDots caps={caps} highlight={effectiveSet} />
              </div>
            );
          })}
        </div>
        <div style={{ ...s.muted, marginTop: '0.5rem', padding: '0 0.25rem' }}>
          Trial is not a plan — it temporarily overlays a target plan's capabilities on top of the base plan.
        </div>
      </div>

      {/* Roles */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Roles (Account/Team Scoped)</div>
        <div style={s.card}>
          {ROLE_IDS.map((rid: RoleId) => {
            const r = ROLES[rid];
            const caps = ROLE_CAPABILITIES[rid];
            return (
              <div key={rid} style={s.row}>
                <span style={{ ...s.badge, backgroundColor: r.color }}>{r.name}</span>
                <span style={{ flex: 1, fontSize: '0.78rem' }}>{r.description}</span>
                <span style={s.muted}>
                  {r.canManageUsers ? '👥 Manage users' : ''}
                  {r.canManageRoles ? ' 🎭 Manage roles' : ''}
                  {r.canManageBilling ? ' 💳 Billing' : ''}
                </span>
                <span style={s.muted}>{caps.size > 0 ? `+${caps.size} extra caps` : 'Plan caps only'}</span>
              </div>
            );
          })}
        </div>
        <div style={{ ...s.muted, marginTop: '0.5rem', padding: '0 0.25rem' }}>
          Roles grant account/team permissions (manage users, billing). Product capabilities come from the Plan.
          Owner and Admin roles also grant admin.devTools and admin.userManagement capabilities.
        </div>
      </div>
    </div>
  );
}
