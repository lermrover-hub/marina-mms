"use client"
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navigation, Ship, ArrowRight, Loader2, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Boat } from "@/lib/supabase"

const MOVEMENT_TYPES = [
  { value: "LAUNCH",     label: "Launch",          color: "bg-teal-50 border-teal-300 text-teal-700",    description: "Put boat into water via ramp" },
  { value: "RETRIEVAL",  label: "Retrieval",        color: "bg-blue-50 border-blue-300 text-blue-700",    description: "Pull boat out of water via ramp" },
  { value: "TO_STORAGE", label: "To Storage",       color: "bg-orange-50 border-orange-300 text-orange-700", description: "Move boat to dry storage" },
  { value: "TO_REPAIR",  label: "To Repair Area",   color: "bg-red-50 border-red-300 text-red-700",       description: "Move boat to repair yard / workshop" },
  { value: "ARRIVAL",    label: "Marina Arrival",   color: "bg-purple-50 border-purple-300 text-purple-700", description: "Boat arrives at marina" },
  { value: "DEPARTURE",  label: "Departure",        color: "bg-gray-50 border-gray-300 text-gray-700",    description: "Boat leaves marina premises" },
  { value: "INSPECTION", label: "Inspection Move",  color: "bg-amber-50 border-amber-300 text-amber-700", description: "Moved for inspection purpose" },
  { value: "MOVE",       label: "Internal Move",    color: "bg-indigo-50 border-indigo-300 text-indigo-700", description: "Move between berths or positions" },
]

const LOCATION_SUGGESTIONS = [
  "Wet Berth A1", "Wet Berth A2", "Wet Berth A3", "Wet Berth B1", "Wet Berth B2",
  "Dry Storage D1", "Dry Storage D2", "Dry Storage D3",
  "Ramp Area", "Repair Yard", "Workshop Bay", "Fuel Station",
  "Waiting Area", "Temporary Hold", "In Water", "Customer Premises",
]

