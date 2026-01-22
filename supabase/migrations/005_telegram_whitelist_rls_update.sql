-- Update RLS policies for telegram_whitelist
-- Drop old policies
DROP POLICY IF EXISTS "Admins can manage telegram whitelist" ON telegram_whitelist;
DROP POLICY IF EXISTS "Users can view their own telegram entry" ON telegram_whitelist;

-- New policies: only service role can access (via Netlify Functions)
-- Frontend accesses through API endpoints which use service role
-- No direct access from frontend needed

-- Deny all by default (RLS is already enabled)
-- Service role bypasses RLS, so functions can access
-- No additional policies needed - service role has full access
