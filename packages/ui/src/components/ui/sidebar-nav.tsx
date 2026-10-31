"use client"

import * as React from "react"
import { ArrowUpRightIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible"
import { Kbd } from "./kbd"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuCollapsible,
  SidebarMenuCollapsibleContent,
  SidebarMenuCollapsibleTrigger,
  SidebarMenuItem,
  SidebarMenuMeta,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "./sidebar"

/* ---------------------------------------------------------------------------
   The data layer over the sidebar primitives.

   Everything the primitives express is reachable by hand — that is the point of
   them — but a nav is the one place in an app shell where hand-written JSX
   stops paying for itself. The rows are homogeneous, there are twenty of them,
   they come from a route table, and the active one changes on every navigation.
   Written out longhand that is twenty near-identical blocks that drift.

   So this takes `NavGroup[]` and renders the composition, and deliberately owns
   no styling of its own beyond the two things the data implies: which row is
   current, and what trails the label.

   `renderLink` is the decoupling seam. The design system never imports a
   router; the app passes whatever its `<Link>` is and gets the row's contents
   back to wrap.

   No cva here. `size` is a pass-through to the existing menu-button axis and
   this component adds no variant axis of its own.
--------------------------------------------------------------------------- */

export interface NavNode {
  id: string
  label: React.ReactNode
  icon?: React.ReactNode
  href?: string
  badge?: number | string
  /** Rendered as a `<Kbd>` in the trailing slot, e.g. "⌘1". */
  shortcut?: string
  external?: boolean
  disabled?: boolean
  children?: NavNode[]
}

export interface NavGroup {
  id: string
  /** Omit for an unlabelled group. */
  label?: React.ReactNode
  /** Draw a rule above this group instead of labelling it. */
  separated?: boolean
  items: NavNode[]
  /** Rendered as a `SidebarGroupAction` beside the label. */
  action?: React.ReactNode
}

export interface SidebarNavProps
  extends Omit<React.ComponentProps<"nav">, "children"> {
  groups: NavGroup[]
  /** `NavNode.id` of the current page. Router-agnostic by design. */
  activeId?: string
  defaultExpandedIds?: string[]
  /** Controlled-optional: pass with `onExpandedChange` to drive expansion. */
  expandedIds?: string[]
  onExpandedChange?: (ids: string[]) => void
  /** Inject the app's link component. Return an element wrapping `children`. */
  renderLink?: (node: NavNode, children: React.ReactNode) => React.ReactNode
  size?: "sm" | "default" | "lg"
}

type RowRenderContext = {
  activeId: string | undefined
  expanded: ReadonlySet<string>
  setExpanded: (id: string, open: boolean) => void
  renderLink: SidebarNavProps["renderLink"]
  size: SidebarNavProps["size"]
}

/* The leading icon is the only thing that takes the brand green when a row is
   current. The row fill stays `--sidebar-accent`: a lime wash behind body text
   is a readability problem, and one saturated 16px glyph is enough to find the
   current row in a list of twenty.

   It is also the part that answers a press. The row is full width, so squeezing
   the whole row would move its edges by pixels; the glyph squeezes instead, on
   the press spring, while the colour keeps its instant clock. Sub rows render
   this same icon but sit under no `menu-button` group, so they do not squeeze —
   a deliberate gap rather than a second group name for one effect. A disabled
   row is pointer-events-none, so it never matches :active. */
function NavIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <span
      data-slot="sidebar-nav-icon"
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center text-sidebar-foreground/75 [transition-property:color,scale] [transition-duration:var(--duration-instant),var(--duration-spring-press)] [transition-timing-function:var(--ease-out-expo),var(--ease-spring-press)] group-active/menu-button:scale-(--press-squeeze) group-data-active/menu-button:text-selected"
    >
      {icon}
    </span>
  )
}

function NavMeta({ node }: { node: NavNode }) {
  if (node.badge === undefined && !node.shortcut && !node.external) {
    return null
  }

  return (
    <SidebarMenuMeta>
      {node.badge !== undefined ? <span>{node.badge}</span> : null}
      {node.shortcut ? (
        <Kbd size="sm" variant="muted">
          {node.shortcut}
        </Kbd>
      ) : null}
      {/* The one row that leaves the app says so on approach: the arrow steps a
          pixel along its own diagonal, which is the way it is pointing. */}
      {node.external ? (
        <ArrowUpRightIcon
          aria-hidden="true"
          className="size-3.5 transition-transform duration-base ease-out-expo group-hover/menu-button:translate-x-px group-hover/menu-button:-translate-y-px"
        />
      ) : null}
    </SidebarMenuMeta>
  )
}

function NavRowContent({ node }: { node: NavNode }) {
  return (
    <>
      {node.icon ? <NavIcon icon={node.icon} /> : null}
      <span className="min-w-0 flex-1 truncate">{node.label}</span>
      <NavMeta node={node} />
    </>
  )
}

/* Returns the props a row needs to host either a plain button or the caller's
   link element. `asChild` is only ever true when there is a real element to
   hand over, so a nav with no routing still renders semantic buttons. */
function resolveRowHost(
  node: NavNode,
  renderLink: SidebarNavProps["renderLink"],
  content: React.ReactNode
) {
  if (renderLink) {
    return { asChild: true, children: renderLink(node, content) }
  }

  if (node.href) {
    return {
      asChild: true,
      children: (
        <a
          href={node.href}
          target={node.external ? "_blank" : undefined}
          rel={node.external ? "noreferrer" : undefined}
        >
          {content}
        </a>
      ),
    }
  }

  return { asChild: false, children: content }
}

