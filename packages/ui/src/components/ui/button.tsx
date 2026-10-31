import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "../../lib/utils"

/* Motion: hover colour resolves at `duration-fast` so it reads as instant, and
   the press is a small spring scale on top of the existing 1px sink. Timing is
   swapped only for the duration of `:active`, so the press settles on a spring
   and the release runs back on the shorter base tween — enter long, exit short.
   No hover scale: at this many buttons per screen it reads as noise, and it
   fights the press. `not-disabled` keeps the press inert on a disabled button,
   and the `aria-haspopup` guard matches the sink — a trigger that scales would
   drag its anchored popup with it. */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-clip-padding shadow-xs text-body font-medium whitespace-nowrap transition-all duration-fast ease-out-expo outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:duration-spring-press active:ease-spring-press active:not-aria-[haspopup]:translate-y-px active:not-aria-[haspopup]:not-disabled:scale-97 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground bg-clip-border shadow-none hover:bg-primary/90",
        outline:
          "border-border/70 bg-card text-foreground hover:bg-accent hover:text-foreground aria-expanded:bg-accent dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-accent aria-expanded:bg-accent",
        ghost:
          "shadow-none hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        inverse:
          "bg-inverse-foreground text-inverse hover:bg-inverse-foreground/90",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-info underline-offset-4 shadow-none hover:underline",
      },
      size: {
        xs: "h-7 gap-1 rounded-md px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 rounded-md px-4 text-sm",
        default: "h-10 px-5",
        lg: "h-11 px-6",
        xl: "h-14 gap-2.5 px-7 text-base font-semibold [&_svg:not([class*='size-'])]:size-5",
        /* Icon buttons are squircles, not circles, so they echo the card corners */
        icon: "size-10 rounded-[13px]",
        "icon-sm": "size-9 rounded-[11px]",
        "icon-lg": "size-11 rounded-[15px]",
        "icon-round": "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
