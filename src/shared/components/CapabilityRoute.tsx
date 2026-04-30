/**
 * Capability Route Component
 * 
 * Unified route protection using the capability system.
 * Replaces ProtectedRoute for capability-based access control.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../domain/auth';
import { useCapabilities } from '../../domain/config/useCapabilities';
import type { Capability } from '../../domain/config/capabilities';

interface CapabilityRouteProps {
  children: React.ReactNode;
  /** Require specific capability or capabilities */
  requireCap?: Capability | Capability[];
  /** Require user to be authenticated (default: true) */
  requireAuth?: boolean;
  /** Custom fallback component */
  fallback?: React.ReactNode;
}

export default function CapabilityRoute({
  children,
  requireCap,
  requireAuth = true,
  fallback,
}: CapabilityRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const { can } = useCapabilities();

  // Still loading auth state
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        color: 'var(--color-muted)',
      }}>
        Loading...
      </div>
    );
  }

  // Check authentication
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check capability access
  if (requireCap) {
    const caps = Array.isArray(requireCap) ? requireCap : [requireCap];
    const hasAllCaps = caps.every(cap => can(cap));
    
    if (!hasAllCaps) {
      if (fallback) return <>{fallback}</>;
      return <AccessDenied capabilities={caps} />;
    }
  }

  return <>{children}</>;
}

/**
 * Access Denied Component
 */
function AccessDenied({ capabilities }: { capabilities: Capability[] }) {
  const capabilityMessages: Record<string, string> = {
    'data.vehicles': 'Vehicle management requires a Basic (Racer) plan or higher.',
    'sim.et': 'The ET Simulator requires a Basic (Racer) plan or higher.',
    'sim.raceTools': 'Race Day tools require a Basic (Racer) plan or higher.',
    'data.runLog': 'Run logging and history require a Basic (Racer) plan or higher.',
    'vehicle.editor.pro': 'Advanced vehicle editor requires a Pro plan or higher.',
    'engine.proMode': 'Engine Pro features require a Pro plan or higher.',
    'nhra.parity': 'NHRA Parity Portal requires NHRA plan access.',
    'nhra.tech.read': 'NHRA Tech Master requires NHRA plan access.',
    'admin.access': 'This page requires administrator access.',
  };

  const primaryCap = capabilities[0];
  const message = capabilityMessages[primaryCap] || 
    `You don't have access to this feature. Required capability: ${primaryCap}`;

  const upgradeMessage = primaryCap.startsWith('nhra.')
    ? 'Contact your administrator for NHRA access.'
    : primaryCap.startsWith('admin.')
      ? 'This feature is restricted to administrators.'
      : 'Upgrade your plan to unlock this feature.';

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
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
      <h2 style={{ margin: '0 0 0.5rem 0' }}>Access Restricted</h2>
      <p style={{ color: 'var(--color-muted)', maxWidth: '400px', marginBottom: '0.5rem' }}>
        {message}
      </p>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
        {upgradeMessage}
      </p>
    </div>
  );
}

/**
 * Hook to check if current user has a capability
 */
export function useHasCapability(capability: Capability): boolean {
  const { can } = useCapabilities();
  return can(capability);
}

/**
 * Component that only renders children if user has capability
 */
export function RequireCapability({
  children,
  capability,
  fallback = null,
}: {
  children: React.ReactNode;
  capability: Capability;
  fallback?: React.ReactNode;
}) {
  const hasCap = useHasCapability(capability);
  return hasCap ? <>{children}</> : <>{fallback}</>;
}
