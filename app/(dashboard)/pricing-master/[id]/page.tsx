"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Save, Loader } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"

type PricingHistoryEntry = {
  id: string
  action: string
  changed_by: string | null
  approved_by: string | null
  source_version: string | null
  created_at: string
}

const CATEGORIES = ["Ramp Access", "Haul-out", "Paint Service", "Yard Services", "Storage", "Other"]
const UNITS = ["trip", "sqm", "pkg", "hr", "day", "ft", "set", "pc", "unit"]
const CALC_TYPES = ["FLAT_QTY", "FLAT_DAYS", "LOA_RATE_QTY", "LOA_RATE_DAYS", "MANUAL"]
const QUOTE_RULES = ["YES", "NO", "CONTACT", "MANAGER_REVIEW", "MANUAL"]
const PRICE_STATUSES = ["ACTIVE", "INACTIVE", "CONTACT_ONLY", "PENDING_PAINT_TEAM", "MANUAL_QUOTE"]

export default function PricingMasterEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const isNew = id === "new"

  const [loading, setLoading] = useState(!isNew)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [history, setHistory] = useState<PricingHistoryEntry[]>([])
  const [formData, setFormData] = useState({
    code: "",
    serviceNameEn: "",
    serviceNameTh: "",
    category: "Paint Service",
    unit: "sqm",
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
    quoteAllowed: "YES",
    priceStatus: "ACTIVE",
    sourceVersion: "",
    effectiveDate: "",
    description: "",
    notes: ""
  })

  // Fetch pricing data if editing
  useEffect(() => {
    if (isNew) return

    const fetchPricing = async () => {
      try {
        const [res, historyRes] = await Promise.all([
          fetch(`/api/pricing-master/${id}`),
          fetch(`/api/pricing-master/${id}/history`),
        ])
        if (!res.ok) throw new Error("Failed to fetch")
        const json = await res.json()
        const pricing = json.data

        setFormData({
          code: pricing.code,
          serviceNameEn: pricing.serviceNameEn,
          serviceNameTh: pricing.serviceNameTh || "",
          category: pricing.category,
          unit: pricing.unit,
          rateThb: pricing.rateThb.toString(),
          fullRateThb: pricing.fullRateThb.toString(),
          discountPct: String(pricing.discountPct ?? 0),
          sourceDiscountPct: String(pricing.sourceDiscountPct ?? 0),
          directCostThb: pricing.directCostThb == null ? "" : String(pricing.directCostThb),
          revenueGlCode: pricing.revenueGlCode || "",
          costGlCode: pricing.costGlCode || "",
          pnlCategory: pricing.pnlCategory || "",
          costPnlCategory: pricing.costPnlCategory || "",
          costBasis: pricing.costBasis || "",
          calcType: pricing.calcType || "FLAT_QTY",
          serviceGroup: pricing.serviceGroup || "",
          subgroup: pricing.subgroup || "",
          providerType: pricing.providerType || "",
          quoteAllowed: pricing.quoteAllowed || "YES",
          priceStatus: pricing.priceStatus || "ACTIVE",
          sourceVersion: pricing.sourceVersion || "",
          effectiveDate: pricing.effectiveDate || "",
          description: pricing.description || "",
          notes: pricing.notes || ""
        })

        if (historyRes.ok) {
          const historyJson = await historyRes.json()
          setHistory(historyJson.data ?? [])
        }
      } catch (err) {
        console.error("Error fetching pricing:", err)
        setError("Failed to load pricing data")
      } finally {
        setLoading(false)
      }
    }

    fetchPricing()
  }, [id, isNew])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!formData.code || !formData.serviceNameEn || !formData.category || !formData.unit || !formData.rateThb) {
      setError("Please fill in all required fields")
      return
    }

    setSubmitting(true)

    try {
      const method = isNew ? "POST" : "PATCH"
      const url = isNew ? "/api/pricing-master" : `/api/pricing-master/${id}`

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          rateThb: parseFloat(formData.rateThb),
          fullRateThb: formData.fullRateThb ? parseFloat(formData.fullRateThb) : parseFloat(formData.rateThb),
          discountPct: formData.discountPct ? parseFloat(formData.discountPct) : 0,
          sourceDiscountPct: formData.sourceDiscountPct ? parseFloat(formData.sourceDiscountPct) : 0,
          directCostThb: formData.directCostThb ? parseFloat(formData.directCostThb) : null,
          effectiveDate: formData.effectiveDate || null,
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to save pricing")
      }

      router.push("/pricing-master")
    } catch (err: unknown) {
      console.error("Error saving pricing:", err)
      setError(err instanceof Error ? err.message : "Failed to save pricing")
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
        <Link href="/pricing-master" className="rounded-md p-1.5 hover:bg-[#f2eee4] transition-colors">
          <ArrowLeft className="h-5 w-5 text-[#1f2933]" />
        </Link>
        <PageHeader
          title={isNew ? "New Pricing" : `Edit Pricing: ${formData.code}`}
          description={isNew ? "Create a new service pricing record" : "Update service pricing details"}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-[#e5dfd2] bg-white p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Code *</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="e.g. P01, P06, HAUL_SB_M"
              disabled={!isNew}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] placeholder:text-[#8b969a] disabled:bg-[#f9f8f5] focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Service Name EN */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Service Name (English) *</label>
            <input
              type="text"
              name="serviceNameEn"
              value={formData.serviceNameEn}
              onChange={handleChange}
              placeholder="e.g. Compound & Polish – Speedboat"
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] placeholder:text-[#8b969a] focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20"
            />
          </div>

          {/* Service Name TH */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[#1f2933] mb-2">บริการ (ไทย)</label>
            <input
              type="text"
              name="serviceNameTh"
              value={formData.serviceNameTh}
              onChange={handleChange}
              placeholder="เช่น ขัดและเงาเรือเร็ว"
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] placeholder:text-[#8b969a] focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20"
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Unit *</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Rate THB */}
          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Rate (THB) *</label>
            <input
              type="number"
              name="rateThb"
              value={formData.rateThb}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] placeholder:text-[#8b969a] focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20"
            />
          </div>

          <div className="sm:col-span-2 rounded-lg border border-[#d7efed] bg-[#f3fbfa] p-4">
            <h2 className="font-semibold text-[#126c66]">Accounting-ready pricing</h2>
            <p className="mt-1 text-xs text-[#647076]">
              Current rate remains the approved selling price. Default customer discount starts at 0%.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Full / Normal Rate (THB)</label>
            <input type="number" min="0" step="0.01" name="fullRateThb" value={formData.fullRateThb} onChange={handleChange}
              placeholder="Defaults to current rate"
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Default Discount (%)</label>
            <input type="number" min="0" max="100" step="0.01" name="discountPct" value={formData.discountPct} onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
            <p className="mt-1 text-xs text-[#8b969a]">Default is 0%. Quotation approval rules still apply.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Source Discount Reference (%)</label>
            <input type="number" min="0" max="100" step="0.01" name="sourceDiscountPct" value={formData.sourceDiscountPct} onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
            <p className="mt-1 text-xs text-[#8b969a]">Informational only; it is not applied automatically.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Direct Cost (THB)</label>
            <input type="number" min="0" step="0.01" name="directCostThb" value={formData.directCostThb} onChange={handleChange}
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
              {CALC_TYPES.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Quote Rule</label>
            <select name="quoteAllowed" value={formData.quoteAllowed} onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20">
              {QUOTE_RULES.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Price Status</label>
            <select name="priceStatus" value={formData.priceStatus} onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20">
              {PRICE_STATUSES.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Effective Date</label>
            <input type="date" name="effectiveDate" value={formData.effectiveDate} onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Source Version</label>
            <input type="text" name="sourceVersion" value={formData.sourceVersion} onChange={handleChange} placeholder="e.g. ORM-PRICE-2026-v3.5"
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Service Group</label>
            <input type="text" name="serviceGroup" value={formData.serviceGroup} onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2933] mb-2">Subgroup</label>
            <input type="text" name="subgroup" value={formData.subgroup} onChange={handleChange}
              className="w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20" />
          </div>

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
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
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
                {isNew ? "Create Pricing" : "Update Pricing"}
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

      {!isNew && history.length > 0 ? (
        <section className="rounded-lg border border-[#e5dfd2] bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-[#1f2933]">Price change history</h2>
          <p className="mt-1 text-xs text-[#8b969a]">Visible to Admin and Finance roles.</p>
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
