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
