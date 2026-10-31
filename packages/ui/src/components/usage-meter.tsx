import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/* A count against a quota — 9 of 40 emails, 3 of 5 seats — drawn as a row of
   discrete pips.
 *
 * Deliberately not a mode of `Progress`. That component reports one continuous
 * value and hands Radix the `progressbar` role, which describes a task
 * advancing toward completion. This describes a level already spent out of an
 * allowance, which is what `role="meter"` is for. The reading differs too: a
 * bar says "56% of the way there", a pip row says "14 gone, 11 left" — and the
 * discreteness is the entire reason to draw it, because a countable row is the
 * only shape that answers "how many do I have left" without arithmetic.
 *
 * Nor a `TickStrip`, which is a series over time. Nothing here is ordered by
 * when it happened and no pip means more than any other; they are
 * interchangeable tallies.
 *
 * The tone lands on the root as a text colour and every pip paints from
 * currentColor. That is what makes over-quota a one-class state rather than a
 * second set of eleven fills: the row goes destructive by swapping the colour
 * on the root, and the pips follow without knowing why. */
const usageMeterVariants = cva("flex w-full min-w-0 flex-col", {
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
    /* Both measurements ride on the root as custom properties rather than
       becoming a second cva. The gutter belongs to the track and the height
       belongs to the pips — two different elements — and a size axis declared
       twice is a size axis that can disagree with itself. */
    size: {
      sm: "gap-1.5 [--usage-pip:--spacing(2)] [--usage-gutter:--spacing(0.5)]",
      default: "gap-2 [--usage-pip:--spacing(3)] [--usage-gutter:--spacing(1)]",
    },
    /* The base string above is what `pips` has always rendered, and it stays
       untouched: each variant only adds classes that twMerge resolves against
       it, so the default path emits the same class list it did before this
       axis existed.
     *
     * `ticks` lays the row out inline — a strip of fixed-width ticks with the
     * readout after it, in reading order — and wraps the readout under the
     * strip rather than overflowing a narrow column. `bar` keeps the column
     * but draws one continuous line with the percentage sitting in a break in
     * it; see the track below. */
    variant: {
      pips: "",
      ticks: "w-auto max-w-full flex-row flex-wrap items-center",
      bar: "",
    },
  },
  defaultVariants: {
    tone: "selected",
    size: "default",
    variant: "pips",
  },
})

/* An unfilled pip takes the same `--muted` fill the rest of the family uses for
   an empty track, so a spent pip is the only thing carrying colour.

   `rounded-full` is not a style choice: the surface scale starts at 9.6px
   (`--radius-sm`), which would swallow a pip whole and round it into a circle.
   At these widths a full radius lands as a softened cap. */
const usageMeterPipVariants = cva(
  "h-(--usage-pip) min-w-0 flex-1 rounded-full transition-colors duration-base ease-out-expo",
  {
    variants: {
      filled: {
        true: "bg-current",
        false: "bg-muted",
      },
      /* `tick` overrides the stretch and the height rather than restating the
         pill, for the same reason the root's variant axis does: the base
         string is the pill, untouched. A tick is a fixed 2px column a little
         taller than a pip of the same size, so a strip of them reads as a
         tally rather than a squashed bar. */
      shape: {
        pill: "",
        tick: "h-[calc(var(--usage-pip)+--spacing(1))] w-0.5 flex-none",
      },
    },
    /* A row of thin ticks has almost no area, and the `--muted` fill that
       carries a wide pip disappears at 2px — entirely so on a muted footer,
       which is where a seat count usually sits. An unlit tick takes a
       stronger neutral so the allowance left stays countable. */
    compoundVariants: [
      { filled: false, shape: "tick", class: "bg-muted-foreground/25" },
    ],
    defaultVariants: {
      filled: false,
      shape: "pill",
    },
  },
)

