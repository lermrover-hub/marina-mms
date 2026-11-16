"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toErrorMessage } from "@/lib/error-message"
import type { CustomerContact } from "@/lib/supabase"

type OwnerSummary = {
  first_name: string | null
  last_name: string | null
  company_name: string | null
  phone: string | null
  email: string | null
}

type Props = {
  customerId: string
  contactId: string
  onContactIdChange: (value: string) => void
  effectiveFrom: string
  onEffectiveFromChange: (value: string) => void
  effectiveTo: string
  onEffectiveToChange: (value: string) => void
  ownerIsCaptain: boolean
  onOwnerIsCaptainChange: (value: boolean) => void
  owner: OwnerSummary | null
}

export function CaptainContactFields(props: Props) {
  const [contacts, setContacts] = useState<CustomerContact[]>([])
  const [loading, setLoading] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({ full_name: "", phone: "", email: "", line_id: "", whatsapp_number: "", preferred_channel: "PHONE", operational_notifications: true })

  const loadContacts = useCallback(async () => {
    if (!props.customerId) {
      setContacts([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/db/customer-contacts?customer_id=${encodeURIComponent(props.customerId)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(toErrorMessage(data, "Unable to load contacts"))
      setContacts(Array.isArray(data) ? data : [])
    } catch (reason) {
      setError(toErrorMessage(reason, "Unable to load contacts"))
    } finally {
      setLoading(false)
    }
  }, [props.customerId])

  useEffect(() => { void loadContacts() }, [loadContacts])

  async function createContact() {
    if (!draft.full_name.trim()) {
      setError("Captain / contact name is required.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/db/customer-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, customer_id: props.customerId, role_title: "CAPTAIN" }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(toErrorMessage(data, "Unable to add captain"))
      setContacts((current) => [...current, data].sort((a, b) => a.full_name.localeCompare(b.full_name)))
      props.onContactIdChange(data.id)
      setDraft({ full_name: "", phone: "", email: "", line_id: "", whatsapp_number: "", preferred_channel: "PHONE", operational_notifications: true })
      setShowNew(false)
    } catch (reason) {
      setError(toErrorMessage(reason, "Unable to add captain"))
    } finally {
      setSaving(false)
    }
  }

  const selected = contacts.find((contact) => contact.id === props.contactId)
  const selectedIsOwner = selected?.role_title === "OWNER_CAPTAIN"
  const ownerCaptainChecked = props.ownerIsCaptain || selectedIsOwner
  const ownerName = props.owner
    ? [props.owner.first_name, props.owner.last_name].filter(Boolean).join(" ").trim() || props.owner.company_name || "Boat owner"
    : "Boat owner"

  function changeOwnerCaptain(checked: boolean) {
    props.onOwnerIsCaptainChange(checked)
    if (checked || selectedIsOwner) props.onContactIdChange("")
    if (checked) setShowNew(false)
    setError(null)
  }

  return (
    <div className="space-y-4 rounded-lg border border-teal-100 bg-teal-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-semibold text-gray-900"><UserRound className="h-4 w-4 text-teal-600" /> Captain / Vessel Contact</div>
          <p className="mt-1 text-xs text-gray-500">Operational contact for this boat. This does not change the billing contact or invoice recipient.</p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={!props.customerId || ownerCaptainChecked} onClick={() => setShowNew((value) => !value)}>
          <Plus className="mr-1 h-4 w-4" /> Add contact
        </Button>
      </div>

      <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${ownerCaptainChecked ? "border-[#B18F2F] bg-[#B18F2F]/10" : "border-gray-200 bg-white"}`}>
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0B2F5B]"
          disabled={!props.customerId}
          checked={ownerCaptainChecked}
          onChange={(event) => changeOwnerCaptain(event.target.checked)}
        />
        <span>
          <span className="block text-sm font-medium text-gray-900">Owner is the captain / เจ้าของเรือเป็นกัปตัน</span>
          <span className="mt-0.5 block text-xs text-gray-500">
            {props.customerId
              ? `${ownerName}${props.owner?.phone ? ` · ${props.owner.phone}` : props.owner?.email ? ` · ${props.owner.email}` : ""} will be used as the operational contact.`
              : "Select the boat owner first."}
          </span>
        </span>
      </label>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-3">
          <Label>Current Captain / Operational Contact</Label>
          <select className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100" disabled={!props.customerId || loading || ownerCaptainChecked} value={ownerCaptainChecked ? "" : props.contactId} onChange={(event) => props.onContactIdChange(event.target.value)}>
            <option value="">{ownerCaptainChecked ? "Owner is the captain" : !props.customerId ? "Select owner first" : loading ? "Loading contacts…" : "— No captain assigned —"}</option>
            {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.full_name}{contact.phone ? ` · ${contact.phone}` : ""}</option>)}
          </select>
          {selected && <p className="mt-1 text-xs text-gray-500">Preferred: {selected.preferred_channel} · Operational notifications: {selected.operational_notifications ? "Allowed" : "Not allowed"}</p>}
        </div>
        <div>
          <Label>Effective From</Label>
          <Input className="mt-1" type="date" value={props.effectiveFrom} onChange={(event) => props.onEffectiveFromChange(event.target.value)} />
        </div>
        <div>
          <Label>Effective To</Label>
          <Input className="mt-1" type="date" min={props.effectiveFrom || undefined} value={props.effectiveTo} onChange={(event) => props.onEffectiveToChange(event.target.value)} />
        </div>
      </div>

      {showNew && <div className="space-y-3 rounded-md border bg-white p-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Name *</Label><Input className="mt-1" value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} placeholder="Captain name" /></div>
          <div><Label>Phone</Label><Input className="mt-1" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></div>
          <div><Label>Email</Label><Input className="mt-1" type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></div>
          <div><Label>LINE ID</Label><Input className="mt-1" value={draft.line_id} onChange={(event) => setDraft({ ...draft, line_id: event.target.value })} /></div>
          <div><Label>WhatsApp</Label><Input className="mt-1" value={draft.whatsapp_number} onChange={(event) => setDraft({ ...draft, whatsapp_number: event.target.value })} /></div>
          <div><Label>Preferred Channel</Label><select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={draft.preferred_channel} onChange={(event) => setDraft({ ...draft, preferred_channel: event.target.value })}>{["PHONE", "LINE", "WHATSAPP", "EMAIL"].map((channel) => <option key={channel}>{channel}</option>)}</select></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.operational_notifications} onChange={(event) => setDraft({ ...draft, operational_notifications: event.target.checked })} /> May receive operational notifications</label>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button><Button type="button" variant="teal" disabled={saving} onClick={createContact}>{saving ? "Saving…" : "Save Captain"}</Button></div>
      </div>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
