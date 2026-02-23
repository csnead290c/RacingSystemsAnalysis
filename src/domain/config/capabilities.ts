/**
 * Capabilities / Entitlements Model
 *
 * Separates "what a user's subscription plan grants" (capabilities)
 * from "what their account role permits" (permissions).
 *
 * Plans  → subscription tiers that grant product capabilities.
 * Roles  → account-scoped permissions (Owner, Admin, Member, Viewer).
 * Trial  → a time-limited overlay that temporarily grants a target plan's capabilities.
 *
 * Capability keys use dot-namespaced format:
 *   'library.save.engine', 'library.install.engine', 'team.enabled', etc.
 *
 * Usage:
 *   import { hasCap, type Capability } from './capabilities';
 *   if (hasCap(userCtx, 'library.install.engine')) { ... }
 */

// ============================================================================
// Plans (subscription tiers) — trial is NOT a plan, it's an overlay
// ============================================================================

export const PLAN_IDS = ['free', 'basic', 'pro', 'team'] as const;
export type PlanId = typeof PLAN_IDS[number];

export interface PlanInfo {
  id: PlanId;
  name: string;
  price: string;
  color: string;
  description: string;
}

export const PLANS: Record<PlanId, PlanInfo> = {
  free: {
    id: 'free',
    name: 'Free',
    price: '$0',
    color: '#6b7280',
    description: 'Limited demo access',
  },
  basic: {
    id: 'basic',
    name: 'Basic / Jr',
    price: '$9.99/mo',
    color: '#22c55e',
    description: 'Essential tools for bracket racers',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: '$24.99/mo',
    color: '#3b82f6',
    description: 'Full simulation and optimization suite',
  },
  team: {
    id: 'team',
    name: 'Team',
    price: '$49.99/mo',
    color: '#8b5cf6',
    description: 'Pro features for your entire race team',
  },
};

// ============================================================================
// Roles (account/team-scoped permissions — NOT subscription tiers)
// ============================================================================

export const ROLE_IDS = ['owner', 'admin', 'member', 'viewer'] as const;
export type RoleId = typeof ROLE_IDS[number];

export interface RoleInfo {
  id: RoleId;
  name: string;
  color: string;
  description: string;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canManageBilling: boolean;
  isSystem: boolean;
  sortOrder: number;
}

export const ROLES: Record<RoleId, RoleInfo> = {
  owner: {
    id: 'owner',
    name: 'Owner',
    color: '#7c3aed',
    description: 'Full access — can manage users within this account, roles, settings, and billing',
    canManageUsers: true,
    canManageRoles: true,
    canManageBilling: true,
    isSystem: true,
    sortOrder: 0,
  },
  admin: {
    id: 'admin',
    name: 'Admin',
    color: '#dc2626',
    description: 'Administrative access — can manage users within this account and access features',
    canManageUsers: true,
    canManageRoles: false,
    canManageBilling: false,
    isSystem: true,
    sortOrder: 1,
  },
  member: {
    id: 'member',
    name: 'Member',
    color: '#16a34a',
    description: 'Standard member — full access to plan capabilities, no management permissions',
    canManageUsers: false,
    canManageRoles: false,
    canManageBilling: false,
    isSystem: true,
    sortOrder: 2,
  },
  viewer: {
    id: 'viewer',
    name: 'Viewer',
    color: '#6b7280',
    description: 'Read-only access — can view shared data but cannot modify',
    canManageUsers: false,
    canManageRoles: false,
    canManageBilling: false,
    isSystem: true,
    sortOrder: 3,
  },
};

// ============================================================================
// Capabilities (the canonical list — dot-namespaced)
// ============================================================================

