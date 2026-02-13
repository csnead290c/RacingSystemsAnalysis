/**
 * VB6 Step-Level Trace Capture
 * 
 * Captures physics state at every integration step for comparison with VB6.
 * Schema matches VB6 TraceLog.bas exactly.
 */

export interface VB6StepTrace {
  case_id: string;
  step: number;
  time_abs_s: number;
  time_et_s: number;
  dt_s: number;
  dist_abs_ft: number;
  dist_track_ft: number;
  vel_fps: number;
  accel_fps2: number;
  jerk_fps3: number;
  gear: number;
  engine_rpm: number;
  driveshaft_rpm: number;
  engine_tq: number;
  engine_hp: number;
  clutch_slip: number;
  converter_slip: number;
  torque_mult: number;
  tire_force_lbf: number;
  traction_limit_lbf: number;
  is_traction_limited: number;
  drag_lbf: number;
  roll_res_lbf: number;
  grade_lbf: number;
  trigger_fired: string;
  net_force_lbf: number;
}

export class VB6StepTracer {
  private traces: VB6StepTrace[] = [];
  private enabled: boolean = false;
  private _caseId: string = '';
  
  constructor(enabled: boolean = false, caseId: string = '') {
    this.enabled = enabled;
    this._caseId = caseId;
  }
  
  getCaseId(): string {
    return this._caseId;
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }
  
  addStep(trace: VB6StepTrace): void {
    if (this.enabled) {
      this.traces.push(trace);
    }
  }
  
  getTraces(): VB6StepTrace[] {
    return this.traces;
  }
  
  clear(): void {
    this.traces = [];
  }
  
  /**
   * Format traces as CSV matching VB6 schema
   */
  toCSV(): string {
    const header = [
      'case_id', 'step', 'time_abs_s', 'time_et_s', 'dt_s',
      'dist_abs_ft', 'dist_track_ft', 'vel_fps', 'accel_fps2', 'jerk_fps3',
      'gear', 'engine_rpm', 'driveshaft_rpm',
      'engine_tq', 'engine_hp',
      'clutch_slip', 'converter_slip', 'torque_mult',
      'tire_force_lbf', 'traction_limit_lbf', 'is_traction_limited',
      'drag_lbf', 'roll_res_lbf', 'grade_lbf', 'net_force_lbf',
      'trigger_fired',
    ].join(',');
    
    const rows = this.traces.map(t => [
      t.case_id,
      t.step,
      t.time_abs_s.toFixed(6),
      t.time_et_s.toFixed(6),
      t.dt_s.toFixed(6),
      t.dist_abs_ft.toFixed(4),
      t.dist_track_ft.toFixed(4),
      t.vel_fps.toFixed(4),
      t.accel_fps2.toFixed(4),
      t.jerk_fps3.toFixed(4),
      t.gear,
      t.engine_rpm.toFixed(1),
      t.driveshaft_rpm.toFixed(1),
      t.engine_tq.toFixed(2),
      t.engine_hp.toFixed(2),
      t.clutch_slip.toFixed(4),
      t.converter_slip.toFixed(4),
      t.torque_mult.toFixed(4),
      t.tire_force_lbf.toFixed(2),
      t.traction_limit_lbf.toFixed(2),
      t.is_traction_limited,
      t.drag_lbf.toFixed(2),
      t.roll_res_lbf.toFixed(2),
      t.grade_lbf.toFixed(2),
      t.net_force_lbf.toFixed(2),
      t.trigger_fired || '',
    ].join(','));
    
    return [header, ...rows].join('\n') + '\n';
  }
}

// Global tracer instance (can be enabled via environment variable)
let globalTracer: VB6StepTracer | null = null;

export function enableStepTracing(caseId: string): VB6StepTracer {
  globalTracer = new VB6StepTracer(true, caseId);
  return globalTracer;
}

export function disableStepTracing(): void {
  globalTracer = null;
}

export function getGlobalTracer(): VB6StepTracer | null {
  return globalTracer;
}
