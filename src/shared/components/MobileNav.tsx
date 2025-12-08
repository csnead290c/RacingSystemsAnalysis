/**
 * Mobile Navigation Component
 * 
 * Bottom navigation bar for mobile devices with quick access to key features.
 */

import { Link, useLocation } from 'react-router-dom';
import { useIsMobile } from '../hooks/useResponsive';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/predict', label: 'Sim', icon: '🏎️' },
  { path: '/log', label: 'Log', icon: '📝' },
  { path: '/dial-in', label: 'Dial', icon: '🎯' },
  { path: '/race-day', label: 'Race', icon: '🏁' },
];

export default function MobileNav() {
  const isMobile = useIsMobile();
  const location = useLocation();

  if (!isMobile) {
    return null;
  }

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'var(--color-surface)',
      borderTop: '1px solid var(--color-border)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '8px 0',
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      zIndex: 1000,
    }}>
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              padding: '4px 12px',
              textDecoration: 'none',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontSize: '0.7rem',
              fontWeight: isActive ? 600 : 400,
              transition: 'color 0.15s ease',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Spacer component to prevent content from being hidden behind mobile nav
 */
export function MobileNavSpacer() {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return null;
  }

  return <div style={{ height: '70px' }} />;
}
