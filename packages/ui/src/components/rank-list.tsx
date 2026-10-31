import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/* ---------------------------------------------------------------------------
   Ranked list — "1 · 🇦🇺 · Australia · ……… · 40%". Top locations, top customers
   by spend, top referrers: the shape a dashboard reaches for when a <Table>
   would be four columns of chrome wrapped around two facts.

   Compound rather than a `rows={[…]}` prop, for one reason: `media` is the slot
   that makes this component worth having — a flag, an <Avatar>, a chart-token
   dot — and a data prop would push every one of those through a render
   callback. Nothing here holds state; the caller arrives already sorted.
--------------------------------------------------------------------------- */

/* Density moves layout, not type — the same rule `tableDensity` follows. A list
   that shrinks its own text stops matching the card it sits in, so `sm` buys
   rows and nothing else. The parts read these back with the `default` values as
   var() fallbacks, so a row composed outside a <RankList> still renders. */
const rankListDensity = {
  default:
    "[--rank-gap:--spacing(3)] [--rank-py:--spacing(2)] [--rank-ordinal:--spacing(5)] [--rank-media:--spacing(5)]",
  sm: "[--rank-gap:--spacing(2.5)] [--rank-py:--spacing(1)] [--rank-ordinal:--spacing(4)] [--rank-media:--spacing(4)]",
} as const

const rankListVariants = cva("group/rank-list flex w-full min-w-0 flex-col text-sm", {
  variants: {
    size: rankListDensity,
    /* `none` hides the ordinal from the root rather than from the row, so an
       item never has to know which mode it is in — one prop flips the whole
       list, and a hand-composed row inherits the decision for free. Hiding it
       with display:none drops it from the accessibility tree too, which is the
       intent: in this mode the media carries identity and the <ol> still
       reports position. */
    numbering: {
      ordinal: "",
      none: "[&_[data-slot=rank-list-ordinal]]:hidden",
    },
  },
  defaultVariants: {
    size: "default",
    numbering: "ordinal",
  },
})

type RankListProps = React.ComponentProps<"ol"> & VariantProps<typeof rankListVariants>

/* An <ol> in both numbering modes. `numbering` decides whether the ordinal is
   *drawn*, not whether the data is ordered — a top-customers list carrying
   avatars instead of numbers is still a ranking, and a <ul> would tell a screen
   reader otherwise. The `data-*` pair is emitted for descendants and for tests;
   the styling above is computed from the cva, never read back off the root. */
function RankList({
  className,
  size = "default",
  numbering = "ordinal",
  ...props
}: RankListProps) {
  return (
    <ol
      data-slot="rank-list"
      data-size={size}
      data-numbering={numbering}
      /* Preflight strips list-style, which drops list semantics in Safari —
         restore them explicitly, same as the activity feed does. */
      role="list"
      className={cn(rankListVariants({ size, numbering }), className)}
      {...props}
    />
  )
}

/* `value` is deliberately taken away from <li>: the element already owns a
   numeric `value` attribute — its ordinal — so letting the trailing figure land
   on it would type-check and then quietly renumber the list. The figure keeps
   the readable name and `rank` is what feeds the attribute. */
type RankListItemProps = Omit<React.ComponentProps<"li">, "value"> & {
  /** Position in the ranking. Also feeds the <li> `value` attribute, so a list
   *  showing the top five of a longer ranking still reports true positions. */
  rank?: number
  /** Leading identity slot — a flag, an <Avatar>, a `bg-chart-*` dot. */
  media?: React.ReactNode
  label: React.ReactNode
  /** Muted second line — an email under a name, a region under a country. */
  sublabel?: React.ReactNode
  /** Trailing figure. Tabular, so a column of them lines up on the decimal. */
  value?: React.ReactNode
  /** 0–1, normally `value / max`. Paints a proportional wash behind the row.
   *  A redundant reading of `value`, never information of its own — the wash is
   *  aria-hidden, so anything it alone would say is lost. */
  bar?: number
}

function RankListItem({
  rank,
  media,
  label,
  sublabel,
  value,
  bar,
  className,
  ...props
}: RankListItemProps) {
  /* Clamped rather than trusted. `bar` is almost always `value / max` computed
     by the caller, and a single stale max sends the wash past the row's edge. */
  const fill =
    typeof bar === "number" && Number.isFinite(bar) ? Math.min(1, Math.max(0, bar)) : 0

  return (
    <li
      data-slot="rank-list-item"
      value={rank}
      className={cn(
        "relative flex items-center gap-[var(--rank-gap,calc(var(--spacing)*3))] px-2 py-[var(--rank-py,calc(var(--spacing)*2))]",
        className
      )}
      {...props}
    >
      {fill > 0 ? (
        <span
          data-slot="rank-list-bar"
          /* Hidden from assistive tech because the `value` beside it already
             states the figure in words — a label here would only repeat it.
           *
           * It lands *under* the row by tree order rather than by a z-index: an
           * absolutely positioned box outranks in-flow content at the same
           * stacking level, so each sibling below carries `relative` and DOM
           * order settles the paint. The row stays out of the z-index contract.
           *
           * Rounded on the trailing edge only. This box grows, which is exactly
           * where the radius rule bites — a 3% row rounded on all four corners
           * collapses into a lozenge. Keeping the leading edge flat against the
           * row's start also reads as a fill rather than as a row highlight. */
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 rounded-r-sm bg-secondary transition-[width] duration-spring-glide ease-spring-glide"
          style={{ width: `${fill * 100}%` }}
        />
      ) : null}

      <span
        data-slot="rank-list-ordinal"
        /* tabular-nums is what puts 1, 10 and 100 on one digit grid. The width
           is a floor rather than a fix: it reserves the single-digit case so a
           top-five list is not tighter than a top-twenty one, and three digits
           widen the column instead of clipping inside it. */
        className="relative min-w-[var(--rank-ordinal,calc(var(--spacing)*5))] shrink-0 text-right tabular-nums text-muted-foreground"
      >
        {rank}
      </span>

      {media != null ? (
        <span
          data-slot="rank-list-media"
          /* The label names the row, so an announced flag reads "flag:
             Australia, Australia". Anything in this slot that the label does not
             already say belongs in the label instead. */
          aria-hidden="true"
          className="relative flex size-[var(--rank-media,calc(var(--spacing)*5))] shrink-0 items-center justify-center *:data-[slot=avatar]:size-full"
        >
          {media}
        </span>
      ) : null}

      <span data-slot="rank-list-text" className="relative flex min-w-0 flex-1 flex-col">
        <span
          data-slot="rank-list-label"
          className="truncate font-medium text-foreground"
        >
          {label}
        </span>
        {sublabel != null ? (
          <span
            data-slot="rank-list-sublabel"
            className="truncate text-xs leading-snug text-muted-foreground"
          >
            {sublabel}
          </span>
        ) : null}
      </span>

      {value != null ? (
        <span
          data-slot="rank-list-value"
          className="relative shrink-0 text-right font-medium tabular-nums whitespace-nowrap text-foreground"
        >
          {value}
        </span>
      ) : null}
    </li>
  )
}

export { RankList, RankListItem, rankListVariants }
export type { RankListProps, RankListItemProps }
