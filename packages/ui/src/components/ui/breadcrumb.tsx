"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "../../lib/utils"
import {
  ArrowRightIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  SlashIcon,
} from "lucide-react"

/* A breadcrumb is a line of prose you read far more often than you click, so
 * the whole family is tuned to stay quiet: colour-only hover, no fills, no
 * movement inside the text line, and every separator kept silent to screen
 * readers.
 *
 * Two things travel by context rather than by prop drilling — the size and the
 * separator glyph. Both are trail-wide decisions: a trail with a chevron at one
 * joint and a slash at the next is a bug, not a feature, and every call site
 * hand-passing the same glyph as children is one more chance to drift on size,
 * colour and aria. The root sets them once; every part reads them.
 *
 * The root emits data-size for descendants and consumers, and never reads it
 * back to style itself.
 *
 * Everything added here is inert until it is asked for. The icon selectors only
 * match when a crumb actually contains an svg, and the focus treatment only
 * resolves under :focus-visible — so a text-only trail at the default size
 * computes exactly what it computed before any of this existed. */

type BreadcrumbSize = "default" | "sm"

type BreadcrumbSeparatorKind = "chevron" | "slash" | "arrow" | "dot" | "line"

type BreadcrumbContextValue = {
  size: BreadcrumbSize
  separator: BreadcrumbSeparatorKind
}

/* Defaulted rather than nullable: the parts are copy-pasteable on their own and
 * should not explode when one is lifted out of its trail. */
const BreadcrumbContext = React.createContext<BreadcrumbContextValue>({
  size: "default",
  separator: "chevron",
})

function useBreadcrumb() {
  return React.useContext(BreadcrumbContext)
}

/* Shared by the link and the page so an icon crumb behaves the same whether or
 * not it happens to be the current one. A crumb only becomes a flex line when
 * it actually holds an icon — a plain text crumb stays inline, which is what
 * lets it wrap mid-trail the way prose does. */
const crumbIconLayout =
  "has-[>svg]:inline-flex has-[>svg]:items-center has-[>svg]:gap-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0"

const crumbIconSize = {
  default: "[&_svg:not([class*='size-'])]:size-4",
  sm: "[&_svg:not([class*='size-'])]:size-3.5",
} as const

