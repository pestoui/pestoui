import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/* The rail-footer upgrade block: chip, title, one line of copy, a meter, and a
   single full-width call to action.
 *
 * Not `Card` or `PanelCard` with a narrower `--card-spacing`. Both of those are
 * section surfaces — their parts sit in separately padded bands so a header, a
 * body and a footer read as distinct regions, and `CardFooter` deliberately
 * draws its own edge. A rail footer is the opposite shape: five parts inside one
 * 12px box, on one grid, with the action touching the card's own padding.
 *
 * The tone is the other half of it. It lands on two *descendants* — the chip and
 * the badge — so it travels as one inherited custom property rather than eleven
 * `group-data-[tone=…]` pairs per part, and nothing here reads its own
 * `data-tone` to paint itself. */

/* One tone map, two cvas, so the root and a chip-level override cannot drift
   apart — the same argument `segmented-bar` makes for its band/legend pair.
   Each entry only *names* the tone; the wash and the ink are derived from it
   once, at the two places that consume it. */
const TONE_INK = {
  selected: "[--usage-card-tone:var(--selected)]",
  success: "[--usage-card-tone:var(--success)]",
  warning: "[--usage-card-tone:var(--warning)]",
  destructive: "[--usage-card-tone:var(--destructive)]",
  info: "[--usage-card-tone:var(--info)]",
  muted: "[--usage-card-tone:var(--muted-foreground)]",
  "chart-1": "[--usage-card-tone:var(--chart-1)]",
  "chart-2": "[--usage-card-tone:var(--chart-2)]",
  "chart-3": "[--usage-card-tone:var(--chart-3)]",
  "chart-4": "[--usage-card-tone:var(--chart-4)]",
  "chart-5": "[--usage-card-tone:var(--chart-5)]",
} as const

/* Two tracks when a chip is present, one when it is not, which is what lets the
   parts stay flat children instead of needing a header wrapper: the chip and the
   title auto-place onto row 1, and everything below spans the full width. The
   column gap is bound to the same `has-*` test as the tracks — left on
   unconditionally it would indent a chipless card by the width of a collapsed
   track it never asked for. */
const usageCardVariants = cva(
  "group/usage-card grid w-full min-w-0 grid-cols-1 items-center gap-y-2.5 rounded-lg border border-border bg-card p-3 text-sm text-card-foreground has-data-[slot=usage-card-icon]:grid-cols-[auto_1fr] has-data-[slot=usage-card-icon]:gap-x-2.5",
  {
    variants: {
      tone: TONE_INK,
    },
    defaultVariants: {
      /* The chip is a wayfinding mark before it is a status, so the tinted
         reading has to be asked for. */
      tone: "muted",
    },
  }
)

/* `rounded-sm` is 9.6px against the 32px box — the 0.30 × edge squircle ratio
   the audit found under the hardcoded radii. `rounded-lg` (16px, what the
   roomier `PanelCard` chip uses) is exactly half this edge, which collapses the
   chip into a circle.

   No default tone: unset means the chip inherits the card's, and a value here
   re-declares the property on the chip alone. The badge keeps reading the root,
   which is the point — an override is a note about this one mark, not a retint
   of the card. */
const usageCardIconVariants = cva(
  "flex size-8 shrink-0 items-center justify-center rounded-sm bg-(--usage-card-tone)/12 text-(--usage-card-tone) [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      tone: TONE_INK,
    },
  }
)

type UsageCardTone = NonNullable<VariantProps<typeof usageCardVariants>["tone"]>

type UsageCardProps = React.ComponentProps<"div"> &
  VariantProps<typeof usageCardVariants>

type UsageCardIconProps = React.ComponentProps<"span"> &
  VariantProps<typeof usageCardIconVariants>

/**
 * ```tsx
 * <UsageCard tone="selected">
 *   <UsageCardIcon><Zap /></UsageCardIcon>
 *   <UsageCardTitle>
 *     Runs this month
 *     <UsageCardBadge>82%</UsageCardBadge>
 *   </UsageCardTitle>
 *   <UsageCardDescription>4,100 of 5,000 included runs used.</UsageCardDescription>
 *   <UsageCardMeter><Progress value={82} /></UsageCardMeter>
 *   <UsageCardAction>
 *     <Button size="sm" className="w-full">Upgrade plan</Button>
 *   </UsageCardAction>
 * </UsageCard>
 * ```
 */
function UsageCard({ className, tone = "muted", ...props }: UsageCardProps) {
  return (
    <div
      data-slot="usage-card"
      data-tone={tone}
      className={cn(usageCardVariants({ tone }), className)}
      {...props}
    />
  )
}

function UsageCardIcon({ className, tone, ...props }: UsageCardIconProps) {
  return (
    <span
      data-slot="usage-card-icon"
      data-tone={tone}
      /* aria-hidden: the title sitting beside it already names the card, so the
         mark would only be read back twice. */
      aria-hidden="true"
      className={cn(usageCardIconVariants({ tone }), className)}
      {...props}
    />
  )
}

/* A flex row rather than plain text, because the badge belongs on the title's
   line — trailing it in the same box is what keeps it reading as a qualifier
   rather than as a second heading. */
function UsageCardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="usage-card-title"
      className={cn(
        "flex min-w-0 items-center gap-1.5 leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

/* Same wash and ink as the chip, from the card's tone. Zero variant axes of its
   own, so no cva: the accent is the card's, not the badge's. */
function UsageCardBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="usage-card-badge"
      className={cn(
        "inline-flex h-5 shrink-0 items-center justify-center rounded-full bg-(--usage-card-tone)/12 px-1.5 text-xs font-medium whitespace-nowrap tabular-nums text-(--usage-card-tone)",
        className
      )}
      {...props}
    />
  )
}

/* Kept at the stock 12px `text-xs` on purpose: the type scale's caption token
   is 13px, so swapping would change the rendered size and move layout. That
   swap belongs to a deliberate change that snaps sizes to the scale, not to the
   zero-change type-scale migration. If it is made, keep the size and colour
   classes in one cn() call so the registered merger resolves them together. */
function UsageCardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="usage-card-description"
      className={cn(
        "col-span-full min-w-0 text-xs leading-normal text-pretty text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

/* Slot, not a meter. Over-quota styling, thresholds and the `aria-value*` trio
   belong to whatever is dropped in here — a bar that owns none of the numbers
   cannot be trusted to colour them. */
function UsageCardMeter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="usage-card-meter"
      className={cn("col-span-full min-w-0", className)}
      {...props}
    />
  )
}

/* One grid track, so whatever is slotted in stretches to the card's width. The
   call site still passes `className="w-full"` — that is the documented idiom and
   it survives being moved out of this slot — but a rail footer whose upgrade
   button sits half-width is the failure worth being structurally immune to. */
function UsageCardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="usage-card-action"
      className={cn("col-span-full grid min-w-0", className)}
      {...props}
    />
  )
}

export {
  UsageCard,
  UsageCardAction,
  UsageCardBadge,
  UsageCardDescription,
  UsageCardIcon,
  UsageCardMeter,
  UsageCardTitle,
  usageCardIconVariants,
  usageCardVariants,
}
export type { UsageCardIconProps, UsageCardProps, UsageCardTone }
