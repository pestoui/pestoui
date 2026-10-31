import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Spinner } from "./spinner"

/* An identity-provider button. Surface, radius, focus ring, press motion and
   the disabled treatment all come from Button — restating any of them here
   would fork the button contract for one call site. What is left, and all this
   cva governs, is the mark and the label slot.
 *
 * The provider is passed in as an element rather than named by a `provider`
 * enum. An enum would couple this file to a set of marks and force every
 * consumer that copies it to ship the whole set for the one provider they use.
 * The system ships no third-party logos — they are their owners' trademarks —
 * so a real provider's mark comes from its own brand kit. There is deliberately
 * no solid brand-fill variant: a provider-coloured *surface* cannot come from an
 * SVG, so it would need a raw colour in this file, and it would put a second
 * full-weight CTA next to the form's real submit button. A brand-filled mark on
 * a neutral surface says the same thing. */
const socialButtonVariants = cva(
  "relative aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_[data-slot=social-button-label]]:min-w-0 [&_[data-slot=social-button-label]]:truncate",
  {
    variants: {
      tone: {
        /* Trademark palette on a neutral surface — the canonical auth look. */
        color: "",
        /* Mark collapses to the inherited text colour. `--foreground`, never
           `--muted-foreground`: a monochrome mark this small needs the full
           contrast to stay legible. */
        mono: "[&_svg]:text-foreground",
      },
      /* Covers plain icons handed in as children. Brand marks are sized by
         injection instead — see `markSize`. */
      size: {
        sm: "[&_svg:not([class*='size-'])]:size-4",
        default: "[&_svg:not([class*='size-'])]:size-5",
        lg: "[&_svg:not([class*='size-'])]:size-5",
        xl: "[&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      tone: "color",
      size: "default",
    },
  }
)

type SocialButtonSize = "sm" | "default" | "lg" | "xl"

/* A brand mark usually carries its own size class, which means Button's
   `[&_svg:not([class*='size-'])]` guard never matches one and the mark renders
   at its intrinsic size inside a smaller box. The class has to land on the
   element itself, where the mark's own merge puts the passed value last and it
   resolves. This is the only reliable way past that guard. */
const markSize: Record<SocialButtonSize, string> = {
  sm: "size-4",
  default: "size-5",
  lg: "size-5",
  xl: "size-6",
}

const spinnerSize: Record<SocialButtonSize, "xs" | "sm" | "default"> = {
  sm: "xs",
  default: "sm",
  lg: "sm",
  xl: "default",
}

/* Button's square sizes stop one step below its tallest label size, so `xl`
   clamps rather than restating the squircle radius from the outside. Those
   radii are tuned to the box edge; a hand-written override would miss. */
const iconOnlySize: Record<SocialButtonSize, "icon-sm" | "icon" | "icon-lg"> = {
  sm: "icon-sm",
  default: "icon",
  lg: "icon-lg",
  xl: "icon-lg",
}

/* One duration and one easing per element per state. Neither token is numeric,
   so the class merger cannot see `duration-exit` and `duration-spring-swap` as
   a conflicting pair — layering them leaves both alive and hands the decision
   to stylesheet order. A two-state swap has a single offset shared by both
   directions, so the enter/exit asymmetry is carried entirely by the timing:
   a spring on the way in, a shorter tween on the way out. */
const SWAP_BASE = "transition-[translate,opacity]"
const SWAP_SETTLED =
  "translate-y-0 opacity-100 duration-spring-swap ease-spring-swap"
const SWAP_ABOVE = "-translate-y-1.5 opacity-0 duration-exit ease-out-expo"
const SWAP_BELOW = "translate-y-1.5 opacity-0 duration-exit ease-out-expo"

/* Structural only — a provider's own mark, a lucide icon and a bare `<svg>` all
   satisfy it, and `ui/` needs no runtime import from any mark module. */
export type SocialButtonMarkProps = {
  className?: string
  monochrome?: boolean
  "aria-hidden"?: boolean | "true" | "false"
  focusable?: boolean | "true" | "false"
}

export type SocialButtonMark = React.ReactElement<SocialButtonMarkProps>

type SocialButtonBaseProps = Omit<
  React.ComponentProps<typeof Button>,
  "size" | "variant" | "children" | "asChild"
> &
  VariantProps<typeof socialButtonVariants> & {
    /** Provider mark. Sized, hidden from assistive tech and switched to
     *  monochrome by this component — pass it unstyled. */
    icon: SocialButtonMark
    /** Neutral outline is the default; `subtle` drops the hairline. */
    variant?: "outline" | "subtle"
    /** Redirect in flight: disables the control and swaps the label for a
     *  spinner without letting the box change width. */
    loading?: boolean
    /** Announced while `loading`. */
    loadingLabel?: string
  }

/* Discriminated so an icon-only button cannot compile without an accessible
   name, and so `asChild` cannot be combined with icon-only — that pairing has
   no label child for the slot to attach to. */
export type SocialButtonProps =
  | (SocialButtonBaseProps & {
      iconOnly?: false
      children: React.ReactNode
      /** Render as the passed child, e.g. an `<a>` for an OAuth redirect. */
      asChild?: boolean
    })
  | (SocialButtonBaseProps & {
      iconOnly: true
      "aria-label": string
      children?: never
      asChild?: false
    })

function SocialButton({
  className,
  icon,
  variant = "outline",
  tone,
  size,
  iconOnly = false,
  loading = false,
  loadingLabel = "Signing in",
  asChild = false,
  disabled,
  children,
  ...props
}: SocialButtonProps) {
  const resolvedTone = tone ?? "color"
  const resolvedSize = size ?? "default"
  const isDisabled = disabled === true || loading

  /* The mark carries the swap classes itself rather than sitting inside a
     wrapper — one fewer element between Button's flex row and the icon, and
     Button's own gap goes on spacing the mark against the label.
     Keys are explicit throughout because `asChild` hands this whole child list
     to the slot, which re-clones it as an array; unkeyed array children warn.
     `monochrome` is set for `mono` only: a lucide icon forwards every prop to
     its <svg>, so passing `false` would leak an unknown attribute to the DOM. */
  const mark = React.cloneElement(icon, {
    key: "mark",
    className: cn(
      markSize[resolvedSize],
      SWAP_BASE,
      loading ? SWAP_ABOVE : SWAP_SETTLED,
      icon.props.className
    ),
    monochrome: resolvedTone === "mono" || undefined,
    "aria-hidden": true,
    focusable: "false",
  })

  return (
    <Button
      data-slot="social-button"
      data-tone={resolvedTone}
      data-loading={loading || undefined}
      asChild={asChild}
      variant={variant === "subtle" ? "ghost" : "outline"}
      size={iconOnly ? iconOnlySize[resolvedSize] : resolvedSize}
      /* `disabled` is a button-only attribute; a slotted `<a>` gets the aria
         form and the matching root variant instead. */
      disabled={asChild ? undefined : isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      className={cn(
        socialButtonVariants({ tone: resolvedTone, size: resolvedSize }),
        className
      )}
      {...props}
    >
      {mark}
      {iconOnly ? null : (
        /* Marks the slot target when `asChild` is set, and renders as a plain
           wrapper when it is not — the render form returns the same span
           either way, so there is no second code path to keep in step. */
        <Slot.Slottable key="label" child={children}>
          {(slotted) => (
            <span
              key="label"
              data-slot="social-button-label"
              className={cn(SWAP_BASE, loading ? SWAP_ABOVE : SWAP_SETTLED)}
            >
              {slotted}
            </span>
          )}
        </Slot.Slottable>
      )}
      {/* Stacked over the label rather than replacing it, so the box never
          reflows as the redirect starts. Hidden from assistive tech: the live
          region below is the one that speaks. */}
      <span
        key="pending"
        data-slot="social-button-pending"
        aria-hidden="true"
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          SWAP_BASE,
          loading ? SWAP_SETTLED : SWAP_BELOW
        )}
      >
        <Spinner size={spinnerSize[resolvedSize]} label="" />
      </span>
      {/* `aria-busy` alone is not announced on a control that has just left the
          tab order, which is exactly what a keyboard user hits mid-redirect. */}
      <span
        key="status"
        data-slot="social-button-status"
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {loading ? loadingLabel : ""}
      </span>
    </Button>
  )
}

