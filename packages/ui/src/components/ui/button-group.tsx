"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"
import { Separator } from "./separator"

/* A segmented cluster of real <Button>s that share edges.
 *
 * The children stay untouched Buttons — every variant, size and state keeps
 * working — and the wrapper rewrites only the shared edges from the outside:
 *
 *   · horizontally the ends stay rounded-lg: the first child keeps its leading
 *     radius, the last keeps its trailing one, everything between squares off
 *   · vertically the ends clamp to rounded-lg instead. A stacked child is wide
 *     and short, so rounded-full on its top two corners only gets scaled up
 *     until it eats the whole edge — the pill domes into an arch. This is the
 *     radius-collapse failure mode, and a stack reads as a full-width control
 *     anyway, which squares to rounded-lg
 *   · icon segments opt out of that clamp. They are square, so there is no arch
 *     to fix, and rounded-lg is a token radius (--radius, 1rem) landing on a
 *     36-40px box: fatter than the squircle Button asked for, and one bump of
 *     --radius away from collapsing the outer edge into a circle. They keep
 *     their own explicit pixel radius instead
 *   · each non-leading child drops the border on its shared edge, so two 1px
 *     hairlines collapse into one instead of stacking into a 2px seam
 *   · the child sitting before a ButtonGroupSeparator drops its trailing border
 *     as well, leaving the separator as the only hairline at that joint
 *   · Button's press feedback is neutralised — both halves of it. A cluster has
 *     to move as one piece: a single segment dropping 1px tears the shared edge
 *     open, and its press scale does the same thing twice as badly, since a
 *     segment shrinking toward its own centre pulls *both* of its edges inward
 *     and opens a gap on either side of it. Neither is a per-segment gesture
 *     once the segments share a border
 *   · the press is handed back to the group instead, which is the only element
 *     that can carry it without a seam to tear. It is a far smaller scale than
 *     a lone Button's — the cluster is several times the width, and equal
 *     percentages do not read as equal movement at different sizes
 *
 * "Untouched Buttons" is about what the wrapper does to a child, not about what
 * a child is allowed to be. A child that renders NO DOM of its own is legal,
 * and is how a split button gets built: DropdownMenu.Root emits no element, so
 * with `asChild` on its trigger the Button underneath is the group's real
 * element child and every rule above still lands on it. Measured on the docs
 * page: the group keeps three element children (button, separator, button), the
 * trigger still matches `:last-child` and keeps its trailing radius, and still
 * drops its left border as `:not(:first-child)`. The line to watch is the other
 * one — a wrapper that DOES emit an element becomes the child, and the radius
 * and border rewrites land on the wrapper while the Button inside keeps all
 * four of its own corners and borders.
 *
 * The child selectors land at (0,2,0) or better, which outranks Button's own
 * `rounded-lg` / `border` (0,1,0) without reaching for !important. The two
 * neutralising rules are the exception: Button qualifies its press with enough
 * :not() guards to outrank them on specificity, so those carry the flag. */
const buttonGroupVariants = cva(
  "group/button-group isolate flex w-fit items-stretch transition-transform duration-fast ease-out-expo has-[:active]:scale-99 has-[:active]:duration-spring-press has-[:active]:ease-spring-press [&>*]:relative [&>*]:active:translate-y-0! [&>*]:active:scale-none! [&>*]:hover:z-10 [&>*]:focus-visible:z-10",
  {
    variants: {
      orientation: {
        horizontal:
          "flex-row rounded-lg [&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none [&>*:has(+[data-slot=button-group-separator])]:border-r-0",
        vertical:
          "flex-col rounded-lg [&>*:not([data-size^='icon']):first-child]:rounded-t-lg [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not([data-size^='icon']):last-child]:rounded-b-lg [&>*:not(:last-child)]:rounded-b-none [&>*:has(+[data-slot=button-group-separator])]:border-b-0",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
)

const ButtonGroupContext = React.createContext<{
  orientation: "horizontal" | "vertical"
}>({ orientation: "horizontal" })

function ButtonGroup({
  className,
  orientation = "horizontal",
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof buttonGroupVariants> & {
    orientation?: "horizontal" | "vertical"
  }) {
  return (
    <div
      data-slot="button-group"
      data-orientation={orientation}
      role="group"
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    >
      <ButtonGroupContext.Provider value={{ orientation }}>
        {children}
      </ButtonGroupContext.Provider>
    </div>
  )
}

/* Hairline between two segments. Decorative by default (role="none") — the
 * buttons either side already carry their own accessible names.
 *
 * It runs perpendicular to the group, which it reads from context rather than
 * from a CSS override: `group-data-vertical/*` compiles down to (0,1,0) and
 * sorts ahead of Separator's own `data-vertical:w-px`, so an override there
 * would lose the tie and leave a 1px sliver in a vertical group. */
function ButtonGroupSeparator({
  className,
  orientation,
  ...props
}: React.ComponentProps<typeof Separator>) {
  const group = React.useContext(ButtonGroupContext)
  const resolved =
    orientation ?? (group.orientation === "vertical" ? "horizontal" : "vertical")

  return (
    <Separator
      data-slot="button-group-separator"
      orientation={resolved}
      decorative
      className={cn("bg-border", className)}
      {...props}
    />
  )
}

export { ButtonGroup, ButtonGroupSeparator, buttonGroupVariants }
