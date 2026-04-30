<?php
/**
 * Migration v28: Add fuel_type column to engine_combos table
 * - Adds fuel_type VARCHAR(50) with DEFAULT 'Gasoline Carbureted'
 * - Adds indexes for fuel_type
 * - Backfills existing records with 'Gasoline Carbureted'
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

try {
    $pdo = getDB();
    
    echo "Starting migration v28: Add fuel_type to engine_combos...\n";
    
    // Check if fuel_type column already exists
    $stmt = $pdo->prepare("SHOW COLUMNS FROM parity_engine_combos LIKE 'fuel_type'");
    $stmt->execute();
    if ($stmt->rowCount() > 0) {
        echo "fuel_type column already exists. Skipping migration.\n";
        exit(0);
    }
    
    // Add fuel_type column
    $sql = "ALTER TABLE parity_engine_combos 
            ADD COLUMN fuel_type VARCHAR(50) NOT NULL DEFAULT 'Gasoline Carbureted' 
            COMMENT 'Fuel type: Gasoline Carbureted, Gasoline Injector, Methanol, Methanol Injector, Nitromethane, Supercharged Gasoline, Supercharged Methanol, Supercharged Nitro'";
    $pdo->exec($sql);
    echo "Added fuel_type column\n";
    
    // Add index for fuel_type
    $pdo->exec("CREATE INDEX idx_parity_engine_combos_fuel_type ON parity_engine_combos(fuel_type)");
    echo "Added fuel_type index\n";
    
    // Backfill existing records with 'Gasoline Carbureted' (should already be default)
    $stmt = $pdo->prepare("UPDATE parity_engine_combos SET fuel_type = 'Gasoline Carbureted' WHERE fuel_type IS NULL OR fuel_type = ''");
    $stmt->execute();
    echo "Backfilled " . $stmt->rowCount() . " existing records with default fuel type\n";
    
    // Create default "Gasoline Carbureted" combo if it doesn't exist
    $stmt = $pdo->prepare("SELECT id FROM parity_engine_combos WHERE name = 'Gasoline Carbureted'");
    $stmt->execute();
    if ($stmt->rowCount() === 0) {
        $insertSql = "INSERT INTO parity_engine_combos (name, t_power, d_power, friction_factor, fuel_type) 
                      VALUES ('Gasoline Carbureted', 0.6, 1.0, 15, 'Gasoline Carbureted')";
        $pdo->exec($insertSql);
        echo "Created default 'Gasoline Carbureted' combo\n";
    } else {
        echo "Default 'Gasoline Carbureted' combo already exists\n";
    }
    
    echo "Migration v28 completed successfully!\n";
    
} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
