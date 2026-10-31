import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { cn } from "../../lib/utils"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid w-full gap-2", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "group/radio-group-item peer relative flex aspect-square size-5 shrink-0 rounded-full border border-input bg-card [transition-property:color,background-color,border-color,scale] [transition-duration:var(--duration-base),var(--duration-base),var(--duration-base),var(--duration-spring-press)] [transition-timing-function:var(--ease-out-expo),var(--ease-out-expo),var(--ease-out-expo),var(--ease-spring-press)] outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.92] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-selected dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-selected data-checked:bg-selected data-checked:text-selected-foreground dark:data-checked:bg-selected",
        className
      )}
      {...props}
    >
      {/* forceMount keeps the dot mounted through the unchecked state so its
          exit can be transitioned. It adds no layout — the dot is absolutely
          positioned and the item is a fixed size-5. */}
      <RadioGroupPrimitive.Indicator
        forceMount
        data-slot="radio-group-indicator"
        className="flex size-5 items-center justify-center"
      >
        {/* The dot is a filled shape, not a stroke, so the tick's draw-on has no
            analogue here — the checkbox's indeterminate bar is the right
            precedent and this mirrors it: scale + opacity + a blur that
            resolves to none. The stagger matches the tick's, so a radio and a
            checkbox flipped side by side materialise on the same beat. */}
        <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 scale-50 rounded-full bg-selected-foreground opacity-0 blur-xs transition-[opacity,scale,filter] duration-exit ease-out-expo group-data-checked/radio-group-item:scale-100 group-data-checked/radio-group-item:opacity-100 group-data-checked/radio-group-item:blur-none group-data-checked/radio-group-item:[transition-delay:var(--stagger-base)] group-data-checked/radio-group-item:duration-spring-glide group-data-checked/radio-group-item:ease-spring-glide" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
