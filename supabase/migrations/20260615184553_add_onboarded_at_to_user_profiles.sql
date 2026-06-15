-- Track the first completed onboarding per user account.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
