"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Save, Ship, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Boat, Customer } from "@/lib/supabase"

const BOAT_TYPES = [
  { value: "SPEED_BOAT",        label: "Speed Boat" },
  { value: "MOTOR_YACHT",       label: "Motor Yacht" },
  { value: "SAILING_YACHT",     label: "Sailing Yacht" },
  { value: "CATAMARAN",         label: "Catamaran" },
  { value: "POWER_CATAMARAN",   label: "Power Catamaran" },
  { value: "FISHING_BOAT",      label: "Fishing Boat" },
  { value: "DINGHY",            label: "Dinghy" },
  { value: "OTHER",             label: "Other" },
]

const USAGE_TYPES = [
  { value: "private",           label: "Private" },
  { value: "charter",           label: "Charter" },
  { value: "speedboat_service", label: "Speedboat Service" },
  { value: "racing",            label: "Racing" },
  { value: "other",             label: "Other" },
]

const HULL_MATERIALS = ["fiberglass", "aluminum", "steel", "wood", "carbon fiber", "other"]
const ENGINE_TYPES   = ["inboard", "outboard", "sterndrive", "jet", "electric", "sail-only"]
const FUEL_TYPES     = ["diesel", "gasoline", "electric", "hybrid", "other"]

function SelectField({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; placeholder?: string
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function SimpleSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20">
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  )
}

