CREATE OR REPLACE FUNCTION public.mms_convert_accepted_quotation_to_invoice(
  p_quotation_id text,
  p_invoice_number text,
  p_due_date date DEFAULT NULL,
  p_status text DEFAULT 'DRAFT',
  p_paid_amount numeric DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS public.mms_invoices
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  source_quote public.mms_quotations%ROWTYPE;
  existing_invoice public.mms_invoices%ROWTYPE;
  created_invoice public.mms_invoices%ROWTYPE;
  generated_balance boolean;
  generated_line_total boolean;
BEGIN
  SELECT * INTO source_quote FROM public.mms_quotations WHERE id = p_quotation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quotation not found'; END IF;

  SELECT * INTO existing_invoice FROM public.mms_invoices WHERE quotation_id = p_quotation_id LIMIT 1;
  IF FOUND THEN RETURN existing_invoice; END IF;
  IF source_quote.status <> 'ACCEPTED' THEN RAISE EXCEPTION 'Only an ACCEPTED quotation can be converted'; END IF;

  SELECT is_generated = 'ALWAYS' INTO generated_balance
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'mms_invoices' AND column_name = 'outstanding_balance';

  IF coalesce(generated_balance, false) THEN
    INSERT INTO public.mms_invoices (
      invoice_number, customer_id, customer_name, boat_id, boat_name, quotation_id,
      work_order_id, invoice_date, due_date, status, subtotal, discount, vat_amount,
      total_amount, paid_amount, notes, created_at, updated_at
    ) VALUES (
      p_invoice_number, source_quote.customer_id, source_quote.customer_name,
      source_quote.boat_id, source_quote.boat_name, source_quote.id, source_quote.work_order_id,
      current_date, p_due_date, CASE WHEN upper(p_status) = 'ISSUED' THEN 'ISSUED' ELSE 'DRAFT' END,
      source_quote.subtotal, source_quote.discount, source_quote.vat_amount,
      source_quote.total_amount, greatest(coalesce(p_paid_amount, 0), 0),
      coalesce(p_notes, source_quote.notes), now(), now()
    ) RETURNING * INTO created_invoice;
  ELSE
    INSERT INTO public.mms_invoices (
      invoice_number, customer_id, customer_name, boat_id, boat_name, quotation_id,
      work_order_id, invoice_date, due_date, status, subtotal, discount, vat_amount,
      total_amount, paid_amount, outstanding_balance, notes, created_at, updated_at
    ) VALUES (
      p_invoice_number, source_quote.customer_id, source_quote.customer_name,
      source_quote.boat_id, source_quote.boat_name, source_quote.id, source_quote.work_order_id,
      current_date, p_due_date, CASE WHEN upper(p_status) = 'ISSUED' THEN 'ISSUED' ELSE 'DRAFT' END,
      source_quote.subtotal, source_quote.discount, source_quote.vat_amount,
      source_quote.total_amount, greatest(coalesce(p_paid_amount, 0), 0),
      greatest(source_quote.total_amount - greatest(coalesce(p_paid_amount, 0), 0), 0),
      coalesce(p_notes, source_quote.notes), now(), now()
    ) RETURNING * INTO created_invoice;
  END IF;

  SELECT is_generated = 'ALWAYS' INTO generated_line_total
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'mms_invoice_items' AND column_name = 'line_total';

  IF coalesce(generated_line_total, false) THEN
    INSERT INTO public.mms_invoice_items (
      invoice_id, description, category, qty, unit, unit_price,
      discount_pct, taxable, sort_order
    )
    SELECT created_invoice.id, description, 'SERVICE', qty, unit, unit_price,
           discount_pct, taxable, sort_order
    FROM public.mms_quotation_items
    WHERE quotation_id = source_quote.id;
  ELSE
    INSERT INTO public.mms_invoice_items (
      invoice_id, description, category, qty, unit, unit_price,
      discount_pct, taxable, line_total, sort_order
    )
    SELECT created_invoice.id, description, 'SERVICE', qty, unit, unit_price,
           discount_pct, taxable, line_total, sort_order
    FROM public.mms_quotation_items
    WHERE quotation_id = source_quote.id;
  END IF;

  UPDATE public.mms_quotations SET status = 'CONVERTED', updated_at = now()
  WHERE id = source_quote.id AND status = 'ACCEPTED';

  RETURN created_invoice;
END;
$$;

REVOKE ALL ON FUNCTION public.mms_convert_accepted_quotation_to_invoice(text,text,date,text,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mms_convert_accepted_quotation_to_invoice(text,text,date,text,numeric,text) TO service_role;
