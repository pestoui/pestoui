import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/* A stacked breakdown — "18 runs: 9 queued, 6 running, 3 done" — as
   one bar. Deliberately not a mode of `Progress`: that component reports a
   single value against a max and hands Radix the `progressbar` role and the
   `aria-value*` trio, none of which can express three categories at once. The
   shapes rhyme; the ARIA contracts do not, so they stay separate components.

   One tone map feeds both the band and its legend dot. The dot is the only
   thing tying a legend row back to the band it names, so a swatch that
   resolves to a different token has stopped being a key — sourcing both cva
   calls from one record makes that a compile-time fact instead of a habit. */
const TONE_FILL = {
  "chart-1": "bg-chart-1",
  "chart-2": "bg-chart-2",
  "chart-3": "bg-chart-3",
  "chart-4": "bg-chart-4",
  "chart-5": "bg-chart-5",
  selected: "bg-selected",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  muted: "bg-muted-foreground",
} as const

/* The rounded ends come from clipping the track, not from rounding the first
   and last bands. Which band is first changes with the data — a zero-value
   band is dropped rather than drawn, and the muted tail only exists while the
   total runs ahead of the sum — so a `first:`/`last:` radius keeps re-attaching
   itself to whatever survived the filter. A clip cannot get that wrong.

   The track's own fill is the remainder: everything the bands do not cover
   reads as the empty tail, which is why there is no element for it. */
const segmentedBarTrackVariants = cva(
  "flex w-full overflow-hidden rounded-full bg-muted",
  {
    variants: {
      size: {
        sm: "h-1.5",
        default: "h-2",
        lg: "h-3",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

/* The gap between two bands is a transparent left border with the fill clipped
   to the padding box, so what shows through it is the track itself. Margin was
   the obvious alternative and it is the wrong one: it has to come out of every
   width, at which point the widths stop being the percentages they claim to
   be. This leaves each one exact and costs no colour token — the gap is
   whatever the track is painted, in light mode and dark.

   `shrink-0` because flex would otherwise silently rescale the whole row the
   moment sub-pixel rounding pushed the sum a hair past 100%, turning every
   band into an approximation of the number it is reporting.

   Widths glide on the same overdamped curve `Progress` uses, and for the same
   reason: a band that overshoots has, for a few frames, drawn a share that is
   not true. Inline widths land on the first paint, so this only runs when the
   data actually changes. */
const segmentedBarSegmentVariants = cva(
  "h-full shrink-0 border-l-2 border-transparent bg-clip-padding transition-[width] duration-spring-glide ease-spring-glide first:border-l-0",
  {
    variants: {
      tone: TONE_FILL,
    },
    defaultVariants: {
      tone: "selected",
    },
  }
)

const segmentedBarDotVariants = cva("size-2 shrink-0 rounded-full", {
  variants: {
    tone: TONE_FILL,
  },
  defaultVariants: {
    tone: "selected",
  },
})

type SegmentedBarTone = NonNullable<
  VariantProps<typeof segmentedBarSegmentVariants>["tone"]
>

type BarSegment = {
  id: string
  label: string
  /** An absolute count, not a percentage. Negative and non-finite read as 0. */
  value: number
  tone?: SegmentedBarTone
}

type SegmentedBarProps = Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof segmentedBarTrackVariants> & {
    segments: BarSegment[]
    /** Denominator. Above the sum it leaves an empty tail; defaults to the sum. */
    total?: number
    /** Caption above the bar — e.g. "18 runs". */
    label?: React.ReactNode
    showLegend?: boolean
  }

function SegmentedBar({
  segments,
  total,
  label,
  showLegend = false,
  size = "default",
  className,
  ...props
}: SegmentedBarProps) {
  const bands = segments.map((segment) => ({
    ...segment,
    value: Number.isFinite(segment.value) ? Math.max(0, segment.value) : 0,
  }))
  const sum = bands.reduce((running, band) => running + band.value, 0)

  /* Two failure modes, one denominator. A total under the sum would run the
     bands off the end of the track; a total of 0 against no data would divide
     by zero. Widening the denominator to the sum fixes the first without
     lying — the bar simply fills completely and each band still shows its true
     share of what was passed — and the explicit `> 0` test below means an
     empty bar paints an empty track rather than a row of NaN widths. */
  const declared =
    typeof total === "number" && Number.isFinite(total) ? Math.max(0, total) : sum
  const denominator = Math.max(declared, sum)
  const remainder = denominator - sum
  const share = (value: number) => (denominator > 0 ? (value / denominator) * 100 : 0)

  /* A stack of coloured rectangles carries nothing to a screen reader, so the
     whole breakdown is spelled out here. Zero-value bands are named even
     though they are not drawn — the legend lists them, and the two should
     agree about which categories exist. */
  const summary = [
    `Total ${denominator}`,
    ...bands.map((band) => `${band.label}: ${band.value}`),
    ...(remainder > 0 ? [`Remaining: ${remainder}`] : []),
  ].join(", ")

  return (
    <div
      data-slot="segmented-bar"
      data-size={size}
      className={cn("flex w-full min-w-0 flex-col gap-3", className)}
      {...props}
    >
      {label ? (
        <div
          data-slot="segmented-bar-label"
          className="text-sm leading-none font-medium text-foreground"
        >
          {label}
        </div>
      ) : null}

      <div
        data-slot="segmented-bar-track"
        role="img"
        aria-label={summary}
        className={cn(segmentedBarTrackVariants({ size }))}
      >
        {bands
          .filter((band) => band.value > 0)
          .map((band) => (
            <div
              key={band.id}
              data-slot="segmented-bar-segment"
              data-tone={band.tone ?? "selected"}
              className={cn(segmentedBarSegmentVariants({ tone: band.tone }))}
              style={{ width: `${share(band.value)}%` }}
            />
          ))}
      </div>

      {showLegend ? (
        <ul data-slot="segmented-bar-legend" className="flex min-w-0 flex-col gap-2">
          {bands.map((band) => (
            <li
              key={band.id}
              data-slot="segmented-bar-legend-item"
              data-tone={band.tone ?? "selected"}
              className="flex items-center gap-2 text-sm leading-none"
            >
              <span
                aria-hidden="true"
                className={cn(segmentedBarDotVariants({ tone: band.tone }))}
              />
              <span className="min-w-0 truncate text-muted-foreground">
                {band.label}
              </span>
              <span className="ml-auto font-medium tabular-nums text-foreground">
                {band.value}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export {
  SegmentedBar,
  segmentedBarDotVariants,
  segmentedBarSegmentVariants,
  segmentedBarTrackVariants,
}
export type { BarSegment, SegmentedBarProps, SegmentedBarTone }
