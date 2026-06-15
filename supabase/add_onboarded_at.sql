-- Přidá sloupec pro sledování prvního dokončení onboardingu (per účet, ne per prohlížeč)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
