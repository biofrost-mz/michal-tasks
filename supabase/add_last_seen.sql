-- Activity tracking: last time user was active in the app.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
