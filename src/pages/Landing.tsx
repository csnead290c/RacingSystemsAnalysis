import { Link } from 'react-router-dom';
import { useAuth, useClerkRSA } from '../domain/auth';

/**
 * Public landing page for non-authenticated users.
 * Designed to convert visitors into subscribers.
 */
export default function Landing() {
  const { isAuthenticated } = useAuth();
  const { isClerkSignedIn } = useClerkRSA();
  
  // Determine where "Get Started" should link to
  const getStartedLink = (isAuthenticated || isClerkSignedIn) ? '/account' : '/register';

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text)',
    }}>
      {/* Hero Section */}
      <section style={{
        padding: '80px 20px 60px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(220, 38, 38, 0.08) 0%, transparent 100%)',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '16px',
            marginBottom: '24px',
          }}>
            <img src="/rsa-logo.png" alt="RSA" style={{ height: '64px' }} />
          </div>
          
          <h2 style={{ 
            fontSize: '1.75rem', 
            fontWeight: 600, 
            marginBottom: '16px',
            color: 'var(--color-text)',
          }}>
            Turn On More Win Lights!
          </h2>
          
          <p style={{ 
            fontSize: '1.25rem', 
            color: 'var(--color-text-muted)', 
            maxWidth: '600px',
            margin: '0 auto 32px',
            lineHeight: 1.6,
          }}>
            The modern drag racing platform that combines physics-based simulation 
            with real-world data to help you be <strong>deadly consistent</strong>.
          </p>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link 
              to={getStartedLink}
              style={{
                padding: '16px 32px',
                backgroundColor: '#dc2626',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '1.1rem',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ 
        padding: '80px 20px',
        backgroundColor: 'var(--color-surface)',
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ 
            textAlign: 'center', 
            fontSize: '1.75rem', 
            marginBottom: '16px',
            fontWeight: 700,
          }}>
            Everything You Need to Win
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            {[
              {
                icon: '🏁',
                title: 'Quarter Jr/Pro',
                desc: 'Physics-based simulation predicts your ET and MPH with ±0.01s accuracy. See exactly why your time changed.',
                tag: 'Core',
              },
              {
                icon: '🔧',
                title: 'Engine Jr/Pro',
                desc: 'Build and analyze engine dyno curves. Compare setups, estimate peak HP, and optimize your powerplant.',
                tag: 'Core',
              },
              {
                icon: '🚀',
                title: 'Coming Soon!',
                desc: 'All other tools and applications from RSA that you have come to rely on are coming soon! Clutch Jr/Pro, Fourlink, Density, and more is on the horizon!',
                tag: 'Core',
              },
            ].map(feature => (
              <div 
                key={feature.title}
                style={{
                  padding: '24px',
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  position: 'relative',
                }}
              >
                {feature.tag === 'Pro' && (
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    padding: '4px 8px',
                    backgroundColor: 'rgba(220, 38, 38, 0.2)',
                    color: '#dc2626',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                  }}>
                    PRO
                  </span>
                )}
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{feature.icon}</div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', fontWeight: 600 }}>{feature.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section style={{ padding: '80px 20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '16px', fontWeight: 700 }}>
            Simple, Transparent Pricing
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '48px' }}>
            Start free, upgrade when you're ready. No hidden fees.
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px',
            maxWidth: '800px',
            margin: '0 auto',
          }}>
            {/* Racer Tier */}
            <div style={{
              padding: '32px 24px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '16px',
              border: '1px solid var(--color-border)',
            }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Racer</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '8px' }}>
                $9.99<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>/mo</span>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
                For weekend bracket racers
              </p>
              <ul style={{ 
                textAlign: 'left', 
                margin: '0 0 24px', 
                padding: 0, 
                listStyle: 'none',
                fontSize: '0.9rem',
              }}>
                {['Quarter Jr', 'Engine Jr', 'Weather Integration', 'Racing Calculators', '5 Vehicles'].map(f => (
                  <li key={f} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                    ✓ {f}
                  </li>
                ))}
              </ul>
              <Link
                to={getStartedLink}
                style={{
                  display: 'block',
                  padding: '12px 24px',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Get Started
              </Link>
            </div>
            
            {/* Pro Tier */}
            <div style={{
              padding: '32px 24px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '16px',
              border: '2px solid #dc2626',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '4px 16px',
                backgroundColor: '#dc2626',
                color: 'white',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}>
                MOST POPULAR
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Pro</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '8px' }}>
                $24.99<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>/mo</span>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
                For serious competitors
              </p>
              <ul style={{ 
                textAlign: 'left', 
                margin: '0 0 24px', 
                padding: 0, 
                listStyle: 'none',
                fontSize: '0.9rem',
              }}>
                {['Everything in Racer', 'Quarter Pro', 'Engine Pro', 'Optimizer Tools', 'Unlimited Vehicles'].map(f => (
                  <li key={f} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                    ✓ {f}
                  </li>
                ))}
              </ul>
              <Link
                to={getStartedLink}
                style={{
                  display: 'block',
                  padding: '12px 24px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Get Started
              </Link>
            </div>
          </div>
          
          <p style={{ marginTop: '24px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            Save 17% with annual billing • <Link to="/pricing" style={{ color: '#dc2626' }}>See all plans</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
