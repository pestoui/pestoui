import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"
import { Badge } from "./ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

/* ---------------------------------------------------------------------------
   The switcher at the top of a sidebar: a mark, the space name, an optional
   plan stamp, and a menu of the other spaces.

   Drawn as a bordered card rather than as the first row of the nav, and that
   choice is the whole component. Every row below it moves *within* one space;
   this one changes which space the rest of the sidebar — and every number on
   every page — is about. Given the same silhouette as a nav row it collects the
   click that is hardest to notice and hardest to undo, because the scope
   changes without anything looking like it changed.

   Card tokens, not `sidebar-*` ones: this is a card sitting *on* the sidebar,
   so it keeps its own surface when the panel around it is retinted.

   Compound rather than `spaces={[…]}`, because `mark` is the slot that earns
   the component — a tinted chip, an <Avatar>, a brand glyph — and a data prop
   would push every one of those through a render callback.

   The menu is `children`, not a prop, so trigger and panel stay one subtree and
   Radix wires them together:

     <AppSwitcher mark={<span className="bg-chart-1" />} label="Space 0172"
                  plan="PRO">
       <AppSwitcherMenu label="Spaces">
         <AppSwitcherItem mark={…} label="North region" active />
         <AppSwitcherFooter>
           <DropdownMenuItem>New space</DropdownMenuItem>
         </AppSwitcherFooter>
       </AppSwitcherMenu>
     </AppSwitcher>

   Nothing here holds state. Which space is current arrives as `active`, and
   selection is the caller's `onSelect`.
--------------------------------------------------------------------------- */

/* The mark's frame, shared by the trigger and by the menu rows so one space
   keeps the same silhouette in both places. Every radius stays under half its
   edge — past that a fixed square box renders as a circle. */
const appSwitcherMark = {
  sm: "size-7 rounded-md",
  default: "size-9 rounded-lg",
  lg: "size-10 rounded-lg",
} as const

/* A single non-svg child is stretched to fill, so a bare coloured <span> needs
   no size of its own, while an icon keeps its own scale instead of being blown
   up to the width of the chip. */
const appSwitcherMarkFrame = [
  "flex shrink-0 items-center justify-center overflow-hidden",
  "[&>*:not(svg)]:size-full [&>svg]:size-4",
].join(" ")

const appSwitcherVariants = cva(
  [
    "group/app-switcher flex w-full items-center border border-border bg-card",
    "text-left outline-none transition-[background-color,transform]",
    "duration-instant ease-out-expo hover:bg-accent data-open:bg-accent",
    "focus-visible:ring-3 focus-visible:ring-ring/50",
    /* The press dip is worth its cost on this one control: it reframes the
       page, and a card that yields under the pointer confirms the click landed
       before the menu has had time to arrive. */
    "active:scale-99 active:duration-spring-press active:ease-spring-press",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      /* `sm` steps its radius down with the box. `rounded-xl` is 22.4px and the
         small card is 40px tall, so the corner would run past half the edge and
         collapse the card into a pill — the one silhouette a switcher must not
         borrow, because it is what a badge looks like. */
      size: {
        sm: "gap-2 rounded-lg p-1.5 text-sm",
        default: "gap-2.5 rounded-xl p-2 text-sm",
        lg: "gap-3 rounded-xl p-2.5 text-base",
      },
    },
    defaultVariants: { size: "default" },
  },
)

const appSwitcherItemVariants = cva("gap-2.5 px-2 py-1.5", {
  variants: {
    /* Weight, never a fill. The row's background belongs to focus — paint the
       current space with one too and a keyboard user can no longer tell where
       the cursor is from what is already selected. */
    active: {
      true: "font-medium",
      false: "",
    },
  },
  defaultVariants: { active: false },
})

type AppSwitcherSize = NonNullable<VariantProps<typeof appSwitcherVariants>["size"]>

/* Uppercased rather than passed through: callers will not agree on "Pro" vs
   "PRO", and a three-letter stamp in mixed case reads as a typo. */
function AppSwitcherPlan({ children }: { children: React.ReactNode }) {
  return (
    <Badge
      variant="secondary"
      className="h-5 shrink-0 px-1.5 text-xs font-semibold tracking-wide uppercase"
    >
      {children}
    </Badge>
  )
}

type AppSwitcherProps = React.ComponentProps<"button"> & {
  /** Leading identity chip — a tinted `<span>`, an `<Avatar>`, a brand glyph.
   *  Sized and clipped by the frame, so it needs no dimensions of its own. */
  mark?: React.ReactNode
  /** The space name. Truncates; the plan stamp beside it never does. */
  label: React.ReactNode
  /** Short plan stamp, e.g. "FREE" / "PRO". Rendered as a quiet `<Badge>`. */
  plan?: string
  /** Announced ahead of the name, for callers who want the action named. The
   *  trigger already reports `aria-haspopup`, so this is a refinement. */
  srLabel?: string
  size?: AppSwitcherSize
}

