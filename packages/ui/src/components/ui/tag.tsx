"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { XIcon } from "lucide-react"

import { cn } from "../../lib/utils"

/* Dismissible label — carries a value the user already committed to (a recipient,
   a keyword, an applied filter's result). Distinct from Chip, which is the filter
   control itself. Tags are pills; the trailing X is an icon button, so it squircles. */
const tagVariants = cva(
  "group/tag inline-flex w-fit shrink-0 items-center rounded-full border border-transparent font-medium whitespace-nowrap transition-all [&>svg]:pointer-events-none [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        info: "bg-info/10 text-info",
        success: "bg-success/10 text-success",
        /* warning-foreground is near-black — readable on the light wash only,
           so dark mode falls back to the hue itself */
        warning: "bg-warning/15 text-warning-ink",
        destructive:
          "bg-destructive/10 text-destructive dark:bg-destructive/20",
        outline: "border-border bg-card text-foreground",
      },
      size: {
        default:
          "h-7 gap-1.5 px-3 text-caption has-data-[slot=tag-dismiss]:pr-1 has-data-[slot=tag-leading]:pl-1.5 [&>svg]:size-3.5",
        sm: "h-6 gap-1 px-2.5 text-caption-sm has-data-[slot=tag-dismiss]:pr-0.5 has-data-[slot=tag-leading]:pl-1 [&>svg]:size-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/* Arrival pop — 0.90 → 1 with the opacity, on the bouncy spring. Same shape as
   Badge, and for the same reason: a tag that arrives is a value the user just
   committed to (a recipient typed, a filter applied), which is exactly the
   small, low-frequency moment overshoot is reserved for.

   Opt-in, because the animation fires on mount. Ten tags rehydrated from stored
   state have not *arrived*, and a whole row of them popping on first paint is
   the failure mode — reach for it on the tag being added, not on the list.

   `anim-*` rather than `duration-*`: the pill already carries `transition-all`
   for its colour, and the entrance runs long while that stays short. */
const tagAppear =
  "animate-in fade-in zoom-in-90 anim-spring-bouncy ease-spring-bouncy"

/* Departure, and deliberately not the entrance played backwards: a short tween
   over a shorter distance (1 → 0.95, against the enter's 0.90 → 1), so removal
   reads as decisive rather than as arrival rewound. `fill-mode-forwards` holds
   the last frame for the beat between the animation ending and the consumer
   dropping the tag, and `pointer-events-none` stops a leaving tag from taking
   a second click. */
const tagDismiss =
  "pointer-events-none animate-out fade-out zoom-out-95 anim-exit ease-out-expo fill-mode-forwards"

function Tag({
  className,
  variant = "default",
  size = "default",
  leading,
  onDismiss,
  dismissLabel = "Remove",
  appear = false,
  onAnimationEnd,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof tagVariants> & {
    /* leading dot, avatar or mark — sized for you when it is a bare svg/img */
    leading?: React.ReactNode
    onDismiss?: () => void
    /* a row of tags all announcing "Remove" is useless — name the value */
    dismissLabel?: string
    /* Play the arrival pop on mount. For a tag that shows up in response to
       something, not one that has been on screen since first paint. */
    appear?: boolean
  }) {
  /* A tag does not own its own removal — the consumer drops it from a list when
     onDismiss fires — so the exit has to run *before* the callback, not after.
     The flag plays the animation and animationend hands control back. Under
     reduced motion the duration tokens collapse to 1ms rather than 0 precisely
     so this event still fires and the tag still goes away. */
  const [dismissing, setDismissing] = React.useState(false)

  return (
    <span
      data-slot="tag"
      data-variant={variant}
      data-size={size}
      className={cn(
        tagVariants({ variant, size }),
        /* mutually exclusive on purpose — both set `animation`, and leaving the
           two `anim-*` durations to fight it out in stylesheet order is not a
           tie cn() can break */
        dismissing ? tagDismiss : appear && tagAppear,
        className
      )}
      onAnimationEnd={(event: React.AnimationEvent<HTMLSpanElement>) => {
        onAnimationEnd?.(event)
        /* a leading avatar or an animated child would bubble its own end event
           through here — only the tag's own exit completes the dismissal */
        if (dismissing && event.target === event.currentTarget) onDismiss?.()
      }}
      {...props}
    >
      {leading ? (
        <span
          data-slot="tag-leading"
          className="inline-flex shrink-0 items-center justify-center [&>img]:size-5 [&>img]:rounded-full [&>img]:object-cover [&>svg]:size-3.5 group-data-[size=sm]/tag:[&>img]:size-4.5 group-data-[size=sm]/tag:[&>svg]:size-3"
        >
          {leading}
        </span>
      ) : null}
      {children}
      {onDismiss ? (
        <button
          type="button"
          data-slot="tag-dismiss"
          aria-label={dismissLabel}
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
            /* the X owns its click — it must never also fire the tag's onClick */
            event.stopPropagation()
            setDismissing(true)
          }}
          /* squircle, not a circle: rounded-full on a 20px box collapses to a dot.
             The box stays 20px for the hit area; the glyph is chrome, so it sits
             a step under the label rather than competing with it.

             Motion: hover wash resolves fast enough to read as instant, and the
             press is a spring scale timed only for the length of `:active`, so
             the push settles on the spring and the release runs back on the
             shorter tween. The dip is proportionally deeper than a Button's
             because the target is a fifth of the size — equal percentages do
             not read as equal movement at this scale. */
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-[7px] opacity-70 transition-all duration-fast ease-out-expo outline-none hover:bg-current/15 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-90 active:duration-spring-press active:ease-spring-press group-data-[size=sm]/tag:size-4.5 group-data-[size=sm]/tag:rounded-[6px] [&>svg]:size-3 group-data-[size=sm]/tag:[&>svg]:size-2.5"
        >
          <XIcon aria-hidden="true" />
        </button>
      ) : null}
    </span>
  )
}

export { Tag, tagVariants }
