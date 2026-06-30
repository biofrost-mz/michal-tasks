CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, function_name, window_start)
);

CREATE INDEX IF NOT EXISTS ai_rate_limits_user_function_window_idx
  ON public.ai_rate_limits (user_id, function_name, window_start DESC);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_rate_limits FROM anon;
REVOKE ALL ON public.ai_rate_limits FROM authenticated;
GRANT ALL ON public.ai_rate_limits TO service_role;
