<?php
/**
 * Incident Analyzer Schema Diagnostic
 * 
 * Checks actual database state and reports what exists vs what's expected.
 * Safe to run - read-only queries.
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

try {
    $pdo = getDB();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $results = [
        'timestamp' => date('c'),
        'environment' => $_SERVER['HTTP_HOST'] ?? 'unknown',
        'tables' => [],
        'columns' => [],
        'directories' => [],
        'summary' => [],
    ];
    
    // Check tables
    $expectedTables = [
        'incident_analysis_sessions',
        'incident_analysis_datasets',
        'incident_analysis_channels',
        'incident_analysis_videos',
        'incident_analysis_processed_sessions',
        'incident_analysis_workspaces',
        'incident_analysis_bookmarks',
    ];
    
    foreach ($expectedTables as $table) {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        $exists = $stmt->rowCount() > 0;
        $results['tables'][$table] = $exists ? 'EXISTS' : 'MISSING';
        
        if (!$exists) {
            $results['summary'][] = "❌ Table $table is MISSING";
        }
    }
    
    // Check columns on incident_analysis_channels
    if ($results['tables']['incident_analysis_channels'] === 'EXISTS') {
        $stmt = $pdo->query("SHOW COLUMNS FROM incident_analysis_channels");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $results['columns']['incident_analysis_channels'] = $columns;
        
        $hasChannelKey = in_array('channel_key', $columns);
        $hasChannelGroup = in_array('channel_group', $columns);
        
        if (!$hasChannelKey) {
            $results['summary'][] = "❌ Column incident_analysis_channels.channel_key is MISSING";
        }
        if (!$hasChannelGroup) {
            $results['summary'][] = "❌ Column incident_analysis_channels.channel_group is MISSING";
        }
    }
    
    // Check directories
    $baseDir = __DIR__ . '/../uploads/incident_analysis';
    $dirs = [
        'datasets' => $baseDir . '/datasets',
        'processed' => $baseDir . '/processed',
        'videos' => $baseDir . '/videos',
    ];
    
    foreach ($dirs as $name => $path) {
        $exists = is_dir($path);
        $writable = $exists && is_writable($path);
        
        $results['directories'][$name] = [
            'path' => $path,
            'exists' => $exists,
            'writable' => $writable,
        ];
        
        if (!$exists) {
            $results['summary'][] = "❌ Directory $name does not exist: $path";
        } elseif (!$writable) {
            $results['summary'][] = "⚠️ Directory $name exists but is not writable: $path";
        }
    }
    
    // Overall status
    $allTablesExist = !in_array('MISSING', $results['tables']);
    $allDirsExist = array_reduce($results['directories'], fn($carry, $dir) => $carry && $dir['exists'], true);
    
    if ($allTablesExist && $allDirsExist) {
        $results['status'] = 'READY';
        $results['summary'][] = "✅ All required tables and directories exist";
    } else {
        $results['status'] = 'NOT_READY';
        if (!$allTablesExist) {
            $results['summary'][] = "❌ Migration v31 appears NOT to have been run";
        }
    }
    
    echo json_encode($results, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString(),
    ], JSON_PRETTY_PRINT);
}
