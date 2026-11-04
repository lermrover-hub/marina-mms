-- Preserve pricing audit history as an append-only accounting record.
-- Pricing rows should be retired with status/is_active instead of hard deletion.

ALTER TABLE public.pricing_master_history
  DROP CONSTRAINT IF EXISTS pricing_master_history_master_fk;

ALTER TABLE public.pricing_master_history
  ADD CONSTRAINT pricing_master_history_master_fk
  FOREIGN KEY (pricing_master_id)
  REFERENCES public.pricing_master(id)
  ON DELETE RESTRICT;

REVOKE ALL ON TABLE public.pricing_master_history FROM service_role;
GRANT SELECT, INSERT ON TABLE public.pricing_master_history TO service_role;

COMMENT ON TABLE public.pricing_master_history IS
  'Append-only audit history for Pricing Master changes. Retire master rows instead of deleting them.';
