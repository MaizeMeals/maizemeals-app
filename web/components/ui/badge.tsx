import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        // --- MaizeMeals variants (see docs/design-system.md) ---
        /** Highest emphasis: brand maize fill (e.g. strong match). */
        maize: "border-transparent bg-maize text-umich-blue",
        /** Brand tint: ratings, medium emphasis. */
        "maize-soft": "border-transparent bg-maize/20 text-foreground",
        /** Live/positive state: open, serving now. */
        success:
          "border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200",
        /** Time-sensitive: closing soon. */
        warning:
          "border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200",
        /** Negative state: closed. */
        danger:
          "border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
        /** Low emphasis metadata. */
        muted: "border-transparent bg-muted text-muted-foreground",
      },
      shape: {
        default: "rounded-md",
        pill: "rounded-full px-2",
      },
    },
    defaultVariants: {
      variant: "default",
      shape: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, shape, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, shape }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
