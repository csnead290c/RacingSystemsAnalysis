<?php
/**
 * Debug endpoint DISABLED — security audit 2026-02-23.
 * Previously leaked all vehicle UUIDs, user IDs, and user info without auth.
 */
http_response_code(403);
header('Content-Type: application/json');
echo json_encode(['error' => 'Endpoint disabled']);
exit;
