import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ArrowUp, ChevronsUpDown } from "lucide-react"

import { cn } from "../../lib/utils"
import { Skeleton } from "./skeleton"

/* ---------------------------------------------------------------------------
   Boundary — read this before filing a bug

   Nothing in this file holds state. `direction`, `onSort`, `checked`,
   `onCheckedChange`, page and page size are all owned by the caller. Clicking a
   sort header fires a callback and re-renders an arrow; it does not sort
   anything. Checking the select-all box fires a callback; it does not select
   any rows. These are presentational parts over a plain `<table>`, deliberately
   shaped so a headless table layer can be dropped on top later without any of
   this needing to be restyled.

   If you want the convenience, a `Set<string>` plus toggle/toggleAll/clear is
   about thirty lines of plain React and belongs in `src/hooks/`, not here.
--------------------------------------------------------------------------- */

/* Density lives in three custom properties rather than in per-part variants, so
   a cell can never disagree with the row it sits in. They are declared once —
   either on the table root (via the `size` variant below) or on an ancestor
   such as `TableCard` — and every part reads them by inheritance.

   Exported because `table-card.tsx` sets them on the card root: that makes the
   card the single owner of density for everything inside it, and a `<Table>`
   with no `size` of its own simply inherits. Pass `size` on the table only when
   you want to override a card that disagrees. */
const tableDensity = {
  default:
    "[--table-cell-px:--spacing(4)] [--table-cell-py:--spacing(3)] [--table-head-h:--spacing(11)]",
  sm: "[--table-cell-px:--spacing(3)] [--table-cell-py:--spacing(2)] [--table-head-h:--spacing(9)]",
} as const

/* Padding and row height only — no font-size. The density axis moves layout,
   not type: a table that shrinks its own text stops matching the page it sits
   on, and the two-tier size token split exists precisely so nobody hard-codes a
   second scale here. */
const tableVariants = cva("w-full caption-bottom text-body", {
  variants: {
    size: tableDensity,
    /* `zebra` re-declares hover, the expanded hold and selected at its own
       specificity on purpose. A `:nth-child(even)` fill outranks the plain
       `tr:hover` rule on the row, so without these three the striped rows would
       go dead under the pointer. Re-stating them inside the same compound puts
       every state one step above the stripe and leaves the hover/selected
       tie-break exactly where it already sits on an unstriped table. */
    separators: {
      row: "",
      zebra:
        "[&_tbody_tr]:border-0 [&_tbody_tr:nth-child(even)]:bg-secondary/40 [&_tbody_tr:nth-child(even)]:hover:bg-accent/60 [&_tbody_tr:nth-child(even)]:has-aria-expanded:bg-accent/60 [&_tbody_tr:nth-child(even)]:data-[state=selected]:bg-selected/8",
      grid: "[&_th:not(:last-child)]:border-r [&_td:not(:last-child)]:border-r",
      none: "[&_tbody_tr]:border-0",
    },
  },
  /* No default for `size` — an unset size leaves the custom properties to
     inherit, which is what lets a `TableCard` set density for the whole shell.
     The parts carry the `default` values as `var()` fallbacks, so a bare
     `<Table>` renders exactly as it always has. */
  defaultVariants: { separators: "row" },
})

interface TableProps
  extends React.ComponentProps<"table">,
    VariantProps<typeof tableVariants> {
  /** Escape hatch to the scroll container that wraps every table. Required for
   *  a sticky header, which needs a bounded scroller to stick against — e.g.
   *  `{ className: "max-h-96 overflow-y-auto" }`. */
  containerProps?: React.ComponentProps<"div">
}

function Table({
  className,
  size,
  separators,
  containerProps,
  ...props
}: TableProps) {
  const { className: containerClassName, ...container } = containerProps ?? {}

  return (
    <div
      data-slot="table-container"
      className={cn("relative w-full overflow-x-auto", containerClassName)}
      {...container}
    >
      <table
        data-slot="table"
        data-size={size ?? undefined}
        data-separators={separators ?? "row"}
        className={cn(tableVariants({ size, separators }), className)}
        {...props}
      />
    </div>
  )
}

