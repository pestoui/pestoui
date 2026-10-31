import * as React from "react"
import { ArrowRight } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { Card, CardFooter } from "./ui/card"
import { cn } from "../lib/utils"

/* A card whose header leads with an icon chip and whose footer is a single
   action link.
 *
 * This exists because of one gap, not because Card is insufficient. CardHeader
 * is a two-track grid — `[1fr_auto]` when a card-action is present — so there
 * is nowhere for a leading mark to sit without it landing inside the title
 * column and pushing the description out of alignment. PanelCardHeader is the
 * same idea at three tracks.
 *
 * Everything else is composition. The footer is CardFooter with a link inside
 * it; Card's own `has-data-[slot=card-footer]:pb-0` already collapses the
 * bottom padding, so nothing here re-implements card chrome. */

const panelCardIconVariants = cva(
  "flex shrink-0 items-center justify-center rounded-lg [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        /* Default is deliberately inert. The chip is a wayfinding mark, not a
           status, so a tinted one has to be asked for. */
        muted: "bg-secondary text-muted-foreground",
        selected: "bg-selected/10 text-selected",
        success: "bg-success/10 text-success",
        warning: "bg-warning/15 text-warning-ink",
        destructive: "bg-destructive/10 text-destructive",
        info: "bg-info/10 text-info",
        "chart-1": "bg-chart-1/12 text-chart-1",
        "chart-2": "bg-chart-2/12 text-chart-2",
        "chart-3": "bg-chart-3/12 text-chart-3",
        "chart-4": "bg-chart-4/12 text-chart-4",
        "chart-5": "bg-chart-5/12 text-chart-5",
      },
      size: {
        sm: "size-7 [&_svg]:size-3.5",
        default: "size-9 [&_svg]:size-4",
      },
    },
    defaultVariants: { tone: "muted", size: "default" },
  },
)

type PanelCardIconTone = NonNullable<
  VariantProps<typeof panelCardIconVariants>["tone"]
>

function PanelCard({ className, ...props }: React.ComponentProps<typeof Card>) {
  return <Card data-slot="panel-card" className={className} {...props} />
}

/**
 * Three tracks: mark, text, action. The action track collapses when no
 * `PanelCardAction` is present, so a card without an overflow menu does not
 * carry a dead column.
 */
function PanelCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-card-header"
      className={cn(
        "grid grid-cols-[auto_1fr] items-start gap-3 px-(--card-spacing)",
        "has-data-[slot=panel-card-action]:grid-cols-[auto_1fr_auto]",
        className,
      )}
      {...props}
    />
  )
}

function PanelCardIcon({
  className,
  tone,
  size,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof panelCardIconVariants>) {
  return (
    <span
      data-slot="panel-card-icon"
      data-tone={tone}
      /* aria-hidden: the title beside it already names the card, so announcing
         the mark would just repeat it. */
      aria-hidden="true"
      className={cn(panelCardIconVariants({ tone, size }), className)}
      {...props}
    />
  )
}

/* The text track. Kept as its own part so the title and description stack
   inside one grid cell rather than becoming two rows of the outer grid. */
function PanelCardHeading({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-card-heading"
      className={cn("flex min-w-0 flex-col gap-0.5", className)}
      {...props}
    />
  )
}

function PanelCardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function PanelCardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function PanelCardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-card-action"
      className={cn("flex shrink-0 items-center gap-1", className)}
      {...props}
    />
  )
}

function PanelCardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

/**
 * The footer as one action link spanning the card.
 *
 * Rendered as a real `<button>`/`<a>` rather than a div with a click handler so
 * it is reachable by keyboard and announced as an action. `justify-between`
 * pushes the arrow to the far edge, which is what makes the row read as
 * "continue" rather than as a caption.
 */
function PanelCardFooterLink({
  className,
  children,
  href,
  ...props
}: React.ComponentProps<"a">) {
  return (
    <CardFooter className="p-0">
      <a
        data-slot="panel-card-footer-link"
        href={href}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-b-xl",
          "p-(--card-spacing) text-sm transition-colors duration-fast",
          "hover:bg-accent focus-visible:ring-ring/50 focus-visible:ring-3",
          "outline-none",
          className,
        )}
        {...props}
      >
        <span className="text-muted-foreground">{children}</span>
        <ArrowRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      </a>
    </CardFooter>
  )
}

export {
  PanelCard,
  PanelCardAction,
  PanelCardContent,
  PanelCardDescription,
  PanelCardFooterLink,
  PanelCardHeader,
  PanelCardHeading,
  PanelCardIcon,
  PanelCardTitle,
  panelCardIconVariants,
}
export type { PanelCardIconTone }
