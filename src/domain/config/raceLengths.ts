/**
 * Race distance configurations
 * 
 * Drag Racing:
 * - EIGHTH: 1/8 mile (660 ft)
 * - QUARTER: 1/4 mile (1320 ft)
 * 
 * Land Speed Racing (Bonneville/El Mirage):
 * - ONE_MILE: One mile course (5280 ft)
 * - EL_MIRAGE: El Mirage dry lake (1.3 miles, 6864 ft)
 * - MUROC: Muroc dry lake / Edwards AFB (1.5 miles, 7920 ft)
 * - TWO_MILE: Two mile course (10560 ft)
 * - BONNEVILLE_SHORT: Bonneville 3 mile course (15840 ft)
 * - BONNEVILLE_LONG: Bonneville 5 mile course (26400 ft)
 * - TEN_MILE: Ten mile test track (52800 ft)
 */
export const DISTANCES = {
  // Drag racing
  EIGHTH: [60, 330, 660] as const,
  THOUSAND: [60, 330, 660, 1000] as const,
  QUARTER: [60, 330, 660, 1000, 1320] as const,
  
  // Land speed racing - checkpoints at 1/4 mile intervals + terminal
  ONE_MILE: [660, 1320, 2640, 3960, 5280] as const,
  EL_MIRAGE: [660, 1320, 2640, 3960, 5280, 6864] as const,
  MUROC: [660, 1320, 2640, 3960, 5280, 6600, 7920] as const,
  TWO_MILE: [660, 1320, 2640, 5280, 7920, 10560] as const,
  BONNEVILLE_SHORT: [660, 1320, 2640, 5280, 10560, 15840] as const,
  BONNEVILLE_LONG: [660, 1320, 2640, 5280, 10560, 15840, 21120, 26400] as const,
  TEN_MILE: [660, 1320, 2640, 5280, 10560, 26400, 52800] as const,
};

export type RaceLength = keyof typeof DISTANCES;

/**
 * Race length metadata for UI display
 */
export const RACE_LENGTH_INFO: Record<RaceLength, { 
  label: string; 
  shortLabel: string;
  category: 'drag' | 'landspeed';
  lengthFt: number;
  lengthMiles: number;
}> = {
  EIGHTH: { 
    label: '1/8 Mile', 
    shortLabel: '1/8',
    category: 'drag',
    lengthFt: 660,
    lengthMiles: 0.125,
  },
  THOUSAND: { 
    label: '1000 Foot', 
    shortLabel: '1000\'',
    category: 'drag',
    lengthFt: 1000,
    lengthMiles: 0.189,
  },
  QUARTER: { 
    label: '1/4 Mile', 
    shortLabel: '1/4',
    category: 'drag',
    lengthFt: 1320,
    lengthMiles: 0.25,
  },
  ONE_MILE: { 
    label: 'One Mile Asphalt', 
    shortLabel: '1 Mi',
    category: 'landspeed',
    lengthFt: 5280,
    lengthMiles: 1,
  },
  EL_MIRAGE: { 
    label: 'El Mirage Dry Lake', 
    shortLabel: 'El Mirage',
    category: 'landspeed',
    lengthFt: 6864,
    lengthMiles: 1.3,
  },
  MUROC: { 
    label: 'Muroc Dry Lake (EAFB)', 
    shortLabel: 'Muroc',
    category: 'landspeed',
    lengthFt: 7920,
    lengthMiles: 1.5,
  },
  TWO_MILE: { 
    label: 'Two Mile Asphalt', 
    shortLabel: '2 Mi',
    category: 'landspeed',
    lengthFt: 10560,
    lengthMiles: 2,
  },
  BONNEVILLE_SHORT: { 
    label: 'Bonneville - 3 Miles', 
    shortLabel: 'BV 3Mi',
    category: 'landspeed',
    lengthFt: 15840,
    lengthMiles: 3,
  },
  BONNEVILLE_LONG: { 
    label: 'Bonneville - 5 Miles', 
    shortLabel: 'BV 5Mi',
    category: 'landspeed',
    lengthFt: 26400,
    lengthMiles: 5,
  },
  TEN_MILE: { 
    label: 'Ten Mile Test Track', 
    shortLabel: '10 Mi',
    category: 'landspeed',
    lengthFt: 52800,
    lengthMiles: 10,
  },
};

/**
 * VB6 Bonneville Pro DistToPrint(2..9) — the mile-marker checkpoints used in
 * the printed report and the timeslip panel.  DistToPrint(1) is rollout and is
 * skipped for display purposes.
 *
 * Source: QCommon/TIMESLIP.FRM lines 820–856 (Select Case gc_Track.Value).
 * Each track variant defines DistToPrint(1..9).  Index 1 is rollout; indices
 * 2–9 are the report checkpoints.
 */
