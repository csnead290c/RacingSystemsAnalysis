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
// NHRA Parity — Tempest Weather Stations
// Get station IDs from https://tempestwx.com/ (Settings > Stations > Station ID)
// Get API key from https://tempestwx.com/settings/tokens
//
// Multi-station: list all station IDs comma-separated. The canonical weather
// rebuild cross-validates readings and uses median consensus when stations
// disagree (especially humidity). Stations may be offline independently.
// =============================================================================
define('TEMPEST_STATION_IDS', '');          // Comma-separated station IDs (e.g. '156136,187092,136782')
define('TEMPEST_STATION_ID', '');           // Legacy single station ID (used if TEMPEST_STATION_IDS is empty)
define('TEMPEST_API_KEY', '');              // WeatherFlow personal access token
define('TEMPEST_BUCKET_MINUTES', 30);       // Observation bucketing interval (default 30)

// =============================================================================
// Apple WeatherKit (RSA Weather ET Predictor)
// Register a Service identifier in your Apple Developer account and create
// an AuthKey_XXXXXXXXXX.p8 file.
// https://developer.apple.com/account/resources/authkeys/list
// =============================================================================
define('APPLE_WEATHER_KEY_ID',              '');   // 10-char key ID  (e.g. 'ABCDE12345')
define('APPLE_WEATHER_TEAM_ID',             '');   // 10-char team ID (e.g. 'XY98765432')
define('APPLE_WEATHER_SERVICE_BUNDLE_ID',   '');   // Service ID      (e.g. 'com.yourapp.weatherkit-client')
// Paste the full PEM content of the .p8 file (multiline string):
define('APPLE_WEATHER_PRIVATE_KEY_PEM', <<<'PEM'
-----BEGIN PRIVATE KEY-----
<paste your AuthKey .p8 content here>
-----END PRIVATE KEY-----
PEM);

// =============================================================================
// Bootstrap Tools (CLI-only recovery tool)
// Enable only when needed, disable after use.
// =============================================================================
// define('BOOTSTRAP_TOOLS_ENABLED', true);
// define('BOOTSTRAP_SECRET', '');  // Optional: require a secret argument to run

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);
