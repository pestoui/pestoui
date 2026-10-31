import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Check, X } from "lucide-react"

import { cn } from "../../lib/utils"

/* Alert — a white card with a filled semantic icon disc, a title, an optional
   body, and either a dismiss (×) or an action cluster on the right. The variant
   drives only the icon disc; the card and copy stay neutral so a column of mixed
   alerts reads calmly. Alignment flips to top when a description is present.

   That rule makes the disc the ONLY carrier of severity on screen, and the disc
   is aria-hidden decoration — so severity would reach a screen reader as
   nothing at all (WCAG 1.4.1, use of colour). `severityLabel` closes that: one
   visually-hidden word, read before the title, changing no pixel. */
const alertVariants = cva(
  "group/alert relative flex w-full items-center gap-3 rounded-lg border border-border/70 bg-card px-4 py-3.5 text-left shadow-xs has-data-[slot=alert-description]:items-start",
)

/* The disc and the copy share a row of their own so the disc can be aligned to
   the TITLE rather than to the card. Two things fall out of that:

   - `items-start` here is what makes the disc track the first line of a title
     that wraps. The card's own centring still applies to this row as a whole,
     so an action cluster taller than the copy keeps centring both together —
     which is why this cannot be done by flipping the card to `items-start`.
   - The row is the flex item the card sizes and grows, so `flex-1 min-w-0`
     moves here from the content column; `gap-3` is the card's own gap repeated,
     leaving every horizontal measurement on the card unchanged. */
const alertLead = "flex min-w-0 flex-1 items-start gap-3"

/* The title's type size, declared ONCE because two elements have to agree on
   it: AlertTitle sets the type, and the icon line below sizes its `1lh` box
   from it. As two separate literals they could drift apart with nothing to
   catch it — the disc would quietly stop landing on the title's first line and
   no test, type or build would notice. One constant makes that impossible.

   The size-only Tier-1 token (15px, no line-height companion). It merges as a
   font size only because typeScaleMergeConfig in lib/utils.ts registers it:
   unregistered, tailwind-merge reads a bare `text-body` as a text COLOUR, so
   `cn("text-body", "text-muted-foreground")` would resolve to
   `text-muted-foreground` alone and the font size would vanish. AlertTitle
   merges a caller's className, so that is a live path. */
const alertTitleType = "text-body"

/* One line tall, in the title's own type, with the 20px disc centred in it —
   which is the definition of "on the first line of the title". The line box is
   15px × the inherited 1.5 = 22.5px, so the offset is (22.5 − 20) / 2 =
   1.25px, a value no spacing step can express; the `mt-0.5` it replaces was a
   2px approximation of it that only applied when a description was present,
   and the two paths were 0.75px apart as a result.

   `1lh` is the line box rather than a repeat of it, so the leading can be
   retuned without touching this. */
const alertIconLine = `flex h-[1lh] shrink-0 items-center ${alertTitleType}`

/* An alert is an announcement — it has arrived, so it should read as arriving
   rather than as having always been there. Panel spring because the card has
   real area; the blur is the enter-only materialise cue, held at the small end
   of the range because this is an inline block inside content, not chrome. */
const alertAppear =
  "animate-in fade-in-0 slide-in-from-bottom-2 blur-in-4 anim-spring-panel ease-spring-panel"

const alertIconVariants = cva(
  "flex size-5 shrink-0 items-center justify-center rounded-full [&_svg]:size-3 [&_svg]:stroke-[3]",
  {
    variants: {
      variant: {
        default: "bg-foreground text-card",
        info: "bg-info text-info-foreground",
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
        destructive: "bg-destructive text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

type AlertVariant = NonNullable<VariantProps<typeof alertIconVariants>["variant"]>

/* Bare glyphs live inside the coloured disc — lucide has no bare "i"/"!", so
   those two are text, while success/error use real marks. */
const DEFAULT_ICON: Record<AlertVariant, React.ReactNode> = {
  default: <span className="text-micro font-bold">i</span>,
  info: <span className="text-micro font-bold">i</span>,
  success: <Check />,
  warning: <span className="text-xs font-bold">!</span>,
  destructive: <X />,
}

/* The word a screen reader hears in place of the disc's colour. `default` is
   the absence of a severity rather than one of them — its disc is plain ink,
   the same colour as the copy — so it announces nothing; `info` must, because
   it is `default` with a different fill and the same bare "i" glyph, and colour
   is otherwise the only thing separating the two. */
const DEFAULT_SEVERITY_LABEL: Record<AlertVariant, string | null> = {
  default: null,
  info: "Information",
  success: "Success",
  warning: "Warning",
  destructive: "Error",
}

type AlertProps = React.ComponentProps<"div"> &
  VariantProps<typeof alertIconVariants> & {
    /** Override the auto icon inside the disc. Pass null to hide the disc. */
    icon?: React.ReactNode
    /** Renders a dismiss (×) button and fires this on click. */
    onDismiss?: () => void
    /** Right-aligned action cluster — usually one or two <Button>s. */
    action?: React.ReactNode
    /**
     * The severity word announced before the title, visible to assistive tech
     * only. Defaults to the variant's own ("Error", "Warning", "Success",
     * "Information"; `default` announces nothing). Pass a string to translate
     * or reword it, or `null` to announce nothing at all.
     */
    severityLabel?: string | null
  }

function Alert({
  className,
  variant = "default",
  icon,
  onDismiss,
  action,
  severityLabel,
  children,
  ...props
}: AlertProps) {
  const resolvedIcon = icon === undefined ? DEFAULT_ICON[variant ?? "default"] : icon
  /* Keyed off the variant, never off the disc: `icon={null}` is a rendering
     choice, and letting it drop the announcement would silently take severity
     away from the one audience that cannot see the disc either way. Callers who
     want the quiet form say so with `severityLabel={null}`. */
  const severity =
    severityLabel === undefined
      ? DEFAULT_SEVERITY_LABEL[variant ?? "default"]
      : severityLabel

  return (
    <div
      data-slot="alert"
      data-variant={variant}
      role="alert"
      className={cn(alertVariants(), alertAppear, className)}
      {...props}
    >
      {/* First in the DOM, and out of flow, so it is read before the title and
          measures nothing. A flex container's absolutely-positioned child is
          not a flex item, so it takes no `gap` either. */}
      {severity != null && severity !== "" && (
        <span data-slot="alert-severity" className="sr-only">
          {`${severity}: `}
        </span>
      )}

      <div data-slot="alert-lead" className={alertLead}>
        {resolvedIcon != null && (
          <span aria-hidden="true" className={alertIconLine}>
            <span data-slot="alert-icon" className={cn(alertIconVariants({ variant }))}>
              {resolvedIcon}
            </span>
          </span>
        )}

        <div data-slot="alert-content" className="flex min-w-0 flex-1 flex-col gap-0.5">
          {children}
        </div>
      </div>

      {action != null && (
        <div
          data-slot="alert-action"
          className="flex shrink-0 items-center gap-2 self-center"
        >
          {action}
        </div>
      )}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mt-0.5 -mr-1 flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-all duration-fast ease-out-expo outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-90 active:duration-spring-press active:ease-spring-press [&_svg]:size-4"
        >
          <X />
        </button>
      )}
    </div>
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        alertTitleType,
        "font-semibold tracking-snug text-foreground [&_a]:underline [&_a]:underline-offset-3",
        className,
      )}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm leading-normal text-muted-foreground [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, alertIconVariants }
