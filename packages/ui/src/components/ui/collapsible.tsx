import { Collapsible as CollapsiblePrimitive } from "radix-ui"

import { cn } from "../../lib/utils"

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  )
}

/* Same asymmetry as the accordion, for the same reason: opening springs open
   with real overshoot because it happens rarely and the weight is the point;
   closing is a short decisive tween. `overflow-hidden` is what makes the height
   animation possible at all — without it the contents spill past the collapsing
   edge instead of being clipped by it. No content fade here: the children are
   the caller's, so there is no wrapper to fade independently of the panel, and
   fading this element would run the opacity through the bouncy curve too. */
function CollapsibleContent({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      className={cn(
        "overflow-hidden data-open:animate-collapsible-down data-open:duration-spring-bouncy data-open:ease-spring-bouncy data-closed:animate-collapsible-up data-closed:duration-slow data-closed:ease-out-expo",
        className
      )}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
