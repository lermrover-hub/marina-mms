"use client"
import Image from "next/image"
import Link from "next/link"
import type { Berth } from "@/lib/supabase"
import { YARD_SLOTS, normalizedSlotCode } from "@/lib/yard-map-layout"

export function PhotoBerthMap({ berths, compact = false }: { berths: Berth[]; compact?: boolean }) {
  const byCode = new Map(berths.map(b => [normalizedSlotCode(b.code), b]))
  const mapped = new Set(YARD_SLOTS.map(s => s.code))
  const unmapped = berths.filter(b => !mapped.has(normalizedSlotCode(b.code)))
  return <div>
    <div className={`orm-photo-map ${compact ? "orm-photo-compact" : ""}`} aria-label="Ocean Rover dry storage and workshop map">
      <Image src="/orm-yard-approved.png" alt="Approved yard layout: B1–B2, Workshop W1–W4, and C1–C17" width={1448} height={1086} priority={!compact} unoptimized />
      {YARD_SLOTS.map(slot => {
        const berth = byCode.get(slot.code)
        const assigned = Boolean(berth?.current_boat_id)
        const label = `${slot.code}: ${berth?.status ?? "Not configured"}${assigned ? ", boat assigned" : ""}`
        const style = { left: `${slot.x / 1448 * 100}%`, top: `${slot.y / 1086 * 100}%`, width: `${slot.width / 1448 * 100}%`, height: `${slot.height / 1086 * 100}%`, transform: `translate(-50%, -50%) rotate(${slot.angle}deg)` }
        const content = <>{assigned && <Image src="/orm-boat-marker.png" width={1024} height={1536} className="orm-assigned-boat" alt="Assigned boat (representative image)" unoptimized />}<span className="sr-only">{slot.code}</span></>
        return berth ? <Link key={slot.code} href={`/berths/${berth.id}`} className={`orm-photo-slot orm-slot-${berth.status.toLowerCase()}`} style={style} title={label} aria-label={label}>{content}</Link>
          : <span key={slot.code} className="orm-photo-slot orm-slot-unconfigured" style={style} title={label}>{content}</span>
      })}
    </div>
    {!compact && <>
      <p className="mt-2 text-xs text-gray-500">Boat symbols indicate current assignments, not vessel scale or handling approval. W = Workshop.</p>
      <details className="mt-3"><summary className="cursor-pointer py-2 font-medium">Accessible slot list · {berths.length} records</summary>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{berths.map(b => <Link className="rounded border bg-white p-3 text-sm" key={b.id} href={`/berths/${b.id}`}>{b.code} · {b.status}{b.current_boat_id ? " · Boat assigned" : ""}</Link>)}</div>
      </details>
      {unmapped.length > 0 && <p className="mt-2 text-xs text-gray-500">Not positioned on this image: {unmapped.map(b => b.code).join(", ")}. These records remain available in the slot list.</p>}
    </>}
  </div>
}
