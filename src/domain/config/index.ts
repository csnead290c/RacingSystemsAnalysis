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

// Capabilities model (plans, roles, hasCap)
export {
  type PlanId,
  type RoleId,
  type Capability,
  type UserCapabilityContext,
  type PlanInfo,
  type RoleInfo,
  type TrialState,
  PLAN_IDS,
  ROLE_IDS,
  PLANS,
  ROLES,
  CAPABILITY_KEYS,
  CAPABILITY_ALIASES,
  PLAN_CAPABILITIES,
  ROLE_CAPABILITIES,
  NO_TRIAL,
  hasCap,
  getEffectiveCapabilities,
  isInstallCapability,
  resolveCapKey,
  planFromLegacyTier,
  trialFromLegacyTier,
  roleFromLegacyId,
  isFullAccessRole,
} from './capabilities';

// Capabilities hook
export {
  useCapabilities,
  notifyViewAsChange,
  type CapabilityState,
} from './useCapabilities';

// View As reactive store
export { viewAsSubscribe, viewAsSnapshot } from './viewAsStore';

// Dev View As override
export {
  type DevViewAsOverride,
  type ViewAsLegacyAccess,
  DEFAULT_OVERRIDE,
  loadViewAsOverride,
  saveViewAsOverride,
  clearViewAsOverride,
  isViewAsAllowed,
  getViewAsLegacyAccess,
  getViewAsSubscriptionTier,
} from './devViewAs';

// Access guards
export {
  ET_SIM_FEATURE,
  ET_SIM_CAP,
  RACE_TOOLS_FEATURE,
  RACE_TOOLS_CAP,
  RUN_LOGGING_FEATURE,
  RUN_LOGGING_CAP,
  VEHICLES_FEATURE,
  VEHICLES_CAP,
  canAccessEtSim,
  canAccessRaceTools,
  canAccessRunLogging,
  canAccessVehicles,
  useEtSimAccess,
  useAccessDiagnostics,
  useSimAccessDiagnostics,
  type GuardDeps,
  type SimGateDiag,
  type SimAccessDiagnostics,
} from './guards';

// Race lengths
export { DISTANCES, RACE_LENGTH_INFO, type RaceLength } from './raceLengths';

// Tracks
export { TRACKS, type Track } from './tracks';

// Tooltips
export { TOOLTIPS } from './tooltips';
