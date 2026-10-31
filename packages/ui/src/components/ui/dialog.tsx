import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { XIcon } from "lucide-react"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-open:duration-(--duration-slow) data-open:ease-out-expo data-closed:animate-out data-closed:fade-out-0 data-closed:duration-(--duration-exit) data-closed:ease-out-expo",
        className
      )}
      {...props}
    />
  )
}

/* Two axes on the panel: how wide it is, and whether the middle scrolls.

   `scrollable: false` is the historical single-box layout — one padded grid,
   children separated by the gap. `scrollable: true` hands padding down to the
   slots and turns the panel into a capped flex column so DialogBody can shrink
   below its content and scroll while the header and footer stay put.

   A flex column rather than a fixed row template on purpose: a row template
   has to name every row up front, so adding a DialogIllustration would
   silently promote the header into the flexible row. A column capped by
   max-height is agnostic to how many slots are present and in what order. */
const dialogContentVariants = cva(
  "group/dialog-content fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-popover text-sm text-popover-foreground shadow-float ring-1 ring-foreground/[0.06] outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-97 data-open:slide-in-from-bottom-4 data-open:duration-(--duration-spring-panel) data-open:ease-spring-panel data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-98 data-closed:slide-out-to-bottom-2 data-closed:duration-(--duration-exit) data-closed:ease-out-expo",
  {
    variants: {
      size: {
        sm: "sm:max-w-sm",
        default: "sm:max-w-md",
        lg: "sm:max-w-lg",
        xl: "sm:max-w-2xl",
      },
      scrollable: {
        /* The cap is the floor of the contract, not a layout choice: a panel
           is centred with -translate-y-1/2, so anything taller than the
           viewport loses its top and bottom off-screen with no way to reach
           them. Scrolling the whole panel is the crude version — the close
           button travels with it — which is why anything with real content
           should take scrollable and let DialogBody scroll under a pinned
           header and footer. This just makes the failure impossible. */
        false: "max-h-[calc(100dvh-4rem)] gap-5 overflow-y-auto p-7",
        /* Children own their padding here — see Header / Body / Footer. */
        true: "flex max-h-[min(40rem,calc(100dvh-4rem))] flex-col gap-0 p-0",
      },
    },
    defaultVariants: {
      size: "default",
      scrollable: false,
    },
  }
)

export interface DialogContentProps
  extends React.ComponentProps<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  showCloseButton?: boolean
}

function DialogContent({
  className,
  children,
  size,
  scrollable,
  showCloseButton = true,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        /* Emitted for descendants (header / body / footer / illustration) to
           select on. The panel's own classes come from the cva above. */
        data-size={size ?? "default"}
        data-scrollable={scrollable ? "true" : "false"}
        className={cn(dialogContentVariants({ size, scrollable }), className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              /* Over a full-bleed illustration the ghost button has no surface
                 to sit on, so it earns a translucent chip. */
              className="absolute top-4 right-4 text-muted-foreground group-has-data-[slot=dialog-illustration]/dialog-content:bg-background/70 group-has-data-[slot=dialog-illustration]/dialog-content:supports-backdrop-filter:backdrop-blur-xs"
              size="icon-sm"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

/* Squircle tile for the header glyph. Tone is the only thing tone touches —
   the copy and the panel stay neutral, matching how Alert and Banner tint.

   Tint only, never a solid fill: there is no destructive-foreground token, so
   a filled treatment would need either a new token or a bare colour literal.

   The radius comes off the shared radius scale rather than a per-size value.
   That keeps the tile inside the squircle band at every size and lands within
   a fraction of a pixel of the tile alert-dialog already ships at the default
   size, so the two never visually disagree. */
const dialogMediaVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md ring-1 group-data-open/dialog-content:animate-in group-data-open/dialog-content:fade-in-0 group-data-open/dialog-content:zoom-in-90 group-data-open/dialog-content:fill-mode-backwards group-data-open/dialog-content:delay-(--stagger-loose) group-data-open/dialog-content:anim-spring-bouncy group-data-open/dialog-content:ease-spring-bouncy",
  {
    variants: {
      tone: {
        neutral: "bg-secondary text-foreground shadow-soft ring-foreground/[0.04]",
        /* --selected, never --primary: the CTA lime sits far too light to
             carry a glyph or a hairline ring. --selected lands in the same
             lightness band as info / success / destructive below, so every
             tone in the set tints, rings and draws its glyph at one
             strength. */
        brand: "bg-selected/10 text-selected ring-selected/20",
        info: "bg-info/10 text-info ring-info/20",
        success: "bg-success/10 text-success ring-success/20",
        /* Warning runs one notch heavier than its siblings — the swatch is the
           lightest of the set, so the tint and ring carry the shape. */
        warning: "bg-warning/15 text-warning ring-warning/30",
        destructive: "bg-destructive/10 text-destructive ring-destructive/20",
      },
      size: {
        sm: "size-10 *:[svg:not([class*='size-'])]:size-5",
        md: "size-11 *:[svg:not([class*='size-'])]:size-6",
        lg: "size-12 *:[svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "md",
    },
  }
)

export interface DialogMediaProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof dialogMediaVariants> {}

function DialogMedia({ className, tone, size, ...props }: DialogMediaProps) {
  return (
    <div
      data-slot="dialog-media"
      data-tone={tone ?? "neutral"}
      aria-hidden="true"
      className={cn(dialogMediaVariants({ tone, size }), className)}
      {...props}
    />
  )
}

/* Alignment is an explicit choice, not a by-product of size and breakpoint.
   `lead` puts the tile in a leading column, which needs DialogHeaderText to
   group the title and description into one flex child beside it. */
const dialogHeaderVariants = cva(
  "flex gap-2 group-data-open/dialog-content:animate-in group-data-open/dialog-content:fade-in-0 group-data-open/dialog-content:slide-in-from-bottom-2 group-data-open/dialog-content:fill-mode-backwards group-data-open/dialog-content:delay-(--stagger-loose) group-data-open/dialog-content:duration-(--duration-base) group-data-open/dialog-content:ease-out-expo group-data-[scrollable=true]/dialog-content:shrink-0 group-data-[scrollable=true]/dialog-content:border-b group-data-[scrollable=true]/dialog-content:border-border group-data-[scrollable=true]/dialog-content:px-7 group-data-[scrollable=true]/dialog-content:py-5",
  {
    variants: {
      align: {
        start: "flex-col",
        center: "flex-col items-center text-center",
        lead: "flex-row items-start gap-4 *:data-[slot=dialog-media]:mt-0.5",
      },
    },
    defaultVariants: {
      align: "start",
    },
  }
)

export interface DialogHeaderProps
  extends Omit<React.ComponentProps<"div">, "align">,
    VariantProps<typeof dialogHeaderVariants> {}

function DialogHeader({ className, align, ...props }: DialogHeaderProps) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(dialogHeaderVariants({ align }), className)}
      {...props}
    />
  )
}

export interface DialogHeaderTextProps extends React.ComponentProps<"div"> {}

/* Groups Title + Description into one flex child so align="lead" sets them
   beside the tile rather than making them siblings of it. */
function DialogHeaderText({ className, ...props }: DialogHeaderTextProps) {
  return (
    <div
      data-slot="dialog-header-text"
      className={cn("flex min-w-0 flex-col gap-2", className)}
      {...props}
    />
  )
}

export interface DialogBodyProps extends React.ComponentProps<"div"> {}

/* The scroll region. Inert in the default layout — it only takes over padding
   and overflow once the panel is scrollable. min-h-0 is what lets it shrink
   below its own content inside the capped column. */
function DialogBody({ className, ...props }: DialogBodyProps) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "min-h-0 group-data-[scrollable=true]/dialog-content:overflow-y-auto group-data-[scrollable=true]/dialog-content:overscroll-contain group-data-[scrollable=true]/dialog-content:px-7 group-data-[scrollable=true]/dialog-content:py-5",
        className
      )}
      {...props}
    />
  )
}

