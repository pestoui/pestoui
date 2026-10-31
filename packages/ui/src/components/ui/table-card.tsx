"use client"

import * as React from "react"
import { X } from "lucide-react"

import { cn } from "../../lib/utils"
import { Badge } from "./badge"
import { Button } from "./button"
import { Card, CardDescription, CardTitle } from "./card"
import { NumberTicker } from "./number-animation"
import { tableDensity } from "./table"

/* ---------------------------------------------------------------------------
   The shell around a table: header block, flush body, footer, bulk-action bar.

   Separate from `table.tsx` on purpose. This file reaches for card, badge,
   button and the ticker; the primitive file reaches for almost nothing. Anyone
   who wants a bare styled table copies `table.tsx` and takes none of this, and
   a future state-owning data table can sit alongside both without touching
   either.

   Same boundary as the primitives: nothing here holds state. `open`, `count`
   and the page numbers in the footer all come from the caller.
--------------------------------------------------------------------------- */

interface TableCardProps
  extends Omit<React.ComponentProps<typeof Card>, "size"> {
  /** One owner for density. Sets the card's own spacing *and* the table's cell
   *  padding, so the header, the rows and the footer can never end up on
   *  different scales. A `<Table size>` inside still wins if you need it to. */
  size?: "default" | "sm"
}

/* `gap-0 py-0` because the header and footer own their vertical padding here —
   the table has to sit flush against the card's rounded edge, and the card's
   default column gap would open a seam between the header hairline and the
   first row. */
function TableCard({ className, size = "default", ...props }: TableCardProps) {
  return (
    <Card
      data-slot="table-card"
      size={size}
      className={cn("gap-0 py-0", tableDensity[size], className)}
      {...props}
    />
  )
}

/* A grid rather than a flex row so the title, the description and the action
   cluster place themselves — no wrapper div around the left-hand column, and a
   header with no description collapses to one row on its own. */
function TableCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="table-card-header"
      className={cn(
        "grid auto-rows-min grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 border-b p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

/* Composes `CardTitle` rather than restating it — the count pill needs the
   title to be a flex row, and that is the only difference. */
function TableCardTitle({
  className,
  ...props
}: React.ComponentProps<typeof CardTitle>) {
  return (
    <CardTitle
      className={cn("col-start-1 flex items-center gap-2", className)}
      {...props}
    />
  )
}

function TableCardDescription({
  className,
  ...props
}: React.ComponentProps<typeof CardDescription>) {
  return <CardDescription className={cn("col-start-1", className)} {...props} />
}

/* The pill beside the title. Secondary, not the count variant — that one is
   filled with `--info`, and blue in this system means informational, never
   "here is a quantity". */
function TableCardCount({
  className,
  variant = "secondary",
  ...props
}: React.ComponentProps<typeof Badge>) {
  return (
    <Badge
      data-slot="table-card-count"
      variant={variant}
      className={cn("tabular-nums", className)}
      {...props}
    />
  )
}

function TableCardActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="table-card-actions"
      className={cn(
        "col-start-2 row-span-2 row-start-1 flex items-center gap-2 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

/* Zero padding — the table draws its own edge inset from the density vars — and
   `relative`, which is what the bulk bar anchors to. */
function TableCardBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="table-card-body"
      className={cn("relative", className)}
      {...props}
    />
  )
}

/* A distinct slot name from `card-footer` on purpose: `Card` zeroes its own
   bottom padding when it sees a `card-footer` descendant, and inheriting that
   rule here would fight the `py-0` this shell already sets.
 *
 * Drop the result count on the left and `<Pagination>` on the right. Pagination
 * defaults to `mx-auto w-full justify-center`, so it needs
 * `className="mx-0 w-auto justify-end"` here or it centres itself in the gap. */
function TableCardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="table-card-footer"
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 border-t bg-muted/50 p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

/* ---------------------------------------------------------------------------
   Bulk-action bar
--------------------------------------------------------------------------- */

interface TableBulkBarProps extends React.ComponentProps<"div"> {
  /** Caller-computed selection size. */
  count: number
  open: boolean
  onClear?: () => void
  /** Singular and plural noun for the count, e.g. `["row", "rows"]`. */
  label?: [string, string]
}

/* Anchored to `TableCardBody`, not portalled. A portal would land it at the end
   of the document and therefore at the end of the tab order, which means a
   keyboard user who just checked three boxes has to tab past the whole page to
   reach the actions — and it would need a focus trap to be usable at all.
   Anchoring costs one `position: relative` and puts the bar exactly where the
   tab order expects it: immediately after the rows it acts on.
 *
 * `--inverse` rather than another card surface: the bar has to read as
 * something laid over the table, not as one more row in it.
 *
 * Enter and exit are chosen classes rather than a self-read `data-state`, so
 * nothing here styles itself from its own attributes. The attribute is still
 * emitted for descendants and for tests. */
function TableBulkBar({
  className,
  count,
  open,
  onClear,
  label = ["row", "rows"],
  children,
  ...props
}: TableBulkBarProps) {
  /* Held mounted through the exit so the closing animation has something to
     run on; the animation itself reports when it is safe to drop. */
  const [mounted, setMounted] = React.useState(open)

  React.useEffect(() => {
    if (open) setMounted(true)
  }, [open])

  if (!mounted) return null

  return (
    /* The positioning wrapper exists because `animate-in slide-in-from-*`
       writes the whole transform. A centring `-translate-x-1/2` on the animated
       element would be overwritten for the length of the entrance and the bar
       would slide in diagonally. Centring with flex keeps the two concerns on
       separate elements. */
    <div
      aria-hidden={!open}
      className="pointer-events-none absolute inset-x-0 bottom-[var(--card-spacing,calc(var(--spacing)*4))] z-[var(--z-sticky,1)] flex justify-center px-[var(--card-spacing,calc(var(--spacing)*4))]"
    >
      <div
        data-slot="table-bulk-bar"
        data-state={open ? "open" : "closed"}
        role="status"
        aria-live="polite"
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && !open) setMounted(false)
        }}
        className={cn(
          "pointer-events-auto flex items-center gap-1 rounded-full bg-inverse py-1.5 pr-1.5 pl-4 text-inverse-foreground shadow-float",
          /* Overlay in, so the panel spring. Out on a short tween travelling
             half the distance — exits are shorter than enters — and no blur,
             which is an enter-only effect. `anim-*` rather than `duration-*`
             keeps the long entrance from retiming the button colour
             transitions inside the pill. */
          open
            ? "animate-in fade-in slide-in-from-bottom-4 blur-in-[3px] anim-spring-panel ease-spring-panel"
            : "animate-out fade-out slide-out-to-bottom-2 anim-exit ease-out-expo",
          className
        )}
        {...props}
      >
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <NumberTicker value={count} className="tabular-nums" />
          <span className="text-inverse-muted">
            {count === 1 ? label[0] : label[1]} selected
          </span>
        </span>
        {children ? (
          <>
            <span
              aria-hidden="true"
              className="mx-1 h-5 w-px shrink-0 bg-inverse-foreground/15"
            />
            {children}
          </>
        ) : null}
        {onClear ? (
          <TableBulkBarAction
            size="icon-sm"
            onClick={onClear}
            aria-label="Clear selection"
          >
            <X />
          </TableBulkBarAction>
        ) : null}
      </div>
    </div>
  )
}

/* A `Button` retinted for the inverse pill. `variant="ghost"` alone would keep
   its light-surface hover fill and go invisible against the dark bar, so the
   hover state is restated against `--inverse-foreground` instead. */
function TableBulkBarAction({
  className,
  variant = "ghost",
  size = "sm",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        "text-inverse-foreground hover:bg-inverse-foreground/10 hover:text-inverse-foreground dark:hover:bg-inverse-foreground/10",
        className
      )}
      {...props}
    />
  )
}

export {
  TableCard,
  TableCardHeader,
  TableCardTitle,
  TableCardDescription,
  TableCardCount,
  TableCardActions,
  TableCardBody,
  TableCardFooter,
  TableBulkBar,
  TableBulkBarAction,
}

export type { TableCardProps, TableBulkBarProps }
