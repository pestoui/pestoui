import * as React from "react"
import { cva } from "class-variance-authority"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { cn } from "../lib/utils"

/* A washed delta chip — "↗ 12%" — for the corner of a KPI tile.

   Direction and sentiment are separate props because they are separate facts.
   The arrow says which way the number moved; the colour says whether that is
   good. A falling error rate points down and paints green, so deriving the
   tone from the direction would get every "lower is better" metric wrong.

   Not `metricDeltaVariants`: that is bare coloured text with a 16px glyph,
   sized to sit under a figure. This is a pill with its own wash, sized to sit
   beside a label. No leading is set, so the chip takes its parent's line
   height and lines up with whatever text it sits next to. */
const trendPillVariants = cva(
  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-caption-sm font-medium tabular-nums",
  {
    variants: {
      sentiment: {
        positive: "bg-success/10 text-success-ink",
        negative: "bg-destructive/10 text-destructive-ink",
      },
    },
    defaultVariants: {
      sentiment: "positive",
    },
  },
)

type TrendDirection = "up" | "down"
type TrendSentiment = "positive" | "negative"

type TrendPillProps = React.ComponentProps<"span"> & {
  direction: TrendDirection
  sentiment?: TrendSentiment
  /** Spoken before the figure, e.g. "Up" — the arrow itself is silent. Rendered
   *  only when given. */
  srLabel?: string
  children: React.ReactNode
}

function TrendPill({
  direction,
  sentiment = "positive",
  srLabel,
  className,
  children,
  ...props
}: TrendPillProps) {
  const Arrow = direction === "up" ? ArrowUpRight : ArrowDownRight
  return (
    <span
      data-slot="trend-pill"
      data-direction={direction}
      data-sentiment={sentiment}
      className={cn(trendPillVariants({ sentiment }), className)}
      {...props}
    >
      <Arrow data-slot="trend-pill-icon" className="size-3" strokeWidth={2.5} />
      {srLabel ? <span className="sr-only">{srLabel} </span> : null}
      {children}
    </span>
  )
}

export { TrendPill, trendPillVariants }
export type { TrendPillProps, TrendDirection, TrendSentiment }
