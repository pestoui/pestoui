import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/* Term and value pairs — "Plan · Team", "Domain · example.com" — as a real
   <dl>, so a screen reader announces each value against its term.

   An `items` array rather than a compound <Item>: the two layouts need
   different markup per row. `grid` places bare <dt>/<dd> siblings on a
   two-column grid, so every term shares one column width; `divided` wraps each
   pair in a <div> row so a rule can run between rows. A compound child would
   have to read the layout from context, and createContext would make the whole
   file a client module for no behaviour at all. */
const descriptionListVariants = cva("", {
  variants: {
    layout: {
      /* Terms in an auto column, values right-aligned and truncating. */
      grid: "grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3",
      /* One row per pair, hairline rules between, value pushed right. */
      divided: "divide-y divide-border",
    },
  },
  defaultVariants: {
    layout: "grid",
  },
})

type DescriptionListLayout = NonNullable<
  VariantProps<typeof descriptionListVariants>["layout"]
>

type DescriptionListItem = {
  id: string
  term: React.ReactNode
  details: React.ReactNode
  /** A leading node in the value cell — an icon or a tile, marked aria-hidden. */
  icon?: React.ReactNode
}

type DescriptionListProps = Omit<React.ComponentProps<"dl">, "children"> & {
  items: DescriptionListItem[]
  layout?: DescriptionListLayout
}

function DescriptionList({
  items,
  layout = "grid",
  className,
  ...props
}: DescriptionListProps) {
  return (
    <dl
      data-slot="description-list"
      data-layout={layout}
      className={cn(descriptionListVariants({ layout }), className)}
      {...props}
    >
      {layout === "divided"
        ? items.map((item) => (
            <div
              key={item.id}
              data-slot="description-list-row"
              className="flex items-center justify-between gap-4 py-2.5"
            >
              <dt data-slot="description-list-term">{item.term}</dt>
              <dd
                data-slot="description-list-details"
                className={cn(
                  "tabular-nums",
                  item.icon != null && "flex items-center gap-2",
                )}
              >
                {item.icon}
                {item.details}
              </dd>
            </div>
          ))
        : items.map((item) => (
            <React.Fragment key={item.id}>
              <dt data-slot="description-list-term" className="text-foreground">
                {item.term}
              </dt>
              <dd
                data-slot="description-list-details"
                className="flex min-w-0 items-center justify-end gap-2 text-right text-foreground"
              >
                {item.icon}
                <span className="min-w-0 truncate">{item.details}</span>
              </dd>
            </React.Fragment>
          ))}
    </dl>
  )
}

export { DescriptionList, descriptionListVariants }
export type { DescriptionListProps, DescriptionListItem, DescriptionListLayout }
