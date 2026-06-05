-- Marina MMS staging constraints
-- Run this only in the staging Supabase project: zanlunbgupdtqznruzok
-- Safe to re-run. Does not delete or modify business rows.

DO $$
DECLARE
  table_name text;
  id_tables text[] := ARRAY[
    'mms_berth_assignments',
    'mms_berths',
    'mms_boat_movements',
    'mms_boats',
    'mms_contracts',
    'mms_customers',
    'mms_document_templates',
    'mms_incident_actions',
    'mms_incidents',
    'mms_inventory_items',
    'mms_invoice_items',
    'mms_invoices',
    'mms_material_usage',
    'mms_messages',
    'mms_notifications',
    'mms_payments',
    'mms_purchase_request_items',
    'mms_purchase_requests',
    'mms_quotation_items',
    'mms_quotations',
    'mms_ramp_bookings',
    'mms_service_requests',
    'mms_staff',
    'mms_utility_readings',
    'mms_work_order_tasks',
    'mms_work_orders',
    'pricing_master'
  ];
BEGIN
  FOREACH table_name IN ARRAY id_tables LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = format('public.%I', table_name)::regclass
        AND contype = 'p'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I PRIMARY KEY (id)',
        table_name,
        table_name || '_pkey'
      );
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS mms_berths_code_key
  ON public.mms_berths (code);

CREATE UNIQUE INDEX IF NOT EXISTS mms_contracts_contract_number_key
  ON public.mms_contracts (contract_number);

CREATE UNIQUE INDEX IF NOT EXISTS mms_inventory_items_item_code_key
  ON public.mms_inventory_items (item_code);

CREATE UNIQUE INDEX IF NOT EXISTS mms_invoices_invoice_number_key
  ON public.mms_invoices (invoice_number);

CREATE UNIQUE INDEX IF NOT EXISTS mms_purchase_requests_pr_number_key
  ON public.mms_purchase_requests (pr_number);

CREATE UNIQUE INDEX IF NOT EXISTS mms_quotations_quote_number_key
  ON public.mms_quotations (quote_number);

CREATE UNIQUE INDEX IF NOT EXISTS mms_ramp_bookings_reference_key
  ON public.mms_ramp_bookings (reference);

CREATE UNIQUE INDEX IF NOT EXISTS mms_service_requests_reference_key
  ON public.mms_service_requests (reference);

CREATE UNIQUE INDEX IF NOT EXISTS mms_work_orders_reference_key
  ON public.mms_work_orders (reference);

CREATE UNIQUE INDEX IF NOT EXISTS pricing_master_code_key
  ON public.pricing_master (code);

CREATE INDEX IF NOT EXISTS mms_service_requests_status_idx
  ON public.mms_service_requests (status);

CREATE INDEX IF NOT EXISTS mms_quotations_customer_id_idx
  ON public.mms_quotations (customer_id);

CREATE INDEX IF NOT EXISTS mms_invoices_due_status_idx
  ON public.mms_invoices (due_date, status);

CREATE INDEX IF NOT EXISTS mms_contracts_end_status_idx
  ON public.mms_contracts (end_date, status);

CREATE INDEX IF NOT EXISTS mms_messages_inbox_idx
  ON public.mms_messages (direction, replied, created_at DESC);

CREATE INDEX IF NOT EXISTS mms_notifications_read_created_at_idx
  ON public.mms_notifications (read, created_at DESC);
