/**
 * Clerk Auth Provider
 * 
 * Wraps Clerk authentication and syncs with the existing RSA auth system.
 * This allows both Clerk OAuth and legacy local auth to work together.
 */

import { ClerkProvider, useUser, useAuth as useClerkAuth, SignIn, SignUp, UserButton } from '@clerk/clerk-react';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { CLERK_PUBLISHABLE_KEY, isClerkConfigured, clerkAppearance, mapClerkUserToRole, mapClerkUserToProducts, getSubscriptionFromClerk, type SubscriptionInfo } from './clerkConfig';
import type { User } from './types';

// ============================================================================
// Clerk Context for RSA Integration
// ============================================================================

interface ClerkRSAContextValue {
  isClerkEnabled: boolean;
  isClerkLoaded: boolean;
  isClerkSignedIn: boolean;
  clerkUser: any | null;
  rsaUser: User | null;
  rsaProducts: string[];
  subscription: SubscriptionInfo;
}

const ClerkRSAContext = createContext<ClerkRSAContextValue>({
  isClerkEnabled: false,
  isClerkLoaded: false,
  isClerkSignedIn: false,
  clerkUser: null,
  rsaUser: null,
  rsaProducts: [],
  subscription: { plan: null, status: 'none' },
});

export function useClerkRSA() {
  return useContext(ClerkRSAContext);
}

// ============================================================================
// Clerk to RSA Sync Component
// ============================================================================

function ClerkRSASync({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useClerkAuth();
  
  // Sync Clerk user to localStorage for RSA auth system
  useEffect(() => {
    if (!isLoaded) return;
    
    if (isSignedIn && user) {
      // Map Clerk user to RSA user format
      const rsaUser: User = {
        id: `clerk_${user.id}`,
        email: user.primaryEmailAddress?.emailAddress || '',
        displayName: user.fullName || user.firstName || 'User',
        roleId: mapClerkUserToRole(user),
        status: 'active',
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      
      const rsaProducts = mapClerkUserToProducts(user);
      
      // Store in localStorage for RSA auth system to pick up
      localStorage.setItem('rsa.auth.currentUser', JSON.stringify(rsaUser));
      localStorage.setItem('rsa.auth.apiProducts', JSON.stringify(rsaProducts));
      localStorage.setItem('rsa.auth.clerkSession', 'true');
      
      console.log('Clerk user synced to RSA:', {
        email: rsaUser.email,
        roleId: rsaUser.roleId,
        products: rsaProducts,
      });
      
      // Get Clerk session token for API calls (if needed)
      getToken().then(token => {
        if (token) {
          localStorage.setItem('rsa.auth.clerkToken', token);
        }
      });
    } else {
      // Only clear if this was a Clerk session
      const wasClerkSession = localStorage.getItem('rsa.auth.clerkSession') === 'true';
      if (wasClerkSession) {
        localStorage.removeItem('rsa.auth.currentUser');
        localStorage.removeItem('rsa.auth.apiProducts');
        localStorage.removeItem('rsa.auth.clerkSession');
        localStorage.removeItem('rsa.auth.clerkToken');
        console.log('Clerk session ended, cleared RSA auth');
      }
    }
  }, [isLoaded, isSignedIn, user, getToken]);
  
  const subscription = isSignedIn && user ? getSubscriptionFromClerk(user) : { plan: null, status: 'none' as const };
  
  const contextValue: ClerkRSAContextValue = {
    isClerkEnabled: true,
    isClerkLoaded: isLoaded,
    isClerkSignedIn: isSignedIn || false,
    clerkUser: user,
    rsaUser: isSignedIn && user ? {
      id: `clerk_${user.id}`,
      email: user.primaryEmailAddress?.emailAddress || '',
      displayName: user.fullName || user.firstName || 'User',
      roleId: mapClerkUserToRole(user),
      status: 'active',
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
    } : null,
    rsaProducts: isSignedIn && user ? mapClerkUserToProducts(user) : [],
    subscription,
  };
  
  return (
    <ClerkRSAContext.Provider value={contextValue}>
      {children}
    </ClerkRSAContext.Provider>
  );
}

// ============================================================================
// Main Clerk Provider Wrapper
// ============================================================================

interface ClerkAuthProviderProps {
  children: ReactNode;
}

export function ClerkAuthProvider({ children }: ClerkAuthProviderProps) {
  // If Clerk is not configured, just render children without Clerk
  if (!isClerkConfigured()) {
    console.log('Clerk not configured, using legacy auth only');
    return (
      <ClerkRSAContext.Provider value={{
        isClerkEnabled: false,
        isClerkLoaded: true,
        isClerkSignedIn: false,
        clerkUser: null,
        rsaUser: null,
        rsaProducts: [],
        subscription: { plan: null, status: 'none' },
      }}>
        {children}
      </ClerkRSAContext.Provider>
    );
  }
  
  return (
    <ClerkProvider 
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={clerkAppearance}
    >
      <ClerkRSASync>
        {children}
      </ClerkRSASync>
    </ClerkProvider>
  );
}

// ============================================================================
// Re-export Clerk components for use in app
// ============================================================================

export { SignIn, SignUp, UserButton };

// ============================================================================
// Custom Sign In/Up components that work with RSA styling
// ============================================================================

interface ClerkSignInProps {
  redirectUrl?: string;
  afterSignInUrl?: string;
}

export function ClerkSignIn({ redirectUrl = '/', afterSignInUrl = '/' }: ClerkSignInProps) {
  if (!isClerkConfigured()) {
    return null;
  }
  
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <SignIn 
        routing="hash"
        signUpUrl="/register"
        afterSignInUrl={afterSignInUrl}
        redirectUrl={redirectUrl}
      />
    </div>
  );
}

interface ClerkSignUpProps {
  redirectUrl?: string;
  afterSignUpUrl?: string;
}

export function ClerkSignUp({ redirectUrl = '/', afterSignUpUrl = '/' }: ClerkSignUpProps) {
  if (!isClerkConfigured()) {
    return null;
  }
  
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <SignUp 
        routing="hash"
        signInUrl="/login"
        afterSignUpUrl={afterSignUpUrl}
        redirectUrl={redirectUrl}
      />
    </div>
  );
}

// ============================================================================
// User Button for header (shows Clerk user menu if signed in via Clerk)
// ============================================================================

export function ClerkUserButton() {
  const { isClerkEnabled, isClerkSignedIn } = useClerkRSA();
  
  if (!isClerkEnabled || !isClerkSignedIn) {
    return null;
  }
  
  return (
    <UserButton 
      afterSignOutUrl="/"
      appearance={{
        elements: {
          avatarBox: {
            width: '32px',
            height: '32px',
          },
        },
      }}
    />
  );
}
