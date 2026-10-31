"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronRight } from "lucide-react"

import { cn } from "../../lib/utils"

type TreeNode = {
  id: string
  label: string
  icon?: React.ReactNode
  children?: TreeNode[]
}

/* One visible row, flattened. Rebuilt whenever the data or the expansion set
   changes — it is what the arrow keys walk. */
type TreeRow = {
  id: string
  parentId: string | undefined
  hasChildren: boolean
}

function collectRows(
  nodes: readonly TreeNode[],
  expandedIds: ReadonlySet<string>,
  parentId: string | undefined,
  rows: TreeRow[]
) {
  for (const node of nodes) {
    const children = node.children
    const hasChildren = children !== undefined && children.length > 0
    rows.push({ id: node.id, parentId, hasChildren })
    if (children && hasChildren && expandedIds.has(node.id)) {
      collectRows(children, expandedIds, node.id, rows)
    }
  }
  return rows
}

const treeItemVariants = cva(
  "group/tree-item relative flex w-full items-center border border-transparent text-left whitespace-nowrap transition-colors outline-none select-none hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      /* Explicit squircle radii — these rows are short (28–32px), so a token or
         full radius would exceed half the box and round a short label into a
         lozenge. Matches the documented list-row spec (sidebar / menu items). */
      size: {
        default: "h-8 gap-1.5 rounded-[10px] px-2 text-body",
        sm: "h-7 gap-1 rounded-[9px] px-1.5 text-caption",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

type TreeContextValue = {
  expandedIds: ReadonlySet<string>
  selectedId: string | undefined
  activeId: string | undefined
  showGuides: boolean
  size: VariantProps<typeof treeItemVariants>["size"]
  registerRow: (id: string, element: HTMLButtonElement | null) => void
  activateRow: (id: string, hasChildren: boolean) => void
  focusRow: (id: string) => void
  handleKeyDown: (
    event: React.KeyboardEvent<HTMLButtonElement>,
    id: string
  ) => void
}

const TreeContext = React.createContext<TreeContextValue | null>(null)

function useTreeContext() {
  const context = React.useContext(TreeContext)
  if (!context) {
    throw new Error("TreeItem must be used within a <TreeView />.")
  }
  return context
}

function TreeView({
  className,
  data,
  defaultExpanded,
  selectedId,
  onSelect,
  showGuides = true,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"ul">, "onSelect" | "children"> &
  VariantProps<typeof treeItemVariants> & {
    data: TreeNode[]
    defaultExpanded?: string[]
    selectedId?: string
    onSelect?: (id: string) => void
    showGuides?: boolean
  }) {
  const [expandedIds, setExpandedIds] = React.useState<ReadonlySet<string>>(
    () => new Set(defaultExpanded)
  )
  const [internalSelectedId, setInternalSelectedId] = React.useState<string>()
  const [focusedId, setFocusedId] = React.useState<string>()
  const rowRefs = React.useRef(new Map<string, HTMLButtonElement>())

  const rows = React.useMemo(
    () => collectRows(data, expandedIds, undefined, []),
    [data, expandedIds]
  )

  const resolvedSelectedId = selectedId ?? internalSelectedId
  const isVisible = (id: string | undefined) =>
    id !== undefined && rows.some((row) => row.id === id)

  /* Roving tabindex — exactly one row is reachable with Tab: the last one
     touched, otherwise the selected one, otherwise the first row. */
  const activeId = isVisible(focusedId)
    ? focusedId
    : isVisible(resolvedSelectedId)
      ? resolvedSelectedId
      : rows[0]?.id

  function registerRow(id: string, element: HTMLButtonElement | null) {
    if (element) {
      rowRefs.current.set(id, element)
    } else {
      rowRefs.current.delete(id)
    }
  }

  function setExpansion(id: string, open: boolean) {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (open) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  function focusRow(id: string) {
    setFocusedId(id)
    rowRefs.current.get(id)?.focus()
  }

  function activateRow(id: string, hasChildren: boolean) {
    if (hasChildren) {
      setExpansion(id, !expandedIds.has(id))
    }
    setInternalSelectedId(id)
    onSelect?.(id)
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    id: string
  ) {
    const index = rows.findIndex((row) => row.id === id)
    const row = rows[index]
    if (!row) return

    const step = (target: TreeRow | undefined) => {
      if (!target) return
      event.preventDefault()
      focusRow(target.id)
    }

    switch (event.key) {
      case "ArrowDown":
        step(rows[index + 1])
        break
      case "ArrowUp":
        step(rows[index - 1])
        break
      case "ArrowRight":
        if (!row.hasChildren) break
        event.preventDefault()
        if (expandedIds.has(id)) {
          focusRow(rows[index + 1]?.id ?? id)
        } else {
          setExpansion(id, true)
        }
        break
      case "ArrowLeft":
        if (row.hasChildren && expandedIds.has(id)) {
          event.preventDefault()
          setExpansion(id, false)
        } else if (row.parentId) {
          event.preventDefault()
          focusRow(row.parentId)
        }
        break
      case "Home":
        step(rows[0])
        break
      case "End":
        step(rows[rows.length - 1])
        break
      case "Enter":
      case " ":
        event.preventDefault()
        activateRow(id, row.hasChildren)
        break
      default:
        break
    }
  }

  return (
    <TreeContext.Provider
      value={{
        expandedIds,
        selectedId: resolvedSelectedId,
        activeId,
        showGuides,
        size,
        registerRow,
        activateRow,
        focusRow,
        handleKeyDown,
      }}
    >
      <ul
        data-slot="tree-view"
        role="tree"
        className={cn("flex w-full flex-col gap-0.5", className)}
        {...props}
      >
        {data.map((node) => (
          <TreeItem key={node.id} node={node} depth={0} />
        ))}
      </ul>
    </TreeContext.Provider>
  )
}

function TreeItem({
  className,
  node,
  depth = 0,
  ...props
}: Omit<React.ComponentProps<"li">, "children"> & {
  node: TreeNode
  depth?: number
}) {
  const {
    expandedIds,
    selectedId,
    activeId,
    showGuides,
    size,
    registerRow,
    activateRow,
    focusRow,
    handleKeyDown,
  } = useTreeContext()

  const groupId = `tree-group-${React.useId()}`
  const children = node.children
  const hasChildren = children !== undefined && children.length > 0
  const isExpanded = hasChildren && expandedIds.has(node.id)
  const isSelected = selectedId === node.id

  return (
    <li
      data-slot="tree-item"
      role="none"
      className={cn("min-w-0", className)}
      {...props}
    >
      <button
        ref={(element) => {
          registerRow(node.id, element)
        }}
        type="button"
        role="treeitem"
        data-slot="tree-item-trigger"
        data-selected={isSelected}
        aria-level={depth + 1}
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-owns={isExpanded ? groupId : undefined}
        tabIndex={activeId === node.id ? 0 : -1}
        onClick={() => activateRow(node.id, hasChildren)}
        onFocus={() => focusRow(node.id)}
        onKeyDown={(event) => handleKeyDown(event, node.id)}
        className={cn(
          treeItemVariants({ size }),
          /* One accent says "this is the current row": a --selected label over a
               low-alpha wash of the same colour. The wash is a background, but it
               stays on --selected rather than --primary — at these alphas the
               CTA lime is too pale to register on a light surface. */
          isSelected &&
            "bg-selected/10 font-medium text-selected hover:bg-selected/15 dark:bg-selected/15 dark:hover:bg-selected/20"
        )}
      >
        {hasChildren ? (
          /* The quarter turn is the Switch's travel (`turn-travel`, 3.7° past
             and back) and the press its squeeze-and-lean toward the next turn.
             The overshoot is on the chevron only: it is 4px of glyph, not the
             subtree, so the "too often for overshoot" rule below still holds
             for the thing that is large. Arrow keys get the turn, not the press. */
          <ChevronRight
            aria-hidden="true"
            className="size-4 text-muted-foreground/80 turn-travel group-active/tree-item:press-turn group-aria-expanded/tree-item:rotate-90 group-aria-expanded/tree-item:[--turn-dir:-1] group-aria-selected/tree-item:text-selected/80"
          />
        ) : (
          <span aria-hidden="true" className="size-4 shrink-0" />
        )}
        {node.icon ? (
          <span
            data-slot="tree-item-icon"
            aria-hidden="true"
            className="flex size-4 shrink-0 items-center justify-center text-muted-foreground group-aria-selected/tree-item:text-selected [&_svg]:size-4"
          >
            {node.icon}
          </span>
        ) : null}
        <span data-slot="tree-item-label" className="truncate">
          {node.label}
        </span>
      </button>
      {isExpanded && children ? (
        <ul
          id={groupId}
          role="group"
          data-slot="tree-item-group"
          /* ms-4 lands the guide directly under the parent chevron's centre.

             The subtree settles into the space rather than appearing in it: it
             is mounted by the expansion, so `starting:` is the only way in — a
             plain transition has nothing to travel from on a fresh mount. The
             glide spring is deliberately overdamped; a tree is expanded far too
             often for overshoot to stay charming.

             The row space itself opens instantly. Animating the height would
             mean either measuring the group in JS or leaving `overflow-hidden`
             on it forever, and a standing clip would cut the focus ring off the
             rows inside — a rest-state regression to buy an enter animation. */
          className={cn(
            "ms-4 flex flex-col gap-0.5 border-l ps-2 pt-0.5 transition-[opacity,translate] duration-spring-glide ease-spring-glide starting:-translate-y-1 starting:opacity-0",
            showGuides ? "border-border" : "border-transparent"
          )}
        >
          {children.map((child) => (
            <TreeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export { TreeView, TreeItem, treeItemVariants }
export type { TreeNode }
