import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "../../lib/utils"

/* Only the fill carries the tone — the track stays --secondary in every tone so
   a row of bars reads as one control rather than four unrelated ones.

   The first four tones are verdicts on the work: ordinary progress, done, at
   risk, failed. The rest mirror the scale UsageMeter and Sparkline already
   carry, for a bar that is a series colour rather than a verdict — one goal of
   several on a savings card, one project's share of a board — where the hue
   identifies which thing is being measured and says nothing about how it is
   going.

   The indicator glides to its new value on the layout spring — slightly
   overdamped, so it arrives without overshooting the number it is reporting. A
   bar that jumps loses the sense of progress entirely. */
const progressIndicatorVariants = cva(
  "size-full flex-1 rounded-full transition-transform duration-spring-glide ease-spring-glide",
  {
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
    },
    defaultVariants: {
      tone: "selected",
    },
  }
)

type ProgressTone = NonNullable<VariantProps<typeof progressIndicatorVariants>["tone"]>

interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  /** Split the bar into N equal cells filled from `value`. Omit for one continuous bar. */
  segments?: number
  tone?: ProgressTone
  /**
   * Decoration pinned to the current value — a knob, a rule, a "24%" flag.
   * Rendered `aria-hidden` (the progressbar role already reports the value) in
   * a zero-width box at `value / max` of the bar's width, spanning its height,
   * with the content centred on that line on both axes. Give the content
   * `self-start` to hang it from the top edge, `self-end` to stand it on the
   * bottom edge. It may overflow the bar in any direction. Not drawn while the
   * bar is indeterminate.
   */
  marker?: React.ReactNode
}

function Progress({
  className,
  value,
  max = 100,
  segments,
  tone = "selected",
  marker,
  ...props
}: ProgressProps) {
  const segmented = typeof segments === "number" && segments > 0
  /* Radix keeps ownership of role="progressbar" and the aria-value* trio in
     both modes; only what is painted inside the root changes. */
  const state = value == null ? "indeterminate" : value >= max ? "complete" : "loading"

  /* A marker has to be able to stick out of the bar — a knob taller than the
     track, a flag hanging below it — and the continuous bar clips on x to hide
     the translated-away part of its fill. `overflow-x: hidden` forces the other
     axis to `auto`, so the marker would be cut off or, worse, scroll. With a
     marker the root stops clipping and the fill gets a clipping box of its
     own instead. Without one, nothing below changes.

     Radix reads a value outside 0..max as indeterminate and drops the aria
     value, so the marker follows the same test rather than pinning itself to
     an edge for a number the bar is not reporting. */
  const determinate =
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max
  const marked = determinate && marker != null && marker !== false

  /* The fill's position, as a percentage of the bar. At the default max of 100
     the value is used as-is, exactly as it always was — dividing and
     multiplying by 100 would turn 0.29 into 28.999999999999996 and change the
     inline style of every existing bar. Any other max is scaled, so a marker
     and the fill it marks agree on where `value` is. */
  const filled = max === 100 ? value || 0 : max > 0 ? ((value || 0) * 100) / max : 0

  const indicator = (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn(progressIndicatorVariants({ tone }))}
      style={{ transform: `translateX(-${100 - filled}%)` }}
    />
  )

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-tone={tone}
      value={value}
      max={max}
      className={cn(
        "relative flex h-2 w-full items-center",
        segmented
          ? "gap-1 overflow-visible bg-transparent"
          : marked
            ? "overflow-visible rounded-full bg-secondary"
            : "overflow-x-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      {segmented ? (
        Array.from({ length: segments }, (_, index) => {
          /* Each cell reports the slice of the range it owns, so a value that
             lands mid-cell part-fills it and the row still reads as one
             continuous bar rather than a stack of on/off lamps. */
          const span = max / segments
          const fill = Math.min(1, Math.max(0, ((value ?? 0) - index * span) / span))

          return (
            <span
              key={index}
              data-slot="progress-segment"
              /* Mirrors what Indicator would have carried — consumers style off
                 these, and in segmented mode there is no Indicator to read. */
              data-state={state}
              data-value={value ?? undefined}
              data-max={max}
              className="relative h-full flex-1 overflow-hidden rounded-full bg-secondary"
            >
              <span
                data-slot="progress-segment-indicator"
                /* A span is inline, and size-full does nothing to an inline
                   box, so without `block` the fill paints no area at all. Kept
                   off the shared variants: the continuous bar's Indicator is a
                   div and is left exactly as it was. */
                className={cn(progressIndicatorVariants({ tone }), "block origin-left")}
                style={{ transform: `scaleX(${fill})` }}
              />
            </span>
          )
        })
      ) : marked ? (
        /* Inherits the root's radius, whatever a caller set it to, so the fill
           is cut to the same shape the unmarked bar cuts it to. */
        <span
          data-slot="progress-clip"
          className="absolute inset-0 overflow-hidden"
          style={{ borderRadius: "inherit" }}
        >
          {indicator}
        </span>
      ) : (
        indicator
      )}
      {marked ? (
        /* Zero width, so whatever is passed centres on the value line however
           wide it is — flex centring overflows evenly to both sides, and its
           children are kept from shrinking to the box's zero width. It follows
           the fill on the same spring, and comes after it in the DOM so it
           paints on top without a z-index. */
        <span
          data-slot="progress-marker"
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 flex w-0 items-center justify-center *:shrink-0 transition-[left] duration-spring-glide ease-spring-glide"
          style={{ left: `${filled}%` }}
        >
          {marker}
        </span>
      ) : null}
    </ProgressPrimitive.Root>
  )
}

export { Progress, progressIndicatorVariants }
export type { ProgressProps, ProgressTone }
