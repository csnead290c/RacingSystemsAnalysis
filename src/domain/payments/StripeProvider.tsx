/**
 * Stripe Provider
 * 
 * Wraps the app with Stripe Elements context for payment forms.
 */

import { Elements } from '@stripe/react-stripe-js';
import { type ReactNode } from 'react';
import { getStripe, isStripeConfigured } from './stripeConfig';

interface StripeProviderProps {
  children: ReactNode;
}

/**
 * Stripe Elements Provider
 * Only renders Elements wrapper if Stripe is configured
 */
export function StripeProvider({ children }: StripeProviderProps) {
  if (!isStripeConfigured()) {
    // Stripe not configured, just render children
    return <>{children}</>;
  }

  return (
    <Elements 
      stripe={getStripe()}
      options={{
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#3b82f6',
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorDanger: '#ef4444',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            borderRadius: '8px',
          },
        },
      }}
    >
      {children}
    </Elements>
  );
}

export default StripeProvider;
