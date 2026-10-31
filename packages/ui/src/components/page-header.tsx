import { cn } from "../lib/utils"

/* Top-of-page block — breadcrumb, leading avatar, large title + supporting
   line, and an actions cluster that drops below the title on small screens.
   Rendered as <header>: inside <main> it stays generic, at the top of the
   document it correctly becomes the banner landmark. */
type PageHeaderProps = Omit<
  React.ComponentProps<"header">,
  "title" | "children"
> & {
  title: React.ReactNode
  description?: React.ReactNode
  breadcrumb?: React.ReactNode
  actions?: React.ReactNode
  /** Leading slot — avatar, orb, or icon tile. */
  avatar?: React.ReactNode
  /** Hairline rule below the block. */
  border?: boolean
}

function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  avatar,
  border = false,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "w-full",
        border && "border-b border-border pb-5",
        className
      )}
      {...props}
    >
      {breadcrumb ? (
        <div data-slot="page-header-breadcrumb" className="mb-3">
          {breadcrumb}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {avatar ? (
            <div data-slot="page-header-avatar" className="shrink-0">
              {avatar}
            </div>
          ) : null}
          <div className="min-w-0">
            <h1
              data-slot="page-header-title"
              className="text-[1.75rem] leading-tight font-semibold tracking-title text-foreground"
            >
              {title}
            </h1>
            {description ? (
              <p
                data-slot="page-header-description"
                className="mt-1.5 text-body leading-normal text-pretty text-muted-foreground"
              >
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div
            data-slot="page-header-actions"
            className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end"
          >
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  )
}

export { PageHeader }
export type { PageHeaderProps }
