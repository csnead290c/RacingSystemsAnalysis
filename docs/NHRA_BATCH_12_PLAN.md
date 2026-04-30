# NHRA Tech Master — Batch 12 Implementation Plan
## Hold/Escalation UI + Entry List/Compliance Enhancements

**Date:** March 16, 2026  
**Status:** Implementation Plan  
**Backend Status:** ✅ COMPLETE (Batch 11)  
**Focus:** Frontend UI over existing APIs

---

## BACKEND CONTRACT AUDIT

### API Endpoints (tm-admin.php)

**Available Actions:**
1. `listEntryHolds` (GET) — List holds for entry or event
2. `placeHold` (POST) — Place hold on entry
3. `clearHold` (POST) — Clear/remove hold
4. `holdHistory` (GET) — Full audit trail for entry

### Hold Types (Validated by Backend)

```php
$validTypes = ['compliance_hold', 'tech_hold', 'escalation', 'flag'];
```

**Type Semantics:**
- `compliance_hold` — Entry fails to meet compliance requirements
- `tech_hold` — Technical issue requiring resolution
- `escalation` — Elevated concern requiring senior review
- `flag` — Informational flag, not blocking

### API Payloads

**placeHold:**
```typescript
{
  entry_id: number;        // required
  hold_type?: string;      // optional, default 'tech_hold'
  reason: string;          // required
  notes?: string;          // optional
}
```

**Response:**
```typescript
{
  placed: boolean;
  hold_id: number;
  entry_id: number;
}
```

**clearHold:**
```typescript
{
  hold_id: number;         // required
  notes?: string;          // optional
}
```

**Response:**
```typescript
{
  cleared: boolean;
  hold_id: number;
  entry_id: number;
}
```

**listEntryHolds:**
```typescript
{
  entryId?: number;
  eventInstanceId?: number;
  activeOnly?: boolean;    // default true
}
```

**Response:**
```typescript
{
  holds: EntryHold[];
  count: number;
}
```

**holdHistory:**
```typescript
{
  entryId: number;
}
```

**Response:**
```typescript
{
  entry_id: number;
  holds: EntryHoldWithHistory[];
  total_holds: number;
}
```

### TypeScript Types (Already Defined)

```typescript
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
```

### Color/Status Mapping

