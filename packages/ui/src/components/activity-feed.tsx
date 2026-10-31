import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/* Timeline marker — a squircle, so the radius is explicit: the radius scale would
   overrun half of a 36px box and collapse the tile into a circle. The tone tints
   the marker only; the copy beside it always stays neutral. */
const activityFeedMarkerVariants = cva(
  "flex size-9 shrink-0 items-center justify-center rounded-[11px] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
  {
    variants: {
      tone: {
        default:
          "bg-secondary text-muted-foreground ring-1 ring-foreground/[0.04]",
        info: "bg-info/10 text-info",
        success: "bg-success/10 text-success",
        warning: "bg-warning/15 text-warning-ink",
        destructive:
          "bg-destructive/10 text-destructive dark:bg-destructive/20",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  }
)

/* A feed is a sequence, so it arrives as one: six pixels of rise and a fade per
   item, each a beat behind the one above it. Deliberately no blur — these rows
   are the most repeated element in the component, and a materialise cue on
   every one of them reads as fog rather than as arrival.

   `fill-mode-backwards` is load-bearing with a stagger: without it an item sits
   at its final opacity through its own delay and then flashes back to the start
   frame when its turn comes. */
const activityFeedItemEnter =
  "animate-in fade-in-0 slide-in-from-bottom-[6px] fill-mode-backwards anim-spring-swap ease-spring-swap"

/* Delays live on the parent so an item needs no index prop and a consumer can
   keep composing these by hand. Capped at six beats — past that, the tail of a
   long feed would be waiting on a cascade nobody is still watching, and the
   `n+7` rule hands everything after the cap the last delay rather than none. */
const activityFeedStagger = [
  "[&>*:nth-child(2)]:[--tw-animation-delay:calc(1*var(--stagger-base))]",
  "[&>*:nth-child(3)]:[--tw-animation-delay:calc(2*var(--stagger-base))]",
  "[&>*:nth-child(4)]:[--tw-animation-delay:calc(3*var(--stagger-base))]",
  "[&>*:nth-child(5)]:[--tw-animation-delay:calc(4*var(--stagger-base))]",
  "[&>*:nth-child(6)]:[--tw-animation-delay:calc(5*var(--stagger-base))]",
  "[&>*:nth-child(n+7)]:[--tw-animation-delay:calc(6*var(--stagger-base))]",
].join(" ")

function ActivityFeed({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="activity-feed"
      /* Preflight strips list-style, which drops list semantics in Safari —
         restore them explicitly, same as the stepper does. */
      role="list"
      className={cn("flex w-full flex-col", activityFeedStagger, className)}
      {...props}
    />
  )
}

function ActivityFeedItem({
  icon,
  avatar,
  title,
  description,
  timestamp,
  tone = "default",
  className,
  ...props
}: Omit<React.ComponentProps<"li">, "title"> &
  VariantProps<typeof activityFeedMarkerVariants> & {
    icon?: React.ReactNode
    avatar?: React.ReactNode
    title: React.ReactNode
    description?: React.ReactNode
    timestamp?: string
  }) {
  return (
    <li
      data-slot="activity-feed-item"
      data-tone={tone}
      className={cn(
        "group/feed-item flex min-h-18 gap-3.5 last:min-h-0",
        activityFeedItemEnter,
        className
      )}
      {...props}
    >
      {/* Marker column. The connector is a flex child that eats the leftover
          height, so it always runs from this marker down to the next one — and
          the last item, having no next marker, renders no line at all. */}
      <div className="flex flex-col items-center self-stretch">
        {avatar ? (
          <span
            data-slot="activity-feed-avatar"
            className="flex size-9 shrink-0 items-center justify-center *:data-[slot=avatar]:size-9"
          >
            {avatar}
          </span>
        ) : (
          <span
            data-slot="activity-feed-marker"
            aria-hidden="true"
            className={cn(activityFeedMarkerVariants({ tone }))}
          >
            {icon}
          </span>
        )}
        <span
          data-slot="activity-feed-connector"
          aria-hidden="true"
          className="my-2 w-px flex-1 border-l border-border group-last/feed-item:hidden"
        />
      </div>

      <div className="min-w-0 flex-1 pb-7 group-last/feed-item:pb-0">
        <div className="flex items-start gap-3">
          <div
            data-slot="activity-feed-title"
            className="min-w-0 flex-1 text-body leading-6 font-medium tracking-snug"
          >
            {title}
          </div>
          {timestamp && (
            <span
              data-slot="activity-feed-timestamp"
              className="shrink-0 text-caption leading-6 whitespace-nowrap text-muted-foreground tabular-nums"
            >
              {timestamp}
            </span>
          )}
        </div>
        {description && (
          <div
            data-slot="activity-feed-description"
            className="mt-1 text-body leading-normal text-muted-foreground"
          >
            {description}
          </div>
        )}
      </div>
    </li>
  )
}

export { ActivityFeed, ActivityFeedItem, activityFeedMarkerVariants }
