<?php
/**
 * Database Configuration Template
 * Copy this to config.php and fill in your credentials
 * 
 * NOTE: All helper functions are now in functions.php
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'your_database_name');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');

// JWT Secret for token signing (change this to a random string)
define('JWT_SECRET', 'change_this_to_a_random_secret_string');

// CORS settings
define('ALLOWED_ORIGIN', '*'); // Change to your domain in production

// =============================================================================
// Stripe Configuration
// Get these from https://dashboard.stripe.com/apikeys
// =============================================================================
define('STRIPE_SECRET_KEY', 'sk_test_xxx'); // Secret key (starts with sk_)
define('STRIPE_WEBHOOK_SECRET', 'whsec_xxx'); // Webhook signing secret

// Stripe Price IDs for subscription plans
// Get these from https://dashboard.stripe.com/products
define('STRIPE_PRICE_RACER_MONTHLY', 'price_xxx');
define('STRIPE_PRICE_RACER_YEARLY', 'price_xxx');
define('STRIPE_PRICE_PRO_MONTHLY', 'price_xxx');
define('STRIPE_PRICE_PRO_YEARLY', 'price_xxx');
define('STRIPE_PRICE_TEAM_MONTHLY', 'price_xxx');
define('STRIPE_PRICE_TEAM_YEARLY', 'price_xxx');

// Frontend URLs for Stripe redirects
define('FRONTEND_URL', 'https://racingsystemsanalysis.com');
define('STRIPE_SUCCESS_URL', FRONTEND_URL . '/account?checkout=success');
define('STRIPE_CANCEL_URL', FRONTEND_URL . '/account?checkout=canceled');

// =============================================================================
// Clerk Configuration (optional - for syncing subscription to Clerk metadata)
// Get from https://dashboard.clerk.com
// =============================================================================
define('CLERK_SECRET_KEY', 'sk_test_xxx'); // Clerk secret key

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);
