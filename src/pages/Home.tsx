import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Page from '../shared/components/Page';
import { loadVehicles, type VehicleLite } from '../state/vehicles';
import { useAuth, useClerkRSA } from '../domain/auth';
import { canAccessEtSim, canAccessRunLogging, canAccessRaceTools, canAccessVehicles } from '../domain/config/guards';
import Landing from './Landing';

function Home() {
  const { isAuthenticated, user, hasFeature } = useAuth();
  const { isClerkSignedIn, rsaUser } = useClerkRSA();
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Check if user is logged in (either legacy or Clerk)
  const isLoggedIn = isAuthenticated || isClerkSignedIn;
  const activeUser = isClerkSignedIn ? rsaUser : user;

  useEffect(() => {
    const loadData = async () => {
      if (isLoggedIn) {
        const data = await loadVehicles();
        setVehicles(data);
      }
      setLoading(false);
    };
    loadData();
  }, [isLoggedIn]);

  if (loading) {
    return (
      <Page title="Racing Systems Analysis">
        <div className="text-center text-muted" style={{ padding: 'var(--space-6)' }}>
          Loading...
        </div>
      </Page>
    );
  }

  // Show compelling landing page for non-authenticated users
  if (!isLoggedIn) {
    return <Landing />;
  }

  // Dashboard for authenticated users
  return (
    <Page title="Dashboard">
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Welcome Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Welcome back, {activeUser?.displayName || 'User'}!
          </h2>
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
            {/* ET Sim access (basic+ plans) */}
            {canAccessEtSim({ hasFeature }) && (
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
            {canAccessVehicles({ hasFeature }) && (
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

            {/* Run History (basic+ plans) */}
            {canAccessRunLogging({ hasFeature }) && (
              <Link 
                to="/history" 
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
                  <h4 style={{ margin: 0, color: 'var(--color-text)' }}>Run History</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                    Log & analyze runs
                  </p>
                </div>
              </Link>
            )}

            {/* Race Day Dashboard (basic+ plans) */}
            {canAccessRaceTools({ hasFeature }) && (
              <Link 
                to="/race-day" 
                className="card"
                style={{ 
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))',
                }}
              >
                <div style={{ fontSize: '2rem' }}>🏁</div>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--color-text)' }}>Race Day Dashboard</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                    Live dial-in & round tracking
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
