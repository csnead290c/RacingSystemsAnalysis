/**
 * Admin Portal
 *
 * Tabbed admin interface for user management, capability grants, and audit log.
 * All data fetched from api/admin.php endpoints.
 * Access gated by can('admin.access') on the client AND admin.access on the server.
 */

import { useState, useEffect, useCallback } from 'react';
import { useCapabilities } from '../domain/config/useCapabilities';

// ── Types ───────────────────────────────────────────────────────────────

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  subscription_plan: string | null;
  subscription_status: string | null;
  created_at: string;
}

interface AdminUserDetail {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    products: string[];
    stripe_customer_id: string | null;
    clerk_user_id: string | null;
    subscription_plan: string | null;
    subscription_status: string | null;
    subscription_period_end: string | null;
    created_at: string;
    updated_at: string;
  };
  subscription: {
    plan_id: string;
    status: string;
    price_id: string;
    billing_period: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    stripe_subscription_id: string;
  } | null;
  overrides: {
    id: number;
    capability_key: string;
    source: string;
    granted_by: number | null;
    reason: string | null;
    expires_at: string | null;
    created_at: string;
  }[];
  capabilities: string[];
}

interface AuditEntry {
  id: number;
  actor_user_id: number | null;
  action: string;
  target_user_id: number | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

type Tab = 'search' | 'details' | 'audit' | 'plans';

// ── API helpers ─────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('rsa_token');
}

