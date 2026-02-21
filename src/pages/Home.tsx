import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Page from '../shared/components/Page';
import { loadVehicles, type VehicleLite } from '../state/vehicles';
import { useAuth, useClerkRSA } from '../domain/auth';
import { canAccessEtSim, canAccessRunLogging, canAccessRaceTools, canAccessVehicles } from '../domain/config/guards';
import { useCapabilities } from '../domain/config/useCapabilities';
import { getQuarterProgramName, getEngineProgramName } from '../domain/ui/programDisplayNames';
import { formatHp, formatLb, formatIn } from '../shared/format/formatNumber';
import { isInternalUser, buildVisibilityContext } from '../domain/ui/publicSurface';
import Landing from './Landing';

function Home() {
  const { isAuthenticated, user, hasFeature } = useAuth();
  const { isClerkSignedIn, rsaUser } = useClerkRSA();
  const { can } = useCapabilities();
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Check if user is logged in (either legacy or Clerk)
  const isLoggedIn = isAuthenticated || isClerkSignedIn;
  const activeUser = isClerkSignedIn ? rsaUser : user;
  const isDevOrOwner = isInternalUser(buildVisibilityContext(user?.roleId));

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

        {/* Primary CTAs — Simulators */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--color-text)' }}>
            Simulators
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
            {/* Quarter — primary CTA */}
            {canAccessEtSim({ hasFeature }) && (
              <Link
                to="/et-sim"
                className="card"
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem 1rem',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.08))',
                  borderLeft: '3px solid var(--color-primary)',
                }}
              >
                <div style={{ fontSize: '2rem' }}>🏁</div>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--color-text)', fontSize: '1rem' }}>{getQuarterProgramName(can)}</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                    Predict ET & MPH
                  </p>
                </div>
              </Link>
            )}

            {/* Engine — primary CTA */}
            <Link
              to="/engine-sim"
              className="card"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1.25rem 1rem',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(249, 115, 22, 0.08))',
                borderLeft: '3px solid #ef4444',
              }}
            >
              <div style={{ fontSize: '2rem' }}>�</div>
              <div>
                <h4 style={{ margin: 0, color: 'var(--color-text)', fontSize: '1rem' }}>{getEngineProgramName(can)}</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                  Dyno curve & engine analysis
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Secondary — Tools */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--color-muted)' }}>
            Tools
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {/* Vehicles */}
            {canAccessVehicles({ hasFeature }) && (
              <Link
                to="/vehicles"
                className="card"
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                }}
              >
                <div style={{ fontSize: '1.5rem' }}>�</div>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--color-text)', fontSize: '0.9rem' }}>Vehicles</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                    {vehicles.length} configured
                  </p>
                </div>
              </Link>
            )}

            {/* Calculators */}
            <Link
              to="/calculators"
              className="card"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
              }}
            >
              <div style={{ fontSize: '1.5rem' }}>🔢</div>
              <div>
                <h4 style={{ margin: 0, color: 'var(--color-text)', fontSize: '0.9rem' }}>Calculators</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                  Racing math tools
                </p>
              </div>
            </Link>

            {/* Run History — dev/owner only */}
            {canAccessRunLogging({ hasFeature }) && isDevOrOwner && (
              <Link
                to="/history"
                className="card"
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                }}
              >
                <div style={{ fontSize: '1.5rem' }}>📝</div>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--color-text)', fontSize: '0.9rem' }}>Run History</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                    Log & analyze runs
                  </p>
                </div>
              </Link>
            )}

            {/* Race Day — dev/owner only */}
            {canAccessRaceTools({ hasFeature }) && isDevOrOwner && (
              <Link
                to="/race-day"
                className="card"
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                }}
              >
                <div style={{ fontSize: '1.5rem' }}>🏁</div>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--color-text)', fontSize: '0.9rem' }}>Race Day</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                    Dial-in & rounds
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Recent Vehicles */}
        {vehicles.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
              Your Vehicles
            </h3>
            <div className="card" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '320px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--color-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>Name</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>Weight</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>Power</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>Tire</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.slice(0, 5).map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <Link to="/vehicles" style={{ color: 'var(--color-primary)' }}>{v.name}</Link>
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)' }}>{formatLb(v.weightLb)} lb</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)' }}>{formatHp(v.powerHP)} HP</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)' }}>{formatIn(v.tireDiaIn)}"</td>
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
