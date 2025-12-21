/**
 * Worksheet Modal Component
 * 
 * A reusable modal for calculator worksheets that can be triggered from
 * buttons next to input fields. Matches the VB6 pattern where worksheets
 * were popup dialogs that helped calculate values.
 */

import React, { useState, useEffect, type ReactNode } from 'react';

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
            {calculatedValue.toFixed(3)} {unit}
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
 * Tire Width Worksheet (VB6 style)
 * Calculates effective tire width from tread width minus groove area
 * Formula: Effective Width = Tread Width - (Number of Grooves × Groove Width)
 */
interface TireWidthWorksheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: number) => void;
}

export function TireWidthWorksheet({ isOpen, onClose, onApply }: TireWidthWorksheetProps) {
  const [treadWidth, setTreadWidth] = useState(10);       // inches (overall tread width)
  const [numGrooves, setNumGrooves] = useState(4);        // number of grooves
  const [grooveWidth, setGrooveWidth] = useState(0.25);   // inches per groove

  // VB6 Formula: Effective Width = Tread Width - (Grooves × Groove Width)
  const effectiveTireWidth = treadWidth - (numGrooves * grooveWidth);

  return (
    <WorksheetModal
      isOpen={isOpen}
      onClose={onClose}
      onApply={onApply}
      title="Tire Width Worksheet"
      calculatedValue={Math.max(0, effectiveTireWidth)}
      calculatedLabel="Effective Tire Width"
      unit="inches"
      helpText="For treaded tires, the effective width is the tread width minus the total groove area. For slicks, just enter the tread width with 0 grooves."
    >
      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
        <div>
          <label className="label">Tread Width (inches)</label>
          <input
            type="number"
            step="0.5"
            className="input"
            value={treadWidth}
            onChange={(e) => setTreadWidth(parseFloat(e.target.value) || 0)}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Overall measured tread width (6-12" typical)
          </div>
        </div>
        <div>
          <label className="label">Number of Grooves</label>
          <input
            type="number"
            className="input"
            value={numGrooves}
            onChange={(e) => setNumGrooves(parseInt(e.target.value) || 0)}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Count of tread grooves (0 for slicks, usually &lt;10 for street tires)
          </div>
        </div>
        <div>
          <label className="label">Each Groove Width (inches)</label>
          <input
            type="number"
            step="0.0625"
            className="input"
            value={grooveWidth}
            onChange={(e) => setGrooveWidth(parseFloat(e.target.value) || 0)}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Width of each individual groove (0.125-0.25" typical)
          </div>
        </div>
        <div style={{ 
          padding: 'var(--space-2)', 
          backgroundColor: 'var(--color-bg)', 
          borderRadius: '6px',
          fontSize: '0.85rem',
        }}>
          <strong>Total groove area:</strong> {(numGrooves * grooveWidth).toFixed(2)}" removed
        </div>
      </div>
    </WorksheetModal>
  );
}

/**
 * PMI (Polar Moment of Inertia) Worksheet - VB6 EXACT
 * Supports engine, trans, and tire PMI calculations matching VB6 formulas exactly
 */
interface PMIWorksheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: { engine: number; trans: number; tires: number }) => void;
  type: 'engine' | 'trans' | 'tires';
}

// Transmission types from VB6 (Qmain.bas gc_WSTransType)
const TRANS_TYPES = [
  { value: 1, label: 'Production Automatic' },
  { value: 2, label: 'Manual Gears, Shafts' },
  { value: 3, label: 'Planetary Style' },
] as const;

