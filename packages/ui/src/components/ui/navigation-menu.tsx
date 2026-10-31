import * as React from "react"
import { cva } from "class-variance-authority"
import { NavigationMenu as NavigationMenuPrimitive } from "radix-ui"

import { cn } from "../../lib/utils"
import { ChevronDownIcon } from "lucide-react"

function NavigationMenu({
  className,
  children,
  viewport = true,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root> & {
  viewport?: boolean
}) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      data-viewport={viewport}
      className={cn(
        "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        className
      )}
      {...props}
    >
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
  )
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn(
        "group flex flex-1 list-none items-center justify-center gap-0",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  )
}

/* Colour only. The trigger owns an anchored panel, so it deliberately skips the
   press scale every other control gets — a trigger that shrinks drags the
   surface hanging off it. */
const navigationMenuTriggerStyle = cva(
  "group/navigation-menu-trigger inline-flex h-10 w-max items-center justify-center rounded-full px-4 py-2 text-body font-medium transition-all duration-fast ease-out-expo outline-none hover:bg-accent focus:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-popup-open:bg-accent data-popup-open:hover:bg-accent data-open:bg-accent data-open:hover:bg-accent data-open:focus:bg-accent"
)

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), "group", className)}
      {...props}
    >
      {children}{" "}
      <ChevronDownIcon className="relative top-px ml-1 size-3 transition-transform duration-spring-press ease-spring-press group-data-popup-open/navigation-menu-trigger:rotate-180 group-data-open/navigation-menu-trigger:rotate-180" aria-hidden="true" />
    </NavigationMenuPrimitive.Trigger>
  )
}

/* With a viewport, content never opens or closes on its own — it hands off
   sideways to the neighbouring panel. That is a swap, not an arrival, so it
   rides the swap spring in and a short tween out, travelling half as far. */
const navigationMenuContentSwap = [
  "data-[motion^=from-]:animate-in data-[motion^=from-]:fade-in data-[motion^=from-]:duration-(--duration-spring-swap) data-[motion^=from-]:ease-spring-swap",
  "data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52",
  "data-[motion^=to-]:animate-out data-[motion^=to-]:fade-out data-[motion^=to-]:duration-(--duration-exit) data-[motion^=to-]:ease-out-expo",
  "data-[motion=to-end]:slide-out-to-right-26 data-[motion=to-start]:slide-out-to-left-26",
].join(" ")

/* Without a viewport each content block is its own popover, so it arrives like
   one: panel spring, short rise, a blur that resolves as it lands. The exit is
   the same shape at half the travel on a short tween. These carry the extra
   parent selector, so they outrank the swap rules above wherever both match. */
const navigationMenuContentPanel = [
  "group-data-[viewport=false]/navigation-menu:data-open:animate-in group-data-[viewport=false]/navigation-menu:data-open:fade-in-0 group-data-[viewport=false]/navigation-menu:data-open:zoom-in-95 group-data-[viewport=false]/navigation-menu:data-open:slide-in-from-top-[4px] group-data-[viewport=false]/navigation-menu:data-open:blur-in-[6px]",
  "group-data-[viewport=false]/navigation-menu:data-open:duration-(--duration-spring-panel) group-data-[viewport=false]/navigation-menu:data-open:ease-spring-panel",
  "group-data-[viewport=false]/navigation-menu:data-closed:animate-out group-data-[viewport=false]/navigation-menu:data-closed:fade-out-0 group-data-[viewport=false]/navigation-menu:data-closed:zoom-out-98 group-data-[viewport=false]/navigation-menu:data-closed:slide-out-to-top-[2px]",
  "group-data-[viewport=false]/navigation-menu:data-closed:duration-(--duration-exit) group-data-[viewport=false]/navigation-menu:data-closed:ease-out-expo",
].join(" ")

function NavigationMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        "top-0 left-0 w-full p-1 group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-[16px] group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:shadow-float group-data-[viewport=false]/navigation-menu:ring-1 group-data-[viewport=false]/navigation-menu:ring-foreground/[0.06] **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none md:absolute md:w-auto",
        navigationMenuContentSwap,
        navigationMenuContentPanel,
        className
      )}
      {...props}
    />
  )
}

