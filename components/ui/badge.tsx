import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-[#222829] text-[#E5E9F0]",
        primary:     "bg-ocean-turquoise text-white",
        teal:        "bg-[#e8fbf9] text-[#13988f]",
        success:     "bg-green-100 text-green-700",
        warning:     "bg-amber-100 text-amber-700",
        danger:      "bg-red-100 text-red-700",
        info:        "bg-[#e8fbf9] text-[#13988f]",
        outline:     "border border-[#36525a] text-[#E5E9F0] bg-transparent",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
