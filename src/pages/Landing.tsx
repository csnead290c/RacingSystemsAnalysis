import { Link } from 'react-router-dom';
import { useState } from 'react';

/**
 * Public landing page for non-authenticated users.
 * Designed to convert visitors into subscribers.
 */
export default function Landing() {
  const [showDemo, setShowDemo] = useState(false);

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
        background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%)',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '16px',
            marginBottom: '24px',
          }}>
            <img src="/rsa-icon.png" alt="RSA" style={{ height: '64px' }} />
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 800, 
              margin: 0,
              background: 'linear-gradient(135deg, #3b82f6, #22c55e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Racing Systems Analysis
            </h1>
          </div>
          
          <h2 style={{ 
            fontSize: '1.75rem', 
            fontWeight: 600, 
            marginBottom: '16px',
            color: 'var(--color-text)',
          }}>
            Turn On More Win Lights
          </h2>
          
          <p style={{ 
            fontSize: '1.25rem', 
            color: 'var(--color-text-muted)', 
            maxWidth: '600px',
            margin: '0 auto 32px',
            lineHeight: 1.6,
          }}>
            The modern drag racing platform that combines physics-based simulation 
            with AI-powered predictions to help you be <strong>deadly consistent</strong>.
          </p>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link 
              to="/register"
              style={{
                padding: '16px 32px',
                backgroundColor: '#22c55e',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '1.1rem',
                boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              Start Free Trial
            </Link>
            <button
              onClick={() => setShowDemo(true)}
              style={{
                padding: '16px 32px',
                backgroundColor: 'transparent',
                color: 'var(--color-accent)',
                border: '2px solid var(--color-accent)',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '1.1rem',
                cursor: 'pointer',
              }}
            >
              Watch Demo
            </button>
          </div>
          
          <p style={{ 
            marginTop: '16px', 
            fontSize: '0.9rem', 
            color: 'var(--color-text-muted)',
          }}>
            No credit card required • 14-day free trial
          </p>
        </div>
      </section>

      {/* Social Proof */}
      <section style={{
        padding: '40px 20px',
        backgroundColor: 'var(--color-surface)',
        textAlign: 'center',
      }}>
        <div style={{ 
          maxWidth: '800px', 
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
          gap: '48px',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent)' }}>10,000+</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Runs Simulated</div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>±0.01s</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Prediction Accuracy</div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>500+</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Active Racers</div>
          </div>
        </div>
      </section>

      {/* Problem/Solution */}
      <section style={{ padding: '80px 20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ 
            textAlign: 'center', 
            fontSize: '1.75rem', 
            marginBottom: '48px',
            fontWeight: 700,
          }}>
            Stop Guessing. Start Winning.
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            {/* Problem */}
            <div style={{
              padding: '24px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}>
              <h3 style={{ color: '#ef4444', marginBottom: '16px', fontSize: '1.1rem' }}>
                ❌ The Old Way
              </h3>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '20px', 
                color: 'var(--color-text-muted)',
                lineHeight: 1.8,
              }}>
                <li>Scribbling in notebooks at the track</li>
                <li>Guessing dial-ins based on "feel"</li>
                <li>No idea why your ET changed</li>
                <li>Losing rounds to weather changes</li>
                <li>Clunky Windows software from the 90s</li>
              </ul>
            </div>
            
            {/* Solution */}
            <div style={{
              padding: '24px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(34, 197, 94, 0.2)',
            }}>
              <h3 style={{ color: '#22c55e', marginBottom: '16px', fontSize: '1.1rem' }}>
                ✅ The RSA Way
              </h3>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '20px', 
                color: 'var(--color-text-muted)',
                lineHeight: 1.8,
              }}>
                <li>Digital logbook on any device</li>
                <li>Physics-based ET predictions</li>
                <li>Transparent "why did my ET change?"</li>
                <li>Live weather integration</li>
                <li>Modern, clean interface</li>
              </ul>
            </div>
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
          <p style={{ 
            textAlign: 'center', 
            color: 'var(--color-text-muted)',
            marginBottom: '48px',
            maxWidth: '600px',
            margin: '0 auto 48px',
          }}>
            From prediction to logging to opponent tracking — all in one place.
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            {[
              {
                icon: '🎯',
                title: 'ET Prediction',
                desc: 'Physics-based simulation predicts your ET and MPH with ±0.01s accuracy. See exactly why your time changed.',
                tag: 'Core',
              },
              {
                icon: '🌡️',
                title: 'Live Weather',
                desc: 'Auto-fetch weather from any track. DA, density altitude, and correction factors calculated instantly.',
                tag: 'Core',
              },
              {
                icon: '📊',
                title: 'Run Logbook',
                desc: 'Log runs in seconds. Track trends, compare conditions, and never lose data again.',
                tag: 'Core',
              },
              {
                icon: '🤖',
                title: 'AI Opponent Prediction',
                desc: 'Track opponents and predict their next run. Know their tendencies before they stage.',
                tag: 'Pro',
              },
              {
                icon: '⚡',
                title: 'Optimizer',
                desc: 'One-click find your best gear ratio or converter stall. Stop guessing, start optimizing.',
                tag: 'Pro',
              },
              {
                icon: '🏆',
                title: 'Race Day Dashboard',
                desc: 'Live dial-in, round tracking, weather updates — your command center at the track.',
                tag: 'Pro',
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
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: 'var(--color-accent)',
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
                {['ET Simulator', 'Weather Integration', 'Run Logbook', 'Dial-In Calculator', '5 Vehicles'].map(f => (
                  <li key={f} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                    ✓ {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
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
                Start Free Trial
              </Link>
            </div>
            
            {/* Pro Tier */}
            <div style={{
              padding: '32px 24px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '16px',
              border: '2px solid var(--color-accent)',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '4px 16px',
                backgroundColor: 'var(--color-accent)',
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
                {['Everything in Racer', 'AI Opponent Prediction', 'Race Day Dashboard', 'Optimizer Tools', 'Unlimited Vehicles'].map(f => (
                  <li key={f} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                    ✓ {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                style={{
                  display: 'block',
                  padding: '12px 24px',
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Start Free Trial
              </Link>
            </div>
          </div>
          
          <p style={{ marginTop: '24px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            Save 17% with annual billing • <Link to="/pricing" style={{ color: 'var(--color-accent)' }}>See all plans</Link>
          </p>
        </div>
      </section>

      {/* Testimonial / Quote */}
      <section style={{ 
        padding: '80px 20px',
        backgroundColor: 'var(--color-surface)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <blockquote style={{ 
            fontSize: '1.5rem', 
            fontStyle: 'italic',
            lineHeight: 1.6,
            margin: '0 0 24px',
            color: 'var(--color-text)',
          }}>
            "RSA helped me understand why my car was running different every round. 
            Now I'm deadly consistent and turning on more win lights than ever."
          </blockquote>
          <div style={{ color: 'var(--color-text-muted)' }}>
            — Bracket Racer, Super Pro Class
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ 
        padding: '80px 20px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '16px', fontWeight: 700 }}>
            Ready to Win More Rounds?
          </h2>
          <p style={{ 
            fontSize: '1.1rem', 
            color: 'var(--color-text-muted)',
            marginBottom: '32px',
          }}>
            Join hundreds of racers who trust RSA for their predictions.
            Start your free trial today — no credit card required.
          </p>
          <Link 
            to="/register"
            style={{
              display: 'inline-block',
              padding: '18px 48px',
              backgroundColor: '#22c55e',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '1.2rem',
              boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
            }}
          >
            Start Your Free Trial
          </Link>
          <p style={{ marginTop: '16px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--color-accent)' }}>Sign in</Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 20px',
        borderTop: '1px solid var(--color-border)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '32px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}>
            <Link to="/pricing" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Pricing</Link>
            <Link to="/features" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Features</Link>
            <Link to="/calcs" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Free Calculators</Link>
            <Link to="/about" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>About</Link>
            <Link to="/contact" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Contact</Link>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
            © {new Date().getFullYear()} Racing Systems Analysis. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Demo Modal */}
      {showDemo && (
        <>
          <div 
            onClick={() => setShowDemo(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              zIndex: 1000,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'var(--color-bg)',
            borderRadius: '16px',
            padding: '32px',
            zIndex: 1001,
            maxWidth: '600px',
            width: '90%',
            textAlign: 'center',
          }}>
            <h3 style={{ marginBottom: '16px' }}>Demo Coming Soon</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
              We're working on an interactive demo. In the meantime, start your free trial 
              to explore all features!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Link
                to="/register"
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#22c55e',
                  color: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Start Free Trial
              </Link>
              <button
                onClick={() => setShowDemo(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
