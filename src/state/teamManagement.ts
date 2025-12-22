/**
 * Team Management Storage Service
 * Handles persistence for Parts, Maintenance, Events, Expenses, Contacts
 */

import { openDB, type IDBPDatabase } from 'idb';
import type {
  Part,
  MaintenanceRecord,
  ServiceSchedule,
  RaceEvent,
  Expense,
  Contact,
  Checklist,
  ChecklistCompletion,
  Budget,
  PromotedEvent,
} from '../domain/schemas/teamManagement.schema';

const DB_NAME = 'rsa-team-management';
const DB_VERSION = 2; // Bumped for promotedEvents store

interface TeamManagementDB {
  parts: Part;
  maintenance: MaintenanceRecord;
  serviceSchedules: ServiceSchedule;
  events: RaceEvent;
  expenses: Expense;
  contacts: Contact;
  checklists: Checklist;
  checklistCompletions: ChecklistCompletion;
  budgets: Budget;
  promotedEvents: PromotedEvent;
}

let dbPromise: Promise<IDBPDatabase<TeamManagementDB>> | null = null;

function getDB(): Promise<IDBPDatabase<TeamManagementDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TeamManagementDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Parts store
        if (!db.objectStoreNames.contains('parts')) {
          const partsStore = db.createObjectStore('parts', { keyPath: 'id' });
          partsStore.createIndex('by-category', 'category');
          partsStore.createIndex('by-vehicle', 'vehicleId');
          partsStore.createIndex('by-condition', 'condition');
        }

        // Maintenance records store
        if (!db.objectStoreNames.contains('maintenance')) {
          const maintenanceStore = db.createObjectStore('maintenance', { keyPath: 'id' });
          maintenanceStore.createIndex('by-vehicle', 'vehicleId');
          maintenanceStore.createIndex('by-date', 'date');
          maintenanceStore.createIndex('by-type', 'type');
          maintenanceStore.createIndex('by-event', 'eventId');
        }

        // Service schedules store
        if (!db.objectStoreNames.contains('serviceSchedules')) {
          const scheduleStore = db.createObjectStore('serviceSchedules', { keyPath: 'id' });
          scheduleStore.createIndex('by-vehicle', 'vehicleId');
        }

        // Events store
        if (!db.objectStoreNames.contains('events')) {
          const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
          eventsStore.createIndex('by-status', 'status');
          eventsStore.createIndex('by-start-date', 'startDate');
        }

        // Expenses store
        if (!db.objectStoreNames.contains('expenses')) {
          const expensesStore = db.createObjectStore('expenses', { keyPath: 'id' });
          expensesStore.createIndex('by-category', 'category');
          expensesStore.createIndex('by-date', 'date');
          expensesStore.createIndex('by-vehicle', 'vehicleId');
          expensesStore.createIndex('by-event', 'eventId');
        }

        // Contacts store
        if (!db.objectStoreNames.contains('contacts')) {
          const contactsStore = db.createObjectStore('contacts', { keyPath: 'id' });
          contactsStore.createIndex('by-type', 'type');
          contactsStore.createIndex('by-name', 'name');
        }

        // Checklists store
        if (!db.objectStoreNames.contains('checklists')) {
          const checklistsStore = db.createObjectStore('checklists', { keyPath: 'id' });
          checklistsStore.createIndex('by-type', 'type');
          checklistsStore.createIndex('by-vehicle', 'vehicleId');
        }

        // Checklist completions store
        if (!db.objectStoreNames.contains('checklistCompletions')) {
          const completionsStore = db.createObjectStore('checklistCompletions', { keyPath: 'id' });
          completionsStore.createIndex('by-checklist', 'checklistId');
          completionsStore.createIndex('by-event', 'eventId');
          completionsStore.createIndex('by-date', 'date');
        }

        // Budgets store
        if (!db.objectStoreNames.contains('budgets')) {
          const budgetsStore = db.createObjectStore('budgets', { keyPath: 'id' });
          budgetsStore.createIndex('by-season', 'season');
        }

        // Promoted Events store (v2)
        if (!db.objectStoreNames.contains('promotedEvents')) {
          const promotedStore = db.createObjectStore('promotedEvents', { keyPath: 'id' });
          promotedStore.createIndex('by-status', 'status');
          promotedStore.createIndex('by-submitter', 'submittedBy');
          promotedStore.createIndex('by-date', 'startDate');
        }
      },
    });
  }
  return dbPromise;
}

