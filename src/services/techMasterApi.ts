/**
 * Tech Master API Client
 *
 * Typed wrappers for the NHRA Tech Master endpoints (api/tm-*.php).
 * All endpoints require nhra.tech.read or nhra.tech.admin capability.
 */

import { getAuthToken } from './api';

const API_BASE = '/api';

// ── Shared helpers ───────────────────────────────────────────────────────

async function tmGet<T>(file: string, action: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${API_BASE}/${file}`, window.location.origin);
  url.searchParams.set('action', action);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  const token = getAuthToken();
  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Cache-Control': 'no-cache',
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function tmPost<T>(file: string, action: string, body: Record<string, unknown>): Promise<T> {
  const url = `${API_BASE}/${file}?action=${encodeURIComponent(action)}`;
  const token = getAuthToken();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Types: Identities ───────────────────────────────────────────────────

export interface Person {
  id: number;
  uuid: string;
  display_name: string;
  normalized_name: string;
  first_name: string | null;
  last_name: string | null;
  nhra_license_id: string | null;
  person_type: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: number;
  uuid: string;
  name: string;
  short_name: string | null;
  nhra_entrant_id: string | null;
  org_type: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleAsset {
  id: number;
  uuid: string;
  chassis_serial: string | null;
  body_type: string | null;
  description: string | null;
  current_org_id: number | null;
  primary_category: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Component {
  id: number;
  uuid: string;
  serial_number: string | null;
  component_type: string;
  manufacturer: string | null;
  description: string | null;
  current_vehicle_id: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type IdentityType = 'person' | 'organization' | 'vehicle' | 'component';

export interface IdentityListResponse<T> {
  items: T[];
  total: number;
  type: string;
}

export interface IdentityGetResponse<T> {
  item: T;
  type: string;
}

export interface IdentityCreateResponse {
  id: number;
  uuid: string;
  type: string;
}

export interface IdentityUpdateResponse {
  updated: boolean;
  id: number;
  type: string;
}

// ── Types: Events ───────────────────────────────────────────────────────

export interface Season {
  id: number;
  year: number;
  label: string | null;
  status: string;
  created_at: string;
}

export interface EventType {
  id: number;
  code: string;
  label: string;
  sort_order: number;
  is_active: number;
  created_at: string;
}

export interface EventInstance {
  id: number;
  uuid: string;
  event_type_id: number;
  season_id: number | null;
  track_id: number;
  name: string;
  event_code: string | null;
  start_date_local: string;
  end_date_local: string;
  race_lookup: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  event_type_code?: string;
  event_type_label?: string;
  track_name?: string;
  city?: string | null;
  state?: string | null;
  timezone_iana?: string;
  season_year?: number | null;
}

// ── Types: Entries ──────────────────────────────────────────────────────

export interface EventEntry {
  id: number;
  uuid: string;
  event_instance_id: number;
  person_id: number | null;
  org_id: number | null;
  vehicle_id: number | null;
  category: string | null;
  class_index: string | null;
  competition_number: string | null;
  entry_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  person_name?: string | null;
  org_name?: string | null;
  vehicle_description?: string | null;
}

// ── Types: Identity Matching ────────────────────────────────────────────

export interface IdentityMatchResult<T> {
  match_status: 'exact' | 'suggestions' | 'none' | 'empty';
  exact: T | null;
  suggestions: Array<T & { match_score?: number }>;
  query?: string;
}

export type PersonMatchResult = IdentityMatchResult<Person>;
export type OrgMatchResult = IdentityMatchResult<Organization>;

// ── Types: Roster Import ────────────────────────────────────────────────

export interface RosterRawRow {
  competition_number: string;
  driver_name: string;
  team_name: string;
  vehicle_description: string;
  category: string;
  class_index: string;
}

export interface RosterPersonMatch {
  status: 'exact' | 'suggestions' | 'none' | 'empty';
  person_id: number | null;
  display_name: string | null;
  suggestions?: Array<{ id: number; display_name: string }>;
}

export interface RosterOrgMatch {
  status: 'exact' | 'suggestions' | 'none' | 'empty';
  org_id: number | null;
  name: string | null;
  suggestions?: Array<{ id: number; name: string }>;
}

export interface RosterPreviewRow {
  row: number;
  raw: RosterRawRow;
  person_match: RosterPersonMatch;
  org_match: RosterOrgMatch;
  is_duplicate: boolean;
  needs_review: boolean;
}

export interface RosterPreviewResponse {
  event: { id: number; name: string };
  rows: RosterPreviewRow[];
  total: number;
  exact_matches: number;
  needs_review: number;
  duplicates: number;
}

export interface RosterCommitRow {
  competition_number?: string;
  driver_name?: string;
  team_name?: string;
  vehicle_description?: string;
  category?: string;
  class_index?: string;
  person_id?: number | null;
  org_id?: number | null;
  vehicle_id?: number | null;
  create_person?: boolean;
  create_org?: boolean;
  notes?: string;
}

export interface RosterCommitResult {
  row: number;
  status: 'created' | 'error';
  entry_id?: number;
  person_id?: number | null;
  org_id?: number | null;
  error?: string;
}

// ── Types: Entry Detail ─────────────────────────────────────────────────

export interface EntryLinkage {
  person_linked: boolean;
  person_provisional: boolean;
  org_linked: boolean;
  org_provisional: boolean;
  vehicle_linked: boolean;
  vehicle_provisional: boolean;
  fully_linked: boolean;
  tech_case_count: number;
  scale_ready: boolean;
}

export interface EntryChangeRecord {
  id: number;
  event_entry_id: number;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  changed_by: number | null;
  changed_at: string;
}

export interface EntryDetailResponse {
  entry: EventEntry & {
    person_status?: string | null;
    person_type?: string | null;
    nhra_license_id?: string | null;
    person_first_name?: string | null;
    person_last_name?: string | null;
    normalized_name?: string | null;
    org_short_name?: string | null;
    org_type?: string | null;
    org_status?: string | null;
    chassis_serial?: string | null;
    body_type?: string | null;
    vehicle_category?: string | null;
    vehicle_status?: string | null;
    event_name?: string;
    race_lookup?: string | null;
    start_date_local?: string;
    end_date_local?: string;
  };
  changes: EntryChangeRecord[];
  linkage: EntryLinkage;
}

export interface CategoryInfo {
  category: string | null;
  class_index: string | null;
  entry_count: number;
}

// ── Types: Scale MVP ─────────────────────────────────────────────────────

export type ScaleMeasurementMode = 'combined' | 'driver_only' | 'car_only';
export type ScaleLinkMethod = 'auto_fk' | 'auto_name' | 'auto_carnum' | 'manual' | 'unlinked';

export interface ScaleRecord {
  id: number;
  uuid: string;
  tech_case_id: number;
  event_entry_id: number;
  measurement_mode: ScaleMeasurementMode;
  measured_total_weight: number | null;
  measured_driver_weight: number | null;
  measured_car_weight: number | null;
  measured_rear_axle_weight: number | null;
  derived_total_weight: number | null;
  is_official: number;
  linked_run_id: number | null;
  link_method: ScaleLinkMethod | null;
  measured_at: string;
  operator_id: number | null;
  scale_station: string | null;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  // Joined fields (from listByEvent)
  competition_number?: string | null;
  class_index?: string | null;
  category?: string | null;
  person_name?: string | null;
  org_name?: string | null;
  vehicle_description?: string | null;
  event_name?: string | null;
  // Nested (from getRecord)
  findings?: TechFinding[];
}

export interface ScaleRule {
  id: number;
  category: string;
  class_index: string;
  season_year: number | null;
  min_total_weight: number | null;
  min_rear_axle_weight: number | null;
  rear_axle_required: number;
  driver_weigh_required: number;
  is_active: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScaleCreateParams {
  event_entry_id: number;
  measurement_mode: ScaleMeasurementMode;
  measured_total_weight?: number;
  measured_driver_weight?: number;
  measured_car_weight?: number;
  measured_rear_axle_weight?: number;
  is_official?: number;
  operator_id?: number;
  scale_station?: string;
  notes?: string;
}

export interface ScaleCreateResponse {
  id: number;
  uuid: string;
  tech_case_id: number;
  measurement_mode: string;
  derived_total_weight: number | null;
  linked_run_id: number | null;
  link_method: string;
  link_confidence: LinkConfidence;
  flags: string[];
}

export interface ScaleComplianceResponse {
  record_id: number;
  result: 'pass' | 'fail' | 'review';
  effective_weight: number | null;
  rule: ScaleRule | null;
  under_minimum_total: boolean;
  under_minimum_rear: boolean;
  findings: TechFinding[];
  open_flag_count: number;
}

export interface DriverReferenceResponse {
  driver_weight: number | null;
  has_reference: boolean;
  reference_record: { id: number; measured_driver_weight: number; measured_at: string; is_official: number } | null;
}

export interface EntryScaleStatusResponse {
  entry_id: number;
  rule: ScaleRule | null;
  driver_reference_weight: number | null;
  needs_driver_reference: boolean;
  latest_record: ScaleRecord | null;
  effective_weight: number | null;
  under_minimum: boolean;
  record_count: number;
  scale_status: 'not_weighed' | 'under_minimum' | 'weighed';
}

// ── Types: Batch 4 — Derivation & Linkage ──────────────────────────────

export type DerivationSource = 'manual' | 'roster_import' | 'run_derived';
export type LinkConfidence = 'high' | 'medium' | 'low' | 'none';

export interface DerivationEventResult {
  event_instance_id: number;
  race_lookup: string;
  distinct_drivers: number;
  entries_created: number;
  entries_skipped: number;
  persons_created: number;
}

export interface DeriveFromRunsResponse {
  dry_run: boolean;
  events_processed: number;
  total_entries_created: number;
  total_entries_skipped: number;
  total_persons_created: number;
  event_results: DerivationEventResult[];
}

export interface BackfillEventResult {
  event_instance_id: number;
  race_lookup: string;
  total_unlinked_runs: number;
  runs_linked: number;
  runs_skipped_no_entry: number;
  runs_ambiguous: number;
}

export interface BackfillRunLinksResponse {
  dry_run: boolean;
  events_processed: number;
  total_runs_linked: number;
  total_runs_skipped: number;
  total_runs_ambiguous: number;
  event_results: BackfillEventResult[];
}

export interface DerivationStatusEvent {
  id: number;
  name: string;
  race_lookup: string | null;
  start_date_local: string;
  total_runs: number;
  linked_runs: number;
  unlinked_runs: number;
  link_rate: number | null;
  total_entries: number;
  derived_entries: number;
}

export interface DerivationStatusSingle {
  event_instance_id: number;
  event_name: string;
  race_lookup: string | null;
  total_runs: number;
  linked_runs: number;
  unlinked_runs: number;
  link_rate: number | null;
  total_entries: number;
  entries_by_source: Record<string, number>;
  entries_no_person: number;
}

export interface DerivationStatusSummary {
  events: DerivationStatusEvent[];
  count: number;
  global_total_runs: number;
  global_linked_runs: number;
  global_link_rate: number | null;
}

export type LinkReviewMode = 'unlinked_runs' | 'weak_entries' | 'unlinked_scale' | 'ambiguous_runs';

export interface LinkReviewItem {
  id?: number;
  driver_name?: string;
  car_number?: string | null;
  category?: string | null;
  class_index?: string | null;
  round?: string | null;
  lane?: string | null;
  run_timestamp_utc?: string | null;
  ft1320?: number | null;
  mph1320?: number | null;
  competition_number?: string | null;
  source_driver_name?: string | null;
  derivation_source?: string | null;
  entry_status?: string | null;
  person_name?: string | null;
  person_status?: string | null;
  person_id?: number | null;
  linked_run_count?: number;
  measurement_mode?: string | null;
  measured_total_weight?: number | null;
  link_method?: string | null;
  link_confidence?: string | null;
  measured_at?: string | null;
  reason: string;
  candidate_entries?: Array<{
    id: number;
    source_driver_name?: string | null;
    competition_number?: string | null;
    class_index?: string | null;
    category?: string | null;
    person_name?: string | null;
    normalized_name?: string | null;
  }>;
  // For ambiguous_runs mode
  unlinked_run_count?: number;
  candidate_entry_count?: number;
  sample_runs?: Array<{ id: number; driver_name: string; car_number?: string | null; round?: string | null; lane?: string | null; run_timestamp_utc?: string | null }>;
}

export interface LinkReviewResponse {
  items: LinkReviewItem[];
  count: number;
  mode: LinkReviewMode;
  eventInstanceId?: number;
}

// ── Types: Fuel MVP ──────────────────────────────────────────────────────

export type FuelCheckType = 'spot_check' | 'pre_run' | 'post_run' | 'random' | 'confiscation';
export type FuelType = 'nitromethane' | 'methanol' | 'gasoline' | 'diesel' | 'e85' | 'other';
export type FuelTestResult = 'pass' | 'fail' | 'no_rule';
export type FuelOverallResult = 'pass' | 'fail' | 'review';

export interface FuelRecord {
  id: number;
  uuid: string;
  tech_case_id: number;
  event_entry_id: number;
  check_type: FuelCheckType;
  fuel_type_declared: FuelType | null;
  sample_id: string | null;
  sg_measured: number | null;
  sg_expected_min: number | null;
  sg_expected_max: number | null;
  sg_result: FuelTestResult | null;
  dielectric_measured: number | null;
  dielectric_expected_min: number | null;
  dielectric_expected_max: number | null;
  dielectric_result: FuelTestResult | null;
  temperature_f: number | null;
  overall_result: FuelOverallResult;
  is_official: number;
  linked_run_id: number | null;
  link_method: string | null;
  link_confidence: LinkConfidence | null;
  measured_at: string;
  operator_id: number | null;
  test_station: string | null;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  // Joined fields (from listByEvent)
  competition_number?: string | null;
  class_index?: string | null;
  category?: string | null;
  person_name?: string | null;
  org_name?: string | null;
  // Nested (from getRecord)
  findings?: TechFinding[];
  event_name?: string | null;
  vehicle_description?: string | null;
}

export interface FuelRule {
  id: number;
  category: string;
  class_index: string;
  season_year: number | null;
  fuel_type_required: FuelType | null;
  sg_min: number | null;
  sg_max: number | null;
  dielectric_min: number | null;
  dielectric_max: number | null;
  temperature_compensate: number;
  is_active: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FuelCreateParams {
  event_entry_id: number;
  check_type?: FuelCheckType;
  fuel_type_declared?: FuelType;
  sample_id?: string;
  sg_measured?: number;
  dielectric_measured?: number;
  temperature_f?: number;
  is_official?: number;
  operator_id?: number;
  test_station?: string;
  notes?: string;
}

export interface FuelCreateResponse {
  id: number;
  uuid: string;
  tech_case_id: number;
  check_type: string;
  overall_result: FuelOverallResult;
  sg_result: FuelTestResult | null;
  dielectric_result: FuelTestResult | null;
  linked_run_id: number | null;
  link_method: string;
  link_confidence: LinkConfidence;
  flags: string[];
}

export interface FuelComplianceResponse {
  record_id: number;
  overall_result: FuelOverallResult;
  sg_result: FuelTestResult | null;
  dielectric_result: FuelTestResult | null;
  rule: FuelRule | null;
  findings: TechFinding[];
  open_flag_count: number;
}

export interface EntryFuelStatusResponse {
  entry_id: number;
  rule: FuelRule | null;
  latest_record: FuelRecord | null;
  record_count: number;
  fail_count: number;
  fuel_status: 'not_checked' | 'has_failure' | 'checked_ok';
}

// ── Types: Inspection / General Tech ────────────────────────────────────

export type InspectionTemplateType = 'general_tech' | 'body' | 'chassis';
export type InspectionItemType = 'checkbox' | 'measurement' | 'note';
export type InspectionOverallResult = 'pass' | 'fail' | 'incomplete' | 'review';
export type InspectionResponseResult = 'pass' | 'fail' | 'na' | 'skip';

export interface InspectionTemplate {
  id: number;
  uuid: string;
  template_type: InspectionTemplateType;
  category: string;
  class_index: string;
  season_year: number | null;
  label: string;
  description: string | null;
  is_active: number;
  sort_order: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
  items?: InspectionTemplateItem[];
}

export interface InspectionTemplateItem {
  id: number;
  template_id: number;
  item_type: InspectionItemType;
  label: string;
  description: string | null;
  sort_order: number;
  is_required: number;
  spec_min: number | null;
  spec_max: number | null;
  spec_unit: string | null;
  expected_value: string | null;
  created_at: string;
}

export interface InspectionRecord {
  id: number;
  uuid: string;
  tech_case_id: number;
  event_entry_id: number;
  template_id: number | null;
  overall_result: InspectionOverallResult;
  is_official: number;
  measured_at: string;
  completed_at: string | null;
  operator_id: number | null;
  inspection_area: string | null;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  competition_number?: string | null;
  class_index?: string | null;
  category?: string | null;
  person_name?: string | null;
  org_name?: string | null;
  template_label?: string | null;
  template_type?: string | null;
  event_name?: string | null;
  // Nested
  responses?: InspectionResponse[];
  findings?: TechFinding[];
}

export interface InspectionResponse {
  id: number;
  inspection_record_id: number;
  template_item_id: number | null;
  item_label: string;
  item_type: InspectionItemType;
  bool_value: number | null;
  numeric_value: number | null;
  text_value: string | null;
  result: InspectionResponseResult | null;
  notes: string | null;
  created_at: string;
}

export interface InspectionCreateParams {
  event_entry_id: number;
  template_id?: number;
  inspection_area?: string;
  is_official?: number;
  notes?: string;
  responses?: Array<{
    template_item_id?: number;
    item_label?: string;
    item_type?: InspectionItemType;
    bool_value?: number;
    numeric_value?: number;
    text_value?: string;
    result?: InspectionResponseResult;
    notes?: string;
  }>;
}

export interface InspectionCreateResponse {
  id: number;
  uuid: string;
  tech_case_id: number;
  template_id: number | null;
  overall_result: InspectionOverallResult;
  response_count: number;
  flags: string[];
}

export interface InspectionComplianceResponse {
  record_id: number;
  overall_result: InspectionOverallResult;
  findings: TechFinding[];
  open_flag_count: number;
  response_summary: {
    total: number;
    pass: number;
    fail: number;
    na: number;
    skip: number;
    unanswered: number;
  };
}

export interface EntryInspectionStatusResponse {
  entry_id: number;
  record_count: number;
  fail_count: number;
  incomplete_count: number;
  inspection_status: 'not_inspected' | 'has_failure' | 'has_incomplete' | 'inspected_ok';
  latest_record: InspectionRecord | null;
}

export interface EntryTechSummaryResponse {
  entry_id: number;
  scale: { status: string; record_count: number };
  fuel: { status: string; record_count: number; fail_count: number };
  inspection: { status: string; record_count: number; fail_count: number; incomplete_count: number };
}

// ── Types: Tech Card / Declaration ──────────────────────────────────────

export type TechCardStatus = 'missing' | 'uploaded' | 'under_review' | 'audited' | 'discrepancy_found' | 'closed';
export type DeclFieldType = 'text' | 'number' | 'boolean' | 'select';

export interface TechCardDeclaration {
  id: number;
  uuid: string;
  event_entry_id: number;
  tech_case_id: number | null;
  card_status: TechCardStatus;
  card_type: string | null;
  category: string | null;
  class_index: string | null;
  revision: number;
  received_at: string | null;
  received_by: number | null;
  audited_at: string | null;
  audited_by: number | null;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  competition_number?: string | null;
  entry_class?: string | null;
  entry_category?: string | null;
  person_name?: string | null;
  org_name?: string | null;
  event_name?: string | null;
  event_instance_id?: number;
  field_count?: number;
  artifact_count?: number;
  // Nested
  fields?: TechCardField[];
  artifacts?: TechCardArtifact[];
  findings?: TechFinding[];
}

export interface TechCardField {
  id: number;
  declaration_id: number;
  field_key: string;
  field_label: string;
  field_group: string | null;
  field_type: DeclFieldType;
  declared_value: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TechCardArtifact {
  id: number;
  uuid: string;
  declaration_id: number;
  original_filename: string;
  storage_path: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  page_count: number | null;
  uploaded_by: number;
  uploaded_at: string;
}

export interface TechCardCreateParams {
  event_entry_id: number;
  card_type?: string;
  notes?: string;
}

export interface TechCardCreateResponse {
  id: number;
  uuid: string;
  revision: number;
  field_count: number;
  category: string;
  class_index: string;
}

export interface TechCardAuditResponse {
  audited: boolean;
  declaration_id: number;
  tech_case_id: number;
  card_status: TechCardStatus;
  flags: string[];
  finding_count: number;
}

export interface EntryCardStatusResponse {
  entry_id: number;
  card_status: string;
  declaration_count: number;
  latest_declaration: { id: number; card_status: string; revision: number; received_at: string | null; audited_at: string | null; artifact_count: number } | null;
}

export interface EventCardSummaryEntry {
  entry_id: number;
  competition_number: string | null;
  class_index: string | null;
  category: string | null;
  person_name: string | null;
  card_status: string;
}

export interface EventCardSummaryResponse {
  eventInstanceId: number;
  total_entries: number;
  entries: EventCardSummaryEntry[];
  counts: Record<string, number>;
}

export interface FieldTemplateItem {
  field_key: string;
  field_label: string;
  field_group: string | null;
  field_type: DeclFieldType;
  sort_order: number;
}

// ── Types: Teardown ─────────────────────────────────────────────────────

export type TeardownStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type TeardownItemType = 'serial_check' | 'measurement' | 'visual_check' | 'note';
export type TeardownResult = 'pass' | 'fail' | 'na' | 'skip' | 'review';
export type TeardownOverall = 'pass' | 'fail' | 'incomplete' | 'review';

export interface TeardownTemplate {
  id: number;
  uuid: string;
  category: string;
  class_index: string;
  label: string;
  description: string | null;
  is_active: number;
  sort_order: number;
  item_count?: number;
  items?: TeardownTemplateItem[];
  created_at: string;
  updated_at: string;
}

export interface TeardownTemplateItem {
  id: number;
  template_id: number;
  item_category: string;
  item_label: string;
  item_type: TeardownItemType;
  description: string | null;
  sort_order: number;
  is_required: number;
  spec_min: number | null;
  spec_max: number | null;
  spec_unit: string | null;
  declaration_key: string | null;
  created_at: string;
}

export interface TeardownRecord {
  id: number;
  uuid: string;
  event_entry_id: number;
  tech_case_id: number | null;
  template_id: number | null;
  teardown_status: TeardownStatus;
  bay_assignment: string | null;
  overall_result: TeardownOverall;
  started_at: string | null;
  completed_at: string | null;
  operator_id: number | null;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  // Joined
  competition_number?: string | null;
  entry_class?: string | null;
  entry_category?: string | null;
  event_instance_id?: number;
  person_name?: string | null;
  org_name?: string | null;
  event_name?: string | null;
  template_label?: string | null;
  item_count?: number;
  // Nested
  observed_items?: TeardownObservedItem[];
  findings?: TechFinding[];
}

export interface TeardownObservedItem {
  id: number;
  teardown_record_id: number;
  template_item_id: number | null;
  item_category: string;
  item_label: string;
  item_type: TeardownItemType;
  observed_serial: string | null;
  observed_value: number | null;
  observed_text: string | null;
  expected_serial: string | null;
  expected_value_min: number | null;
  expected_value_max: number | null;
  spec_unit: string | null;
  declaration_key: string | null;
  result: TeardownResult | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeardownCreateResponse {
  id: number;
  uuid: string;
  tech_case_id: number;
  item_count: number;
}

export interface TeardownCompleteResponse {
  completed: boolean;
  teardown_record_id: number;
  tech_case_id: number;
  overall_result: TeardownOverall;
  flags: string[];
  finding_count: number;
}

export interface TeardownDeclCompareResponse {
  compared: boolean;
  reason?: string;
  teardown_record_id?: number;
  tech_case_id?: number;
  declaration_id?: number;
  flags: string[];
  finding_count: number;
}

export interface EntryTeardownStatusResponse {
  entry_id: number;
  teardown_status: string;
  record_count: number;
  latest_record: { id: number; teardown_status: string; overall_result: string; started_at: string | null; completed_at: string | null } | null;
}

export interface EventTeardownSummaryEntry {
  entry_id: number;
  competition_number: string | null;
  class_index: string | null;
  category: string | null;
  person_name: string | null;
  teardown_status: string;
  overall_result: string | null;
}

export interface EventTeardownSummaryResponse {
  eventInstanceId: number;
  total_entries: number;
  entries: EventTeardownSummaryEntry[];
  counts: Record<string, number>;
}

// ── Types: Admin / Config (Batch 10) ────────────────────────────────────

export interface AdminInspectionTemplate {
  id: number;
  uuid: string;
  template_type: string;
  category: string;
  class_index: string;
  season_year: number | null;
  label: string;
  description: string | null;
  is_active: number;
  sort_order: number;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminInspectionTemplateItem {
  id: number;
  template_id: number;
  item_type: string;
  label: string;
  sort_order: number;
  is_required: number;
  spec_min: string | null;
  spec_max: string | null;
  spec_unit: string | null;
  expected_value: string | null;
}

export interface AdminInspectionTemplateDetail extends AdminInspectionTemplate {
  items: AdminInspectionTemplateItem[];
}

export interface AdminTeardownTemplate {
  id: number;
  uuid: string;
  category: string;
  class_index: string;
  label: string;
  description: string | null;
  is_active: number;
  sort_order: number;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminTeardownTemplateItem {
  id: number;
  template_id: number;
  item_category: string;
  item_label: string;
  item_type: string;
  description: string | null;
  sort_order: number;
  is_required: number;
  spec_min: string | null;
  spec_max: string | null;
  spec_unit: string | null;
  declaration_key: string | null;
}

export interface AdminTeardownTemplateDetail extends AdminTeardownTemplate {
  items: AdminTeardownTemplateItem[];
}

export interface AdminScaleRule {
  id: number;
  category: string;
  class_index: string;
  season_year: number | null;
  min_total_weight: string | null;
  min_rear_axle_weight: string | null;
  rear_axle_required: number;
  driver_weigh_required: number;
  is_active: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminFuelRule {
  id: number;
  category: string;
  class_index: string;
  season_year: number | null;
  fuel_type_required: string | null;
  sg_min: string | null;
  sg_max: string | null;
  dielectric_min: string | null;
  dielectric_max: string | null;
  temperature_compensate: number;
  is_active: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequiredModuleConfig {
  id: number;
  category: string;
  class_index: string;
  module_key: string;
  is_required: number;
  context: string;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface FindingStatusHistoryEntry {
  id: number;
  finding_id: number;
  old_disposition: string | null;
  new_disposition: string;
  notes: string | null;
  changed_by: number;
  changed_by_name: string | null;
  changed_at: string;
}

export interface FindingHistoryResponse {
  finding: {
    id: number;
    uuid: string;
    tech_case_id: number;
    finding_type: string;
    severity: string;
    description: string;
    measured_value: string | null;
    expected_value: string | null;
    disposition: string;
    follow_up_required: number;
    resolved_at: string | null;
    resolved_by: number | null;
    notes: string | null;
    created_at: string;
    case_type: string;
    case_status: string;
  };
  history: FindingStatusHistoryEntry[];
  history_count: number;
}

// ── Types: Entry Holds / Escalation (Batch 11) ────────────────────────────

export interface EntryHold {
  id: number;
  event_entry_id: number;
  hold_type: string;
  reason: string;
  notes: string | null;
  placed_by: number;
  placed_at: string;
  cleared_by: number | null;
  cleared_at: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  competition_number?: string;
  person_name?: string;
  placed_by_name?: string;
  cleared_by_name?: string;
}

export interface EntryHoldHistoryEntry {
  id: number;
  entry_hold_id: number;
  action: string;
  old_reason: string | null;
  new_reason: string | null;
  notes: string | null;
  changed_by: number;
  changed_by_name: string | null;
  changed_at: string;
}

export interface EntryHoldWithHistory extends EntryHold {
  history: EntryHoldHistoryEntry[];
}

// ── Types: Dossier / Reporting Bridge ────────────────────────────────────

export interface DossierEntryHeader {
  entry_id: number;
  event_instance_id: number;
  event_name: string | null;
  event_start_date: string | null;
  competition_number: string | null;
  category: string | null;
  class_index: string | null;
  entry_status: string | null;
  person_id: number | null;
  person_name: string | null;
  org_id: number | null;
  org_name: string | null;
  vehicle_id: number | null;
  vehicle_desc: string | null;
}

export interface DossierModuleStatus {
  status: string;
  record_count: number;
  [key: string]: unknown;
}

export interface DossierScaleStatus extends DossierModuleStatus {
  effective_weight: number | null;
  latest_record: { id: number; measured_total_weight: string | null; derived_total_weight: string | null; measured_at: string | null; is_official: number; measurement_mode: string } | null;
}

export interface DossierFuelStatus extends DossierModuleStatus {
  fail_count: number;
  latest_record: { id: number; fuel_type_detected: string | null; overall_result: string; measured_at: string | null; is_official: number } | null;
}

export interface DossierInspectionStatus extends DossierModuleStatus {
  pass_count: number;
  fail_count: number;
  incomplete_count: number;
  latest_record: { id: number; overall_result: string; completed_at: string | null; inspection_area: string | null; template_label: string | null } | null;
}

export interface DossierTechCardStatus extends DossierModuleStatus {
  declaration_count: number;
  latest_declaration_id: number | null;
  latest_revision: number | null;
  latest_declaration: { id: number; card_status: string; revision: number; received_at: string | null; audited_at: string | null; artifact_count: number; field_count: number } | null;
}

export interface DossierTeardownStatus extends DossierModuleStatus {
  overall_result: string | null;
  latest_record: { id: number; teardown_status: string; overall_result: string; bay_assignment: string | null; started_at: string | null; completed_at: string | null; template_label: string | null; item_count: number } | null;
}

export interface DossierFindingItem {
  id: number;
  finding_type: string;
  severity: string;
  description: string;
  measured_value: string | null;
  expected_value: string | null;
  disposition: string;
  follow_up_required: number;
  created_at: string;
  case_type: string;
}

export interface DossierFindingsSummary {
  total_count: number;
  open_count: number;
  critical_count: number;
  high_count: number;
  by_module: Record<string, number>;
  breakdown: Array<{ severity: string; disposition: string; case_type: string; cnt: string }>;
  open_findings_list: DossierFindingItem[];
}

export type DossierReadiness = 'clear' | 'has_issues' | 'critical';

export interface EntryDossierResponse {
  entry: DossierEntryHeader;
  scale: DossierScaleStatus;
  fuel: DossierFuelStatus;
  inspection: DossierInspectionStatus;
  techcard: DossierTechCardStatus;
  teardown: DossierTeardownStatus;
  findings: DossierFindingsSummary;
  readiness: DossierReadiness;
  issues: string[];
  generated_at: string;
}

export interface ComplianceEntryRow {
  entry_id: number;
  competition_number: string | null;
  class_index: string | null;
  category: string | null;
  person_name: string | null;
  scale_status: string;
  fuel_status: string;
  inspection_status: string;
  techcard_status: string;
  teardown_status: string;
  teardown_result: string | null;
  open_findings: number;
  readiness: DossierReadiness;
  issues: string[];
}

export interface ComplianceSummary {
  total: number;
  clear: number;
  has_issues: number;
  critical: number;
  missing_scale: number;
  missing_fuel: number;
  missing_inspection: number;
  missing_techcard: number;
  fuel_failure: number;
  inspection_failure: number;
  teardown_failure: number;
  techcard_discrepancy: number;
  with_open_findings: number;
}

export interface EventComplianceResponse {
  eventInstanceId: number;
  total_entries: number;
  entries: ComplianceEntryRow[];
  summary: ComplianceSummary;
  class_filter: string;
  generated_at: string;
}

export interface FindingsAggregateItem {
  id: number;
  uuid: string;
  tech_case_id: number;
  finding_type: string;
  severity: string;
  description: string;
  measured_value: string | null;
  expected_value: string | null;
  disposition: string;
  follow_up_required: number;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
  case_type: string;
  case_status: string;
  event_entry_id: number;
  competition_number: string | null;
  class_index: string | null;
  category: string | null;
  person_name: string | null;
}

export interface FindingsAggregateResponse {
  findings: FindingsAggregateItem[];
  total_count: number;
  returned: number;
  offset: number;
  limit: number;
  breakdown: Array<{ severity: string; disposition: string; cnt: string }>;
  by_module: Record<string, number>;
  filters: {
    eventInstanceId: number | null;
    eventEntryId: number | null;
    module: string | null;
    severity: string | null;
    status: string | null;
  };
  generated_at: string;
}

export interface EntryExportResponse {
  entry_id: number;
  event_name: string | null;
  event_date: string | null;
  competition_number: string | null;
  category: string | null;
  class_index: string | null;
  driver_name: string | null;
  team_name: string | null;
  scale_status: string;
  scale_effective_weight: number | null;
  scale_record_count: number;
  fuel_status: string;
  fuel_record_count: number;
  inspection_status: string;
  inspection_record_count: number;
  techcard_status: string;
  techcard_revision: number | null;
  teardown_status: string;
  teardown_result: string | null;
  total_findings: number;
  open_findings: number;
  critical_findings: number;
  high_findings: number;
  declaration_fields: Array<{ field_key: string; field_label: string; declared_value: string | null }>;
  open_finding_details: DossierFindingItem[];
  generated_at: string;
}

export interface EventExportResponse {
  event_id: number;
  event_name: string;
  race_lookup: string;
  start_date: string | null;
  end_date: string | null;
  track_name: string | null;
  total_entries: number;
  missing_scale: number;
  missing_fuel: number;
  missing_inspection: number;
  missing_techcard: number;
  failed_fuel: number;
  failed_inspection: number;
  failed_teardown: number;
  techcard_discrepancy: number;
  total_findings: number;
  open_findings: number;
  critical_open: number;
  high_open: number;
  findings_breakdown: Array<{ severity: string; disposition: string; cnt: string }>;
  generated_at: string;
}

// ── Types: Tech Cases ───────────────────────────────────────────────────

export interface TechCase {
  id: number;
  uuid: string;
  event_entry_id: number;
  case_type: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
  operator_id: number | null;
  location: string | null;
  summary: string | null;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  competition_number?: string | null;
  class_index?: string | null;
  category?: string | null;
  person_name?: string | null;
  org_name?: string | null;
  vehicle_description?: string | null;
  finding_count?: number;
  // Nested (on getCase)
  findings?: TechFinding[];
  attachments?: TechAttachment[];
}

export interface TechFinding {
  id: number;
  uuid: string;
  tech_case_id: number;
  finding_type: string;
  severity: string;
  description: string;
  measured_value: string | null;
  expected_value: string | null;
  disposition: string;
  resolved_at: string | null;
  resolved_by: number | null;
  follow_up_required: number;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface TechAttachment {
  id: number;
  uuid: string;
  parent_type: string;
  parent_id: number;
  file_name: string;
  file_type: string;
  file_path: string;
  file_size_bytes: number | null;
  caption: string | null;
  uploaded_by: number;
  created_at: string;
}

// ── API Client ──────────────────────────────────────────────────────────

export const techMasterApi = {
  // ── Identities ──

  listPersons: (params?: { limit?: number; offset?: number; status?: string }) =>
    tmGet<IdentityListResponse<Person>>('tm-identities.php', 'list', { type: 'person', ...params }),

  listOrganizations: (params?: { limit?: number; offset?: number; status?: string }) =>
    tmGet<IdentityListResponse<Organization>>('tm-identities.php', 'list', { type: 'organization', ...params }),

  listVehicles: (params?: { limit?: number; offset?: number; status?: string }) =>
    tmGet<IdentityListResponse<VehicleAsset>>('tm-identities.php', 'list', { type: 'vehicle', ...params }),

  listComponents: (params?: { limit?: number; offset?: number; status?: string }) =>
    tmGet<IdentityListResponse<Component>>('tm-identities.php', 'list', { type: 'component', ...params }),

  getPerson: (id: number) =>
    tmGet<IdentityGetResponse<Person>>('tm-identities.php', 'get', { type: 'person', id }),

  getOrganization: (id: number) =>
    tmGet<IdentityGetResponse<Organization>>('tm-identities.php', 'get', { type: 'organization', id }),

  getVehicle: (id: number) =>
    tmGet<IdentityGetResponse<VehicleAsset>>('tm-identities.php', 'get', { type: 'vehicle', id }),

  getComponent: (id: number) =>
    tmGet<IdentityGetResponse<Component>>('tm-identities.php', 'get', { type: 'component', id }),

  searchPersons: (q: string, limit?: number) =>
    tmGet<{ items: Person[]; query: string }>('tm-identities.php', 'search', { type: 'person', q, limit }),

  createPerson: (data: Partial<Person>) =>
    tmPost<IdentityCreateResponse>('tm-identities.php', 'create&type=person', data),

  updatePerson: (data: Partial<Person> & { id: number }) =>
    tmPost<IdentityUpdateResponse>('tm-identities.php', 'update&type=person', data),

  createOrganization: (data: Partial<Organization>) =>
    tmPost<IdentityCreateResponse>('tm-identities.php', 'create&type=organization', data),

  updateOrganization: (data: Partial<Organization> & { id: number }) =>
    tmPost<IdentityUpdateResponse>('tm-identities.php', 'update&type=organization', data),

  createVehicle: (data: Partial<VehicleAsset>) =>
    tmPost<IdentityCreateResponse>('tm-identities.php', 'create&type=vehicle', data),

  updateVehicle: (data: Partial<VehicleAsset> & { id: number }) =>
    tmPost<IdentityUpdateResponse>('tm-identities.php', 'update&type=vehicle', data),

  createComponent: (data: Partial<Component>) =>
    tmPost<IdentityCreateResponse>('tm-identities.php', 'create&type=component', data),

  updateComponent: (data: Partial<Component> & { id: number }) =>
    tmPost<IdentityUpdateResponse>('tm-identities.php', 'update&type=component', data),

  // ── Events ──

  listSeasons: () =>
    tmGet<{ seasons: Season[] }>('tm-events.php', 'listSeasons'),

  listEventTypes: () =>
    tmGet<{ eventTypes: EventType[] }>('tm-events.php', 'listEventTypes'),

  listEvents: (params?: { seasonId?: number; seasonYear?: number; limit?: number }) =>
    tmGet<{ events: EventInstance[]; count: number }>('tm-events.php', 'listEvents', params),

  getEvent: (id: number) =>
    tmGet<{ event: EventInstance }>('tm-events.php', 'getEvent', { id }),

  createEvent: (data: Record<string, unknown>) =>
    tmPost<{ id: number; uuid: string }>('tm-events.php', 'createEvent', data),

  updateEvent: (data: Record<string, unknown> & { id: number }) =>
    tmPost<{ updated: boolean; id: number }>('tm-events.php', 'updateEvent', data),

  // ── Identity Matching ──

  matchPerson: (name: string, limit?: number) =>
    tmGet<PersonMatchResult>('tm-identities.php', 'matchPerson', { name, limit }),

  matchOrg: (name: string, limit?: number) =>
    tmGet<OrgMatchResult>('tm-identities.php', 'matchOrg', { name, limit }),

  matchVehicle: (q: string, limit?: number) =>
    tmGet<{ match_status: string; suggestions: VehicleAsset[]; query: string }>('tm-identities.php', 'matchVehicle', { q, limit }),

  // ── Entries ──

  listEntriesForEvent: (eventInstanceId: number, classIndex?: string) =>
    tmGet<{ entries: EventEntry[]; count: number }>('tm-entries.php', 'listForEvent', { eventInstanceId, classIndex }),

  getEntry: (id: number) =>
    tmGet<{ entry: EventEntry }>('tm-entries.php', 'get', { id }),

  getEntryDetail: (id: number) =>
    tmGet<EntryDetailResponse>('tm-entries.php', 'getDetail', { id }),

  listCategories: (eventInstanceId: number) =>
    tmGet<{ categories: CategoryInfo[]; eventInstanceId: number }>('tm-entries.php', 'listCategories', { eventInstanceId }),

  createEntry: (data: Record<string, unknown>) =>
    tmPost<{ id: number; uuid: string }>('tm-entries.php', 'create', data),

  updateEntry: (data: Record<string, unknown> & { id: number }) =>
    tmPost<{ updated: boolean; id: number; changesRecorded: number }>('tm-entries.php', 'update', data),

  bulkCreateEntries: (eventInstanceId: number, entries: Record<string, unknown>[]) =>
    tmPost<{ results: Array<{ row: number; status: string; id?: number; uuid?: string; error?: string }>; created: number; total: number }>(
      'tm-entries.php', 'bulkCreate', { event_instance_id: eventInstanceId, entries }),

  // ── Roster Import ──

  rosterPreview: (eventInstanceId: number, rosterText: string, delimiter?: string) =>
    tmPost<RosterPreviewResponse>('tm-entries.php', 'rosterPreview', { event_instance_id: eventInstanceId, roster_text: rosterText, delimiter }),

  rosterCommit: (eventInstanceId: number, rows: RosterCommitRow[]) =>
    tmPost<{ results: RosterCommitResult[]; created: number; total: number }>(
      'tm-entries.php', 'rosterCommit', { event_instance_id: eventInstanceId, rows }),

  // ── Tech Cases ──

  listCases: (eventEntryId: number) =>
    tmGet<{ cases: TechCase[]; count: number }>('tm-techcases.php', 'listCases', { eventEntryId }),

  listCasesByEvent: (eventInstanceId: number, params?: { caseType?: string; status?: string }) =>
    tmGet<{ cases: TechCase[]; count: number }>('tm-techcases.php', 'listCasesByEvent', { eventInstanceId, ...params }),

  getCase: (id: number) =>
    tmGet<{ case: TechCase }>('tm-techcases.php', 'getCase', { id }),

  createCase: (data: { event_entry_id: number; case_type: string; [k: string]: unknown }) =>
    tmPost<{ id: number; uuid: string }>('tm-techcases.php', 'createCase', data),

  updateCase: (data: Record<string, unknown> & { id: number }) =>
    tmPost<{ updated: boolean; id: number }>('tm-techcases.php', 'updateCase', data),

  closeCase: (id: number) =>
    tmPost<{ closed: boolean; id: number }>('tm-techcases.php', 'closeCase', { id }),

  // ── Findings ──

  listFindings: (techCaseId: number) =>
    tmGet<{ findings: TechFinding[]; count: number }>('tm-techcases.php', 'listFindings', { techCaseId }),

  addFinding: (data: { tech_case_id: number; finding_type: string; description: string; [k: string]: unknown }) =>
    tmPost<{ id: number; uuid: string }>('tm-techcases.php', 'addFinding', data),

  updateFinding: (data: Record<string, unknown> & { id: number }) =>
    tmPost<{ updated: boolean; id: number }>('tm-techcases.php', 'updateFinding', data),

  // ── Attachments ──

  listAttachments: (parentType: string, parentId: number) =>
    tmGet<{ attachments: TechAttachment[]; count: number }>('tm-techcases.php', 'listAttachments', { parentType, parentId }),

  // ── Scale MVP ──

  createScaleRecord: (data: ScaleCreateParams) =>
    tmPost<ScaleCreateResponse>('tm-scale.php', 'createRecord', data as unknown as Record<string, unknown>),

  listScaleByEvent: (eventInstanceId: number) =>
    tmGet<{ records: ScaleRecord[]; count: number; eventInstanceId: number }>('tm-scale.php', 'listByEvent', { eventInstanceId }),

  listScaleByEntry: (eventEntryId: number) =>
    tmGet<{ records: ScaleRecord[]; count: number }>('tm-scale.php', 'listByEntry', { eventEntryId }),

  getScaleRecord: (id: number) =>
    tmGet<{ record: ScaleRecord }>('tm-scale.php', 'getRecord', { id }),

  getDriverReference: (eventEntryId: number) =>
    tmGet<DriverReferenceResponse>('tm-scale.php', 'driverReference', { eventEntryId }),

  getScaleCompliance: (scaleRecordId: number) =>
    tmGet<ScaleComplianceResponse>('tm-scale.php', 'compliance', { scaleRecordId }),

  updateScaleRunLink: (scaleRecordId: number, runId: number | null) =>
    tmPost<{ updated: boolean; id: number; linked_run_id: number | null; link_method: string }>(
      'tm-scale.php', 'updateRunLink', { scale_record_id: scaleRecordId, run_id: runId }),

  listScaleRules: (params?: { category?: string; activeOnly?: string }) =>
    tmGet<{ rules: ScaleRule[]; count: number }>('tm-scale.php', 'listRules', params),

  upsertScaleRule: (data: Partial<ScaleRule> & { category: string; class_index: string }) =>
    tmPost<{ upserted: boolean; category: string; class_index: string }>(
      'tm-scale.php', 'upsertRule', data as unknown as Record<string, unknown>),

  getEntryScaleStatus: (eventEntryId: number) =>
    tmGet<EntryScaleStatusResponse>('tm-scale.php', 'entryScaleStatus', { eventEntryId }),

  // ── Batch 4: Derivation & Linkage ──

  deriveFromRuns: (params: { event_instance_id?: number; all?: boolean; dry_run?: boolean }) =>
    tmPost<DeriveFromRunsResponse>('tm-entries.php', 'deriveFromRuns', params),

  backfillRunLinks: (params: { event_instance_id?: number; all?: boolean; dry_run?: boolean }) =>
    tmPost<BackfillRunLinksResponse>('tm-entries.php', 'backfillRunLinks', params),

  derivationStatus: (eventInstanceId?: number) =>
    eventInstanceId
      ? tmGet<DerivationStatusSingle>('tm-entries.php', 'derivationStatus', { eventInstanceId })
      : tmGet<DerivationStatusSummary>('tm-entries.php', 'derivationStatus'),

  linkReview: (eventInstanceId: number, mode: LinkReviewMode, limit?: number) =>
    tmGet<LinkReviewResponse>('tm-entries.php', 'linkReview', { eventInstanceId, mode, limit }),

  manualLink: (runId: number, eventEntryId: number | null) =>
    tmPost<{ updated: boolean; run_id: number; event_entry_id: number | null }>(
      'tm-entries.php', 'manualLink', { run_id: runId, event_entry_id: eventEntryId }),

  markReviewed: (id: number, data: { entry_status?: string; notes?: string }) =>
    tmPost<{ updated: boolean; id: number }>(
      'tm-entries.php', 'markReviewed', { id, ...data }),

  // ── Fuel MVP ──

  createFuelRecord: (data: FuelCreateParams) =>
    tmPost<FuelCreateResponse>('tm-fuel.php', 'createRecord', data as unknown as Record<string, unknown>),

  listFuelByEvent: (eventInstanceId: number) =>
    tmGet<{ records: FuelRecord[]; count: number; eventInstanceId: number }>('tm-fuel.php', 'listByEvent', { eventInstanceId }),

  listFuelByEntry: (eventEntryId: number) =>
    tmGet<{ records: FuelRecord[]; count: number }>('tm-fuel.php', 'listByEntry', { eventEntryId }),

  getFuelRecord: (id: number) =>
    tmGet<{ record: FuelRecord }>('tm-fuel.php', 'getRecord', { id }),

  getFuelCompliance: (fuelRecordId: number) =>
    tmGet<FuelComplianceResponse>('tm-fuel.php', 'compliance', { fuelRecordId }),

  updateFuelRunLink: (fuelRecordId: number, runId: number | null) =>
    tmPost<{ updated: boolean; id: number; linked_run_id: number | null; link_method: string }>(
      'tm-fuel.php', 'updateRunLink', { fuel_record_id: fuelRecordId, run_id: runId }),

  listFuelRules: (params?: { category?: string; activeOnly?: string }) =>
    tmGet<{ rules: FuelRule[]; count: number }>('tm-fuel.php', 'listRules', params),

  upsertFuelRule: (data: Partial<FuelRule> & { category: string; class_index: string }) =>
    tmPost<{ upserted: boolean; category: string; class_index: string }>(
      'tm-fuel.php', 'upsertRule', data as unknown as Record<string, unknown>),

  getEntryFuelStatus: (eventEntryId: number) =>
    tmGet<EntryFuelStatusResponse>('tm-fuel.php', 'entryFuelStatus', { eventEntryId }),

  // ── Inspection / General Tech ──

  listInspectionTemplates: (params?: { templateType?: string; category?: string; classIndex?: string; activeOnly?: string }) =>
    tmGet<{ templates: InspectionTemplate[]; count: number }>('tm-inspection.php', 'listTemplates', params),

  getInspectionTemplate: (id: number) =>
    tmGet<{ template: InspectionTemplate }>('tm-inspection.php', 'getTemplate', { id }),

  upsertInspectionTemplate: (data: Record<string, unknown>) =>
    tmPost<{ upserted: boolean; id: number; action: string }>('tm-inspection.php', 'upsertTemplate', data),

  listInspectionsByEvent: (eventInstanceId: number) =>
    tmGet<{ records: InspectionRecord[]; count: number; eventInstanceId: number }>('tm-inspection.php', 'listByEvent', { eventInstanceId }),

  listInspectionsByEntry: (eventEntryId: number) =>
    tmGet<{ records: InspectionRecord[]; count: number }>('tm-inspection.php', 'listByEntry', { eventEntryId }),

  getInspectionRecord: (id: number) =>
    tmGet<{ record: InspectionRecord }>('tm-inspection.php', 'getRecord', { id }),

  createInspectionRecord: (data: InspectionCreateParams) =>
    tmPost<InspectionCreateResponse>('tm-inspection.php', 'createRecord', data as unknown as Record<string, unknown>),

  completeInspectionRecord: (data: { inspection_record_id: number; responses?: InspectionCreateParams['responses']; notes?: string }) =>
    tmPost<{ completed: boolean; id: number; overall_result: string; flags: string[] }>(
      'tm-inspection.php', 'completeRecord', data as unknown as Record<string, unknown>),

  getInspectionCompliance: (inspectionRecordId: number) =>
    tmGet<InspectionComplianceResponse>('tm-inspection.php', 'compliance', { inspectionRecordId }),

  getEntryInspectionStatus: (eventEntryId: number) =>
    tmGet<EntryInspectionStatusResponse>('tm-inspection.php', 'entryInspectionStatus', { eventEntryId }),

  getEntryTechSummary: (eventEntryId: number) =>
    tmGet<EntryTechSummaryResponse>('tm-inspection.php', 'entryTechSummary', { eventEntryId }),

  // ── Tech Card / Declaration ──

  listTechCardsByEvent: (eventInstanceId: number) =>
    tmGet<{ declarations: TechCardDeclaration[]; count: number; eventInstanceId: number }>('tm-techcard.php', 'listByEvent', { eventInstanceId }),

  listTechCardsByEntry: (eventEntryId: number) =>
    tmGet<{ declarations: TechCardDeclaration[]; count: number }>('tm-techcard.php', 'listByEntry', { eventEntryId }),

  getTechCardDeclaration: (id: number) =>
    tmGet<{ declaration: TechCardDeclaration }>('tm-techcard.php', 'getDeclaration', { id }),

  createTechCardDeclaration: (data: TechCardCreateParams) =>
    tmPost<TechCardCreateResponse>('tm-techcard.php', 'createDeclaration', data as unknown as Record<string, unknown>),

  updateTechCardDeclaration: (data: { declaration_id: number; card_status?: string; card_type?: string; notes?: string }) =>
    tmPost<{ updated: boolean; id: number }>('tm-techcard.php', 'updateDeclaration', data as unknown as Record<string, unknown>),

  saveTechCardFields: (data: { declaration_id: number; fields: Array<{ id?: number; field_key?: string; declared_value: string | null }> }) =>
    tmPost<{ updated: boolean; fields_updated: number }>('tm-techcard.php', 'saveFields', data as unknown as Record<string, unknown>),

  addTechCardArtifact: (data: { declaration_id: number; original_filename: string; storage_path?: string; mime_type?: string; file_size_bytes?: number; page_count?: number }) =>
    tmPost<{ id: number; uuid: string }>('tm-techcard.php', 'addArtifact', data as unknown as Record<string, unknown>),

  listTechCardArtifacts: (declarationId: number) =>
    tmGet<{ artifacts: TechCardArtifact[]; count: number }>('tm-techcard.php', 'listArtifacts', { declarationId }),

  runTechCardAudit: (declarationId: number) =>
    tmPost<TechCardAuditResponse>('tm-techcard.php', 'runAudit', { declaration_id: declarationId }),

  getEntryCardStatus: (eventEntryId: number) =>
    tmGet<EntryCardStatusResponse>('tm-techcard.php', 'entryCardStatus', { eventEntryId }),

  getEventCardSummary: (eventInstanceId: number) =>
    tmGet<EventCardSummaryResponse>('tm-techcard.php', 'eventCardSummary', { eventInstanceId }),

  getFieldTemplate: (category: string, classIndex: string) =>
    tmGet<{ category: string; classIndex: string; fields: FieldTemplateItem[]; count: number }>('tm-techcard.php', 'fieldTemplate', { category, classIndex }),

  // ── Teardown ──

  listTeardownTemplates: (category?: string, classIndex?: string) =>
    tmGet<{ templates: TeardownTemplate[]; count: number }>('tm-teardown.php', 'listTemplates', { ...(category ? { category } : {}), ...(classIndex ? { classIndex } : {}) }),

  getTeardownTemplate: (id: number) =>
    tmGet<{ template: TeardownTemplate }>('tm-teardown.php', 'getTemplate', { id }),

  listTeardownsByEvent: (eventInstanceId: number) =>
    tmGet<{ records: TeardownRecord[]; count: number; eventInstanceId: number }>('tm-teardown.php', 'listByEvent', { eventInstanceId }),

  listTeardownsByEntry: (eventEntryId: number) =>
    tmGet<{ records: TeardownRecord[]; count: number }>('tm-teardown.php', 'listByEntry', { eventEntryId }),

  getTeardownRecord: (id: number) =>
    tmGet<{ record: TeardownRecord }>('tm-teardown.php', 'getRecord', { id }),

  createTeardownRecord: (data: { event_entry_id: number; template_id?: number; bay_assignment?: string; notes?: string }) =>
    tmPost<TeardownCreateResponse>('tm-teardown.php', 'createRecord', data as unknown as Record<string, unknown>),

  updateTeardownRecord: (data: { teardown_record_id: number; teardown_status?: string; bay_assignment?: string; notes?: string }) =>
    tmPost<{ updated: boolean; id: number }>('tm-teardown.php', 'updateRecord', data as unknown as Record<string, unknown>),

  saveTeardownItems: (data: { teardown_record_id: number; items: Array<{ id: number; observed_serial?: string; observed_value?: number | null; observed_text?: string; result?: string; notes?: string }> }) =>
    tmPost<{ updated: boolean; items_updated: number }>('tm-teardown.php', 'saveItems', data as unknown as Record<string, unknown>),

  completeTeardownRecord: (teardownRecordId: number) =>
    tmPost<TeardownCompleteResponse>('tm-teardown.php', 'completeRecord', { teardown_record_id: teardownRecordId }),

  runTeardownDeclComparison: (teardownRecordId: number) =>
    tmPost<TeardownDeclCompareResponse>('tm-teardown.php', 'runDeclComparison', { teardown_record_id: teardownRecordId }),

  getEntryTeardownStatus: (eventEntryId: number) =>
    tmGet<EntryTeardownStatusResponse>('tm-teardown.php', 'entryTeardownStatus', { eventEntryId }),

  getEventTeardownSummary: (eventInstanceId: number) =>
    tmGet<EventTeardownSummaryResponse>('tm-teardown.php', 'eventTeardownSummary', { eventInstanceId }),

  // ── Dossier / Reporting Bridge ──

  getEntryDossier: (eventEntryId: number) =>
    tmGet<EntryDossierResponse>('tm-dossier.php', 'entryDossier', { eventEntryId }),

  getEventCompliance: (eventInstanceId: number, classFilter?: string) =>
    tmGet<EventComplianceResponse>('tm-dossier.php', 'eventCompliance', { eventInstanceId, ...(classFilter ? { classFilter } : {}) }),

  getFindingsAggregate: (params: { eventInstanceId?: number; eventEntryId?: number; module?: string; severity?: string; status?: string; limit?: number; offset?: number }) =>
    tmGet<FindingsAggregateResponse>('tm-dossier.php', 'findingsAggregate', params as Record<string, string | number | undefined>),

  getEntryExport: (eventEntryId: number) =>
    tmGet<EntryExportResponse>('tm-dossier.php', 'entryExport', { eventEntryId }),

  getEventExport: (eventInstanceId: number) =>
    tmGet<EventExportResponse>('tm-dossier.php', 'eventExport', { eventInstanceId }),

  // ── Admin: Inspection Templates ──

  listInspectionTemplatesAdmin: (params?: { category?: string; classIndex?: string }) =>
    tmGet<{ templates: AdminInspectionTemplate[]; count: number }>('tm-admin.php', 'listInspectionTemplates', params),

  getInspectionTemplateAdmin: (templateId: number) =>
    tmGet<{ template: AdminInspectionTemplateDetail }>('tm-admin.php', 'getInspectionTemplate', { templateId }),

  upsertInspectionTemplateAdmin: (data: { id?: number; template_type?: string; category: string; class_index?: string; label: string; description?: string; sort_order?: number; season_year?: number; is_active?: number }) =>
    tmPost<{ upserted: boolean; id: number; action: string }>('tm-admin.php', 'upsertInspectionTemplate', data),

  saveInspectionTemplateItems: (templateId: number, items: Array<{ item_type?: string; label: string; sort_order?: number; is_required?: number; spec_min?: number; spec_max?: number; spec_unit?: string; expected_value?: string }>) =>
    tmPost<{ saved: boolean; template_id: number; item_count: number }>('tm-admin.php', 'saveInspectionTemplateItems', { template_id: templateId, items }),

  toggleInspectionTemplate: (templateId: number, isActive: boolean) =>
    tmPost<{ toggled: boolean }>('tm-admin.php', 'toggleInspectionTemplate', { template_id: templateId, is_active: isActive ? 1 : 0 }),

  // ── Admin: Teardown Templates ──

  listTeardownTemplatesAdmin: (params?: { category?: string; classIndex?: string }) =>
    tmGet<{ templates: AdminTeardownTemplate[]; count: number }>('tm-admin.php', 'listTeardownTemplates', params),

  getTeardownTemplateAdmin: (templateId: number) =>
    tmGet<{ template: AdminTeardownTemplateDetail }>('tm-admin.php', 'getTeardownTemplate', { templateId }),

  upsertTeardownTemplate: (data: { id?: number; category: string; class_index: string; label: string; description?: string; sort_order?: number; is_active?: number }) =>
    tmPost<{ upserted: boolean; id: number; action: string }>('tm-admin.php', 'upsertTeardownTemplate', data),

  saveTeardownTemplateItems: (templateId: number, items: Array<{ item_category?: string; item_label: string; item_type?: string; description?: string; sort_order?: number; is_required?: number; spec_min?: number; spec_max?: number; spec_unit?: string; declaration_key?: string }>) =>
    tmPost<{ saved: boolean; template_id: number; item_count: number }>('tm-admin.php', 'saveTeardownTemplateItems', { template_id: templateId, items }),

  toggleTeardownTemplate: (templateId: number, isActive: boolean) =>
    tmPost<{ toggled: boolean }>('tm-admin.php', 'toggleTeardownTemplate', { template_id: templateId, is_active: isActive ? 1 : 0 }),

  // ── Admin: Scale Rules ──

  listScaleRulesAdmin: (params?: { category?: string }) =>
    tmGet<{ rules: AdminScaleRule[]; count: number }>('tm-admin.php', 'listScaleRules', params),

  upsertScaleRuleAdmin: (data: { id?: number; category: string; class_index: string; season_year?: number; min_total_weight?: number; min_rear_axle_weight?: number; rear_axle_required?: number; driver_weigh_required?: number; is_active?: number; notes?: string }) =>
    tmPost<{ upserted: boolean; id: number; action: string }>('tm-admin.php', 'upsertScaleRule', data),

  toggleScaleRule: (ruleId: number, isActive: boolean) =>
    tmPost<{ toggled: boolean }>('tm-admin.php', 'toggleScaleRule', { rule_id: ruleId, is_active: isActive ? 1 : 0 }),

  // ── Admin: Fuel Rules ──

  listFuelRulesAdmin: (params?: { category?: string }) =>
    tmGet<{ rules: AdminFuelRule[]; count: number }>('tm-admin.php', 'listFuelRules', params),

  upsertFuelRuleAdmin: (data: { id?: number; category: string; class_index: string; season_year?: number; fuel_type_required?: string; sg_min?: number; sg_max?: number; dielectric_min?: number; dielectric_max?: number; temperature_compensate?: number; is_active?: number; notes?: string }) =>
    tmPost<{ upserted: boolean; id: number; action: string }>('tm-admin.php', 'upsertFuelRule', data),

  toggleFuelRule: (ruleId: number, isActive: boolean) =>
    tmPost<{ toggled: boolean }>('tm-admin.php', 'toggleFuelRule', { rule_id: ruleId, is_active: isActive ? 1 : 0 }),

  // ── Admin: Required Module Config ──

  listRequiredModules: (params?: { category?: string; classIndex?: string }) =>
    tmGet<{ configs: RequiredModuleConfig[]; count: number }>('tm-admin.php', 'listRequiredModules', params),

  upsertRequiredModule: (data: { category: string; class_index?: string; module_key: string; context?: string; is_required?: number; notes?: string }) =>
    tmPost<{ upserted: boolean }>('tm-admin.php', 'upsertRequiredModule', data),

  deleteRequiredModule: (configId: number) =>
    tmPost<{ deleted: boolean }>('tm-admin.php', 'deleteRequiredModule', { config_id: configId }),

  // ── Findings Resolution ──

  resolveFinding: (findingId: number, disposition: string, notes?: string) =>
    tmPost<{ resolved: boolean; finding_id: number; old_disposition: string; new_disposition: string; resolved_at: string | null }>('tm-admin.php', 'resolveFinding', { finding_id: findingId, disposition, notes }),

  getFindingHistory: (findingId: number) =>
    tmGet<FindingHistoryResponse>('tm-admin.php', 'findingHistory', { findingId }),

  // ── Entry Holds / Escalation (Batch 11) ──

  listEntryHolds: (params: { entryId?: number; eventInstanceId?: number; activeOnly?: boolean }) =>
    tmGet<{ holds: EntryHold[]; count: number }>('tm-admin.php', 'listEntryHolds', { 
      ...(params.entryId ? { entryId: params.entryId } : {}),
      ...(params.eventInstanceId ? { eventInstanceId: params.eventInstanceId } : {}),
      activeOnly: params.activeOnly !== false ? 1 : 0,
    }),

  placeHold: (data: { entry_id: number; hold_type?: string; reason: string; notes?: string }) =>
    tmPost<{ placed: boolean; hold_id: number; entry_id: number }>('tm-admin.php', 'placeHold', data),

  clearHold: (holdId: number, notes?: string) =>
    tmPost<{ cleared: boolean; hold_id: number; entry_id: number }>('tm-admin.php', 'clearHold', { hold_id: holdId, notes }),

  getHoldHistory: (entryId: number) =>
    tmGet<{ entry_id: number; holds: EntryHoldWithHistory[]; total_holds: number }>('tm-admin.php', 'holdHistory', { entryId }),

  // ── Dossier / Compliance Export (Batch 11) ──

  getEventComplianceCSV: (eventInstanceId: number, classFilter?: string) => {
    const params = new URLSearchParams({ eventInstanceId: eventInstanceId.toString() });
    if (classFilter) params.append('classFilter', classFilter);
    const url = `${API_BASE}/tm-dossier.php?action=eventComplianceCSV&${params.toString()}`;
    window.open(url, '_blank');
  },
};
