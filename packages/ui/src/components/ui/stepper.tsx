"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { CircleAlertIcon } from "lucide-react"

import { cn } from "../../lib/utils"

type StepperVariant = "horizontal" | "vertical" | "dots" | "bar"
type StepperState = "complete" | "current" | "upcoming"
/* A decoration on the derived state, never a replacement for it. There is
   deliberately no per-item `state` prop: the whole value of this component is
   that four steps stay consistent because one number drives them. */
type StepperStatus = "error"
type StepperSize = "sm" | "default" | "lg"
type StepperConnectorStyle = "line" | "dashed" | "progress" | "none"
type StepperLabels = "below" | "end" | "none"

const stepperVariants = cva("group/stepper flex list-none", {
  variants: {
    variant: {
      horizontal: "w-full items-start",
      vertical: "w-full flex-col",
      /* gap-3 is load-bearing: an interactive dot expands its hit area by 6px
         per side, so a smaller gap would make neighbouring targets overlap. */
      dots: "w-fit items-center gap-3",
      /* The rails are the steps here, so they need a visible seam between them
         — contiguous segments would read as one bar with stripes painted on. */
      bar: "w-full items-start gap-2",
    },
  },
  defaultVariants: {
    variant: "horizontal",
  },
})

/* Step markers are the one place a full round is correct — these are dots, not
   icon tiles, so rounded-full never collapses a squircle here. */
const stepperMarkerVariants = cva(
  "relative flex shrink-0 items-center justify-center rounded-full transition-all duration-base ease-out-expo outline-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      state: {
        complete: "bg-selected text-selected-foreground shadow-soft",
        /* Nothing here is filled: a card-coloured disc outlined by a hairline,
           with the step number sitting on it. Border, numeral and the halo
           that hugs them all take the accent together. */
        current:
          "border-2 border-selected bg-card text-selected ring-4 ring-selected/15",
        upcoming:
          "border border-border bg-card text-muted-foreground dark:border-input dark:bg-input/30",
        /* Same ringed treatment as current, retoned — a failed step is still
           the step you are on, so it must not lose its prominence. */
        error:
          "border-2 border-destructive bg-card text-destructive ring-4 ring-destructive/15",
      },
      size: {
        sm: "size-6 text-xs font-semibold tabular-nums [&_svg]:size-3.5",
        default: "size-8 text-caption font-semibold tabular-nums [&_svg]:size-4",
        lg: "size-10 text-sm font-semibold tabular-nums [&_svg]:size-5",
        dot: "size-2.5",
      },
    },
    /* A pip is two and a half units across with no border, no glyph and no
A pip is two and a half units across with no border, no glyph and no
       label on screen — the fill IS the whole indicator. */
    compoundVariants: [
      { size: "dot", state: "complete", class: "bg-selected" },
      {
        size: "dot",
        state: "current",
        class: "border-0 bg-selected ring-selected/20",
      },
      { size: "dot", state: "upcoming", class: "bg-secondary" },
      {
        size: "dot",
        state: "error",
        class: "border-0 bg-destructive ring-destructive/20",
      },
    ],
    defaultVariants: {
      state: "upcoming",
      size: "default",
    },
  }
)

/* `dashed` has to be a border rather than a background: a dashed gradient would
   need an arbitrary value and would stop honouring --border entirely. That is
   also why the fill axis paints border-color for dashed and background-color
   for the rest, instead of one shared colour slot. */
