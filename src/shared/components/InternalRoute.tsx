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
import { useCapabilities } from '../../domain/config/useCapabilities';
import { getQuarterProgramName, getEngineProgramName } from '../../domain/ui/programDisplayNames';
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
  const { can } = useCapabilities();
  const coreModules = [
    { to: '/et-sim', label: getQuarterProgramName(can), icon: '🏁' },
    { to: '/engine-sim', label: getEngineProgramName(can), icon: '🔧' },
    { to: '/vehicles', label: 'Vehicles', icon: '🚗' },
    { to: '/calculators', label: 'Calculators', icon: '🔢' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      padding: '2rem 1rem',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '3.5rem',
        marginBottom: '0.75rem',
        lineHeight: 1,
      }}>🚧</div>
      <h2 style={{
        margin: '0 0 0.5rem 0',
        fontSize: '1.5rem',
        color: 'var(--color-text)',
      }}>Coming Soon</h2>
      <p style={{
        color: 'var(--color-muted)',
        maxWidth: '440px',
        marginBottom: '1.5rem',
        lineHeight: 1.5,
        fontSize: '0.9rem',
      }}>
        This feature is under active development and will be available in a future update.
        In the meantime, check out what's available now:
      </p>

      {/* Core module quick links */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.5rem',
        width: '100%',
        maxWidth: '500px',
        marginBottom: '1.5rem',
      }}>
        {coreModules.map(mod => (
          <Link
            key={mod.to}
            to={mod.to}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: 500,
              transition: 'border-color 0.15s',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{mod.icon}</span>
            {mod.label}
          </Link>
        ))}
      </div>

      <Link
        to="/"
        style={{
          padding: '0.5rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          textDecoration: 'none',
          fontSize: '0.85rem',
          fontWeight: 500,
        }}
      >
        Back to Home
      </Link>
    </div>
  );
}
