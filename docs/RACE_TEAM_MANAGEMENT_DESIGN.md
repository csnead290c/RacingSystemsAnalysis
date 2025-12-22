# Race Team Management System Design

## Overview

The Race Team Management module extends RSA beyond prediction/logging into a full team operations platform. This competes with dedicated race team software like MyRacePass, RacingJunk inventory tools, and motorsport ERP systems.

---

## Core Modules

### 1. Parts Catalog & Inventory

**Purpose**: Track all parts owned by the team, their specifications, cost, and current status.

#### Part Categories
- **Engine**: Pistons, rods, heads, blocks, camshafts, valvetrain, intake, exhaust, fuel system
- **Drivetrain**: Transmission, torque converter, clutch, driveshaft, rear end, axles
- **Suspension**: Shocks, springs, control arms, wheelie bars, ladder bars
- **Chassis**: Frame components, roll cage, body panels, parachute
- **Wheels & Tires**: Wheels, slicks, front runners, spare tires
- **Electronics**: ECU, sensors, wiring harnesses, data loggers
- **Safety**: Fire system, belts, helmet, suit, gloves
- **Consumables**: Oil, fuel, brake fluid, coolant, gaskets

#### Part Schema
```typescript
interface Part {
  id: string;
  name: string;
  partNumber?: string;           // Manufacturer part number
  manufacturer?: string;
  category: PartCategory;
  subcategory?: string;
  
  // Specifications
  specifications?: Record<string, string | number>;
  weight_lbs?: number;
  
  // Acquisition
  purchaseDate?: number;         // Unix timestamp
  purchasePrice?: number;
  vendor?: string;
  invoiceNumber?: string;
  
  // Lifecycle tracking
  condition: 'new' | 'good' | 'fair' | 'worn' | 'rebuild-needed' | 'retired';
  installDate?: number;
  vehicleId?: string;            // Which vehicle it's on
  location?: string;             // "On car", "Trailer", "Shop shelf A3"
  
  // Usage tracking
  runsSinceInstall?: number;
  passesSinceInstall?: number;
  milesSinceInstall?: number;
  
  // Maintenance
  rebuildInterval?: number;      // Passes between rebuilds
  lastRebuildDate?: number;
  rebuildCost?: number;
  
  // Documents
  receiptUrl?: string;
  specSheetUrl?: string;
  notes?: string;
  
  createdAt: number;
  updatedAt: number;
}
```

#### Inventory Features
- **Stock levels**: Track quantity on hand vs minimum needed
- **Reorder alerts**: Notify when consumables run low
- **Cost tracking**: Total investment per vehicle, per season
- **Depreciation**: Track value over time
- **Part history**: See all vehicles/rebuilds a part has been through

---

### 2. Maintenance & Service Tracking

**Purpose**: Schedule and log all maintenance activities, track component lifecycles.

#### Maintenance Types
- **Scheduled**: Regular interval maintenance (oil changes, rebuild intervals)
- **Unscheduled**: Repairs, failures, damage
- **Pre-race**: Checklist items before each event
- **Post-race**: Inspection and service after events

#### Maintenance Record Schema
```typescript
interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: 'scheduled' | 'unscheduled' | 'pre-race' | 'post-race';
  
  // What was done
  title: string;
  description?: string;
  category: MaintenanceCategory;
  
  // Parts involved
  partsUsed?: Array<{
    partId: string;
    quantity: number;
    action: 'installed' | 'removed' | 'replaced' | 'serviced';
  }>;
  
  // Labor & Cost
  laborHours?: number;
  laborCost?: number;
  partsCost?: number;
  totalCost?: number;
  
  // When/Where
  date: number;
  mileage?: number;
  passCount?: number;
  eventId?: string;              // If done at an event
  performedBy?: string;
  
  // Follow-up
  nextServiceDate?: number;
  nextServiceMileage?: number;
  nextServicePasses?: number;
  
  notes?: string;
  photos?: string[];
  
  createdAt: number;
  updatedAt: number;
}
```

