"use client"
import React from "react"
import { PhotoUpload } from "@/components/shared/PhotoUpload"

/**
 * Thin client wrapper used by the server-rendered boat detail page.
 * Splits boat photos into three categories stored in separate Supabase folders.
 */
export function BoatPhotoUpload({ boatId }: { boatId: string }) {
  return (
    <div className="space-y-6">
      <PhotoUpload
        folder={`boats/${boatId}/profile`}
        category="Profile / General Photos"
      />
      <div className="border-t border-gray-100" />
      <PhotoUpload
        folder={`boats/${boatId}/damage`}
        category="Damage / Condition Records"
      />
      <div className="border-t border-gray-100" />
      <PhotoUpload
        folder={`boats/${boatId}/documents`}
        category="Document Scans (Insurance, Registration)"
        accept="image/*,application/pdf"
      />
    </div>
  )
}