const LAND_SPEED_CHECKPOINTS: Record<string, { label: string; dist_ft: number }[]> = {
  ONE_MILE: [
    { label: '0.13', dist_ft: 660 },
    { label: '0.25', dist_ft: 1320 },
    { label: '0.38', dist_ft: 1980 },
    { label: '0.50', dist_ft: 2640 },
    { label: '0.63', dist_ft: 3300 },
    { label: '0.75', dist_ft: 3960 },
    { label: '0.88', dist_ft: 4620 },
    { label: '1.00', dist_ft: 5280 },
  ],
  EL_MIRAGE: [
    { label: '0.13', dist_ft: 660 },
    { label: '0.25', dist_ft: 1320 },
    { label: '0.50', dist_ft: 2640 },
    { label: '0.75', dist_ft: 3960 },
    { label: '1.00', dist_ft: 5280 },
    { label: '1.10', dist_ft: 5808 },
    { label: '1.20', dist_ft: 6336 },
    { label: '1.30', dist_ft: 6864 },
  ],
  MUROC: [
    { label: '0.13', dist_ft: 660 },
    { label: '0.25', dist_ft: 1320 },
    { label: '0.50', dist_ft: 2640 },
    { label: '0.75', dist_ft: 3960 },
    { label: '1.00', dist_ft: 5280 },
    { label: '1.25', dist_ft: 6600 },
    { label: '1.38', dist_ft: 7260 },
    { label: '1.50', dist_ft: 7920 },
  ],
  TWO_MILE: [
    { label: '0.13', dist_ft: 660 },
    { label: '0.25', dist_ft: 1320 },
    { label: '0.50', dist_ft: 2640 },
    { label: '1.00', dist_ft: 5280 },
    { label: '1.25', dist_ft: 6600 },
    { label: '1.50', dist_ft: 7920 },
    { label: '1.75', dist_ft: 9240 },
    { label: '2.00', dist_ft: 10560 },
  ],
  BONNEVILLE_SHORT: [
    { label: '0.50', dist_ft: 2640 },
    { label: '1 mi',  dist_ft: 5280 },
    { label: '1.50', dist_ft: 7920 },
    { label: '2 mi',  dist_ft: 10560 },
    { label: '2.25', dist_ft: 11880 },
    { label: '2.50', dist_ft: 13200 },
    { label: '2.75', dist_ft: 14520 },
    { label: '3 mi',  dist_ft: 15840 },
  ],
  BONNEVILLE_LONG: [
    { label: '1 mi',  dist_ft: 5280 },
    { label: '2 mi',  dist_ft: 10560 },
    { label: '2.5',   dist_ft: 13200 },
    { label: '3 mi',  dist_ft: 15840 },
    { label: '3.5',   dist_ft: 18480 },
    { label: '4 mi',  dist_ft: 21120 },
    { label: '4.5',   dist_ft: 23760 },
    { label: '5 mi',  dist_ft: 26400 },
  ],
  TEN_MILE: [
    { label: '1 mi',  dist_ft: 5280 },
    { label: '2 mi',  dist_ft: 10560 },
    { label: '4 mi',  dist_ft: 21120 },
    { label: '6 mi',  dist_ft: 31680 },
    { label: '7 mi',  dist_ft: 36960 },
    { label: '8 mi',  dist_ft: 42240 },
    { label: '9 mi',  dist_ft: 47520 },
    { label: '10 mi', dist_ft: 52800 },
  ],
};

/**
 * Get the land speed checkpoint list for a given race length.
 * Returns VB6 DistToPrint(2..9) entries with labels and distances.
 * Returns undefined for drag race lengths.
 */
export function getLandSpeedCheckpoints(raceLength: RaceLength): { label: string; dist_ft: number }[] | undefined {
  return LAND_SPEED_CHECKPOINTS[raceLength];
}

/**
 * Get distance markers for graph vertical reference lines.
 *
 * - Drag: standard drag incrementals (60, 330, 660, 1000, 1320 ft).
 * - Land speed: VB6 DistToPrint(2..9) mile-marker distances.
 *
 * These are the same distances shown in the printed report checkpoint table,
 * matching VB6 behavior where graph markers align with report checkpoints.
 */
export function getDistanceMarkers(raceLength: RaceLength): number[] {
  const info = RACE_LENGTH_INFO[raceLength];
  if (!info) return [60, 330, 660, 1000, 1320];

  if (info.category === 'landspeed') {
    const checkpoints = LAND_SPEED_CHECKPOINTS[raceLength];
    return checkpoints ? checkpoints.map(c => c.dist_ft) : [];
  }

  // Drag: use standard incrementals up to race length
  const dragMarkers = [60, 330, 660, 1000, 1320];
  return dragMarkers.filter(d => d <= info.lengthFt);
}

/**
 * Get traction index range for a track type
 * From VB6 BVPro Traction.frm
 */
export function getTractionIndexForTrack(raceLength: RaceLength): { typical: number; range: [number, number] } {
  switch (raceLength) {
    case 'EIGHTH':
    case 'QUARTER':
      return { typical: 1, range: [1, 5] };  // Best asphalt to best salt
    case 'ONE_MILE':
    case 'TWO_MILE':
    case 'TEN_MILE':
      return { typical: 3, range: [1, 6] };  // Typical street to slick asphalt
    case 'EL_MIRAGE':
      return { typical: 10, range: [8, 13] }; // Good dry lake to loose dry lake
    case 'MUROC':
      return { typical: 10, range: [8, 13] }; // Good dry lake to loose dry lake
    case 'BONNEVILLE_SHORT':
    case 'BONNEVILLE_LONG':
      return { typical: 8, range: [5, 11] };  // Best salt to loose salt
    default:
      return { typical: 3, range: [1, 15] };
  }
}
