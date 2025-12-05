/**
 * Authentication and User Management Types
 * 
 * This system supports:
 * - Configurable roles (can be added/edited/removed)
 * - Configurable products/features (QuarterJr, QuarterPro, BonnevillePro, etc.)
 * - Role-to-product access mapping
 * - User accounts with subscription tracking
 */

// ============================================================================
// Products / Features (the actual software modules)
// ============================================================================

/**
 * Product/Feature definition
 * These are the actual software modules users can access
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color: string;
  // Feature flags within this product
  features: string[];
  // Is this a premium/paid product?
  isPremium: boolean;
  // Sort order for display
  sortOrder: number;
}

/**
 * Default products matching the RSA product line
 */
export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'quarter_jr',
    name: 'Quarter Jr',
    description: 'Basic drag racing simulation - peak HP/RPM, calculated parameters',
    icon: '🏁',
    color: '#65a30d',
    features: ['basic_sim', 'save_vehicles', 'save_runs', 'export_csv'],
    isPremium: false,
    sortOrder: 1,
  },
  {
    id: 'quarter_pro',
    name: 'Quarter Pro',
    description: 'Full drag racing simulation - complete HP curve, all parameters',
    icon: '🏎️',
    color: '#16a34a',
    features: ['basic_sim', 'hp_curve_editor', 'advanced_settings', 'clutch_sim', 'save_vehicles', 'save_runs', 'export_csv', 'import_data'],
    isPremium: true,
    sortOrder: 2,
  },
  {
    id: 'bonneville_pro',
    name: 'Bonneville Pro',
    description: 'Top speed / land speed racing simulation',
    icon: '🚀',
    color: '#2563eb',
    features: ['basic_sim', 'hp_curve_editor', 'advanced_settings', 'bonneville_sim', 'save_vehicles', 'save_runs', 'export_csv', 'import_data'],
    isPremium: true,
    sortOrder: 3,
  },
  {
    id: 'engine_pro',
    name: 'Engine Pro',
    description: 'Engine performance prediction and analysis',
    icon: '⚙️',
    color: '#dc2626',
    features: ['engine_sim', 'dyno_charts', 'recommendations'],
    isPremium: true,
    sortOrder: 4,
  },
  {
    id: 'fourlink',
    name: 'Four Link',
    description: 'Suspension geometry and four-link analysis',
    icon: '🔧',
    color: '#7c3aed',
    features: ['fourlink_sim', 'geometry_calc', 'anti_squat'],
    isPremium: true,
    sortOrder: 5,
  },
  {
    id: 'cam_analyzer',
    name: 'Cam Analyzer',
    description: 'Camshaft analysis and comparison',
    icon: '📊',
    color: '#0891b2',
    features: ['cam_analysis', 'cam_comparison', 'valve_train'],
    isPremium: true,
    sortOrder: 6,
  },
];

/**
 * All possible feature flags
 */
export const ALL_FEATURES = [
  // Core features
  'basic_sim',
  'hp_curve_editor',
  'advanced_settings',
  'save_vehicles',
  'save_runs',
  'export_csv',
  'import_data',
  
  // Product-specific features
  'clutch_sim',
  'bonneville_sim',
  'engine_sim',
  'dyno_charts',
  'recommendations',
  'fourlink_sim',
  'geometry_calc',
  'anti_squat',
  'cam_analysis',
  'cam_comparison',
  'valve_train',
  
  // Admin features
  'dev_tools',
  'user_management',
  'role_management',
  'system_settings',
  'view_analytics',
  'beta_features',
] as const;

export type FeatureFlag = typeof ALL_FEATURES[number];

// ============================================================================
// Roles (configurable user groups)
// ============================================================================

/**
 * Role definition - configurable user groups
 */
export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  // Products this role has access to
  products: string[];
  // Additional feature flags beyond products
  additionalFeatures: string[];
  // Can this role manage other roles?
  canManageRoles: boolean;
  // Can this role manage users?
  canManageUsers: boolean;
  // Is this a system role (cannot be deleted)?
  isSystem: boolean;
  // Sort order (lower = higher privilege)
  sortOrder: number;
}

/**
 * Default roles
 */