function AppSwitcher({
  className,
  size = "default",
  mark,
  label,
  plan,
  srLabel,
  children,
  ...props
}: AppSwitcherProps) {
  const trigger = (
    <button
      type="button"
      data-slot="app-switcher"
      data-size={size}
      className={cn(appSwitcherVariants({ size }), className)}
      {...props}
    >
      {srLabel ? <span className="sr-only">{srLabel}</span> : null}
      {mark ? (
        /* aria-hidden: the name beside it already identifies the space, so
           announcing the chip would only repeat it. */
        <span
          data-slot="app-switcher-mark"
          aria-hidden="true"
          className={cn(appSwitcherMarkFrame, appSwitcherMark[size])}
        >
          {mark}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span data-slot="app-switcher-label" className="truncate font-medium">
          {label}
        </span>
        {plan ? <AppSwitcherPlan>{plan}</AppSwitcherPlan> : null}
      </span>
      {/* Two arrows rather than one: this control swaps a value, it does not
          expand a section, and a lone chevron promises the second thing. */}
      <ChevronsUpDownIcon
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-colors",
          "duration-instant ease-out-expo",
          "group-hover/app-switcher:text-foreground",
        )}
      />
    </button>
  )

  /* No menu, no Radix. A trigger reporting `aria-haspopup="menu"` that opens
     nothing is worse than a plain button, and a switcher with a single space is
     a real state. Which branch renders is decided by the shape of the call site
     and never flips at runtime, so the swap costs no remount. */
  if (!children) {
    return trigger
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      {children}
    </DropdownMenu>
  )
}

type AppSwitcherMenuProps = React.ComponentProps<typeof DropdownMenuContent> & {
  /** Visible heading above the list. */
  label?: React.ReactNode
}

/* Inherits `DropdownMenuContent`'s trigger-width sizing, which is what makes
   the panel read as the card unfolding rather than as a menu arriving from
   somewhere else. `min-w-56` is the floor for a sidebar collapsed to a rail,
   where the trigger is a square and that width would be unreadable. */
function AppSwitcherMenu({
  className,
  label,
  align = "start",
  sideOffset = 6,
  children,
  ...props
}: AppSwitcherMenuProps) {
  return (
    <DropdownMenuContent
      data-slot="app-switcher-menu"
      align={align}
      sideOffset={sideOffset}
      className={cn("min-w-56", className)}
      {...props}
    >
      {label ? <DropdownMenuLabel>{label}</DropdownMenuLabel> : null}
      {children}
    </DropdownMenuContent>
  )
}

type AppSwitcherItemProps = React.ComponentProps<typeof DropdownMenuItem> &
  VariantProps<typeof appSwitcherItemVariants> & {
    mark?: React.ReactNode
    label: React.ReactNode
    plan?: string
  }

function AppSwitcherItem({
  className,
  mark,
  label,
  plan,
  active = false,
  ...props
}: AppSwitcherItemProps) {
  return (
    <DropdownMenuItem
      data-slot="app-switcher-item"
      data-active={active}
      /* This is what actually announces the current space; the check below is
         decorative. `page` would be the wrong value — a space is a scope, not a
         location, and every row in the menu belongs to the same page. */
      aria-current={active ? "true" : undefined}
      className={cn(appSwitcherItemVariants({ active }), className)}
      {...props}
    >
      {mark ? (
        <span
          data-slot="app-switcher-mark"
          aria-hidden="true"
          className={cn(appSwitcherMarkFrame, appSwitcherMark.sm)}
        >
          {mark}
        </span>
      ) : null}
      <span data-slot="app-switcher-item-label" className="min-w-0 flex-1 truncate">
        {label}
      </span>
      {plan ? <AppSwitcherPlan>{plan}</AppSwitcherPlan> : null}
      {/* The slot is drawn on every row so the plan stamps line up down the
          column instead of stepping sideways past the rows with no check. */}
      <span
        aria-hidden="true"
        className="flex size-4 shrink-0 items-center justify-center"
      >
        {active ? <CheckIcon /> : null}
      </span>
    </DropdownMenuItem>
  )
}

/* A separator plus a group, not a bare `<div>`: `role="menu"` admits only menu
   items, groups and separators, so an unlabelled wrapper element would drop the
   rows inside it out of the menu's own structure. */
function AppSwitcherFooter(props: React.ComponentProps<typeof DropdownMenuGroup>) {
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuGroup data-slot="app-switcher-footer" {...props} />
    </>
  )
}

export {
  AppSwitcher,
  AppSwitcherFooter,
  AppSwitcherItem,
  AppSwitcherMenu,
  appSwitcherItemVariants,
  appSwitcherVariants,
}
export type { AppSwitcherSize }
