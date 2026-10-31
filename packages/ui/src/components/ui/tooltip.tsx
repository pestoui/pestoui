"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { cn } from "../../lib/utils"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 inline-flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-caption text-background shadow-float has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-bottom-2 data-[side=left]:slide-in-from-left-2 data-[side=right]:slide-in-from-right-2 data-[side=top]:slide-in-from-top-2 data-[side=bottom]:slide-out-to-bottom-1 data-[side=left]:slide-out-to-left-1 data-[side=right]:slide-out-to-right-1 data-[side=top]:slide-out-to-top-1 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm data-[state$=open]:animate-in data-[state$=open]:fade-in-0 data-[state$=open]:zoom-in-90 data-[state$=open]:blur-in-5 data-[state$=open]:duration-(--duration-spring-swap) data-[state$=open]:ease-spring-swap data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-94 data-closed:blur-out-3 data-closed:duration-(--duration-exit) data-closed:ease-out-expo",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
