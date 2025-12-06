<?php
/**
 * Database Setup Script
 * Run this ONCE to create the tables
 * Access via: https://racingsystemsanalysis.com/api/setup.php
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== RSA Database Setup ===\n\n";

if (!file_exists('config.php')) {
    echo "ERROR: config.php not found!\n";
    exit;
}

require_once 'config.php';

echo "1. Connecting to database...\n";

try {
    $pdo = getDB();
    echo "   SUCCESS: Connected!\n\n";
} catch (Exception $e) {
    echo "   FAILED: " . $e->getMessage() . "\n";
    exit;
}

// Create users table
echo "2. Creating users table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            role ENUM('owner', 'admin', 'user', 'beta') DEFAULT 'user',
            products JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
    echo "   SUCCESS!\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// Create vehicles table
echo "3. Creating vehicles table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS vehicles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            uuid VARCHAR(36) UNIQUE NOT NULL,
            user_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            is_public BOOLEAN DEFAULT FALSE,
            data JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_is_public (is_public)
        )
    ");
    echo "   SUCCESS!\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// Create run_history table
echo "4. Creating run_history table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS run_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            uuid VARCHAR(36) UNIQUE NOT NULL,
            user_id INT NOT NULL,
            vehicle_uuid VARCHAR(36) NOT NULL,
            vehicle_name VARCHAR(255) NOT NULL,
            race_length VARCHAR(50) NOT NULL,
            env_data JSON NOT NULL,
            result_et DECIMAL(10,4) NOT NULL,
            result_mph DECIMAL(10,2) NOT NULL,
            hp_adjust INT DEFAULT 0,
            weight_adjust INT DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id)
        )
    ");
    echo "   SUCCESS!\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// Create owner account
echo "5. Creating owner account...\n";
try {
    $ownerEmail = 'owner@racingsystemsanalysis.com';
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$ownerEmail]);
    
    if (!$stmt->fetch()) {
        $hash = password_hash('owner123', PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (email, password_hash, name, role, products) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $ownerEmail,
            $hash,
            'Site Owner',
            'owner',
            '["quarter_pro", "quarter_jr", "bonneville_pro"]'
        ]);
        echo "   SUCCESS! Created: owner@racingsystemsanalysis.com / owner123\n\n";
    } else {
        echo "   SKIPPED: Owner account already exists\n\n";
    }
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

echo "=== Setup Complete ===\n";
echo "\nYou can now login with:\n";
echo "Email: owner@racingsystemsanalysis.com\n";
echo "Password: owner123\n";
