import * as React from "react"

import { cn } from "../../lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        /* Ring present at rest at zero alpha — see input.tsx. Focus and invalid
           states fade its colour in rather than growing its geometry. */
        "flex field-sizing-content min-h-28 w-full rounded-lg border border-input bg-card shadow-xs ring-3 ring-ring/0 px-4 py-3 text-base transition-[color,background-color,border-color,box-shadow] duration-base ease-out-expo outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-body dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
