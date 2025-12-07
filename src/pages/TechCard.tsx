import { useState, useEffect, useRef } from 'react';
import Page from '../shared/components/Page';
import { loadVehicles, type VehicleLite } from '../state/vehicles';
import type { Vehicle } from '../domain/schemas/vehicle.schema';

interface TechCardData {
  // Driver Info
  driverName: string;
  driverLicense: string;
  driverPhone: string;
  crewChief: string;
  
  // Vehicle Info
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  carNumber: string;
  class: string;
  
  // Safety Equipment
  helmet: string;
  suit: string;
  gloves: boolean;
  shoes: boolean;
  neckCollar: boolean;
  armRestraints: boolean;
  
  // Vehicle Safety
  rollbar: boolean;
  rollcage: boolean;
  fireExtinguisher: boolean;
  batteryDisconnect: boolean;
  fuelCell: boolean;
  scattershield: boolean;
  driveshaftLoop: boolean;
  windowNet: boolean;
  parachute: boolean;
  
  // Engine
  engineMake: string;
  engineSize: string;
  induction: string;
  fuel: string;
  nitrous: boolean;
  
  // Performance
  estimatedET: string;
  estimatedMPH: string;
  dialIn: string;
  
  // Notes
  notes: string;
}

const DEFAULT_TECH_CARD: TechCardData = {
  driverName: '',
  driverLicense: '',
  driverPhone: '',
  crewChief: '',
  vehicleYear: '',
  vehicleMake: '',
  vehicleModel: '',
  vehicleColor: '',
  carNumber: '',
  class: '',
  helmet: 'Snell SA2020',
  suit: 'SFI 3.2A/5',
  gloves: true,
  shoes: true,
  neckCollar: true,
  armRestraints: false,
  rollbar: false,
  rollcage: true,
  fireExtinguisher: true,
  batteryDisconnect: true,
  fuelCell: false,
  scattershield: true,
  driveshaftLoop: true,
  windowNet: false,
  parachute: false,
  engineMake: '',
  engineSize: '',
  induction: 'Naturally Aspirated',
  fuel: 'Gasoline',
  nitrous: false,
  estimatedET: '',
  estimatedMPH: '',
  dialIn: '',
  notes: '',
};

const STORAGE_KEY = 'rsa_tech_card';

