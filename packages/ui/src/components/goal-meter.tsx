import * as React from "react"

import { cn } from "../lib/utils"
import { Progress } from "./ui/progress"

/* A count advancing toward a fixed goal — 18 of 27 agents live — drawn as a
   gradient fill with a knob and a percent flag at the current value, the
   unfilled remainder as a row of ticks, and a taller tick standing at the end.
 *
 * The bar itself is a Progress: it owns role="progressbar" and the
 * aria-value trio, and the knob and its flag ride in Progress's own marker
 * slot so they follow the fill on the same spring. What Progress cannot draw
 * is the remainder as ticks and the end tick, so those sit behind it,
 * aria-hidden, and its track goes transparent to let them show through.
 *
 * Not a mode of Progress, and not UsageMeter. Progress has no ticked remainder
 * or end tick; UsageMeter reports a level spent out of an allowance
 * (role="meter") and has neither a knob nor a flag. This is a task heading for
 * a finish line, so it reads "how far along", not "how much is left".
 *
 * Every class below is what the deployment-progress card rendered before this
 * was a component, so swapping the card over to it moves nothing. The two type
 * sizes are the size-only scale with the line-height the stock sizes used to
 * carry written out beside them. */

type GoalMeterProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** How far along. Held inside 0..max, so a count past the goal reads as the goal reached. */
  value: number
  /** The goal. Greater than 0; anything else draws an empty bar. */
  max: number
  /** Ticks drawn across the unfilled remainder. Every other one hides below `sm`. */
  ticks: number
  /** The progressbar's accessible name. */
  label: string
  /** The spoken reading. Defaults to "<percent>% complete". */
  valueText?: string
  /** The caption over the end tick. Defaults to "100%". */
  endLabel?: React.ReactNode
}

function GoalMeter({
  value,
  max,
  ticks,
  label,
  valueText,
  endLabel = "100%",
  className,
  ...props
}: GoalMeterProps) {
  /* Held inside 0..max before anything reads it. Progress treats a value
     outside its range as indeterminate and drops the knob, while the ticks and
     the spoken percent would go on reporting the raw number — a bar with no
     reading that says "150% complete", or ticks hung off the left edge for a
     negative one. An overshoot is the goal reached; a value in range passes
     through untouched. */
  /* A goal of zero or less has no "how far along". The bar is drawn empty
     against a goal of 1, which keeps the progressbar's range valid instead of
     handing the primitive a max it rejects. */
  const goal = Number.isFinite(max) && max > 0 ? max : 1
  const reached =
    max > 0 && Number.isFinite(value) ? Math.min(Math.max(value, 0), goal) : 0
  const share = (reached / goal) * 100
  const percent = Math.round(share)
  const tickCount = Number.isFinite(ticks) ? Math.max(0, Math.floor(ticks)) : 0

  return (
    <div data-slot="goal-meter" className={cn("relative pt-7", className)} {...props}>
      <span
        data-slot="goal-meter-end-label"
        aria-hidden="true"
        className="absolute top-0 right-3 text-body-sm leading-5 text-foreground tabular-nums"
      >
        {endLabel}
      </span>
      <div className="relative h-7">
        <div
          data-slot="goal-meter-ticks"
          aria-hidden="true"
          className="absolute inset-y-0 right-3 flex items-stretch justify-between gap-0.5 overflow-hidden"
          style={{ left: `calc(${share}% + 0.75rem)` }}
        >
          {Array.from({ length: tickCount }, (_, index) => (
            <span
              key={index}
              className="w-1 shrink-0 rounded-full bg-muted-foreground/25 max-sm:even:hidden"
            />
          ))}
        </div>
        <span
          data-slot="goal-meter-end-tick"
          aria-hidden="true"
          className="absolute right-0 bottom-0 h-12 w-1 rounded-full bg-muted-foreground/40"
        />
        <Progress
          value={reached}
          max={goal}
          aria-label={label}
          aria-valuetext={valueText ?? `${percent}% complete`}
          className="absolute inset-0 h-full rounded-md bg-transparent [&_[data-slot=progress-indicator]]:rounded-md [&_[data-slot=progress-indicator]]:bg-linear-to-r [&_[data-slot=progress-indicator]]:from-chart-4 [&_[data-slot=progress-indicator]]:to-info"
          marker={
            <span className="relative flex h-10 w-2.5 flex-col items-center self-end">
              <span className="size-2.5 shrink-0 rounded-full bg-info" />
              <span className="-mt-1 w-1 flex-1 rounded-full bg-info" />
              {/* White-on-blue would be 3.7:1; ink on an opaque card chip clears AA. */}
              <span
                data-slot="goal-meter-flag"
                className="absolute right-full bottom-1 mr-1.5 flex h-5 items-center rounded-sm bg-card px-1.5 text-caption-sm leading-4 font-medium text-info-ink tabular-nums"
              >
                {percent}%
              </span>
            </span>
          }
        />
      </div>
    </div>
  )
}

export { GoalMeter }
export type { GoalMeterProps }
