import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Minus, TrendingDown, TrendingUp } from "lucide-react"

import { Card, CardContent } from "./ui/card"
import { IconTile } from "./icon-tile"
import { cn } from "../lib/utils"

/* KPI tile. Composes Card so it inherits the system's card elevation and
   spacing rhythm — the only thing this adds is the label / value / delta
   hierarchy and an optional leading squircle. */
const metricCardVariants = cva("group/metric-card", {
  variants: {
    align: {
      start: "text-left",
      center: "text-center",
    },
  },
  defaultVariants: {
    align: "start",
  },
})

/* Trend is inferred from the sign of the delta — up reads success, down reads
   destructive, and a flat delta stays muted so it never competes for attention. */
const metricDeltaVariants = cva(
  "inline-flex items-center gap-1 text-caption leading-none font-medium tabular-nums [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      trend: {
        up: "text-success",
        down: "text-destructive",
        flat: "text-muted-foreground",
      },
    },
    defaultVariants: {
      trend: "flat",
    },
  }
)

type MetricTrend = "up" | "down" | "flat"

const TREND_ICON: Record<MetricTrend, typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
}

const TREND_LABEL: Record<MetricTrend, string> = {
  up: "Trending up",
  down: "Trending down",
  flat: "No change",
}

function formatDelta(delta: number) {
  const magnitude = Math.abs(delta)
  const digits = Number.isInteger(magnitude) ? magnitude.toString() : magnitude.toFixed(1)
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : ""
  return `${sign}${digits}%`
}

type MetricCardProps = Omit<React.ComponentProps<typeof Card>, "children"> &
  VariantProps<typeof metricCardVariants> & {
    label: React.ReactNode
    value: string | number
    /** Percent change. Sign drives the trend colour and glyph. */
    delta?: number
    deltaLabel?: React.ReactNode
    /** Rendered inside a leading squircle IconTile. */
    icon?: React.ReactNode
    /** Slot for a sparkline or any small chart. */
    chart?: React.ReactNode
  }

function MetricCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  chart,
  align = "start",
  className,
  ...props
}: MetricCardProps) {
  const labelId = React.useId()
  const hasDelta = typeof delta === "number" && Number.isFinite(delta)
  const trend: MetricTrend = !hasDelta ? "flat" : delta > 0 ? "up" : delta < 0 ? "down" : "flat"
  const TrendIcon = TREND_ICON[trend]

  return (
    <Card
      data-slot="metric-card"
      data-align={align}
      data-trend={hasDelta ? trend : undefined}
      role="group"
      aria-labelledby={labelId}
      size="sm"
      className={cn(metricCardVariants({ align }), className)}
      {...props}
    >
      <CardContent>
        <div className="flex items-center gap-3 group-data-[align=center]/metric-card:flex-col group-data-[align=center]/metric-card:gap-2.5">
          {icon ? (
            <IconTile
              data-slot="metric-card-icon"
              variant="soft"
              size="sm"
              aria-hidden="true"
              className="text-muted-foreground"
            >
              {icon}
            </IconTile>
          ) : null}
          <p
            id={labelId}
            data-slot="metric-card-label"
            className="min-w-0 text-caption leading-snug font-medium text-muted-foreground"
          >
            {label}
          </p>
        </div>

        {/* The number is the only thing on this tile that changes at runtime,
            so it is the only thing that moves. Keying on the value remounts the
            line, which restarts the enter every time it changes — the swap
            spring lifts it into place out of a short blur instead of snapping to
            a new figure. It plays on mount too, which reads as the tile
            arriving; a KPI grid is three or four cards, not fifty rows, so that
            stays a welcome and not a distraction. There is no matching exit —
            the old figure is replaced rather than dismissed. */}
        <p
          key={String(value)}
          data-slot="metric-card-value"
          className="mt-3 text-[1.875rem] leading-[1.1] font-semibold tracking-title tabular-nums text-foreground animate-in fade-in slide-in-from-bottom-2 blur-in-4 duration-spring-swap ease-spring-swap"
        >
          {value}
        </p>

        {hasDelta || deltaLabel ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 group-data-[align=center]/metric-card:justify-center">
            {hasDelta ? (
              <span
                data-slot="metric-card-delta"
                className={cn(metricDeltaVariants({ trend }))}
              >
                <TrendIcon aria-hidden="true" />
                <span className="sr-only">{TREND_LABEL[trend]}, </span>
                {formatDelta(delta)}
              </span>
            ) : null}
            {deltaLabel ? (
              <span className="text-caption leading-none text-muted-foreground">
                {deltaLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      {chart ? (
        <CardContent>
          <div
            data-slot="metric-card-chart"
            className="[&>svg]:h-full [&>svg]:w-full"
          >
            {chart}
          </div>
        </CardContent>
      ) : null}
    </Card>
  )
}

export { MetricCard, metricCardVariants, metricDeltaVariants }
export type { MetricCardProps, MetricTrend }
