<?php
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');

try {
    $pdo = rsa_pdo();
    
    // Check if columns exist
    $stmt = $pdo->query("DESCRIBE parity_weather_canonical");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $requiredColumns = [
        'canonical_source_kind',
        'canonical_source_detail',
        'sample_count',
        'sample_sources_json'
    ];
    
    $existingColumns = array_column($columns, 'Field');
    $missingColumns = array_diff($requiredColumns, $existingColumns);
    
    if (count($missingColumns) > 0) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Migration not complete',
            'missingColumns' => array_values($missingColumns),
            'existingColumns' => $existingColumns
        ], JSON_PRETTY_PRINT);
        exit;
    }
    
    // Check if index exists
    $stmt = $pdo->query("SHOW INDEX FROM parity_weather_canonical WHERE Key_name = 'idx_canonical_source_kind'");
    $index = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get sample data
    $stmt = $pdo->query("
        SELECT timestamp_utc, canonical_source_kind, canonical_source_detail, 
               sample_count, sample_sources_json
        FROM parity_weather_canonical
        ORDER BY timestamp_utc DESC
        LIMIT 5
    ");
    $sampleRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Count populated rows
    $stmt = $pdo->query("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN canonical_source_kind != 'unknown' THEN 1 ELSE 0 END) as populated,
            SUM(CASE WHEN sample_count > 0 THEN 1 ELSE 0 END) as with_samples
        FROM parity_weather_canonical
    ");
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Migration verified successfully',
        'columnsExist' => true,
        'indexExists' => $index !== false,
        'stats' => $stats,
        'sampleRows' => $sampleRows
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
