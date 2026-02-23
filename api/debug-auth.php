<?php
/**
 * Debug endpoint DISABLED — security audit 2026-02-23.
 * Previously leaked JWT secret preview and token internals.
 */
http_response_code(403);
header('Content-Type: application/json');
echo json_encode(['error' => 'Endpoint disabled']);
exit;
