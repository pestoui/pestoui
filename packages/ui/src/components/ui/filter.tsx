"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronDownIcon, ListFilterIcon, SearchIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import { Badge } from "./badge"
import { Button } from "./button"
import { Checkbox } from "./checkbox"
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
} from "./empty-state"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

/* ------------------------------------------------------------------ model -- */

type FilterOption = {
  /** Stable key. This is what lands in the selection array for the facet. */
  value: string
  label: string
  /** Matching-record tally, right-aligned on the row. Omit to hide it. */
  count?: number
  disabled?: boolean
}

type FilterFacet = {
  /** Stable key. The selection is keyed by it. */
  id: string
  label: string
  options: FilterOption[]
}

/**
 * facet id -> the option values checked inside it. A facet with nothing checked
 * is absent from the object rather than present with an empty array, so an
 * "is anything applied" test is a key count and never has to look inside.
 */
type FilterSelection = Record<string, string[]>

/** Exported so a consumer tallies the applied set the same way the badge does. */
function countFilterSelection(selection: FilterSelection): number {
  return Object.values(selection).reduce(
    (total, values) => total + values.length,
    0
  )
}

function setFacetValues(
  selection: FilterSelection,
  facetId: string,
  values: string[]
): FilterSelection {
  const next = { ...selection }
  if (values.length === 0) {
    delete next[facetId]
  } else {
    next[facetId] = values
  }
  return next
}

/**
 * Add or drop one value inside one facet, returning a new selection. Exported
 * because `FilterMenuPanel` is fully controlled — a consumer mounting it in a
 * Sheet needs the same reducer the popover uses internally.
 */
function toggleFilterValue(
  selection: FilterSelection,
  facetId: string,
  value: string
): FilterSelection {
  const current = selection[facetId] ?? []
  return setFacetValues(
    selection,
    facetId,
    current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]
  )
}

/* ----------------------------------------------------------------- option -- */

type FilterMenuOptionProps = Omit<
  React.ComponentProps<"label">,
  "onChange" | "children"