export const CAPABILITY_KEYS = [
  // ── Vehicle Editor ──
  'vehicle.editor.basic',        // Basic vehicle fields (weight, HP, gear ratios)
  'vehicle.editor.pro',          // Advanced fields (aero, tire growth, launch settings)
  'vehicle.throttleStop',        // Throttle stop configuration

  // ── Component Library (save/edit) ──
  'library.save.engine',         // Save/edit engine assets in personal library
  'library.save.clutch',         // Save/edit clutch assets in personal library
  'library.save.fourLink',       // Save/edit four-link assets in personal library

  // ── Component Install (link asset → vehicle) ──
  'library.install.engine',      // Install/link engine asset into a vehicle
  'library.install.clutch',      // Install/link clutch asset into a vehicle
  'library.install.fourLink',    // Install/link four-link asset into a vehicle

  // ── Track / Sim Options ──
  'track.eighth',                // 1/8 mile
  'track.quarter',               // 1/4 mile
  'track.thousand',              // 1000 ft
  'track.bonneville',            // Land speed
  'track.custom',                // User-defined track length

  // ── Weather ──
  'weather.manual',              // Manual weather entry
  'weather.live',                // Live weather lookup
  'weather.history',             // Historical weather data

  // ── Simulation ──
  'sim.et',                      // Access to ET Sim / Predict page (basic+)
  'sim.raceTools',               // Race Day, Dial-In, Opponents, Ladder, Tech Card (basic+)
  'sim.basic',                   // Basic ET/MPH prediction
  'sim.advanced',                // Full simulation with incremental data
  'sim.runCompletion',           // Run completion from partial data
  'sim.learning',                // Adaptive learning/corrections

  // ── Engine Sim ──
  'engine.proMode',              // Engine Sim advanced worksheets (pro+)

  // ── Optimizers ──
  'optimizer.gear',              // Gear ratio optimizer
  'optimizer.launch',            // Launch/60ft optimizer
  'optimizer.throttleStop',      // Throttle stop duration optimizer

  // ── Data & Charts ──
  'data.vehicles',               // Vehicle save/manage (basic+)
  'data.runLog',                 // Run logging + history (basic+)
  'charts.basic',                // Simple result charts
  'charts.advanced',             // Detailed analysis charts
  'data.export',                 // CSV/JSON export
  'data.import',                 // Import from files

  // ── Team ──
  'team.enabled',                // Team features active
  'team.library.share',          // Share library assets with team
  'team.vehicles.share',         // Share vehicles with team
  'team.runs.share',             // Share run history with team

  // ── Admin / Dev ──
  'admin.access',                // Access admin portal and read-only admin views
  'admin.devTools',              // Developer tools panel
  'admin.userManagement',        // Manage users within this account/team

  // ── NHRA Tech Parity (internal tooling) ──
  'nhra.parity',                 // Access NHRA parity data ingestion & queries
] as const;

export type Capability = typeof CAPABILITY_KEYS[number];

// ============================================================================
// Backward-compatible alias map (old key → new key)
// ============================================================================

/** Maps deprecated flat keys to their namespaced replacements. */
export const CAPABILITY_ALIASES: Record<string, Capability> = {
  // Vehicle editor
  'vehicle_editor_basic':     'vehicle.editor.basic',
  'vehicle_editor_pro':       'vehicle.editor.pro',
  'throttle_stop':            'vehicle.throttleStop',
  // Library save
  'library_save_engine':      'library.save.engine',
  'library_save_clutch':      'library.save.clutch',
  'library_save_fourlink':    'library.save.fourLink',
  // Library install
  'install_engine':           'library.install.engine',
  'install_clutch':           'library.install.clutch',
  'install_fourlink':         'library.install.fourLink',
  // Track
  'track_eighth':             'track.eighth',
  'track_quarter':            'track.quarter',
  'track_thousand':           'track.thousand',
  'track_bonneville':         'track.bonneville',
  'track_custom':             'track.custom',
  // Weather
  'weather_manual':           'weather.manual',
  'weather_live':             'weather.live',
  'weather_history':          'weather.history',
  // Simulation
  'et_sim':                   'sim.et',
  'sim_et':                   'sim.et',
  'race_tools':               'sim.raceTools',
  'sim_race_tools':           'sim.raceTools',
  'sim_basic':                'sim.basic',
  'sim_advanced':             'sim.advanced',
  'run_completion':           'sim.runCompletion',
  'learning':                 'sim.learning',
  // Optimizers
  'optimizer_gear':           'optimizer.gear',
  'optimizer_launch':         'optimizer.launch',
  'optimizer_throttle_stop':  'optimizer.throttleStop',
  // Charts / Data
  'save_vehicles':            'data.vehicles',
  'run_logging':              'data.runLog',
  'save_runs':                'data.runLog',
  'charts_basic':             'charts.basic',
  'charts_advanced':          'charts.advanced',
  'data_export':              'data.export',
  'data_import':              'data.import',
  // Engine Sim
  'engine_pro_mode':          'engine.proMode',
  // Team
  'team_management':          'team.enabled',
  'team_shared_vehicles':     'team.vehicles.share',
  'team_shared_runs':         'team.runs.share',
  // Admin
  'admin_access':             'admin.access',
  'dev_tools':                'admin.devTools',
  'user_management':          'admin.userManagement',
  // NHRA
  'nhra_parity':              'nhra.parity',
};

