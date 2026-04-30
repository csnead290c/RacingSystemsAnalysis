<?php
/**
 * Incident Analysis — Session Processing Pipeline
 * 
 * Converts uploaded CSV datasets into canonical normalized session payloads.
 * Handles channel normalization, grouping, and metadata extraction.
 */

/**
 * Channel normalization patterns for auto-categorization.
 * Returns ['key' => normalized_key, 'label' => display_label, 'unit' => unit, 'group' => category]
 */
function ia_normalizeChannelName(string $rawHeader): array {
    $lower = strtolower(trim($rawHeader));
    $clean = preg_replace('/[^a-z0-9_]/', '_', $lower);
    $clean = preg_replace('/_+/', '_', $clean);
    $clean = trim($clean, '_');
    
    // Extract unit from header if present (e.g., "Engine RPM (rpm)" -> unit: "rpm")
    $unit = null;
    if (preg_match('/\(([^)]+)\)\s*$/', $rawHeader, $m)) {
        $unit = trim($m[1]);
    }
    
    // Auto-categorize by name patterns
    $group = 'other';
    
    // Engine
    if (preg_match('/\b(rpm|egt|oil|coolant|fuel_press|manifold|boost|lambda|afr|ignition|timing)\b/', $lower)) {
        $group = 'engine';
    }
    // Chassis
    elseif (preg_match('/\b(speed|gear|brake|suspension|damper|ride_height|roll|pitch|yaw)\b/', $lower)) {
        $group = 'chassis';
    }
    // Driver input
    elseif (preg_match('/\b(throttle|brake_pos|steering|clutch|pedal)\b/', $lower)) {
        $group = 'driver_input';
    }
    // Race control
    elseif (preg_match('/\b(lap|sector|split|position|gap|delta|beacon)\b/', $lower)) {
        $group = 'race_control';
    }
    // Weather
    elseif (preg_match('/\b(ambient|track_temp|humidity|pressure|wind)\b/', $lower)) {
        $group = 'weather';
    }
    // GPS / Location
    elseif (preg_match('/\b(lat|lon|altitude|gps|sat|heading)\b/', $lower)) {
        $group = 'gps';
    }
    
    // Generate display label (capitalize, clean up underscores)
    $label = ucwords(str_replace('_', ' ', $clean));
    
    return [
        'key' => $clean,
        'label' => $label,
        'unit' => $unit,
        'group' => $group,
    ];
}

/**
 * Process uploaded datasets into a canonical session payload.
 * Returns processed session metadata and writes gzipped JSON payload to disk.
 */
