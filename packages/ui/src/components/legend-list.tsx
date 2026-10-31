import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"
import { segmentedBarDotVariants, type SegmentedBarTone } from "./segmented-bar"

/* A chart key read name-first: the dot, the name at full ink, and the figure
   beside it. SegmentedBar ships a legend of its own and it reads the other way
   round — a muted name and a bare value at full ink — which suits a caption
   under the bar and not a key that carries formatted figures. This is that key.

   The swatch comes from `segmentedBarDotVariants`, the same record that paints
   the band, so a legend row and the band it names cannot resolve to different
   tokens. The name is always printed: the colour is never the only key.

   An `items` array rather than compound children: every row is the same four
   parts, and the two variants lay the figure out differently, so the list
   decides the row markup instead of asking each caller to repeat it. */
const legendListVariants = cva("", {
  variants: {
    variant: {
      /* A loose stack: name left, muted figure pushed right. */
      plain: "flex flex-col gap-3.5",
      /* Hairline rules between rows, a figure with an optional share under it. */
      divided: "divide-y divide-border",
    },
  },
  defaultVariants: {
    variant: "plain",
  },
})

const legendListItemVariants = cva("", {
  variants: {
    variant: {
      plain: "flex items-center gap-3 text-body-md leading-tight",
      divided: "flex items-center gap-2.5 py-2.5",
    },
  },
  defaultVariants: {
    variant: "plain",
  },
})

type LegendListVariant = NonNullable<VariantProps<typeof legendListVariants>["variant"]>

type LegendListItem = {
  id: string
  label: React.ReactNode
  tone: SegmentedBarTone
  /** The row's figure — a duration, a count, a formatted amount. */
  figure: React.ReactNode
  /** A muted second figure under the first, such as a share. `divided` only. */
  detail?: React.ReactNode
}

type LegendListProps = Omit<React.ComponentProps<"ul">, "children"> & {
  items: LegendListItem[]
  variant?: LegendListVariant
}

function LegendList({
  items,
  variant = "plain",
  className,
  ...props
}: LegendListProps) {
  return (
    <ul
      data-slot="legend-list"
      data-variant={variant}
      className={cn(legendListVariants({ variant }), className)}
      {...props}
    >
      {items.map((item) => (
        <li
          key={item.id}
          data-slot="legend-list-item"
          className={legendListItemVariants({ variant })}
        >
          <span
            aria-hidden="true"
            data-slot="legend-list-swatch"
            className={cn(segmentedBarDotVariants({ tone: item.tone }), "size-2.5")}
          />
          {variant === "divided" ? (
            <>
              <span data-slot="legend-list-label" className="min-w-0 flex-1 truncate">
                {item.label}
              </span>
              {/* The wrapper's leading-tight would reach the detail too, so the
                  detail sets its own line height back to 20px. */}
              <span className="flex flex-col items-end leading-tight">
                <span data-slot="legend-list-figure" className="tabular-nums">
                  {item.figure}
                </span>
                {/* null and false are what `cond && node` leaves behind:
                    nothing to print, so no element. */}
                {item.detail != null && item.detail !== false ? (
                  <span
                    data-slot="legend-list-detail"
                    className="text-body-sm leading-5 text-muted-foreground tabular-nums"
                  >
                    {item.detail}
                  </span>
                ) : null}
              </span>
            </>
          ) : (
            <>
              <span data-slot="legend-list-label" className="min-w-0 truncate">
                {item.label}
              </span>
              <span
                data-slot="legend-list-figure"
                className="ml-auto shrink-0 text-muted-foreground tabular-nums"
              >
                {item.figure}
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}

export { LegendList, legendListVariants, legendListItemVariants }
export type { LegendListProps, LegendListItem, LegendListVariant }
