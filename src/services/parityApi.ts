/**
 * Parity API Client
 *
 * Typed wrappers for the NHRA Tech Parity endpoints (api/parity.php).
 * All endpoints require nhra.parity capability (owner/admin only).
 */

import { getAuthToken } from './api';

const API_BASE = '/api';

// ── Types ───────────────────────────────────────────────────────────────

export interface PeekResponse {
  url: string;
  detectedShape: string;
  rowCountFirstPage: number;
  hasNextLink: boolean;
  nextLink: string | null;
  topLevelKeys: string[];
  firstRowKeys: string[];
  firstRowSample: Record<string, any> | null;
  normalizedSample: Record<string, any> | null;
  hint?: string;
}

export interface IngestResponse {
  raceLookup: string;
  importId: string;
  rowsFetched: number;
  rowsInserted: number;
  rowsDeduped: number;
  parsedTimestampCount?: number;
  parsedClassCount?: number;
  parsedDriverCount?: number;
  parsedFt1320Count?: number;
  parsedMph1320Count?: number;
  hint?: string;
  url?: string;
  error?: string;
  existingImportId?: string;
  existingRowCount?: number;
  existingFetchedAt?: string;
}

export interface ParityRun {
  id: number;
  uuid: string;
  race_lookup: string;
  run_timestamp_utc: string | null;
  /** Event-local wall-clock time (track timezone). Prefer this for display. */
  run_time_local: string | null;
  category: string | null;
  class_index: string | null;
  round: string | null;
  lane: string | null;
  driver_name: string | null;
  car_number: string | null;
  dial_in: number | null;
  rt: number | null;
  ft60: number | null;
  ft330: number | null;
  ft660: number | null;
  mph660: number | null;
  ft1000: number | null;
  mph1000: number | null;
  ft1320: number | null;
  mph1320: number | null;
  win_flag: boolean | null;
  dq_flag: boolean | null;
  mov: number | null;
  place: string | null;
  source_ref: string | null;
  created_at: string;
  /** Future: count of incidents/tags (crash, explosion, record, etc.) */
  incident_count?: number;
}

export interface RunsResponse {
  runs: ParityRun[];
  total: number;
  limit: number;
  offset: number;
  raceLookup: string;
}

export interface RunsQueryParams {
  raceLookup: string;
  classIndex?: string;
  driverName?: string;
  lane?: string;
  round?: string;
  dq?: 'include' | 'exclude' | 'only';
  includeBad?: string;
  limit?: number;
  offset?: number;
}

export interface SuggestResponse {
  year: number;
  candidatesTested: number;
  eventsFound: number;
  events: { raceLookup: string; rowCount: number; categories: string[] }[];
}

export interface ParityImport {
  uuid: string;
  race_lookup: string;
  requested_at_utc: string;
  fetched_at_utc: string | null;
  status: 'success' | 'error';
  row_count: number;
  error_message: string | null;
  source_url: string;
  created_by_user_id: number | null;
  created_at: string;
}

export interface ImportsResponse {
  imports: ParityImport[];
  total: number;
}

// ── Weather / Track / Event Types ────────────────────────────────────────

export interface TrackResponse {
  id: number;
  trackName: string;
  timezoneIana: string;
}

export interface TracksResponse {
  tracks: { id: number; track_name: string; timezone_iana: string; created_at: string }[];
}

export interface CreateEventParams {
  eventName: string;
  trackId: number;
  startDateLocal: string;
  endDateLocal: string;
  raceLookup?: string;
}

export interface EventResponse {
  id: number;
  eventName: string;
  trackId: number;
  startDateLocal: string;
  endDateLocal: string;
  raceLookup: string | null;
}

export interface EventsResponse {
  events: {
    id: number; event_name: string; track_id: number; track_name: string;
    timezone_iana: string; start_date_local: string; end_date_local: string;
    race_lookup: string | null; created_at: string;
  }[];
}

export interface WeatherBackfillParams {
  eventId: number;
  fromDateLocal?: string;
  toDateLocal?: string;
  minRowsPerDay?: number;
}

export interface WeatherBackfillResponse {
  eventId: number;
  fromDateLocal: string;
  toDateLocal: string;
  timezone: string;
  daysChecked: number;
  daysFetched: number;
  rowsInserted: number;
  rowsDeduped: number;
  errors: string[];
}

export interface WeatherBuildCanonicalParams {
  startUtc?: string;
  endUtc?: string;
  bucketMinutes?: number;
}

export interface WeatherBuildCanonicalResponse {
  startUtc: string;
  endUtc: string;
  bucketMinutes: number;
  bucketsProcessed: number;
}

export interface RunWithWeather extends ParityRun {
  weather: {
    timestamp_utc: string;
    temp_f: number | null;
    rh_pct: number | null;
    pressure_inhg: number | null;
    delta_seconds: number;
    canonical_source_kind: string;
    canonical_source_detail: string | null;
    sample_count: number;
    sample_sources_json: string | null;
  } | null;
}

export interface RunsWithWeatherParams {
  raceLookup: string;
  windowMinutes?: number;
  category?: string;
  classIndex?: string;
  driverName?: string;
  lane?: string;
  round?: string;
  limit?: number;
  offset?: number;
}

export interface RunsWithWeatherResponse {
  runs: RunWithWeather[];
  total: number;
  joinedCount: number;
  windowMinutes: number;
  limit: number;
  offset: number;
  raceLookup: string;
}

export interface WeatherSample {
  id: number;
  timestamp_utc: string;
  event_id: number | null;
  track_id: number | null;
  event_local_time: string | null;
  temp_c: number | null;
  temp_f: number | null;
  rh_pct: number | null;
  station_pressure_raw: number | null;
  source: string;
  created_at: string;
}

export interface WeatherSamplesParams {
  eventId?: number;
  fromUtc?: string;
  toUtc?: string;
  limit?: number;
}

export interface WeatherSamplesResponse {
  samples: WeatherSample[];
  count: number;
}

export interface WeatherCanonicalPoint {
  id: number;
  timestamp_utc: string;
  temp_f: number | null;
  rh_pct: number | null;
  pressure_inhg: number | null;
  created_at: string;
}

export interface WeatherCanonicalParams {
  fromUtc?: string;
  toUtc?: string;
  limit?: number;
}

export interface WeatherCanonicalResponse {
  canonical: WeatherCanonicalPoint[];
  count: number;
}

// ── Top-by-Event (Trends) Types ──────────────────────────────────────────

export interface TopByEventRow {
  raceLookup: string;
  value: number | null;
  actualValue?: number;
  runCount: number;
  correctedCount?: number;
  eventName: string | null;
  trackName: string | null;
  seasonYear: number | null;
}

export interface TopByEventResponse {
  classIndex: string;
  metric: string;
  aggregation: string;
  includeDQ: boolean;
  minRunCount: number;
  rows: TopByEventRow[];
}

export interface TopByEventParams {
  classIndex: string;
  metric: 'mph1320' | 'ft1320' | 'corrected_ft1320';
  startRaceLookup?: string;
  endRaceLookup?: string;
  includeDQ?: boolean;
  minRunCount?: number;
  limit?: number;
}