/**
 * Resolve a capability key, accepting either the new namespaced key or a
 * deprecated flat key. Returns the canonical namespaced key.
 */
export function resolveCapKey(key: string): Capability | undefined {
  if ((CAPABILITY_KEYS as readonly string[]).includes(key)) return key as Capability;
  return CAPABILITY_ALIASES[key];
}

// ============================================================================
// Plan → Capabilities mapping
// ============================================================================

export const PLAN_CAPABILITIES: Record<PlanId, ReadonlySet<Capability>> = {
  free: new Set<Capability>([
    'vehicle.editor.basic',
    'track.eighth',
    'track.quarter',
    'weather.manual',
    'sim.basic',
    'charts.basic',
  ]),

  basic: new Set<Capability>([
    'vehicle.editor.basic',
    'library.save.engine',
    'library.save.clutch',
    'library.save.fourLink',
    'track.eighth',
    'track.quarter',
    'weather.manual',
    'sim.et',
    'sim.raceTools',
    'sim.basic',
    'sim.runCompletion',
    'sim.learning',
    'data.vehicles',
    'data.runLog',
    'charts.basic',
  ]),

  pro: new Set<Capability>([
    'vehicle.editor.basic',
    'vehicle.editor.pro',
    'vehicle.throttleStop',
    'library.save.engine',
    'library.save.clutch',
    'library.save.fourLink',
    'library.install.engine',
    'library.install.clutch',
    'library.install.fourLink',
    'track.eighth',
    'track.quarter',
    'track.thousand',
    'track.bonneville',
    'track.custom',
    'weather.manual',
    'weather.live',
    'weather.history',
    'sim.et',
    'sim.raceTools',
    'sim.basic',
    'sim.advanced',
    'sim.runCompletion',
    'sim.learning',
    'engine.proMode',
    'optimizer.gear',
    'optimizer.launch',
    'optimizer.throttleStop',
    'data.vehicles',
    'data.runLog',
    'charts.basic',
    'charts.advanced',
    'data.export',
    'data.import',
  ]),

  team: new Set<Capability>([
    // Everything Pro has…
    'vehicle.editor.basic',
    'vehicle.editor.pro',
    'vehicle.throttleStop',
    'library.save.engine',
    'library.save.clutch',
    'library.save.fourLink',
    'library.install.engine',
    'library.install.clutch',
    'library.install.fourLink',
    'track.eighth',
    'track.quarter',
    'track.thousand',
    'track.bonneville',
    'track.custom',
    'weather.manual',
    'weather.live',
    'weather.history',
    'sim.et',
    'sim.raceTools',
    'sim.basic',
    'sim.advanced',
    'sim.runCompletion',
    'sim.learning',
    'engine.proMode',
    'optimizer.gear',
    'optimizer.launch',
    'optimizer.throttleStop',
    'data.vehicles',
    'data.runLog',
    'charts.basic',
    'charts.advanced',
    'data.export',
    'data.import',
    // …plus team features
    'team.enabled',
    'team.library.share',
    'team.vehicles.share',
    'team.runs.share',
  ]),
};

// ============================================================================
// Role → extra capabilities (additive on top of plan)
// ============================================================================

/** Capabilities granted by role regardless of plan (owner/admin get admin tools). */
export const ROLE_CAPABILITIES: Record<RoleId, ReadonlySet<Capability>> = {
  owner: new Set<Capability>(['admin.access', 'admin.devTools', 'admin.userManagement', 'nhra.parity']),
  admin: new Set<Capability>(['admin.access', 'admin.devTools', 'admin.userManagement', 'nhra.parity']),
  member: new Set<Capability>([]),
  viewer: new Set<Capability>([]),
};

// ============================================================================
// Trial overlay — trial is NOT a plan, it's a temporary capability boost
// ============================================================================

export interface TrialState {
  /** Whether a trial is currently active. */
  active: boolean;
  /** The plan whose capabilities are granted during the trial. Default: 'pro'. */
  targetPlan: PlanId;
  /** Optional: when the trial expires (ISO string or epoch ms). */
  expiresAt?: string | number;
}