/* The cap on how many pips get drawn, and the point where a pip stops being a
   unit and becomes a bucket.
 *
 * Under the cap each pip is exactly one unit, so 14 of 25 is literally 14 lit
 * pips — the property the whole component exists for. 30 is chosen to keep that
 * true for the quotas people actually count (seats, projects, integrations,
 * campaigns) rather than to be a round number; above it each pip stands for
 * `max / 30` units and the row goes back to reading as a proportion, with the
 * label carrying the exact figures.
 *
 * The ceiling is geometric, not arbitrary: at the default 4px gutter a 30-pip
 * row still leaves each pip about 4px in a 240px column. Past that the gutters
 * start eating the pips, and a quota of 1000 would be 1000 DOM nodes drawn
 * sub-pixel. */
const PIP_CAP = 30

/* Counts are whole things. A fractional quota (2.5 GB of storage) keeps one
   decimal rather than being rounded into a number the caller didn't pass. */
function formatCount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

type UsageMeterTone = NonNullable<VariantProps<typeof usageMeterVariants>["tone"]>

type UsageMeterSize = NonNullable<VariantProps<typeof usageMeterVariants>["size"]>

type UsageMeterVariant = NonNullable<VariantProps<typeof usageMeterVariants>["variant"]>

type UsageMeterProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** The count spent. Negative and non-finite read as 0. */
  value: number
  /** The quota. Zero, negative and non-finite are treated as no quota at all. */
  max: number
  /**
   * A suffix that names the figure, never a replacement for it. `pips` and
   * `ticks` append it to the count — "emails" renders "9/40 emails". `bar`
   * appends it to the percentage and defaults it to "used" — "40% used".
   */
  label?: React.ReactNode
  /** Names the meter to a screen reader, e.g. "Monthly email quota". */
  srLabel?: string
  tone?: UsageMeterTone
  size?: UsageMeterSize
  /**
   * `pips` (default): a full-width row of pips with the readout above it.
   * `ticks`: fixed-width ticks with the readout inline after them.
   * `bar`: one continuous line broken by an inline "40% used" caption; the
   * caller shows the figures, so no readout row is drawn.
   */
  variant?: UsageMeterVariant
}

