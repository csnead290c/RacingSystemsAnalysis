-- E2E Test Database Setup
-- Creates minimal Tech Master schema and test data

-- Event Instances
CREATE TABLE IF NOT EXISTS event_instances (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    start_date_local TEXT,
    end_date_local TEXT,
    location TEXT,
    series TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Persons
CREATE TABLE IF NOT EXISTS persons (
    id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    display_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Event Entries
CREATE TABLE IF NOT EXISTS event_entries (
    id INTEGER PRIMARY KEY,
    event_instance_id INTEGER NOT NULL,
    competition_number TEXT,
    person_id INTEGER,
    org_id INTEGER,
    vehicle_id INTEGER,
    category TEXT,
    class_index TEXT,
    entry_status TEXT DEFAULT 'registered',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (event_instance_id) REFERENCES event_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES persons(id),
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

-- Entry Holds (Batch 12)
CREATE TABLE IF NOT EXISTS entry_holds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_entry_id INTEGER NOT NULL,
    hold_type TEXT NOT NULL CHECK(hold_type IN ('compliance_hold','tech_hold','escalation','flag')),
    reason TEXT NOT NULL,
    notes TEXT,
    placed_by TEXT,
    placed_at TEXT DEFAULT (datetime('now')),
    cleared_by TEXT,
    cleared_at TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (event_entry_id) REFERENCES event_entries(id) ON DELETE CASCADE
);

-- Entry Hold History (Batch 12)
CREATE TABLE IF NOT EXISTS entry_hold_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_hold_id INTEGER NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('placed','cleared','modified')),
    old_reason TEXT,
    new_reason TEXT,
    notes TEXT,
    changed_by TEXT,
    changed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (entry_hold_id) REFERENCES entry_holds(id) ON DELETE CASCADE
);

-- Insert test data
INSERT OR IGNORE INTO event_instances (id, name, start_date_local, end_date_local, location, series, status)
VALUES (1, 'E2E Test Event', '2024-06-01', '2024-06-02', 'Test Track', 'NHRA', 'active');

INSERT OR IGNORE INTO persons (id, first_name, last_name, display_name)
VALUES (1, 'Test', 'Driver', 'Test Driver');

INSERT OR IGNORE INTO organizations (id, name)
VALUES (1, 'Test Team');

INSERT OR IGNORE INTO vehicles (id, description)
VALUES (1, 'Test Car');

-- Create 5 test entries
INSERT OR IGNORE INTO event_entries (id, event_instance_id, competition_number, person_id, org_id, vehicle_id, category, class_index, entry_status)
VALUES 
    (1, 1, '1', 1, 1, 1, 'Top Fuel', 'TF', 'registered'),
    (2, 1, '2', 1, 1, 1, 'Top Fuel', 'TF', 'registered'),
    (3, 1, '3', 1, 1, 1, 'Top Fuel', 'TF', 'registered'),
    (4, 1, '4', 1, 1, 1, 'Top Fuel', 'TF', 'registered'),
    (5, 1, '5', 1, 1, 1, 'Top Fuel', 'TF', 'registered');