/* A spaced stack of independent auth targets — deliberately not ButtonGroup.
   That wrapper collapses shared borders into one seam, which reads as a single
   segmented control; these are separate destinations and each needs its own
   edge. Vertical and stretched is the auth-form default. */
const socialButtonGroupVariants = cva("flex gap-3", {
  variants: {
    orientation: {
      horizontal: "flex-row flex-wrap items-center",
      vertical: "flex-col",
    },
    stretch: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    {
      orientation: "horizontal",
      stretch: true,
      class: "[&>*]:min-w-0 [&>*]:flex-1 [&>*]:basis-0",
    },
    { orientation: "vertical", stretch: true, class: "items-stretch" },
    /* A column stretches its children by default, so opting out is the case
       that needs a rule. */
    { orientation: "vertical", stretch: false, class: "items-start" },
  ],
  defaultVariants: {
    orientation: "vertical",
    stretch: true,
  },
})

export type SocialButtonGroupProps = React.ComponentProps<"div"> &
  VariantProps<typeof socialButtonGroupVariants> & {
    orientation?: "horizontal" | "vertical"
    /** Stretch every child to fill the track. */
    stretch?: boolean
  }

function SocialButtonGroup({
  className,
  orientation = "vertical",
  stretch = true,
  ...props
}: SocialButtonGroupProps) {
  return (
    <div
      data-slot="social-button-group"
      data-orientation={orientation}
      role="group"
      className={cn(
        socialButtonGroupVariants({ orientation, stretch }),
        className
      )}
      {...props}
    />
  )
}

export {
  SocialButton,
  SocialButtonGroup,
  socialButtonVariants,
  socialButtonGroupVariants,
}
