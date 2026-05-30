"use client"
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-turquoise focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f4ef]",
  {
    variants: {
      variant: {
        default:     "bg-ocean-turquoise text-white hover:bg-[#25BDB3] shadow-[0_8px_22px_rgba(64,224,208,0.24)]",
        primary:     "bg-ocean-turquoise text-white hover:bg-[#25BDB3] shadow-[0_8px_22px_rgba(64,224,208,0.24)]",
        secondary:   "border border-[#e5dfd2] bg-white text-[#1f2933] hover:bg-[#f8f6f0] shadow-sm",
        teal:        "bg-ocean-turquoise text-white hover:bg-[#25BDB3] shadow-[0_8px_22px_rgba(64,224,208,0.22)]",
        outline:     "border border-[#cbbf9f] bg-white text-[#1f2933] hover:bg-[#f8f6f0] shadow-sm",
        ghost:       "bg-transparent text-[#1f2933] hover:bg-[#f8f6f0]",
        destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
        link:        "text-ocean-turquoise underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-8 px-3 text-xs",
        lg:      "h-11 px-6",
        icon:    "h-9 w-9",
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size:    "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        type={asChild ? undefined : type ?? "button"}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
