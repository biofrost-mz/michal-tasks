-- Keep workspace metadata edits owner-only. Admins can manage members and
-- invites, but renaming/changing workspace metadata is reserved for owners.

drop policy if exists "workspaces_update" on public.workspaces;
create policy "workspaces_update" on public.workspaces
for update
to authenticated
using (
  id = any(public.user_owner_workspace_ids())
  or public.is_system_admin()
)
with check (
  id = any(public.user_owner_workspace_ids())
  or public.is_system_admin()
);
