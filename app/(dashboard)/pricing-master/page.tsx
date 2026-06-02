"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Edit2, Trash2, Search } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"

interface PricingItem {
  id: string
  code: string
  serviceNameEn: string
  serviceNameTh: string
  category: string
  unit: string
  rateThb: number
  description: string
  notes: string
  isActive: boolean
}

export default function PricingMasterPage() {
  const [pricingList, setPricingList] = useState<PricingItem[]>([])
  const [filteredList, setFilteredList] = useState<PricingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // Fetch pricing data
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await fetch("/api/pricing-master")
        const json = await res.json()
        const activeOnly = json.data.filter((p: PricingItem) => p.isActive)
        setPricingList(activeOnly)
        setFilteredList(activeOnly)
      } catch (error) {
        console.error("Error fetching pricing:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPricing()
  }, [])

  // Filter by search term and category
  useEffect(() => {
    let filtered = pricingList

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.serviceNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.serviceNameTh && p.serviceNameTh.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory)
    }

    setFilteredList(filtered)
  }, [searchTerm, selectedCategory, pricingList])

  // Get unique categories
  const categories = Array.from(new Set(pricingList.map((p) => p.category)))

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete pricing ${code}?`)) return

    try {
      await fetch(`/api/pricing-master/${id}`, { method: "DELETE" })
      setPricingList(pricingList.filter((p) => p.id !== id))
    } catch (error) {
      console.error("Error deleting:", error)
      alert("Failed to delete pricing")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing Master"
        description="Manage service pricing for Ramp, Haul-out, Paint Services, Yard Services, and more"
      />

      {/* Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b969a]" />
            <input
              type="text"
              placeholder="Search by code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-[#e5dfd2] bg-white py-2 pl-10 pr-3 text-sm text-[#1f2933] placeholder:text-[#8b969a] focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <Link
          href="/pricing-master/new"
          className="flex items-center justify-center gap-2 rounded-md bg-ocean-turquoise px-4 py-2 text-sm font-medium text-white hover:bg-[#0d8b81] transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Pricing
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[#e5dfd2] bg-white shadow-sm">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-[#8b969a]">Loading...</div>
        ) : filteredList.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-[#8b969a]">No pricing found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[#e5dfd2] bg-[#f9f8f5]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Code</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Service (EN)</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">บริการ (TH)</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Category</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Unit</th>
                <th className="px-4 py-3 text-right font-semibold text-[#1f2933]">Rate (THB)</th>
                <th className="px-4 py-3 text-center font-semibold text-[#1f2933]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5dfd2]">
              {filteredList.map((pricing) => (
                <tr key={pricing.id} className="hover:bg-[#f9f8f5] transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-ocean-turquoise">{pricing.code}</td>
                  <td className="px-4 py-3 text-[#1f2933]">{pricing.serviceNameEn}</td>
                  <td className="px-4 py-3 text-[#647076]">{pricing.serviceNameTh || "—"}</td>
                  <td className="px-4 py-3 text-[#647076]">
                    <span className="inline-block rounded-full bg-[#e8fbf9] px-2 py-1 text-xs font-medium text-[#126c66]">
                      {pricing.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#647076]">{pricing.unit}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[#1f2933]">
                    ฿{Number(pricing.rateThb).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/pricing-master/${pricing.id}`}
                        className="rounded-md p-1.5 hover:bg-[#e8fbf9] transition-colors"
                      >
                        <Edit2 className="h-4 w-4 text-[#126c66]" />
                      </Link>
                      <button
                        onClick={() => handleDelete(pricing.id, pricing.code)}
                        className="rounded-md p-1.5 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-[#d7efed] bg-[#f3fbfa] p-4">
        <p className="text-sm text-[#126c66]">
          Showing <span className="font-semibold">{filteredList.length}</span> of{" "}
          <span className="font-semibold">{pricingList.length}</span> pricing records
        </p>
      </div>
    </div>
  )
}
