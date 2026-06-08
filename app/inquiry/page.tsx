"use client"
import React, { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Anchor, Ship, Waves, Wrench, MapPin, Calendar,
  Phone, Mail, ChevronRight, CheckCircle2,
  AlertTriangle, Info,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceCategory =
  | "RAMP_LAUNCH"
  | "RAMP_RETRIEVAL"
  | "WET_BERTH"
  | "DRY_STORAGE"
  | "BOAT_REPAIR"
  | "OTHER"

type BoatType = "SPEEDBOAT" | "MOTOR_YACHT" | "SAILING_YACHT" | "CATAMARAN" | "PWC" | "OTHER"

interface InquiryForm {
  // Contact
  fullName: string
  company: string
  phone: string
  email: string
  preferredContact: "PHONE" | "EMAIL" | "LINE"
  lineId: string

  // Boat
  boatName: string
  boatType: BoatType | ""
  boatLoa: string
  boatBeam: string
  boatDraft: string
  engineCount: string
  boatYear: string

  // Service
  serviceCategory: ServiceCategory | ""
  preferredDate: string
  preferredTime: string
  durationDays: string
  message: string

  // Acknowledgement
  acceptTerms: boolean
}

const EMPTY_FORM: InquiryForm = {
  fullName: "", company: "", phone: "", email: "",
  preferredContact: "PHONE", lineId: "",
  boatName: "", boatType: "", boatLoa: "", boatBeam: "", boatDraft: "",
  engineCount: "", boatYear: "",
  serviceCategory: "", preferredDate: "", preferredTime: "",
  durationDays: "", message: "",
  acceptTerms: false,
}

// ─── Service cards ────────────────────────────────────────────────────────────

const SERVICE_OPTIONS: {
  value: ServiceCategory
  label: string
  labelTh: string
  icon: React.ElementType
  desc: string
  color: string
}[] = [
  {
    value: "RAMP_LAUNCH",
    label: "Launch",
    labelTh: "นำเรือลงน้ำ",
    icon: Waves,
    desc: "Bring your vessel into the water via our managed ramp.",
    color: "border-teal-300 bg-teal-50 hover:border-teal-500",
  },
  {
    value: "RAMP_RETRIEVAL",
    label: "Retrieval",
    labelTh: "นำเรือขึ้นบก",
    icon: Anchor,
    desc: "Pull your vessel out of the water and onto land.",
    color: "border-blue-300 bg-blue-50 hover:border-blue-500",
  },
  {
    value: "WET_BERTH",
    label: "Wet Berth",
    labelTh: "จอดเรือในน้ำ",
    icon: Ship,
    desc: "Monthly or annual berth in our protected marina basin.",
    color: "border-cyan-300 bg-cyan-50 hover:border-cyan-500",
  },
  {
    value: "DRY_STORAGE",
    label: "Dry Storage",
    labelTh: "จอดเรือบนบก",
    icon: MapPin,
    desc: "Safe dry-land storage on our secured hardstand yard.",
    color: "border-orange-300 bg-orange-50 hover:border-orange-500",
  },
  {
    value: "BOAT_REPAIR",
    label: "Repair / Service",
    labelTh: "ซ่อมบำรุงเรือ",
    icon: Wrench,
    desc: "Engine, hull, electrical, paint, fiberglass, canvas & more.",
    color: "border-purple-300 bg-purple-50 hover:border-purple-500",
  },
  {
    value: "OTHER",
    label: "Other / General",
    labelTh: "สอบถามทั่วไป",
    icon: Info,
    desc: "Fuel, cleaning, charter, survey, or any other enquiry.",
    color: "border-gray-300 bg-gray-50 hover:border-gray-400",
  },
]

const BOAT_TYPES: { value: BoatType; label: string }[] = [
  { value: "SPEEDBOAT",    label: "Speedboat / Center Console" },
  { value: "MOTOR_YACHT",  label: "Motor Yacht" },
  { value: "SAILING_YACHT",label: "Sailing Yacht" },
  { value: "CATAMARAN",    label: "Catamaran (Power or Sail)" },
  { value: "PWC",          label: "Personal Watercraft / Jet Ski" },
  { value: "OTHER",        label: "Other" },
]

const PREFERRED_TIME_OPTIONS = [
  "06:00 – 08:00", "08:00 – 10:00", "10:00 – 12:00",
  "12:00 – 14:00", "14:00 – 16:00", "16:00 – 18:00",
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function FieldInput({
  value,
  onChange,
  placeholder,
  type = "text",
  min,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  min?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
    />
  )
}

function FieldSelect({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
    >
      {children}
    </select>
  )
}

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = ["Service", "Your Boat", "Contact", "Review"]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const step = i + 1
        const done = current > step
        const active = current === step
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  done
                    ? "bg-teal-600 border-teal-600 text-white"
                    : active
                    ? "bg-white border-teal-600 text-teal-600"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : step}
              </div>
              <span
                className={`mt-1 text-xs font-medium ${
                  active ? "text-teal-700" : done ? "text-teal-500" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-12 mx-1 mb-5 transition-all ${
                  current > step ? "bg-teal-500" : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BookingInquiryPage() {
  const [form, setForm]       = useState<InquiryForm>(EMPTY_FORM)
  const [step, setStep]       = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors]   = useState<Partial<Record<keyof InquiryForm, string>>>({})

  const set = (key: keyof InquiryForm, value: InquiryForm[keyof InquiryForm]) =>
    setForm((f) => ({ ...f, [key]: value }))

  // ── validation ──────────────────────────────────────────────────────────────

  function validateStep(s: number): boolean {
    const e: typeof errors = {}

    if (s === 1) {
      if (!form.serviceCategory) e.serviceCategory = "Please select a service."
    }
    if (s === 2) {
      if (!form.boatName.trim()) e.boatName = "Boat name is required."
      if (!form.boatType)        e.boatType = "Please select boat type."
      if (!form.boatLoa.trim())  e.boatLoa  = "LOA is required."
    }
    if (s === 3) {
      if (!form.fullName.trim()) e.fullName = "Your name is required."
      if (!form.phone.trim() && !form.email.trim())
        e.phone = "Please provide at least one contact (phone or email)."
      if (!form.preferredDate)   e.preferredDate = "Please select a preferred date."
      if (!form.acceptTerms)     e.acceptTerms = "Please accept the terms."
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (validateStep(step)) setStep((s) => s + 1)
  }

  function back() {
    setErrors({})
    setStep((s) => s - 1)
  }

  async function submit() {
    if (!validateStep(3)) return
    setSubmitting(true)

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error("Inquiry submit failed:", err)
      }
    } catch (err) {
      console.error("Inquiry network error:", err)
    }

    setSubmitting(false)
    setSubmitted(true)
  }

  // ── success ──────────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <PageShell>
        <div className="max-w-lg mx-auto text-center py-16 px-4">
          <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Inquiry Submitted!</h2>
          <p className="text-gray-500 mb-1">
            Thank you, <span className="font-semibold text-gray-700">{form.fullName || "Captain"}</span>.
          </p>
          <p className="text-gray-500 mb-6">
            Our team will review your{" "}
            <span className="font-medium text-teal-700">
              {SERVICE_OPTIONS.find((o) => o.value === form.serviceCategory)?.label ?? "service"}
            </span>{" "}
            inquiry and contact you within <strong>1 business day</strong>.
          </p>

          <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-left mb-8 text-sm text-teal-800 space-y-1">
            <div className="font-semibold mb-2">Inquiry Summary</div>
            <div className="flex justify-between">
              <span className="text-teal-600">Boat</span>
              <span>{form.boatName} ({form.boatLoa} ft LOA)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-teal-600">Service</span>
              <span>{SERVICE_OPTIONS.find((o) => o.value === form.serviceCategory)?.label}</span>
            </div>
            {form.preferredDate && (
              <div className="flex justify-between">
                <span className="text-teal-600">Preferred date</span>
                <span>{form.preferredDate}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-teal-600">Contact</span>
              <span>{form.phone || form.email}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => { setForm(EMPTY_FORM); setStep(1); setSubmitted(false) }}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
            >
              Submit another inquiry
            </button>
            <Link
              href="/portal"
              className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              Go to Customer Portal
            </Link>
          </div>
        </div>
      </PageShell>
    )
  }

  // ── form steps ───────────────────────────────────────────────────────────────

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <StepIndicator current={step} />

        {/* Step 1 — Service Selection */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">What service do you need?</h2>
            <p className="text-gray-500 text-sm mb-6">
              Select the type of service you would like to request.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {SERVICE_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const selected = form.serviceCategory === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("serviceCategory", opt.value)}
                    className={`text-left rounded-xl border-2 p-4 transition-all ${
                      selected
                        ? "border-teal-500 bg-teal-50 ring-2 ring-teal-200"
                        : opt.color
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          selected ? "bg-teal-600 text-white" : "bg-white text-gray-600"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{opt.label}</div>
                        <div className="text-xs text-gray-500">{opt.labelTh}</div>
                      </div>
                      {selected && (
                        <CheckCircle2 className="h-5 w-5 text-teal-600 ml-auto" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{opt.desc}</p>
                  </button>
                )
              })}
            </div>

            {errors.serviceCategory && (
              <p className="text-red-500 text-sm mb-4">{errors.serviceCategory}</p>
            )}

            {/* Ramp info callout */}
            {(form.serviceCategory === "RAMP_LAUNCH" ||
              form.serviceCategory === "RAMP_RETRIEVAL") && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Ramp operations are subject to <strong>tidal conditions</strong>. We will
                  confirm a safe time window after reviewing your vessel draft and the tide
                  table for your preferred date.
                </span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={next}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors"
              >
                Next: Boat Details <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Boat Details */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Tell us about your vessel</h2>
            <p className="text-gray-500 text-sm mb-6">
              We use these dimensions to check berth / ramp compatibility and prepare an accurate quote.
            </p>

            <div className="space-y-5">
              {/* Boat name + type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Boat Name</Label>
                  <FieldInput
                    value={form.boatName}
                    onChange={(v) => set("boatName", v)}
                    placeholder="e.g. Sea Hawk"
                  />
                  {errors.boatName && <p className="text-red-500 text-xs mt-1">{errors.boatName}</p>}
                </div>
                <div>
                  <Label required>Boat Type</Label>
                  <FieldSelect value={form.boatType} onChange={(v) => set("boatType", v as BoatType)}>
                    <option value="">— Select —</option>
                    {BOAT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </FieldSelect>
                  {errors.boatType && <p className="text-red-500 text-xs mt-1">{errors.boatType}</p>}
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Ship className="h-4 w-4 text-teal-600" /> Vessel Dimensions
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label required>LOA (ft)</Label>
                    <FieldInput
                      value={form.boatLoa}
                      onChange={(v) => set("boatLoa", v)}
                      placeholder="e.g. 32"
                      type="number"
                    />
                    {errors.boatLoa && <p className="text-red-500 text-xs mt-1">{errors.boatLoa}</p>}
                  </div>
                  <div>
                    <Label>Beam (ft)</Label>
                    <FieldInput
                      value={form.boatBeam}
                      onChange={(v) => set("boatBeam", v)}
                      placeholder="e.g. 9"
                      type="number"
                    />
                  </div>
                  <div>
                    <Label>Draft (ft)</Label>
                    <FieldInput
                      value={form.boatDraft}
                      onChange={(v) => set("boatDraft", v)}
                      placeholder="e.g. 2.5"
                      type="number"
                    />
                  </div>
                  <div>
                    <Label>No. of Engines</Label>
                    <FieldSelect value={form.engineCount} onChange={(v) => set("engineCount", v)}>
                      <option value="">—</option>
                      {["1", "2", "3", "4"].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </FieldSelect>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  LOA = Length Overall. Draft required for ramp tide safety check.
                </p>
              </div>

              {/* Year built */}
              <div className="w-40">
                <Label>Year Built</Label>
                <FieldInput
                  value={form.boatYear}
                  onChange={(v) => set("boatYear", v)}
                  placeholder="e.g. 2018"
                  type="number"
                />
              </div>

              {/* Repair scope — extra field when repair selected */}
              {form.serviceCategory === "BOAT_REPAIR" && (
                <div>
                  <Label>Describe the repair / service needed</Label>
                  <textarea
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    rows={4}
                    placeholder="e.g. Engine won't start, hull osmosis blisters, full antifouling repaint..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={back}
                className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={next}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors"
              >
                Next: Contact Info <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Contact + Scheduling */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Contact & Scheduling</h2>
            <p className="text-gray-500 text-sm mb-6">
              We&#39;ll confirm availability and send you a quotation before any charges apply.
            </p>

            <div className="space-y-5">
              {/* Name + company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Your Full Name</Label>
                  <FieldInput
                    value={form.fullName}
                    onChange={(v) => set("fullName", v)}
                    placeholder="e.g. Somchai Rakdee"
                  />
                  {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                </div>
                <div>
                  <Label>Company / Charter Name</Label>
                  <FieldInput
                    value={form.company}
                    onChange={(v) => set("company", v)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Phone + email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Phone Number</Label>
                  <FieldInput
                    value={form.phone}
                    onChange={(v) => set("phone", v)}
                    placeholder="+66 8x xxx xxxx"
                    type="tel"
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <Label>Email Address</Label>
                  <FieldInput
                    value={form.email}
                    onChange={(v) => set("email", v)}
                    placeholder="you@example.com"
                    type="email"
                  />
                </div>
              </div>

              {/* Preferred contact method */}
              <div>
                <Label>Preferred Contact Method</Label>
                <div className="flex gap-3">
                  {(["PHONE", "EMAIL", "LINE"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => set("preferredContact", m)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                        form.preferredContact === m
                          ? "border-teal-500 bg-teal-600 text-white"
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {m === "PHONE" ? "📞 Phone" : m === "EMAIL" ? "✉️ Email" : "💬 LINE"}
                    </button>
                  ))}
                </div>
              </div>

              {form.preferredContact === "LINE" && (
                <div>
                  <Label>LINE ID</Label>
                  <FieldInput
                    value={form.lineId}
                    onChange={(v) => set("lineId", v)}
                    placeholder="e.g. @somchai"
                  />
                </div>
              )}

              {/* Scheduling */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                <div className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-teal-600" /> Preferred Schedule
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label required>Preferred Date</Label>
                    <FieldInput
                      value={form.preferredDate}
                      onChange={(v) => set("preferredDate", v)}
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                    />
                    {errors.preferredDate && (
                      <p className="text-red-500 text-xs mt-1">{errors.preferredDate}</p>
                    )}
                  </div>
                  <div>
                    <Label>Preferred Time</Label>
                    <FieldSelect value={form.preferredTime} onChange={(v) => set("preferredTime", v)}>
                      <option value="">Any time</option>
                      {PREFERRED_TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </FieldSelect>
                  </div>
                </div>

                {(form.serviceCategory === "WET_BERTH" ||
                  form.serviceCategory === "DRY_STORAGE") && (
                  <div className="w-40">
                    <Label>Duration (days / months)</Label>
                    <FieldInput
                      value={form.durationDays}
                      onChange={(v) => set("durationDays", v)}
                      placeholder="e.g. 30"
                      type="number"
                    />
                  </div>
                )}
              </div>

              {/* Additional notes — for non-repair (repair gets it in step 2) */}
              {form.serviceCategory !== "BOAT_REPAIR" && (
                <div>
                  <Label>Additional Notes</Label>
                  <textarea
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    rows={3}
                    placeholder="Any special requirements, current boat location, known issues..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors resize-none"
                  />
                </div>
              )}

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={(e) => set("acceptTerms", e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs text-gray-600">
                  I confirm the vessel details are accurate and I agree that this inquiry is a{" "}
                  <strong>request for quotation only</strong> — no reservation is confirmed until
                  Palm Beach Samui Asset Co., Ltd. sends a written confirmation.
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="text-red-500 text-xs">{errors.acceptTerms}</p>
              )}
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={back}
                className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={next}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors"
              >
                Review Inquiry <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Review & Submit */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Review Your Inquiry</h2>
            <p className="text-gray-500 text-sm mb-6">
              Please check the details below before submitting.
            </p>

            <div className="space-y-4 mb-8">
              <ReviewCard title="Service Requested">
                <ReviewRow
                  label="Service"
                  value={SERVICE_OPTIONS.find((o) => o.value === form.serviceCategory)?.label ?? "—"}
                />
                {form.preferredDate && (
                  <ReviewRow label="Preferred Date" value={form.preferredDate} />
                )}
                {form.preferredTime && (
                  <ReviewRow label="Preferred Time" value={form.preferredTime} />
                )}
                {form.durationDays && (
                  <ReviewRow label="Duration" value={`${form.durationDays} days`} />
                )}
              </ReviewCard>

              <ReviewCard title="Vessel">
                <ReviewRow label="Boat Name" value={form.boatName || "—"} />
                <ReviewRow
                  label="Type"
                  value={BOAT_TYPES.find((t) => t.value === form.boatType)?.label ?? "—"}
                />
                <ReviewRow label="LOA" value={form.boatLoa ? `${form.boatLoa} ft` : "—"} />
                {form.boatBeam  && <ReviewRow label="Beam"   value={`${form.boatBeam} ft`} />}
                {form.boatDraft && <ReviewRow label="Draft"  value={`${form.boatDraft} ft`} />}
                {form.engineCount && <ReviewRow label="Engines" value={form.engineCount} />}
                {form.boatYear  && <ReviewRow label="Year"   value={form.boatYear} />}
              </ReviewCard>

              <ReviewCard title="Contact">
                <ReviewRow label="Name"    value={form.fullName || "—"} />
                {form.company && <ReviewRow label="Company" value={form.company} />}
                {form.phone   && <ReviewRow label="Phone"   value={form.phone} />}
                {form.email   && <ReviewRow label="Email"   value={form.email} />}
                <ReviewRow
                  label="Preferred Contact"
                  value={form.preferredContact === "LINE" && form.lineId
                    ? `LINE: ${form.lineId}`
                    : form.preferredContact}
                />
              </ReviewCard>

              {form.message && (
                <ReviewCard title="Notes">
                  <p className="text-sm text-gray-700 leading-relaxed">{form.message}</p>
                </ReviewCard>
              )}
            </div>

            <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800 mb-6">
              <strong>What happens next?</strong> Our team will review your inquiry and contact
              you within <strong>1 business day</strong> to confirm availability and provide a
              quotation. No payment is required until you approve the quote.
            </div>

            <div className="flex justify-between">
              <button
                onClick={back}
                className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
              >
                Back &amp; Edit
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60 transition-colors"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Submit Inquiry
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}

// ─── Review helpers ───────────────────────────────────────────────────────────

function ReviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</span>
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right">{value}</span>
    </div>
  )
}

// ─── Page shell (header + footer, no sidebar) ─────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <Image
                src="/document-assets/header logo 2.jpeg"
                alt="Palm Beach Samui Logo"
                fill
                className="object-contain rounded"
                onError={() => {}}
              />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm leading-tight">
                Palm Beach Samui Asset Co., Ltd.
              </div>
              <div className="text-xs text-teal-600">Marina &amp; Boat Yard — Ko Samui</div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> 094-4563966
            </span>
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" /> info@palmbeachsamui.com
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-cyan-900 text-white py-10 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Anchor className="h-6 w-6 text-teal-300" />
            <span className="text-teal-300 text-sm font-medium tracking-wide uppercase">
              Booking Inquiry
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Request a Marina Service</h1>
          <p className="text-teal-200 text-sm max-w-md mx-auto">
            Launch, retrieval, berth rental, dry storage, or boat repair — tell us what you need
            and we&#39;ll get back to you with a confirmed quote within 1 business day.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <span>© 2026 Palm Beach Samui Asset Co., Ltd. | Tax ID 0845558004072</span>
          <span>26/24 Moo 4, Maenam, Koh Samui, Surat Thani 84330</span>
        </div>
      </footer>
    </div>
  )
}
