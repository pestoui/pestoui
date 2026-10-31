"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"
import { Input } from "./input"
import { CheckIcon, PlusIcon } from "lucide-react"

/* The palette is *content*, not theme. These literals are the values the picker
   offers; they only ever reach the DOM through `style`, never as a class. Every
   piece of chrome around them stays on the token utilities. */
const DEFAULT_COLORS = [
  "#1c1917",
  "#78716c",
  "#d6d3d1",
  "#ffffff",
  "#dc2626",
  "#f97316",
  "#f59e0b",
  "#16a34a",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
]

const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/* Returns the six-digit form of a hex string, or null when the string is not a
   hex colour at all. Every parse in this file funnels through here so a
   half-typed value can be ignored instead of thrown. */
function toHex6(value: string) {
  const hex = value.trim().toLowerCase()
  if (!HEX_PATTERN.test(hex)) return null
  if (hex.length === 7) return hex
  return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
}

function sameColor(a: string, b: string) {
  return (
    (toHex6(a) ?? a.trim().toLowerCase()) ===
    (toHex6(b) ?? b.trim().toLowerCase())
  )
}

/* How many chips sit in the first row — measured off the DOM so the roving grid
   follows however the swatches actually wrapped at this width. */
function columnsOf(items: HTMLElement[]) {
  if (items.length === 0) return 1
  const top = items[0].offsetTop
  let columns = 1
  while (columns < items.length && items[columns].offsetTop === top) {
    columns += 1
  }
  return columns
}

const colorSwatchVariants = cva(
  "group/color-swatch relative inline-flex shrink-0 items-center justify-center bg-clip-padding align-middle transition-all duration-spring-press ease-spring-press outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      /* Explicit radii — a token radius on a box this small exceeds half the
         width and collapses the squircle into a circle. */
      size: {
        sm: "size-7 rounded-[9px]",
        default: "size-9 rounded-[11px]",
        lg: "size-11 rounded-[14px]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

/* Selection ring — drawn outside the chip so it survives on any fill, and left
   to the selected accent alone: it is the one accent that means "selected". It
   takes --selected rather than --primary, because a two-pixel ring is a
   thin graphic and has to clear the indicator contrast bar against both the
   card behind it and the chip it wraps. Radii are the chip radius plus the
   offset so the squircle stays a squircle.

   It grows the last few percent into place on the press spring and leaves on the
   short tween. The unselected state is the ring's own from- *and* to-value, so
   the travel cannot differ between the two directions the way a keyframe pair's
   can; the asymmetry is carried by the duration and the curve instead. Both
   resting states are pixel-identical to before — the resting ring is at scale 1,
   and the one that is scaled down is at zero opacity. */
function SwatchRing() {
  return (
    <span
      aria-hidden="true"
      data-slot="color-swatch-ring"
      className="pointer-events-none absolute inset-[-3px] scale-95 rounded-[14px] opacity-0 ring-2 ring-selected transition-[opacity,scale] duration-exit ease-out-expo group-data-[size=lg]/color-swatch:rounded-[17px] group-data-[size=sm]/color-swatch:inset-[-2px] group-data-[size=sm]/color-swatch:rounded-[11px] group-data-[selected=true]/color-swatch:scale-100 group-data-[selected=true]/color-swatch:opacity-100 group-data-[selected=true]/color-swatch:duration-spring-press group-data-[selected=true]/color-swatch:ease-spring-press"
    />
  )
}

/* The check rides on an accent disc rather than sitting bare on the fill: a
   plain glyph disappears on white in one direction and on black in the other,
   and no token pair flips independently of the theme. The disc stays on the
   --selected fill with --selected-foreground on the glyph — a genuine filled
   area, which is the pairing that keeps the mark legible on every swatch.

   The disc materialises rather than switching on: it resolves out of a blur as
   it lands, which is what makes a small mark read as arriving on top of the fill
   instead of being revealed by it. Blur is enter-only and always resolves to 0 —
   the selected state is the same pixels it was before. */
function SwatchCheck() {
  return (
    <span
      aria-hidden="true"
      data-slot="color-swatch-check"
      className="pointer-events-none relative flex size-5 scale-50 items-center justify-center rounded-full bg-selected text-selected-foreground opacity-0 blur-xs shadow-tile transition-[opacity,scale,filter] duration-exit ease-out-expo group-data-[size=lg]/color-swatch:size-6 group-data-[size=sm]/color-swatch:size-4 group-data-[selected=true]/color-swatch:scale-100 group-data-[selected=true]/color-swatch:opacity-100 group-data-[selected=true]/color-swatch:blur-none group-data-[selected=true]/color-swatch:duration-spring-press group-data-[selected=true]/color-swatch:ease-spring-press"
    >
      <CheckIcon
        strokeWidth={3}
        className="size-3 group-data-[size=lg]/color-swatch:size-3.5 group-data-[size=sm]/color-swatch:size-2.5"
      />
    </span>
  )
}

type ColorSwatchProps = Omit<
  React.ComponentProps<"button">,
  "color" | "onSelect"
> &
  VariantProps<typeof colorSwatchVariants> & {
    color: string
    selected?: boolean
    onSelect?: (color: string) => void
    label?: string
  }

function ColorSwatch({
  className,
  color,
  selected = false,
  onSelect,
  onClick,
  size = "default",
  label,
  style,
  ...props
}: ColorSwatchProps) {
  const resolvedSize = size ?? "default"

  return (
    <button
      type="button"
      data-slot="color-swatch"
      data-size={resolvedSize}
      data-selected={selected}
      aria-pressed={selected}
      aria-label={label ?? color}
      title={label ?? color}
      style={{ backgroundColor: color, ...style }}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) onSelect?.(color)
      }}
      className={cn(
        colorSwatchVariants({ size: resolvedSize }),
        /* Hairline sits *inside* the chip so white and pale fills keep an edge
           on the light card. --foreground flips with the theme, so the same
           pair reads on the dark card too. */
        "inset-ring-1 inset-ring-foreground/15 dark:inset-ring-foreground/25",
        className
      )}
      {...props}
    >
      <SwatchRing />
      <SwatchCheck />
    </button>
  )
}

