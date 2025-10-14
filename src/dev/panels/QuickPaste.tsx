/**
 * Quick Paste Panel (Dyno & PMI)
 * 
 * Quickly paste dyno tables and PMI values into VB6 fixtures.
 * Supports local profile saving/loading.
 */

import { useState, useEffect, startTransition } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useVb6Fixture } from '../../shared/state/vb6FixtureStore';
import { assertComplete, Vb6FixtureValidationError } from '../../domain/physics/vb6/fixtures';
import { validateVB6Fixture } from '../validation/vb6Fixture';

interface SavedProfile {
  name: string;
  timestamp: number;
  fixture: any;
}

const PROFILES_STORAGE_KEY = 'rsa.quickpaste.profiles.v1';

export default function QuickPaste() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { fixture, setFixture } = useVb6Fixture();
  
  const [dynoText, setDynoText] = useState('');
  const [dynoPreview, setDynoPreview] = useState<Array<{ rpm: number; hp: number }>>([]);
  const [dynoError, setDynoError] = useState<string | null>(null);
  
  const [pmiEngine, setPmiEngine] = useState('');
  const [pmiChassis, setPmiChassis] = useState('');
  const [gearEff, setGearEff] = useState('');
  const [pmiError, setPmiError] = useState<string | null>(null);
  
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [newProfileName, setNewProfileName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load profiles from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROFILES_STORAGE_KEY);
      if (stored) {
        setProfiles(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }
  }, []);

  const saveProfiles = (newProfiles: SavedProfile[]) => {
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(newProfiles));
      setProfiles(newProfiles);
    } catch (err) {
      console.error('Failed to save profiles:', err);
    }
  };

  const parseDynoTable = (text: string): Array<{ rpm: number; hp: number }> => {
    const lines = text.trim().split('\n');
    const parsed: Array<{ rpm: number; hp: number }> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Support both space and comma delimiters
      const parts = trimmed.split(/[\s,]+/);
      if (parts.length < 2) {
        throw new Error(`Invalid line: "${line}" - expected "RPM HP" or "RPM,HP"`);
      }

      const rpm = parseFloat(parts[0]);
      const hp = parseFloat(parts[1]);

      if (isNaN(rpm) || isNaN(hp)) {
        throw new Error(`Invalid numbers in line: "${line}"`);
      }

      parsed.push({ rpm, hp });
    }

    if (parsed.length === 0) {
      throw new Error('No valid dyno data found');
    }

    // Sort by RPM
    parsed.sort((a, b) => a.rpm - b.rpm);

    return parsed;
  };

  const handleDynoPreview = () => {
    try {
      const parsed = parseDynoTable(dynoText);
      setDynoPreview(parsed);
      setDynoError(null);
    } catch (err) {
      setDynoError(err instanceof Error ? err.message : String(err));
      setDynoPreview([]);
    }
  };

  const handleApplyDyno = () => {
    try {
      const parsed = parseDynoTable(dynoText);
      
      // Update fixture with dyno data (engineHP field)
      setFixture({
        ...fixture,
        engineHP: parsed.map(p => [p.rpm, p.hp] as [number, number]),
      });

      setDynoError(null);
      alert(`✓ Applied ${parsed.length} dyno points to VB6 UI Fixture!`);
    } catch (err) {
      setDynoError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleApplyPMI = () => {
    try {
      setPmiError(null);

      const pmiUpdates: any = {};
      const drivetrainUpdates: any = {};

      // Parse PMI Engine
      if (pmiEngine.trim()) {
        const val = parseFloat(pmiEngine);
        if (isNaN(val)) {
          throw new Error('Invalid PMI Engine value');
        }
        pmiUpdates.engine_flywheel_clutch = val;
      }

      // Parse PMI Chassis
      if (pmiChassis.trim()) {
        const val = parseFloat(pmiChassis);
        if (isNaN(val)) {
          throw new Error('Invalid PMI Chassis value');
        }
        pmiUpdates.tires_wheels_ringgear = val;
      }

      // Parse Gear Efficiencies (comma-separated array)
      if (gearEff.trim()) {
        const parts = gearEff.split(',').map(s => s.trim());
        const effArray: number[] = [];
        
        for (const part of parts) {
          const val = parseFloat(part);
          if (isNaN(val)) {
            throw new Error(`Invalid gear efficiency value: "${part}"`);
          }
          effArray.push(val);
        }
        
        drivetrainUpdates.perGearEff = effArray;
      }

      if (Object.keys(pmiUpdates).length === 0 && Object.keys(drivetrainUpdates).length === 0) {
        setPmiError('No values to apply');
        return;
      }

      // Update fixture
      const updates: any = { ...fixture };
      
      if (Object.keys(pmiUpdates).length > 0) {
        updates.pmi = {
          ...fixture.pmi,
          ...pmiUpdates,
        };
      }
      
      if (Object.keys(drivetrainUpdates).length > 0) {
        updates.drivetrain = {
          ...fixture.drivetrain,
          ...drivetrainUpdates,
        };
      }
      
      setFixture(updates);

      alert('✓ Applied PMI values to VB6 UI Fixture!');
    } catch (err) {
      setPmiError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSaveProfile = () => {
    if (!newProfileName.trim()) {
      alert('Please enter a profile name');
      return;
    }

    const newProfile: SavedProfile = {
      name: newProfileName.trim(),
      timestamp: Date.now(),
      fixture: JSON.parse(JSON.stringify(fixture)), // Deep clone
    };

    const updated = [...profiles, newProfile];
    saveProfiles(updated);
    setNewProfileName('');
    alert(`✓ Saved profile "${newProfile.name}"`);
  };

  const handleLoadProfile = () => {
    if (!selectedProfile) {
      alert('Please select a profile');
      return;
    }

    const profile = profiles.find(p => p.name === selectedProfile);
    if (!profile) {
      alert('Profile not found');
      return;
    }

    setFixture(profile.fixture);
    alert(`✓ Loaded profile "${profile.name}"`);
  };

  const handleDeleteProfile = () => {
    if (!selectedProfile) {
      alert('Please select a profile');
      return;
    }

    if (!confirm(`Delete profile "${selectedProfile}"?`)) {
      return;
    }

    const updated = profiles.filter(p => p.name !== selectedProfile);
    saveProfiles(updated);
    setSelectedProfile('');
  };

  const handleValidate = () => {
    try {
      assertComplete(fixture);
      setValidationError(null);
      alert('✓ Fixture is complete and valid!');
    } catch (err) {
      if (err instanceof Vb6FixtureValidationError) {
        setValidationError(err.message);
      } else {
        setValidationError(err instanceof Error ? err.message : String(err));
      }
    }
  };

  const handleLoadProStockExample = async () => {
    setLoading(true);
    setValidationError(null);
    
    try {
      // Fetch the ProStock_Pro fixture
      const response = await fetch('/src/dev/fixtures/ProStock_Pro.vb6.json');
      if (!response.ok) {
        throw new Error(`Failed to load fixture: ${response.statusText}`);
      }
      
      const fixtureData = await response.json();
      
      // Ensure PMI data exists with default VB6 values if missing
      if (!fixtureData.pmi) {
        fixtureData.pmi = {
          engine_flywheel_clutch: 3.42,
          transmission_driveshaft: 0.247,
          tires_wheels_ringgear: 50.8,
        };
      }
      
      // Set the fixture
      setFixture(fixtureData);
      
      // Validate the fixture
      const validation = validateVB6Fixture(fixtureData);
      
      if (validation.ok) {
        alert('✓ ProStock_Pro fixture loaded and validated successfully!\n\nFixture valid: all PMI fields detected.');
      } else {
        const missingFields = validation.missing.join(', ');
        alert(`⚠ Fixture loaded but incomplete.\n\nMissing fields: ${missingFields}`);
        setValidationError(`Missing fields: ${missingFields}`);
      }
      
      // Navigate to Input Inspector (use startTransition to avoid sync navigation issues)
      startTransition(() => {
        navigate('/dev?panel=input-inspector');
      });
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setValidationError(`Failed to load ProStock_Pro fixture: ${errorMsg}`);
      alert(`❌ Error loading fixture: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load example if specified in URL
  useEffect(() => {
    const example = searchParams.get('example');
    if (example === 'prostock') {
      // Use setTimeout to avoid synchronous state updates during render
      setTimeout(() => {
        handleLoadProStockExample();
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div style={{ padding: '2rem', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Quick Paste (Dyno & PMI)</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', margin: 0 }}>
          Quickly paste dyno tables and PMI values into VB6 fixtures.
        </p>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            color: '#991b1b',
          }}
        >
          {validationError}
        </div>
      )}

      {/* Block 1: Paste Dyno Table */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
          1. Paste Dyno Table
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Paste dyno data as "RPM HP" or "RPM,HP" (one pair per line)
        </p>

        <textarea
          value={dynoText}
          onChange={(e) => setDynoText(e.target.value)}
          placeholder="7000 1275&#10;7100 1280&#10;7200 1285"
          style={{
            width: '100%',
            height: '150px',
            padding: '0.75rem',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            backgroundColor: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            resize: 'vertical',
          }}
        />

        {dynoError && (
          <div
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem',
              backgroundColor: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              color: '#991b1b',
            }}
          >
            {dynoError}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button
            onClick={handleDynoPreview}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            Preview
          </button>
          <button
            onClick={handleApplyDyno}
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
            Apply to VB6 UI Fixture
          </button>
        </div>

        {/* Dyno Preview */}
        {dynoPreview.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
              Preview ({dynoPreview.length} points)
            </h4>
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#1e293b',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: '#e2e8f0',
                maxHeight: '150px',
                overflow: 'auto',
              }}
            >
              {dynoPreview.slice(0, 10).map((p, idx) => (
                <div key={idx}>
                  {p.rpm.toFixed(0)} RPM → {p.hp.toFixed(1)} HP
                </div>
              ))}
              {dynoPreview.length > 10 && (
                <div style={{ color: '#9ca3af', marginTop: '0.5rem' }}>
                  ... and {dynoPreview.length - 10} more points
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Block 2: Paste PMI Values */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
          2. Paste PMI Values
        </h3>

        {pmiError && (
          <div
            style={{
              marginBottom: '0.75rem',
              padding: '0.5rem',
              backgroundColor: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              color: '#991b1b',
            }}
          >
            {pmiError}
          </div>
        )}

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
              PMI Engine (HP)
            </label>
            <input
              type="text"
              value={pmiEngine}
              onChange={(e) => setPmiEngine(e.target.value)}
              placeholder="e.g., 125.5"
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
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
              PMI Chassis (HP)
            </label>
            <input
              type="text"
              value={pmiChassis}
              onChange={(e) => setPmiChassis(e.target.value)}
              placeholder="e.g., 45.2"
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
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
              Gear Efficiencies (comma-separated)
            </label>
            <input
              type="text"
              value={gearEff}
              onChange={(e) => setGearEff(e.target.value)}
              placeholder="e.g., 0.98, 0.97, 0.96, 0.95"
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
          onClick={handleApplyPMI}
          style={{
            marginTop: '0.75rem',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
          }}
        >
          Apply PMI Values
        </button>
      </div>

      {/* Block 3: Load/Save Profiles */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
          3. Load/Save Profiles
        </h3>

        {/* Save Profile */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
            Save Current Fixture as Profile
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="Profile name"
              style={{
                flex: 1,
                padding: '0.5rem',
                fontSize: '0.875rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
              }}
            />
            <button
              onClick={handleSaveProfile}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </div>

        {/* Load Profile */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
            Load Profile
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem',
                fontSize: '0.875rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
              }}
            >
              <option value="">Select a profile...</option>
              {profiles.map((profile) => (
                <option key={profile.name} value={profile.name}>
                  {profile.name} ({new Date(profile.timestamp).toLocaleDateString()})
                </option>
              ))}
            </select>
            <button
              onClick={handleLoadProfile}
              disabled={!selectedProfile}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: selectedProfile ? '#10b981' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: selectedProfile ? 'pointer' : 'not-allowed',
              }}
            >
              Load
            </button>
            <button
              onClick={handleDeleteProfile}
              disabled={!selectedProfile}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: selectedProfile ? '#ef4444' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: selectedProfile ? 'pointer' : 'not-allowed',
              }}
            >
              Delete
            </button>
          </div>
        </div>

        {profiles.length === 0 && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-muted)', fontStyle: 'italic' }}>
            No saved profiles yet
          </p>
        )}
      </div>

      {/* Load Example */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
          4. Load Example Fixture
        </h3>
        <button
          onClick={handleLoadProStockExample}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            backgroundColor: loading ? '#9ca3af' : '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Loading...' : 'Load Example: ProStock_Pro'}
        </button>
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
          Loads complete ProStock_Pro fixture from VB6 printout, validates it, and opens Input Inspector
        </p>
      </div>

      {/* Validation Button */}
      <div>
        <button
          onClick={handleValidate}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
          }}
        >
          Validate Current Fixture
        </button>
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
          Runs assertComplete() to check if all required fields are present
        </p>
      </div>
    </div>
  );
}
