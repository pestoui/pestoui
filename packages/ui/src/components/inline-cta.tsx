import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "../lib/utils"

/* Compact promo block for a sidebar rail or the end of a content column —
   upgrade nudges, "invite your team", changelog pointers. Card elevation and
   radius, but no card chrome: it is a single quiet unit, not a section. */
const inlineCtaVariants = cva(
  "group/inline-cta relative flex w-full flex-col rounded-xl p-5 has-data-[slot=inline-cta-dismiss]:pr-12",
  {
    variants: {
      variant: {
        default: "border border-border/70 bg-paper text-foreground shadow-card",
        inverse: "bg-inverse text-inverse-foreground shadow-tile",
        /* The gradient utilities are fixed pastels that do not follow the
           theme, so the ink is pinned dark in both modes instead of tracking
           --foreground, which would go white on a light pastel. */
        gradient: "text-foreground shadow-tile dark:text-inverse-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type InlineCtaGradient = "sky" | "sunrise" | "blossom" | "meadow"

const GRADIENT_CLASS: Record<InlineCtaGradient, string> = {
  sky: "gradient-sky",
  sunrise: "gradient-sunrise",
  blossom: "gradient-blossom",
  meadow: "gradient-meadow",
}

type InlineCtaProps = Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof inlineCtaVariants> & {
    title: React.ReactNode
    description?: React.ReactNode
    /** Decorative mark — rendered inside a leading squircle. */
    icon?: React.ReactNode
    /** Buttons or links. Give a single full-width CTA `rounded-lg`. */
    actions?: React.ReactNode
    onDismiss?: () => void
    dismissLabel?: string
    /** Cover gradient, applied on the "gradient" variant only. */
    gradient?: InlineCtaGradient
  }

function InlineCta({
  title,
  description,
  icon,
  actions,
  onDismiss,
  dismissLabel = "Dismiss",
  variant = "default",
  gradient = "sky",
  className,
  ...props
}: InlineCtaProps) {
  const titleId = React.useId()

  return (
    <div
      data-slot="inline-cta"
      data-variant={variant}
      data-gradient={variant === "gradient" ? gradient : undefined}
      role="group"
      aria-labelledby={titleId}
      className={cn(
        inlineCtaVariants({ variant }),
        variant === "gradient" && GRADIENT_CLASS[gradient],
        className
      )}
      {...props}
    >
      {onDismiss ? (
        <button
          type="button"
          data-slot="inline-cta-dismiss"
          aria-label={dismissLabel}
          onClick={onDismiss}
          /* Squircle, not a circle — an explicit radius under half the box.
             Motion: the only control this block owns outright, so it carries
             the same press spring as every other tap target, with the hover
             wash resolving on its own fast timing so the two never share a
             curve. */
          className="absolute top-3 right-3 inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] text-muted-foreground [transition-property:color,background-color,scale] [transition-duration:var(--duration-fast),var(--duration-fast),var(--duration-spring-press)] [transition-timing-function:var(--ease-out-expo),var(--ease-out-expo),var(--ease-spring-press)] outline-none select-none active:scale-92 hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 group-data-[variant=gradient]/inline-cta:text-foreground/65 group-data-[variant=gradient]/inline-cta:hover:bg-foreground/10 group-data-[variant=gradient]/inline-cta:hover:text-foreground group-data-[variant=inverse]/inline-cta:text-inverse-muted group-data-[variant=inverse]/inline-cta:hover:bg-inverse-foreground/10 group-data-[variant=inverse]/inline-cta:hover:text-inverse-foreground dark:group-data-[variant=gradient]/inline-cta:text-inverse-foreground/65 dark:group-data-[variant=gradient]/inline-cta:hover:bg-inverse-foreground/10 dark:group-data-[variant=gradient]/inline-cta:hover:text-inverse-foreground [&_svg]:size-4 [&_svg]:shrink-0"
        >
          <X aria-hidden="true" />
        </button>
      ) : null}

      {icon ? (
        <span
          data-slot="inline-cta-icon"
          aria-hidden="true"
          className="mb-4 flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-card text-foreground shadow-soft group-data-[variant=gradient]/inline-cta:bg-card/80 group-data-[variant=gradient]/inline-cta:shadow-none group-data-[variant=inverse]/inline-cta:bg-inverse-foreground/10 group-data-[variant=inverse]/inline-cta:text-inverse-foreground group-data-[variant=inverse]/inline-cta:shadow-none dark:group-data-[variant=gradient]/inline-cta:bg-inverse/80 dark:group-data-[variant=gradient]/inline-cta:text-inverse-foreground [&_svg]:size-5 [&_svg]:shrink-0"
        >
          {icon}
        </span>
      ) : null}

      <p
        id={titleId}
        data-slot="inline-cta-title"
        className="text-base leading-snug font-semibold tracking-title"
      >
        {title}
      </p>

      {description ? (
        <p
          data-slot="inline-cta-description"
          className="mt-1.5 text-body leading-normal text-pretty text-muted-foreground group-data-[variant=gradient]/inline-cta:text-foreground/75 group-data-[variant=inverse]/inline-cta:text-inverse-muted dark:group-data-[variant=gradient]/inline-cta:text-inverse-foreground/75"
        >
          {description}
        </p>
      ) : null}

      {actions ? (
        <div
          data-slot="inline-cta-actions"
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          {actions}
        </div>
      ) : null}
    </div>
  )
}

export { InlineCta, inlineCtaVariants }
export type { InlineCtaProps, InlineCtaGradient }