const stepperConnectorVariants = cva(
  "flex-1 transition-colors duration-spring-glide ease-spring-glide",
  {
    variants: {
      orientation: {
        horizontal: "mx-2",
        vertical: "my-1.5",
      },
      connector: {
        line: "rounded-full",
        dashed: "border-dashed",
        /* The track for a fill that grows; the growing part is a child. */
        progress: "relative overflow-hidden rounded-full bg-border",
        /* Still occupies its slot so step widths stay equal — this is the same
           mechanism the first and last half-connectors have always used. */
        none: "invisible rounded-full",
      },
      filled: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        orientation: "horizontal",
        connector: "dashed",
        class: "h-0 border-t-2",
      },
      {
        orientation: "vertical",
        connector: "dashed",
        class: "min-h-5 w-0 border-l-2",
      },
      {
        orientation: "horizontal",
        connector: ["line", "progress", "none"],
        class: "h-0.5",
      },
      {
        orientation: "vertical",
        connector: ["line", "progress", "none"],
        class: "min-h-5 w-0.5",
      },
      /* Half a unit thick either way, so the filled rail takes the accent. */
      { connector: "line", filled: true, class: "bg-selected" },
      { connector: "line", filled: false, class: "bg-border" },
      { connector: "dashed", filled: true, class: "border-selected" },
      { connector: "dashed", filled: false, class: "border-border" },
    ],
    defaultVariants: {
      orientation: "horizontal",
      connector: "line",
      filled: false,
    },
  }
)

/* variant="bar" only. The rail carries the fill, so the state axis is purely
   colour — how far it travels is an inline scaleX, because a step can report a
   partial value and a utility cannot express a continuous number. */
const stepperSegmentVariants = cva(
  "block size-full origin-left rounded-full transition-transform duration-spring-glide ease-spring-glide",
  {
    variants: {
      state: {
        complete: "bg-selected",
        current: "bg-selected",
        upcoming: "bg-selected",
        error: "bg-destructive",
      },
    },
    defaultVariants: {
      state: "upcoming",
    },
  }
)

type StepperContextValue = {
  variant: StepperVariant
  size: StepperSize
  connector: StepperConnectorStyle
  labels: StepperLabels
  activeStep: number
  count: number
}

const StepperContext = React.createContext<StepperContextValue | null>(null)
const StepperIndexContext = React.createContext(0)

/* State is derived, never passed per item: everything before activeStep is
   complete, activeStep itself is current, the rest are upcoming. */
function useStepperItem() {
  const stepper = React.useContext(StepperContext)
  const index = React.useContext(StepperIndexContext)

  if (!stepper) {
    throw new Error("StepperItem must be used within <Stepper>")
  }

  const state: StepperState =
    index < stepper.activeStep
      ? "complete"
      : index === stepper.activeStep
        ? "current"
        : "upcoming"

  return {
    variant: stepper.variant,
    size: stepper.size,
    connector: stepper.connector,
    labels: stepper.labels,
    index,
    state,
    isFirst: index === 0,
    isLast: index === stepper.count - 1,
    /* The connector before a step reads as filled only when that step is complete. */
    lineBefore: index < stepper.activeStep,
    lineAfter: index + 1 < stepper.activeStep,
  }
}

/* A vertical marker column has to hold its label optically level with the
   marker's centre, and that offset moves with the marker's diameter. */
const stepperVerticalLabelOffset = {
  sm: "pt-0.5",
  default: "pt-1.5",
  lg: "pt-2.5",
} as const

function resolveLabels(
  variant: StepperVariant,
  labels: StepperLabels | undefined
): StepperLabels {
  if (variant === "dots") return "none"
  if (labels === undefined) return variant === "vertical" ? "end" : "below"
  /* A vertical stack has no room below a marker, and a bar's text always sits
     under its rail — clamp the nonsensical pairings instead of rendering them. */
  if (variant === "vertical") return labels === "below" ? "end" : labels
  if (variant === "bar") return labels === "end" ? "below" : labels
  return labels
}

