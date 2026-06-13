-- Operational tables required by the modules introduced in 611bc28/5096e75.
-- Idempotent so it can be validated and reapplied safely.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.mms_contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  specialty TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_id TEXT,
  rate_type TEXT NOT NULL DEFAULT 'daily',
  daily_rate NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mms_contractors_rate_type_check CHECK (rate_type IN ('daily','hourly','fixed')),
  CONSTRAINT mms_contractors_status_check CHECK (status IN ('active','inactive'))
);

CREATE TABLE IF NOT EXISTS public.mms_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_id TEXT,
  payment_terms TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mms_suppliers_status_check CHECK (status IN ('active','inactive'))
);

CREATE TABLE IF NOT EXISTS public.mms_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES public.mms_suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  order_date DATE,
  expected_date DATE,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mms_purchase_orders_status_check CHECK (status IN ('draft','sent','approved','received','cancelled'))
);

CREATE TABLE IF NOT EXISTS public.mms_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.mms_purchase_orders(id) ON DELETE CASCADE,
  item_code TEXT,
  description TEXT NOT NULL,
  qty NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit TEXT,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mms_purchase_order_items_qty_check CHECK (qty >= 0),
  CONSTRAINT mms_purchase_order_items_price_check CHECK (unit_price >= 0)
);

CREATE TABLE IF NOT EXISTS public.mms_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  item_code TEXT,
  item_name TEXT,
  movement_type TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  unit_cost NUMERIC(14,2),
  reference_type TEXT,
  reference_id TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mms_stock_movements_type_check CHECK (movement_type IN ('stock_in','stock_out','adjustment','issue')),
  CONSTRAINT mms_stock_movements_quantity_check CHECK (quantity >= 0)
);

CREATE TABLE IF NOT EXISTS public.mms_timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL,
  staff_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  hours_worked NUMERIC(8,2) NOT NULL DEFAULT 0,
  hourly_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mms_timesheets_hours_check CHECK (hours_worked >= 0),
  CONSTRAINT mms_timesheets_rate_check CHECK (hourly_rate >= 0)
);

CREATE TABLE IF NOT EXISTS public.mms_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  entity_ref TEXT,
  user_name TEXT,
  user_role TEXT,
  notes TEXT,
  changes JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mms_material_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  supplier TEXT,
  charge_to_customer BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mms_material_usage_quantity_check CHECK (quantity >= 0),
  CONSTRAINT mms_material_usage_cost_check CHECK (unit_cost >= 0)
);

-- Earlier deployments created part of this module with a slightly different
-- shape. Keep the migration additive and normalize those existing columns
-- before the API starts using them.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mms_suppliers'
      AND column_name = 'payment_terms'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE public.mms_suppliers ALTER COLUMN payment_terms DROP DEFAULT;
    ALTER TABLE public.mms_suppliers
      ALTER COLUMN payment_terms TYPE TEXT
      USING CASE
        WHEN payment_terms IS NULL THEN NULL
        WHEN payment_terms = 0 THEN 'Immediate'
        ELSE 'Net ' || payment_terms::text
      END;
  END IF;
END $$;

ALTER TABLE public.mms_suppliers
  ALTER COLUMN payment_terms SET DEFAULT 'Net 30';

ALTER TABLE public.mms_material_usage
  ALTER COLUMN work_order_id TYPE TEXT USING work_order_id::text;

ALTER TABLE public.mms_purchase_order_items
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.mms_audit_log
  ADD COLUMN IF NOT EXISTS changes JSONB;

CREATE INDEX IF NOT EXISTS mms_contractors_status_idx ON public.mms_contractors(status);
CREATE INDEX IF NOT EXISTS mms_contractors_specialty_idx ON public.mms_contractors(specialty);
CREATE INDEX IF NOT EXISTS mms_suppliers_status_idx ON public.mms_suppliers(status);
CREATE INDEX IF NOT EXISTS mms_purchase_orders_status_idx ON public.mms_purchase_orders(status);
CREATE INDEX IF NOT EXISTS mms_purchase_orders_supplier_idx ON public.mms_purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS mms_purchase_order_items_po_idx ON public.mms_purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS mms_stock_movements_item_idx ON public.mms_stock_movements(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mms_stock_movements_type_idx ON public.mms_stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS mms_timesheets_work_order_idx ON public.mms_timesheets(work_order_id, date DESC);
CREATE INDEX IF NOT EXISTS mms_timesheets_staff_idx ON public.mms_timesheets(staff_name);
CREATE INDEX IF NOT EXISTS mms_audit_log_entity_idx ON public.mms_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS mms_audit_log_created_idx ON public.mms_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS mms_material_usage_work_order_idx ON public.mms_material_usage(work_order_id, created_at);

-- These tables are accessed only through server-side routes using the service role.
ALTER TABLE public.mms_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_material_usage ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.mms_contractors, public.mms_suppliers,
  public.mms_purchase_orders, public.mms_purchase_order_items,
  public.mms_stock_movements, public.mms_timesheets,
  public.mms_audit_log, public.mms_material_usage FROM anon, authenticated;

GRANT ALL ON public.mms_contractors, public.mms_suppliers,
  public.mms_purchase_orders, public.mms_purchase_order_items,
  public.mms_stock_movements, public.mms_timesheets,
  public.mms_audit_log, public.mms_material_usage TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
