"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/* Rows stack in source order, one item per row. A schedule answers "what is
   happening at 09:00", so two items that share an hour belong on two lines —
   packing them onto one row would be a bin-packing component answering a
   different question, and it would reshuffle rows every time the data moved. */
const timelineTrackVariants = cva("flex w-full flex-col", {
  variants: {
    size: {
      sm: "gap-1",
      default: "gap-1.5",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

/* The tone lives in the leading edge and a wash of the same colour behind the
   row; the label stays --foreground in every tone. Ten toned pills with ten
   coloured labels reads as a ransom note, and the edge already carries the
   coding on its own.

   Tint strengths follow the badge/banner scale rather than one flat number:
   warning is the palest hue in the set and needs a few more points before it
   registers, and destructive is the only one dense enough against a dark canvas
   to want its own step up. */
const timelineItemVariants = cva(
  /* min-w-6 stops a fifteen-minute item on a ten-hour track from collapsing to
     an invisible sliver — below roughly 4% of the range the pill would be
     narrower than the leading edge drawn on it. */
  "flex min-w-6 items-center overflow-hidden border-l-2 font-medium text-foreground",
  {
    variants: {
      tone: {
        selected: "border-selected bg-selected/10",
        info: "border-info bg-info/10",
        success: "border-success bg-success/10",
        warning: "border-warning bg-warning/15",
        destructive: "border-destructive bg-destructive/10 dark:bg-destructive/20",
        muted: "border-muted-foreground bg-muted-foreground/10",
        "chart-1": "border-chart-1 bg-chart-1/12",
        "chart-2": "border-chart-2 bg-chart-2/12",
        "chart-3": "border-chart-3 bg-chart-3/12",
        "chart-4": "border-chart-4 bg-chart-4/12",
        "chart-5": "border-chart-5 bg-chart-5/12",
      },
      /* Radius is chosen against the row height, not by eye: rounded-md is
         12.8px on a 36px pill and rounded-sm is 9.6px on a 28px one, so both
         stay under the half-edge point where the ends would round away into a
         lozenge. The pill grows horizontally, which is why neither value may be
         picked from the wide end of the scale. */
      size: {
        sm: "h-7 gap-1.5 rounded-sm px-2 text-xs",
        default: "h-9 gap-2 rounded-md px-2.5 text-sm",
      },
    },
    defaultVariants: {
      tone: "selected",
      size: "default",
    },
  }
)

type TimelineTone = NonNullable<VariantProps<typeof timelineItemVariants>["tone"]>
type TimelineSize = NonNullable<VariantProps<typeof timelineItemVariants>["size"]>

/* A label centred on its own gridline would hang half off the track at either
   end, so the outer two anchor inward and only the interior ones centre. */
const TICK_ANCHOR = {
  start: "translate-x-0",
  middle: "-translate-x-1/2",
  end: "-translate-x-full",
} as const

function tickAnchor(index: number, count: number) {
  if (index === 0) return TICK_ANCHOR.start
  if (index === count - 1) return TICK_ANCHOR.end
  return TICK_ANCHOR.middle
}

const percent = (fraction: number) => `${fraction * 100}%`

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/* Ticks are the consumer's own words for these positions, so a value that lands
   on one borrows its label — that is what lets the hidden "08:00 to 10:00" speak
   in the axis's units without a second prop carrying the same strings twice.

   The tolerance is not defensive padding. Ticks are spaced by dividing the range
   into equal steps, and that round-trip is lossy in binary floating point:
   (2 - 0) / 3 * 3 evaluates to 1.9999999999999998, so an exact hit would fail an
   integer test and silently fall back to the raw number. */
function tickLabelAt(value: number, start: number, span: number, ticks: string[]) {
  const steps = ticks.length - 1
  if (steps < 1) return null

  const position = ((value - start) / span) * steps
  const nearest = Math.round(position)
  if (Math.abs(position - nearest) > 1e-6) return null

  return ticks[nearest] ?? null
}

type TimelineTrackContextValue = {
  start: number
  span: number
  size: TimelineSize
  format: (value: number) => string
}

const TimelineTrackContext = React.createContext<TimelineTrackContextValue | null>(
  null
)

function useTimelineTrack() {
  const track = React.useContext(TimelineTrackContext)

  if (!track) {
    throw new Error("TimelineItem must be used within <TimelineTrack>")
  }

  return track
}

interface TimelineTrackProps extends React.ComponentProps<"div"> {
  /** Left edge of the axis, in whatever unit the items use. */
  start: number
  /** Right edge of the axis. Must be greater than `start`. */
  end: number
  /** Axis labels, spread evenly from `start` to `end`. Each also draws a gridline. */
  ticks?: string[]
  /** Default row height for the items inside. Each item may override it. */
  size?: TimelineSize
  /** Renders a position for the hidden span text. Defaults to the tick it lands on. */
  formatValue?: (value: number) => string
}

function TimelineTrack({
  className,
  start,
  end,
  ticks = [],
  size = "default",
  formatValue,
  children,
  ...props
}: TimelineTrackProps) {
  const span = end - start

  /* Every position on this track is a fraction of `span`, so a reversed or empty
     range is not a layout to degrade gracefully — it is a division by zero.
     Render nothing and let the caller notice, rather than emitting a stack of
     rows offset by NaN%. */
  if (!Number.isFinite(span) || span <= 0) {
    return null
  }

  const format =
    formatValue ??
    ((value: number) => tickLabelAt(value, start, span, ticks) ?? String(value))

  /* One tick still deserves its gridline; it just has no interval to sit at the
     end of, so it anchors at the start rather than dividing by zero. */
  const steps = Math.max(ticks.length - 1, 1)

  return (
    <TimelineTrackContext.Provider value={{ start, span, size, format }}>
      <div
        data-slot="timeline-track"
        data-size={size}
        className={cn("w-full", className)}
        {...props}
      >
        {ticks.length > 0 ? (
          /* The axis is scaffolding for the eye only. Every item already states
             its own span in the same units, so reading the ticks aloud would
             announce a bare list of times detached from anything they describe. */
          <div
            data-slot="timeline-track-ticks"
            aria-hidden="true"
            className="relative mb-2 h-4"
          >
            {ticks.map((tick, index) => (
              <span
                key={index}
                className={cn(
                  "absolute top-0 text-xs tabular-nums text-muted-foreground",
                  tickAnchor(index, ticks.length)
                )}
                style={{ left: percent(index / steps) }}
              >
                {tick}
              </span>
            ))}
          </div>
        ) : null}

        {/* Clipping here is the backstop behind the per-item clamp: an item held
            at the right edge still keeps its minimum width, and this is what
            stops those few pixels from hanging off the end of the axis. */}
        <div data-slot="timeline-track-rows" className="relative overflow-hidden">
          {ticks.length > 0 ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {ticks.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    "absolute inset-y-0 w-px bg-border",
                    /* The last gridline sits exactly on the right edge, where a
                       1px rule falls outside the clipped box and disappears —
                       pull it back inside by its own width. */
                    index === ticks.length - 1 && "-translate-x-full"
                  )}
                  style={{ left: percent(index / steps) }}
                />
              ))}
            </div>
          ) : null}

          <ol
            data-slot="timeline-track-list"
            /* Preflight strips list-style, which drops list semantics in Safari
               — restore them explicitly, same as the stepper does. */
            role="list"
            className={cn(timelineTrackVariants({ size }))}
          >
            {children}
          </ol>
        </div>
      </div>
    </TimelineTrackContext.Provider>
  )
}

