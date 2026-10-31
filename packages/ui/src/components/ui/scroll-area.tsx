"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"

import { cn } from "../../lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      {/* A tab stop of its own. A viewport holding only text has nothing
          focusable inside it, so without one the keyboard has no way in to
          scroll; the focus ring below was already written for it. */}
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        tabIndex={0}
        className="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

/* Motion: the scrollbar is mounted and unmounted rather than dimmed. On the
   default `hover` type the primitive keeps it out of the tree entirely until
   the pointer enters, so its opacity *is* the hover affordance and a plain
   transition has nothing to run on — hence a keyframe pair rather than a
   transition, which is also what lets the primitive hold the unmount open
   until the fade has finished.

   Opacity with no travel, on purpose. This is chrome sitting on the edge of
   someone else's content: a scrollbar that slides in announces itself while
   the eye is trying to read what it is scrolling past. Fading is enough to
   say "this appeared because you are here" without becoming the subject.

   `duration-slow` in, `duration-exit` out — the same pairing the overlays use
   for their scrims, which is the closest relative this has in the system. The
   enter only sounds leisurely: `ease-out-expo` is front-loaded hard enough
   that it is most of the way opaque inside the first quarter, so it still
   answers the pointer immediately while the tail keeps it from snapping.

   Nothing here touches the resting thumb, which stays exactly as opaque as it
   ever was; the appearing is the whole effect. */
function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent data-[state=visible]:animate-in data-[state=visible]:fade-in-0 data-[state=visible]:anim-slow data-[state=visible]:ease-out-expo data-[state=hidden]:animate-out data-[state=hidden]:fade-out-0 data-[state=hidden]:anim-exit data-[state=hidden]:ease-out-expo",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
