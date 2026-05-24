import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a number as Thai Baht */
export function formatTHB(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "฿0"
  const n = typeof amount === "string" ? parseFloat(amount) : amount
  if (isNaN(n)) return "฿0"
  return "฿" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

/** Format date as DD/MM/YYYY */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-"
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
}

/** Format date as "19 May 2026" */
export function formatDateLong(date: string | Date | null | undefined): string {
  if (!date) return "-"
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

/** Format relative time ("2 days ago") */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "-"
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

/** Check if a date is expiring soon (within N days) */
export function isExpiringSoon(date: string | Date | null | undefined, days = 30): boolean {
  if (!date) return false
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  return diffMs > 0 && diffMs < days * 24 * 60 * 60 * 1000
}

/** Check if a date is past (expired) */
export function isExpired(date: string | Date | null | undefined): boolean {
  if (!date) return false
  const d = typeof date === "string" ? new Date(date) : date
  return d.getTime() < new Date().getTime()
}

/** Truncate text to N chars */
export function truncate(text: string | null | undefined, n: number): string {
  if (!text) return ""
  return text.length > n ? text.slice(0, n) + "…" : text
}

/** Get initials from name */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/** Format feet with decimal */
export function formatFt(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "-"
  const n = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(n)) return "-"
  return `${n.toFixed(1)} ft`
}

/** Convert feet to meters */
export function ftToM(ft: number): number {
  return Math.round(ft * 0.3048 * 100) / 100
}

/** Status label maps */
export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  PROSPECT: "Prospect",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  BLOCKED: "Blocked",
}

export const BOAT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  IN_STORAGE: "In Storage",
  IN_WATER: "In Water",
  IN_REPAIR: "In Repair",
  MOVED_OUT: "Moved Out",
}

export const QUOTATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  CONVERTED: "Converted",
  CANCELLED: "Cancelled",
}

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
}

export const BOAT_TYPE_LABELS: Record<string, string> = {
  SPEED_BOAT: "Speed Boat",
  MOTOR_YACHT: "Motor Yacht",
  SAILING_YACHT: "Sailing Yacht",
  CATAMARAN: "Catamaran",
  POWER_CATAMARAN: "Power Catamaran",
  FISHING_BOAT: "Fishing Boat",
  JETSKI: "Jet Ski",
  DINGHY: "Dinghy",
  OTHER: "Other",
}

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  PRIVATE_OWNER: "Private Owner",
  CHARTER_OPERATOR: "Charter Operator",
  SPEEDBOAT_OPERATOR: "Speedboat Operator",
  YACHT_BROKER: "Yacht Broker",
  CONTRACTOR: "Contractor",
  SUPPLIER: "Supplier",
}
