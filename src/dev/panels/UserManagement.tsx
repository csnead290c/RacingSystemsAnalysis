/**
 * User Management Panel — DEPRECATED
 * 
 * User management has moved to the Admin Portal (/admin).
 * This panel now shows a read-only deprecation notice and link.
 */

import { useNavigate } from 'react-router-dom';

export default function UserManagement() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Deprecation Banner */}
      <div style={{
        padding: '1rem 1.25rem',
        backgroundColor: 'rgba(251, 191, 36, 0.12)',
        border: '1px solid rgba(251, 191, 36, 0.35)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.5rem',
      }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fbbf24', marginBottom: '0.35rem' }}>
          User Management Has Moved
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--color-text)', lineHeight: 1.5 }}>
          All user management — search, details, subscription overrides, capability grants,
          and audit logs — is now in the <strong>Admin Portal</strong>.
          This Dev Portal panel is retained for reference only.
        </div>
      </div>

      {/* Action */}
      <button
        onClick={() => navigate('/admin')}
        style={{
          padding: '0.6rem 1.25rem',
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}
      >
        Open Admin Portal
      </button>

      {/* What moved */}
      <div style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--color-muted)', lineHeight: 1.6 }}>
        <strong>Admin Portal (/admin) provides:</strong>
        <ul style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
          <li>User search &amp; details (Stripe, subscription, capabilities)</li>
          <li>Capability grants &amp; revokes with expiry and audit trail</li>
          <li>Audit log viewer</li>
        </ul>
        <div style={{ marginTop: '0.75rem' }}>
          <strong>Canonical access model:</strong> Plans &amp; Capabilities panel (this Dev Portal)
          shows the read-only capability matrix. Admin Portal is the only place to change user state.
        </div>
      </div>
    </div>
  );
}
