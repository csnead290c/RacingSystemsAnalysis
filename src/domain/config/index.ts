/**
 * Config Module Exports
 */

// Entitlements and subscription tiers
export {
  type SubscriptionTier,
  type TierFeatures,
  type Tier,
  type TierEntitlements,
  TIER_LIMITS,
  TIER_FEATURES,
  TIER_INFO,
  ENTITLEMENTS,
  CURRENT_TIER,
  getTierFromPlan,
  getTierFromRole,
  getTierFeatures,
  tierHasFeature,
  getVehicleLimit,
  getRunLimit,
  getTeamSeatLimit,
  canCreateVehicle,
  canSaveRun,
  getEntitlements,
  hasFeature,
} from './entitlements';

// Subscription hook and components
export {
  useSubscription,
  useFeatureAccess,
  useVehicleLimit,
  FeatureGate,
  UpgradePrompt,
  type SubscriptionState,
} from './useSubscription';

// Race lengths
export { DISTANCES, RACE_LENGTH_INFO, type RaceLength } from './raceLengths';

// Tracks
export { TRACKS, type Track } from './tracks';

// Tooltips
export { TOOLTIPS } from './tooltips';
