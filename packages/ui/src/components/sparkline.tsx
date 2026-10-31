import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/* Inline trend line for a KPI tile — hand-rolled rather than charted. A
   sparkline is a normalise and a join, and an overview screen carries four to
   eight of them inline; a charting runtime would weigh more than everything it
   draws here and would have to load before the number it sits next to.

   Every shape paints with currentColor, so the tone stays on the semantic token
   utilities and no stroke or fill colour is ever written into this file.

   `fill` inherits, so the root settles it once per variant: the area and the
   bars are filled shapes, a bare line is not. The stroke drawn on top of an
   area re-states `fill-none` for itself — it is the one child that must not
   inherit what its own variant just switched on. */
const sparklineVariants = cva("block size-full overflow-visible", {
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
    variant: {
      line: "fill-none",
      area: "fill-current",
      bar: "fill-current",
    },
  },
  defaultVariants: {
    tone: "selected",
    variant: "line",
  },
})

/* Share of each bar's slot given up to the gap. Kept as a fraction rather than
   a width in pixels because the slot stretches with the box — a fixed gap would
   swallow the bars in a narrow tile and vanish in a wide one. */
const BAR_GAP = 0.28

type SparklineTone = NonNullable<VariantProps<typeof sparklineVariants>["tone"]>

type SparklineVariant = NonNullable<VariantProps<typeof sparklineVariants>["variant"]>

type SparklineProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** The series, oldest reading first. */
  data: number[]
  /** Intrinsic box in px. `style` is spread last, so a consumer can override it. */
  width?: number
  height?: number
  /** Screen px, held at that weight however the box stretches. */
  strokeWidth?: number
  tone?: SparklineTone
  variant?: SparklineVariant
  /**
   * Announced in place of the graphic. Pass it only when the spark is the sole
   * representation of the data — beside a visible number it is a second telling
   * of the same fact, which is noise in a screen reader rather than help.
   */
  srLabel?: string
}

function Sparkline({
  data,
  width = 96,
  height = 32,
  strokeWidth = 2,
  tone = "selected",
  variant = "line",
  srLabel,
  className,
  style,
  ...props
}: SparklineProps) {
  /* One NaN poisons the coordinate string it lands in and the renderer discards
     the whole path, so a single bad reading would cost the entire spark rather
     than only itself. Dropping it keeps the rest legible: with no axis and no
     labels there is no position for the reader to be misled about. */
  const series = data.filter((n) => Number.isFinite(n))
  if (series.length === 0) return null

  const min = Math.min(...series)
  const max = Math.max(...series)
  const range = max - min
  /* A flat series has no range to divide by. Half height is the honest picture —
     pinning it to the floor or the ceiling would claim a low or a high that the
     data never sets. */
  const norm = (n: number) => (range > 0 ? (n - min) / range : 0.5)

  /* Half a stroke of headroom top and bottom so the extremes sit inside the box
     instead of painting over the row above. Measured in plot units, so it
     tracks whatever the box stretches to. Bars carry no stroke and need none. */
  const inset = variant === "bar" ? 0 : strokeWidth / 2
  const plot = Math.max(height - inset * 2, 0)
  const yOf = (n: number) => (inset + (1 - norm(n)) * plot).toFixed(2)

  /* A line joins readings, so its box counts the gaps between them; bars own a
     slot each, so theirs counts the readings. */
  const span = Math.max(series.length - 1, 1)
  const viewBox =
    variant === "bar" ? `0 0 ${series.length} ${height}` : `0 0 ${span} ${height}`

  const vertices = series.map((n, index) => `${index},${yOf(n)}`)
  /* A one-point polyline paints nothing at all. Repeating the reading at the far
     edge draws the flat line a single sample actually describes. */
  if (vertices.length === 1) vertices.push(`${span},${yOf(series[0])}`)
  const line = vertices.join(" ")
  /* Down to the floor at the last reading, back along it, closed by the polygon
     itself — the fill belongs to the box, not to the range the series happens
     to cover. */
  const area = `0,${height} ${line} ${span},${height}`

  return (
    <div
      data-slot="sparkline"
      data-tone={tone}
      data-variant={variant}
      className={cn("inline-flex shrink-0", className)}
      style={{ width, height, ...style }}
      {...props}
    >
      {/* The plot stretches to its box rather than keeping the ratio the data
          implies, which is the whole point of a spark: it fills the strip it is
          given. That leaves x in index units that scale with the container, so
          half of each end cap hangs past the first and last reading by an amount
          no viewBox inset can express — the box lets it show rather than
          shearing the ends flat. */}
      <svg
        viewBox={viewBox}
        preserveAspectRatio="none"
        aria-hidden="true"
        className={cn(sparklineVariants({ tone, variant }))}
      >
        {variant === "bar"
          ? series.map((n, index) => {
              /* A zero-height rect paints nothing, so the series' own minimum
                 would drop out of the chart entirely. Floor it at the weight the
                 line variant would have drawn there — present, and still
                 unmistakably the smallest. */
              const barHeight = Math.max(norm(n) * height, strokeWidth)

              return (
                <rect
                  key={index}
                  data-slot="sparkline-bar"
                  x={index + BAR_GAP / 2}
                  y={height - barHeight}
                  width={1 - BAR_GAP}
                  height={barHeight}
                />
              )
            })
          : null}

        {variant === "area" ? (
          <polygon data-slot="sparkline-area" points={area} className="opacity-15" />
        ) : null}

        {variant === "line" || variant === "area" ? (
          <polyline
            data-slot="sparkline-line"
            points={line}
            className="fill-none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            /* Without this the non-uniform stretch above would scale the stroke
               with the box and the line would come out heavier on one axis than
               the other — a 2px spark reading as 2×6 in a wide tile. */
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>

      {srLabel ? <span className="sr-only">{srLabel}</span> : null}
    </div>
  )
}

export { Sparkline, sparklineVariants }
export type { SparklineProps, SparklineTone, SparklineVariant }
