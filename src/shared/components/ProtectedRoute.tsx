/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication or specific features/products.
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
  /** Custom fallback (default: redirect to login or show access denied) */
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  requireFeature,
  requireProduct,
  fallback,
}: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, hasFeature, hasProduct } = useAuth();

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

  // Check feature access
  if (requireFeature && !hasFeature(requireFeature)) {
    if (fallback) return <>{fallback}</>;
    return <AccessDenied feature={requireFeature} />;
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
function AccessDenied({ feature, product }: { feature?: string; product?: string }) {
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
        {product 
          ? `This feature requires the ${product.replace(/_/g, ' ')} product.`
          : feature
            ? `You don't have access to the ${feature.replace(/_/g, ' ')} feature.`
            : 'You don\'t have permission to access this page.'
        }
      </p>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
        Please contact support to upgrade your account.
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
