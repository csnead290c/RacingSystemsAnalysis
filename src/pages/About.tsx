import Page from '../shared/components/Page';

function About() {
  return (
    <Page title="About RSA">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Company Overview */}
        <div className="card mb-6">
          <h2 className="mb-4" style={{ fontSize: '1.5rem', color: 'var(--color-text)' }}>
            About Racing Systems Analysis
          </h2>
          
          <p className="text-muted mb-4" style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
            Racing Systems Analysis (RSA) has been developing professional-grade drag racing simulation 
            software since 1986. Our software is trusted by racers, engine builders, and chassis shops 
            worldwide to predict performance, optimize setups, and win races.
          </p>

          <p className="text-muted mb-4" style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
            Our simulation engine is based on decades of real-world data and physics modeling, 
            originally developed for DOS and Windows desktop applications. This web version brings 
            the same proven accuracy to modern browsers, accessible from any device.
          </p>
        </div>

        {/* Products */}
        <div className="card mb-6">
          <h2 className="mb-4" style={{ fontSize: '1.5rem', color: 'var(--color-text)' }}>
            Our Products
          </h2>

          <div className="mb-4">
            <h3 className="mb-2" style={{ fontSize: '1.1rem', fontWeight: '600', color: '#dc2626' }}>
              Quarter Jr / Quarter Pro
            </h3>
            <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
              Drag racing simulation for 1/4 mile and 1/8 mile racing. Includes ET prediction,
              trap speed calculation, 60-foot analysis, and detailed run simulation with shift points,
              tire slip, and environmental corrections. Quarter Jr provides the core simulation;
              Quarter Pro adds advanced inputs, optimizers, and detailed analysis.
            </p>
          </div>

          <div className="mb-4">
            <h3 className="mb-2" style={{ fontSize: '1.1rem', fontWeight: '600', color: '#dc2626' }}>
              Bonneville Jr / Bonneville Pro
            </h3>
            <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
              Land speed racing simulation for Bonneville Salt Flats and other long-course venues.
              Optimized for high-speed aerodynamics, extended acceleration, and mile/kilometer runs.
              Included within the Quarter programs.
            </p>
          </div>

          <div>
            <h3 className="mb-2" style={{ fontSize: '1.1rem', fontWeight: '600', color: '#dc2626' }}>
              Engine Jr / Engine Pro
            </h3>
            <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
              Engine dyno simulation and power curve analysis. Engine Jr covers core design inputs
              and performance outputs; Engine Pro adds flowbench data, mechanical details, and recommendations.
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="card mb-6">
          <h2 className="mb-4" style={{ fontSize: '1.5rem', color: 'var(--color-text)' }}>
            Contact Us
          </h2>

          <div style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
            <p className="text-muted mb-2">
              <strong>Website:</strong>{' '}
              <a href="https://racingsystemsanalysis.com" style={{ color: '#dc2626' }}>
                racingsystemsanalysis.com
              </a>
            </p>
            <p className="text-muted mb-2">
              <strong>Email:</strong>{' '}
              <a href="mailto:support@racingsystemsanalysis.com" style={{ color: '#dc2626' }}>
                support@racingsystemsanalysis.com
              </a>
            </p>
            <p className="text-muted">
              <strong>Technical Support:</strong> Available for registered users
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-muted" style={{ fontSize: '0.875rem', padding: 'var(--space-4)' }}>
          <p>Racing Systems Analysis © 1992-2026</p>
          <p style={{ marginTop: 'var(--space-2)' }}>
            Trusted by racers worldwide for over 30 years
          </p>
        </div>
      </div>
    </Page>
  );
}

export default About;
