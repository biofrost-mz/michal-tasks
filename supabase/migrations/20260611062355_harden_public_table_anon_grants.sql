-- The application stores user/workspace data behind authenticated sessions.
-- Anonymous users should not receive direct table privileges in public.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