type ColorPickerProps = Omit<
  React.ComponentProps<"div">,
  "color" | "defaultValue" | "onChange"
> & {
  value?: string
  defaultValue?: string
  onValueChange?: (hex: string) => void
  colors?: string[]
  showCustom?: boolean
  showInput?: boolean
  size?: VariantProps<typeof colorSwatchVariants>["size"]
}

function ColorPicker({
  className,
  value,
  defaultValue,
  onValueChange,
  colors = DEFAULT_COLORS,
  showCustom = true,
  showInput = false,
  size = "default",
  ...props
}: ColorPickerProps) {
  /* cva reads an explicit `null` as "no variant" and would emit a tile with no
     dimensions at all, so the size is normalised once and reused everywhere. */
  const resolvedSize = size ?? "default"

  const [internalValue, setInternalValue] = React.useState(
    () => defaultValue ?? colors[0] ?? "#000000"
  )
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null)
  const [editing, setEditing] = React.useState(false)

  const current = value ?? internalValue

  const [draft, setDraft] = React.useState(current)

  /* The field only re-syncs while it is *not* being typed into, so committing a
     shorthand hex never yanks the caret mid-edit. Blur reconciles it. */
  React.useEffect(() => {
    if (!editing) setDraft(current)
  }, [current, editing])

  const commit = React.useCallback(
    (next: string) => {
      if (value === undefined) setInternalValue(next)
      onValueChange?.(next)
    },
    [value, onValueChange]
  )

  const selectedIndex = colors.findIndex((entry) => sameColor(entry, current))
  const customSelected = showCustom && selectedIndex === -1
  const rovingIndex = Math.min(
    focusedIndex ?? Math.max(selectedIndex, 0),
    Math.max(colors.length - 1, 0)
  )

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[data-slot="color-swatch"]:not(:disabled)'
      )
    )
    const from = items.findIndex((item) => item === document.activeElement)
    if (from === -1) return

    const last = items.length - 1
    const columns = columnsOf(items)
    let next = from

    switch (event.key) {
      case "ArrowRight":
        next = Math.min(from + 1, last)
        break
      case "ArrowLeft":
        next = Math.max(from - 1, 0)
        break
      case "ArrowDown":
        next = Math.min(from + columns, last)
        break
      case "ArrowUp":
        next = Math.max(from - columns, 0)
        break
      case "Home":
        next = 0
        break
      case "End":
        next = last
        break
      default:
        return
    }

    /* Focus moves, selection does not — activation stays on Enter/Space so a
       keyboard user can survey the palette without committing to it. */
    event.preventDefault()
    items[next].focus()
  }

  function handleDraftChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value
    setDraft(next)
    const hex = toHex6(next)
    if (hex) commit(hex)
  }

  return (
    <div
      role="group"
      aria-label="Color picker"
      data-slot="color-picker"
      className={cn("flex w-full flex-col gap-3", className)}
      {...props}
    >
      <div
        data-slot="color-picker-grid"
        className="flex flex-wrap items-center gap-2"
        onKeyDown={handleKeyDown}
      >
        {colors.map((entry, index) => (
          <ColorSwatch
            key={`${entry}-${index}`}
            color={entry}
            label={entry}
            size={resolvedSize}
            selected={index === selectedIndex}
            onSelect={commit}
            tabIndex={index === rovingIndex ? 0 : -1}
            onFocus={() => setFocusedIndex(index)}
          />
        ))}

        {showCustom ? (
          /* Escape hatch. The native control is stretched over the tile at zero
             opacity so it keeps its own focus and OS picker while the tile keeps
             the house squircle. */
          <div
            data-slot="color-picker-custom"
            data-size={resolvedSize}
            data-selected={customSelected}
            style={customSelected ? { backgroundColor: current } : undefined}
            className={cn(
              colorSwatchVariants({ size: resolvedSize }),
              "text-muted-foreground has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
              /* Once a colour is showing, the tile carries no border at all:
                 the base sets bg-clip-padding, so even a transparent border
                 would clip the fill and leave a hairline of card showing
                 through. Selected state falls back to the same inside hairline
                 the palette chips use. */
              customSelected
                ? "inset-ring-1 inset-ring-foreground/15 dark:inset-ring-foreground/25"
                : "border border-dashed border-input bg-card has-[:focus-visible]:border-ring dark:bg-input/30"
            )}
          >
            <input
              type="color"
              data-slot="color-picker-custom-input"
              aria-label="Custom color"
              value={toHex6(current) ?? "#000000"}
              onChange={(event) => commit(event.target.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
            {customSelected ? (
              <>
                <SwatchRing />
                <SwatchCheck />
              </>
            ) : (
              <PlusIcon
                aria-hidden="true"
                className="pointer-events-none size-4 group-data-[size=lg]/color-swatch:size-5 group-data-[size=sm]/color-swatch:size-3.5"
              />
            )}
          </div>
        ) : null}
      </div>

      {showInput ? (
        <div data-slot="color-picker-field" className="flex items-center gap-2">
          {/* The preview crossfades to the committed value instead of cutting
              to it — the fade is what ties the field to the tile while a hex is
              being typed a character at a time. */}
          <span
            aria-hidden="true"
            data-slot="color-picker-preview"
            style={{ backgroundColor: current }}
            className="size-11 shrink-0 rounded-[14px] shadow-soft inset-ring-1 inset-ring-foreground/15 transition-colors duration-base ease-out-expo dark:inset-ring-foreground/25"
          />
          <Input
            value={draft}
            onChange={handleDraftChange}
            onFocus={() => setEditing(true)}
            onBlur={() => setEditing(false)}
            aria-label="Hex color"
            aria-invalid={draft.trim().length > 0 && toHex6(draft) === null}
            autoComplete="off"
            spellCheck={false}
            maxLength={7}
            placeholder="#rrggbb"
            className="font-mono text-body lowercase"
          />
        </div>
      ) : null}
    </div>
  )
}

export { ColorPicker, ColorSwatch, colorSwatchVariants }
