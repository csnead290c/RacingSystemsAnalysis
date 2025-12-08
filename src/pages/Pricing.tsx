import { Link } from 'react-router-dom';
import { useState } from 'react';
import Page from '../shared/components/Page';

type BillingCycle = 'monthly' | 'annual';

interface Tier {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
}

const tiers: Tier[] = [
  {
    name: 'Racer',
    monthlyPrice: 9.99,
    annualPrice: 99,
    description: 'For weekend bracket racers who want better predictions',
    features: [
      'ET Simulator (Quarter Jr Mode)',
      'Weather Integration',
      'Run Logbook (100 runs)',
      'Dial-In Calculator',
      '5 Vehicles',
      'Track Database',
      'Print/Export Timeslips',
    ],
    cta: 'Start Free Trial',
  },
  {
    name: 'Pro',
    monthlyPrice: 24.99,
    annualPrice: 249,
    description: 'For serious competitors who want every advantage',
    features: [
      'Everything in Racer, plus:',
      'Full ET Simulator (Pro Mode)',
      'Full HP Curve Input',
      'Throttle Stop Simulation',
      'Optimizer Tools (Gear/Converter)',
      'AI Opponent Prediction',
      'Race Day Dashboard',
      'Competition Ladder',
      'Data Import (CSV)',
      'Tech Card Generator',
      'Unlimited Vehicles',
      'Unlimited Run History',
    ],
    highlighted: true,
    cta: 'Start Free Trial',
  },
  {
    name: 'Team',
    monthlyPrice: 49.99,
    annualPrice: 499,
    description: 'For teams and professionals who need advanced tools',
    features: [
      'Everything in Pro, plus:',
      'Engine Simulator',
      'Clutch Simulator',
      'Suspension Simulator',
      'Match My Times (Auto-tune)',
      'InstantCalc Mode',
      'Team Collaboration (5 members)',
      'API Access',
      'Priority Support',
      'White Label Options',
    ],
    cta: 'Contact Sales',
  },
];

export default function Pricing() {
  const [billing, setBilling] = useState<BillingCycle>('annual');

  return (
    <Page title="Pricing">
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '16px', fontWeight: 700 }}>
            Simple, Transparent Pricing
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', maxWidth: '600px', margin: '0 auto 32px' }}>
            Start with a 14-day free trial. No credit card required. 
            Cancel anytime.
          </p>
          
          {/* Billing Toggle */}
          <div style={{ 
            display: 'inline-flex', 
            backgroundColor: 'var(--color-surface)',
            borderRadius: '8px',
            padding: '4px',
          }}>
            <button
              onClick={() => setBilling('monthly')}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: billing === 'monthly' ? 'var(--color-bg)' : 'transparent',
                color: billing === 'monthly' ? 'var(--color-text)' : 'var(--color-text-muted)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: billing === 'annual' ? 'var(--color-bg)' : 'transparent',
                color: billing === 'annual' ? 'var(--color-text)' : 'var(--color-text-muted)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Annual
              <span style={{ 
                marginLeft: '8px', 
                padding: '2px 8px', 
                backgroundColor: '#22c55e',
                color: 'white',
                borderRadius: '4px',
                fontSize: '0.75rem',
              }}>
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '64px',
        }}>
          {tiers.map(tier => {
            const price = billing === 'monthly' ? tier.monthlyPrice : tier.annualPrice / 12;
            const totalPrice = billing === 'monthly' ? tier.monthlyPrice : tier.annualPrice;
            
            return (
              <div 
                key={tier.name}
                style={{
                  padding: '32px',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: '16px',
                  border: tier.highlighted ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {tier.highlighted && (
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
                )}
                
                <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', fontWeight: 700 }}>
                  {tier.name}
                </h2>
                
                <p style={{ 
                  fontSize: '0.9rem', 
                  color: 'var(--color-text-muted)', 
                  marginBottom: '24px',
                  minHeight: '40px',
                }}>
                  {tier.description}
                </p>
                
                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: '3rem', fontWeight: 700 }}>
                    ${price.toFixed(2)}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>/month</span>
                  {billing === 'annual' && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      ${totalPrice}/year billed annually
                    </div>
                  )}
                </div>
                
                <Link
                  to="/register"
                  style={{
                    display: 'block',
                    padding: '14px 24px',
                    backgroundColor: tier.highlighted ? 'var(--color-accent)' : 'var(--color-bg)',
                    color: tier.highlighted ? 'white' : 'var(--color-text)',
                    border: tier.highlighted ? 'none' : '1px solid var(--color-border)',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    textAlign: 'center',
                    marginBottom: '24px',
                  }}
                >
                  {tier.cta}
                </Link>
                
                <ul style={{ 
                  margin: 0, 
                  padding: 0, 
                  listStyle: 'none',
                  flex: 1,
                }}>
                  {tier.features.map((feature, i) => (
                    <li 
                      key={i}
                      style={{ 
                        padding: '10px 0', 
                        borderBottom: i < tier.features.length - 1 ? '1px solid var(--color-border)' : 'none',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                      }}
                    >
                      <span style={{ color: '#22c55e' }}>✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Enterprise CTA */}
        <div style={{
          padding: '40px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '16px',
          textAlign: 'center',
          marginBottom: '64px',
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>
            Enterprise & Racing Series
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', maxWidth: '600px', margin: '0 auto 24px' }}>
            Need custom solutions for your track, racing series, or manufacturer? 
            We offer unlimited team members, multi-track management, hardware integrations, and dedicated support.
          </p>
          <Link
            to="/contact"
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Contact Sales
          </Link>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '32px', fontSize: '1.5rem' }}>
            Frequently Asked Questions
          </h2>
          
          {[
            {
              q: 'How does the free trial work?',
              a: 'Start with a 14-day free trial of any plan. No credit card required. You\'ll have full access to all features in your chosen tier. At the end of the trial, you can subscribe or downgrade to our free demo mode.',
            },
            {
              q: 'Can I change plans later?',
              a: 'Yes! You can upgrade or downgrade at any time. When you upgrade, you\'ll get immediate access to new features. When you downgrade, the change takes effect at your next billing date.',
            },
            {
              q: 'What payment methods do you accept?',
              a: 'We accept all major credit cards (Visa, Mastercard, American Express) and PayPal. Enterprise customers can pay by invoice.',
            },
            {
              q: 'Is my data secure?',
              a: 'Absolutely. All data is encrypted in transit and at rest. We use industry-standard security practices and never share your data with third parties.',
            },
            {
              q: 'Do you offer refunds?',
              a: 'Yes. If you\'re not satisfied within the first 30 days of a paid subscription, contact us for a full refund.',
            },
            {
              q: 'Can I use RSA on multiple devices?',
              a: 'Yes! RSA is web-based, so you can access it from any device with a browser. Your data syncs automatically across all your devices.',
            },
          ].map((faq, i) => (
            <div 
              key={i}
              style={{
                padding: '20px 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <h3 style={{ fontSize: '1rem', marginBottom: '8px', fontWeight: 600 }}>
                {faq.q}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <div style={{ textAlign: 'center', marginTop: '64px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>
            Ready to Win More Rounds?
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
            Join hundreds of racers who trust RSA for their predictions.
          </p>
          <Link
            to="/register"
            style={{
              display: 'inline-block',
              padding: '16px 40px',
              backgroundColor: '#22c55e',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '1.1rem',
              boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
            }}
          >
            Start Your Free Trial
          </Link>
        </div>
      </div>
    </Page>
  );
}
