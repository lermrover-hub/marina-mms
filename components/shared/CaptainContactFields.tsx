"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CustomerContact } from "@/lib/supabase"

type Props = {
  customerId: string
  contactId: string
  onContactIdChange: (value: string) => void
  effectiveFrom: string
  onEffectiveFromChange: (value: string) => void
  effectiveTo: string
  onEffectiveToChange: (value: string) => void
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
      if (!response.ok) throw new Error(data?.error ?? "Unable to load contacts")
      setContacts(Array.isArray(data) ? data : [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
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
      if (!response.ok) throw new Error(data?.error ?? "Unable to add captain")
      setContacts((current) => [...current, data].sort((a, b) => a.full_name.localeCompare(b.full_name)))
      props.onContactIdChange(data.id)
      setDraft({ full_name: "", phone: "", email: "", line_id: "", whatsapp_number: "", preferred_channel: "PHONE", operational_notifications: true })
      setShowNew(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setSaving(false)
    }
  }

  const selected = contacts.find((contact) => contact.id === props.contactId)

  return (
    <div className="space-y-4 rounded-lg border border-teal-100 bg-teal-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-semibold text-gray-900"><UserRound className="h-4 w-4 text-teal-600" /> Captain / Vessel Contact</div>
          <p className="mt-1 text-xs text-gray-500">Operational contact for this boat. This does not change the billing contact or invoice recipient.</p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={!props.customerId} onClick={() => setShowNew((value) => !value)}>
          <Plus className="mr-1 h-4 w-4" /> Add contact
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-3">
          <Label>Current Captain / Operational Contact</Label>
          <select className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" disabled={!props.customerId || loading} value={props.contactId} onChange={(event) => props.onContactIdChange(event.target.value)}>
            <option value="">{!props.customerId ? "Select owner first" : loading ? "Loading contacts…" : "— No captain assigned —"}</option>
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
