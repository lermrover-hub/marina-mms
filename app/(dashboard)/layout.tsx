import React from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ocean-rover-shell flex h-screen overflow-hidden bg-[#f6f4ef] text-[#1f2933]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="ocean-rover-content flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
