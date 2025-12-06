import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Page from '../shared/components/Page';
import { loadVehicles, type VehicleLite } from '../state/vehicles';
import { useAuth } from '../domain/auth';
import type { Product } from '../domain/auth/types';

function Home() {
  const { isAuthenticated, user, getUserProducts, hasProduct, hasFeature } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [loading, setLoading] = useState(true);
  
  const userProducts = isAuthenticated ? getUserProducts() : [];

  useEffect(() => {
    const loadData = async () => {
      if (isAuthenticated) {
        const data = await loadVehicles();
        setVehicles(data);
      }
      setLoading(false);
    };
    loadData();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <Page title="Racing Systems Analysis">
        <div className="text-center text-muted" style={{ padding: 'var(--space-6)' }}>
          Loading...
        </div>
      </Page>
    );
  }

  // Welcome screen for non-authenticated users
  if (!isAuthenticated) {
    return (
      <Page>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '1rem' }}>
          <p style={{ fontSize: '1.25rem', color: 'var(--color-muted)', marginBottom: '2.5rem' }}>
            Professional simulation software for drag racing and land speed racing
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '1rem',
            marginBottom: '2.5rem',
          }}>
            {[
              { icon: '🏁', title: 'Quarter Pro', desc: 'Drag racing ET & MPH prediction' },
              { icon: '🚀', title: 'Bonneville Pro', desc: 'Land speed top speed simulation' },
              { icon: '⚙️', title: 'Engine Pro', desc: 'Engine performance analysis' },
              { icon: '🔧', title: 'Four Link', desc: 'Suspension geometry calculator' },
            ].map(product => (
              <div 
                key={product.title}
                style={{
                  padding: '1.25rem',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{product.icon}</div>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.25rem', fontWeight: 600 }}>{product.title}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', margin: 0 }}>{product.desc}</p>
              </div>
            ))}
          </div>
          
          <Link 
            to="/login" 
            style={{
              display: 'inline-block',
              padding: '0.75rem 2rem',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '1rem',
            }}
          >
            Sign In to Get Started
          </Link>
          
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--color-muted)' }}>
            Don't have an account? Contact us for beta access.
          </p>
        </div>
      </Page>
    );
  }

  // Dashboard for authenticated users
  return (
    <Page title="Dashboard">
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Welcome Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Welcome back, {user?.displayName || 'User'}!
          </h2>
          <p style={{ color: 'var(--color-muted)' }}>
            {userProducts.length > 0 
              ? `Your products: ${userProducts.map((p: Product) => p.name).join(', ')}`
              : 'No products assigned yet. Contact support for access.'}
          </p>
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
            Quick Actions
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem' 
          }}>
            {/* ET Sim - Quarter Jr or Pro */}
            {(hasProduct('quarter_jr') || hasProduct('quarter_pro')) && (
              <Link 
                to="/et-sim" 
                className="card"
                style={{ 
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                }}
              >
                <div style={{ fontSize: '2rem' }}>🏁</div>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--color-text)' }}>ET Simulator</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                    Predict ET & MPH
                  </p>
                </div>
              </Link>
            )}

            {/* Vehicles */}
            {hasFeature('save_vehicles') && (
              <Link 
                to="/vehicles" 
                className="card"
                style={{ 
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                }}
              >
                <div style={{ fontSize: '2rem' }}>🚗</div>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--color-text)' }}>Vehicles</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                    {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} configured
                  </p>
                </div>
              </Link>
            )}

            {/* Run Log */}
            {hasFeature('save_runs') && (
              <Link 
                to="/log" 
                className="card"
                style={{ 
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                }}
              >
                <div style={{ fontSize: '2rem' }}>📝</div>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--color-text)' }}>Run Log</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                    Record actual runs
                  </p>
                </div>
              </Link>
            )}

            {/* Calculators - always available */}
            <Link 
              to="/calculators" 
              className="card"
              style={{ 
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
              }}
            >
              <div style={{ fontSize: '2rem' }}>🔢</div>
              <div>
                <h4 style={{ margin: 0, color: 'var(--color-text)' }}>Calculators</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                  Racing math tools
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Your Products */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
            Your Products
          </h3>
          
          {userProducts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p className="text-muted">No products assigned to your account yet.</p>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                Contact support to get started with RSA software.
              </p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '1rem' 
            }}>
              {userProducts.map((product: Product) => (
                <div 
                  key={product.id}
                  className="card"
                  style={{ 
                    borderLeft: `4px solid ${product.color}`,
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{product.icon}</span>
                    <h4 style={{ margin: 0, color: 'var(--color-text)' }}>{product.name}</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                    {product.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Vehicles */}
        {vehicles.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
              Your Vehicles
            </h3>
            <div className="card">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--color-muted)', fontWeight: 500 }}>Name</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)', fontWeight: 500 }}>Weight</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)', fontWeight: 500 }}>Power</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)', fontWeight: 500 }}>Tire</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.slice(0, 5).map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <Link to="/vehicles" style={{ color: 'var(--color-primary)' }}>{v.name}</Link>
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)' }}>{v.weightLb} lb</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)' }}>{v.powerHP} HP</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)' }}>{v.tireDiaIn}"</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {vehicles.length > 5 && (
                <div style={{ padding: '0.5rem', textAlign: 'center' }}>
                  <Link to="/vehicles" style={{ fontSize: '0.875rem', color: 'var(--color-primary)' }}>
                    View all {vehicles.length} vehicles →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}

export default Home;
