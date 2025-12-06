<?php
/**
 * Database Configuration Template
 * Copy this to config.php and fill in your credentials
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'your_database_name');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');

// JWT Secret for token signing (change this to a random string)
define('JWT_SECRET', 'change_this_to_a_random_secret_string');

// CORS settings
define('ALLOWED_ORIGIN', '*'); // Change to your domain in production

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);

// ... rest of the file is the same as config.php
