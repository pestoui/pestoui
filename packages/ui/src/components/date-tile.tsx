import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/* A calendar tile — a short month over a day of the month in a 44px square —
   for a due date, a renewal, a run scheduled ahead.
 *
 * It renders a <time>, so `dateTime` carries the machine-readable date and the
 * two lines are only its visible reading. The caller formats both lines. That
 * keeps the tile free of locale and timezone logic, which is the part that
 * makes server and client disagree about which day a timestamp falls on.
 *
 * The tones are washes with the -ink token on top, because the fill hues fail
 * AA as text on white. A tone says how the date is handled — on autopay, due by
 * hand — so pair it with something that says the same in words or a shape; the
 * tint should never be the only cue.
 *
 * A fixed square, so a box radius is legal here. The root sets leading-none, so
 * both lines name their line-height beside their size-only type token. */
const dateTileVariants = cva(
  "flex size-11 shrink-0 flex-col items-center justify-center rounded-box-44 leading-none",
  {
    variants: {
      tone: {
        muted: "bg-muted text-foreground",
        warning: "bg-warning/15 text-warning-ink",
        success: "bg-success/10 text-success-ink",
        info: "bg-info/10 text-info-ink",
        destructive: "bg-destructive/10 text-destructive-ink",
      },
    },
    defaultVariants: {
      tone: "muted",
    },
  },
)

type DateTileTone = NonNullable<VariantProps<typeof dateTileVariants>["tone"]>

type DateTileProps = Omit<React.ComponentProps<"time">, "children"> & {
  /** The machine-readable date, e.g. "2026-10-14". */
  dateTime: string
  /** The top line, already formatted — "OCT". */
  month: React.ReactNode
  /** The bottom line, already formatted — "14". */
  day: React.ReactNode
  tone?: DateTileTone
}

function DateTile({
  dateTime,
  month,
  day,
  tone = "muted",
  className,
  ...props
}: DateTileProps) {
  return (
    <time
      data-slot="date-tile"
      data-tone={tone}
      dateTime={dateTime}
      className={cn(dateTileVariants({ tone }), className)}
      {...props}
    >
      <span
        data-slot="date-tile-month"
        className="text-caption-sm leading-4 font-medium"
      >
        {month}
      </span>
      <span
        data-slot="date-tile-day"
        className="mt-0.5 text-body-md leading-6 font-semibold tabular-nums"
      >
        {day}
      </span>
    </time>
  )
}

export { DateTile, dateTileVariants }
export type { DateTileProps, DateTileTone }
