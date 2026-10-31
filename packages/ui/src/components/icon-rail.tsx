import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/* ---------------------------------------------------------------------------
   Icon rail — the narrow vertical strip of icon-only destinations that stands
   in for a sidebar when it collapses, or sits beside one as a persistent
   app-level switcher.

   Compound rather than an `items={[…]}` prop, for the same reason the rest of
   the navigation primitives are: the caller owns the interactive element. A
   rail row is a router `<Link>` in one app, an `<a>` in another and a plain
   click handler in a third, and a data prop pushes all three through a render
   callback.

   ## Why the colour axis is `surface` and not `tone`

   `tone` is a fixed contract here — `selected | success | warning |
   destructive | info | muted | chart-1…5` — and it answers "what does this
   thing mean": a status, a category, a series. Every toned component accepts
   the whole set, and accepting the whole set is what makes the word portable.

   A rail means nothing. What varies is which end of the neutral ramp it is
   painted from: a near-black strip inside a light page, or a light one that
   matches the surrounding chrome. That is two values, not eleven, and no
   member of the `tone` set would ever be a legal answer to it. Spelling that
   as `tone="dark"` would make `tone` mean something in this file that it means
   nowhere else in the system — the drift the shared contract exists to
   prevent. So the axis gets its own name and leaves `tone` alone.

   ## Tooltips are not built in

   `IconRailItem` is a real `<button>` that forwards its props and ref, so
   `<TooltipTrigger asChild>` wraps one directly. Packaging a tooltip inside
   would force a `TooltipProvider` into every rail and hand every item a second
   copy of its `srLabel` that the caller cannot turn off — and on a rail beside
   an expanded sidebar, where the labels are already on screen, that is noise.
--------------------------------------------------------------------------- */

/* The rail's width is `--rail-item` plus its own padding on both sides, so the
   two move together: at `default` 40 + 8 + 8 = 56, at `sm` 32 + 8 + 8 = 48.
   Overriding one without the other is what leaves the icons off-centre.

   The item metrics are handed down as custom properties rather than read back
   off `data-size`, so only the values that actually render ship, and an item
   composed outside a rail still has the `default` numbers as var() fallbacks.

   Radius is keyed to a ratio, not to a step: the discovered squircle ramp in
   this system is r ≈ 0.30 × edge, so a 40px box wants ~12px (`--radius-md`,
   12.8) and a 32px box wants ~9.6px (`--radius-sm`, 9.6 exactly). Holding one
   radius across both sizes would make the small rail read as noticeably
   rounder than the large one. */
const iconRailVariants = cva("group/icon-rail flex shrink-0 flex-col p-2", {
  variants: {
    surface: {
      light: "bg-card text-card-foreground ring-1 ring-border",
      /* No hairline on this one: a near-black strip against a light page is
         already its own edge, and a ring would draw a second one. */
      dark: "bg-inverse text-inverse-foreground",
    },
    size: {
      default:
        "w-14 [--rail-item:--spacing(10)] [--rail-icon:--spacing(5)] [--rail-radius:var(--radius-md)]",
      sm: "w-12 [--rail-item:--spacing(8)] [--rail-icon:--spacing(4)] [--rail-radius:var(--radius-sm)]",
    },
  },
  defaultVariants: {
    surface: "light",
    size: "default",
  },
})

type IconRailSurface = NonNullable<VariantProps<typeof iconRailVariants>["surface"]>
type IconRailSize = NonNullable<VariantProps<typeof iconRailVariants>["size"]>

type IconRailProps = React.ComponentProps<"nav"> &
  VariantProps<typeof iconRailVariants> & {
    /** Names the rail for assistive tech. Required because a rail carries no
     *  visible heading of its own, so there is nowhere else the name could
     *  come from — and a page with two unnamed `<nav>`s is a page a screen
     *  reader user cannot tell apart. */
    srLabel: string
  }

/**
 * The rail surface. Renders a `<nav>` around the item list.
 *
 * Height is left to the caller — as a flex or grid child the rail stretches on
 * its own, which is what `IconRailSpacer` needs to have room to give away.
 */
function IconRail({
  className,
  srLabel,
  surface = "light",
  size = "default",
  children,
  ...props
}: IconRailProps) {
  return (
    <nav
      data-slot="icon-rail"
      /* Emitted for descendants — the items select on `data-surface` to pick
         their palette. The rail's own classes come from the cva. */
      data-surface={surface}
      data-size={size}
      /* Declared before the spread so a caller with a visible heading can
         point `aria-labelledby` at it and win. */
      aria-label={srLabel}
      className={cn(iconRailVariants({ surface, size }), className)}
      {...props}
    >
      <ul
        data-slot="icon-rail-list"
        /* Preflight strips list-style, which drops list semantics in Safari —
           restore them explicitly, same as the activity feed does. */
        role="list"
        className="flex min-h-0 flex-1 flex-col items-center gap-1"
      >
        {children}
      </ul>
    </nav>
  )
}

