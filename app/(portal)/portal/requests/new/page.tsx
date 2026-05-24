"use client"
import React, { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const MY_BOATS = [
  { id: "boat-001", name: "Sea Hawk",     type: "Motor Yacht",  loa: "52ft" },
  { id: "boat-002", name: "Blue Diamond", type: "Sailing Yacht", loa: "44ft" },
]

const SERVICE_TYPES = [
  "Engine / Mechanical",
  "Electrical",
  "Fiberglass / Hull Repair",
  "Painting / Antifouling",
  "Canvas / Upholstery",
  "Cleaning / Detailing",
  "Plumbing",
  "Air Conditioning",
  "Generator",
  "Other",
]

const PRIORITY_OPTIONS = [
  { value: "LOW",    label: "Low — no rush",             color: "border-gray-300 text-gray-600"  },
  { value: "NORMAL", label: "Normal — within 2 weeks",   color: "border-blue-300 text-blue-600"  },
  { value: "HIGH",   label: "High — within a few days",  color: "border-orange-300 text-orange-700" },
  { value: "URGENT", label: "Urgent — ASAP",             color: "border-red-300 text-red-700"    },
]

export default function PortalNewRequestPage() {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [boatId, setBoatId]           = useState("")
  const [serviceType, setServiceType] = useState("")
  const [priority, setPriority]       = useState("NORMAL")
  const [description, setDescription] = useState("")
  const [preferredDate, setDate]      = useState("")
  const [budgetHint, setBudget]       = useState("")
  const [extraNote, setExtraNote]     = useState("")
  const [photos, setPhotos]           = useState<File[]>([])

  const isValid = boatId && serviceType && description.trim().length > 15

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 1000))
    setSubmitting(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Service Request Submitted!</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Your request has been received. Our team will review it and contact you within 1 business day.
          You will receive a reference number by email.
        </p>
        <div className="flex gap-3 mt-4">
          <Link href="/portal/requests">
            <Button variant="outline">View All Requests</Button>
          </Link>
          <Link href="/portal">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Service Request</h1>
          <p className="text-sm text-gray-500">Tell us what needs to be done</p>
        </div>
        <Link href="/portal/requests">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Boat */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Which boat?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MY_BOATS.map((boat) => (
                <button
                  key={boat.id}
                  type="button"
                  onClick={() => setBoatId(boat.id)}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    boatId === boat.id
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="font-semibold text-gray-900">{boat.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{boat.type} · {boat.loa}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Service type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Type of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {SERVICE_TYPES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setServiceType(s)}
                  className={`rounded-lg border px-3 py-2 text-sm text-left transition-all ${
                    serviceType === s
                      ? "border-teal-500 bg-teal-50 text-teal-700 font-medium"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Priority / Urgency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`w-full rounded-lg border-2 px-4 py-2.5 text-sm text-left transition-all ${
                    priority === p.value
                      ? `${p.color} ring-2 ring-offset-1 ring-current border-current`
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Problem Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="space-y-1.5">
              <Label>
                Describe the issue <span className="text-red-500">*</span>
              </Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Please describe the problem in detail. What symptoms do you see? When does it happen? How long has it been occurring?"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                required
              />
              <p className="text-xs text-gray-400">{description.length} chars (min 15)</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Preferred Service Date</Label>
                <Input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Budget (THB, optional)</Label>
                <Input
                  type="number"
                  min="0"
                  value={budgetHint}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Your budget expectation"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Additional Notes</Label>
              <textarea
                value={extraNote}
                onChange={(e) => setExtraNote(e.target.value)}
                rows={2}
                placeholder="Any special instructions, access notes, previous repair history…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {/* Photo upload */}
            <div className="space-y-1.5">
              <Label>Photos / Evidence (optional)</Label>
              <div
                className="rounded-lg border-2 border-dashed border-gray-300 p-5 text-center cursor-pointer hover:border-teal-400 transition-colors"
                onClick={() => document.getElementById("photo-upload")?.click()}
              >
                {photos.length > 0 ? (
                  <p className="text-sm text-teal-700">{photos.length} photo(s) selected</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">Click to attach photos of the issue</p>
                    <p className="text-xs text-gray-400 mt-1">JPEG or PNG, up to 5 files</p>
                  </>
                )}
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
                />
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pb-8">
          <Link href="/portal/requests">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button
            type="submit"
            disabled={!isValid || submitting}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Submitting…" : "Submit Request"}
          </Button>
        </div>

      </form>
    </div>
  )
}
