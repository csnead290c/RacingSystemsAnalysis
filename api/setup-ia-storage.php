<?php
/**
 * Setup Incident Analyzer Storage Directories
 * 
 * Creates required storage directories for processed sessions.
 * Safe to run multiple times.
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');

echo "=== Incident Analyzer Storage Setup ===\n\n";

$baseDir = __DIR__ . '/../uploads/incident_analysis';
$dirs = [
    'datasets',
    'processed',
    'videos',
];

foreach ($dirs as $dir) {
    $path = $baseDir . '/' . $dir;
    if (!is_dir($path)) {
        if (mkdir($path, 0755, true)) {
            echo "✓ Created: $path\n";
        } else {
            echo "✗ Failed to create: $path\n";
        }
    } else {
        echo "✓ Exists: $path\n";
    }
    
    // Check writable
    if (is_writable($path)) {
        echo "  → Writable: YES\n";
    } else {
        echo "  → Writable: NO (chmod 755 may be needed)\n";
    }
}

echo "\n=== Storage Setup Complete ===\n";
