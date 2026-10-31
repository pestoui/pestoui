import type { SVGProps } from "react"

import { cn } from "../lib/utils"

/* ─────────────────────────────────────────────────────────────────────────────
   The product mark. The system ships no third-party logos: a service's mark is
   its owner's trademark, so a product that needs one takes it from that
   service's own brand kit and hands it to the component that shows it —
   SocialButton's `icon`, for one.

   Two rendering modes:
   · default — the foreground ink
   · `monochrome` — `currentColor`, so the mark picks up whatever surface it
     sits on.
   ───────────────────────────────────────────────────────────────────────────── */

export type BrandIconProps = SVGProps<SVGSVGElement> & {
  /** Release the pinned `text-foreground` and inherit the surrounding text
   *  colour instead. */
  monochrome?: boolean
}

/* Product logo — six-arm asterisk mark */
export function LogoMark({ className, monochrome, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(
        "size-6",
        monochrome ? undefined : "text-foreground",
        className
      )}
      {...props}
    >
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M12 2.6v18.8" />
        <path d="M3.86 7.3l16.28 9.4" />
        <path d="M20.14 7.3L3.86 16.7" />
      </g>
    </svg>
  )
}
