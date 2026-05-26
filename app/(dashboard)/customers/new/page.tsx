"use client"
import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const CUSTOMER_TYPES = [
  { value: "PRIVATE_OWNER",      label: "Private Owner" },
  { value: "CHARTER_OPERATOR",   label: "Charter Operator" },
  { value: "SPEEDBOAT_OPERATOR", label: "Speedboat Operator" },
  { value: "YACHT_BROKER",       label: "Yacht Broker" },
  { value: "CONTRACTOR",         label: "Contractor" },
  { value: "SUPPLIER",           label: "Supplier" },
]

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "th", label: "Thai (ภาษาไทย)" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "zh", label: "Chinese" },
  { value: "sv", label: "Swedish" },
  { value: "other", label: "Other" },
]

function FormField({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {!required && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function SelectField({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export default function NewCustomerPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [customerType, setCustomerType]     = useState("PRIVATE_OWNER")
  const [firstName, setFirstName]           = useState("")
  const [lastName, setLastName]             = useState("")
  const [companyName, setCompanyName]       = useState("")
  const [nationality, setNationality]       = useState("")
  const [phone, setPhone]                   = useState("")
  const [email, setEmail]                   = useState("")
  const [address, setAddress]               = useState("")
  const [taxId, setTaxId]                   = useState("")
  const [passportId, setPassportId]         = useState("")
  const [preferredLang, setPreferredLang]   = useState("en")
  const [paymentTerms, setPaymentTerms]     = useState("30")
  const [creditLimit, setCreditLimit]       = useState("")
  const [emergencyContact, setEmergencyContact] = useState("")
  const [riskFlag, setRiskFlag]             = useState(false)
  const [notes, setNotes]                   = useState("")

  const isCompany = ["CHARTER_OPERATOR","SPEEDBOAT_OPERATOR","YACHT_BROKER","CONTRACTOR","SUPPLIER"].includes(customerType)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        customer_type:     customerType,
        first_name:        firstName || null,
        last_name:         lastName || null,
        company_name:      companyName || null,
        nationality:       nationality || null,
        phone:             phone || null,
        email:             email || null,
        address:           address || null,
        tax_id:            taxId || null,
        passport_id:       passportId || null,
        preferred_language: preferredLang || null,
        payment_terms:     paymentTerms ? parseInt(paymentTerms) : null,
        credit_limit:      creditLimit ? parseFloat(creditLimit) : null,
        notes:             [
          notes.trim(),
          emergencyContact.trim() ? `Emergency contact: ${emergencyContact.trim()}` : "",
          riskFlag ? "Risk flag: yes" : "",
        ].filter(Boolean).join("\n") || null,
        status:            "ACTIVE",
      }
      const res = await fetch("/api/db/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Save failed")
      router.push(data?.id ? `/customers/${data.id}` : "/customers")
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Register New Customer"
        breadcrumb={[{ label: "Customers", href: "/customers" }, { label: "New" }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild><Link href="/customers">Cancel</Link></Button>
            <Button size="sm" variant="teal" form="customer-form" type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />{saving ? "Saving…" : "Save Customer"}
            </Button>
          </div>
        }
      />

      <form id="customer-form" onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: identity */}
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Customer Type" required>
                  <SelectField value={customerType} onChange={setCustomerType} options={CUSTOMER_TYPES} />
                </FormField>

                {isCompany ? (
                  <FormField label="Company Name" required>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Samui Blue Horizon Charter Co., Ltd." required />
                  </FormField>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="First Name" required>
                      <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" required />
                    </FormField>
                    <FormField label="Last Name" required>
                      <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" required />
                    </FormField>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Nationality">
                    <Input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="e.g. British, Thai, Swedish" />
                  </FormField>
                  <FormField label="Preferred Language">
                    <SelectField value={preferredLang} onChange={setPreferredLang} options={LANGUAGES} />
                  </FormField>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Phone" required>
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+66 81 234 5678" required />
                  </FormField>
                  <FormField label="Email">
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
                  </FormField>
                </div>
                <FormField label="Address">
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    placeholder="Street, district, city, province, postal code"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-y"
                  />
                </FormField>
                <FormField label="Emergency Contact">
                  <Input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="Name — +66 XX XXX XXXX" />
                </FormField>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {isCompany ? (
                    <FormField label="Tax ID / Company Reg." hint="13-digit tax ID for Thai companies">
                      <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="0105XXXXXXXXX" />
                    </FormField>
                  ) : (
                    <FormField label="Passport / National ID">
                      <Input value={passportId} onChange={(e) => setPassportId(e.target.value)} placeholder="Passport number" />
                    </FormField>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: billing + notes */}
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle>Billing & Credit</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Payment Terms (days)" hint="Net-30 = invoice due within 30 days">
                  <Input type="number" min={0} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="30" />
                </FormField>
                <FormField label="Credit Limit (฿)" hint="0 = no credit extended">
                  <Input type="number" min={0} step={10000} value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="e.g. 500000" />
                </FormField>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Internal Notes</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Notes">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Internal notes — not visible to customer…"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-y"
                  />
                </FormField>

                <div className="flex items-start gap-3">
                  <input
                    id="risk-flag"
                    type="checkbox"
                    checked={riskFlag}
                    onChange={(e) => setRiskFlag(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                  />
                  <div>
                    <label htmlFor="risk-flag" className="text-sm font-medium text-gray-700 cursor-pointer">Risk Flag</label>
                    <p className="text-xs text-gray-400 mt-0.5">Mark this customer for extra attention — shows alert on their profile and invoices.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" asChild><Link href="/customers">Cancel</Link></Button>
              <Button variant="teal" className="flex-1 gap-2" type="submit" form="customer-form" disabled={saving}>
                <Save className="h-4 w-4" />{saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
