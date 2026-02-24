/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication or specific features/products.
 * Uses legacy RSA auth only (rsa_token + authStore).
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../domain/auth';
import type { FeatureFlag } from '../../domain/auth/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Require user to be authenticated */
  requireAuth?: boolean;
  /** Require specific feature flag */
  requireFeature?: FeatureFlag;
  /** Require specific product */
  requireProduct?: string;
  /** Require specific role(s) */
  requireRole?: string | string[];
  /** Custom fallback (default: redirect to login or show access denied) */
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  requireFeature,
  requireProduct,
  requireRole,
  fallback,
}: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, hasFeature, hasProduct, user } = useAuth();

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

  // Check role access (do NOT logout — show AccessDenied instead)
  if (requireRole) {
    const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
    const userRole = user?.roleId;
    if (!userRole || !roles.includes(userRole)) {
      if (fallback) return <>{fallback}</>;
      return <AccessDenied role={roles.join(' or ')} />;
    }
  }

  // Check feature access
  if (requireFeature) {
    const hasIt = hasFeature(requireFeature);
    if (!hasIt) {
      if (fallback) return <>{fallback}</>;
      return <AccessDenied feature={requireFeature} />;
    }
  }

  // Check product access
  if (requireProduct && !hasProduct(requireProduct)) {
    if (fallback) return <>{fallback}</>;
    return <AccessDenied product={requireProduct} />;
  }

  return <>{children}</>;
}

/**
 * Access Denied Component
 */
function AccessDenied({ feature, product, role }: { feature?: string; product?: string; role?: string }) {
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
      <p style={{ color: 'var(--color-muted)', maxWidth: '400px' }}>
        {role
          ? `This page requires ${role} access.`
          : product 
            ? `This feature requires the ${product.replace(/_/g, ' ')} product.`
            : feature === 'et_sim'
              ? 'The ET Simulator requires a Basic (Racer) plan or higher.'
              : feature === 'race_tools'
                ? 'Race Day, Dial-In, and related tools require a Basic (Racer) plan or higher.'
                : feature === 'run_logging'
                  ? 'Run logging and history require a Basic (Racer) plan or higher.'
                  : feature === 'save_vehicles'
                    ? 'Vehicle management requires a Basic (Racer) plan or higher.'
                    : feature
                    ? `You don't have access to the ${feature.replace(/_/g, ' ')} feature.`
                    : 'You don\'t have permission to access this page.'
        }
      </p>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
        {feature === 'et_sim' || feature === 'race_tools' || feature === 'run_logging' || feature === 'save_vehicles'
          ? 'Upgrade to the Racer plan to unlock simulation, race tools, run logging, and more.'
          : 'Please contact support to upgrade your account.'
        }
      </p>
    </div>
  );
}

/**
 * Hook to check if current user can access a feature
 */
export function useCanAccess(feature?: FeatureFlag, product?: string): boolean {
  const { isAuthenticated, hasFeature, hasProduct } = useAuth();
  
  if (!isAuthenticated) return false;
  if (feature && !hasFeature(feature)) return false;
  if (product && !hasProduct(product)) return false;
  
  return true;
}

/**
 * Component that only renders children if user has access
 */
export function RequireAccess({
  children,
  feature,
  product,
  fallback = null,
}: {
  children: React.ReactNode;
  feature?: FeatureFlag;
  product?: string;
  fallback?: React.ReactNode;
}) {
  const canAccess = useCanAccess(feature, product);
  return canAccess ? <>{children}</> : <>{fallback}</>;
}
