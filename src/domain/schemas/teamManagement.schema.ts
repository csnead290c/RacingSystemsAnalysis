/**
 * Race Team Management Schemas
 * Parts, Inventory, Maintenance, Events, Expenses, Contacts
 */

import { z } from 'zod';

// ============================================================================
// PART CATEGORIES
// ============================================================================

export const PartCategoryEnum = z.enum([
  'engine',
  'drivetrain',
  'suspension',
  'chassis',
  'wheels-tires',
  'electronics',
  'safety',
  'consumables',
  'tools',
  'other',
]);

export type PartCategory = z.infer<typeof PartCategoryEnum>;

export const PartConditionEnum = z.enum([
  'new',
  'good',
  'fair',
  'worn',
  'rebuild-needed',
  'retired',
]);

export type PartCondition = z.infer<typeof PartConditionEnum>;

// ============================================================================
// PART SCHEMA
// ============================================================================

export const PartSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  partNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  category: PartCategoryEnum,
  subcategory: z.string().optional(),
  
  // Specifications (flexible key-value)
  specifications: z.record(z.union([z.string(), z.number()])).optional(),
  weight_lbs: z.number().positive().optional(),
  
  // Acquisition
  purchaseDate: z.number().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  vendor: z.string().optional(),
  invoiceNumber: z.string().optional(),
  
  // Lifecycle tracking
  condition: PartConditionEnum,
  installDate: z.number().optional(),
  vehicleId: z.string().optional(),
  location: z.string().optional(),
  
  // Usage tracking
  runsSinceInstall: z.number().nonnegative().optional(),
  passesSinceInstall: z.number().nonnegative().optional(),
  milesSinceInstall: z.number().nonnegative().optional(),
  
  // Maintenance intervals
  rebuildInterval: z.number().positive().optional(),
  lastRebuildDate: z.number().optional(),
  rebuildCost: z.number().nonnegative().optional(),
  totalRebuilds: z.number().nonnegative().optional(),
  
  // Documents
  receiptUrl: z.string().url().optional(),
  specSheetUrl: z.string().url().optional(),
  imageUrl: z.string().optional(),
  notes: z.string().optional(),
  
  // Quantity (for consumables/spares)
  quantity: z.number().nonnegative().default(1),
  minQuantity: z.number().nonnegative().optional(),
  
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Part = z.infer<typeof PartSchema>;

// ============================================================================
// MAINTENANCE SCHEMAS
// ============================================================================

export const MaintenanceTypeEnum = z.enum([
  'scheduled',
  'unscheduled',
  'pre-race',
  'post-race',
  'rebuild',
  'upgrade',
  'repair',
]);

export type MaintenanceType = z.infer<typeof MaintenanceTypeEnum>;

export const MaintenanceCategoryEnum = z.enum([
  'engine',
  'drivetrain',
  'suspension',
  'chassis',
  'electrical',
  'safety',
  'general',
  'inspection',
]);

export type MaintenanceCategory = z.infer<typeof MaintenanceCategoryEnum>;

export const PartActionEnum = z.enum([
  'installed',
  'removed',
  'replaced',
  'serviced',
  'inspected',
]);

export const MaintenanceRecordSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  type: MaintenanceTypeEnum,
  
  // What was done
  title: z.string().min(1),
  description: z.string().optional(),
  category: MaintenanceCategoryEnum,
  
  // Parts involved
  partsUsed: z.array(z.object({
    partId: z.string(),
    partName: z.string(),
    quantity: z.number().positive(),
    action: PartActionEnum,
  })).optional(),
  
  // Labor & Cost
  laborHours: z.number().nonnegative().optional(),
  laborCost: z.number().nonnegative().optional(),
  partsCost: z.number().nonnegative().optional(),
  totalCost: z.number().nonnegative().optional(),
  
  // When/Where
  date: z.number(),
  mileage: z.number().nonnegative().optional(),
  passCount: z.number().nonnegative().optional(),
  eventId: z.string().optional(),
  performedBy: z.string().optional(),
  
  // Follow-up
  nextServiceDate: z.number().optional(),
  nextServiceMileage: z.number().optional(),
  nextServicePasses: z.number().optional(),
  
  notes: z.string().optional(),
  photos: z.array(z.string()).optional(),
  
  completed: z.boolean().default(true),
  
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type MaintenanceRecord = z.infer<typeof MaintenanceRecordSchema>;

// ============================================================================
// SERVICE SCHEDULE SCHEMA
// ============================================================================

