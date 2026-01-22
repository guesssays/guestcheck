-- Update telegram_whitelist table structure
-- Add new columns and change primary key

-- Add new columns
ALTER TABLE telegram_whitelist
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS chat_id BIGINT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS note TEXT;

-- Migrate data: set chat_id = telegram_id for existing records
UPDATE telegram_whitelist
SET chat_id = telegram_id
WHERE chat_id IS NULL;

-- Make chat_id NOT NULL after migration
ALTER TABLE telegram_whitelist
  ALTER COLUMN chat_id SET NOT NULL;

-- Create unique index on chat_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_whitelist_chat_id ON telegram_whitelist(chat_id);

-- Make user_id nullable (it's already nullable in schema, but ensure it)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'telegram_whitelist' 
    AND column_name = 'user_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE telegram_whitelist ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- Drop old primary key constraint if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'telegram_whitelist_pkey'
  ) THEN
    ALTER TABLE telegram_whitelist DROP CONSTRAINT telegram_whitelist_pkey;
  END IF;
END $$;

-- Set id as primary key
ALTER TABLE telegram_whitelist
  ADD PRIMARY KEY (id);

-- Create index on added_by
CREATE INDEX IF NOT EXISTS idx_telegram_whitelist_added_by ON telegram_whitelist(added_by);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_telegram_whitelist_created_at ON telegram_whitelist(created_at DESC);