> & {
  option: FilterOption
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

/* A real <label> wrapping a real checkbox, so the whole band is a hit target
   and Space toggles it — no re-implemented listbox, no roving tabindex. The
   browser suppresses the label's own activation when the click already landed
   on the control, so wrapping cannot double-toggle. */
function FilterMenuOption({
  option,
  checked,
  onCheckedChange,
  className,
  ...props
}: FilterMenuOptionProps) {
  return (
    <label
      data-slot="filter-menu-option"
      /* Emitted for descendants and for consumers styling a checked band —
         the row never reads it back to style itself. */
      data-checked={checked ? "true" : undefined}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors duration-instant ease-out-expo select-none hover:bg-accent has-[[data-slot=checkbox]:focus-visible]:bg-accent has-[[data-slot=checkbox]:disabled]:cursor-not-allowed has-[[data-slot=checkbox]:disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <Checkbox
        checked={checked}
        disabled={option.disabled}
        onCheckedChange={(next) => onCheckedChange(next === true)}
      />
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      {option.count === undefined ? null : (
        <span
          data-slot="filter-menu-option-count"
          className="shrink-0 text-xs tabular-nums text-muted-foreground"
        >
          {option.count}
        </span>
      )}
    </label>
  )
}

/* ------------------------------------------------------------------ group -- */

type FilterMenuGroupProps = Omit<
  React.ComponentProps<"div">,
  "onChange" | "children"
> & {
  facet: FilterFacet
  /** Checked values inside this facet only. */
  value: string[]
  onValueChange: (next: string[]) => void
}

/* One facet: a heading plus its checklist. role="group" + aria-labelledby is
   what lets a screen-reader user tell "Active" under Status apart from
   "Active" under Plan — there are no visible labels on the rows themselves. */
function FilterMenuGroup({
  facet,
  value,
  onValueChange,
  className,
  ...props
}: FilterMenuGroupProps) {
  const headingId = React.useId()

  return (
    <div
      data-slot="filter-menu-group"
      role="group"
      aria-labelledby={headingId}
      className={cn("flex flex-col", className)}
      {...props}
    >
      <div
        id={headingId}
        data-slot="filter-menu-group-label"
        className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground"
      >
        {facet.label}
      </div>
      {facet.options.map((option) => (
        <FilterMenuOption
          key={option.value}
          option={option}
          checked={value.includes(option.value)}
          onCheckedChange={(next) =>
            onValueChange(
              next
                ? [...value, option.value]
                : value.filter((item) => item !== option.value)
            )
          }
        />
      ))}
    </div>
  )
}

/* ----------------------------------------------------------------- footer -- */

function FilterMenuFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="filter-menu-footer"
      /* Fade with no travel. The footer mounts the moment the first filter
         lands, which changes the panel's height — anything that moves here
         would fight Radix repositioning the panel on the same frame. */
      className={cn(
        "flex animate-in items-center justify-between gap-2 border-t border-border px-3 py-2.5 fade-in-0 duration-spring-swap ease-spring-swap",
        className
      )}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------ panel -- */

const filterMenuPanelVariants = cva("flex w-full min-w-0 flex-col", {
  variants: {
    surface: {
      /* Dropped into PopoverContent, which already paints fill, ring and
         shadow — the panel adds nothing of its own. */
      popover: "",
      /* Standalone: inside a Sheet on a narrow viewport, or laid flat in a
         page. It has to paint its own card. */
      flush: "rounded-xl bg-card ring-1 ring-border",
    },
  },
  defaultVariants: {
    surface: "popover",
  },
})

type FilterMenuPanelProps = Omit<
  React.ComponentProps<"div">,
  "onChange" | "defaultValue"
> &
  VariantProps<typeof filterMenuPanelVariants> & {
    facets: FilterFacet[]
    /** Fully controlled — this part holds no selection state of its own. */
    value: FilterSelection
    onValueChange: (next: FilterSelection) => void
    searchable?: boolean
    searchPlaceholder?: string
    /** Rendering the Apply button is what makes the panel a draft. */
    onApply?: () => void
    onClear?: () => void
    clearLabel?: React.ReactNode
    applyLabel?: React.ReactNode
    emptyTitle?: React.ReactNode
    emptyDescription?: React.ReactNode
  }

/* Body + footer with no popover chrome of its own, so the same panel can be
   mounted in a Sheet for the narrow-viewport treatment. Deliberately not given
   a `responsive` prop that swaps its own container — two mount points sharing
   one draft is a state-duplication trap; compose it instead. */
function FilterMenuPanel({
  facets,
  value,
  onValueChange,
  surface = "popover",
  searchable = false,
  searchPlaceholder = "Search filters",
  onApply,
  onClear,
  clearLabel = "Clear all",
  applyLabel = "Apply",
  emptyTitle,
  emptyDescription,
  className,
  children,
  ...props
}: FilterMenuPanelProps) {
  const [query, setQuery] = React.useState("")
  const searchRef = React.useRef<HTMLInputElement>(null)
  const bodyRef = React.useRef<HTMLDivElement>(null)

  const selectedCount = countFilterSelection(value)
  const searching = query.trim().length > 0

  /* Announced only once the count actually moves. A live region that mounts
     with text in it can be read out the moment the panel opens, which would
     make every open start with "0 filters selected". */
  const [announcement, setAnnouncement] = React.useState("")
  const mounted = React.useRef(false)
  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    setAnnouncement(
      selectedCount === 1
        ? "1 filter selected"
        : `${selectedCount} filters selected`
    )
  }, [selectedCount])

  const visibleFacets = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle.length === 0) return facets
    return facets
      .map((facet) => ({
        ...facet,
        options: facet.options.filter((option) =>
          option.label.toLowerCase().includes(needle)
        ),
      }))
      .filter((facet) => facet.options.length > 0)
  }, [facets, query])

  function handleClear() {
    onClear?.()
    /* Clear all unmounts itself the instant it succeeds, which would drop
       focus onto <body>. Hand it to the search box, else to the first
       checkbox, else leave it where the browser put it. */
    requestAnimationFrame(() => {
      const fallback = bodyRef.current?.querySelector<HTMLElement>(
        "[data-slot=checkbox]:not(:disabled)"
      )
      const target = searchRef.current ?? fallback
      target?.focus()
    })
  }

  const showFooter = onApply !== undefined || selectedCount > 0

  return (
    <div
      data-slot="filter-menu-panel"
      data-surface={surface}
      className={cn(filterMenuPanelVariants({ surface }), className)}
      {...props}
    >
      {searchable ? (
        <div
          data-slot="filter-menu-search"
          className="relative shrink-0 border-b border-border"
        >
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-10 w-full bg-transparent pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      ) : null}

      <div
        ref={bodyRef}
        data-slot="filter-menu-body"
        className="flex max-h-72 flex-col overflow-y-auto overscroll-contain p-1.5"
      >
        {visibleFacets.length === 0 ? (
          <EmptyState size="sm">
            <EmptyStateTitle>
              {emptyTitle ??
                (searching ? "No matching filters" : "No filters available")}
            </EmptyStateTitle>
            <EmptyStateDescription>
              {emptyDescription ??
                (searching
                  ? "Try a different search term."
                  : "There is nothing to filter on yet.")}
            </EmptyStateDescription>
          </EmptyState>
        ) : (
          visibleFacets.map((facet) => (
            <FilterMenuGroup
              key={facet.id}
              facet={facet}
              value={value[facet.id] ?? []}
              onValueChange={(next) =>
                onValueChange(setFacetValues(value, facet.id, next))
              }
            />
          ))
        )}
        {children}
      </div>

      {/* A row being checked, or the whole set being cleared, is silent — the
          list it narrows is somewhere else on the page entirely. */}
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>

      {showFooter ? (
        <FilterMenuFooter>
          {selectedCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground"
            >
              {clearLabel}
            </Button>
          ) : null}
          {onApply ? (
            <Button type="button" size="xs" onClick={onApply} className="ml-auto">
              {applyLabel}
            </Button>
          ) : null}
        </FilterMenuFooter>
      ) : null}
    </div>
  )
}

