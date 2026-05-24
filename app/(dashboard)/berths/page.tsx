"use client"

import React, { useMemo } from "react"
import Link from "next/link"
import { CalendarDays, Download, Loader2, Plus, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import type { Berth } from "@/lib/supabase"
import { useApiList } from "@/hooks/useApiList"

const STATUS_STYLE: Record<string, string> = {
  AVAILABLE: "opacity-100",
  OCCUPIED: "ring-2 ring-blue-500 ring-offset-1",
  RESERVED: "ring-2 ring-amber-500 ring-offset-1",
  MAINTENANCE: "opacity-70 ring-2 ring-red-500 ring-offset-1",
  BLOCKED: "opacity-50",
}

const LEGEND = [
  { code: "S", label: "8-10 m (26-33 ft)", className: "bg-blue-50 border-blue-500 border-dotted" },
  { code: "M", label: "11-13 m (36-43 ft)", className: "bg-green-50 border-green-500" },
  { code: "3L", label: "14-18 m (46-60 ft)", className: "bg-fuchsia-500 border-pink-600 text-white" },
  { code: "XL", label: "Over 60 ft", className: "bg-purple-100 border-purple-600" },
  { code: "SP", label: "Speedboat", className: "bg-orange-50 border-orange-500" },
]

function rateLabel(berth?: Berth, fallback = "") {
  if (!berth?.monthly_rate) return fallback
  return berth.monthly_rate.toLocaleString("en-US")
}

function sizeCode(berth?: Berth) {
  const ft = berth?.max_loa_ft ?? 0
  if (berth?.berth_type?.toUpperCase().includes("SPEED")) return "SP"
  if (ft > 60) return "XL"
  if (ft >= 46) return "L"
  if (ft >= 36) return "M"
  return "S"
}

function slotFill(berth?: Berth) {
  const code = sizeCode(berth)
  if (code === "XL") return "bg-purple-100 border-purple-600"
  if (code === "L") return "bg-pink-100 border-pink-500"
  if (code === "M") return "bg-green-50 border-green-500"
  if (code === "SP") return "bg-orange-50 border-orange-500"
  return "bg-blue-50 border-blue-500 border-dotted"
}

function MapSlot({
  berth,
  label,
  className = "",
  style,
  rotateLabel = false,
  fallbackRate = "",
}: {
  berth?: Berth
  label?: string
  className?: string
  style: React.CSSProperties
  rotateLabel?: boolean
  fallbackRate?: string
}) {
  const statusClass = berth ? STATUS_STYLE[berth.status] ?? STATUS_STYLE.BLOCKED : "opacity-60"
  const content = (
    <div
      className={`absolute flex items-center justify-center border-2 text-[11px] font-medium text-gray-900 transition hover:z-20 hover:shadow-lg ${slotFill(berth)} ${statusClass} ${className}`}
      style={style}
      title={berth ? `${berth.code} - ${berth.status}` : label}
    >
      <span className={rotateLabel ? "-rotate-90 whitespace-nowrap" : "text-center leading-tight"}>
        {label ?? rateLabel(berth, fallbackRate)}
      </span>
    </div>
  )

  if (!berth) return content
  return (
    <Link href={`/berths/${berth.id}`} aria-label={`Open ${berth.code}`}>
      {content}
    </Link>
  )
}

function HardstandPlan({ berths }: { berths: Berth[] }) {
  const byCode = useMemo(() => {
    const map = new Map<string, Berth>()
    berths.forEach((berth) => {
      map.set(berth.code, berth)
      map.set(berth.code.replace("-", ""), berth)
    })
    return map
  }, [berths])
  const get = (code: string) => byCode.get(code)
  const washSlots = ["Wash-1", "Wash-2", "Wash-3"]
  const cRow1 = Array.from({ length: 9 }, (_, index) => `C-${index + 1}`)
  const cRow2 = Array.from({ length: 9 }, (_, index) => `C-${index + 10}`)

  function YardSlot({
    code,
    className = "",
    style,
    children,
  }: {
    code: string
    className?: string
    style: React.CSSProperties
    children?: React.ReactNode
  }) {
    const berth = get(code)
    const slot = (
      <div
        className={`absolute flex items-start justify-center border border-black bg-neutral-100 px-2 py-3 text-xl font-medium text-black transition hover:z-20 hover:bg-teal-50 hover:shadow-md ${berth ? STATUS_STYLE[berth.status] ?? "" : ""} ${className}`}
        style={style}
        title={berth ? `${berth.code} - ${berth.status}` : code}
      >
        {children ?? code}
      </div>
    )
    return berth ? <Link href={`/berths/${berth.id}`}>{slot}</Link> : slot
  }

  return (
    <Card className="overflow-hidden border-gray-200">
      <CardContent className="p-0">
        <div className="overflow-auto">
          <div className="relative h-[640px] min-w-[1120px] bg-white">
            <h2 className="absolute left-0 right-0 top-9 text-center text-2xl font-medium text-black">
              Hardstand & Boat yard slot
            </h2>

            <div className="absolute left-[125px] top-[108px] h-[235px] w-[288px] border border-black bg-neutral-100" />
            {washSlots.map((code, index) => (
              <YardSlot
                key={code}
                code={code}
                style={{ left: 125 + index * 95, top: 108, width: 96, height: 158 }}
              />
            ))}
            <YardSlot
              code="W4"
              className="items-center py-0 text-xl"
              style={{ left: 125, top: 264, width: 288, height: 78 }}
            >
              Wash-4
            </YardSlot>

            <div className="absolute left-[528px] top-[108px] h-[235px] w-[585px] border border-black bg-neutral-100" />
            {cRow1.map((code, index) => (
              <YardSlot
                key={code}
                code={code}
                style={{ left: 528 + index * 65, top: 108, width: 66, height: 235 }}
              />
            ))}

            <div className="absolute left-[530px] top-[424px] h-[233px] w-[586px] border border-black bg-neutral-100" />
            {cRow2.map((code, index) => (
              <YardSlot
                key={code}
                code={code}
                style={{ left: 530 + index * 65, top: 424, width: 66, height: 233 }}
              />
            ))}

            <p className="absolute bottom-6 left-[650px] text-2xl font-medium text-black">
              C-10 to C18 currently unavailable
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BerthMap({ berths }: { berths: Berth[] }) {
  const byCode = useMemo(() => {
    const map = new Map<string, Berth>()
    berths.forEach((berth) => {
      map.set(berth.code, berth)
      map.set(berth.code.replace("-", ""), berth)
    })
    return map
  }, [berths])

  const get = (code: string) => byCode.get(code)
  const smallSlots = Array.from({ length: 13 }, (_, index) => `S-${index + 1}`)
  const midSlots = Array.from({ length: 10 }, (_, index) => `M-${index + 1}`)
  const largeSlots = Array.from({ length: 8 }, (_, index) => `L-${index + 1}`)
  const xlSlots = Array.from({ length: 6 }, (_, index) => `XL-${index + 1}`)

  function WetSlot({
    code,
    fallback,
    className,
    rotateLabel = false,
    style,
  }: {
    code: string
    fallback: string
    className: string
    rotateLabel?: boolean
    style: React.CSSProperties
  }) {
    const berth = get(code)
    return (
      <MapSlot
        berth={berth}
        label={berth ? undefined : fallback}
        fallbackRate={fallback}
        className={className}
        rotateLabel={rotateLabel}
        style={style}
      />
    )
  }

  return (
    <Card className="overflow-hidden border-gray-200">
      <CardContent className="p-0">
        <div className="overflow-auto bg-white">
          <div className="relative h-[660px] min-w-[1120px] bg-white">
            <h2 className="absolute left-0 right-0 top-8 text-center text-3xl font-medium text-black">
              WET BERTH
            </h2>
            <p className="absolute left-0 right-0 top-[64px] text-center text-xl font-medium text-black">
              currently unavailable
            </p>

            <div className="absolute left-5 top-[435px] space-y-2">
              {LEGEND.map((item) => (
                <div key={item.code} className="flex items-center gap-2">
                  <div className={`flex h-9 w-14 items-center justify-center border text-sm font-medium ${item.className}`}>
                    {item.code}
                  </div>
                  <div className="text-xs text-black">{item.label}</div>
                </div>
              ))}
              <div className="pt-2 text-sm text-black">Total 47</div>
            </div>

            <div className="absolute left-[253px] top-[92px] h-[42px] w-[705px] border border-orange-400 bg-orange-100" />
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                className="absolute top-[92px] flex h-[42px] items-center justify-center border border-orange-400 text-[10px] font-medium text-white [writing-mode:vertical-rl]"
                style={{ left: 253 + index * 78, width: 79 }}
              >
                5m
              </div>
            ))}

            <div className="absolute left-[253px] top-[134px] h-[512px] w-[735px] border-l-[18px] border-r-[18px] border-t-[20px] border-gray-600" />
            <div className="absolute left-[270px] top-[134px] h-[512px] w-[705px] border-t-[20px] border-black/40" />
            <div className="absolute left-[965px] top-[134px] h-[512px] w-5 bg-gray-500" />
            <div className="absolute left-[578px] top-[134px] h-[512px] w-4 bg-gray-500" />
            <div className="absolute left-[573px] top-[152px] h-6 w-18 -rotate-45 bg-white" />
            <div className="absolute left-[270px] top-[152px] h-6 w-12 -rotate-45 bg-white" />
            <div className="absolute left-[945px] top-[152px] h-6 w-12 rotate-45 bg-white" />

            <div className="absolute left-[255px] top-[370px] h-[16px] w-[50px] bg-gray-500" />
            <div className="absolute left-[203px] top-[369px] h-[17px] w-[65px] border border-black bg-gray-500" />

            {smallSlots.slice(0, 12).map((code, index) => (
              <React.Fragment key={code}>
                <WetSlot
                  code={code}
                  fallback=""
                  className="bg-blue-50 border-blue-500 border-dotted text-white"
                  style={{ left: index === 0 ? 293 : 270, top: 153 + index * 42, width: index === 0 ? 52 : 55, height: 35 }}
                />
                {index > 0 && index % 2 === 0 && (
                  <div
                    className="absolute z-10 h-2 bg-gray-500 text-center text-[9px] font-bold text-white"
                    style={{ left: 270, top: 228 + (index - 2) * 42, width: 42 }}
                  >
                    5m
                  </div>
                )}
              </React.Fragment>
            ))}

            {midSlots.map((code, index) => (
              <React.Fragment key={code}>
                <WetSlot
                  code={code}
                  fallback=""
                  className="bg-green-50 border-green-500 text-white"
                  style={{ left: 500, top: 185 + index * 44, width: 80, height: 42 }}
                />
                {index % 2 === 1 && (
                  <div
                    className="absolute z-10 h-2 bg-gray-500 text-center text-[9px] font-bold text-white"
                    style={{ left: 525, top: 226 + (index - 1) * 44, width: 55 }}
                  >
                    6x1m
                  </div>
                )}
              </React.Fragment>
            ))}

            <div className="absolute left-[580px] top-[285px] h-[162px] w-4 bg-gray-500 text-center text-[10px] font-medium text-white [writing-mode:vertical-rl]">
              1.5m
            </div>
            <div className="absolute left-[580px] top-[447px] h-[103px] w-4 bg-gray-500 text-center text-[10px] font-medium text-white [writing-mode:vertical-rl]">
              1.5m
            </div>

            {largeSlots.map((code, index) => (
              <WetSlot
                key={code}
                code={code}
                fallback=""
                className="bg-pink-100 border-pink-500 text-white"
                style={{
                  left: index === 7 ? 527 : 592,
                  top: index === 7 ? 636 : 153 + index * 56,
                  width: index === 7 ? 137 : 130,
                  height: index === 7 ? 54 : 54,
                }}
              />
            ))}

            <WetSlot code="L-extra" fallback="" className="bg-pink-100 border-pink-500 text-white" style={{ left: 592, top: 555, width: 130, height: 75 }} />

            {xlSlots.map((code, index) => (
              <WetSlot
                key={code}
                code={code}
                fallback=""
                className="bg-purple-100 border-purple-600 text-white"
                rotateLabel
                style={{
                  left: index % 2 === 0 ? 910 : 985,
                  top: 193 + Math.floor(index / 2) * 158,
                  width: 58,
                  height: 158,
                }}
              />
            ))}
            <div className="absolute left-[970px] top-[193px] h-[474px] w-5 bg-purple-700 text-center text-[10px] font-medium text-white [writing-mode:vertical-rl]">
              2.5m
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function BerthsPage() {
  const { data: berths, loading, error } = useApiList<Berth>("/api/db/berths", {
    errorMessage: "Failed to load berths",
  })

  const stats = useMemo(() => {
    const total = berths.length
    const available = berths.filter((berth) => berth.status === "AVAILABLE").length
    const occupied = berths.filter((berth) => berth.status === "OCCUPIED").length
    const reserved = berths.filter((berth) => berth.status === "RESERVED").length
    const maintenance = berths.filter((berth) => berth.status === "MAINTENANCE").length
    return { total, available, occupied, reserved, maintenance }
  }, [berths])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Berth Map"
        description="Phase 2 hardstand, workshop, speedboat, and big-yacht berth layout"
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
            <Link href="/berths/calendar">
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarDays className="h-4 w-4" /> Calendar View
              </Button>
            </Link>
            <Link href="/berths/management">
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" /> Management
              </Button>
            </Link>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Assign Boat
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "Total", value: stats.total, className: "bg-gray-100 text-gray-900" },
          { label: "Available", value: stats.available, className: "bg-green-100 text-green-800" },
          { label: "Occupied", value: stats.occupied, className: "bg-blue-100 text-blue-800" },
          { label: "Reserved", value: stats.reserved, className: "bg-amber-100 text-amber-800" },
          { label: "Maintenance", value: stats.maintenance, className: "bg-red-100 text-red-800" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className={`p-4 ${item.className}`}>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{item.label}</p>
              <p className="mt-1 text-2xl font-bold">{loading ? "-" : item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading berth map...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && (
        <div className="space-y-5">
          <HardstandPlan berths={berths} />
          <BerthMap berths={berths} />
        </div>
      )}

      <p className="pb-2 text-center text-xs text-gray-400">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-500 align-middle" />
        Live database - {berths.length} berths loaded - click any mapped slot to open details
      </p>
    </div>
  )
}
