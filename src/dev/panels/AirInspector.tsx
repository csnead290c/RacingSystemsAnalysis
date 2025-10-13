/**
 * Environment & Air Model Inspector
 * 
 * Visualize air density calculations and dynamic pressure at various speeds.
 * Test the VB6 air density model with different environmental conditions.
 */

import { useState, useEffect } from 'react';
import { useVb6Fixture } from '../../shared/state/vb6FixtureStore';
import { airDensityVB6, type Vb6AirInputs } from '../../domain/physics/vb6/air';

// Standard air density at sea level (slugs/ft³)
const RHO_STANDARD = 0.002377;

/**
 * Calculate dynamic pressure (q) in psf (lb/ft²)
 * q = 0.5 * rho * v²
 * 
 * @param rho_slug_per_ft3 - Air density (slugs/ft³)
 * @param v_fps - Velocity (ft/s)
 * @returns Dynamic pressure (lb/ft²)
 */
function dynamicPressure(rho_slug_per_ft3: number, v_fps: number): number {
  return 0.5 * rho_slug_per_ft3 * v_fps * v_fps;
}

/**
 * Convert MPH to ft/s
 */
function mphToFps(mph: number): number {
  return mph * 5280 / 3600;
}

export default function AirInspector() {
  const { fixture, setFixture } = useVb6Fixture();
  
  // Input state (pre-fill from fixture)
  const [baro, setBaro] = useState<string>('');
  const [temp, setTemp] = useState<string>('');
  const [humidity, setHumidity] = useState<string>('');
  
  // Computed results
  const [result, setResult] = useState<ReturnType<typeof airDensityVB6> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from fixture on mount
  useEffect(() => {
    if (fixture.env) {
      setBaro(fixture.env.barometer_inHg?.toString() || '29.92');
      setTemp(fixture.env.temperature_F?.toString() || '75');
      setHumidity(fixture.env.relHumidity_pct?.toString() || '50');
    } else {
      setBaro('29.92');
      setTemp('75');
      setHumidity('50');
    }
  }, [fixture.env]);

  // Auto-compute when inputs change
  useEffect(() => {
    try {
      const baroVal = parseFloat(baro);
      const tempVal = parseFloat(temp);
      const humidityVal = parseFloat(humidity);

      if (isNaN(baroVal) || isNaN(tempVal) || isNaN(humidityVal)) {
        setResult(null);
        setError(null);
        return;
      }

      const inputs: Vb6AirInputs = {
        barometer_inHg: baroVal,
        temperature_F: tempVal,
        relHumidity_pct: humidityVal,
      };

      const computed = airDensityVB6(inputs);
      setResult(computed);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    }
  }, [baro, temp, humidity]);

  const handleApply = () => {
    try {
      const baroVal = parseFloat(baro);
      const tempVal = parseFloat(temp);
      const humidityVal = parseFloat(humidity);

      if (isNaN(baroVal) || isNaN(tempVal) || isNaN(humidityVal)) {
        alert('Please enter valid numbers for all fields');
        return;
      }

      // Update fixture (preserve all required env fields)
      setFixture({
        ...fixture,
        env: {
          elevation_ft: fixture.env?.elevation_ft ?? 0,
          barometer_inHg: baroVal,
          temperature_F: tempVal,
          relHumidity_pct: humidityVal,
          wind_mph: fixture.env?.wind_mph ?? 0,
          wind_angle_deg: fixture.env?.wind_angle_deg ?? 0,
          trackTemp_F: fixture.env?.trackTemp_F ?? tempVal,
          tractionIndex: fixture.env?.tractionIndex ?? 1.0,
        },
      });

      alert('✓ Applied environment values to VB6 UI Fixture!');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const deltaPct = result ? ((result.rho_slug_per_ft3 - RHO_STANDARD) / RHO_STANDARD) * 100 : 0;

  return (
    <div style={{ padding: '2rem', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Environment & Air Model</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', margin: 0 }}>
          Visualize air density calculations and dynamic pressure at various speeds.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      )}

      {/* Inputs */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
          Environmental Conditions
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Barometer (inHg)
            </label>
            <input
              type="text"
              value={baro}
              onChange={(e) => setBaro(e.target.value)}
              placeholder="29.92"
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '0.875rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Temperature (°F)
            </label>
            <input
              type="text"
              value={temp}
              onChange={(e) => setTemp(e.target.value)}
              placeholder="75"
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '0.875rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Relative Humidity (%)
            </label>
            <input
              type="text"
              value={humidity}
              onChange={(e) => setHumidity(e.target.value)}
              placeholder="50"
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '0.875rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
              }}
            />
          </div>
        </div>

        <button
          onClick={handleApply}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
          }}
        >
          Apply to current VB6 UI Fixture
        </button>
      </div>

      {/* Computed Air Density */}
      {result && (
        <>
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
              Computed Air Density
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
                  Air Density (ρ)
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                  {result.rho_slug_per_ft3.toFixed(6)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                  slugs/ft³
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
                  Standard ρ
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                  {RHO_STANDARD.toFixed(6)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                  slugs/ft³ (sea level, 59°F)
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
                  Delta from Standard
                </div>
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    color: deltaPct > 0 ? '#10b981' : deltaPct < 0 ? '#ef4444' : 'inherit',
                  }}
                >
                  {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(2)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                  {deltaPct > 0 ? 'Denser (more power)' : deltaPct < 0 ? 'Thinner (less power)' : 'Standard'}
                </div>
              </div>
            </div>

            {/* Intermediate Values */}
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#1e293b',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: '#e2e8f0',
              }}
            >
              <div style={{ marginBottom: '0.25rem' }}>
                <strong>Intermediate Values:</strong>
              </div>
              <div>Ambient Pressure: {result.pamb_psi.toFixed(4)} psi</div>
              <div>Water Vapor Pressure: {result.PWV_psi.toFixed(4)} psi</div>
              <div>Dry Air Pressure: {result.pair_psi.toFixed(4)} psi</div>
              <div>Water-to-Air Ratio: {result.WAR.toFixed(6)}</div>
              <div>Gas Constant: {result.RGAS.toFixed(4)} ft·lbf/(lbm·°R)</div>
              <div>Temperature: {result.temp_R.toFixed(2)} °R</div>
            </div>
          </div>

          {/* Dynamic Pressure Table */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
              Dynamic Pressure (q) at Various Speeds
            </h3>

            <table
              style={{
                width: '100%',
                fontSize: '0.875rem',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#e2e8f0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>
                    Speed (MPH)
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>
                    Speed (ft/s)
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>
                    q (psf)
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>
                    q (psi)
                  </th>
                </tr>
              </thead>
              <tbody>
                {[10, 50, 100, 200].map((mph, idx) => {
                  const fps = mphToFps(mph);
                  const q_psf = dynamicPressure(result.rho_slug_per_ft3, fps);
                  const q_psi = q_psf / 144;
                  
                  return (
                    <tr
                      key={mph}
                      style={{
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                      }}
                    >
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                        {mph}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace', borderBottom: '1px solid var(--color-border)' }}>
                        {fps.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace', borderBottom: '1px solid var(--color-border)' }}>
                        {q_psf.toFixed(4)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace', borderBottom: '1px solid var(--color-border)' }}>
                        {q_psi.toFixed(6)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              <strong>Note:</strong> Dynamic pressure q = 0.5 × ρ × v². Used in drag force calculation: F_drag = Cd × A × q
            </div>
          </div>
        </>
      )}
    </div>
  );
}
