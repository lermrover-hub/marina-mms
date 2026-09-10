-- Tide records table — Ko Samui hourly tide data
-- Safe to re-run: uses IF NOT EXISTS / DO NOTHING
-- Source: Ko Samui tide table 2026 PDF (8,760 rows seeded via seed-tide-records.js)

CREATE TABLE IF NOT EXISTS public.mms_tide_records (
  id      SERIAL      PRIMARY KEY,
  date    DATE        NOT NULL,
  hour    SMALLINT    NOT NULL CHECK (hour BETWEEN 0 AND 23),
  tide_m  NUMERIC(4,2) NOT NULL,
  source  TEXT        NOT NULL DEFAULT 'Ko Samui tide table 2026 PDF',
  CONSTRAINT mms_tide_records_date_hour_unique UNIQUE (date, hour)
);

CREATE INDEX IF NOT EXISTS mms_tide_records_date_idx ON public.mms_tide_records (date);

-- Verify
SELECT COUNT(*) AS row_count FROM public.mms_tide_records;
