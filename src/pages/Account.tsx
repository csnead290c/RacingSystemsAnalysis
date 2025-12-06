/**
 * Account / User Profile Page
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../domain/auth';
import { usePreferences } from '../shared/state/preferences';
import type { Product } from '../domain/auth/types';
import Page from '../shared/components/Page';

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
  
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [theme, setTheme] = useState(user?.preferences?.theme || 'system');
  const [units, setUnits] = useState(user?.preferences?.units || 'imperial');
  
  const role = getUserRole();
  const products = getUserProducts();
  const { productMode, setProductMode } = usePreferences();
  
  // Check if user has Pro access (can switch between Pro and Jr)
  const hasProAccess = products.some((p: Product) => p.id === 'quarter_pro' || p.id === 'bonneville_pro');

  // Redirect if not logged in
  if (!isAuthenticated || !user) {
    navigate('/login', { replace: true });
    return null;
  }

  const handleSave = () => {
    updateUser(user.id, {
      displayName,
      preferences: {
        ...user.preferences,
        theme: theme as 'light' | 'dark' | 'system',
        units: units as 'imperial' | 'metric',
      },
    });
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Page title="My Account">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Profile Header */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
        }}>
          {/* Avatar */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: role?.color || 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            color: 'white',
            fontWeight: 600,
          }}>
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          
          <div style={{ flex: 1 }}>
            {isEditing ? (
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  padding: '0.25rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                  width: '100%',
                  maxWidth: '300px',
                }}
              />
            ) : (
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{user.displayName}</h2>
            )}
            <div style={{ color: 'var(--color-muted)', marginTop: '0.25rem' }}>
              {user.email}
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <span style={{
                display: 'inline-block',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                backgroundColor: role?.color || '#6b7280',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}>
                {role?.name || 'Unknown Role'}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {isEditing ? (
              <>
                <button
                  onClick={() => { setIsEditing(false); setDisplayName(user.displayName); }}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Products Access */}
          <div style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>
              Your Products
            </h3>
            {products.length === 0 ? (
              <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                No products available. Contact support to upgrade your account.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {products.map((product: Product) => (
                  <div
                    key={product.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      backgroundColor: 'var(--color-background)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: `4px solid ${product.color}`,
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{product.icon}</span>
                    <div>
                      <div style={{ fontWeight: 500 }}>{product.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                        {product.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preferences */}
          <div style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>
              Preferences
            </h3>
            
            {/* Product Mode Selector - only for Pro users */}
            {hasProAccess && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: '0.5rem',
                }}>
                  Interface Mode
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setProductMode('pro')}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: productMode === 'pro' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      backgroundColor: productMode === 'pro' ? 'var(--color-primary-light, #e0f2fe)' : 'var(--color-background)',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>🏎️ Pro Mode</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      Full vehicle editor with HP curves, advanced settings
                    </div>
                  </button>
                  <button
                    onClick={() => setProductMode('jr')}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: productMode === 'jr' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      backgroundColor: productMode === 'jr' ? 'var(--color-primary-light, #e0f2fe)' : 'var(--color-background)',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>🏁 Jr Mode</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      Simplified interface, peak HP only
                    </div>
                  </button>
                </div>
              </div>
            )}
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginBottom: '0.5rem',
              }}>
                Theme
              </label>
              <select
                value={theme}
                onChange={e => {
                  setTheme(e.target.value as 'light' | 'dark' | 'system');
                  if (!isEditing) {
                    updateUser(user.id, {
                      preferences: { ...user.preferences, theme: e.target.value as any },
                    });
                  }
                }}
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
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginBottom: '0.5rem',
              }}>
                Units
              </label>
              <select
                value={units}
                onChange={e => {
                  setUnits(e.target.value as 'imperial' | 'metric');
                  if (!isEditing) {
                    updateUser(user.id, {
                      preferences: { ...user.preferences, units: e.target.value as any },
                    });
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
              >
                <option value="imperial">Imperial (lb, in, mph)</option>
                <option value="metric">Metric (kg, mm, km/h)</option>
              </select>
            </div>
          </div>

          {/* Account Info */}
          <div style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>
              Account Info
            </h3>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Status:</strong>{' '}
                <span style={{
                  color: user.status === 'active' ? '#16a34a' : '#dc2626',
                }}>
                  {user.status}
                </span>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Member since:</strong>{' '}
                {new Date(user.createdAt).toLocaleDateString()}
              </div>
              {user.lastLoginAt && (
                <div>
                  <strong>Last login:</strong>{' '}
                  {new Date(user.lastLoginAt).toLocaleString()}
                </div>
              )}
            </div>
            
            {user.subscription && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: 'var(--color-background)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                  Subscription: {user.subscription.plan}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                  {user.subscription.endDate 
                    ? `Expires: ${new Date(user.subscription.endDate).toLocaleDateString()}`
                    : 'Lifetime access'
                  }
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>
              Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={handleLogout}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #dc2626',
                  backgroundColor: 'transparent',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
