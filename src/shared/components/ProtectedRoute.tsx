/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication or specific features/products.
 * Supports both Clerk OAuth and legacy authentication.
 */

import { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, useClerkRSA } from '../../domain/auth';
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
  const { isClerkLoaded, isClerkSignedIn } = useClerkRSA();

  // ── Step 1: Clerk not loaded yet → always show Loading ──
  if (isLoading || !isClerkLoaded) {
    return <LoadingPlaceholder />;
  }

  // ── Step 2: Either auth system says signed in → allow ──
  const isUserAuthenticated = isAuthenticated || isClerkSignedIn;
  if (isUserAuthenticated) {
    // fall through to role / feature / product checks below
  } else if (requireAuth) {
    // ── Step 3: Not authenticated — but is Clerk still restoring? ──
    // On hard navigation Clerk can report isSignedIn=false for up to ~2 s
    // while it re-validates the session cookie.  If we see evidence of a
    // prior Clerk session (currentUser with clerk_ prefix, or the session
    // flag), hold off before redirecting.
    return <ClerkGraceGate location={location} />;
  }

  // Check role access
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
 * Loading placeholder shown while auth state is being determined.
 */
function LoadingPlaceholder() {
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

/**
 * Grace gate for Clerk session restoration.
 * On hard navigation, Clerk can briefly report isSignedIn=false while restoring.
 * If we detect evidence of a prior Clerk session, wait up to 2 s before redirecting.
 */
function ClerkGraceGate({ location }: { location: ReturnType<typeof useLocation> }) {
  const { isAuthenticated } = useAuth();
  const { isClerkSignedIn } = useClerkRSA();
  const [graceExpired, setGraceExpired] = useState(false);
  const mountTime = useRef(Date.now());

  // Evidence that a Clerk session likely exists
  const storedUser = localStorage.getItem('rsa.auth.currentUser');
  const hadClerkUser = storedUser ? storedUser.includes('"clerk_') : false;
  const hadClerkFlag = localStorage.getItem('rsa.auth.clerkSession') === 'true';
  const likelyClerkSession = hadClerkUser || hadClerkFlag;

  // If auth resolves while waiting, this component won't render (parent handles it).
  // But if we get here, auth is NOT resolved yet.

  useEffect(() => {
    // No evidence of prior Clerk session → redirect immediately
    if (!likelyClerkSession) {
      setGraceExpired(true);
      return;
    }
    const timer = setTimeout(() => setGraceExpired(true), 2000);
    return () => clearTimeout(timer);
  }, [likelyClerkSession]);

  // Re-check on every render: if auth resolved during grace, allow through
  const isNowAuthenticated = isAuthenticated || isClerkSignedIn;
  if (isNowAuthenticated) {
    // Auth resolved during grace — parent will re-render and handle normally
    // This shouldn't normally be reached because parent checks first,
    // but just in case, return null to avoid flash
    return null;
  }

  if (!graceExpired) {
    return <LoadingPlaceholder />;
  }

  // TEMP DEBUG: Log exactly why we're redirecting (remove after fix confirmed)
  console.warn('[ProtectedRoute] Redirecting to /login', {
    isClerkSignedIn,
    isAuthenticated,
    path: location.pathname,
    hadClerkUser,
    hadClerkFlag,
    graceMs: Date.now() - mountTime.current,
    currentUserSnippet: storedUser ? storedUser.slice(0, 80) : null,
  });

  return <Navigate to="/login" state={{ from: location }} replace />;
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
