"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Bot, Building2, Users, Tag, FileText, Bell, ShieldCheck, Sliders, ChevronRight, Loader2, Upload, Download, Trash2, File, Receipt, PlayCircle, CheckCircle2, AlertTriangle, Globe, Mail, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import type { Staff, DocumentTemplate } from "@/lib/supabase"
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher"
import { useLocale } from "@/lib/i18n/LocaleContext"

type PricingRule = {
  id: string
  code: string
  serviceNameEn: string
  serviceNameTh: string | null
  category: string
  unit: string
  rateThb: number
  effectiveRate: number
  pilotRateThb: number | null
  isActive: boolean
}

const SETTING_GROUPS = [
  { id: "company",    label: "Company",           icon: Building2,  description: "Company profile, branding, and contact info" },
  { id: "users",      label: "Users & Roles",     icon: Users,      description: "Manage staff accounts and access control" },
  { id: "pricing",    label: "Pricing Rules",     icon: Tag,        description: "Service rates, packages, and markup rules" },
  { id: "billing",    label: "Recurring Billing", icon: Receipt,    description: "Auto-generate monthly invoices from active contracts" },
  { id: "documents",  label: "Templates",         icon: FileText,   description: "Invoice, quotation, and contract templates" },
  { id: "notify",     label: "Notifications",     icon: Bell,       description: "Alert triggers and delivery settings" },
  { id: "compliance", label: "Compliance",        icon: ShieldCheck,description: "Audit log, data retention, regulatory settings" },
  { id: "email",      label: "Email",             icon: Mail,       description: "Resend email integration and test" },
  { id: "language",   label: "Language & Region", icon: Globe,      description: "UI language, date format, and locale" },
  { id: "system",     label: "System",            icon: Sliders,    description: "VAT rate, currency, date format, locale" },
  { id: "ai_agent",  label: "AI Agent Rules",    icon: Bot,        description: "Configurable rules for quotation, comms, finance, tide, and marina agents" },
]

const ROLE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  ADMIN:      { label: "Admin",       color: "bg-red-100 text-red-700",      desc: "Full system access, settings, users" },
  MANAGER:    { label: "Manager",     color: "bg-purple-100 text-purple-700",desc: "Operations, approvals, reports" },
  ACCOUNTANT: { label: "Accountant",  color: "bg-blue-100 text-blue-700",    desc: "Invoices, payments, financial reports" },
  STAFF:      { label: "Staff",       color: "bg-teal-100 text-teal-700",    desc: "Operations, work orders, tasks" },
  TECHNICIAN: { label: "Technician",  color: "bg-orange-100 text-orange-700",desc: "Work orders and technical tasks" },
  SUPERVISOR: { label: "Supervisor",  color: "bg-indigo-100 text-indigo-700",desc: "Operations and team oversight" },
  SECURITY:   { label: "Security",    color: "bg-gray-100 text-gray-600",    desc: "Gate control and boat movements" },
}

// Template type labels
const TEMPLATE_TYPES: { type: string; label: string; description: string }[] = [
  { type: "INVOICE",          label: "Invoice",               description: "Standard tax invoice / ใบกำกับภาษี" },
  { type: "QUOTATION",        label: "Quotation",             description: "Service quotation / ใบเสนอราคา" },
  { type: "RECEIPT",          label: "Receipt",               description: "Payment receipt / ใบเสร็จรับเงิน" },
  { type: "CONTRACT_BERTH",   label: "Berth Contract",        description: "Wet berth rental contract" },
  { type: "CONTRACT_STORAGE", label: "Storage Contract",      description: "Dry storage rental contract" },
  { type: "WORK_ORDER",       label: "Work Order",            description: "Boat yard work order / ใบสั่งงาน" },
  { type: "RAMP_CONFIRM",     label: "Ramp Confirmation",     description: "Launch / retrieval confirmation" },
  { type: "INCIDENT",         label: "Incident Report",       description: "Safety incident report form" },
  { type: "OTHER",            label: "Other",                 description: "General purpose templates" },
]

// ─── AI Agent config types & field definitions ────────────────────────────────

type AgentConfigRow = {
  agent_id: string
  label: string
  config: Record<string, unknown>
  updated_at: string | null
  updated_by: string | null
}

type FieldDef = {
  key: string
  label: string
  type: "number" | "text" | "textarea" | "select"
  description?: string
  options?: { value: string; label: string }[]
  step?: number
}