/* The hairline is drawn by a pseudo-element rather than `border-b` when the
   header is sticky, and that is not a style preference. Preflight sets
   `border-collapse: collapse`, and a collapsed border belongs to the table
   rather than to the cell — so it stays behind with the table body and the
   sticky header visibly sheds its underline mid-scroll. Switching the table to
   `border-collapse: separate` would fix it and move every other border in the
   system, so the pseudo-element is the cheap answer. */
const tableHeaderSticky =
  "sticky top-0 z-[var(--z-sticky,1)] bg-card [&_tr]:border-b-0! [&_th]:relative [&_th]:bg-inherit [&_th]:after:absolute [&_th]:after:inset-x-0 [&_th]:after:bottom-0 [&_th]:after:h-px [&_th]:after:bg-border"

interface TableHeaderProps extends React.ComponentProps<"thead"> {
  /** Pin the header while the body scrolls. Needs a bounded scroll container —
   *  pass one through `Table`'s `containerProps`. Sticking to the page viewport
   *  will not work inside a `TableCard`: the card clips its own overflow. */
  sticky?: boolean
}

function TableHeader({ className, sticky = false, ...props }: TableHeaderProps) {
  return (
    <thead
      data-slot="table-header"
      data-sticky={sticky ? "true" : undefined}
      className={cn("[&_tr]:border-b", sticky && tableHeaderSticky, className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-secondary/60 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

/* Motion: colour only, at `duration-instant`. A row is the highest-frequency
   element in an admin UI — dragging the pointer down forty of them at the
   default transition length leaves a comet tail of half-faded rows behind the
   cursor, which reads as lag rather than polish. At 75ms the highlight lands
   before the eye can register it as travelling.

   All three backgrounds (hover, the expanded hold, selected) share the one
   timing deliberately: a row that is selected *and* hovered would otherwise
   cross-fade against itself on two different clocks.

   No lift, no scale, no border animation. Rows are scanned, not admired.

   The selected wash is mixed from --selected rather than --primary. At 8% the
   CTA lime comes out lighter than the zebra stripe it has to out-rank, which
   would leave a selected row reading as less marked than an ordinary even one.
   Same substitution in the `zebra` compound above, for the same reason. */
function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors duration-instant ease-out-expo hover:bg-accent/60 has-aria-expanded:bg-accent/60 data-[state=selected]:bg-selected/8",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-[var(--table-head-h,calc(var(--spacing)*11))] px-[var(--table-cell-px,calc(var(--spacing)*4))] text-left align-middle text-caption font-medium whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-[var(--table-cell-px,calc(var(--spacing)*4))] py-[var(--table-cell-py,calc(var(--spacing)*3))] align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

/* ---------------------------------------------------------------------------
   Sortable column header
--------------------------------------------------------------------------- */

type SortDirection = "asc" | "desc"

/* Two cvas rather than one because the axis lands on two elements: the cell
   decides where the text sits, the button decides which side the arrow takes. */
const tableSortHeadVariants = cva("group/table-sort", {
  variants: {
    align: {
      start: "",
      end: "text-right",
    },
  },
  defaultVariants: { align: "start" },
})

/* The negative inline margin buys the button a hit area and a focus ring
   without moving the column: it eats back exactly the padding it adds, so a
   sortable header lines up with a plain one to the pixel. */
const tableSortButtonVariants = cva(
  "-mx-2 inline-flex h-8 max-w-full items-center gap-1.5 rounded-md px-2 align-middle font-medium whitespace-nowrap transition-colors duration-instant ease-out-expo outline-none select-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
  {
    variants: {
      align: {
        start: "",
        end: "flex-row-reverse",
      },
    },
    defaultVariants: { align: "start" },
  }
)

/* `align` is omitted from the native `<th>` attributes rather than merged with
   them: the deprecated HTML attribute takes `left`/`right`, the variant takes
   `start`/`end`, and an intersection of the two is not a type anything can
   satisfy. */
interface TableSortHeaderProps
  extends Omit<React.ComponentProps<"th">, "onClick" | "align">,
    VariantProps<typeof tableSortButtonVariants> {
  /** `null` or omitted means this column is not the sorted one. Controlled —
   *  the component renders the arrow, it never decides the direction. */
  direction?: SortDirection | null
  /** Fired with the direction the caller should move to. */
  onSort?: (next: SortDirection) => void
}

function TableSortHeader({
  className,
  children,
  direction = null,
  onSort,
  align = "start",
  ...props
}: TableSortHeaderProps) {
  const sorted = direction === "asc" || direction === "desc"
  const next: SortDirection = direction === "asc" ? "desc" : "asc"

  return (
    <TableHead
      aria-sort={
        direction === "asc"
          ? "ascending"
          : direction === "desc"
            ? "descending"
            : "none"
      }
      className={cn(tableSortHeadVariants({ align }), className)}
      {...props}
    >
      <button
        type="button"
        data-slot="table-sort-button"
        onClick={onSort ? () => onSort(next) : undefined}
        className={cn(
          tableSortButtonVariants({ align }),
          sorted && "text-foreground"
        )}
      >
        <span className="min-w-0 truncate">{children}</span>
        {sorted ? (
          /* The entrance and the flip run on different clocks, so they sit on
             different elements — one `ease-*` per element, since the animation
             and the transition would otherwise fight over the same variable.
             Arriving is a content swap (219ms); turning over asc↔desc is travel
             between two positions (364ms), and at that length the arrow reads
             as rotating rather than as replacing itself.

             `duration-*` rather than `anim-*` on the wrapper: the wrapper runs
             a keyframe animation and nothing else, and the enter utilities fall
             back to `--tw-duration` when no animation-only duration is set. */
          <span className="inline-flex animate-in fade-in zoom-in-90 duration-spring-swap ease-spring-swap">
            <ArrowUp
              aria-hidden="true"
              className={cn(
                "size-3.5 shrink-0 transition-transform duration-spring-glide ease-spring-glide",
                direction === "desc" && "rotate-180"
              )}
            />
          </span>
        ) : (
          /* Held at zero opacity rather than unmounted: the column keeps its
             width whether or not the pointer is over it. Same clock as the row
             hover — this is the same frequency class of interaction. */
          <ChevronsUpDown
            aria-hidden="true"
            className="size-3.5 shrink-0 opacity-0 transition-opacity duration-instant ease-out-expo group-hover/table-sort:opacity-60 group-focus-within/table-sort:opacity-60"
          />
        )}
      </button>
    </TableHead>
  )
}

/* ---------------------------------------------------------------------------
   Selection column — sizing only, never selection state
--------------------------------------------------------------------------- */

/* Fixes the column so the checkbox does not shift left and right as the widest
   cell in the next column changes between pages. The caller supplies the
   `<Checkbox>`; select-all goes indeterminate by passing
   `checked="indeterminate"`, and it needs an `aria-label` because it has no
   visible text of its own. */
function TableSelectHead({ className, ...props }: React.ComponentProps<"th">) {
  return <TableHead className={cn("w-12 pr-0", className)} {...props} />
}

function TableSelectCell({ className, ...props }: React.ComponentProps<"td">) {
  return <TableCell className={cn("w-12 pr-0", className)} {...props} />
}

/* ---------------------------------------------------------------------------
   States
--------------------------------------------------------------------------- */

interface TableEmptyProps extends React.ComponentProps<"td"> {
  /** Must match the real column count. Nothing here can validate it — a wrong
   *  number silently breaks the grid. */
  colSpan: number
}

/* Renders both the row and the cell, because the row is the part callers keep
   getting wrong: an empty state that inherits the row hover fill looks like a
   clickable record. Drop an `<EmptyState size="sm">` inside. */
function TableEmpty({ className, colSpan, ...props }: TableEmptyProps) {
  return (
    <tr data-slot="table-empty-row" className="border-0 hover:bg-transparent">
      <td
        data-slot="table-empty"
        colSpan={colSpan}
        className={cn("p-0 text-center", className)}
        {...props}
      />
    </tr>
  )
}

interface TableSkeletonColumn {
  /** Tailwind width utility, e.g. `"w-32"`. Keep it close to the real content —
   *  a placeholder that is the wrong width makes the table jump when data
   *  lands, which is worse than no placeholder at all. */
  width?: string
  className?: string
}

interface TableSkeletonRowsProps {
  rows?: number
  /** One entry per column. Length must match the header row. */
  columns: TableSkeletonColumn[]
  className?: string
}

/* Set `aria-busy` on the `<Table>` while these are up. The rows themselves are
   hidden from assistive tech — a screen reader reading out thirty-five empty
   placeholder cells is worse than silence. */
function TableSkeletonRows({
  rows = 5,
  columns,
  className,
}: TableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr
          key={row}
          aria-hidden="true"
          data-slot="table-skeleton-row"
          className={cn("border-b", className)}
        >
          {columns.map((column, index) => (
            <TableCell key={index}>
              {/* Offsetting each row against the stagger token turns a block of
                  rows pulsing in unison — which reads as one big flashing
                  rectangle — into a sweep travelling down the table. */}
              <Skeleton
                className={cn("h-4", column.width ?? "w-24", column.className)}
                style={{ animationDelay: `calc(var(--stagger-tight) * ${row})` }}
              />
            </TableCell>
          ))}
        </tr>
      ))}
    </>
  )
}

