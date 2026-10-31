import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "../lib/utils"

/* Notification / alert card — a colored icon tile, a title and a one-line body
   in a soft raised card. The tone tints the icon tile only; the copy beside it
   stays neutral so a stack of mixed tones still reads as one calm column.

   This is the list-item notification pattern (a feed of events), distinct from
   the inline `Alert` banner. Compose a column of them with `NotificationList`. */
const notificationIconVariants = cva(
  "flex size-10 shrink-0 items-center justify-center rounded-full [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      tone: {
        default:
          "bg-secondary text-muted-foreground ring-1 ring-foreground/[0.04]",
        brand: "bg-primary/25 text-primary-foreground",
        info: "bg-info/10 text-info",
        success: "bg-success/10 text-success",
        warning: "bg-warning/15 text-warning-ink",
        critical: "bg-destructive/10 text-destructive dark:bg-destructive/20",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  }
)

type NotificationCardProps = Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof notificationIconVariants> & {
    icon?: React.ReactNode
    title: React.ReactNode
    description?: React.ReactNode
    /** Right-aligned slot — a timestamp, a button, or a menu trigger. */
    action?: React.ReactNode
    /** Renders a dismiss (×) button; fires this handler on click. */
    onDismiss?: () => void
    /** Shows a leading unread dot and lifts the title weight. */
    unread?: boolean
  }

function NotificationCard({
  className,
  tone = "default",
  icon,
  title,
  description,
  action,
  onDismiss,
  unread = false,
  ...props
}: NotificationCardProps) {
  return (
    <div
      data-slot="notification-card"
      data-tone={tone}
      className={cn(
        /* The card already answered hover with a deeper shadow; pairing that
           with a single pixel of lift is what makes it read as elevation rather
           than as the shadow simply getting darker. One pixel is the whole
           budget — a feed of these scrolls past, and anything taller turns the
           column into a wave. */
        "group/notification relative flex items-center gap-3.5 rounded-2xl border border-border/60 bg-card px-4 py-3.5 shadow-soft transition-[box-shadow,translate] duration-base ease-out-expo hover:-translate-y-px hover:shadow-card",
        className
      )}
      {...props}
    >
      {icon != null && (
        <span
          data-slot="notification-icon"
          aria-hidden="true"
          className={cn(notificationIconVariants({ tone }))}
        >
          {icon}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {unread && (
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-info"
            />
          )}
          <p
            data-slot="notification-title"
            className="truncate text-body font-semibold tracking-snug text-foreground"
          >
            {title}
          </p>
        </div>
        {description != null && (
          <p
            data-slot="notification-description"
            className="mt-0.5 truncate text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}
      </div>

      {action != null && (
        <div data-slot="notification-action" className="shrink-0">
          {action}
        </div>
      )}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          /* The X materialises with the row rather than just switching on:
             undersized and softened at rest, arriving on the swap spring and
             leaving on the short tween. Both resting values are invisible at
             zero opacity, so nothing about the card at rest moves. */
          className="flex size-7 shrink-0 scale-90 items-center justify-center rounded-full text-muted-foreground opacity-0 blur-xs transition-[opacity,color,background-color,scale,filter] duration-exit ease-out-expo outline-none hover:bg-muted hover:text-foreground focus-visible:scale-100 focus-visible:opacity-100 focus-visible:blur-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:duration-spring-swap focus-visible:ease-spring-swap group-hover/notification:scale-100 group-hover/notification:opacity-100 group-hover/notification:blur-none group-hover/notification:duration-spring-swap group-hover/notification:ease-spring-swap [&_svg]:size-4"
        >
          <X />
        </button>
      )}
    </div>
  )
}

/* Vertical stack of notification cards — owns only the rhythm between them. */
function NotificationList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="notification-list"
      className={cn("flex w-full flex-col gap-2.5", className)}
      {...props}
    />
  )
}

export { NotificationCard, NotificationList, notificationIconVariants }
export type { NotificationCardProps }
