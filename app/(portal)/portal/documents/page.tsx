"use client"
import React, { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Upload, FileText, CheckCircle2, AlertTriangle, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"

const MY_DOCS = [
  {
    boat: "Sea Hawk",
    boatId: "boat-001",
    docs: [
      { id: "d1", name: "Registration Certificate", type: "registration", expiry: "2027-03-01", status: "valid",    file: "registration_seahawk_2027.pdf" },
      { id: "d2", name: "Insurance Policy",          type: "insurance",    expiry: "2026-08-31", status: "expiring", file: "insurance_seahawk_2026.pdf"    },
      { id: "d3", name: "Survey Report",             type: "survey",       expiry: "2027-12-01", status: "valid",    file: "survey_seahawk_2025.pdf"       },
    ],
  },
  {
    boat: "Blue Diamond",
    boatId: "boat-002",
    docs: [
      { id: "d4", name: "Registration Certificate", type: "registration", expiry: "2026-09-15", status: "valid",  file: "registration_bluediamond.pdf" },
      { id: "d5", name: "Insurance Policy",          type: "insurance",    expiry: "2026-12-15", status: "valid",  file: "insurance_bluediamond_2026.pdf" },
    ],
  },
]

const DOC_TYPES = [
  { value: "registration", label: "Registration Certificate" },
  { value: "insurance",    label: "Insurance Policy"         },
  { value: "survey",       label: "Survey / Tonnage Report"  },
  { value: "other",        label: "Other Document"           },
]

interface UploadedFile {
  boat: string
  docType: string
  file: File
}

export default function PortalDocumentsPage() {
  const [uploads, setUploads] = useState<UploadedFile[]>([])
  const [selectedBoat, setSelectedBoat] = useState("boat-001")
  const [docType, setDocType]           = useState("insurance")
  const [uploadFile, setUploadFile]     = useState<File | null>(null)
  const [success, setSuccess]           = useState(false)

  function handleUpload() {
    if (!uploadFile) return
    setUploads((prev) => [...prev, { boat: selectedBoat, docType, file: uploadFile }])
    setUploadFile(null)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500">Boat registrations, insurance policies, survey reports</p>
        </div>
        <Link href="/portal">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </Link>
      </div>

      {/* ── Existing Documents ─────────────────────────────────────────────── */}
      {MY_DOCS.map((group) => (
        <Card key={group.boatId}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{group.boat}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {group.docs.map((doc) => {
                const isExpiring = doc.status === "expiring"
                return (
                  <div key={doc.id} className="flex items-center gap-4 py-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isExpiring ? "bg-amber-100" : "bg-green-100"
                    }`}>
                      {isExpiring
                        ? <AlertTriangle className="h-4 w-4 text-amber-600" />
                        : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                      <p className="text-xs text-gray-400">Expiry: {formatDate(doc.expiry)} · {doc.file}</p>
                    </div>
                    {isExpiring && (
                      <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 shrink-0">
                        Expiring soon
                      </span>
                    )}
                    <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs gap-1">
                      <FileText className="h-3 w-3" /> View
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* ── Upload New Document ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-teal-600" /> Upload New Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">For Boat</label>
              <select
                value={selectedBoat}
                onChange={(e) => setSelectedBoat(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {MY_DOCS.map((g) => (
                  <option key={g.boatId} value={g.boatId}>{g.boat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div
            className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center cursor-pointer hover:border-teal-400 transition-colors"
            onClick={() => document.getElementById("doc-upload")?.click()}
          >
            {uploadFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                <span className="text-sm text-teal-700 font-medium">{uploadFile.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setUploadFile(null) }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to select file</p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPEG, PNG — max 10MB</p>
              </>
            )}
            <input
              id="doc-upload"
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {success && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" /> Document uploaded successfully.
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={!uploadFile}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
            >
              <Upload className="h-4 w-4" /> Upload Document
            </Button>
          </div>

          {/* Recently uploaded */}
          {uploads.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">This Session</p>
              <div className="space-y-2">
                {uploads.map((u, i) => (
                  <div key={i} className="flex items-center gap-3 rounded bg-green-50 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{u.file.name}</p>
                      <p className="text-xs text-gray-400">
                        {MY_DOCS.find((g) => g.boatId === u.boat)?.boat} · {DOC_TYPES.find((t) => t.value === u.docType)?.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
