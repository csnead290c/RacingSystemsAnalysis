/**
 * Clerk Configuration
 * 
 * Clerk is used for OAuth authentication (Google, GitHub, etc.)
 * This runs alongside the existing auth system during migration.
 */

// Clerk publishable key - set in environment variables
// Use pk_live_* for production, pk_test_* for development only.
export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

// Runtime guard: warn loudly if a test key leaks into a production build.
if (
  import.meta.env.PROD &&
  CLERK_PUBLISHABLE_KEY.startsWith('pk_test_')
) {
  console.error(
    '[RSA] Clerk is using a TEST publishable key in a PRODUCTION build. ' +
    'Set VITE_CLERK_PUBLISHABLE_KEY to a pk_live_* key for production.',
  );
}

// Check if Clerk is configured
export const isClerkConfigured = (): boolean => {
  return CLERK_PUBLISHABLE_KEY.length > 0 && CLERK_PUBLISHABLE_KEY.startsWith('pk_');
};

// Clerk appearance customization to match RSA brand (red/white/black)
export const clerkAppearance = {
  variables: {
    colorPrimary: '#dc2626',
    colorBackground: 'var(--color-bg)',
    colorText: 'var(--color-text)',
    colorInputBackground: 'var(--color-surface)',
    colorInputText: 'var(--color-text)',
    borderRadius: '8px',
  },
  elements: {
    card: {
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-lg)',
    },
    headerTitle: {
      color: 'var(--color-text)',
    },
    headerSubtitle: {
      color: 'var(--color-text-muted)',
    },
    formButtonPrimary: {
      backgroundColor: '#dc2626',
      '&:hover': {
        backgroundColor: '#b91c1c',
      },
    },
    footerActionLink: {
      color: '#dc2626',
    },
  },
};

// Map Clerk user metadata to RSA roles
export function mapClerkUserToRole(clerkUser: any): string {
  // Check for custom metadata set by admin
  const metadata = clerkUser.publicMetadata || {};
  
  if (metadata.role === 'owner') return 'owner';
  if (metadata.role === 'admin') return 'admin';
  if (metadata.role === 'beta') return 'beta_tester';
  
  // Check subscription status from Stripe (stored in metadata)
  const subscription = metadata.subscription;
  if (subscription === 'pro' || subscription === 'team') return 'subscriber_pro';
  if (subscription === 'racer') return 'subscriber_basic';
  
  // Default to beta tester for new signups (during beta period)
  return 'beta_tester';
}

// Map Clerk user metadata to RSA products
export function mapClerkUserToProducts(clerkUser: any): string[] {
  const metadata = clerkUser.publicMetadata || {};
  const products: string[] = [];
  
  // Check for explicit product assignments
  if (metadata.products && Array.isArray(metadata.products)) {
    return metadata.products;
  }
  
  // Map subscription tier to products
  const subscription = metadata.subscription;
  
  if (subscription === 'team') {
    products.push('quarter_pro', 'bonneville_pro', 'engine_pro', 'clutch_pro', 'suspension_pro');
  } else if (subscription === 'pro') {
    products.push('quarter_pro', 'bonneville_pro');
  } else if (subscription === 'racer') {
    products.push('quarter_jr');
  }
  
  // Beta testers get all products during beta
  if (metadata.role === 'beta' || metadata.role === 'owner' || metadata.role === 'admin') {
    return ['quarter_pro', 'bonneville_pro', 'engine_pro', 'clutch_pro', 'suspension_pro'];
  }
  
  // Default: give quarter_jr for free tier
  if (products.length === 0) {
    products.push('quarter_jr');
  }
  
  return products;
}

// Get subscription info from Clerk metadata
export interface SubscriptionInfo {
  plan: 'racer' | 'pro' | 'team' | null;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';
  stripeCustomerId?: string;
  currentPeriodEnd?: string;
}

export function getSubscriptionFromClerk(clerkUser: any): SubscriptionInfo {
  const metadata = clerkUser?.publicMetadata || {};
  
  return {
    plan: metadata.subscription || null,
    status: metadata.subscriptionStatus || 'none',
    stripeCustomerId: metadata.stripeCustomerId,
    currentPeriodEnd: metadata.subscriptionEnd,
  };
}