type IconRailItemProps = React.ComponentProps<"button"> & {
  /** The mark. Pass the bare icon — the rail sizes it, so a wrapper with its
   *  own dimensions will fight `--rail-icon`. */
  icon: React.ReactNode
  /** The control's accessible name, and not optional: an icon-only button has
   *  no text node, no `alt` and no visible label, so without this it is
   *  announced as "button" and the rail becomes unusable. */
  srLabel: string
  /** Current destination. Paints the filled pill and sets `aria-current`. */
  active?: boolean
}

/**
 * One destination. A real `<button>`, so it is focusable, reachable by
 * keyboard and announced as a control.
 *
 * Anything passed as `children` stacks with the icon inside the pill — the
 * button is `relative`, so an absolutely positioned unread dot works without
 * a prop for it.
 */
function IconRailItem({
  className,
  icon,
  srLabel,
  active = false,
  /* A rail dropped inside a form must not submit it. Declared with a default
     rather than hardcoded so a genuine submit button can still say so. */
  type = "button",
  children,
  ...props
}: IconRailItemProps) {
  return (
    /* The `<li>` exists only to keep the list valid — a `role="list"` whose
       children are buttons reports no items at all. All props, including
       `className`, land on the button, because the button is the component. */
    <li data-slot="icon-rail-item">
      <button
        data-slot="icon-rail-button"
        type={type}
        /* `data-active` is a hook for descendants and tests; `aria-current` is
           what actually tells a screen reader which one you are on. */
        data-active={active}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex shrink-0 items-center justify-center",
          "size-[var(--rail-item,calc(var(--spacing)*10))]",
          "rounded-[var(--rail-radius,var(--radius-md))]",
          /* The highlight has to land under the cursor: this is a strip the
             user crosses constantly, and anything slower reads as lag. */
          "outline-hidden transition-colors duration-instant ease-out-expo",
          /* The press squeezes the glyph, never the button — the same split
             sidebar-nav makes. A button scaled under the pointer shrinks away
             from it: at 0.96 on 40px a press landing within 0.8px of the edge
             is released outside the box, the click goes to the common
             ancestor, and the navigation is lost. Measured in headed and
             headless Chromium, five held presses 0.5px inside the right edge:
             0 clicks of 5 with the box at 0.96, 5 of 5 with the glyph at 0.9.
             `--press-squeeze` goes to 1 under reduced motion, so the press is
             a distance that goes too. A disabled item is
             `pointer-events-none`, and measured it never matches :active, so
             it does not squeeze. */
          "[&_svg]:transition-[scale] [&_svg]:duration-spring-press [&_svg]:ease-spring-press active:[&_svg]:scale-(--press-squeeze)",
          "focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          "[&_svg]:size-[var(--rail-icon,calc(var(--spacing)*5))] [&_svg]:shrink-0",
          /* Branching instead of layering both sets and letting the cascade
             sort it out — only the state that renders ships, and the result
             does not depend on twMerge's conflict ordering.
           *
           * On the light rail the pill is `--selected`, the system's one token
           * for "this is the chosen thing". On the dark rail it is a neutral
           * wash instead: at 10–15% over the inverse surface the green is
           * invisible, and its ink barely clears 4:1 there, so the light
           * neutral is simply the strongest signal that surface has. Neither
           * reading is used for anything else on a rail, so neither is
           * ambiguous. */
          active
            ? cn(
                "bg-selected/10 text-selected hover:bg-selected/15",
                "group-data-[surface=dark]/icon-rail:bg-inverse-foreground/15",
                "group-data-[surface=dark]/icon-rail:text-inverse-foreground",
                "group-data-[surface=dark]/icon-rail:hover:bg-inverse-foreground/20"
              )
            : cn(
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                "group-data-[surface=dark]/icon-rail:text-inverse-muted",
                "group-data-[surface=dark]/icon-rail:hover:bg-inverse-foreground/10",
                "group-data-[surface=dark]/icon-rail:hover:text-inverse-foreground"
              ),
          className
        )}
        {...props}
      >
        {icon}
        {children}
        <span className="sr-only">{srLabel}</span>
      </button>
    </li>
  )
}

/**
 * Eats the leftover vertical space, pushing everything after it to the bottom
 * of the rail — settings and the account switcher, typically.
 */
function IconRailSpacer({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="icon-rail-spacer"
      /* An empty `<li>` would be announced as a list item and inflate the
         count, so the role is dropped. It stays an `<li>` because the flex
         column it grows inside is the list. */
      role="none"
      className={cn("flex-1", className)}
      {...props}
    />
  )
}

export { IconRail, IconRailItem, IconRailSpacer, iconRailVariants }
export type { IconRailItemProps, IconRailProps, IconRailSize, IconRailSurface }
