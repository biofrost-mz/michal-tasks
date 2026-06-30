DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'attachments',
    'notes',
    'notification_preferences',
    'project_chats',
    'projects',
    'push_subscriptions',
    'quick_todos',
    'tags',
    'task_tags',
    'tasks',
    'user_profiles',
    'workspace_invites',
    'workspace_members',
    'workspaces'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', table_name);
    END IF;
  END LOOP;

  IF to_regclass('public.app_admins') IS NOT NULL THEN
    GRANT SELECT ON public.app_admins TO authenticated;
  END IF;
END $$;
