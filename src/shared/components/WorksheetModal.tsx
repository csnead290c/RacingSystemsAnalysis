/**
 * Worksheet Modal Component
 * 
 * A reusable modal for calculator worksheets that can be triggered from
 * buttons next to input fields. Matches the VB6 pattern where worksheets
 * were popup dialogs that helped calculate values.
 */

import { useState, useEffect, type ReactNode } from 'react';

interface WorksheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: number) => void;
  title: string;
  children: ReactNode;
  calculatedValue: number;
  calculatedLabel: string;
  unit?: string;
  helpText?: string;
}

export default function WorksheetModal({
  isOpen,
  onClose,
  onApply,
  title,
  children,
  calculatedValue,
  calculatedLabel,
  unit = '',
  helpText,
}: WorksheetModalProps) {
  if (!isOpen) return null;

  const handleApply = () => {
    onApply(calculatedValue);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '12px',
          padding: 'var(--space-4)',
          maxWidth: '450px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: '0 8px',
            }}
          >
            ×
          </button>
        </div>

        {/* Input fields */}
        <div style={{ marginBottom: 'var(--space-3)' }}>
          {children}
        </div>

        {/* Calculated result */}
        <div
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            padding: 'var(--space-3)',
            borderRadius: '8px',
            marginBottom: 'var(--space-3)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{calculatedLabel}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {calculatedValue.toFixed(2)} {unit}
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>
            Double-click or press Apply to use this value
          </div>
        </div>

        {/* Help text */}
        {helpText && (
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-bg)',
              padding: 'var(--space-2)',
              borderRadius: '6px',
              marginBottom: 'var(--space-3)',
            }}
          >
            {helpText}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleApply}>
            Apply Value
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Worksheet trigger button - the "..." button next to input fields
 */
interface WorksheetButtonProps {
  onClick: () => void;
  tooltip?: string;
}

export function WorksheetButton({ onClick, tooltip = 'Open calculator worksheet' }: WorksheetButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      style={{
        padding: '4px 8px',
        fontSize: '0.8rem',
        backgroundColor: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: '4px',
        cursor: 'pointer',
        marginLeft: '4px',
      }}
    >
      ...
    </button>
  );
}

// ============================================================================
// SPECIFIC WORKSHEET COMPONENTS
// ============================================================================

/**
 * Frontal Area Worksheet
 * Calculates: RefArea = (ShapeFactor / 100) × MaxWidth × MaxHeight / 144
 */
interface FrontalAreaWorksheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: number) => void;
}

export function FrontalAreaWorksheet({ isOpen, onClose, onApply }: FrontalAreaWorksheetProps) {
  const [maxWidth, setMaxWidth] = useState(72);  // inches
  const [maxHeight, setMaxHeight] = useState(52); // inches
  const [shapeFactor, setShapeFactor] = useState(83); // percentage

  const calculatedArea = (shapeFactor / 100) * maxWidth * maxHeight / 144;

  return (
    <WorksheetModal
      isOpen={isOpen}
      onClose={onClose}
      onApply={onApply}
      title="Frontal Area Worksheet"
      calculatedValue={calculatedArea}
      calculatedLabel="Frontal Area"
      unit="sq ft"
      helpText="The frontal area is the projected area of the vehicle as seen from the front. Shape factor accounts for the fact that vehicles aren't perfect rectangles."
    >
      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
        <div>
          <label className="label">Maximum Width (inches)</label>
          <input
            type="number"
            className="input"
            value={maxWidth}
            onChange={(e) => setMaxWidth(parseFloat(e.target.value) || 0)}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Widest point of the vehicle body
          </div>
        </div>
        <div>
          <label className="label">Maximum Height (inches)</label>
          <input
            type="number"
            className="input"
            value={maxHeight}
            onChange={(e) => setMaxHeight(parseFloat(e.target.value) || 0)}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Tallest point of the vehicle body
          </div>
        </div>
        <div>
          <label className="label">Shape Factor (%)</label>
          <input
            type="number"
            className="input"
            value={shapeFactor}
            onChange={(e) => setShapeFactor(parseFloat(e.target.value) || 0)}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Typical values: 75-85% for cars, 60-70% for open-wheel
          </div>
        </div>
      </div>
    </WorksheetModal>
  );
}

/**
 * Tire Width Worksheet
 * Calculates tire width from section width and aspect ratio
 */
interface TireWidthWorksheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: number) => void;
}