function NavLeaf({
  node,
  context,
}: {
  node: NavNode
  context: RowRenderContext
}) {
  const host = resolveRowHost(
    node,
    context.renderLink,
    <NavRowContent node={node} />
  )

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size={context.size}
        isActive={context.activeId === node.id}
        aria-disabled={node.disabled || undefined}
        tooltip={{ children: node.label }}
        asChild={host.asChild}
      >
        {host.children}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function NavBranch({
  node,
  context,
}: {
  node: NavNode
  context: RowRenderContext
}) {
  const children = node.children ?? []
  const open = context.expanded.has(node.id)

  return (
    <SidebarMenuCollapsible
      label={node.label}
      open={open}
      onOpenChange={(next) => context.setExpanded(node.id, next)}
    >
      <SidebarMenuCollapsibleTrigger
        size={context.size}
        isActive={context.activeId === node.id}
        aria-disabled={node.disabled || undefined}
        tooltip={{ children: node.label }}
      >
        {node.icon ? <NavIcon icon={node.icon} /> : null}
        <span className="min-w-0 flex-1 truncate">{node.label}</span>
      </SidebarMenuCollapsibleTrigger>
      <SidebarMenuCollapsibleContent>
        <NavSubList nodes={children} context={context} />
      </SidebarMenuCollapsibleContent>
    </SidebarMenuCollapsible>
  )
}

/* Depth two and beyond. The sub-button is an anchor by default, so a row that
   only toggles hands it a real `<button>` rather than an href-less link. */
function NavSubList({
  nodes,
  context,
}: {
  nodes: NavNode[]
  context: RowRenderContext
}) {
  return (
    <SidebarMenuSub>
      {nodes.map((node) => (
        <NavSubRow key={node.id} node={node} context={context} />
      ))}
    </SidebarMenuSub>
  )
}

function NavSubRow({
  node,
  context,
}: {
  node: NavNode
  context: RowRenderContext
}) {
  const content = <NavRowContent node={node} />
  const host = resolveRowHost(node, context.renderLink, content)
  const nested = node.children ?? []
  const isActive = context.activeId === node.id

  if (nested.length === 0) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          isActive={isActive}
          aria-disabled={node.disabled || undefined}
          asChild={host.asChild}
        >
          {host.children}
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    )
  }

  return (
    <SidebarMenuSubItem>
      <Collapsible
        className="group/sub-collapsible"
        open={context.expanded.has(node.id)}
        onOpenChange={(next) => context.setExpanded(node.id, next)}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuSubButton
            data-slot="sidebar-menu-sub-button"
            isActive={isActive}
            asChild
          >
            <button type="button">
              {content}
              <ChevronRightIcon
                aria-hidden="true"
                className="ml-auto shrink-0 text-sidebar-foreground/60 transition-transform duration-base ease-out-expo group-data-open/sub-collapsible:rotate-90"
              />
            </button>
          </SidebarMenuSubButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <NavSubList nodes={nested} context={context} />
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuSubItem>
  )
}

function SidebarNav({
  className,
  groups,
  activeId,
  defaultExpandedIds,
  expandedIds,
  onExpandedChange,
  renderLink,
  size = "default",
  "aria-label": ariaLabel = "Main",
  ...props
}: SidebarNavProps) {
  const [uncontrolled, setUncontrolled] = React.useState<string[]>(
    () => defaultExpandedIds ?? []
  )
  const resolved = expandedIds ?? uncontrolled

  const expanded = React.useMemo(() => new Set(resolved), [resolved])

  const setExpanded = React.useCallback(
    (id: string, open: boolean) => {
      const next = new Set(resolved)
      if (open) {
        next.add(id)
      } else {
        next.delete(id)
      }
      const value = Array.from(next)
      if (expandedIds === undefined) {
        setUncontrolled(value)
      }
      onExpandedChange?.(value)
    },
    [expandedIds, onExpandedChange, resolved]
  )

  const context = React.useMemo<RowRenderContext>(
    () => ({ activeId, expanded, setExpanded, renderLink, size }),
    [activeId, expanded, setExpanded, renderLink, size]
  )

  return (
    <nav
      data-slot="sidebar-nav"
      aria-label={ariaLabel}
      className={cn("flex w-full min-w-0 flex-col", className)}
      {...props}
    >
      {groups.map((group, index) => (
        <React.Fragment key={group.id}>
          {/* A rule above the group is the *alternative* to a heading, which is
              what makes "sections with subheadings" and "sections with
              dividers" one component reading two data shapes. A rule above the
              first group would be an edge, not a divider. */}
          {group.separated && index > 0 ? <SidebarSeparator /> : null}
          <SidebarGroup>
            {group.label ? (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            ) : null}
            {group.action ? (
              <SidebarGroupAction asChild={React.isValidElement(group.action)}>
                {group.action}
              </SidebarGroupAction>
            ) : null}
            <SidebarMenu>
              {group.items.map((node) =>
                node.children && node.children.length > 0 ? (
                  <NavBranch key={node.id} node={node} context={context} />
                ) : (
                  <NavLeaf key={node.id} node={node} context={context} />
                )
              )}
            </SidebarMenu>
          </SidebarGroup>
        </React.Fragment>
      ))}
    </nav>
  )
}

export { SidebarNav }
