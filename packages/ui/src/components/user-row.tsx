import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/* The identity row that closes a sidebar: avatar, name, one quiet second line,
 * and a trailing affordance.
 *
 * `SidebarUser` already covers the case where the whole row is the control — it
 * renders as a `<button>` and inherits the menu-button variants. This one is the
 * deliberate opposite, and the distinction is the reason it exists: the row is
 * inert markup and only `action` is interactive.
 *
 * That matters because the two things a caller wants from this row are "go to my
 * account" and "open the overflow menu", and satisfying both on one element
 * produces a button inside a link. Screen readers flatten the nesting, keyboard
 * users get one stop where there are two targets, and the click that opens the
 * menu also navigates. Splitting them is the only way out, so the split is baked
 * into the component rather than left as a caller's discipline.
 *
 * No collapsed-rail handling here on purpose. Reaching for `<Sidebar>`'s
 * `data-collapsible` from a primitive would make the row silently depend on an
 * ancestor it doesn't own, and this shape is equally wanted in team lists and
 * settings panes where no such ancestor exists. `SidebarUser` is the
 * rail-coupled one.
 */
const userRowVariants = cva("group/user-row flex min-w-0 items-center", {
  variants: {
    variant: {
      /* Bare. Every container that holds one of these — `SidebarFooter` is
         `p-2` — already pads its children, so padding here would double it. */
      plain: "",
      card: "rounded-xl border border-border bg-card",
    },
    size: {
      sm: "gap-2",
      default: "gap-3",
    },
  },
  /* Only the card variant has an inside, so only it takes padding, and the
     padding is what `size` means for it. */
  compoundVariants: [
    { variant: "card", size: "sm", class: "p-2" },
    { variant: "card", size: "default", class: "p-3" },
  ],
  defaultVariants: { variant: "plain", size: "default" },
})

type UserRowVariant = NonNullable<VariantProps<typeof userRowVariants>["variant"]>
type UserRowSize = NonNullable<VariantProps<typeof userRowVariants>["size"]>

type UserRowProps = React.ComponentProps<"div"> &
  VariantProps<typeof userRowVariants> & {
    /** Leading mark — an `<Avatar>`, an `<OrbAvatar>`, an initials tile. */
    avatar?: React.ReactNode
    label: React.ReactNode
    /** The quiet second line — an email, a plan name, a region. */
    sublabel?: React.ReactNode
    /** Trailing slot. The only interactive part of the row. */
    action?: React.ReactNode
  }

/**
 * @example
 * <UserRow
 *   variant="card"
 *   avatar={<Avatar><AvatarFallback>NR</AvatarFallback></Avatar>}
 *   label="Account 0172"
 *   sublabel="North region"
 *   action={
 *     <Button variant="ghost" size="icon-sm" aria-label="Account options">
 *       <EllipsisVertical />
 *     </Button>
 *   }
 * />
 */
function UserRow({
  className,
  variant = "plain",
  size = "default",
  avatar,
  label,
  sublabel,
  action,
  ...props
}: UserRowProps) {
  return (
    <div
      data-slot="user-row"
      data-variant={variant}
      data-size={size}
      className={cn(userRowVariants({ variant, size }), className)}
      {...props}
    >
      {avatar ? (
        <span
          data-slot="user-row-avatar"
          className="flex shrink-0 items-center justify-center"
        >
          {avatar}
        </span>
      ) : null}
      {/* `grid` + `min-w-0` is what makes the two `truncate`d lines actually
          truncate: the track's min sizing is min-content, and an
          `overflow: hidden` child contributes zero to that, so the column
          collapses to the space left over instead of pushing the action out of
          the rail. `flex-1` claims that space; `shrink-0` on the two slots
          beside it means a 60-character value shortens the name, never the
          affordance. */}
      <div
        data-slot="user-row-text"
        className="grid min-w-0 flex-1 text-left leading-tight"
      >
        <div
          data-slot="user-row-label"
          className="truncate text-sm font-medium group-data-[size=sm]/user-row:text-xs"
        >
          {label}
        </div>
        {sublabel ? (
          <div
            data-slot="user-row-sublabel"
            className="truncate text-xs text-muted-foreground"
          >
            {sublabel}
          </div>
        ) : null}
      </div>
      {action ? (
        <div
          data-slot="user-row-action"
          className="flex shrink-0 items-center text-muted-foreground"
        >
          {action}
        </div>
      ) : null}
    </div>
  )
}

export { UserRow, userRowVariants }
export type { UserRowProps, UserRowSize, UserRowVariant }
