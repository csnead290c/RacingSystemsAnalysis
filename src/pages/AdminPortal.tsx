/**
 * Admin Portal - Complete Overhaul
 * 
 * Operational admin console with:
 * - User lifecycle management (create, invite, suspend, delete)
 * - Manual plan assignment (dropdown-based)
 * - NHRA plan editing
 * - Enhanced filters and actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useCapabilities } from '../domain/config/useCapabilities';
import { adminApi, type AdminUser, type AdminUserDetail, type Plan, type UserStatus, type UserRole, type BillingSource } from '../services/adminApi';

type Tab = 'users' | 'details' | 'audit' | 'plans' | 'dbFootprint';

// ── Styles ──────────────────────────────────────────────────────────────

const s = {
  page: { maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' } as React.CSSProperties,
  tabs: { display: 'flex', gap: '0.25rem', borderBottom: '2px solid var(--color-border)', marginBottom: '1.5rem' } as React.CSSProperties,
  tab: (active: boolean) => ({
    padding: '0.5rem 1rem', border: 'none', borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
    background: 'none', color: active ? 'var(--color-primary)' : 'var(--color-muted)', fontWeight: active ? 700 : 400,
    cursor: 'pointer', fontSize: '0.875rem', marginBottom: '-2px',
  } as React.CSSProperties),
  card: { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem' } as React.CSSProperties,
  input: { padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.875rem', width: '100%' } as React.CSSProperties,
  select: { padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.875rem' } as React.CSSProperties,
  btn: (variant: 'primary' | 'danger' | 'muted' | 'success' = 'primary') => ({
    padding: '0.4rem 0.75rem', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#fff',
    backgroundColor: variant === 'danger' ? '#dc2626' : variant === 'muted' ? '#6b7280' : variant === 'success' ? '#22c55e' : 'var(--color-primary)',
  } as React.CSSProperties),
  badge: (color: string) => ({ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: color, color: '#fff' } as React.CSSProperties),
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.8rem' } as React.CSSProperties,
  th: { textAlign: 'left' as const, padding: '0.5rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' as const } as React.CSSProperties,
  td: { padding: '0.5rem', borderBottom: '1px solid var(--color-border)', verticalAlign: 'top' as const } as React.CSSProperties,
  muted: { color: 'var(--color-muted)', fontSize: '0.75rem' } as React.CSSProperties,
  error: { padding: '0.75rem', backgroundColor: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: 'var(--radius-sm)', color: '#dc2626', fontSize: '0.8rem', marginBottom: '1rem' } as React.CSSProperties,
  success: { padding: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 'var(--radius-sm)', color: '#22c55e', fontSize: '0.8rem', marginBottom: '1rem' } as React.CSSProperties,
  modal: { position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 } as React.CSSProperties,
  modalContent: { backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: '1.5rem', maxWidth: '520px', width: '90%', border: '1px solid var(--color-border)', maxHeight: '90vh', overflow: 'auto' } as React.CSSProperties,
};

// ── Badge Components ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: UserStatus | string | null }) {
  if (!status) return <span style={s.badge('#6b7280')}>unknown</span>;
  const colors: Record<string, string> = {
    invited: '#3b82f6', active: '#22c55e', suspended: '#f59e0b', deleted: '#dc2626',
  };
  return <span style={s.badge(colors[status] || '#6b7280')}>{status}</span>;
}

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return <span style={s.badge('#6b7280')}>free</span>;
  const colors: Record<string, string> = {
    free: '#6b7280', basic: '#22c55e', pro: '#3b82f6', team: '#8b5cf6', nhra: '#dc2626',
  };
  return <span style={s.badge(colors[plan] || '#6b7280')}>{plan}</span>;
}

function BillingSourceBadge({ source }: { source: BillingSource | string | null }) {
  if (!source || source === 'none') return <span style={s.badge('#6b7280')}>none</span>;
  const colors: Record<string, string> = { manual: '#f59e0b', stripe: '#3b82f6' };
  return <span style={s.badge(colors[source] || '#6b7280')}>{source}</span>;
}

// ── Modal: Create User ──────────────────────────────────────────────────

function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [assignedPlan, setAssignedPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email || !name || !password) {
      setError('Email, name, and password are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await adminApi.createUser({ email, name, password, role, assignedPlan: assignedPlan || undefined });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.modal} onClick={onClose}>
      <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Create User</h3>
        {error && <div style={s.error}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={s.muted}>Email *</label>
            <input style={s.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div>
            <label style={s.muted}>Name *</label>
            <input style={s.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
          </div>
          <div>
            <label style={s.muted}>Password *</label>
            <input style={s.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
          </div>
          <div>
            <label style={s.muted}>Role</label>
            <select style={s.select} value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="beta">Beta</option>
            </select>
          </div>
          <div>
            <label style={s.muted}>Assigned Plan (optional)</label>
            <select style={s.select} value={assignedPlan} onChange={(e) => setAssignedPlan(e.target.value)}>
              <option value="">None (free)</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
              <option value="nhra">NHRA</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button style={s.btn('muted')} onClick={onClose}>Cancel</button>
          <button style={s.btn()} onClick={handleSubmit} disabled={loading}>{loading ? 'Creating...' : 'Create User'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Invite User ──────────────────────────────────────────────────

function InviteUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [assignedPlan, setAssignedPlan] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await adminApi.inviteUser({ email, role, assignedPlan: assignedPlan || undefined, expiresInDays: parseInt(expiresInDays) || 7 });
      setInviteUrl(result.inviteUrl);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  if (inviteUrl) {
    return (
      <div style={s.modal} onClick={onClose}>
        <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Invite Created</h3>
          <div style={{ ...s.success, marginBottom: '1rem' }}>
            Invite generated for <strong>{email}</strong>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={s.muted}>Invite URL (email not sent - share manually)</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <input style={{ ...s.input, fontFamily: 'monospace', fontSize: '0.75rem' }} value={inviteUrl} readOnly onClick={(e) => (e.target as HTMLInputElement).select()} />
              <button style={s.btn('success')} onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</button>
            </div>
          </div>
          <div style={{ ...s.muted, marginBottom: '1rem', fontSize: '0.8rem' }}>
            Note: Email sending is not configured. Share this URL with the user to complete registration.
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button style={s.btn()} onClick={handleDone}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.modal} onClick={onClose}>
      <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Generate Invite Link</h3>
        <div style={{ ...s.muted, marginBottom: '1rem', fontSize: '0.85rem' }}>
          Note: Email sending not configured. You'll receive a link to share manually.
        </div>
        {error && <div style={s.error}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={s.muted}>Email *</label>
            <input style={s.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div>
            <label style={s.muted}>Role</label>
            <select style={s.select} value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="beta">Beta</option>
            </select>
          </div>
          <div>
            <label style={s.muted}>Assigned Plan (optional)</label>
            <select style={s.select} value={assignedPlan} onChange={(e) => setAssignedPlan(e.target.value)}>
              <option value="">None (free)</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
              <option value="nhra">NHRA</option>
            </select>
          </div>
          <div>
            <label style={s.muted}>Expires In (days)</label>
            <input style={s.input} type="number" value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button style={s.btn('muted')} onClick={onClose}>Cancel</button>
          <button style={s.btn()} onClick={handleSubmit} disabled={loading}>{loading ? 'Generating...' : 'Generate Link'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Assign Plan ──────────────────────────────────────────────────

function AssignPlanModal({ userId, currentPlan, onClose, onSuccess }: { userId: number; currentPlan: string | null; onClose: () => void; onSuccess: () => void }) {
  const [planId, setPlanId] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!planId) {
      setError('Please select a plan');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await adminApi.assignPlan({ userId, planId, expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined, reason: reason || undefined });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.modal} onClick={onClose}>
      <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Assign Plan</h3>
        {currentPlan && <div style={{ ...s.muted, marginBottom: '0.75rem' }}>Current: <PlanBadge plan={currentPlan} /></div>}
        {error && <div style={s.error}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={s.muted}>Plan *</label>
            <select style={s.select} value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">Select plan...</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
              <option value="nhra">NHRA</option>
            </select>
          </div>
          <div>
            <label style={s.muted}>Expires In (days, optional)</label>
            <input style={s.input} type="number" value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} placeholder="Leave empty for permanent" />
          </div>
          <div>
            <label style={s.muted}>Reason (optional)</label>
            <input style={s.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why assigning this plan?" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button style={s.btn('muted')} onClick={onClose}>Cancel</button>
          <button style={s.btn()} onClick={handleSubmit} disabled={loading}>{loading ? 'Assigning...' : 'Assign Plan'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Confirm Delete ───────────────────────────────────────────────

function ConfirmDeleteModal({ userId, userName, onClose, onSuccess }: { userId: number; userName: string; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState('');
  const [hardDelete, setHardDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (hardDelete && confirmText !== 'DELETE') {
      setError('Type DELETE to confirm hard delete');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await adminApi.deleteUser({ userId, reason: reason || undefined, hardDelete });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.modal} onClick={onClose}>
      <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#dc2626' }}>Delete User</h3>
        <div style={{ ...s.error, marginBottom: '1rem' }}>
          You are about to delete <strong>{userName}</strong> (ID: {userId})
        </div>
        {error && <div style={s.error}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={s.muted}>Reason (optional)</label>
            <input style={s.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why deleting this user?" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={hardDelete} onChange={(e) => setHardDelete(e.target.checked)} id="hardDelete" />
            <label htmlFor="hardDelete" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
              Hard delete (permanently remove all data)
            </label>
          </div>
          {hardDelete && (
            <div>
              <label style={{ ...s.muted, color: '#dc2626' }}>Type DELETE to confirm</label>
              <input style={s.input} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button style={s.btn('muted')} onClick={onClose}>Cancel</button>
          <button style={s.btn('danger')} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Deleting...' : hardDelete ? 'Hard Delete' : 'Soft Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Suspend User ─────────────────────────────────────────────────

function SuspendUserModal({ userId, userName, onClose, onSuccess }: { userId: number; userName: string; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await adminApi.suspendUser({ userId, reason });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.modal} onClick={onClose}>
      <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Suspend User</h3>
        <div style={{ ...s.muted, marginBottom: '1rem' }}>
          Suspending <strong>{userName}</strong> (ID: {userId})
        </div>
        {error && <div style={s.error}>{error}</div>}
        <div>
          <label style={s.muted}>Reason *</label>
          <input style={s.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why suspending this user?" />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button style={s.btn('muted')} onClick={onClose}>Cancel</button>
          <button style={s.btn('danger')} onClick={handleSubmit} disabled={loading}>{loading ? 'Suspending...' : 'Suspend'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Reset Password ────────────────────────────────────────────────

function ResetPasswordModal({ userId, userName, onClose, onSuccess }: { userId: number; userName: string; onClose: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await adminApi.resetUserPassword({ user_id: userId, password });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.modal} onClick={onClose}>
      <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Reset Password</h3>
        <div style={{ ...s.muted, marginBottom: '1rem' }}>
          Setting new password for <strong>{userName}</strong> (ID: {userId})
        </div>
        {error && <div style={s.error}>{error}</div>}
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={s.muted}>New Password *</label>
          <input style={s.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password (min 6 chars)" />
        </div>
        <div>
          <label style={s.muted}>Confirm Password *</label>
          <input style={s.input} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button style={s.btn('muted')} onClick={onClose}>Cancel</button>
          <button style={s.btn()} onClick={handleSubmit} disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Users Tab ───────────────────────────────────────────────────────────

function UsersTab({ onSelectUser, canMutate }: { onSelectUser: (id: number) => void; canMutate: boolean }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [billingSourceFilter, setBillingSourceFilter] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.searchUsers({
        q: query || undefined,
        status: statusFilter as any || undefined,
        role: roleFilter as any || undefined,
        plan: planFilter || undefined,
        billingSource: billingSourceFilter as any || undefined,
        limit: 50,
      });
      setUsers(data.users);
      setTotal(data.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter, roleFilter, planFilter, billingSourceFilter]);

  useEffect(() => { search(); }, [search]);

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <input style={s.input} placeholder="Search email/name..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        <select style={s.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="suspended">Suspended</option>
          <option value="deleted">Deleted</option>
        </select>
        <select style={s.select} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="beta">Beta</option>
          <option value="owner">Owner</option>
        </select>
        <select style={s.select} value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="team">Team</option>
          <option value="nhra">NHRA</option>
        </select>
        <select style={s.select} value={billingSourceFilter} onChange={(e) => setBillingSourceFilter(e.target.value)}>
          <option value="">All Billing</option>
          <option value="none">None</option>
          <option value="manual">Manual</option>
          <option value="stripe">Stripe</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button style={s.btn()} onClick={search} disabled={loading}>{loading ? 'Loading...' : 'Search'}</button>
        {canMutate && (
          <>
            <button style={s.btn('success')} onClick={() => setShowCreateModal(true)}>+ Create User</button>
            <button style={s.btn('success')} onClick={() => setShowInviteModal(true)}>+ Invite User</button>
          </>
        )}
        <div style={{ flex: 1 }} />
        <span style={s.muted}>{total} total users</span>
      </div>

      {error && <div style={s.error}>{error}</div>}

      {/* Users Table */}
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>ID</th>
            <th style={s.th}>Email</th>
            <th style={s.th}>Name</th>
            <th style={s.th}>Role</th>
            <th style={s.th}>Status</th>
            <th style={s.th}>Plan</th>
            <th style={s.th}>Billing</th>
            <th style={s.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={s.td}>{u.id}</td>
              <td style={s.td}>{u.email}</td>
              <td style={s.td}>{u.name}</td>
              <td style={s.td}>{u.role}</td>
              <td style={s.td}><StatusBadge status={u.status} /></td>
              <td style={s.td}><PlanBadge plan={u.assigned_plan || u.subscription_plan} /></td>
              <td style={s.td}><BillingSourceBadge source={u.billing_source} /></td>
              <td style={s.td}>
                <button style={s.btn()} onClick={() => onSelectUser(u.id)}>View</button>
              </td>
            </tr>
          ))}
          {users.length === 0 && !loading && (
            <tr><td colSpan={8} style={{ ...s.td, textAlign: 'center' }}>No users found</td></tr>
          )}
        </tbody>
      </table>

      {/* Modals */}
      {showCreateModal && <CreateUserModal onClose={() => setShowCreateModal(false)} onSuccess={search} />}
      {showInviteModal && <InviteUserModal onClose={() => setShowInviteModal(false)} onSuccess={search} />}
    </div>
  );
}