// ============================================================================
// PARTS
// ============================================================================

export const partsStorage = {
  async getAll(): Promise<Part[]> {
    const db = await getDB();
    return db.getAll('parts');
  },

  async getById(id: string): Promise<Part | undefined> {
    const db = await getDB();
    return db.get('parts', id);
  },

  async getByCategory(category: string): Promise<Part[]> {
    const db = await getDB();
    return db.getAllFromIndex('parts', 'by-category', category);
  },

  async getByVehicle(vehicleId: string): Promise<Part[]> {
    const db = await getDB();
    return db.getAllFromIndex('parts', 'by-vehicle', vehicleId);
  },

  async getByCondition(condition: string): Promise<Part[]> {
    const db = await getDB();
    return db.getAllFromIndex('parts', 'by-condition', condition);
  },

  async save(part: Part): Promise<void> {
    const db = await getDB();
    part.updatedAt = Date.now();
    await db.put('parts', part);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('parts', id);
  },

  async getLowStock(): Promise<Part[]> {
    const all = await this.getAll();
    return all.filter(p => p.minQuantity && p.quantity <= p.minQuantity);
  },

  async getNeedingRebuild(): Promise<Part[]> {
    const all = await this.getAll();
    return all.filter(p => 
      p.condition === 'rebuild-needed' || 
      (p.rebuildInterval && p.passesSinceInstall && p.passesSinceInstall >= p.rebuildInterval)
    );
  },
};

// ============================================================================
// MAINTENANCE
// ============================================================================

export const maintenanceStorage = {
  async getAll(): Promise<MaintenanceRecord[]> {
    const db = await getDB();
    return db.getAll('maintenance');
  },

  async getById(id: string): Promise<MaintenanceRecord | undefined> {
    const db = await getDB();
    return db.get('maintenance', id);
  },

  async getByVehicle(vehicleId: string): Promise<MaintenanceRecord[]> {
    const db = await getDB();
    return db.getAllFromIndex('maintenance', 'by-vehicle', vehicleId);
  },

  async getByEvent(eventId: string): Promise<MaintenanceRecord[]> {
    const db = await getDB();
    return db.getAllFromIndex('maintenance', 'by-event', eventId);
  },

  async getRecent(limit: number = 10): Promise<MaintenanceRecord[]> {
    const all = await this.getAll();
    return all.sort((a, b) => b.date - a.date).slice(0, limit);
  },

  async save(record: MaintenanceRecord): Promise<void> {
    const db = await getDB();
    record.updatedAt = Date.now();
    await db.put('maintenance', record);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('maintenance', id);
  },
};

// ============================================================================
// SERVICE SCHEDULES
// ============================================================================

export const serviceScheduleStorage = {
  async getAll(): Promise<ServiceSchedule[]> {
    const db = await getDB();
    return db.getAll('serviceSchedules');
  },

  async getById(id: string): Promise<ServiceSchedule | undefined> {
    const db = await getDB();
    return db.get('serviceSchedules', id);
  },

  async getByVehicle(vehicleId: string): Promise<ServiceSchedule[]> {
    const db = await getDB();
    return db.getAllFromIndex('serviceSchedules', 'by-vehicle', vehicleId);
  },

  async save(schedule: ServiceSchedule): Promise<void> {
    const db = await getDB();
    schedule.updatedAt = Date.now();
    await db.put('serviceSchedules', schedule);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('serviceSchedules', id);
  },

  async getDueServices(vehicleId: string, currentPasses: number, currentMileage: number): Promise<ServiceSchedule[]> {
    const schedules = await this.getByVehicle(vehicleId);
    const now = Date.now();
    
    return schedules.filter(s => {
      if (!s.enabled) return false;
      
      // Check passes interval
      if (s.intervalPasses && s.lastServicePasses !== undefined) {
        if (currentPasses - s.lastServicePasses >= s.intervalPasses) return true;
      }
      
      // Check mileage interval
      if (s.intervalMiles && s.lastServiceMileage !== undefined) {
        if (currentMileage - s.lastServiceMileage >= s.intervalMiles) return true;
      }
      
      // Check days interval
      if (s.intervalDays && s.lastServiceDate) {
        const daysSince = (now - s.lastServiceDate) / (1000 * 60 * 60 * 24);
        if (daysSince >= s.intervalDays) return true;
      }
      
      return false;
    });
  },
};

