CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.app_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'fatal')),
  type text NOT NULL DEFAULT 'client_error',
  message text NOT NULL,
  filename text,
  lineno integer,
  colno integer,
  stack text,
  url text,
  user_agent text,
  app_version text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS app_error_logs_user_created_idx
  ON public.app_error_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS app_error_logs_created_idx
  ON public.app_error_logs (created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.app_error_logs TO authenticated;

ALTER TABLE public.app_error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_error_logs_select_self_or_admin" ON public.app_error_logs;
CREATE POLICY "app_error_logs_select_self_or_admin" ON public.app_error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_system_admin());

DROP POLICY IF EXISTS "app_error_logs_insert_self" ON public.app_error_logs;
CREATE POLICY "app_error_logs_insert_self" ON public.app_error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "app_error_logs_delete_self_or_admin" ON public.app_error_logs;
CREATE POLICY "app_error_logs_delete_self_or_admin" ON public.app_error_logs
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_system_admin());
