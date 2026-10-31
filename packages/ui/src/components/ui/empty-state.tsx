import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

/* "Nothing here yet" / "no results". Centred column: squircle tile, title,
   muted line, action row. The size axis is set once on the root and the parts
   read it off the group, so the block can never end up half-scaled.

   The entrance is one step for the whole block — no blur, no per-part stagger.
   An empty state is the answer to a query that returned nothing; it should
   settle into place, not perform. Staggering the tile, the title and the
   actions would turn an absence of content into a production. */
const emptyStateVariants = cva(
  "group/empty-state flex w-full flex-col items-center justify-center text-center animate-in fade-in-0 slide-in-from-bottom-2 anim-spring-panel ease-spring-panel",
  {
    variants: {
      size: {
        default: "gap-2 px-6 py-14",
        sm: "gap-1.5 px-4 py-8",
      },
      bordered: {
        true: "rounded-xl border border-dashed border-border",
        false: "",
      },
    },
    defaultVariants: {
      size: "default",
      bordered: false,
    },
  }
)

function EmptyState({
  className,
  size = "default",
  bordered = false,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyStateVariants>) {
  return (
    <div
      data-slot="empty-state"
      data-size={size}
      data-bordered={bordered ? "true" : "false"}
      className={cn(emptyStateVariants({ size, bordered }), className)}
      {...props}
    />
  )
}

/* Explicit pixel radii — a token radius on a 56px box collapses it into a
   circle. These are the squircle pairs the icon tiles use. */
function EmptyStateIcon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state-icon"
      aria-hidden="true"
      className={cn(
        "mb-2 flex size-14 shrink-0 items-center justify-center rounded-[16px] bg-card text-muted-foreground shadow-tile ring-1 ring-foreground/[0.04] group-data-[size=sm]/empty-state:mb-1 group-data-[size=sm]/empty-state:size-10 group-data-[size=sm]/empty-state:rounded-[12px] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-7 group-data-[size=sm]/empty-state:[&_svg:not([class*='size-'])]:size-5",
        className
      )}
      {...props}
    />
  )
}

function EmptyStateTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state-title"
      className={cn(
        "font-heading text-lg leading-snug font-semibold tracking-title group-data-[size=sm]/empty-state:text-body",
        className
      )}
      {...props}
    />
  )
}

function EmptyStateDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state-description"
      className={cn(
        "max-w-md text-body leading-normal text-balance text-muted-foreground group-data-[size=sm]/empty-state:max-w-sm group-data-[size=sm]/empty-state:text-caption",
        className
      )}
      {...props}
    />
  )
}

function EmptyStateActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state-actions"
      className={cn(
        "mt-3 flex flex-wrap items-center justify-center gap-2.5 group-data-[size=sm]/empty-state:mt-2 group-data-[size=sm]/empty-state:gap-2",
        className
      )}
      {...props}
    />
  )
}

export {
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateActions,
  emptyStateVariants,
}
