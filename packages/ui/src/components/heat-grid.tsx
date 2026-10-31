import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

/* Matrix heatmap — activity by day and hour, contributions by week, any dense
   grid holding one number per cell.

   The tone lands on the root as a text colour and every cell paints from
   currentColor, which is what keeps the ramp below to five opacity steps
   instead of five fills per tone. Written out, ten tones against five steps is
   fifty class strings that all have to stay in sync. */
const heatGridVariants = cva("grid w-fit gap-1.5", {
  variants: {
    tone: {
      selected: "text-selected",
      success: "text-success",
      warning: "text-warning",
      destructive: "text-destructive",
      info: "text-info",
      muted: "text-muted-foreground",
      "chart-1": "text-chart-1",
      "chart-2": "text-chart-2",
      "chart-3": "text-chart-3",
      "chart-4": "text-chart-4",
      "chart-5": "text-chart-5",
    },
    /* --heat-cell is a ceiling, not a fixed size: the tracks are
       minmax(0, var(--heat-cell)), so a matrix too wide for its container
       shrinks its cells rather than overflowing. --heat-gap rides on the root
       because three separate grids — cells, row labels, column labels — have to
       space themselves identically or the labels slide off their rows.

       The root's own gap is deliberately not --heat-gap: at size="sm" a 2px
       gutter would pull the header labels onto the first row of cells. */
    size: {
      sm: "[--heat-cell:--spacing(3)] [--heat-gap:--spacing(0.5)]",
      default: "[--heat-cell:--spacing(4)] [--heat-gap:--spacing(1)]",
      lg: "[--heat-cell:--spacing(6)] [--heat-gap:--spacing(1.5)]",
    },
  },
  defaultVariants: {
    tone: "selected",
    size: "default",
  },
})

/* Five discrete steps, never a continuous ramp. Mapping value → opacity
   linearly spends most of its range inside a band the eye cannot separate, so
   the middle of the data turns to mud; quantising first buys five categories
   that stay apart from each other. The steps are even quintiles because the two
   ends are what have to hold — step 1 has to clear the empty fill, step 5 has
   to arrive at the solid tone.

   Zero keeps a muted fill instead of going transparent, so a sparse matrix
   still shows its shape rather than a scatter of floating marks.

   rounded-xs holds at every cell size on purpose: tracks shrink under minmax,
   and a radius past half the edge turns the square into a circle. */
const heatGridCellVariants = cva(
  "aspect-square rounded-xs transition-colors duration-base ease-out-expo",
  {
    variants: {
      level: {
        0: "bg-muted",
        1: "bg-current/20",
        2: "bg-current/40",
        3: "bg-current/60",
        4: "bg-current/80",
        5: "bg-current",
      },
    },
    defaultVariants: {
      level: 0,
    },
  }
)

const HEAT_LEVELS = [0, 1, 2, 3, 4, 5] as const
const HEAT_STEPS = HEAT_LEVELS.length - 1

type HeatGridTone = NonNullable<VariantProps<typeof heatGridVariants>["tone"]>
type HeatGridSize = NonNullable<VariantProps<typeof heatGridVariants>["size"]>
type HeatGridLevel = (typeof HEAT_LEVELS)[number]

/* Steps are ceilings: anything above zero lands on at least step 1, so a single
   event in an otherwise quiet week stays visible instead of rounding back into
   the empty fill and reading as nothing happened. */
function levelOf(value: number, max: number): HeatGridLevel {
  if (max <= 0 || value <= 0) return 0
  const step = Math.ceil((Math.min(value, max) / max) * HEAT_STEPS)
  return HEAT_LEVELS[Math.min(step, HEAT_STEPS)]
}

/* Counts read better whole; a 0–1 scale says nothing without the decimals. */
function formatHeatValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

type HeatGridProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Rows of values. Rows may differ in length — short rows leave holes. */
  data: number[][]
  /** Fixes the top of the scale. Omit to normalise against the data's own max. */
  max?: number
  /** Positional; a short array leaves the rest of the matrix unlabelled. */
  rowLabels?: string[]
  /** Positional, and each one sits in a single cell's track — keep them short. */
  columnLabels?: string[]
  /** Names the matrix in the accessible summary, e.g. "Commits per hour". */
  srLabel?: string
  /** Applied to each cell's hover title and to the range in the summary. */
  formatValue?: (value: number) => string
  tone?: HeatGridTone
  size?: HeatGridSize
}