/* `end` is the historical single trailing cluster. `split` pushes a secondary
   action to the far edge. `stacked` is the full-width equal pair for when the
   two choices carry the same weight. */
const dialogFooterVariants = cva(
  "flex gap-3 group-data-[scrollable=true]/dialog-content:shrink-0 group-data-[scrollable=true]/dialog-content:border-t group-data-[scrollable=true]/dialog-content:border-border group-data-[scrollable=true]/dialog-content:px-7 group-data-[scrollable=true]/dialog-content:py-5",
  {
    variants: {
      layout: {
        end: "flex-col-reverse sm:flex-row sm:justify-end",
        split: "flex-col-reverse sm:flex-row sm:justify-between",
        stacked: "grid grid-cols-1 sm:grid-cols-2 *:w-full",
      },
    },
    defaultVariants: {
      layout: "end",
    },
  }
)

export interface DialogFooterProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof dialogFooterVariants> {
  showCloseButton?: boolean
}

function DialogFooter({
  className,
  layout,
  showCloseButton = false,
  children,
  ...props
}: DialogFooterProps) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(dialogFooterVariants({ layout }), className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

export interface DialogIllustrationProps extends React.ComponentProps<"div"> {}

/* Full-bleed media header. In the default layout it cancels the panel padding
   with negative margins; in the scrollable layout there is no padding to
   cancel, so it only clips. The top corners have to track the panel radius or
   an unclipped corner shows through immediately — and overflow lives here, on
   the wrapper, not on the image. */
function DialogIllustration({ className, ...props }: DialogIllustrationProps) {
  return (
    <div
      data-slot="dialog-illustration"
      className={cn(
        "overflow-hidden rounded-t-xl group-data-open/dialog-content:animate-in group-data-open/dialog-content:fade-in-0 group-data-open/dialog-content:blur-in-6 group-data-open/dialog-content:anim-spring-panel group-data-open/dialog-content:ease-spring-panel group-data-[scrollable=false]/dialog-content:-mx-7 group-data-[scrollable=false]/dialog-content:-mt-7 group-data-[scrollable=true]/dialog-content:shrink-0",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-[1.375rem] leading-tight font-semibold tracking-title",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-body leading-normal text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  dialogContentVariants,
  DialogDescription,
  DialogFooter,
  dialogFooterVariants,
  DialogHeader,
  dialogHeaderVariants,
  DialogHeaderText,
  DialogIllustration,
  DialogMedia,
  dialogMediaVariants,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
