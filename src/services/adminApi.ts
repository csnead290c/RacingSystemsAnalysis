/**
 * Admin API Client
 * 
 * TypeScript client for admin portal endpoints.
 * All endpoints require admin.access capability.
 * Mutation endpoints require admin.userManagement.
 */

// ============================================================================
// Types
// ============================================================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export type UserStatus = 'invited' | 'active' | 'suspended' | 'deleted';
export type UserRole = 'user' | 'admin' | 'beta' | 'owner';
export type BillingSource = 'none' | 'manual' | 'stripe';
export type PlanVisibility = 'public' | 'internal' | 'hidden' | 'archived';

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  billing_source: BillingSource;
  assigned_plan: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  suspended_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface AdminUserDetail {
  user: {
    id: number;
    email: string;
    name: string;
    role: UserRole;
    status: UserStatus;
    products: string[];
    stripe_customer_id: string | null;
    clerk_user_id: string | null;
    subscription_plan: string | null;
    subscription_status: string | null;
    subscription_period_end: string | null;
    billing_source: BillingSource;
    assigned_plan: string | null;
    assigned_plan_expires_at: string | null;
    assigned_by: number | null;
    assigned_by_name: string | null;
    assigned_by_email: string | null;
    suspended_at: string | null;
    suspended_by: number | null;
    suspended_by_name: string | null;
    suspended_by_email: string | null;
    suspended_reason: string | null;
    deleted_at: string | null;
    deleted_by: number | null;
    deleted_by_name: string | null;
    deleted_by_email: string | null;
    invite_token: string | null;
    invite_expires_at: string | null;
    invited_by: number | null;
    invited_by_name: string | null;
    invited_by_email: string | null;
    created_at: string;
    updated_at: string;
  };
  subscription: any | null;
  overrides: Array<{
    id: number;
    capability_key: string;
    source: string;
    granted_by: number | null;
    reason: string | null;
    expires_at: string | null;
    created_at: string;
  }>;
  capabilities: string[];
}

