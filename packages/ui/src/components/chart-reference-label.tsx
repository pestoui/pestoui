import { cva } from "class-variance-authority"

/* A recharts label renderer for a reference line or dot. Pass it as an element,
   `label={<ChartReferenceLabel … />}`, and recharts injects the viewBox.

   - text: the words written on a reference line, just above its left end.
   - flag: a dark flag with a notch at the left end of a target line, and a dot
           at each end of the dashed run. The flag paints over the start of the
           line, so the dashes appear to leave from its point.
   - pill: a card-coloured pill to the left of a reference dot — a muted label,
           then the value in bold. Decorative, so it is hidden from assistive
           tech; the chart's own summary carries the figure.

   Text fills carry `!` for the same reason as ChartAxisTick: ChartContainer
   recolours chart text with descendant selectors that a plain utility loses to. */
const chartReferenceLabelVariants = cva("", {
  variants: {
    variant: {
      text: "",
      flag: "fill-foreground",
      pill: "fill-card stroke-border",
    },
  },
  defaultVariants: {
    variant: "text",
  },
})

const chartReferenceLabelTextVariants = cva("", {
  variants: {
    variant: {
      text: "",
      flag: "",
      pill: "",
    },
    /* `label` and `value` are the pill's two runs; `text` is the text element
       itself, which is also the one that carries the size. */
    part: {
      text: "",
      label: "",
      value: "",
    },
    /* Whether the size comes off the type scale. False when the caller passes
       a raw size of its own, because a class would outrank that attribute. */
    scale: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    { variant: "text", className: "fill-muted-foreground!" },
    { variant: "flag", className: "fill-background!" },
    { variant: "pill", part: "label", className: "fill-muted-foreground!" },
    { variant: "pill", part: "value", className: "fill-foreground! font-semibold" },
    { variant: "text", part: "text", scale: true, className: "text-micro" },
    {
      variant: ["flag", "pill"],
      part: "text",
      scale: true,
      className: "text-caption-sm",
    },
  ],
  defaultVariants: {
    variant: "text",
    part: "text",
    scale: true,
  },
})

type ChartReferenceLabelVariant = "text" | "flag" | "pill"

type ChartReferenceLabelProps = {
  /* Injected by recharts. */
  viewBox?: { x?: number; y?: number; width?: number; height?: number }
  variant?: ChartReferenceLabelVariant
  /* The words, for text and flag. */
  text?: React.ReactNode
  /* The pill's muted leading run. */
  label?: React.ReactNode
  /* The pill's bold trailing run. */
  value?: React.ReactNode
  /* The flag's or pill's width in px. Flag defaults to 84, pill to 116. */
  width?: number
  /* A raw SVG font-size, for a chart whose labels sit off the type scale.
     Leave it out and the label takes its step from the scale: 11px for text,
     12px for flag and pill. */
  fontSize?: number | string
}

const FLAG_WIDTH = 84
const PILL_WIDTH = 116
const PILL_HEIGHT = 28

function ChartReferenceLabel({
  viewBox,
  variant = "text",
  text,
  label,
  value,
  width,
  fontSize,
}: ChartReferenceLabelProps) {
  /* One or the other, never both: the scale's class, or the caller's attribute. */
  const scale = fontSize == null
  const size = scale ? undefined : { fontSize }
  const textClassName = chartReferenceLabelTextVariants({ variant, scale })

  if (variant === "pill") {
    if (!viewBox || viewBox.x == null || viewBox.y == null) return null
    const pillWidth = width ?? PILL_WIDTH
    const cx = viewBox.x + (viewBox.width ?? 0) / 2
    const cy = viewBox.y + (viewBox.height ?? 0) / 2
    const left = cx - 18 - pillWidth
    const top = cy - PILL_HEIGHT / 2
    return (
      <g data-slot="chart-reference-label" data-variant={variant} aria-hidden="true">
        <rect
          data-slot="chart-reference-label-shape"
          x={left}
          y={top}
          width={pillWidth}
          height={PILL_HEIGHT}
          rx={PILL_HEIGHT / 2}
          className={chartReferenceLabelVariants({ variant })}
        />
        <text
          data-slot="chart-reference-label-text"
          x={left + 12}
          y={cy}
          dy="0.35em"
          {...size}
          className={textClassName}
        >
          <tspan
            className={chartReferenceLabelTextVariants({ variant, part: "label" })}
          >
            {label}
          </tspan>
          <tspan
            dx={8}
            className={chartReferenceLabelTextVariants({ variant, part: "value" })}
          >
            {value}
          </tspan>
        </text>
      </g>
    )
  }

  const x = viewBox?.x ?? 0
  const y = viewBox?.y ?? 0

  if (variant === "flag") {
    const flagWidth = width ?? FLAG_WIDTH
    const shape = chartReferenceLabelVariants({ variant })
    return (
      <g data-slot="chart-reference-label" data-variant={variant}>
        <rect
          data-slot="chart-reference-label-shape"
          x={x}
          y={y - 11}
          width={flagWidth}
          height={22}
          rx={6}
          className={shape}
        />
        <path
          data-slot="chart-reference-label-shape"
          d={`M${x + flagWidth - 1} ${y - 6} L${x + flagWidth + 6} ${y} L${x + flagWidth - 1} ${y + 6} Z`}
          className={shape}
        />
        <text
          data-slot="chart-reference-label-text"
          x={x + flagWidth / 2}
          y={y}
          dy="0.35em"
          textAnchor="middle"
          fontWeight={500}
          {...size}
          className={textClassName}
        >
          {text}
        </text>
        <circle
          data-slot="chart-reference-label-shape"
          cx={x + flagWidth + 12}
          cy={y}
          r={3}
          className={shape}
        />
        <circle
          data-slot="chart-reference-label-shape"
          cx={x + (viewBox?.width ?? 0) - 3}
          cy={y}
          r={3}
          className={shape}
        />
      </g>
    )
  }

  return (
    <text
      data-slot="chart-reference-label"
      data-variant={variant}
      x={x}
      y={y - 5}
      fontWeight={500}
      {...size}
      className={textClassName}
    >
      {text}
    </text>
  )
}

export {
  ChartReferenceLabel,
  chartReferenceLabelTextVariants,
  chartReferenceLabelVariants,
}
export type { ChartReferenceLabelProps, ChartReferenceLabelVariant }
