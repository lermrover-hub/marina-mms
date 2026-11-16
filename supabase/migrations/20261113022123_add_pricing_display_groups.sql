-- UI-only classification. Existing operational category/service_group/subgroup
-- continue driving quotation and billing behavior; no rate values are touched.
ALTER TABLE public.pricing_master
  ADD COLUMN IF NOT EXISTS display_category text,
  ADD COLUMN IF NOT EXISTS display_vessel_group text,
  ADD COLUMN IF NOT EXISTS display_vessel_subtype text;

COMMENT ON COLUMN public.pricing_master.display_category IS 'Rate Management display category only; not a pricing or workflow input';
COMMENT ON COLUMN public.pricing_master.display_vessel_group IS 'Rate Management vessel grouping only';
COMMENT ON COLUMN public.pricing_master.display_vessel_subtype IS 'Rate Management vessel subtype only';
