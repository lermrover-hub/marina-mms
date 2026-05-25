"use client"
import React from "react"
import { LocaleProvider } from "@/lib/i18n/LocaleContext"
import { PwaInstallBanner } from "@/components/ui/PwaInstallBanner"

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      {children}
      <PwaInstallBanner />
    </LocaleProvider>
  )
}
