-- Telegram Whitelist Table
-- This file contains the complete schema for telegram_whitelist table
-- Apply migrations in order: 001, 002, 004, 005

-- Table structure (after migration 004):
-- id UUID PRIMARY KEY
-- chat_id BIGINT UNIQUE NOT NULL
-- username TEXT NULL
-- full_name TEXT NULL
-- added_by UUID NULL (references auth.users)
-- note TEXT NULL
-- user_id UUID NULL (legacy, for backward compatibility)
-- telegram_id BIGINT NULL (legacy, migrated to chat_id)
-- is_active BOOLEAN DEFAULT true (legacy)
-- created_at TIMESTAMPTZ DEFAULT NOW()
-- updated_at TIMESTAMPTZ DEFAULT NOW()

-- Indexes:
-- idx_telegram_whitelist_chat_id (unique)
-- idx_telegram_whitelist_added_by
-- idx_telegram_whitelist_created_at

-- RLS: Enabled, no policies (service role only access via Netlify Functions)
