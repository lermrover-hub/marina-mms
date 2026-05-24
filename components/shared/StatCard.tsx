import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface StatCardProps {
  title:      string
  value:      string | number
  subtitle?:  string
  trend?:     number           // positive = up, negative = down, 0/undefined = neutral
  trendLabel?: string
  icon?:      React.ElementType
  iconColor?: string
  className?: string
  accent?:    "navy" | "teal" | "green" | "amber" | "red" | "blue"
}

const ACCENT_STYLES = {
  navy:  { icon: "bg-navy-100 text-navy-600",  bar: "bg-navy-600" },
  teal:  { icon: "bg-teal-100 text-teal-600",  bar: "bg-teal-600" },
  green: { icon: "bg-green-100 text-green-600", bar: "bg-green-600" },
  amber: { icon: "bg-amber-100 text-amber-600", bar: "bg-amber-500" },
  red:   { icon: "bg-red-100 text-red-600",     bar: "bg-red-600" },
  blue:  { icon: "bg-blue-100 text-blue-600",   bar: "bg-blue-600" },
}

export function StatCard({ title, value, subtitle, trend, trendLabel, icon: Icon, className, accent = "navy" }: StatCardProps) {
  const styles = ACCENT_STYLES[accent]
  const showTrend = trend !== undefined && trend !== null

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Accent bar */}
      <div className={cn("h-1", styles.bar)} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
            {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
            {showTrend && (
              <div className={cn("mt-2 flex items-center gap-1 text-xs font-medium", trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-gray-500")}>
                {trend > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : trend < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                {trend > 0 ? "+" : ""}{trend}%
                {trendLabel && <span className="text-gray-400 font-normal"> {trendLabel}</span>}
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ml-3", styles.icon)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
