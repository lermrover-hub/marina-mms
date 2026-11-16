"use client"
import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"

type Entry = {
  id: string; kind: string; code: string; name_en: string; name_th: string;
  status: string; parent_id: string | null; pricing_id: string | null; description: string; version: number;
  loa_min_ft: number | null; loa_max_ft: number | null;
  engines_min: number | null; engines_max: number | null; usage: string;
}
const initial = { kind: "VESSEL_TYPE", code: "", name_en: "", name_th: "", status: "DRAFT", parent_id: "", pricing_id: "", description: "", loa_min_ft: "", loa_max_ft: "", engines_min: "", engines_max: "", usage: "ANY" }
const inputClass = "w-full rounded border p-2 text-sm bg-white text-slate-900"
export default function CatalogEditor() {
  const [rows, setRows] = useState<Entry[]>([])
  const [rates, setRates] = useState<{ id: string; code: string; serviceNameEn: string; rateThb: number; unit: string; isActive: boolean }[]>([])
  const [form, setForm] = useState(initial)
  const [editing, setEditing] = useState<Entry | null>(null)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [message, setMessage] = useState("")
  async function load(signal?: AbortSignal) {
    const [response, rateResponse] = await Promise.all([fetch("/api/admin/service-catalog", { cache: "no-store", signal }), fetch("/api/pricing-master", { cache: "no-store", signal })])
    const result = await response.json()
    if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Unable to load catalog")
    if (!rateResponse.ok) throw new Error('Unable to load Rate Card')
    const rateResult = await rateResponse.json()
    setRates(rateResult.data); setRows(result.data); setLoaded(true)
  }
  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).catch(error => { if (error.name !== "AbortError") setMessage(error.message) })
    return () => controller.abort()
  }, [])
  function edit(row: Entry) {
    setEditing(row); setMessage("")
    setForm({ kind: row.kind, code: row.code, name_en: row.name_en, name_th: row.name_th, status: row.status, parent_id: row.parent_id ?? "", pricing_id: row.pricing_id ?? "", description: row.description, loa_min_ft: String(row.loa_min_ft ?? ""), loa_max_ft: String(row.loa_max_ft ?? ""), engines_min: String(row.engines_min ?? ""), engines_max: String(row.engines_max ?? ""), usage: row.usage })
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("")
    const { code, kind, ...fields } = form
    const body = { ...fields, parent_id: kind === "SERVICE" ? fields.parent_id : null, pricing_id: kind === "SERVICE" && fields.pricing_id ? fields.pricing_id : null, usage: kind === "VESSEL_TYPE" ? fields.usage : "ANY", ...Object.fromEntries(["loa_min_ft", "loa_max_ft", "engines_min", "engines_max"].map(key => [key, kind !== "VESSEL_TYPE" || !form[key as keyof typeof form] ? null : Number(form[key as keyof typeof form])])), ...(editing ? { expected_version: editing.version } : { code, kind }) }
    try {
      const response = await fetch(`/api/admin/service-catalog${editing ? `?id=${editing.id}` : ""}`, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const result = await response.json()
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : JSON.stringify(result.error))
      setEditing(null); setForm(initial)
      await load(); setMessage("บันทึกแล้ว / Saved. Catalog metadata only; no prices or existing documents changed.")
    } catch (error) { setMessage(error instanceof Error ? error.message : "Save failed") } finally { setBusy(false) }
  }
  return <div className="max-w-5xl mx-auto space-y-5">
    <Link href="/settings" className="underline">กลับ Settings</Link>
    <h1 className="text-2xl font-bold">ประเภทเรือและกลุ่มบริการ / Service Catalog</h1>
    <p className="rounded border bg-amber-50 p-3 text-sm text-amber-950">เชื่อมบริการย่อยกับ Rate Card เดิมได้ ราคายังคงอ่านจาก Pricing Master และหมวด Ramp / Storage / Yard ไม่เปลี่ยน เมื่อเปิดการเชื่อมบน Staging รายการที่เชื่อมและปิดใช้งานจะเลือกใหม่ไม่ได้ เอกสารเดิมไม่เปลี่ยน การเปิดประเภทเรือไม่ใช่การอนุมัติยกเรือ</p>
    <p role="status" aria-live="polite">{message || (!loaded ? "Loading catalog…" : "")}</p>
    <form onSubmit={save} className="rounded border bg-white p-4 grid gap-4 sm:grid-cols-2">
      <label>ชนิด / Kind<select disabled={!!editing || busy} value={form.kind} onChange={e => setForm({ ...initial, kind: e.target.value })} className={inputClass}><option value="VESSEL_TYPE">ประเภทเรือ</option><option value="SERVICE_GROUP">กลุ่มงานหลัก</option><option value="SERVICE">บริการย่อย</option></select></label>
      <label>รหัสถาวร / Stable code<input required disabled={!!editing || busy} value={form.code} pattern="[A-Z][A-Z0-9_]{1,79}" onChange={e => setForm({ ...form, code: e.target.value })} className={inputClass} /></label>
      <label>Name EN<input required maxLength={160} disabled={busy} value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} className={inputClass} /></label>
      <label>ชื่อไทย<input maxLength={160} disabled={busy} value={form.name_th} onChange={e => setForm({ ...form, name_th: e.target.value })} className={inputClass} /></label>
      <label>สถานะ<select disabled={busy} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputClass}>{["DRAFT", "ACTIVE", "RETIRED"].map(s => <option key={s}>{s}</option>)}</select></label>
      {form.kind === "SERVICE" && <label>กลุ่มงานหลัก<select required disabled={busy} value={form.parent_id} onChange={e => setForm({ ...form, parent_id: e.target.value })} className={inputClass}><option value="">เลือกกลุ่มงาน</option>{rows.filter(r => r.kind === "SERVICE_GROUP").map(r => <option key={r.id} value={r.id}>{r.name_en} ({r.status})</option>)}</select></label>}
      {form.kind === "SERVICE" && <label>Rate Card ที่เชื่อม<select disabled={busy} value={form.pricing_id} onChange={e => setForm({ ...form, pricing_id: e.target.value })} className={inputClass}><option value="">ยังไม่เชื่อม / Unlinked</option>{rates.map(r => <option key={r.id} value={r.id}>{r.code} — {r.serviceNameEn} — ฿{r.rateThb.toLocaleString()}/{r.unit}{r.isActive ? '' : ' (Inactive)'}</option>)}</select><span className="text-sm">เลือกจากราคาเดิม ไม่สร้างราคาใหม่</span></label>}
      {form.kind === "VESSEL_TYPE" && <><label>การใช้งาน<select disabled={busy} value={form.usage} onChange={e => setForm({ ...form, usage: e.target.value })} className={inputClass}>{["ANY", "PRIVATE", "COMMERCIAL"].map(s => <option key={s}>{s}</option>)}</select></label>{([['loa_min_ft','LOA ต่ำสุด (ft)'],['loa_max_ft','LOA สูงสุด (ft)'],['engines_min','จำนวนเครื่องต่ำสุด'],['engines_max','จำนวนเครื่องสูงสุด']] as const).map(([key,label]) => <label key={key}>{label}<input type="number" min={0} max={key.startsWith('engines') ? 20 : 1000} step={key.startsWith('engines') ? 1 : 'any'} disabled={busy} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} className={inputClass}/></label>)}</>}
      <label className="sm:col-span-2">หมายเหตุ<textarea maxLength={2000} disabled={busy} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputClass}/></label>
      <div className="flex gap-3"><button disabled={busy || !loaded} className="rounded bg-slate-900 text-white px-4 py-2 disabled:opacity-50">{busy ? 'Saving…' : editing ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}</button><button type="button" disabled={busy} onClick={() => { setEditing(null); setForm(initial) }} className="rounded border px-4 py-2">ยกเลิก</button></div>
    </form>
    <div className="space-y-2">{loaded && rows.length === 0 && <p>ยังไม่มีรายการ — ยังไม่ได้ import หรือเปิดใช้ราคาใด</p>}{rows.map(row => <div key={row.id} className="rounded border bg-white p-3 flex flex-wrap gap-3 items-center justify-between"><div><b>{row.code}</b> · {row.name_th || row.name_en}<p className="text-sm">{row.kind} · {row.status} · Version {row.version}</p></div><button disabled={busy} onClick={() => edit(row)} className="border rounded px-4 py-2">แก้ไข / ปิดใช้งาน</button></div>)}</div>
  </div>
}
