-- Production-readiness guard: application tables are server-only by default.
-- `inquiries` remains excluded because its intentionally public form is protected
-- by dedicated RLS policies. The application server uses service_role.

DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> 'inquiries'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', target.schemaname, target.tablename);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', target.schemaname, target.tablename);
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM anon, authenticated', target.schemaname, target.tablename);
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

COMMENT ON SCHEMA public IS
  'Application tables are server-only unless a table has an explicit reviewed RLS policy and grant.';
