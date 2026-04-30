#!/bin/bash
# Complete E2E Test Database Setup
# Creates all necessary tables and test data with proper authentication

set -e

DB_PATH="api/rsa.db"

echo "Setting up E2E test database..."

# Remove old database
rm -f "$DB_PATH"

# Create database with complete schema
sqlite3 "$DB_PATH" <<'EOF'
-- Users table with proper schema
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    plan TEXT DEFAULT 'free',
    products TEXT DEFAULT '[]',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Rate limits table
CREATE TABLE rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rate_key TEXT NOT NULL,
    attempts INTEGER DEFAULT 1,
    window_start TEXT DEFAULT (datetime('now'))
);

-- Event Instances
CREATE TABLE event_instances (
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
CREATE TABLE persons (
    id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    display_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Organizations
CREATE TABLE organizations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Vehicles
CREATE TABLE vehicles (
    id INTEGER PRIMARY KEY,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Event Entries
CREATE TABLE event_entries (
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
CREATE TABLE entry_holds (
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
CREATE TABLE entry_hold_history (
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

-- Insert test admin user
-- Password: 'password' hashed with bcrypt
INSERT INTO users (id, email, password_hash, name, role, plan, products, status)
VALUES (1, 'admin@rsa.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin', 'nhra', '["nhra"]', 'active');

-- Insert test data
INSERT INTO event_instances (id, name, start_date_local, end_date_local, location, series, status)
VALUES (1, 'E2E Test Event', '2024-06-01', '2024-06-02', 'Test Track', 'NHRA', 'active');

INSERT INTO persons (id, first_name, last_name, display_name)
VALUES (1, 'Test', 'Driver', 'Test Driver');

INSERT INTO organizations (id, name)
VALUES (1, 'Test Team');

INSERT INTO vehicles (id, description)
VALUES (1, 'Test Car');

-- Create 5 test entries
INSERT INTO event_entries (id, event_instance_id, competition_number, person_id, org_id, vehicle_id, category, class_index, entry_status)
VALUES 
    (1, 1, '1', 1, 1, 1, 'Top Fuel', 'TF', 'registered'),
    (2, 1, '2', 1, 1, 1, 'Top Fuel', 'TF', 'registered'),
    (3, 1, '3', 1, 1, 1, 'Top Fuel', 'TF', 'registered'),
    (4, 1, '4', 1, 1, 1, 'Top Fuel', 'TF', 'registered'),
    (5, 1, '5', 1, 1, 1, 'Top Fuel', 'TF', 'registered');
EOF

echo "✓ Database created"
echo "✓ Admin user: admin@rsa.local / password"
echo "✓ Test event with 5 entries created"
echo ""
echo "E2E database setup complete!"
