import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

const sectionFooterVariants = cva(
  "flex w-full flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:gap-4",
  {
    variants: {
      align: {
        /* everything clusters on the right */
        end: "sm:justify-end",
        /* helper pinned left, actions pinned right */
        between: "sm:justify-between",
      },
    },
    defaultVariants: {
      align: "end",
    },
  }
)

/* Form / card action bar — helper text on the left, buttons on the right.
   Below sm the buttons stack full-width and square off to rounded-lg, since a
   full-bleed pill reads as a lozenge rather than a control. */
type SectionFooterProps = React.ComponentProps<"div"> &
  VariantProps<typeof sectionFooterVariants> & {
    /** Action buttons — last child is treated as the primary on mobile. */
    children: React.ReactNode
    helper?: React.ReactNode
  }

function SectionFooter({
  children,
  helper,
  align = "end",
  className,
  ...props
}: SectionFooterProps) {
  return (
    <div
      data-slot="section-footer"
      data-align={align ?? "end"}
      className={cn(sectionFooterVariants({ align }), className)}
      {...props}
    >
      {helper ? (
        <p
          data-slot="section-footer-helper"
          className="text-caption leading-normal text-pretty text-muted-foreground"
        >
          {helper}
        </p>
      ) : null}

      <div
        data-slot="section-footer-actions"
        className={cn(
          "flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end",
          !helper && "sm:ml-auto",
          "max-sm:[&>*]:w-full max-sm:[&>[data-slot=button]]:rounded-lg"
        )}
      >
        {children}
      </div>
    </div>
  )
}

export { SectionFooter, sectionFooterVariants }
export type { SectionFooterProps }
