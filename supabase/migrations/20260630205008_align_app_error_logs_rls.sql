REVOKE UPDATE ON public.app_error_logs FROM authenticated;

DROP POLICY IF EXISTS "Users can read own app error logs" ON public.app_error_logs;
DROP POLICY IF EXISTS "Users can insert own app error logs" ON public.app_error_logs;
DROP POLICY IF EXISTS "Users can delete own app error logs" ON public.app_error_logs;
DROP POLICY IF EXISTS "app_error_logs_select_self_or_admin" ON public.app_error_logs;
DROP POLICY IF EXISTS "app_error_logs_insert_self" ON public.app_error_logs;
DROP POLICY IF EXISTS "app_error_logs_delete_self_or_admin" ON public.app_error_logs;

CREATE POLICY "app_error_logs_select_self_or_admin" ON public.app_error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_system_admin());

CREATE POLICY "app_error_logs_insert_self" ON public.app_error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "app_error_logs_delete_self_or_admin" ON public.app_error_logs
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_system_admin());
