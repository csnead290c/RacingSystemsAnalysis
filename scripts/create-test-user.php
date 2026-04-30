<?php
/**
 * Create E2E test user with proper password hash
 */

$db = new PDO('sqlite:api/rsa.db');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Create test user with properly hashed password
$email = 'admin@rsa.local';
$password = 'password';
$name = 'Administrator';
$role = 'admin';
$plan = 'nhra';
$products = '["nhra"]';

// Generate proper bcrypt hash
$hash = password_hash($password, PASSWORD_DEFAULT);

// Delete existing user
$db->exec("DELETE FROM users WHERE email = '$email'");

// Insert new user with proper hash
$stmt = $db->prepare("INSERT INTO users (email, password_hash, name, role, plan, products, status) VALUES (?, ?, ?, ?, ?, ?, 'active')");
$stmt->execute([$email, $hash, $name, $role, $plan, $products]);

echo "✓ Test user created: $email / $password\n";
echo "✓ Password hash: $hash\n";
