import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/* Squircle container for app/brand marks — raised (on gradient covers) or soft (in lists) */
const iconTileVariants = cva(
  "flex shrink-0 items-center justify-center bg-card",
  {
    variants: {
      variant: {
        raised: "shadow-soft ring-1 ring-foreground/[0.03]",
        soft: "bg-secondary/70 ring-1 ring-foreground/[0.035]",
      },
      /* Explicit radii — the radius scale would exceed half the box and
         collapse these into circles. They must read as squircles. */
      size: {
        sm: "size-10 rounded-[12px] [&_svg]:size-5",
        md: "size-12 rounded-[14px] [&_svg]:size-6",
        lg: "size-14 rounded-[16px] [&_svg]:size-7",
        xl: "size-16 rounded-[19px] [&_svg]:size-8",
      },
    },
    defaultVariants: {
      variant: "raised",
      size: "md",
    },
  }
)

export function IconTile({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof iconTileVariants>) {
  return (
    <div className={cn(iconTileVariants({ variant, size }), className)} {...props} />
  )
}