export default function EditBoatPage() {
  const params = useParams<{ id: string }>()
  const id     = params?.id ?? ""
  const router = useRouter()

  const [boat,      setBoat]      = useState<Boat | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Identity
  const [ownerId,             setOwnerId]      = useState("")
  const [name,                setName]         = useState("")
  const [boatType,            setBoatType]     = useState("MOTOR_YACHT")
  const [usageType,           setUsageType]    = useState("private")
  const [registrationNumber,  setReg]          = useState("")
  const [hin,                 setHin]          = useState("")
  const [flag,                setFlag]         = useState("Thailand")
  const [yearBuilt,           setYearBuilt]    = useState("")

  // Specs
  const [brand,        setBrand]        = useState("")
  const [model,        setModel]        = useState("")
  const [loaFt,        setLoaFt]        = useState("")
  const [beamFt,       setBeamFt]       = useState("")
  const [draftFt,      setDraftFt]      = useState("")
  const [weightT,      setWeightT]      = useState("")
  const [hullMaterial, setHullMaterial] = useState("fiberglass")
  const [trailerRequired, setTrailer]   = useState(false)

  // Engine
  const [engineType,  setEngineType]  = useState("inboard")
  const [engineBrand, setEngineBrand] = useState("")
  const [numEngines,  setNumEngines]  = useState("1")
  const [fuelType,    setFuelType]    = useState("diesel")

  // Documents / Notes
  const [insuranceExpiry, setInsurance] = useState("")
  const [specialHandling, setSpecial]   = useState("")
  const [notes,           setNotes]     = useState("")

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetch(`/api/db/boats/${id}`).then(r => r.json()),
      fetch(`/api/db/customers`).then(r => r.json()),
    ])
      .then(([boatData, custData]) => {
        if (boatData?.error) { setLoadError("Boat not found"); return }
        setBoat(boatData)
        // Pre-fill fields
        setOwnerId(boatData.owner_id ?? "")
        setName(boatData.name ?? "")
        setBoatType(boatData.boat_type ?? "MOTOR_YACHT")
        setUsageType(boatData.usage_type ?? "private")
        setReg(boatData.registration_number ?? "")
        setHin(boatData.hin ?? "")
        setFlag(boatData.flag ?? "Thailand")
        setYearBuilt(boatData.year_built ? String(boatData.year_built) : "")
        setBrand(boatData.brand ?? "")
        setModel(boatData.model ?? "")
        setLoaFt(boatData.loa_ft != null ? String(boatData.loa_ft) : "")
        setBeamFt(boatData.beam_ft != null ? String(boatData.beam_ft) : "")
        setDraftFt(boatData.draft_ft != null ? String(boatData.draft_ft) : "")
        setWeightT(boatData.weight_t != null ? String(boatData.weight_t) : "")
        setHullMaterial(boatData.hull_material ?? "fiberglass")
        setTrailer((boatData as Boat & { trailer_required?: boolean }).trailer_required ?? false)
        setEngineType(boatData.engine_type ?? "inboard")
        setEngineBrand(boatData.engine_brand ?? "")
        setNumEngines(boatData.num_engines != null ? String(boatData.num_engines) : "1")
        setFuelType(boatData.fuel_type ?? "diesel")
        setInsurance(boatData.insurance_expiry ?? "")
        setSpecial(boatData.special_handling ?? "")
        setNotes(boatData.notes ?? "")
        // Customers list
        if (Array.isArray(custData)) setCustomers(custData)
      })
      .catch(() => setLoadError("Network error"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
      </div>
    )
  }

  if (loadError || !boat) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-gray-500">{loadError ?? "Boat not found"}</p>
        <Link href="/boats" className="text-sm text-teal-600 hover:underline mt-2">← Back to Boats</Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const body: Partial<Boat> = {
        owner_id:            ownerId || null,
        name:                name.trim() || "Unnamed Boat",
        boat_type:           boatType || "OTHER",
        usage_type:          usageType || null,
        registration_number: registrationNumber || null,
        hin:                 hin || null,
        flag:                flag || null,
        year_built:          yearBuilt ? parseInt(yearBuilt) : null,
        brand:               brand || null,
        model:               model || null,
        loa_ft:              loaFt ? parseFloat(loaFt) : null,
        beam_ft:             beamFt ? parseFloat(beamFt) : null,
        draft_ft:            draftFt ? parseFloat(draftFt) : null,
        weight_t:            weightT ? parseFloat(weightT) : null,
        hull_material:       hullMaterial || null,
        engine_type:         engineType || null,
        engine_brand:        engineBrand || null,
        num_engines:         numEngines ? parseInt(numEngines) : null,
        fuel_type:           fuelType || null,
        insurance_expiry:    insuranceExpiry || null,
        special_handling:    specialHandling || null,
        notes:               notes || null,
      }
      const res = await fetch(`/api/db/boats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Save failed")
      router.push(`/boats/${id}`)
    } catch (e) {
      setSaveError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.company_name ?? ([c.first_name, c.last_name].filter(Boolean).join(" ") || c.id),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit — ${boat.name}`}
        breadcrumb={[
          { label: "Boats", href: "/boats" },
          { label: boat.name ?? "Boat", href: `/boats/${id}` },
          { label: "Edit" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild><Link href={`/boats/${id}`}>Cancel</Link></Button>
            <Button size="sm" variant="teal" form="boat-edit-form" type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        }
      />

      {saveError && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {saveError}
        </div>
      )}

      <form id="boat-edit-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main: identity + dimensions */}
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader><CardTitle>Boat Identity</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label>Boat Name <span className="text-red-500">*</span></Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sea Hawk" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Owner <span className="text-red-500">*</span></Label>
                    <SelectField value={ownerId} onChange={setOwnerId} placeholder="— Select owner —"
                      options={customerOptions} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Boat Type <span className="text-red-500">*</span></Label>
                    <SelectField value={boatType} onChange={setBoatType} options={BOAT_TYPES} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Usage Type</Label>
                    <SelectField value={usageType} onChange={setUsageType} options={USAGE_TYPES} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Year Built</Label>
                    <Input type="number" min={1900} max={2030} value={yearBuilt}
                      onChange={(e) => setYearBuilt(e.target.value)} placeholder="e.g. 2018" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Builder / Brand</Label>
                    <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Sunseeker" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Model</Label>
                    <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Manhattan 52" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Registration No.</Label>
                    <Input value={registrationNumber} onChange={(e) => setReg(e.target.value)} placeholder="TH-KS-XXXX-XXX" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>HIN (Hull ID)</Label>
                    <Input value={hin} onChange={(e) => setHin(e.target.value)} placeholder="Hull identification number" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Flag / Country</Label>
                    <Input value={flag} onChange={(e) => setFlag(e.target.value)} placeholder="Thailand" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Dimensions &amp; Hull</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    { label: "LOA (ft) *",   value: loaFt,   set: setLoaFt,   placeholder: "e.g. 52.0" },
                    { label: "Beam (ft)",    value: beamFt,  set: setBeamFt,  placeholder: "e.g. 15.2" },
                    { label: "Draft (ft) *", value: draftFt, set: setDraftFt, placeholder: "e.g. 4.5" },
                    { label: "Weight (T)",   value: weightT, set: setWeightT, placeholder: "e.g. 18.5" },
                  ].map(({ label, value, set, placeholder }) => (
                    <div key={label} className="space-y-1.5">
                      <Label>{label}</Label>
                      <Input type="number" min={0} step="0.1" value={value}
                        onChange={(e) => set(e.target.value)} placeholder={placeholder} />
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <Label>Hull Material</Label>
                    <SimpleSelect value={hullMaterial} onChange={setHullMaterial} options={HULL_MATERIALS} />
                  </div>
                  <div className="space-y-1.5 flex flex-col justify-end">
                    <div className="flex items-center gap-2 mt-auto pb-2">
                      <input id="trailer" type="checkbox" checked={trailerRequired}
                        onChange={(e) => setTrailer(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600" />
                      <label htmlFor="trailer" className="text-sm text-gray-700 cursor-pointer">Trailer required</label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Engine &amp; Propulsion</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Engine Type</Label>
                    <SimpleSelect value={engineType} onChange={setEngineType} options={ENGINE_TYPES} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Engine Brand / Model</Label>
                    <Input value={engineBrand} onChange={(e) => setEngineBrand(e.target.value)}
                      placeholder="e.g. Volvo Penta D6" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>No. of Engines</Label>
                    <Input type="number" min={0} max={6} value={numEngines}
                      onChange={(e) => setNumEngines(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fuel Type</Label>
                    <SimpleSelect value={fuelType} onChange={setFuelType} options={FUEL_TYPES} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle>Insurance</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Insurance Expiry Date</Label>
                  <Input type="date" value={insuranceExpiry} onChange={(e) => setInsurance(e.target.value)} />
                  <p className="text-xs text-gray-400">System alerts at 60 days before expiry</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Special Handling</CardTitle></CardHeader>
              <CardContent>
                <textarea
                  value={specialHandling}
                  onChange={(e) => setSpecial(e.target.value)}
                  rows={3}
                  placeholder="e.g. Keel extension — needs extra clearance when hauling out…"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-y"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Internal Notes</CardTitle></CardHeader>
              <CardContent>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Staff notes — not visible to owner…"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-y"
                />
              </CardContent>
            </Card>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
              <p className="font-medium mb-1 text-gray-700">Current Location</p>
              <p className="font-mono text-sm text-gray-800">{boat.current_location_code ?? "—"}</p>
              <p className="mt-1">To change the boat&apos;s berth or storage, use the <Link href="/berths" className="text-teal-600 hover:underline">Berths</Link> page.</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" asChild>
                <Link href={`/boats/${id}`}>Cancel</Link>
              </Button>
              <Button variant="teal" className="flex-1 gap-2" type="submit" form="boat-edit-form" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ship className="h-4 w-4" />}
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
