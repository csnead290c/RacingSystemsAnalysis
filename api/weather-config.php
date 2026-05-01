<?php
/**
 * Tempest Weather Configuration
 * 
 * This file contains the configuration for Tempest weather stations and API access.
 * Station IDs and API key are defined here for weather data fetching.
 */

// Tempest station IDs (comma-separated list)
// These are the station IDs for weather data collection
define('TEMPEST_STATION_IDS', '156136,187092,136782');

// Tempest API key for weather data access
// This key is used to authenticate with the Tempest weather API
define('TEMPEST_API_KEY', '717a29a4-362c-488f-8317-415db47cbe18');

// Optional: Single station ID (if only using one station)
// define('TEMPEST_STATION_ID', '156136');

?>
