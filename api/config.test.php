<?php
/**
 * Test Database Configuration
 * Uses SQLite for E2E testing
 */

// Use SQLite database for testing
define('DB_TYPE', 'sqlite');
define('DB_PATH', __DIR__ . '/rsa.db');

// JWT Secret for token signing
define('JWT_SECRET', 'test_secret_for_e2e_testing_only');

// CORS settings - allow frontend dev server for E2E testing
define('ALLOWED_ORIGIN', 'http://localhost:5173');

// Stripe Configuration (test mode)
define('STRIPE_SECRET_KEY', 'sk_test_xxx');
define('STRIPE_WEBHOOK_SECRET', 'whsec_xxx');
define('STRIPE_PRICE_RACER_MONTHLY', 'price_xxx');
define('STRIPE_PRICE_RACER_YEARLY', 'price_xxx');
define('STRIPE_PRICE_PRO_MONTHLY', 'price_xxx');
define('STRIPE_PRICE_PRO_YEARLY', 'price_xxx');
define('STRIPE_PRICE_TEAM_MONTHLY', 'price_xxx');
define('STRIPE_PRICE_TEAM_YEARLY', 'price_xxx');

// Frontend URLs
define('FRONTEND_URL', 'http://localhost:5173');
define('STRIPE_SUCCESS_URL', FRONTEND_URL . '/account?checkout=success');
define('STRIPE_CANCEL_URL', FRONTEND_URL . '/account?checkout=canceled');

// Tempest Weather (not needed for auth tests)
define('TEMPEST_STATION_IDS', '');         // Comma-separated station IDs
define('TEMPEST_STATION_ID', '');          // Legacy single station
define('TEMPEST_API_KEY', '');
define('TEMPEST_BUCKET_MINUTES', 30);

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);

/**
 * Get database connection
 * @return PDO
 */
if (!function_exists('getDB')) {
    function getDB() {
        static $pdo = null;
        
        if ($pdo === null) {
            try {
                $pdo = new PDO('sqlite:' . DB_PATH);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            } catch (PDOException $e) {
                error_log("Database connection failed: " . $e->getMessage());
                throw $e;
            }
        }
        
        return $pdo;
    }
}
