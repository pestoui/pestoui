import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

/* Presence / state pill. The dot carries the semantic token at full strength;
   the body is a quiet wash of the same hue so a row of these stays calm.
   Note: no status claims --info — blue is reserved for the selected state. */
const statusBadgeVariants = cva(
  "group/status-badge inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full border border-transparent px-2.5 text-caption font-medium whitespace-nowrap transition-all *:data-[slot=status-badge-dot]:size-1.5 *:data-[slot=status-badge-dot]:shrink-0 *:data-[slot=status-badge-dot]:rounded-full",
  {
    variants: {
      status: {
        online:
          "bg-success/10 text-success *:data-[slot=status-badge-dot]:bg-success",
        offline:
          "bg-secondary text-muted-foreground *:data-[slot=status-badge-dot]:bg-muted-foreground",
        busy: "bg-destructive/10 text-destructive dark:bg-destructive/20 *:data-[slot=status-badge-dot]:bg-destructive",
        /* warning-foreground is near-black — readable on the light wash only,
           so dark mode falls back to the hue itself */
        away: "bg-warning/15 text-warning-ink *:data-[slot=status-badge-dot]:bg-warning",
        success:
          "bg-success/10 text-success *:data-[slot=status-badge-dot]:bg-success",
        warning:
          "bg-warning/15 text-warning-ink *:data-[slot=status-badge-dot]:bg-warning",
        error:
          "bg-destructive/10 text-destructive dark:bg-destructive/20 *:data-[slot=status-badge-dot]:bg-destructive",
        neutral:
          "bg-secondary text-muted-foreground *:data-[slot=status-badge-dot]:bg-muted-foreground",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  }
)

/* Same entrance pop as Badge, same reasoning: opt-in, for a pill that arrives
   rather than one that has been sitting there since first paint, and `anim-*`
   so the long entrance does not retime the short colour transition. */
const statusBadgeAppear =
  "animate-in fade-in zoom-in-90 anim-spring-bouncy ease-spring-bouncy"

/* Breathing ring around the dot, for a genuinely live status — a running job,
   a connected peer. A halo that swells and fades reads as "ongoing" where a
   blinking dot reads as "broken". `bg-inherit` picks up whatever colour the
   status variant put on the dot, so the ring never needs its own palette, and
   the resting opacity is 0 — the keyframes own every frame it is visible, so
   with motion reduced it simply is not there. */
const statusBadgePulse =
  "relative after:absolute after:-inset-1 after:animate-pulse-ring after:rounded-full after:bg-inherit after:opacity-0"

function StatusBadge({
  className,
  status = "neutral",
  pulse = false,
  appear = false,
  children,
  ...props
}: React.ComponentProps<"span"> & {
  /* non-nullable so data-status is always a real value for styling hooks */
  status?: NonNullable<VariantProps<typeof statusBadgeVariants>["status"]>
  /* Breathe the dot. Reserved for live statuses — online, running — not as a
     decoration on every pill in a table. */
  pulse?: boolean
  /* Play the entrance pop on mount. */
  appear?: boolean
}) {
  return (
    <span
      data-slot="status-badge"
      data-status={status}
      className={cn(
        statusBadgeVariants({ status }),
        appear && statusBadgeAppear,
        className
      )}
      {...props}
    >
      <span
        data-slot="status-badge-dot"
        aria-hidden="true"
        className={cn(pulse && statusBadgePulse)}
      />
      {children}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants }
