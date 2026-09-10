-- Supabase-native operational/accounting tables for contractors, procurement,
-- inventory movement, timesheets, audit records, and material costing.
-- All access is server-side through service_role; no browser Data API grants.

CREATE TABLE IF NOT EXISTS public.mms_contractors (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  company_name TEXT,
  specialty TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_id TEXT,
  rate_type TEXT NOT NULL DEFAULT 'daily'
    CHECK (rate_type IN ('daily','hourly','fixed','per_job')),
  daily_rate NUMERIC(12,2) CHECK (daily_rate IS NULL OR daily_rate >= 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mms_suppliers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_id TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mms_purchase_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  po_number TEXT NOT NULL UNIQUE,
  supplier_id TEXT REFERENCES public.mms_suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','approved','received','cancelled')),
  order_date DATE,
  expected_date DATE,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  vat_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mms_purchase_order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  po_id TEXT NOT NULL REFERENCES public.mms_purchase_orders(id) ON DELETE CASCADE,
  item_code TEXT,
  description TEXT NOT NULL,
  qty NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (qty >= 0),
  unit TEXT,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mms_stock_movements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  item_id TEXT NOT NULL REFERENCES public.mms_inventory_items(id) ON DELETE RESTRICT,
  item_code TEXT,
  item_name TEXT,
  movement_type TEXT NOT NULL
    CHECK (movement_type IN ('stock_in','stock_out','adjustment','issue')),
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity >= 0),
  unit_cost NUMERIC(14,2) CHECK (unit_cost IS NULL OR unit_cost >= 0),
  reference_type TEXT,
  reference_id TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mms_timesheets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  work_order_id TEXT NOT NULL REFERENCES public.mms_work_orders(id) ON DELETE RESTRICT,
  staff_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  hours_worked NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (hours_worked >= 0),
  hourly_rate NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (hourly_rate >= 0),
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  notes TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mms_audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
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

-- Existing Marina schemas already contain this table. The definition remains
-- idempotent for environments where the operations module is installed first.
CREATE TABLE IF NOT EXISTS public.mms_material_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'pcs',
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  supplier TEXT,
  charge_to_customer BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- Bring forward columns used by the Supabase routes when upgrading an older
-- operations schema. These statements do not rewrite existing business rows.
ALTER TABLE public.mms_purchase_order_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.mms_audit_log ADD COLUMN IF NOT EXISTS changes JSONB;
ALTER TABLE public.mms_purchase_orders ADD COLUMN IF NOT EXISTS created_by TEXT;

CREATE OR REPLACE FUNCTION public.mms_sync_purchase_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  target_po TEXT;
BEGIN
  target_po := CASE WHEN TG_OP = 'DELETE' THEN OLD.po_id ELSE NEW.po_id END;
  UPDATE public.mms_purchase_orders po
  SET subtotal = totals.subtotal,
      vat_amount = round(totals.subtotal * 0.07, 2),
      total_amount = totals.subtotal + round(totals.subtotal * 0.07, 2),
      updated_at = now()
  FROM (
    SELECT COALESCE(sum(line_total), 0)::numeric(14,2) AS subtotal
    FROM public.mms_purchase_order_items
    WHERE po_id = target_po
  ) totals
  WHERE po.id = target_po;

  IF TG_OP = 'UPDATE' AND OLD.po_id IS DISTINCT FROM NEW.po_id THEN
    UPDATE public.mms_purchase_orders po
    SET subtotal = totals.subtotal,
        vat_amount = round(totals.subtotal * 0.07, 2),
        total_amount = totals.subtotal + round(totals.subtotal * 0.07, 2),
        updated_at = now()
    FROM (
      SELECT COALESCE(sum(line_total), 0)::numeric(14,2) AS subtotal
      FROM public.mms_purchase_order_items
      WHERE po_id = OLD.po_id
    ) totals
    WHERE po.id = OLD.po_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_mms_sync_purchase_order_totals ON public.mms_purchase_order_items;
CREATE TRIGGER trg_mms_sync_purchase_order_totals
AFTER INSERT OR UPDATE OR DELETE ON public.mms_purchase_order_items
FOR EACH ROW EXECUTE FUNCTION public.mms_sync_purchase_order_totals();

CREATE OR REPLACE FUNCTION public.mms_sync_timesheet_labor_cost()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  target_work_order TEXT;
BEGIN
  target_work_order := CASE WHEN TG_OP = 'DELETE' THEN OLD.work_order_id ELSE NEW.work_order_id END;
  UPDATE public.mms_work_orders
  SET total_labor_cost = (
        SELECT COALESCE(sum(total_cost), 0)
        FROM public.mms_timesheets
        WHERE work_order_id = target_work_order
      ),
      updated_at = now()
  WHERE id = target_work_order;

  IF TG_OP = 'UPDATE' AND OLD.work_order_id IS DISTINCT FROM NEW.work_order_id THEN
    UPDATE public.mms_work_orders
    SET total_labor_cost = (
          SELECT COALESCE(sum(total_cost), 0)
          FROM public.mms_timesheets
          WHERE work_order_id = OLD.work_order_id
        ),
        updated_at = now()
    WHERE id = OLD.work_order_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_mms_sync_timesheet_labor_cost ON public.mms_timesheets;
CREATE TRIGGER trg_mms_sync_timesheet_labor_cost
AFTER INSERT OR UPDATE OR DELETE ON public.mms_timesheets
FOR EACH ROW EXECUTE FUNCTION public.mms_sync_timesheet_labor_cost();

CREATE OR REPLACE FUNCTION public.mms_sync_material_cost()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  target_work_order TEXT;
BEGIN
  target_work_order := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.work_order_id::text
    ELSE NEW.work_order_id::text
  END;
  UPDATE public.mms_work_orders
  SET total_material_cost = (
        SELECT COALESCE(sum(total_cost), 0)
        FROM public.mms_material_usage
        WHERE work_order_id::text = target_work_order
      ),
      updated_at = now()
  WHERE id = target_work_order;

  IF TG_OP = 'UPDATE' AND OLD.work_order_id IS DISTINCT FROM NEW.work_order_id THEN
    UPDATE public.mms_work_orders
    SET total_material_cost = (
          SELECT COALESCE(sum(total_cost), 0)
          FROM public.mms_material_usage
          WHERE work_order_id::text = OLD.work_order_id::text
        ),
        updated_at = now()
    WHERE id = OLD.work_order_id::text;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_mms_sync_material_cost ON public.mms_material_usage;
CREATE TRIGGER trg_mms_sync_material_cost
AFTER INSERT OR UPDATE OR DELETE ON public.mms_material_usage
FOR EACH ROW EXECUTE FUNCTION public.mms_sync_material_cost();

CREATE OR REPLACE FUNCTION public.mms_create_purchase_order(
  p_po_number TEXT DEFAULT NULL,
  p_supplier_id TEXT DEFAULT NULL,
  p_supplier_name TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'draft',
  p_order_date DATE DEFAULT NULL,
  p_expected_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by TEXT DEFAULT NULL
)
RETURNS public.mms_purchase_orders
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  generated_number TEXT;
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
  purchase_order public.mms_purchase_orders;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('mms_purchase_orders_number'));
  generated_number := NULLIF(btrim(p_po_number), '');
  IF generated_number IS NULL THEN
    SELECT format('PO-%s-%s', current_year, lpad((count(*) + 1)::text, 4, '0'))
      INTO generated_number
    FROM public.mms_purchase_orders
    WHERE created_at >= make_date(current_year, 1, 1)
      AND created_at < make_date(current_year + 1, 1, 1);
  END IF;

  INSERT INTO public.mms_purchase_orders (
    po_number, supplier_id, supplier_name, status, order_date,
    expected_date, notes, created_by
  ) VALUES (
    generated_number, p_supplier_id, p_supplier_name, COALESCE(p_status, 'draft'),
    p_order_date, p_expected_date, p_notes, p_created_by
  ) RETURNING * INTO purchase_order;
  RETURN purchase_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.mms_record_stock_movement(
  p_item_id TEXT,
  p_movement_type TEXT,
  p_quantity NUMERIC,
  p_unit_cost NUMERIC DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by TEXT DEFAULT NULL
)
RETURNS public.mms_stock_movements
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  inventory RECORD;
  next_on_hand NUMERIC;
  movement public.mms_stock_movements;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 0 OR p_movement_type NOT IN ('stock_in','stock_out','adjustment','issue') THEN
    RAISE EXCEPTION 'Invalid stock movement' USING ERRCODE = '22023';
  END IF;

  SELECT id, item_code, name, on_hand
  INTO inventory
  FROM public.mms_inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF inventory.id IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_movement_type = 'stock_in' THEN
    next_on_hand := inventory.on_hand + p_quantity;
  ELSIF p_movement_type IN ('stock_out','issue') THEN
    IF inventory.on_hand < p_quantity THEN
      RAISE EXCEPTION 'Insufficient stock' USING ERRCODE = '22003';
    END IF;
    next_on_hand := inventory.on_hand - p_quantity;
  ELSE
    next_on_hand := p_quantity;
  END IF;

  INSERT INTO public.mms_stock_movements (
    item_id, item_code, item_name, movement_type, quantity, unit_cost,
    reference_type, reference_id, notes, created_by
  ) VALUES (
    inventory.id, inventory.item_code, inventory.name, p_movement_type,
    p_quantity, p_unit_cost, p_reference_type, p_reference_id, p_notes, p_created_by
  ) RETURNING * INTO movement;

  UPDATE public.mms_inventory_items
  SET on_hand = next_on_hand,
      updated_at = now()
  WHERE id = inventory.id;

  RETURN movement;
