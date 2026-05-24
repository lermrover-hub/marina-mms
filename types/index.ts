// ─── Shared TypeScript types for the Marina MMS ───────────────────────────────

export type UserRole =
  | "SUPER_ADMIN"
  | "MANAGING_DIRECTOR"
  | "MARINA_MANAGER"
  | "BOAT_YARD_MANAGER"
  | "FINANCE"
  | "SALES"
  | "OPERATION_SUPERVISOR"
  | "TECHNICIAN"
  | "SECURITY"
  | "CONTRACTOR"
  | "CUSTOMER"
  | "STAFF"

export type CustomerType =
  | "PRIVATE_OWNER"
  | "CHARTER_OPERATOR"
  | "SPEEDBOAT_OPERATOR"
  | "YACHT_BROKER"
  | "CONTRACTOR"
  | "SUPPLIER"

export type CustomerStatus = "PROSPECT" | "ACTIVE" | "INACTIVE" | "BLOCKED"

export type BoatType =
  | "SPEED_BOAT"
  | "MOTOR_YACHT"
  | "SAILING_YACHT"
  | "CATAMARAN"
  | "POWER_CATAMARAN"
  | "FISHING_BOAT"
  | "JETSKI"
  | "DINGHY"
  | "OTHER"

export type BoatStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "IN_STORAGE"
  | "IN_WATER"
  | "IN_REPAIR"
  | "MOVED_OUT"

export type BerthStatus = "AVAILABLE" | "RESERVED" | "OCCUPIED" | "MAINTENANCE" | "BLOCKED"

export type LocationType =
  | "WET_BERTH"
  | "DRY_STORAGE"
  | "REPAIR_YARD"
  | "WORKSHOP_BAY"
  | "RAMP_AREA"
  | "WAITING_AREA"
  | "FUEL_AREA"
  | "TEMPORARY_HOLDING"

export type QuotationStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED"
  | "CANCELLED"

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  | "REFUNDED"

export type PaymentStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "REFUNDED"

export type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "CREDIT_CARD"
  | "QR_PAYMENT"
  | "CHEQUE"
  | "OTHER"

// ─── Customer ─────────────────────────────────────────────────────────────────

export interface Customer {
  id: string
  customerType: CustomerType
  firstName: string | null
  lastName: string | null
  companyName: string | null
  nationality: string | null
  phone: string | null
  email: string | null
  address: string | null
  taxId: string | null
  passportId: string | null
  preferredLanguage: string | null
  billingContact: string | null
  emergencyContact: string | null
  paymentTerms: number | null
  creditLimit: number | null
  notes: string | null
  internalNotes: string | null
  riskFlag: boolean
  status: CustomerStatus
  boatCount?: number
  outstandingBalance?: number
  createdAt: string
  updatedAt: string
}

/** Display name — company or "First Last" */
export function customerDisplayName(c: Pick<Customer, "firstName" | "lastName" | "companyName">): string {
  if (c.companyName) return c.companyName
  const parts = [c.firstName, c.lastName].filter(Boolean)
  return parts.join(" ") || "Unknown"
}

// ─── Boat ─────────────────────────────────────────────────────────────────────

export interface Boat {
  id: string
  ownerId: string | null
  ownerName?: string
  name: string
  boatType: BoatType
  usageType: string | null
  brand: string | null
  model: string | null
  yearBuilt: number | null
  registrationNumber: string | null
  hin: string | null
  flag: string | null
  loaFt: number | null
  beamFt: number | null
  draftFt: number | null
  weightT: number | null
  hullMaterial: string | null
  engineType: string | null
  engineBrand: string | null
  numEngines: number | null
  fuelType: string | null
  trailerRequired: boolean
  insuranceExpiry: string | null
  specialHandling: string | null
  status: BoatStatus
  currentLocationCode: string | null
  photoMain: string | null
  notes: string | null
  createdAt: string
  updatedAt?: string
}

// ─── Berth ────────────────────────────────────────────────────────────────────

export interface Berth {
  id: string
  berthCode: string
  berthType: string | null
  zone: string | null
  maxLoaFt: number | null
  status: BerthStatus
  locationName?: string
}

// ─── Quotation ────────────────────────────────────────────────────────────────

export interface Quotation {
  id: string
  quoteNumber: string
  customerId: string
  customerName?: string
  boatId: string | null
  boatName?: string
  status: QuotationStatus
  subtotal: number
  discountAmount: number
  vatRate: number
  vatAmount: number
  totalAmount: number
  depositRequired: number | null
  validUntil: string | null
  notes: string | null
  createdAt: string
  updatedAt?: string
  itemCount?: number
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string
  invoiceNumber: string
  customerId: string
  customerName?: string
  boatId: string | null
  boatName?: string
  quotationId: string | null
  status: InvoiceStatus
  subtotal: number
  discountAmount: number
  vatRate: number
  vatAmount: number
  totalAmount: number
  paidAmount: number
  outstandingBalance: number
  dueDate: string | null
  notes: string | null
  createdAt: string
  updatedAt?: string
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalRevenueThisMonth: number
  revenueChangePercent: number
  activeCustomers: number
  customersChangePercent: number
  boatsInYard: number
  boatsInYardChange: number
  openQuotations: number
  openQuotationsValue: number
  wetBerthOccupancy: number
  dryStorageOccupancy: number
  outstandingInvoices: number
  overdueInvoices: number
  overdueCount: number
  jobsThisMonth: number
  jobsCompleted: number
}

// ─── API response wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  meta?: {
    total: number
    page: number
    perPage: number
    totalPages: number
  }
  error?: string
}
