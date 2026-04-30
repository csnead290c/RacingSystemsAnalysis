#!/bin/bash
# Seed E2E Test Data for Auth/Access Tests
# Creates test invite codes in SQLite database

set -e

DB_PATH="api/rsa.db"

echo "=== Seeding E2E Test Data ==="
echo ""

# Clean up old test data
echo "1. Cleaning up old test data..."
sqlite3 "$DB_PATH" "DELETE FROM users WHERE email LIKE '%@test.rsa.local';"
sqlite3 "$DB_PATH" "DELETE FROM invite_codes WHERE code LIKE 'nhra_E2E_TEST_%';"
echo "   ✓ Cleaned up old test users and invite codes"
echo ""

# Create test invite codes
echo "2. Creating test invite codes..."

# Valid NHRA invite
sqlite3 "$DB_PATH" "INSERT INTO invite_codes (code, plan, max_uses, uses_count, expires_at, created_by, created_at) VALUES ('nhra_E2E_TEST_VALID_2026', 'nhra', 999, 0, datetime('now', '+1 year'), 1, datetime('now'));"
echo "   ✓ Created valid NHRA invite: nhra_E2E_TEST_VALID_2026"

# Expired NHRA invite
sqlite3 "$DB_PATH" "INSERT INTO invite_codes (code, plan, max_uses, uses_count, expires_at, created_by, created_at) VALUES ('nhra_E2E_TEST_EXPIRED_2026', 'nhra', 999, 0, datetime('now', '-1 day'), 1, datetime('now'));"
echo "   ✓ Created expired NHRA invite: nhra_E2E_TEST_EXPIRED_2026"

# Revoked NHRA invite
sqlite3 "$DB_PATH" "INSERT INTO invite_codes (code, plan, max_uses, uses_count, expires_at, revoked_at, created_by, created_at) VALUES ('nhra_E2E_TEST_REVOKED_2026', 'nhra', 999, 0, datetime('now', '+1 year'), datetime('now'), 1, datetime('now'));"
echo "   ✓ Created revoked NHRA invite: nhra_E2E_TEST_REVOKED_2026"

# Max-uses NHRA invite
sqlite3 "$DB_PATH" "INSERT INTO invite_codes (code, plan, max_uses, uses_count, expires_at, created_by, created_at) VALUES ('nhra_E2E_TEST_MAXUSES_2026', 'nhra', 1, 1, datetime('now', '+1 year'), 1, datetime('now'));"
echo "   ✓ Created max-uses NHRA invite: nhra_E2E_TEST_MAXUSES_2026"

echo ""
echo "3. Verifying test data..."
sqlite3 "$DB_PATH" "SELECT code, plan, max_uses, uses_count FROM invite_codes WHERE code LIKE 'nhra_E2E_TEST_%';"

echo ""
echo "=== E2E Test Data Seeded Successfully ==="
echo ""
echo "You can now run: npm run test:e2e:auth"
