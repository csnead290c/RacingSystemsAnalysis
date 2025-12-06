/**
 * API Service
 * Handles all communication with the PHP backend
 */

const API_BASE = '/api';

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
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
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

  async register(email: string, password: string, name: string) {
    const data = await apiRequest<{
      success: boolean;
      token: string;
      user: ApiUser;
    }>('/auth.php?action=register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
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

  logout() {
    setAuthToken(null);
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

  async update(id: number, data: { name?: string; role?: string; products?: string[] }) {
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
export interface ApiUser {
  id: number;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'user' | 'beta';
  products: string[];
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