export interface EventCatalogEntry {
  raceLookup: string;
  eventName: string;
  trackName: string;
  seasonYear: number;
  startDateLocal: string | null;
  endDateLocal: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventCatalogResponse {
  events: EventCatalogEntry[];
  count: number;
}

export interface UpsertEventCatalogParams {
  raceLookup: string;
  eventName: string;
  trackName?: string;
  seasonYear: number;
  startDateLocal?: string;
  endDateLocal?: string;
}

export interface IngestManyResult {
  raceLookup: string;
  rowsFetched: number;
  rowsInserted: number;
  rowsDeduped: number;
  status: 'success' | 'skipped' | 'empty' | 'error';
  error?: string;
  reason?: string;
  existingRowCount?: number;
}

export interface IngestManyResponse {
  summary: {
    total: number;
    success: number;
    skipped: number;
    empty: number;
    error: number;
    totalRowsInserted: number;
  };
  results: IngestManyResult[];
}

export interface IngestManyParams {
  raceLookups: string[];
  force?: boolean;
  throttleMs?: number;
}

// ── Bulk Create Events Types ─────────────────────────────────────────────

export interface BulkCreateEventRow {
  event_name: string;
  track_id: number;
  start_date_local: string;
  end_date_local: string;
  race_lookup?: string;
  season_year?: number;
}

export interface BulkCreateEventsResult {
  row: number;
  status: 'created' | 'duplicate_skipped' | 'duplicate_updated' | 'error';
  eventId?: number;
  existingEventId?: number;
  raceLookup?: string;
  error?: string;
}

export interface BulkCreateEventsResponse {
  ok: boolean;
  summary: {
    created: number;
    duplicate_skipped: number;
    duplicate_updated: number;
    error: number;
  };
  results: BulkCreateEventsResult[];
}

// ── Event/Track/Flag Types ───────────────────────────────────────────────

export interface EventWithStats {
  id: number;
  event_name: string;
  event_code: string | null;
  season_year: number | null;
  track_id: number;
  track_name: string;
  timezone_iana: string;
  city: string | null;
  state: string | null;
  start_date_local: string;
  end_date_local: string;
  race_lookup: string;
  created_at: string;
  run_count: number;
  weather_sample_count: number;
}

export interface EventsWithStatsResponse {
  events: EventWithStats[];
  count: number;
}

export interface EventCategory {
  category: string | null;
  class_index: string;
  run_count: number;
}

export interface EventCategoriesResponse {
  eventId: number;
  categories: EventCategory[];
}

export interface ScrapeResult {
  yearsScraped: number[];
  eventsUpserted: number;
  tracksUpserted: number;
  errors: string[];
  startedAt: string;
  endedAt: string;
}

export interface RunFlag {
  id: number;
  run_id: number;
  flag_type: 'bad' | 'note' | 'exclude';
  reason: string | null;
  created_by_user_id: number | null;
  created_at: string;
}

export interface RunFlagsResponse {
  flags: RunFlag[];
  count: number;
}

// ── Parity Analysis Types ────────────────────────────────────────────────

export interface CorrectedRun {
  id: number;
  uuid: string;
  race_lookup: string;
  run_timestamp_utc: string | null;
  class_index: string | null;
  round: string | null;
  lane: string | null;
  driver_name: string | null;
  car_number: string | null;
  dial_in: number | null;
  rt: number | null;
  ft60: number | null;
  ft330: number | null;
  ft660: number | null;
  mph660: number | null;
  ft1000: number | null;
  mph1000: number | null;
  ft1320: number | null;
  mph1320: number | null;
  win_flag: boolean | null;
  dq_flag: boolean | null;
  place: string | null;
  weather_timestamp_utc: string | null;
  weather_delta_seconds: number | null;
  temp_f: number | null;
  rh_pct: number | null;
  pressure_inhg: number | null;
  correction_factor: number | null;
  corrected_ft1320: number | null;
  corrected_ft660: number | null;
  corrected_ft60: number | null;
}

export interface ParityMetrics {
  best: number | null;
  top3_median: number | null;
  top5_median: number | null;
  all_median: number | null;
}

export interface EventParitySummaryResponse {
  eventId: number;
  classIndex: string;
  event: { event_name: string; start_date_local: string; end_date_local: string; track_name: string; city: string | null; state: string | null } | null;
  correction_model_version: string;
  standard_day: { temp_f: number; pressure_inhg: number; rh_pct: number };
  run_count: number;
  weather_joined_count: number;
  corrected_count: number;
  actual: ParityMetrics;
  corrected: ParityMetrics;
  runs: CorrectedRun[];
}

export interface QualSheetRow {
  qual_pos: number | null;
  driver: string;
  car_number: string | null;
  best_et: number | null;
  best_mph: number | null;
  best_rt: number | null;
  best_ft60: number | null;
  best_ft660: number | null;
  /** Local time at the track (for display). */
  best_timestamp: string | null;
  /** UTC time (for internal/weather reference). */
  best_timestamp_utc: string | null;
  corrected_best_et: number | null;
  correction_factor: number | null;
  temp_f: number | null;
  pressure_inhg: number | null;
  rh_pct: number | null;
  run_count: number;
  is_valid: boolean;
}

export interface QualSheetResponse {
  eventId: number;
  classIndex: string;
  event: { event_name: string; start_date_local: string; end_date_local: string; season_year: number | null; track_name: string; city: string | null; state: string | null } | null;
  correction_model_version: string;
  qualifier_count: number;
  total_drivers: number;
  sheet: QualSheetRow[];
}

export interface LadderSeed {
  seed: number;
  driver: string;
  car_number: string | null;
  best_et: number | null;
  best_mph: number | null;
}

export interface LadderPairing {
  match: number;
  top_seed: LadderSeed;
  bottom_seed: LadderSeed;
}

export interface LadderResponse {
  eventId: number;
  classIndex: string;
  ladderSize: number;
  actualQualifiers: number;
  event: { event_name: string; start_date_local: string; end_date_local: string; season_year: number | null; track_name: string; city: string | null; state: string | null } | null;
  pairings: LadderPairing[];
}

// ── Admin CRUD Types ────────────────────────────────────────────────────

export interface TrackWithStats {
  id: number;
  track_name: string;
  timezone_iana: string;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  created_at: string;
  event_count: number;
  total_run_count: number;
  total_weather_samples: number;
}

export interface TracksWithStatsResponse {
  tracks: TrackWithStats[];
  count: number;
}

// ── Event Summary + Driver Drilldown Types ──────────────────────────────

export interface EventSummaryResponse {
  eventId: number;
  classIndex: string;
  event: {
    event_name: string;
    track_name: string;
    city: string | null;
    state: string | null;
    start_date_local: string;
    end_date_local: string;
    season_year: number | null;
  };
  runCount: number;
  lowEt_actual: number | null;
  lowEt_corrected: number | null;
  topMph: number | null;
  winner: {
    driver: string;
    round: string;
    et: number | null;
    mph: number | null;
  } | null;
  weatherJoinPct: number;
  flaggedCount: number;
  correction_model_version: string;
}

export interface DriverEntry {
  driver: string;
  run_count: number;
  best_et: number | null;
  best_mph: number | null;
  event_count: number;
}

export interface DriversResponse {
  drivers: DriverEntry[];
}

export interface DriverRun {
  id: number;
  uuid: string;
  race_lookup: string;
  run_timestamp_utc: string | null;
  class_index: string | null;
  round: string | null;
  lane: string | null;
  driver_name: string | null;
  car_number: string | null;
  rt: number | null;
  ft60: number | null;
  ft330: number | null;
  ft660: number | null;
  mph660: number | null;
  ft1000: number | null;
  mph1000: number | null;
  ft1320: number | null;
  mph1320: number | null;
  win_flag: boolean;
  dq_flag: boolean;
  place: string | null;
  event_name: string | null;
  track_name: string | null;
  inc_0_60: number | null;
  inc_60_330: number | null;
  inc_330_660: number | null;
  inc_660_1000: number | null;
  inc_1000_1320: number | null;
  // Weather fields (when includeWeather=1)
  weather?: {
    timestamp_utc: string;
    temp_f: number | null;
    rh_pct: number | null;
    pressure_inhg: number | null;
    delta_seconds: number;
    canonical_source_kind: string | null;
    canonical_source_detail: string | null;
    sample_count: number;
  } | null;
  correction_factor?: number | null;
  corrected_ft1320?: number | null;
  corrected_ft660?: number | null;
  corrected_ft60?: number | null;
  incident_count?: number;
}

export interface RunsByDriverResponse {
  driverName: string;
  runs: DriverRun[];
  total: number;
  limit: number;
  offset: number;
}

// ── Class Alias Types ───────────────────────────────────────────────────

export interface ClassAlias {
  id: number;
  canonical: string;
  alias: string;
  created_at: string;
}

export interface ClassAliasListResponse {
  aliases: ClassAlias[];
  knownClasses: string[];
}

// ── Engine Combo Types ──────────────────────────────────────────────────

export interface EngineComboRow {
  id: number;
  name: string;
  t_power: number;
  d_power: number;
  friction_factor: number;
  created_at: string;
  updated_at: string;
}

export interface EngineComboListResponse {
  combos: EngineComboRow[];
}

// ── Driver Combo Types ─────────────────────────────────────────────────

export interface DriverComboRow {
  id: number;
  driver_name: string;
  class_index: string;
  engine_combo_id: number;
  engine_combo_name: string;
  t_power: number;
  d_power: number;
  friction_factor: number;
  effective_from_utc: string;
  effective_to_utc: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriverComboListResponse {
  combos: DriverComboRow[];
}

// ── Class Default Combo Types ───────────────────────────────────────────

export interface ClassDefaultRow {
  id: number;
  class_index: string;
  engine_combo_id: number;
  engine_combo_name: string;
  t_power: number;
  d_power: number;
  friction_factor: number;
  effective_from_utc: string | null;
  effective_to_utc: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassDefaultListResponse {
  classDefaults: ClassDefaultRow[];
}

// ── Assign Combos Helper Types ──────────────────────────────────────────

export interface DriverAtEvent {
  driver_name: string;
  class_index: string;
  run_count: number;
  first_run_utc: string | null;
  last_run_utc: string | null;
  best_et: number | null;
  best_mph: number | null;
}

export interface DriversAtEventResponse {
  drivers: DriverAtEvent[];
  eventClasses: string[];
  raceLookup: string;
  startDate: string | null;
  endDate: string | null;
  weatherSampleCount: number;
}

export interface BulkUpsertDriverCombosResponse {
  ok: boolean;
  created: number;
  closed: number;
  replaced: number;
  skipped: number;
  errors: string[];
}

// ── CSV Weather Backfill Types ──────────────────────────────────────────

export interface BackfillWeatherCsvResponse {
  ok: boolean;
  eventId: number;
  trackId: number;
  totalRows: number;
  inserted: number;
  deduped: number;
  errorCount: number;
  errors: string[];
}

export interface BackfillWeatherProviderResponse {
  ok: boolean;
  eventId: number;
  trackId: number;
  provider: string;
  totalRows: number;
  inserted: number;
  deduped: number;
  errorCount: number;
  errors: string[];
  preview: Array<{
    timestampUtc: string;
    tempF: number;
    humidityPct: number;
    baroInHg: number;
  }>;
}

// ── Refresh Event Data Types ─────────────────────────────────────────────

export interface RefreshStepResult {
  fetched?: number;
  inserted?: number;
  deduped?: number;
  daysFetched?: number;
  bucketsProcessed?: number;
  errors: string[];
}

export interface RefreshEventDataResponse {
  ok: boolean;
  event_id: number;
  event_name: string;
  range: { startLocal: string; endLocal: string; timezone: string };
  timing: RefreshStepResult;
  tempest: RefreshStepResult;
  open_meteo: RefreshStepResult;
  canonical: RefreshStepResult;
  duration_ms: number;
}

// ── Weather Reliability Types ────────────────────────────────────────────

export interface WeatherCoverageResponse {
  eventId: number;
  eventName: string;
  trackName: string;
  startLocal: string;
  endLocal: string;
  startUtc: string;
  endUtc: string;
  hasTrackCoords: boolean;
  trackLat: number | null;
  trackLon: number | null;
  canonicalCount: number;
  canonicalBySource: Record<string, number>;
  totalSamples: number;
  samplesBySource: Record<string, number>;
  runCount: number;
  runsCovered: number;
  runsUncovered: number;
  coveragePct: number | null;
  windowMinutes: number;
  largestGapMinutes: number;
  largestGapAt: string | null;
}

export interface WeatherHealthBackfillResponse {
  ok: boolean;
  inserted: number;
  deduped: number;
  totalFetched?: number;
  errors?: string[];
  canonicalRebuilt?: number;
  skipped?: boolean;
  message?: string;
  existingBackupSamples?: number;
}

export interface WeatherHealthRebuildResponse {
  ok: boolean;
  startUtc: string;
  endUtc: string;
  bucketMinutes: number;
  bucketsProcessed: number;
  stationUsed: number;
  backupUsed: number;
  suspectCount: number;
  sanityFailed: number;
  error?: string;
}

export interface StationCsvImportRow {
  timestampUtc: string;
  tempF: number;
  humidityPct: number;
  pressureHpa: number;
}

export interface StationCsvMappedRow {
  row: number;
  timestampUtc: string;
  tempF: number;
  humidityPct: number;
  pressureHpa: number;
  eventId: number;
  eventName: string;
  trackId: number;
  timezone: string;
}

export interface StationCsvImportResponse {
  ok: boolean;
  previewOnly?: boolean;
  source?: string;
  bufferHours?: number;
  rowsParsed: number;
  rowsMapped: number;
  rowsUnmapped: number;
  parseErrors: number;
  inserted?: number;
  deduped?: number;
  insertErrors?: number;
  eventsAffected: string[];
  affectedEventIds?: number[];
  preview: StationCsvMappedRow[];
  unmappedExamples: Array<{ row: number; timestampUtc: string; tempF: number; humidityPct: number; pressureHpa: number }>;
  parseErrorExamples: Array<{ row: number; reason: string; ts: string }>;
  insertErrorExamples?: string[];
  rebuildResults?: Record<number, { ok?: boolean; bucketsProcessed?: number; error?: string }>;
}

// ── Track Coord Coverage + Batch Backfill Types ─────────────────────────

export interface TrackCoordCoverageRow {
  track_id: number;
  track_name: string;
  timezone_iana: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  event_count: number;
  seasons: string;
  events_zero_weather: number;
  coordsMissing: boolean;
}

export interface TrackCoordCoverageResponse {
  ok: boolean;
  yearRange: [number, number];
  totalTracks: number;
  missingCoords: number;
  tracks: TrackCoordCoverageRow[];
}

export interface BulkUpdateTrackCoordsResponse {
  ok: boolean;
  submitted: number;
  updated: number;
  errors: string[];
}

export interface BatchWeatherBackfillEvent {
  eventId: number;
  event: string;
  status: 'ok' | 'skipped' | 'error' | 'would_backfill';
  reason?: string;
  track?: string;
  error?: string;
  fetched?: number;
  inserted?: number;
  deduped?: number;
  canonicalBuckets?: number;
  previousCoverage?: number;
  currentCoverage?: number;
  runs?: number;
}

export interface BatchWeatherBackfillResponse {
  ok: boolean;
  dryRun: boolean;
  yearRange: [number, number];
  maxCoveragePct: number;
  totals: {
    processed: number;
    backfilled: number;
    rebuilt: number;
    skipped_high_coverage: number;
    skipped_missing_coords: number;
    skipped_no_runs: number;
    errors: number;
  };
  events: BatchWeatherBackfillEvent[];
}

export interface BackfillRunUtcEventResult {
  eventId: number;
  event: string;
  tz: string;
  runsScanned: number;
  updated: number;
  skipped: number;
  errors: number;
  sampleBefore: string | null;
  sampleAfter: string | null;
}

export interface BackfillRunUtcResponse {
  ok: boolean;
  dryRun: boolean;
  totals: {
    events: number;
    runs_scanned: number;
    updated: number;
    skipped_no_ts: number;
    errors: number;
  };
  events: BackfillRunUtcEventResult[];
}

export interface OrphanRunsResponse {
  total: number;
  limit: number;
  offset: number;
  runs: {
    id: number;
    uuid: string;
    race_lookup: string;
    run_timestamp_utc: string | null;
    run_time_local: string | null;
    class_index: string | null;
    round: string | null;
    driver_name: string | null;
    orphan_reason: 'no_event' | 'no_track' | 'no_timezone' | 'missing_local' | 'unknown';
  }[];
}

export interface TimeSmokeTestResponse {
  ok: boolean;
  testedEvents: number;
  allPass: boolean;
  thresholds: { avgOffsetMaxMin: number; maxOffsetMaxMin: number };
  events: {
    eventId: number;
    event: string;
    tz: string;
    runsChecked: number;
    matched: number;
    pctMatched: number | null;
    avgOffsetMin: number | null;
    maxOffsetMin: number | null;
    pass: boolean;
    samples: {
      run_id: number;
      run_time_local: string | null;
      run_timestamp_utc: string | null;
      derived_utc_from_local: string | null;
      utc_matches: boolean;
    }[];
  }[];
}

export interface TimeDiagnosticsSampleRow {
  run_id: number;
  driver: string | null;
  round: string | null;
  class_index: string | null;
  run_time_local: string | null;
  run_timestamp_utc: string | null;
  matched_weather_utc: string | null;
  offset_minutes: number | null;
  wx_temp_f: number | null;
  wx_rh_pct: number | null;
  wx_press_inhg: number | null;
}

export interface TimeDiagnosticsSampleResponse {
  eventId: number;
  eventName: string;
  classIndex: string;
  trackTimezone: string;
  totalRuns: number;
  matchedRuns: number;
  pctMatched: number | null;
  avgOffsetMin: number | null;
  maxOffsetMin: number | null;
  samples: TimeDiagnosticsSampleRow[];
}

// ── Anomaly Analysis Types ──────────────────────────────────────────────

export type AnomalyClassification =
  | 'clean'
  | 'unusual_but_plausible'
  | 'isolated_suspicious_increment'
  | 'probable_timing_issue'
  | 'incomplete_record'
  | 'review_recommended';

export interface AnomalyFieldScore {
  field: string;
  score: number;
  band: string;
  flagCount: number;
}

export interface AnomalyFlag {
  code: string;
  severity: string;
  field?: string;
  explanation: string;
  value?: number;
  expected?: string;
  zScore?: number;
}

export interface AnomalyBaselineInfo {
  scope: string;
  sampleSize: number;
  quality: string;
  hardFailsExcluded: number;
  warning?: string;
}

export interface AnomalyNormalizedFinish {
  effectiveFinishDistance: number;
  effectiveFinishTime: number | null;
  effectiveFinishMph: number | null;
  finishTimeField: string;
  finishMphField: string;
  isNitro: boolean;
}

export interface AnomalyRunSummary {
  runId: number;
  runUuid: string;
  overallScore: number;
  band: string;
  classification: AnomalyClassification;
  flagCount: number;
  suspectFields: string[];
  primaryReasonCode: string | null;
  primaryReasonText: string;
  fieldScores: AnomalyFieldScore[];
  intervals: Record<string, number | null>;
  baseline: AnomalyBaselineInfo;
  narrative: string;
  finish: AnomalyNormalizedFinish;
  representativeRun: boolean;
  representativeRunReason: string | null;
  excludedFromBaseline: boolean;
  baselineExclusionReason: string | null;
  // Run context fields
  driverName: string | null;
  category: string | null;
  lane: string | null;
  round: string | null;
  ft1320: number | null;
  mph1320: number | null;
}

export interface AnomalyRollups {
  byLane: Record<string, { total: number; flagged: number; criticalOrLow: number; avgScore: number }>;
  byRound: Record<string, { total: number; flagged: number; criticalOrLow: number; avgScore: number }>;
  byField: Record<string, number>;
  classifications: Record<AnomalyClassification, number>;
}

export interface AnomalySummaryTotals {
  runsAnalyzed: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  criticalCount: number;
  mostFlaggedField: string | null;
  mostFlaggedFieldCount: number;
  baselineExcluded: number;
  representativeCount: number;
  offPaceCount: number;
}

export interface AnomalyAnalysisResponse {
  summary: AnomalySummaryTotals;
  rollups: AnomalyRollups;
  runs: AnomalyRunSummary[];
}

export interface AnomalyDetailResponse {
  run: ParityRun;
  analysis: AnomalyRunSummary & { flags: AnomalyFlag[] };
}

// ── Weather Timeseries Types ────────────────────────────────────────────

export interface WeatherTimeseriesPoint {
  timestamp_utc: string;
  canonical_temp_f: number | null;
  canonical_rh_pct: number | null;
  canonical_pressure_inhg: number | null;
  station_temp_f: number | null;
  station_rh_pct: number | null;
  station_pressure_inhg: number | null;
  backup_temp_f: number | null;
  backup_rh_pct: number | null;
  backup_pressure_inhg: number | null;
  station_temp_delta: number | null;
  station_humidity_delta: number | null;
  station_pressure_delta: number | null;
  canonical_source_kind: string;
  sample_count: number;
}

export interface WeatherSeriesStat {
  min: number | null;
  max: number | null;
  avg: number | null;
  count: number;
}

export interface WeatherTimeseriesStats {
  pointsCount: number;
  expectedPoints: number;
  coveragePct: number;
  stationPointsCount: number;
  backupPointsCount: number;
  largestGapMinutes: number;
  largestGapAt: string | null;
  sourceBreakdown: Record<string, number>;
  temp: { canonical: WeatherSeriesStat; station: WeatherSeriesStat; backup: WeatherSeriesStat };
  rh: { canonical: WeatherSeriesStat; station: WeatherSeriesStat; backup: WeatherSeriesStat };
  pressure: { canonical: WeatherSeriesStat; station: WeatherSeriesStat; backup: WeatherSeriesStat };
}

export interface WeatherTimeseriesResponse {
  eventId: number;
  event: {
    event_name: string;
    track_name: string;
    city: string | null;
    state: string | null;
    start_date_local: string;
    end_date_local: string;
    timezone: string;
  };
  startUtc: string;
  endUtc: string;
  points: WeatherTimeseriesPoint[];
  stats: WeatherTimeseriesStats;
}

// ── Parity By Combo Types ──────────────────────────────────────────────

export interface ParityComboRunWeather {
  temp_f: number;
  rh_pct: number;
  pressure_inhg: number;
  source: string;
  timestamp_utc: string;
}

export interface ParityComboRun {
  runId: number;
  uuid: string;
  driver: string;
  round: string | null;
  lane: string | null;
  carNumber: string | null;
  timestamp: string | null;
  rawValue: number;
  value: number;
  correctionFactor: number | null;
  excluded: boolean;
  flagged: boolean;
  dqFlag: number;
  weather: ParityComboRunWeather | null;
  engineCombo: string;
  engineComboId: number | null;
  et: number | null;
  mph: number | null;
  qualPosition?: number;
  /** Future: count of incidents/tags for this run */
  incident_count?: number;
}

export interface ParityComboEntry {
  engineCombo: string;
  engineComboId: number | null;
  bestValue: number | null;
  avgTopN: number | null;
  totalAvg: number | null;
  spread: number | null;
  countTopN: number;
  countTotal: number;
  countActive: number;
  countExcluded: number;
  countTotalAvg: number;
  weatherCoveragePct: number | null;
  topRuns: ParityComboRun[];
}

export interface ParityDeltaRow {
  comboA: string;
  comboB: string;
  valueA: number | null;
  valueB: number | null;
  delta: number | null;
}

export interface ParityDeltaMatrices {
  quickest: ParityDeltaRow[];
  avgTopN: ParityDeltaRow[];
  totalAvg: ParityDeltaRow[];
}

export interface ParityMappingReadiness {
  mappedPct: number | null;
  mappedRunCount: number;
  unknownRunCount: number;
  topMissingDrivers: { driver: string; runCount: number }[];
}

export interface ParityByComboTrust {
  weatherCoveragePct: number | null;
  correctedCoveragePct: number | null;
  totalRunsInScope: number;
  runsWithWeather: number;
  runsWithCorrected: number;
  hasTrackCoords: boolean;
}

export interface ParityByComboResponse {
  eventId: number;
  classIndex: string;
  metric: string;
  mode: 'raw' | 'corrected';
  topN: number;
  sessionScope: 'qual' | 'elim' | 'both';
  includeFlagged: boolean;
  includeUnknown: boolean;
  isLowerBetter: boolean;
  event: {
    event_name: string;
    track_name: string;
    city: string | null;
    state: string | null;
    start_date_local: string;
    end_date_local: string;
  };
  trust: ParityByComboTrust;
  mapping: ParityMappingReadiness;
  combos: ParityComboEntry[];
  deltaMatrices: ParityDeltaMatrices;
  allRuns: ParityComboRun[];
  qualOrder: ParityComboRun[];
  totalRunsInClass: number;
}

// ── Split Parity Endpoint Types (fast initial load) ─────────────────────

/** paritySummary: fast initial load — combos + trust + mapping, no allRuns/deltas/qualOrder */
export interface ParitySummaryResponse {
  eventId: number;
  classIndex: string;
  metric: string;
  mode: 'raw' | 'corrected';
  topN: number;
  sessionScope: 'qual' | 'elim' | 'both';
  includeFlagged: boolean;
  includeUnknown: boolean;
  isLowerBetter: boolean;
  event: {
    event_name: string;
    track_name: string;
    city: string | null;
    state: string | null;
    start_date_local: string;
    end_date_local: string;
  };
  trust: ParityByComboTrust;
  mapping: ParityMappingReadiness;
  combos: ParityComboEntry[];
  totalRunsInClass: number;
}

/** parityDeltas: on-demand delta matrices */
export interface ParityDeltasResponse {
  eventId: number;
  classIndex: string;
  metric: string;
  mode: 'raw' | 'corrected';
  topN: number;
  sessionScope: 'qual' | 'elim' | 'both';
  isLowerBetter: boolean;
  deltaMatrices: ParityDeltaMatrices;
}

/** parityAllRuns: paginated truth table with server-side driver search */
export interface ParityAllRunsResponse {
  eventId: number;
  classIndex: string;
  metric: string;
  mode: 'raw' | 'corrected';
  sessionScope: 'qual' | 'elim' | 'both';
  isLowerBetter: boolean;
  page: number;
  pageSize: number;
  totalRuns: number;
  totalPages: number;
  driverSearch: string;
  runs: ParityComboRun[];
}

/** parityQualOrder: lean qualifying order */
export interface ParityQualOrderResponse {
  eventId: number;
  classIndex: string;
  metric: string;
  mode: 'raw' | 'corrected';
  sessionScope: 'qual' | 'elim' | 'both';
  isLowerBetter: boolean;
  qualOrder: ParityComboRun[];
}

/** parityIncrementals: optimal-run incrementals per combo */
export interface ParityIncrementalRow {
  label: string;
  key: string;
  isLowerBetter: boolean;
  values: Record<string, number | null>;
}

export interface ParityIncrementalsResponse {
  eventId: number;
  classIndex: string;
  sessionScope: 'qual' | 'elim' | 'both';
  combos: string[];
  rows: ParityIncrementalRow[];
}

/** paritySessionWeather: per-session weather aggregation */
export interface ParitySessionWeatherRow {
  session: string;
  runCount: number;
  temp_f: number;
  rh_pct: number;
  pressure_inhg: number;
  density_alt_ft: number;
  hpc: number;
  avgOffsetMin?: number | null;
  localTimeHint?: string | null;
}

export interface WeatherConfidence {
  totalRuns: number;
  matchedRuns: number;
  pctMatched: number | null;
  avgOffsetMin: number | null;
  maxOffsetMin: number | null;
}

export interface ParitySessionWeatherResponse {
  eventId: number;
  classIndex: string;
  trackTimezone?: string;
  sessions: ParitySessionWeatherRow[];
  weatherConfidence?: WeatherConfidence;
}

// ── Range Parity Matrix Types ────────────────────────────────────────────

export interface RangeMatrixCell {
  best: number;
  avgTopN: number;
  totalAvg: number;
  count: number;
}

export interface RangeParityEvent {
  eventId: number;
  event_name: string;
  event_code: string | null;
  track_name: string;
  city: string | null;
  state: string | null;
  start_date_local: string;
}

export interface RangeParityMatrixResponse {
  classIndex: string;
  metric: string;
  mode: 'raw' | 'corrected';
  topN: number;
  sessionScope: 'qual' | 'elim' | 'both';
  isLowerBetter: boolean;
  startDate: string;
  endDate: string;
  events: RangeParityEvent[];
  combos: string[];
  matrix: Record<number, Record<string, RangeMatrixCell>>;
}

// ── Backfill Job Types ──────────────────────────────────────────────────

export interface BackfillJob {
  id: number;
  type: 'runs' | 'weather';
  status: 'running' | 'complete' | 'error' | 'paused' | 'cancelled';
  createdByUserId: number | null;
  params: Record<string, unknown>;
  totalItems: number;
  completedCount: number;
  skippedCount: number;
  noDataCount: number;
  errorCount: number;
  currentItemKey: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

export interface BackfillJobItem {
  item_key: string;
  status: 'pending' | 'ok' | 'skipped' | 'no_data' | 'error';
  attempts: number;
  last_http_status: number | null;
  last_error: string | null;
  rows_fetched: number;
  rows_inserted: number;
  rows_deduped: number;
  updated_at: string;
}

export interface BackfillStatusResponse {
  job: BackfillJob;
  items: BackfillJobItem[];
}

export interface BackfillJobsResponse {
  jobs: BackfillJob[];
  count: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────

async function parityRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = options.method === 'POST'
    ? `${API_BASE}${endpoint}`
    : `${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${Date.now()}`;

