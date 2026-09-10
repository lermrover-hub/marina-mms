"use client"
import React from "react"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { Search, LogOut, User, Settings, ChevronDown, HelpCircle, Menu, X } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getInitials } from "@/lib/utils"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher"

interface TopBarProps {
  title?: string
  sidebarOpen?: boolean
  onSidebarToggle?: () => void
}

export function TopBar({ title, sidebarOpen = false, onSidebarToggle }: TopBarProps) {
  const { data: session } = useSession()
  const [signingOut, setSigningOut] = React.useState(false)
  const userName = session?.user?.name ?? "User"
  const userRole = (session?.user as { role?: string })?.role ?? ""

  return (
    <header className="flex h-16 items-center justify-between border-b border-[#d7efed] bg-white/90 px-6 shadow-[0_10px_28px_rgba(19,152,143,0.07)] backdrop-blur">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3">
        {/* Hamburger Icon — Mobile Only */}
        <button
          onClick={onSidebarToggle}
          className="md:hidden flex items-center justify-center p-1 rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? (
            <X className="h-5 w-5 text-[#1f2933]" />
          ) : (
            <Menu className="h-5 w-5 text-[#1f2933]" />
          )}
        </button>

        {/* Page Title */}
        {title && <h1 className="text-lg font-semibold text-[#1f2933]">{title}</h1>}
      </div>

      {/* Right: search + actions */}
      <div className="flex items-center gap-3">

        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b969a]" />
          <input
            type="search"
            placeholder="Search…"
            className="h-9 w-64 rounded-md border border-[#e5dfd2] bg-white pl-9 pr-3 text-sm text-[#1f2933] placeholder:text-[#8b969a] focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20"
          />
        </div>

        {/* Language switcher */}
        <LanguageSwitcher />

        {/* Notifications */}
        <NotificationBell />

        <Link
          href="/help"
          className="hidden items-center gap-1.5 rounded-md border border-[#d7efed] bg-[#f3fbfa] px-3 py-2 text-xs font-medium text-[#126c66] transition-colors hover:bg-[#e8fbf9] md:inline-flex"
        >
          <HelpCircle className="h-4 w-4" />
          Help
        </Link>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[#f2eee4] transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">{getInitials(userName)}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-[#1f2933] leading-tight">{userName}</p>
                <p className="text-xs text-[#647076] leading-tight">{userRole.replace(/_/g, " ")}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-[#8b969a]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
              disabled={signingOut}
              onSelect={async (event) => {
                event.preventDefault()
                if (signingOut) return
                setSigningOut(true)
                await signOut({ redirect: false })
                window.location.replace("/login")
              }}
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? "Signing Out..." : "Sign Out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