**Recommended Color Scheme:**
- `compliance_hold` → Red (#ef4444) — Critical compliance issue
- `tech_hold` → Orange (#f97316) — Technical issue
- `escalation` → Purple (#a855f7) — Elevated concern
- `flag` → Yellow (#eab308) — Informational flag

**Badge Display:**
- Active holds: Solid color badge
- Cleared holds: Muted/gray badge (in history only)

---

## IMPLEMENTATION PLAN

### Phase 1: Hold Placement UI

**Files to Modify:**
- `src/pages/tech/EntryDossierPanel.tsx` — Add "Place Hold" button + modal
- `src/pages/tech/EntryListPanel.tsx` — Add row action for hold placement

**Modal Requirements:**
- Hold type selector (dropdown: compliance_hold, tech_hold, escalation, flag)
- Reason input (required, textarea)
- Notes input (optional, textarea)
- Submit/Cancel buttons
- Loading state during API call
- Error display
- Success callback to refresh entry data

**Validation:**
- Reason required (min 10 chars)
- Hold type must be valid
- Entry ID must exist

**Integration:**
- Call `techMasterApi.placeHold()`
- On success: close modal, refresh entry data, show success toast
- On error: display error message in modal

---

### Phase 2: Hold Clearance UI

**Files to Modify:**
- `src/pages/tech/EntryDossierPanel.tsx` — Add "Clear Hold" button for active holds
- Hold list/badge component — Add clear action

**Modal Requirements:**
- Display hold details (type, reason, placed by, placed at)
- Clearance notes input (optional, textarea)
- Confirm/Cancel buttons
- Loading state
- Error display

**Integration:**
- Call `techMasterApi.clearHold(holdId, notes)`
- On success: close modal, refresh entry data, show success toast
- On error: display error message

---

### Phase 3: Hold Badges in Entry Lists

**Files to Modify:**
- `src/pages/tech/EntryListPanel.tsx` — Add hold badge column/indicator

**Badge Requirements:**
- Display active holds as colored badges
- Badge shows hold type (abbreviated if needed)
- Color-coded by type
- Tooltip shows full reason on hover
- Multiple holds: show count badge or stacked indicators
- Click badge: navigate to entry dossier or show quick details

**Filtering:**
- Add "Hold Status" filter (All, Active Holds, No Holds)
- Add "Hold Type" filter (All, Compliance, Tech, Escalation, Flag)
- Filters work with existing entry list filters

**Data Loading:**
- Fetch holds for visible entries (batch query if possible)
- Cache hold data to avoid repeated API calls
- Refresh on hold placement/clearance

---

### Phase 4: Hold Indicators in Compliance Dashboard

**Files to Modify:**
- `src/pages/tech/ComplianceDashboardPanel.tsx` — Add hold status column

**Requirements:**
- Show hold status in compliance table
- Color-code entries with active holds
- Escalations stand out prominently
- Count of active holds per entry
- Click to view details or navigate to dossier

**Integration:**
- Compliance dashboard already loads entry data
- Add hold status to existing data structure
- Minimal performance impact

---

### Phase 5: Hold History in Entry Dossier

**Files to Modify:**
- `src/pages/tech/EntryDossierPanel.tsx` — Add hold history section

**Requirements:**
- Display current active holds prominently
- Show full hold history chronologically
- Each hold shows:
  - Type, reason, notes
  - Placed by, placed at
  - Cleared by, cleared at (if cleared)
  - Action history (placed, cleared)
- Clear visual distinction between active and cleared holds
- Expandable/collapsible history entries

**Data Loading:**
- Call `techMasterApi.getHoldHistory(entryId)`
- Load on dossier mount
- Refresh after hold placement/clearance

---

## UI COMPONENT STRUCTURE

### HoldPlacementModal
```typescript
interface HoldPlacementModalProps {
  entryId: number;
  onClose: () => void;
  onSuccess: () => void;
}
```

### HoldClearanceModal
```typescript
interface HoldClearanceModalProps {
  hold: EntryHold;
  onClose: () => void;
  onSuccess: () => void;
}
```

### HoldBadge
```typescript
interface HoldBadgeProps {
  hold: EntryHold;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}
```

### HoldHistorySection
```typescript
interface HoldHistorySectionProps {
  entryId: number;
  onPlaceHold?: () => void;
}
```

---

## VALIDATION CHECKLIST

### Automated Tests
- [ ] Hold type validation
- [ ] Badge color mapping
- [ ] Filter logic
- [ ] Payload shape helpers

### Manual Validation (14 Steps)
1. [ ] Open entry list → existing entries load
2. [ ] Place hold on entry → modal works
3. [ ] Verify badge appears in entry list
4. [ ] Verify hold appears in entry dossier
5. [ ] Verify compliance dashboard shows held entry
6. [ ] Filter entry list by hold state → works
7. [ ] Clear hold → modal works
8. [ ] Verify badge/status updates immediately
9. [ ] Verify hold history remains in dossier
10. [ ] Place escalation hold → distinct visual
11. [ ] Verify no console errors
12. [ ] Verify build passes
13. [ ] Verify no regressions to existing Tech workflows
14. [ ] Verify deployed environment loads correctly

---

## KNOWN LIMITATIONS

**Out of Scope for Batch 12:**
- Hold notifications/alerts
- Bulk hold operations
- Hold templates/presets
- Hold assignment/routing
- Integration with findings workflow
- Hold analytics/reporting

**Future Enhancements:**
- Auto-hold based on findings
- Hold escalation workflow
- Hold approval process
- Hold SLA tracking

---

## DEPENDENCIES

**Required:**
- Batch 11 backend (✅ complete)
- Tech Master shell (✅ complete)
- Entry list panel (✅ exists)
- Entry dossier panel (✅ exists)
- Compliance dashboard (✅ exists)

**No Blockers:** All dependencies met

---

## EFFORT ESTIMATE

**Total Effort:** 1-2 batches (1-2 weeks)

**Breakdown:**
- Hold placement modal: 2-3 hours
- Hold clearance modal: 1-2 hours
- Entry list badges: 3-4 hours
- Entry list filtering: 2-3 hours
- Compliance dashboard indicators: 2-3 hours
- Dossier history section: 3-4 hours
- Testing & validation: 2-3 hours
- Documentation: 1-2 hours

**Total: 16-24 hours**

---

## SUCCESS CRITERIA

✅ Users can place holds via UI  
✅ Users can clear holds via UI  
✅ Hold badges visible in entry lists  
✅ Hold indicators visible in compliance dashboard  
✅ Hold history visible in entry dossier  
✅ Hold filtering works in entry lists  
✅ No regressions to existing Tech workflows  
✅ Build passes  
✅ All validation tests pass  

---

**Next Steps:** Begin implementation with hold placement modal, then proceed through phases systematically.
