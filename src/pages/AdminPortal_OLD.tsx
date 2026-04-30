/**
 * Admin Portal
 *
 * Tabbed admin interface for user management, capability grants, and audit log.
 * All data fetched from api/admin.php endpoints.
 * Access gated by can('admin.access') on the client AND admin.access on the server.
 */

import React, { useState, useEffect, useCallback } from 'react';
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

type Tab = 'search' | 'details' | 'audit' | 'plans' | 'dbFootprint';

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
    nhra: '#dc2626',
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
  free: '#6b7280', basic: '#22c55e', pro: '#3b82f6', team: '#8b5cf6', nhra: '#dc2626',
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
        {['free', 'basic', 'pro', 'team', 'nhra'].map((pid) => (
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

// ── DB Footprint Tab ─────────────────────────────────────────────────────

interface DbSummary {
  total_data_bytes: number;
  total_index_bytes: number;
  total_bytes: number;
  total_free_bytes: number;
  table_count: number;
}

interface DbTable {
  table_name: string;
  row_count_estimate: number;
  data_bytes: number;
  index_bytes: number;
  total_bytes: number;
  data_free_bytes: number;
  avg_row_bytes: number;
  engine: string;
  collation: string;
  created_at: string | null;
  updated_at: string | null;
}

interface DbLargeColumn {
  table_name: string;
  column_name: string;
  data_type: string;
  max_length: number | null;
  is_nullable: string;
}

interface DbColumnSize {
  table_name: string;
  column_name: string;
  avg_bytes: number;
  max_bytes: number;
  min_bytes: number;
  row_count: number;
  non_empty_count: number;
  error?: string;
}

interface DbIndex {
  table_name: string;
  index_name: string;
  non_unique: number;
  columns: string;
  index_type: string;
}

interface DbRedundant {
  table_name: string;
  redundant_index: string;
  redundant_cols: string;
  covered_by_index: string;
  covered_by_cols: string;
}

interface DbSnapshot {
  id: number;
  captured_at: string;
  total_mb: string;
  data_mb: string;
  index_mb: string;
  table_count: number;
  top_table_1_name: string | null;
  top_table_1_mb: string | null;
  top_table_2_name: string | null;
  top_table_2_mb: string | null;
}

interface DbFootprintData {
  database: string;
  summary: DbSummary;
  tables: DbTable[];
  largeColumns: DbLargeColumn[];
  columnSizeDetails: DbColumnSize[];
  indexes: DbIndex[];
  redundantIndexes: DbRedundant[];
  hostLimitMb: number;
  generatedAt: string;
  latestSnapshot: DbSnapshot | null;
  snapshotHistory: DbSnapshot[];
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function fmtRows(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function pctBar(value: number, max: number, color: string): React.ReactNode {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ background: 'var(--color-border)', borderRadius: 3, height: 8, width: '100%', minWidth: 60 }}>
      <div style={{ background: color, borderRadius: 3, height: 8, width: `${pct}%`, transition: 'width 0.3s' }} />
    </div>
  );
}

function DbFootprintTab() {
  const [data, setData] = useState<DbFootprintData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await adminFetch<DbFootprintData>('/api/admin.php?action=db-footprint');
      setData(d);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p>Loading DB footprint...</p>;
  if (error) return <div style={s.error}>{error}</div>;
  if (!data) return null;

  const { summary, tables, largeColumns, columnSizeDetails, indexes, redundantIndexes, hostLimitMb } = data;
  const totalMb = summary.total_bytes / (1024 * 1024);
  const usagePct = hostLimitMb > 0 ? ((summary.total_bytes / (hostLimitMb * 1024 * 1024)) * 100) : 0;
  const usageColor = usagePct > 90 ? '#dc2626' : usagePct > 70 ? '#f59e0b' : '#22c55e';
  const warnMb = 700, dangerMb = 900;
  const thresholdLevel: 'ok' | 'warn' | 'danger' = totalMb >= dangerMb ? 'danger' : totalMb >= warnMb ? 'warn' : 'ok';
  const thresholdColor = thresholdLevel === 'danger' ? '#dc2626' : thresholdLevel === 'warn' ? '#f59e0b' : '#22c55e';
  const thresholdLabel = thresholdLevel === 'danger' ? 'DANGER' : thresholdLevel === 'warn' ? 'WARNING' : 'OK';

  // Growth since last snapshot
  const snapshots = data.snapshotHistory || [];
  const prevSnapshot = snapshots.length > 1 ? snapshots[1] : null; // [0] is today's auto-captured
  const growthMb = prevSnapshot ? totalMb - parseFloat(prevSnapshot.total_mb) : null;

  const captureSnapshot = async () => {
    setCapturing(true);
    try {
      await adminFetch('/api/admin.php?action=db-snapshot-capture', { method: 'POST' });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
    setCapturing(false);
  };

  // Group indexes by table for expandable view
  const indexesByTable: Record<string, DbIndex[]> = {};
  for (const idx of indexes) {
    if (!indexesByTable[idx.table_name]) indexesByTable[idx.table_name] = [];
    indexesByTable[idx.table_name].push(idx);
  }

  // Group column size details by table
  const colSizeByTable: Record<string, DbColumnSize[]> = {};
  for (const cs of columnSizeDetails) {
    if (!colSizeByTable[cs.table_name]) colSizeByTable[cs.table_name] = [];
    colSizeByTable[cs.table_name].push(cs);
  }

  return (
    <div>
      {/* Summary Banner */}
      <div style={{
        ...s.card,
        borderColor: usageColor,
        borderWidth: 2,
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
            Database: <code>{data.database}</code>
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={s.badge(thresholdColor)}>
              {thresholdLabel}
            </span>
            <span style={s.badge(usageColor)}>
              {totalMb.toFixed(1)} MB — {usagePct.toFixed(1)}% of {hostLimitMb} MB
            </span>
          </div>
        </div>
        {thresholdLevel === 'danger' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.75rem', color: '#991b1b', fontSize: '0.8rem', fontWeight: 600 }}>
            ⚠️ Database size ({totalMb.toFixed(0)} MB) exceeds danger threshold ({dangerMb} MB). Immediate action required.
          </div>
        )}
        {thresholdLevel === 'warn' && (
          <div style={{ background: '#fffbeb', border: '1px solid #fed7aa', borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.75rem', color: '#92400e', fontSize: '0.8rem', fontWeight: 600 }}>
            ⚠ Database size ({totalMb.toFixed(0)} MB) exceeds warning threshold ({warnMb} MB). Monitor closely.
          </div>
        )}
        <div style={{ marginBottom: '0.5rem' }}>
          {pctBar(summary.total_bytes, hostLimitMb * 1024 * 1024, usageColor)}
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
          <div><strong>Total:</strong> {fmtBytes(summary.total_bytes)}</div>
          <div><strong>Data:</strong> {fmtBytes(summary.total_data_bytes)}</div>
          <div><strong>Indexes:</strong> {fmtBytes(summary.total_index_bytes)}</div>
          <div><strong>Free:</strong> {fmtBytes(summary.total_free_bytes)}</div>
          <div><strong>Tables:</strong> {summary.table_count}</div>
        </div>
        {growthMb !== null && prevSnapshot && (
          <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: 'var(--color-surface)', borderRadius: 4 }}>
            <strong>Growth since {new Date(prevSnapshot.captured_at + 'Z').toLocaleDateString()}:</strong>{' '}
            <span style={{ color: growthMb > 0 ? '#dc2626' : '#22c55e', fontWeight: 600 }}>
              {growthMb > 0 ? '+' : ''}{growthMb.toFixed(1)} MB
            </span>
            {' '}({prevSnapshot.total_mb} MB → {totalMb.toFixed(1)} MB)
          </div>
        )}
        <div style={{ ...s.muted, marginTop: '0.5rem' }}>
          Generated: {new Date(data.generatedAt).toLocaleString()}
          {' · '}<button style={{ ...s.btn('muted'), fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} onClick={load}>↻ Refresh</button>
        </div>
      </div>

      {/* Tables by Size */}
      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Top Tables by Size ({tables.length})
      </h3>
      <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>#</th>
              <th style={s.th}>Table</th>
              <th style={s.th}>Rows</th>
              <th style={s.th}>Data</th>
              <th style={s.th}>Index</th>
              <th style={s.th}>Total</th>
              <th style={s.th}>% of DB</th>
              <th style={s.th}>Avg Row</th>
              <th style={s.th}>Bar</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((t, i) => {
              const tblPct = summary.total_bytes > 0 ? (t.total_bytes / summary.total_bytes * 100) : 0;
              const isExpanded = expandedTable === t.table_name;
              const tblIndexes = indexesByTable[t.table_name] || [];
              const tblColSizes = colSizeByTable[t.table_name] || [];
              return (
                <React.Fragment key={t.table_name}>
                  <tr
                    style={{ cursor: 'pointer', background: isExpanded ? 'rgba(59,130,246,0.05)' : undefined }}
                    onClick={() => setExpandedTable(isExpanded ? null : t.table_name)}
                  >
                    <td style={s.td}>{i + 1}</td>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: 600, fontSize: '0.75rem' }}>
                      {t.table_name}
                      {tblIndexes.length > 0 && (
                        <span style={{ ...s.muted, marginLeft: 4 }}>({tblIndexes.length} idx)</span>
                      )}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtRows(t.row_count_estimate)}</td>
                    <td style={{ ...s.td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtBytes(t.data_bytes)}</td>
                    <td style={{ ...s.td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtBytes(t.index_bytes)}</td>
                    <td style={{ ...s.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmtBytes(t.total_bytes)}</td>
                    <td style={{ ...s.td, textAlign: 'right', fontFamily: 'monospace' }}>{tblPct.toFixed(1)}%</td>
                    <td style={{ ...s.td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtBytes(t.avg_row_bytes)}</td>
                    <td style={{ ...s.td, minWidth: 80 }}>
                      {pctBar(t.total_bytes, tables[0]?.total_bytes || 1, tblPct > 20 ? '#dc2626' : tblPct > 5 ? '#f59e0b' : '#3b82f6')}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} style={{ ...s.td, background: 'rgba(59,130,246,0.03)', padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                          {/* Indexes */}
                          <div style={{ flex: '1 1 300px' }}>
                            <strong style={{ fontSize: '0.75rem' }}>Indexes ({tblIndexes.length})</strong>
                            {tblIndexes.length === 0 ? (
                              <p style={s.muted}>No indexes</p>
                            ) : (
                              <table style={{ ...s.table, marginTop: '0.25rem' }}>
                                <thead>
                                  <tr>
                                    <th style={{ ...s.th, fontSize: '0.65rem' }}>Name</th>
                                    <th style={{ ...s.th, fontSize: '0.65rem' }}>Columns</th>
                                    <th style={{ ...s.th, fontSize: '0.65rem' }}>Type</th>
                                    <th style={{ ...s.th, fontSize: '0.65rem' }}>Unique</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tblIndexes.map((idx) => (
                                    <tr key={idx.index_name}>
                                      <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.7rem' }}>{idx.index_name}</td>
                                      <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.7rem' }}>{idx.columns}</td>
                                      <td style={{ ...s.td, fontSize: '0.7rem' }}>{idx.index_type}</td>
                                      <td style={{ ...s.td, fontSize: '0.7rem' }}>{idx.non_unique ? 'No' : 'Yes'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                          {/* Column Sizes (for large columns) */}
                          {tblColSizes.length > 0 && (
                            <div style={{ flex: '1 1 300px' }}>
                              <strong style={{ fontSize: '0.75rem' }}>Large Column Sizes</strong>
                              <table style={{ ...s.table, marginTop: '0.25rem' }}>
                                <thead>
                                  <tr>
                                    <th style={{ ...s.th, fontSize: '0.65rem' }}>Column</th>
                                    <th style={{ ...s.th, fontSize: '0.65rem' }}>Avg</th>
                                    <th style={{ ...s.th, fontSize: '0.65rem' }}>Max</th>
                                    <th style={{ ...s.th, fontSize: '0.65rem' }}>Non-empty</th>
                                    <th style={{ ...s.th, fontSize: '0.65rem' }}>Est. Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tblColSizes.map((cs) => (
                                    <tr key={cs.column_name}>
                                      <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.7rem' }}>{cs.column_name}</td>
                                      <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.7rem', textAlign: 'right' }}>{fmtBytes(cs.avg_bytes)}</td>
                                      <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.7rem', textAlign: 'right' }}>{fmtBytes(cs.max_bytes)}</td>
                                      <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.7rem', textAlign: 'right' }}>{fmtRows(cs.non_empty_count)}/{fmtRows(cs.row_count)}</td>
                                      <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.7rem', textAlign: 'right', fontWeight: 600 }}>
                                        {fmtBytes(cs.avg_bytes * cs.non_empty_count)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                        <div style={{ ...s.muted, marginTop: '0.25rem' }}>
                          Engine: {t.engine} · Collation: {t.collation}
                          {t.data_free_bytes > 0 && <> · Free space: {fmtBytes(t.data_free_bytes)}</>}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Large Columns */}
      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Large Columns (TEXT/BLOB/JSON) — {largeColumns.length} columns
      </h3>
      <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Table</th>
              <th style={s.th}>Column</th>
              <th style={s.th}>Type</th>
              <th style={s.th}>Max Length</th>
              <th style={s.th}>Nullable</th>
            </tr>
          </thead>
          <tbody>
            {largeColumns.map((lc, i) => (
              <tr key={`${lc.table_name}.${lc.column_name}-${i}`}>
                <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.75rem' }}>{lc.table_name}</td>
                <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>{lc.column_name}</td>
                <td style={s.td}>
                  <span style={s.badge(
                    lc.data_type.includes('long') ? '#dc2626' :
                    lc.data_type.includes('medium') ? '#f59e0b' :
                    lc.data_type === 'json' ? '#8b5cf6' : '#3b82f6'
                  )}>{lc.data_type}</span>
                </td>
                <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.75rem', textAlign: 'right' }}>
                  {lc.max_length !== null ? fmtBytes(lc.max_length) : '—'}
                </td>
                <td style={{ ...s.td, fontSize: '0.75rem' }}>{lc.is_nullable}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Redundant Indexes */}
      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Redundant Indexes — {redundantIndexes.length} found
      </h3>
      {redundantIndexes.length === 0 ? (
        <p style={{ ...s.muted, marginBottom: '1.5rem' }}>✓ No obviously redundant indexes detected.</p>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Table</th>
                <th style={s.th}>Redundant Index</th>
                <th style={s.th}>Columns</th>
                <th style={s.th}>Covered By</th>
                <th style={s.th}>Covering Columns</th>
              </tr>
            </thead>
            <tbody>
              {redundantIndexes.map((r, i) => (
                <tr key={`${r.table_name}.${r.redundant_index}-${i}`}>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.75rem' }}>{r.table_name}</td>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>{r.redundant_index}</td>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.7rem' }}>{r.redundant_cols}</td>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.75rem', color: '#22c55e' }}>{r.covered_by_index}</td>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.7rem' }}>{r.covered_by_cols}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Optimization Recommendations */}
      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Optimization Recommendations
      </h3>
      <div style={s.card}>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', lineHeight: 1.8 }}>
          {usagePct > 80 && (
            <li style={{ color: '#dc2626', fontWeight: 600 }}>
              ⚠️ CRITICAL: Database is at {usagePct.toFixed(1)}% of the {hostLimitMb} MB limit. Immediate action required.
            </li>
          )}
          {tables.length > 0 && tables[0].total_bytes > 100 * 1024 * 1024 && (
            <li>
              <strong>Multi-schema split:</strong> Move <code>{tables[0].table_name}</code> ({fmtBytes(tables[0].total_bytes)})
              to a separate database to stay under the per-database limit.
            </li>
          )}
          {tables.filter(t => t.index_bytes > t.data_bytes).length > 0 && (
            <li>
              <strong>Index-heavy tables:</strong>{' '}
              {tables.filter(t => t.index_bytes > t.data_bytes).map(t => t.table_name).join(', ')} have indexes larger than data.
              Review for redundant indexes.
            </li>
          )}
          {redundantIndexes.length > 0 && (
            <li>
              <strong>Drop {redundantIndexes.length} redundant index(es)</strong> to save space:{' '}
              {redundantIndexes.map(r => `${r.table_name}.${r.redundant_index}`).join(', ')}
            </li>
          )}
          {columnSizeDetails.filter(cs => cs.avg_bytes > 10000).length > 0 && (
            <li>
              <strong>Payload offloading:</strong> Consider moving large columns to object storage (S3/R2):{' '}
              {columnSizeDetails.filter(cs => cs.avg_bytes > 10000).map(cs => `${cs.table_name}.${cs.column_name} (avg ${fmtBytes(cs.avg_bytes)})`).join(', ')}
            </li>
          )}
          {tables.filter(t => t.data_free_bytes > 10 * 1024 * 1024).length > 0 && (
            <li>
              <strong>Reclaim free space:</strong>{' '}
              {tables.filter(t => t.data_free_bytes > 10 * 1024 * 1024).map(t => `OPTIMIZE TABLE ${t.table_name} (${fmtBytes(t.data_free_bytes)} free)`).join('; ')}
            </li>
          )}
          <li>
            <strong>Quick wins:</strong> Run <code>OPTIMIZE TABLE</code> on tables with high DATA_FREE to reclaim wasted space.
          </li>
        </ul>
      </div>

      {/* Snapshot History */}
      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '1.5rem' }}>
        Size Snapshots ({snapshots.length})
      </h3>
      <div style={{ marginBottom: '0.5rem' }}>
        <button
          style={{ ...s.btn('primary'), fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
          onClick={captureSnapshot}
          disabled={capturing}
        >
          {capturing ? 'Capturing...' : '📸 Capture Snapshot Now'}
        </button>
        <span style={{ ...s.muted, marginLeft: '0.75rem', fontSize: '0.75rem' }}>
          Auto-captured daily on first admin visit.
        </span>
      </div>
      {snapshots.length === 0 ? (
        <p style={{ ...s.muted, marginBottom: '1.5rem' }}>No snapshots yet. Visit this page daily to build history.</p>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Date</th>
                <th style={s.th}>Total</th>
                <th style={s.th}>Data</th>
                <th style={s.th}>Index</th>
                <th style={s.th}>Tables</th>
                <th style={s.th}>#1 Table</th>
                <th style={s.th}>#2 Table</th>
                <th style={s.th}>Δ</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((snap, i) => {
                const prev = snapshots[i + 1];
                const delta = prev ? parseFloat(snap.total_mb) - parseFloat(prev.total_mb) : null;
                return (
                  <tr key={snap.id}>
                    <td style={{ ...s.td, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {new Date(snap.captured_at + 'Z').toLocaleDateString()}
                    </td>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: 600, textAlign: 'right' }}>
                      {parseFloat(snap.total_mb).toFixed(1)} MB
                    </td>
                    <td style={{ ...s.td, fontFamily: 'monospace', textAlign: 'right' }}>
                      {parseFloat(snap.data_mb).toFixed(1)}
                    </td>
                    <td style={{ ...s.td, fontFamily: 'monospace', textAlign: 'right' }}>
                      {parseFloat(snap.index_mb).toFixed(1)}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>{snap.table_count}</td>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                      {snap.top_table_1_name ? `${snap.top_table_1_name} (${snap.top_table_1_mb} MB)` : '—'}
                    </td>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                      {snap.top_table_2_name ? `${snap.top_table_2_name} (${snap.top_table_2_mb} MB)` : '—'}
                    </td>
                    <td style={{
                      ...s.td, fontFamily: 'monospace', textAlign: 'right', fontWeight: 600,
                      color: delta === null ? 'inherit' : delta > 0 ? '#dc2626' : delta < 0 ? '#22c55e' : 'inherit',
                    }}>
                      {delta !== null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
        <button style={s.tab(tab === 'dbFootprint')} onClick={() => setTab('dbFootprint')}>
          DB Footprint
        </button>
      </div>

      {/* Tab content */}
      {tab === 'search' && <UserSearchTab onSelectUser={handleSelectUser} />}
      {tab === 'details' && selectedUserId && (
        <UserDetailsTab userId={selectedUserId} onBack={handleBackToSearch} />
      )}
      {tab === 'audit' && <AuditLogTab />}
      {tab === 'plans' && <PlanCapabilitiesTab canMutate={can('admin.userManagement' as any)} />}
      {tab === 'dbFootprint' && <DbFootprintTab />}
    </div>
  );
}
