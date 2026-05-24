import React from "react"
import { Badge } from "@/components/ui/badge"
import type { BadgeProps } from "@/components/ui/badge"

type Variant = BadgeProps["variant"]

// ── Customer Status ───────────────────────────────────────────────────────────
const CUSTOMER_STATUS: Record<string, { label: string; variant: Variant }> = {
  PROSPECT: { label: "Prospect", variant: "info"    },
  ACTIVE:   { label: "Active",   variant: "success"  },
  INACTIVE: { label: "Inactive", variant: "default"  },
  BLOCKED:  { label: "Blocked",  variant: "danger"   },
}

// ── Boat Status ───────────────────────────────────────────────────────────────
const BOAT_STATUS: Record<string, { label: string; variant: Variant }> = {
  ACTIVE:     { label: "Active",     variant: "success"  },
  INACTIVE:   { label: "Inactive",   variant: "default"  },
  IN_STORAGE: { label: "In Storage", variant: "info"     },
  IN_WATER:   { label: "In Water",   variant: "teal"     },
  IN_REPAIR:  { label: "In Repair",  variant: "warning"  },
  MOVED_OUT:  { label: "Moved Out",  variant: "default"  },
}

// ── Berth Status ──────────────────────────────────────────────────────────────
const BERTH_STATUS: Record<string, { label: string; variant: Variant }> = {
  AVAILABLE:   { label: "Available",   variant: "success"  },
  RESERVED:    { label: "Reserved",    variant: "info"     },
  OCCUPIED:    { label: "Occupied",    variant: "primary"  },
  MAINTENANCE: { label: "Maintenance", variant: "warning"  },
  BLOCKED:     { label: "Blocked",     variant: "danger"   },
}

// ── Quotation Status ──────────────────────────────────────────────────────────
const QUOTATION_STATUS: Record<string, { label: string; variant: Variant }> = {
  DRAFT:            { label: "Draft",            variant: "default"  },
  PENDING_APPROVAL: { label: "Pending Approval", variant: "warning"  },
  SENT:             { label: "Sent",             variant: "info"     },
  ACCEPTED:         { label: "Accepted",         variant: "success"  },
  REJECTED:         { label: "Rejected",         variant: "danger"   },
  EXPIRED:          { label: "Expired",          variant: "default"  },
  CONVERTED:        { label: "Converted",        variant: "teal"     },
  CANCELLED:        { label: "Cancelled",        variant: "default"  },
}

// ── Invoice Status ────────────────────────────────────────────────────────────
const INVOICE_STATUS: Record<string, { label: string; variant: Variant }> = {
  DRAFT:          { label: "Draft",          variant: "default"  },
  ISSUED:         { label: "Issued",         variant: "info"     },
  PARTIALLY_PAID: { label: "Partially Paid", variant: "warning"  },
  PAID:           { label: "Paid",           variant: "success"  },
  OVERDUE:        { label: "Overdue",        variant: "danger"   },
  CANCELLED:      { label: "Cancelled",      variant: "default"  },
  REFUNDED:       { label: "Refunded",       variant: "default"  },
}

// ── Payment Status ────────────────────────────────────────────────────────────
const PAYMENT_STATUS: Record<string, { label: string; variant: Variant }> = {
  PENDING:   { label: "Pending",   variant: "warning" },
  CONFIRMED: { label: "Confirmed", variant: "success" },
  REJECTED:  { label: "Rejected",  variant: "danger"  },
  REFUNDED:  { label: "Refunded",  variant: "default" },
}

// ── Work Order Status ─────────────────────────────────────────────────────────
const WORKORDER_STATUS: Record<string, { label: string; variant: Variant }> = {
  NEW_REQUEST:               { label: "New Request",          variant: "default"  },
  INSPECTION_REQUIRED:       { label: "Inspection Required",  variant: "warning"  },
  WAITING_QUOTATION:         { label: "Waiting Quote",        variant: "warning"  },
  WAITING_CUSTOMER_APPROVAL: { label: "Awaiting Approval",    variant: "info"     },
  WAITING_DEPOSIT:           { label: "Waiting Deposit",      variant: "warning"  },
  APPROVED:                  { label: "Approved",             variant: "success"  },
  IN_PROGRESS:               { label: "In Progress",          variant: "teal"     },
  WAITING_PARTS:             { label: "Waiting Parts",        variant: "warning"  },
  WAITING_CONTRACTOR:        { label: "Waiting Contractor",   variant: "warning"  },
  ON_HOLD:                   { label: "On Hold",              variant: "default"  },
  COMPLETED:                 { label: "Completed",            variant: "success"  },
  WAITING_INVOICE:           { label: "Waiting Invoice",      variant: "info"     },
  CLOSED:                    { label: "Closed",               variant: "default"  },
  CANCELLED:                 { label: "Cancelled",            variant: "default"  },
}

// ── Service Request Status ────────────────────────────────────────────────────
const SERVICE_REQUEST_STATUS: Record<string, { label: string; variant: Variant }> = {
  NEW_REQUEST:          { label: "New",               variant: "default"  },
  INSPECTION_REQUIRED:  { label: "Inspection Req.",   variant: "warning"  },
  QUOTATION_DRAFT:      { label: "Quote Draft",       variant: "default"  },
  QUOTATION_SENT:       { label: "Quote Sent",        variant: "info"     },
  WAITING_APPROVAL:     { label: "Awaiting Approval", variant: "info"     },
  IN_PROGRESS:          { label: "In Progress",       variant: "teal"     },
  COMPLETED:            { label: "Completed",         variant: "success"  },
  CANCELLED:            { label: "Cancelled",         variant: "default"  },
}

// ── Ramp Booking Status ───────────────────────────────────────────────────────
const RAMP_STATUS: Record<string, { label: string; variant: Variant }> = {
  REQUESTED:          { label: "Requested",    variant: "default" },
  TIDE_CHECK:         { label: "Tide Check",   variant: "warning" },
  CONFIRMED:          { label: "Confirmed",    variant: "success" },
  IN_PROGRESS:        { label: "In Progress",  variant: "teal"    },
  COMPLETED:          { label: "Completed",    variant: "success" },
  CANCELLED:          { label: "Cancelled",    variant: "default" },
}

type StatusType = "customer" | "boat" | "berth" | "quotation" | "invoice" | "payment" | "workorder" | "servicerequest" | "ramp"

const STATUS_MAP: Record<StatusType, Record<string, { label: string; variant: Variant }>> = {
  customer:       CUSTOMER_STATUS,
  boat:           BOAT_STATUS,
  berth:          BERTH_STATUS,
  quotation:      QUOTATION_STATUS,
  invoice:        INVOICE_STATUS,
  payment:        PAYMENT_STATUS,
  workorder:      WORKORDER_STATUS,
  servicerequest: SERVICE_REQUEST_STATUS,
  ramp:           RAMP_STATUS,
}

interface StatusBadgeProps {
  type:   StatusType
  status: string
  className?: string
}

export function StatusBadge({ type, status, className }: StatusBadgeProps) {
  const map     = STATUS_MAP[type]
  const config  = map?.[status]
  const label   = config?.label  ?? status
  const variant = config?.variant ?? "default"
  return <Badge variant={variant} className={className}>{label}</Badge>
}