/* ---------------------------------------------------------------- trigger -- */

type FilterMenuTriggerProps = React.ComponentProps<typeof Button> & {
  /** Applied filters. Zero hides the badge entirely. */
  count?: number
  label?: React.ReactNode
}

function FilterMenuTrigger({
  count = 0,
  label = "Filters",
  variant = "outline",
  className,
  children,
  ...props
}: FilterMenuTriggerProps) {
  return (
    <Button
      type="button"
      data-slot="filter-menu-trigger"
      /* For descendants and for consumers — never read back to style this
         button. Radix supplies aria-expanded / aria-haspopup on top. */
      data-applied={count > 0 ? "true" : undefined}
      variant={variant}
      className={className}
      {...props}
    >
      <ListFilterIcon aria-hidden="true" />
      {label}
      {count > 0 ? (
        <>
          {/* Deliberately NOT the badge's own `count` colours: that variant is
              bg-info, and info is reserved for informational UI. An applied
              tally says "this control is switched on", which is selection
              semantics, so it takes the selected accent. Please don't "fix"
              this back to the default. Keyed by the number so it remounts and
              replays the pop each time the count actually lands. */}
          <Badge
            key={count}
            appear
            variant="count"
            aria-hidden="true"
            className="bg-selected text-selected-foreground"
          >
            {count}
          </Badge>
          {/* A button is named from its content, so the tally has to say what
              it means rather than read out as a bare digit. */}
          <span className="sr-only">{count} applied</span>
        </>
      ) : null}
      {children}
      <ChevronDownIcon
        aria-hidden="true"
        /* One chevron that turns: a half turn lands exactly on the up chevron,
           so only the change between the two states is animated. */
        className="size-4 shrink-0 text-muted-foreground transition-transform duration-spring-press ease-spring-press group-aria-expanded/button:rotate-180"
      />
    </Button>
  )
}

/* ------------------------------------------------------------------- root -- */

type FilterMenuProps = Omit<
  React.ComponentProps<"button">,
  "value" | "defaultValue" | "onChange"
