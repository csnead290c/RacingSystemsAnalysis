/**
 * Auth Module Exports
 */

export * from './types';
export { AuthProvider, useAuth, useFeature, useProduct } from './authStore';

// Clerk OAuth integration
export { 
  ClerkAuthProvider, 
  useClerkRSA,
  ClerkSignIn,
  ClerkSignUp,
  ClerkUserButton,
} from './ClerkAuthProvider';
export { isClerkConfigured } from './clerkConfig';
