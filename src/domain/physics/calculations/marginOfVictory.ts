/**
 * Margin of Victory Calculator
 * Calculates finish line outcomes for bracket racing
 */

export interface RacerData {
  dialIn: number;      // Dial-in time in seconds
  reactionTime: number; // Reaction time in seconds
  et: number;          // Elapsed time in seconds
}

export interface MOVResult {
  winner: 'racer1' | 'racer2';
  marginSeconds: number;
  marginFeet: number;
  marginInches: number;
  racer1Breakout: boolean;
  racer2Breakout: boolean;
  racer1FinishTime: number;  // Total time from green light
  racer2FinishTime: number;
}

/**
 * Calculate Margin of Victory
 * 
 * In bracket racing:
 * - Each racer dials in their predicted ET
 * - The slower dial-in gets a head start equal to the difference
 * - Winner is first to the finish line (RT + ET - dialIn advantage)
 * - Breakout (running faster than dial-in) = automatic loss
 */
export function calculateMOV(racer1: RacerData, racer2: RacerData): MOVResult {
  // Check for breakouts
  const racer1Breakout = racer1.et < racer1.dialIn;
  const racer2Breakout = racer2.et < racer2.dialIn;
  
  // Calculate head start (difference in dial-ins)
  // Slower dial-in leaves first
  const dialDifference = Math.abs(racer1.dialIn - racer2.dialIn);
  const racer1LeavesFirst = racer1.dialIn > racer2.dialIn;
  
  // Calculate finish times from when the first racer's tree goes green
  // The racer with higher dial-in leaves first
  let racer1FinishTime: number;
  let racer2FinishTime: number;
  
  if (racer1LeavesFirst) {
    // Racer 1 leaves first, Racer 2 waits for handicap
    racer1FinishTime = racer1.reactionTime + racer1.et;
    racer2FinishTime = dialDifference + racer2.reactionTime + racer2.et;
  } else {
    // Racer 2 leaves first, Racer 1 waits for handicap
    racer1FinishTime = dialDifference + racer1.reactionTime + racer1.et;
    racer2FinishTime = racer2.reactionTime + racer2.et;
  }
  
  // Determine winner (accounting for breakouts)
  let winner: 'racer1' | 'racer2';
  
  if (racer1Breakout && racer2Breakout) {
    // Both broke out - worse breakout loses
    const racer1BreakoutAmount = racer1.dialIn - racer1.et;
    const racer2BreakoutAmount = racer2.dialIn - racer2.et;
    winner = racer1BreakoutAmount < racer2BreakoutAmount ? 'racer1' : 'racer2';
  } else if (racer1Breakout) {
    winner = 'racer2';
  } else if (racer2Breakout) {
    winner = 'racer1';
  } else {
    // No breakouts - first to finish wins
    winner = racer1FinishTime < racer2FinishTime ? 'racer1' : 'racer2';
  }
  
  // Calculate margin
  const marginSeconds = Math.abs(racer1FinishTime - racer2FinishTime);
  
  // Convert to distance (approximate speed at finish line for 1/4 mile)
  // Using average finish speed of ~120 mph = 176 ft/sec
  const avgFinishSpeedFtPerSec = 176;
  const marginFeet = marginSeconds * avgFinishSpeedFtPerSec;
  const marginInches = marginFeet * 12;
  
  return {
    winner,
    marginSeconds,
    marginFeet,
    marginInches,
    racer1Breakout,
    racer2Breakout,
    racer1FinishTime,
    racer2FinishTime,
  };
}

/**
 * Calculate MOV with actual finish line speed for more accurate distance
 */
export function calculateMOVWithSpeed(
  racer1: RacerData & { mph: number },
  racer2: RacerData & { mph: number }
): MOVResult {
  const baseResult = calculateMOV(racer1, racer2);
  
  // Use winner's MPH for more accurate distance calculation
  const winnerMPH = baseResult.winner === 'racer1' ? racer1.mph : racer2.mph;
  const speedFtPerSec = (winnerMPH * 5280) / 3600;
  
  const marginFeet = baseResult.marginSeconds * speedFtPerSec;
  const marginInches = marginFeet * 12;
  
  return {
    ...baseResult,
    marginFeet,
    marginInches,
  };
}

/**
 * Format MOV for display
 */
export function formatMOV(mov: MOVResult): string {
  if (mov.marginInches < 12) {
    return `${mov.marginInches.toFixed(1)} inches`;
  } else if (mov.marginFeet < 10) {
    return `${mov.marginFeet.toFixed(2)} feet`;
  } else {
    return `${mov.marginFeet.toFixed(1)} feet`;
  }
}

/**
 * Describe the race outcome
 */
export function describeRaceOutcome(mov: MOVResult, racer1Name: string, racer2Name: string): string {
  const winner = mov.winner === 'racer1' ? racer1Name : racer2Name;
  const loser = mov.winner === 'racer1' ? racer2Name : racer1Name;
  const loserBreakout = mov.winner === 'racer1' ? mov.racer2Breakout : mov.racer1Breakout;
  const winnerBreakout = mov.winner === 'racer1' ? mov.racer1Breakout : mov.racer2Breakout;
  
  if (loserBreakout && !winnerBreakout) {
    return `${winner} wins - ${loser} broke out`;
  } else if (mov.racer1Breakout && mov.racer2Breakout) {
    return `${winner} wins - both broke out, ${loser} broke out worse`;
  } else {
    return `${winner} wins by ${formatMOV(mov)}`;
  }
}