END;
$$;

ALTER TABLE public.mms_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_contractors FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mms_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_suppliers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mms_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_purchase_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mms_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_purchase_order_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mms_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_stock_movements FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mms_timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_timesheets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mms_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mms_material_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_material_usage FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.mms_contractors, public.mms_suppliers,
  public.mms_purchase_orders, public.mms_purchase_order_items,
  public.mms_stock_movements, public.mms_timesheets,
  public.mms_audit_log, public.mms_material_usage FROM anon, authenticated;

GRANT ALL ON TABLE public.mms_contractors, public.mms_suppliers,
  public.mms_purchase_orders, public.mms_purchase_order_items,
  public.mms_stock_movements, public.mms_timesheets,
  public.mms_audit_log, public.mms_material_usage TO service_role;

REVOKE ALL ON FUNCTION public.mms_record_stock_movement(TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mms_record_stock_movement(TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT)
  TO service_role;
REVOKE ALL ON FUNCTION public.mms_create_purchase_order(TEXT, TEXT, TEXT, TEXT, DATE, DATE, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mms_create_purchase_order(TEXT, TEXT, TEXT, TEXT, DATE, DATE, TEXT, TEXT)
  TO service_role;
REVOKE ALL ON FUNCTION public.mms_sync_purchase_order_totals(),
  public.mms_sync_timesheet_labor_cost(), public.mms_sync_material_cost()
  FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
