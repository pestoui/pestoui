import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

/* A CSS ring rather than an icon, so it takes its colour from whatever it
   sits inside — a button label, muted body text, a destructive tint.
   The faint full border is the track; the solid top edge is the head.

   The rotation stays linear on purpose. A continuous loop has no start and no
   end to ease into, so any easing shows up as a stutter every time the head
   crosses the seam. */
const spinnerVariants = cva(
  "inline-block shrink-0 animate-spin rounded-full border-current/20 border-t-current align-middle",
  {
    variants: {
      size: {
        xs: "size-3 border-[1.5px]",
        sm: "size-4 border-2",
        default: "size-5 border-2",
        lg: "size-7 border-[2.5px]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function Spinner({
  className,
  size = "default",
  label = "Loading",
  ...props
}: Omit<React.ComponentProps<"span">, "children"> &
  VariantProps<typeof spinnerVariants> & {
    label?: string
  }) {
  return (
    <span
      data-slot="spinner"
      data-size={size}
      role="status"
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    >
      <span className="sr-only">{label}</span>
    </span>
  )
}

/* Inline pending state — quieter than a spinner, reads as "still typing". */
const loadingDotsVariants = cva(
  "inline-flex items-center align-middle *:data-[slot=loading-dot]:animate-bounce *:data-[slot=loading-dot]:rounded-full *:data-[slot=loading-dot]:bg-current",
  {
    variants: {
      size: {
        xs: "gap-0.5 *:data-[slot=loading-dot]:size-1",
        sm: "gap-0.5 *:data-[slot=loading-dot]:size-1.5",
        default: "gap-1 *:data-[slot=loading-dot]:size-2",
        lg: "gap-1.5 *:data-[slot=loading-dot]:size-2.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

/* One stagger unit per dot, so the wave is a token rather than three typed
   numbers and it flattens to nothing when motion is reduced. */
const loadingDotOffsets = [0, 1, 2]

function LoadingDots({
  className,
  size = "default",
  label = "Loading",
  ...props
}: Omit<React.ComponentProps<"span">, "children"> &
  VariantProps<typeof loadingDotsVariants> & {
    label?: string
  }) {
  return (
    <span
      data-slot="loading-dots"
      data-size={size}
      role="status"
      className={cn(loadingDotsVariants({ size }), className)}
      {...props}
    >
      {loadingDotOffsets.map((offset) => (
        <span
          key={offset}
          data-slot="loading-dot"
          aria-hidden="true"
          /* Inline delay beats the animation shorthand the utility sets. */
          style={{ animationDelay: `calc(var(--stagger-loose) * ${offset})` }}
        />
      ))}
      <span className="sr-only">{label}</span>
    </span>
  )
}

export { Spinner, spinnerVariants, LoadingDots, loadingDotsVariants }
