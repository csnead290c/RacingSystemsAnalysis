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
  simulateEngine,
  createDefaultEngineConfig,
  createDefaultEnv,
  calcDisplacement,
  type EngineConfig,
  type EngineEnv,
  type EngineResult,
} from '../domain/physics/engine/engineSim';

// ============================================================================
// Component
// ============================================================================

export default function EngineSim() {
  // Engine configuration state
  const [config, setConfig] = useState<EngineConfig>(createDefaultEngineConfig());
  const [env, setEnv] = useState<EngineEnv>(createDefaultEnv());
  
  // RPM range
  const [rpmStart, setRpmStart] = useState(2000);
  const [rpmEnd, setRpmEnd] = useState(7500);
  const [rpmStep, setRpmStep] = useState(250);
  
  // Calculate displacement
  const displacement = useMemo(() => 
    config.displacement_ci ?? calcDisplacement(config.bore_in, config.stroke_in, config.numCylinders),
    [config.bore_in, config.stroke_in, config.numCylinders, config.displacement_ci]
  );
  
  // Run simulation
  const result: EngineResult = useMemo(() => 
    simulateEngine(config, env, rpmStart, rpmEnd, rpmStep),
    [config, env, rpmStart, rpmEnd, rpmStep]
  );
  
  // Chart data
  const chartData = useMemo(() => 
    result.points.map(p => ({
      rpm: p.rpm,
      hp: Math.round(p.hp),
      torque: Math.round(p.torque_lbft),
      ve: Math.round(p.ve_pct),
      bmep: Math.round(p.bmep_psi),
    })),
    [result]
  );
  
  // Update config helper
  const updateConfig = (updates: Partial<EngineConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };
  
  // Update env helper
  const updateEnv = (updates: Partial<EngineEnv>) => {
    setEnv(prev => ({ ...prev, ...updates }));
  };

  return (
    <Page title="Engine Simulator">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Inputs */}
        <div className="space-y-4">
          {/* Engine Dimensions */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Engine Dimensions</h3>
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="block text-sm text-gray-400 mb-1">Int Duration @.050</label>
                <input
                  type="number"
                  value={config.intakeDuration_deg}
                  onChange={e => updateConfig({ intakeDuration_deg: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Exh Duration @.050</label>
                <input
                  type="number"
                  value={config.exhaustDuration_deg}
                  onChange={e => updateConfig({ exhaustDuration_deg: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Int Centerline</label>
                <input
                  type="number"
                  value={config.intakeCenterline_deg}
                  onChange={e => updateConfig({ intakeCenterline_deg: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">LSA</label>
                <input
                  type="number"
                  value={config.lsa_deg}
                  onChange={e => updateConfig({ lsa_deg: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Int Lift</label>
                <input
                  type="number"
                  step="0.001"
                  value={config.maxIntakeLift_in}
                  onChange={e => updateConfig({ maxIntakeLift_in: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Exh Lift</label>
                <input
                  type="number"
                  step="0.001"
                  value={config.maxExhaustLift_in}
                  onChange={e => updateConfig({ maxExhaustLift_in: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
            </div>
          </div>
          
          {/* Fuel System */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Fuel System</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Fuel Type</label>
                <select
                  value={config.fuelType}
                  onChange={e => updateConfig({ fuelType: e.target.value as EngineConfig['fuelType'] })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                >
                  <option value="gasoline">Gasoline</option>
                  <option value="methanol">Methanol</option>
                  <option value="e85">E85</option>
                  <option value="nitromethane">Nitromethane</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">A/F Ratio</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.airFuelRatio}
                  onChange={e => updateConfig({ airFuelRatio: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Carb CFM</label>
                <input
                  type="number"
                  value={config.carbCFM || ''}
                  onChange={e => updateConfig({ carbCFM: parseInt(e.target.value) || undefined })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
            </div>
          </div>
          
          {/* Environment */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Environment</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Barometer (inHg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={env.barometer_inHg}
                  onChange={e => updateEnv({ barometer_inHg: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Temperature (°F)</label>
                <input
                  type="number"
                  value={env.temperature_F}
                  onChange={e => updateEnv({ temperature_F: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Humidity (%)</label>
                <input
                  type="number"
                  value={env.humidity_pct}
                  onChange={e => updateEnv({ humidity_pct: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Correction Factor</label>
                <div className="bg-gray-600 text-white px-3 py-2 rounded text-center">
                  {result.correctionFactor.toFixed(3)}
                </div>
              </div>
            </div>
          </div>
          
          {/* RPM Range */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">RPM Range</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Start</label>
                <input
                  type="number"
                  step="500"
                  value={rpmStart}
                  onChange={e => setRpmStart(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">End</label>
                <input
                  type="number"
                  step="500"
                  value={rpmEnd}
                  onChange={e => setRpmEnd(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Step</label>
                <input
                  type="number"
                  step="50"
                  value={rpmStep}
                  onChange={e => setRpmStep(parseInt(e.target.value) || 100)}
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
            <h3 className="text-lg font-semibold text-white mb-3">Peak Values</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-green-400">{Math.round(result.peakHP.hp)}</div>
                <div className="text-sm text-gray-400">HP @ {result.peakHP.rpm} RPM</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400">{Math.round(result.peakTorque.torque_lbft)}</div>
                <div className="text-sm text-gray-400">lb-ft @ {result.peakTorque.rpm} RPM</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-400">{Math.round(result.peakBMEP.bmep_psi)}</div>
                <div className="text-sm text-gray-400">BMEP @ {result.peakBMEP.rpm} RPM</div>
              </div>
            </div>
          </div>
          
          {/* HP/Torque Chart */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Power & Torque</h3>
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
                    x={result.peakHP.rpm} 
                    yAxisId="hp"
                    stroke="#10B981" 
                    strokeDasharray="3 3" 
                  />
                  <ReferenceLine 
                    x={result.peakTorque.rpm} 
                    yAxisId="torque"
                    stroke="#3B82F6" 
                    strokeDasharray="3 3" 
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
          
          {/* VE & BMEP Chart */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Volumetric Efficiency & BMEP</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="rpm" 
                    stroke="#9CA3AF"
                    tickFormatter={(v) => `${v/1000}k`}
                  />
                  <YAxis 
                    yAxisId="ve" 
                    stroke="#F59E0B" 
                    domain={[50, 110]}
                  />
                  <YAxis 
                    yAxisId="bmep" 
                    orientation="right" 
                    stroke="#8B5CF6"
                    domain={[0, 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                    labelFormatter={(v) => `${v} RPM`}
                  />
                  <Legend />
                  <Line 
                    yAxisId="ve"
                    type="monotone" 
                    dataKey="ve" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    dot={false}
                    name="VE (%)"
                  />
                  <Line 
                    yAxisId="bmep"
                    type="monotone" 
                    dataKey="bmep" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={false}
                    name="BMEP (psi)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Data Table */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Simulation Data</h3>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800">
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-right px-2 py-1">RPM</th>
                    <th className="text-right px-2 py-1">HP</th>
                    <th className="text-right px-2 py-1">Torque</th>
                    <th className="text-right px-2 py-1">VE %</th>
                    <th className="text-right px-2 py-1">BMEP</th>
                    <th className="text-right px-2 py-1">CFM</th>
                    <th className="text-right px-2 py-1">BSFC</th>
                  </tr>
                </thead>
                <tbody>
                  {result.points.map((p, i) => (
                    <tr key={i} className="text-white border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="text-right px-2 py-1">{p.rpm}</td>
                      <td className="text-right px-2 py-1 text-green-400">{p.hp.toFixed(0)}</td>
                      <td className="text-right px-2 py-1 text-blue-400">{p.torque_lbft.toFixed(0)}</td>
                      <td className="text-right px-2 py-1 text-yellow-400">{p.ve_pct.toFixed(1)}</td>
                      <td className="text-right px-2 py-1 text-purple-400">{p.bmep_psi.toFixed(0)}</td>
                      <td className="text-right px-2 py-1">{p.airflow_cfm.toFixed(0)}</td>
                      <td className="text-right px-2 py-1">{p.bsfc.toFixed(3)}</td>
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
