#!/usr/bin/env php
<?php
/**
 * Bootstrap Owner — CLI-only tool for production recovery.
 * 
 * SECURITY:
 *   - Refuses to run via web (checks PHP_SAPI)
 *   - Requires BOOTSTRAP_TOOLS_ENABLED=true in config.php
 *   - Optionally requires BOOTSTRAP_SECRET as first argument
 *   - Logs every invocation to api/tools/bootstrap.log
 *
 * Usage (from web root):
 *   php api/tools/bootstrap-owner.php [secret] <command> [args...]
 *
 * Commands:
 *   list                                   List all users
 *   promote <email>                        Promote user to 'owner' role
 *   set-password <email> <new-password>    Set/reset a user's password
 *   create <email> <name> <password>       Create a new owner account
 *
 * Examples:
 *   php api/tools/bootstrap-owner.php list
 *   php api/tools/bootstrap-owner.php promote csnead@sneadracing.com
 *   php api/tools/bootstrap-owner.php mySecret set-password user@example.com Pass123
 */

// ── Safety: CLI only ──────────────────────────────────────────────────
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit(1);
}

// ── Bootstrap config ──────────────────────────────────────────────────
require_once __DIR__ . '/../config.php';

// ── Feature flag gate ─────────────────────────────────────────────────
if (!defined('BOOTSTRAP_TOOLS_ENABLED') || BOOTSTRAP_TOOLS_ENABLED !== true) {
    fwrite(STDERR, "ERROR: Bootstrap tools are disabled.\n");
    fwrite(STDERR, "Add  define('BOOTSTRAP_TOOLS_ENABLED', true);  to config.php to enable.\n");
    exit(1);
}

// ── Logging helper ────────────────────────────────────────────────────
$LOG_FILE = __DIR__ . '/bootstrap.log';

function logAction(string $action, string $detail = '') {
    global $LOG_FILE;
    $ts = date('Y-m-d H:i:s');
    $who = get_current_user() . '@' . gethostname();
    $line = "[{$ts}] [{$who}] {$action}";
    if ($detail) $line .= " — {$detail}";
    file_put_contents($LOG_FILE, $line . "\n", FILE_APPEND | LOCK_EX);
}

// ── Parse args (optional secret check) ────────────────────────────────
$args = array_slice($argv, 1); // drop script name

// If BOOTSTRAP_SECRET is defined, the first argument must match it
if (defined('BOOTSTRAP_SECRET') && BOOTSTRAP_SECRET !== '') {
    $secret = array_shift($args) ?? '';
    if ($secret !== BOOTSTRAP_SECRET) {
        logAction('DENIED', 'invalid secret');
        fwrite(STDERR, "ERROR: Invalid bootstrap secret.\n");
        exit(1);
    }
}

$command = $args[0] ?? '';

// ── DB connection ─────────────────────────────────────────────────────
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

// ── Dispatch ──────────────────────────────────────────────────────────
switch ($command) {
    case 'list':
        logAction('list');
        cmdList($pdo);
        break;
    case 'promote':
        $email = $args[1] ?? '';
        if (!$email) die("Usage: bootstrap-owner.php [secret] promote <email>\n");
        logAction('promote', $email);
        cmdPromote($pdo, $email);
        break;
    case 'set-password':
        $email = $args[1] ?? '';
        $password = $args[2] ?? '';
        if (!$email || !$password) die("Usage: bootstrap-owner.php [secret] set-password <email> <new-password>\n");
        logAction('set-password', $email);
        cmdSetPassword($pdo, $email, $password);
        break;
    case 'create':
        $email = $args[1] ?? '';
        $name = $args[2] ?? '';
        $password = $args[3] ?? '';
        if (!$email || !$name || !$password) die("Usage: bootstrap-owner.php [secret] create <email> <name> <password>\n");
        logAction('create', $email);
        cmdCreate($pdo, $email, $name, $password);
        break;
    default:
        echo <<<HELP
Bootstrap Owner — CLI-only production recovery tool.

Requires:  define('BOOTSTRAP_TOOLS_ENABLED', true);  in config.php
Optional:  define('BOOTSTRAP_SECRET', 'yourSecret');  — if set, pass as first arg.

Commands:
  list                                   List all users
  promote <email>                        Promote user to 'owner' role
  set-password <email> <new-password>    Set/reset a user's password
  create <email> <name> <password>       Create a new owner account

Examples:
  php api/tools/bootstrap-owner.php list
  php api/tools/bootstrap-owner.php promote csnead@sneadracing.com
  php api/tools/bootstrap-owner.php mySecret set-password user@example.com Pass123

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
    
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    $stmt->execute([$hash, $user['id']]);
    
    echo "PASSWORD SET: {$user['email']} (id={$user['id']})\n";
    echo "  New bcrypt hash stored.\n";
    echo "  IMPORTANT: Change this password after first login.\n";
}

function cmdCreate(PDO $pdo, string $email, string $name, string $password) {
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
    
    $hash = password_hash($password, PASSWORD_DEFAULT);
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
