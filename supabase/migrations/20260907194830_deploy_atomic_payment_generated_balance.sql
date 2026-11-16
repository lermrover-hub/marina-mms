CREATE UNIQUE INDEX IF NOT EXISTS mms_payments_invoice_reference_key
ON public.mms_payments (invoice_id, reference_no)
WHERE reference_no IS NOT NULL AND btrim(reference_no) <> '';

CREATE OR REPLACE FUNCTION public.mms_record_confirmed_payment(
  p_invoice_id text, p_amount numeric, p_payment_method text DEFAULT 'BANK_TRANSFER',
  p_payment_date date DEFAULT CURRENT_DATE, p_reference_no text DEFAULT NULL,
  p_slip_url text DEFAULT NULL, p_notes text DEFAULT NULL
)
RETURNS public.mms_payments
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public
AS $function$
DECLARE
  target_invoice public.mms_invoices%ROWTYPE;
  existing_payment public.mms_payments%ROWTYPE;
  created_payment public.mms_payments%ROWTYPE;
  next_paid numeric;
  next_outstanding numeric;
  generated_balance boolean;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount::text IN ('NaN','Infinity','-Infinity') THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero and finite' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO target_invoice FROM public.mms_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found' USING ERRCODE = 'P0002'; END IF;
  IF target_invoice.status IN ('CANCELLED','REFUNDED') THEN
    RAISE EXCEPTION 'Cancelled or refunded invoice cannot receive payment' USING ERRCODE = '23514';
  END IF;
  IF NULLIF(btrim(p_reference_no), '') IS NOT NULL THEN
    SELECT * INTO existing_payment FROM public.mms_payments
    WHERE invoice_id = p_invoice_id AND reference_no = btrim(p_reference_no) LIMIT 1;
    IF FOUND THEN
      IF existing_payment.amount IS DISTINCT FROM p_amount OR existing_payment.payment_method IS DISTINCT FROM coalesce(NULLIF(btrim(p_payment_method), ''), 'BANK_TRANSFER') THEN
        RAISE EXCEPTION 'Payment reference already exists with different details' USING ERRCODE = '22023';
      END IF;
      RETURN existing_payment;
    END IF;
  END IF;
  next_outstanding := greatest(coalesce(target_invoice.total_amount,0) - coalesce(target_invoice.paid_amount,0),0);
  IF p_amount > next_outstanding THEN RAISE EXCEPTION 'Payment exceeds outstanding balance' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.mms_payments (
    invoice_id, customer_id, customer_name, payment_method, amount, payment_date, reference_no, slip_url, status, notes
  ) VALUES (
    target_invoice.id, target_invoice.customer_id, target_invoice.customer_name,
    coalesce(NULLIF(btrim(p_payment_method), ''), 'BANK_TRANSFER'), p_amount,
    coalesce(p_payment_date,CURRENT_DATE), NULLIF(btrim(p_reference_no), ''), p_slip_url, 'CONFIRMED', p_notes
  ) RETURNING * INTO created_payment;
  next_paid := coalesce(target_invoice.paid_amount,0) + p_amount;
  next_outstanding := greatest(coalesce(target_invoice.total_amount,0) - next_paid,0);
  SELECT is_generated = 'ALWAYS' INTO generated_balance FROM information_schema.columns
  WHERE table_schema='public' AND table_name='mms_invoices' AND column_name='outstanding_balance';
  IF coalesce(generated_balance,false) THEN
    UPDATE public.mms_invoices SET paid_amount=next_paid,
      status=CASE WHEN next_outstanding=0 THEN 'PAID' ELSE 'PARTIALLY_PAID' END, updated_at=now()
    WHERE id=target_invoice.id;
  ELSE
    UPDATE public.mms_invoices SET paid_amount=next_paid, outstanding_balance=next_outstanding,
      status=CASE WHEN next_outstanding=0 THEN 'PAID' ELSE 'PARTIALLY_PAID' END, updated_at=now()
    WHERE id=target_invoice.id;
  END IF;
  RETURN created_payment;
END;
$function$;
REVOKE ALL ON FUNCTION public.mms_record_confirmed_payment(text,numeric,text,date,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mms_record_confirmed_payment(text,numeric,text,date,text,text,text) TO service_role;
