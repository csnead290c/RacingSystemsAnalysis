/**
 * Clerk Auth Provider
 * 
 * Wraps Clerk authentication and syncs with the existing RSA auth system.
 * This allows both Clerk OAuth and legacy local auth to work together.
 */

import { ClerkProvider, useUser, useAuth as useClerkAuth, SignIn, SignUp, UserButton } from '@clerk/clerk-react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { CLERK_PUBLISHABLE_KEY, isClerkConfigured, clerkAppearance, mapClerkUserToRole, mapClerkUserToProducts, getSubscriptionFromClerk, type SubscriptionInfo } from './clerkConfig';
import type { User } from './types';
import { getSubscriptionStatus } from '../payments/stripeConfig';

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
  // State for database subscription/products
  const [dbProducts, setDbProducts] = useState<string[]>([]);
  const [dbSubscription, setDbSubscription] = useState<{ plan: string | null; status: string }>({ plan: null, status: 'none' });
  
  // Sync Clerk user to database and fetch subscription
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    
    const syncAndFetchSubscription = async () => {
      try {
        // First, get the Clerk token
        const token = await getToken();
        if (!token) {
          console.error('No Clerk token available');
          return;
        }
        
        // Sync user to database
        const syncResponse = await fetch('/api/auth.php?action=sync-clerk-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: user.fullName || user.firstName || 'User',
            email: user.primaryEmailAddress?.emailAddress || '',
          }),
        });
        
        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          console.log('Clerk user synced to database:', syncData);
        }
        
        // Then fetch subscription status
        const status = await getSubscriptionStatus();
        setDbProducts(status.products || []);
        setDbSubscription({ plan: status.plan, status: status.status });
        
        // Store products in localStorage for auth system
        if (status.products && status.products.length > 0) {
          localStorage.setItem('rsa.auth.apiProducts', JSON.stringify(status.products));
          console.log('Fetched products from DB:', status.products);
          
          // Dispatch custom event to notify other components that products have been updated
          window.dispatchEvent(new CustomEvent('rsa-products-updated', { 
            detail: { products: status.products } 
          }));
        }
      } catch (err) {
        console.error('Failed to sync/fetch subscription from DB:', err);
      }
    };
    
    syncAndFetchSubscription();
  }, [isLoaded, isSignedIn, user, getToken]);
  
  useEffect(() => {
    if (!isLoaded) return;
    
    if (isSignedIn && user) {
      // Map Clerk user to RSA user format
      // Use database subscription to determine role
      let roleId = mapClerkUserToRole(user);
      if (dbSubscription.plan && dbSubscription.status === 'active') {
        if (dbSubscription.plan === 'pro' || dbSubscription.plan === 'team') {
          roleId = 'subscriber_pro';
        } else if (dbSubscription.plan === 'racer') {
          roleId = 'subscriber_basic';
        }
      }
      
      const rsaUser: User = {
        id: `clerk_${user.id}`,
        email: user.primaryEmailAddress?.emailAddress || '',
        displayName: user.fullName || user.firstName || 'User',
        roleId,
        status: 'active',
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      
      // Use products from database if available, otherwise from Clerk metadata
      const rsaProducts = dbProducts.length > 0 ? dbProducts : mapClerkUserToProducts(user);
      
      // Store in localStorage for RSA auth system to pick up
      localStorage.setItem('rsa.auth.currentUser', JSON.stringify(rsaUser));
      localStorage.setItem('rsa.auth.apiProducts', JSON.stringify(rsaProducts));
      localStorage.setItem('rsa.auth.clerkSession', 'true');
      
      console.log('Clerk user synced to RSA:', {
        email: rsaUser.email,
        roleId: rsaUser.roleId,
        products: rsaProducts,
        dbSubscription,
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
  }, [isLoaded, isSignedIn, user, getToken, dbProducts, dbSubscription]);
  
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