export const ServiceScheduleSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  
  name: z.string().min(1),
  description: z.string().optional(),
  category: MaintenanceCategoryEnum,
  
  // Intervals (any can trigger)
  intervalPasses: z.number().positive().optional(),
  intervalMiles: z.number().positive().optional(),
  intervalDays: z.number().positive().optional(),
  
  // Last service tracking
  lastServiceDate: z.number().optional(),
  lastServicePasses: z.number().optional(),
  lastServiceMileage: z.number().optional(),
  
  // Status
  enabled: z.boolean().default(true),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  
  // Standard parts needed
  partsNeeded: z.array(z.object({
    partId: z.string().optional(),
    partName: z.string(),
    quantity: z.number().positive(),
  })).optional(),
  
  estimatedCost: z.number().nonnegative().optional(),
  estimatedHours: z.number().nonnegative().optional(),
  
  notes: z.string().optional(),
  
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type ServiceSchedule = z.infer<typeof ServiceScheduleSchema>;

// ============================================================================
// RACE EVENT SCHEMA
// ============================================================================

export const EventStatusEnum = z.enum([
  'planned',
  'registered',
  'confirmed',
  'attended',
  'cancelled',
  'postponed',
]);

export type EventStatus = z.infer<typeof EventStatusEnum>;

export const RoundResultEnum = z.enum(['win', 'loss', 'bye', 'redlight', 'breakout']);

