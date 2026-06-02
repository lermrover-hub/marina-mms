"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Save, Loader } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import { PricingMaster } from "@prisma/client"

export default function PricingMasterEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const isNew = id === "new"

  const [loading, setLoading] = useState(!isNew)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    code: "",
    serviceNameEn: "",
    serviceNameTh: "",
    category: "Paint Service",
    unit: "sqm",
    rateThb: "",
    description: "",
    notes: ""
  })

  const categories = ["Ramp Access", "Haul-out", "Paint Service", "Yard Services", "Storage", "Other"]
  const units = ["trip", "sqm", "pkg", "hr", "day", "ft", "set", "pc", "unit"]

  // Fetch pricing data if editing
  useEffect(() => {
    if (isNew) return

    const fetchPricing = async () => {
      try {
        const res = await fetch(`/api/pricing-master/${id}`)
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
          description: pricing.description || "",
          notes: pricing.notes || ""
        })
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
          rateThb: parseFloat(formData.rateThb)
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to save pricing")
      }

      router.push("/pricing-master")
    } catch (err: any) {
      console.error("Error saving pricing:", err)
      setError(err.message || "Failed to save pricing")
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
              {categories.map((cat) => (
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
              {units.map((u) => (
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
    </div>
  )
}
