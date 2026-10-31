"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "../../lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

/* Three shapes for the same machinery. `pill` is the original — a filled track
   with a fully-round indicator. `underline` drops the track so the triggers sit
   on the page and the indicator becomes a bar on the active trigger's edge.
   `segment` keeps the fill, squares it back to the surface radius and tightens
   the inset, so it reads as a segmented control. */
const tabsListVariants = cva(
  "group/tabs-list relative inline-flex w-fit items-center justify-center text-muted-foreground group-data-horizontal/tabs:h-11 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        pill: "rounded-full bg-secondary p-1",
        underline: "gap-1 bg-transparent p-0",
        segment: "rounded-lg bg-secondary p-0.5",
      },
    },
    defaultVariants: {
      variant: "pill",
    },
  }
)

/* Reads the --indicator-* custom properties TabsList measures onto itself, so
   the measurement stays one generic border-box for every variant.

   The two filled variants consume all four values. The underline consumes three
   and substitutes a fixed bar thickness for the fourth: it takes the measured
   height only to find the trigger's far edge, then backs its own thickness off
   that edge — half a spacing step, the same quantity the thickness utility
   resolves to — so width and x travel while the bar never changes thickness.
   Vertical lists mirror the pair: the bar takes the trailing edge, height
   travels, and the thickness moves onto the other axis.
   Both orientations are written out rather than overridden, because the
   orientation variants resolve inside :where() and would otherwise tie with an
   unscoped utility on specificity. */
const tabsIndicatorVariants = cva(
  "pointer-events-none absolute top-0 left-0 z-0 opacity-[var(--indicator-o,0)]",
  {
    variants: {
      variant: {
        pill: "h-[var(--indicator-h,0px)] w-[var(--indicator-w,0px)] translate-x-[var(--indicator-x,0px)] translate-y-[var(--indicator-y,0px)] rounded-full bg-card shadow-xs dark:border dark:border-input dark:bg-input/30",
        underline:
          "rounded-full bg-selected group-data-horizontal/tabs:h-0.5 group-data-horizontal/tabs:w-[var(--indicator-w,0px)] group-data-horizontal/tabs:translate-x-[var(--indicator-x,0px)] group-data-horizontal/tabs:translate-y-[calc(var(--indicator-y,0px)+var(--indicator-h,0px)-var(--spacing)*0.5)] group-data-vertical/tabs:h-[var(--indicator-h,0px)] group-data-vertical/tabs:w-0.5 group-data-vertical/tabs:translate-x-[calc(var(--indicator-x,0px)+var(--indicator-w,0px)-var(--spacing)*0.5)] group-data-vertical/tabs:translate-y-[var(--indicator-y,0px)]",
        segment:
          "h-[var(--indicator-h,0px)] w-[var(--indicator-w,0px)] translate-x-[var(--indicator-x,0px)] translate-y-[var(--indicator-y,0px)] rounded-md bg-card shadow-xs dark:border dark:border-input dark:bg-input/30",
      },
    },
    defaultVariants: {
      variant: "pill",
    },
  }
)

const TRAVEL_PROPERTIES = [
  "--travel-dx",
  "--travel-dy",
  "--travel-dir-x",
  "--travel-dir-y",
  "--travel-squash-x",
  "--travel-squash-y",
] as const

/* The inputs `travel-slide` asks for, for a journey from wherever the indicator
   visibly is to the rest it is about to be given. The keyframes read the rest
   back off the element's own translate, so only the offset has to be handed
   in — but it has to be measured against the same rest the variant classes
   will compute: the trigger's corner for the filled variants, and for the
   underline the bar's own thickness backed off the far edge. That thickness
   is read off the bar rather than restated, so it follows the class.

   The squash takes a fixed 4px along the axis of travel and leaves the cross
   axis alone, per the keyframes' note: the Switch's 0.9 is 2.2px off a knob
   but 9px off a 90px pill. Direction is set on the travel axis only; a wrapped
   row may also move the other way, and that part simply glides. */
