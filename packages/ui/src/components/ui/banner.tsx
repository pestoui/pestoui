import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "../../lib/utils"

/* Page-level announcement bar. Wider and quieter than Alert: Alert is an inline
   block inside content, Banner spans the full width of the region it heads.
   The semantic tints are the exact Alert set so the two never disagree.

   The arrival is the same idea as Alert's, one notch heavier: a banner heads a
   region, so it counts as chrome and takes the wider blur. Panel spring, and it
   materialises from the edge it is attached to rather than from below. */
const bannerVariants = cva(
  "group/banner relative flex w-full items-center gap-3 text-left text-body animate-in fade-in-0 blur-in-6 anim-spring-panel ease-spring-panel has-data-[slot=banner-close]:pe-12",
  {
    variants: {
      variant: {
        default:
          "border-border/70 bg-card text-card-foreground *:data-[slot=banner-icon]:text-muted-foreground",
        info: "border-info/20 bg-info/8 text-foreground *:data-[slot=banner-icon]:text-info",
        success:
          "border-success/20 bg-success/8 text-foreground *:data-[slot=banner-icon]:text-success",
        warning:
          "border-warning/30 bg-warning/12 text-foreground *:data-[slot=banner-icon]:text-warning",
        destructive:
          "border-destructive/20 bg-destructive/8 text-foreground *:data-[slot=banner-icon]:text-destructive",
      },
      /* Edge-to-edge is a rule, not a card: square corners, one hairline underneath.
         Floating lifts the same bar into an inset card on the third elevation tier.
         The entrance follows the same split — the rule drops in from the edge it
         is pinned to, the card rises the way every other loose surface does. */
      floating: {
        false:
          "rounded-none border-x-0 border-t-0 border-b px-4 py-3 slide-in-from-top-2 sm:px-6",
        true: "rounded-xl border px-4 py-3.5 shadow-card slide-in-from-bottom-2 sm:px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      floating: false,
    },
  }
)

function Banner({
  className,
  variant = "default",
  floating = false,
  icon,
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof bannerVariants> & {
    icon?: React.ReactNode
  }) {
  /* Errors interrupt, everything else waits for a pause. Declared before the
     spread so a consumer can still override the role. */
  const role = variant === "destructive" ? "alert" : "status"

  return (
    <div
      data-slot="banner"
      data-variant={variant}
      data-floating={floating ? "true" : "false"}
      role={role}
      className={cn(bannerVariants({ variant, floating }), className)}
      {...props}
    >
      {icon ? (
        <span
          data-slot="banner-icon"
          aria-hidden="true"
          className="flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4.5"
        >
          {icon}
        </span>
      ) : null}
      <div
        data-slot="banner-content"
        className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1"
      >
        {children}
      </div>
    </div>
  )
}

function BannerTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="banner-title"
      className={cn(
        "font-semibold tracking-snug [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function BannerDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="banner-description"
      className={cn(
        "min-w-0 text-body leading-normal text-muted-foreground [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function BannerActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="banner-actions"
      className={cn("ms-auto flex shrink-0 items-center gap-2", className)}
      {...props}
    />
  )
}

/* Icon button — squircle, never a circle. 32px box keeps the 2px-per-4px
   series the Button icon sizes run on (36 -> 11, 40 -> 13, 44 -> 15). */
function BannerClose({
  className,
  children,
  "aria-label": ariaLabel = "Dismiss",
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="banner-close"
      aria-label={ariaLabel}
      className={cn(
        "absolute end-3 top-1/2 inline-flex size-8 -translate-y-1/2 shrink-0 items-center justify-center rounded-[9px] text-muted-foreground transition-all duration-fast ease-out-expo outline-none select-none hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-90 active:duration-spring-press active:ease-spring-press disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-foreground/10 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children ?? <X aria-hidden="true" />}
    </button>
  )
}

export {
  Banner,
  BannerTitle,
  BannerDescription,
  BannerActions,
  BannerClose,
  bannerVariants,
}
