-- Read-only verification for the Marina MMS V1 field-workflow migrations.
-- Run only after confirming the selected Supabase project is staging
-- project ref: zanlunbgupdtqznruzok.

DO $$
DECLARE
  missing_columns text[];
BEGIN
  SELECT array_agg(required.column_name ORDER BY required.column_name)
  INTO missing_columns
  FROM (VALUES
    ('request_type'),
    ('ramp_operation_plan'),
    ('confirmed_haul_out_date'),
    ('confirmed_launch_date'),
    ('service_type'),
    ('storage_period'),
    ('operator_type'),
    ('insurance_status'),
    ('payment_mode'),
    ('payment_gate_status'),
    ('service_order_confirmed_at'),
    ('quotation_id')
  ) AS required(column_name)
  LEFT JOIN information_schema.columns actual
    ON actual.table_schema = 'public'
   AND actual.table_name = 'mms_service_requests'
   AND actual.column_name = required.column_name
  WHERE actual.column_name IS NULL;

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'Missing mms_service_requests columns: %', missing_columns;
  END IF;

  IF to_regclass('public.mms_service_request_items') IS NULL THEN
    RAISE EXCEPTION 'Missing table public.mms_service_request_items';
  END IF;
  IF to_regclass('public.mms_service_payment_plans') IS NULL THEN
    RAISE EXCEPTION 'Missing table public.mms_service_payment_plans';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('internal_approval_status'),
      ('internal_approved_by'),
      ('internal_approval_role'),
      ('internal_approved_at'),
      ('customer_sent_at'),
      ('required_approver_role')
    ) AS required(column_name)
    LEFT JOIN information_schema.columns actual
      ON actual.table_schema = 'public'
     AND actual.table_name = 'mms_quotations'
     AND actual.column_name = required.column_name
    WHERE actual.column_name IS NULL
  ) THEN
    RAISE EXCEPTION 'Missing quotation approval columns';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mms_notifications'
      AND column_name = 'target_role'
  ) THEN
    RAISE EXCEPTION 'Missing mms_notifications.target_role';
  END IF;
END $$;

SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  has_table_privilege('anon', format('public.%I', c.relname), 'SELECT') AS anon_can_select,
  has_table_privilege('authenticated', format('public.%I', c.relname), 'SELECT') AS authenticated_can_select,
  has_table_privilege('service_role', format('public.%I', c.relname), 'SELECT,INSERT,UPDATE,DELETE') AS service_role_crud
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('mms_service_request_items', 'mms_service_payment_plans')
ORDER BY c.relname;

SELECT
  conrelid::regclass::text AS table_name,
  conname,
  contype,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN (
  'public.mms_service_requests'::regclass,
  'public.mms_service_request_items'::regclass,
  'public.mms_service_payment_plans'::regclass,
  'public.mms_quotations'::regclass
)
  AND (
    conname LIKE '%workflow%'
    OR conname LIKE '%payment%'
    OR conname LIKE '%operator%'
    OR conname LIKE '%discount%'
    OR conname LIKE '%insurance%'
    OR conname LIKE '%approval%'
    OR conname LIKE '%service_request%'
    OR conname LIKE '%quotation%'
    OR conname LIKE '%invoice%'
  )
ORDER BY table_name, conname;

SELECT
  'service_workflow_schema_ready' AS verification,
  now() AS checked_at;
