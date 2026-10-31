import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/* Dense sample strip — the CPU / Memory / Disk I/O meters along the top of an
   ops console. Not a bar chart: the ticks are uniform width and packed to a
   hairline gap, so the strip reads as one texture whose shape is the trend,
   rather than as N discrete bars each asking to be read individually.

   Spans, not SVG. Sixty-odd elements is exactly the size where CSS wins twice —
   no viewBox arithmetic to keep in sync with the box, and every tick inherits
   its colour from a semantic utility instead of needing a fill piped in.

   The container is transparent and carries only the ceiling that ticks measure
   against plus the gap that stops them fusing into a solid block, so one strip
   drops onto card, muted or surface without bringing a background with it.

   `justify-end` under a clipped overflow is the rolling-window contract: when
   the strip is narrower than its series, the samples pushed out are the oldest
   ones. Losing the left edge of a live meter is survivable; losing the reading
   that just arrived is not. */
const tickStripVariants = cva(
  "inline-flex max-w-full items-end justify-end overflow-hidden",
  {
    variants: {
      size: {
        sm: "h-3 gap-px",
        default: "h-5 gap-px",
        lg: "h-8 gap-0.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

/* Height and opacity both ride the same value, and the redundancy is the whole
   reason this reads at 20px tall: across that range the difference between the
   60th and the 90th percentile is three pixels, and three pixels is not a
   reading. The alpha step is what actually carries it — height alone would
   need the strip to be twice as tall to say the same thing.

   No transition. A meter like this repaints on every poll, and when the window
   rolls one slot every tick changes height at once — animating that makes the
   whole strip ripple instead of showing one new sample arriving, and it costs
   sixty simultaneous property animations to do it.

   `rounded-full` is not a style choice: the surface scale starts at 9.6px
   (`--radius-sm`), which would swallow a 2px tick whole, so it is the only
   radius in the system this element can legally take. At these widths it lands
   as a softened cap rather than a pill. */
const tickStripTickVariants = cva("min-h-px shrink-0 rounded-full", {
  variants: {
    tone: {
      selected: "bg-selected",
      success: "bg-success",
      warning: "bg-warning",
      destructive: "bg-destructive",
      info: "bg-info",
      muted: "bg-muted-foreground",
      "chart-1": "bg-chart-1",
      "chart-2": "bg-chart-2",
      "chart-3": "bg-chart-3",
      "chart-4": "bg-chart-4",
      "chart-5": "bg-chart-5",
    },
    size: {
      sm: "w-px",
      default: "w-0.5",
      lg: "w-1",
    },
  },
  defaultVariants: {
    tone: "selected",
    size: "default",
  },
})

type TickStripTone = NonNullable<VariantProps<typeof tickStripTickVariants>["tone"]>

type TickStripSize = NonNullable<VariantProps<typeof tickStripVariants>["size"]>

/* Four bands, not a continuous ramp. Sixty ticks on a continuous alpha give
   sixty near-identical values that the eye resolves as noise; quantising lets
   it group the strip into regions, and two neighbours that differ by a
   rounding error paint identically instead of shimmering against each other. */
const TICK_ALPHA = [0.35, 0.55, 0.75, 1] as const

/* The floor of the height range, not a clamp on it. `Math.max(floor, n)` would
   flatten every low sample into one identical stub and destroy the ordering at
   the bottom of the scale, which is precisely where an idle meter spends its
   time. Remapping into [floor, 1] keeps a zero visible as a baseline stub while
   a 2% sample still sits measurably above it. */
const TICK_FLOOR = 0.12

/* Integers stay integers so a percentage series doesn't get spoken as "72.0". */
function formatReading(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1)
}

type TickStripProps = Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof tickStripVariants> & {
    /** The series, oldest sample first. Non-finite entries read as 0. */
    data: number[]
    tone?: TickStripTone
    /** Pins the scale. Omit to normalise against the series' own peak. */
    max?: number
    /**
     * Samples at or above this take the destructive tone whatever `tone` says,
     * so a spike reads as a spike. Compared against raw values, not normalised
     * ones — a threshold is stated in the units the caller thinks in.
     */
    threshold?: number
    /** Names the series in the spoken summary — "CPU", "Disk I/O". */
    srLabel?: string
    /** Formats the readings in the summary. Units belong here. */
    formatValue?: (value: number) => string
  }

function TickStrip({
  data,
  tone = "selected",
  size = "default",
  max,
  threshold,
  srLabel,
  formatValue = formatReading,
  className,
  "aria-label": ariaLabel,
  ...props
}: TickStripProps) {
  /* One NaN anywhere would poison the peak and drop every tick to its floor at
     once — a strip that silently flatlines is a worse failure than one that
     admits a bad sample as zero. Negatives clamp for the same reason: this
     encodes intensity and has no mirrored baseline to draw them against. */
  const values = data.map((value) =>
    Number.isFinite(value) ? Math.max(0, value) : 0
  )

  const peak = values.reduce((highest, value) => Math.max(highest, value), 0)
  const scale = max ?? peak
  /* A zero or non-finite scale divides by zero, and NaN paints nothing at all.
     Read the series as empty instead, so the strip shows its baseline. */
  const usableScale = Number.isFinite(scale) && scale > 0
  const current = values.length > 0 ? values[values.length - 1] : 0

  /* Infinity when unset keeps the per-tick test a single comparison instead of
     a branch that runs on every element — nothing is ever at or above it. */
  const limit =
    typeof threshold === "number" && Number.isFinite(threshold)
      ? threshold
      : Number.POSITIVE_INFINITY
  const breaches = values.filter((value) => value >= limit).length

  const readings = [`${formatValue(current)} current`, `${formatValue(peak)} peak`]
  if (Number.isFinite(limit)) {
    readings.push(
      `${breaches} of ${values.length} at or above ${formatValue(limit)}`
    )
  }

  /* The ticks themselves say nothing to a screen reader — role="img" prunes the
     subtree, which is the point: sixty spans announced one by one is worse than
     silence. srLabel is the entire non-visual reading of this component, so
     it carries the two numbers a glance at the strip would give you. */
  const summary = values.length === 0 ? "No data" : readings.join(", ")

  return (
    <div
      data-slot="tick-strip"
      data-tone={tone}
      data-size={size}
      role="img"
      aria-label={ariaLabel ?? (srLabel ? `${srLabel}: ${summary}` : summary)}
      className={cn(tickStripVariants({ size }), className)}
      {...props}
    >
      {values.map((value, index) => {
        const norm = usableScale ? Math.min(1, value / scale) : 0
        const breached = value >= limit
        const band = Math.min(
          TICK_ALPHA.length - 1,
          Math.floor(norm * TICK_ALPHA.length)
        )

        return (
          <span
            key={index}
            data-slot="tick-strip-tick"
            className={cn(
              tickStripTickVariants({
                tone: breached ? "destructive" : tone,
                size,
              })
            )}
            style={{
              height: `${((TICK_FLOOR + (1 - TICK_FLOOR) * norm) * 100).toFixed(2)}%`,
              /* A breach is pinned opaque rather than taking its band. With a
                 low threshold the crossing sample can be dim enough that the
                 tone change alone doesn't register, and the one tick that most
                 needs to be seen is the one that must never be faded. */
              opacity: breached ? 1 : TICK_ALPHA[band],
            }}
          />
        )
      })}
    </div>
  )
}

export { TickStrip, tickStripVariants, tickStripTickVariants }
export type { TickStripProps, TickStripSize, TickStripTone }