/* The viewport is the one surface every panel lands in, so it owns the arrival:
   panel spring, short rise, a blur that resolves as it settles — and it grows
   from the bar it hangs off rather than from its own middle. Resizing as one
   trigger hands over to the next is a swap, not an arrival, so the size change
   runs on the swap spring instead.

   Keeping those two apart takes care on both axes. `anim-*` splits the duration.
   The easing needs the same treatment and has no `anim-` equivalent: an `ease-*`
   utility writes `transition-timing-function` as well as `--tw-ease`, and this
   element is `data-open` for its whole visible life — so `data-open:ease-…`
   would quietly retime the size transition too, running the swap spring's curve
   at the panel spring's shape. Writing `--tw-ease` directly reaches the keyframe
   and nothing else; the unconditional `ease-spring-swap` keeps the transition. */
const navigationMenuViewportMotion = [
  "origin-top transition-[width,height] duration-spring-swap ease-spring-swap",
  "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.96] data-open:slide-in-from-top-[4px] data-open:blur-in-[6px] data-open:anim-spring-panel data-open:[--tw-ease:var(--ease-spring-panel)]",
  "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.98] data-closed:slide-out-to-top-[2px] data-closed:anim-exit data-closed:[--tw-ease:var(--ease-out-expo)]",
].join(" ")

function NavigationMenuViewport({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <div
      className={cn(
        "absolute top-full left-0 isolate z-50 flex justify-center"
      )}
    >
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          "origin-top-center relative mt-1.5 h-(--radix-navigation-menu-viewport-height) w-full overflow-hidden rounded-[16px] bg-popover text-popover-foreground shadow-float ring-1 ring-foreground/[0.06] md:w-(--radix-navigation-menu-viewport-width)",
          navigationMenuViewportMotion,
          className
        )}
        {...props}
      />
    </div>
  )
}

function NavigationMenuLink({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "flex items-center gap-2 rounded-[10px] p-2.5 text-body transition-all duration-instant ease-out-expo outline-none hover:bg-accent focus:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1 in-data-[slot=navigation-menu-content]:rounded-md data-active:bg-accent data-active:hover:bg-accent data-active:focus:bg-accent [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

/* Travelling from one trigger to the next is the only thing this arrow does, so
   the glide is the whole component: overdamped, because an indicator that
   overshoots its target reads as imprecise.

   The position arrives as an inline `transform`, and the enter/exit keyframes
   write that same property — left alone they yank the arrow to the track origin
   for the length of the fade and slide it back. Seeding the keyframe translate
   from the primitive's own offset var cancels that, so appearing and leaving
   stay a pure fade in place and every pixel of travel belongs to the glide.

   The fade's easing is written as `--tw-ease` for the same reason as on the
   viewport: an `ease-*` utility would also overwrite `transition-timing-function`
   and flatten the glide, since the element is `data-state=visible` the entire
   time it is travelling. */
const navigationMenuIndicatorMotion = [
  "[--tw-enter-translate-x:var(--radix-navigation-menu-indicator-translate-x,0)] [--tw-enter-translate-y:var(--radix-navigation-menu-indicator-translate-y,0)]",
  "[--tw-exit-translate-x:var(--radix-navigation-menu-indicator-translate-x,0)] [--tw-exit-translate-y:var(--radix-navigation-menu-indicator-translate-y,0)]",
  "transition-[transform,width,height] duration-spring-glide ease-spring-glide",
  "data-[state=visible]:animate-in data-[state=visible]:fade-in data-[state=visible]:anim-base data-[state=visible]:[--tw-ease:var(--ease-out-expo)]",
  "data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=hidden]:anim-exit data-[state=hidden]:[--tw-ease:var(--ease-out-expo)]",
].join(" ")

function NavigationMenuIndicator({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Indicator>) {
  return (
    <NavigationMenuPrimitive.Indicator
      data-slot="navigation-menu-indicator"
      className={cn(
        "top-full z-1 flex h-1.5 items-end justify-center overflow-hidden",
        navigationMenuIndicatorMotion,
        className
      )}
      {...props}
    >
      <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
    </NavigationMenuPrimitive.Indicator>
  )
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
}
