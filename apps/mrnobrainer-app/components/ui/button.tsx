import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold tracking-[-0.01em] ring-offset-background transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985]",
  {
    variants: {
      variant: {
        default:
          "border border-primary/20 bg-primary text-primary-foreground shadow-[0_18px_34px_rgba(22,126,157,0.24)] hover:bg-primary-hover hover:shadow-[0_22px_40px_rgba(22,126,157,0.28)]",
        destructive:
          "border border-destructive/20 bg-destructive text-destructive-foreground shadow-[0_18px_34px_rgba(198,54,68,0.18)] hover:bg-destructive-hover hover:shadow-[0_22px_40px_rgba(198,54,68,0.24)]",
        outline:
          "glass-chip border-border/70 bg-transparent text-foreground hover:border-primary/25 hover:text-foreground",
        secondary:
          "glass-chip border-transparent bg-secondary/80 text-secondary-foreground hover:bg-secondary-hover",
        ghost: "border border-transparent bg-transparent text-muted-foreground hover:bg-white/35 hover:text-foreground dark:hover:bg-white/10",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4.5 py-2.5",
        sm: "h-9 px-3.5 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