function StepperConnector({
  orientation,
  connector,
  filled,
  hidden = false,
}: {
  orientation: "horizontal" | "vertical"
  connector: StepperConnectorStyle
  filled: boolean
  hidden?: boolean
}) {
  const resolved = hidden ? "none" : connector

  return (
    <span
      data-slot="stepper-connector"
      aria-hidden="true"
      className={cn(
        stepperConnectorVariants({ orientation, connector: resolved, filled })
      )}
    >
      {resolved === "progress" ? (
        /* Growing the fill rather than swapping a colour reads as travel, and
           it borrows the same spring the progress bar uses so the two
           components move in the same language. */
        <span
          data-slot="stepper-connector-fill"
          className={cn(
            "absolute inset-0 rounded-full bg-selected transition-transform duration-spring-glide ease-spring-glide",
            orientation === "horizontal" ? "origin-left" : "origin-top"
          )}
          style={{
            transform:
              orientation === "horizontal"
                ? `scaleX(${filled ? 1 : 0})`
                : `scaleY(${filled ? 1 : 0})`,
          }}
        />
      ) : null}
    </span>
  )
}

/* One definition for the title/description pair so the three type strings it
   carries exist in exactly one place — when the type scale lands they become a
   one-line change instead of a six-site hunt. */
function StepperLabel({
  titleId,
  descriptionId,
  title,
  description,
  state,
  status,
}: {
  titleId: string
  descriptionId: string
  title: React.ReactNode
  description?: React.ReactNode
  state: StepperState
  status?: StepperStatus
}) {
  return (
    <>
      <span
        id={titleId}
        data-slot="stepper-title"
        className={cn(
          "text-body font-semibold tracking-title transition-colors duration-base ease-out-expo",
          status === "error"
            ? "text-destructive"
            : state === "upcoming"
              ? "text-muted-foreground"
              : "text-foreground"
        )}
      >
        {/* Colour alone cannot say "this step failed". The prefix rides the
            accessible name, so the failure survives greyscale and is spoken. */}
        {status === "error" ? <span className="sr-only">Error: </span> : null}
        {title}
      </span>
      {description ? (
        <span
          id={descriptionId}
          data-slot="stepper-description"
          className="text-caption text-muted-foreground"
        >
          {description}
        </span>
      ) : null}
    </>
  )
}

interface StepperProps extends React.ComponentProps<"ol"> {
  variant?: StepperVariant
  activeStep?: number
  /** Marker diameter. Ignored by `dots` (fixed pip) and `bar` (no marker). */
  size?: StepperSize
  /** Ignored by `dots`, which is unconnected by design. */
  connector?: StepperConnectorStyle
  /** Defaults to `below` for horizontal/bar, `end` for vertical, `none` for dots. */
  labels?: StepperLabels
}

function Stepper({
  className,
  variant = "horizontal",
  activeStep = 0,
  size = "default",
  connector,
  labels,
  children,
  ...props
}: StepperProps) {
  const childList = React.Children.toArray(children).filter(React.isValidElement)
  /* The counter reports on the list, so it must not be counted as part of it —
     and it cannot live inside the <ol> either, where a <p> would be invalid. */
  const items = childList.filter((child) => child.type !== StepperCounter)
  const counters = childList.filter((child) => child.type === StepperCounter)

  const resolvedLabels = resolveLabels(variant, labels)
  /* Dots have never drawn connectors and adding them by default would move
     every existing dot stepper, so their default is "none", not "line". */
  const resolvedConnector = connector ?? (variant === "dots" ? "none" : "line")

  return (
    <StepperContext.Provider
      value={{
        variant,
        size,
        connector: resolvedConnector,
        labels: resolvedLabels,
        activeStep,
        count: items.length,
      }}
    >
      <ol
        data-slot="stepper"
        data-variant={variant}
        data-size={size}
        data-connector={resolvedConnector}
        data-labels={resolvedLabels}
        role="list"
        className={cn(stepperVariants({ variant }), className)}
        {...props}
      >
        {items.map((child, index) => (
          <StepperIndexContext.Provider key={child.key ?? index} value={index}>
            {child}
          </StepperIndexContext.Provider>
        ))}
      </ol>
      {counters}
    </StepperContext.Provider>
  )
}

type StepperCounterProps = React.ComponentProps<"p">

/* Reads the count off the same context the list does, so "Step 2 of 4" cannot
   drift from the number of children. Place it as a child of <Stepper>; it is
   lifted out of the <ol> and rendered after it. */
