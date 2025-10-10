/**
 * Entitlements and feature flags by tier.
 */

export type Tier = 'FREE' | 'JUNIOR' | 'PRO' | 'NITRO';

export interface TierEntitlements {
  /** Maximum number of vehicles */
  vehicles: number;
  /** Maximum number of runs */
  runs: number;
  /** Feature flags */
  features: {
    /** Run completion with 60' split only */
    runCompletion60: boolean;
    /** Run completion with all splits */
    runCompletionFull: boolean;
    /** Learning/adaptive corrections */
    learning: boolean;
    /** Pro vehicle editor */
    proEditor: boolean;
    /** Advanced charts */
    advancedCharts: boolean;
    /** Data export */
    dataExport: boolean;
  };
}

export const ENTITLEMENTS: Record<Tier, TierEntitlements> = {
  FREE: {
    vehicles: 1,
    runs: 50,
    features: {
      runCompletion60: true,
      runCompletionFull: false,
      learning: false,
      proEditor: false,
      advancedCharts: false,
      dataExport: false,
    },
  },
  JUNIOR: {
    vehicles: 3,
    runs: 200,
    features: {
      runCompletion60: true,
      runCompletionFull: true,
      learning: true,
      proEditor: false,
      advancedCharts: false,
      dataExport: false,
    },
  },
  PRO: {
    vehicles: 10,
    runs: 1000,
    features: {
      runCompletion60: true,
      runCompletionFull: true,
      learning: true,
      proEditor: true,
      advancedCharts: true,
      dataExport: false,
    },
  },
  NITRO: {
    vehicles: Infinity,
    runs: Infinity,
    features: {
      runCompletion60: true,
      runCompletionFull: true,
      learning: true,
      proEditor: true,
      advancedCharts: true,
      dataExport: true,
    },
  },
};

/**
 * Get entitlements for a tier.
 */
export function getEntitlements(tier: Tier): TierEntitlements {
  return ENTITLEMENTS[tier];
}

/**
 * Check if a feature is enabled for a tier.
 */
export function hasFeature(tier: Tier, feature: keyof TierEntitlements['features']): boolean {
  return ENTITLEMENTS[tier].features[feature];
}

/**
 * Current user tier (temporary constant for demo).
 * In production, this would come from user authentication/subscription.
 */
export const CURRENT_TIER: Tier = 'FREE';