export default function NewMovementPage() {
  const router = useRouter()

  const [boats,    setBoats]    = useState<Boat[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Form fields
  const [boatId,      setBoatId]      = useState("")
  const [boatSearch,  setBoatSearch]  = useState("")
  const [movType,     setMovType]     = useState("LAUNCH")
  const [fromLoc,     setFromLoc]     = useState("")
  const [toLoc,       setToLoc]       = useState("")
  const [operatedBy,  setOperatedBy]  = useState("")
  const [notes,       setNotes]       = useState("")
  const [movedAt,     setMovedAt]     = useState(() => new Date().toISOString().slice(0, 16))

  // Boat search state
  const [boatDropdown, setBoatDropdown] = useState(false)
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null)

  useEffect(() => {
    fetch("/api/db/boats?limit=200")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setBoats(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filteredBoats = boats.filter(b =>
    !boatSearch ||
    b.name.toLowerCase().includes(boatSearch.toLowerCase()) ||
    (b.registration_number ?? "").toLowerCase().includes(boatSearch.toLowerCase()) ||
    (b.owner_name ?? "").toLowerCase().includes(boatSearch.toLowerCase())
  ).slice(0, 8)

  function selectBoat(boat: Boat) {
    setSelectedBoat(boat)
    setBoatId(boat.id)
    setBoatSearch(boat.name)
    setBoatDropdown(false)
    // Pre-fill from location from boat's current location
    if (boat.current_location_code) setFromLoc(boat.current_location_code)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!boatId) { setError("Please select a boat"); return }
    if (!toLoc.trim()) { setError("To Location is required"); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/db/boat-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boat_id:       boatId,
          boat_name:     selectedBoat?.name ?? null,
          from_location: fromLoc.trim() || null,
          to_location:   toLoc.trim(),
          movement_type: movType,
          operated_by:   operatedBy.trim() || null,
          notes:         notes.trim() || null,
          moved_at:      new Date(movedAt).toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Failed to record movement")
      router.push("/movements")
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Record Boat Movement"
        breadcrumb={[
          { label: "Movements", href: "/movements" },
          { label: "New Movement" },
        ]}
        description="Log a boat movement between locations"
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-4">

          {/* Movement Type */}
          <Card>
            <CardHeader><CardTitle>Movement Type</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {MOVEMENT_TYPES.map(({ value, label, color, description }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMovType(value)}
                    className={cn(
                      "rounded-lg border-2 p-3 text-left transition-all",
                      movType === value
                        ? color
                        : "border-gray-200 hover:border-gray-300 text-gray-600"
                    )}
                  >
                    <div className="font-semibold text-sm">{label}</div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-tight">{description}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Boat Selection */}
          <Card>
            <CardHeader><CardTitle>Select Boat</CardTitle></CardHeader>
            <CardContent>
              <div className="relative">
                <Label htmlFor="boat-search" className="mb-1.5 block">Boat <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Input
                    id="boat-search"
                    placeholder="Search by name, registration, or owner…"
                    value={boatSearch}
                    onChange={e => { setBoatSearch(e.target.value); setBoatDropdown(true); if (!e.target.value) { setBoatId(""); setSelectedBoat(null) } }}
                    onFocus={() => setBoatDropdown(true)}
                    onBlur={() => setTimeout(() => setBoatDropdown(false), 200)}
                    autoComplete="off"
                  />
                  {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400 self-center" />}
                </div>
                {boatDropdown && filteredBoats.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white rounded-lg border shadow-lg max-h-52 overflow-y-auto">
                    {filteredBoats.map(boat => (
                      <button
                        key={boat.id}
                        type="button"
                        onMouseDown={() => selectBoat(boat)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
                      >
                        <Ship className="h-4 w-4 text-gray-400 shrink-0" />
                        <div>
                          <div className="font-medium text-sm text-gray-900">{boat.name}</div>
                          <div className="text-xs text-gray-500">
                            {boat.boat_type}
                            {boat.registration_number && ` · ${boat.registration_number}`}
                            {boat.owner_name && ` · Owner: ${boat.owner_name}`}
                            {boat.current_location_code && ` · @ ${boat.current_location_code}`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedBoat && (
                <div className="mt-3 rounded-lg bg-teal-50 border border-teal-200 p-3 flex items-center gap-3">
                  <Ship className="h-5 w-5 text-teal-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-teal-900 text-sm">{selectedBoat.name}</div>
                    <div className="text-xs text-teal-700">
                      {selectedBoat.boat_type}
                      {selectedBoat.loa_ft && ` · ${selectedBoat.loa_ft}ft LOA`}
                      {selectedBoat.current_location_code && ` · Current: ${selectedBoat.current_location_code}`}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Locations */}
          <Card>
            <CardHeader><CardTitle>Movement Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="from-loc">From Location</Label>
                  <Input
                    id="from-loc"
                    list="loc-suggestions"
                    placeholder="Current location (optional)"
                    value={fromLoc}
                    onChange={e => setFromLoc(e.target.value)}
                  />
                  <datalist id="loc-suggestions">
                    {LOCATION_SUGGESTIONS.map(loc => <option key={loc} value={loc} />)}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="to-loc">To Location <span className="text-red-500">*</span></Label>
                  <Input
                    id="to-loc"
                    list="loc-suggestions"
                    placeholder="Destination location"
                    value={toLoc}
                    onChange={e => setToLoc(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Arrow preview */}
              {(fromLoc || toLoc) && (
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span className="font-medium text-gray-700 truncate">{fromLoc || "—"}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="font-medium text-teal-700 truncate">{toLoc || "—"}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="operated-by">Operated By</Label>
                  <Input
                    id="operated-by"
                    placeholder="Staff name or team"
                    value={operatedBy}
                    onChange={e => setOperatedBy(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="moved-at">Date & Time <span className="text-red-500">*</span></Label>
                  <Input
                    id="moved-at"
                    type="datetime-local"
                    value={movedAt}
                    onChange={e => setMovedAt(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes / Remarks <span className="text-gray-400 font-normal">(optional)</span></Label>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder="Special instructions, condition notes, observations…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Submit */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                disabled={saving || !boatId || !toLoc}
                className="w-full gap-2 bg-teal-600 hover:bg-teal-700 text-white"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                {saving ? "Saving…" : "Record Movement"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.back()}
                disabled={saving}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>

          {/* Info card */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Movement Rules</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs text-gray-500">
              <div className="flex gap-2">
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                <span>Each boat can have only one active location at a time</span>
              </div>
              <div className="flex gap-2">
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                <span>Recording a movement updates the boat&apos;s current location</span>
              </div>
              <div className="flex gap-2">
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                <span>For ramp operations, use Ramp Bookings for tide-safe scheduling</span>
              </div>
              <div className="flex gap-2">
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                <span>Photo documentation required for major movements</span>
              </div>
            </CardContent>
          </Card>

          {/* Movement type legend */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Movement Types</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {MOVEMENT_TYPES.map(({ value, label, description }) => (
                <div key={value} className="flex items-center gap-2">
                  <span className={cn(
                    "inline-block rounded-full px-2 py-0.5 text-xs font-medium shrink-0",
                    value === movType ? "ring-2 ring-offset-1 ring-teal-500" : "",
                    "bg-gray-100 text-gray-600"
                  )}>
                    {label}
                  </span>
                  <span className="text-xs text-gray-400 truncate">{description}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
