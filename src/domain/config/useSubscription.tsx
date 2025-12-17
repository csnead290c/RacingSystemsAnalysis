/**
 * Subscription Hook
 * 
 * Provides the current user's subscription tier and feature access.
 * This is the main interface for components to check what the user can access.
 */

import { useMemo } from 'react';
import { useAuth } from '../auth';
import {
  SubscriptionTier,
  TierFeatures,
  TIER_FEATURES,
  TIER_INFO,
  getTierFromPlan,
  getTierFromRole,
  tierHasFeature,
  getVehicleLimit,
  getRunLimit,
  getTeamSeatLimit,
} from './entitlements';

export interface SubscriptionState {
  /** Current subscription tier */
  tier: SubscriptionTier;
  /** Tier display info */
  tierInfo: typeof TIER_INFO[SubscriptionTier];
  /** All features for this tier */
  features: TierFeatures;
  /** Check if a specific feature is enabled */
  hasFeature: (feature: keyof TierFeatures) => boolean;
  /** Vehicle limit for this tier */
  vehicleLimit: number;
  /** Run limit for this tier */
  runLimit: number;
  /** Team seat limit for this tier */
  teamSeatLimit: number;
  /** Check if user can create more vehicles */
  canCreateVehicle: (currentCount: number) => boolean;
  /** Check if user can save more runs */
  canSaveRun: (currentCount: number) => boolean;
  /** Whether user is on a paid tier */
  isPaid: boolean;
  /** Whether user has team features */
  isTeam: boolean;
  /** Whether user is beta/owner with full access */
  isFullAccess: boolean;
}

/**
 * Hook to get the current user's subscription state
 */
export function useSubscription(): SubscriptionState {
  const { user, isAuthenticated } = useAuth();
  
  const tier = useMemo((): SubscriptionTier => {
    if (!isAuthenticated || !user) return 'free';
    
    // Check role first (owner, admin, beta take precedence)
    const roleId = user.roleId;
    if (roleId === 'owner') return 'owner';
    if (roleId === 'admin') return 'owner';
    if (roleId === 'beta_tester' || roleId === 'beta') return 'beta';
    
    // Then check subscription plan from localStorage or user data
    const storedUser = localStorage.getItem('rsa.auth.currentUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.subscription_plan) {
          return getTierFromPlan(parsed.subscription_plan);
        }
      } catch {
        // Ignore parse errors
      }
    }
    
    // Fall back to role-based tier
    return getTierFromRole(roleId);
  }, [isAuthenticated, user]);
  
  const features = useMemo(() => TIER_FEATURES[tier], [tier]);
  const tierInfo = useMemo(() => TIER_INFO[tier], [tier]);
  
  const hasFeature = useMemo(
    () => (feature: keyof TierFeatures) => tierHasFeature(tier, feature),
    [tier]
  );
  
  const vehicleLimit = useMemo(() => getVehicleLimit(tier), [tier]);
  const runLimit = useMemo(() => getRunLimit(tier), [tier]);
  const teamSeatLimit = useMemo(() => getTeamSeatLimit(tier), [tier]);
  
  const canCreateVehicle = useMemo(
    () => (currentCount: number) => currentCount < vehicleLimit,
    [vehicleLimit]
  );
  
  const canSaveRun = useMemo(
    () => (currentCount: number) => currentCount < runLimit,
    [runLimit]
  );
  
  const isPaid = tier === 'racer' || tier === 'pro' || tier === 'team';
  const isTeam = tier === 'team';
  const isFullAccess = tier === 'beta' || tier === 'owner';
  
  return {
    tier,
    tierInfo,
    features,
    hasFeature,
    vehicleLimit,
    runLimit,
    teamSeatLimit,
    canCreateVehicle,
    canSaveRun,
    isPaid,
    isTeam,
    isFullAccess,
  };
}

/**
 * Component to conditionally render based on feature access
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
  showUpgrade = false,
}: {
  feature: keyof TierFeatures;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
}): React.ReactElement | null {
  const { hasFeature, tierInfo } = useSubscription();
  
  if (hasFeature(feature)) {
    return <>{children}</>;
  }
  
  if (showUpgrade) {
    return (
      <div style={{
        padding: '1rem',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔒</div>
        <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
          Upgrade to unlock this feature
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>
          Your current plan: <span style={{ color: tierInfo.color }}>{tierInfo.name}</span>
        </div>
      </div>
    );
  }
  
  return <>{fallback}</>;
}

/**
 * Component to show upgrade prompt for a feature
 */
export function UpgradePrompt({
  feature,
  message,
  compact = false,
}: {
  feature: keyof TierFeatures;
  message?: string;
  compact?: boolean;
}): React.ReactElement | null {
  const { hasFeature } = useSubscription();
  
  if (hasFeature(feature)) return null;
  
  if (compact) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.75rem',
        color: 'var(--color-muted)',
        padding: '0.125rem 0.5rem',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-border)',
      }}>
        🔒 Pro
      </span>
    );
  }
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 0.75rem',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: 'var(--radius-sm)',
      fontSize: '0.875rem',
    }}>
      <span>🔒</span>
      <span>{message || 'Upgrade to Pro to unlock this feature'}</span>
    </div>
  );
}

/**
 * Hook to check a single feature
 */
export function useFeatureAccess(feature: keyof TierFeatures): boolean {
  const { hasFeature } = useSubscription();
  return hasFeature(feature);
}

/**
 * Hook to get vehicle limit info
 */
export function useVehicleLimit(): {
  limit: number;
  canCreate: (count: number) => boolean;
  isUnlimited: boolean;
} {
  const { vehicleLimit, canCreateVehicle } = useSubscription();
  return {
    limit: vehicleLimit,
    canCreate: canCreateVehicle,
    isUnlimited: vehicleLimit === Infinity,
  };
}