// ============================================================================
// EVENTS
// ============================================================================

export const eventsStorage = {
  async getAll(): Promise<RaceEvent[]> {
    const db = await getDB();
    return db.getAll('events');
  },

  async getById(id: string): Promise<RaceEvent | undefined> {
    const db = await getDB();
    return db.get('events', id);
  },

  async getByStatus(status: string): Promise<RaceEvent[]> {
    const db = await getDB();
    return db.getAllFromIndex('events', 'by-status', status);
  },

  async getUpcoming(limit: number = 10): Promise<RaceEvent[]> {
    const all = await this.getAll();
    const now = Date.now();
    return all
      .filter(e => e.startDate >= now && e.status !== 'cancelled')
      .sort((a, b) => a.startDate - b.startDate)
      .slice(0, limit);
  },

  async getPast(limit: number = 10): Promise<RaceEvent[]> {
    const all = await this.getAll();
    const now = Date.now();
    return all
      .filter(e => e.endDate < now)
      .sort((a, b) => b.startDate - a.startDate)
      .slice(0, limit);
  },

  async getBySeason(year: number): Promise<RaceEvent[]> {
    const all = await this.getAll();
    return all.filter(e => {
      const eventYear = new Date(e.startDate).getFullYear();
      return eventYear === year;
    });
  },

  async save(event: RaceEvent): Promise<void> {
    const db = await getDB();
    event.updatedAt = Date.now();
    await db.put('events', event);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('events', id);
  },
};

// ============================================================================
// EXPENSES
// ============================================================================

export const expensesStorage = {
  async getAll(): Promise<Expense[]> {
    const db = await getDB();
    return db.getAll('expenses');
  },

  async getById(id: string): Promise<Expense | undefined> {
    const db = await getDB();
    return db.get('expenses', id);
  },

  async getByCategory(category: string): Promise<Expense[]> {
    const db = await getDB();
    return db.getAllFromIndex('expenses', 'by-category', category);
  },

  async getByVehicle(vehicleId: string): Promise<Expense[]> {
    const db = await getDB();
    return db.getAllFromIndex('expenses', 'by-vehicle', vehicleId);
  },

  async getByEvent(eventId: string): Promise<Expense[]> {
    const db = await getDB();
    return db.getAllFromIndex('expenses', 'by-event', eventId);
  },

  async getByDateRange(startDate: number, endDate: number): Promise<Expense[]> {
    const all = await this.getAll();
    return all.filter(e => e.date >= startDate && e.date <= endDate);
  },

  async getBySeason(year: number): Promise<Expense[]> {
    const startOfYear = new Date(year, 0, 1).getTime();
    const endOfYear = new Date(year, 11, 31, 23, 59, 59).getTime();
    return this.getByDateRange(startOfYear, endOfYear);
  },

  async getTotalByCategory(startDate?: number, endDate?: number): Promise<Record<string, number>> {
    let expenses = await this.getAll();
    
    if (startDate && endDate) {
      expenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);
    }
    
    return expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);
  },

  async save(expense: Expense): Promise<void> {
    const db = await getDB();
    expense.updatedAt = Date.now();
    await db.put('expenses', expense);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('expenses', id);
  },
};

// ============================================================================
// CONTACTS
// ============================================================================

