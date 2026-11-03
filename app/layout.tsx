import type { Metadata, Viewport } from "next"
import "./globals.css"
import "./marine-global.css"
import { SessionProvider } from "next-auth/react"
import { ClientProviders } from "@/components/layout/ClientProviders"

export const metadata: Metadata = {
  title: "Marina MMS — Management System",
  description: "Marina & Boat Yard Management System — Ko Samui, Thailand",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Marina MMS",
  },
}

export const viewport: Viewport = {
  themeColor: "#0B2F5B",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
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
