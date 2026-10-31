import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"
import { Badge } from "./badge"

/* Announcement chip — a pill carrying a leading Badge, a short line of trailing
 * copy and an optional addon mark: "New · Introducing agents ->".
 *
 * The leading chip is the real <Badge>, so the semantic tint scale stays a
 * single source of truth and this component never invents a fill. Note that the
 * semantic variants read as tints rather than solid blocks on purpose: a solid
 * --info pill here would compete with the selected/active state, which is the
 * one thing blue is allowed to mean. */
/* Motion lives entirely in the addon below — the chip itself only resolves its
   border colour, and does it fast enough to read as instant. No press feedback:
   this is a span, and a span takes `:active` on mousedown whether or not the
   consumer wrapped it in something clickable, so a press scale here would fire
   on an announcement that does not go anywhere. */
const badgeGroupVariants = cva(
  "group/badge-group inline-flex h-8 w-fit shrink-0 items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1 text-caption font-medium whitespace-nowrap text-foreground shadow-soft transition-colors duration-fast ease-out-expo outline-none has-data-[slot=badge-group-addon]:pr-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        default: "border-border/70 dark:border-input",
        info: "border-info/25 dark:border-info/35",
        success: "border-success/25 dark:border-success/35",
        warning: "border-warning/35 dark:border-warning/45",
        destructive: "border-destructive/25 dark:border-destructive/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function BadgeGroup({
  className,
  variant = "default",
  badgeLabel,
  addon,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeGroupVariants> & {
    /* Text for the leading Badge — "New", "Beta", "v2.4". */
    badgeLabel: React.ReactNode
    /* Decorative trailing mark, usually a chevron or arrow. */
    addon?: React.ReactNode
  }) {
  return (
    <span
      data-slot="badge-group"
      data-variant={variant}
      className={cn(badgeGroupVariants({ variant }), className)}
      {...props}
    >
      <Badge variant={variant}>{badgeLabel}</Badge>
      <span data-slot="badge-group-label">{children}</span>
      {addon ? (
        <span
          data-slot="badge-group-addon"
          aria-hidden="true"
          /* The nudge is the whole affordance — it is what tells you the chip
             leads somewhere. Travel between two known positions, so it rides the
             glide spring, but the timing is swapped in only while the chip is
             hovered: leaving runs back on the short tween instead of springing,
             which on a reversal would read as the arrow bobbing loose. */
          className="flex items-center text-muted-foreground transition-transform duration-exit ease-out-expo group-hover/badge-group:translate-x-0.5 group-hover/badge-group:duration-spring-glide group-hover/badge-group:ease-spring-glide [&>svg]:size-3.5 [&>svg]:shrink-0"
        >
          {addon}
        </span>
      ) : null}
    </span>
  )
}

export { BadgeGroup, badgeGroupVariants }
