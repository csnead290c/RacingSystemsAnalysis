import { Link } from 'react-router-dom';
import { useAuth } from '../domain/auth';
import { useCapabilities } from '../domain/config/useCapabilities';
import { getQuarterProgramName, getEngineProgramName } from '../domain/ui/programDisplayNames';
import type { Capability } from '../domain/config/capabilities';
import {
  PUBLIC_CORE_ROUTES,
  INTERNAL_ROUTES,
  isInternalUser,
  buildVisibilityContext,
} from '../domain/ui/publicSurface';

function labelForCoreRoute(
  path: (typeof PUBLIC_CORE_ROUTES)[number],
  can: (cap: Capability) => boolean,
): string {
  switch (path) {
    case '/et-sim':
      return getQuarterProgramName(can);
    case '/engine-sim':
      return getEngineProgramName(can);
    case '/vehicles':
      return 'Vehicles';
    case '/calculators':
      return 'Calculators';
    case '/about':
      return 'About';
    default:
      return path;
  }
}

function iconForCoreRoute(path: (typeof PUBLIC_CORE_ROUTES)[number]): string {
  switch (path) {
    case '/et-sim':
      return '🏁';
    case '/engine-sim':
      return '🔧';
    case '/vehicles':
      return '🚗';
    case '/calculators':
      return '🔢';
    case '/about':
      return 'ℹ️';
    default:
      return '➡️';
  }
}

export default function NotFound() {
  const { user } = useAuth();
  const { can } = useCapabilities();
  const internal = isInternalUser(buildVisibilityContext(user?.roleId));
  const showInternalLinks = user?.roleId === 'owner' || user?.roleId === 'admin';

  const coreLinks = PUBLIC_CORE_ROUTES.map((path) => ({
    to: path,
    label: labelForCoreRoute(path, can),
    icon: iconForCoreRoute(path),
  }));

  const internalLinks = Array.from(new Set(Object.keys(INTERNAL_ROUTES))).sort();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '420px',
        padding: '2rem 1rem',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem', lineHeight: 1 }}>🧭</div>
      <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: 'var(--color-text)' }}>
        Page Not Found
      </h2>
      <p
        style={{
          color: 'var(--color-muted)',
          maxWidth: '520px',
          marginBottom: '1.5rem',
          lineHeight: 1.5,
          fontSize: '0.9rem',
        }}
      >
        That route doesn&apos;t exist. Here are the core modules available in RSA:
      </p>

      <div
        data-testid="rsa-notfound-core-links"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.5rem',
          width: '100%',
          maxWidth: '520px',
          marginBottom: internal ? '1.25rem' : '0',
        }}
      >
        {coreLinks.map((mod) => (
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
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{mod.icon}</span>
            {mod.label}
          </Link>
        ))}
      </div>

      {showInternalLinks && (
        <div
          style={{
            width: '100%',
            maxWidth: '520px',
            marginTop: '1.25rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--color-border)',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Internal links
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {internalLinks.map((path) => (
              <Link
                key={path}
                to={path}
                style={{
                  padding: '0.35rem 0.6rem',
                  borderRadius: '999px',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  textDecoration: 'none',
                  fontSize: '0.75rem',
                }}
              >
                {path}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
