/**
 * InternalRoute — route guard for internal-only modules.
 *
 * Wraps routes that should only be accessible to internal users
 * (dev/owner/admin). Non-internal users see a "Coming Soon" page
 * instead of the actual content.
 *
 * This is layered ON TOP of ProtectedRoute (auth + feature checks).
 * Usage:
 *   <ProtectedRoute requireFeature={...}>
 *     <InternalRoute>
 *       <SomePage />
 *     </InternalRoute>
 *   </ProtectedRoute>
 *
 * Or standalone:
 *   <InternalRoute>
 *     <SomePage />
 *   </InternalRoute>
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../../domain/auth';
import { isInternalUser, buildVisibilityContext } from '../../domain/ui/publicSurface';

interface InternalRouteProps {
  children: React.ReactNode;
}

export default function InternalRoute({ children }: InternalRouteProps) {
  const { user } = useAuth();
  const ctx = buildVisibilityContext(user?.roleId);

  if (isInternalUser(ctx)) {
    return <>{children}</>;
  }

  return <ComingSoon />;
}

function ComingSoon() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '300px',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚧</div>
      <h2 style={{ margin: '0 0 0.5rem 0' }}>Coming Soon</h2>
      <p style={{ color: 'var(--color-muted)', maxWidth: '400px', marginBottom: '1.5rem' }}>
        This feature is currently under development and will be available in a future update.
      </p>
      <Link
        to="/"
        style={{
          padding: '0.5rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          textDecoration: 'none',
          fontSize: '0.9rem',
          fontWeight: 500,
        }}
      >
        Back to Home
      </Link>
    </div>
  );
}
