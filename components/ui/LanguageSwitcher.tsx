"use client"
import React from "react"
import { useLocale } from "@/lib/i18n/LocaleContext"

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()
  return (
    <div className="flex items-center gap-0 rounded-md border border-gray-200 overflow-hidden text-xs font-medium">
      <button
        onClick={() => setLocale("en")}
        className={`px-2.5 py-1.5 transition-colors ${
          locale === "en"
            ? "bg-teal-600 text-white"
            : "text-gray-600 hover:bg-gray-50"
        }`}
        aria-pressed={locale === "en"}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => setLocale("th")}
        className={`px-2.5 py-1.5 transition-colors ${
          locale === "th"
            ? "bg-teal-600 text-white"
            : "text-gray-600 hover:bg-gray-50"
        }`}
        aria-pressed={locale === "th"}
        aria-label="เปลี่ยนเป็นภาษาไทย"
      >
        ไทย
      </button>
    </div>
  )
}
