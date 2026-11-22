"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Save, Loader } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import type { getPricingMasterById } from "@/lib/pricing-master"
import { V38_SOURCE_VERSION } from "@/lib/pricing-v38"
import {
  PRICING_CALC_TYPES, PRICING_DURATION_CODES, PRICING_QUOTE_RULES, PRICING_RATE_BASES,
  PRICING_STATUSES, PRICING_VESSEL_CATEGORIES,
} from "@/lib/pricing-validation"
import { RATE_SERVICE_GROUPS, rateVesselLabel } from "@/lib/rate-catalog-order"

type PricingHistoryEntry = {
  id: string
  action: string
  changed_by: string | null
  approved_by: string | null
  source_version: string | null
  created_at: string
}

const CATEGORIES = ["Ramp Access", "Haul-out", "Paint Service", "Yard Services", "Storage", "Storage & Yard Service", "Haul / Launch Package", "Other"]
const UNITS = ["trip", "sqm", "package", "pkg", "hr", "day", "week", "month", "ft", "set", "pc", "unit"]
const EMPTY_FORM = {
  code: "",
  serviceNameEn: "",
  serviceNameTh: "",
  category: "",
  unit: "",
  rateThb: "",
  fullRateThb: "",
  discountPct: "0",
  sourceDiscountPct: "0",
  directCostThb: "",
  revenueGlCode: "",
  costGlCode: "",
  pnlCategory: "",
  costPnlCategory: "",
  costBasis: "",
  calcType: "FLAT_QTY",
  serviceGroup: "",
  subgroup: "",
  providerType: "",
  vesselCategory: "",
  vesselTier: "",
  loaMinFt: "",
  loaMaxFt: "",
  durationCode: "",
  durationDays: "",
  rateBasis: "",
  capThb: "",
  displayOrder: "",
  quoteAllowed: "YES",
  priceStatus: "ACTIVE",
  sourceVersion: "",
  effectiveDate: "",
  description: "",
  notes: "",
}

type PricingForm = typeof EMPTY_FORM
type PricingRecord = NonNullable<Awaited<ReturnType<typeof getPricingMasterById>>>

const OPTIONAL_NUMBERS = new Set<string>(["directCostThb", "loaMinFt", "loaMaxFt", "durationDays", "capThb"])
const NUMBERS = new Set<string>(["rateThb", "fullRateThb", "discountPct", "sourceDiscountPct", "displayOrder"])
const fieldClass = "w-full min-w-0 rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20"

function optionsIncludingCurrent(options: readonly string[], current: string) {
  return current && !options.includes(current) ? [...options, current] : options
}

async function readPricingResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null)
  if (!res.ok || json?.data == null) {
    throw new Error(json?.error || `Request failed (HTTP ${res.status}).`)
  }
  return json.data
}

export default function PricingMasterEditPage() {
  const { id } = useParams<{ id: string }>()
  return <PricingRateForm key={id} id={id} />
}

