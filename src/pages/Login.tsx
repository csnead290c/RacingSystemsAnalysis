/**
 * Login Page
 * 
 * Legacy email/password login.
 */

import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../domain/auth';
import { authApi } from '../services/api';
import Page from '../shared/components/Page';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, error: authError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Redirect if already logged in
  if (isAuthenticated) {
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

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotMessage(null);
    setForgotLoading(true);
    try {
      const res = await authApi.requestPasswordReset(forgotEmail);
      setForgotMessage(res.message);
    } catch (err: any) {
      setForgotError(err.message || 'Failed to send reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Forgot Password view ──
  if (showForgot) {
    return (
      <Page title="Forgot Password">
        <div style={{
          maxWidth: '400px',
          margin: '2rem auto',
          padding: '2rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Forgot Password</h2>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
            Enter your email and we'll send you a link to reset your password.
          </p>

          {forgotMessage && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#dcfce7',
              color: '#166534',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
            }}>
              {forgotMessage}
            </div>
          )}

          {forgotError && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
            }}>
              {forgotError}
            </div>
          )}

          {!forgotMessage && (
            <form onSubmit={handleForgotSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
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
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: forgotLoading ? 'not-allowed' : 'pointer',
                  opacity: forgotLoading ? 0.7 : 1,
                }}
              >
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
            <button
              type="button"
              onClick={() => { setShowForgot(false); setForgotMessage(null); setForgotError(null); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              ← Back to Sign In
            </button>
          </div>
        </div>
      </Page>
    );
  }

  // ── Normal Login view ──
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

        {/* Forgot password */}
        <div style={{ textAlign: 'right', marginTop: '0.75rem' }}>
          <button
            type="button"
            onClick={() => { setShowForgot(true); setForgotEmail(email); }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              padding: 0,
            }}
          >
            Forgot password?
          </button>
        </div>
        
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
