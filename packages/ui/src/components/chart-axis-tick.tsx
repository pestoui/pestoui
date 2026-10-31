import { cva } from "class-variance-authority"

/* A custom recharts axis tick that singles out one value — today, the active
   day, the current week — and leaves the rest muted. Pass it as an element,
   `tick={<ChartAxisTick … />}`, and recharts injects x, y and payload.

   Three ways to single a value out:
   - weight: bare text, the active label in foreground ink and semibold.
   - wash:   the active label on a 14% wash of --selected. Its ink stays
             foreground, because a coloured label on its own tint misses AA.
   - pill:   the active label reversed out of a solid foreground pill.

   Every fill carries `!`. ChartContainer has a descendant rule written to paint
   every axis tick muted (`.recharts-cartesian-axis-tick text`). Where that rule
   matches it outranks a plain utility on the element, and important is the
   one class-based way past it. In recharts 3.8 the selector no longer reaches
   the label, so today the `!` is a guard rather than a fix; it stays so these
   fills do not change the day that rule is retargeted.

   The size comes off the type scale as a class rather than as a font-size
   attribute: 12px for weight and wash, 11px for the pill, whose label has to
   sit inside a 24px shape. */
const chartAxisTickLabelVariants = cva("", {
  variants: {
    emphasis: {
      weight: "text-caption-sm",
      wash: "text-caption-sm",
      pill: "text-micro",
    },
    active: {
      true: "font-semibold",
      false: "font-normal",
    },
  },
  compoundVariants: [
    { emphasis: ["weight", "wash"], active: true, className: "fill-foreground!" },
    {
      emphasis: ["weight", "wash"],
      active: false,
      className: "fill-muted-foreground!",
    },
    { emphasis: "pill", active: true, className: "fill-background!" },
    { emphasis: "pill", active: false, className: "fill-muted-foreground!" },
  ],
  defaultVariants: {
    emphasis: "weight",
    active: false,
  },
})

/* The shape behind an active label. `weight` draws none. */
const chartAxisTickMarkVariants = cva("", {
  variants: {
    emphasis: {
      weight: "",
      wash: "fill-selected",
      pill: "fill-foreground",
    },
  },
  defaultVariants: {
    emphasis: "weight",
  },
})

type ChartAxisTickEmphasis = "weight" | "wash" | "pill"

type ChartAxisTickProps = {
  /* Injected by recharts. */
  x?: number | string
  y?: number | string
  payload?: { value?: number | string }
  emphasis?: ChartAxisTickEmphasis
  /* The tick is active when String(payload.value) === String(activeValue). */
  activeValue?: number | string
  /* Decides activity from the raw tick value; wins over activeValue. */
  isActive?: (value: number | string) => boolean
  /* The label for a raw tick value. Defaults to String(value). */
  format?: (value: number | string) => React.ReactNode
}

function ChartAxisTick({
  x,
  y,
  payload,
  emphasis = "weight",
  activeValue,
  isActive,
  format,
}: ChartAxisTickProps) {
  const value = payload?.value ?? ""
  const active = isActive
    ? isActive(value)
    : activeValue !== undefined && String(value) === String(activeValue)
  const label = format ? format(value) : String(value)
  const labelClassName = chartAxisTickLabelVariants({ emphasis, active })

  if (emphasis === "weight") {
    return (
      <text
        data-slot="chart-axis-tick"
        data-emphasis={emphasis}
        data-active={active}
        x={x}
        y={y}
        dy={12}
        textAnchor="middle"
        className={labelClassName}
      >
        {label}
      </text>
    )
  }

  const pill = emphasis === "pill"
  return (
    <g
      data-slot="chart-axis-tick"
      data-emphasis={emphasis}
      data-active={active}
      transform={`translate(${Number(x ?? 0)},${Number(y ?? 0)})`}
    >
      {active ? (
        pill ? (
          <rect
            data-slot="chart-axis-tick-mark"
            x={-12}
            y={0}
            width={24}
            height={18}
            rx={9}
            className={chartAxisTickMarkVariants({ emphasis })}
          />
        ) : (
          <rect
            data-slot="chart-axis-tick-mark"
            x={-19}
            y={2}
            width={38}
            height={22}
            rx={6}
            fillOpacity={0.14}
            className={chartAxisTickMarkVariants({ emphasis })}
          />
        )
      ) : null}
      <text
        data-slot="chart-axis-tick-label"
        x={0}
        y={pill ? 9 : 13}
        dy="0.35em"
        textAnchor="middle"
        className={labelClassName}
      >
        {label}
      </text>
    </g>
  )
}

export { ChartAxisTick, chartAxisTickLabelVariants, chartAxisTickMarkVariants }
export type { ChartAxisTickEmphasis, ChartAxisTickProps }
