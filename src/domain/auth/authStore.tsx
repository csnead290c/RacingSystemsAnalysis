/**
 * Authentication Store
 * 
 * Provides authentication context, user management, and role/product configuration.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, Role, Product, AuthState, AuthConfig, FeatureFlag } from './types';
import { INITIAL_AUTH_STATE, DEFAULT_ROLES, DEFAULT_PRODUCTS } from './types';
import { authApi, setAuthToken } from '../../services/api';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  CURRENT_USER: 'rsa.auth.currentUser',
  USERS_DB: 'rsa.auth.users',
  ROLES_DB: 'rsa.auth.roles',
  PRODUCTS_DB: 'rsa.auth.products',
};

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function simpleHash(str: string): string {
  // Simple hash for demo - use bcrypt or similar in production
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Storage helpers
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save to ${key}:`, e);
  }
}

// ============================================================================
// Default Users
// ============================================================================

function getDefaultUsers(): User[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'owner_001',
      email: 'owner@rsa.local',
      displayName: 'System Owner',
      roleId: 'owner',
      status: 'active',
      passwordHash: simpleHash('owner'),
      createdAt: now,
    },
    {
      id: 'admin_001',
      email: 'admin@rsa.local',
      displayName: 'Administrator',
      roleId: 'admin',
      status: 'active',
      passwordHash: simpleHash('admin'),
      createdAt: now,
    },
    {
      id: 'beta_001',
      email: 'beta@rsa.local',
      displayName: 'Beta Tester',
      roleId: 'beta_tester',
      status: 'active',
      passwordHash: simpleHash('beta'),
      createdAt: now,
    },
  ];
}

// ============================================================================
// Context Type
// ============================================================================

interface AuthContextValue extends AuthState {
  // Config
  config: AuthConfig;
  
  // Auth actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  
  // User management
  getAllUsers: () => User[];
  createUser: (user: Omit<User, 'id' | 'createdAt'>, password?: string) => User;
  updateUser: (id: string, updates: Partial<User>) => User | null;
  deleteUser: (id: string) => boolean;
  getUserById: (id: string) => User | null;
  setUserPassword: (id: string, password: string) => boolean;
  
  // Role management
  getAllRoles: () => Role[];
  createRole: (role: Omit<Role, 'id'>) => Role;
  updateRole: (id: string, updates: Partial<Role>) => Role | null;
  deleteRole: (id: string) => boolean;
  getRoleById: (id: string) => Role | null;
  
  // Product management
  getAllProducts: () => Product[];
  createProduct: (product: Omit<Product, 'id'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => Product | null;
  deleteProduct: (id: string) => boolean;
  getProductById: (id: string) => Product | null;
  
  // Access control
  hasFeature: (feature: FeatureFlag) => boolean;
  hasProduct: (productId: string) => boolean;
  canManageUsers: () => boolean;
  canManageRoles: () => boolean;
  getUserRole: () => Role | null;
  getUserProducts: () => Product[];
  
  // Dev helpers
  impersonateUser: (userId: string) => void;
  setDevRole: (roleId: string) => void;
  resetAuthData: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL_AUTH_STATE);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Initialize
  useEffect(() => {
    // Load or seed roles - always merge with defaults to ensure system roles exist
    let storedRoles = loadFromStorage<Role[]>(STORAGE_KEYS.ROLES_DB, []);
    // Merge: keep custom roles, but ensure all default system roles exist with correct products
    const mergedRoles = [...DEFAULT_ROLES];
    for (const stored of storedRoles) {
      const defaultIdx = mergedRoles.findIndex(r => r.id === stored.id);
      if (defaultIdx === -1) {
        // Custom role, keep it
        mergedRoles.push(stored);
      } else if (!stored.isSystem) {
        // Non-system role was customized, use stored version
        mergedRoles[defaultIdx] = stored;
      }
      // System roles always use defaults to ensure correct products/features
    }
    saveToStorage(STORAGE_KEYS.ROLES_DB, mergedRoles);
    setRoles(mergedRoles);
    
    // Load or seed products - always use defaults to ensure consistency
    let storedProducts = loadFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS_DB, []);
    // Merge: keep custom products, ensure defaults exist
    const mergedProducts = [...DEFAULT_PRODUCTS];
    for (const stored of storedProducts) {
      if (!mergedProducts.find(p => p.id === stored.id)) {
        mergedProducts.push(stored);
      }
    }
    saveToStorage(STORAGE_KEYS.PRODUCTS_DB, mergedProducts);
    setProducts(mergedProducts);
    
    // Load or seed users
    let storedUsers = loadFromStorage<User[]>(STORAGE_KEYS.USERS_DB, []);
    if (storedUsers.length === 0) {
      storedUsers = getDefaultUsers();
      saveToStorage(STORAGE_KEYS.USERS_DB, storedUsers);
    }
    setUsers(storedUsers);
    
    // Check for existing session
    const currentUser = loadFromStorage<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (currentUser) {
      const userStillValid = storedUsers.find(u => u.id === currentUser.id && u.status === 'active');
      if (userStillValid) {
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: userStillValid,
          error: null,
        });
      } else {
        saveToStorage(STORAGE_KEYS.CURRENT_USER, null);
        setState({ ...INITIAL_AUTH_STATE, isLoading: false });
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Login - try API first, fall back to local for dev
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    // Try API login first
    try {
      const response = await authApi.login(email, password);
      if (response.success && response.user) {
        // Map API user to local User type
        const apiUser = response.user;
        const apiProducts: string[] = apiUser.products || [];
        
        // Determine role based on API role and products
        let roleId = 'guest';
        if (apiUser.role === 'owner') {
          roleId = 'owner';
        } else if (apiUser.role === 'admin') {
          roleId = 'admin';
        } else if (apiUser.role === 'beta') {
          roleId = 'beta_tester';
        } else if (apiProducts.includes('quarter_pro') || apiProducts.includes('bonneville_pro')) {
          roleId = 'subscriber_pro';
        } else if (apiProducts.includes('quarter_jr')) {
          roleId = 'subscriber_basic';
        }
        
        // Store API products separately for direct access
        const apiProductsKey = 'rsa.auth.apiProducts';
        saveToStorage(apiProductsKey, apiProducts);
        
        const localUser: User = {
          id: `api_${apiUser.id}`,
          email: apiUser.email,
          displayName: apiUser.name,
          roleId: roleId,
          status: 'active',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        
        saveToStorage(STORAGE_KEYS.CURRENT_USER, localUser);
        
        console.log('API Login successful:', {
          user: localUser.email,
          roleId: localUser.roleId,
          apiRole: apiUser.role,
          apiProducts: apiProducts,
        });
        
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: localUser,
          error: null,
        });
        
        return true;
      }
    } catch (apiError: any) {
      console.log('API login failed, trying local:', apiError.message);
      // If API fails, fall back to local auth for development
    }
    
    // Fall back to local auth (for development/offline)
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      setState(prev => ({ ...prev, error: 'User not found' }));
      return false;
    }
    
    // Check password (simple hash for demo)
    if (user.passwordHash && user.passwordHash !== simpleHash(password)) {
      setState(prev => ({ ...prev, error: 'Invalid password' }));
      return false;
    }
    
    if (user.status !== 'active') {
      setState(prev => ({ ...prev, error: `Account is ${user.status}` }));
      return false;
    }
    
    const updatedUser = { ...user, lastLoginAt: new Date().toISOString() };
    const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
    setUsers(updatedUsers);
    saveToStorage(STORAGE_KEYS.USERS_DB, updatedUsers);
    saveToStorage(STORAGE_KEYS.CURRENT_USER, updatedUser);
    
    // Debug logging
    const userRole = roles.find(r => r.id === updatedUser.roleId);
    console.log('Local login successful:', {
      user: updatedUser.email,
      roleId: updatedUser.roleId,
      role: userRole?.name,
      products: userRole?.products,
      features: userRole?.additionalFeatures,
    });
    
    setState({
      isAuthenticated: true,
      isLoading: false,
      user: updatedUser,
      error: null,
    });
    
    return true;
  }, [users, roles]);

  // Logout
  const logout = useCallback(() => {
    setAuthToken(null); // Clear API token
    saveToStorage(STORAGE_KEYS.CURRENT_USER, null);
    localStorage.removeItem('rsa.auth.apiProducts'); // Clear API products
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
    });
  }, []);

  // User CRUD
  const getAllUsers = useCallback(() => users, [users]);
  
  const createUser = useCallback((userData: Omit<User, 'id' | 'createdAt'>, password?: string): User => {
    const newUser: User = {
      ...userData,
      id: generateId('user'),
      createdAt: new Date().toISOString(),
      passwordHash: password ? simpleHash(password) : undefined,
    };
    const updated = [...users, newUser];
    setUsers(updated);
    saveToStorage(STORAGE_KEYS.USERS_DB, updated);
    return newUser;
  }, [users]);
  
  const updateUser = useCallback((id: string, updates: Partial<User>): User | null => {
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    
    const updated = { ...users[idx], ...updates };
    const newUsers = [...users];
    newUsers[idx] = updated;
    setUsers(newUsers);
    saveToStorage(STORAGE_KEYS.USERS_DB, newUsers);
    
    if (state.user?.id === id) {
      saveToStorage(STORAGE_KEYS.CURRENT_USER, updated);
      setState(prev => ({ ...prev, user: updated }));
    }
    return updated;
  }, [users, state.user]);
  
  const deleteUser = useCallback((id: string): boolean => {
    if (state.user?.id === id) return false;
    const updated = users.filter(u => u.id !== id);
    if (updated.length === users.length) return false;
    setUsers(updated);
    saveToStorage(STORAGE_KEYS.USERS_DB, updated);
    return true;
  }, [users, state.user]);
  
  const getUserById = useCallback((id: string) => users.find(u => u.id === id) ?? null, [users]);
  
  const setUserPassword = useCallback((id: string, password: string): boolean => {
    const user = users.find(u => u.id === id);
    if (!user) return false;
    return updateUser(id, { passwordHash: simpleHash(password) }) !== null;
  }, [users, updateUser]);

  // Role CRUD
  const getAllRoles = useCallback(() => [...roles].sort((a, b) => a.sortOrder - b.sortOrder), [roles]);
  
  const createRole = useCallback((roleData: Omit<Role, 'id'>): Role => {
    const newRole: Role = { ...roleData, id: generateId('role') };
    const updated = [...roles, newRole];
    setRoles(updated);
    saveToStorage(STORAGE_KEYS.ROLES_DB, updated);
    return newRole;
  }, [roles]);
  
  const updateRole = useCallback((id: string, updates: Partial<Role>): Role | null => {
    const idx = roles.findIndex(r => r.id === id);
    if (idx === -1) return null;
    const updated = { ...roles[idx], ...updates };
    const newRoles = [...roles];
    newRoles[idx] = updated;
    setRoles(newRoles);
    saveToStorage(STORAGE_KEYS.ROLES_DB, newRoles);
    return updated;
  }, [roles]);
  
  const deleteRole = useCallback((id: string): boolean => {
    const role = roles.find(r => r.id === id);
    if (!role || role.isSystem) return false;
    // Check if any users have this role
    if (users.some(u => u.roleId === id)) return false;
    const updated = roles.filter(r => r.id !== id);
    setRoles(updated);
    saveToStorage(STORAGE_KEYS.ROLES_DB, updated);
    return true;
  }, [roles, users]);
  
  const getRoleById = useCallback((id: string) => roles.find(r => r.id === id) ?? null, [roles]);

  // Product CRUD
  const getAllProducts = useCallback(() => [...products].sort((a, b) => a.sortOrder - b.sortOrder), [products]);
  
  const createProduct = useCallback((productData: Omit<Product, 'id'>): Product => {
    const newProduct: Product = { ...productData, id: generateId('product') };
    const updated = [...products, newProduct];
    setProducts(updated);
    saveToStorage(STORAGE_KEYS.PRODUCTS_DB, updated);
    return newProduct;
  }, [products]);
  
  const updateProduct = useCallback((id: string, updates: Partial<Product>): Product | null => {
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    const updated = { ...products[idx], ...updates };
    const newProducts = [...products];
    newProducts[idx] = updated;
    setProducts(newProducts);
    saveToStorage(STORAGE_KEYS.PRODUCTS_DB, newProducts);
    return updated;
  }, [products]);
  
  const deleteProduct = useCallback((id: string): boolean => {
    // Check if any roles reference this product
    if (roles.some(r => r.products.includes(id))) return false;
    const updated = products.filter(p => p.id !== id);
    if (updated.length === products.length) return false;
    setProducts(updated);
    saveToStorage(STORAGE_KEYS.PRODUCTS_DB, updated);
    return true;
  }, [products, roles]);
  
  const getProductById = useCallback((id: string) => products.find(p => p.id === id) ?? null, [products]);

  // Access control
  const getUserRole = useCallback((): Role | null => {
    if (!state.user) return null;
    return roles.find(r => r.id === state.user!.roleId) ?? null;
  }, [state.user, roles]);
  
  const getUserProducts = useCallback((): Product[] => {
    // First check API products (for API-authenticated users)
    const apiProducts = loadFromStorage<string[]>('rsa.auth.apiProducts', []);
    if (apiProducts.length > 0) {
      return products.filter(p => apiProducts.includes(p.id));
    }
    
    // Fall back to role-based products
    const role = getUserRole();
    if (!role) return [];
    return products.filter(p => role.products.includes(p.id));
  }, [getUserRole, products]);
  
  const hasFeature = useCallback((feature: FeatureFlag): boolean => {
    // First check API products (for API-authenticated users)
    const apiProducts = loadFromStorage<string[]>('rsa.auth.apiProducts', []);
    
    if (apiProducts.length > 0) {
      const userProds = products.filter(p => apiProducts.includes(p.id));
      const hasIt = userProds.some(p => p.features.includes(feature));
      console.log(`hasFeature(${feature}): apiProducts=${JSON.stringify(apiProducts)}, userProds=${userProds.map(p => p.id)}, has=${hasIt}`);
      if (hasIt) return true;
    }
    
    const role = getUserRole();
    if (!role) {
      console.log(`hasFeature(${feature}): no role, returning false`);
      return false;
    }
    
    // Check additional features
    if (role.additionalFeatures.includes(feature)) return true;
    
    // Check product features
    const userProducts = products.filter(p => role.products.includes(p.id));
    const hasIt = userProducts.some(p => p.features.includes(feature));
    console.log(`hasFeature(${feature}): role=${role.id}, roleProducts=${role.products}, has=${hasIt}`);
    return hasIt;
  }, [getUserRole, products]);
  
  const hasProduct = useCallback((productId: string): boolean => {
    // First check API products (for API-authenticated users)
    const apiProducts = loadFromStorage<string[]>('rsa.auth.apiProducts', []);
    console.log(`hasProduct(${productId}): apiProducts=${JSON.stringify(apiProducts)}, includes=${apiProducts.includes(productId)}`);
    if (apiProducts.includes(productId)) return true;
    
    // Fall back to role-based products
    const role = getUserRole();
    if (!role) return false;
    return role.products.includes(productId);
  }, [getUserRole]);
  
  const canManageUsers = useCallback((): boolean => {
    const role = getUserRole();
    return role?.canManageUsers ?? false;
  }, [getUserRole]);
  
  const canManageRoles = useCallback((): boolean => {
    const role = getUserRole();
    return role?.canManageRoles ?? false;
  }, [getUserRole]);

  // Dev helpers
  const impersonateUser = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      saveToStorage(STORAGE_KEYS.CURRENT_USER, user);
      setState({
        isAuthenticated: true,
        isLoading: false,
        user,
        error: null,
      });
    }
  }, [users]);
  
  const setDevRole = useCallback((roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    
    const devUser: User = {
      id: `dev_${roleId}`,
      email: `dev-${roleId}@rsa.local`,
      displayName: `Dev ${role.name}`,
      roleId,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    
    saveToStorage(STORAGE_KEYS.CURRENT_USER, devUser);
    setState({
      isAuthenticated: true,
      isLoading: false,
      user: devUser,
      error: null,
    });
  }, [roles]);

  // Reset all auth data to defaults
  const resetAuthData = useCallback(() => {
    // Clear all auth storage
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.USERS_DB);
    localStorage.removeItem(STORAGE_KEYS.ROLES_DB);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS_DB);
    
    // Reset to defaults
    const defaultUsers = getDefaultUsers();
    saveToStorage(STORAGE_KEYS.USERS_DB, defaultUsers);
    saveToStorage(STORAGE_KEYS.ROLES_DB, DEFAULT_ROLES);
    saveToStorage(STORAGE_KEYS.PRODUCTS_DB, DEFAULT_PRODUCTS);
    
    setUsers(defaultUsers);
    setRoles(DEFAULT_ROLES);
    setProducts(DEFAULT_PRODUCTS);
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
    });
    
    console.log('Auth data reset to defaults');
  }, []);

  const value: AuthContextValue = {
    ...state,
    config: { roles, products },
    login,
    logout,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    setUserPassword,
    getAllRoles,
    createRole,
    updateRole,
    deleteRole,
    getRoleById,
    getAllProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    hasFeature,
    hasProduct,
    canManageUsers,
    canManageRoles,
    getUserRole,
    getUserProducts,
    impersonateUser,
    setDevRole,
    resetAuthData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hooks
// ============================================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function useFeature(feature: FeatureFlag): boolean {
  const { hasFeature } = useAuth();
  return hasFeature(feature);
}

export function useProduct(productId: string): boolean {
  const { hasProduct } = useAuth();
  return hasProduct(productId);
}
