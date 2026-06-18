/**
 * Static curated list of major US drag strips.
 *
 * Used for:
 *   - Nearest-track selection in Log Run (nearest by Haversine distance)
 *   - Apple WeatherKit lat/lon for weather fetch
 *   - Track elevation (for display; RSA corrections use barometerInHg directly)
 *
 * Sources: NHRA official facility list, track websites, Google Earth.
 * Elevation: feet above sea level (approximate, from USGS/Google elevation).
 *
 * To add a track: add an entry following the DragTrack interface.
 */

export interface DragTrack {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  elevationFt: number;
  /** Track distances available (quarter/eighth). */
  lengths: Array<'QUARTER' | 'EIGHTH'>;
}

export const dragTracks: DragTrack[] = [
  // ── NHRA Major Facilities ────────────────────────────────────────────────
  {
    id: 'indy-lucas',
    name: 'Lucas Oil Indianapolis Raceway Park',
    city: 'Brownsburg',
    state: 'IN',
    lat: 39.8636,
    lon: -86.3979,
    elevationFt: 830,
    lengths: ['QUARTER'],
  },
  {
    id: 'pomona-auto-club',
    name: 'Auto Club Raceway at Pomona',
    city: 'Pomona',
    state: 'CA',
    lat: 34.0681,
    lon: -117.7534,
    elevationFt: 1020,
    lengths: ['QUARTER'],
  },
  {
    id: 'gainesville-raceway',
    name: 'Gainesville Raceway',
    city: 'Gainesville',
    state: 'FL',
    lat: 29.6783,
    lon: -82.4019,
    elevationFt: 152,
    lengths: ['QUARTER'],
  },
  {
    id: 'houston-raceway',
    name: 'Houston Raceway Park',
    city: 'Baytown',
    state: 'TX',
    lat: 29.7738,
    lon: -94.9908,
    elevationFt: 30,
    lengths: ['QUARTER'],
  },
  {
    id: 'zmax-concord',
    name: 'zMAX Dragway',
    city: 'Concord',
    state: 'NC',
    lat: 35.3888,
    lon: -80.7028,
    elevationFt: 783,
    lengths: ['QUARTER'],
  },
  {
    id: 'brainerd-intl',
    name: 'Brainerd International Raceway',
    city: 'Brainerd',
    state: 'MN',
    lat: 46.3621,
    lon: -94.0044,
    elevationFt: 1218,
    lengths: ['QUARTER'],
  },
  {
    id: 'seattle-pacific',
    name: 'Pacific Raceways',
    city: 'Kent',
    state: 'WA',
    lat: 47.3519,
    lon: -122.0978,
    elevationFt: 512,
    lengths: ['QUARTER'],
  },
  {
    id: 'denver-bandimere',
    name: 'Bandimere Speedway',
    city: 'Morrison',
    state: 'CO',
    lat: 39.6434,
    lon: -105.2001,
    elevationFt: 5922,
    lengths: ['QUARTER'],
  },
  {
    id: 'vegas-strip-at-las-vegas',
    name: 'The Strip at Las Vegas Motor Speedway',
    city: 'Las Vegas',
    state: 'NV',
    lat: 36.2722,
    lon: -115.0108,
    elevationFt: 2040,
    lengths: ['QUARTER'],
  },
  {
    id: 'sonoma-raceway',
    name: 'Sonoma Raceway',
    city: 'Sonoma',
    state: 'CA',
    lat: 38.1610,
    lon: -122.4549,
    elevationFt: 70,
    lengths: ['QUARTER'],
  },
  {
    id: 'new-england-dragway',
    name: 'New England Dragway',
    city: 'Epping',
    state: 'NH',
    lat: 43.0495,
    lon: -71.0735,
    elevationFt: 336,
    lengths: ['QUARTER'],
  },
  {
    id: 'old-bridge-township',
    name: 'Old Bridge Township Raceway Park',
    city: 'Englishtown',
    state: 'NJ',
    lat: 40.3667,
    lon: -74.3428,
    elevationFt: 68,
    lengths: ['QUARTER'],
  },
  {
    id: 'richmond-dragway',
    name: 'Richmond Dragway',
    city: 'Sandston',
    state: 'VA',
    lat: 37.5407,
    lon: -77.2754,
    elevationFt: 180,
    lengths: ['QUARTER'],
  },
  {
    id: 'texas-motorplex',
    name: 'Texas Motorplex',
    city: 'Ennis',
    state: 'TX',
    lat: 32.3063,
    lon: -96.6700,
    elevationFt: 600,
    lengths: ['QUARTER'],
  },
  {
    id: 'route-66-raceway',
    name: 'Route 66 Raceway',
    city: 'Joliet',
    state: 'IL',
    lat: 41.5095,
    lon: -88.0611,
    elevationFt: 660,
    lengths: ['QUARTER'],
  },

  // ── Popular Regional Tracks ──────────────────────────────────────────────
  {
    id: 'milan-dragway',
    name: 'Milan Dragway',
    city: 'Milan',
    state: 'MI',
    lat: 42.0742,
    lon: -83.6752,
    elevationFt: 680,
    lengths: ['QUARTER'],
  },
  {
    id: 'ohio-valley-dragway',
    name: 'Ohio Valley Dragway',
    city: 'West Point',
    state: 'KY',
    lat: 38.0019,
    lon: -85.9611,
    elevationFt: 450,
    lengths: ['QUARTER', 'EIGHTH'],
  },
  {
    id: 'capital-raceway',
    name: 'Capital Raceway',
    city: 'Crofton',
    state: 'MD',
    lat: 39.0094,
    lon: -76.6823,
    elevationFt: 160,
    lengths: ['QUARTER'],
  },
  {
    id: 'orlando-speed-world',
    name: 'Orlando Speed World Dragway',
    city: 'Orlando',
    state: 'FL',
    lat: 28.5222,
    lon: -81.1475,
    elevationFt: 66,
    lengths: ['QUARTER', 'EIGHTH'],
  },
  {
    id: 'palmdale-dragstrip',
    name: 'Palmdale Dragstrip',
    city: 'Palmdale',
    state: 'CA',
    lat: 34.5948,
    lon: -118.1052,
    elevationFt: 2657,
    lengths: ['QUARTER'],
  },
  {
    id: 'tulsa-raceway',
    name: 'Tulsa Raceway Park',
    city: 'Tulsa',
    state: 'OK',
    lat: 36.2752,
    lon: -95.9211,
    elevationFt: 700,
    lengths: ['QUARTER', 'EIGHTH'],
  },
  {
    id: 'memphis-intl-raceway',
    name: 'Memphis International Raceway',
    city: 'Millington',
    state: 'TN',
    lat: 35.3416,
    lon: -89.8956,
    elevationFt: 322,
    lengths: ['QUARTER'],
  },
  {
    id: 'charlotte-motor-speedway-dragway',
    name: 'Charlotte Motor Speedway Dragway',
    city: 'Concord',
    state: 'NC',
    lat: 35.3521,
    lon: -80.6826,
    elevationFt: 780,
    lengths: ['QUARTER'],
  },
  {
    id: 'atco-dragway',
    name: 'Atco Dragway',
    city: 'Atco',
    state: 'NJ',
    lat: 39.7698,
    lon: -74.8858,
    elevationFt: 85,
    lengths: ['QUARTER'],
  },
  {
    id: 'empire-dragway',
    name: 'Empire Dragway',
    city: 'Leicester',
    state: 'NY',
    lat: 42.7604,
    lon: -77.8749,
    elevationFt: 1250,
    lengths: ['QUARTER'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Nearest-track utility
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the closest drag track to the given coordinates using the Haversine formula.
 *
 * @param lat  Current latitude (degrees).
 * @param lon  Current longitude (degrees).
 * @param maxDistanceMiles  Optional cap — only return a track within this distance.
 * @returns The closest DragTrack, or null if none within maxDistanceMiles.
 */
export function findNearestTrack(
  lat: number,
  lon: number,
  maxDistanceMiles: number = 150
): (DragTrack & { distanceMiles: number }) | null {
  const R = 3958.8; // Earth radius in miles

  let nearest: (DragTrack & { distanceMiles: number }) | null = null;

  for (const track of dragTracks) {
    const dLat = (track.lat - lat) * (Math.PI / 180);
    const dLon = (track.lon - lon) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat * (Math.PI / 180)) *
        Math.cos(track.lat * (Math.PI / 180)) *
        Math.sin(dLon / 2) ** 2;
    const distanceMiles = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (!nearest || distanceMiles < nearest.distanceMiles) {
      nearest = { ...track, distanceMiles };
    }
  }

  if (nearest && nearest.distanceMiles > maxDistanceMiles) return null;
  return nearest;
}
