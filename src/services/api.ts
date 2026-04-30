/**
 * API Service
 * Handles all communication with the PHP backend
 */

// For E2E testing, allow direct connection to local PHP server
// In production/dev, use Vite proxy at /api
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Token storage
let authToken: string | null = localStorage.getItem('rsa_token');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('rsa_token', token);
  } else {
    localStorage.removeItem('rsa_token');
  }
}

export function getAuthToken() {
  return authToken;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    ...(options.headers as Record<string, string>),
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add cache-busting query param for GET requests
  const url = options.method && options.method !== 'GET' 
    ? `${API_BASE}${endpoint}`
    : `${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${Date.now()}`;

  const response = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// Auth API
export const authApi = {
  async login(email: string, password: string) {
    const data = await apiRequest<{
      success: boolean;
      token: string;
      user: ApiUser;
    }>('/auth.php?action=login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  async register(email: string, password: string, name: string, inviteCode?: string) {
    const data = await apiRequest<{
      success: boolean;
      token: string;
      user: ApiUser;
    }>('/auth.php?action=register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, invite_code: inviteCode }),
    });
    setAuthToken(data.token);
    return data;
  },

  async getMe() {
    return apiRequest<{ user: ApiUser }>('/auth.php?action=me');
  },

  async updateProfile(data: { name?: string; password?: string }) {
    return apiRequest<{ success: boolean }>('/auth.php?action=update', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async requestPasswordReset(email: string) {
    return apiRequest<{ success: boolean; message: string }>('/auth.php?action=request_password_reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string) {
    const data = await apiRequest<{
      success: boolean;
      message: string;
      token: string;
      user: { id: number; email: string; role: string };
    }>('/auth.php?action=reset_password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
    setAuthToken(data.token);
    return data;
  },

  logout() {
    setAuthToken(null);
  },

  async getPreferences() {
    return apiRequest<{ preferences: UserPreferences }>('/auth.php?action=preferences');
  },

  async updatePreferences(prefs: Partial<UserPreferences>) {
    return apiRequest<{ success: boolean; preferences: UserPreferences }>('/auth.php?action=preferences', {
      method: 'POST',
      body: JSON.stringify(prefs),
    });
  },
};

// Vehicles API
export const vehiclesApi = {
  async getAll() {
    return apiRequest<{ vehicles: ApiVehicle[] }>('/vehicles.php');
  },

  async get(id: string) {
    return apiRequest<{ vehicle: ApiVehicle }>(`/vehicles.php?id=${id}`);
  },

  async create(vehicle: { name: string; data: any; is_public?: boolean }) {
    return apiRequest<{ success: boolean; vehicle: ApiVehicle }>('/vehicles.php', {
      method: 'POST',
      body: JSON.stringify(vehicle),
    });
  },

  async update(id: string, vehicle: { name?: string; data?: any; is_public?: boolean }) {
    return apiRequest<{ success: boolean }>(`/vehicles.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(vehicle),
    });
  },

  async delete(id: string) {
    return apiRequest<{ success: boolean }>(`/vehicles.php?id=${id}`, {
      method: 'DELETE',
    });
  },
};

// Runs API
export const runsApi = {
  async getAll(limit = 50) {
    return apiRequest<{ runs: ApiRun[] }>(`/runs.php?limit=${limit}`);
  },

  async save(run: {
    vehicle_id: string;
    vehicle_name: string;
    race_length: string;
    env: any;
    result_et: number;
    result_mph: number;
    hp_adjust?: number;
    weight_adjust?: number;
    notes?: string;
  }) {
    return apiRequest<{ success: boolean; run: ApiRun }>('/runs.php', {
      method: 'POST',
      body: JSON.stringify(run),
    });
  },

  async delete(id: string) {
    return apiRequest<{ success: boolean }>(`/runs.php?id=${id}`, {
      method: 'DELETE',
    });
  },

  async clearAll() {
    return apiRequest<{ success: boolean }>('/runs.php', {
      method: 'DELETE',
    });
  },
};

// Users API (admin only)
export const usersApi = {
  async getAll() {
    return apiRequest<{ users: ApiUser[] }>('/users.php');
  },

  async get(id: number) {
    return apiRequest<{ user: ApiUser }>(`/users.php?id=${id}`);
  },

  async create(data: { email: string; password: string; name: string; role?: string; products?: string[] }) {
    return apiRequest<{ success: boolean; user: ApiUser }>('/users.php', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: { name?: string; role?: string; products?: string[]; subscription_plan?: string | null; subscription_status?: string | null }) {
    return apiRequest<{ success: boolean }>(`/users.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number) {
    return apiRequest<{ success: boolean }>(`/users.php?id=${id}`, {
      method: 'DELETE',
    });
  },
};

// Types
export interface UserPreferences {
  productMode?: 'pro' | 'jr';  // Pro users can choose to use Jr mode
  theme?: 'light' | 'dark' | 'system';
  units?: 'imperial' | 'metric';
  defaultRaceLength?: 'EIGHTH' | 'QUARTER';
}

export interface ApiUser {
  id: number;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'user' | 'beta';
  plan?: string;
  products: string[];
  subscription_plan?: string | null;
  subscription_status?: string | null;
  clerk_user_id?: string | null;
  created_at?: string;
}

export interface ApiVehicle {
  id: string;
  name: string;
  is_public: boolean;
  is_owner: boolean;
  owner_name?: string;
  data: any;
  created_at: string;
  updated_at: string;
}

// Engine Sims API
export interface ApiEngineSim {
  id: string;
  name: string;
  data: any;  // EngineSimDocumentV1 stored as JSON
  created_at: string;
  updated_at: string;
}

export const engineSimsApi = {
  async getAll() {
    return apiRequest<{ engine_sims: ApiEngineSim[] }>('/engine_sims.php');
  },

  async get(id: string) {
    return apiRequest<{ engine_sim: ApiEngineSim }>(`/engine_sims.php?id=${id}`);
  },

  async create(sim: { name: string; data: any }) {
    return apiRequest<{ success: boolean; engine_sim: ApiEngineSim }>('/engine_sims.php', {
      method: 'POST',
      body: JSON.stringify(sim),
    });
  },

  async update(id: string, sim: { name?: string; data?: any }) {
    return apiRequest<{ success: boolean }>(`/engine_sims.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(sim),
    });
  },

  async delete(id: string) {
    return apiRequest<{ success: boolean }>(`/engine_sims.php?id=${id}`, {
      method: 'DELETE',
    });
  },
};

// Engines API (DB-backed engine library with versioning)
export interface ApiEngine {
  id: string;           // uuid
  name: string;
  source: string;
  scope: string;
  current_revision: number;
  revision: number;     // revision of the returned data
  peak_hp: number;
  rpm_at_peak_hp: number;
  peak_torque: number | null;
  rpm_at_peak_torque: number | null;
  displacement_cid: number | null;
  fuel_type: string | null;
  hp_curve: { rpm: number; hp: number }[] | null;
  engine_sim_config: any | null;
  engine_sim_doc_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  revision_created_at?: string;
}

export interface EngineRevisionPayload {
  name?: string;
  source?: string;
  scope?: string;
  peak_hp: number;
  rpm_at_peak_hp: number;
  peak_torque?: number | null;
  rpm_at_peak_torque?: number | null;
  displacement_cid?: number | null;
  fuel_type?: string | null;
  hp_curve?: { rpm: number; hp: number }[] | null;
  engine_sim_config?: any | null;
  engine_sim_doc_id?: string | null;
  notes?: string | null;
}

export const enginesApi = {
  async getAll() {
    return apiRequest<{ engines: ApiEngine[] }>('/engines.php');
  },

  async get(id: string, rev?: number) {
    const revParam = rev !== undefined ? `&rev=${rev}` : '';
    return apiRequest<{ engine: ApiEngine }>(`/engines.php?id=${id}${revParam}`);
  },

  async create(payload: EngineRevisionPayload) {
    return apiRequest<{ success: boolean; engine: ApiEngine }>('/engines.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: EngineRevisionPayload) {
    return apiRequest<{ success: boolean; engine: ApiEngine }>(`/engines.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async delete(id: string) {
    return apiRequest<{ success: boolean }>(`/engines.php?id=${id}`, {
      method: 'DELETE',
    });
  },
};

export interface ApiRun {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  race_length: string;
  env: any;
  result: {
    et_s: number;
    mph: number;
  };
  hp_adjust: number;
  weight_adjust: number;
  notes?: string;
  timestamp: number;
  created_at: string;
}