export function TireWidthWorksheet({ isOpen, onClose, onApply }: TireWidthWorksheetProps) {
  const [sectionWidth, setSectionWidth] = useState(295);  // mm
  const [aspectRatio, setAspectRatio] = useState(50);     // percentage
  const [rimDiameter, setRimDiameter] = useState(15);     // inches

  // Convert section width from mm to inches
  const tireWidthIn = sectionWidth / 25.4;
  
  // Calculate tire diameter: Rim + 2 × sidewall height
  const sidewallHeight = (sectionWidth * aspectRatio / 100) / 25.4;
  const tireDiameter = rimDiameter + 2 * sidewallHeight;

  return (
    <WorksheetModal
      isOpen={isOpen}
      onClose={onClose}
      onApply={onApply}
      title="Tire Width Worksheet"
      calculatedValue={tireWidthIn}
      calculatedLabel="Tire Width"
      unit="inches"
      helpText="Enter tire size in standard format (e.g., 295/50R15). Width is the section width, aspect ratio is the sidewall height as a percentage of width."
    >
      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
        <div>
          <label className="label">Section Width (mm)</label>
          <input
            type="number"
            className="input"
            value={sectionWidth}
            onChange={(e) => setSectionWidth(parseFloat(e.target.value) || 0)}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            First number in tire size (e.g., 295 in 295/50R15)
          </div>
        </div>
        <div>
          <label className="label">Aspect Ratio (%)</label>
          <input
            type="number"
            className="input"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(parseFloat(e.target.value) || 0)}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Second number in tire size (e.g., 50 in 295/50R15)
          </div>
        </div>
        <div>
          <label className="label">Rim Diameter (inches)</label>
          <input
            type="number"
            className="input"
            value={rimDiameter}
            onChange={(e) => setRimDiameter(parseFloat(e.target.value) || 0)}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Last number in tire size (e.g., 15 in 295/50R15)
          </div>
        </div>
        <div style={{ 
          padding: 'var(--space-2)', 
          backgroundColor: 'var(--color-bg)', 
          borderRadius: '6px',
          fontSize: '0.85rem',
        }}>
          <strong>Calculated Tire Diameter:</strong> {tireDiameter.toFixed(1)} inches
        </div>
      </div>
    </WorksheetModal>
  );
}

/**
 * PMI (Polar Moment of Inertia) Worksheet
 * Calculates engine, trans, and tire PMI
 */
interface PMIWorksheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: { engine: number; trans: number; tires: number }) => void;
  type: 'engine' | 'trans' | 'tires';
}

