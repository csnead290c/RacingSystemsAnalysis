/**
 * Subscription Tier Entitlements
 * 
 * Centralized configuration for all subscription tier limits and features.
 * This is the single source of truth for what each tier can access.
 * 
 * Tiers:
 * - FREE: Unauthenticated or no subscription (very limited demo)
 * - RACER: Entry-level subscription ($9.99/mo) - Quarter Jr features
 * - PRO: Professional subscription ($24.99/mo) - Full Quarter Pro features
 * - TEAM: Team subscription ($49.99/mo) - Pro features + team management
 * - BETA: Beta testers - Full access during beta period
 * - OWNER: Site owner/admin - Full access always
 */

export type SubscriptionTier = 'free' | 'racer' | 'pro' | 'team' | 'beta' | 'owner';

// ============================================================================
// Limits Configuration (easily adjustable)
// ============================================================================

export const TIER_LIMITS = {
  /** Maximum vehicles per tier */
  vehicles: {
    free: 1,
    racer: 5,
    pro: Infinity,  // Unlimited for now, can add limit later
    team: Infinity,
    beta: Infinity,
    owner: Infinity,
  },
  /** Maximum saved runs per tier */
  runs: {
    free: 10,
    racer: 100,
    pro: 1000,
    team: Infinity,
    beta: Infinity,
    owner: Infinity,
  },
  /** Team seats (only applies to team tier) */
  teamSeats: {
    free: 0,
    racer: 0,
    pro: 0,
    team: 5,  // Default seats included with team subscription
    beta: 0,
    owner: Infinity,
  },
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

export interface TierFeatures {
  // Vehicle Editor
  quarterJrFields: boolean;      // Basic vehicle fields (weight, HP, gear ratios, etc.)
  quarterProFields: boolean;     // Advanced fields (aero, tire growth, launch settings)
  throttleStop: boolean;         // Throttle stop configuration
  
  // Track/Sim Options
  trackEighth: boolean;          // 1/8 mile
  trackQuarter: boolean;         // 1/4 mile
  trackThousand: boolean;        // 1000 ft
  trackBonneville: boolean;      // Land speed (Bonneville, El Mirage, etc.)
  customTrackLength: boolean;    // User-defined track length
  
  // Weather
  manualWeather: boolean;        // Manual weather entry
  liveWeather: boolean;          // Live weather lookup from API
  weatherHistory: boolean;       // Historical weather data
  
  // Simulation Features
  basicSim: boolean;             // Basic ET/MPH prediction
  advancedSim: boolean;          // Full simulation with incremental data
  runCompletion: boolean;        // Run completion from partial data
  learning: boolean;             // Adaptive learning/corrections
  
  // Optimizers
  gearOptimizer: boolean;        // Gear ratio optimizer
  launchOptimizer: boolean;      // Launch/60ft optimizer
  throttleStopOptimizer: boolean; // Throttle stop duration optimizer
  
  // Data & Charts
  basicCharts: boolean;          // Simple result charts
  advancedCharts: boolean;       // Detailed analysis charts
  dataExport: boolean;           // CSV/JSON export
  dataImport: boolean;           // Import from files
  
  // Team Features
  teamManagement: boolean;       // Add/remove team members
  sharedVehicles: boolean;       // Share vehicles with team
  sharedRuns: boolean;           // Share run history with team
  
  // Admin Features
  devTools: boolean;             // Developer tools panel
  userManagement: boolean;       // Manage other users
}

export const TIER_FEATURES: Record<SubscriptionTier, TierFeatures> = {
  free: {
    // Vehicle Editor - very limited
    quarterJrFields: true,
    quarterProFields: false,
    throttleStop: false,
    
    // Track - demo only
    trackEighth: true,
    trackQuarter: true,
    trackThousand: false,
    trackBonneville: false,
    customTrackLength: false,
    
    // Weather - manual only
    manualWeather: true,
    liveWeather: false,
    weatherHistory: false,
    
    // Simulation - basic only
    basicSim: true,
    advancedSim: false,
    runCompletion: false,
    learning: false,
    
    // Optimizers - none
    gearOptimizer: false,
    launchOptimizer: false,
    throttleStopOptimizer: false,
    
    // Data - none
    basicCharts: true,
    advancedCharts: false,
    dataExport: false,
    dataImport: false,
    
    // Team - none
    teamManagement: false,
    sharedVehicles: false,
    sharedRuns: false,
    
    // Admin - none
    devTools: false,
    userManagement: false,
  },
  
  racer: {
    // Vehicle Editor - Quarter Jr only
    quarterJrFields: true,
    quarterProFields: false,
    throttleStop: false,
    
    // Track - 1/8 and 1/4 only
    trackEighth: true,
    trackQuarter: true,
    trackThousand: false,
    trackBonneville: false,
    customTrackLength: false,
    
    // Weather - manual only
    manualWeather: true,
    liveWeather: false,
    weatherHistory: false,
    
    // Simulation - basic with run completion
    basicSim: true,
    advancedSim: false,
    runCompletion: true,
    learning: true,
    
    // Optimizers - none
    gearOptimizer: false,
    launchOptimizer: false,
    throttleStopOptimizer: false,
    
    // Data - basic charts, no export
    basicCharts: true,
    advancedCharts: false,
    dataExport: false,
    dataImport: false,
    
    // Team - none
    teamManagement: false,
    sharedVehicles: false,
    sharedRuns: false,
    
    // Admin - none
    devTools: false,
    userManagement: false,
  },
  
  pro: {
    // Vehicle Editor - full access
    quarterJrFields: true,
    quarterProFields: true,
    throttleStop: true,
    
    // Track - all options
    trackEighth: true,
    trackQuarter: true,
    trackThousand: true,
    trackBonneville: true,
    customTrackLength: true,
    
    // Weather - full access
    manualWeather: true,
    liveWeather: true,
    weatherHistory: true,
    
    // Simulation - full access
    basicSim: true,
    advancedSim: true,
    runCompletion: true,
    learning: true,
    
    // Optimizers - full access
    gearOptimizer: true,
    launchOptimizer: true,
    throttleStopOptimizer: true,
    
    // Data - full access
    basicCharts: true,
    advancedCharts: true,
    dataExport: true,
    dataImport: true,
    
    // Team - none (individual subscription)
    teamManagement: false,
    sharedVehicles: false,
    sharedRuns: false,
    
    // Admin - none
    devTools: false,
    userManagement: false,
  },
  
  team: {
    // Everything Pro has, plus team features
    quarterJrFields: true,
    quarterProFields: true,
    throttleStop: true,
    
    trackEighth: true,
    trackQuarter: true,
    trackThousand: true,
    trackBonneville: true,
    customTrackLength: true,
    
    manualWeather: true,
    liveWeather: true,
    weatherHistory: true,
    
    basicSim: true,
    advancedSim: true,
    runCompletion: true,
    learning: true,
    
    gearOptimizer: true,
    launchOptimizer: true,
    throttleStopOptimizer: true,
    
    basicCharts: true,
    advancedCharts: true,
    dataExport: true,
    dataImport: true,
    
    // Team features enabled
    teamManagement: true,
    sharedVehicles: true,
    sharedRuns: true,
    
    devTools: false,
    userManagement: false,
  },
  
  beta: {
    // Full access during beta period
    quarterJrFields: true,
    quarterProFields: true,
    throttleStop: true,
    
    trackEighth: true,
    trackQuarter: true,
    trackThousand: true,
    trackBonneville: true,
    customTrackLength: true,
    
    manualWeather: true,
    liveWeather: true,
    weatherHistory: true,
    
    basicSim: true,
    advancedSim: true,
    runCompletion: true,
    learning: true,
    
    gearOptimizer: true,
    launchOptimizer: true,
    throttleStopOptimizer: true,
    
    basicCharts: true,
    advancedCharts: true,
    dataExport: true,
    dataImport: true,
    
    teamManagement: false,
    sharedVehicles: false,
    sharedRuns: false,
    
    devTools: true,
    userManagement: false,
  },
  
  owner: {
    // Full access to everything
    quarterJrFields: true,
    quarterProFields: true,
    throttleStop: true,
    
    trackEighth: true,
    trackQuarter: true,
    trackThousand: true,
    trackBonneville: true,
    customTrackLength: true,
    
    manualWeather: true,
    liveWeather: true,
    weatherHistory: true,
    
    basicSim: true,
    advancedSim: true,
    runCompletion: true,
    learning: true,
    
    gearOptimizer: true,
    launchOptimizer: true,
    throttleStopOptimizer: true,
    
    basicCharts: true,
    advancedCharts: true,
    dataExport: true,
    dataImport: true,
    
    teamManagement: true,
    sharedVehicles: true,
    sharedRuns: true,
    
    devTools: true,
    userManagement: true,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the subscription tier from a subscription plan string
 */
export function getTierFromPlan(plan: string | null | undefined): SubscriptionTier {
  if (!plan) return 'free';
  
  const normalized = plan.toLowerCase();
  if (normalized === 'team') return 'team';
  if (normalized === 'pro') return 'pro';
  if (normalized === 'racer') return 'racer';
  if (normalized === 'beta') return 'beta';
  if (normalized === 'free' || normalized === 'none') return 'free';
  
  // Handle legacy tier names
  if (normalized === 'nitro') return 'team';
  if (normalized === 'junior') return 'racer';
  
  return 'free';
}

/**
 * Get the tier from a role ID
 */
export function getTierFromRole(roleId: string | null | undefined): SubscriptionTier {
  if (!roleId) return 'free';
  
  if (roleId === 'owner') return 'owner';
  if (roleId === 'admin') return 'owner';
  if (roleId === 'beta_tester' || roleId === 'beta') return 'beta';
  if (roleId === 'subscriber_pro') return 'pro';
  if (roleId === 'subscriber_basic') return 'racer';
  
  return 'free';
}

/**
 * Get features for a tier
 */
export function getTierFeatures(tier: SubscriptionTier): TierFeatures {
  return TIER_FEATURES[tier];
}

/**
 * Check if a tier has a specific feature
 */
export function tierHasFeature(tier: SubscriptionTier, feature: keyof TierFeatures): boolean {
  return TIER_FEATURES[tier][feature];
}

/**
 * Get the vehicle limit for a tier
 */
export function getVehicleLimit(tier: SubscriptionTier): number {
  return TIER_LIMITS.vehicles[tier];
}

/**
 * Get the run limit for a tier
 */
export function getRunLimit(tier: SubscriptionTier): number {
  return TIER_LIMITS.runs[tier];
}

/**
 * Get the team seat limit for a tier
 */
export function getTeamSeatLimit(tier: SubscriptionTier): number {
  return TIER_LIMITS.teamSeats[tier];
}

/**
 * Check if user can create more vehicles
 */
export function canCreateVehicle(tier: SubscriptionTier, currentCount: number): boolean {
  const limit = getVehicleLimit(tier);
  return currentCount < limit;
}

/**
 * Check if user can save more runs
 */
export function canSaveRun(tier: SubscriptionTier, currentCount: number): boolean {
  const limit = getRunLimit(tier);
  return currentCount < limit;
}

/**
 * Get tier display info
 */
export const TIER_INFO: Record<SubscriptionTier, { name: string; price: string; color: string; description: string }> = {
  free: {
    name: 'Free',
    price: '$0',
    color: '#6b7280',
    description: 'Limited demo access',
  },
  racer: {
    name: 'Racer',
    price: '$9.99/mo',
    color: '#22c55e',
    description: 'Essential tools for bracket racers',
  },
  pro: {
    name: 'Pro',
    price: '$24.99/mo',
    color: '#3b82f6',
    description: 'Full simulation and optimization suite',
  },
  team: {
    name: 'Team',
    price: '$49.99/mo',
    color: '#8b5cf6',
    description: 'Pro features for your entire race team',
  },
  beta: {
    name: 'Beta Tester',
    price: 'Free',
    color: '#f59e0b',
    description: 'Full access during beta period',
  },
  owner: {
    name: 'Owner',
    price: 'N/A',
    color: '#dc2626',
    description: 'Site owner with full access',
  },
};

// ============================================================================
// Legacy Compatibility (to be removed after migration)
// ============================================================================

export type Tier = 'FREE' | 'JUNIOR' | 'PRO' | 'NITRO';

export interface TierEntitlements {
  vehicles: number;
  runs: number;
  features: {
    runCompletion60: boolean;
    runCompletionFull: boolean;
    learning: boolean;
    proEditor: boolean;
    advancedCharts: boolean;
    dataExport: boolean;
  };
}

export const ENTITLEMENTS: Record<Tier, TierEntitlements> = {
  FREE: { vehicles: 1, runs: 50, features: { runCompletion60: true, runCompletionFull: false, learning: false, proEditor: false, advancedCharts: false, dataExport: false } },
  JUNIOR: { vehicles: 5, runs: 200, features: { runCompletion60: true, runCompletionFull: true, learning: true, proEditor: false, advancedCharts: false, dataExport: false } },
  PRO: { vehicles: Infinity, runs: 1000, features: { runCompletion60: true, runCompletionFull: true, learning: true, proEditor: true, advancedCharts: true, dataExport: false } },
  NITRO: { vehicles: Infinity, runs: Infinity, features: { runCompletion60: true, runCompletionFull: true, learning: true, proEditor: true, advancedCharts: true, dataExport: true } },
};

export function getEntitlements(tier: Tier): TierEntitlements {
  return ENTITLEMENTS[tier];
}

export function hasFeature(tier: Tier, feature: keyof TierEntitlements['features']): boolean {
  return ENTITLEMENTS[tier].features[feature];
}

export const CURRENT_TIER: Tier = 'FREE';
