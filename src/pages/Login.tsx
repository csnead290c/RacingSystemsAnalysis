/**
 * Login Page
 * 
 * Supports both Clerk OAuth and legacy email/password login.
 */

import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, useClerkRSA, ClerkSignIn, isClerkConfigured } from '../domain/auth';
import Page from '../shared/components/Page';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, error: authError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isClerkSignedIn } = useClerkRSA();
  const [showLegacyLogin, setShowLegacyLogin] = useState(false);
  const clerkEnabled = isClerkConfigured();

  // Redirect if already logged in (via either method)
  if (isAuthenticated || isClerkSignedIn) {
    const from = (location.state as any)?.from?.pathname || '/';
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      const success = await login(email, password);
      if (success) {
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        setError(authError || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  // When Clerk is enabled and showing, use a cleaner layout without our wrapper
  if (clerkEnabled && !showLegacyLogin) {
    return (
      <Page title="Sign In">
        <div style={{
          maxWidth: '450px',
          margin: '2rem auto',
          padding: '1rem',
        }}>
          <ClerkSignIn afterSignInUrl="/" />
          
          <div style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--color-muted)',
          }}>
            <button
              type="button"
              onClick={() => setShowLegacyLogin(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Sign in with email/password instead
            </button>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Login">
      <div style={{
        maxWidth: '400px',
        margin: '2rem auto',
        padding: '2rem',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          Sign In
        </h2>

        <form onSubmit={handleSubmit}>
          {(error || authError) && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
            }}>
              {error || authError}
            </div>
          )}
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 500,
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text)',
                fontSize: '1rem',
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 500,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text)',
                fontSize: '1rem',
              }}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        {/* Back to OAuth option */}
        {clerkEnabled && showLegacyLogin && (
          <div style={{
            marginTop: '1rem',
            textAlign: 'center',
            fontSize: '0.85rem',
          }}>
            <button
              type="button"
              onClick={() => setShowLegacyLogin(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              ← Back to sign in with Google/GitHub
            </button>
          </div>
        )}
        
        {/* Register link */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: 'var(--color-background)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          color: 'var(--color-muted)',
          textAlign: 'center',
        }}>
          <div>Don't have an account?</div>
          <Link 
            to="/register" 
            style={{ 
              color: 'var(--color-primary)', 
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Create an account
          </Link>
        </div>
      </div>
    </Page>
  );
}
