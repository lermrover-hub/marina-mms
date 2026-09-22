"use client"

import React, { useState } from "react"
import { HelpCircle, X } from "lucide-react"

export function HelpHint({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`Help: ${title}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && (
        <span role="note" className="absolute left-0 top-8 z-30 w-72 rounded-lg border border-teal-200 bg-white p-3 text-left text-sm font-normal text-gray-700 shadow-xl">
          <span className="mb-1 flex items-start justify-between gap-2 font-semibold text-gray-900">
            {title}
            <button type="button" onClick={() => setOpen(false)} aria-label="Close help"><X className="h-4 w-4 text-gray-400" /></button>
          </span>
          <span className="block leading-relaxed">{children}</span>
        </span>
      )}
    </span>
  )
}
