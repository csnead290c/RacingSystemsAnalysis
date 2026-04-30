<?php
/**
 * Simple test to verify ia_processSession() is available at runtime
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/capabilities.php';
require_once __DIR__ . '/lib/ia-processing.php';

$result = [
    'timestamp' => date('c'),
    'function_exists' => function_exists('ia_processSession'),
    'file_path' => __DIR__ . '/lib/ia-processing.php',
    'file_exists' => file_exists(__DIR__ . '/lib/ia-processing.php'),
    'is_included' => in_array(realpath(__DIR__ . '/lib/ia-processing.php'), array_map('realpath', get_included_files())),
    'all_ia_functions' => array_values(array_filter(get_defined_functions()['user'], function($fn) {
        return stripos($fn, 'ia_') === 0;
    }))
];

echo json_encode($result, JSON_PRETTY_PRINT);
