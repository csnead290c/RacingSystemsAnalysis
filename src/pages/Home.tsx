import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Page from '../shared/components/Page';
import { loadVehicles, type VehicleLite } from '../state/vehicles';
import { listEngines, type EngineListItem } from '../state/engines';
import { useAuth, useClerkRSA } from '../domain/auth';
import { canAccessEtSim } from '../domain/config/guards';
import { useCapabilities } from '../domain/config/useCapabilities';
import { getQuarterProgramName, getEngineProgramName } from '../domain/ui/programDisplayNames';
import { formatHp, formatLb, formatIn } from '../shared/format/formatNumber';
import Landing from './Landing';

function Home() {
  const { isAuthenticated, user, hasFeature } = useAuth();
  const { isClerkSignedIn, rsaUser } = useClerkRSA();
  const { can } = useCapabilities();
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [engines, setEngines] = useState<EngineListItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Check if user is logged in (either legacy or Clerk)
  const isLoggedIn = isAuthenticated || isClerkSignedIn;
  const activeUser = isClerkSignedIn ? rsaUser : user;

  useEffect(() => {
    const loadData = async () => {
      if (isLoggedIn) {
        const [vData, eData] = await Promise.all([loadVehicles(), listEngines()]);
        setVehicles(vData);
        setEngines(eData);
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

  const engineProgramName = getEngineProgramName(can);

  // Dashboard for authenticated users
  return (
    <Page title="">
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
                  background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.08), rgba(239, 68, 68, 0.06))',
                  borderLeft: '3px solid #dc2626',
                }}
              >
                <div style={{ fontSize: '2rem' }}>🏁</div>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--color-text)', fontSize: '1rem' }}>{getQuarterProgramName(can)}</h4>
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
              <div style={{ fontSize: '2rem' }}>🔧</div>
              <div>
                <h4 style={{ margin: 0, color: 'var(--color-text)', fontSize: '1rem' }}>{engineProgramName}</h4>
              </div>
            </Link>
          </div>
        </div>

        {/* Your Vehicles */}
        {vehicles.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
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
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>Last Run</th>
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
                      <td style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                        {v.lastSimQuarter
                          ? `${v.lastSimQuarter.et_s.toFixed(2)} @ ${v.lastSimQuarter.mph.toFixed(1)}`
                          : '—'}
                      </td>
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

        {/* Your Engines */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
            Your Engines
          </h3>
          {engines.length > 0 ? (
            <div className="card" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '320px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--color-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>Name</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>Peak HP</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>RPM</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>CID</th>
                  </tr>
                </thead>
                <tbody>
                  {engines.slice(0, 5).map((e) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <Link to="/engine-sim" style={{ color: 'var(--color-primary)' }}>{e.name}</Link>
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)' }}>{formatHp(e.peakHP)}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)' }}>{e.rpmAtPeakHP.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)' }}>{e.displacementCID ? Math.round(e.displacementCID) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {engines.length > 5 && (
                <div style={{ padding: '0.5rem', textAlign: 'center' }}>
                  <Link to="/engine-sim" style={{ fontSize: '0.875rem', color: 'var(--color-primary)' }}>
                    View all {engines.length} engines →
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div
              className="card"
              style={{
                padding: '1.5rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div style={{ fontSize: '2rem' }}>🔧</div>
              <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                Save engines to see them here
              </p>
              <Link
                to="/engine-sim"
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 1.25rem',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                Go to {engineProgramName}
              </Link>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}

export default Home;