#### Maintenance Features
- **Service schedules**: Define intervals for each maintenance type
- **Due alerts**: Dashboard showing upcoming/overdue maintenance
- **Checklists**: Pre-race and post-race inspection lists
- **Cost analysis**: Maintenance cost per run, per season
- **Component lifecycle**: Track total passes/rebuilds for each part

---

### 3. Event Planning & Calendar

**Purpose**: Plan race season, track registrations, results, and expenses.

#### Event Schema
```typescript
interface RaceEvent {
  id: string;
  
  // Event details
  name: string;
  trackId?: string;              // Link to track database
  trackName: string;
  address?: string;
  
  // Dates
  startDate: number;
  endDate: number;
  registrationDeadline?: number;
  
  // Registration
  status: 'planned' | 'registered' | 'confirmed' | 'attended' | 'cancelled';
  classes: string[];             // Which classes entering
  entryFee?: number;
  registrationNumber?: string;
  
  // Logistics
  travelDistance?: number;
  hotelName?: string;
  hotelCost?: number;
  fuelEstimate?: number;
  otherExpenses?: Array<{ description: string; amount: number }>;
  
  // Results (after event)
  results?: Array<{
    vehicleId: string;
    class: string;
    qualifying?: { position: number; et: number; mph: number };
    eliminations?: Array<{
      round: number;
      opponent?: string;
      result: 'win' | 'loss' | 'bye';
      yourET?: number;
      yourRT?: number;
      opponentET?: number;
      opponentRT?: number;
    }>;
    finalPosition?: number;
    prizeMoney?: number;
  }>;
  
  // Runs at this event
  runIds?: string[];             // Link to run history
  
  notes?: string;
  
  createdAt: number;
  updatedAt: number;
}
```

#### Event Features
- **Season calendar**: Visual calendar of planned events
- **Registration tracking**: Deadlines, confirmation status
- **Budget planning**: Estimate costs before committing
- **Results logging**: Track round-by-round eliminations
- **Prize tracking**: Log winnings and ROI per event
- **Travel planning**: Distance, hotels, fuel estimates

---

### 4. Expense Tracking & Budgeting

**Purpose**: Complete financial picture of racing operations.

#### Expense Categories
- **Parts & Equipment**: Parts purchases, tools
- **Maintenance & Service**: Labor, rebuilds, consumables
- **Events**: Entry fees, tech fees
- **Travel**: Fuel, hotels, food, tolls
- **Insurance**: Vehicle, trailer, medical
- **Memberships**: NHRA, IHRA, track memberships
- **Marketing**: Decals, hero cards, sponsorship costs
- **Miscellaneous**: Other racing-related expenses

#### Expense Schema
```typescript
interface Expense {
  id: string;
  
  category: ExpenseCategory;
  subcategory?: string;
  description: string;
  amount: number;
  
  date: number;
  vendor?: string;
  receiptUrl?: string;
  
  // Links
  vehicleId?: string;
  eventId?: string;
  partId?: string;
  maintenanceId?: string;
  
  // Tax tracking
  taxDeductible?: boolean;
  reimbursable?: boolean;
  reimbursed?: boolean;
  
  notes?: string;
  
  createdAt: number;
  updatedAt: number;
}
```

#### Budget Features
- **Season budget**: Set targets by category
- **Spending tracking**: Actual vs budget
- **Cost per run**: Calculate true cost per pass
- **Sponsor ROI**: Track sponsor value vs expenses
- **Reports**: Monthly, quarterly, annual summaries

---

### 5. Crew & Contacts

**Purpose**: Manage team members, vendors, and racing contacts.

#### Contact Schema
```typescript
interface Contact {
  id: string;
  
  type: 'crew' | 'vendor' | 'sponsor' | 'competitor' | 'official' | 'other';
  
  name: string;
  company?: string;
  role?: string;                 // "Engine builder", "Crew chief", etc.
  
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  
  // For crew members
  skills?: string[];
  availability?: string;
  payRate?: number;
  
  // For vendors
  specialties?: string[];
  accountNumber?: string;
  
  // For sponsors
  sponsorshipValue?: number;
  sponsorshipTerms?: string;
  contractEndDate?: number;
  
  notes?: string;
  
  createdAt: number;
  updatedAt: number;
}
```

