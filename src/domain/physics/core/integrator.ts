/**
 * Fixed timestep integrator for RSACLASSIC physics engine.
 * Uses semi-implicit Euler method for stability.
 */

/**
 * State of the vehicle at a given timestep.
 */
export interface StepState {
  /** Time in seconds */
  t_s: number;
  
  /** Velocity in feet per second */
  v_fps: number;
  
  /** Position/distance in feet */
  s_ft: number;
  
  /** Engine RPM */
  rpm: number;
  
  /** Current gear index (0-based) */
  gearIdx: number;
  
  /** Accumulated warnings */
  warnings: string[];
}

/**
 * Forces acting on the vehicle at a given timestep.
 */
export interface StepForces {
  /** Tractive force at wheels (lb) */
  tractive_lb: number;
  
  /** Aerodynamic drag force (lb) */
  drag_lb: number;
  
  /** Rolling resistance force (lb) */
  roll_lb: number;
  
  /** Vehicle mass (slugs) */
  mass_slugs: number;
}

/**
 * Perform one integration step using semi-implicit Euler method.
 * 
 * Semi-implicit Euler (symplectic Euler):
 * 1. Update velocity: v(t+dt) = v(t) + a(t) * dt
 * 2. Update position: s(t+dt) = s(t) + v(t+dt) * dt
 * 
 * This method is more stable than explicit Euler for physical simulations.
 * 
 * @param dt_s - Timestep in seconds
 * @param st - Current state
 * @param F - Forces acting on vehicle
 * @returns New state after timestep
 */
export function stepEuler(
  dt_s: number,
  st: StepState,
  F: StepForces
): StepState {
  // Calculate net force: F_net = F_tractive - F_drag - F_roll
  const netForce_lb = F.tractive_lb - F.drag_lb - F.roll_lb;
  
  // Calculate acceleration: a = F / m
  // Using slugs for mass, so acceleration is in ft/s²
  const acceleration_fps2 = netForce_lb / F.mass_slugs;
  
  // Semi-implicit Euler: update velocity first
  const v_new_fps = st.v_fps + acceleration_fps2 * dt_s;
  
  // Then update position using new velocity
  const s_new_ft = st.s_ft + v_new_fps * dt_s;
  
  // Time advances
  const t_new_s = st.t_s + dt_s;
  
  // Copy warnings (will be updated by caller if needed)
  const warnings = [...st.warnings];
  
  // Return new state
  // Note: rpm and gearIdx are not updated here - they're managed by drivetrain logic
  return {
    t_s: t_new_s,
    v_fps: v_new_fps,
    s_ft: s_new_ft,
    rpm: st.rpm,
    gearIdx: st.gearIdx,
    warnings,
  };
}

/**
 * Create initial state for integration.
 */
export function createInitialState(): StepState {
  return {
    t_s: 0,
    v_fps: 0,
    s_ft: 0,
    rpm: 0,
    gearIdx: 0,
    warnings: [],
  };
}
