/**
 * Authentication Store
 * 
 * Provides authentication context, user management, and role/product configuration.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, Role, Product, AuthState, AuthConfig, FeatureFlag } from './types';
import { INITIAL_AUTH_STATE, DEFAULT_ROLES, DEFAULT_PRODUCTS } from './types';

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
    // Load or seed roles
    let storedRoles = loadFromStorage<Role[]>(STORAGE_KEYS.ROLES_DB, []);
    if (storedRoles.length === 0) {
      storedRoles = DEFAULT_ROLES;
      saveToStorage(STORAGE_KEYS.ROLES_DB, storedRoles);
    }
    setRoles(storedRoles);
    
    // Load or seed products
    let storedProducts = loadFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS_DB, []);
    if (storedProducts.length === 0) {
      storedProducts = DEFAULT_PRODUCTS;
      saveToStorage(STORAGE_KEYS.PRODUCTS_DB, storedProducts);
    }
    setProducts(storedProducts);
    
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

  // Login
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
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
    
    setState({
      isAuthenticated: true,
      isLoading: false,
      user: updatedUser,
      error: null,
    });
    
    return true;
  }, [users]);

  // Logout
  const logout = useCallback(() => {
    saveToStorage(STORAGE_KEYS.CURRENT_USER, null);
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
    const role = getUserRole();
    if (!role) return [];
    return products.filter(p => role.products.includes(p.id));
  }, [getUserRole, products]);
  
  const hasFeature = useCallback((feature: FeatureFlag): boolean => {
    const role = getUserRole();
    if (!role) return false;
    
    // Check additional features
    if (role.additionalFeatures.includes(feature)) return true;
    
    // Check product features
    const userProducts = products.filter(p => role.products.includes(p.id));
    return userProducts.some(p => p.features.includes(feature));
  }, [getUserRole, products]);
  
  const hasProduct = useCallback((productId: string): boolean => {
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
