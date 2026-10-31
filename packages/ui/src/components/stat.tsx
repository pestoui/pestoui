import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/* A cardless typographic stat: a figure, an optional muted unit, a caption and
   a delta. MetricCard is the same trio wearing its own Card; this is the trio
   alone, so it can sit inside a card, a table cell or a hero without bringing a
   second surface with it.

   The size lands on the root as a font-size, and the value is the only part
   that inherits it. Every other part states its own size, weight, family and
   tracking outright. That is deliberate: a caller's `font-mono` or
   `font-normal` on the root is how a monospace or regular-weight figure is
   asked for, and it must reach the value without leaking into the caption
   beside it.

   No client directive. The only hook is useId, which React's server build exports,
   and there are no function-valued props — a delta formatter would be a
   closure created on every render and would drag the file across the client
   boundary. Callers compose the delta as a node instead. */
const statVariants = cva("flex min-w-0 flex-col font-semibold tracking-tight", {
  variants: {
    size: {
      sm: "gap-1 text-2xl",
      default: "gap-1.5 text-3xl",
      lg: "gap-2 text-4xl",
      xl: "gap-2 text-5xl",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

/* A unit is a qualifier, not a second figure, so it steps well down from the
   value — about half its size — and drops to muted. It keeps the root's family
   and weight on purpose: "/ 5,000" beside a monospace "2,380" should be monospace
   too. Tracking resets because tight tracking on small text closes the counters
   up.

   leading-0 keeps the unit out of the line-box arithmetic. At line-height 1 a
   smaller run on the same baseline still hangs its descent below the value's
   and grows the row by about 2px, so a stat with a unit would sit taller than
   its neighbour without one. A wrapped unit still gets a full line, because the
   figure's own strut sets the height of every line it opens. */
const statUnitVariants = cva("leading-0 tracking-normal text-muted-foreground", {
  variants: {
    size: {
      sm: "text-sm",
      default: "text-base",
      lg: "text-lg",
      xl: "text-xl",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

/* Label and delta share one caption scale. Family, weight and tracking are
   restated rather than inherited — the root carries the value's typography, and
   without these resets a monospace or semibold figure turns its own caption
   monospace and semibold too. */
const statCaptionVariants = cva(
  "font-sans leading-snug font-normal tracking-normal text-muted-foreground",
  {
    variants: {
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-sm",
        xl: "text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
)

type StatSize = NonNullable<VariantProps<typeof statVariants>["size"]>

type StatLabelPosition = "above" | "below" | "inline"

type StatDeltaPlacement = "inline" | "below"

type StatProps = Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof statVariants> & {
    /** The figure. A node, so it can host a NumberTicker or composed parts. */
    value: React.ReactNode
    /**
     * Muted, smaller, on the value's baseline and flush against it — begin the
     * text with a space (`" / 1000"`) when the design has one.
     */
    unit?: React.ReactNode
    /** What the figure measures. When present the root becomes a labelled group. */
    label?: React.ReactNode
    /**
     * `"above"` and `"below"` stack the label on its own line; `"inline"` sets it
     * on the value's baseline, after the value and any inline delta.
     */
    labelPosition?: StatLabelPosition
    /**
     * Any node — compose it from `metricDeltaVariants({ trend })` and the glyph
     * the design uses. The slot itself is muted caption text, so trailing copy
     * such as "vs last week" needs no styling of its own.
     */
    delta?: React.ReactNode
    /** `"inline"` sits the delta on the value's row; `"below"` gives it its own line. */
    deltaPlacement?: StatDeltaPlacement
    /** A node on the value row, before the figure, vertically centred — an icon or a dot. */
    leading?: React.ReactNode
  }

function Stat({
  value,
  unit,
  label,
  labelPosition = "above",
  delta,
  deltaPlacement = "below",
  leading,
  size = "default",
  className,
  ...props
}: StatProps) {
  const labelId = React.useId()
  const hasLabel = label != null && label !== false && label !== ""
  const hasDelta = delta != null && delta !== false && delta !== ""
  const caption = statCaptionVariants({ size })

  /* `flex` rather than block so a leading dot or icon passed inside the label
     centres on the text without the caller writing a wrapper. As a flex item on
     the value row it still aligns on its first baseline. */
  const labelNode = hasLabel ? (
    <span
      id={labelId}
      data-slot="stat-label"
      className={cn("flex min-w-0 items-center gap-2", caption)}
    >
      {label}
    </span>
  ) : null

  const deltaNode = hasDelta ? (
    <span
      data-slot="stat-delta"
      className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1", caption)}
    >
      {delta}
    </span>
  ) : null

  return (
    <div
      data-slot="stat"
      data-size={size}
      role={hasLabel ? "group" : undefined}
      aria-labelledby={hasLabel ? labelId : undefined}
      className={cn(statVariants({ size }), className)}
      {...props}
    >
      {labelPosition === "above" ? labelNode : null}

      {/* Baseline alignment is what lets an inline caption read as part of the
          figure rather than floating beside it. It wraps instead of overflowing:
          a narrow column pushes the inline delta and label onto a second line. */}
      <div
        data-slot="stat-row"
        className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1"
      >
        {leading != null ? (
          <span
            data-slot="stat-leading"
            className="inline-flex shrink-0 items-center self-center"
          >
            {leading}
          </span>
        ) : null}

        {/* An inline formatting context, not a flex row: the value and unit
            share a baseline for free at two different sizes, and whitespace
            the caller writes into the unit survives. leading-none sits here
            and not only on the value, because the line box would otherwise
            take the root's strut height and pad the figure back out. */}
        <span data-slot="stat-figure" className="min-w-0 leading-none">
          <span data-slot="stat-value" className="text-foreground tabular-nums">
            {value}
          </span>
          {unit != null ? (
            <span data-slot="stat-unit" className={statUnitVariants({ size })}>
              {unit}
            </span>
          ) : null}
        </span>

        {deltaPlacement === "inline" ? deltaNode : null}
        {labelPosition === "inline" ? labelNode : null}
      </div>

      {labelPosition === "below" ? labelNode : null}
      {deltaPlacement === "below" ? deltaNode : null}
    </div>
  )
}

export { Stat, statVariants }
export type { StatProps, StatSize, StatLabelPosition, StatDeltaPlacement }