/** Default trial state (no trial). */
export const NO_TRIAL: TrialState = { active: false, targetPlan: 'pro' };

// ============================================================================
// User Context (the input to hasCap)
// ============================================================================

export interface UserCapabilityContext {
  plan: PlanId;
  role: RoleId;
  /** Override: owner/beta get all capabilities regardless of plan. */
  fullAccess?: boolean;
  /** Trial overlay — temporarily grants target plan's capabilities. */
  trial?: TrialState;
}

// ============================================================================
// hasCap — the single check used everywhere
// ============================================================================

/**
 * Check whether a user context grants a specific capability.
 * Accepts both new namespaced keys and deprecated flat keys (via alias map).
 *
 * Resolution order:
 * 1. fullAccess → always true (owner/beta accounts)
 * 2. Trial overlay (if active, grants target plan's capabilities)
 * 3. Plan capabilities (subscription tier)
 * 4. Role capabilities (additive admin/dev tools)
 */
export function hasCap(ctx: UserCapabilityContext, cap: Capability | string): boolean {
  const resolved = resolveCapKey(cap);
  if (!resolved) return false;
  if (ctx.fullAccess) return true;
  // Trial overlay
  if (ctx.trial?.active && PLAN_CAPABILITIES[ctx.trial.targetPlan].has(resolved)) return true;
  if (PLAN_CAPABILITIES[ctx.plan].has(resolved)) return true;
  if (ROLE_CAPABILITIES[ctx.role].has(resolved)) return true;
  return false;
}

/**
 * Get all effective capabilities for a user context.
 */
export function getEffectiveCapabilities(ctx: UserCapabilityContext): Capability[] {
  if (ctx.fullAccess) return [...CAPABILITY_KEYS];
  const caps = new Set<Capability>();
  for (const c of PLAN_CAPABILITIES[ctx.plan]) caps.add(c);
  if (ctx.trial?.active) {
    for (const c of PLAN_CAPABILITIES[ctx.trial.targetPlan]) caps.add(c);
  }
  for (const c of ROLE_CAPABILITIES[ctx.role]) caps.add(c);
  return [...caps];
}

/**
 * Check whether a capability is an install capability (for downgrade-safe gating).
 */
export function isInstallCapability(cap: Capability | string): boolean {
  const resolved = resolveCapKey(cap);
  return resolved === 'library.install.engine'
    || resolved === 'library.install.clutch'
    || resolved === 'library.install.fourLink';
}

// ============================================================================
// Migration helpers — map legacy tier/role IDs to new Plan/Role
// ============================================================================

/** Map a legacy SubscriptionTier or plan string to a PlanId. */
export function planFromLegacyTier(tier: string | null | undefined): PlanId {
  if (!tier) return 'free';
  const t = tier.toLowerCase();
  if (t === 'team' || t === 'nitro') return 'team';
  if (t === 'pro') return 'pro';
  if (t === 'racer' || t === 'junior' || t === 'basic') return 'basic';
  // 'trial' legacy tier → base plan is free (trial overlay handles the rest)
  if (t === 'trial') return 'free';
  if (t === 'beta' || t === 'owner') return 'pro'; // beta/owner use fullAccess, plan is secondary
  return 'free';
}

/** Detect whether a legacy tier string indicates an active trial. */
export function trialFromLegacyTier(tier: string | null | undefined): TrialState {
  if (!tier) return NO_TRIAL;
  if (tier.toLowerCase() === 'trial') return { active: true, targetPlan: 'pro' };
  return NO_TRIAL;
}

/** Map a legacy roleId string to a RoleId. */
export function roleFromLegacyId(roleId: string | null | undefined): RoleId {
  if (!roleId) return 'member';
  const r = roleId.toLowerCase();
  if (r === 'owner') return 'owner';
  if (r === 'admin' || r === 'administrator') return 'admin';
  if (r === 'viewer' || r === 'guest') return 'viewer';
  // subscriber_pro, subscriber_basic, trial, beta_tester, beta, user → member
  return 'member';
}

/** Determine if a legacy roleId grants fullAccess. */
export function isFullAccessRole(roleId: string | null | undefined): boolean {
  if (!roleId) return false;
  const r = roleId.toLowerCase();
  return r === 'owner' || r === 'admin' || r === 'beta_tester' || r === 'beta';
}
