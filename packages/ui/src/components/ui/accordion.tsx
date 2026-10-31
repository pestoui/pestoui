import * as React from "react"
import { Accordion as AccordionPrimitive } from "radix-ui"

import { cn } from "../../lib/utils"
import { ChevronDownIcon } from "lucide-react"

function Accordion({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col", className)}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("not-last:border-b", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger relative flex flex-1 items-center justify-between rounded-lg border border-transparent py-4 text-left text-body font-medium transition-all outline-none hover:text-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:after:border-ring disabled:pointer-events-none disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4.5 **:data-[slot=accordion-trigger-icon]:text-muted-foreground",
          className
        )}
        {...props}
      >
        {children}
        {/* One chevron that turns rather than two that swap: a half turn of the
            down chevron lands exactly on the up chevron, so the resting shape is
            unchanged in both states and the change between them can be seen.

            The turn is the Switch's travel (`turn-travel`: past the half turn
            and back) and the press is its squeeze-and-lean, on the chevron
            rather than the row — 4% of a full-width row is a visible lurch.
            Held, it leans toward where it is about to turn: forwards when
            closed, back when open. The open item of a non-collapsible single
            accordion is `aria-disabled` and cannot close, so a lean there would
            promise a turn that never comes; it squeezes only. The two
            `--turn-dir` rules are made exclusive with `not-` instead of being
            left to variant order, which sorts aria-expanded after aria-disabled
            and would let the lean win. */}
        <ChevronDownIcon
          data-slot="accordion-trigger-icon"
          className="pointer-events-none shrink-0 turn-travel group-active/accordion-trigger:press-turn group-aria-expanded/accordion-trigger:rotate-180 group-aria-expanded/accordion-trigger:group-not-aria-disabled/accordion-trigger:[--turn-dir:-1] group-aria-disabled/accordion-trigger:[--turn-dir:0]"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

/* Open and close are deliberately not mirror images. Opening springs — a
   disclosure is the one place in the system where real overshoot earns its keep,
   since it happens rarely and the panel arriving with weight is the whole point.
   Closing is a short tween instead: a bouncy close reads as the panel failing to
   shut. The height itself is the shipped keyframe pair; `ease-*` reaches it
   through `--tw-ease` and `duration-*` through `--tw-duration`, so no number is
   typed here. */
function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="group/accordion-content overflow-hidden text-body text-muted-foreground data-open:animate-accordion-down data-open:duration-spring-bouncy data-open:ease-spring-bouncy data-closed:animate-accordion-up data-closed:duration-slow data-closed:ease-out-expo"
      {...props}
    >
      <div
        className={cn(
          /* The copy fades under the height change rather than with it, so it
             is never caught mid-squash against the closing edge. Radix remounts
             this wrapper on every open, so the way in is `starting:` — a plain
             transition has nothing to travel from on a fresh mount. */
          "h-(--radix-accordion-content-height) pt-0 pb-4 leading-relaxed transition-opacity duration-base ease-out-expo starting:opacity-0 group-data-closed/accordion-content:opacity-0 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