  // Extract action name for diagnostics
  const actionMatch = endpoint.match(/action=(\w+)/);
  const actionLabel = actionMatch ? actionMatch[1] : endpoint;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err: any) {
    throw new Error(`[${actionLabel}] Network error: ${err.message}`);
  }

  // Read body as text first so we can diagnose non-JSON responses
  const text = await response.text();

  // Detect HTML responses (dev server fallback, PHP error page, etc.)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html') || text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html')) {
    throw new Error(
      `[${actionLabel}] HTTP ${response.status} — received HTML instead of JSON. ` +
      (response.status === 200
        ? 'The /api proxy may not be configured (dev server returning index.html).'
        : `Server returned an error page.`) +
      ` Body: ${text.slice(0, 200)}`
    );
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `[${actionLabel}] HTTP ${response.status} — invalid JSON response. Body: ${text.slice(0, 200)}`
    );
  }

  if (!response.ok && response.status !== 409) {
    throw new Error(data.error || `[${actionLabel}] API request failed (HTTP ${response.status})`);
  }

  return data;
}

// ── Cache ───────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const cache: {
  tracks?: CacheEntry<TracksResponse>;
  events?: CacheEntry<EventsResponse>;
  imports?: CacheEntry<ImportsResponse>;
} = {};

function isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return !!entry && (Date.now() - entry.fetchedAt) < CACHE_TTL_MS;
}

