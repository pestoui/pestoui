import { cn } from "../lib/utils"

/* Lighter in-page header — sits above a table, a card body, or a settings
   group. Badge rides beside the title; the tabs slot underneath scrolls
   sideways on narrow screens without clipping the pills' focus rings.
   Stays a <div>, not a <header>: dropped into a plain container a <header>
   would claim a second banner landmark on the page. */
type SectionHeaderProps = Omit<
  React.ComponentProps<"div">,
  "title" | "children"
> & {
  title: React.ReactNode
  description?: React.ReactNode
  /** Badge slot — sits inline after the title. */
  badge?: React.ReactNode
  actions?: React.ReactNode
  /** Tabs slot — a pill Tabs/TabsList row rendered under the header. */
  tabs?: React.ReactNode
  /** Hairline rule below the block. */
  border?: boolean
}

function SectionHeader({
  title,
  description,
  badge,
  actions,
  tabs,
  border = false,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      data-slot="section-header"
      className={cn(
        "w-full",
        border && "border-b border-border pb-4",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              data-slot="section-header-title"
              className="text-[1.1875rem] leading-snug font-semibold tracking-title text-foreground"
            >
              {title}
            </h2>
            {badge ? (
              <span
                data-slot="section-header-badge"
                className="flex shrink-0 items-center"
              >
                {badge}
              </span>
            ) : null}
          </div>
          {description ? (
            <p
              data-slot="section-header-description"
              className="mt-1 text-body leading-normal text-pretty text-muted-foreground"
            >
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div
            data-slot="section-header-actions"
            className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end"
          >
            {actions}
          </div>
        ) : null}
      </div>

      {tabs ? (
        <div
          data-slot="section-header-tabs"
          /* -m-1/p-1 is net zero space — it just keeps the focus ring of the
             first/last pill inside the scroll box instead of clipped. */
          className="-m-1 mt-3 overflow-x-auto p-1 scrollbar-thin"
        >
          {tabs}
        </div>
      ) : null}
    </div>
  )
}

export { SectionHeader }
export type { SectionHeaderProps }
