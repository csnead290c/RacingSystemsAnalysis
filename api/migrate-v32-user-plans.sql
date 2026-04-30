-- Migration v32: User Plans & NHRA Invite Codes
-- Adds explicit plan column to users table and creates invite code system

-- Add plan column to users table
ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free';

-- Backfill plan for existing users
UPDATE users 
SET plan = 'free' 
WHERE role = 'user' 
AND (products = '[]' OR products IS NULL OR products = '');

-- Create invite_codes table
CREATE TABLE IF NOT EXISTS invite_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL,
    max_uses INTEGER DEFAULT 1,
    uses_count INTEGER DEFAULT 0,
    expires_at TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    revoked_at TEXT,
    notes TEXT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_invite_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_plan ON invite_codes(plan);
CREATE INDEX IF NOT EXISTS idx_invite_expires ON invite_codes(expires_at);

-- Create invite_code_uses table (audit trail)
CREATE TABLE IF NOT EXISTS invite_code_uses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invite_code_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    used_at TEXT DEFAULT (datetime('now')),
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (invite_code_id) REFERENCES invite_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invite_use_code ON invite_code_uses(invite_code_id);
CREATE INDEX IF NOT EXISTS idx_invite_use_user ON invite_code_uses(user_id);
