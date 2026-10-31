import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Search } from "lucide-react"

import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Tag } from "./ui/tag"
import { cn } from "../lib/utils"

/* Toolbar above a table or list — search, a row of filter controls, and a
   right-aligned actions cluster. Everything is a slot: the bar itself only
   owns the wrapping rhythm, so a narrow column drops the actions onto their
   own line instead of squeezing the controls. */
const filterBarVariants = cva(
  "group/filter-bar flex w-full flex-wrap items-center gap-2 sm:gap-3",
  {
    variants: {
      /* Pins the bar to the top of the scroll container. The translucent fill
         + blur keeps the rows underneath legible as they pass behind it. */
      sticky: {
        true: "sticky top-0 z-20 bg-background/85 py-3 backdrop-blur-sm",
        false: "",
      },
      border: {
        true: "border-b border-border pb-3",
        false: "",
      },
    },
    defaultVariants: {
      sticky: false,
      border: false,
    },
  }
)

function FilterBar({
  className,
  sticky = false,
  border = false,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof filterBarVariants>) {
  return (
    <div
      data-slot="filter-bar"
      data-sticky={sticky ? "true" : undefined}
      className={cn(filterBarVariants({ sticky, border }), className)}
      {...props}
    />
  )
}

/* Search field with a leading glyph. Sits at h-10 so it lines up with the
   default button and chip height rather than the taller standalone Input. */
function FilterBarSearch({
  className,
  containerClassName,
  type = "search",
  placeholder = "Search",
  "aria-label": ariaLabel = "Search",
  ...props
}: React.ComponentProps<"input"> & { containerClassName?: string }) {
  return (
    <div
      data-slot="filter-bar-search"
      role="search"
      className={cn("relative min-w-48 flex-1 sm:max-w-72", containerClassName)}
    >
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type={type}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn("h-10 pl-10", className)}
        {...props}
      />
    </div>
  )
}

/* Right-hand cluster — export / new record / view switcher. Takes the full
   width below sm so it wraps to its own line and stays right-aligned. */
function FilterBarActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="filter-bar-actions"
      className={cn(
        "flex flex-wrap items-center gap-2 max-sm:w-full max-sm:justify-end sm:ml-auto",
        className
      )}
      {...props}
    />
  )
}

type FilterBarActiveFilter = {
  /** Stable key — handed back to onRemove. */
  id: string
  /** Optional field name, rendered before the value as "Status: Active". */
  field?: React.ReactNode
  value: React.ReactNode
}

/* Applied-filter readout. Renders nothing at all when nothing is applied, so
   it can sit unconditionally inside the bar without reserving a dead row. */
function FilterBarActiveFilters({
  filters,
  onRemove,
  onClearAll,
  label = "Filters",
  clearLabel = "Clear all",
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  filters: FilterBarActiveFilter[]
  onRemove?: (id: string) => void
  onClearAll?: () => void
  label?: React.ReactNode
  clearLabel?: React.ReactNode
}) {
  if (filters.length === 0) {
    return null
  }

  return (
    <div
      data-slot="filter-bar-active-filters"
      className={cn("flex w-full flex-wrap items-center gap-2", className)}
      {...props}
    >
      {label ? (
        <span className="text-caption leading-none font-medium text-muted-foreground">
          {label}
        </span>
      ) : null}

      <ul
        data-slot="filter-bar-active-filters-list"
        /* Preflight strips list-style, which drops list semantics in Safari —
           restore them explicitly, same as the feed and the stepper do. */
        role="list"
        aria-label="Applied filters"
        className="flex min-w-0 flex-wrap items-center gap-2"
      >
        {/* An applied filter arriving is a real event — the list it describes
            just changed underneath. Keyed by id, so the enter runs on the one
            tag that was added and never replays on the ones already standing.
            Enter only, and pitched wider than the tag's own dismissal travels,
            so if the consumer wires up removal the pair stays asymmetric — the
            filter lands from further out than it leaves from. */}
        {filters.map((filter) => (
          <li
            key={filter.id}
            data-slot="filter-bar-active-filter"
            className="animate-in fade-in zoom-in-90 blur-in-3 duration-spring-swap ease-spring-swap"
          >
            {/* secondary, not the solid default — an applied filter is a
                readout, it must not out-shout the controls above it */}
            <Tag
              variant="secondary"
              onDismiss={onRemove ? () => onRemove(filter.id) : undefined}
            >
              {filter.field ? (
                <>
                  <span className="text-muted-foreground">{filter.field}:</span>{" "}
                  {filter.value}
                </>
              ) : (
                filter.value
              )}
            </Tag>
          </li>
        ))}
      </ul>

      {onClearAll ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onClearAll}
          className="text-muted-foreground hover:text-foreground"
        >
          {clearLabel}
        </Button>
      ) : null}
    </div>
  )
}

export {
  FilterBar,
  FilterBarSearch,
  FilterBarActions,
  FilterBarActiveFilters,
  filterBarVariants,
}
export type { FilterBarActiveFilter }
