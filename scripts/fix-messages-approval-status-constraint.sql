-- Fix: add CANCELLED to mms_messages.approval_status check constraint
-- Bug 2 found during Phase 5D controlled staging write test (2026-06-11)
-- Workaround used: REJECTED for archival. This patch makes CANCELLED explicit.
--
-- Safe to run on staging and production. No data rows are modified.
-- Constraint is dropped and recreated with CANCELLED added.

ALTER TABLE mms_messages
  DROP CONSTRAINT IF EXISTS mms_messages_approval_status_check;

ALTER TABLE mms_messages
  ADD CONSTRAINT mms_messages_approval_status_check
  CHECK (approval_status = ANY (ARRAY[
    'DRAFT'::text,
    'PENDING_APPROVAL'::text,
    'APPROVED'::text,
    'REJECTED'::text,
    'SENT'::text,
    'CANCELLED'::text
  ]));
