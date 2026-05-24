"use client"
import React, { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Search, Phone, Mail, Loader2, UserCheck, Wrench, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Staff } from "@/lib/supabase"

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
  TECHNICIAN:       "Technician",
  HEAD_MECHANIC:    "Head Mechanic",
  ELECTRICIAN:      "Electrician",
  PAINTER:          "Painter",
  FIBERGLASS_TECH:  "Fiberglass Tech",
  OPERATION_STAFF:  "Operation Staff",
  ACCOUNTANT:       "Accountant",
  CUSTOMER_SERVICE: "Customer Service",
  MANAGER:          "Manager",
}

const DEPT_FILTERS = ["All", "Boat Yard", "Marina Ops", "Finance", "Front Office"]

const DEPT_COLOR: Record<string, string> = {
  "Boat Yard":    "bg-orange-100 text-orange-700",
  "Marina Ops":   "bg-teal-100 text-teal-700",
  "Finance":      "bg-blue-100 text-blue-700",
  "Front Office": "bg-purple-100 text-purple-700",
}

const ROLE_ICON: Record<string, React.ReactNode> = {
  TECHNICIAN:       <Wrench className="h-4 w-4" />,
  HEAD_MECHANIC:    <Wrench className="h-4 w-4" />,
  ELECTRICIAN:      <Wrench className="h-4 w-4" />,
  PAINTER:          <Wrench className="h-4 w-4" />,
  FIBERGLASS_TECH:  <Wrench className="h-4 w-4" />,
  OPERATION_STAFF:  <UserCheck className="h-4 w-4" />,
  ACCOUNTANT:       <UserCheck className="h-4 w-4" />,
  CUSTOMER_SERVICE: <Users className="h-4 w-4" />,
  MANAGER:          <Users className="h-4 w-4" />,
}

// Extended staff type with extra DB columns
type StaffRow = Staff & {
  department: string | null
  hire_date: string | null
}

// ─── Staff Card ───────────────────────────────────────────────────────────────
function StaffCard({ member }: { member: StaffRow }) {
  const dept = member.department ?? "—"

  return (
    <Link href={`/staff/${member.id}`}>
      <div className={`bg-white rounded-xl border border-gray-200 p-4 cursor-pointer
        hover:shadow-md hover:border-gray-300 transition-all duration-150
        ${!member.active ? "opacity-60" : ""}`}>

        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold
              ${member.active ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-500"}`}>
              {member.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">{member.name}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {ROLE_LABEL[member.role] ?? member.role}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full
              ${member.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {member.active ? "ACTIVE" : "INACTIVE"}
            </span>
            {dept !== "—" && (
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${DEPT_COLOR[dept] ?? "bg-gray-100 text-gray-600"}`}>
                {dept}
              </span>
            )}
          </div>
        </div>

        {/* Specialty */}
        {member.specialty && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-gray-400">{ROLE_ICON[member.role]}</span>
            <p className="text-[10px] text-gray-600">{member.specialty}</p>
          </div>
        )}

        {/* Contact */}
        <div className="space-y-1">
          {member.phone && (
            <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
              <Phone className="h-3 w-3 shrink-0" /> {member.phone}
            </p>
          )}
          {member.email && (
            <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
              <Mail className="h-3 w-3 shrink-0" /> {member.email}
            </p>
          )}
        </div>

        {/* Hire date */}
        {member.hire_date && (
          <p className="text-[9px] text-gray-400 mt-2 pt-2 border-t border-gray-100">
            Joined {new Date(member.hire_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StaffPage() {
  const [staff,      setStaff]      = useState<StaffRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [search,     setSearch]     = useState("")
  const [deptFilter, setDept]       = useState("All")

  useEffect(() => {
    fetch("/api/db/staff")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setStaff(data)
        else setError("Failed to load staff")
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() =>
    staff.filter(s => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        s.name.toLowerCase().includes(q) ||
        (ROLE_LABEL[s.role] ?? s.role).toLowerCase().includes(q) ||
        (s.specialty ?? "").toLowerCase().includes(q)
      const matchDept = deptFilter === "All" || s.department === deptFilter
      return matchSearch && matchDept
    }),
  [staff, search, deptFilter])

  const stats = useMemo(() => ({
    total:     staff.length,
    active:    staff.filter(s => s.active).length,
    boatYard:  staff.filter(s => s.department === "Boat Yard").length,
    marinaOps: staff.filter(s => s.department === "Marina Ops").length,
  }), [staff])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Technicians, operation staff, and support team"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Staff",    value: stats.total,     bg: "bg-gray-100",   text: "text-gray-800" },
          { label: "Active",         value: stats.active,    bg: "bg-green-100",  text: "text-green-800" },
          { label: "Boat Yard",      value: stats.boatYard,  bg: "bg-orange-100", text: "text-orange-800" },
          { label: "Marina Ops",     value: stats.marinaOps, bg: "bg-teal-100",   text: "text-teal-800" },
        ].map(({ label, value, bg, text }) => (
          <Card key={label} className="overflow-hidden">
            <CardContent className={`p-4 ${bg}`}>
              <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${text}`}>{loading ? "—" : value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search name, role, specialty…" value={search}
                onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {DEPT_FILTERS.map(d => (
                <button key={d} onClick={() => setDept(d)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors
                    ${deptFilter === d ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {d === "All" ? "All Departments" : d}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading staff…
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Grid */}
      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No staff members found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map(s => <StaffCard key={s.id} member={s} />)}
            </div>
          )}
        </>
      )}

      {/* Live indicator */}
      <p className="text-xs text-gray-400 text-center pb-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 align-middle" />
        Live database · {staff.length} staff members loaded
      </p>
    </div>
  )
}
