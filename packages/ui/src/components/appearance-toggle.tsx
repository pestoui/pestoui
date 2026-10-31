"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group"

/* The light/dark pair as it appears on an "Appearance" row — inside a profile
   menu, a settings sheet, a topbar — rather than as a standalone page control.
 *
 * It reports intent and nothing else: no `documentElement.classList` write, no
 * storage, no `prefers-color-scheme` read. The caller owns the theme. A control
 * that mutates global state on click can only exist once per app — it cannot be
 * rendered twice on a page, cannot be previewed inside docs, and cannot be
 * driven by a store it has never heard of.
 *
 * Behaviour is `ToggleGroup type="single"` rather than two buttons carrying an
 * `aria-pressed` each, because the group already *is* a real radio group: Radix
 * puts `role="radiogroup"` on the root and `role="radio"` + `aria-checked` on
 * each segment, and roving focus collapses the pair into one tab stop with the
 * arrow keys moving between them. That is the right model for a choice of
 * exactly one, and the keyboard half is the expensive half to rebuild. Only the
 * skin is replaced below. */

type AppearanceToggleValue = "light" | "dark"

/* The raised pill is the entire affordance, so the selected fill has to sit a
   step *lighter* than the track — and no single token spells that in both
   modes. `--card` is the lightest surface in light mode but falls below
   `--secondary` in dark, where `--accent` is the step above it; painting both
   from `--card` would render the selected segment as a recess on a dark canvas.
   The elevation shadow is no help there either, since every `--shadow-*` ink is
   a warm near-black at 5%, so the lightness step is what has to carry it.

   The track keeps the group's own radius rather than restating it, so the
   segment radius is calibrated against it: an 11px groove insetting its
   contents by 2px wants a 9px inner corner, or the pill reads as pressing
   against the wall. `rounded-sm` is 9.6px, and it covers `sm` too — the group
   already hands that size a 9px item, which is within a hair of the same
   answer, so one token serves both instead of two.

   The paired hover rules exist because `toggleVariants` ships `hover:bg-accent`
   at the same specificity as `data-[state=on]:bg-card` — a tie is settled by
   stylesheet order, so the selected pill pins its own hover fill rather than
   leaving the winner to chance. */
