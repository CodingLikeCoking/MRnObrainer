import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "glass-chip inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.03em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/15 bg-primary text-primary-foreground",
        secondary:
          "border-border/50 bg-secondary/80 text-secondary-foreground",
        destructive:
          "border-destructive/15 bg-destructive text-destructive-foreground",
        outline: "border-border/70 bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div aria-label="health-status-badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
