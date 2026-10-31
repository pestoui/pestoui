"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { AnimatedNumber } from "./number-animation"
import { arcOffset, circumferenceOf, clampPercent } from "../../lib/arc"
import { DURATION_SPRING_GLIDE } from "../../lib/motion"
import { cn } from "../../lib/utils"

/* One motion contract, shared by both arcs — and that is load-bearing rather
   than tidy. In the gauge track the blank at each junction *is* the difference
   between the two dash offsets, so if the arcs ran different curves or
   durations the gap would breathe on the way to the value.

   The offset travels through a custom property so `@starting-style` can supply
   the mount value: the arc sweeps up from empty on first paint with no state,
   no effect and no first-paint flash, and an engine without support simply
   renders the finished arc rather than breaking.

   Glide, and glide is tuned slightly overdamped for exactly this reason: an arc
   that overshoots has, for a few frames, reported a number that was never true. */
const progressCircleArc =
  "transition-[stroke-dashoffset] duration-spring-glide ease-spring-glide " +
  "[stroke-dashoffset:var(--arc-offset)] starting:[stroke-dashoffset:var(--arc-length)]"

/* Only the indicator stroke carries the tone — the track stays neutral in every
   tone so the ring reads as one control, not six.

   `selected` is the brand ring. --primary is a fill; at three to five pixels of
   stroke it stops being legible, so the arc takes --selected, the brand green
   that survives being drawn this thin. */
const progressCircleVariants = cva(progressCircleArc, {
  variants: {
    tone: {
      info: "stroke-info",
      success: "stroke-success",
      warning: "stroke-warning",
      destructive: "stroke-destructive",
      selected: "stroke-selected",
      neutral: "stroke-muted-foreground",
    },
  },
  defaultVariants: {
    tone: "info",
  },
})

/* Named sizes pin their own stroke and readout so the ring stays optically
   even; a numeric size derives both from the box (same ratios as below). */
const progressCircleSizes = {
  sm: { box: 36, stroke: 3, font: 11 },
  default: { box: 48, stroke: 4, font: 13 },
  lg: { box: 64, stroke: 5, font: 15 },
} as const

type ProgressCircleSize = keyof typeof progressCircleSizes | number

type ProgressCircleTone = NonNullable<
  VariantProps<typeof progressCircleVariants>["tone"]
>

type ProgressCircleTrack = "ring" | "gauge"

interface ProgressCircleProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof progressCircleVariants> {
  /** Current reading, clamped into `[min, max]`. */
  value?: number
  /** Range bounds. The defaults keep a plain 0–100 percentage unchanged. */
  min?: number
  max?: number

  size?: ProgressCircleSize
  /** Overrides the stroke the size would otherwise derive. */
  strokeWidth?: number

  /**
   * `"ring"` — a continuous track sitting behind the indicator, the default.
   * `"gauge"` — the remainder drawn as its own arc, held off the indicator by a
   * blank gap at each junction. Reads crisper at larger diameters.
   */
  track?: ProgressCircleTrack
  /** Gap per junction, as a percent of the circumference. Gauge track only. */
  gapPercent?: number

  /** Renders the reading dead centre. Ignored when `children` are passed. */
  showValue?: boolean
  /** Counts the reading up to its value instead of snapping to it. */
  animateValue?: boolean
  /** Formats the reading. Receives the clamped value *and* its percentage. */
  formatValue?: (value: number, percent: number) => string

  /** Centre slot — a caption, an icon, a stacked total. Wins over `showValue`. */
  children?: React.ReactNode
}

