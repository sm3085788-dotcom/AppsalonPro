import { forwardRef } from "react"
import { cn } from "@/lib/utils"

/*
  REUSABLE BUTTON COMPONENT
  =========================
  Variants: Primary / Secondary / Outline (Ghost)
  All variants share consistent height (48px mobile / 44px desktop)
  Increased touch targets for salon staff tablets
*/

export interface SalonButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline"
  size?: "default" | "lg"
}

const SalonButton = forwardRef<HTMLButtonElement, SalonButtonProps>(
  ({ className, variant = "primary", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles - all variants
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "rounded-xl", // 12px radius
          // Size variants - increased touch targets
          size === "default" && "h-12 px-6 text-sm min-w-[120px]",
          size === "lg" && "h-14 px-8 text-base min-w-[160px]",
          // Color variants
          variant === "primary" && [
            "bg-primary text-primary-foreground",
            "hover:opacity-90 active:scale-[0.98]",
            "shadow-sm",
          ],
          variant === "secondary" && [
            "bg-secondary text-secondary-foreground",
            "hover:bg-secondary/80 active:scale-[0.98]",
            "border border-border",
          ],
          variant === "outline" && [
            "bg-transparent text-foreground",
            "border border-border",
            "hover:bg-secondary hover:border-primary/20 active:scale-[0.98]",
          ],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
SalonButton.displayName = "SalonButton"

export { SalonButton }