async function adminFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers as Record<string, string> | undefined),
    },
  });
  let data: any;
  try {
    const text = await res.text();
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned non-JSON response (HTTP ${res.status}). Check server logs.`);
  }
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data as T;
}

// ── Styles ──────────────────────────────────────────────────────────────

const s = {
  page: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '1.5rem',
  } as React.CSSProperties,
  tabs: {
    display: 'flex',
    gap: '0.25rem',
    borderBottom: '2px solid var(--color-border)',
    marginBottom: '1.5rem',
  } as React.CSSProperties,
  tab: (active: boolean) => ({
    padding: '0.5rem 1rem',
    border: 'none',
    borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
    background: 'none',
    color: active ? 'var(--color-primary)' : 'var(--color-muted)',
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
    fontSize: '0.875rem',
    marginBottom: '-2px',
  } as React.CSSProperties),
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem',
    marginBottom: '1rem',
  } as React.CSSProperties,
  input: {
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: '0.875rem',
    width: '100%',
  } as React.CSSProperties,
  btn: (variant: 'primary' | 'danger' | 'muted' = 'primary') => ({
    padding: '0.4rem 0.75rem',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#fff',
    backgroundColor:
      variant === 'danger' ? '#dc2626' : variant === 'muted' ? '#6b7280' : 'var(--color-primary)',
  } as React.CSSProperties),
  badge: (color: string) => ({
    display: 'inline-block',
    padding: '0.15rem 0.5rem',
    borderRadius: '9999px',
    fontSize: '0.7rem',
    fontWeight: 600,
    backgroundColor: color,
    color: '#fff',
  } as React.CSSProperties),
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.8rem',
  } as React.CSSProperties,
  th: {
    textAlign: 'left' as const,
    padding: '0.5rem',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-muted)',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  td: {
    padding: '0.5rem',
    borderBottom: '1px solid var(--color-border)',
    verticalAlign: 'top' as const,
  } as React.CSSProperties,
  muted: { color: 'var(--color-muted)', fontSize: '0.75rem' } as React.CSSProperties,
  error: {
    padding: '0.75rem',
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    border: '1px solid rgba(220, 38, 38, 0.3)',
    borderRadius: 'var(--radius-sm)',
    color: '#dc2626',
    fontSize: '0.8rem',
    marginBottom: '1rem',
  } as React.CSSProperties,
  success: {
    padding: '0.75rem',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: 'var(--radius-sm)',
    color: '#22c55e',
    fontSize: '0.8rem',
    marginBottom: '1rem',
  } as React.CSSProperties,
};

// ── Sub-components ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span style={s.badge('#6b7280')}>none</span>;
  const colors: Record<string, string> = {
    active: '#22c55e',
    trialing: '#3b82f6',
    past_due: '#f59e0b',
    canceled: '#dc2626',
    incomplete: '#6b7280',
  };
  return <span style={s.badge(colors[status] || '#6b7280')}>{status}</span>;
}

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return <span style={s.badge('#6b7280')}>free</span>;
  const colors: Record<string, string> = {
    racer: '#22c55e',
    basic: '#22c55e',
    pro: '#3b82f6',
    team: '#8b5cf6',
  };
  return <span style={s.badge(colors[plan] || '#6b7280')}>{plan}</span>;
}

// ── User Search Tab ─────────────────────────────────────────────────────

function UserSearchTab({ onSelectUser }: { onSelectUser: (id: number) => void }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminFetch<{ users: AdminUser[] }>(
        `/api/admin.php?action=search-users&q=${encodeURIComponent(query)}&limit=25`,
      );
      setUsers(data.users);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    search();
  }, []); // load all on mount

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          style={s.input}
          placeholder="Search by email or name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <button style={s.btn()} onClick={search} disabled={loading}>
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>ID</th>
            <th style={s.th}>Email</th>
            <th style={s.th}>Name</th>
            <th style={s.th}>Role</th>
            <th style={s.th}>Plan</th>
            <th style={s.th}>Status</th>
            <th style={s.th}></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={s.td}>{u.id}</td>
              <td style={s.td}>{u.email}</td>
              <td style={s.td}>{u.name}</td>
              <td style={s.td}>{u.role}</td>
              <td style={s.td}><PlanBadge plan={u.subscription_plan} /></td>
              <td style={s.td}><StatusBadge status={u.subscription_status} /></td>
              <td style={s.td}>
                <button style={s.btn()} onClick={() => onSelectUser(u.id)}>View</button>
              </td>
            </tr>
          ))}
          {users.length === 0 && !loading && (
            <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center' }}>No users found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── User Details Tab ────────────────────────────────────────────────────

function UserDetailsTab({ userId, onBack }: { userId: number; onBack: () => void }) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Grant form state
  const [grantCap, setGrantCap] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [grantDays, setGrantDays] = useState('');

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminFetch<AdminUserDetail>(
        `/api/admin.php?action=user-details&id=${userId}`,
      );
      setDetail(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const handleGrant = async () => {
    if (!grantCap.trim()) return;
    setError('');
    setSuccessMsg('');
    try {
      await adminFetch('/api/admin.php?action=grant-capability', {
        method: 'POST',
        body: JSON.stringify({
          targetUserId: userId,
          capabilityKey: grantCap.trim(),
          reason: grantReason.trim() || undefined,
          expiresInDays: grantDays ? parseInt(grantDays, 10) : undefined,
        }),
      });
      setSuccessMsg(`Granted "${grantCap.trim()}" successfully`);
      setGrantCap('');
      setGrantReason('');
      setGrantDays('');
      fetchDetails();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRevoke = async (capKey: string) => {
    setError('');
    setSuccessMsg('');
    try {
      await adminFetch('/api/admin.php?action=revoke-capability', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: userId, capabilityKey: capKey }),
      });
      setSuccessMsg(`Revoked "${capKey}" successfully`);
      fetchDetails();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <div style={s.muted}>Loading user details...</div>;
  if (!detail) return <div style={s.error}>{error || 'User not found'}</div>;

  const u = detail.user;
  const sub = detail.subscription;

  return (
    <div>
      <button style={{ ...s.btn('muted'), marginBottom: '1rem' }} onClick={onBack}>
        &larr; Back to Search
      </button>

      {error && <div style={s.error}>{error}</div>}
      {successMsg && <div style={s.success}>{successMsg}</div>}

      {/* User Info */}
      <div style={s.card}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>
          {u.name} <span style={s.muted}>#{u.id}</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
          <div><strong>Email:</strong> {u.email}</div>
          <div><strong>Role:</strong> {u.role}</div>
          <div><strong>Clerk ID:</strong> {u.clerk_user_id || <span style={s.muted}>none</span>}</div>
          <div><strong>Created:</strong> {u.created_at}</div>
          <div><strong>Products:</strong> {u.products.length > 0 ? u.products.join(', ') : <span style={s.muted}>none</span>}</div>
          <div><strong>Updated:</strong> {u.updated_at}</div>
        </div>
      </div>

      {/* Subscription */}
      <div style={s.card}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Subscription</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
          <div><strong>Plan:</strong> <PlanBadge plan={sub?.plan_id || u.subscription_plan} /></div>
          <div><strong>Status:</strong> <StatusBadge status={sub?.status || u.subscription_status} /></div>
          <div><strong>Stripe Customer:</strong> {u.stripe_customer_id || <span style={s.muted}>none</span>}</div>
          <div><strong>Period End:</strong> {sub?.current_period_end || u.subscription_period_end || <span style={s.muted}>n/a</span>}</div>
          {sub && (
            <>
              <div><strong>Price ID:</strong> <span style={s.muted}>{sub.price_id || 'n/a'}</span></div>
              <div><strong>Billing:</strong> {sub.billing_period || 'n/a'}</div>
              <div><strong>Stripe Sub ID:</strong> <span style={s.muted}>{sub.stripe_subscription_id}</span></div>
              <div><strong>Cancel at End:</strong> {sub.cancel_at_period_end ? 'Yes' : 'No'}</div>
            </>
          )}
        </div>
      </div>

      {/* Capabilities */}
      <div style={s.card}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>
          Effective Capabilities ({detail.capabilities.length})
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
          {detail.capabilities.map((c) => (
            <span key={c} style={s.badge('#374151')}>{c}</span>
          ))}
        </div>
      </div>

      {/* Overrides */}
      <div style={s.card}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>
          Capability Overrides ({detail.overrides.length})
        </h3>
        {detail.overrides.length > 0 ? (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Capability</th>
                <th style={s.th}>Source</th>
                <th style={s.th}>Reason</th>
                <th style={s.th}>Expires</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {detail.overrides.map((o) => (
                <tr key={o.id}>
                  <td style={s.td}><code>{o.capability_key}</code></td>
                  <td style={s.td}>{o.source}</td>
                  <td style={s.td}>{o.reason || <span style={s.muted}>-</span>}</td>
                  <td style={s.td}>{o.expires_at || <span style={s.muted}>permanent</span>}</td>
                  <td style={s.td}>
                    <button style={s.btn('danger')} onClick={() => handleRevoke(o.capability_key)}>
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={s.muted}>No overrides</div>
        )}

        {/* Grant form */}
        <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.5rem' }}>Grant Capability</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
            <div>
              <label style={s.muted}>Capability Key</label>
              <input
                style={s.input}
                placeholder="e.g. engine.proMode"
                value={grantCap}
                onChange={(e) => setGrantCap(e.target.value)}
              />
            </div>
            <div>
              <label style={s.muted}>Reason (optional)</label>
              <input
                style={s.input}
                placeholder="Beta tester, support ticket..."
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
              />
            </div>
            <div>
              <label style={s.muted}>Days (empty = permanent)</label>
              <input
                style={{ ...s.input, width: '80px' }}
                placeholder="30"
                type="number"
                value={grantDays}
                onChange={(e) => setGrantDays(e.target.value)}
              />
            </div>
          </div>
          <button style={{ ...s.btn(), marginTop: '0.5rem' }} onClick={handleGrant} disabled={!grantCap.trim()}>
            Grant
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Audit Log Tab ───────────────────────────────────────────────────────

function AuditLogTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  const fetchLog = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ action: 'audit-log', limit: '50' });
      if (actionFilter) params.set('action_filter', actionFilter);
      if (userFilter) params.set('user_id', userFilter);
      const data = await adminFetch<{ entries: AuditEntry[] }>(
        `/api/admin.php?${params.toString()}`,
      );
      setEntries(data.entries);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, userFilter]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          style={{ ...s.input, maxWidth: '200px' }}
          placeholder="Filter by action..."
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        />
        <input
          style={{ ...s.input, maxWidth: '120px' }}
          placeholder="User ID..."
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
        />
        <button style={s.btn()} onClick={fetchLog} disabled={loading}>
          {loading ? '...' : 'Filter'}
        </button>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Time</th>
            <th style={s.th}>Action</th>
            <th style={s.th}>Actor</th>
            <th style={s.th}>Target</th>
            <th style={s.th}>Details</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td style={s.td}>
                <span style={s.muted}>{e.created_at}</span>
              </td>
              <td style={s.td}><code style={{ fontSize: '0.75rem' }}>{e.action}</code></td>
              <td style={s.td}>{e.actor_user_id ?? <span style={s.muted}>system</span>}</td>
              <td style={s.td}>{e.target_user_id ?? <span style={s.muted}>-</span>}</td>
              <td style={s.td}>
                {e.metadata ? (
                  <code style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>
                    {JSON.stringify(e.metadata)}
                  </code>
                ) : (
                  <span style={s.muted}>-</span>
                )}
              </td>
            </tr>
          ))}
          {entries.length === 0 && !loading && (
            <tr><td colSpan={5} style={{ ...s.td, textAlign: 'center' }}>No audit entries</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Plan Capabilities Tab ────────────────────────────────────────────────

interface PlanCapsData {
  plans: Record<string, string[]>;
  allCapabilityKeys: string[];
  dbBacked?: boolean;
}

const RESERVED_CAPS = ['admin.access', 'admin.devTools', 'admin.userManagement'];

const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280', basic: '#22c55e', pro: '#3b82f6', team: '#8b5cf6',
};

function PlanCapabilitiesTab({ canMutate }: { canMutate: boolean }) {
  const [data, setData] = useState<PlanCapsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('free');
  const [editCaps, setEditCaps] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await adminFetch<PlanCapsData>(
        '/api/admin.php?action=get-plan-capabilities',
      );
      setData(d);
      setEditCaps(new Set(d.plans[selectedPlan] || []));
      setDirty(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPlan]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (data) {
      setEditCaps(new Set(data.plans[selectedPlan] || []));
      setDirty(false);
    }
  }, [selectedPlan, data]);

  const toggleCap = (cap: string) => {
    if (!effectiveCanMutate) return;
    setEditCaps((prev) => {
      const next = new Set(prev);
      if (next.has(cap)) next.delete(cap);
      else next.add(cap);
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setConfirmOpen(false);
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      await adminFetch('/api/admin.php?action=set-plan-capabilities', {
        method: 'POST',
        body: JSON.stringify({
          planId: selectedPlan,
          capabilities: [...editCaps].sort(),
          reason: reason.trim() || undefined,
        }),
      });
      setSuccessMsg(`Updated "${selectedPlan}" plan capabilities successfully`);
      setReason('');
      fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const originalCaps = new Set(data?.plans[selectedPlan] || []);
  const added = [...editCaps].filter((c) => !originalCaps.has(c));
  const removed = [...originalCaps].filter((c) => !editCaps.has(c));

  if (loading && !data) return <div style={s.muted}>Loading plan capabilities...</div>;
  if (!data && error) return (
    <div>
      <div style={s.error}>{error}</div>
      <button style={s.btn()} onClick={fetchData}>Retry</button>
    </div>
  );

  const effectiveCanMutate = canMutate && (data?.dbBacked ?? false);
  const allKeys = data?.allCapabilityKeys || [];

  // Group capabilities by prefix for organized display
  const groups = new Map<string, string[]>();
  for (const key of allKeys) {
    if (RESERVED_CAPS.includes(key)) continue; // skip admin caps
    const prefix = key.split('.').slice(0, -1).join('.') || key;
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push(key);
  }

  return (
    <div>
      {error && <div style={s.error}>{error}</div>}
      {successMsg && <div style={s.success}>{successMsg}</div>}

      {!effectiveCanMutate && (
        <div style={{
          ...s.error,
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          borderColor: 'rgba(251, 191, 36, 0.3)',
          color: '#d97706',
        }}>
          {!(data?.dbBacked)
            ? <>Read-only — run <code>php api/migrate-v4-plan-capabilities.php</code> to enable editing.</>
            : <>Read-only — you need <code>admin.userManagement</code> to edit plan capabilities.</>
          }
        </div>
      )}

      {/* Plan selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['free', 'basic', 'pro', 'team'].map((pid) => (
          <button
            key={pid}
            onClick={() => setSelectedPlan(pid)}
            style={{
              padding: '0.4rem 1rem',
              border: selectedPlan === pid ? `2px solid ${PLAN_COLORS[pid]}` : '2px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              background: selectedPlan === pid ? PLAN_COLORS[pid] : 'transparent',
              color: selectedPlan === pid ? '#fff' : 'var(--color-text)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: selectedPlan === pid ? 700 : 400,
            }}
          >
            {pid.charAt(0).toUpperCase() + pid.slice(1)}
            <span style={{ marginLeft: '0.4rem', opacity: 0.7, fontSize: '0.75rem' }}>
              ({data?.plans[pid]?.length ?? 0})
            </span>
          </button>
        ))}
      </div>

      {/* Capability grid */}
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>
            <span style={s.badge(PLAN_COLORS[selectedPlan] || '#6b7280')}>{selectedPlan}</span>
            {' '}Capabilities ({editCaps.size})
          </h3>
          {dirty && (
            <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
              Unsaved changes: +{added.length} / -{removed.length}
            </span>
          )}
        </div>

        {Array.from(groups.entries()).map(([prefix, keys]) => (
          <div key={prefix} style={{ marginBottom: '0.75rem' }}>
            <div style={{
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
              color: 'var(--color-muted)', letterSpacing: '0.04em', marginBottom: '0.25rem',
            }}>
              {prefix}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {keys.map((cap) => {
                const active = editCaps.has(cap);
                const wasAdded = added.includes(cap);
                const wasRemoved = removed.includes(cap);
                return (
                  <button
                    key={cap}
                    onClick={() => toggleCap(cap)}
                    disabled={!effectiveCanMutate}
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.72rem',
                      border: wasAdded ? '1px solid #22c55e' : wasRemoved ? '1px solid #dc2626' : '1px solid var(--color-border)',
                      borderRadius: '9999px',
                      background: active ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      color: active ? 'var(--color-text)' : 'var(--color-muted)',
                      cursor: effectiveCanMutate ? 'pointer' : 'default',
                      fontWeight: active ? 600 : 400,
                      opacity: effectiveCanMutate ? 1 : 0.7,
                    }}
                  >
                    {active ? '✓ ' : ''}{cap.split('.').pop()}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Save bar */}
      {effectiveCanMutate && dirty && (
        <div style={{
          display: 'flex', gap: '0.5rem', alignItems: 'center',
          padding: '0.75rem', backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
        }}>
          <button
            style={s.btn()}
            onClick={() => setConfirmOpen(true)}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            style={s.btn('muted')}
            onClick={() => {
              setEditCaps(new Set(data?.plans[selectedPlan] || []));
              setDirty(false);
            }}
          >
            Discard
          </button>
          <span style={s.muted}>
            {added.length > 0 && <span style={{ color: '#22c55e' }}>+{added.join(', ')}</span>}
            {added.length > 0 && removed.length > 0 && ' | '}
            {removed.length > 0 && <span style={{ color: '#dc2626' }}>-{removed.join(', ')}</span>}
          </span>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)',
            padding: '1.5rem', maxWidth: '480px', width: '90%',
            border: '1px solid var(--color-border)',
          }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>
              Confirm Plan Changes
            </h3>
            <div style={{ fontSize: '0.82rem', marginBottom: '0.75rem' }}>
              Updating <strong>{selectedPlan}</strong> plan:
              {added.length > 0 && (
                <div style={{ color: '#22c55e', marginTop: '0.25rem' }}>
                  + Adding: {added.join(', ')}
                </div>
              )}
              {removed.length > 0 && (
                <div style={{ color: '#dc2626', marginTop: '0.25rem' }}>
                  − Removing: {removed.join(', ')}
                </div>
              )}
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={s.muted}>Reason (optional)</label>
              <input
                style={s.input}
                placeholder="Why are you making this change?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button style={s.btn('muted')} onClick={() => setConfirmOpen(false)}>
                Cancel
              </button>
              <button style={s.btn('danger')} onClick={handleSave}>
                Confirm &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────

export default function AdminPortal() {
  const { can } = useCapabilities();
  const [tab, setTab] = useState<Tab>('search');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Client-side gate (server also enforces)
  if (!can('admin.access' as any)) {
    return (
      <div style={s.page}>
        <div style={s.error}>
          <strong>Access Denied</strong> — Admin access required.
        </div>
      </div>
    );
  }

  const handleSelectUser = (id: number) => {
    setSelectedUserId(id);
    setTab('details');
  };

  const handleBackToSearch = () => {
    setSelectedUserId(null);
    setTab('search');
  };

  return (
    <div style={s.page}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Admin Portal</h1>
      <p style={{ ...s.muted, marginBottom: '1rem' }}>
        User management, capability grants, and audit log.
      </p>

      {/* Tabs */}
      <div style={s.tabs}>
        <button style={s.tab(tab === 'search')} onClick={() => setTab('search')}>
          Users
        </button>
        <button
          style={s.tab(tab === 'details')}
          onClick={() => selectedUserId && setTab('details')}
          disabled={!selectedUserId}
        >
          User Details{selectedUserId ? ` (#${selectedUserId})` : ''}
        </button>
        <button style={s.tab(tab === 'audit')} onClick={() => setTab('audit')}>
          Audit Log
        </button>
        <button style={s.tab(tab === 'plans')} onClick={() => setTab('plans')}>
          Plans
        </button>
      </div>

      {/* Tab content */}
      {tab === 'search' && <UserSearchTab onSelectUser={handleSelectUser} />}
      {tab === 'details' && selectedUserId && (
        <UserDetailsTab userId={selectedUserId} onBack={handleBackToSearch} />
      )}
      {tab === 'audit' && <AuditLogTab />}
      {tab === 'plans' && <PlanCapabilitiesTab canMutate={can('admin.userManagement' as any)} />}
    </div>
  );
}
