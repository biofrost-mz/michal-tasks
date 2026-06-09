# Auth and onboarding checklist

## Supabase Auth settings

- Enable e-mail confirmation for new accounts.
- Set Site URL to the production app URL.
- Add only trusted Redirect URLs:
  - production origin
  - local development origin
  - preview origins you actually use
- Keep OTP and recovery link expiry short enough for safety, but usable.
- Configure rate limits for OTP, signups, password recovery, and failed logins.
- Use a verified custom SMTP sender/domain before production traffic.

## Required environment variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SYSTEM_ADMIN_EMAILS`

`VITE_SYSTEM_ADMIN_EMAILS` is a comma-separated frontend allowlist for showing admin UI. It is not a replacement for server-side authorization.

## E-mail templates

Customize these Supabase Auth templates in Czech and keep the call-to-action clear:

- Confirm signup
- Magic link
- Reset password
- Change e-mail, if enabled later

Starter templates are in `supabase/auth_email_templates.md`.

Each template should include:

- Zentero branding
- what action was requested
- how long the link is valid
- a note to ignore the e-mail if the user did not request it

## Workspace invites

- Deploy `supabase/accept_workspace_invite.sql`.
- Prefer the `accept_workspace_invite(invite_token)` RPC from the app.
- Keep invite links one-time and expiring.
- Let only workspace owners create admin invites.
- Consider hashing invite tokens in the database before production.

## Remaining security audit

- Deploy and verify `supabase/rls_policies.sql`, which now includes `user_profiles`, `quick_todos`, `project_chats`, and `push_subscriptions`.
- Add RLS policies for any future tables before they are used from the client.
- Move global admin authorization to a server-side role/claim before exposing sensitive admin operations.
- Confirm the `attachments` bucket is private.