const breadcrumbListVariants = cva(
  "flex flex-wrap items-center wrap-break-word text-muted-foreground",
  {
    variants: {
      size: {
        default: "gap-2 text-body",
        sm: "gap-1.5 text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const breadcrumbLinkVariants = cva(
  [
    /* Colour, nothing else. A breadcrumb is a line of prose you read more
       often than you click, and anything that moves in a line of text
       pulls the eye off the words. */
    "transition-colors duration-fast ease-out-expo hover:text-foreground",
    /* The whole focus treatment sits behind :focus-visible, including the
       radius and the outline reset. A bare link has no resting box to shape,
       so shaping one at rest would be inventing it. */
    "focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
    crumbIconLayout,
  ].join(" "),
  {
    variants: {
      size: {
        default: crumbIconSize.default,
        sm: crumbIconSize.sm,
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const breadcrumbPageVariants = cva(
  `font-medium text-foreground ${crumbIconLayout}`,
  {
    variants: {
      size: {
        default: crumbIconSize.default,
        sm: crumbIconSize.sm,
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

/* dot and line are drawn spans rather than glyphs, so the row needs a flex
 * context to centre them against the text. The three icon kinds keep the
 * original block li — an svg is already centred by the list. */
const breadcrumbSeparatorVariants = cva("", {
  variants: {
    variant: {
      chevron: "",
      slash: "",
      arrow: "",
      dot: "flex items-center",
      line: "flex items-center",
    },
    size: {
      default: "[&>svg]:size-3.5",
      sm: "[&>svg]:size-3",
    },
  },
  defaultVariants: {
    variant: "chevron",
    size: "default",
  },
})

const breadcrumbEllipsisVariants = cva("flex items-center justify-center", {
  variants: {
    size: {
      default: "size-5 [&>svg]:size-4",
      sm: "size-4.5 [&>svg]:size-3.5",
    },
    /* Only the trigger form gets a resting box, a hover and a ring — the
       decorative form is a glyph in a sentence and owns none of that. A square
       target is one of the few places a full round cannot collapse a shape.

       It is also the only crumb that answers a press, and only with its glyph.
       The box is a menu anchor — a panel positioned against a squeezed box
       opens a pixel off — so it never scales; the dots inside it squeeze on
       the press spring instead, which leaves the line of text where it is. No
       lean: the menu opens on pointerdown, so there is no "about to" to point
       at.

       That pointerdown is default-prevented by the DropdownMenu trigger, and
       `:active` still reaches the box — but only when it is not already
       focused. Measured in headed and headless Chromium with the mouse held,
       inside a real DropdownMenu: an unfocused trigger matches `:active` on
       every frame and the dots reach 0.9; once the menu has closed and handed
       focus back, the next press never matches, because opening moves focus
       into the menu and Chromium drops `:active` from an element that loses
       focus mid-press. Touch and pen were not measured. */
    interactive: {
      true: "shrink-0 rounded-full text-muted-foreground transition-colors duration-fast ease-out-expo outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&>svg]:transition-[scale] [&>svg]:duration-spring-press [&>svg]:ease-spring-press active:[&>svg]:scale-(--press-squeeze)",
      false: "",
    },
  },
  defaultVariants: {
    size: "default",
    interactive: false,
  },
})

interface BreadcrumbProps extends React.ComponentProps<"nav"> {
  /** Trail-wide type scale. `sm` is for dense chrome — a sticky topbar sitting
   *  beside small controls — not for page headers. */
  size?: BreadcrumbSize
  /** Glyph every `BreadcrumbSeparator` in this trail renders unless it
   *  overrides it locally or is given explicit children. */
  separator?: BreadcrumbSeparatorKind
}

type BreadcrumbListProps = React.ComponentProps<"ol">

type BreadcrumbItemProps = React.ComponentProps<"li">

interface BreadcrumbLinkProps extends React.ComponentProps<"a"> {
  asChild?: boolean
}

type BreadcrumbPageProps = React.ComponentProps<"span">

interface BreadcrumbSeparatorProps extends React.ComponentProps<"li"> {
  /** Per-joint override. The root's `separator` supplies the default, and
   *  explicit `children` still beat both. */
  variant?: BreadcrumbSeparatorKind
}

interface BreadcrumbEllipsisProps extends React.ComponentProps<"span"> {
  /** Renders the ellipsis as a real control so it can be a menu trigger.
   *  Supply a single element child to slot into, or omit children and a
   *  `<button>` is used. */
  asChild?: boolean
  /** Accessible name for the trigger form. Rendered as visually hidden text
   *  rather than aria-label so it is translatable and survives extraction. */
  label?: string
}

function Breadcrumb({
  size = "default",
  separator = "chevron",
  className,
  children,
  ...props
}: BreadcrumbProps) {
  const context = React.useMemo(() => ({ size, separator }), [size, separator])

  return (
    <nav
      aria-label="breadcrumb"
      data-slot="breadcrumb"
      data-size={size}
      className={cn(className)}
      {...props}
    >
      <BreadcrumbContext.Provider value={context}>
        {children}
      </BreadcrumbContext.Provider>
    </nav>
  )
}

function BreadcrumbList({ className, ...props }: BreadcrumbListProps) {
  const { size } = useBreadcrumb()

  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(breadcrumbListVariants({ size }), className)}
      {...props}
    />
  )
}

function BreadcrumbItem({ className, ...props }: BreadcrumbItemProps) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

function BreadcrumbLink({ asChild, className, ...props }: BreadcrumbLinkProps) {
  const { size } = useBreadcrumb()
  const Comp = asChild ? Slot.Root : "a"

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn(breadcrumbLinkVariants({ size }), className)}
      {...props}
    />
  )
}

function BreadcrumbPage({ className, ...props }: BreadcrumbPageProps) {
  const { size } = useBreadcrumb()

  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn(breadcrumbPageVariants({ size }), className)}
      {...props}
    />
  )
}

/* Every kind stays inside the presentational, aria-hidden li, which is what
 * keeps the trail reading as "Workspace, Agents, Overview" instead of
 * "Workspace, greater-than, Agents". The two arrows flip in RTL; a slash, a dot
 * and a hairline are direction-agnostic and must not. */
function BreadcrumbSeparatorGlyph({
  variant,
  size,
}: {
  variant: BreadcrumbSeparatorKind
  size: BreadcrumbSize
}) {
  switch (variant) {
    case "slash":
      return <SlashIcon />
    case "arrow":
      return <ArrowRightIcon className="rtl:rotate-180" />
    case "dot":
      return <span className="size-1 shrink-0 rounded-full bg-current" />
    case "line":
      return (
        <span
          className={cn(
            "w-px shrink-0 bg-border",
            size === "sm" ? "h-3.5" : "h-4"
          )}
        />
      )
    default:
      return <ChevronRightIcon className="rtl:rotate-180" />
  }
}

function BreadcrumbSeparator({
  variant,
  children,
  className,
  ...props
}: BreadcrumbSeparatorProps) {
  const { size, separator } = useBreadcrumb()
  const resolved = variant ?? separator

  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn(
        breadcrumbSeparatorVariants({ variant: resolved, size }),
        className
      )}
      {...props}
    >
      {children ?? <BreadcrumbSeparatorGlyph variant={resolved} size={size} />}
    </li>
  )
}

/* Two forms, one part.
 *
 * Decorative (the default) is a glyph inside an aria-hidden span — silent,
 * because collapsed crumbs that cannot be reached are not worth announcing.
 * There is deliberately no visually hidden text here: the usual shape puts one
 * inside the aria-hidden subtree, where nothing can ever read it.
 *
 * Trigger (`asChild`) drops the aria-hidden entirely, renders through Slot so a
 * menu trigger's props and ref land on a real focusable element, and carries a
 * visually hidden `label` so that element finally has an accessible name:
 *
 *   <DropdownMenuTrigger asChild>
 *     <BreadcrumbEllipsis asChild label="Show 3 hidden pages" />
 *   </DropdownMenuTrigger>
 *
 * The children are built as an array rather than a fragment on purpose — Slot
 * walks its children looking for the Slottable, and a fragment would hide it. */
function BreadcrumbEllipsis({
  asChild,
  label = "More pages",
  className,
  children,
  ...props
}: BreadcrumbEllipsisProps) {
  const { size } = useBreadcrumb()
  const Comp = asChild ? Slot.Root : "span"

  const content = asChild
    ? [
        <MoreHorizontalIcon key="glyph" aria-hidden="true" />,
        <span key="label" className="sr-only">
          {label}
        </span>,
        <Slot.Slottable key="target">
          {children ?? <button type="button" />}
        </Slot.Slottable>,
      ]
    : (children ?? <MoreHorizontalIcon />)

  return (
    <Comp
      data-slot="breadcrumb-ellipsis"
      role={asChild ? undefined : "presentation"}
      aria-hidden={asChild ? undefined : true}
      className={cn(
        breadcrumbEllipsisVariants({ size, interactive: Boolean(asChild) }),
        className
      )}
      {...props}
    >
      {content}
    </Comp>
  )
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  breadcrumbListVariants,
  breadcrumbLinkVariants,
  breadcrumbPageVariants,
  breadcrumbSeparatorVariants,
  breadcrumbEllipsisVariants,
}

export type {
  BreadcrumbProps,
  BreadcrumbListProps,
  BreadcrumbItemProps,
  BreadcrumbLinkProps,
  BreadcrumbPageProps,
  BreadcrumbSeparatorProps,
  BreadcrumbEllipsisProps,
  BreadcrumbSize,
  BreadcrumbSeparatorKind,
}
