"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { StarIcon } from "lucide-react"

import { cn } from "../../lib/utils"

/* The star box is a squircle, not a circle — the radius scale would exceed half
   the box at these sizes. Star glyph sizes cascade from the root via [&_svg]. */
const ratingVariants = cva(
  "group/rating inline-flex w-fit items-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      size: {
        sm: "gap-px *:data-[slot=rating-star]:size-5 *:data-[slot=rating-star]:rounded-[7px] [&_svg]:size-3.5",
        default:
          "gap-0.5 *:data-[slot=rating-star]:size-6 *:data-[slot=rating-star]:rounded-[8px] [&_svg]:size-4.5",
        lg: "gap-0.5 *:data-[slot=rating-star]:size-7.5 *:data-[slot=rating-star]:rounded-[10px] [&_svg]:size-5.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

/* One star = a muted glyph with an amber copy clipped to `fraction` on top.
   The wrapper shrink-wraps the glyph so the clip is measured against the star
   itself, not the padded hit box around it. */
function RatingStarGlyph({
  fraction,
  index = 0,
  live = false,
}: {
  fraction: number
  /* Position in the row. The fill sweeps out from the first star rather than
     lighting the whole run in one frame — a rating of four is four stars
     filling, and the sweep is what says so. */
  index?: number
  /* Hold the amber copy in the DOM at zero width so the fill can travel instead
     of appearing. Read-only ratings opt out: their value never changes, and they
     are the ones that repeat fifty times down a list of results. */
  live?: boolean
}) {
  return (
    <span className="relative inline-flex">
      <StarIcon
        aria-hidden="true"
        className="block fill-muted text-muted-foreground/30"
      />
      {(live || fraction > 0) && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 overflow-hidden",
            live && "transition-[width]",
            /* Filling is arrival and gets the press spring; emptying is
               dismissal and gets the short tween, so the two halves of the
               interaction never feel like the same move played backwards. */
            live &&
              (fraction > 0
                ? "duration-spring-press ease-spring-press"
                : "duration-exit ease-out-expo")
          )}
          style={{
            width: `${fraction * 100}%`,
            /* The sweep is on the way up only: filling runs left to right one
               star behind the last, emptying drops the whole run at once. */
            transitionDelay:
              live && fraction > 0
                ? `calc(${index} * var(--stagger-tight))`
                : undefined,
          }}
        >
          <StarIcon className="block fill-warning text-warning" />
        </span>
      )}
    </span>
  )
}

type RatingProps = Omit<
  React.ComponentProps<"div">,
  "onChange" | "value" | "defaultValue"
> &
  VariantProps<typeof ratingVariants> & {
    /** Controlled value. Supports halves (4.5) for display. */
    value?: number
    /** Uncontrolled starting value. */
    defaultValue?: number
    max?: number
    readOnly?: boolean
    onChange?: (value: number) => void
  }

function Rating({
  className,
  size = "default",
  value,
  defaultValue = 0,
  max = 5,
  readOnly = false,
  onChange,
  onMouseLeave,
  ...props
}: RatingProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const [preview, setPreview] = React.useState<number | null>(null)
  const starRefs = React.useRef<Array<HTMLButtonElement | null>>([])

  const current = value ?? uncontrolled
  const stars = Array.from({ length: max }, (_, index) => index)

  if (readOnly) {
    return (
      <div
        data-slot="rating"
        data-size={size}
        role="img"
        aria-label={`${current} out of ${max} stars`}
        className={cn(ratingVariants({ size }), className)}
        onMouseLeave={onMouseLeave}
        {...props}
      >
        {stars.map((index) => (
          <span
            key={index}
            data-slot="rating-star"
            className="inline-flex items-center justify-center"
          >
            <RatingStarGlyph
              fraction={Math.min(1, Math.max(0, current - index))}
            />
          </span>
        ))}
      </div>
    )
  }

  /* Hover and roving focus both drive the same preview fill. */
  const display = preview ?? current
  const activeIndex = Math.max(0, Math.ceil(current) - 1)

  const commit = (next: number) => {
    if (value === undefined) setUncontrolled(next)
    onChange?.(next)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    let next: number | undefined

    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      next = Math.min(max, Math.floor(current) + 1)
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      next = Math.max(1, Math.ceil(current) - 1)
    } else if (event.key === "Home") {
      next = 1
    } else if (event.key === "End") {
      next = max
    }

    if (next === undefined) return

    event.preventDefault()
    commit(next)
    setPreview(next)
    starRefs.current[next - 1]?.focus()
  }

  return (
    <div
      data-slot="rating"
      data-size={size}
      role="radiogroup"
      aria-label="Rating"
      className={cn(ratingVariants({ size }), className)}
      {...props}
      /* Composed, not overwritten — a consumer handler must not silently
         disable the hover preview reset. */
      onMouseLeave={(event) => {
        onMouseLeave?.(event)
        setPreview(null)
      }}
    >
      {stars.map((index) => {
        const starValue = index + 1

        return (
          <button
            key={index}
            ref={(node) => {
              starRefs.current[index] = node
            }}
            type="button"
            data-slot="rating-star"
            role="radio"
            aria-checked={Math.ceil(current) === starValue}
            aria-label={`${starValue} ${starValue === 1 ? "star" : "stars"}`}
            tabIndex={index === activeIndex ? 0 : -1}
            className="relative inline-flex cursor-pointer items-center justify-center border border-transparent transition-all duration-spring-press ease-spring-press outline-none select-none focus-visible:z-10 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px active:scale-90"
            onClick={() => commit(starValue)}
            onMouseEnter={() => setPreview(starValue)}
            onFocus={() => setPreview(starValue)}
            onBlur={() => setPreview(null)}
            onKeyDown={handleKeyDown}
          >
            <RatingStarGlyph
              live
              index={index}
              fraction={Math.min(1, Math.max(0, display - index))}
            />
          </button>
        )
      })}
    </div>
  )
}

const ratingBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-secondary font-medium whitespace-nowrap text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      size: {
        sm: "h-5.5 px-2 text-caption-sm [&_svg]:size-3",
        default: "h-6 px-2.5 text-caption [&_svg]:size-3.5",
        lg: "h-7 gap-1.5 px-3 text-body-sm [&_svg]:size-4",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function RatingBadge({
  className,
  size = "default",
  value,
  count,
  locale,
  ...props
}: Omit<React.ComponentProps<"span">, "value"> &
  VariantProps<typeof ratingBadgeVariants> & {
    value: number
    /** Optional review count, rendered in parentheses. */
    count?: number
    /** Locale for the count's digit grouping; the browser's own when unset.
     *  Set it on a server-rendered page, so the server's markup and the
     *  browser's first render agree. */
    locale?: string
  }) {
  return (
    <span
      data-slot="rating-badge"
      data-size={size}
      className={cn(ratingBadgeVariants({ size }), className)}
      {...props}
    >
      <span className="font-semibold tabular-nums">{value.toFixed(1)}</span>
      <StarIcon aria-hidden="true" className="fill-warning text-warning" />
      <span className="sr-only">stars</span>
      {count !== undefined && (
        <>
          <span className="tabular-nums text-muted-foreground">
            ({count.toLocaleString(locale)})
          </span>
          <span className="sr-only">reviews</span>
        </>
      )}
    </span>
  )
}

export { Rating, RatingBadge, ratingVariants, ratingBadgeVariants }
