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
define('TEMPEST_API_KEY', 'd3b8c7a2f5e9a1b4c6d8e7f9a2b5c8d1e4f7a9b2c5d8e1f4a7b9c2d5e8f1a4b7');

// Optional: Single station ID (if only using one station)
// define('TEMPEST_STATION_ID', '156136');

?>