export const DEFAULT_ROLES: Role[] = [
  {
    id: 'owner',
    name: 'Owner',
    description: 'Full system access - can manage all users, roles, settings, and billing',
    color: '#7c3aed',
    products: ['quarter_jr', 'quarter_pro', 'bonneville_pro', 'engine_pro', 'fourlink', 'cam_analyzer'],
    additionalFeatures: ['dev_tools', 'user_management', 'role_management', 'system_settings', 'view_analytics', 'beta_features'],
    canManageRoles: true,
    canManageUsers: true,
    isSystem: true,
    sortOrder: 0,
  },
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Administrative access - can manage users and access all features',
    color: '#dc2626',
    products: ['quarter_jr', 'quarter_pro', 'bonneville_pro', 'engine_pro', 'fourlink', 'cam_analyzer'],
    additionalFeatures: ['dev_tools', 'user_management', 'view_analytics', 'beta_features'],
    canManageRoles: false,
    canManageUsers: true,
    isSystem: true,
    sortOrder: 1,
  },
  {
    id: 'beta_tester',
    name: 'Beta Tester',
    description: 'Beta testing access - early access to new features with feedback capability',
    color: '#2563eb',
    products: ['quarter_jr', 'quarter_pro', 'bonneville_pro', 'engine_pro'],
    additionalFeatures: ['beta_features'],
    canManageRoles: false,
    canManageUsers: false,
    isSystem: true,
    sortOrder: 2,
  },
  {
    id: 'subscriber_pro',
    name: 'Pro Subscriber',
    description: 'Pro subscription - full Quarter Pro and Bonneville Pro features',
    color: '#16a34a',
    products: ['quarter_jr', 'quarter_pro', 'bonneville_pro'],
    additionalFeatures: [],
    canManageRoles: false,
    canManageUsers: false,
    isSystem: false,
    sortOrder: 3,
  },
  {
    id: 'subscriber_basic',
    name: 'Basic Subscriber',
    description: 'Basic subscription - Quarter Jr features only',
    color: '#65a30d',
    products: ['quarter_jr'],
    additionalFeatures: [],
    canManageRoles: false,
    canManageUsers: false,
    isSystem: false,
    sortOrder: 4,
  },
  {
    id: 'trial',
    name: 'Trial User',
    description: 'Trial access - limited time full access to evaluate the software',
    color: '#ca8a04',
    products: ['quarter_jr', 'quarter_pro'],
    additionalFeatures: [],
    canManageRoles: false,
    canManageUsers: false,
    isSystem: false,
    sortOrder: 5,
  },
  {
    id: 'guest',
    name: 'Guest',
    description: 'Guest access - view only, no saving or advanced features',
    color: '#6b7280',
    products: [],
    additionalFeatures: ['basic_sim'],
    canManageRoles: false,
    canManageUsers: false,
    isSystem: true,
    sortOrder: 99,
  },
];

// ============================================================================
// User Account
// ============================================================================

export type AccountStatus = 'active' | 'suspended' | 'pending' | 'expired';

/**
 * User account
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  roleId: string;
  status: AccountStatus;
  
  // Auth (for local auth - will be replaced by OAuth later)
  passwordHash?: string;
  
  // Timestamps
  createdAt: string;
  lastLoginAt?: string;
  
  // Subscription info
  subscription?: {
    plan: string;
    startDate: string;
    endDate?: string;
    autoRenew: boolean;
  };
  
  // Trial info
  trial?: {
    startDate: string;
    endDate: string;
    extended: boolean;
  };
  
  // Preferences
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    units?: 'imperial' | 'metric';
    notifications?: boolean;
  };
  
  // Admin notes
  adminNotes?: string;
}

/**
 * User summary for lists
 */
export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  roleId: string;
  status: AccountStatus;
}

// ============================================================================
// Auth State
// ============================================================================

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
}

export const INITIAL_AUTH_STATE: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,
};

// ============================================================================
// Configuration State (roles + products)
// ============================================================================

export interface AuthConfig {
  roles: Role[];
  products: Product[];
}

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  roles: DEFAULT_ROLES,
  products: DEFAULT_PRODUCTS,
};
