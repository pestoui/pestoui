"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"

import { cn } from "../../lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog"
import {
  InputGroup,
  InputGroupAddon,
} from "./input-group"
import { SearchIcon, CheckIcon } from "lucide-react"

/* How long the item cascade stays armed after the palette mounts. Covers the
   longest beat (the capped delay plus one item's own run) with a little slack. */
const COMMAND_ENTER_WINDOW = 500

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  /* The cascade below is a "the palette opened" cue, and it has to be gated to
     say only that. Filtering unmounts the items that no longer match and moves
     the survivors to re-rank them, and both of those restart an enter animation
     — ungated, every keystroke would re-run the whole cascade. So the window is
     armed on mount and closed once, and descendants opt in through it. */
  const [entering, setEntering] = React.useState(true)

  React.useEffect(() => {
    const id = window.setTimeout(() => setEntering(false), COMMAND_ENTER_WINDOW)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <CommandPrimitive
      data-slot="command"
      data-entering={entering ? "true" : undefined}
      className={cn(
        "group/command flex size-full flex-col overflow-hidden rounded-xl! bg-popover p-2 text-popover-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(
          "top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0",
          className
        )}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="p-1 pb-2">
      <InputGroup className="h-12! rounded-[12px]! border-transparent bg-secondary/60 shadow-none! *:data-[slot=input-group-addon]:pl-3!">
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "w-full text-body outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        <InputGroupAddon>
          <SearchIcon className="size-4 shrink-0 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn(
        "py-8 text-center text-body text-muted-foreground",
        /* Only ever an enter: this mounts the moment a search goes cold, and
           replacing a list of results with a flat line of text is abrupt
           without one. Ungated on purpose — it should say "nothing matched"
           every time that becomes true, not just on open. */
        "animate-in fade-in-0 slide-in-from-top-[3px] anim-base ease-out-expo",
        className
      )}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    /* cmdk hard-codes role="separator", and a listbox may own only options
       and groups — so the rule is decorative here and kept out of the tree. */
    <CommandPrimitive.Separator
      data-slot="command-separator"
      aria-hidden="true"
      className={cn("-mx-1 h-px bg-border", className)}
      {...props}
    />
  )
}

/* Highlight tracks the pointer and the arrow keys, so it has to land under the
   cursor rather than chase it — 75ms is one of the few places in the system
   where fast beats smooth. */
const commandItemHighlight = "transition-colors duration-instant ease-out-expo"

/* Rows materialise in sequence, but only inside the window `Command` opens — a
   palette is a place you arrive at, not a place you watch redraw. Capped at
   eight beats so a long list cannot turn into a slow wipe; everything past the
   cap shares the last delay. The delay properties sit outside the gate because
   they are inert with no animation to delay. Counting restarts inside each
   group, which is what you want: groups cascade alongside each other, not one
   after the other. */
const commandItemEnter = [
  "group-data-[entering=true]/command:animate-in group-data-[entering=true]/command:fade-in-0 group-data-[entering=true]/command:slide-in-from-top-[4px] group-data-[entering=true]/command:blur-in-[3px]",
  "group-data-[entering=true]/command:fill-mode-backwards group-data-[entering=true]/command:anim-base group-data-[entering=true]/command:ease-out-expo",
  "nth-2:[--tw-animation-delay:calc(1*var(--stagger-tight))]",
  "nth-3:[--tw-animation-delay:calc(2*var(--stagger-tight))]",
  "nth-4:[--tw-animation-delay:calc(3*var(--stagger-tight))]",
  "nth-5:[--tw-animation-delay:calc(4*var(--stagger-tight))]",
  "nth-6:[--tw-animation-delay:calc(5*var(--stagger-tight))]",
  "nth-7:[--tw-animation-delay:calc(6*var(--stagger-tight))]",
  "nth-[n+8]:[--tw-animation-delay:calc(7*var(--stagger-tight))]",
].join(" ")

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex cursor-default items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-body outline-hidden select-none in-data-[slot=dialog-content]:rounded-[10px]! data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-accent data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-selected:*:[svg]:text-foreground",
        commandItemHighlight,
        commandItemEnter,
        className
      )}
      {...props}
    >
      {children}
      {/* Presses in on the press spring, leaves on the shorter tween. */}
      <CheckIcon className="ml-auto scale-90 opacity-0 transition-[opacity,scale] duration-exit ease-out-expo group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:scale-100 group-data-[checked=true]/command-item:opacity-100 group-data-[checked=true]/command-item:duration-spring-press group-data-[checked=true]/command-item:ease-spring-press" />
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-data-selected/command-item:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
