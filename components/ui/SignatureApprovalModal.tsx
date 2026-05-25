"use client"
import React, { useState } from "react"
import { Loader2, CheckCircle2, PenLine } from "lucide-react"
import { SignaturePadComponent } from "@/components/ui/SignaturePad"
import { formatTHB } from "@/lib/utils"

interface QuotationSummary {
  id: string
  quote_number: string
  title: string | null
  customer_name: string | null
  total_amount: number
}

interface SignatureApprovalModalProps {
  quotation: QuotationSummary
  onClose: () => void
  onApproved: (updatedQuotation: Record<string, unknown>) => void
}

type Step = "sign" | "saving" | "success"

export function SignatureApprovalModal({
  quotation,
  onClose,
  onApproved,
}: SignatureApprovalModalProps) {
  const [step, setStep] = useState<Step>("sign")
  const [agreed, setAgreed] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [approvedByName, setApprovedByName] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleConfirmSignature(dataUrl: string) {
    if (!agreed) {
      setError("Please agree to the terms and conditions before signing.")
      return
    }
    if (!approvedByName.trim()) {
      setError("Please enter your full name.")
      return
    }
    setSignatureData(dataUrl)
    setError(null)
    setStep("saving")

    try {
      const res = await fetch(`/api/db/quotations/${quotation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          signature_data: dataUrl,
          approved_by_name: approvedByName.trim(),
          approved_at: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Failed to save")
      onApproved(data)
      setStep("success")
    } catch (e) {
      setError("Failed to save signature: " + String(e))
      setStep("sign")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden">
        {/* Header */}
        <div className="bg-teal-600 px-6 py-4 flex items-center gap-3">
          <PenLine className="h-5 w-5 text-white" />
          <div>
            <h2 className="font-semibold text-white text-lg">Approve Quotation</h2>
            <p className="text-xs text-teal-100">Digital signature confirmation</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {step === "success" ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center text-center py-4 space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
                <CheckCircle2 className="h-8 w-8 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Quotation Approved</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {quotation.quote_number} has been approved successfully.
                </p>
              </div>
              {signatureData && (
                <div className="w-full">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Signature on File
                  </p>
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={signatureData}
                      alt="Customer signature"
                      className="max-h-24 mx-auto"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 text-center">
                    Signed by: {approvedByName} · {new Date().toLocaleDateString("en-GB")}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 font-medium"
              >
                Close
              </button>
            </div>
          ) : (
            /* ── Sign state ── */
            <>
              {/* Quotation summary */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Quotation</span>
                  <span className="font-mono font-medium text-gray-900">{quotation.quote_number}</span>
                </div>
                {quotation.title && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Title</span>
                    <span className="font-medium text-gray-900 text-right max-w-[60%]">{quotation.title}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-medium text-gray-900">{quotation.customer_name ?? "—"}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1">
                  <span className="text-sm font-semibold text-gray-700">Total Amount</span>
                  <span className="font-bold text-teal-700">{formatTHB(quotation.total_amount)}</span>
                </div>
              </div>

              {/* Full name field */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Your Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={approvedByName}
                  onChange={(e) => setApprovedByName(e.target.value)}
                  placeholder="Enter your full name"
                  disabled={step === "saving"}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                />
              </div>

              {/* Signature pad */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Signature <span className="text-red-500">*</span>
                </label>
                {step === "saving" ? (
                  <div className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg h-[200px] bg-gray-50 text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" /> Saving…
                  </div>
                ) : (
                  <SignaturePadComponent
                    onSave={handleConfirmSignature}
                    onClear={() => setError(null)}
                    width={500}
                    height={200}
                  />
                )}
              </div>

              {/* Terms checkbox */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked)
                    setError(null)
                  }}
                  disabled={step === "saving"}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-teal-600"
                />
                <span className="text-xs text-gray-600 leading-relaxed">
                  I have read and agree to the terms and conditions of this quotation. I understand that
                  my digital signature constitutes a legally binding acceptance of the stated services
                  and amounts.
                </span>
              </label>

              {error && (
                <p className="text-sm text-red-600 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  {error}
                </p>
              )}

              {/* Cancel button (Confirm is inside SignaturePad) */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={step === "saving"}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
