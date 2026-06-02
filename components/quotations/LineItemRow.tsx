"use client"

import React, { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { formatTHB } from "@/lib/utils"

interface PricingOption {
  id: string
  code: string
  serviceNameEn: string
  category: string
  unit: string
  rateThb: number
}

interface LineItem {
  id: string
  description: string
  category: string
  unit: string
  qty: number
  unitPrice: number
}

interface LineItemRowProps {
  item: LineItem
  index: number
  categories: string[]
  units: string[]
  onChange: (id: string, field: keyof LineItem, value: string | number) => void
  onRemove: (id: string) => void
}

export function LineItemRow({
  item,
  index,
  categories,
  units,
  onChange,
  onRemove,
}: LineItemRowProps) {
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([])
  const [loadingPricing, setLoadingPricing] = useState(false)

  const pricingCategoryAliases: Record<string, string> = {
    "Paint & Coating": "Paint Services",
    "Paint Service": "Paint Services",
    "Ramp Service": "Ramp Access",
    "Berth Fee": "Wet Berth",
    Cleaning: "Wash & Cleaning",
    Labour: "OT / After-Hours Labor",
  }

  const rateCardCategory = pricingCategoryAliases[item.category] ?? item.category

  // Load matching rate-card options for the selected quotation category.
  useEffect(() => {
    let cancelled = false
    setPricingOptions([])

    if (item.category) {
      setLoadingPricing(true)
      fetch(`/api/pricing-master?category=${encodeURIComponent(rateCardCategory)}&isActive=true`)
        .then((r) => r.json())
        .then((json) => {
          if (!cancelled) setPricingOptions(json.data || [])
        })
        .catch(() => {
          if (!cancelled) setPricingOptions([])
        })
        .finally(() => {
          if (!cancelled) setLoadingPricing(false)
        })
    } else {
      setPricingOptions([])
    }

    return () => {
      cancelled = true
    }
  }, [item.category, rateCardCategory])

  const amount = item.qty * item.unitPrice

  const handlePricingSelect = (pricingCode: string) => {
    const pricing = pricingOptions.find((p) => p.code === pricingCode)
    if (!pricing) return

    onChange(item.id, "description", `${pricing.code} - ${pricing.serviceNameEn}`)
    onChange(item.id, "category", pricing.category)
    onChange(item.id, "unit", pricing.unit)
    onChange(item.id, "unitPrice", Number(pricing.rateThb))
  }

  return (
    <tr className="group border-b border-gray-100 last:border-0">
      <td className="py-2 pr-2 text-xs text-gray-400 w-6 text-center">{index + 1}</td>
      <td className="py-2 pr-2">
        <Input
          value={item.description}
          onChange={(e) => onChange(item.id, "description", e.target.value)}
          placeholder="Describe the service or item…"
          className="text-sm"
        />
      </td>
      <td className="py-2 pr-2 w-36">
        <select
          value={item.category}
          onChange={(e) => onChange(item.id, "category", e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Rate card quick select */}
        {pricingOptions.length > 0 && (
            <div className="mt-2">
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) handlePricingSelect(e.target.value)
                  e.target.value = ""
                }}
                className="w-full rounded-md border border-teal-300 bg-teal-50 px-2 py-1.5 text-xs text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">Pick rate card...</option>
                {pricingOptions.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} - {p.serviceNameEn} (฿{Number(p.rateThb).toLocaleString()}/{p.unit})
                  </option>
                ))}
              </select>
            </div>
          )}

        {loadingPricing && (
          <p className="mt-1 text-xs text-gray-400">Loading rate card...</p>
        )}
      </td>
      <td className="py-2 pr-2 w-20">
        <select
          value={item.unit}
          onChange={(e) => onChange(item.id, "unit", e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        >
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-2 w-20">
        <Input
          type="number"
          min={0}
          step="0.5"
          value={item.qty}
          onChange={(e) => onChange(item.id, "qty", parseFloat(e.target.value) || 0)}
          className="text-sm text-right tabular-nums"
        />
      </td>
      <td className="py-2 pr-2 w-32">
        <Input
          type="number"
          min={0}
          step="100"
          value={item.unitPrice}
          onChange={(e) => onChange(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
          className="text-sm text-right tabular-nums"
        />
      </td>
      <td className="py-2 pr-2 w-32 text-right tabular-nums text-sm font-semibold text-gray-900">
        {formatTHB(amount)}
      </td>
      <td className="py-2 w-8">
        <button
          onClick={() => onRemove(item.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 hover:bg-red-50 hover:text-red-500 text-gray-300"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}
