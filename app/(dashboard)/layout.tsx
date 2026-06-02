"use client"
import React, { useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="ocean-rover-shell flex h-screen overflow-hidden bg-[#f6f4ef] text-[#1f2933]">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-16 left-0 z-50 w-64 transform transition-transform duration-300 md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar sidebarOpen={sidebarOpen} onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="ocean-rover-content flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
