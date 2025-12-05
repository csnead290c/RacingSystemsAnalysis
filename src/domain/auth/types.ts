/**
 * Authentication and User Management Types
 * 
 * Role Hierarchy (highest to lowest):
 * - owner: Full system access, can manage all users and settings
 * - admin: Can manage users, access all features, view analytics
 * - beta_tester: Early access to new features, can provide feedback
 * - subscriber_pro: Paid tier - full Quarter Pro features
 * - subscriber_basic: Paid tier - Quarter Jr features
 * - trial: Limited time trial access
 * - guest: View-only, no saving
 * 
 * Future subscription tiers can be added here.
 */

// ============================================================================
// User Roles
// ============================================================================

/**
 * User roles in order of access level (highest to lowest)
 */
export const USER_ROLES = [
  'owner',
  'admin', 
  'beta_tester',
  'subscriber_pro',
  'subscriber_basic',
  'trial',
  'guest',
] as const;

export type UserRole = typeof USER_ROLES[number];

/**
 * Role display names
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  beta_tester: 'Beta Tester',
  subscriber_pro: 'Pro Subscriber',
  subscriber_basic: 'Basic Subscriber',
  trial: 'Trial User',
  guest: 'Guest',
};

/**
 * Role descriptions
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: 'Full system access - can manage all users, settings, and billing',
  admin: 'Administrative access - can manage users and access all features',
  beta_tester: 'Beta testing access - early access to new features with feedback capability',
  subscriber_pro: 'Pro subscription - full Quarter Pro features and priority support',
  subscriber_basic: 'Basic subscription - Quarter Jr features',
  trial: 'Trial access - limited time full access',
  guest: 'Guest access - view only, no saving or advanced features',
};

/**
 * Role badge colors for UI
 */
export const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  owner: { bg: '#7c3aed', text: '#fff' },      // Purple
  admin: { bg: '#dc2626', text: '#fff' },      // Red
  beta_tester: { bg: '#2563eb', text: '#fff' }, // Blue
  subscriber_pro: { bg: '#16a34a', text: '#fff' }, // Green
  subscriber_basic: { bg: '#65a30d', text: '#fff' }, // Lime
  trial: { bg: '#ca8a04', text: '#fff' },      // Yellow
  guest: { bg: '#6b7280', text: '#fff' },      // Gray
};

// ============================================================================
// User Account
// ============================================================================

/**
 * User account status
 */
export type AccountStatus = 'active' | 'suspended' | 'pending' | 'expired';

/**
 * User account
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: AccountStatus;
  
  // Timestamps
  createdAt: string;      // ISO date
  lastLoginAt?: string;   // ISO date
  
  // Subscription info (for paid tiers)
  subscription?: {
    plan: 'basic' | 'pro' | 'enterprise';
    startDate: string;
    endDate?: string;     // Undefined = lifetime/ongoing
    autoRenew: boolean;
  };
  
  // Trial info
  trial?: {
    startDate: string;
    endDate: string;
    extended: boolean;
  };
  
  // Beta tester info
  betaTester?: {
    invitedBy: string;    // User ID who invited
    invitedAt: string;
    feedbackCount: number;
  };
  
  // Preferences
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    units?: 'imperial' | 'metric';
    notifications?: boolean;
  };
  
  // Notes (admin only)
  adminNotes?: string;
}

/**
 * Minimal user info for display
 */
export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: AccountStatus;
}

// ============================================================================
// Access Control
// ============================================================================

/**
 * Feature flags that can be controlled by role
 */
export type Feature = 
  | 'view_dashboard'
  | 'run_simulation'
  | 'save_vehicles'
  | 'save_runs'
  | 'export_data'
  | 'import_data'
  | 'hp_curve_editor'
  | 'advanced_settings'
  | 'dev_tools'
  | 'user_management'
  | 'system_settings'
  | 'view_analytics'
  | 'beta_features';

/**
 * Feature access by role
 */
export const ROLE_FEATURES: Record<UserRole, Feature[]> = {
  owner: [
    'view_dashboard', 'run_simulation', 'save_vehicles', 'save_runs',
    'export_data', 'import_data', 'hp_curve_editor', 'advanced_settings',
    'dev_tools', 'user_management', 'system_settings', 'view_analytics', 'beta_features',
  ],
  admin: [
    'view_dashboard', 'run_simulation', 'save_vehicles', 'save_runs',
    'export_data', 'import_data', 'hp_curve_editor', 'advanced_settings',
    'dev_tools', 'user_management', 'view_analytics', 'beta_features',
  ],
  beta_tester: [
    'view_dashboard', 'run_simulation', 'save_vehicles', 'save_runs',
    'export_data', 'import_data', 'hp_curve_editor', 'advanced_settings',
    'beta_features',
  ],
  subscriber_pro: [
    'view_dashboard', 'run_simulation', 'save_vehicles', 'save_runs',
    'export_data', 'import_data', 'hp_curve_editor', 'advanced_settings',
  ],
  subscriber_basic: [
    'view_dashboard', 'run_simulation', 'save_vehicles', 'save_runs',
    'export_data',
  ],
  trial: [
    'view_dashboard', 'run_simulation', 'save_vehicles', 'save_runs',
    'export_data', 'import_data', 'hp_curve_editor', 'advanced_settings',
  ],
  guest: [
    'view_dashboard', 'run_simulation',
  ],
};

/**
 * Check if a role has access to a feature
 */
export function hasFeatureAccess(role: UserRole, feature: Feature): boolean {
  return ROLE_FEATURES[role]?.includes(feature) ?? false;
}

/**
 * Check if a role can manage another role
 */
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  const managerIndex = USER_ROLES.indexOf(managerRole);
  const targetIndex = USER_ROLES.indexOf(targetRole);
  
  // Can only manage roles below your own
  // Owner can manage everyone, admin can manage beta_tester and below
  return managerIndex < targetIndex;
}

/**
 * Get the program tier (userLevel) for a role
 * Maps auth roles to the existing userLevel system
 */
export function getRoleProgramTier(role: UserRole): 'quarterJr' | 'quarterPro' | 'admin' {
  switch (role) {
    case 'owner':
    case 'admin':
      return 'admin';
    case 'beta_tester':
    case 'subscriber_pro':
    case 'trial':
      return 'quarterPro';
    case 'subscriber_basic':
    case 'guest':
    default:
      return 'quarterJr';
  }
}

// ============================================================================
// Auth State
// ============================================================================

/**
 * Authentication state
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
}

/**
 * Initial auth state
 */
export const INITIAL_AUTH_STATE: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,
};
