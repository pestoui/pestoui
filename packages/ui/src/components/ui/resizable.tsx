"use client"

import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "../../lib/utils"

function ResizablePanelGroup({
  className,
  ...props
}: ResizablePrimitive.GroupProps) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full aria-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    />
  )
}

function ResizablePanel({ ...props }: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />
}

/* Motion: the grip grows along its own long axis as the pointer enters the
   hit region, and grows again while a drag is in progress. The underlying
   primitive publishes its own state on `data-separator` (inactive / hover /
   focus / active / disabled), which is what makes this expressible without a
   single line of React — the drag state in particular survives the pointer
   leaving the handle, so the grip stays large for the whole drag instead of
   snapping back the moment the cursor outruns it.

   Enters on the press spring, returns on the shorter exit tween, and the drag
   step is larger than the hover step so the two states are distinguishable
   rather than one being a slightly warmer version of the other.

   `scale-y` rather than a height change on purpose: height would reflow the
   flex row between the two panels on every hover. The rotation applied in the
   horizontal orientation costs nothing here — individual transform properties
   scale in the element's local space before rotating, so the grip grows along
   its own length in both directions without a second rule.

   The bare 1px separator (no `withHandle`) is left static. Anything that could
   register at that width means either scaling a hairline, which just blurs it,
   or shifting its colour — out of scope for a motion pass. The cursor change
   the primitive already performs is the affordance there. */
function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        "group/resizable-handle relative flex w-px items-center justify-center bg-border ring-offset-background after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-6 w-1 shrink-0 rounded-lg bg-border transition-transform duration-exit ease-out-expo group-data-[separator=hover]/resizable-handle:scale-y-110 group-data-[separator=hover]/resizable-handle:duration-spring-press group-data-[separator=hover]/resizable-handle:ease-spring-press group-data-[separator=active]/resizable-handle:scale-y-125 group-data-[separator=active]/resizable-handle:duration-spring-press group-data-[separator=active]/resizable-handle:ease-spring-press" />
      )}
    </ResizablePrimitive.Separator>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
