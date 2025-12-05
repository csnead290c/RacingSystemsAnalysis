/**
 * User Management Panel
 * 
 * Admin panel for managing users, roles, and access.
 */

import { useState } from 'react';
import { useAuth } from '../../domain/auth';
import {
  USER_ROLES,
  ROLE_DISPLAY_NAMES,
  ROLE_COLORS,
  ROLE_DESCRIPTIONS,
  type User,
  type UserRole,
  type AccountStatus,
} from '../../domain/auth/types';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    padding: '1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    margin: 0,
  },
  section: {
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: 'var(--color-muted)',
    marginBottom: '0.5rem',
  },
  card: {
    backgroundColor: 'var(--color-background)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem',
    marginBottom: '0.5rem',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem',
    borderBottom: '1px solid var(--color-border)',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: 600,
    marginBottom: '0.25rem',
  },
  userEmail: {
    fontSize: '0.875rem',
    color: 'var(--color-muted)',
  },
  badge: {
    padding: '0.25rem 0.5rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  statusBadge: {
    padding: '0.25rem 0.5rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
  },
  button: {
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  primaryBtn: {
    backgroundColor: 'var(--color-primary)',
    color: 'white',
  },
  secondaryBtn: {
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
  },
  dangerBtn: {
    backgroundColor: '#dc2626',
    color: 'white',
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    fontSize: '0.875rem',
  },
  select: {
    padding: '0.5rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    fontSize: '0.875rem',
  },
  formGroup: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    marginBottom: '0.25rem',
  },
  modal: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    width: '400px',
    maxWidth: '90vw',
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    marginTop: '1rem',
  },
  quickActions: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
    marginBottom: '1rem',
  },
  roleCard: {
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s',
  },
};

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ status }: { status: AccountStatus }) {
  const colors: Record<AccountStatus, { bg: string; text: string }> = {
    active: { bg: '#dcfce7', text: '#166534' },
    suspended: { bg: '#fee2e2', text: '#991b1b' },
    pending: { bg: '#fef3c7', text: '#92400e' },
    expired: { bg: '#f3f4f6', text: '#4b5563' },
  };
  
  return (
    <span style={{ ...styles.statusBadge, backgroundColor: colors[status].bg, color: colors[status].text }}>
      {status}
    </span>
  );
}

// ============================================================================
// Role Badge Component
// ============================================================================

function RoleBadge({ role }: { role: UserRole }) {
  const colors = ROLE_COLORS[role];
  return (
    <span style={{ ...styles.badge, backgroundColor: colors.bg, color: colors.text }}>
      {ROLE_DISPLAY_NAMES[role]}
    </span>
  );
}

// ============================================================================
// Create User Modal
// ============================================================================

interface CreateUserModalProps {
  onClose: () => void;
  onCreate: (user: Omit<User, 'id' | 'createdAt'>) => void;
}

function CreateUserModal({ onClose, onCreate }: CreateUserModalProps) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('beta_tester');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !displayName) return;
    
    onCreate({
      email,
      displayName,
      role,
      status: 'active',
      adminNotes: notes || undefined,
    });
    onClose();
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>Create New User</h3>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              style={styles.input}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Display Name</label>
            <input
              type="text"
              style={styles.input}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Role</label>
            <select
              style={{ ...styles.select, width: '100%' }}
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
            >
              {USER_ROLES.map(r => (
                <option key={r} value={r}>{ROLE_DISPLAY_NAMES[r]}</option>
              ))}
            </select>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
              {ROLE_DESCRIPTIONS[role]}
            </p>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Admin Notes (optional)</label>
            <textarea
              style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Internal notes about this user..."
            />
          </div>
          <div style={styles.modalActions}>
            <button type="button" style={{ ...styles.button, ...styles.secondaryBtn }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" style={{ ...styles.button, ...styles.primaryBtn }}>
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Edit User Modal
// ============================================================================

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onSave: (updates: Partial<User>) => void;
  onDelete: () => void;
}