function measureTravel(
  indicator: HTMLElement,
  list: HTMLElement,
  variant: TabsListVariant,
  x: number,
  y: number,
  w: number,
  h: number
): Record<(typeof TRAVEL_PROPERTIES)[number], string> {
  /* The orientation the classes key off — Tabs' own data-orientation — not
     the list's aria-orientation, which Radix derives from a prop Tabs does
     not forward and so reads "horizontal" in a vertical list. */
  const vertical =
    (list.closest('[data-slot="tabs"]')?.getAttribute("data-orientation") ??
      list.getAttribute("aria-orientation")) === "vertical"
  const underline = variant === "underline"
  const [fromX = 0, fromY = 0] = getComputedStyle(indicator)
    .translate.split(" ")
    .map((part) => parseFloat(part) || 0)
  const restX = underline && vertical ? x + w - indicator.offsetWidth : x
  const restY = underline && !vertical ? y + h - indicator.offsetHeight : y
  const dx = fromX - restX
  const dy = fromY - restY
  const squash = (size: number) => (size > 8 ? `${1 - 4 / size}` : "1")
  return {
    "--travel-dx": `${dx}px`,
    "--travel-dy": `${dy}px`,
    "--travel-dir-x": vertical ? "0" : `${Math.sign(-dx)}`,
    "--travel-dir-y": vertical ? `${Math.sign(-dy)}` : "0",
    "--travel-squash-x": vertical ? "1" : squash(w),
    "--travel-squash-y": vertical ? squash(h) : "1",
  }
}

/* Drops the travel flag and its inputs once the keyframes stop. Bound to
   `animationcancel` as well as `animationend`: an indicator hidden mid-flight
   without unmounting (a `display:none` ancestor, a force-mounted panel) gets
   no end event, and a flag left set would replay the journey the next time it
   is shown. React has no animation-cancel prop, so both are native listeners. */
function settleTravel(event: AnimationEvent) {
  const indicator = event.currentTarget
  if (event.target !== indicator || !(indicator instanceof HTMLElement)) return
  indicator.removeAttribute("data-travelling")
  for (const name of TRAVEL_PROPERTIES) {
    indicator.style.removeProperty(name)
  }
}

type TabsListVariant = VariantProps<typeof tabsListVariants>["variant"]

