"use client"
import React, { createContext, useContext, useState, useEffect } from "react"
import type { Locale } from "./translations"

interface LocaleContextType {
  locale: Locale
  setLocale: (l: Locale) => void
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  setLocale: () => {},
})

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")

  useEffect(() => {
    try {
      const saved = localStorage.getItem("marina-locale") as Locale | null
      if (saved === "th" || saved === "en") setLocaleState(saved)
    } catch {
      // localStorage may not be available in SSR context
    }
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    try {
      localStorage.setItem("marina-locale", l)
    } catch {
      // ignore
    }
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextType {
  return useContext(LocaleContext)
}
