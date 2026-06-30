-- This migration existed in the linked production project before the local
-- migration folder was reconciled. Keep it idempotent so fresh databases can
-- replay the full remote history safely.
DO $$
BEGIN
  IF to_regclass('public.app_error_logs') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS app_error_logs_user_created_idx
      ON public.app_error_logs (user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS app_error_logs_created_idx
      ON public.app_error_logs (created_at DESC);
  END IF;
END $$;