function HeatGrid({
  data,
  max,
  rowLabels,
  columnLabels,
  srLabel,
  formatValue = formatHeatValue,
  tone = "selected",
  size = "default",
  className,
  ...props
}: HeatGridProps) {
  /* One pass for both the column count and the auto scale. Ragged input is
     ordinary here — a half-finished week, a sensor that dropped a sample — so
     the matrix takes its width from the longest row and every row is walked out
     to that width. */
  let columns = 0
  let dataMax = 0
  for (const row of data) {
    if (row.length > columns) columns = row.length
    for (const value of row) {
      if (Number.isFinite(value) && value > dataMax) dataMax = value
    }
  }

  const scaleMax = max != null && Number.isFinite(max) && max > 0 ? max : dataMax
  const hasRowLabels = rowLabels != null && rowLabels.length > 0
  const hasColumnLabels = columnLabels != null && columnLabels.length > 0

  /* repeat(0, …) is invalid and would drop the declaration entirely, taking the
     gap and the labels' alignment down with it. */
  const columnTemplate = `repeat(${Math.max(1, columns)}, minmax(0, var(--heat-cell)))`
  const rowTemplate = `repeat(${Math.max(1, data.length)}, minmax(0, 1fr))`

  /* role="img" collapses the subtree, so the per-cell titles below never reach a
     screen reader — they are a pointer affordance, and this string is the whole
     spoken account of the matrix.

     Dimensions and a scale range are not that account. "7 rows by 24 columns,
     values 0 to 12" tells a non-sighted reader the grid exists and nothing
     about what it shows, which is the shape of the data. Announcing all 168
     cells is equally useless, so each row is reduced to the two facts a
     heat map is read for: where it peaks and how loaded it is overall. */
  const rowSummary = (row: readonly number[], index: number) => {
    const finite = row.filter(Number.isFinite)
    if (!finite.length) return null
    const peak = Math.max(...finite)
    const at = row.indexOf(peak)
    const mean = finite.reduce((a, b) => a + b, 0) / finite.length
    const name = rowLabels?.[index] ?? `row ${index + 1}`
    const where = columnLabels?.[at] ?? `column ${at + 1}`
    return `${name}: peak ${formatValue(peak)} at ${where}, average ${formatValue(
      Math.round(mean * 100) / 100,
    )}`
  }

  const summary = [
    srLabel,
    `heat map, ${data.length} rows by ${columns} columns`,
    scaleMax > 0 ? `values 0 to ${formatValue(scaleMax)}` : "no values",
    ...data.map(rowSummary),
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <div
      data-slot="heat-grid"
      data-tone={tone}
      data-size={size}
      role="img"
      aria-label={summary}
      className={cn(
        heatGridVariants({ tone, size }),
        hasRowLabels ? "grid-cols-[auto_minmax(0,1fr)]" : "grid-cols-1",
        className
      )}
      {...props}
    >
      {hasColumnLabels ? (
        <>
          {hasRowLabels ? <div aria-hidden="true" /> : null}
          <div
            data-slot="heat-grid-column-labels"
            className="grid gap-(--heat-gap)"
            style={{ gridTemplateColumns: columnTemplate }}
          >
            {Array.from({ length: columns }, (_, column) => (
              <span
                key={column}
                className="min-w-0 truncate text-center text-xs leading-none text-muted-foreground"
              >
                {columnLabels?.[column] ?? ""}
              </span>
            ))}
          </div>
        </>
      ) : null}

      {hasRowLabels ? (
        /* Equal fractions of the cells block's own height, which the outer grid
           row hands over by stretching this column to match it — that is what
           keeps a label on its row without hard-coding the cell size twice.

           overflow-hidden is load-bearing, not cosmetic: it drops this column's
           automatic minimum size to zero. Without it, a container narrow enough
           to squeeze the cells below the label's line box would let the labels
           set the row height instead, and every row would drift off its own
           data. Clipped text is the better failure. */
        <div
          data-slot="heat-grid-row-labels"
          className="grid gap-(--heat-gap) overflow-hidden"
          style={{ gridTemplateRows: rowTemplate }}
        >
          {data.map((_, row) => (
            <span
              key={row}
              className="flex items-center justify-end text-xs leading-none whitespace-nowrap text-muted-foreground"
            >
              {rowLabels?.[row] ?? ""}
            </span>
          ))}
        </div>
      ) : null}

      <div
        data-slot="heat-grid-cells"
        className="grid gap-(--heat-gap)"
        style={{ gridTemplateColumns: columnTemplate }}
      >
        {data.flatMap((row, rowIndex) =>
          Array.from({ length: columns }, (_, columnIndex) => {
            const value = row[columnIndex]

            /* A short row leaves `undefined` here and Number.isFinite turns it
               away alongside NaN. The hole still occupies its square: a missing
               reading is not a quiet one, and dropping the box would slide every
               later row out from under its label. */
            if (!Number.isFinite(value)) {
              return (
                <div
                  key={`${rowIndex}-${columnIndex}`}
                  data-slot="heat-grid-hole"
                  aria-hidden="true"
                  className="aspect-square"
                />
              )
            }

            const level = levelOf(value, scaleMax)
            const rowName = rowLabels?.[rowIndex] ?? `Row ${rowIndex + 1}`
            const columnName =
              columnLabels?.[columnIndex] ?? `Column ${columnIndex + 1}`

            return (
              <div
                key={`${rowIndex}-${columnIndex}`}
                data-slot="heat-grid-cell"
                data-level={level}
                title={`${rowName}, ${columnName}: ${formatValue(value)}`}
                className={cn(heatGridCellVariants({ level }))}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

export { HeatGrid, heatGridVariants, heatGridCellVariants }
export type { HeatGridProps, HeatGridTone, HeatGridSize, HeatGridLevel }
