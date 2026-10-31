import * as React from "react"
import { CircleCheck, TriangleAlert } from "lucide-react"

import { cn } from "../lib/utils"
import { Stat } from "./stat"
import { UsageMeter } from "./usage-meter"
import { Badge } from "./ui/badge"
import { Card, CardContent } from "./ui/card"

/* One plan quota — seats, storage, run credits — as a titled tile: what it is,
   whether it is in trouble, the count against its allowance, and a meter.
 *
 * A composition, not a new primitive. The figure is a Stat, the state is a
 * Badge, the meter is a UsageMeter and the white face is a Card; this only
 * fixes how they sit together. The face sits in a tray one radius step out from
 * it (2xl tray, 6px inset, xl card), so the two corners stay concentric, and
 * the meter lives on the tray below the face.
 *
 * The state is derived from the numbers, never passed in: at `criticalAt` of
 * the allowance the badge turns destructive and says so in words, and the
 * meter goes destructive with it, so colour is never the only cue. The state
 * also rides on the root as data-state for anything a caller nests inside; the
 * tile does not read it to paint itself. */

/* Thousands separators in one fixed locale, so the server and the browser
   render the same string. */
const formatCount = (n: number) => n.toLocaleString("en-US")

const HEADINGS = { 2: "h2", 3: "h3", 4: "h4" } as const

type QuotaTileProps = Omit<React.ComponentProps<"section">, "children"> & {
  /** A lucide-style icon component, drawn muted before the title. */
  icon: React.ElementType
  /** The quota's name — the tile's heading. */
  label: React.ReactNode
  used: number
  limit: number
  /** Trails the figure, after a space — "GB". */
  unit?: string
  /** Names the meter for assistive tech. */
  srLabel: string
  /** The share of the allowance, 0..1, at which the quota reads critical. */
  criticalAt?: number
  criticalLabel?: React.ReactNode
  healthyLabel?: React.ReactNode
  /** Formats `used` and `limit`. Keep it locale-fixed so server and client agree. */
  formatValue?: (n: number) => string
  /** The heading level the title renders at. */
  headingLevel?: 2 | 3 | 4
}

function QuotaTile({
  icon: Icon,
  label,
  used,
  limit,
  unit,
  srLabel,
  criticalAt = 0.8,
  criticalLabel = "Near limit",
  healthyLabel = "Healthy",
  formatValue = formatCount,
  headingLevel = 3,
  className,
  ...props
}: QuotaTileProps) {
  const share = limit > 0 ? used / limit : 0
  const critical = share >= criticalAt
  const headingId = React.useId()
  const Heading = HEADINGS[headingLevel]

  return (
    <section
      data-slot="quota-tile"
      data-state={critical ? "critical" : "healthy"}
      aria-labelledby={headingId}
      className={cn("rounded-2xl border border-border bg-muted/50 p-1.5", className)}
      {...props}
    >
      <Card size="sm" className="gap-6">
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Icon
              data-slot="quota-tile-icon"
              aria-hidden="true"
              className="size-5 shrink-0 text-muted-foreground"
            />
            <Heading
              id={headingId}
              data-slot="quota-tile-title"
              className="text-body-md leading-6 font-medium text-foreground"
            >
              {label}
            </Heading>
            {/* The badge names the state in words, so the colour is never the
                only thing telling a reader the quota is in trouble. */}
            {critical ? (
              <Badge
                data-slot="quota-tile-status"
                variant="destructive"
                className="ml-auto border-destructive/20"
              >
                <TriangleAlert data-icon="inline-start" aria-hidden="true" />
                {criticalLabel}
              </Badge>
            ) : (
              <Badge
                data-slot="quota-tile-status"
                variant="success"
                className="ml-auto border-success/20"
              >
                <CircleCheck data-icon="inline-start" aria-hidden="true" />
                {healthyLabel}
              </Badge>
            )}
          </div>
          {/* "/ 20" is the same size as the figure, only muted — not Stat's
              half-size unit — so it is composed into the value. The unit slot
              then carries the trailing unit. */}
          <Stat
            size="lg"
            className="font-normal"
            value={
              <>
                {formatValue(used)}
                <span className="text-muted-foreground"> / {formatValue(limit)}</span>
              </>
            }
            unit={unit ? ` ${unit}` : undefined}
          />
        </CardContent>
      </Card>
      <div data-slot="quota-tile-meter" className="px-3 pt-3 pb-2">
        <UsageMeter
          variant="bar"
          tone={critical ? "destructive" : "muted"}
          value={used}
          max={limit}
          srLabel={srLabel}
        />
      </div>
    </section>
  )
}

export { QuotaTile }
export type { QuotaTileProps }