/* ---------------------------------------------------------------------------
   Cell layout
--------------------------------------------------------------------------- */

interface TableCellStackProps extends React.ComponentProps<"div"> {
  primary: React.ReactNode
  secondary?: React.ReactNode
  /** Slot on the inline-start side — an avatar, a logo, an icon tile. */
  media?: React.ReactNode
}

/* Name over email, id over agent, product over sku. Far and away the most
   repeated cell shape, and the one thing here worth owning: every other pattern
   in a table cell (status badge, progress bar, avatar group, rating, action
   icons) is an existing component dropped straight into a `TableCell`, and
   wrapping those would only duplicate their props. */
function TableCellStack({
  className,
  primary,
  secondary,
  media,
  children,
  ...props
}: TableCellStackProps) {
  return (
    <div
      data-slot="table-cell-stack"
      className={cn("flex items-center gap-2.5", className)}
      {...props}
    >
      {media ? (
        <span className="flex shrink-0 items-center">{media}</span>
      ) : null}
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-medium">{primary}</span>
        {secondary ? (
          <span className="truncate text-sm text-muted-foreground">
            {secondary}
          </span>
        ) : null}
      </span>
      {children}
    </div>
  )
}

/* Holder for the trailing icon buttons and the row menu trigger. Deliberately
   always visible: actions that fade in on row hover are undiscoverable, and on
   a touch screen they are unreachable. A caller who really wants them hidden
   can do it with one class — the default should not be the trap. */
function TableActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="table-actions"
      className={cn("ml-auto flex items-center justify-end gap-1", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableSortHeader,
  TableSelectHead,
  TableSelectCell,
  TableEmpty,
  TableSkeletonRows,
  TableCellStack,
  TableActions,
  tableVariants,
  tableDensity,
}

export type {
  SortDirection,
  TableProps,
  TableHeaderProps,
  TableSortHeaderProps,
  TableEmptyProps,
  TableSkeletonColumn,
  TableSkeletonRowsProps,
  TableCellStackProps,
}
