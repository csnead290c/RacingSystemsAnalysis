#!/usr/bin/env php
<?php
/**
 * Bootstrap Owner — CLI-only tool for production recovery.
 * 
 * This script is NOT web-accessible. It must be run via SSH/CLI only.
 * It can:
 *   1. Promote an existing user to 'owner' role
 *   2. Set/reset a user's password
 *   3. Create a new owner account
 *   4. List all users (for diagnostics)
 *
 * Usage (from web root):
 *   php api/tools/bootstrap-owner.php list
 *   php api/tools/bootstrap-owner.php promote <email>
 *   php api/tools/bootstrap-owner.php set-password <email> <new-password>
 *   php api/tools/bootstrap-owner.php create <email> <name> <password>
 *
 * Security: Refuses to run if accessed via web (checks PHP_SAPI).
 */

// ── Safety: CLI only ──────────────────────────────────────────────────
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit(1);
}

// ── Bootstrap ─────────────────────────────────────────────────────────
require_once __DIR__ . '/../config.php';

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    fwrite(STDERR, "DB connection failed: " . $e->getMessage() . "\n");
    exit(1);
}

// ── Parse command ─────────────────────────────────────────────────────
$command = $argv[1] ?? '';

switch ($command) {
    case 'list':
        cmdList($pdo);
        break;
    case 'promote':
        $email = $argv[2] ?? '';
        if (!$email) die("Usage: php bootstrap-owner.php promote <email>\n");
        cmdPromote($pdo, $email);
        break;
    case 'set-password':
        $email = $argv[2] ?? '';
        $password = $argv[3] ?? '';
        if (!$email || !$password) die("Usage: php bootstrap-owner.php set-password <email> <new-password>\n");
        cmdSetPassword($pdo, $email, $password);
        break;
    case 'create':
        $email = $argv[2] ?? '';
        $name = $argv[3] ?? '';
        $password = $argv[4] ?? '';
        if (!$email || !$name || !$password) die("Usage: php bootstrap-owner.php create <email> <name> <password>\n");
        cmdCreate($pdo, $email, $name, $password);
        break;
    default:
        echo <<<HELP
Bootstrap Owner — CLI-only production recovery tool.

Commands:
  list                                   List all users
  promote <email>                        Promote user to 'owner' role
  set-password <email> <new-password>    Set/reset a user's password
  create <email> <name> <password>       Create a new owner account

Examples:
  php api/tools/bootstrap-owner.php list
  php api/tools/bootstrap-owner.php promote csnead@sneadracing.com
  php api/tools/bootstrap-owner.php set-password owner@racingsystemsanalysis.com MyNewPass123
  php api/tools/bootstrap-owner.php create admin@example.com "Admin User" SecurePass456

HELP;
        exit(0);
}

// ── Commands ──────────────────────────────────────────────────────────

function cmdList(PDO $pdo) {
    $stmt = $pdo->query("SELECT id, email, name, role, password_hash IS NOT NULL as has_pw, created_at FROM users ORDER BY id");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($rows)) {
        echo "No users found.\n";
        return;
    }
    
    printf("%-4s %-40s %-20s %-10s %-6s %s\n", 'ID', 'EMAIL', 'NAME', 'ROLE', 'HAS_PW', 'CREATED');
    echo str_repeat('-', 110) . "\n";
    foreach ($rows as $r) {
        printf("%-4s %-40s %-20s %-10s %-6s %s\n",
            $r['id'], $r['email'], $r['name'], $r['role'],
            $r['has_pw'] ? 'yes' : 'NO', $r['created_at']
        );
    }
    echo "\nTotal: " . count($rows) . " users\n";
}

function cmdPromote(PDO $pdo, string $email) {
    $stmt = $pdo->prepare("SELECT id, email, name, role FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        fwrite(STDERR, "ERROR: No user found with email: $email\n");
        exit(1);
    }
    
    if ($user['role'] === 'owner') {
        echo "User {$user['email']} is already role=owner. No change needed.\n";
        return;
    }
    
    $old = $user['role'];
    $stmt = $pdo->prepare("UPDATE users SET role = 'owner' WHERE id = ?");
    $stmt->execute([$user['id']]);
    
    echo "PROMOTED: {$user['email']} (id={$user['id']})\n";
    echo "  Role: {$old} → owner\n";
}

function cmdSetPassword(PDO $pdo, string $email, string $password) {
    $stmt = $pdo->prepare("SELECT id, email FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        fwrite(STDERR, "ERROR: No user found with email: $email\n");
        exit(1);
    }
    
    if (strlen($password) < 6) {
        fwrite(STDERR, "ERROR: Password must be at least 6 characters.\n");
        exit(1);
    }
    
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    $stmt->execute([$hash, $user['id']]);
    
    echo "PASSWORD SET: {$user['email']} (id={$user['id']})\n";
    echo "  New bcrypt hash stored.\n";
    echo "  IMPORTANT: Change this password after first login.\n";
}

function cmdCreate(PDO $pdo, string $email, string $name, string $password) {
    // Check if email already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        fwrite(STDERR, "ERROR: User with email $email already exists. Use 'promote' or 'set-password' instead.\n");
        exit(1);
    }
    
    if (strlen($password) < 6) {
        fwrite(STDERR, "ERROR: Password must be at least 6 characters.\n");
        exit(1);
    }
    
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $products = json_encode(['quarter_pro', 'bonneville_pro', 'engine_pro']);
    
    $stmt = $pdo->prepare("INSERT INTO users (email, name, password_hash, role, products, created_at) VALUES (?, ?, ?, 'owner', ?, NOW())");
    $stmt->execute([$email, $name, $hash, $products]);
    
    $id = $pdo->lastInsertId();
    echo "CREATED: {$email} (id={$id})\n";
    echo "  Name: {$name}\n";
    echo "  Role: owner\n";
    echo "  Products: quarter_pro, bonneville_pro, engine_pro\n";
    echo "  IMPORTANT: Change this password after first login.\n";
}
