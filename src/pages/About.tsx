import { Link } from 'react-router-dom';
import Page from '../shared/components/Page';

function About() {
  return (
    <Page title="About RSA">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* What is Baseline vs Log */}
        <div className="card mb-6">
          <h2 className="mb-4" style={{ fontSize: '1.5rem', color: 'var(--color-text)' }}>
            What is Baseline vs Log?
          </h2>
          
          <div className="mb-4">
            <h3 className="mb-2" style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text)' }}>
              Predict (Baseline Only)
            </h3>
            <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
              The <strong>Predict</strong> page provides instant baseline physics predictions based on your vehicle specs and weather conditions. 
              It's completely free and ungated—no learning, no completion, just pure physics calculations. Use it to get quick ET and MPH estimates 
              before heading to the track.
            </p>
          </div>

          <div className="mb-4">
            <h3 className="mb-2" style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text)' }}>
              Log (Advanced Features)
            </h3>
            <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
              The <strong>Log</strong> page is where you record actual runs and unlock advanced features:
            </p>
            <ul className="text-muted" style={{ fontSize: '0.95rem', lineHeight: '1.6', marginLeft: 'var(--space-5)' }}>
              <li><strong>Run Completion:</strong> Estimate final ET from partial runs when you lift early (60', 330', 660', 1000' splits)</li>
              <li><strong>Adaptive Learning:</strong> Train per-vehicle models that improve predictions over time based on your actual results</li>
              <li><strong>Run History:</strong> Save runs to localStorage and track your progress across sessions</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2" style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text)' }}>
              Quick Start
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <Link to="/vehicles" className="btn btn-secondary">
                1. Create a Vehicle →
              </Link>
              <Link to="/predict" className="btn btn-secondary">
                2. Get Baseline Prediction →
              </Link>
              <Link to="/log" className="btn btn-secondary">
                3. Log Actual Runs →
              </Link>
              <Link to="/history" className="btn btn-secondary">
                4. Review History →
              </Link>
            </div>
          </div>
        </div>

        {/* Privacy & Local Storage */}
        <div className="card mb-6">
          <h2 className="mb-4" style={{ fontSize: '1.5rem', color: 'var(--color-text)' }}>
            Privacy & Local Storage
          </h2>
          
          <p className="text-muted mb-3" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
            Racing Systems Analysis is a <strong>local-first</strong> application. All your data stays on your device:
          </p>

          <ul className="text-muted mb-4" style={{ fontSize: '0.95rem', lineHeight: '1.6', marginLeft: 'var(--space-5)' }}>
            <li><strong>No server uploads:</strong> Your vehicles, runs, and learning models never leave your browser</li>
            <li><strong>localStorage only:</strong> Data is stored in your browser's localStorage (not cookies, not cloud)</li>
            <li><strong>No tracking:</strong> We don't collect analytics, telemetry, or personal information</li>
            <li><strong>Offline capable:</strong> Works without internet after first load (PWA)</li>
          </ul>

          <div className="mb-3">
            <h3 className="mb-2" style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text)' }}>
              Storage Keys
            </h3>
            <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: 'var(--color-muted)' }}>
              <div>• rsa.vehicles.v1 - Your vehicle configurations</div>
              <div>• rsa.runs.v1 - Your run history</div>
              <div>• rsa.model.{'<vehicleId>'} - Learning models per vehicle</div>
              <div>• rsa.theme - Your theme preference (light/dark)</div>
            </div>
          </div>

          <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)' }}>
            <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>
              💡 <strong>Tip:</strong> Your data is tied to this browser on this device. To backup or transfer data, 
              use the CSV export feature (NITRO tier) or manually export from browser DevTools → Application → Local Storage.
            </p>
          </div>
        </div>

        {/* Feature Tiers Overview */}
        <div className="card mb-6">
          <h2 className="mb-4" style={{ fontSize: '1.5rem', color: 'var(--color-text)' }}>
            Feature Tiers Overview
          </h2>

          <p className="text-muted mb-4" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
            RSA offers four tiers to match your needs. All tiers include unlimited baseline predictions.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="align-center">FREE</th>
                  <th className="align-center">JUNIOR</th>
                  <th className="align-center">PRO</th>
                  <th className="align-center">NITRO</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Vehicles</td>
                  <td className="align-center">1</td>
                  <td className="align-center">3</td>
                  <td className="align-center">10</td>
                  <td className="align-center">Unlimited</td>
                </tr>
                <tr>
                  <td>Run History</td>
                  <td className="align-center">50</td>
                  <td className="align-center">200</td>
                  <td className="align-center">1,000</td>
                  <td className="align-center">Unlimited</td>
                </tr>
                <tr>
                  <td>60' Completion</td>
                  <td className="align-center">—</td>
                  <td className="align-center">✓</td>
                  <td className="align-center">✓</td>
                  <td className="align-center">✓</td>
                </tr>
                <tr>
                  <td>Full Completion</td>
                  <td className="align-center">—</td>
                  <td className="align-center">✓</td>
                  <td className="align-center">✓</td>
                  <td className="align-center">✓</td>
                </tr>
                <tr>
                  <td>Adaptive Learning</td>
                  <td className="align-center">—</td>
                  <td className="align-center">✓</td>
                  <td className="align-center">✓</td>
                  <td className="align-center">✓</td>
                </tr>
                <tr>
                  <td>Pro Vehicle Editor</td>
                  <td className="align-center">—</td>
                  <td className="align-center">—</td>
                  <td className="align-center">✓</td>
                  <td className="align-center">✓</td>
                </tr>
                <tr>
                  <td>Advanced Charts</td>
                  <td className="align-center">—</td>
                  <td className="align-center">—</td>
                  <td className="align-center">✓</td>
                  <td className="align-center">✓</td>
                </tr>
                <tr>
                  <td>Data Export (CSV)</td>
                  <td className="align-center">—</td>
                  <td className="align-center">—</td>
                  <td className="align-center">—</td>
                  <td className="align-center">✓</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4" style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)' }}>
            <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>
              📝 <strong>Note:</strong> Currently set to <strong>FREE</strong> tier for demonstration. 
              In production, tier would be determined by user subscription.
            </p>
          </div>
        </div>

        {/* Support & Feedback */}
        <div className="card mb-6">
          <h2 className="mb-4" style={{ fontSize: '1.5rem', color: 'var(--color-text)' }}>
            Support & Feedback
          </h2>

          <div className="mb-4">
            <h3 className="mb-2" style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text)' }}>
              Common Questions
            </h3>
            <div style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
              <p className="text-muted" style={{ marginBottom: 'var(--space-2)' }}>
                <strong>Q: Why are my predictions different from actual results?</strong><br />
                A: Baseline predictions use simplified physics. Use the Log page to train adaptive learning models that improve accuracy over time.
              </p>
              <p className="text-muted" style={{ marginBottom: 'var(--space-2)' }}>
                <strong>Q: Can I use this offline?</strong><br />
                A: Yes! After the first load, RSA works offline as a Progressive Web App (PWA). Install it to your home screen for the best experience.
              </p>
              <p className="text-muted" style={{ marginBottom: 'var(--space-2)' }}>
                <strong>Q: How do I backup my data?</strong><br />
                A: Use CSV export (NITRO tier) or manually export localStorage from browser DevTools. Data is local-only and not backed up to any server.
              </p>
              <p className="text-muted" style={{ marginBottom: 0 }}>
                <strong>Q: What weather data should I use?</strong><br />
                A: Use track conditions at the time of your run. You can import weather data from CSV files exported from weather stations.
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2" style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text)' }}>
              Technical Details
            </h3>
            <ul className="text-muted" style={{ fontSize: '0.95rem', lineHeight: '1.6', marginLeft: 'var(--space-5)' }}>
              <li>Built with React + TypeScript</li>
              <li>Web Workers for background calculations</li>
              <li>Service Worker for offline capability</li>
              <li>Recursive Least Squares (RLS) for adaptive learning</li>
              <li>Simplified physics model for baseline predictions</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-muted" style={{ fontSize: '0.875rem', padding: 'var(--space-4)' }}>
          <p>Racing Systems Analysis © 2025</p>
          <p style={{ marginTop: 'var(--space-2)' }}>
            Version 1.0.0 • Built for drag racing enthusiasts
          </p>
        </div>
      </div>
    </Page>
  );
}

export default About;
