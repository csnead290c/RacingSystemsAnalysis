import Page from '../shared/components/Page';

function About() {
  return (
    <Page title="">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Company Overview */}
        <div className="card mb-6">
          <h2 className="mb-4" style={{ fontSize: '1.5rem', color: 'var(--color-text)' }}>
            About Racing Systems Analysis!
          </h2>
          
          <p className="text-muted mb-4" style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
            Racing Systems Analysis (RSA) has been developing professional-grade drag racing simulation 
            software for over 4 decades. Our software is trusted by racers, engine builders, and chassis shops 
            worldwide to predict performance, optimize setups, and win races.
          </p>

          <p className="text-muted mb-4" style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
            Our simulation engine is based on decades of real-world data and physics modeling, 
            originally developed for Windows desktop applications. Just like with your racing
            operation, we felt like it was time for an upgrade! This web version brings 
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
            <p className="text-muted mb-4" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
              Drag racing simulation for 1/4 mile and 1/8 mile racing. Includes ET prediction,
              trap speed calculation, incremental analysis, and detailed run simulation with shift points,
              tire slip, and environmental corrections. Quarter Jr provides the core simulation;
              Quarter Pro adds advanced inputs, optimizers, and detailed analysis.
            </p>
            <p className="text-muted mb-4" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
              Additionally, we have incorporated our legacy Bonneville Pro land speed simuplation
              into this same umbrella by allowing the user to select the track/distance used by
              land speed racers.
            </p>
          </div>
          <div className="mb-4">
            <div>
              <h3 className="mb-2" style={{ fontSize: '1.1rem', fontWeight: '600', color: '#dc2626' }}>
                Engine Jr / Engine Pro
              </h3>
              <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                Engine dyno simulation and power curve analysis. Engine Jr covers core design inputs
                and performance outputs; Engine Pro adds flowbench data, mechanical details, flow details, 
                and recommendations.
              </p>
            </div>
          </div>
          <div className="mb-4">
            <div>
              <h3 className="mb-2" style={{ fontSize: '1.1rem', fontWeight: '600', color: '#dc2626' }}>
                COMING SOON!
              </h3>
              <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                All other tools and applications from RSA that you have come to rely on are coming soon!  
                Clutch Jr/Pro, Fourlink, Density, and more is on the horizon!
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="card mb-6">
          <h2 className="mb-4" style={{ fontSize: '1.5rem', color: 'var(--color-text)' }}>
            Contact Us
          </h2>

          <div style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
            <p className="text-muted mb-2">
              <strong>Email:</strong>{' '}
              <a href="mailto:support@racingsystemsanalysis.com" style={{ color: '#dc2626' }}>
                support@racingsystemsanalysis.com
              </a>
            </p>
          </div>
        </div>

      </div>
    </Page>
  );
}

export default About;
