import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import Page from '../shared/components/Page';
import {
  simulateEnginePro,
  createDefaultEngineProConfig,
  calcDisplacement,
  type EngineProConfig,
  type EngineProResult,
  type CamshaftType,
  type FuelType,
  type IntakeManifoldType,
  type EngineLayout,
} from '../domain/physics/engine/engineProSim';

// ============================================================================
// Component
// ============================================================================

export default function EngineProSim() {
  // Engine configuration state
  const [config, setConfig] = useState<EngineProConfig>(createDefaultEngineProConfig());
  
  // Calculate displacement
  const displacement = useMemo(() => 
    calcDisplacement(config.bore_in, config.stroke_in, config.numCylinders),
    [config.bore_in, config.stroke_in, config.numCylinders]
  );
  
  // Run simulation
  const result: EngineProResult = useMemo(() => 
    simulateEnginePro(config),
    [config]
  );
  
  // Chart data
  const chartData = useMemo(() => 
    result.dynoCurve.map(p => ({
      rpm: p.rpm,
      hp: p.hp,
      torque: p.torque_lbft,
    })),
    [result]
  );
  
  // Update config helper
  const updateConfig = (updates: Partial<EngineProConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return (
    <Page title="ENGINE Pro Simulator">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Inputs */}
        <div className="space-y-4">
          {/* Engine Design Data */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Engine Design Data</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Cylinders</label>
                <select
                  value={config.numCylinders}
                  onChange={e => updateConfig({ numCylinders: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                >
                  <option value={4}>4</option>
                  <option value={6}>6</option>
                  <option value={8}>8</option>
                  <option value={10}>10</option>
                  <option value={12}>12</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Layout</label>
                <select
                  value={config.layout}
                  onChange={e => updateConfig({ layout: e.target.value as EngineLayout })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                >
                  <option value="inline">Inline</option>
                  <option value="vee">Vee</option>
                  <option value="flat">Flat/Opposed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Bore (in)</label>
                <input
                  type="number"
                  step="0.01"
                  value={config.bore_in}
                  onChange={e => updateConfig({ bore_in: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Stroke (in)</label>
                <input
                  type="number"
                  step="0.01"
                  value={config.stroke_in}
                  onChange={e => updateConfig({ stroke_in: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Rod Length (in)</label>
                <input
                  type="number"
                  step="0.01"
                  value={config.rodLength_in}
                  onChange={e => updateConfig({ rodLength_in: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Compression</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.compressionRatio}
                  onChange={e => updateConfig({ compressionRatio: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
            </div>
            <div className="mt-3 text-center">
              <span className="text-gray-400">Displacement: </span>
              <span className="text-white font-semibold">{displacement.toFixed(1)} ci</span>
              <span className="text-gray-500 ml-2">({(displacement * 0.01639).toFixed(1)} L)</span>
            </div>
          </div>
          
          {/* Camshaft */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Camshaft</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Camshaft Type</label>
                <select
                  value={config.camshaftType}
                  onChange={e => updateConfig({ camshaftType: e.target.value as CamshaftType })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                >
                  <option value="overhead_cam">Overhead Cam</option>
                  <option value="roller">Roller Cam & Lifter</option>
                  <option value="mushroom_tappet">Mushroom Tappet</option>
                  <option value="high_rate_flat_tappet">High Rate-of-Lift Flat Tappet</option>
                  <option value="normal_flat_tappet">Normal Flat Tappet</option>
                  <option value="hydraulic_roller">Hydraulic Roller</option>
                  <option value="hydraulic_flat_tappet">Hydraulic Flat Tappet</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Intake Duration @.050" (deg)</label>
                <input
                  type="number"
                  value={config.intakeDuration050_deg}
                  onChange={e => updateConfig({ intakeDuration050_deg: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
            </div>
          </div>
          
          {/* Induction System */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Induction System</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Throttle CFM @1.5"Hg</label>
                <input
                  type="number"
                  value={config.throttleCFM_at_1_5inHg}
                  onChange={e => updateConfig({ throttleCFM_at_1_5inHg: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Fuel System</label>
                <select
                  value={config.isEFI ? 'efi' : 'carb'}
                  onChange={e => updateConfig({ isEFI: e.target.value === 'efi' })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                >
                  <option value="carb">Carburetor</option>
                  <option value="efi">EFI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Fuel Type</label>
                <select
                  value={config.fuelType}
                  onChange={e => updateConfig({ fuelType: e.target.value as FuelType })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                >
                  <option value="gasoline">Gasoline</option>
                  <option value="racing_gasoline">Racing Gasoline</option>
                  <option value="methanol">Methanol</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Manifold Type</label>
                <select
                  value={config.intakeManifoldType}
                  onChange={e => updateConfig({ intakeManifoldType: e.target.value as IntakeManifoldType })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                >
                  <option value="plenum">Plenum (Single Plane)</option>
                  <option value="individual_runner">Individual Runner (IR)</option>
                  <option value="dual_plane_divided">Dual Plane, Divided</option>
                  <option value="dual_plane_slot">Dual Plane w/Slot</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Runner Style</label>
                <select
                  value={config.runnerStyle}
                  onChange={e => updateConfig({ runnerStyle: e.target.value as 'curved' | 'straight' })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                >
                  <option value="curved">Curved</option>
                  <option value="straight">Straight</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Manifold Flow %</label>
                <input
                  type="number"
                  value={config.intakeManifoldFlowFactor_pct}
                  onChange={e => updateConfig({ intakeManifoldFlowFactor_pct: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
            </div>
          </div>
          
          {/* Cylinder Head */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Cylinder Head</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Int Valves/Cyl</label>
                <select
                  value={config.numIntakeValvesPerCyl}
                  onChange={e => updateConfig({ numIntakeValvesPerCyl: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Int Valve Dia (in)</label>
                <input
                  type="number"
                  step="0.01"
                  value={config.intakeValveDia_in}
                  onChange={e => updateConfig({ intakeValveDia_in: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Int Flow (CFM)</label>
                <input
                  type="number"
                  value={config.maxIntakeFlow_cfm}
                  onChange={e => updateConfig({ maxIntakeFlow_cfm: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Test Pressure (inH2O)</label>
                <input
                  type="number"
                  value={config.flowTestPressure_inH2O}
                  onChange={e => updateConfig({ flowTestPressure_inH2O: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Int Lift (in)</label>
                <input
                  type="number"
                  step="0.001"
                  value={config.maxIntakeValveLift_in}
                  onChange={e => updateConfig({ maxIntakeValveLift_in: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Middle & Right Columns - Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Peak Values */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Estimated Engine Performance</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-green-400">{Math.round(result.peakHP)}</div>
                <div className="text-sm text-gray-400">Peak HP</div>
                <div className="text-xs text-gray-500">@ {result.rpmAtPeakHP} RPM</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400">{Math.round(result.peakTorque_lbft)}</div>
                <div className="text-sm text-gray-400">Peak Torque</div>
                <div className="text-xs text-gray-500">@ {result.rpmAtPeakTorque} RPM</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-yellow-400">{result.shiftRPM}</div>
                <div className="text-sm text-gray-400">Shift RPM</div>
                <div className="text-xs text-gray-500">+8% of peak HP</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-400">{result.redlineRPM}</div>
                <div className="text-sm text-gray-400">Redline RPM</div>
                <div className="text-xs text-gray-500">Mechanical limit</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 text-center text-sm">
              <div>
                <span className="text-gray-400">HP/CID: </span>
                <span className="text-white">{result.peakHP_perCID.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-400">Torque/CID: </span>
                <span className="text-white">{result.peakTorque_perCID.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* HP/Torque Chart */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Engine Dyno Data</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="rpm" 
                    stroke="#9CA3AF"
                    tickFormatter={(v) => `${v/1000}k`}
                  />
                  <YAxis 
                    yAxisId="hp" 
                    stroke="#10B981" 
                    domain={[0, 'auto']}
                  />
                  <YAxis 
                    yAxisId="torque" 
                    orientation="right" 
                    stroke="#3B82F6"
                    domain={[0, 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                    labelFormatter={(v) => `${v} RPM`}
                  />
                  <Legend />
                  <ReferenceLine 
                    x={result.rpmAtPeakHP} 
                    yAxisId="hp"
                    stroke="#10B981" 
                    strokeDasharray="3 3" 
                    label={{ value: 'Peak HP', fill: '#10B981', fontSize: 10 }}
                  />
                  <ReferenceLine 
                    x={result.rpmAtPeakTorque} 
                    yAxisId="torque"
                    stroke="#3B82F6" 
                    strokeDasharray="3 3" 
                    label={{ value: 'Peak TQ', fill: '#3B82F6', fontSize: 10 }}
                  />
                  <Line 
                    yAxisId="hp"
                    type="monotone" 
                    dataKey="hp" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={false}
                    name="Horsepower"
                  />
                  <Line 
                    yAxisId="torque"
                    type="monotone" 
                    dataKey="torque" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={false}
                    name="Torque (lb-ft)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Geometric Ratios & Piston Speed */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Geometric Data</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Bore/Stroke Ratio:</span>
                  <span className="text-white">{result.boreToStrokeRatio.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Rod/Stroke Ratio:</span>
                  <span className="text-white">{result.rodToStrokeRatio.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Throat/Bore Area:</span>
                  <span className="text-white">{(result.intakeThroatToBoreAreaRatio * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Lift/Valve Dia:</span>
                  <span className="text-white">{(result.intakeValveLiftToDiaRatio * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Piston Speed (FPM)</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">@ Peak TQ:</span>
                  <span className="text-white">{Math.round(result.avgPistonSpeed_fpm.peakTQ)} avg / {Math.round(result.maxPistonSpeed_fpm.peakTQ)} max</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">@ Peak HP:</span>
                  <span className="text-white">{Math.round(result.avgPistonSpeed_fpm.peakHP)} avg / {Math.round(result.maxPistonSpeed_fpm.peakHP)} max</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">@ Shift:</span>
                  <span className="text-white">{Math.round(result.avgPistonSpeed_fpm.shift)} avg / {Math.round(result.maxPistonSpeed_fpm.shift)} max</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">@ Redline:</span>
                  <span className="text-white">{Math.round(result.avgPistonSpeed_fpm.redline)} avg / {Math.round(result.maxPistonSpeed_fpm.redline)} max</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recommendations */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">ENGINE Pro Recommendations</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="text-yellow-400 font-medium mb-2">Intake System</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Valve Lift:</span>
                    <span className="text-white">{result.recommendations.intakeValveLift_in}"</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Min Flow Area:</span>
                    <span className="text-white">{result.recommendations.minFlowArea_sqin} sq in</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Track Length:</span>
                    <span className="text-white">{result.recommendations.totalIntakeTrackLength_in}"</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Plenum Vol:</span>
                    <span className="text-white">{result.recommendations.plenumVolume_ci} ci</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-yellow-400 font-medium mb-2">Camshaft</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">LSA:</span>
                    <span className="text-white">{result.recommendations.lobeSeparationAngle_deg}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Int CL:</span>
                    <span className="text-white">{result.recommendations.intakeLobeCenterline_deg}° ATDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Exh Dur @.050:</span>
                    <span className="text-white">{result.recommendations.exhaustDuration050_deg}°</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-yellow-400 font-medium mb-2">Exhaust System</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Exh Flow:</span>
                    <span className="text-white">{result.recommendations.exhaustFlow_cfm} CFM ({result.recommendations.exhaustFlow_pctIntake}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Primary Len:</span>
                    <span className="text-white">{result.recommendations.primaryTubeLength_in}"</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Primary Dia:</span>
                    <span className="text-white">{result.recommendations.primaryTubeDia_in}"</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Collector:</span>
                    <span className="text-white">{result.recommendations.collectorDia_in}"</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Dyno Data Table */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Dyno Data Table</h3>
            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800">
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-right px-3 py-1">RPM</th>
                    <th className="text-right px-3 py-1">HP</th>
                    <th className="text-right px-3 py-1">Torque (lb-ft)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.dynoCurve.map((p, i) => (
                    <tr 
                      key={i} 
                      className={`text-white border-b border-gray-700/50 hover:bg-gray-700/30 ${
                        p.rpm === result.rpmAtPeakHP ? 'bg-green-900/30' : 
                        p.rpm === result.rpmAtPeakTorque ? 'bg-blue-900/30' : ''
                      }`}
                    >
                      <td className="text-right px-3 py-1">{p.rpm}</td>
                      <td className="text-right px-3 py-1 text-green-400">{p.hp}</td>
                      <td className="text-right px-3 py-1 text-blue-400">{p.torque_lbft}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
