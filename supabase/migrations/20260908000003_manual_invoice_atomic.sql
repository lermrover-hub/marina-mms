BEGIN;

CREATE OR REPLACE FUNCTION public.mms_create_manual_invoice(
  p_invoice_number text,
  p_customer_id text DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_boat_id text DEFAULT NULL,
  p_boat_name text DEFAULT NULL,
  p_work_order_id text DEFAULT NULL,
  p_ramp_booking_id text DEFAULT NULL,
  p_invoice_date date DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_status text DEFAULT 'DRAFT',
  p_subtotal numeric DEFAULT 0,
  p_discount numeric DEFAULT 0,
  p_vat_amount numeric DEFAULT 0,
  p_total_amount numeric DEFAULT 0,
  p_paid_amount numeric DEFAULT 0,
  p_outstanding_balance numeric DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS public.mms_invoices
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  created_invoice public.mms_invoices%ROWTYPE;
  generated_balance boolean;
  generated_line_total boolean;
  item jsonb;
  item_qty numeric;
  item_unit_price numeric;
  item_discount_pct numeric;
  item_line_total numeric;
  item_sort int;
BEGIN
  SELECT is_generated = 'ALWAYS' INTO generated_balance
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'mms_invoices' AND column_name = 'outstanding_balance';

  SELECT is_generated = 'ALWAYS' INTO generated_line_total
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'mms_invoice_items' AND column_name = 'line_total';

  IF coalesce(generated_balance, false) THEN
    INSERT INTO public.mms_invoices (
      invoice_number, customer_id, customer_name, boat_id, boat_name,
      work_order_id, ramp_booking_id, invoice_date, due_date, status,
      subtotal, discount, vat_amount, total_amount, paid_amount,
      notes, created_at, updated_at
    ) VALUES (
      p_invoice_number, p_customer_id, p_customer_name, p_boat_id, p_boat_name,
      p_work_order_id, p_ramp_booking_id,
      coalesce(p_invoice_date, current_date), p_due_date,
      CASE WHEN upper(p_status) = 'ISSUED' THEN 'ISSUED' ELSE 'DRAFT' END,
      p_subtotal, p_discount, p_vat_amount, p_total_amount,
      greatest(coalesce(p_paid_amount, 0), 0), p_notes, now(), now()
    ) RETURNING * INTO created_invoice;
  ELSE
    INSERT INTO public.mms_invoices (
      invoice_number, customer_id, customer_name, boat_id, boat_name,
      work_order_id, ramp_booking_id, invoice_date, due_date, status,
      subtotal, discount, vat_amount, total_amount, paid_amount,
      outstanding_balance, notes, created_at, updated_at
    ) VALUES (
      p_invoice_number, p_customer_id, p_customer_name, p_boat_id, p_boat_name,
      p_work_order_id, p_ramp_booking_id,
      coalesce(p_invoice_date, current_date), p_due_date,
      CASE WHEN upper(p_status) = 'ISSUED' THEN 'ISSUED' ELSE 'DRAFT' END,
      p_subtotal, p_discount, p_vat_amount, p_total_amount,
      greatest(coalesce(p_paid_amount, 0), 0),
      greatest(coalesce(p_outstanding_balance, 0), 0), p_notes, now(), now()
    ) RETURNING * INTO created_invoice;
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  LOOP
    item_qty := coalesce((item->>'qty')::numeric, 1);
    item_unit_price := coalesce((item->>'unit_price')::numeric, 0);
    item_discount_pct := coalesce((item->>'discount_pct')::numeric, 0);
    item_line_total := item_qty * item_unit_price * (1 - item_discount_pct / 100);
    item_sort := coalesce((item->>'sort_order')::int, 1);

    IF coalesce(generated_line_total, false) THEN
      INSERT INTO public.mms_invoice_items (
        invoice_id, description, category, qty, unit, unit_price,
        discount_pct, taxable, sort_order
      ) VALUES (
        created_invoice.id, coalesce(item->>'description', ''), coalesce(item->>'category', 'SERVICE'),
        item_qty, coalesce(item->>'unit', 'job'), item_unit_price, item_discount_pct,
        coalesce((item->>'taxable')::boolean, false), item_sort
      );
    ELSE
      INSERT INTO public.mms_invoice_items (
        invoice_id, description, category, qty, unit, unit_price,
        discount_pct, taxable, line_total, sort_order
      ) VALUES (
        created_invoice.id, coalesce(item->>'description', ''), coalesce(item->>'category', 'SERVICE'),
        item_qty, coalesce(item->>'unit', 'job'), item_unit_price, item_discount_pct,
        coalesce((item->>'taxable')::boolean, false), item_line_total, item_sort
      );
    END IF;
  END LOOP;

  RETURN created_invoice;
END;
$$;

REVOKE ALL ON FUNCTION public.mms_create_manual_invoice(text,text,text,text,text,text,text,date,date,text,numeric,numeric,numeric,numeric,numeric,numeric,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mms_create_manual_invoice(text,text,text,text,text,text,text,date,date,text,numeric,numeric,numeric,numeric,numeric,numeric,text,jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
