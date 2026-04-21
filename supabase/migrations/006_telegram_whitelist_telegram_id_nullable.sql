-- Legacy column telegram_id was BIGINT PRIMARY KEY NOT NULL in 001_initial_schema.
-- Migration 004 introduced chat_id as the canonical identifier but did not drop NOT NULL
-- from telegram_id. New rows only set chat_id, leaving telegram_id NULL -> insert failures.
-- Align DB with intended model: telegram_id mirrors chat_id when present, otherwise nullable.

UPDATE telegram_whitelist
SET telegram_id = chat_id
WHERE telegram_id IS NULL AND chat_id IS NOT NULL;

ALTER TABLE telegram_whitelist
  ALTER COLUMN telegram_id DROP NOT NULL;