export interface Plan {
  plan_id: string;
  display_name: string;
  description: string | null;
  visibility: PlanVisibility;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  monthly_price_cents: number | null;
  sort_order: number;
  is_active: boolean;
  user_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PlanAssignment {
  id: number;
  user_id: number;
  plan_id: string;
  action: 'assigned' | 'removed' | 'expired';
  source: 'manual' | 'stripe' | 'invite' | 'system';
  assigned_by: number | null;
  assigned_by_email: string | null;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
}

// ============================================================================
// API Helper
// ============================================================================

function getToken(): string | null {
  return localStorage.getItem('rsa_token');
}

async function adminFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string> | undefined),
    },
  });

  let data: any;
  try {
    const text = await res.text();
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned non-JSON response (HTTP ${res.status})`);
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }

  return data as T;
}

// ============================================================================
// User Lifecycle
// ============================================================================

export interface CreateUserParams {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
  assignedPlan?: string;
  sendWelcomeEmail?: boolean;
}

export interface CreateUserResponse {
  success: boolean;
  userId: number;
  email: string;
}

export async function createUser(params: CreateUserParams): Promise<CreateUserResponse> {
  return adminFetch<CreateUserResponse>(`${API_BASE}/admin.php?action=create-user`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface InviteUserParams {
  email: string;
  role?: UserRole;
  assignedPlan?: string;
  expiresInDays?: number;
}

export interface InviteUserResponse {
  success: boolean;
  inviteId: number;
  email: string;
  token: string;
  inviteUrl: string;
  expiresAt: string;
}

export async function inviteUser(params: InviteUserParams): Promise<InviteUserResponse> {
  return adminFetch<InviteUserResponse>(`${API_BASE}/admin.php?action=invite-user`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface SuspendUserParams {
  userId: number;
  reason: string;
}

export interface SuspendUserResponse {
  success: boolean;
  userId: number;
  status: 'suspended';
}

export async function suspendUser(params: SuspendUserParams): Promise<SuspendUserResponse> {
  return adminFetch<SuspendUserResponse>(`${API_BASE}/admin.php?action=suspend-user`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface ReactivateUserParams {
  userId: number;
}

export interface ReactivateUserResponse {
  success: boolean;
  userId: number;
  status: 'active';
}

export async function reactivateUser(params: ReactivateUserParams): Promise<ReactivateUserResponse> {
  return adminFetch<ReactivateUserResponse>(`${API_BASE}/admin.php?action=reactivate-user`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface DeleteUserParams {
  userId: number;
  reason?: string;
  hardDelete?: boolean;
}

export interface DeleteUserResponse {
  success: boolean;
  userId: number;
  deleted: 'soft' | 'hard';
}

export async function deleteUser(params: DeleteUserParams): Promise<DeleteUserResponse> {
  return adminFetch<DeleteUserResponse>(`${API_BASE}/admin.php?action=delete-user`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface UpdateUserRoleParams {
  userId: number;
  role: UserRole;
}

export interface UpdateUserRoleResponse {
  success: boolean;
  userId: number;
  role: UserRole;
}

export async function updateUserRole(params: UpdateUserRoleParams): Promise<UpdateUserRoleResponse> {
  return adminFetch<UpdateUserRoleResponse>(`${API_BASE}/admin.php?action=update-user-role`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface ResetUserPasswordParams {
  user_id: number;
  password: string;
}

export interface ResetUserPasswordResponse {
  success: boolean;
  message: string;
}

export async function resetUserPassword(params: ResetUserPasswordParams): Promise<ResetUserPasswordResponse> {
  return adminFetch<ResetUserPasswordResponse>(`${API_BASE}/admin.php?action=reset-user-password`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============================================================================
// Plan Management
// ============================================================================

export interface AssignPlanParams {
  userId: number;
  planId: string;
  expiresInDays?: number;
  reason?: string;
}

export interface AssignPlanResponse {
  success: boolean;
  userId: number;
  planId: string;
  expiresAt: string | null;
}

export async function assignPlan(params: AssignPlanParams): Promise<AssignPlanResponse> {
  return adminFetch<AssignPlanResponse>(`${API_BASE}/admin.php?action=assign-plan`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface RemovePlanParams {
  userId: number;
  reason?: string;
}

export interface RemovePlanResponse {
  success: boolean;
  userId: number;
  removedPlan: string | null;
}

export async function removePlan(params: RemovePlanParams): Promise<RemovePlanResponse> {
  return adminFetch<RemovePlanResponse>(`${API_BASE}/admin.php?action=remove-plan`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface GetPlanHistoryResponse {
  history: PlanAssignment[];
}

export async function getPlanHistory(userId: number): Promise<GetPlanHistoryResponse> {
  return adminFetch<GetPlanHistoryResponse>(
    `${API_BASE}/admin.php?action=get-plan-history&userId=${userId}`
  );
}

export interface ListPlansResponse {
  plans: Plan[];
}

export async function listPlans(): Promise<ListPlansResponse> {
  return adminFetch<ListPlansResponse>(`${API_BASE}/admin.php?action=list-plans`);
}

export interface UpdatePlanParams {
  planId: string;
  displayName?: string;
  description?: string;
  visibility?: PlanVisibility;
  stripeProductId?: string;
  stripePriceId?: string;
  monthlyPriceCents?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdatePlanResponse {
  success: boolean;
  planId: string;
}

export async function updatePlan(params: UpdatePlanParams): Promise<UpdatePlanResponse> {
  return adminFetch<UpdatePlanResponse>(`${API_BASE}/admin.php?action=update-plan`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============================================================================
// User Management (Enhanced)
// ============================================================================

export interface SearchUsersParams {
  q?: string;
  limit?: number;
  offset?: number;
  status?: UserStatus;
  role?: UserRole;
  plan?: string;
  billingSource?: BillingSource;
}

export interface SearchUsersResponse {
  users: AdminUser[];
  limit: number;
  offset: number;
  total: number;
}

export async function searchUsers(params: SearchUsersParams = {}): Promise<SearchUsersResponse> {
  const queryParams = new URLSearchParams({ action: 'search-users' });
  if (params.q) queryParams.set('q', params.q);
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());
  if (params.status) queryParams.set('status', params.status);
  if (params.role) queryParams.set('role', params.role);
  if (params.plan) queryParams.set('plan', params.plan);
  if (params.billingSource) queryParams.set('billingSource', params.billingSource);

  return adminFetch<SearchUsersResponse>(`${API_BASE}/admin.php?${queryParams.toString()}`);
}

export async function getUserDetails(userId: number): Promise<AdminUserDetail> {
  return adminFetch<AdminUserDetail>(`${API_BASE}/admin.php?action=user-details&id=${userId}`);
}

// ============================================================================
// Capability Management (Existing)
// ============================================================================

export interface GrantCapabilityParams {
  targetUserId: number;
  capabilityKey: string;
  reason?: string;
  expiresInDays?: number;
}

export interface GrantCapabilityResponse {
  success: boolean;
  granted: string;
  expiresAt: string | null;
}

export async function grantCapability(params: GrantCapabilityParams): Promise<GrantCapabilityResponse> {
  return adminFetch<GrantCapabilityResponse>(`${API_BASE}/admin.php?action=grant-capability`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface RevokeCapabilityParams {
  targetUserId: number;
  capabilityKey: string;
}

export interface RevokeCapabilityResponse {
  success: boolean;
  revoked: string;
}

export async function revokeCapability(params: RevokeCapabilityParams): Promise<RevokeCapabilityResponse> {
  return adminFetch<RevokeCapabilityResponse>(`${API_BASE}/admin.php?action=revoke-capability`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============================================================================
// Export all
// ============================================================================

export const adminApi = {
  // User Lifecycle
  createUser,
  inviteUser,
  suspendUser,
  reactivateUser,
  deleteUser,
  updateUserRole,
  resetUserPassword,
  
  // Plan Management
  assignPlan,
  removePlan,
  getPlanHistory,
  listPlans,
  updatePlan,
  
  // User Management
  searchUsers,
  getUserDetails,
  
  // Capability Management
  grantCapability,
  revokeCapability,
};
