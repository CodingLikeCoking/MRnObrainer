"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "glass-toolbar peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-border/70 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary/90 data-[state=checked]:border-primary/35 data-[state=unchecked]:bg-background/65",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-white ring-0 shadow-[0_8px_18px_rgba(15,23,42,0.22)] transition-transform duration-200 data-[state=checked]:translate-x-[1.2rem] data-[state=unchecked]:translate-x-0.5 dark:bg-slate-950"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
