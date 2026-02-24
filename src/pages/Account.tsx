/**
 * Account / User Profile Page
 * Supports both Clerk OAuth and legacy authentication.
 * 
 * Public surface: Quarter / Engine / Vehicles / Calcs (+ About).
 * Internal modules (Land Speed, Team, Optimizer) hidden for non-internal users.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../domain/auth';
import { usePreferences } from '../shared/state/preferences';
import { useSubscription } from '../domain/config/useSubscription';
import { openCustomerPortal, getSubscriptionStatus } from '../domain/payments';
import { DEFAULT_PRODUCTS, DEFAULT_ROLES, type Product, type Role } from '../domain/auth/types';
import Page from '../shared/components/Page';

// TODO: Units support — wire imperial/metric conversion throughout the app.
// When implemented, re-enable the Units selector in the Preferences section below.
// See: src/shared/state/preferences.ts for the preference store.

export default function Account() {
  const navigate = useNavigate();
  const { 
    user, 
    isAuthenticated, 
    logout, 
    getUserRole, 
    getUserProducts,
    updateUser,
  } = useAuth();
  // Fetch subscription status from backend API
  const [dbSubscription, setDbSubscription] = useState<{
    plan: string | null;
    status: string;
    periodEnd: string | null;
    hasStripeCustomer: boolean;
    products: string[];
  } | null>(null);
  
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const status = await getSubscriptionStatus();
        setDbSubscription(status);
      } catch (err) {
        // Silently fail — subscription info is optional for page render
      }
    };
    
    if (isAuthenticated) {
      fetchSubscription();
    }
  }, [isAuthenticated]);
  
  const subscription = dbSubscription ? {
    plan: dbSubscription.plan as 'racer' | 'pro' | 'team' | null,
    status: dbSubscription.status as 'active' | 'trialing' | 'past_due' | 'canceled' | 'none',
  } : { plan: null, status: 'none' as const };
  
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [theme, setTheme] = useState(user?.preferences?.theme || 'system');
  
  const authRole = getUserRole();
  const authProducts = getUserProducts();
  const { productMode, setProductMode } = usePreferences();
  const { tier, tierInfo, vehicleLimit, features } = useSubscription();
  
  // Use products from database if available, otherwise fall back to auth products
  const dbProductIds = dbSubscription?.products || [];
  const products: Product[] = dbProductIds.length > 0 
    ? dbProductIds.map((id: string) => DEFAULT_PRODUCTS.find(p => p.id === id)).filter((p): p is Product => p !== undefined)
    : authProducts;
  
  // Derive role from subscription if available
  const role: Role | null = (() => {
    if (dbSubscription?.plan && dbSubscription.status === 'active') {
      if (dbSubscription.plan === 'pro' || dbSubscription.plan === 'team') {
        return DEFAULT_ROLES.find(r => r.id === 'subscriber_pro') || null;
      } else if (dbSubscription.plan === 'racer') {
        return DEFAULT_ROLES.find(r => r.id === 'subscriber_basic') || null;
      }
    }
    return authRole;
  })();
  
  // Check if user has Pro access (can switch between Pro and Jr)
  const hasProAccess = dbProductIds.includes('quarter_pro') || dbProductIds.includes('bonneville_pro') || 
    authProducts.some((p: Product) => p.id === 'quarter_pro' || p.id === 'bonneville_pro');

  // Internal users see extra debug info (owner, beta, team tiers)
  const isInternal = tier === 'owner' || tier === 'beta' || tier === 'team';

  // Redirect if not logged in
  if (!isAuthenticated || !user) {
    navigate('/login', { replace: true });
    return null;
  }

  const handleSave = () => {
    if (!user) return;
    updateUser(user.id, {
      displayName,
      preferences: {
        ...user.preferences,
        theme: theme as 'light' | 'dark' | 'system',
      },
    });
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Public feature access items (Quarter, Engine, Vehicles, Calcs)
  const featureItems: { label: string; available: boolean; color: string }[] = [
    { label: 'Quarter Sim', available: true, color: '#dc2626' },
    { label: 'Engine Sim', available: true, color: '#ef4444' },
    { label: 'Vehicle Manager', available: true, color: '#3b82f6' },
    { label: 'Calculators', available: true, color: '#8b5cf6' },
    // Pro-only features
    { label: 'Pro Vehicle Editor', available: features.quarterProFields, color: '#3b82f6' },
    { label: 'Throttle Stop', available: features.throttleStop, color: '#3b82f6' },
    { label: 'Live Weather', available: features.liveWeather, color: '#22c55e' },
    { label: 'Gear Optimizer', available: features.gearOptimizer, color: '#8b5cf6' },
  ];

  // Internal-only features (hidden for public users)
  if (isInternal) {
    featureItems.push(
      { label: 'Land Speed', available: features.trackBonneville, color: '#f59e0b' },
      { label: 'Team Management', available: features.teamManagement, color: '#8b5cf6' },
    );
  }

  return (
    <Page title="My Account">
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        
        {/* ── Section 1: Profile ── */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Avatar */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: role?.color || 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              color: 'white',
              fontWeight: 600,
              flexShrink: 0,
            }}>
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              {isEditing ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  data-testid="display-name-input"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text)',
                    width: '100%',
                    maxWidth: '280px',
                  }}
                />
              ) : (
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{user.displayName}</h2>
              )}
              <div style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginTop: '0.125rem' }}>
                {user.email}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              {isEditing ? (
                <>
                  <button
                    onClick={() => { setIsEditing(false); setDisplayName(user.displayName); }}
                    className="btn btn-secondary"
                    style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn"
                    style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    Save
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-secondary"
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
          
          {/* Member info */}
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
            Member since {new Date(user.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* ── Section 2: Current Plan ── */}
        <div className="card" style={{
          padding: '1.5rem',
          marginBottom: '1rem',
          borderLeft: `4px solid ${tierInfo.color}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                <span style={{
                  padding: '0.25rem 0.625rem',
                  borderRadius: '9999px',
                  backgroundColor: tierInfo.color,
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}>
                  {tierInfo.name}
                </span>
                {subscription.plan && subscription.status === 'active' && (
                  <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 500 }}>Active</span>
                )}
              </div>
              <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                {tierInfo.description}
              </p>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                {vehicleLimit === Infinity ? 'Unlimited' : vehicleLimit} vehicles
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {subscription.plan && (
                <button
                  onClick={() => openCustomerPortal()}
                  className="btn btn-secondary"
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                >
                  Manage
                </button>
              )}
              {tier !== 'pro' && tier !== 'team' && tier !== 'beta' && tier !== 'owner' && (
                <button
                  onClick={() => navigate('/pricing')}
                  className="btn"
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                >
                  Upgrade
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 3: Feature Access ── */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 600 }}>
            Feature Access
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {featureItems.map(item => (
              <span
                key={item.label}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.7rem',
                  borderRadius: '4px',
                  fontWeight: 500,
                  backgroundColor: item.available ? `${item.color}18` : 'var(--color-surface)',
                  color: item.available ? item.color : 'var(--color-muted)',
                  border: item.available ? 'none' : '1px solid var(--color-border)',
                  opacity: item.available ? 1 : 0.6,
                }}
              >
                {item.available ? '✓' : '—'} {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Section 4: Preferences ── */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 600 }}>
            Preferences
          </h3>
          
          {/* Product Mode Selector - only for Pro users */}
          {hasProAccess && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.375rem' }}>
                Interface Mode
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setProductMode('pro')}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    borderRadius: 'var(--radius-sm)',
                    border: productMode === 'pro' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    backgroundColor: productMode === 'pro' ? 'var(--color-primary-light, #e0f2fe)' : 'var(--color-background)',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Pro Mode</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
                    Full editor, HP curves, advanced settings
                  </div>
                </button>
                <button
                  onClick={() => setProductMode('jr')}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    borderRadius: 'var(--radius-sm)',
                    border: productMode === 'jr' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    backgroundColor: productMode === 'jr' ? 'var(--color-primary-light, #e0f2fe)' : 'var(--color-background)',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Jr Mode</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
                    Simplified, peak HP only
                  </div>
                </button>
              </div>
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.375rem' }}>
              Theme
            </label>
            <select
              value={theme}
              onChange={e => {
                setTheme(e.target.value as 'light' | 'dark' | 'system');
                if (!isEditing && user) {
                  updateUser(user.id, {
                    preferences: { ...user.preferences, theme: e.target.value as any },
                  });
                }
              }}
              data-testid="theme-select"
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          
          {/* Units selector hidden — not yet wired. See TODO at top of file. */}
        </div>

        {/* ── Section 5: Actions ── */}
        <div className="card" style={{ padding: '1.5rem' }}>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.625rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #dc2626',
                backgroundColor: 'transparent',
                color: '#dc2626',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.85rem',
              }}
            >
              Sign Out
            </button>
        </div>

        {/* ── Internal debug info (owner/beta/team only) ── */}
        {isInternal && (
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ fontSize: '0.75rem', color: 'var(--color-muted)', cursor: 'pointer' }}>
              Debug Info
            </summary>
            <div className="card" style={{ padding: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              <div>Tier: {tier}</div>
              <div>Role: {role?.id || 'none'}</div>
              <div>Products: {products.map(p => p.id).join(', ') || 'none'}</div>
              <div>DB plan: {dbSubscription?.plan || 'none'} ({dbSubscription?.status || 'none'})</div>
              <div>Auth status: {user.status}</div>
            </div>
          </details>
        )}
      </div>
    </Page>
  );
}
