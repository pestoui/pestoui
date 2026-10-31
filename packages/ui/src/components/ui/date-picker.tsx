"use client"

import * as React from "react"
import { format, isSameYear } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

/* Controlled the moment the consumer passes a `value` prop. Pinned on the first
   render so clearing a selection back to `undefined` cannot silently hand
   control to the internal state mid-flight. */
function useDateSelection<T>(
  controlled: boolean,
  valueProp: T | undefined,
  defaultValue: T | undefined,
  onValueChange: ((value: T | undefined) => void) | undefined
) {
  const [internal, setInternal] = React.useState<T | undefined>(defaultValue)

  const setValue = React.useCallback(
    (next: T | undefined) => {
      if (!controlled) setInternal(next)
      onValueChange?.(next)
    },
    [controlled, onValueChange]
  )

  return [controlled ? valueProp : internal, setValue] as const
}

/* Shared trigger — a raised outline pill, not a boxed field, so it reads as an
   action. `data-empty` dims it while the placeholder is showing. */
function DatePickerTrigger({
  className,
  empty = false,
  variant = "outline",
  size = "default",
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "asChild"> & {
  empty?: boolean
}) {
  return (
    <Button
      variant={variant}
      size={size}
      data-empty={empty}
      className={cn(
        "justify-start gap-2.5 font-normal data-[empty=true]:text-muted-foreground",
        className
      )}
      {...props}
    >
      {/* The glyph is this trigger's whole press response: Button drops its own
          box press under `aria-haspopup`, because the popover is positioned
          against that box. Squeezing the icon leaves the box's measured size
          alone. */}
      <CalendarIcon
        aria-hidden="true"
        className="text-muted-foreground transition-[scale] duration-fast ease-out-expo group-active/button:scale-(--press-squeeze) group-active/button:duration-spring-press group-active/button:ease-spring-press"
      />
      <span className="truncate">{children}</span>
    </Button>
  )
}

type DatePickerBaseProps = Omit<
  React.ComponentProps<typeof Button>,
  "align" | "asChild" | "children" | "defaultValue" | "value"
> & {
  /** Where the popover lines up against the trigger. */
  align?: React.ComponentProps<typeof PopoverContent>["align"]
  /** date-fns pattern used for the trigger label. */
  dateFormat?: string
  placeholder?: string
}

type DatePickerProps = DatePickerBaseProps & {
  defaultValue?: Date
  onValueChange?: (value: Date | undefined) => void
  value?: Date
}

function DatePicker(props: DatePickerProps) {
  const controlled = React.useRef("value" in props).current
  const {
    align = "start",
    className,
    dateFormat = "MMM d, yyyy",
    defaultValue,
    onValueChange,
    placeholder = "Pick a date",
    value: valueProp,
    ...triggerProps
  } = props

  const [open, setOpen] = React.useState(false)
  const [value, setValue] = useDateSelection<Date>(
    controlled,
    valueProp,
    defaultValue,
    onValueChange
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <DatePickerTrigger
          data-slot="date-picker"
          empty={!value}
          className={cn("min-w-44", className)}
          {...triggerProps}
        >
          {value ? format(value, dateFormat) : placeholder}
        </DatePickerTrigger>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-0">
        <Calendar
          mode="single"
          autoFocus
          selected={value}
          defaultMonth={value}
          onSelect={(next) => {
            setValue(next)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

type DateRangePickerProps = DatePickerBaseProps & {
  defaultValue?: DateRange
  numberOfMonths?: number
  onValueChange?: (value: DateRange | undefined) => void
  value?: DateRange
}

/* "Aug 4 - Aug 12, 2026" while the range sits inside one year; both years are
   spelled out once it straddles a boundary, where a bare "Dec 28" is ambiguous. */
function formatDateRange(range: DateRange | undefined, dateFormat: string) {
  if (!range?.from) return undefined
  if (!range.to) return format(range.from, dateFormat)

  return isSameYear(range.from, range.to)
    ? `${format(range.from, "MMM d")} - ${format(range.to, dateFormat)}`
    : `${format(range.from, dateFormat)} - ${format(range.to, dateFormat)}`
}

function DateRangePicker(props: DateRangePickerProps) {
  const controlled = React.useRef("value" in props).current
  const {
    align = "start",
    className,
    dateFormat = "MMM d, yyyy",
    defaultValue,
    numberOfMonths = 2,
    onValueChange,
    placeholder = "Pick a date range",
    value: valueProp,
    ...triggerProps
  } = props

  const [open, setOpen] = React.useState(false)
  const [value, setValue] = useDateSelection<DateRange>(
    controlled,
    valueProp,
    defaultValue,
    onValueChange
  )

  const label = formatDateRange(value, dateFormat)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <DatePickerTrigger
          data-slot="date-range-picker"
          empty={!label}
          className={cn("min-w-60", className)}
          {...triggerProps}
        >
          {label ?? placeholder}
        </DatePickerTrigger>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-0">
        <Calendar
          mode="range"
          autoFocus
          selected={value}
          defaultMonth={value?.from}
          numberOfMonths={numberOfMonths}
          onSelect={(next) => {
            setValue(next)
            /* Hold the popover open until both ends are committed. */
            if (next?.from && next.to) setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker, DateRangePicker }