function UsageMeter({
  value,
  max,
  label,
  srLabel,
  tone = "selected",
  size = "default",
  variant = "pips",
  className,
  "aria-label": ariaLabel,
  ...props
}: UsageMeterProps) {
  const spent = Number.isFinite(value) ? Math.max(0, value) : 0

  /* The `max <= 0` guard, resolved once into a nullable quota so nothing
     downstream divides by it. Null is not an error state — an unset allowance
     is an ordinary thing for a plan to have — so the row still renders, just
     with nothing to measure against. */
  const quota = Number.isFinite(max) && max > 0 ? max : null

  /* Over-quota is a real reading, not a fault: the pips fill, the row turns
     destructive whatever tone was asked for, and the percentage appears
     because past 100% the count alone stops carrying the news. */
  const over = quota != null && spent > quota
  const percent = quota != null ? Math.round((spent / quota) * 100) : null
  const paintedTone = over ? "destructive" : tone

  const pips =
    quota == null ? PIP_CAP : Math.min(PIP_CAP, Math.max(1, Math.ceil(quota)))

  /* Two rules that only conflict at the very edges of the scale, in the order
     they have to win.
     1. A quota not yet spent must never draw as full, so an under-quota value
        is held one pip short even when it rounds up to the whole row.
     2. Anything spent at all lights a pip — a single call against a quota of
        1000 rounds to nothing otherwise, and "nothing used" is a different
        fact from "barely used".
     Rule 1 outranks rule 2, which is what the nesting says: at `max={1}` a
     half-spent quota leaves the only pip dark rather than claiming the
     allowance is gone. */
  const lit =
    quota == null || spent <= 0
      ? 0
      : spent >= quota
        ? pips
        : Math.min(pips - 1, Math.max(1, Math.round((spent / quota) * pips)))

  const readout =
    quota == null
      ? formatCount(spent)
      : `${formatCount(spent)}/${formatCount(quota)}`

  const reading =
    quota == null
      ? `${formatCount(spent)}, no quota set`
      : `${formatCount(spent)} of ${formatCount(quota)}, ${percent}%`

  /* `label` is a ReactNode and cannot be spoken, which is the whole reason
     `srLabel` exists. This is the name only — the value belongs in
     `aria-valuetext`, and duplicating it into the name would have a screen
     reader announce the numbers twice. */
  const name = ariaLabel ?? srLabel ?? "Usage"

  /* A meter with no maximum has nothing to measure against, and ARIA defaults a
     missing `aria-valuemax` to 100 — so a quotaless row left as a meter would
     announce "14%" for a number that is not a percentage of anything. It
     degrades to an image whose label states the count and says the quota is
     unset. Typed as div props so `role` stays an `AriaRole` rather than
     widening to `string`. */
  const trackAria: React.ComponentProps<"div"> =
    quota == null
      ? { role: "img", "aria-label": `${name}: ${reading}` }
      : {
          role: "meter",
          "aria-label": name,
          "aria-valuenow": spent,
          "aria-valuemin": 0,
          "aria-valuemax": quota,
          "aria-valuetext": reading,
        }

  /* The two new layouts branch out before the original one, which is left
     exactly as it was — the pips path is the one every existing caller renders,
     and keeping it as its own unshared return is what guarantees it cannot
     drift while the others change. */
  if (variant === "ticks") {
    return (
      <div
        data-slot="usage-meter"
        data-tone={paintedTone}
        data-size={size}
        data-variant={variant}
        data-over-quota={over || undefined}
        className={cn(usageMeterVariants({ tone: paintedTone, size, variant }), className)}
        {...props}
      >
        <div
          data-slot="usage-meter-track"
          {...trackAria}
          className="flex w-auto max-w-full min-w-0 flex-none items-center gap-(--usage-gutter)"
        >
          {Array.from({ length: pips }, (_, index) => (
            <span
              key={index}
              data-slot="usage-meter-pip"
              data-filled={index < lit}
              className={cn(usageMeterPipVariants({ filled: index < lit, shape: "tick" }))}
            />
          ))}
        </div>

        {/* The same rule as pips for when the readout appears — a label, or
            an exceeded quota — only placed after the strip instead of above
            it. Over quota the percentage takes the ink tone: the plain
            destructive fill is a 3.3:1 colour and this one is text. */}
        {label != null || over ? (
          <div
            data-slot="usage-meter-label"
            className="flex min-w-0 items-baseline gap-2 text-sm leading-none"
          >
            <span className="min-w-0 truncate font-medium tabular-nums text-foreground">
              {readout}
              {label != null ? (
                <span className="ml-1 font-normal text-muted-foreground">{label}</span>
              ) : null}
            </span>
            {over ? (
              <span className="shrink-0 font-medium tabular-nums text-destructive-ink">
                {percent}%
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  if (variant === "bar") {
    /* One line, broken where the caption sits: fill, caption, remainder, as a
       three-column grid whose outer columns share the space left after the
       caption in proportion to the reading. Their fr values always sum to 100
       — a set of fr tracks summing below 1 would stop filling the row.

       A part with nothing to show is dropped rather than drawn at 0fr, so 0%
       does not open an empty gap before the caption and a spent quota does not
       leave one after it. The same two edge rules as the pips hold, through a
       min width on each part: anything spent shows a sliver of fill, and an
       unspent quota keeps a sliver of remainder however close it gets. With
       no quota at all there is nothing to fill, and the whole line is
       remainder. The remainder takes the same stronger neutral as an unlit
       tick: at 6px tall, `--muted` vanishes on the muted trays this sits in. */
    const fillFr = quota == null ? 0 : Math.min(1, spent / quota) * 100
    const restFr = 100 - fillFr
    const columns = [
      fillFr > 0 ? `${fillFr}fr` : null,
      "auto",
      restFr > 0 ? `${restFr}fr` : null,
    ]
      .filter(Boolean)
      .join(" ")

    /* The caption's number follows the same honesty rule as the fill: a
       percentage that rounds to 0 while something is spent reads "<1%", and
       one that rounds to 100 while the quota is not yet spent reads ">99%".
       With no quota there is no percentage, so the caption states the count
       instead — "12 used", never "null% used". Over quota it is the real
       figure, "112% used". */
    const figure =
      quota == null || percent == null
        ? formatCount(spent)
        : spent > 0 && percent === 0
          ? "<1%"
          : !over && spent < quota && percent >= 100
            ? ">99%"
            : `${percent}%`

    const destructive = paintedTone === "destructive"

    return (
      <div
        data-slot="usage-meter"
        data-tone={paintedTone}
        data-size={size}
        data-variant={variant}
        data-over-quota={over || undefined}
        className={cn(usageMeterVariants({ tone: paintedTone, size, variant }), className)}
        {...props}
      >
        <div
          data-slot="usage-meter-track"
          {...trackAria}
          className="grid w-full min-w-0 items-center gap-2"
          style={{ gridTemplateColumns: columns }}
        >
          {fillFr > 0 ? (
            <span
              data-slot="usage-meter-fill"
              className="h-[calc(var(--usage-pip)/2)] min-w-1.5 rounded-full bg-current"
            />
          ) : null}
          <span
            data-slot="usage-meter-caption"
            /* Muted beside the line, and the ink tone — not currentColor —
               when the line has gone destructive: the destructive fill is a
               3.3:1 colour, fine for a stroke and too light for text. */
            className={cn(
              "whitespace-nowrap text-sm leading-none tabular-nums",
              destructive ? "text-destructive-ink" : "text-muted-foreground",
            )}
          >
            {figure} {label ?? "used"}
          </span>
          {restFr > 0 ? (
            <span
              data-slot="usage-meter-rest"
              className="h-[calc(var(--usage-pip)/2)] min-w-1.5 rounded-full bg-muted-foreground/25"
            />
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      data-slot="usage-meter"
      /* The painted tone, not the requested one — a descendant selecting on
         `data-tone` is matching what it can see, and `data-over-quota` says
         why it changed. */
      data-tone={paintedTone}
      data-size={size}
      data-over-quota={over || undefined}
      className={cn(usageMeterVariants({ tone: paintedTone, size }), className)}
      {...props}
    >
      {label != null || over ? (
        <div
          data-slot="usage-meter-label"
          /* Every colour in this row is stated outright. The root carries the
             tone as a text colour for the pips to inherit, and a caption
             painted lime is not a caption. */
          className="flex items-baseline justify-between gap-2 text-sm leading-none"
        >
          <span className="min-w-0 truncate font-medium tabular-nums text-foreground">
            {readout}
            {label != null ? (
              <span className="ml-1 font-normal text-muted-foreground">{label}</span>
            ) : null}
          </span>
          {over ? (
            <span className="shrink-0 font-medium tabular-nums text-destructive">
              {percent}%
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        data-slot="usage-meter-track"
        {...trackAria}
        className="flex w-full min-w-0 items-center gap-(--usage-gutter)"
      >
        {/* A meter's children are presentational in ARIA, so the pips are
            already outside the accessibility tree — `aria-hidden` here would
            only restate that. */}
        {Array.from({ length: pips }, (_, index) => (
          <span
            key={index}
            data-slot="usage-meter-pip"
            data-filled={index < lit}
            className={cn(usageMeterPipVariants({ filled: index < lit }))}
          />
        ))}
      </div>
    </div>
  )
}

export { UsageMeter, usageMeterPipVariants, usageMeterVariants }
export type { UsageMeterProps, UsageMeterSize, UsageMeterTone, UsageMeterVariant }
