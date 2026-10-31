import { cva } from "class-variance-authority"

import { cn } from "../lib/utils"

/* A token gradient standing in for an identity — an account, a workspace, an
   app — where a photo or initials would claim more than the mark needs to.
   It only has to be recognisable at a glance; the name beside it carries the
   meaning, which is why the mark is hidden from assistive tech by default.

   Circles are identities, the way avatars are. Squares are the tiles that sit
   on a row and carry an action, and they take the rounded-box-* ramp, which is
   named by edge and holds r ≈ 0.30 × edge. The surface ramp would not do: its
   smallest step is a flat 9.6px, so a small square ends up reading as a circle.
   Edge and radius are one decision, which is why `size` sets both. */
const gradientMarkVariants = cva("shrink-0 bg-linear-to-br", {
  variants: {
    shape: {
      circle: "rounded-full",
      square: "",
    },
    size: {
      "16": "size-4",
      "24": "size-6",
      "28": "size-7",
      "36": "size-9",
      "40": "size-10",
      "48": "size-12",
    },
    hairline: {
      true: "shadow-hairline",
      false: "",
    },
  },
  compoundVariants: [
    { shape: "square", size: "16", className: "rounded-box-16" },
    { shape: "square", size: "24", className: "rounded-box-24" },
    { shape: "square", size: "28", className: "rounded-box-28" },
    { shape: "square", size: "36", className: "rounded-box-36" },
    { shape: "square", size: "40", className: "rounded-box-40" },
    { shape: "square", size: "48", className: "rounded-box-48" },
  ],
  defaultVariants: {
    shape: "circle",
    size: "40",
    hairline: true,
  },
})

type GradientMarkShape = "circle" | "square"

/* The edge in pixels. */
type GradientMarkSize = "16" | "24" | "28" | "36" | "40" | "48"

type GradientMarkProps = React.ComponentProps<"span"> & {
  /* The from-* and to-* utilities, written in full at the call site so
     Tailwind sees them — "from-chart-1 to-chart-4". */
  tint: string
  shape?: GradientMarkShape
  size?: GradientMarkSize
  /* The faint drop that lifts the mark off a surface of the same lightness. */
  hairline?: boolean
  /* An optional glyph, centred. Its ink comes from `className` — on a mark
     inside a menu item, force it (text-selected-foreground!), because the item
     recolours every descendant on focus and a mark that changes colour as you
     pass it has stopped being a mark. */
  children?: React.ReactNode
}

function GradientMark({
  tint,
  shape = "circle",
  size = "40",
  hairline = true,
  className,
  children,
  ...props
}: GradientMarkProps) {
  return (
    <span
      data-slot="gradient-mark"
      data-shape={shape}
      data-size={size}
      aria-hidden="true"
      className={cn(
        gradientMarkVariants({ shape, size, hairline }),
        /* A span is inline, and an inline box ignores width and height. Inside
           a flex row that never shows, because the row blockifies its children;
           anywhere else the mark would collapse to nothing. */
        children != null ? "flex items-center justify-center" : "block",
        tint,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export { GradientMark, gradientMarkVariants }
export type { GradientMarkProps, GradientMarkShape, GradientMarkSize }