export function PMIWorksheet({ isOpen, onClose, onApply, type }: PMIWorksheetProps) {
  // ============ Engine PMI inputs (VB6: POLAREC.FRM) ============
  const [crankWeight, setCrankWeight] = useState(50);        // lbs - bare crankshaft weight
  const [crankStroke, setCrankStroke] = useState(3.75);      // inches - crankshaft stroke
  const [flywheelWeight, setFlywheelWeight] = useState(25);  // lbs - flywheel + clutch weight
  const [flywheelDia, setFlywheelDia] = useState(11);        // inches - flywheel diameter
  
  // ============ Trans PMI inputs (VB6: POLARTC.FRM) ============
  const [transType, setTransType] = useState(1);             // 1=Powerglide, 2=TH400, 3=TH350
  const [transWeight, setTransWeight] = useState(100);       // lbs - transmission weight
  const [caseDia, setCaseDia] = useState(10);                // inches - case diameter
  
  // ============ Tires PMI inputs (VB6: POLARTW.FRM) ============
  const [tireWeight, setTireWeight] = useState(25);          // lbs - single tire weight
  const [wsTireDia, setWsTireDia] = useState(28);            // inches - tire diameter
  const [wheelWeight, setWheelWeight] = useState(20);        // lbs - single wheel weight
  const [wheelDia, setWheelDia] = useState(15);              // inches - wheel diameter

  // ============ VB6 EXACT FORMULAS ============
  
  // Engine PMI Formula (VB6: POLAREC.FRM CalcPMI)
  // Work = 0.5 * CrankWt * Stroke^2 + (0.5 * FlywheelWt * (FlywheelDia/2)^2) / PDRatio
  // PMI = 1.333 * Work / 386
  const calcEnginePMI = () => {
    const PDRatio = 1; // Primary drive ratio (1 for cars, gc_Primary for motorcycles)
    let work = 0.5 * crankWeight * Math.pow(crankStroke, 2);
    work = work + (0.5 * flywheelWeight * Math.pow(flywheelDia / 2, 2)) / PDRatio;
    work = work / 386;
    return Math.round(1.333 * work * 100) / 100; // Round to 2 decimals
  };
  
  // Trans PMI Formula (VB6: POLARTC.FRM CalcPMI)
  const calcTransPMI = () => {
    let work = 0;
    switch (transType) {
      case 1: // Powerglide / Lenco
        work = 0.49 * ((0.33 * transWeight) * Math.pow(0.92 * caseDia / 2, 2)) / 386;
        break;
      case 2: // TH400 / C6 / 4L80E
        work = 0.45 * ((0.55 * transWeight) * Math.pow(0.46 * caseDia / 2, 2)) / 386;
        break;
      case 3: // TH350 / C4 / 700R4
        work = 0.49 * ((0.31 * transWeight) * Math.pow(0.92 * caseDia / 2, 2)) / 386;
        break;
    }
    return Math.round(work * 1000) / 1000; // Round to 3 decimals
  };
  
  // Tires PMI Formula (VB6: POLARTW.FRM CalcPMI)
  // Work = ntires * (0.8 * TireWt * (TireDia/2)^2 + 0.75 * WheelWt * (0.93 * WheelDia/2)^2) / 386
  // PMI = 1.15 * Work
  const calcTiresPMI = () => {
    const ntires = 2; // Number of drive tires (2 for cars, 1 for motorcycles)
    let work = ntires * (0.8 * tireWeight * Math.pow(wsTireDia / 2, 2) + 
               0.75 * wheelWeight * Math.pow(0.93 * wheelDia / 2, 2)) / 386;
    work = 1.15 * work; // Account for misc rear end and front wheel parts
    return Math.round(work * 10) / 10; // Round to 1 decimal
  };

  const enginePMI = calcEnginePMI();
  const transPMI = calcTransPMI();
  const tiresPMI = calcTiresPMI();

  const currentValue = type === 'engine' ? enginePMI : type === 'trans' ? transPMI : tiresPMI;
  const currentLabel = type === 'engine' ? 'Engine + Flywheel PMI' : type === 'trans' ? 'Trans + Driveshaft PMI' : 'Tires + Wheels PMI';

  return (
    <WorksheetModal
      isOpen={isOpen}
      onClose={onClose}
      onApply={() => onApply({ engine: enginePMI, trans: transPMI, tires: tiresPMI })}
      title={`${currentLabel} Worksheet`}
      calculatedValue={currentValue}
      calculatedLabel={currentLabel}
      unit=""
      helpText="Polar Moment of Inertia affects how quickly the drivetrain can accelerate. Higher PMI means more rotational mass to spin up."
    >
      {type === 'engine' && (
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <div>
            <label className="label">Crankshaft Weight (lbs)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={crankWeight}
              onChange={(e) => setCrankWeight(parseFloat(e.target.value) || 0)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Bare crankshaft weight (40-65 lbs typical)
            </div>
          </div>
          <div>
            <label className="label">Crankshaft Stroke (inches)</label>
            <input
              type="number"
              step="0.001"
              className="input"
              value={crankStroke}
              onChange={(e) => setCrankStroke(parseFloat(e.target.value) || 0)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Engine crankshaft stroke (3.0-4.5" typical)
            </div>
          </div>
          <div>
            <label className="label">Flywheel + Clutch Weight (lbs)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={flywheelWeight}
              onChange={(e) => setFlywheelWeight(parseFloat(e.target.value) || 0)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Combined flywheel and clutch assembly weight
            </div>
          </div>
          <div>
            <label className="label">Flywheel Diameter (inches)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={flywheelDia}
              onChange={(e) => setFlywheelDia(parseFloat(e.target.value) || 0)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Flywheel outer diameter
            </div>
          </div>
        </div>
      )}
      {type === 'trans' && (
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <div>
            <label className="label">Transmission Type</label>
            <select
              className="input"
              value={transType}
              onChange={(e) => setTransType(parseInt(e.target.value))}
            >
              {TRANS_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Transmission Weight (lbs)</label>
            <input
              type="number"
              step="1"
              className="input"
              value={transWeight}
              onChange={(e) => setTransWeight(parseFloat(e.target.value) || 0)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Total transmission weight with fluid
            </div>
          </div>
          <div>
            <label className="label">Case Diameter (inches)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={caseDia}
              onChange={(e) => setCaseDia(parseFloat(e.target.value) || 0)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Transmission case outer diameter
            </div>
          </div>
        </div>
      )}
      {type === 'tires' && (
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <div>
            <label className="label">Tire Weight (lbs each)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={tireWeight}
              onChange={(e) => setTireWeight(parseFloat(e.target.value) || 0)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Weight of a single rear tire
            </div>
          </div>
          <div>
            <label className="label">Tire Diameter (inches)</label>
            <input
              type="number"
              step="0.5"
              className="input"
              value={wsTireDia}
              onChange={(e) => setWsTireDia(parseFloat(e.target.value) || 0)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Rear tire diameter (unloaded)
            </div>
          </div>
          <div>
            <label className="label">Wheel Weight (lbs each)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={wheelWeight}
              onChange={(e) => setWheelWeight(parseFloat(e.target.value) || 0)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Weight of a single rear wheel
            </div>
          </div>
          <div>
            <label className="label">Wheel Diameter (inches)</label>
            <input
              type="number"
              step="0.5"
              className="input"
              value={wheelDia}
              onChange={(e) => setWheelDia(parseFloat(e.target.value) || 0)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Rear wheel rim diameter
            </div>
          </div>
        </div>
      )}
    </WorksheetModal>
  );
}

/**
 * Drag Coefficient Help Dialog - VB6 EXACT (dragcoef.frm)
 * Shows sample drag coefficient data from Bosch Automotive Handbook and drag race vehicles
 */
interface DragCoefHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DragCoefHelp({ isOpen, onClose }: DragCoefHelpProps) {
  if (!isOpen) return null;
  
  const boschData = [
    { style: 'Open Convertible', cd: '0.5 - 0.7' },
    { style: 'Station Wagon / Van', cd: '0.5 - 0.6' },
    { style: 'Notchback / Sedan', cd: '0.4 - 0.55' },
    { style: 'Fastback styles', cd: '0.3 - 0.4' },
    { style: 'Streamlined / Fairings', cd: '0.2 - 0.25' },
    { style: 'K-shape (Prof. Kamm)', cd: '0.23' },
    { style: 'Optimum streamliner', cd: '0.15 - 0.2' },
    { style: 'Motorcycles', cd: '0.6 - 0.7' },
    { style: 'Trucks', cd: '0.8 - 1.5' },
    { style: 'Buses', cd: '0.6 - 0.7' },
  ];
  
  const dragRaceData = [
    { style: 'Top Fuel Dragster', cd: '0.7' },
    { style: 'Nitro Funny Car', cd: '0.5' },
    { style: 'Modern Pro Stock', cd: '0.3' },
    { style: 'Alcohol Funny Car', cd: '0.35' },
    { style: 'Comp Dragster', cd: '0.55' },
    { style: 'Typical Roadster', cd: '0.55' },
    { style: 'Typical Bodied Car', cd: '0.4' },
    { style: 'Pro Stock Bike', cd: '0.5' },
  ];
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
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
          maxWidth: '550px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Help for Drag Coefficient</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0 8px' }}>×</button>
        </div>
        
        {/* Bosch Data */}
        <div style={{ marginBottom: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: 'var(--space-2)' }}>
          <div style={{ fontWeight: 600, marginBottom: 'var(--space-2)', fontSize: '0.9rem' }}>
            Sample Data from Bosch Automotive Handbook
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 600, textDecoration: 'underline' }}>Body Style</div>
            <div style={{ fontWeight: 600, textDecoration: 'underline' }}>Cd</div>
            {boschData.map((row, i) => (
              <React.Fragment key={i}>
                <div>{row.style}</div>
                <div style={{ textAlign: 'right' }}>{row.cd}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Drag Race Data */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: 'var(--space-2)' }}>
          <div style={{ fontWeight: 600, marginBottom: 'var(--space-2)', fontSize: '0.9rem' }}>
            Sample Data from Drag Race Vehicles
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 600, textDecoration: 'underline' }}>Body Style</div>
            <div style={{ fontWeight: 600, textDecoration: 'underline' }}>Cd</div>
            {dragRaceData.map((row, i) => (
              <React.Fragment key={i}>
                <div>{row.style}</div>
                <div style={{ textAlign: 'right' }}>{row.cd}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-3)' }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
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

/**
 * Vehicle Rollout Worksheet
 * Helps users set the staging rollout distance (distance vehicle moves before timing starts)
 * VB6: Rollout is typically 10-14 inches, measured from staging beam to front tire
 */
interface VehicleRolloutWorksheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: number) => void;
  currentValue?: number;
}

export function VehicleRolloutWorksheet({ isOpen, onClose, onApply, currentValue = 12 }: VehicleRolloutWorksheetProps) {
  const [rollout, setRollout] = useState(currentValue);

  useEffect(() => {
    setRollout(currentValue);
  }, [currentValue]);

  // Common rollout presets
  const presets = [
    { label: 'Shallow (10")', value: 10, desc: 'Faster reaction, less margin' },
    { label: 'Standard (12")', value: 12, desc: 'Typical staging depth' },
    { label: 'Deep (14")', value: 14, desc: 'More margin, slower start' },
  ];

  return (
    <WorksheetModal
      isOpen={isOpen}
      onClose={onClose}
      onApply={() => onApply(rollout)}
      title="Vehicle Rollout Worksheet"
      calculatedValue={rollout}
      calculatedLabel="Staging Rollout"
      unit="inches"
      helpText="Rollout is the distance your vehicle moves before the timing clock starts. Measured from the staging beam to the front of your front tire. Typically 10-14 inches."
    >
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        <div>
          <label className="label">Rollout Distance (inches)</label>
          <input
            type="number"
            step="0.5"
            min="0"
            max="48"
            className="input"
            value={rollout}
            onChange={(e) => setRollout(parseFloat(e.target.value) || 0)}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Distance from staging beam to front of front tire
          </div>
        </div>

        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
            Common Presets:
          </div>
          {presets.map(preset => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setRollout(preset.value)}
              style={{
                padding: 'var(--space-2)',
                border: `2px solid ${rollout === preset.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: '6px',
                backgroundColor: rollout === preset.value ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                color: 'var(--color-text)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 500 }}>{preset.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{preset.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ 
          padding: 'var(--space-3)', 
          backgroundColor: 'var(--color-surface-alt)', 
          borderRadius: '6px',
          fontSize: '0.8rem',
        }}>
          <strong>How to measure:</strong> Stage your car normally, then measure from the staging light beam 
          to the front edge of your front tire. This is your rollout distance.
        </div>
      </div>
    </WorksheetModal>
  );
}

// RolloutWorksheet now refers to VehicleRolloutWorksheet (staging distance)
export const RolloutWorksheet = VehicleRolloutWorksheet;