function PricingRateForm({ id }: { id: string }) {
  const router = useRouter()
  const isNew = id === "new"

  const [loading, setLoading] = useState(!isNew)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [error, setError] = useState("")
  const [historyError, setHistoryError] = useState("")
  const [history, setHistory] = useState<PricingHistoryEntry[]>([])
  const [initialForm, setInitialForm] = useState<PricingForm | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [formData, setFormData] = useState<PricingForm>(EMPTY_FORM)

  useEffect(() => {
    if (isNew) return
    const controller = new AbortController()
    const { signal } = controller

    const fetchPricing = async () => {
      try {
        const res = await fetch(`/api/pricing-master/${id}`, { signal, cache: "no-store" })
        const pricing = await readPricingResponse<PricingRecord>(res)
        if (signal.aborted) return
        const fields = Object.keys(EMPTY_FORM) as (keyof PricingForm)[]
        const initial = { ...EMPTY_FORM }
        for (const key of fields) initial[key] = String(pricing[key] ?? EMPTY_FORM[key])
        setFormData(initial)
        setInitialForm(initial)
        setIsActive(pricing.isActive)
      } catch (err) {
        if (!signal.aborted) setLoadError(err instanceof Error ? err.message : "Could not load the rate.")
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }

    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/pricing-master/${id}/history`, { signal, cache: "no-store" })
        const entries = await readPricingResponse<PricingHistoryEntry[]>(res)
        if (!signal.aborted) setHistory(entries)
      } catch (err) {
        if (!signal.aborted) setHistoryError(err instanceof Error ? err.message : "Could not load history.")
      }
    }

    void fetchPricing()
    void fetchHistory()
    return () => controller.abort()
  }, [id, isNew])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || (!isNew && !initialForm)) return
    setError("")

    if ([formData.code, formData.serviceNameEn, formData.category, formData.unit, formData.rateThb].some(value => !value.trim())) {
      setError("Complete the required fields.")
      return
    }
    if (formData.loaMinFt && formData.loaMaxFt && Number(formData.loaMinFt) > Number(formData.loaMaxFt)) {
      setError("Minimum length must not exceed maximum length.")
      return
    }

    const payload: Record<string, string | number | boolean | null> = {}
    for (const [key, raw] of Object.entries(formData)) {
      const value = raw.trim()
      if (!isNew && (key === "code" || value === initialForm?.[key as keyof PricingForm].trim())) continue
      if (OPTIONAL_NUMBERS.has(key)) payload[key] = value === "" ? null : Number(value)
      else if (NUMBERS.has(key)) payload[key] = key === "fullRateThb" && !value ? Number(formData.rateThb) : Number(value)
      else payload[key] = value || null
    }
    if (!isNew && !Object.keys(payload).length) {
      router.push("/pricing-master")
      return
    }
    // Only the explicit Reactivate action should restore availability.
    if (!isNew && !isActive && "priceStatus" in payload) payload.isActive = false
    setSubmitting(true)

    try {
      const method = isNew ? "POST" : "PATCH"
      const url = isNew ? "/api/pricing-master" : `/api/pricing-master/${id}`

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      await readPricingResponse<PricingRecord>(res)
      router.push("/pricing-master")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save the rate.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-ocean-turquoise" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/pricing-master" aria-label="Back to Rate Management" title="Back to Rate Management" className="rounded-md p-1.5 hover:bg-[#f2eee4] transition-colors">
          <ArrowLeft className="h-5 w-5 text-[#1f2933]" />
        </Link>
        <PageHeader
          title={isNew ? "Add rate" : "Edit rate"}
          description={isNew || loadError ? undefined : formData.code}
        />
      </div>

      {loadError && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Could not load rate: {loadError}
        </p>
      )}
      {!isNew && !loadError && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className={isActive ? "font-medium text-green-800" : "font-medium text-[#647076]"}>{isActive ? "Active" : "Inactive"}</span>
          <span className={initialForm?.sourceVersion === V38_SOURCE_VERSION ? "rounded bg-sky-100 px-2 py-0.5 font-semibold text-sky-800" : "text-[#647076]"}>
            {initialForm?.sourceVersion || "Unversioned"}
          </span>
        </div>
      )}

      {(isNew || initialForm) && (
      <form onSubmit={handleSubmit} className="space-y-6 border-t border-[#e5dfd2] pt-4">
        <fieldset disabled={submitting} className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-6">
          {/* Code */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-[#1f2933] mb-2">Code *</label>
            <input
              type="text"
              id="code"
              name="code"
              required
              value={formData.code}
              onChange={handleChange}
              placeholder="e.g. P01, P06, HAUL_SB_M"
              disabled={!isNew}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] placeholder:text-[#8b969a] disabled:bg-[#f9f8f5] focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-[#1f2933] mb-2">Category *</label>
            <input
              id="category"
              name="category"
              list="rate-categories"
              required
              value={formData.category}
              onChange={handleChange}
              className={fieldClass}
            />
            <datalist id="rate-categories">{CATEGORIES.map(category => <option key={category} value={category} />)}</datalist>
          </div>

          {/* Service Name EN */}
          <div className="sm:col-span-2">
            <label htmlFor="serviceNameEn" className="block text-sm font-medium text-[#1f2933] mb-2">Service Name (English) *</label>
            <input
              type="text"
              id="serviceNameEn"
              name="serviceNameEn"
              required
              value={formData.serviceNameEn}
              onChange={handleChange}
              placeholder="e.g. Compound & Polish – Speedboat"
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] placeholder:text-[#8b969a] focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20"
            />
          </div>

          {/* Service Name TH */}
          <div className="sm:col-span-2">
            <label htmlFor="serviceNameTh" className="block text-sm font-medium text-[#1f2933] mb-2">บริการ (ไทย)</label>
            <input
              type="text"
              id="serviceNameTh"
              name="serviceNameTh"
              value={formData.serviceNameTh}
              onChange={handleChange}
              placeholder="เช่น ขัดและเงาเรือเร็ว"
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] placeholder:text-[#8b969a] focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20"
            />
          </div>

          {/* Unit */}
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-[#1f2933] mb-2">Unit *</label>
            <input
              id="unit"
              name="unit"
              list="rate-units"
              required
              value={formData.unit}
              onChange={handleChange}
              className={fieldClass}
            />
            <datalist id="rate-units">{UNITS.map(unit => <option key={unit} value={unit} />)}</datalist>
          </div>

          {/* Rate THB */}
          <div>
            <label htmlFor="rateThb" className="block text-sm font-medium text-[#1f2933] mb-2">Current Rate (THB) *</label>
            <input
              type="number"
              id="rateThb"
              name="rateThb"
              required
              min="0"
              value={formData.rateThb}
              onChange={handleChange}
              step="any"
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] placeholder:text-[#8b969a] focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20"
            />
          </div>

          <div>
            <label htmlFor="fullRateThb" className="block text-sm font-medium text-[#1f2933] mb-2">Full / Normal Rate (THB)</label>
            <input type="number" min="0" step="any" id="fullRateThb" name="fullRateThb" value={formData.fullRateThb} onChange={handleChange}
              placeholder="Defaults to current rate"
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Default Discount (%)</label>
            <input type="number" min="0" max="100" step="any" name="discountPct" value={formData.discountPct} onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
            <p className="mt-1 text-xs text-[#8b969a]">Default is 0%. Quotation approval rules still apply.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Source Discount Reference (%)</label>
            <input type="number" min="0" max="100" step="any" name="sourceDiscountPct" value={formData.sourceDiscountPct} onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
            <p className="mt-1 text-xs text-[#8b969a]">Informational only; it is not applied automatically.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Direct Cost (THB)</label>
            <input type="number" min="0" step="any" name="directCostThb" value={formData.directCostThb} onChange={handleChange}
              placeholder="Unknown"
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Revenue GL Code</label>
            <input type="text" name="revenueGlCode" value={formData.revenueGlCode} onChange={handleChange} placeholder="e.g. 4100"
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Cost GL Code</label>
            <input type="text" name="costGlCode" value={formData.costGlCode} onChange={handleChange} placeholder="e.g. 5100"
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Revenue P&amp;L Category</label>
            <input type="text" name="pnlCategory" value={formData.pnlCategory} onChange={handleChange} placeholder="e.g. A.Access & Ramp"
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Cost P&amp;L Category</label>
            <input type="text" name="costPnlCategory" value={formData.costPnlCategory} onChange={handleChange} placeholder="e.g. Direct Service Cost (COGS)"
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Calculation Type</label>
            <select name="calcType" value={formData.calcType} onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20">
              {optionsIncludingCurrent(PRICING_CALC_TYPES, initialForm?.calcType ?? "").map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Quote Rule</label>
            <select name="quoteAllowed" value={formData.quoteAllowed} onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20">
              {optionsIncludingCurrent(PRICING_QUOTE_RULES, initialForm?.quoteAllowed ?? "").map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Price Status</label>
            <select name="priceStatus" value={formData.priceStatus} onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20">
              {optionsIncludingCurrent(PRICING_STATUSES, initialForm?.priceStatus ?? "").map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Effective Date</label>
            <input type="date" name="effectiveDate" value={formData.effectiveDate} onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
          </div>

          <div>
            <label htmlFor="sourceVersion" className="block text-sm font-medium text-[#1f2933] mb-2">Source Version</label>
            <input type="text" id="sourceVersion" name="sourceVersion" value={formData.sourceVersion} onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
          </div>

          <div>
            <label htmlFor="serviceGroup" className="block text-sm font-medium text-[#1f2933] mb-2">Service Group</label>
            <input type="text" id="serviceGroup" name="serviceGroup" list="rate-service-groups" value={formData.serviceGroup} onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
            <datalist id="rate-service-groups">
              {RATE_SERVICE_GROUPS.map(group => <option key={group.key} value={group.key}>{group.label}</option>)}
            </datalist>
          </div>

          <div>
            <label htmlFor="subgroup" className="block text-sm font-medium text-[#1f2933] mb-2">Subgroup</label>
            <input type="text" id="subgroup" name="subgroup" value={formData.subgroup} onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Vessel Category
            <select className={fieldClass} name="vesselCategory" value={formData.vesselCategory} onChange={handleChange}>
              <option value="">Not specified</option>
              {optionsIncludingCurrent(PRICING_VESSEL_CATEGORIES, initialForm?.vesselCategory ?? "").map(value => (
                <option key={value} value={value}>{rateVesselLabel(value)}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Vessel Tier
            <input className={fieldClass} name="vesselTier" value={formData.vesselTier} onChange={handleChange} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Minimum Length (ft)
            <input className={fieldClass} type="number" min="0" max="500" step="any" name="loaMinFt" value={formData.loaMinFt} onChange={handleChange} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Maximum Length (ft)
            <input className={fieldClass} type="number" min="0" max="500" step="any" name="loaMaxFt" value={formData.loaMaxFt} onChange={handleChange} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Duration
            <select className={fieldClass} name="durationCode" value={formData.durationCode} onChange={handleChange}>
              <option value="">Not specified</option>
              {optionsIncludingCurrent(PRICING_DURATION_CODES, initialForm?.durationCode ?? "").map(value => (
                <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Duration (Days)
            <input className={fieldClass} type="number" min="1" max="366" name="durationDays" value={formData.durationDays} onChange={handleChange} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Rate Basis
            <select className={fieldClass} name="rateBasis" value={formData.rateBasis} onChange={handleChange}>
              <option value="">Not specified</option>
              {optionsIncludingCurrent(PRICING_RATE_BASES, initialForm?.rateBasis ?? "").map(value => (
                <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Cap (THB)
            <input className={fieldClass} type="number" min="0" step="any" name="capThb" value={formData.capThb} onChange={handleChange} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Display Order
            <input className={fieldClass} type="number" min="0" max="100000" name="displayOrder" value={formData.displayOrder} onChange={handleChange} />
          </label>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Provider Type</label>
            <input type="text" name="providerType" value={formData.providerType} onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Cost Basis</label>
            <textarea name="costBasis" value={formData.costBasis} onChange={handleChange} rows={2}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Detailed description of the service"
              rows={2}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] placeholder:text-[#8b969a] focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20"
            />
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Internal notes or scope information"
              rows={2}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] placeholder:text-[#8b969a] focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20"
            />
          </div>
        </fieldset>

        {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 rounded-md bg-ocean-turquoise px-4 py-2 text-sm font-medium text-white hover:bg-[#0d8b81] disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isNew ? "Create rate" : "Save changes"}
              </>
            )}
          </button>
          <Link
            href="/pricing-master"
            className="rounded-md border border-[#e5dfd2] bg-white px-4 py-2 text-sm font-medium text-[#1f2933] hover:bg-[#f9f8f5] transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
      )}

      {!isNew && !loadError && historyError && (
        <p role="status" className="border-t border-[#e5dfd2] py-3 text-sm text-[#647076]">Price change history unavailable: {historyError}</p>
      )}

      {!isNew && history.length > 0 ? (
        <section className="border-t border-[#e5dfd2] py-4">
          <h2 className="font-semibold text-[#1f2933]">Price change history</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#e5dfd2] text-left text-xs text-[#647076]">
                <tr><th className="py-2">Date</th><th>Action</th><th>Changed by</th><th>Approved by</th><th>Source</th></tr>
              </thead>
              <tbody className="divide-y divide-[#e5dfd2]">
                {history.map(entry => (
                  <tr key={entry.id}>
                    <td className="py-2 pr-4 whitespace-nowrap">{new Date(entry.created_at).toLocaleString()}</td>
                    <td className="pr-4">{entry.action}</td>
                    <td className="pr-4">{entry.changed_by ?? "—"}</td>
                    <td className="pr-4">{entry.approved_by ?? "—"}</td>
                    <td>{entry.source_version ?? "Manual update"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