/** Invalidate one or all cache keys. Called after mutations. */
export function invalidateParityCache(key?: 'tracks' | 'events' | 'imports') {
  if (key) { delete cache[key]; }
  else { delete cache.tracks; delete cache.events; delete cache.imports; }
}

// ── API ─────────────────────────────────────────────────────────────────

export const parityApi = {
  async peek(raceLookup: string): Promise<PeekResponse> {
    return parityRequest<PeekResponse>(
      `/parity.php?action=peek&raceLookup=${encodeURIComponent(raceLookup)}`
    );
  },

  async ingest(raceLookup: string, force = false): Promise<IngestResponse> {
    const result = await parityRequest<IngestResponse>('/parity.php?action=ingest', {
      method: 'POST',
      body: JSON.stringify({ raceLookup, force }),
    });
    invalidateParityCache('imports');
    return result;
  },

  async queryRuns(params: RunsQueryParams): Promise<RunsResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'runs');
    qs.set('raceLookup', params.raceLookup);
    if (params.classIndex) qs.set('classIndex', params.classIndex);
    if (params.driverName) qs.set('driverName', params.driverName);
    if (params.lane) qs.set('lane', params.lane);
    if (params.round) qs.set('round', params.round);
    if (params.dq) qs.set('dq', params.dq);
    if (params.includeBad) qs.set('includeBad', params.includeBad);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));
    return parityRequest<RunsResponse>(`/parity.php?${qs.toString()}`);
  },

  async suggestRaceLookups(year: number, maxAttempts = 60): Promise<SuggestResponse> {
    return parityRequest<SuggestResponse>(
      `/parity.php?action=suggestRaceLookups&year=${year}&maxAttempts=${maxAttempts}`
    );
  },

  async listImports(limit = 50, force = false): Promise<ImportsResponse> {
    if (!force && isFresh(cache.imports)) return cache.imports.data;
    const data = await parityRequest<ImportsResponse>(
      `/parity.php?action=imports&limit=${limit}`
    );
    cache.imports = { data, fetchedAt: Date.now() };
    return data;
  },

  // ── Weather / Track / Event ─────────────────────────────────────────

  async createTrack(trackName: string, timezoneIana: string): Promise<TrackResponse> {
    const result = await parityRequest<TrackResponse>('/parity.php?action=createTrack', {
      method: 'POST',
      body: JSON.stringify({ trackName, timezoneIana }),
    });
    invalidateParityCache('tracks');
    return result;
  },

  async createEvent(params: CreateEventParams): Promise<EventResponse> {
    const result = await parityRequest<EventResponse>('/parity.php?action=createEvent', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    invalidateParityCache('events');
    return result;
  },

  async listTracks(force = false): Promise<TracksResponse> {
    if (!force && isFresh(cache.tracks)) return cache.tracks.data;
    const data = await parityRequest<TracksResponse>('/parity.php?action=tracks');
    cache.tracks = { data, fetchedAt: Date.now() };
    return data;
  },

  async listEvents(force = false): Promise<EventsResponse> {
    if (!force && isFresh(cache.events)) return cache.events.data;
    const data = await parityRequest<EventsResponse>('/parity.php?action=events');
    cache.events = { data, fetchedAt: Date.now() };
    return data;
  },

  async weatherBackfill(params: WeatherBackfillParams): Promise<WeatherBackfillResponse> {
    const result = await parityRequest<WeatherBackfillResponse>('/parity.php?action=weatherBackfill', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return result;
  },

  async weatherBuildCanonical(params: WeatherBuildCanonicalParams = {}): Promise<WeatherBuildCanonicalResponse> {
    return parityRequest<WeatherBuildCanonicalResponse>('/parity.php?action=weatherBuildCanonical', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async runsWithWeather(params: RunsWithWeatherParams): Promise<RunsWithWeatherResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'runsWithWeather');
    qs.set('raceLookup', params.raceLookup);
    if (params.windowMinutes) qs.set('windowMinutes', String(params.windowMinutes));
    if (params.category) qs.set('category', params.category);
    if (params.classIndex) qs.set('classIndex', params.classIndex);
    if (params.driverName) qs.set('driverName', params.driverName);
    if (params.lane) qs.set('lane', params.lane);
    if (params.round) qs.set('round', params.round);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));
    return parityRequest<RunsWithWeatherResponse>(`/parity.php?${qs.toString()}`);
  },

  async weatherSamples(params: WeatherSamplesParams = {}): Promise<WeatherSamplesResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'weatherSamples');
    if (params.eventId) qs.set('eventId', String(params.eventId));
    if (params.fromUtc) qs.set('fromUtc', params.fromUtc);
    if (params.toUtc) qs.set('toUtc', params.toUtc);
    if (params.limit) qs.set('limit', String(params.limit));
    return parityRequest<WeatherSamplesResponse>(`/parity.php?${qs.toString()}`);
  },

  async weatherCanonical(params: WeatherCanonicalParams = {}): Promise<WeatherCanonicalResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'weatherCanonical');
    if (params.fromUtc) qs.set('fromUtc', params.fromUtc);
    if (params.toUtc) qs.set('toUtc', params.toUtc);
    if (params.limit) qs.set('limit', String(params.limit));
    return parityRequest<WeatherCanonicalResponse>(`/parity.php?${qs.toString()}`);
  },

  // ── Trends (Top-by-Event) ─────────────────────────────────────────

  async topByEvent(params: TopByEventParams): Promise<TopByEventResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'topByEvent');
    qs.set('classIndex', params.classIndex);
    qs.set('metric', params.metric);
    if (params.startRaceLookup) qs.set('startRaceLookup', params.startRaceLookup);
    if (params.endRaceLookup) qs.set('endRaceLookup', params.endRaceLookup);
    if (params.includeDQ !== undefined) qs.set('includeDQ', params.includeDQ ? '1' : '0');
    if (params.minRunCount !== undefined) qs.set('minRunCount', String(params.minRunCount));
    if (params.limit) qs.set('limit', String(params.limit));
    return parityRequest<TopByEventResponse>(`/parity.php?${qs.toString()}`);
  },

  async eventCatalog(startYear?: number, endYear?: number): Promise<EventCatalogResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'eventCatalog');
    if (startYear) qs.set('startYear', String(startYear));
    if (endYear) qs.set('endYear', String(endYear));
    return parityRequest<EventCatalogResponse>(`/parity.php?${qs.toString()}`);
  },

  async upsertEventCatalog(params: UpsertEventCatalogParams): Promise<UpsertEventCatalogParams> {
    return parityRequest<UpsertEventCatalogParams>('/parity.php?action=upsertEventCatalog', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async ingestMany(params: IngestManyParams): Promise<IngestManyResponse> {
    const result = await parityRequest<IngestManyResponse>('/parity.php?action=ingestMany', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    invalidateParityCache('imports');
    return result;
  },

  // ── Backfill Jobs ──────────────────────────────────────────────────

  async startBackfillRuns(params: { yearStart: number; yearEnd: number; throttleMs?: number; force?: boolean }): Promise<{ job: BackfillJob }> {
    return parityRequest<{ job: BackfillJob }>('/parity.php?action=startBackfillRuns', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async startBackfillWeather(params: { eventId: number; throttleMs?: number; minRowsPerDay?: number }): Promise<{ job: BackfillJob }> {
    return parityRequest<{ job: BackfillJob }>('/parity.php?action=startBackfillWeather', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async resumeBackfill(jobId: number): Promise<{ job: BackfillJob }> {
    return parityRequest<{ job: BackfillJob }>('/parity.php?action=resumeBackfill', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    });
  },

  async cancelBackfill(jobId: number): Promise<{ job: BackfillJob }> {
    return parityRequest<{ job: BackfillJob }>('/parity.php?action=cancelBackfill', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    });
  },

  async backfillStatus(jobId: number): Promise<BackfillStatusResponse> {
    return parityRequest<BackfillStatusResponse>(`/parity.php?action=backfillStatus&jobId=${jobId}`);
  },

  async backfillJobs(type?: string): Promise<BackfillJobsResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'backfillJobs');
    if (type) qs.set('type', type);
    return parityRequest<BackfillJobsResponse>(`/parity.php?${qs.toString()}`);
  },

  // ── Events + Scraper ────────────────────────────────────────────────

  async eventsWithStats(seasonYear?: number): Promise<EventsWithStatsResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'eventsWithStats');
    if (seasonYear) qs.set('seasonYear', String(seasonYear));
    return parityRequest<EventsWithStatsResponse>(`/parity.php?${qs.toString()}`);
  },

  async eventCategories(eventId: number): Promise<EventCategoriesResponse> {
    return parityRequest<EventCategoriesResponse>(`/parity.php?action=eventCategories&eventId=${eventId}`);
  },

  async scrapeNhraSchedule(params: { yearStart: number; yearEnd: number; throttleMs?: number; force?: boolean }): Promise<ScrapeResult> {
    return parityRequest<ScrapeResult>('/parity.php?action=scrapeNhraSchedule', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async ingestEventRuns(params: { eventId?: number; raceLookup?: string; force?: boolean }): Promise<IngestResponse> {
    return parityRequest<IngestResponse>('/parity.php?action=ingestEventRuns', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async backfillEventWeather(params: { eventId: number; throttleMs?: number; minRowsPerDay?: number }): Promise<{ job: BackfillJob }> {
    return parityRequest<{ job: BackfillJob }>('/parity.php?action=backfillEventWeather', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // ── Run Flagging ────────────────────────────────────────────────────

  async flagRun(params: { runId: number; flagType: 'bad' | 'note' | 'exclude'; reason?: string }): Promise<{ ok: boolean; runId: number; flagType: string }> {
    return parityRequest<{ ok: boolean; runId: number; flagType: string }>('/parity.php?action=flagRun', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async runFlags(raceLookup: string): Promise<RunFlagsResponse> {
    return parityRequest<RunFlagsResponse>(`/parity.php?action=runFlags&raceLookup=${raceLookup}`);
  },

  // ── Parity Analysis ─────────────────────────────────────────────────

  async eventParitySummary(params: { eventId: number; classIndex: string; includeBad?: boolean }): Promise<EventParitySummaryResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'eventParitySummary');
    qs.set('eventId', String(params.eventId));
    qs.set('classIndex', params.classIndex);
    if (params.includeBad) qs.set('includeBad', '1');
    return parityRequest<EventParitySummaryResponse>(`/parity.php?${qs.toString()}`);
  },

  async qualSheet(params: { eventId: number; classIndex: string; includeCorrected?: boolean; includeBad?: boolean }): Promise<QualSheetResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'qualSheet');
    qs.set('eventId', String(params.eventId));
    qs.set('classIndex', params.classIndex);
    if (params.includeCorrected) qs.set('includeCorrected', '1');
    if (params.includeBad) qs.set('includeBad', '1');
    return parityRequest<QualSheetResponse>(`/parity.php?${qs.toString()}`);
  },

  async ladder(params: { eventId: number; classIndex: string; ladderSize?: number; includeBad?: boolean }): Promise<LadderResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'ladder');
    qs.set('eventId', String(params.eventId));
    qs.set('classIndex', params.classIndex);
    if (params.ladderSize) qs.set('ladderSize', String(params.ladderSize));
    if (params.includeBad) qs.set('includeBad', '1');
    return parityRequest<LadderResponse>(`/parity.php?${qs.toString()}`);
  },

  // ── Admin CRUD ─────────────────────────────────────────────────────────

  async listTracksWithStats(): Promise<TracksWithStatsResponse> {
    return parityRequest<TracksWithStatsResponse>('/parity.php?action=listTracksWithStats');
  },

  async updateTrack(params: { trackId: number; track_name?: string; timezone_iana?: string; street?: string; city?: string; state?: string; zip?: string }): Promise<{ ok: boolean; trackId: number }> {
    return parityRequest<{ ok: boolean; trackId: number }>('/parity.php?action=updateTrack', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async mergeTracks(params: { sourceTrackId: number; targetTrackId: number }): Promise<{ ok: boolean; sourceTrackId: number; targetTrackId: number; eventsMoved: number }> {
    return parityRequest<{ ok: boolean; sourceTrackId: number; targetTrackId: number; eventsMoved: number }>('/parity.php?action=mergeTracks', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async unflagRun(params: { runId: number; flagType?: string }): Promise<{ ok: boolean; runId: number; deleted: number }> {
    return parityRequest<{ ok: boolean; runId: number; deleted: number }>('/parity.php?action=unflagRun', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async updateEvent(params: { eventId: number; event_name?: string; event_code?: string; season_year?: number | null; track_id?: number; start_date_local?: string; end_date_local?: string; race_lookup?: string }): Promise<{ ok: boolean; eventId: number }> {
    return parityRequest<{ ok: boolean; eventId: number }>('/parity.php?action=updateEvent', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async bulkCreateEvents(params: {
    events: BulkCreateEventRow[];
    skipDuplicates?: boolean;
    updateExisting?: boolean;
  }): Promise<BulkCreateEventsResponse> {
    const result = await parityRequest<BulkCreateEventsResponse>('/parity.php?action=bulkCreateEvents', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    invalidateParityCache('events');
    return result;
  },

  // ── Dashboard endpoints ───────────────────────────────────────────────

  async eventSummary(params: { eventId: number; classIndex?: string }): Promise<EventSummaryResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'eventSummary');
    qs.set('eventId', String(params.eventId));
    if (params.classIndex) qs.set('classIndex', params.classIndex);
    return parityRequest<EventSummaryResponse>(`/parity.php?${qs.toString()}`);
  },

  async drivers(params: { classIndex?: string; search?: string; limit?: number }): Promise<DriversResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'drivers');
    if (params.classIndex) qs.set('classIndex', params.classIndex);
    if (params.search) qs.set('search', params.search);
    if (params.limit) qs.set('limit', String(params.limit));
    return parityRequest<DriversResponse>(`/parity.php?${qs.toString()}`);
  },

  async runsByDriver(params: {
    driverName: string;
    classIndex?: string;
    startDate?: string;
    endDate?: string;
    eventId?: number;
    round?: string;
    session?: 'qual' | 'elim' | '';
    includeFlagged?: boolean;
    includeWeather?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<RunsByDriverResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'runsByDriver');
    qs.set('driverName', params.driverName);
    if (params.classIndex) qs.set('classIndex', params.classIndex);
    if (params.startDate) qs.set('startDate', params.startDate);
    if (params.endDate) qs.set('endDate', params.endDate);
    if (params.eventId) qs.set('eventId', String(params.eventId));
    if (params.round) qs.set('round', params.round);
    if (params.session) qs.set('session', params.session);
    if (params.includeFlagged) qs.set('includeFlagged', '1');
    if (params.includeWeather) qs.set('includeWeather', '1');
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));
    return parityRequest<RunsByDriverResponse>(`/parity.php?${qs.toString()}`);
  },

  // ── Class Alias endpoints ──────────────────────────────────────────────

  async listClassAliases(): Promise<ClassAliasListResponse> {
    return parityRequest<ClassAliasListResponse>('/parity.php?action=listClassAliases');
  },

  async addClassAlias(params: { canonical: string; alias: string }): Promise<{ ok: boolean; id: number }> {
    return parityRequest<{ ok: boolean; id: number }>('/parity.php?action=addClassAlias', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async deleteClassAlias(id: number): Promise<{ ok: boolean; deleted: number }> {
    return parityRequest<{ ok: boolean; deleted: number }>('/parity.php?action=deleteClassAlias', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  },

  // ── Engine Combo endpoints ─────────────────────────────────────────────

  async listEngineCombos(): Promise<EngineComboListResponse> {
    return parityRequest<EngineComboListResponse>('/parity.php?action=listEngineCombos');
  },

  async upsertEngineCombo(params: { id?: number; name: string; tPower: number; dPower: number; FF: number }): Promise<{ ok: boolean; id: number }> {
    return parityRequest<{ ok: boolean; id: number }>('/parity.php?action=upsertEngineCombo', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async deleteEngineCombo(id: number): Promise<{ ok: boolean }> {
    return parityRequest<{ ok: boolean }>('/parity.php?action=deleteEngineCombo', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  },

  // ── Driver Combo endpoints ─────────────────────────────────────────────

  async listDriverCombos(params?: { driverName?: string; classIndex?: string }): Promise<DriverComboListResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'listDriverCombos');
    if (params?.driverName) qs.set('driverName', params.driverName);
    if (params?.classIndex) qs.set('classIndex', params.classIndex);
    return parityRequest<DriverComboListResponse>(`/parity.php?${qs.toString()}`);
  },

  async upsertDriverCombo(params: { id?: number; driverName: string; classIndex: string; engineComboId: number; effectiveFromUtc: string; effectiveToUtc?: string | null }): Promise<{ ok: boolean; id: number }> {
    return parityRequest<{ ok: boolean; id: number }>('/parity.php?action=upsertDriverCombo', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async deleteDriverCombo(id: number): Promise<{ ok: boolean }> {
    return parityRequest<{ ok: boolean }>('/parity.php?action=deleteDriverCombo', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  },

  // ── Class Default Combo endpoints ──────────────────────────────────────

  async listClassDefaults(params?: { classIndex?: string }): Promise<ClassDefaultListResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'listClassDefaults');
    if (params?.classIndex) qs.set('classIndex', params.classIndex);
    return parityRequest<ClassDefaultListResponse>(`/parity.php?${qs.toString()}`);
  },

  async upsertClassDefault(params: { id?: number; classIndex: string; engineComboId: number; effectiveFromUtc?: string | null; effectiveToUtc?: string | null; notes?: string | null }): Promise<{ ok: boolean; id: number }> {
    return parityRequest<{ ok: boolean; id: number }>('/parity.php?action=upsertClassDefault', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async deleteClassDefault(id: number): Promise<{ ok: boolean }> {
    return parityRequest<{ ok: boolean }>('/parity.php?action=deleteClassDefault', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  },

  // ── Assign Combos helper endpoints ────────────────────────────────────

  async driversAtEvent(params: { eventId: number; classIndex?: string }): Promise<DriversAtEventResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'driversAtEvent');
    qs.set('eventId', String(params.eventId));
    if (params.classIndex) qs.set('classIndex', params.classIndex);
    return parityRequest<DriversAtEventResponse>(`/parity.php?${qs.toString()}`);
  },

  async bulkUpsertDriverCombos(items: { driverName: string; classIndex: string; engineComboId: number; effectiveFromUtc: string; effectiveToUtc?: string | null }[]): Promise<BulkUpsertDriverCombosResponse> {
    return parityRequest<BulkUpsertDriverCombosResponse>('/parity.php?action=bulkUpsertDriverCombos', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  // ── CSV Weather Backfill ────────────────────────────────────────────────

  async backfillWeatherCsv(params: {
    eventId: number;
    trackId: number;
    rows: { timestampUtc: string; tempF: number; humidityPct: number; baroInHg: number }[];
  }): Promise<BackfillWeatherCsvResponse> {
    return parityRequest<BackfillWeatherCsvResponse>('/parity.php?action=backfillWeatherCsv', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async backfillWeatherProvider(params: {
    eventId: number;
    trackId: number;
    provider: string;
    startUtc: string;
    endUtc: string;
    lat?: number;
    lon?: number;
  }): Promise<BackfillWeatherProviderResponse> {
    return parityRequest<BackfillWeatherProviderResponse>('/parity.php?action=backfillWeatherProvider', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // ── Weather Reliability ─────────────────────────────────────────────

  async weatherCoverage(eventId: number): Promise<WeatherCoverageResponse> {
    return parityRequest<WeatherCoverageResponse>(
      `/parity.php?action=weatherCoverage&eventId=${eventId}`,
    );
  },

  async weatherHealthBackfill(params: {
    eventId: number;
    missingOnly?: boolean;
  }): Promise<WeatherHealthBackfillResponse> {
    return parityRequest<WeatherHealthBackfillResponse>('/parity.php?action=weatherHealthBackfill', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async weatherHealthRebuild(eventId: number): Promise<WeatherHealthRebuildResponse> {
    return parityRequest<WeatherHealthRebuildResponse>('/parity.php?action=weatherHealthRebuild', {
      method: 'POST',
      body: JSON.stringify({ eventId }),
    });
  },

  async updateTrackCoords(params: {
    trackId: number;
    latitude: number;
    longitude: number;
  }): Promise<{ ok: boolean; trackId: number; latitude: number; longitude: number }> {
    return parityRequest<{ ok: boolean; trackId: number; latitude: number; longitude: number }>(
      '/parity.php?action=updateTrackCoords',
      { method: 'POST', body: JSON.stringify(params) },
    );
  },

  // ── Weather Timeseries ──────────────────────────────────────────────

  async weatherTimeseries(params: { eventId: number; startUtc?: string; endUtc?: string }): Promise<WeatherTimeseriesResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'weatherTimeseries');
    qs.set('eventId', String(params.eventId));
    if (params.startUtc) qs.set('startUtc', params.startUtc);
    if (params.endUtc) qs.set('endUtc', params.endUtc);
    return parityRequest<WeatherTimeseriesResponse>(`/parity.php?${qs.toString()}`);
  },

  // ── Parity By Combo ────────────────────────────────────────────────

  async parityByCombo(params: {
    eventId: number;
    classIndex: string;
    metric?: string;
    mode?: 'raw' | 'corrected';
    topN?: number;
    sessionScope?: 'qual' | 'elim' | 'both';
    includeFlagged?: boolean;
    includeUnknown?: boolean;
  }): Promise<ParityByComboResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'parityByCombo');
    qs.set('eventId', String(params.eventId));
    qs.set('classIndex', params.classIndex);
    if (params.metric) qs.set('metric', params.metric);
    if (params.mode) qs.set('mode', params.mode);
    if (params.topN) qs.set('topN', String(params.topN));
    if (params.sessionScope) qs.set('sessionScope', params.sessionScope);
    if (params.includeFlagged) qs.set('includeFlagged', '1');
    if (params.includeUnknown) qs.set('includeUnknown', '1');
    return parityRequest<ParityByComboResponse>(`/parity.php?${qs.toString()}`);
  },

  // ── Split Parity Endpoints (fast load) ─────────────────────────────

  async paritySummary(params: {
    eventId: number;
    classIndex?: string;
    category?: string;
    metric?: string;
    mode?: 'raw' | 'corrected';
    topN?: number;
    sessionScope?: 'qual' | 'elim' | 'both';
    includeFlagged?: boolean;
    includeUnknown?: boolean;
  }): Promise<ParitySummaryResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'paritySummary');
    qs.set('eventId', String(params.eventId));
    if (params.category) qs.set('category', params.category);
    else if (params.classIndex) qs.set('classIndex', params.classIndex);
    if (params.metric) qs.set('metric', params.metric);
    if (params.mode) qs.set('mode', params.mode);
    if (params.topN) qs.set('topN', String(params.topN));
    if (params.sessionScope) qs.set('sessionScope', params.sessionScope);
    if (params.includeFlagged) qs.set('includeFlagged', '1');
    if (params.includeUnknown) qs.set('includeUnknown', '1');
    return parityRequest<ParitySummaryResponse>(`/parity.php?${qs.toString()}`);
  },

  async parityDeltas(params: {
    eventId: number;
    classIndex?: string;
    category?: string;
    metric?: string;
    mode?: 'raw' | 'corrected';
    topN?: number;
    sessionScope?: 'qual' | 'elim' | 'both';
    includeUnknown?: boolean;
  }): Promise<ParityDeltasResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'parityDeltas');
    qs.set('eventId', String(params.eventId));
    if (params.category) qs.set('category', params.category);
    else if (params.classIndex) qs.set('classIndex', params.classIndex);
    if (params.metric) qs.set('metric', params.metric);
    if (params.mode) qs.set('mode', params.mode);
    if (params.topN) qs.set('topN', String(params.topN));
    if (params.sessionScope) qs.set('sessionScope', params.sessionScope);
    if (params.includeUnknown) qs.set('includeUnknown', '1');
    return parityRequest<ParityDeltasResponse>(`/parity.php?${qs.toString()}`);
  },

  async parityAllRuns(params: {
    eventId: number;
    classIndex?: string;
    category?: string;
    metric?: string;
    mode?: 'raw' | 'corrected';
    sessionScope?: 'qual' | 'elim' | 'both';
    page?: number;
    pageSize?: number;
    driverSearch?: string;
  }): Promise<ParityAllRunsResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'parityAllRuns');
    qs.set('eventId', String(params.eventId));
    if (params.category) qs.set('category', params.category);
    else if (params.classIndex) qs.set('classIndex', params.classIndex);
    if (params.metric) qs.set('metric', params.metric);
    if (params.mode) qs.set('mode', params.mode);
    if (params.sessionScope) qs.set('sessionScope', params.sessionScope);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params.driverSearch) qs.set('driverSearch', params.driverSearch);
    return parityRequest<ParityAllRunsResponse>(`/parity.php?${qs.toString()}`);
  },

  async parityQualOrder(params: {
    eventId: number;
    classIndex?: string;
    category?: string;
    metric?: string;
    mode?: 'raw' | 'corrected';
    sessionScope?: 'qual' | 'elim' | 'both';
  }): Promise<ParityQualOrderResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'parityQualOrder');
    qs.set('eventId', String(params.eventId));
    if (params.category) qs.set('category', params.category);
    else if (params.classIndex) qs.set('classIndex', params.classIndex);
    if (params.metric) qs.set('metric', params.metric);
    if (params.mode) qs.set('mode', params.mode);
    if (params.sessionScope) qs.set('sessionScope', params.sessionScope);
    return parityRequest<ParityQualOrderResponse>(`/parity.php?${qs.toString()}`);
  },

  async parityIncrementals(params: {
    eventId: number;
    classIndex?: string;
    category?: string;
    sessionScope?: 'qual' | 'elim' | 'both';
    mode?: 'raw' | 'corrected';
    includeFlagged?: boolean;
    includeUnknown?: boolean;
  }): Promise<ParityIncrementalsResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'parityIncrementals');
    qs.set('eventId', String(params.eventId));
    if (params.category) qs.set('category', params.category);
    else if (params.classIndex) qs.set('classIndex', params.classIndex);
    if (params.sessionScope) qs.set('sessionScope', params.sessionScope);
    if (params.mode) qs.set('mode', params.mode);
    if (params.includeFlagged) qs.set('includeFlagged', '1');
    if (params.includeUnknown) qs.set('includeUnknown', '1');
    return parityRequest<ParityIncrementalsResponse>(`/parity.php?${qs.toString()}`);
  },

  async paritySessionWeather(params: {
    eventId: number;
    classIndex?: string;
    category?: string;
  }): Promise<ParitySessionWeatherResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'paritySessionWeather');
    qs.set('eventId', String(params.eventId));
    if (params.category) qs.set('category', params.category);
    else if (params.classIndex) qs.set('classIndex', params.classIndex);
    return parityRequest<ParitySessionWeatherResponse>(`/parity.php?${qs.toString()}`);
  },

  async rangeParityMatrix(params: {
    classIndex?: string;
    category?: string;
    metric?: string;
    mode?: 'raw' | 'corrected';
    topN?: number;
    sessionScope?: 'qual' | 'elim' | 'both';
    year?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<RangeParityMatrixResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'rangeParityMatrix');
    if (params.category) qs.set('category', params.category);
    else if (params.classIndex) qs.set('classIndex', params.classIndex);
    if (params.metric) qs.set('metric', params.metric);
    if (params.mode) qs.set('mode', params.mode);
    if (params.topN) qs.set('topN', String(params.topN));
    if (params.sessionScope) qs.set('sessionScope', params.sessionScope);
    if (params.year) qs.set('year', String(params.year));
    if (params.startDate) qs.set('startDate', params.startDate);
    if (params.endDate) qs.set('endDate', params.endDate);
    return parityRequest<RangeParityMatrixResponse>(`/parity.php?${qs.toString()}`);
  },

  async importStationCsv(params: {
    rows: StationCsvImportRow[];
    bufferHours?: number;
    source?: string;
    rebuildCanonical?: boolean;
    previewOnly?: boolean;
  }): Promise<StationCsvImportResponse> {
    return parityRequest<StationCsvImportResponse>('/parity.php?action=importStationCsv', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // ── Track Coord Coverage + Batch Backfill ──────────────────────────

  async trackCoordCoverage(yearFrom = 2021, yearTo = 2024): Promise<TrackCoordCoverageResponse> {
    return parityRequest<TrackCoordCoverageResponse>(
      `/parity.php?action=trackCoordCoverage&yearFrom=${yearFrom}&yearTo=${yearTo}`,
    );
  },

  async bulkUpdateTrackCoords(tracks: { trackId: number; latitude: number; longitude: number }[]): Promise<BulkUpdateTrackCoordsResponse> {
    return parityRequest<BulkUpdateTrackCoordsResponse>('/parity.php?action=bulkUpdateTrackCoords', {
      method: 'POST',
      body: JSON.stringify({ tracks }),
    });
  },

  async batchWeatherBackfill(params: {
    yearFrom: number;
    yearTo: number;
    maxCoveragePct?: number;
    dryRun?: boolean;
  }): Promise<BatchWeatherBackfillResponse> {
    return parityRequest<BatchWeatherBackfillResponse>('/parity.php?action=batchWeatherBackfill', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async backfillRunUtcFromLocal(params: {
    eventId?: number;
    yearFrom?: number;
    yearTo?: number;
    all?: boolean;
    dryRun?: boolean;
  }): Promise<BackfillRunUtcResponse> {
    return parityRequest<BackfillRunUtcResponse>('/parity.php?action=backfillRunUtcFromLocal', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async listOrphanRuns(limit = 200, offset = 0): Promise<OrphanRunsResponse> {
    return parityRequest<OrphanRunsResponse>(
      `/parity.php?action=listOrphanRuns&limit=${limit}&offset=${offset}`,
    );
  },

  async timeSmokeTest(): Promise<TimeSmokeTestResponse> {
    return parityRequest<TimeSmokeTestResponse>(
      `/parity.php?action=timeSmokeTest`,
    );
  },

  async timeDiagnosticsSample(params: {
    eventId: number;
    classIndex: string;
    limit?: number;
  }): Promise<TimeDiagnosticsSampleResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'timeDiagnosticsSample');
    qs.set('eventId', String(params.eventId));
    qs.set('classIndex', params.classIndex);
    if (params.limit) qs.set('limit', String(params.limit));
    return parityRequest<TimeDiagnosticsSampleResponse>(`/parity.php?${qs.toString()}`);
  },

  // ── Refresh Event Data ──────────────────────────────────────────────

  async refreshEventData(eventId: number): Promise<RefreshEventDataResponse> {
    return parityRequest<RefreshEventDataResponse>('/parity.php?action=refreshEventData', {
      method: 'POST',
      body: JSON.stringify({ eventId }),
    });
  },

  async updateRun(runId: number, fields: Record<string, string | number | boolean | null>): Promise<{ ok: boolean; runId: number; updatedFields: string[] }> {
    return parityRequest<{ ok: boolean; runId: number; updatedFields: string[] }>('/parity.php?action=updateRun', {
      method: 'POST',
      body: JSON.stringify({ runId, fields }),
    });
  },

  // ── Anomaly Analysis ────────────────────────────────────────────────

  async anomalyAnalysis(params: {
    raceLookup: string;
    category?: string;
    classIndex?: string;
    limit?: number;
  }): Promise<AnomalyAnalysisResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'anomalyAnalysis');
    qs.set('raceLookup', params.raceLookup);
    if (params.category) qs.set('category', params.category);
    else if (params.classIndex) qs.set('classIndex', params.classIndex);
    if (params.limit) qs.set('limit', String(params.limit));
    return parityRequest<AnomalyAnalysisResponse>(`/parity.php?${qs.toString()}`);
  },

  async anomalyDetail(params: {
    runId: number;
    raceLookup: string;
  }): Promise<AnomalyDetailResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'anomalyDetail');
    qs.set('runId', String(params.runId));
    qs.set('raceLookup', params.raceLookup);
    return parityRequest<AnomalyDetailResponse>(`/parity.php?${qs.toString()}`);
  },
};