// ── User Details Tab ────────────────────────────────────────────────────

function UserDetailsTab({ userId, onBack, canMutate }: { userId: number; onBack: () => void; canMutate: boolean }) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showAssignPlanModal, setShowAssignPlanModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [editingRole, setEditingRole] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>('user');

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getUserDetails(userId);
      setDetail(data);
      setNewRole(data.user.role as UserRole);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const handleUpdateRole = async () => {
    setError('');
    setSuccessMsg('');
    try {
      await adminApi.updateUserRole({ userId, role: newRole });
      setSuccessMsg('Role updated successfully');
      setEditingRole(false);
      fetchDetails();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleReactivate = async () => {
    setError('');
    setSuccessMsg('');
    try {
      await adminApi.reactivateUser({ userId });
      setSuccessMsg('User reactivated successfully');
      fetchDetails();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRemovePlan = async () => {
    if (!confirm('Remove manual plan assignment?')) return;
    setError('');
    setSuccessMsg('');
    try {
      await adminApi.removePlan({ userId });
      setSuccessMsg('Plan removed successfully');
      fetchDetails();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <div style={s.muted}>Loading user details...</div>;
  if (!detail) return <div style={s.error}>{error || 'User not found'}</div>;

  const u = detail.user;
  const effectivePlan = u.assigned_plan || u.subscription_plan || 'free';
  const isSuspended = u.status === 'suspended';

  return (
    <div>
      <button style={{ ...s.btn('muted'), marginBottom: '1rem' }} onClick={onBack}>&larr; Back to Users</button>

      {error && <div style={s.error}>{error}</div>}
      {successMsg && <div style={s.success}>{successMsg}</div>}

      {/* Identity */}
      <div style={s.card}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Identity</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
          <div><strong>ID:</strong> {u.id}</div>
          <div><strong>Email:</strong> {u.email}</div>
          <div><strong>Name:</strong> {u.name}</div>
          <div><strong>Status:</strong> <StatusBadge status={u.status} /></div>
          <div><strong>Created:</strong> {u.created_at}</div>
          <div><strong>Updated:</strong> {u.updated_at}</div>
        </div>
      </div>

      {/* Access */}
      <div style={s.card}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Access</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
          <div>
            <strong>Role:</strong>{' '}
            {editingRole && canMutate ? (
              <select style={{ ...s.select, fontSize: '0.8rem', padding: '0.2rem 0.4rem' }} value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="beta">Beta</option>
                <option value="owner">Owner</option>
              </select>
            ) : (
              u.role
            )}
            {canMutate && (
              editingRole ? (
                <>
                  <button style={{ ...s.btn('success'), marginLeft: '0.5rem', padding: '0.2rem 0.5rem' }} onClick={handleUpdateRole}>Save</button>
                  <button style={{ ...s.btn('muted'), marginLeft: '0.25rem', padding: '0.2rem 0.5rem' }} onClick={() => setEditingRole(false)}>Cancel</button>
                </>
              ) : (
                <button style={{ ...s.btn(), marginLeft: '0.5rem', padding: '0.2rem 0.5rem' }} onClick={() => setEditingRole(true)}>Edit</button>
              )
            )}
          </div>
          <div><strong>Effective Plan:</strong> <PlanBadge plan={effectivePlan} /></div>
          <div><strong>Billing Source:</strong> <BillingSourceBadge source={u.billing_source} /></div>
          <div><strong>Billing Status:</strong> <StatusBadge status={u.subscription_status} /></div>
        </div>
      </div>

      {/* Plan Management */}
      <div style={s.card}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Plan Management</h3>
        <div style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          {u.assigned_plan ? (
            <>
              <div><strong>Assigned Plan:</strong> <PlanBadge plan={u.assigned_plan} /></div>
              {u.assigned_plan_expires_at && <div><strong>Expires:</strong> {u.assigned_plan_expires_at}</div>}
              {u.assigned_by_name && <div><strong>Assigned By:</strong> {u.assigned_by_name} ({u.assigned_by_email})</div>}
            </>
          ) : (
            <div style={s.muted}>No manual plan assignment</div>
          )}
        </div>
        {canMutate && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={s.btn()} onClick={() => setShowAssignPlanModal(true)}>Assign Plan</button>
            {u.assigned_plan && <button style={s.btn('danger')} onClick={handleRemovePlan}>Remove Plan</button>}
          </div>
        )}
      </div>

      {/* Capabilities */}
      <div style={s.card}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Effective Capabilities ({detail.capabilities.length})</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
          {detail.capabilities.map((c) => (
            <span key={c} style={s.badge('#374151')}>{c}</span>
          ))}
        </div>
      </div>

      {/* Admin Actions */}
      {canMutate && (
        <div style={s.card}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Admin Actions</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button style={s.btn()} onClick={() => setShowResetPasswordModal(true)}>Reset Password</button>
            {isSuspended ? (
              <button style={s.btn('success')} onClick={handleReactivate}>Reactivate User</button>
            ) : (
              <button style={s.btn('danger')} onClick={() => setShowSuspendModal(true)}>Suspend User</button>
            )}
            <button style={s.btn('danger')} onClick={() => setShowDeleteModal(true)}>Delete User</button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAssignPlanModal && <AssignPlanModal userId={userId} currentPlan={effectivePlan} onClose={() => setShowAssignPlanModal(false)} onSuccess={() => { setSuccessMsg('Plan assigned successfully'); fetchDetails(); }} />}
      {showDeleteModal && <ConfirmDeleteModal userId={userId} userName={u.name} onClose={() => setShowDeleteModal(false)} onSuccess={() => { setSuccessMsg('User deleted'); onBack(); }} />}
      {showSuspendModal && <SuspendUserModal userId={userId} userName={u.name} onClose={() => setShowSuspendModal(false)} onSuccess={() => { setSuccessMsg('User suspended'); fetchDetails(); }} />}
      {showResetPasswordModal && <ResetPasswordModal userId={userId} userName={u.name} onClose={() => setShowResetPasswordModal(false)} onSuccess={() => { setSuccessMsg('Password reset successfully'); }} />}
    </div>
  );
}

// ── Plans Tab with Full Editing ────────────────────────────────────────

function PlansTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'internal' | 'hidden' | 'archived'>('public');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.listPlans();
      setPlans(data.plans);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  const handleEdit = (plan: Plan) => {
    setSelectedPlan(plan);
    setDisplayName(plan.display_name);
    setDescription(plan.description || '');
    setVisibility(plan.visibility);
    setIsActive(plan.is_active);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!selectedPlan) return;
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      await adminApi.updatePlan({
        planId: selectedPlan.plan_id,
        displayName,
        description,
        visibility,
        isActive,
      });
      setSuccessMsg(`Updated ${selectedPlan.plan_id} plan successfully`);
      setEditing(false);
      setSelectedPlan(null);
      loadPlans();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setSelectedPlan(null);
    setError('');
  };

  if (loading) return <div style={s.muted}>Loading plans...</div>;
  if (error && !editing) return <div style={s.error}>{error}</div>;

  if (editing && selectedPlan) {
    return (
      <div>
        <button style={{ ...s.btn('muted'), marginBottom: '1rem' }} onClick={handleCancel}>&larr; Back to Plans</button>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>
          Edit Plan: <PlanBadge plan={selectedPlan.plan_id} />
        </h3>
        {error && <div style={s.error}>{error}</div>}
        {successMsg && <div style={s.success}>{successMsg}</div>}
        <div style={s.card}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={s.muted}>Plan ID (read-only)</label>
              <input style={{ ...s.input, backgroundColor: 'var(--color-bg)', cursor: 'not-allowed' }} value={selectedPlan.plan_id} readOnly />
            </div>
            <div>
              <label style={s.muted}>Display Name</label>
              <input style={s.input} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g., NHRA Professional" />
            </div>
            <div>
              <label style={s.muted}>Description</label>
              <textarea style={{ ...s.input, minHeight: '80px', fontFamily: 'inherit' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Plan description..." />
            </div>
            <div>
              <label style={s.muted}>Visibility</label>
              <select style={s.select} value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
                <option value="public">Public (available for purchase)</option>
                <option value="internal">Internal (admin-only assignment)</option>
                <option value="hidden">Hidden (not shown in UI)</option>
                <option value="archived">Archived (deprecated)</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} id="isActive" />
              <label htmlFor="isActive" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>Plan is active</label>
            </div>
            <div style={{ ...s.muted, fontSize: '0.8rem' }}>
              <strong>User Count:</strong> {selectedPlan.user_count ?? 0} users currently on this plan
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button style={s.btn()} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            <button style={s.btn('muted')} onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {successMsg && <div style={s.success}>{successMsg}</div>}
      <div style={{ marginBottom: '1rem', ...s.muted }}>
        Click "Edit" to modify plan metadata. NHRA plan is fully editable.
      </div>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Plan</th>
            <th style={s.th}>Display Name</th>
            <th style={s.th}>Visibility</th>
            <th style={s.th}>Users</th>
            <th style={s.th}>Active</th>
            <th style={s.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.plan_id}>
              <td style={s.td}><PlanBadge plan={p.plan_id} /></td>
              <td style={s.td}>{p.display_name}</td>
              <td style={s.td}>{p.visibility}</td>
              <td style={s.td}>{p.user_count ?? 0}</td>
              <td style={s.td}>{p.is_active ? 'Yes' : 'No'}</td>
              <td style={s.td}>
                <button style={s.btn()} onClick={() => handleEdit(p)}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────

export default function AdminPortal() {
  const { can } = useCapabilities();
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const canAccess = can('admin.access');
  const canMutate = can('admin.userManagement');

  if (!canAccess) {
    return (
      <div style={s.page}>
        <div style={s.error}>Access denied. You need admin.access capability.</div>
      </div>
    );
  }

  const handleSelectUser = (id: number) => {
    setSelectedUserId(id);
    setActiveTab('details');
  };

  const handleBackToUsers = () => {
    setSelectedUserId(null);
    setActiveTab('users');
  };

  return (
    <div style={s.page}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Admin Portal</h1>

      {/* Tabs */}
      <div style={s.tabs}>
        <button style={s.tab(activeTab === 'users')} onClick={() => setActiveTab('users')}>Users</button>
        <button style={s.tab(activeTab === 'details')} onClick={() => setActiveTab('details')} disabled={!selectedUserId}>User Details</button>
        <button style={s.tab(activeTab === 'plans')} onClick={() => setActiveTab('plans')}>Plans</button>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && <UsersTab onSelectUser={handleSelectUser} canMutate={canMutate} />}
      {activeTab === 'details' && selectedUserId && <UserDetailsTab userId={selectedUserId} onBack={handleBackToUsers} canMutate={canMutate} />}
      {activeTab === 'plans' && <PlansTab />}
    </div>
  );
}
