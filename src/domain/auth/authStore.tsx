/**
 * Authentication Store
 * 
 * Provides authentication context and user management.
 * For now, uses localStorage for persistence (will migrate to backend later).
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, UserRole, AuthState, Feature } from './types';
import { INITIAL_AUTH_STATE, hasFeatureAccess, getRoleProgramTier } from './types';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  CURRENT_USER: 'rsa.auth.currentUser',
  USERS_DB: 'rsa.auth.users',
  SESSION_TOKEN: 'rsa.auth.session',
};

// ============================================================================
// Context
// ============================================================================

interface AuthContextValue extends AuthState {
  // Auth actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  
  // User management (admin only)
  getAllUsers: () => User[];
  createUser: (user: Omit<User, 'id' | 'createdAt'>) => User;
  updateUser: (id: string, updates: Partial<User>) => User | null;
  deleteUser: (id: string) => boolean;
  getUserById: (id: string) => User | null;
  
  // Access control helpers
  hasFeature: (feature: Feature) => boolean;
  canManageUsers: () => boolean;
  getProgramTier: () => 'quarterJr' | 'quarterPro' | 'admin';
  
  // Dev helpers
  impersonateUser: (userId: string) => void;
  setDevUser: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function loadUsersFromStorage(): User[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USERS_DB);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load users from storage:', e);
  }
  return [];
}

function saveUsersToStorage(users: User[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users to storage:', e);
  }
}

function loadCurrentUserFromStorage(): User | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load current user from storage:', e);
  }
  return null;
}

function saveCurrentUserToStorage(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  } catch (e) {
    console.error('Failed to save current user to storage:', e);
  }
}

// ============================================================================
// Default Users (seeded on first run)
// ============================================================================

function getDefaultUsers(): User[] {
  const now = new Date().toISOString();
  
  return [
    {
      id: 'owner_001',
      email: 'owner@rsa.local',
      displayName: 'System Owner',
      role: 'owner',
      status: 'active',
      createdAt: now,
      adminNotes: 'Default system owner account',
    },
    {
      id: 'admin_001',
      email: 'admin@rsa.local',
      displayName: 'Administrator',
      role: 'admin',
      status: 'active',
      createdAt: now,
      adminNotes: 'Default admin account',
    },
    {
      id: 'beta_001',
      email: 'beta@rsa.local',
      displayName: 'Beta Tester',
      role: 'beta_tester',
      status: 'active',
      createdAt: now,
      betaTester: {
        invitedBy: 'owner_001',
        invitedAt: now,
        feedbackCount: 0,
      },
      adminNotes: 'Default beta tester account',
    },
  ];
}

// ============================================================================
// Provider Component
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(INITIAL_AUTH_STATE);
  const [users, setUsers] = useState<User[]>([]);

  // Initialize on mount
  useEffect(() => {
    // Load users from storage
    let storedUsers = loadUsersFromStorage();
    
    // Seed default users if none exist
    if (storedUsers.length === 0) {
      storedUsers = getDefaultUsers();
      saveUsersToStorage(storedUsers);
    }
    
    setUsers(storedUsers);
    
    // Check for existing session
    const currentUser = loadCurrentUserFromStorage();
    if (currentUser) {
      // Verify user still exists and is active
      const userStillValid = storedUsers.find(
        u => u.id === currentUser.id && u.status === 'active'
      );
      
      if (userStillValid) {
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: userStillValid,
          error: null,
        });
      } else {
        // User no longer valid, clear session
        saveCurrentUserToStorage(null);
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        });
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Login
  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    // For now, just match by email (no real password check)
    // In production, this would call an auth API
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      setState(prev => ({
        ...prev,
        error: 'User not found',
      }));
      return false;
    }
    
    if (user.status !== 'active') {
      setState(prev => ({
        ...prev,
        error: `Account is ${user.status}`,
      }));
      return false;
    }
    
    // Update last login
    const updatedUser = {
      ...user,
      lastLoginAt: new Date().toISOString(),
    };
    
    // Update in storage
    const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
    setUsers(updatedUsers);
    saveUsersToStorage(updatedUsers);
    saveCurrentUserToStorage(updatedUser);
    
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
    saveCurrentUserToStorage(null);
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
    });
  }, []);

  // Get all users
  const getAllUsers = useCallback((): User[] => {
    return users;
  }, [users]);

  // Create user
  const createUser = useCallback((userData: Omit<User, 'id' | 'createdAt'>): User => {
    const newUser: User = {
      ...userData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveUsersToStorage(updatedUsers);
    
    return newUser;
  }, [users]);

  // Update user
  const updateUser = useCallback((id: string, updates: Partial<User>): User | null => {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) return null;
    
    const updatedUser = { ...users[userIndex], ...updates };
    const updatedUsers = [...users];
    updatedUsers[userIndex] = updatedUser;
    
    setUsers(updatedUsers);
    saveUsersToStorage(updatedUsers);
    
    // If updating current user, update session too
    if (state.user?.id === id) {
      saveCurrentUserToStorage(updatedUser);
      setState(prev => ({ ...prev, user: updatedUser }));
    }
    
    return updatedUser;
  }, [users, state.user]);

  // Delete user
  const deleteUser = useCallback((id: string): boolean => {
    // Can't delete yourself
    if (state.user?.id === id) return false;
    
    const updatedUsers = users.filter(u => u.id !== id);
    if (updatedUsers.length === users.length) return false;
    
    setUsers(updatedUsers);
    saveUsersToStorage(updatedUsers);
    
    return true;
  }, [users, state.user]);

  // Get user by ID
  const getUserById = useCallback((id: string): User | null => {
    return users.find(u => u.id === id) ?? null;
  }, [users]);

  // Check feature access
  const hasFeature = useCallback((feature: Feature): boolean => {
    if (!state.user) return false;
    return hasFeatureAccess(state.user.role, feature);
  }, [state.user]);

  // Check if can manage users
  const canManageUsers = useCallback((): boolean => {
    return hasFeature('user_management');
  }, [hasFeature]);

  // Get program tier
  const getProgramTier = useCallback((): 'quarterJr' | 'quarterPro' | 'admin' => {
    if (!state.user) return 'quarterJr';
    return getRoleProgramTier(state.user.role);
  }, [state.user]);

  // Dev: Impersonate user
  const impersonateUser = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      saveCurrentUserToStorage(user);
      setState({
        isAuthenticated: true,
        isLoading: false,
        user,
        error: null,
      });
    }
  }, [users]);

  // Dev: Set user by role (creates temp user)
  const setDevUser = useCallback((role: UserRole) => {
    const devUser: User = {
      id: `dev_${role}`,
      email: `dev-${role}@rsa.local`,
      displayName: `Dev ${role}`,
      role,
      status: 'active',
      createdAt: new Date().toISOString(),
      adminNotes: 'Development user',
    };
    
    saveCurrentUserToStorage(devUser);
    setState({
      isAuthenticated: true,
      isLoading: false,
      user: devUser,
      error: null,
    });
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    hasFeature,
    canManageUsers,
    getProgramTier,
    impersonateUser,
    setDevUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to check if user has a specific feature
 */
export function useFeature(feature: Feature): boolean {
  const { hasFeature } = useAuth();
  return hasFeature(feature);
}

/**
 * Hook to get current user's program tier
 */
export function useProgramTier(): 'quarterJr' | 'quarterPro' | 'admin' {
  const { getProgramTier } = useAuth();
  return getProgramTier();
}