function TabsList({
  className,
  variant = "pill",
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const indicatorRef = React.useRef<HTMLSpanElement>(null)
  /* Gates the travel transition until the indicator has been placed once, so it
     settles onto the active tab on mount instead of gliding in from the edge. */
  const [measured, setMeasured] = React.useState(false)

  React.useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return

    let placed = false
    /* The trigger the indicator last sat under. Travel is armed only when this
       changes: a reflow re-places the indicator under the same trigger, and a
       resized container bouncing every tab bar on the page would be noise. */
    let settledOn: HTMLElement | null = null
    const place = () => {
      /* A hidden list — display:none on it or an ancestor — has no boxes:
         every rect reads zero, and writing those parks the indicator in the
         corner, to glide back out when the list is shown again. Leave the
         last placement standing; the ResizeObserver calls place() again when
         the list reappears. */
      if (!list.getClientRects().length) return
      const active = list.querySelector<HTMLElement>(
        '[data-slot="tabs-trigger"][data-state="active"]'
      )
      /* No tabs, or the active one unmounted — hide rather than strand the
         indicator on a position that no longer means anything. */
      if (!active) {
        list.style.setProperty("--indicator-o", "0")
        settledOn = null
        return
      }
      const l = list.getBoundingClientRect()
      const a = active.getBoundingClientRect()
      /* Rects are border boxes; an absolute child is placed against the padding
         box. Identical while the list is borderless, not if one is added. */
      const cs = getComputedStyle(list)
      const bx = parseFloat(cs.borderLeftWidth) || 0
      const by = parseFloat(cs.borderTopWidth) || 0
      const x = a.left - l.left - bx
      const y = a.top - l.top - by

      /* Measured before the new position is written: the origin is wherever
         the indicator visibly is now, which mid-flight is not its old rest. */
      const indicator = indicatorRef.current
      const travel =
        placed && indicator && settledOn && settledOn !== active
          ? measureTravel(indicator, list, variant, x, y, a.width, a.height)
          : null
      settledOn = active

      list.style.setProperty("--indicator-x", `${x}px`)
      list.style.setProperty("--indicator-y", `${y}px`)
      list.style.setProperty("--indicator-w", `${a.width}px`)
      list.style.setProperty("--indicator-h", `${a.height}px`)
      list.style.setProperty("--indicator-o", "1")

      /* Armed in the same tick as the new position, imperatively rather than
         through state: a render in between would paint a frame of the
         indicator parked on its destination before the keyframes pulled it
         back to where it came from. */
      if (indicator && travel) {
        for (const [name, value] of Object.entries(travel)) {
          indicator.style.setProperty(name, value)
        }
        if (indicator.hasAttribute("data-travelling")) {
          /* Re-targeted mid-flight. The running keyframes have already picked
             up the new endpoints and would carry on from their current
             progress, which teleports the indicator; rewinding replays the
             new journey from where it visibly is, as the Switch does. */
          for (const animation of indicator.getAnimations()) {
            if ("animationName" in animation) animation.currentTime = 0
          }
        } else {
          indicator.setAttribute("data-travelling", "")
        }
      }

      if (!placed) {
        placed = true
        /* Flush the first placement while the transition is still off — the
           class arrives next render with nothing left to animate away from. */
        void list.offsetWidth
        setMeasured(true)
      }
    }

    place()
    /* Radix flips data-state on the triggers when the value changes; childList
       catches tabs added or removed after mount. */
    const mo = new MutationObserver(place)
    mo.observe(list, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state"],
    })
    /* Reflow — wrapping, a font swap, a resized container — moves the target. */
    const ro = new ResizeObserver(place)
    ro.observe(list)
    const indicator = indicatorRef.current
    indicator?.addEventListener("animationend", settleTravel)
    indicator?.addEventListener("animationcancel", settleTravel)
    return () => {
      mo.disconnect()
      ro.disconnect()
      indicator?.removeEventListener("animationend", settleTravel)
      indicator?.removeEventListener("animationcancel", settleTravel)
    }
    /* Swapping variant re-pads the list, so the trigger boxes move under it. */
  }, [variant])

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      <span
        ref={indicatorRef}
        data-slot="tabs-indicator"
        aria-hidden="true"
        className={cn(
          tabsIndicatorVariants({ variant }),
          /* The one travelling indicator in the system that should settle with
             a little life rather than snap: it moves between two known tabs,
             so the overshoot reads as momentum, not imprecision.

             A change the user makes runs the Switch's travel instead —
             `travel-slide` on `translate`, its squish on `scale` — armed by
             place() above and dropped by settleTravel, so nothing bounces on
             mount and a reflow never does. The transition stays for what the
             flag cannot see: resizes, a width that changes between tabs, and
             a controlled value set from elsewhere. `translate` comes off the
             list while travelling: the position write that arms the keyframes
             would otherwise be a transition trigger too, and transitions sit
             above animations in the cascade. Chrome declines to start one on
             a property a CSS animation holds; the class makes that explicit
             rather than leaving it to the engine. */
          measured &&
            "transition-[translate,width,height] duration-spring-overshoot ease-spring-overshoot data-travelling:animate-travel-slide data-travelling:transition-[width,height]"
        )}
      />
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-full border border-transparent px-5 py-0.5 text-body font-medium whitespace-nowrap text-foreground/70 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        /* Active label on the filled variants: it sits on a raised surface, so
           it takes full-strength ink. */
        "data-active:text-foreground dark:data-active:text-foreground",
        /* Follow the container's corner, so the focus ring traces the same
           shape the indicator does. */
        "group-data-[variant=segment]/tabs-list:rounded-md",
        /* Squeeze under the finger, on the press spring. Squeeze only: Tabs
           activates on pointerdown, so by the time the press registers the
           indicator is already on its way and a lean would point back the way
           it came.
           The trigger's contents squeeze, never the trigger: triggers are
           flex-1, so a full-width tab is a full-width row, and --press-scale
           on it would shrink the box and its focus ring inside an indicator
           that does not shrink. CSS cannot scale a bare text node, so text
           children are wrapped in a span below — a flex item either way, so
           nothing moves at rest. The timing sits in :where() so a child that
           brings its own transition keeps it. */
        "[:where(&)>*]:[transition:scale_var(--duration-spring-press)_var(--ease-spring-press)] active:[&>*]:scale-(--press-squeeze)",
        /* Underline has no surface under the label — the bar and the label carry
           the selection together, both in --selected. */
        "group-data-[variant=underline]/tabs-list:data-active:text-selected dark:group-data-[variant=underline]/tabs-list:data-active:text-selected",
        className
      )}
      {...props}
    >
      {/* asChild hands its one element to Slot untouched. */}
      {props.asChild ? children : React.Children.map(children, labelElement)}
    </TabsPrimitive.Trigger>
  )
}

/* Text gets an element to squeeze; everything else passes through. Bare
   whitespace stays bare — flex layout drops it, and a span around it would
   take a gap slot. */
function labelElement(child: React.ReactNode) {
  if (typeof child === "number" || (typeof child === "string" && child.trim())) {
    return <span>{child}</span>
  }
  return child
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 text-sm outline-none",
        /* Inactive panels stay mounted and hidden, so there is only ever an
           enter to write — a short rise that lands as the indicator arrives. */
        "data-active:animate-in data-active:fade-in-0 data-active:slide-in-from-bottom-[4px] data-active:anim-base data-active:ease-out-expo",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