---

## UI Design

### Navigation Structure

```
Racing Systems Analysis
├── Predict (ET Sim)
├── History (Run Log)
├── Vehicles
├── Race Day
├── Opponents
├── Calculators
│
├── ─── Team Management ───
├── 📦 Parts & Inventory
│   ├── Parts Catalog
│   ├── Current Inventory
│   └── Reorder List
├── 🔧 Maintenance
│   ├── Service Log
│   ├── Scheduled Services
│   └── Checklists
├── 📅 Events
│   ├── Season Calendar
│   ├── Upcoming Events
│   └── Results History
├── 💰 Expenses
│   ├── Expense Log
│   ├── Budget vs Actual
│   └── Reports
└── 👥 Contacts
    ├── Crew
    ├── Vendors
    └── Sponsors
```

### Page Designs

#### Parts & Inventory Page
- **List view**: Sortable/filterable table of all parts
- **Grid view**: Visual cards with part images
- **Detail view**: Full part info with history timeline
- **Quick add**: Scan barcode or quick entry form
- **Bulk import**: CSV upload for existing inventory

#### Maintenance Page
- **Dashboard**: Upcoming/overdue services at a glance
- **Service log**: Timeline of all maintenance
- **Checklists**: Interactive pre/post race lists
- **Schedule builder**: Define service intervals

#### Events Page
- **Calendar view**: Month/week view of events
- **List view**: Upcoming events with status
- **Event detail**: Full info, registration, results
- **Budget planner**: Cost estimate before committing

#### Expenses Page
- **Entry form**: Quick expense logging
- **Dashboard**: Spending charts by category
- **Reports**: Exportable summaries

---

## Implementation Phases

### Phase 1: Core Infrastructure (This Session)
1. ✅ Design document (this file)
2. Create Zod schemas for all entities
3. Create storage service with IndexedDB
4. Add navigation items

### Phase 2: Parts & Inventory
1. Parts catalog page (CRUD)
2. Part detail view with history
3. Inventory dashboard
4. CSV import

### Phase 3: Maintenance
1. Maintenance log page
2. Service scheduling
3. Pre/post race checklists
4. Component lifecycle tracking

### Phase 4: Events
1. Event calendar page
2. Event detail/registration
3. Results entry
4. Season summary

### Phase 5: Expenses & Reports
1. Expense logging
2. Budget tracking
3. Reports generation
4. Export to PDF/CSV

---

## Subscription Tier Integration

| Feature | Free | Racer | Pro | Team |
|---------|------|-------|-----|------|
| Parts Catalog | 10 parts | 50 parts | Unlimited | Unlimited |
| Maintenance Log | 10 records | 100 records | Unlimited | Unlimited |
| Events | 3/season | 20/season | Unlimited | Unlimited |
| Expense Tracking | ❌ | Basic | Full | Full |
| Reports | ❌ | ❌ | PDF Export | Full + Team |
| Crew Management | ❌ | ❌ | ❌ | 5 members |
| Shared Access | ❌ | ❌ | ❌ | ✅ |

---

## Data Relationships

```
Vehicle ──────┬────── Part (installed on)
              │
              ├────── MaintenanceRecord
              │         └── Part (used in)
              │
              └────── Run ─── RaceEvent
                              │
                              └── Expense
                              
Contact ──┬── MaintenanceRecord (performed by)
          ├── Part (vendor)
          └── Expense (vendor)
```

---

## Future Enhancements

1. **Mobile app**: Dedicated mobile app for pit lane data entry
2. **Barcode scanning**: Scan parts for quick lookup
3. **Photo documentation**: Before/after maintenance photos
4. **Weather history integration**: Pull weather for past events
5. **Competitor database**: Track opponent performance trends
6. **Sponsor portal**: Give sponsors access to results/photos
7. **API integration**: Connect to NHRA/IHRA results systems
8. **AI insights**: Predict maintenance needs, optimize spending

---

*Design Document v1.0 - December 2025*
