<?php
/**
 * Capabilities Endpoint
 *
 * Returns the authenticated user's current capabilities, plan, and role.
 * Called by the client-side capabilityRefresh.ts to sync cached capabilities.
 *
 * GET /api/capabilities-endpoint.php
 * Response: { plan, role, capabilities, version }
 */

// Suppress any stray warnings from corrupting JSON output
ini_set('display_errors', '0');
error_reporting(E_ALL);
ob_start();

require_once 'config.php';
require_once 'functions.php';
require_once __DIR__ . '/lib/capabilities.php';

rsa_setCorsHeaders();

$pdo = getDB();
$auth = rsa_requireAuth();

rsa_handleGetCapabilities($pdo, $auth);
