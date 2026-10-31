"use client"

import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { cn } from "../../lib/utils"
import { toggleVariants } from "./toggle"

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants> & {
    spacing?: number
    orientation?: "horizontal" | "vertical"
  }
>({
  size: "default",
  variant: "default",
  spacing: 2,
  orientation: "horizontal",
})

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 2,
  orientation = "horizontal",
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants> & {
    spacing?: number
    orientation?: "horizontal" | "vertical"
  }) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      style={{ "--gap": spacing } as React.CSSProperties}
      className={cn(
        "group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] rounded-[11px] data-[size=sm]:rounded-[9px] data-vertical:flex-col data-vertical:items-stretch",
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider
        value={{ variant, size, spacing, orientation }}
      >
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      className={cn(
        // Segmented items sit flush against each other, so the press scale is
        // pulled back — a full-strength squish would open a visible seam.
        "shrink-0 group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-2 group-data-[spacing=0]/toggle-group:active:scale-[0.98] focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pr-1.5 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:pl-1.5 group-data-horizontal/toggle-group:data-[spacing=0]:first:rounded-l-lg group-data-vertical/toggle-group:data-[spacing=0]:first:rounded-t-lg group-data-horizontal/toggle-group:data-[spacing=0]:last:rounded-r-lg group-data-vertical/toggle-group:data-[spacing=0]:last:rounded-b-lg group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        // The Switch's lean, for a choice of one: while a sibling is held, the
        // selected item leans half a lean toward it — the selection about to
        // move, shown before it does. Half, because it is a whole item moving
        // rather than a knob inside a track. Radio items only (single mode),
        // and never when flush (spacing 0), where any travel opens a seam.
        // Both selector directions are spelled per axis and per writing
        // direction, because `translate` is physical and the next sibling is
        // on the left in RTL. Direction is read off the group root's own `dir`
        // attribute: Radix always writes one there (`ltr` unless the `dir`
        // prop or a DirectionProvider says otherwise), and it is the nearest
        // `dir` above every item, so it is the direction the row is laid out
        // in. Not `:dir()` — the production build lowers it to a `:lang()`
        // list, which leans an RTL row on an English page the wrong way and
        // costs ~3.4 kB — and not Tailwind's `rtl:`, which also matches
        // through any RTL ancestor and would lean an LTR group inside an RTL
        // page the wrong way. The trade-off of an attribute selector is that it
        // cannot see a `dir` written below the root: an item given its own
        // `dir` (a nested island inside its row) still follows the root, which
        // is the right call, since the item's position in the row is the
        // root's to decide.
        "group-data-horizontal/toggle-group:not-data-[spacing=0]:data-[state=on]:group-not-[[dir=rtl]]/toggle-group:[&[role=radio]:has(~[role=radio]:active)]:translate-x-[calc(var(--press-lean)/2)] group-data-horizontal/toggle-group:not-data-[spacing=0]:data-[state=on]:group-not-[[dir=rtl]]/toggle-group:[[role=radio]:active~&[role=radio]]:translate-x-[calc(var(--press-lean)/-2)] group-data-horizontal/toggle-group:not-data-[spacing=0]:data-[state=on]:group-[[dir=rtl]]/toggle-group:[&[role=radio]:has(~[role=radio]:active)]:translate-x-[calc(var(--press-lean)/-2)] group-data-horizontal/toggle-group:not-data-[spacing=0]:data-[state=on]:group-[[dir=rtl]]/toggle-group:[[role=radio]:active~&[role=radio]]:translate-x-[calc(var(--press-lean)/2)] group-data-vertical/toggle-group:not-data-[spacing=0]:data-[state=on]:[&[role=radio]:has(~[role=radio]:active)]:translate-y-[calc(var(--press-lean)/2)] group-data-vertical/toggle-group:not-data-[spacing=0]:data-[state=on]:[[role=radio]:active~&[role=radio]]:translate-y-[calc(var(--press-lean)/-2)]",
        // toggleVariants' own transition lists with `translate` appended on the
        // press spring, so the lean eases out and back like the squeeze does.
        // Restated whole and placed after toggleVariants so it replaces that
        // list rather than tying with it — keep the first four in step with
        // toggle.tsx.
        "[transition-property:color,background-color,border-color,scale,translate] [transition-duration:var(--duration-base),var(--duration-base),var(--duration-base),var(--duration-spring-press),var(--duration-spring-press)] [transition-timing-function:var(--ease-out-expo),var(--ease-out-expo),var(--ease-out-expo),var(--ease-spring-press),var(--ease-spring-press)]",
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
