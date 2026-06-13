-- mms_system_settings: generic key-value store for system configuration
-- Run this once in Supabase SQL editor (idempotent)

CREATE TABLE IF NOT EXISTS mms_system_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Disable RLS so the API service-role key can read/write freely
ALTER TABLE mms_system_settings DISABLE ROW LEVEL SECURITY;