export const contactsStorage = {
  async getAll(): Promise<Contact[]> {
    const db = await getDB();
    return db.getAll('contacts');
  },

  async getById(id: string): Promise<Contact | undefined> {
    const db = await getDB();
    return db.get('contacts', id);
  },

  async getByType(type: string): Promise<Contact[]> {
    const db = await getDB();
    return db.getAllFromIndex('contacts', 'by-type', type);
  },

  async getFavorites(): Promise<Contact[]> {
    const all = await this.getAll();
    return all.filter(c => c.favorite);
  },

  async save(contact: Contact): Promise<void> {
    const db = await getDB();
    contact.updatedAt = Date.now();
    await db.put('contacts', contact);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('contacts', id);
  },
};

// ============================================================================
// CHECKLISTS
// ============================================================================

export const checklistsStorage = {
  async getAll(): Promise<Checklist[]> {
    const db = await getDB();
    return db.getAll('checklists');
  },

  async getById(id: string): Promise<Checklist | undefined> {
    const db = await getDB();
    return db.get('checklists', id);
  },

  async getByType(type: string): Promise<Checklist[]> {
    const db = await getDB();
    return db.getAllFromIndex('checklists', 'by-type', type);
  },

  async getByVehicle(vehicleId: string): Promise<Checklist[]> {
    const db = await getDB();
    return db.getAllFromIndex('checklists', 'by-vehicle', vehicleId);
  },

  async save(checklist: Checklist): Promise<void> {
    const db = await getDB();
    checklist.updatedAt = Date.now();
    await db.put('checklists', checklist);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('checklists', id);
  },
};

// ============================================================================
// CHECKLIST COMPLETIONS
// ============================================================================

export const checklistCompletionsStorage = {
  async getAll(): Promise<ChecklistCompletion[]> {
    const db = await getDB();
    return db.getAll('checklistCompletions');
  },

  async getById(id: string): Promise<ChecklistCompletion | undefined> {
    const db = await getDB();
    return db.get('checklistCompletions', id);
  },

  async getByChecklist(checklistId: string): Promise<ChecklistCompletion[]> {
    const db = await getDB();
    return db.getAllFromIndex('checklistCompletions', 'by-checklist', checklistId);
  },

  async getByEvent(eventId: string): Promise<ChecklistCompletion[]> {
    const db = await getDB();
    return db.getAllFromIndex('checklistCompletions', 'by-event', eventId);
  },

  async save(completion: ChecklistCompletion): Promise<void> {
    const db = await getDB();
    await db.put('checklistCompletions', completion);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('checklistCompletions', id);
  },
};

// ============================================================================
// BUDGETS
// ============================================================================

export const budgetsStorage = {
  async getAll(): Promise<Budget[]> {
    const db = await getDB();
    return db.getAll('budgets');
  },

  async getById(id: string): Promise<Budget | undefined> {
    const db = await getDB();
    return db.get('budgets', id);
  },

  async getBySeason(season: number): Promise<Budget | undefined> {
    const db = await getDB();
    const budgets = await db.getAllFromIndex('budgets', 'by-season', season);
    return budgets[0];
  },

  async save(budget: Budget): Promise<void> {
    const db = await getDB();
    budget.updatedAt = Date.now();
    await db.put('budgets', budget);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('budgets', id);
  },
};

// ============================================================================
// ANALYTICS HELPERS
// ============================================================================

