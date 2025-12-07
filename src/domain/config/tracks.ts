/**
 * Drag Racing Track Database
 * Contains coordinates and info for popular drag strips
 */

export interface Track {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
  elevation_ft: number;
  length: '1/8' | '1/4' | 'both';
  sanctioning?: string[];
}

/**
 * Popular drag racing tracks in the US
 * Coordinates and elevations for weather lookup
 */
export const TRACKS: Track[] = [
  // NHRA National Events
  {
    id: 'pomona',
    name: 'Auto Club Raceway at Pomona',
    city: 'Pomona',
    state: 'CA',
    country: 'USA',
    lat: 34.0589,
    lon: -117.7517,
    elevation_ft: 1030,
    length: '1/4',
    sanctioning: ['NHRA'],
  },
  {
    id: 'gainesville',
    name: 'Gainesville Raceway',
    city: 'Gainesville',
    state: 'FL',
    country: 'USA',
    lat: 29.6516,
    lon: -82.3248,
    elevation_ft: 170,
    length: '1/4',
    sanctioning: ['NHRA'],
  },
  {
    id: 'houston',
    name: 'Houston Raceway Park',
    city: 'Baytown',
    state: 'TX',
    country: 'USA',
    lat: 29.7355,
    lon: -94.9774,
    elevation_ft: 30,
    length: '1/4',
    sanctioning: ['NHRA'],
  },
  {
    id: 'charlotte',
    name: 'zMAX Dragway',
    city: 'Concord',
    state: 'NC',
    country: 'USA',
    lat: 35.3521,
    lon: -80.6833,
    elevation_ft: 590,
    length: '1/4',
    sanctioning: ['NHRA'],
  },
  {
    id: 'atlanta',
    name: 'Atlanta Dragway',
    city: 'Commerce',
    state: 'GA',
    country: 'USA',
    lat: 34.2048,
    lon: -83.4568,
    elevation_ft: 820,
    length: '1/4',
    sanctioning: ['NHRA'],
  },
  {
    id: 'chicago',
    name: 'Route 66 Raceway',
    city: 'Joliet',
    state: 'IL',
    country: 'USA',
    lat: 41.4759,
    lon: -88.0515,
    elevation_ft: 580,
    length: '1/4',
    sanctioning: ['NHRA'],
  },
  {
    id: 'englishtown',
    name: 'Old Bridge Township Raceway Park',
    city: 'Englishtown',
    state: 'NJ',
    country: 'USA',
    lat: 40.3076,
    lon: -74.3579,
    elevation_ft: 100,
    length: '1/4',
    sanctioning: ['NHRA'],
  },
  {
    id: 'norwalk',
    name: 'Summit Motorsports Park',
    city: 'Norwalk',
    state: 'OH',
    country: 'USA',
    lat: 41.2423,
    lon: -82.6157,
    elevation_ft: 720,
    length: '1/4',
    sanctioning: ['NHRA'],
  },
  {
    id: 'denver',
    name: 'Bandimere Speedway',
    city: 'Morrison',
    state: 'CO',
    country: 'USA',
    lat: 39.6547,
    lon: -105.1989,
    elevation_ft: 5800,
    length: '1/4',
    sanctioning: ['NHRA'],
  },
  {
    id: 'sonoma',
    name: 'Sonoma Raceway',
    city: 'Sonoma',
    state: 'CA',
    country: 'USA',
    lat: 38.1611,
    lon: -122.4550,
    elevation_ft: 50,
    length: '1/4',
    sanctioning: ['NHRA'],
  },
  {
    id: 'seattle',
    name: 'Pacific Raceways',
    city: 'Kent',
    state: 'WA',
    country: 'USA',
    lat: 47.3667,
    lon: -122.1333,
    elevation_ft: 400,
    length: '1/4',
    sanctioning: ['NHRA'],
  },
  {
    id: 'indy',
    name: 'Lucas Oil Indianapolis Raceway Park',
    city: 'Indianapolis',
    state: 'IN',
    country: 'USA',
    lat: 39.7106,
    lon: -86.3419,
    elevation_ft: 810,
    length: '1/4',
    sanctioning: ['NHRA'],
  },
  {
    id: 'bristol',
    name: 'Bristol Dragway',
    city: 'Bristol',
    state: 'TN',
    country: 'USA',
    lat: 36.5156,
    lon: -82.2567,
    elevation_ft: 1880,
    length: '1/4',
    sanctioning: ['NHRA'],
  },
  {
    id: 'vegas',
    name: 'The Strip at Las Vegas Motor Speedway',
    city: 'Las Vegas',
    state: 'NV',
    country: 'USA',
    lat: 36.2719,
    lon: -115.0103,
    elevation_ft: 2000,
    length: '1/4',
    sanctioning: ['NHRA'],
  },
  {
    id: 'phoenix',
    name: 'Wild Horse Pass Motorsports Park',
    city: 'Chandler',
    state: 'AZ',
    country: 'USA',
    lat: 33.1753,
    lon: -111.9728,
    elevation_ft: 1180,
    length: '1/4',
    sanctioning: ['NHRA'],
  },
  // Popular 1/8 mile tracks
  {
    id: 'thunder_valley',
    name: 'Thunder Valley Raceway Park',
    city: 'Noble',
    state: 'OK',
    country: 'USA',
    lat: 35.1389,
    lon: -97.3833,
    elevation_ft: 1180,
    length: '1/8',
  },
  {
    id: 'north_star',
    name: 'North Star Dragway',
    city: 'Denton',
    state: 'TX',
    country: 'USA',
    lat: 33.2148,
    lon: -97.1331,
    elevation_ft: 650,
    length: '1/8',
  },
  // Bonneville
  {
    id: 'bonneville',
    name: 'Bonneville Salt Flats',
    city: 'Wendover',
    state: 'UT',
    country: 'USA',
    lat: 40.7608,
    lon: -113.8917,
    elevation_ft: 4200,
    length: 'both',
    sanctioning: ['SCTA', 'USFRA'],
  },
];

/**
 * Get track by ID
 */
export function getTrackById(id: string): Track | undefined {
  return TRACKS.find(t => t.id === id);
}

/**
 * Get tracks by state
 */
export function getTracksByState(state: string): Track[] {
  return TRACKS.filter(t => t.state.toUpperCase() === state.toUpperCase());
}

/**
 * Search tracks by name
 */
export function searchTracks(query: string): Track[] {
  const q = query.toLowerCase();
  return TRACKS.filter(t => 
    t.name.toLowerCase().includes(q) ||
    t.city.toLowerCase().includes(q) ||
    t.state.toLowerCase().includes(q)
  );
}