const AGENT_FIELDS: Record<string, FieldDef[]> = {
  quotation: [
    { key: "vat_pct",            label: "VAT %",                  type: "number",   description: "Applied to all quotation totals (default: 7)" },
    { key: "deposit_pct",        label: "Deposit %",              type: "number",   description: "Default deposit required before starting work (default: 50)" },
    { key: "valid_days",         label: "Valid Days",             type: "number",   description: "Quotation expires after this many days (default: 7)" },
    { key: "extra_instructions", label: "Extra Instructions",     type: "textarea", description: "Additional rules appended to the agent's system prompt" },
  ],
  comms: [
    { key: "max_words",          label: "Max Response Words",     type: "number",   description: "Maximum length of agent replies (default: 150)" },
    { key: "language",           label: "Language Mode",          type: "select",
      options: [
        { value: "EN",                    label: "English only" },
        { value: "TH",                    label: "Thai only" },
        { value: "EN/TH bilingual-aware", label: "EN/TH bilingual-aware (default)" },
      ],
    },
    { key: "phone",              label: "Phone in Signature",     type: "text",     description: "Contact number added to the end of outgoing messages" },
    { key: "tone",               label: "Tone Instruction",       type: "text",     description: "e.g. warm, professional, friendly" },
    { key: "extra_instructions", label: "Extra Instructions",     type: "textarea", description: "Additional rules appended to the agent's system prompt" },
  ],
  finance: [
    { key: "overdue_warn_days",      label: "Overdue Warning (days)",      type: "number", description: "Create reminder when invoice is this many days overdue (default: 7)" },
    { key: "escalation_amount_thb",  label: "Escalation Threshold (฿)",    type: "number", description: "Notify manager when overdue amount exceeds this value" },
    { key: "extra_instructions",     label: "Extra Instructions",          type: "textarea", description: "Additional rules appended to the agent's system prompt" },
  ],
  tide: [
    { key: "ramp_offset_m",       label: "Ramp Depth Offset (m)",     type: "number", step: 0.1, description: "Ramp surface offset from tide-table zero — usually negative (default: −1.0)" },
    { key: "safety_clearance_m",  label: "Safety Clearance (m)",      type: "number", step: 0.1, description: "Minimum clearance added above the boat's draft (default: 0.8)" },
    { key: "trailer_height_m",    label: "Default Trailer Height (m)", type: "number", step: 0.1, description: "Assumed trailer/cradle height when not provided (default: 0.3)" },
  ],
  marina: [
    { key: "contract_expiry_warn_days",  label: "Contract Expiry Warning (days)",  type: "number", description: "Send alert this many days before a berth/storage contract expires" },
    { key: "insurance_expiry_warn_days", label: "Insurance Expiry Warning (days)", type: "number", description: "Send alert this many days before a boat's insurance expires" },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function SettingsPage() {
  const [activeGroup, setActiveGroup] = useState("company")
  const [staff, setStaff]             = useState<Staff[]>([])
  const [staffLoading, setStaffLoading] = useState(false)
  const { locale } = useLocale()

  const [pricingRules, setPricingRules] = useState<PricingRule[]>([])
  const [pricingLoading, setPricingLoading] = useState(false)
  const [pricingError, setPricingError] = useState<string | null>(null)

  // Document templates state
  const [templates,         setTemplates]         = useState<DocumentTemplate[]>([])
  const [templatesLoading,  setTemplatesLoading]  = useState(false)
  const [uploadingType,     setUploadingType]     = useState<string | null>(null)
  const [deletingId,        setDeletingId]        = useState<string | null>(null)
  const [templateError,     setTemplateError]     = useState<string | null>(null)

  // Recurring billing state
  const [billingPeriod,   setBillingPeriod]   = useState(() => new Date().toISOString().slice(0, 7))
  const [billingRunning,  setBillingRunning]  = useState(false)
  const [billingResult,   setBillingResult]   = useState<{ generated: number; skipped: number; invoices: object[]; skipped_detail: { contract_number: string; reason: string }[] } | null>(null)
  const [billingError,    setBillingError]    = useState<string | null>(null)
  const [billingDryRun,   setBillingDryRun]   = useState(true)

  // Email configuration state
  const [emailTestLoading,  setEmailTestLoading]  = useState(false)
  const [emailTestResult,   setEmailTestResult]   = useState<{ configured?: boolean; sent?: boolean; to?: string; id?: string; message?: string; error?: string } | null>(null)

  // AI Agent config state
  const [agentConfigs,     setAgentConfigs]     = useState<AgentConfigRow[]>([])
  const [agentDrafts,      setAgentDrafts]      = useState<Record<string, Record<string, unknown>>>({})
  const [agentConfigLoading, setAgentConfigLoading] = useState(false)
  const [agentSaving,      setAgentSaving]      = useState<string | null>(null)
  const [agentSaveMsg,     setAgentSaveMsg]      = useState<Record<string, "ok" | "error">>({})
  const [activeAgentTab,   setActiveAgentTab]    = useState("quotation")

  function showSettingsNotice(feature: string) {
    alert(`${feature} is not connected to a save API yet.`)
  }

  useEffect(() => {
    if (activeGroup === "users") {
      setStaffLoading(true)
      fetch("/api/db/staff")
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setStaff(d) })
        .catch(() => {})
        .finally(() => setStaffLoading(false))
    }
    if (activeGroup === "documents") {
      loadTemplates()
    }
    if (activeGroup === "pricing") {
      loadPricingRules()
    }
    if (activeGroup === "ai_agent") {
      loadAgentConfigs()
    }
  }, [activeGroup])

  function loadPricingRules() {
    setPricingLoading(true)
    setPricingError(null)
    fetch("/api/pricing-master?isActive=true")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d?.data)) setPricingRules(d.data)
        else throw new Error(d?.error ?? "Failed to load pricing")
      })
      .catch(() => setPricingError("Failed to load pricing master"))
      .finally(() => setPricingLoading(false))
  }

  function loadAgentConfigs() {
    setAgentConfigLoading(true)
    fetch("/api/db/agent-config")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setAgentConfigs(d)
          const drafts: Record<string, Record<string, unknown>> = {}
          d.forEach((row: AgentConfigRow) => { drafts[row.agent_id] = { ...row.config } })
          setAgentDrafts(drafts)
        }
      })
      .catch(() => {})
      .finally(() => setAgentConfigLoading(false))
  }

  async function saveAgentConfig(agentId: string) {
    setAgentSaving(agentId)
    setAgentSaveMsg(prev => { const n = { ...prev }; delete n[agentId]; return n })
    try {
      const res = await fetch("/api/db/agent-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, config: agentDrafts[agentId] ?? {} }),
      })
      if (!res.ok) throw new Error("Save failed")
      setAgentSaveMsg(prev => ({ ...prev, [agentId]: "ok" }))
      loadAgentConfigs()
    } catch {
      setAgentSaveMsg(prev => ({ ...prev, [agentId]: "error" }))
    } finally {
      setAgentSaving(null)
    }
  }

  function loadTemplates() {
    setTemplatesLoading(true)
    setTemplateError(null)
    fetch("/api/db/document-templates")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTemplates(d) })
      .catch(() => setTemplateError("Failed to load templates"))
      .finally(() => setTemplatesLoading(false))
  }

  async function handleUpload(templateType: string, file: File) {
    setUploadingType(templateType)
    setTemplateError(null)
    try {
      // 1. Upload file to Supabase Storage
      const storagePath = `${templateType.toLowerCase()}/${Date.now()}-${file.name}`
      const { data: storageData, error: storageErr } = await supabase.storage
        .from("mms-templates")
        .upload(storagePath, file, { upsert: false, contentType: file.type })
      if (storageErr) throw new Error(storageErr.message)

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from("mms-templates")
        .getPublicUrl(storageData.path)
      const publicUrl = urlData?.publicUrl ?? ""

      // 3. Save template record to DB
      const res = await fetch("/api/db/document-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_type: templateType,
          name:          `${TEMPLATE_TYPES.find(t => t.type === templateType)?.label ?? templateType} — Sample`,
          language:      "TH/EN",
          file_name:     file.name,
          file_url:      publicUrl,
          file_size:     file.size,
          mime_type:     file.type,
          uploaded_by:   "Admin",
          is_active:     true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Upload failed")

      loadTemplates()
    } catch (e) {
      setTemplateError(String(e))
    } finally {
      setUploadingType(null)
    }
  }

  async function handleDeleteTemplate(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/db/document-templates/${id}`, { method: "DELETE" })
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch {
      setTemplateError("Delete failed")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="System configuration and administration"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Settings nav */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-0.5">
                {SETTING_GROUPS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveGroup(id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      activeGroup === id
                        ? "bg-navy-600 text-white"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${activeGroup === id ? "text-white" : "text-gray-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                    </div>
                    <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${activeGroup === id ? "text-white/70" : "text-gray-300"}`} />
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings content */}
        <div className="lg:col-span-3 space-y-4">
          {activeGroup === "company" && (
            <Card>
              <CardHeader><CardTitle>Company Profile</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Company Name (English)</Label>
                    <Input defaultValue="Palm beach samui asset Co., Ltd." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Company Name (Thai)</Label>
                    <Input defaultValue="บริษัท ปาล์มบีช สมุย แอสเสท จำกัด" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tax ID / เลขนิติบุคคล</Label>
                    <Input defaultValue="0845558004072" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input defaultValue="+66 82 878 9149" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input defaultValue="info@oceanrovermarina.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Website</Label>
                    <Input defaultValue="www.oceanrovermarina.com" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Address (Thai)</Label>
                    <Input defaultValue="เลขที่ 26/24 ม.4 ต.แม่น้ำ อ.เกาะสมุย จ.สุราษฏร์ธานี 84330" />
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Bank Account</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Bank</Label>
                      <Input defaultValue="ธนาคารกรุงเทพ (BBL)" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Account Number</Label>
                      <Input defaultValue="691-300825-3" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Branch</Label>
                      <Input defaultValue="เซนทรัล หาดเฉวง" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>PromptPay</Label>
                      <Input defaultValue="082-878-9149" />
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => showSettingsNotice("Company settings")}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeGroup === "system" && (
            <Card>
              <CardHeader><CardTitle>System Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Default Currency</Label>
                    <Input defaultValue="THB" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>VAT Rate (%)</Label>
                    <Input defaultValue="7" type="number" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date Format</Label>
                    <Input defaultValue="DD/MM/YYYY" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Default Language</Label>
                    <Input defaultValue="en" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ramp Depth Offset (m)</Label>
                    <Input defaultValue="-1.00" type="number" step="0.1" />
                    <p className="text-xs text-gray-400">Used in tide safety calculations</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Insurance Alert Threshold (days)</Label>
                    <Input defaultValue="60" type="number" />
                    <p className="text-xs text-gray-400">Warn when insurance expires within this many days</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <Button size="sm" onClick={() => showSettingsNotice("System settings")}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeGroup === "users" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Staff & Access Control</CardTitle>
                <Button size="sm" variant="teal" className="gap-2" onClick={() => showSettingsNotice("Staff creation")}><span>+</span> Add Staff</Button>
              </CardHeader>
              <CardContent className="p-0">
                {staffLoading ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading staff…</span>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {staff.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                            No staff members found. Add staff to get started.
                          </td>
                        </tr>
                      ) : staff.map((u) => {
                        const roleKey = u.role?.toUpperCase() ?? ""
                        return (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3 font-medium text-gray-900">{u.name}</td>
                            <td className="px-5 py-3 text-gray-500 text-xs">{u.email ?? "—"}</td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_LABELS[roleKey]?.color ?? "bg-gray-100 text-gray-600"}`}>
                                {ROLE_LABELS[roleKey]?.label ?? u.role}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-gray-500 text-xs">{u.department ?? "—"}</td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                {u.active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <Button variant="ghost" size="sm" className="text-xs" onClick={() => showSettingsNotice("Staff editing")}>Edit</Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}

          {activeGroup === "pricing" && (
            <Card>
              <CardHeader>
                <CardTitle>Pricing Master</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Base rates for services and facilities</p>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
                      <th className="px-5 py-2.5 text-left">Category</th>
                      <th className="px-5 py-2.5 text-left">Item</th>
                      <th className="px-5 py-2.5 text-right">Price (THB)</th>
                      <th className="px-5 py-2.5 text-center">Unit</th>
                      <th className="px-5 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pricingLoading ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                          Loading pricing master...
                        </td>
                      </tr>
                    ) : pricingError ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-red-600">
                          {pricingError}
                        </td>
                      </tr>
                    ) : pricingRules.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                          No active pricing rules found.
                        </td>
                      </tr>
                    ) : pricingRules.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-5 py-2.5 text-gray-500 text-xs">{p.category}</td>
                        <td className="px-5 py-2.5 font-medium text-gray-900">{p.serviceNameEn}</td>
                        <td className="px-5 py-2.5 text-right font-medium">{p.effectiveRate.toLocaleString()}</td>
                        <td className="px-5 py-2.5 text-center text-gray-500">/{p.unit}</td>
                        <td className="px-5 py-2.5 text-right">
                          <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
                            <Link href="/pricing-master">Edit</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 py-3 border-t flex items-center justify-between">
                  <p className="text-xs text-gray-400">All prices exclude VAT (7%) unless marked</p>
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1" asChild>
                    <Link href="/pricing-master">+ Add Rate</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeGroup === "notify" && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Notification Triggers</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
                        <th className="px-5 py-2.5 text-left">Event</th>
                        <th className="px-5 py-2.5 text-center">In-App</th>
                        <th className="px-5 py-2.5 text-center">Email</th>
                        <th className="px-5 py-2.5 text-left">Recipients</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[
                        { event: "Invoice Overdue",              inApp: true,  email: true,  roles: "Admin, Accountant" },
                        { event: "Insurance Expiry (60 days)",   inApp: true,  email: true,  roles: "Admin, Manager" },
                        { event: "Berth Contract Renewal (30d)", inApp: true,  email: false, roles: "Admin, Manager" },
                        { event: "New Service Request",          inApp: true,  email: false, roles: "Manager, Staff" },
                        { event: "Work Order Status Change",     inApp: true,  email: false, roles: "Manager" },
                        { event: "Quotation Accepted",           inApp: true,  email: true,  roles: "Admin, Manager" },
                        { event: "Payment Received",             inApp: true,  email: true,  roles: "Admin, Accountant" },
                        { event: "Job Completed",                inApp: true,  email: true,  roles: "Admin, Manager" },
                        { event: "Low Inventory Alert",          inApp: true,  email: false, roles: "Manager, Staff" },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-5 py-2.5 font-medium text-gray-900">{row.event}</td>
                          <td className="px-5 py-2.5 text-center">
                            <span className={`inline-block h-4 w-4 rounded border-2 ${row.inApp ? "border-teal-500 bg-teal-500" : "border-gray-300"}`}>
                              {row.inApp && <span className="block w-full text-center text-white text-[10px] leading-none mt-px">✓</span>}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-center">
                            <span className={`inline-block h-4 w-4 rounded border-2 ${row.email ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}>
                              {row.email && <span className="block w-full text-center text-white text-[10px] leading-none mt-px">✓</span>}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-xs text-gray-500">{row.roles}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-5 py-3 border-t">
                    <Button size="sm" onClick={() => showSettingsNotice("Notification settings")}>Save Notification Settings</Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Email Delivery</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>SMTP Host</Label>
                      <Input defaultValue="smtp.gmail.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>SMTP Port</Label>
                      <Input defaultValue="587" type="number" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>From Email</Label>
                      <Input defaultValue="noreply@oceanrovermarina.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>From Name</Label>
                      <Input defaultValue="Ocean Rover Marina" />
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => showSettingsNotice("SMTP test email")}>Test Email</Button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeGroup === "billing" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-teal-500" />
                    Recurring Invoice Generator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    Automatically generates invoices for all <strong>ACTIVE</strong> contracts based on their billing cycle.
                    Each contract period can only be invoiced once — duplicates are prevented automatically.
                  </div>

                  {/* Period selector */}
                  <div className="flex items-end gap-4 flex-wrap">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Billing Period (YYYY-MM)</label>
                      <input
                        type="month"
                        value={billingPeriod}
                        onChange={e => { setBillingPeriod(e.target.value); setBillingResult(null); setBillingError(null) }}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="dryrun" checked={billingDryRun}
                        onChange={e => setBillingDryRun(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600" />
                      <label htmlFor="dryrun" className="text-sm text-gray-700">Dry run (preview only — no invoices created)</label>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <Button
                      variant={billingDryRun ? "outline" : "teal"}
                      className="gap-2"
                      disabled={billingRunning}
                      onClick={async () => {
                        setBillingRunning(true)
                        setBillingResult(null)
                        setBillingError(null)
                        try {
                          const url = `/api/billing/recurring?period=${billingPeriod}${billingDryRun ? "&dry_run=true" : ""}`
                          const res = await fetch(url, { method: "POST" })
                          const data = await res.json()
                          if (!res.ok) throw new Error(data?.error ?? "Failed")
                          setBillingResult(data)
                        } catch (e) { setBillingError(String(e)) }
                        finally { setBillingRunning(false) }
                      }}
                    >
                      {billingRunning
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <PlayCircle className="h-4 w-4" />}
                      {billingDryRun ? "Preview Invoices" : "Generate Invoices"}
                    </Button>
                  </div>

                  {/* Error */}
                  {billingError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {billingError}
                    </div>
                  )}

                  {/* Results */}
                  {billingResult && (
                    <div className="space-y-3">
                      <div className="flex gap-4 flex-wrap">
                        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-center min-w-[120px]">
                          <div className="text-2xl font-bold text-green-700">{billingResult.generated}</div>
                          <div className="text-xs text-green-600 mt-0.5">{billingDryRun ? "Would generate" : "Invoices created"}</div>
                        </div>
                        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-center min-w-[120px]">
                          <div className="text-2xl font-bold text-gray-600">{billingResult.skipped}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Skipped</div>
                        </div>
                      </div>

                      {/* Generated list */}
                      {billingResult.invoices && billingResult.invoices.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            {billingDryRun ? "Would be generated" : "Generated"}
                          </div>
                          <div className="space-y-1.5">
                            {(billingResult.invoices as Record<string, unknown>[]).map((inv, i) => (
                              <div key={i} className="flex justify-between text-sm bg-green-50 border border-green-100 rounded px-3 py-2">
                                <span className="font-medium text-gray-800">
                                  {(inv.invoice_number as string) ?? (inv.contract_number as string)}
                                </span>
                                <span className="text-gray-600">
                                  {(inv.customer_name as string) ?? "—"} · {(inv.total_amount as number)?.toLocaleString() ?? ""} THB
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Skipped list */}
                      {billingResult.skipped_detail && billingResult.skipped_detail.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Skipped</div>
                          <div className="space-y-1">
                            {billingResult.skipped_detail.map((s, i) => (
                              <div key={i} className="flex justify-between text-xs bg-gray-50 border border-gray-100 rounded px-3 py-1.5">
                                <span className="font-medium text-gray-700">{s.contract_number}</span>
                                <span className="text-gray-400">{s.reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeGroup === "documents" && (
            <div className="space-y-4">
              {/* Info banner */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-start gap-3">
                <FileText className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Document Template Library</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Upload your sample PDF or Word documents here. The system will use them as references for generating
                    formatted documents. Supported formats: PDF, Word (.docx), JPEG, PNG. Max size: 10 MB.
                  </p>
                </div>
              </div>

              {templateError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {templateError}
                </div>
              )}

              {templatesLoading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading templates…</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {TEMPLATE_TYPES.map(({ type, label, description }) => {
                    const typeTemplates = templates.filter(t => t.template_type === type)
                    const isUploading   = uploadingType === type
                    return (
                      <Card key={type}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                                <span className="font-semibold text-gray-900 text-sm">{label}</span>
                                <span className="text-xs text-gray-400">{description}</span>
                              </div>

                              {/* Uploaded files list */}
                              {typeTemplates.length > 0 ? (
                                <div className="mt-2 space-y-1.5">
                                  {typeTemplates.map(tpl => (
                                    <div key={tpl.id} className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                                      <File className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                      <span className="text-xs font-medium text-gray-700 flex-1 truncate">{tpl.file_name ?? tpl.name}</span>
                                      {tpl.file_size && (
                                        <span className="text-xs text-gray-400 shrink-0">{formatBytes(tpl.file_size)}</span>
                                      )}
                                      <span className={`text-xs rounded-full px-2 py-0.5 shrink-0 ${tpl.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                        {tpl.is_active ? "Active" : "Inactive"}
                                      </span>
                                      {tpl.file_url && (
                                        <a
                                          href={tpl.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="shrink-0 text-teal-600 hover:text-teal-700"
                                          title="Download / Preview"
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                        </a>
                                      )}
                                      <button
                                        onClick={() => handleDeleteTemplate(tpl.id)}
                                        disabled={deletingId === tpl.id}
                                        className="shrink-0 text-red-400 hover:text-red-600 disabled:opacity-50"
                                        title="Delete template"
                                      >
                                        {deletingId === tpl.id
                                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          : <Trash2 className="h-3.5 w-3.5" />
                                        }
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-1 text-xs text-gray-400">No template uploaded yet</p>
                              )}
                            </div>

                            {/* Upload button */}
                            <div className="shrink-0">
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                                  disabled={isUploading}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleUpload(type, file)
                                    e.target.value = ""
                                  }}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 pointer-events-none"
                                  disabled={isUploading}
                                  asChild
                                >
                                  <span>
                                    {isUploading
                                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
                                      : <><Upload className="h-3.5 w-3.5" /> Upload Sample</>
                                    }
                                  </span>
                                </Button>
                              </label>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeGroup === "language" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-teal-500" />
                    Language &amp; Region
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">UI Language / ภาษาระบบ</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Choose the display language for navigation, labels, and system messages.
                        ตั้งค่าภาษาที่ใช้แสดงผลในระบบ
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <LanguageSwitcher />
                      <span className="text-sm text-gray-500">
                        {locale === "en" ? "Currently: English" : "ปัจจุบัน: ภาษาไทย"}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Regional Format</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Date Format</Label>
                        <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <option value="DD/MM/YYYY">DD/MM/YYYY (Thai standard)</option>
                          <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Currency</Label>
                        <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <option value="THB">THB — Thai Baht (฿)</option>
                          <option value="USD">USD — US Dollar ($)</option>
                          <option value="EUR">EUR — Euro (€)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Time Zone</Label>
                        <Input defaultValue="Asia/Bangkok (UTC+7)" readOnly className="bg-gray-50" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Number Format</Label>
                        <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <option value="1,234.56">1,234.56 (comma thousands)</option>
                          <option value="1.234,56">1.234,56 (dot thousands)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-teal-100 bg-teal-50 p-4">
                    <p className="text-xs text-teal-700">
                      <span className="font-semibold">Bilingual support:</span> This system supports both Thai and English
                      throughout the UI. Document templates can be generated in Thai, English, or bilingual format.
                      ระบบรองรับทั้งภาษาไทยและอังกฤษ สามารถออกเอกสารได้ทั้งสองภาษา
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => showSettingsNotice("Region settings")}>Save Region Settings</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeGroup === "email" && (
            <div className="space-y-4">
              {/* Status card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-teal-500" />
                    Email Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Provider info */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Email Provider</Label>
                      <div className="flex items-center gap-2 rounded-md border border-input bg-gray-50 px-3 py-2 text-sm text-gray-700">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        Resend
                        <a
                          href="https://resend.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-xs text-teal-600 hover:underline"
                        >
                          resend.com &#8599;
                        </a>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Environment Variable</Label>
                      <div className="flex items-center rounded-md border border-input bg-gray-50 px-3 py-2 text-sm text-gray-500 font-mono">
                        RESEND_API_KEY
                      </div>
                    </div>
                  </div>

                  {/* Info banner */}
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm flex items-start gap-3 text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">API Key Status (Server-Side Only)</p>
                      <p className="text-xs mt-0.5 text-amber-700">
                        The <code className="bg-amber-100 px-1 rounded">RESEND_API_KEY</code> is read server-side only and cannot be displayed here.
                        Use the &ldquo;Send Test Email&rdquo; button to verify configuration.
                        If no key is set, emails are gracefully logged to console instead of sending.
                      </p>
                    </div>
                  </div>

                  {/* Automated triggers list */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Automated Email Triggers</p>
                    <div className="rounded-lg border border-gray-100 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
                            <th className="px-4 py-2.5 text-left">Event</th>
                            <th className="px-4 py-2.5 text-left">Trigger</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {[
                            { event: "Invoice Issued",            trigger: "POST /api/db/invoices" },
                            { event: "Quotation Sent",            trigger: "POST /api/db/quotations" },
                            { event: "Payment Confirmed",         trigger: "POST /api/email/send" },
                            { event: "Work Order Status Update",  trigger: "POST /api/email/send" },
                            { event: "Contract Expiring Soon",    trigger: "POST /api/email/send" },
                            { event: "Welcome Customer Portal",   trigger: "POST /api/email/send" },
                          ].map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-medium text-gray-800">{row.event}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{row.trigger}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Test email */}
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Send Test Email</p>
                    <p className="text-xs text-gray-500">
                      Sends a sample invoice email to the address in <code className="bg-gray-100 px-1 rounded">EMAIL_TEST_TO</code>.
                      Verifies your Resend API key is working correctly.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      disabled={emailTestLoading}
                      onClick={async () => {
                        setEmailTestLoading(true)
                        setEmailTestResult(null)
                        try {
                          const res = await fetch("/api/email/test")
                          const d = await res.json()
                          setEmailTestResult(d)
                        } catch (e) {
                          setEmailTestResult({ error: String(e) })
                        } finally {
                          setEmailTestLoading(false)
                        }
                      }}
                    >
                      {emailTestLoading
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending&#8230;</>
                        : <><Mail className="h-3.5 w-3.5" /> Send Test Email</>
                      }
                    </Button>

                    {emailTestResult && (
                      <div
                        className={`rounded-lg border px-4 py-3 text-sm flex items-start gap-2 ${
                          emailTestResult.error
                            ? "border-red-200 bg-red-50 text-red-700"
                            : emailTestResult.configured === false
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : emailTestResult.sent
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {emailTestResult.error || !emailTestResult.configured || !emailTestResult.sent ? (
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium">
                            {emailTestResult.error
                              ? "Error"
                              : emailTestResult.configured === false
                              ? "Not Configured"
                              : emailTestResult.sent
                              ? "Test Email Sent"
                              : "Send Failed"}
                          </p>
                          <p className="text-xs mt-0.5 opacity-80">
                            {emailTestResult.message ?? emailTestResult.error ?? ""}
                          </p>
                          {emailTestResult.id && (
                            <p className="text-xs mt-1 font-mono opacity-60">ID: {emailTestResult.id}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Setup instructions */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    <p className="font-semibold mb-1.5">Setup Instructions</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-blue-600">
                      <li>
                        Create a free account at{" "}
                        <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">
                          resend.com
                        </a>
                      </li>
                      <li>Generate an API key in the Resend dashboard under API Keys</li>
                      <li>
                        Add <code className="bg-blue-100 px-1 rounded">RESEND_API_KEY=re_xxx</code> to your{" "}
                        <code className="bg-blue-100 px-1 rounded">.env.local</code> file or Vercel Environment Variables
                      </li>
                      <li>
                        Optionally set <code className="bg-blue-100 px-1 rounded">EMAIL_FROM</code> (sender address) and{" "}
                        <code className="bg-blue-100 px-1 rounded">EMAIL_TEST_TO</code> (test recipient)
                      </li>
                      <li>Restart the dev server and click &ldquo;Send Test Email&rdquo; to verify</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeGroup === "ai_agent" && (
            <div className="space-y-4">
              {/* Info banner */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-start gap-3">
                <Bot className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">AI Agent Rules</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Rules are stored in the database and loaded by each agent on its next run.
                    Changes here take effect immediately — no code deployment required.
                  </p>
                </div>
              </div>

              {agentConfigLoading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading agent configuration…</span>
                </div>
              ) : agentConfigs.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  No agent config found. Run the database migration to create the <code className="bg-amber-100 px-1 rounded">mms_agent_config</code> table.
                </div>
              ) : (
                <Card>
                  {/* Sub-tabs */}
                  <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50 rounded-t-lg">
                    {agentConfigs.map((cfg) => (
                      <button
                        key={cfg.agent_id}
                        onClick={() => { setActiveAgentTab(cfg.agent_id); setAgentSaveMsg({}) }}
                        className={`shrink-0 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                          activeAgentTab === cfg.agent_id
                            ? "border-teal-600 text-teal-700 bg-white"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/60"
                        }`}
                      >
                        {cfg.label}
                      </button>
                    ))}
                  </div>

                  {agentConfigs.map((cfg) => {
                    if (activeAgentTab !== cfg.agent_id) return null
                    const fields = AGENT_FIELDS[cfg.agent_id] ?? []
                    const draft  = agentDrafts[cfg.agent_id] ?? {}
                    const saving = agentSaving === cfg.agent_id
                    const msg    = agentSaveMsg[cfg.agent_id]

                    function setField(key: string, value: unknown) {
                      setAgentDrafts(prev => ({
                        ...prev,
                        [cfg.agent_id]: { ...prev[cfg.agent_id], [key]: value },
                      }))
                    }

                    return (
                      <CardContent key={cfg.agent_id} className="space-y-5 p-6">
                        {/* Updated-at info */}
                        {cfg.updated_at && (
                          <p className="text-xs text-gray-400">
                            Last saved: {new Date(cfg.updated_at).toLocaleString("en-GB")}
                            {cfg.updated_by ? ` by ${cfg.updated_by}` : ""}
                          </p>
                        )}

                        {/* Fields */}
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                          {fields.map((field) => (
                            <div key={field.key} className={`space-y-1.5 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
                              <Label className="text-sm font-medium text-gray-700">{field.label}</Label>
                              {field.description && (
                                <p className="text-xs text-gray-400">{field.description}</p>
                              )}
                              {field.type === "select" ? (
                                <select
                                  value={String(draft[field.key] ?? "")}
                                  onChange={e => setField(field.key, e.target.value)}
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  {field.options?.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              ) : field.type === "textarea" ? (
                                <textarea
                                  value={String(draft[field.key] ?? "")}
                                  onChange={e => setField(field.key, e.target.value)}
                                  rows={3}
                                  placeholder="Leave blank to use default agent instructions"
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                                />
                              ) : (
                                <Input
                                  type={field.type}
                                  step={field.step}
                                  value={String(draft[field.key] ?? "")}
                                  onChange={e => setField(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
                                />
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Save row */}
                        <div className="flex items-center gap-3 border-t pt-4">
                          <Button
                            size="sm"
                            className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                            disabled={saving}
                            onClick={() => saveAgentConfig(cfg.agent_id)}
                          >
                            {saving
                              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                              : <><Save className="h-3.5 w-3.5" /> Save {cfg.label} Rules</>
                            }
                          </Button>
                          {msg === "ok" && (
                            <span className="flex items-center gap-1 text-sm text-green-600">
                              <CheckCircle2 className="h-4 w-4" /> Saved
                            </span>
                          )}
                          {msg === "error" && (
                            <span className="flex items-center gap-1 text-sm text-red-600">
                              <AlertTriangle className="h-4 w-4" /> Save failed
                            </span>
                          )}
                        </div>
                      </CardContent>
                    )
                  })}
                </Card>
              )}

              {/* How agents use these rules */}
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4 text-teal-500" /> How Agents Use These Rules</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { agent: "Quotation Agent", reads: "VAT %, deposit %, valid days, extra instructions → injected into quotation system prompt" },
                      { agent: "Comms Agent",     reads: "Language mode, tone, max words, phone → shapes every customer message" },
                      { agent: "Finance Agent",   reads: "Overdue warning days, escalation threshold → controls when reminders and alerts fire" },
                      { agent: "Tide Agent",      reads: "Ramp offset, safety clearance, trailer height → used in launch/retrieval safety formula" },
                      { agent: "Marina Agent",    reads: "Contract & insurance expiry days → controls when renewal alerts are sent" },
                    ].map(({ agent, reads }) => (
                      <div key={agent} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <p className="font-medium text-gray-800 text-xs mb-1">{agent}</p>
                        <p className="text-xs text-gray-500">{reads}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 border-t pt-3">
                    Agents call <code className="bg-gray-100 px-1 rounded">GET /api/db/agent-config</code> at startup and merge DB values over their built-in defaults.
                    If the API is unreachable, agents fall back to the hardcoded defaults automatically.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeGroup === "compliance" && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Audit Log</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
                        <th className="px-5 py-2.5 text-left">Timestamp</th>
                        <th className="px-5 py-2.5 text-left">User</th>
                        <th className="px-5 py-2.5 text-left">Action</th>
                        <th className="px-5 py-2.5 text-left">Record</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[
                        { ts: "2026-05-20 14:32", user: "Malee Phonsuk",    action: "APPROVE_QUOTATION", record: "QT-2026-0041"  },
                        { ts: "2026-05-20 11:15", user: "Priya Suwan",      action: "CREATE_INVOICE",    record: "INV-2026-0085" },
                        { ts: "2026-05-20 09:42", user: "Somchai Thongsuk", action: "UPDATE_JOB_TASK",   record: "WO-2026-0041"  },
                        { ts: "2026-05-19 17:05", user: "Admin User",       action: "UPDATE_USER_ROLE",  record: "u-008"         },
                        { ts: "2026-05-19 15:30", user: "Priya Suwan",      action: "RECORD_PAYMENT",    record: "INV-2026-0082" },
                        { ts: "2026-05-19 13:20", user: "Malee Phonsuk",    action: "MOVE_BOAT",         record: "boat-004"      },
                        { ts: "2026-05-18 10:00", user: "Admin User",       action: "EDIT_PRICING_RULE", record: "pricing-005"   },
                        { ts: "2026-05-17 16:45", user: "Priya Suwan",      action: "CANCEL_INVOICE",    record: "INV-2026-0079" },
                      ].map((log, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-5 py-2.5 font-mono text-xs text-gray-500">{log.ts}</td>
                          <td className="px-5 py-2.5 text-gray-700">{log.user}</td>
                          <td className="px-5 py-2.5">
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600">{log.action}</span>
                          </td>
                          <td className="px-5 py-2.5 font-mono text-xs text-teal-600">{log.record}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-5 py-3 border-t flex items-center justify-between">
                    <p className="text-xs text-gray-400">Showing last 8 entries · Full log retained for 2 years</p>
                    <Button variant="outline" size="sm" onClick={() => window.print()}>Export CSV</Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Data Retention Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Audit Log Retention (months)</Label>
                      <Input defaultValue="24" type="number" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Document Archive Period (months)</Label>
                      <Input defaultValue="84" type="number" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Photo Storage Retention (months)</Label>
                      <Input defaultValue="60" type="number" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Inactive Session Timeout (minutes)</Label>
                      <Input defaultValue="60" type="number" />
                    </div>
                  </div>
                  <Button size="sm" onClick={() => showSettingsNotice("Compliance settings")}>Save Settings</Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
