/**
 * Registration Page
 * Allows new users to create an account and select a subscription tier.
 */

import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../domain/auth';
import Page from '../shared/components/Page';

type SelectedTier = 'racer' | 'pro' | 'team';

interface TierInfo {
  id: SelectedTier;
  name: string;
  price: string;
  description: string;
  features: string[];
}

const tiers: TierInfo[] = [
  {
    id: 'racer',
    name: 'Racer',
    price: '$9.99/mo',
    description: 'For weekend bracket racers',
    features: ['ET Simulator', 'Weather Integration', 'Run Logbook', '5 Vehicles'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$24.99/mo',
    description: 'For serious competitors',
    features: ['Everything in Racer', 'AI Opponent Prediction', 'Optimizer Tools', 'Unlimited Vehicles'],
  },
  {
    id: 'team',
    name: 'Team',
    price: '$49.99/mo',
    description: 'For teams and professionals',
    features: ['Everything in Pro', 'Team Collaboration', 'Advanced Simulators', 'API Access'],
  },
];

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, isAuthenticated } = useAuth();
  
  // Get tier from URL params if provided
  const tierParam = searchParams.get('tier') as SelectedTier | null;
  
  const [step, setStep] = useState<'tier' | 'account' | 'complete'>(tierParam ? 'account' : 'tier');
  const [selectedTier, setSelectedTier] = useState<SelectedTier>(tierParam || 'pro');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const handleTierSelect = (tier: SelectedTier) => {
    setSelectedTier(tier);
    setStep('account');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email || !password || !name) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await register(email, password, name, selectedTier);
      if (success) {
        setStep('complete');
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Tier Selection
  if (step === 'tier') {
    return (
      <Page title="Get Started">
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '12px' }}>Choose Your Plan</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>
              Start with a 14-day free trial. No credit card required.
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
          }}>
            {tiers.map(tier => (
              <div
                key={tier.id}
                onClick={() => handleTierSelect(tier.id)}
                style={{
                  padding: '28px',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: '12px',
                  border: selectedTier === tier.id 
                    ? '2px solid var(--color-accent)' 
                    : '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                {tier.id === 'pro' && (
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '4px 12px',
                    backgroundColor: 'var(--color-accent)',
                    color: 'white',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    RECOMMENDED
                  </div>
                )}
                
                <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>{tier.name}</h3>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '8px' }}>
                  {tier.price}
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                  {tier.description}
                </p>
                
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {tier.features.map((feature, i) => (
                    <li key={i} style={{ 
                      padding: '6px 0', 
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <span style={{ color: '#22c55e' }}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <button
                  style={{
                    width: '100%',
                    marginTop: '20px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: tier.id === 'pro' ? 'var(--color-accent)' : 'var(--color-bg)',
                    color: tier.id === 'pro' ? 'white' : 'var(--color-text)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Select {tier.name}
                </button>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--color-text-muted)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--color-accent)' }}>Sign in</Link>
          </p>
        </div>
      </Page>
    );
  }

  // Step 2: Account Creation
  if (step === 'account') {
    const tier = tiers.find(t => t.id === selectedTier)!;
    
    return (
      <Page title="Create Account">
        <div style={{ maxWidth: '500px', margin: '0 auto', padding: '40px 20px' }}>
          {/* Selected tier indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '8px',
            marginBottom: '24px',
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Selected Plan</div>
              <div style={{ fontWeight: 600 }}>{tier.name} - {tier.price}</div>
            </div>
            <button
              onClick={() => setStep('tier')}
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'transparent',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              Change
            </button>
          </div>

          <h2 style={{ marginBottom: '24px' }}>Create Your Account</h2>

          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                padding: '12px',
                marginBottom: '16px',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                borderRadius: '8px',
                fontSize: '0.9rem',
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
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
                padding: '14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#22c55e',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: isLoading ? 'wait' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Creating Account...' : 'Start Free Trial'}
            </button>

            <p style={{ 
              textAlign: 'center', 
              marginTop: '16px', 
              fontSize: '0.8rem', 
              color: 'var(--color-text-muted)',
            }}>
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--color-text-muted)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--color-accent)' }}>Sign in</Link>
          </p>
        </div>
      </Page>
    );
  }

  // Step 3: Complete
  return (
    <Page title="Welcome!">
      <div style={{ 
        maxWidth: '500px', 
        margin: '0 auto', 
        padding: '60px 20px',
        textAlign: 'center',
      }}>
        <div style={{ 
          fontSize: '4rem', 
          marginBottom: '24px',
        }}>
          🎉
        </div>
        
        <h1 style={{ fontSize: '2rem', marginBottom: '16px' }}>
          Welcome to RSA!
        </h1>
        
        <p style={{ 
          fontSize: '1.1rem', 
          color: 'var(--color-text-muted)',
          marginBottom: '32px',
          lineHeight: 1.6,
        }}>
          Your {tiers.find(t => t.id === selectedTier)?.name} trial is now active. 
          Let's get you set up with your first vehicle!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link
            to="/vehicles"
            style={{
              padding: '16px 32px',
              backgroundColor: '#22c55e',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '1.1rem',
            }}
          >
            Create Your First Vehicle
          </Link>
          
          <Link
            to="/"
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            Go to Dashboard
          </Link>
        </div>

        <div style={{
          marginTop: '48px',
          padding: '20px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '12px',
          textAlign: 'left',
        }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Quick Start Guide</h3>
          <ol style={{ 
            margin: 0, 
            paddingLeft: '20px', 
            fontSize: '0.9rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.8,
          }}>
            <li>Create a vehicle with your car's specs</li>
            <li>Run your first ET simulation</li>
            <li>Log actual runs to compare predictions</li>
            <li>Use the optimizer to find your best setup</li>
          </ol>
        </div>
      </div>
    </Page>
  );
}