function StepperCounter({ className, children, ...props }: StepperCounterProps) {
  const stepper = React.useContext(StepperContext)

  if (!stepper) {
    throw new Error("StepperCounter must be used within <Stepper>")
  }

  const { activeStep, count, labels } = stepper
  /* aria-current already announces which step is current. When labels are on
     screen the counter is a visual restatement of that, so let it stay silent
     and only speak when it is the sole indication of where you are. */
  const redundant = labels !== "none"

  return (
    <p
      data-slot="stepper-counter"
      aria-hidden={redundant || undefined}
      aria-live={redundant ? undefined : "polite"}
      className={cn(
        "text-sm font-medium tabular-nums text-muted-foreground",
        className
      )}
      {...props}
    >
      {children ?? `Step ${Math.min(activeStep + 1, count)} of ${count}`}
    </p>
  )
}

/* `onSelect` is omitted alongside `title` because both names already exist on
   the intrinsic li — the DOM handler takes an event, ours takes the step index,
   and an interface cannot narrow an inherited member. It is destructured out
   below, so nothing of the intrinsic shape reaches the element. */
interface StepperItemProps
  extends Omit<React.ComponentProps<"li">, "title" | "onSelect"> {
  title: React.ReactNode
  description?: React.ReactNode
  /** Replaces the step number inside the marker. Hidden from AT — `title` names the step. */
  icon?: React.ReactNode
  /** Decorates the derived state; it never replaces it. */
  status?: StepperStatus
  /** 0–100. `variant="bar"` on the current step only — partial fill of its rail. */
  progress?: number
  onSelect?: (index: number) => void
}

