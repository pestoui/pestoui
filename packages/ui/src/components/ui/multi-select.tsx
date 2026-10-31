"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { defaultFilter } from "cmdk"
import { ChevronDownIcon, XIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./command"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "./popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./tooltip"

/* The field wraps to as many rows as the tags need, so the size axis sets a MIN
   height. On a single row it lands exactly on the Input / SelectTrigger box, and
   it carries the same border + focus treatment — the ring is drawn here because
   the real focus target is the trigger button nested inside. */
const multiSelectVariants = cva(
  "group/multi-select flex w-full flex-wrap items-center gap-1.5 border border-input bg-card text-left transition-colors has-[[data-slot=multi-select-trigger]:focus-visible]:border-ring has-[[data-slot=multi-select-trigger]:focus-visible]:ring-3 has-[[data-slot=multi-select-trigger]:focus-visible]:ring-ring/50 has-disabled:cursor-not-allowed has-disabled:bg-input/50 has-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:has-disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      size: {
        default: "min-h-11 rounded-lg px-2 py-1.5 text-body",
        sm: "min-h-9 rounded-[min(var(--radius-md),12px)] px-1.5 py-1 text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

/* Entrance pop for a tag that was just picked — 0.9 → 1 with the opacity, on the
   bouncy spring. A tag is small, arrives one at a time, and is the confirmation
   that the click in the list landed, which is the low-frequency moment overshoot
   is reserved for.

   It is applied to exactly one value rather than to every tag, because a mount
   animation cannot tell "the user just added this" from "the field opened
   already holding four values" — and a wall of tags popping on first paint is
   the failure mode. That is also why Select all never sets it. `anim-*` rather
   than `duration-*`: the entrance runs long while the field's own colour
   transition stays short. */
const tagAppear =
  "animate-in fade-in zoom-in-90 anim-spring-bouncy ease-spring-bouncy"

/* The field's two icon buttons — a tag's dismiss and the field-level clear —
   are the same box, so the shape is written once and each adds its own colour
   and transition. Squircle, not a circle: explicit radii that stay under half
   the box at both sizes, the same step-down Tag's dismiss uses. */
const fieldIconButton =
  "inline-flex size-5 shrink-0 items-center justify-center rounded-[7px] text-muted-foreground outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:bg-foreground/10 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-90 disabled:pointer-events-none group-data-[size=sm]/multi-select:size-4.5 group-data-[size=sm]/multi-select:rounded-[6px] dark:hover:bg-foreground/15 dark:focus-visible:bg-foreground/15 [&_svg]:pointer-events-none [&_svg]:size-3.5 group-data-[size=sm]/multi-select:[&_svg]:size-3"

/* The tick CommandItem draws for a checked row. Checked is the brand accent;
   --info is informational only and must never stand in for a selection state.
   --selected, never --primary: this is a small glyph on an unfilled row, so it
   carries the state on its own contrast, and the CTA lime is far too light to
   read there. The important flag is what beats CommandItem's own
   `data-selected:*:[svg]:text-foreground` while the row is highlighted. */
const checkedTick = "[&>svg:last-child]:text-selected!"

/* Leading media on a tag: a bare <img> is an avatar, a bare <svg> is a glyph,
   anything else (a colour dot, a stacked mark) passes through at its own size.
   Mirrors Tag's leading slot so the two read as the same component family. */
const tagLeadingMedia =
  "inline-flex shrink-0 items-center justify-center [&>img]:size-5 [&>img]:rounded-full [&>img]:object-cover [&>svg]:size-3.5 group-data-[size=sm]/multi-select:[&>img]:size-4.5 group-data-[size=sm]/multi-select:[&>svg]:size-3"

/* Same slot on an option row. No svg rule here on purpose — the popover is
   portalled out of the field, so the size group does not reach it, and
   CommandItem already sizes a bare glyph to match its own rows. */
const optionLeadingMedia =
  "inline-flex shrink-0 items-center justify-center [&>img]:size-5 [&>img]:rounded-full [&>img]:object-cover"

/* Sentinel row values. They live outside the filter store (forceMount items are
   never registered), so they only have to avoid colliding with a real option. */
const ACTIONS_GROUP_VALUE = "multi-select:actions"
const SELECT_ALL_VALUE = "multi-select:select-all"
const CLEAR_VALUE = "multi-select:clear"

type MultiSelectOption = {
  value: string
  label: string
  /* Second line under the label. Wired through aria-describedby, so it is never
     folded into the row's accessible name — "Engineering, 12 users" as a name
     is worse than useless in a long list. */
  description?: string
  /* Leading avatar, icon or dot — sized for you when it is a bare svg/img.
     Rendered on the option row and reused verbatim on the tag. */
  leading?: React.ReactNode
  /* Extra search terms beyond the label and the value. */
  keywords?: string[]
  disabled?: boolean
}

type MultiSelectGroup = {
  label: string
  options: MultiSelectOption[]
}

/* Flat or grouped, and the two may be mixed — a member is a group when it
   carries its own `options`. Loose options keep their order and share one
   unlabelled group, so `options` never has to be rewritten to add a heading. */
type MultiSelectItems = (MultiSelectOption | MultiSelectGroup)[]

type MultiSelectProps = Omit<
  React.ComponentProps<"div">,
  "defaultValue" | "onChange"
> &
  VariantProps<typeof multiSelectVariants> & {
    options: MultiSelectItems
    value?: string[]
    defaultValue?: string[]
    onValueChange?: (value: string[]) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: React.ReactNode
    /* Tags past this count collapse into a single "+N" badge. */
    maxDisplay?: number
    /* Hard cap on the selection. Unselected rows go disabled once it is hit;
       the rows already chosen stay live so they can still be dropped. */
    maxSelected?: number
    /* Shown, and announced, while the cap is blocking further picks. */
    maxSelectedMessage?: string
    /* Render the search box inside the popover. */
    showSearch?: boolean
    /* Leading "Select all" / "Clear" rows above the list. */
    showSelectAll?: boolean
    selectAllLabel?: string
    clearLabel?: string
    /* Trailing button on the field that empties it in one action. */
    clearable?: boolean
    clearAllLabel?: string
    disabled?: boolean
  }

function isMultiSelectGroup(
  item: MultiSelectOption | MultiSelectGroup
): item is MultiSelectGroup {
  return Array.isArray((item as MultiSelectGroup).options)
}

function MultiSelect({
  className,
  size = "default",
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  placeholder = "Select options",
  searchPlaceholder = "Search options…",
  emptyMessage = "No options found.",
  maxDisplay,
  maxSelected,
  maxSelectedMessage,
  showSearch = true,
  showSelectAll = false,
  selectAllLabel = "Select all",
  clearLabel = "Clear",
  clearable = false,
  clearAllLabel = "Clear selection",
  disabled = false,
  id,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  ...props
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [internalValue, setInternalValue] = React.useState<string[]>(
    () => defaultValue ?? []
  )
  /* The one value whose tag should play the entrance pop — set only when the
     user picks it, so the tags a controlled field mounts with stay still. It is
     never cleared: the class is inert once its animation has run, and the tag
     replays it only by mounting again, which is exactly when it should. */
  const [arrived, setArrived] = React.useState<string>()
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const commandRef = React.useRef<HTMLDivElement>(null)
  const descriptionBaseId = React.useId()

  const isControlled = valueProp !== undefined
  const selected = isControlled ? valueProp : internalValue

  /* Loose options and groups normalise to one shape so the render below has a
     single path. An empty heading renders no heading at all, which is how a
     flat list keeps looking exactly like a flat list. */
  const groups = React.useMemo<MultiSelectGroup[]>(() => {
    const next: MultiSelectGroup[] = []
    let loose: MultiSelectOption[] | null = null
    for (const item of options) {
      if (isMultiSelectGroup(item)) {
        loose = null
        next.push(item)
      } else {
        if (!loose) {
          loose = []
          next.push({ label: "", options: loose })
        }
        loose.push(item)
      }
    }
    return next
  }, [options])

  const allOptions = React.useMemo(
    () => groups.flatMap((group) => group.options),
    [groups]
  )
  const optionByValue = React.useMemo(
    () => new Map(allOptions.map((option) => [option.value, option])),
    [allOptions]
  )
  /* Built once rather than inline per row: cmdk re-registers an item whenever
     its keywords array changes identity, and a fresh array every render would
     mean re-registering the whole list every render. */
  const keywordsByValue = React.useMemo(() => {
    const next = new Map<string, string[]>()
    for (const option of allOptions) {
      next.set(option.value, [option.label, ...(option.keywords ?? [])])
    }
    return next
  }, [allOptions])

  const atCap = maxSelected !== undefined && selected.length >= maxSelected

  function commit(next: string[]) {
    if (!isControlled) setInternalValue(next)
    onValueChange?.(next)
  }

  function toggle(optionValue: string) {
    const adding = !selected.includes(optionValue)
    /* The row is already disabled at the cap; this is the keyboard backstop. */
    if (adding && atCap) return
    if (adding) setArrived(optionValue)
    commit(
      adding
        ? [...selected, optionValue]
        : selected.filter((item) => item !== optionValue)
    )
  }

  function remove(optionValue: string) {
    commit(selected.filter((item) => item !== optionValue))
    /* The tag being removed is unmounting — hand focus back to the field so
       keyboard users are not dropped onto <body>. */
    triggerRef.current?.focus()
  }

  /* "Select all" means all *matching* options while a query is live, which is
     what the word reads as with a filter applied. Scoring the query here with
     cmdk's own filter is what keeps the two in step — the list and the row can
     never disagree about what "matching" means. */
  const selectableMatches = React.useMemo(() => {
    if (!showSelectAll) return []
    const pool = search
      ? allOptions.filter(
          (option) =>
            defaultFilter(
              option.value,
              search,
              keywordsByValue.get(option.value)
            ) > 0
        )
      : allOptions
    return pool.filter((option) => !option.disabled)
  }, [showSelectAll, search, allOptions, keywordsByValue])

  const allMatchingSelected =
    selectableMatches.length > 0 &&
    selectableMatches.every((option) => selected.includes(option.value))

  function selectAll() {
    const next = [...selected]
    for (const option of selectableMatches) {
      if (!next.includes(option.value)) next.push(option.value)
    }
    /* Already-selected values sit at the front, so clamping to the cap only
       ever drops picks the user has not made yet. */
    commit(maxSelected === undefined ? next : next.slice(0, maxSelected))
  }

  function clearAll() {
    commit([])
    triggerRef.current?.focus()
  }

  /* Values with no matching option still render, labelled by their own value. */
  const selectedOptions = selected.map(
    (item) =>
      optionByValue.get(item) ?? {
        value: item,
        label: item,
      }
  )
  const visibleOptions =
    maxDisplay === undefined
      ? selectedOptions
      : selectedOptions.slice(0, Math.max(maxDisplay, 0))
  const hiddenOptions = selectedOptions.slice(visibleOptions.length)
  const overflowCount = hiddenOptions.length
  const hiddenLabels = hiddenOptions.map((option) => option.label).join(", ")

  /* role="combobox" is name-from-author, NOT name-from-content — text inside the
     button is never read as its name. So the field always ships an explicit one,
     with the count folded in so the selection is announced without walking the
     tag list. An external aria-labelledby wins outright. */
  const triggerLabel =
    selectedOptions.length > 0
      ? `${ariaLabel ?? placeholder}, ${selectedOptions.length} selected`
      : (ariaLabel ?? placeholder)

  const capMessage =
    maxSelected === undefined
      ? undefined
      : (maxSelectedMessage ?? `You can select up to ${maxSelected}.`)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(disabled ? false : next)
        /* A query is a way of getting to a pick, not part of the selection —
           it does not survive the popover closing. */
        if (!next) setSearch("")
      }}
    >
      <PopoverAnchor asChild>
        <div
          data-slot="multi-select"
          data-size={size}
          aria-invalid={ariaInvalid}
          className={cn(multiSelectVariants({ size }), className)}
          {...props}
        >
          {selectedOptions.length > 0 && (
            /* display:contents — the tags wrap in the same flex flow as the
               trigger instead of forming a second, separately wrapping box. */
            <ul
              role="list"
              aria-label="Selected options"
              className="contents"
            >
              {visibleOptions.map((option) => (
                <li
                  key={option.value}
                  data-slot="multi-select-tag"
                  className={cn(
                    "inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-secondary pr-1 pl-2.5 text-caption font-medium text-secondary-foreground has-data-[slot=multi-select-tag-leading]:pl-1.5 group-data-[size=sm]/multi-select:h-6 group-data-[size=sm]/multi-select:pl-2 group-data-[size=sm]/multi-select:has-data-[slot=multi-select-tag-leading]:pl-1",
                    option.value === arrived && tagAppear
                  )}
                >
                  {option.leading ? (
                    <span
                      data-slot="multi-select-tag-leading"
                      aria-hidden="true"
                      className={tagLeadingMedia}
                    >
                      {option.leading}
                    </span>
                  ) : null}
                  <span className="min-w-0 truncate">{option.label}</span>
                  <button
                    type="button"
                    data-slot="multi-select-tag-remove"
                    disabled={disabled}
                    onClick={() => remove(option.value)}
                    className={cn(
                      fieldIconButton,
                      "transition-[color,background-color,scale] duration-spring-press ease-spring-press"
                    )}
                  >
                    <XIcon aria-hidden="true" />
                    <span className="sr-only">Remove {option.label}</span>
                  </button>
                </li>
              ))}
              {overflowCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <li
                      data-slot="multi-select-overflow"
                      className="inline-flex h-7 shrink-0 items-center rounded-full bg-secondary px-2.5 text-caption font-medium tabular-nums text-muted-foreground group-data-[size=sm]/multi-select:h-6 group-data-[size=sm]/multi-select:px-2"
                    >
                      <span aria-hidden="true">+{overflowCount}</span>
                      {/* The hidden labels are spelled out here as well as in
                          the tooltip — the pill is not a focus stop, so a
                          hover-only affordance would leave them unreachable. */}
                      <span className="sr-only">
                        {overflowCount} more selected: {hiddenLabels}
                      </span>
                    </li>
                  </TooltipTrigger>
                  <TooltipContent>{hiddenLabels}</TooltipContent>
                </Tooltip>
              )}
            </ul>
          )}

          <PopoverTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              role="combobox"
              id={id}
              data-slot="multi-select-trigger"
              aria-expanded={open}
              aria-invalid={ariaInvalid}
              aria-label={ariaLabelledby ? undefined : triggerLabel}
              aria-labelledby={ariaLabelledby}
              disabled={disabled}
              onKeyDown={(event) => {
                /* Backspace peels off the last tag, the way a tag input does. */
                if (event.key === "Backspace" && selected.length > 0) {
                  event.preventDefault()
                  commit(selected.slice(0, -1))
                }
              }}
              className="group/multi-select-trigger flex h-7 min-w-16 flex-1 items-center gap-2 bg-transparent px-2 text-left outline-none group-data-[size=sm]/multi-select:h-6 disabled:cursor-not-allowed"
            >
              {selectedOptions.length === 0 ? (
                <span className="min-w-0 truncate text-muted-foreground">
                  {placeholder}
                </span>
              ) : null}
              <ChevronDownIcon
                aria-hidden="true"
                /* One chevron that turns: a half turn lands exactly on the up
                   chevron, so the resting shape is unchanged in both states and
                   only the change between them is animated. */
                className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-spring-press ease-spring-press group-aria-expanded/multi-select-trigger:rotate-180"
              />
            </button>
          </PopoverTrigger>

          {/* Trails the trigger rather than sitting inside it: the trigger is
              the role="combobox", and a button nested in a combobox is a
              nested-interactive violation. That puts it after the chevron,
              which is the price of keeping the chevron clickable. */}
          {clearable && selectedOptions.length > 0 ? (
            <button
              type="button"
              data-slot="multi-select-clear"
              disabled={disabled}
              onClick={clearAll}
              className={cn(
                fieldIconButton,
                "transition-all duration-fast ease-out-expo active:duration-spring-press active:ease-spring-press"
              )}
            >
              <XIcon aria-hidden="true" />
              <span className="sr-only">{clearAllLabel}</span>
            </button>
          ) : null}
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-(--radix-popover-trigger-width) min-w-52 p-0"
        onOpenAutoFocus={(event) => {
          /* With no search box there is no tabbable child, so focus lands on
             the popover itself — one level above Command, where cmdk's keydown
             handler never sees the arrow keys. Put it on Command instead. */
          if (!showSearch) {
            event.preventDefault()
            commandRef.current?.focus()
          }
        }}
        onInteractOutside={(event) => {
          /* Dismissing a tag, or clearing the field, is a field interaction and
             not an outside click — keep the list open so several can be dropped
             in a row. */
          const target = event.target as HTMLElement | null
          if (
            target?.closest(
              "[data-slot='multi-select-tag-remove'],[data-slot='multi-select-clear']"
            )
          ) {
            event.preventDefault()
          }
        }}
      >
        <Command
          ref={commandRef}
          tabIndex={showSearch ? undefined : -1}
          className="rounded-[18px]! outline-none"
        >
          {showSearch ? (
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
          ) : null}
          <CommandList>
            {showSelectAll && allOptions.length > 0 ? (
              <>
                {/* Rows, not a footer: a footer sits outside the listbox, so
                    the roving focus arrow keys drive never reaches it.
                    forceMount keeps them present while a query filters the
                    list — they are the answer to the query, not a match for
                    it. */}
                <CommandGroup forceMount value={ACTIONS_GROUP_VALUE}>
                  <CommandItem
                    forceMount
                    value={SELECT_ALL_VALUE}
                    onSelect={selectAll}
                    disabled={
                      selectableMatches.length === 0 ||
                      allMatchingSelected ||
                      atCap
                    }
                    data-checked={allMatchingSelected}
                    className={checkedTick}
                  >
                    <span className="min-w-0 truncate">{selectAllLabel}</span>
                  </CommandItem>
                  {selected.length > 0 ? (
                    <CommandItem
                      forceMount
                      value={CLEAR_VALUE}
                      onSelect={() => commit([])}
                    >
                      <span className="min-w-0 truncate">{clearLabel}</span>
                    </CommandItem>
                  ) : null}
                </CommandGroup>
                <CommandSeparator alwaysRender className="my-1" />
              </>
            ) : null}

            <CommandEmpty>{emptyMessage}</CommandEmpty>

            {groups.map((group, groupIndex) => (
              <CommandGroup
                key={`${groupIndex}-${group.label}`}
                /* Explicit and unique: cmdk re-sorts groups during a search by
                   looking each one up through its data-value, and that value
                   otherwise falls back to the heading — or, for an unlabelled
                   group, to its own text. Two groups sharing a heading would
                   then chase the same element. */
                value={`${groupIndex}-${group.label}`}
                heading={group.label || undefined}
              >
                {group.options.map((option, optionIndex) => {
                  const isSelected = selected.includes(option.value)
                  const descriptionId = option.description
                    ? `${descriptionBaseId}-${groupIndex}-${optionIndex}`
                    : undefined
                  return (
                    <CommandItem
                      key={option.value}
                      /* cmdk filters and de-duplicates on `value`, so the id
                         carries it — two groups sharing a label is normal, two
                         groups sharing an id is not. The label rides along as a
                         keyword, which is what the search actually matches. */
                      value={option.value}
                      keywords={keywordsByValue.get(option.value)}
                      onSelect={() => toggle(option.value)}
                      /* The cap disables what has not been picked yet and
                         leaves what has, so a full field can still be emptied
                         from the list. */
                      disabled={option.disabled || (!isSelected && atCap)}
                      aria-describedby={descriptionId}
                      /* data-checked reveals CommandItem's own check mark;
                         aria-checked is what actually announces the state. */
                      data-checked={isSelected}
                      aria-checked={isSelected}
                      className={cn(checkedTick, option.description && "py-2.5")}
                    >
                      {option.leading ? (
                        <span
                          data-slot="multi-select-option-leading"
                          aria-hidden="true"
                          className={optionLeadingMedia}
                        >
                          {option.leading}
                        </span>
                      ) : null}
                      {option.description ? (
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate">{option.label}</span>
                          {/* Described-by, never part of the name: folding it
                              into the label would have every row announce as
                              "Engineering 12 users". */}
                          <span
                            id={descriptionId}
                            className="truncate text-sm text-muted-foreground"
                          >
                            {option.description}
                          </span>
                        </span>
                      ) : (
                        <span className="min-w-0 truncate">{option.label}</span>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>

          {capMessage !== undefined ? (
            /* Rendered whenever a cap exists and left empty until it bites, so
               the live region is already in the accessibility tree when the
               text arrives — a region that mounts with its message is the one
               screen readers stay silent about. */
            <div
              role="status"
              aria-live="polite"
              data-slot="multi-select-cap"
              className="px-2.5 py-1.5 text-sm text-muted-foreground empty:hidden"
            >
              {atCap ? capMessage : null}
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { MultiSelect, multiSelectVariants }
export type {
  MultiSelectGroup,
  MultiSelectItems,
  MultiSelectOption,
  MultiSelectProps,
}
