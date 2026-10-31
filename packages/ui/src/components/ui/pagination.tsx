import * as React from "react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex items-center gap-0.5", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">

/* No motion of its own on the page numbers. Rendering through `Button` already
   brings the press spring and the hover/active colour tween, and the
   current-page treatment below is plain colour and border, so it cross-fades on
   that same transition when the page changes. Adding a second press here would
   double the scale, and a page number that pops when it becomes current is a lot
   of ceremony for something a reader passes over ten times a row. Nor does the
   current-page fill slide between numbers: each page is its own link and the
   page usually re-renders on navigation, so there is no one indicator to move.

   The one addition is on Previous and Next, below: their chevron leans the way
   it points while the button is held. */
function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      asChild
      variant={isActive ? "outline" : "ghost"}
      size={size}
      className={cn(
        isActive && "border-selected/30 bg-selected/8 text-selected shadow-none hover:bg-selected/12 hover:text-selected",
        className
      )}
    >
      <a
        aria-current={isActive ? "page" : undefined}
        data-slot="pagination-link"
        data-active={isActive}
        {...props}
      />
    </Button>
  )
}

/* While held, the chevron leans half a --press-lean the way it points — the
   Switch knob's "about to go there", spent on the only part of a pagination
   control that has a direction. Half, because the glyph is 16px and sits beside
   a label; the full 4px would read as the icon coming loose. It is `translate`
   on the svg, which leaves Button's own press (scale and translate-y on the
   anchor) alone, and the svg is already pointer-events-none, so the click and
   the navigation are untouched. Under reduced motion --press-lean is 0px and
   the lean is gone. */
const chevronLean =
  "transition-[translate] duration-fast ease-out-expo group-active/button:duration-spring-press group-active/button:ease-spring-press"

function PaginationPrevious({
  className,
  text = "Previous",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("pl-1.5!", className)}
      {...props}
    >
      <ChevronLeftIcon
        data-icon="inline-start"
        className={cn(
          chevronLean,
          "group-active/button:translate-x-[calc(var(--press-lean)/-2)]"
        )}
      />
      <span className="hidden sm:block">{text}</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  text = "Next",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("pr-1.5!", className)}
      {...props}
    >
      <span className="hidden sm:block">{text}</span>
      <ChevronRightIcon
        data-icon="inline-end"
        className={cn(
          chevronLean,
          "group-active/button:translate-x-[calc(var(--press-lean)/2)]"
        )}
      />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <MoreHorizontalIcon
      />
      <span className="sr-only">More pages</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
