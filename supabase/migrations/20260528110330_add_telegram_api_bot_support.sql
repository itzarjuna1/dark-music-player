/*
  # Add Telegram API Bot Support

  1. New Tables
    - `telegram_api_users`
      - `id` (uuid, primary key)
      - `telegram_user_id` (bigint, unique) - Telegram user ID
      - `telegram_username` (text, nullable) - Telegram username
      - `first_name` (text) - User's first name
      - `api_key` (text, nullable) - Associated API key
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modified Tables
    - `api_keys`
      - Add `telegram_user_id` (bigint, nullable) - Telegram user who generated the key
      - Add `last_renewed_at` (timestamptz, nullable) - Last renewal timestamp
      - Add `auto_renew` (boolean) - Whether key auto-renews every 24hrs

  3. Security
    - Enable RLS on `telegram_api_users`
    - Service role can read/write (used by edge functions)

  4. Notes
    - telegram_api_users tracks who generated keys via the Telegram bot
    - Keys can be renewed every 24 hours via /renew command or button
    - auto_renew flag allows scheduled daily key reset
*/

-- Add columns to api_keys table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'telegram_user_id'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN telegram_user_id bigint DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'last_renewed_at'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN last_renewed_at timestamptz DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'auto_renew'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN auto_renew boolean DEFAULT false;
  END IF;
END $$;

-- Create telegram_api_users table
CREATE TABLE IF NOT EXISTS telegram_api_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint UNIQUE NOT NULL,
  telegram_username text DEFAULT NULL,
  first_name text DEFAULT '',
  api_key text DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE telegram_api_users ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (edge functions use service role)
CREATE POLICY "Service role full access on telegram_api_users"
  ON telegram_api_users FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role insert on telegram_api_users"
  ON telegram_api_users FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role update on telegram_api_users"
  ON telegram_api_users FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role delete on telegram_api_users"
  ON telegram_api_users FOR DELETE
  TO service_role
  USING (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_telegram_api_users_user_id ON telegram_api_users(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_telegram_user_id ON api_keys(telegram_user_id);