interface TimelineItemProps extends React.ComponentProps<"li"> {
  /** Start position on the track's axis. */
  from: number
  /** End position on the track's axis. */
  to: number
  label: React.ReactNode
  /** Trailing slot — an avatar stack, a count, a status dot. */
  media?: React.ReactNode
  tone?: TimelineTone
  /** Overrides the track's size for this row alone. */
  size?: TimelineSize
  /** Replaces the hidden span text. Defaults to the track's formatted `from`–`to`. */
  rangeLabel?: string
}

function TimelineItem({
  className,
  from,
  to,
  label,
  media,
  tone = "selected",
  size,
  rangeLabel,
  ...props
}: TimelineItemProps) {
  const track = useTimelineTrack()
  const resolvedSize = size ?? track.size
  const end = track.start + track.span

  /* Both edges are clamped into the window rather than allowed to overflow: an
     item beginning before the track does is drawn from the left edge, not from a
     negative offset that would slide it out from under its own axis. An item
     entirely outside the range survives as a hairline pinned to the edge it
     overran, which is the honest picture — it is on the schedule, just not in
     the window being shown. */
  const left = clamp01((from - track.start) / track.span)
  const right = clamp01((to - track.start) / track.span)
  const clipped = from < track.start || to > end

  return (
    <li
      data-slot="timeline-item"
      data-tone={tone}
      data-size={resolvedSize}
      data-clipped={clipped || undefined}
      className={cn(timelineItemVariants({ tone, size: resolvedSize }), className)}
      /* Percentages are the only unit that keeps a row pinned to its hour as the
         track is resized, and neither the offset nor the width can be a utility
         — both are continuous numbers. Both resolve against the row list's
         width, and clamping guarantees offset + width never exceeds 100%, so a
         row cannot push its own container wider. */
      style={{ marginLeft: percent(left), width: percent(right - left) }}
      {...props}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {/* Where the pill sits is the only thing on screen saying when this
          happens, and position says nothing at all to a screen reader — or to
          anyone whose item got clamped. The span is spoken in full, from the
          unclamped values, so a clipped row still reports its real hours. */}
      <span className="sr-only">
        , {rangeLabel ?? `${track.format(from)} to ${track.format(to)}`}
      </span>
      {media ? (
        <span data-slot="timeline-item-media" className="shrink-0">
          {media}
        </span>
      ) : null}
    </li>
  )
}

export { TimelineTrack, TimelineItem, timelineTrackVariants, timelineItemVariants }
export type { TimelineTrackProps, TimelineItemProps, TimelineTone, TimelineSize }
