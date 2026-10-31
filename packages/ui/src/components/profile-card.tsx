import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/* ---------------------------------------------------------------------------
   Profile card — the expanded identity panel for a sidebar: a square avatar
   tile, a name that can carry a verification mark, a role line, a short list of
   facts, and the actions that belong to whoever is named. Drops into a
   SidebarFooter or a SidebarGroup.

   Why this exists next to `SidebarUser`: that one is a *row*. It has one line
   for the name, one for secondary text, a trailing affordance, and it has to
   survive collapsing to a 36px rail — so anything beyond those two lines has to
   hide behind a menu. This is the same identity with room for the facts (plan,
   region, account number) and for the actions themselves. It does not collapse;
   a rail has no room for it, and a sidebar shows one or the other.

   The tile is square, and that is the visible difference. A circle reads as
   "one person in a list"; a squircle tile reads as "the subject of this panel".

   Compound rather than a props bag because every slot is caller content — a
   verification glyph, one lucide icon per fact, whatever a Button is in the
   host app.

     <ProfileCard>
       <ProfileCardAvatar>OW</ProfileCardAvatar>
       <ProfileCardName badge={<BadgeCheck />} badgeSrLabel="Verified">
         Workspace owner
       </ProfileCardName>
       <ProfileCardSubtitle>Account 0172</ProfileCardSubtitle>
       <ProfileCardMeta>
         <ProfileCardMetaItem icon={<MapPin />}>North region</ProfileCardMetaItem>
         <ProfileCardMetaItem icon={<Clock />}>Joined this quarter</ProfileCardMetaItem>
       </ProfileCardMeta>
       <ProfileCardActions>
         <Button size="sm">Manage access</Button>
         <Button size="sm" variant="ghost">View activity</Button>
       </ProfileCardActions>
     </ProfileCard>
--------------------------------------------------------------------------- */

/* `size` moves the box, never the type. A sidebar column leaves roughly 208px
   of usable width, and dropping the name below `text-sm` to buy a few pixels of
   height spends legibility where there is none spare — so `sm` buys a smaller
   tile and tighter padding, and the type scale holds across both.

   The base rhythm is the *tightest* pair, name-to-subtitle, because those two
   are one unit and the root cannot know which parts a caller passed. Blocks
   that need more air than that add it themselves, below. */
const profileCardVariants = cva(
  /* Hairline plus a surface shift and no shadow — the separation device the
     rest of the sidebar chrome already uses, so a panel here does not read as
     floating above rows that don't. */
  "group/profile-card flex w-full min-w-0 flex-col border border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground",
  {
    variants: {
      size: {
        sm: "gap-1 rounded-md p-2.5",
        default: "gap-1.5 rounded-lg p-3",
      },
    },
    defaultVariants: { size: "default" },
  },
)

type ProfileCardSize = NonNullable<VariantProps<typeof profileCardVariants>["size"]>

type ProfileCardProps = React.ComponentProps<"div"> &
  VariantProps<typeof profileCardVariants>

function ProfileCard({ className, size = "default", ...props }: ProfileCardProps) {
  return (
    <div
      data-slot="profile-card"
      /* Emitted so the parts below can scale off one decision. The root's own
         classes come from the cva — never read back off this attribute. */
      data-size={size}
      className={cn(profileCardVariants({ size }), className)}
      {...props}
    />
  )
}

/**
 * The square tile slot. Takes initials, an icon, or a bare `<img>`.
 *
 * The radius sits near 0.3 × edge — the ratio every fixed square box in the
 * system uses — and that is only safe because the edge is fixed. The same value
 * on a container that grows would pass half the edge and collapse the shape.
 *
 * `overflow-hidden` is what clips a photo to those corners; sizing the image
 * here means a caller can drop an `<img>` in without remembering object-cover.
 */
function ProfileCardAvatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="profile-card-avatar"
      className={cn(
        "flex size-12 shrink-0 items-center justify-center overflow-hidden",
        "rounded-lg bg-secondary text-sm font-medium text-muted-foreground select-none",
        "[&>img]:size-full [&>img]:object-cover [&_svg]:size-6 [&_svg]:shrink-0",
        "group-data-[size=sm]/profile-card:size-10",
        "group-data-[size=sm]/profile-card:rounded-md",
        "group-data-[size=sm]/profile-card:text-xs",
        "group-data-[size=sm]/profile-card:[&_svg]:size-5",
        className,
      )}
      {...props}
    />
  )
}

