import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/* Dot-matrix column series: one column per sample, each a bottom-aligned stack
   of round dots whose count is the value. A compact trend that sits beside a
   figure, in the same family as Sparkline, TickStrip and HeatGrid — none of
   which can draw it. HeatGrid encodes value as opacity and paints its zero cell
   muted, so the space above a column would fill with grey squares; Sparkline's
   bars stretch under preserveAspectRatio="none" and would turn dots into
   ellipses.

   The unlit space above a column is never painted. A column holds only its lit
   dots and the root aligns columns to the bottom, so whatever surface the strip
   sits on shows through above each one.

   The tone lands on the root as a text colour and every dot paints from
   currentColor. Nothing here is text, so that colour carries no contrast
   requirement of its own; it only names the fill.

   No client directive: it renders from props alone, with no hooks and no
   function-valued props. */
const dotBarsVariants = cva(
  "inline-flex max-w-full items-end justify-end gap-(--dot-gap) overflow-hidden",
  {
    variants: {
      tone: {
        selected: "text-selected",
        success: "text-success",
        warning: "text-warning",
        destructive: "text-destructive",
        info: "text-info",
        muted: "text-muted-foreground",
        "chart-1": "text-chart-1",
        "chart-2": "text-chart-2",
        "chart-3": "text-chart-3",
        "chart-4": "text-chart-4",
        "chart-5": "text-chart-5",
      },
      /* Custom properties rather than per-dot classes, so the dot, the gap
         between dots and the gap between columns are one number each and the
         root's height can be derived from them below. */
      size: {
        sm: "[--dot-gap:--spacing(0.5)] [--dot:--spacing(1)]",
        default: "[--dot-gap:--spacing(0.75)] [--dot:--spacing(1.5)]",
      },
    },
    defaultVariants: {
      tone: "selected",
      size: "default",
    },
  },
)

type DotBarsTone = NonNullable<VariantProps<typeof dotBarsVariants>["tone"]>
type DotBarsSize = NonNullable<VariantProps<typeof dotBarsVariants>["size"]>

const DEFAULT_ROWS = 6

/* Locale pinned so the server and the client speak the same summary — an
   unpinned toLocaleString is a hydration mismatch waiting for a non-English
   browser. */
function formatReading(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

type DotBarsProps = Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof dotBarsVariants> & {
    /** The series, oldest first. Non-finite and negative entries read as 0. */
    data: number[]
    /** Dots in a full column. Default 6. */
    rows?: number
    /** Pins the top of the scale. Omit to normalise against the series' peak. */
    max?: number
    /** Names the series in the spoken summary — "Daily runs". */
    srLabel?: string
  }

function DotBars({
  data,
  rows = DEFAULT_ROWS,
  max,
  srLabel,
  tone = "selected",
  size = "default",
  className,
  style,
  "aria-label": ariaLabel,
  ...props
}: DotBarsProps) {
  /* A fractional, zero or non-finite row count has no sensible column, so it
     falls back to the default rather than drawing nothing. */
  const rowCount = Number.isFinite(rows) && rows >= 1 ? Math.floor(rows) : DEFAULT_ROWS

  /* One NaN would poison the peak and blank every column at once. */
  const values = data.map((value) => (Number.isFinite(value) ? Math.max(0, value) : 0))

  /* reduce from 0, not Math.max(...values): an empty series spreads to
     Math.max() and returns -Infinity. */
  const peak = values.reduce((highest, value) => Math.max(highest, value), 0)
  const scale = max != null && Number.isFinite(max) && max > 0 ? max : peak

  /* Ceilings, as in HeatGrid: any sample above zero lights at least one dot, so
     a quiet day still registers. The clamp to rowCount is what stops an
     explicit `max` below a sample from pushing the column past the top. An
     all-zero series has a zero scale and lights nothing. */
  const litOf = (value: number) => {
    if (value <= 0 || scale <= 0) return 0
    return Math.min(rowCount, Math.max(1, Math.ceil((value / scale) * rowCount)))
  }

  const latest = values.length > 0 ? values[values.length - 1] : 0
  const summary =
    values.length === 0
      ? "No data"
      : `latest ${formatReading(latest)}, peak ${formatReading(peak)}`

  return (
    <div
      data-slot="dot-bars"
      data-tone={tone}
      data-size={size}
      role="img"
      aria-label={ariaLabel ?? (srLabel ? `${srLabel}: ${summary}` : summary)}
      className={cn(dotBarsVariants({ tone, size }), className)}
      /* The height of a full column, so an empty or short series still holds
         its place and every column measures from the same floor. */
      style={{
        height: `calc(${rowCount} * var(--dot) + ${rowCount - 1} * var(--dot-gap))`,
        ...style,
      }}
      {...props}
    >
      {values.map((value, index) => {
        const lit = litOf(value)
        return (
          <span
            key={index}
            data-slot="dot-bars-column"
            data-lit={lit}
            className="flex w-(--dot) shrink-0 flex-col gap-(--dot-gap)"
          >
            {Array.from({ length: lit }, (_, dot) => (
              <span
                key={dot}
                data-slot="dot-bars-dot"
                className="size-(--dot) shrink-0 rounded-full bg-current"
              />
            ))}
          </span>
        )
      })}
    </div>
  )
}

export { DotBars, dotBarsVariants }
export type { DotBarsProps, DotBarsTone, DotBarsSize }
