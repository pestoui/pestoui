import * as React from "react"
import { Select as SelectPrimitive } from "radix-ui"

import { cn } from "../../lib/utils"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        /* A disabled trigger nudges when pressed rather than doing nothing, as
           the Switch does. It works because the box is not
           `pointer-events-none`: a disabled button still takes `:active`.
           Measured in headed and headless Chromium with the mouse held, two
           presses: `:active` on every frame, `nudge` running at -1.9px. */
        "group/select-trigger flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-card shadow-xs py-2 pr-3 pl-4 text-body whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-disabled:active:animate-nudge aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-11 data-[size=sm]:h-9 data-[size=sm]:rounded-[min(var(--radius-md),12px)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        {/* Flips to point at the open panel. The flip is the Switch's travel
            (`turn-travel`: past the half turn and back); the press is a squeeze
            of the chevron, never of the trigger, because the panel is
            positioned against the trigger's box. No lean: a mouse opens Select
            on pointerdown, so the turn has already begun and a lean would point
            back the way it came.

            Whether the squeeze shows depends on focus, not on the
            default-prevented pointerdown. Measured in headed and headless
            Chromium with the mouse held: a press on a trigger that is not
            focused keeps `:active` on every frame and the chevron reaches
            0.9; a press on a trigger that already has focus never matches
            `:active`, because opening moves focus into the panel and Chromium
            drops `:active` from an element that loses focus mid-press. Radix
            hands focus back to the trigger on close, so an immediate re-open
            gets the flip alone. Touch and pen were not measured. */}
        <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground turn-travel group-active/select-trigger:press-turn group-active/select-trigger:[--turn-dir:0] group-data-open/select-trigger:rotate-180" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

/* Options land one after another instead of arriving as a slab. Capped at eight
   beats — everything past the cap shares the last delay, so a fifty-option list
   still finishes in about a third of a second rather than crawling. */
const selectItemStagger = [
  "[&>*]:animate-in [&>*]:fade-in-0 [&>*]:slide-in-from-top-[6px] [&>*]:blur-in-[3px]",
  "[&>*]:fill-mode-backwards [&>*]:anim-base [&>*]:ease-out-expo",
  "[&>*:nth-child(2)]:[--tw-animation-delay:calc(1*var(--stagger-base))]",
  "[&>*:nth-child(3)]:[--tw-animation-delay:calc(2*var(--stagger-base))]",
  "[&>*:nth-child(4)]:[--tw-animation-delay:calc(3*var(--stagger-base))]",
  "[&>*:nth-child(5)]:[--tw-animation-delay:calc(4*var(--stagger-base))]",
  "[&>*:nth-child(6)]:[--tw-animation-delay:calc(5*var(--stagger-base))]",
  "[&>*:nth-child(7)]:[--tw-animation-delay:calc(6*var(--stagger-base))]",
  "[&>*:nth-child(n+8)]:[--tw-animation-delay:calc(7*var(--stagger-base))]",
].join(" ")

function SelectContent({
  className,
  children,
  position = "popper",
  align = "start",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        data-align-trigger={position === "item-aligned"}
        className={cn(
          "relative z-50 max-h-(--radix-select-content-available-height) min-w-36 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 data-[align-trigger=true]:animate-none",
          /* Unfolds from the trigger — Radix supplies the origin, the panel
             spring supplies the weight. */
          "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.96] data-open:anim-spring-panel data-open:ease-spring-panel data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          /* Dismissal drops the spring for a short tween and travels half as
             far back toward the trigger. */
          "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.98] data-closed:anim-exit data-closed:ease-out-expo data-[side=bottom]:slide-out-to-top-1 data-[side=left]:slide-out-to-right-1 data-[side=right]:slide-out-to-left-1 data-[side=top]:slide-out-to-bottom-1",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        align={align}
        sideOffset={sideOffset}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          data-position={position}
          className={cn(
            "p-2 data-[position=popper]:w-full data-[position=popper]:min-w-(--radix-select-trigger-width)",
            selectItemStagger
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-2.5 py-1.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md py-2 pr-9 pl-2.5 text-body outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        /* Highlight tracking has to keep up with the pointer, so this is one of
           the few places fast beats smooth. */
        "transition-colors duration-instant ease-out-expo",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute right-2.5 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          {/* The tick presses in rather than blinking on. */}
          <CheckIcon className="pointer-events-none animate-in fade-in-0 zoom-in-50 anim-spring ease-spring-press" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronUpIcon
      />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronDownIcon
      />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