const appearanceToggleSegmentVariants = cva(
  "rounded-sm px-0 text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs data-[state=on]:hover:bg-card dark:data-[state=on]:bg-accent dark:data-[state=on]:hover:bg-accent",
  {
    variants: {
      /* Wider than tall, so two of them read as one control instead of as two
         icon buttons sitting next to each other. Both heights undercut the
         group's own — 40px and 36px are page-control sizes, and a menu line
         cannot spend either. */
      size: {
        sm: "h-7 w-9 min-w-9",
        default: "h-8 w-10 min-w-10",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

type AppearanceToggleSize = NonNullable<
  VariantProps<typeof appearanceToggleSegmentVariants>["size"]
>

/* `dir` is dropped because the group narrows it to `"ltr" | "rtl"` while the
   div attribute is a bare string; direction comes from Radix's
   `DirectionProvider` or an ancestor instead. */
type AppearanceToggleProps = Omit<
  React.ComponentProps<"div">,
  "children" | "defaultValue" | "dir" | "onChange"
> &
  VariantProps<typeof appearanceToggleSegmentVariants> & {
    /** Controlled selection. */
    value?: AppearanceToggleValue
    /** Uncontrolled starting selection. */
    defaultValue?: AppearanceToggleValue
    onValueChange?: (value: AppearanceToggleValue) => void
    /** Accessible name for the radio group itself. */
    srLabel?: string
    /** Accessible name for the light segment, which renders icon-only. */
    lightSrLabel?: string
    /** Accessible name for the dark segment, which renders icon-only. */
    darkSrLabel?: string
  }

/* The Switch's travel, for the pill. At rest the pill IS the selected
   segment's own fill, and nothing below exists. During a change made here, a
   stand-in pill is drawn on the track's `::before`, the segments' own fills
   are hidden, and the stand-in runs `travel-slide` — overshoot, settle and the
   arrival squish — from the old segment to the new one. On animationend the
   flag drops and the real fill is back under it on the same pixel.

   Every class is gated on `data-travelling`. An ungated `before:` utility
   emits `content`, which would create the pseudo-element on every instance at
   rest.

   Nothing about the journey is assumed; handleValueChange measures it (see
   measureTravel). The stand-in is anchored on the light segment, so its rest
   is `--appearance-x`: the destination segment's offset from that one, read
   off the laid-out segments. That follows the segment width, the gap and any
   `className` override of either, and it carries its own sign — in RTL the
   dark segment lays out to the left of light and the offset comes back
   negative — so no direction selector exists here at all. Both candidates
   were wrong: the production build rewrites `:dir()` into a `:lang()` list
   that ignores `dir="rtl"` on an English page, and an ancestor `[dir=rtl]`
   misses twice over, because Radix writes the resolved `dir` onto the group
   itself — `ltr` under an RTL page with no DirectionProvider, so the row lays
   out left to right while the ancestor selector flips the sign, and `rtl`
   from a provider with no ancestor attribute to match. Measured, the layout
   is the only source that is right in both.

   The start is wherever the pill visibly is: the fill, including any press
   lean it is still carrying, or the stand-in itself when the change reverses
   a journey half run.

   `translate-y-0` looks redundant and is not. `travel-slide` adds to
   --tw-translate-y, whose registered initial value is a unitless 0, and
   `calc(0 + 0px)` is invalid — measured, the whole `translate` computed to
   `none` and the pill never left its slot. Placing it on both axes hands the
   keyframes a length. */
const appearanceToggleTravel = [
  "data-travelling:relative",
  "data-travelling:before:absolute data-travelling:before:start-0.5 data-travelling:before:top-0.5 data-travelling:before:h-8 data-travelling:before:w-10 data-travelling:before:rounded-sm data-travelling:before:bg-card data-travelling:before:shadow-xs data-travelling:data-[size=sm]:before:h-7 data-travelling:data-[size=sm]:before:w-9 dark:data-travelling:before:bg-accent",
  "data-travelling:before:translate-y-0 data-travelling:before:translate-x-(--appearance-x) data-travelling:before:animate-travel-slide",
].join(" ")

/* Written inline on the root for one journey and removed when it ends. */
const TRAVEL_PROPERTIES = ["--appearance-x", "--travel-dx", "--travel-dir-x"] as const

/* The x of a computed translate, in px. Off a pseudo-element that does not
   exist, or an element at rest, it reads `none`. */
function translateX(style: CSSStyleDeclaration) {
  return parseFloat(style.translate.split(" ")[0]) || 0
}

/* The inputs `travel-slide` needs to carry the pill from where it visibly is
   to `to`, as tabs measures its indicator. Positions are box centres — a
   centred press squeeze moves an edge but never the centre — with each
   segment's own translate backed out where a rest is wanted, and left in
   where the visible fill is. The keyframes read the rest back off the
   stand-in's translate, so --travel-dx is origin minus rest. Measured before
   anything is written: mid-flight, the origin is the stand-in's animated
   translate, not either end of the track. */
function measureTravel(
  root: HTMLElement,
  from: AppearanceToggleValue,
  to: AppearanceToggleValue
): Record<(typeof TRAVEL_PROPERTIES)[number], string> | null {
  const [light, dark] = root.querySelectorAll<HTMLElement>(
    '[data-slot="toggle-group-item"]'
  )
  if (!light || !dark) return null
  const centre = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    return r.left + r.width / 2
  }
  const rest = (el: HTMLElement) => centre(el) - translateX(getComputedStyle(el))
  const anchor = rest(light)
  const restX = rest(to === "light" ? light : dark) - anchor
  const fromX = root.hasAttribute("data-travelling")
    ? translateX(getComputedStyle(root, "::before"))
    : centre(from === "light" ? light : dark) - anchor
  const dx = fromX - restX
  return {
    "--appearance-x": `${restX}px`,
    "--travel-dx": `${dx}px`,
    "--travel-dir-x": `${Math.sign(-dx)}`,
  }
}

/* The segments step aside for the stand-in while it travels: positioned, so
   they paint above an absolute `::before`, and with their fill and shadow
   hidden. The fill is hidden by clipping it to text — of which an icon-only
   segment has none — rather than by `bg-transparent`, because
   `background-clip` is not transitioned and `background-color` is: a
   transparent swap would fade the old fill out as a ghost behind the departing
   pill, and fade the new one in under the pill's last frame. The icon colour
   still flips at once, so the state answers before the pill arrives. */
const appearanceToggleSegmentTravel =
  "group-data-travelling/toggle-group:relative group-data-travelling/toggle-group:bg-clip-text group-data-travelling/toggle-group:shadow-none!"

function AppearanceToggle({
  className,
  size = "default",
  value,
  defaultValue = "light",
  onValueChange,
  onAnimationEnd,
  ref,
  srLabel = "Appearance",
  lightSrLabel = "Light",
  darkSrLabel = "Dark",
  ...props
}: AppearanceToggleProps) {
  const [uncontrolled, setUncontrolled] =
    React.useState<AppearanceToggleValue>(defaultValue)
  const current = value ?? uncontrolled

  /* Where the pill is travelling to, armed only by a change made through this
     control — never on mount, and never for a `value` changed from outside,
     which swaps instantly as it always has. If a controlled consumer declines
     the change, the arm is dropped rather than left to fire on some later,
     unrelated value change. */
  const [travelling, setTravelling] = React.useState<AppearanceToggleValue>()
  if (travelling !== undefined && travelling !== current) {
    setTravelling(undefined)
  }

  const root = React.useRef<HTMLDivElement>(null)
  /* Returns a cleanup, so React 19 calls that on detach instead of calling
     this with null — which means the cleanup has to do everything a null call
     would have: drop our own handle, then release the consumer's, either
     through the cleanup their ref returned or with the null it would
     otherwise have been given.

     It also carries the `animationcancel` listener, which React has no prop
     for. A part hidden mid-journey without unmounting (`display: none`, a
     `forceMount` container) reports only that, never `animationend`; left
     armed, it would replay the travel the next time it is shown. */
  const setRoot = React.useCallback(
    (node: HTMLDivElement | null) => {
      root.current = node
      const cancelTravel = (event: AnimationEvent) => {
        if (event.target === node && event.pseudoElement === "::before") {
          setTravelling(undefined)
        }
      }
      node?.addEventListener("animationcancel", cancelTravel)
      const consumerCleanup = typeof ref === "function" ? ref(node) : undefined
      if (ref && typeof ref !== "function") ref.current = node
      return () => {
        node?.removeEventListener("animationcancel", cancelTravel)
        root.current = null
        if (typeof consumerCleanup === "function") consumerCleanup()
        else if (typeof ref === "function") ref(null)
        else if (ref) ref.current = null
      }
    },
    [ref]
  )

  /* The measured journey lives inline on the root only while it runs. Every
     commit at rest clears it, which covers a journey that ended, one that was
     cancelled, and an arm a controlled consumer declined before it painted. */
  React.useLayoutEffect(() => {
    const node = root.current
    if (travelling !== undefined || !node) return
    for (const name of TRAVEL_PROPERTIES) node.style.removeProperty(name)
  })

  /* A single-selection ToggleGroup is deselectable by design — pressing the
     active segment reports `""`. There is no "no appearance", so the empty
     value is swallowed rather than forwarded, which is also why the group is
     always driven as controlled from here even when the consumer left it
     uncontrolled. */
  const handleValueChange = (next: string) => {
    if (next !== "light" && next !== "dark") return
    const node = root.current
    const travel = next !== current && node ? measureTravel(node, current, next) : null
    if (node && travel) {
      /* Written here rather than through render, so the journey and its rest
         change in the same tick as the measurement they came from. */
      for (const [name, measured] of Object.entries(travel)) {
        node.style.setProperty(name, measured)
      }
      /* Switched back mid-journey: rewind the running keyframes, as the
         Switch does, so they replay from the 0% stop — which the measurement
         just put on the pill's current pixel — instead of carrying their
         progress over to the new endpoints. */
      for (const animation of node.getAnimations({ subtree: true })) {
        if (
          "animationName" in animation &&
          animation.effect instanceof KeyframeEffect &&
          animation.effect.pseudoElement === "::before"
        ) {
          animation.currentTime = 0
        }
      }
      setTravelling(next)
    }
    if (value === undefined) setUncontrolled(next)
    onValueChange?.(next)
  }

  const segmentClassName = cn(
    appearanceToggleSegmentVariants({ size }),
    appearanceToggleSegmentTravel
  )

  return (
    <ToggleGroup
      data-slot="appearance-toggle"
      data-travelling={travelling}
      ref={setRoot}
      onAnimationEnd={(event) => {
        if (
          event.target === event.currentTarget &&
          event.nativeEvent.pseudoElement === "::before"
        ) {
          setTravelling(undefined)
        }
        onAnimationEnd?.(event)
      }}
      type="single"
      /* Forwarded so the group emits one `data-size` on the root for
         descendants, and so its own per-size icon sizing lands on the
         segments. The track radius is deliberately left to it. */
      size={size}
      /* 2px between segments. Also what keeps the group's `data-[spacing=0]`
         flush treatment — square middles, 16px outer corners — from firing on
         a control that wants neither. */
      spacing={0.5}
      value={current}
      onValueChange={handleValueChange}
      aria-label={srLabel}
      className={cn("bg-secondary p-0.5", appearanceToggleTravel, className)}
      {...props}
    >
      <ToggleGroupItem
        value="light"
        aria-label={lightSrLabel}
        className={segmentClassName}
      >
        <Sun aria-hidden="true" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="dark"
        aria-label={darkSrLabel}
        className={segmentClassName}
      >
        <Moon aria-hidden="true" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

export { AppearanceToggle, appearanceToggleSegmentVariants }
export type { AppearanceToggleProps, AppearanceToggleSize, AppearanceToggleValue }