> & {
  facets: FilterFacet[]

  /** The draft — what is checked in the panel right now. */
  value?: FilterSelection
  defaultValue?: FilterSelection
  onValueChange?: (next: FilterSelection) => void

  /**
   * Commit handler. When present the panel holds a DRAFT and only lifts it on
   * Apply — the badge then counts the last committed set, not what is checked.
   * When omitted no Apply button is rendered and every toggle is live.
   */
  onApply?: (selection: FilterSelection) => void

  /* Trigger. */
  label?: React.ReactNode
  size?: "sm" | "default"
  variant?: "outline" | "secondary" | "ghost"
  disabled?: boolean

  /* Panel. */
  align?: React.ComponentProps<typeof PopoverContent>["align"]
  sideOffset?: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
  searchable?: boolean
  searchPlaceholder?: string
  panelClassName?: string

  /* Copy. */
  clearLabel?: React.ReactNode
  applyLabel?: React.ReactNode
  emptyTitle?: React.ReactNode
  emptyDescription?: React.ReactNode
}

function FilterMenu({
  facets,
  value: valueProp,
  defaultValue,
  onValueChange,
  onApply,
  label,
  size = "default",
  variant = "outline",
  disabled = false,
  align = "start",
  sideOffset = 6,
  open: openProp,
  onOpenChange,
  searchable = false,
  searchPlaceholder,
  panelClassName,
  clearLabel,
  applyLabel,
  emptyTitle,
  emptyDescription,
  ...props
}: FilterMenuProps) {
  const isControlled = valueProp !== undefined
  const [internalValue, setInternalValue] = React.useState<FilterSelection>(
    () => defaultValue ?? {}
  )
  const draft = isControlled ? valueProp : internalValue

  /* Deferred the moment a commit handler exists. Three cases, pinned here: the
     badge counts the APPLIED set while deferred and the draft otherwise;
     closing without applying keeps the draft so reopening resumes, but the
     badge does not move because nothing was committed; and Clear all edits the
     draft like any other control, so in deferred mode it still needs an Apply
     to take effect. */
  const deferred = onApply !== undefined
  const [applied, setApplied] = React.useState<FilterSelection>(
    () => defaultValue ?? valueProp ?? {}
  )

  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = openProp ?? internalOpen

  function setOpen(next: boolean) {
    if (openProp === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }

  function commit(next: FilterSelection) {
    if (!isControlled) setInternalValue(next)
    onValueChange?.(next)
  }

  function handleApply() {
    setApplied(draft)
    onApply?.(draft)
    setOpen(false)
  }

  const appliedCount = countFilterSelection(deferred ? applied : draft)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => setOpen(disabled ? false : next)}
    >
      <PopoverTrigger asChild>
        <FilterMenuTrigger
          count={appliedCount}
          label={label}
          size={size}
          variant={variant}
          disabled={disabled}
          {...props}
        />
      </PopoverTrigger>

      <PopoverContent
        align={align}
        sideOffset={sideOffset}
        /* Keep the panel off the viewport edge. It grows as facets open, and a
           panel that hits the edge makes Radix flip sides mid-interaction. */
        collisionPadding={12}
        /* Width is content-driven with a floor, never three hardcoded steps.
           overflow-hidden lets the flush body clip to the popover's corners. */
        className={cn(
          "w-auto min-w-72 max-w-[calc(var(--radix-popover-content-available-width,100vw)-1.5rem)] gap-0 overflow-hidden p-0",
          panelClassName
        )}
      >
        <FilterMenuPanel
          facets={facets}
          value={draft}
          onValueChange={commit}
          searchable={searchable}
          searchPlaceholder={searchPlaceholder}
          onApply={deferred ? handleApply : undefined}
          onClear={() => commit({})}
          clearLabel={clearLabel}
          applyLabel={applyLabel}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      </PopoverContent>
    </Popover>
  )
}

export {
  FilterMenu,
  FilterMenuFooter,
  FilterMenuGroup,
  FilterMenuOption,
  FilterMenuPanel,
  FilterMenuTrigger,
  countFilterSelection,
  filterMenuPanelVariants,
  toggleFilterValue,
}
export type {
  FilterFacet,
  FilterMenuGroupProps,
  FilterMenuOptionProps,
  FilterMenuPanelProps,
  FilterMenuProps,
  FilterMenuTriggerProps,
  FilterOption,
  FilterSelection,
}
