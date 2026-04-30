<?php
/**
 * Setup E2E Test Database
 * Runs all Tech Master migrations and creates minimal test data
 */

require_once __DIR__ . '/../api/lib/db.php';

echo "Setting up E2E test database...\n\n";

// Run all Tech Master migrations in order
$migrations = [
    'migrate-v17-tm-foundation.php',
    'migrate-v18-tm-events.php',
    'migrate-v19-tm-identities.php',
    'migrate-v20-tm-entries.php',
    'migrate-v21-tm-techcases.php',
    'migrate-v22-tm-bridge.php',
    'migrate-v23-tm-scale.php',
    'migrate-v24-tm-linkage.php',
    'migrate-v25-tm-fuel.php',
    'migrate-v26-tm-inspection.php',
    'migrate-v27-tm-techcard.php',
    'migrate-v28-tm-teardown.php',
    'migrate-v29-tm-admin.php',
    'migrate-v30-tm-holds.php',
];

foreach ($migrations as $migration) {
    $path = __DIR__ . '/../api/' . $migration;
    if (file_exists($path)) {
        echo "Running $migration...\n";
        require_once $path;
    } else {
        echo "WARNING: $migration not found\n";
    }
}

echo "\nCreating test data...\n";

$db = getDb();

// Create test event
$db->exec("
    INSERT INTO event_instances (id, name, start_date_local, end_date_local, location, series, status, created_at, updated_at)
    VALUES (1, 'E2E Test Event', '2024-06-01', '2024-06-02', 'Test Track', 'NHRA', 'active', datetime('now'), datetime('now'))
");

// Create test person
$db->exec("
    INSERT INTO persons (id, first_name, last_name, display_name, created_at, updated_at)
    VALUES (1, 'Test', 'Driver', 'Test Driver', datetime('now'), datetime('now'))
");

// Create test organization
$db->exec("
    INSERT INTO organizations (id, name, created_at, updated_at)
    VALUES (1, 'Test Team', datetime('now'), datetime('now'))
");

// Create test vehicle
$db->exec("
    INSERT INTO vehicles (id, description, created_at, updated_at)
    VALUES (1, 'Test Car', datetime('now'), datetime('now'))
");

// Create test entries
for ($i = 1; $i <= 5; $i++) {
    $db->exec("
        INSERT INTO event_entries (
            id, event_instance_id, competition_number, person_id, org_id, vehicle_id,
            category, class_index, entry_status, created_at, updated_at
        )
        VALUES (
            $i, 1, '$i', 1, 1, 1,
            'Top Fuel', 'TF', 'registered', datetime('now'), datetime('now')
        )
    ");
}

echo "Created 1 event with 5 entries\n";
echo "\nE2E database setup complete!\n";