type ProfileCardNameProps = React.ComponentProps<"div"> & {
  /** Mark shown after the name — a verification glyph, a tier icon. */
  badge?: React.ReactNode
  /**
   * Accessible name for `badge`. A bare glyph is silent to a screen reader, and
   * "verified" is the one thing this line cannot say any other way.
   */
  badgeSrLabel?: string
}

function ProfileCardName({
  className,
  children,
  badge,
  badgeSrLabel,
  ...props
}: ProfileCardNameProps) {
  return (
    <div
      data-slot="profile-card-name"
      className={cn("flex min-w-0 items-center gap-1.5", className)}
      {...props}
    >
      <span className="truncate text-sm font-semibold">{children}</span>
      {badge != null ? (
        <span
          data-slot="profile-card-badge"
          /* `role="img"` is what makes the label reachable — aria-label on a
             plain span is ignored by most screen readers. With no label the mark
             is hidden instead, which is the honest reading of a glyph nobody
             named: decoration.
           *
           * Untinted on purpose. Whether the mark means verified, staff or paid
           * is the caller's claim to make, and so is its colour. */
          role={badgeSrLabel ? "img" : undefined}
          aria-label={badgeSrLabel}
          aria-hidden={badgeSrLabel ? undefined : true}
          className="flex shrink-0 items-center [&_svg]:size-3.5 [&_svg]:shrink-0"
        >
          {badge}
        </span>
      ) : null}
    </div>
  )
}

/* The role line. Sits on the root's base gap — this and the name are the pair
   that rhythm was set for. */
function ProfileCardSubtitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="profile-card-subtitle"
      className={cn("truncate text-xs text-sidebar-foreground/70", className)}
      {...props}
    />
  )
}

function ProfileCardMeta({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="profile-card-meta"
      /* Preflight strips list-style, which drops list semantics in Safari —
         restored explicitly, same as the activity feed and the rank list. */
      role="list"
      className={cn(
        "mt-1.5 flex min-w-0 flex-col gap-1.5",
        "group-data-[size=sm]/profile-card:mt-1",
        "group-data-[size=sm]/profile-card:gap-1",
        className,
      )}
      {...props}
    />
  )
}

type ProfileCardMetaItemProps = React.ComponentProps<"li"> & {
  /** Leading mark for the row. */
  icon?: React.ReactNode
}

/* Type styles live on the row rather than on the list, so a row composed into
   some other container still reads as a meta row. */
function ProfileCardMetaItem({
  className,
  children,
  icon,
  ...props
}: ProfileCardMetaItemProps) {
  return (
    <li
      data-slot="profile-card-meta-item"
      className={cn(
        "flex min-w-0 items-center gap-2 text-xs text-sidebar-foreground/70",
        className,
      )}
      {...props}
    >
      {icon != null ? (
        <span
          /* aria-hidden: the text beside it carries the meaning, and an icon
             announced here would only prefix the fact with its own category. */
          aria-hidden="true"
          className="flex shrink-0 items-center [&_svg]:size-3.5 [&_svg]:shrink-0"
        >
          {icon}
        </span>
      ) : null}
      <span className="truncate">{children}</span>
    </li>
  )
}

/* Stacked full width rather than side by side. Two buttons on one line at
   sidebar width truncate their own labels, and the second action here is
   normally the quieter one — a stack keeps that rank legible. `*:w-full`
   reaches the caller's Buttons, which are inline-flex and would otherwise
   shrink to their text. */
function ProfileCardActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="profile-card-actions"
      className={cn(
        "mt-2 flex flex-col gap-2 *:w-full",
        "group-data-[size=sm]/profile-card:mt-1.5",
        "group-data-[size=sm]/profile-card:gap-1.5",
        className,
      )}
      {...props}
    />
  )
}

export {
  ProfileCard,
  ProfileCardActions,
  ProfileCardAvatar,
  ProfileCardMeta,
  ProfileCardMetaItem,
  ProfileCardName,
  ProfileCardSubtitle,
  profileCardVariants,
}
export type {
  ProfileCardMetaItemProps,
  ProfileCardNameProps,
  ProfileCardProps,
  ProfileCardSize,
}