export const teamAnalytics = {
  async getSeasonSummary(year: number) {
    const events = await eventsStorage.getBySeason(year);
    const expenses = await expensesStorage.getBySeason(year);
    
    const attendedEvents = events.filter(e => e.status === 'attended');
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPrize = attendedEvents.reduce((sum, e) => {
      const prizeMoney = e.results?.reduce((p, r) => p + (r.prizeMoney || 0), 0) || 0;
      return sum + prizeMoney;
    }, 0);
    
    const wins = attendedEvents.reduce((count, e) => {
      const eventWins = e.results?.reduce((w, r) => {
        const roundWins = r.eliminations?.filter(el => el.result === 'win').length || 0;
        return w + roundWins;
      }, 0) || 0;
      return count + eventWins;
    }, 0);
    
    const losses = attendedEvents.reduce((count, e) => {
      const eventLosses = e.results?.reduce((l, r) => {
        const roundLosses = r.eliminations?.filter(el => el.result === 'loss').length || 0;
        return l + roundLosses;
      }, 0) || 0;
      return count + eventLosses;
    }, 0);
    
    return {
      year,
      eventsPlanned: events.length,
      eventsAttended: attendedEvents.length,
      totalExpenses,
      totalPrize,
      netCost: totalExpenses - totalPrize,
      costPerEvent: attendedEvents.length > 0 ? totalExpenses / attendedEvents.length : 0,
      wins,
      losses,
      winRate: wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0,
    };
  },

  async getVehicleCosts(vehicleId: string) {
    const parts = await partsStorage.getByVehicle(vehicleId);
    const maintenance = await maintenanceStorage.getByVehicle(vehicleId);
    const expenses = await expensesStorage.getByVehicle(vehicleId);
    
    const partsCost = parts.reduce((sum, p) => sum + (p.purchasePrice || 0), 0);
    const maintenanceCost = maintenance.reduce((sum, m) => sum + (m.totalCost || 0), 0);
    const otherExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    return {
      vehicleId,
      partsCost,
      maintenanceCost,
      otherExpenses,
      totalInvestment: partsCost + maintenanceCost + otherExpenses,
    };
  },
};

// ============================================================================
// PROMOTED EVENTS STORAGE (Community Events with Admin Approval)
// ============================================================================

export const promotedEventsStorage = {
  async getAll(): Promise<PromotedEvent[]> {
    const db = await getDB();
    // Check if store exists (may not in older DB versions)
    if (!db.objectStoreNames.contains('promotedEvents')) {
      return [];
    }
    return db.getAll('promotedEvents');
  },

  async getApproved(): Promise<PromotedEvent[]> {
    const all = await this.getAll();
    const now = Date.now();
    return all.filter(e => e.status === 'approved' && e.startDate >= now);
  },

  async getPending(): Promise<PromotedEvent[]> {
    const all = await this.getAll();
    return all.filter(e => e.status === 'pending');
  },

  async getBySubmitter(userId: string): Promise<PromotedEvent[]> {
    const all = await this.getAll();
    return all.filter(e => e.submittedBy === userId);
  },

  async get(id: string): Promise<PromotedEvent | undefined> {
    const db = await getDB();
    if (!db.objectStoreNames.contains('promotedEvents')) {
      return undefined;
    }
    return db.get('promotedEvents', id);
  },

  async save(event: PromotedEvent): Promise<void> {
    const db = await getDB();
    // Create store if it doesn't exist (for DB migrations)
    if (!db.objectStoreNames.contains('promotedEvents')) {
      // Store will be created on next DB version upgrade
      console.warn('promotedEvents store not found - upgrade DB version');
      return;
    }
    await db.put('promotedEvents', event);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    if (!db.objectStoreNames.contains('promotedEvents')) {
      return;
    }
    await db.delete('promotedEvents', id);
  },

  async approve(id: string, adminId: string): Promise<void> {
    const event = await this.get(id);
    if (!event) return;
    
    event.status = 'approved';
    event.reviewedBy = adminId;
    event.reviewedAt = Date.now();
    event.updatedAt = Date.now();
    await this.save(event);
  },

  async reject(id: string, adminId: string, reason?: string): Promise<void> {
    const event = await this.get(id);
    if (!event) return;
    
    event.status = 'rejected';
    event.reviewedBy = adminId;
    event.reviewedAt = Date.now();
    event.rejectionReason = reason;
    event.updatedAt = Date.now();
    await this.save(event);
  },

  async incrementViewCount(id: string): Promise<void> {
    const event = await this.get(id);
    if (!event) return;
    
    event.viewCount = (event.viewCount || 0) + 1;
    await this.save(event);
  },

  async incrementAddedCount(id: string): Promise<void> {
    const event = await this.get(id);
    if (!event) return;
    
    event.addedToCalendarCount = (event.addedToCalendarCount || 0) + 1;
    await this.save(event);
  },
};
