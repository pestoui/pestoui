import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

/* Card had no cva: one long class string plus a `size` prop rendered as
   data-size. It now has an `elevation` axis, because a design system whose
   cards can only be one weight cannot express two design languages — a ledger
   screen and a soft workspace screen were coming out identical apart from
   colour, with call sites faking flatness by passing shadow-none.

   `soft` reproduces the original declaration byte for byte and is the default.
   Everything a caller does not opt into is unchanged. */
const cardVariants = cva(
  "group/card flex flex-col gap-(--card-spacing) overflow-hidden text-sm text-card-foreground [--card-spacing:--spacing(6)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl py-(--card-spacing)",
  {
    variants: {
      elevation: {
        /* The original, unchanged. */
        soft: "rounded-xl border border-border bg-card shadow-hairline",
        /* Separation from the hairline alone. A register of figures reads
           better without every row of cards casting its own shadow. */
        flat: "rounded-md border border-border bg-card",
        /* For a card that genuinely floats above a busy canvas. */
        raised: "rounded-xl border border-border bg-card shadow-card",
        /* No outer border and no shadow — a leading rule instead, so a stack
           of these reads as one continuous ledger rather than as separate
           objects. Deliberately square: a radius with no border to follow it
           just clips content for no visible gain. */
        ruled: "border-t border-border bg-card",
      },
    },
    defaultVariants: { elevation: "soft" },
  },
)

function Card({
  className,
  size = "default",
  elevation,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      /* Emitted for descendants to select on, never read by Card itself. */
      data-elevation={elevation ?? "soft"}
      className={cn(cardVariants({ elevation }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-lg leading-snug font-semibold tracking-snug group-data-[size=sm]/card:text-base",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-body leading-normal text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
}
