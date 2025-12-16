/**
 * Stripe Configuration
 * 
 * Stripe is used for subscription management and payments.
 * Integrates with Clerk for user identification.
 */

import { loadStripe, type Stripe } from '@stripe/stripe-js';

// Stripe publishable key - set in environment variables
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

// Stripe instance (lazy loaded)
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get the Stripe instance (lazy loaded)
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise && isStripeConfigured()) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise || Promise.resolve(null);
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return STRIPE_PUBLISHABLE_KEY.length > 0 && STRIPE_PUBLISHABLE_KEY.startsWith('pk_');
}

// =============================================================================
// Subscription Plans
// =============================================================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  features: string[];
  products: string[]; // RSA product IDs granted by this plan
  popular?: boolean;
}

/**
 * Available subscription plans
 * Price IDs should be set from Stripe dashboard
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'racer',
    name: 'Racer',
    description: 'For weekend bracket racers',
    priceMonthly: 9.99,
    priceYearly: 99.99,
    stripePriceIdMonthly: 'price_1ScCEJLhFtG9ySfYTncD5d5u', // Set from Stripe dashboard
    stripePriceIdYearly: 'price_1ScCEJLhFtG9ySfYLapGFU4N',
    features: [
      'ET Simulator',
      'Weather Integration',
      'Run Logbook',
      '5 Vehicles',
      'Basic Support',
    ],
    products: ['quarter_jr'],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For serious competitors',
    priceMonthly: 24.99,
    priceYearly: 249.99,
    stripePriceIdMonthly: 'price_1ScCFMLhFtG9ySfYhr5toBm2', // Set from Stripe dashboard
    stripePriceIdYearly: 'price_1ScCFMLhFtG9ySfYmfxdHyKA',
    features: [
      'Everything in Racer',
      'AI Opponent Prediction',
      'Optimizer Tools',
      'Unlimited Vehicles',
      'Priority Support',
    ],
    products: ['quarter_pro', 'bonneville_pro'],
    popular: true,
  },
  {
    id: 'team',
    name: 'Team',
    description: 'For teams and professionals',
    priceMonthly: 49.99,
    priceYearly: 499.99,
    stripePriceIdMonthly: 'price_1ScCGCLhFtG9ySfYgFS2yYip', // Set from Stripe dashboard
    stripePriceIdYearly: 'price_1ScCGCLhFtG9ySfYt48noho4',
    features: [
      'Everything in Pro',
      'Team Collaboration',
      'Advanced Simulators',
      'API Access',
      'Dedicated Support',
    ],
    products: ['quarter_pro', 'bonneville_pro', 'engine_pro', 'clutch_pro', 'suspension_pro'],
  },
];

/**
 * Get a subscription plan by ID
 */
export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(p => p.id === planId);
}

// =============================================================================
// Subscription Status Types
// =============================================================================

export type SubscriptionStatus = 
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export interface UserSubscription {
  id: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}

// =============================================================================
// Backend API Integration
// =============================================================================

// API base URL - uses environment variable or defaults to production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://racingsystemsanalysis.com/api';

/**
 * Get the auth token from localStorage
 */
function getAuthToken(): string | null {
  // Try Clerk token first, then legacy token
  return localStorage.getItem('rsa.auth.clerkToken') 
    || localStorage.getItem('rsa.auth.token')
    || null;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }
  
  return data;
}

/**
 * Create a Stripe Checkout Session via backend API
 * Redirects user to Stripe-hosted checkout page
 */
export async function redirectToCheckout(params: {
  planId: string;
  billingPeriod: 'monthly' | 'yearly';
  customerEmail?: string;
}): Promise<void> {
  const plan = getPlanById(params.planId);
  if (!plan) {
    console.error('Plan not found:', params.planId);
    alert('Invalid plan selected.');
    return;
  }

  try {
    const response = await apiRequest<{ sessionId: string; url: string }>(
      'stripe.php?action=create-checkout-session',
      {
        method: 'POST',
        body: JSON.stringify({
          planId: params.planId,
          billingPeriod: params.billingPeriod,
        }),
      }
    );
    
    // Redirect to Stripe Checkout
    if (response.url) {
      window.location.href = response.url;
    } else {
      throw new Error('No checkout URL returned');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert(
      error instanceof Error 
        ? error.message 
        : 'Failed to start checkout. Please try again.'
    );
  }
}

/**
 * Open Stripe Customer Portal for subscription management
 * Users can upgrade, downgrade, cancel, and update payment methods here
 */
export async function openCustomerPortal(): Promise<void> {
  try {
    const response = await apiRequest<{ url: string }>(
      'stripe.php?action=create-portal-session',
      { method: 'POST' }
    );
    
    if (response.url) {
      window.location.href = response.url;
    } else {
      throw new Error('No portal URL returned');
    }
  } catch (error) {
    console.error('Portal error:', error);
    alert(
      error instanceof Error 
        ? error.message 
        : 'Failed to open subscription management. Please try again.'
    );
  }
}

/**
 * Get current subscription status from backend
 */
export async function getSubscriptionStatus(): Promise<{
  plan: string | null;
  status: string;
  periodEnd: string | null;
  hasStripeCustomer: boolean;
}> {
  try {
    const response = await apiRequest<{ subscription: {
      plan: string | null;
      status: string;
      periodEnd: string | null;
      hasStripeCustomer: boolean;
    }}>(
      'stripe.php?action=subscription-status'
    );
    return response.subscription;
  } catch (error) {
    console.error('Failed to get subscription status:', error);
    return {
      plan: null,
      status: 'none',
      periodEnd: null,
      hasStripeCustomer: false,
    };
  }
}

/**
 * Check if backend API is configured
 */
export function hasPaymentLinks(): boolean {
  // Now we use backend API, so this always returns true if API URL is set
  return API_BASE_URL.length > 0;
}

/**
 * Legacy function - use redirectToCheckout instead
 * @deprecated
 */
export async function createCheckoutSession(params: {
  planId: string;
  billingPeriod: 'monthly' | 'yearly';
  clerkUserId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; url: string } | null> {
  console.warn('createCheckoutSession is deprecated. Use redirectToCheckout instead.');
  await redirectToCheckout({
    planId: params.planId,
    billingPeriod: params.billingPeriod,
  });
  return null;
}

/**
 * Create a customer portal session for managing subscriptions
 * @deprecated Use openCustomerPortal instead
 */
export async function createPortalSession(_params: {
  clerkUserId: string;
  returnUrl: string;
}): Promise<{ url: string } | null> {
  console.warn('createPortalSession is deprecated. Use openCustomerPortal instead.');
  await openCustomerPortal();
  return null;
}
