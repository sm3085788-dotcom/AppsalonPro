"use client"

import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

/*
  QUICK ACTION CARD COMPONENT
  ===========================
  Rounded cards (24px radius) for quick actions
  Large touch targets for tablet use
*/

interface ActionCardProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  onClick?: () => void
  className?: string
}

export function ActionCard({
  icon,
  title,
  subtitle,
  onClick,
  className,
}: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full flex items-center gap-4 p-5",
        "bg-card rounded-2xl border border-border",
        "transition-all duration-200 ease-out",
        "hover:border-primary/30 hover:shadow-sm",
        "active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "min-h-[72px]", // Touch target for tablets
        className
      )}
    >
      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-foreground/70">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="font-medium text-foreground">{title}</p>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
    </button>
  )
}
