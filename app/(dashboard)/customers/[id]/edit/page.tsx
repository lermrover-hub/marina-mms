"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Save, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Customer } from "@/lib/supabase"

const CUSTOMER_TYPES = [
  { value: "PRIVATE_OWNER",      label: "Private Owner" },
  { value: "CHARTER_OPERATOR",   label: "Charter Operator" },
  { value: "SPEEDBOAT_OPERATOR", label: "Speedboat Operator" },
  { value: "YACHT_BROKER",       label: "Yacht Broker" },
  { value: "CONTRACTOR",         label: "Contractor" },
  { value: "SUPPLIER",           label: "Supplier" },
]

const LANGUAGES = [
  { value: "en",    label: "English" },
  { value: "th",    label: "Thai" },
  { value: "de",    label: "German" },
  { value: "fr",    label: "French" },
  { value: "zh",    label: "Chinese" },
  { value: "sv",    label: "Swedish" },
  { value: "other", label: "Other" },
]

function SelectField({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""
  const router = useRouter()

  const [customer,     setCustomer]     = useState<Customer | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState<string | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [saveError,    setSaveError]    = useState<string | null>(null)

  // Form fields
  const [customerType,  setCustomerType]  = useState("PRIVATE_OWNER")
  const [firstName,     setFirstName]     = useState("")
  const [lastName,      setLastName]      = useState("")
  const [companyName,   setCompanyName]   = useState("")
  const [nationality,   setNationality]   = useState("")
  const [phone,         setPhone]         = useState("")
  const [email,         setEmail]         = useState("")
  const [lineUserId,    setLineUserId]    = useState("")
  const [whatsappNumber,setWhatsappNumber]= useState("")
  const [address,       setAddress]       = useState("")
  const [preferredLang, setPreferredLang] = useState("en")
  const [paymentTerms,  setPaymentTerms]  = useState("30")
  const [creditLimit,   setCreditLimit]   = useState("")
  const [notes,         setNotes]         = useState("")

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/db/customers/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d?.error) { setLoadError("Customer not found"); return }
        setCustomer(d)
        // Pre-fill fields
        setCustomerType(d.customer_type ?? "PRIVATE_OWNER")
        setFirstName(d.first_name ?? "")
        setLastName(d.last_name ?? "")
        setCompanyName(d.company_name ?? "")
        setNationality(d.nationality ?? "")
        setPhone(d.phone ?? "")
        setEmail(d.email ?? "")
        setLineUserId(d.line_user_id ?? "")
        setWhatsappNumber(d.whatsapp_number ?? "")
        setAddress(d.address ?? "")
        setPreferredLang(d.preferred_language ?? "en")
        setPaymentTerms(String(d.payment_terms ?? 30))
        setCreditLimit(d.credit_limit ? String(d.credit_limit) : "")
        setNotes(d.notes ?? "")
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

  if (loadError || !customer) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-gray-500">{loadError ?? "Customer not found"}</p>
        <Link href="/customers" className="text-sm text-teal-600 hover:underline mt-2">← Back</Link>
      </div>
    )
  }

  const displayName = customer.company_name ?? ([customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer")
  const isCompany = ["CHARTER_OPERATOR", "SPEEDBOAT_OPERATOR", "YACHT_BROKER", "CONTRACTOR", "SUPPLIER"].includes(customerType)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const body: Partial<Customer> = {
        customer_type:      customerType,
        first_name:         isCompany ? null : firstName || null,
        last_name:          isCompany ? null : lastName || null,
        company_name:       isCompany ? companyName || null : null,
        nationality:        nationality || null,
        phone:              phone || null,
        email:              email || null,
        line_user_id:       lineUserId || null,
        whatsapp_number:    whatsappNumber || null,
        address:            address || null,
        preferred_language: preferredLang || null,
        payment_terms:      paymentTerms ? parseInt(paymentTerms) : null,
        credit_limit:       creditLimit ? parseFloat(creditLimit) : null,
        notes:              notes || null,
      }
      const res = await fetch(`/api/db/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Save failed")
      router.push(`/customers/${id}`)
    } catch (e) {
      setSaveError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit — ${displayName}`}
        breadcrumb={[
          { label: "Customers", href: "/customers" },
          { label: displayName, href: `/customers/${id}` },
          { label: "Edit" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/customers/${id}`}>Cancel</Link>
            </Button>
            <Button size="sm" variant="teal" form="edit-customer-form" type="submit" disabled={saving} className="gap-2">
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

      <form id="edit-customer-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Customer Type</Label>
                  <SelectField value={customerType} onChange={setCustomerType} options={CUSTOMER_TYPES} />
                </div>

                {isCompany ? (
                  <div className="space-y-1.5">
                    <Label>Company Name <span className="text-red-500">*</span></Label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>First Name <span className="text-red-500">*</span></Label>
                      <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Last Name <span className="text-red-500">*</span></Label>
                      <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nationality</Label>
                    <Input value={nationality} onChange={(e) => setNationality(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Preferred Language</Label>
                    <SelectField value={preferredLang} onChange={setPreferredLang} options={LANGUAGES} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Phone <span className="text-red-500">*</span></Label>
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>LINE ID</Label>
                    <Input value={lineUserId} onChange={(e) => setLineUserId(e.target.value)} placeholder="@lineid" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>WhatsApp</Label>
                    <Input type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+66 82 878 9149" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-y"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle>Billing</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Payment Terms (days)</Label>
                  <Input type="number" min={0} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Credit Limit (฿)</Label>
                  <Input type="number" min={0} step={10000} value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Internal notes…"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-y"
                />
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" asChild>
                <Link href={`/customers/${id}`}>Cancel</Link>
              </Button>
              <Button variant="teal" className="flex-1 gap-2" type="submit" form="edit-customer-form" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
