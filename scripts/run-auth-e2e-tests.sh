#!/bin/bash
# Run Auth E2E Tests with Local PHP Server
# This script sets up the environment and runs the E2E tests

set -e

echo "=== RSA Auth E2E Test Runner ==="
echo ""

# 1. Check if PHP server is running
if ! curl -s http://localhost:8000/auth.php > /dev/null 2>&1; then
    echo "Starting local PHP test server..."
    php -S localhost:8000 -t api api/router-test.php > /tmp/php-test-server.log 2>&1 &
    PHP_PID=$!
    echo "PHP server started (PID: $PHP_PID)"
    sleep 2
else
    echo "PHP server already running"
fi

# 2. Verify test data is seeded
echo "Verifying test data..."
INVITE_COUNT=$(sqlite3 api/rsa.db "SELECT COUNT(*) FROM invite_codes WHERE code LIKE 'nhra_E2E_TEST_%';")
if [ "$INVITE_COUNT" -lt 4 ]; then
    echo "Test data not found. Running seed script..."
    ./scripts/seed-e2e-test-data.sh
fi
echo "Test data verified: $INVITE_COUNT invite codes"

# 3. Run Playwright tests
echo ""
echo "Running Playwright E2E tests..."
echo ""
npm run test:e2e:auth

# Capture exit code
TEST_EXIT_CODE=$?

echo ""
echo "=== Test Run Complete ==="
echo "Exit code: $TEST_EXIT_CODE"

exit $TEST_EXIT_CODE
