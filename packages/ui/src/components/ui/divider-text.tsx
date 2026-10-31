import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

/* Content divider — two hairlines with a label, badge or button between them.
   Alignment is a matter of which rule grows: `center` splits the remainder
   evenly, `start`/`end` pin the content behind a short lead-in.

   The rules are styled from the root so the two spans stay dumb markup, and no
   two variants ever set the same property on the same selector — a `flex-1` and
   a `flex-none` racing on one element would resolve by stylesheet order, not by
   class order, and silently pick a winner. */
const dividerTextVariants = cva(
  "flex w-full items-center gap-3 text-caption text-muted-foreground [&>[data-slot=divider-text-rule]]:border-t [&>[data-slot=divider-text-rule]]:border-border",
  {
    variants: {
      align: {
        center: "[&>[data-slot=divider-text-rule]]:flex-1",
        start:
          "[&>[data-side=leading]]:w-6 [&>[data-side=leading]]:flex-none [&>[data-side=trailing]]:flex-1",
        end: "[&>[data-side=leading]]:flex-1 [&>[data-side=trailing]]:w-6 [&>[data-side=trailing]]:flex-none",
      },
    },
    defaultVariants: {
      align: "center",
    },
  }
)

/* Deliberately not role="separator": the content slot is meant to hold a Badge
   or a button, and a separator must not own focusable descendants. The rules
   are decorative and hidden; the label announces as ordinary text. */
function DividerText({
  className,
  align = "center",
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof dividerTextVariants>) {
  return (
    <div
      data-slot="divider-text"
      data-align={align}
      className={cn(dividerTextVariants({ align }), className)}
      {...props}
    >
      <span
        data-slot="divider-text-rule"
        data-side="leading"
        aria-hidden="true"
      />
      {children ? (
        <span
          data-slot="divider-text-label"
          className="flex shrink-0 items-center gap-2"
        >
          {children}
        </span>
      ) : null}
      <span
        data-slot="divider-text-rule"
        data-side="trailing"
        aria-hidden="true"
      />
    </div>
  )
}

export { DividerText, dividerTextVariants }
