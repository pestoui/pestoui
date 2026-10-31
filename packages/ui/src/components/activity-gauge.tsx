import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { circumferenceOf, clampPercent } from "../lib/arc"
import { cn } from "../lib/utils"

/* Concentric progress rings, pure SVG. Each arc paints with currentColor so the
   tone stays on the semantic token utilities — no stroke hex ever lands here.

   Motion: the arc sweeps up to its value rather than being painted at it, on
   mount and on every change after. The offset is carried in a custom property
   so the mount value can come from `@starting-style` — no state, no effect, no
   first-paint flash, and a browser without support simply renders the finished
   arc rather than breaking.

   Glide, not one of the overshooting springs, and this is exactly why the glide
   curve is tuned slightly overdamped: an arc that overshoots its value has, for
   a few frames, told the reader a number that is not true. */
const activityGaugeArcVariants = cva(
  "transition-[stroke-dashoffset] duration-spring-glide ease-spring-glide [stroke-dashoffset:var(--arc-offset)] starting:[stroke-dashoffset:var(--arc-length)]",
  {
    variants: {
      tone: {
        info: "text-info",
        success: "text-success",
        warning: "text-warning",
        destructive: "text-destructive",
        selected: "text-selected",
        neutral: "text-muted-foreground",
      },
    },
    defaultVariants: {
      tone: "info",
    },
  }
)

const activityGaugeDotVariants = cva("size-2 shrink-0 rounded-full", {
  variants: {
    tone: {
      info: "bg-info",
      success: "bg-success",
      warning: "bg-warning",
      destructive: "bg-destructive",
      /* The dot is the legend's only link back to its arc, so it tracks the arc
         tone rather than the fill — a swatch that does not match the ring it
         names has stopped being a key. */
      selected: "bg-selected",
      neutral: "bg-muted-foreground",
    },
  },
  defaultVariants: {
    tone: "info",
  },
})

type ActivityGaugeTone = NonNullable<
  VariantProps<typeof activityGaugeArcVariants>["tone"]
>

type ActivityRing = {
  /** 0–100. Values outside the range are clamped. */
  value: number
  tone?: ActivityGaugeTone
  label?: string
}

type ActivityGaugeProps = Omit<React.ComponentProps<"div">, "children"> & {
  rings: ActivityRing[]
  /** Outer diameter in px. */
  size?: number
  /** Stroke width of each ring in px. */
  thickness?: number
  /** Space between concentric rings in px. */
  gap?: number
  showLegend?: boolean
  /** Centre slot — usually a total. */
  children?: React.ReactNode
}

function ActivityGauge({
  rings,
  size = 160,
  thickness = Math.max(6, Math.round(size / 14)),
  gap = Math.max(2, Math.round(thickness * 0.4)),
  showLegend = false,
  className,
  children,
  ...props
}: ActivityGaugeProps) {
  const center = size / 2
  const step = thickness + gap
  /* Centre-line radius of the outermost ring, then step inwards per ring. */
  const outer = (size - thickness) / 2

  const arcs = rings
    .map((ring, index) => {
      const radius = outer - index * step
      const pct = clampPercent(ring.value)
      const circumference = circumferenceOf(radius)
      return { ...ring, radius, pct, circumference }
    })
    .filter((arc) => arc.radius > thickness / 2)

  /* Inset the centre slot to the innermost ring's clear opening. */
  const centreInset = thickness + Math.max(0, arcs.length - 1) * step

  const summary = rings
    .map(
      (ring, index) =>
        `${ring.label ?? `Ring ${index + 1}`}: ${Math.round(clampPercent(ring.value))}%`
    )
    .join(", ")

  return (
    <div
      data-slot="activity-gauge"
      className={cn("flex flex-col items-center gap-5", className)}
      {...props}
    >
      <div
        data-slot="activity-gauge-rings"
        className="relative shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="block"
          role={showLegend ? undefined : "img"}
          aria-label={showLegend ? undefined : summary}
          aria-hidden={showLegend || undefined}
        >
          <g
            transform={`rotate(-90 ${center} ${center})`}
            fill="none"
            strokeLinecap="round"
          >
            {arcs.map((arc, index) => (
              <React.Fragment key={index}>
                <circle
                  cx={center}
                  cy={center}
                  r={arc.radius}
                  className="text-border"
                  stroke="currentColor"
                  strokeWidth={thickness}
                />
                {/* Rings set off in a tight cascade, outermost first, so a stack
                    of them reads as concentric rather than as one thick arc. */}
                {arc.pct > 0 ? (
                  <circle
                    cx={center}
                    cy={center}
                    r={arc.radius}
                    className={cn(activityGaugeArcVariants({ tone: arc.tone }))}
                    stroke="currentColor"
                    strokeWidth={thickness}
                    strokeDasharray={arc.circumference}
                    style={
                      {
                        "--arc-length": `${arc.circumference}`,
                        "--arc-offset": `${arc.circumference * (1 - arc.pct / 100)}`,
                        transitionDelay: `calc(${index} * var(--stagger-tight))`,
                      } as React.CSSProperties
                    }
                  />
                ) : null}
              </React.Fragment>
            ))}
          </g>
        </svg>

        {children ? (
          <div
            data-slot="activity-gauge-center"
            className="absolute flex flex-col items-center justify-center gap-0.5 text-center"
            style={{ inset: centreInset }}
          >
            {children}
          </div>
        ) : null}
      </div>

      {showLegend ? (
        <ul
          data-slot="activity-gauge-legend"
          className="flex w-full min-w-0 flex-col gap-2"
        >
          {rings.map((ring, index) => (
            <li
              key={index}
              data-slot="activity-gauge-legend-item"
              className="flex items-center gap-2 text-caption leading-none"
            >
              <span
                aria-hidden="true"
                className={cn(activityGaugeDotVariants({ tone: ring.tone }))}
              />
              <span className="min-w-0 truncate text-muted-foreground">
                {ring.label ?? `Ring ${index + 1}`}
              </span>
              <span className="ml-auto font-medium tabular-nums text-foreground">
                {Math.round(clampPercent(ring.value))}%
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export { ActivityGauge, activityGaugeArcVariants, activityGaugeDotVariants }
export type { ActivityGaugeProps, ActivityGaugeTone, ActivityRing }
