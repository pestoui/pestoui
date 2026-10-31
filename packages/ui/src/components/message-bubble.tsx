import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Check, Loader2 } from "lucide-react"

import { cn } from "../lib/utils"

const STATUS_LABEL = {
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
} as const

type MessageStatus = keyof typeof STATUS_LABEL

/* The corner nearest the speaker is tightened to 6px so the bubble reads as a
   tail. The other three use an explicit 18px rather than the 2xl token: at
   1.8rem the token overruns half the height of a single-line bubble, and CSS
   then scales *every* corner down proportionally — the tail included — leaving
   a lozenge instead of a squircle. */
const messageBubbleVariants = cva(
  "w-fit max-w-full rounded-[18px] px-3.5 py-2.5 text-body leading-normal shadow-soft [overflow-wrap:anywhere]",
  {
    variants: {
      side: {
        incoming: "rounded-bl-[6px] bg-secondary text-foreground",
        outgoing: "rounded-br-[6px] bg-primary text-primary-foreground",
      },
    },
    defaultVariants: {
      side: "incoming",
    },
  }
)

/* A message arrives, it does not appear. Six pixels of rise, a four pixel blur
   resolving to nothing, and a fade — all on the panel spring, which is firm
   enough that a run of them landing together never reads as bouncing.

   The blur is what separates this from a slide: it makes the bubble materialise
   into the thread rather than travel through it, and four pixels is the small
   surface end of the range. Enter only, and that is not an omission — a bubble
   is never removed, so there is no exit to be asymmetric with. */
const messageBubbleEnter =
  "animate-in fade-in-0 slide-in-from-bottom-[6px] blur-in-[4px] anim-spring-panel ease-spring-panel"

/* Ticks press in rather than blinking on — the same glyph pop the menus use for
   their check marks, since a delivery mark is the same kind of small
   confirmation appearing in place. */
const messageTickPop = "animate-in fade-in-0 zoom-in-50 anim-spring ease-spring-press"

/* Delivery ticks. Blue is the accent for the settled state — a read receipt —
   and nothing else in the thread competes for it. The colour is transitioned
   rather than swapped: read is the end of the message's life, so it should
   arrive as a settle. */
function MessageStatusMark({ status }: { status: MessageStatus }) {
  return (
    <span
      data-slot="message-status"
      data-status={status}
      className={cn(
        "inline-flex shrink-0 items-center transition-colors duration-base ease-out-expo",
        status === "read" && "text-info"
      )}
    >
      {status === "sending" ? (
        <Loader2
          aria-hidden="true"
          className="size-3.5 animate-spin [animation-duration:1.4s]"
        />
      ) : (
        <>
          <Check aria-hidden="true" className={cn("size-3.5", messageTickPop)} />
          {(status === "delivered" || status === "read") && (
            <Check
              aria-hidden="true"
              className={cn("-ml-2 size-3.5", messageTickPop)}
            />
          )}
        </>
      )}
      <span className="sr-only">{STATUS_LABEL[status]}</span>
    </span>
  )
}

function MessageBubble({
  side = "incoming",
  children,
  timestamp,
  author,
  avatar,
  status,
  className,
  ...props
}: React.ComponentProps<"article"> &
  VariantProps<typeof messageBubbleVariants> & {
    timestamp?: string
    author?: React.ReactNode
    avatar?: React.ReactNode
    status?: MessageStatus
  }) {
  return (
    <article
      data-slot="message-bubble"
      data-side={side}
      className={cn(
        "group/message flex w-full flex-col items-start data-[side=outgoing]:items-end",
        messageBubbleEnter,
        className
      )}
      {...props}
    >
      {author && (
        <span
          data-slot="message-author"
          className="mb-1 px-1 text-caption font-medium text-muted-foreground"
        >
          {author}
        </span>
      )}

      {/* Avatar rides the bottom edge of the bubble, on the speaker's side. */}
      <div className="flex max-w-[min(32rem,85%)] items-end gap-2 group-data-[side=outgoing]/message:flex-row-reverse">
        {avatar && (
          <span
            data-slot="message-avatar"
            className="flex size-8 shrink-0 items-center justify-center *:data-[slot=avatar]:size-8"
          >
            {avatar}
          </span>
        )}
        <div
          data-slot="message-bubble-body"
          className={cn(messageBubbleVariants({ side }))}
        >
          {children}
        </div>
      </div>

      {(timestamp || status) && (
        <span
          data-slot="message-meta"
          className="mt-1 flex items-center gap-1.5 px-1 text-caption text-muted-foreground"
        >
          {timestamp && <span className="tabular-nums">{timestamp}</span>}
          {status && <MessageStatusMark status={status} />}
        </span>
      )}
    </article>
  )
}

/* A run of consecutive messages from one speaker: tighter spacing, and only the
   final bubble carries the avatar, the tail corner and the speaker's name up
   top. Earlier avatars go invisible rather than hidden so they keep their column
   and the stack stays flush. */
function MessageGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-group"
      className={cn(
        "flex w-full flex-col gap-1",
        "[&>[data-slot=message-bubble]:not(:last-child)_[data-slot=message-avatar]]:invisible",
        "[&>[data-slot=message-bubble]:not(:first-child)_[data-slot=message-author]]:hidden",
        "[&>[data-side=incoming]:not(:last-child)_[data-slot=message-bubble-body]]:rounded-bl-[18px]",
        "[&>[data-side=outgoing]:not(:last-child)_[data-slot=message-bubble-body]]:rounded-br-[18px]",
        className
      )}
      {...props}
    />
  )
}

export { MessageBubble, MessageGroup, messageBubbleVariants }
export type { MessageStatus }