function EditUserModal({ user, onClose, onSave, onDelete }: EditUserModalProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [role, setRole] = useState<UserRole>(user.role);
  const [status, setStatus] = useState<AccountStatus>(user.status);
  const [notes, setNotes] = useState(user.adminNotes || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      displayName,
      role,
      status,
      adminNotes: notes || undefined,
    });
    onClose();
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>Edit User: {user.email}</h3>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Display Name</label>
            <input
              type="text"
              style={styles.input}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Role</label>
            <select
              style={{ ...styles.select, width: '100%' }}
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
            >
              {USER_ROLES.map(r => (
                <option key={r} value={r}>{ROLE_DISPLAY_NAMES[r]}</option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Status</label>
            <select
              style={{ ...styles.select, width: '100%' }}
              value={status}
              onChange={e => setStatus(e.target.value as AccountStatus)}
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Admin Notes</label>
            <textarea
              style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>
            Created: {new Date(user.createdAt).toLocaleDateString()}<br />
            Last Login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
          </div>
          <div style={styles.modalActions}>
            {!confirmDelete ? (
              <button
                type="button"
                style={{ ...styles.button, ...styles.dangerBtn, marginRight: 'auto' }}
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </button>
            ) : (
              <button
                type="button"
                style={{ ...styles.button, ...styles.dangerBtn, marginRight: 'auto' }}
                onClick={() => { onDelete(); onClose(); }}
              >
                Confirm Delete
              </button>
            )}
            <button type="button" style={{ ...styles.button, ...styles.secondaryBtn }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" style={{ ...styles.button, ...styles.primaryBtn }}>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function UserManagement() {
  const { user: currentUser, getAllUsers, createUser, updateUser, deleteUser, setDevUser, impersonateUser } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const users = getAllUsers();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>User Management</h2>
        <button
          style={{ ...styles.button, ...styles.primaryBtn }}
          onClick={() => setShowCreateModal(true)}
        >
          + Add User
        </button>
      </div>

      {/* Current User Info */}
      {currentUser && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Current Session</div>
          <div style={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={styles.userName}>{currentUser.displayName}</div>
                <div style={styles.userEmail}>{currentUser.email}</div>
              </div>
              <RoleBadge role={currentUser.role} />
              <StatusBadge status={currentUser.status} />
            </div>
          </div>
        </div>
      )}

      {/* Quick Role Switch (Dev) */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Quick Role Switch (Dev)</div>
        <div style={styles.quickActions}>
          {USER_ROLES.map(role => (
            <button
              key={role}
              style={{
                ...styles.button,
                backgroundColor: ROLE_COLORS[role].bg,
                color: ROLE_COLORS[role].text,
                opacity: currentUser?.role === role ? 1 : 0.7,
                border: currentUser?.role === role ? '2px solid #000' : 'none',
              }}
              onClick={() => setDevUser(role)}
            >
              {ROLE_DISPLAY_NAMES[role]}
            </button>
          ))}
        </div>
      </div>

      {/* User List */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>All Users ({users.length})</div>
        <div style={styles.card}>
          {users.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '1rem' }}>
              No users found
            </p>
          ) : (
            users.map(user => (
              <div key={user.id} style={styles.userRow}>
                <div style={styles.userInfo}>
                  <div style={styles.userName}>{user.displayName}</div>
                  <div style={styles.userEmail}>{user.email}</div>
                </div>
                <RoleBadge role={user.role} />
                <StatusBadge status={user.status} />
                <button
                  style={{ ...styles.button, ...styles.secondaryBtn, padding: '0.25rem 0.5rem' }}
                  onClick={() => impersonateUser(user.id)}
                  title="Login as this user"
                >
                  👤
                </button>
                <button
                  style={{ ...styles.button, ...styles.secondaryBtn, padding: '0.25rem 0.5rem' }}
                  onClick={() => setEditingUser(user)}
                >
                  Edit
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Role Reference */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Role Reference</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
          {USER_ROLES.map(role => (
            <div
              key={role}
              style={{
                ...styles.roleCard,
                backgroundColor: ROLE_COLORS[role].bg + '20',
                borderColor: ROLE_COLORS[role].bg,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                {ROLE_DISPLAY_NAMES[role]}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                {ROLE_DESCRIPTIONS[role]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createUser}
        />
      )}
      
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={(updates) => updateUser(editingUser.id, updates)}
          onDelete={() => deleteUser(editingUser.id)}
        />
      )}
    </div>
  );
}
