"use client"

import { Toaster as Sonner } from "sonner"
import { useTheme } from "@/components/theme-provider"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast glass-panel group-[.toaster]:bg-background/75 group-[.toaster]:text-foreground group-[.toaster]:border-border/70 group-[.toaster]:shadow-glass-strong",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:glass-chip group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:glass-chip group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
