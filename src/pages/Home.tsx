import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Page from '../shared/components/Page';
import PeekCard from '../shared/components/PeekCard';
import { loadVehicles, type VehicleLite } from '../state/vehicles';
import type { RaceLength } from '../domain/config/raceLengths';
import type { PhysicsModelId } from '../domain/physics';

function Home() {
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [raceLength, setRaceLength] = useState<RaceLength>('QUARTER');
  const [selectedModel, setSelectedModel] = useState<PhysicsModelId>('VB6Exact');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const data = await loadVehicles();
      setVehicles(data);
      if (data.length > 0) {
        setSelectedVehicleId(data[0].id);
        setRaceLength(data[0].defaultRaceLength);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const handlePredict = () => {
    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!selectedVehicle) {
      alert('Please select a vehicle');
      return;
    }

    navigate('/et-sim', {
      state: {
        vehicle: selectedVehicle,
        raceLength,
        selectedModel,
      },
    });
  };

  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (vehicle) {
      setRaceLength(vehicle.defaultRaceLength);
    }
  };

  if (loading) {
    return (
      <Page title="Racing Systems Analysis">
        <div className="text-center text-muted" style={{ padding: 'var(--space-6)' }}>
          Loading...
        </div>
      </Page>
    );
  }

  if (vehicles.length === 0) {
    return (
      <Page title="Racing Systems Analysis">
        <div className="card text-center" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)', color: 'var(--color-text)' }}>
            No Vehicles Yet
          </h2>
          <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>
            Create your first vehicle to start making predictions.
          </p>
          <Link to="/vehicles" className="btn">
            + Create Vehicle
          </Link>
        </div>
      </Page>
    );
  }

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  return (
    <Page title="Racing Systems Analysis">
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="card mb-6">
          <div className="mb-4">
            <label className="label" htmlFor="vehicle">
              Select Vehicle
            </label>
            <select
              id="vehicle"
              className="input"
              value={selectedVehicleId}
              onChange={(e) => handleVehicleChange(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </option>
              ))}
            </select>
          </div>

          {selectedVehicle && (
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                <div>Weight: <strong>{selectedVehicle.weightLb}</strong> lb</div>
                <div>Power: <strong>{selectedVehicle.powerHP}</strong> HP</div>
                <div>Tire: <strong>{selectedVehicle.tireDiaIn}</strong>" dia</div>
                <div>Final Drive: <strong>{selectedVehicle.rearGear}</strong></div>
                <div>Rollout: <strong>{selectedVehicle.rolloutIn}</strong>"</div>
                <div>Trans: <strong>{(selectedVehicle as any).transmissionType === 'converter' ? 'Auto' : 'Manual'}</strong></div>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <Link to="/vehicles" style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>
                  Edit Vehicle →
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="label">Race Length</h3>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="raceLength"
                value="EIGHTH"
                checked={raceLength === 'EIGHTH'}
                onChange={(e) => setRaceLength(e.target.value as RaceLength)}
              />
              <span>1/8 Mile (660 ft)</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="raceLength"
                value="QUARTER"
                checked={raceLength === 'QUARTER'}
                onChange={(e) => setRaceLength(e.target.value as RaceLength)}
              />
              <span>1/4 Mile (1320 ft)</span>
            </label>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="label">Physics Model</h3>
          <select
            className="input"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as PhysicsModelId)}
            style={{ cursor: 'pointer' }}
          >
            <option value="SimpleV1">SimpleV1 (Basic)</option>
            <option value="RSACLASSIC">RSACLASSIC (Advanced)</option>
            <option value="VB6Exact">VB6 Exact (Bit-for-bit Parity)</option>
            <option value="Blend">Blend (Learning)</option>
          </select>
          <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: 'var(--space-2)' }}>
            {selectedModel === 'SimpleV1' && 'Simplified physics model'}
            {selectedModel === 'RSACLASSIC' && 'Advanced physics with detailed modeling'}
            {selectedModel === 'VB6Exact' && 'Exact VB6 TIMESLIP.FRM replication'}
            {selectedModel === 'Blend' && 'RSACLASSIC + learned corrections'}
          </div>
        </div>

        <button onClick={handlePredict} className="btn btn-full">
          Run ET Sim
        </button>
      </div>

      <div className="card mt-6" style={{ backgroundColor: 'var(--color-surface-alt)' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)', color: 'var(--color-text)' }}>
          💡 How It Works
        </h3>
        <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: 'var(--space-2)' }}>
          <strong>ET Sim</strong> is baseline-only — it shows pure physics predictions based on vehicle specs and weather. 
          No learning, no completion, just instant baseline ET and MPH.
        </p>
        <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>
          Use <strong>Log</strong> to save actual runs, complete partial runs from splits, and train adaptive learning 
          models that improve predictions over time for each vehicle.
        </p>
      </div>

      <div style={{ marginTop: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-4)', color: 'var(--color-text)' }}>
          More Tools
        </h2>
        <p className="text-muted mb-6" style={{ fontSize: '0.9rem' }}>
          Unlock advanced features below to take your racing analysis to the next level.
        </p>

        <div className="grid grid-3 gap-4">
          <PeekCard
            title="Pro Vehicle Editor"
            tier="PRO"
            description="Advanced vehicle configuration with custom parameters, tire profiles, and gear ratios."
            onLearnMore={() => alert('Pro Vehicle Editor - Coming soon!')}
          />
          <PeekCard
            title="Advanced Charts"
            tier="PRO"
            description="G-force analysis, power curves, and comparative overlays across multiple runs."
            onLearnMore={() => alert('Advanced Charts - Coming soon!')}
          />
          <PeekCard
            title="Data Export"
            tier="NITRO"
            description="Export your runs and analysis to CSV, JSON, or PDF for external analysis and reporting."
            onLearnMore={() => alert('Data Export - Coming soon!')}
          />
        </div>
      </div>
    </Page>
  );
}

export default Home;