function ProgressCircle({
  className,
  style,
  value = 0,
  min = 0,
  max = 100,
  size = "default",
  strokeWidth,
  track = "ring",
  gapPercent = 5,
  showValue = false,
  animateValue = false,
  formatValue,
  tone = "info",
  children,
  ...props
}: ProgressCircleProps) {
  const geometry =
    typeof size === "number"
      ? {
          box: size,
          stroke: Math.max(2, Math.round(size * 0.085)),
          font: Math.max(10, Math.round(size * 0.27)),
        }
      : progressCircleSizes[size]

  const box = geometry.box
  const stroke = strokeWidth ?? geometry.stroke

  /* An inverted or zero-width range divides by zero. Read it as empty — SVG
     paints NaN as a missing arc and assistive tech announces nothing at all,
     so the silent failure is worse than the honest one. */
  const span = max - min
  const usableRange = Number.isFinite(span) && span > 0
  const raw = Number.isFinite(value) ? value : min
  const clampedValue = usableRange ? Math.min(max, Math.max(min, raw)) : min
  const toPercent = (n: number) =>
    usableRange ? clampPercent(((n - min) / span) * 100) : 0
  const percent = toPercent(clampedValue)
  const rounded = Math.round(percent)

  const center = box / 2
  const radius = Math.max((box - stroke) / 2, 0)
  const circumference = circumferenceOf(radius)
  const indicatorLength = circumference * (percent / 100)

  /* Gauge geometry.

     The blank sits at both junctions: after the indicator's head, and again
     before its tail at twelve o'clock. A round cap overhangs its arc by half a
     stroke at each end, so a pair of facing caps eats a whole stroke width out
     of the gap — floor the gap above that or the two arcs touch at low values
     on the small sizes.

     Boundaries fall out of the arithmetic rather than needing a special case.
     At zero there is no indicator, so the two gaps merge into one blank of
     double width at twelve o'clock — which is what the ring looks like a frame
     earlier anyway, so nothing jumps. Once the remainder is shorter than the
     two gaps the track goes to zero and stops painting, so a full ring leaves
     no orphan notch behind. */
  const gapFraction = Math.min(0.25, Math.max(0, gapPercent / 100))
  const gapLength =
    gapFraction > 0 ? Math.max(gapFraction * circumference, stroke * 1.5) : 0
  const gapDegrees = circumference > 0 ? (gapLength / circumference) * 360 : 0
  const trackLength = Math.max(0, circumference - indicatorLength - gapLength * 2)
  const trackPercent = circumference > 0 ? (trackLength / circumference) * 100 : 0

  const arcStyle = (offset: number) =>
    ({
      "--arc-length": `${circumference}`,
      "--arc-offset": `${offset}`,
    }) as React.CSSProperties

  /* Mirror the remainder so it grows backwards from twelve o'clock — its far
     end stays pinned there while its near end tracks the indicator — then
     rotate it by exactly one gap, which is where the pinned end's blank comes
     from. Both steps depend on the gap alone and never on the value, so this
     string is constant for the life of the component and the only thing that
     moves is still one scalar per arc. */
  const gaugeTransform =
    `rotate(${-gapDegrees} ${center} ${center})` +
    ` translate(0 ${box}) scale(1 -1)`

  const readoutClass =
    "leading-none font-semibold tracking-title tabular-nums text-foreground"
  const readoutText = formatValue
    ? formatValue(clampedValue, percent)
    : `${rounded}`

  /* Counting the raw value rather than the percentage keeps one formatter for
     both paths: the percentage is derived per frame from the value in flight,
     so `formatValue` sees the same pair mid-count that it sees at rest. */
  const readout = animateValue ? (
    <AnimatedNumber
      data-slot="progress-circle-value"
      value={clampedValue}
      duration={DURATION_SPRING_GLIDE}
      format={(n) =>
        formatValue
          ? formatValue(n, toPercent(n))
          : `${Math.round(toPercent(n))}`
      }
      className={readoutClass}
      style={{ fontSize: geometry.font }}
    />
  ) : (
    <span
      data-slot="progress-circle-value"
      className={readoutClass}
      style={{ fontSize: geometry.font }}
    >
      {readoutText}
    </span>
  )

  const centre = children ?? (showValue ? readout : null)

  return (
    <div
      data-slot="progress-circle"
      data-tone={tone}
      data-track={track}
      role="progressbar"
      /* The raw reading, not the percentage — with a range the two diverge, and
         a progressbar's value is expected to sit inside its own bounds. */
      aria-valuenow={clampedValue}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={formatValue ? readoutText : `${rounded}%`}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        className
      )}
      style={{ width: box, height: box, ...style }}
      {...props}
    >
      <svg
        width={box}
        height={box}
        viewBox={`0 0 ${box} ${box}`}
        aria-hidden="true"
        /* Start the sweep at 12 o'clock; the readout sits outside the SVG so
           it never inherits this rotation. */
        className="-rotate-90"
      >
        {track === "gauge" ? (
          /* The transform rides on a group, not on the shape: `transform-origin`
             on an SVG shape needs `transform-box` to mean the same thing in
             every engine, and a group sidesteps that question entirely. */
          <g transform={gaugeTransform}>
            <circle
              data-slot="progress-circle-track"
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap={trackLength > 0 ? "round" : "butt"}
              strokeDasharray={circumference}
              className={cn(progressCircleArc, "stroke-border dark:stroke-input")}
              style={arcStyle(arcOffset(circumference, trackPercent))}
            />
          </g>
        ) : (
          <circle
            data-slot="progress-circle-track"
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-border dark:stroke-input"
          />
        )}
        <circle
          data-slot="progress-circle-indicator"
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          /* A round cap at 0% would still paint a dot on an empty ring. */
          strokeLinecap={percent > 0 ? "round" : "butt"}
          strokeDasharray={circumference}
          className={cn(progressCircleVariants({ tone }))}
          style={arcStyle(arcOffset(circumference, percent))}
        />
      </svg>
      {centre ? (
        <div
          data-slot="progress-circle-center"
          /* `aria-valuetext` on the root already announces the reading. Hiding
             the whole slot is what keeps a counter dropped in here from opening
             a second live region for the same quantity — two announcements
             racing each other is worse than one that is merely terse. */
          aria-hidden="true"
          className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center"
        >
          {centre}
        </div>
      ) : null}
    </div>
  )
}

export { ProgressCircle, progressCircleVariants }
export type {
  ProgressCircleProps,
  ProgressCircleSize,
  ProgressCircleTone,
  ProgressCircleTrack,
}