function ia_processSession(PDO $pdo, int $sessionId, int $userId): array {
    // Load all datasets for this session
    $dsStmt = $pdo->prepare("
        SELECT id, name, file_path, time_column, time_unit, time_offset, sample_count
        FROM incident_analysis_datasets
        WHERE session_id = ?
        ORDER BY created_at ASC
    ");
    $dsStmt->execute([$sessionId]);
    $datasets = $dsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($datasets)) {
        throw new RuntimeException("No datasets found for session $sessionId");
    }
    
    $uploadDir = __DIR__ . '/../../uploads/incident_analysis/datasets';
    $processedDir = __DIR__ . '/../../uploads/incident_analysis/processed';
    
    if (!is_dir($processedDir)) {
        mkdir($processedDir, 0755, true);
    }
    
    // Build canonical session payload
    $allTimeValues = [];
    $allChannels = [];
    $parseWarnings = [];
    $totalSamples = 0;
    
    foreach ($datasets as $ds) {
        $filePath = $uploadDir . '/' . $ds['file_path'];
        if (!file_exists($filePath)) {
            $parseWarnings[] = "Dataset '{$ds['name']}' file not found: {$ds['file_path']}";
            continue;
        }
        
        // Parse CSV
        $handle = fopen($filePath, 'r');
        if (!$handle) {
            $parseWarnings[] = "Cannot open dataset '{$ds['name']}'";
            continue;
        }
        
        $headers = fgetcsv($handle);
        if (!$headers) {
            fclose($handle);
            $parseWarnings[] = "Dataset '{$ds['name']}' has no headers";
            continue;
        }
        
        $headers = array_map('trim', $headers);
        $timeCol = $ds['time_column'];
        $timeIdx = $timeCol ? array_search($timeCol, $headers) : null;
        $timeDivisor = ($ds['time_unit'] === 'milliseconds') ? 1000.0 : 1.0;
        $timeOffset = (float)$ds['time_offset'];
        
        // Initialize channel data arrays
        $channelData = [];
        $channelMeta = [];
        foreach ($headers as $i => $h) {
            if ($timeIdx !== null && $i === $timeIdx) continue; // Skip time column
            $norm = ia_normalizeChannelName($h);
            $channelData[$i] = [];
            $channelMeta[$i] = [
                'key' => $norm['key'],
                'label' => $norm['label'],
                'unit' => $norm['unit'],
                'group' => $norm['group'],
                'original_column' => $h,
                'dataset_name' => $ds['name'],
            ];
        }
        
        $rowCount = 0;
        while (($row = fgetcsv($handle)) !== false) {
            $rowCount++;
            
            // Extract time
            $time = null;
            if ($timeIdx !== null && isset($row[$timeIdx])) {
                $t = trim($row[$timeIdx]);
                if (is_numeric($t)) {
                    $time = ((float)$t / $timeDivisor) + $timeOffset;
                }
            }
            
            if ($time !== null) {
                $allTimeValues[] = $time;
            } else {
                // No time column or invalid time — use synthetic index
                $time = $rowCount * 0.01; // 100 Hz synthetic
            }
            
            // Extract channel values
            foreach ($headers as $i => $h) {
                if ($timeIdx !== null && $i === $timeIdx) continue;
                $val = isset($row[$i]) ? trim($row[$i]) : '';
                if ($val === '' || !is_numeric($val)) {
                    $channelData[$i][] = null;
                } else {
                    $channelData[$i][] = (float)$val;
                }
            }
        }
        fclose($handle);
        
        $totalSamples += $rowCount;
        
        // Add channels to global list
        foreach ($channelData as $i => $values) {
            $meta = $channelMeta[$i];
            $nonNull = array_filter($values, fn($v) => $v !== null);
            if (empty($nonNull)) {
                $parseWarnings[] = "Channel '{$meta['original_column']}' has no numeric values";
                continue;
            }
            
            $allChannels[] = [
                'key' => $meta['key'],
                'label' => $meta['label'],
                'unit' => $meta['unit'],
                'group' => $meta['group'],
                'sample_count' => count($nonNull),
                'min' => round(min($nonNull), 6),
                'max' => round(max($nonNull), 6),
                'data_type' => 'numeric',
                'original_column' => $meta['original_column'],
                'color_hint' => null,
                'values' => $values,
            ];
        }
    }
    
    // Sort time values and build canonical timebase
    if (empty($allTimeValues)) {
        throw new RuntimeException("No time values found in any dataset");
    }
    
    sort($allTimeValues);
    $timeMin = $allTimeValues[0];
    $timeMax = $allTimeValues[count($allTimeValues) - 1];
    $duration = $timeMax - $timeMin;
    
    // Build session payload
    $payload = [
        'metadata' => [
            'session_id' => $sessionId,
            'title' => "Session #$sessionId",
            'source_type' => 'csv',
            'created_at' => date('c'),
            'file_name' => $datasets[0]['name'],
            'sample_count' => $totalSamples,
            'duration_seconds' => round($duration, 3),
            'parse_warnings' => $parseWarnings,
        ],
        'timebase' => [
            'values' => $allTimeValues,
            'unit' => 'seconds',
            'sample_rate_hz' => $totalSamples > 1 ? round($totalSamples / $duration, 2) : null,
        ],
        'channels' => $allChannels,
        'markers' => [],
        'stats_summary' => [
            'total_channels' => count($allChannels),
            'numeric_channels' => count($allChannels),
            'derived_channels' => 0,
        ],
    ];
    
    // Write gzipped JSON to disk
    $processedFilename = "session_{$sessionId}_" . time() . ".json.gz";
    $processedPath = $processedDir . '/' . $processedFilename;
    
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES);
    $gz = gzencode($json, 6);
    if (file_put_contents($processedPath, $gz) === false) {
        throw new RuntimeException("Failed to write processed session file");
    }
    
    // Insert or update processed session record
    $checkStmt = $pdo->prepare("SELECT id FROM incident_analysis_processed_sessions WHERE session_id = ?");
    $checkStmt->execute([$sessionId]);
    $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existing) {
        $updateStmt = $pdo->prepare("
            UPDATE incident_analysis_processed_sessions
            SET processed_file_path = ?, processed_status = 'ready',
                duration_seconds = ?, sample_count = ?, channel_count = ?,
                metadata_json = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $updateStmt->execute([
            $processedFilename,
            $duration,
            $totalSamples,
            count($allChannels),
            json_encode(['parse_warnings' => $parseWarnings]),
            $existing['id'],
        ]);
        $processedId = (int)$existing['id'];
    } else {
        $insertStmt = $pdo->prepare("
            INSERT INTO incident_analysis_processed_sessions
                (session_id, title, source_type, processed_file_path, processed_status,
                 duration_seconds, sample_count, channel_count, metadata_json, created_by)
            VALUES (?, ?, 'csv', ?, 'ready', ?, ?, ?, ?, ?)
        ");
        $insertStmt->execute([
            $sessionId,
            "Session #$sessionId",
            $processedFilename,
            $duration,
            $totalSamples,
            count($allChannels),
            json_encode(['parse_warnings' => $parseWarnings]),
            $userId,
        ]);
        $processedId = (int)$pdo->lastInsertId();
    }
    
    // Update channel records with normalized keys and groups
    foreach ($allChannels as $ch) {
        // Find matching channel by original name
        $chStmt = $pdo->prepare("
            SELECT id FROM incident_analysis_channels
            WHERE dataset_id IN (SELECT id FROM incident_analysis_datasets WHERE session_id = ?)
              AND name = ?
            LIMIT 1
        ");
        $chStmt->execute([$sessionId, $ch['original_column']]);
        $chRow = $chStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($chRow) {
            $pdo->prepare("
                UPDATE incident_analysis_channels
                SET channel_key = ?, channel_group = ?
                WHERE id = ?
            ")->execute([$ch['key'], $ch['group'], $chRow['id']]);
        }
    }
    
    return [
        'processed_id' => $processedId,
        'processed_file_path' => $processedFilename,
        'duration_seconds' => $duration,
        'sample_count' => $totalSamples,
        'channel_count' => count($allChannels),
        'parse_warnings' => $parseWarnings,
    ];
}

/**
 * Load processed session payload from disk.
 */
function ia_loadProcessedSession(string $processedFilePath): array {
    $fullPath = __DIR__ . '/../../uploads/incident_analysis/processed/' . $processedFilePath;
    if (!file_exists($fullPath)) {
        throw new RuntimeException("Processed session file not found: $processedFilePath");
    }
    
    $gz = file_get_contents($fullPath);
    if ($gz === false) {
        throw new RuntimeException("Failed to read processed session file");
    }
    
    $json = gzdecode($gz);
    if ($json === false) {
        throw new RuntimeException("Failed to decompress processed session file");
    }
    
    $payload = json_decode($json, true);
    if ($payload === null) {
        throw new RuntimeException("Failed to parse processed session JSON");
    }
    
    return $payload;
}

/**
 * Evaluate a derived channel expression safely.
 * Returns ['values' => [...], 'min' => N, 'max' => N, 'error' => null|string]
 */
function ia_evaluateDerivedChannel(array $channels, string $expression): array {
    // Simple arithmetic parser (no eval)
    // For now, support basic operations: +, -, *, /, (), channel references
    
    // Replace channel keys with array references
    $expr = $expression;
    foreach ($channels as $i => $ch) {
        $expr = str_replace($ch['key'], "\$ch[$i]", $expr);
    }
    
    // Validate expression (only allow safe characters)
    if (!preg_match('/^[\d\s\+\-\*\/\(\)\$\[\]]+$/', $expr)) {
        return ['error' => 'Expression contains invalid characters'];
    }
    
    // This is a placeholder — real implementation would use expr-eval or mathjs
    // For now, return error
    return ['error' => 'Derived channels not yet implemented'];
}