export function PMIWorksheet({ isOpen, onClose, onApply, type }: PMIWorksheetProps) {
  // Engine PMI inputs
  const [engineWeight, setEngineWeight] = useState(550);  // lbs
  const [crankRadius, setCrankRadius] = useState(2);      // inches
  
  // Trans PMI inputs
  const [transWeight, setTransWeight] = useState(150);    // lbs
  const [inputShaftDia, setInputShaftDia] = useState(1.5); // inches
  
  // Tire PMI inputs
  const [tireWeight, setTireWeight] = useState(35);       // lbs per tire
  const [tireDiameter, setTireDiameter] = useState(28);   // inches
  const [numTires, setNumTires] = useState(2);            // drive tires

  // Calculate PMI based on type
  // PMI = m × r² (simplified)
  const enginePMI = (engineWeight / 32.2) * Math.pow(crankRadius / 12, 2);
  const transPMI = (transWeight / 32.2) * Math.pow(inputShaftDia / 24, 2);
  const tirePMI = numTires * (tireWeight / 32.2) * Math.pow(tireDiameter / 24, 2);

  const currentValue = type === 'engine' ? enginePMI : type === 'trans' ? transPMI : tirePMI;
  const currentLabel = type === 'engine' ? 'Engine PMI' : type === 'trans' ? 'Trans PMI' : 'Tire PMI';

  return (
    <WorksheetModal
      isOpen={isOpen}
      onClose={onClose}
      onApply={() => onApply({ engine: enginePMI, trans: transPMI, tires: tirePMI })}
      title={`${currentLabel} Worksheet`}
      calculatedValue={currentValue}
      calculatedLabel={currentLabel}
      unit="lb-ft²"
      helpText="Polar Moment of Inertia affects how quickly the drivetrain can accelerate. Higher PMI means more rotational mass to spin up."
    >
      {type === 'engine' && (
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <div>
            <label className="label">Engine Rotating Weight (lbs)</label>
            <input
              type="number"
              className="input"
              value={engineWeight}
              onChange={(e) => setEngineWeight(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="label">Crank Throw Radius (inches)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={crankRadius}
              onChange={(e) => setCrankRadius(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      )}
      {type === 'trans' && (
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <div>
            <label className="label">Trans Rotating Weight (lbs)</label>
            <input
              type="number"
              className="input"
              value={transWeight}
              onChange={(e) => setTransWeight(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="label">Input Shaft Diameter (inches)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={inputShaftDia}
              onChange={(e) => setInputShaftDia(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      )}
      {type === 'tires' && (
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <div>
            <label className="label">Tire Weight (lbs each)</label>
            <input
              type="number"
              className="input"
              value={tireWeight}
              onChange={(e) => setTireWeight(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="label">Tire Diameter (inches)</label>
            <input
              type="number"
              step="0.5"
              className="input"
              value={tireDiameter}
              onChange={(e) => setTireDiameter(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="label">Number of Drive Tires</label>
            <input
              type="number"
              className="input"
              value={numTires}
              onChange={(e) => setNumTires(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      )}
    </WorksheetModal>
  );
}

/**
 * Gear Ratio Worksheet
 * Calculates gear ratio from ring & pinion teeth
 */
interface GearRatioWorksheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: number) => void;
}

export function GearRatioWorksheet({ isOpen, onClose, onApply }: GearRatioWorksheetProps) {
  const [ringTeeth, setRingTeeth] = useState(41);
  const [pinionTeeth, setPinionTeeth] = useState(11);

  const gearRatio = ringTeeth / pinionTeeth;

  return (
    <WorksheetModal
      isOpen={isOpen}
      onClose={onClose}
      onApply={onApply}
      title="Gear Ratio Worksheet"
      calculatedValue={gearRatio}
      calculatedLabel="Gear Ratio"
      unit=":1"
      helpText="Enter the number of teeth on the ring gear and pinion gear to calculate the final drive ratio."
    >
      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
        <div>
          <label className="label">Ring Gear Teeth</label>
          <input
            type="number"
            className="input"
            value={ringTeeth}
            onChange={(e) => setRingTeeth(parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="label">Pinion Gear Teeth</label>
          <input
            type="number"
            className="input"
            value={pinionTeeth}
            onChange={(e) => setPinionTeeth(parseInt(e.target.value) || 0)}
          />
        </div>
      </div>
    </WorksheetModal>
  );
}

/**
 * Tire Rollout Worksheet
 * Calculates tire rollout (circumference) from tire diameter
 * VB6: Tire Rollout = PI * Tire Diameter
 * Can also convert rollout back to diameter
 */
interface TireRolloutWorksheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: number) => void;
  tireDiameter?: number;
  mode?: 'diameter' | 'rollout'; // Which value to apply
}

export function TireRolloutWorksheet({ isOpen, onClose, onApply, tireDiameter = 28, mode = 'rollout' }: TireRolloutWorksheetProps) {
  const [inputMode, setInputMode] = useState<'diameter' | 'rollout'>('diameter');
  const [diameter, setDiameter] = useState(tireDiameter);
  const [rollout, setRollout] = useState(tireDiameter * Math.PI);

  useEffect(() => {
    setDiameter(tireDiameter);
    setRollout(tireDiameter * Math.PI);
  }, [tireDiameter]);

  // Sync values when input changes
  const handleDiameterChange = (value: number) => {
    setDiameter(value);
    setRollout(value * Math.PI);
  };

  const handleRolloutChange = (value: number) => {
    setRollout(value);
    setDiameter(value / Math.PI);
  };

  const applyValue = mode === 'diameter' ? diameter : rollout;

  return (
    <WorksheetModal
      isOpen={isOpen}
      onClose={onClose}
      onApply={() => onApply(applyValue)}
      title="Tire Rollout Worksheet"
      calculatedValue={mode === 'diameter' ? diameter : rollout}
      calculatedLabel={mode === 'diameter' ? 'Tire Diameter' : 'Tire Rollout'}
      unit="inches"
      helpText="Tire Rollout is the tire circumference (π × diameter). VB6 accepts either diameter or rollout - they are interchangeable."
    >
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        {/* Input mode selector */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
          <button
            type="button"
            onClick={() => setInputMode('diameter')}
            style={{
              flex: 1,
              padding: 'var(--space-2)',
              border: `2px solid ${inputMode === 'diameter' ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: '6px',
              backgroundColor: inputMode === 'diameter' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: 'var(--color-text)',
              cursor: 'pointer',
              fontWeight: inputMode === 'diameter' ? 600 : 400,
            }}
          >
            Enter Diameter
          </button>
          <button
            type="button"
            onClick={() => setInputMode('rollout')}
            style={{
              flex: 1,
              padding: 'var(--space-2)',
              border: `2px solid ${inputMode === 'rollout' ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: '6px',
              backgroundColor: inputMode === 'rollout' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: 'var(--color-text)',
              cursor: 'pointer',
              fontWeight: inputMode === 'rollout' ? 600 : 400,
            }}
          >
            Enter Rollout
          </button>
        </div>

        {inputMode === 'diameter' ? (
          <div>
            <label className="label">Tire Diameter (inches)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={diameter}
              onChange={(e) => handleDiameterChange(parseFloat(e.target.value) || 0)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Measured from ground to top of tire
            </div>
          </div>
        ) : (
          <div>
            <label className="label">Tire Rollout (inches)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={rollout}
              onChange={(e) => handleRolloutChange(parseFloat(e.target.value) || 0)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Tire circumference (distance per revolution)
            </div>
          </div>
        )}

        <div style={{ 
          padding: 'var(--space-3)', 
          backgroundColor: 'var(--color-bg)', 
          borderRadius: '6px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-2)',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Diameter</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{diameter.toFixed(2)}"</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Rollout</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{rollout.toFixed(2)}"</div>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          Formula: Rollout = π × Diameter
        </div>
      </div>
    </WorksheetModal>
  );
}

// Keep the old name as an alias for backward compatibility
export const RolloutWorksheet = TireRolloutWorksheet;
