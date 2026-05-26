"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Database, Save, Ship } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Customer } from "@/lib/supabase"

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

type BoatSpec = {
  id: string
  brand: string
  model: string
  boat_type?: string | null
  boat_category?: string | null
  propulsion_type?: string | null
  loa_ft?: number | null
  beam_ft?: number | null
  draft_ft?: number | null
  weight_t?: number | null
  ramp_trailer_relevance?: string | null
  notes?: string | null
}

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

export default function NewBoatPage() {
  const router = useRouter()
  const [saving,          setSaving]          = useState(false)
  const [customers,       setCustomers]       = useState<Customer[]>([])
  const [customersLoading,setCustomersLoading]= useState(true)
  const [customersError,  setCustomersError]  = useState<string | null>(null)
  const [boatSpecs,       setBoatSpecs]       = useState<BoatSpec[]>([])
  const [selectedSpecId,  setSelectedSpecId]  = useState("")

  useEffect(() => {
    fetch("/api/db/customers")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setCustomers(d)
        } else if (d?.error) {
          setCustomersError(d.error)
          console.error("Customers load error:", d.error)
        }
      })
      .catch((e) => {
        setCustomersError(String(e))
        console.error("Customers fetch failed:", e)
      })
      .finally(() => setCustomersLoading(false))
    fetch("/api/db/boat-specs?limit=1000")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setBoatSpecs(d) })
      .catch(() => {})
  }, [])

  // Identity
  const [ownerId, setOwnerId]             = useState("")
  const [name, setName]                   = useState("")
  const [boatType, setBoatType]           = useState("MOTOR_YACHT")
  const [usageType, setUsageType]         = useState("private")
  const [registrationNumber, setReg]      = useState("")
  const [hin, setHin]                     = useState("")
  const [flag, setFlag]                   = useState("Thailand")
  const [yearBuilt, setYearBuilt]         = useState("")

  // Specs
  const [brand, setBrand]                 = useState("")
  const [model, setModel]                 = useState("")
  const [loaFt, setLoaFt]                 = useState("")
  const [beamFt, setBeamFt]               = useState("")
  const [draftFt, setDraftFt]             = useState("")
  const [weightT, setWeightT]             = useState("")
  const [hullMaterial, setHullMaterial]   = useState("fiberglass")
  const [trailerRequired, setTrailer]     = useState(false)

  // Engine
  const [engineType, setEngineType]       = useState("inboard")
  const [engineBrand, setEngineBrand]     = useState("")
  const [numEngines, setNumEngines]       = useState("1")
  const [fuelType, setFuelType]           = useState("diesel")

  // Documents
  const [insuranceExpiry, setInsurance]   = useState("")
  const [specialHandling, setSpecial]     = useState("")
  const [notes, setNotes]                 = useState("")

  function applyBoatSpec(specId: string) {
    setSelectedSpecId(specId)
    const spec = boatSpecs.find((item) => item.id === specId)
    if (!spec) return

    setBrand(spec.brand ?? "")
    setModel(spec.model ?? "")
    setBoatType(spec.boat_type ?? "OTHER")
    setLoaFt(spec.loa_ft != null ? String(spec.loa_ft) : "")
    setBeamFt(spec.beam_ft != null ? String(spec.beam_ft) : "")
    setDraftFt(spec.draft_ft != null ? String(spec.draft_ft) : "")
    setWeightT(spec.weight_t != null ? String(spec.weight_t) : "")
    setTrailer(spec.ramp_trailer_relevance === "High")

    const propulsion = (spec.propulsion_type ?? "").toLowerCase()
    if (propulsion.includes("outboard")) setEngineType("outboard")
    else if (propulsion.includes("jet")) setEngineType("jet")
    else if (propulsion.includes("stern")) setEngineType("sterndrive")
    else if (propulsion.includes("electric")) setEngineType("electric")
    else if (propulsion.includes("sail")) setEngineType("sail-only")
    else if (propulsion) setEngineType("inboard")

    if (!name) setName(`${spec.brand} ${spec.model}`)
    setNotes((current) => {
      const specNote = `Spec template: ${spec.id}${spec.boat_category ? `, ${spec.boat_category}` : ""}${spec.notes ? `. ${spec.notes}` : ""}`
      return current ? `${current}\n${specNote}` : specNote
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        owner_id: ownerId || null,
        name: name || null,
        boat_type: boatType || null,
        usage_type: usageType || null,
        registration_number: registrationNumber || null,
        hin: hin || null,
        flag: flag || null,
        year_built: yearBuilt ? parseInt(yearBuilt) : null,
        brand: brand || null,
        model: model || null,
        loa_ft: loaFt ? parseFloat(loaFt) : null,
        beam_ft: beamFt ? parseFloat(beamFt) : null,
        draft_ft: draftFt ? parseFloat(draftFt) : null,
        weight_t: weightT ? parseFloat(weightT) : null,
        hull_material: hullMaterial || null,
        trailer_required: trailerRequired,
        engine_type: engineType || null,
        engine_brand: engineBrand || null,
        num_engines: numEngines ? parseInt(numEngines) : null,
        fuel_type: fuelType || null,
        insurance_expiry: insuranceExpiry || null,
        special_handling: specialHandling || null,
        notes: notes || null,
        status: "active",
      }
      const res = await fetch("/api/db/boats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Save failed")
      router.push(data?.id ? `/boats/${data.id}` : "/boats")
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Register New Boat"
        breadcrumb={[{ label: "Boats", href: "/boats" }, { label: "Register" }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild><Link href="/boats">Cancel</Link></Button>
            <Button size="sm" variant="teal" form="boat-form" type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />{saving ? "Saving…" : "Register Boat"}
            </Button>
          </div>
        }
      />

      <form id="boat-form" onSubmit={handleSubmit}>
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
                    {customersLoading ? (
                      <select disabled className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-400">
                        <option>Loading customers…</option>
                      </select>
                    ) : (
                      <SelectField value={ownerId} onChange={setOwnerId} placeholder="— Select owner —"
                        options={customers.map((c) => ({
                          value: c.id,
                          label: c.company_name ?? ([c.first_name, c.last_name].filter(Boolean).join(" ") || c.id),
                        }))} />
                    )}
                    {customersError && (
                      <p className="text-xs text-red-500 mt-1">Failed to load customers: {customersError}</p>
                    )}
                    {!customersLoading && !customersError && customers.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">No customers found. <a href="/customers/new" className="underline">Add a customer first.</a></p>
                    )}
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
                    <Input type="number" min={1900} max={2030} value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} placeholder="e.g. 2018" />
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
                    { label: "LOA (ft) *",  value: loaFt,    set: setLoaFt,   placeholder: "e.g. 52.0" },
                    { label: "Beam (ft)",   value: beamFt,   set: setBeamFt,  placeholder: "e.g. 15.2" },
                    { label: "Draft (ft) *",value: draftFt,  set: setDraftFt, placeholder: "e.g. 4.5" },
                    { label: "Weight (T)",  value: weightT,  set: setWeightT, placeholder: "e.g. 18.5" },
                  ].map(({ label, value, set, placeholder }) => (
                    <div key={label} className="space-y-1.5">
                      <Label>{label}</Label>
                      <Input type="number" min={0} step="0.1" value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} />
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <Label>Hull Material</Label>
                    <SimpleSelect value={hullMaterial} onChange={setHullMaterial} options={HULL_MATERIALS} />
                  </div>
                  <div className="space-y-1.5 flex flex-col justify-end">
                    <div className="flex items-center gap-2 mt-auto pb-2">
                      <input id="trailer" type="checkbox" checked={trailerRequired} onChange={(e) => setTrailer(e.target.checked)}
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
                    <Input value={engineBrand} onChange={(e) => setEngineBrand(e.target.value)} placeholder="e.g. Volvo Penta D6" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>No. of Engines</Label>
                    <Input type="number" min={0} max={6} value={numEngines} onChange={(e) => setNumEngines(e.target.value)} />
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
              <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-4 w-4 text-teal-700" />Spec Template</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Prefill from boat spec database</Label>
                  <select
                    value={selectedSpecId}
                    onChange={(e) => applyBoatSpec(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">- Select model template -</option>
                    {boatSpecs.map((spec) => (
                      <option key={spec.id} value={spec.id}>
                        {spec.brand} {spec.model}{spec.loa_ft ? ` - ${spec.loa_ft} ft` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500">
                  Fills brand, model, dimensions, weight, boat type, and trailer flag. You can edit everything before saving.
                </p>
                <Link href="/boat-specs" className="inline-flex text-xs font-medium text-teal-700 hover:underline">
                  Manage spec database
                </Link>
              </CardContent>
            </Card>

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

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
              <p className="font-medium mb-1">After registering:</p>
              <p>Assign a berth or storage slot from the Berths page to set the boat&apos;s initial location.</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" asChild><Link href="/boats">Cancel</Link></Button>
              <Button variant="teal" className="flex-1 gap-2" type="submit" form="boat-form" disabled={saving}>
                <Ship className="h-4 w-4" />{saving ? "Saving…" : "Register"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