function StepperItem({
  className,
  title,
  description,
  icon,
  status,
  progress,
  onSelect,
  ...props
}: StepperItemProps) {
  const {
    variant,
    size,
    connector,
    labels,
    index,
    state,
    isFirst,
    isLast,
    lineBefore,
    lineAfter,
  } = useStepperItem()
  const uid = React.useId()
  const titleId = `${uid}-title`
  const descriptionId = `${uid}-description`
  const interactive = typeof onSelect === "function"
  const isDot = variant === "dots"
  const isBar = variant === "bar"
  const errored = status === "error"
  const paintedState = errored ? "error" : state

  const label = (
    <StepperLabel
      titleId={titleId}
      descriptionId={descriptionId}
      title={title}
      description={description}
      state={state}
      status={status}
    />
  )

  /* When the marker is a real button it owns aria-current, so the li must not
     repeat it — otherwise the step is announced as current twice. */
  const current = state === "current" && !interactive ? "step" : undefined

  if (isBar) {
    /* Colour comes from the status, distance from the derived state: an errored
       step still shows how far it got, it just shows it in destructive. */
    const fill =
      state === "complete"
        ? 1
        : state === "current"
          ? typeof progress === "number"
            ? Math.min(1, Math.max(0, progress / 100))
            : 1
          : 0

    const rail = (
      <span
        data-slot="stepper-rail"
        data-state={state}
        aria-hidden="true"
        className={cn(
          "relative block h-1 w-full overflow-hidden rounded-full bg-secondary",
          interactive &&
            state === "upcoming" &&
            "transition-colors duration-instant ease-out-expo group-hover/stepper-bar:bg-selected/25"
        )}
      >
        <span
          data-slot="stepper-segment"
          data-state={paintedState}
          className={cn(stepperSegmentVariants({ state: paintedState }))}
          style={{ transform: `scaleX(${fill})` }}
        />
      </span>
    )

    const body = (
      <>
        {rail}
        {labels === "none" ? (
          <span className="sr-only">{label}</span>
        ) : (
          <div className="mt-2 flex min-w-0 flex-col gap-0.5">{label}</div>
        )}
      </>
    )

    return (
      <li
        data-slot="stepper-item"
        data-variant={variant}
        data-state={state}
        data-status={status}
        aria-current={current}
        className={cn("flex min-w-0 flex-1 basis-0 flex-col", className)}
        {...props}
      >
        {interactive ? (
          /* A bar has no marker to hang a round ring on, so the whole
             rail-plus-label column becomes the target and takes the list-row
             radius — a rounded-full ring around a 4px rail is unreadable. */
          <button
            type="button"
            data-slot="stepper-segment-button"
            data-state={state}
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            aria-current={state === "current" ? "step" : undefined}
            onClick={() => onSelect?.(index)}
            className="group/stepper-bar flex w-full min-w-0 cursor-pointer flex-col rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {body}
          </button>
        ) : (
          body
        )}
      </li>
    )
  }

  const markerClassName = cn(
    stepperMarkerVariants({ state: paintedState, size: isDot ? "dot" : size }),
    interactive &&
      "cursor-pointer after:absolute focus-visible:ring-3 focus-visible:ring-ring/50 active:duration-spring-press active:ease-spring-press",
    /* Enlarged hit area, sized so adjacent targets never overlap. */
    interactive && (isDot ? "after:-inset-x-1.5 after:-inset-y-2" : "after:-inset-2"),
    /* A dot is a third the size of a numbered marker, so it needs a deeper
       press to register the same amount of movement on screen. */
    interactive && (isDot ? "active:scale-90" : "active:scale-95"),
    /* A dot has no border or glyph to tint, so it hovers on its fill instead.
       Both previews are held at the accent the state they lead to now paints
         in, which is also what keeps them legible once alpha is taken off. */
    interactive &&
      state === "upcoming" &&
      !errored &&
      (isDot
        ? "hover:bg-selected/40"
        : "hover:border-selected/50 hover:text-foreground"),
    errored && "animate-shake"
  )

  /* The number stays in flow and the tick is centred absolutely over it, so the
     swap costs no layout and the resting box is unchanged. Completing a step is
     the one moment in this component worth watching: the number drops out on a
     short tween while the tick draws itself on. */
  const markerContent = isDot ? null : errored ? (
    <CircleAlertIcon aria-hidden="true" />
  ) : (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "transition-[opacity,scale]",
          /* A number sits on the text baseline happily; an icon does not, so it
             only gets a box when there is one to place. */
          icon ? "flex items-center justify-center" : undefined,
          state === "complete"
            ? "scale-90 opacity-0 duration-exit ease-out-expo"
            : "scale-100 opacity-100 duration-spring-swap ease-spring-swap"
        )}
      >
        {icon ?? index + 1}
      </span>
      {/* pathLength normalises the stroke to 100 units so draw-path's dash
          offset resolves over the whole tick regardless of its real length.

          strokeWidth 3, not lucide's stock 2, and it is the SAME 3 the checkbox
          tick carries — one weight for one glyph, stated in viewBox units so it
          scales with the marker instead of pinning an absolute px. The three
          marker sizes render this 24-unit box at 14 / 16 / 20px, so the tick
          inks 1.75 / 2.00 / 2.50px and stays a constant 12.5% of its own glyph
          box at every one of them. At 2 the sm marker inked 1.1667px — the
          exact weight the checkbox measured as too light beside its own 2px
          indeterminate bar — and the sm marker draws the same 14px box the
          checkbox does, so at 3 the two are now identical to the digit: 1.75px
          each. Measured across the 46 tick glyphs the docs page renders: 3 at
          1.1667, 40 at 1.3333, 3 at 1.6667 before; 1.75 / 2.00 / 2.50 after.
          The geometry takes it — the short leg is √50 ≈ 7.07 units, still 2.4
          stroke-widths long, and the round caps paint 19 × 14 units inside the
          24 the svg clips at. */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="absolute inset-0 m-auto"
      >
        <path
          d="M20 6 9 17l-5-5"
          pathLength="100"
          className={cn("draw-path", state === "complete" && "draw-path-done")}
        />
      </svg>
    </>
  )

  /* Keying on status remounts the marker when a step fails, which is what makes
     the shake fire once on arrival rather than never at all. */
  const markerKey = errored ? "error" : "ok"

  const marker = interactive ? (
    <button
      key={markerKey}
      type="button"
      data-slot="stepper-marker"
      data-state={state}
      data-status={status}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-current={state === "current" ? "step" : undefined}
      onClick={() => onSelect?.(index)}
      className={markerClassName}
    >
      {markerContent}
    </button>
  ) : (
    <span
      key={markerKey}
      data-slot="stepper-marker"
      data-state={state}
      data-status={status}
      className={markerClassName}
    >
      {markerContent}
    </span>
  )

  if (isDot) {
    return (
      <li
        data-slot="stepper-item"
        data-variant={variant}
        data-state={state}
        data-status={status}
        aria-current={current}
        className={cn("flex items-center", className)}
        {...props}
      >
        {marker}
        <span className="sr-only">{label}</span>
      </li>
    )
  }

  if (variant === "vertical") {
    return (
      <li
        data-slot="stepper-item"
        data-variant={variant}
        data-state={state}
        data-status={status}
        aria-current={current}
        className={cn("flex gap-3.5", className)}
        {...props}
      >
        <div className="flex flex-col items-center self-stretch">
          {marker}
          {isLast ? null : (
            /* The connector is the progression made visible, so it travels on
               the layout spring rather than snapping the moment the step behind
               it completes. */
            <StepperConnector
              orientation="vertical"
              connector={connector}
              filled={lineAfter}
            />
          )}
        </div>
        {labels === "none" ? (
          <span className="sr-only">{label}</span>
        ) : (
          <div
            className={cn(
              "flex min-w-0 flex-col gap-0.5",
              stepperVerticalLabelOffset[size],
              isLast ? "pb-0" : "pb-7"
            )}
          >
            {label}
          </div>
        )}
      </li>
    )
  }

  if (labels === "end") {
    /* Step widths stop being uniform the moment the text sits inline, so every
       item is forced onto the same basis and titles wrap instead of shoving
       their neighbours down the row. */
    return (
      <li
        data-slot="stepper-item"
        data-variant={variant}
        data-state={state}
        data-status={status}
        aria-current={current}
        className={cn("flex min-w-0 flex-1 basis-0 items-center gap-3", className)}
        {...props}
      >
        {marker}
        <div className="flex min-w-0 flex-col gap-0.5">{label}</div>
        <StepperConnector
          orientation="horizontal"
          connector={connector}
          filled={lineAfter}
          hidden={isLast}
        />
      </li>
    )
  }

  return (
    <li
      data-slot="stepper-item"
      data-variant={variant}
      data-state={state}
      data-status={status}
      aria-current={current}
      className={cn(
        "relative flex min-w-0 flex-1 flex-col items-center text-center",
        className
      )}
      {...props}
    >
      <div className="flex w-full items-center">
        <StepperConnector
          orientation="horizontal"
          connector={connector}
          filled={lineBefore}
          hidden={isFirst}
        />
        {marker}
        <StepperConnector
          orientation="horizontal"
          connector={connector}
          filled={lineAfter}
          hidden={isLast}
        />
      </div>
      {labels === "none" ? (
        <span className="sr-only">{label}</span>
      ) : (
        <div
          className={cn(
            "flex min-w-0 flex-col gap-0.5 px-1",
            size === "sm" ? "mt-2" : "mt-3"
          )}
        >
          {label}
        </div>
      )}
    </li>
  )
}

export {
  Stepper,
  StepperItem,
  StepperCounter,
  stepperVariants,
  stepperMarkerVariants,
  stepperConnectorVariants,
  stepperSegmentVariants,
}
export type {
  StepperProps,
  StepperItemProps,
  StepperCounterProps,
  StepperVariant,
  StepperState,
  StepperStatus,
  StepperSize,
  StepperConnectorStyle,
  StepperLabels,
}
