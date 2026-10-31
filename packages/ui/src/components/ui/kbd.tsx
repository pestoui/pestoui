import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

/* Explicit pixel radii — a token radius would round a 24px key into a pill.
   min-w matches the height so single characters read square.
   The font size lives only in the size variants, one per size: cva joins base
   and variant without merging, so a size in both would leave the winner of
   kbdVariants() used without cn() to stylesheet order. cva returns no size
   class for a null size, so a compound variant restores the default size there:
   kbdVariants({ size: null }) still carries exactly one size class. */
const kbdVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-0.5 rounded-[6px] border border-border bg-card align-middle font-mono font-medium tracking-normal whitespace-nowrap text-muted-foreground shadow-soft select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      variant: {
        default: "dark:border-input dark:bg-input/30",
        muted: "border-transparent bg-secondary shadow-none dark:bg-muted/60",
        inverse:
          "border-inverse-foreground/15 bg-inverse-foreground/10 text-inverse-muted shadow-none",
      },
      size: {
        sm: "h-5 min-w-5 rounded-[5px] px-1 text-micro",
        default: "h-6 min-w-6 px-1.5 text-caption-sm",
        lg: "h-7 min-w-7 rounded-[7px] px-2 text-caption",
      },
    },
    compoundVariants: [{ size: null, class: "text-caption-sm" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Kbd({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"kbd"> & VariantProps<typeof kbdVariants>) {
  return (
    <kbd
      data-slot="kbd"
      data-variant={variant}
      data-size={size}
      className={cn(kbdVariants({ variant, size }), className)}
      {...props}
    />
  )
}

/* The separator stays readable to assistive tech — "Ctrl + K" and "G then H"
   are meaningful, not decoration. */
function KbdGroup({
  className,
  separator = "+",
  children,
  ...props
}: React.ComponentProps<"span"> & { separator?: React.ReactNode }) {
  const keys = React.Children.toArray(children)

  return (
    <span
      data-slot="kbd-group"
      className={cn(
        "inline-flex w-fit items-center gap-1 align-middle text-caption-sm text-muted-foreground",
        className,
      )}
      {...props}
    >
      {keys.map((child, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span
              data-slot="kbd-separator"
              className="px-px font-medium text-muted-foreground select-none"
            >
              {separator}
            </span>
          )}
          {child}
        </React.Fragment>
      ))}
    </span>
  )
}

export { Kbd, KbdGroup, kbdVariants }
