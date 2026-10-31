import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { ProgressCircle } from "./ui/progress-circle"
import { cn } from "../lib/utils"

/* Finish-setup card for a sidebar footer: a pastel media header, a circular
 * badge floating on the seam below it, the copy, and a step-progress footer.
 *
 * Deliberately not built on Card, for one reason: Card is `overflow-hidden`,
 * which is the one thing a badge overhanging the media edge cannot survive.
 * Everything else follows from that. The root re-states Card's surface — same
 * radius, border, ink, hairline elevation — and each part carries its own
 * `px-(--setup-card-spacing)`, the same idiom `--card-spacing` uses, so the
 * rhythm matches a real Card even though the chrome is re-declared.
 *
 * The media carries no background of its own. The four `gradient-*` utilities
 * are whole-background shorthands (a colour plus four stacked radials), so a
 * placeholder `bg-secondary` underneath would not lose to them predictably —
 * twMerge cannot pair the two class names, both would ship, and the winner
 * would come down to stylesheet order. Passing one of the gradients in
 * `className` is the contract, not a convenience. */
const setupCardVariants = cva(
  "group/setup-card flex w-full flex-col rounded-xl border border-border bg-card text-card-foreground shadow-hairline",
  {
    variants: {
      /* Only spacing lives here. Everything the size changes further down the
         tree hangs off `data-size` instead, because the parts that need it are
         separated from the root by caller-supplied children. */
      size: {
        sm: "[--setup-card-spacing:--spacing(4)]",
        default: "[--setup-card-spacing:--spacing(5)]",
      },
    },
    defaultVariants: { size: "default" },
  },
)

type SetupCardSize = NonNullable<VariantProps<typeof setupCardVariants>["size"]>

interface SetupCardMediaProps extends React.ComponentProps<"div"> {
  /**
   * Circular mark centred on the media/body seam. Decorative — see the note on
   * the slot below.
   */
  badge?: React.ReactNode
  /** Overlaid control, pinned to the top-right corner and forced to a pill. */
  action?: React.ReactNode
}

interface SetupCardStepsProps extends React.ComponentProps<"span"> {
  /** Steps completed. Values outside `[0, max]` are clamped by the ring. */
  current: number
  /** Total number of steps. */
  max: number
  /** Names the count for assistive tech, read ahead of the visible "2 of 4". */
  srLabel?: string
}

function SetupCard({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof setupCardVariants>) {
  return (
    <div
      data-slot="setup-card"
      data-size={size}
      className={cn(setupCardVariants({ size }), className)}
      {...props}
    />
  )
}

/**
 * The media header. Pass one of `gradient-sky` · `gradient-sunrise` ·
 * `gradient-blossom` · `gradient-meadow` in `className`, and an illustration as
 * `children`.
 */
function SetupCardMedia({
  className,
  badge,
  action,
  children,
  ...props
}: SetupCardMediaProps) {
  return (
    <div
      data-slot="setup-card-media"
      className={cn(
        "relative shrink-0 rounded-t-xl",
        "h-28 group-data-[size=sm]/setup-card:h-24",
        /* The badge overhangs the bottom edge by half its own box, so the gap
           to the title is measured from the badge rather than from the media:
           36px clears a 56px badge with 8px to spare, 32px clears a 48px one. */
        badge
          ? "mb-9 group-data-[size=sm]/setup-card:mb-8"
          : "mb-4 group-data-[size=sm]/setup-card:mb-3",
        className,
      )}
      {...props}
    >
      {/* The gradient is a background, so the radius clips it for free. An
          illustration is not — it needs a layer of its own to be clipped by,
          and that layer cannot be this element: clipping here would also cut
          off the badge and the action. */}
      {children ? (
        <div
          data-slot="setup-card-media-fill"
          className="absolute inset-0 overflow-hidden rounded-t-xl"
        >
          {children}
        </div>
      ) : null}

      {action ? (
        /* The pill is enforced rather than documented. This is the only control
           that sits on the pastel, and its shape is what separates it from the
           illustration behind it — a square-cornered button here reads as a
           mis-crop of the artwork. */
        <div
          data-slot="setup-card-media-action"
          className="absolute top-3 right-3 flex items-center gap-2 [&_[data-slot=button]]:rounded-full"
        >
          {action}
        </div>
      ) : null}

      {badge ? (
        <span
          data-slot="setup-card-media-badge"
          /* aria-hidden: the mark is a wayfinding cue for a title that sits
             directly beneath it and already names the step. Announcing it would
             just prepend noise to that title. */
          aria-hidden="true"
          className={cn(
            "absolute bottom-0 left-1/2 flex -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full bg-card text-foreground shadow-soft ring-4 ring-card",
            "size-14 group-data-[size=sm]/setup-card:size-12",
            "[&_svg]:size-6 [&_svg]:shrink-0 group-data-[size=sm]/setup-card:[&_svg]:size-5",
          )}
        >
          {badge}
        </span>
      ) : null}
    </div>
  )
}

/* A div rather than a heading. This card turns up in a sidebar footer, in an
   onboarding column and inside a dialog, and only the page around it knows
   which level is correct; a fixed one would break heading order in two of the
   three. Callers who need a heading pass their own element as children. */
function SetupCardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="setup-card-title"
      className={cn(
        "px-(--setup-card-spacing) text-center text-base leading-snug font-semibold",
        "group-data-[size=sm]/setup-card:text-sm",
        className,
      )}
      {...props}
    />
  )
}

function SetupCardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="setup-card-description"
      className={cn(
        "mt-1.5 px-(--setup-card-spacing) text-center text-sm leading-normal text-pretty text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

/* Progress on one side, actions on the other. The border is on the footer and
   not on the card, so a card without one ends on its own bottom padding rather
   than on a rule that has nothing under it. */
function SetupCardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="setup-card-footer"
      className={cn(
        "mt-4 flex items-center justify-between gap-3 border-t border-border px-(--setup-card-spacing) py-3",
        "group-data-[size=sm]/setup-card:mt-3 group-data-[size=sm]/setup-card:py-2.5",
        className,
      )}
      {...props}
    />
  )
}

/** The ring and its readout: `current` of `max`, as a count and as an arc. */
function SetupCardSteps({
  className,
  current,
  max,
  srLabel = "Setup progress",
  ...props
}: SetupCardStepsProps) {
  return (
    <span
      data-slot="setup-card-steps"
      className={cn(
        "inline-flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground tabular-nums",
        className,
      )}
      {...props}
    >
      {/* Hidden outright rather than left to announce "50%" a beat after the
          text beside it has said "2 of 4" — the same quantity twice, in two
          different units, is worse than one terse reading.

          A numeric size because the named ones start at 36px, which is taller
          than the row it sits in; the component derives its own stroke from the
          box, so this stays one number rather than two. */}
      <ProgressCircle
        aria-hidden="true"
        value={current}
        max={max}
        size={16}
        tone="selected"
      />
      <span className="sr-only">{srLabel}: </span>
      {current} of {max}
    </span>
  )
}

export {
  SetupCard,
  SetupCardDescription,
  SetupCardFooter,
  SetupCardMedia,
  SetupCardSteps,
  SetupCardTitle,
  setupCardVariants,
}
export type { SetupCardMediaProps, SetupCardSize, SetupCardStepsProps }