export default function TechCard() {
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [data, setData] = useState<TechCardData>(DEFAULT_TECH_CARD);
  const [savedCards, setSavedCards] = useState<Record<string, TechCardData>>({});
  const printRef = useRef<HTMLDivElement>(null);
  
  // Load vehicles and saved cards
  useEffect(() => {
    loadVehicles().then(setVehicles);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setSavedCards(JSON.parse(saved));
    }
  }, []);
  
  // Load card when vehicle selected
  useEffect(() => {
    if (selectedVehicleId && savedCards[selectedVehicleId]) {
      setData(savedCards[selectedVehicleId]);
    } else if (selectedVehicleId) {
      // Pre-fill from vehicle data
      const vehicle = vehicles.find(v => v.id === selectedVehicleId) as Vehicle | undefined;
      if (vehicle) {
        setData(prev => ({
          ...prev,
          vehicleYear: '',
          vehicleMake: '',
          vehicleModel: vehicle.name || '',
          carNumber: '',
          engineSize: vehicle.displacementCID ? `${vehicle.displacementCID} ci` : '',
        }));
      }
    }
  }, [selectedVehicleId, savedCards, vehicles]);
  
  // Save card
  const handleSave = () => {
    if (!selectedVehicleId) return;
    const newSaved = { ...savedCards, [selectedVehicleId]: data };
    setSavedCards(newSaved);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSaved));
  };
  
  // Print card
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tech Card - ${data.driverName || 'RSA'}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
            .tech-card { max-width: 8.5in; margin: 0 auto; border: 2px solid #000; }
            .header { background: #000; color: #fff; padding: 12px; text-align: center; }
            .header h1 { font-size: 18px; margin-bottom: 4px; }
            .header p { font-size: 10px; }
            .section { border-bottom: 1px solid #000; padding: 10px; }
            .section:last-child { border-bottom: none; }
            .section-title { font-weight: bold; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; background: #eee; padding: 4px 8px; margin: -10px -10px 10px -10px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
            .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
            .field { }
            .field-label { font-size: 9px; color: #666; text-transform: uppercase; }
            .field-value { font-size: 12px; font-weight: bold; border-bottom: 1px solid #ccc; min-height: 18px; padding: 2px 0; }
            .checkbox-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
            .checkbox { display: flex; align-items: center; gap: 4px; }
            .checkbox-box { width: 14px; height: 14px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; font-weight: bold; }
            .checkbox-box.checked { background: #000; color: #fff; }
            .notes { min-height: 60px; border: 1px solid #ccc; padding: 8px; margin-top: 8px; }
            .signature-line { margin-top: 20px; display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
            .signature { border-top: 1px solid #000; padding-top: 4px; font-size: 10px; }
            @media print {
              body { padding: 0; }
              .tech-card { border-width: 1px; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };
  
  const updateField = (field: keyof TechCardData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };
  
  const Checkbox = ({ checked, label }: { checked: boolean; label: string }) => (
    <div className="checkbox">
      <div className={`checkbox-box ${checked ? 'checked' : ''}`}>
        {checked ? '✓' : ''}
      </div>
      <span>{label}</span>
    </div>
  );
  
  return (
    <Page title="Tech Card">
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>📋 Tech Card Generator</h1>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">Select vehicle...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <button
              onClick={handleSave}
              disabled={!selectedVehicleId}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                cursor: selectedVehicleId ? 'pointer' : 'not-allowed',
              }}
            >
              💾 Save
            </button>
            <button
              onClick={handlePrint}
              className="btn"
              style={{ padding: '10px 20px' }}
            >
              🖨️ Print
            </button>
          </div>
        </div>
        
        {/* Editor */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          {/* Left - Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* Driver Info */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-3)' }}>Driver Information</h3>
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                <input
                  type="text"
                  placeholder="Driver Name"
                  value={data.driverName}
                  onChange={(e) => updateField('driverName', e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                  <input
                    type="text"
                    placeholder="License #"
                    value={data.driverLicense}
                    onChange={(e) => updateField('driverLicense', e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={data.driverPhone}
                    onChange={(e) => updateField('driverPhone', e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Crew Chief"
                  value={data.crewChief}
                  onChange={(e) => updateField('crewChief', e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
            
            {/* Vehicle Info */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-3)' }}>Vehicle Information</h3>
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 'var(--space-2)' }}>
                  <input
                    type="text"
                    placeholder="Year"
                    value={data.vehicleYear}
                    onChange={(e) => updateField('vehicleYear', e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                  <input
                    type="text"
                    placeholder="Make"
                    value={data.vehicleMake}
                    onChange={(e) => updateField('vehicleMake', e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                  <input
                    type="text"
                    placeholder="Model"
                    value={data.vehicleModel}
                    onChange={(e) => updateField('vehicleModel', e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr', gap: 'var(--space-2)' }}>
                  <input
                    type="text"
                    placeholder="Color"
                    value={data.vehicleColor}
                    onChange={(e) => updateField('vehicleColor', e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                  <input
                    type="text"
                    placeholder="Car #"
                    value={data.carNumber}
                    onChange={(e) => updateField('carNumber', e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                  <input
                    type="text"
                    placeholder="Class"
                    value={data.class}
                    onChange={(e) => updateField('class', e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>
            </div>
            
            {/* Engine */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-3)' }}>Engine</h3>
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                  <input
                    type="text"
                    placeholder="Engine Make"
                    value={data.engineMake}
                    onChange={(e) => updateField('engineMake', e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                  <input
                    type="text"
                    placeholder="Size (ci)"
                    value={data.engineSize}
                    onChange={(e) => updateField('engineSize', e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                  <select
                    value={data.induction}
                    onChange={(e) => updateField('induction', e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  >
                    <option>Naturally Aspirated</option>
                    <option>Supercharged</option>
                    <option>Turbocharged</option>
                    <option>Twin Turbo</option>
                    <option>Centrifugal Supercharger</option>
                  </select>
                  <select
                    value={data.fuel}
                    onChange={(e) => updateField('fuel', e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  >
                    <option>Gasoline</option>
                    <option>E85</option>
                    <option>Methanol</option>
                    <option>Alcohol</option>
                    <option>Diesel</option>
                  </select>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={data.nitrous}
                    onChange={(e) => updateField('nitrous', e.target.checked)}
                  />
                  Nitrous Oxide
                </label>
              </div>
            </div>
            
            {/* Performance */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-3)' }}>Performance</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)' }}>
                <input
                  type="text"
                  placeholder="Est. ET"
                  value={data.estimatedET}
                  onChange={(e) => updateField('estimatedET', e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                />
                <input
                  type="text"
                  placeholder="Est. MPH"
                  value={data.estimatedMPH}
                  onChange={(e) => updateField('estimatedMPH', e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                />
                <input
                  type="text"
                  placeholder="Dial-In"
                  value={data.dialIn}
                  onChange={(e) => updateField('dialIn', e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          </div>
          
          {/* Right - Safety & Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* Safety Equipment */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-3)' }}>Driver Safety</h3>
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                  <input
                    type="text"
                    placeholder="Helmet (e.g., Snell SA2020)"
                    value={data.helmet}
                    onChange={(e) => updateField('helmet', e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                  <input
                    type="text"
                    placeholder="Suit (e.g., SFI 3.2A/5)"
                    value={data.suit}
                    onChange={(e) => updateField('suit', e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.85rem' }}>
                  {[
                    { key: 'gloves', label: 'Gloves' },
                    { key: 'shoes', label: 'Shoes' },
                    { key: 'neckCollar', label: 'Neck Collar/HANS' },
                    { key: 'armRestraints', label: 'Arm Restraints' },
                  ].map(item => (
                    <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={data[item.key as keyof TechCardData] as boolean}
                        onChange={(e) => updateField(item.key as keyof TechCardData, e.target.checked)}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Vehicle Safety */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-3)' }}>Vehicle Safety</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.85rem' }}>
                {[
                  { key: 'rollbar', label: 'Roll Bar' },
                  { key: 'rollcage', label: 'Roll Cage' },
                  { key: 'fireExtinguisher', label: 'Fire Extinguisher' },
                  { key: 'batteryDisconnect', label: 'Battery Disconnect' },
                  { key: 'fuelCell', label: 'Fuel Cell' },
                  { key: 'scattershield', label: 'Scattershield' },
                  { key: 'driveshaftLoop', label: 'Driveshaft Loop' },
                  { key: 'windowNet', label: 'Window Net' },
                  { key: 'parachute', label: 'Parachute' },
                ].map(item => (
                  <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={data[item.key as keyof TechCardData] as boolean}
                      onChange={(e) => updateField(item.key as keyof TechCardData, e.target.checked)}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
            
            {/* Notes */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-3)' }}>Notes</h3>
              <textarea
                value={data.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', resize: 'vertical' }}
              />
            </div>
          </div>
        </div>
        
        {/* Print Preview (hidden, used for printing) */}
        <div style={{ display: 'none' }}>
          <div ref={printRef}>
            <div className="tech-card">
              <div className="header">
                <h1>TECH INSPECTION CARD</h1>
                <p>Racing Systems Analysis</p>
              </div>
              
              <div className="section">
                <div className="section-title">Driver Information</div>
                <div className="grid">
                  <div className="field">
                    <div className="field-label">Driver Name</div>
                    <div className="field-value">{data.driverName}</div>
                  </div>
                  <div className="field">
                    <div className="field-label">License #</div>
                    <div className="field-value">{data.driverLicense}</div>
                  </div>
                  <div className="field">
                    <div className="field-label">Phone</div>
                    <div className="field-value">{data.driverPhone}</div>
                  </div>
                  <div className="field">
                    <div className="field-label">Crew Chief</div>
                    <div className="field-value">{data.crewChief}</div>
                  </div>
                </div>
              </div>
              
              <div className="section">
                <div className="section-title">Vehicle Information</div>
                <div className="grid">
                  <div className="field">
                    <div className="field-label">Year / Make / Model</div>
                    <div className="field-value">{data.vehicleYear} {data.vehicleMake} {data.vehicleModel}</div>
                  </div>
                  <div className="field">
                    <div className="field-label">Color</div>
                    <div className="field-value">{data.vehicleColor}</div>
                  </div>
                  <div className="field">
                    <div className="field-label">Car #</div>
                    <div className="field-value">{data.carNumber}</div>
                  </div>
                  <div className="field">
                    <div className="field-label">Class</div>
                    <div className="field-value">{data.class}</div>
                  </div>
                </div>
              </div>
              
              <div className="section">
                <div className="section-title">Engine</div>
                <div className="grid">
                  <div className="field">
                    <div className="field-label">Engine</div>
                    <div className="field-value">{data.engineMake} {data.engineSize}</div>
                  </div>
                  <div className="field">
                    <div className="field-label">Induction</div>
                    <div className="field-value">{data.induction}</div>
                  </div>
                  <div className="field">
                    <div className="field-label">Fuel</div>
                    <div className="field-value">{data.fuel}</div>
                  </div>
                  <div className="field">
                    <div className="field-label">Nitrous</div>
                    <div className="field-value">{data.nitrous ? 'YES' : 'NO'}</div>
                  </div>
                </div>
              </div>
              
              <div className="section">
                <div className="section-title">Performance</div>
                <div className="grid-3">
                  <div className="field">
                    <div className="field-label">Estimated ET</div>
                    <div className="field-value">{data.estimatedET}</div>
                  </div>
                  <div className="field">
                    <div className="field-label">Estimated MPH</div>
                    <div className="field-value">{data.estimatedMPH}</div>
                  </div>
                  <div className="field">
                    <div className="field-label">Dial-In</div>
                    <div className="field-value">{data.dialIn}</div>
                  </div>
                </div>
              </div>
              
              <div className="section">
                <div className="section-title">Driver Safety Equipment</div>
                <div className="grid">
                  <div className="field">
                    <div className="field-label">Helmet</div>
                    <div className="field-value">{data.helmet}</div>
                  </div>
                  <div className="field">
                    <div className="field-label">Suit</div>
                    <div className="field-value">{data.suit}</div>
                  </div>
                </div>
                <div className="checkbox-grid" style={{ marginTop: '8px' }}>
                  <Checkbox checked={data.gloves} label="Gloves" />
                  <Checkbox checked={data.shoes} label="Shoes" />
                  <Checkbox checked={data.neckCollar} label="Neck Collar/HANS" />
                  <Checkbox checked={data.armRestraints} label="Arm Restraints" />
                </div>
              </div>
              
              <div className="section">
                <div className="section-title">Vehicle Safety Equipment</div>
                <div className="checkbox-grid">
                  <Checkbox checked={data.rollbar} label="Roll Bar" />
                  <Checkbox checked={data.rollcage} label="Roll Cage" />
                  <Checkbox checked={data.fireExtinguisher} label="Fire Extinguisher" />
                  <Checkbox checked={data.batteryDisconnect} label="Battery Disconnect" />
                  <Checkbox checked={data.fuelCell} label="Fuel Cell" />
                  <Checkbox checked={data.scattershield} label="Scattershield" />
                  <Checkbox checked={data.driveshaftLoop} label="Driveshaft Loop" />
                  <Checkbox checked={data.windowNet} label="Window Net" />
                  <Checkbox checked={data.parachute} label="Parachute" />
                </div>
              </div>
              
              {data.notes && (
                <div className="section">
                  <div className="section-title">Notes</div>
                  <div className="notes">{data.notes}</div>
                </div>
              )}
              
              <div className="section">
                <div className="signature-line">
                  <div className="signature">Driver Signature</div>
                  <div className="signature">Date</div>
                </div>
                <div className="signature-line" style={{ marginTop: '16px' }}>
                  <div className="signature">Tech Inspector Signature</div>
                  <div className="signature">Date</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
