#!/bin/bash
# Validate RSA Auth & Access Control Implementation
# Tests Free registration, NHRA invite registration, and access enforcement

set -e

DB_PATH="api/rsa.db"

echo "========================================="
echo "RSA Auth & Access Validation"
echo "========================================="
echo ""

# Test 1: Verify database schema
echo "Test 1: Database Schema"
echo "------------------------"
sqlite3 "$DB_PATH" "PRAGMA table_info(users);" | grep -q "plan" && echo "✓ users.plan column exists" || echo "✗ users.plan column missing"
sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='invite_codes';" | grep -q "1" && echo "✓ invite_codes table exists" || echo "✗ invite_codes table missing"
sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='invite_code_uses';" | grep -q "1" && echo "✓ invite_code_uses table exists" || echo "✗ invite_code_uses table missing"
echo ""

# Test 2: Verify NHRA invite code
echo "Test 2: NHRA Invite Code"
echo "------------------------"
INVITE_CODE=$(sqlite3 "$DB_PATH" "SELECT code FROM invite_codes WHERE plan='nhra' LIMIT 1;")
if [ -n "$INVITE_CODE" ]; then
    echo "✓ NHRA invite code exists: $INVITE_CODE"
    INVITE_PLAN=$(sqlite3 "$DB_PATH" "SELECT plan FROM invite_codes WHERE code='$INVITE_CODE';")
    INVITE_USES=$(sqlite3 "$DB_PATH" "SELECT uses_count FROM invite_codes WHERE code='$INVITE_CODE';")
    INVITE_MAX=$(sqlite3 "$DB_PATH" "SELECT max_uses FROM invite_codes WHERE code='$INVITE_CODE';")
    echo "  Plan: $INVITE_PLAN"
    echo "  Uses: $INVITE_USES / $INVITE_MAX"
else
    echo "✗ No NHRA invite code found"
fi
echo ""

# Test 3: Verify existing users have plan
echo "Test 3: Existing Users"
echo "----------------------"
USER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users;")
FREE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users WHERE plan='free';")
NHRA_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users WHERE plan='nhra';")
echo "Total users: $USER_COUNT"
echo "Free plan: $FREE_COUNT"
echo "NHRA plan: $NHRA_COUNT"
echo ""

# Test 4: TypeScript compilation
echo "Test 4: TypeScript Compilation"
echo "-------------------------------"
if npm run type-check 2>&1 | grep -q "Found 0 errors"; then
    echo "✓ TypeScript compiles without errors"
else
    echo "⚠ TypeScript has errors (check npm run type-check)"
fi
echo ""

# Test 5: Build passes
echo "Test 5: Build Validation"
echo "------------------------"
if npm run build > /dev/null 2>&1; then
    echo "✓ Build succeeds"
else
    echo "✗ Build fails"
fi
echo ""

echo "========================================="
echo "Validation Complete"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Start dev server: npm run dev"
echo "2. Test Free registration: http://localhost:5173/register"
echo "3. Test NHRA registration: http://localhost:5173/register?invite=$INVITE_CODE"
echo "4. Verify access control in running app"
echo ""
echo "NHRA Invite Code for testing: $INVITE_CODE"
