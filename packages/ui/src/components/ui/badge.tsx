import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "../../lib/utils"

/* The font size lives only in the variants, one per variant: cva joins base and
   variant without merging, so a size in both would leave the winner of
   badgeVariants() used without cn() to stylesheet order. cva returns no variant
   class for a null variant, so a compound variant restores the base size there:
   badgeVariants({ variant: null }) still carries exactly one size class. */
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-caption text-primary-foreground [a]:hover:bg-primary/80",
        /* Ink is --secondary-foreground, matching every other filled variant
           here: a fill token travels with its own foreground token. This one
           reached for --muted-foreground instead — a *text* role, never
           declared as the ink for this surface — and landed at 3.26:1. */
        secondary:
          "bg-secondary text-caption text-secondary-foreground [a]:hover:bg-secondary/80",
        count:
          "h-5 min-w-5 justify-center bg-info px-1 text-micro font-semibold text-info-foreground tabular-nums",
        /* The tinted trio takes --<tone>-ink, not --<tone>. The fill token is
           chosen to be a vivid fill and cannot also be legible on a 10% wash
           of itself — see the note beside the tokens in index.css. */
        info: "bg-info/10 text-caption text-info-ink",
        success: "bg-success/10 text-caption text-success-ink",
        warning: "bg-warning/15 text-caption text-warning-ink",
        destructive:
          "bg-destructive/10 text-caption text-destructive-ink focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-caption text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "text-caption hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-caption text-primary underline-offset-4 hover:underline",
      },
    },
    compoundVariants: [{ variant: null, class: "text-caption" }],
    defaultVariants: {
      variant: "default",
    },
  },
)

/* Entrance pop — 0.9 → 1 with the opacity, on the bouncy spring. A badge is
   small, arrives rarely, and carries news ("3 new", "Live"), which is exactly
   the low-frequency moment overshoot is reserved for.

   Opt-in, because the animation fires on mount and a badge that is simply
   always there has not *appeared* — a wall of them popping on first paint is
   the failure mode. Reach for it when the badge shows up in response to
   something: a count landing, a status flipping, a filter chip being added.

   `anim-*` rather than `duration-*`: the pill already carries `transition-all`
   for its colour, and the entrance runs long while that stays short. */
const badgeAppear =
  "animate-in fade-in zoom-in-90 anim-spring-bouncy ease-spring-bouncy"

function Badge({
  className,
  variant = "default",
  asChild = false,
  appear = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
    /* Play the entrance pop on mount. For badges that arrive, not ones that
       are always on screen. */
    appear?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), appear && badgeAppear, className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
