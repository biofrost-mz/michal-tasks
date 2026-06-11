-- Notification preferences per user.
-- Defaults: everything on, daily digest at 8:00.

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_task_reminders    boolean NOT NULL DEFAULT true,
  email_daily_digest      boolean NOT NULL DEFAULT true,
  push_task_reminders     boolean NOT NULL DEFAULT true,
  push_daily_digest       boolean NOT NULL DEFAULT true,
  digest_hour             smallint NOT NULL DEFAULT 8 CHECK (digest_hour BETWEEN 0 AND 23),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_prefs_select_own" ON public.notification_preferences;
CREATE POLICY "notif_prefs_select_own" ON public.notification_preferences
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_prefs_upsert_own" ON public.notification_preferences;
CREATE POLICY "notif_prefs_upsert_own" ON public.notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
