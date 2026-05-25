import type { Metadata, Viewport } from "next"
import "./globals.css"
import { SessionProvider } from "next-auth/react"
import { ClientProviders } from "@/components/layout/ClientProviders"

export const metadata: Metadata = {
  title: "Marina MMS — Management System",
  description: "Marina & Boat Yard Management System — Ko Samui, Thailand",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Marina MMS",
  },
}

export const viewport: Viewport = {
  themeColor: "#13988f",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body className="antialiased">
        <SessionProvider>
          <ClientProviders>
            {children}
          </ClientProviders>
        </SessionProvider>
      </body>
    </html>
  )
}
