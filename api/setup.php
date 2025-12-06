<?php
/**
 * Database Setup Script
 * Run this ONCE to create the tables
 * Access via: https://racingsystemsanalysis.com/api/setup.php
 */

// Enable error display for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

echo json_encode(['status' => 'Starting setup...']) . "\n";

if (!file_exists('config.php')) {
    echo json_encode(['error' => 'config.php not found! Please upload it to the api folder.']);
    exit;
}

require_once 'config.php';

echo json_encode(['status' => 'Config loaded, connecting to database...']) . "\n";

try {
    $pdo = getDB();
    echo json_encode(['status' => 'Database connected!']) . "\n";
} catch (Exception $e) {
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Create tables
$sql = "
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('owner', 'admin', 'user', 'beta') DEFAULT 'user',
    products JSON DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Vehicles table
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
);

-- Run history table
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
);

-- Create default owner account (password: owner123)
INSERT IGNORE INTO users (email, password_hash, name, role, products) 
VALUES (
    'owner@racingsystemsanalysis.com',
    '\$2y\$10\$YourHashedPasswordHere',
    'Site Owner',
    'owner',
    '[\"quarter_pro\", \"quarter_jr\", \"bonneville_pro\"]'
);
";

try {
    // Execute each statement separately
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    
    foreach ($statements as $statement) {
        if (!empty($statement) && stripos($statement, '--') !== 0) {
            $pdo->exec($statement);
        }
    }
    
    // Create owner account with proper password hash
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
        echo "Owner account created: owner@racingsystemsanalysis.com / owner123\n";
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Database tables created successfully!'
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
