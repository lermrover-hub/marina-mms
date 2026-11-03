"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Anchor, CalendarDays, FileText, Waves, Wrench, ArrowRight, Zap } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useApiList } from "@/hooks/useApiList"
import type { Berth, RampBooking, WorkOrder } from "@/lib/supabase"
import { PhotoBerthMap } from "@/components/berths/PhotoBerthMap"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { YARD_SLOTS, normalizedSlotCode } from "@/lib/yard-map-layout"
const ManagementDetails = dynamic(() => import("@/components/dashboard/ManagementDetails"))
type TidePoint = { hour: number; depth: number; time: string }
function bangkokDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()) }
function Panel({ title, href, icon: Icon, children, className = "" }: { title: string; href: string; icon: typeof Anchor; children: React.ReactNode; className?: string }) {
  return <section className={`orm-panel ${className}`}><div className="orm-panel-heading"><h2><Icon size={18} />{title}</h2><Link href={href} aria-label={`View all ${title}`}>View all <ArrowRight size={13} /></Link></div>{children}</section>
}
export default function DashboardPage() {
  const berths = useApiList<Berth>("/api/db/berths")
  const bookings = useApiList<RampBooking>("/api/db/ramp-bookings")
  const jobs = useApiList<WorkOrder>("/api/db/work-orders")
  const [stats, setStats] = useState<{ openQuotations: number } | null>(null)
  const [statsError, setStatsError] = useState(false)
  const [tide, setTide] = useState<TidePoint[]>([])
  const [tideMessage, setTideMessage] = useState("Loading tide records…")
  const [today, setToday] = useState(bangkokDate)
  const [expanded, setExpanded] = useState(false)
  const [hour, setHour] = useState(0)
  useEffect(() => { const tick = () => { setToday(bangkokDate()); setHour(Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", hourCycle: "h23" }).format(new Date()))) }; tick(); const timer = setInterval(tick, 60000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/db/dashboard", { signal: controller.signal }).then(async r => { if (!r.ok) throw new Error(); return r.json() }).then(d => { if (!Number.isFinite(d.openQuotations)) throw new Error(); setStats(d) }).catch(() => { if (!controller.signal.aborted) setStatsError(true) })
    fetch(`/api/tide/calculate?date=${today}`, { signal: controller.signal }).then(async r => { if (!r.ok) throw new Error(); return r.json() }).then(d => {
      const records = d.records as { hour: number; tide_m: number }[]
      setTide(records.map(p => ({ hour: Number(p.hour), depth: Number(p.tide_m) - 1, time: `${String(p.hour).padStart(2, "0")}:00` })))
      setTideMessage(records.length ? "" : "No tide records for today")
    }).catch(() => { if (!controller.signal.aborted) { setTide([]); setTideMessage("Tide data unavailable for today — open Tide Calculator to check records.") } })
    return () => controller.abort()
  }, [today])
  const visibleCodes = new Set(YARD_SLOTS.map(s => s.code))
  const yard = berths.data.filter(b => visibleCodes.has(normalizedSlotCode(b.code)))
  const occupied = yard.filter(b => b.status === "OCCUPIED").length
  const upcoming = bookings.data.filter(b => !["CANCELLED", "COMPLETED"].includes(b.status) && b.requested_date >= today).sort((a,b) => `${a.requested_date}${a.confirmed_time ?? a.requested_time ?? ""}`.localeCompare(`${b.requested_date}${b.confirmed_time ?? b.requested_time ?? ""}`)).slice(0,5)
  const launches = bookings.data.filter(b => b.requested_date === today && b.operation_type === "LAUNCH" && b.status !== "CANCELLED").length
  const point = tide.find(p => p.hour === hour)
  const recentJobs = [...jobs.data].sort((a,b) => b.created_at.localeCompare(a.created_at)).slice(0,5)
  const kpis = [
    { label: "Occupied Berths", value: berths.loading ? "…" : berths.error ? "Unavailable" : `${occupied} / ${yard.length}`, note: "Mapped dry-storage & workshop slots", icon: Anchor, href: "/berths" },
    { label: "Today's Launches", value: bookings.loading ? "…" : bookings.error ? "Unavailable" : launches, note: `${today} · Thailand time`, icon: CalendarDays, href: "/ramp-bookings" },
    { label: "Open Quotations", value: stats?.openQuotations ?? (statsError ? "Unavailable" : "…"), note: "From current quotation records", icon: FileText, href: "/quotations" },
    { label: "Ramp Tide Depth", value: point ? `${point.depth.toFixed(2)} m` : "Unavailable", note: point ? `${point.time} table estimate · not a live sensor` : "No current-hour tide record", icon: Waves, href: "/ramp-bookings/tide-calculator" },
  ]
  return <div className="orm-dashboard">
    <div className="orm-dashboard-title"><h1>Dashboard</h1><p>Marina operations at a glance · {today}</p></div>
    <div className="orm-kpis">{kpis.map(k => <Link href={k.href} className="orm-kpi" key={k.label}><k.icon size={29} /><div><h2>{k.label}</h2><strong>{k.value}</strong><p>{k.note}</p></div></Link>)}</div>
    <div className="orm-operations-grid">
      <Panel title="Upcoming Bookings" href="/ramp-bookings" icon={CalendarDays} className="orm-bookings">
        {bookings.error ? <p role="alert">Bookings unavailable</p> : upcoming.length === 0 ? <p>No upcoming bookings.</p> : <div className="orm-booking-list">{upcoming.map(b => <Link href={`/ramp-bookings/${b.id}`} key={b.id} className="orm-booking-row"><span><strong>{b.boat_name ?? b.reference}</strong><small>{b.customer_name ?? "Customer not recorded"}</small></span><span>{b.requested_date}<small>{b.confirmed_time ?? b.requested_time ?? "Time pending"}</small></span><span>{b.operation_type.replaceAll("_", " ")}<small><StatusBadge type="ramp" status={b.status} /></small></span></Link>)}</div>}
      </Panel>
      <Panel title="Berth Occupancy" href="/berths" icon={Anchor} className="orm-occupancy">{berths.error ? <p role="alert">Map data unavailable</p> : <PhotoBerthMap berths={berths.data} compact />}<p className="orm-caption">Dry storage & Workshop · Boat symbols = assigned vessels</p></Panel>
      <Panel title="Tide & Ramp Depth" href="/ramp-bookings/tide-calculator" icon={Waves} className="orm-tide">
        {tide.length ? <><div className="orm-tide-summary"><strong>{point ? `${point.depth.toFixed(2)} m` : "No current-hour record"}</strong><span>Actual depth = tide table height − 1.00 m</span></div><div style={{ height: 210, minWidth: 0 }} aria-label="Hourly ramp depth from tide table in metres"><ResponsiveContainer width="100%" height="100%"><AreaChart data={tide} margin={{ top: 10, right: 12, bottom: 0, left: -22 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="time" minTickGap={45} tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} unit="m" /><Tooltip formatter={v => [`${Number(v).toFixed(2)} m`, "Ramp depth"]} /><Area dataKey="depth" type="linear" stroke="var(--orm-blue)" fill="var(--orm-ice)" strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div><details><summary className="text-xs cursor-pointer">View hourly values</summary>{tide.map(p => <p key={p.hour} className="text-xs">{p.time} · {p.depth.toFixed(2)} m</p>)}</details></> : <p className="orm-empty">{tideMessage}</p>}
        <p className="orm-caption">Planning information only. Verify vessel, trailer and tide safety before launch. Default trailer height remains 1.10 m.</p>
      </Panel>
      <Panel title="Recent Repair Jobs" href="/work-orders" icon={Wrench} className="orm-jobs">{jobs.error ? <p role="alert">Repair jobs unavailable</p> : recentJobs.length === 0 ? <p>No repair jobs recorded.</p> : recentJobs.map(j => <Link key={j.id} href={`/work-orders/${j.id}`} className="orm-job-row"><span><strong>{j.boat_name ?? j.reference}</strong><small>{j.reference}</small></span><StatusBadge type="workorder" status={j.status} /></Link>)}</Panel>
      <Panel title="Quick Actions" href="/service-requests" icon={Zap} className="orm-actions"><Link href="/service-requests/new">New Service Request <ArrowRight size={16} /></Link><Link href="/ramp-bookings/new">New Ramp Booking <ArrowRight size={16} /></Link><Link href="/quotations">Review Quotations <ArrowRight size={16} /></Link><Link href="/ramp-bookings/tide-calculator">Launch / Tide Check <ArrowRight size={16} /></Link></Panel>
    </div>
    <details onToggle={e => setExpanded(e.currentTarget.open)} className="orm-panel"><summary className="cursor-pointer font-semibold">Management & financial details</summary>{expanded && <ManagementDetails />}</details>
  </div>
}