export const RaceEventSchema = z.object({
  id: z.string(),
  
  // Event details
  name: z.string().min(1),
  trackId: z.string().optional(),
  trackName: z.string(),
  address: z.string().optional(),
  
  // Dates
  startDate: z.number(),
  endDate: z.number(),
  registrationDeadline: z.number().optional(),
  
  // Registration
  status: EventStatusEnum,
  classes: z.array(z.string()).default([]),
  entryFee: z.number().nonnegative().optional(),
  registrationNumber: z.string().optional(),
  registrationUrl: z.string().optional(),
  
  // Logistics
  travelDistance: z.number().nonnegative().optional(),
  hotelName: z.string().optional(),
  hotelCost: z.number().nonnegative().optional(),
  hotelConfirmation: z.string().optional(),
  fuelEstimate: z.number().nonnegative().optional(),
  otherExpenses: z.array(z.object({
    description: z.string(),
    amount: z.number(),
  })).optional(),
  
  // Results (after event)
  results: z.array(z.object({
    vehicleId: z.string(),
    vehicleName: z.string().optional(),
    class: z.string(),
    qualifying: z.object({
      position: z.number().positive().optional(),
      et: z.number().positive().optional(),
      mph: z.number().positive().optional(),
    }).optional(),
    eliminations: z.array(z.object({
      round: z.number().positive(),
      roundName: z.string().optional(),
      opponent: z.string().optional(),
      result: RoundResultEnum,
      yourET: z.number().optional(),
      yourRT: z.number().optional(),
      yourDialIn: z.number().optional(),
      opponentET: z.number().optional(),
      opponentRT: z.number().optional(),
      opponentDialIn: z.number().optional(),
      lane: z.enum(['left', 'right']).optional(),
      notes: z.string().optional(),
    })).optional(),
    finalPosition: z.number().positive().optional(),
    prizeMoney: z.number().nonnegative().optional(),
    points: z.number().nonnegative().optional(),
  })).optional(),
  
  // Linked runs
  runIds: z.array(z.string()).optional(),
  
  // Weather (captured at event)
  weather: z.object({
    avgTemp: z.number().optional(),
    avgHumidity: z.number().optional(),
    conditions: z.string().optional(),
  }).optional(),
  
  notes: z.string().optional(),
  
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type RaceEvent = z.infer<typeof RaceEventSchema>;

// ============================================================================
// EXPENSE SCHEMA
// ============================================================================

export const ExpenseCategoryEnum = z.enum([
  'parts',
  'maintenance',
  'entry-fees',
  'travel-fuel',
  'travel-lodging',
  'travel-food',
  'travel-other',
  'insurance',
  'memberships',
  'marketing',
  'tools',
  'misc',
]);

export type ExpenseCategory = z.infer<typeof ExpenseCategoryEnum>;

export const ExpenseSchema = z.object({
  id: z.string(),
  
  category: ExpenseCategoryEnum,
  subcategory: z.string().optional(),
  description: z.string().min(1),
  amount: z.number(),
  
  date: z.number(),
  vendor: z.string().optional(),
  receiptUrl: z.string().optional(),
  paymentMethod: z.string().optional(),
  
  // Links to other entities
  vehicleId: z.string().optional(),
  eventId: z.string().optional(),
  partId: z.string().optional(),
  maintenanceId: z.string().optional(),
  
  // Tax tracking
  taxDeductible: z.boolean().optional(),
  taxCategory: z.string().optional(),
  
  // Reimbursement
  reimbursable: z.boolean().optional(),
  reimbursedBy: z.string().optional(),
  reimbursedDate: z.number().optional(),
  
  notes: z.string().optional(),
  
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Expense = z.infer<typeof ExpenseSchema>;

// ============================================================================
// CONTACT SCHEMA
// ============================================================================

export const ContactTypeEnum = z.enum([
  'crew',
  'vendor',
  'sponsor',
  'competitor',
  'official',
  'track',
  'other',
]);

export type ContactType = z.infer<typeof ContactTypeEnum>;

export const ContactSchema = z.object({
  id: z.string(),
  
  type: ContactTypeEnum,
  
  name: z.string().min(1),
  company: z.string().optional(),
  role: z.string().optional(),
  
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  
  // For crew members
  skills: z.array(z.string()).optional(),
  availability: z.string().optional(),
  payRate: z.number().nonnegative().optional(),
  
  // For vendors
  specialties: z.array(z.string()).optional(),
  accountNumber: z.string().optional(),
  
  // For sponsors
  sponsorshipValue: z.number().nonnegative().optional(),
  sponsorshipTerms: z.string().optional(),
  contractStartDate: z.number().optional(),
  contractEndDate: z.number().optional(),
  
  // Social
  socialMedia: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    twitter: z.string().optional(),
  }).optional(),
  
  notes: z.string().optional(),
  favorite: z.boolean().default(false),
  
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Contact = z.infer<typeof ContactSchema>;

// ============================================================================
// CHECKLIST SCHEMA (for pre/post race)
// ============================================================================

export const ChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  category: z.string().optional(),
  required: z.boolean().default(false),
  order: z.number().default(0),
});

export const ChecklistSchema = z.object({
  id: z.string(),
  vehicleId: z.string().optional(),
  
  name: z.string().min(1),
  type: z.enum(['pre-race', 'post-race', 'maintenance', 'packing', 'custom']),
  
  items: z.array(ChecklistItemSchema),
  
  notes: z.string().optional(),
  
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Checklist = z.infer<typeof ChecklistSchema>;
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

// ============================================================================
// CHECKLIST COMPLETION (instance of a checklist being used)
// ============================================================================

export const ChecklistCompletionSchema = z.object({
  id: z.string(),
  checklistId: z.string(),
  vehicleId: z.string().optional(),
  eventId: z.string().optional(),
  
  date: z.number(),
  completedBy: z.string().optional(),
  
  itemsCompleted: z.array(z.object({
    itemId: z.string(),
    completed: z.boolean(),
    notes: z.string().optional(),
    completedAt: z.number().optional(),
  })),
  
  allCompleted: z.boolean(),
  notes: z.string().optional(),
  
  createdAt: z.number(),
});

export type ChecklistCompletion = z.infer<typeof ChecklistCompletionSchema>;

// ============================================================================
// BUDGET SCHEMA
// ============================================================================

export const BudgetSchema = z.object({
  id: z.string(),
  
  name: z.string().min(1),
  season: z.number(), // Year
  
  // Budget by category
  categories: z.array(z.object({
    category: ExpenseCategoryEnum,
    budgeted: z.number().nonnegative(),
    notes: z.string().optional(),
  })),
  
  totalBudget: z.number().nonnegative(),
  
  notes: z.string().optional(),
  
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Budget = z.infer<typeof BudgetSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function createPart(data: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>): Part {
  const now = Date.now();
  return {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
}

export function createMaintenanceRecord(data: Omit<MaintenanceRecord, 'id' | 'createdAt' | 'updatedAt'>): MaintenanceRecord {
  const now = Date.now();
  return {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
}

export function createRaceEvent(data: Omit<RaceEvent, 'id' | 'createdAt' | 'updatedAt'>): RaceEvent {
  const now = Date.now();
  return {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
}

export function createExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Expense {
  const now = Date.now();
  return {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
}

export function createContact(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Contact {
  const now = Date.now();
  return {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

export const PART_CATEGORY_LABELS: Record<PartCategory, string> = {
  'engine': 'Engine',
  'drivetrain': 'Drivetrain',
  'suspension': 'Suspension',
  'chassis': 'Chassis',
  'wheels-tires': 'Wheels & Tires',
  'electronics': 'Electronics',
  'safety': 'Safety',
  'consumables': 'Consumables',
  'tools': 'Tools',
  'other': 'Other',
};

export const PART_CONDITION_LABELS: Record<PartCondition, string> = {
  'new': 'New',
  'good': 'Good',
  'fair': 'Fair',
  'worn': 'Worn',
  'rebuild-needed': 'Needs Rebuild',
  'retired': 'Retired',
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  'planned': 'Planned',
  'registered': 'Registered',
  'confirmed': 'Confirmed',
  'attended': 'Attended',
  'cancelled': 'Cancelled',
  'postponed': 'Postponed',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  'parts': 'Parts & Equipment',
  'maintenance': 'Maintenance & Service',
  'entry-fees': 'Entry Fees',
  'travel-fuel': 'Travel - Fuel',
  'travel-lodging': 'Travel - Lodging',
  'travel-food': 'Travel - Food',
  'travel-other': 'Travel - Other',
  'insurance': 'Insurance',
  'memberships': 'Memberships',
  'marketing': 'Marketing',
  'tools': 'Tools & Equipment',
  'misc': 'Miscellaneous',
};

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  'crew': 'Crew Member',
  'vendor': 'Vendor',
  'sponsor': 'Sponsor',
  'competitor': 'Competitor',
  'official': 'Official',
  'track': 'Track',
  'other': 'Other',
};

// ============================================================================
// PROMOTED EVENTS (Admin-Approved, Community Events)
// ============================================================================

export const PromotedEventStatusEnum = z.enum([
  'pending',     // Awaiting admin approval
  'approved',    // Approved and visible to all users
  'rejected',    // Rejected by admin
  'expired',     // Event date has passed
]);

export type PromotedEventStatus = z.infer<typeof PromotedEventStatusEnum>;

export const PromotedEventSchema = z.object({
  id: z.string(),
  
  // Event Details
  name: z.string().min(1),
  description: z.string().optional(),
  trackName: z.string().min(1),
  trackLocation: z.string().optional(), // City, State
  
  // Dates
  startDate: z.number(),
  endDate: z.number().optional(),
  registrationDeadline: z.number().optional(),
  
  // Event Info
  eventType: z.enum(['bracket', 'index', 'heads-up', 'test-n-tune', 'points-race', 'special']),
  classes: z.array(z.string()).optional(), // Classes available
  entryFee: z.number().nonnegative().optional(),
  
  // Contact & Links
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  website: z.string().url().optional(),
  registrationUrl: z.string().url().optional(),
  
  // Promotion Details
  isPromoted: z.boolean().default(false), // Paid promotion
  promotionTier: z.enum(['basic', 'featured', 'spotlight']).optional(),
  promotionExpires: z.number().optional(),
  
  // Admin
  status: PromotedEventStatusEnum.default('pending'),
  submittedBy: z.string(), // User ID who submitted
  submittedAt: z.number(),
  reviewedBy: z.string().optional(), // Admin who approved/rejected
  reviewedAt: z.number().optional(),
  rejectionReason: z.string().optional(),
  
  // Tracking
  viewCount: z.number().default(0),
  addedToCalendarCount: z.number().default(0),
  
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type PromotedEvent = z.infer<typeof PromotedEventSchema>;

export function createPromotedEvent(data: {
  name: string;
  trackName: string;
  startDate: number;
  submittedBy: string;
  description?: string;
  trackLocation?: string;
  endDate?: number;
  registrationDeadline?: number;
  eventType?: PromotedEvent['eventType'];
  classes?: string[];
  entryFee?: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  registrationUrl?: string;
}): PromotedEvent {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: data.name,
    trackName: data.trackName,
    startDate: data.startDate,
    submittedBy: data.submittedBy,
    description: data.description,
    trackLocation: data.trackLocation,
    endDate: data.endDate,
    registrationDeadline: data.registrationDeadline,
    eventType: data.eventType || 'bracket',
    classes: data.classes,
    entryFee: data.entryFee,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    website: data.website,
    registrationUrl: data.registrationUrl,
    isPromoted: false,
    status: 'pending',
    submittedAt: now,
    viewCount: 0,
    addedToCalendarCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export const PROMOTED_EVENT_TYPE_LABELS: Record<PromotedEvent['eventType'], string> = {
  'bracket': 'Bracket Racing',
  'index': 'Index Racing',
  'heads-up': 'Heads-Up',
  'test-n-tune': 'Test & Tune',
  'points-race': 'Points Race',
  'special': 'Special Event',
};

export const PROMOTED_EVENT_STATUS_LABELS: Record<PromotedEventStatus, string> = {
  'pending': 'Pending Review',
  'approved': 'Approved',
  'rejected': 'Rejected',
  'expired': 'Expired',
};
