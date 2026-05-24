import React from "react"
import { Anchor } from "lucide-react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white"
        style={{ backgroundColor: "var(--color-sidebar)" }}
      >
        <div className="max-w-sm text-center">
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500 shadow-lg">
              <Anchor className="h-9 w-9 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Marina MMS</h1>
          <p className="text-blue-200 text-base leading-relaxed">
            Marina & Boat Yard Management System
          </p>
          <div className="mt-10 space-y-3 text-left">
            {["Customer & Boat Management", "Wet Berth & Dry Storage", "Ramp & Tide Calculator", "Quotation & Invoice", "Work Order & Job Tracking"].map((f) => (
              <div key={f} className="flex items-center gap-3 text-sm text-blue-200">
                <div className="h-1.5 w-1.5 rounded-full bg-teal-400 shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <p className="mt-10 text-xs text-blue-400">Ko Samui, Surat Thani, Thailand</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 p-8">
        {children}
      </div>
    </div>
  )
}
