"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"

import { cn } from "../../lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  disabled,
  onPointerDown,
  "aria-label": ariaLabel,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  /* What the pointer is holding: a thumb index while a thumb is grabbed, -1
     while the track itself is being dragged, null when idle.

     Tracked in state rather than read off `:active`, though not because the
     mouse loses it: measured in Chromium (headed and headless, real mouse),
     the root and the thumb both keep `:active` through a drag that leaves the
     control by 400px. State is used because the one thing that must never
     happen here is the glide switching itself back on halfway through a
     drag, and touch and pen were not measured — state does not depend on the
     engine setting `:active` at all.

     A disabled slider never grabs. The primitive ignores the press, but these
     handlers run regardless, and without the guard the disabled thumb grew to
     `scale-125` while the root shook its head (measured: thumb scale 1.188 at
     100ms into a held press) — a "yes" and a "no" at once. */
  const [grabbed, setGrabbed] = React.useState<number | null>(null)
  const dragging = grabbed !== null

  React.useEffect(() => {
    if (!dragging) return
    const release = () => setGrabbed(null)
    window.addEventListener("pointerup", release)
    window.addEventListener("pointercancel", release)
    return () => {
      window.removeEventListener("pointerup", release)
      window.removeEventListener("pointercancel", release)
    }
  }, [dragging])

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
        /* A disabled slider shakes its head when pressed, the same answer the
           Switch gives, rather than swallowing the press in silence. It sits on
           the root because every press lands inside it. The root is a span with
           no `disabled` attribute and no `pointer-events-none`, and although the
           primitive default-prevents pointerdown, nothing moves focus during
           the press, so `:active` holds: measured in headed and headless
           Chromium with the mouse held, on the track and on the thumb, two
           presses each, `:active` matched on every frame and `nudge` ran.

           This is the only piece of the Switch's grammar the slider takes:
           - No press lean or squeeze. Grabbing already lifts the thumb
             (`scale-125`), which is the right press for something held and
             dragged; a squeeze would argue with it.
           - No overshoot. The thumb's position is the value, so a bounce past
             it shows a number nobody chose and pulls the thumb off the end of
             the range fill.
           - No arrival squish. The thumb glides on the overdamped spring and
             has no moment of arrival for a squish to land on. */
        "data-disabled:active:animate-nudge",
        /* Each thumb is positioned on a wrapper span the primitive owns, so the
           glide has to be reached from here. Arrow keys travel; a live drag
           opts out, or the thumb trails the pointer. */
        !dragging &&
          "[&>span:has(>[data-slot=slider-thumb])]:transition-[inset] [&>span:has(>[data-slot=slider-thumb])]:duration-spring-glide [&>span:has(>[data-slot=slider-thumb])]:ease-spring-glide",
        className
      )}
      disabled={disabled}
      {...props}
      onPointerDown={(event) => {
        onPointerDown?.(event)
        if (disabled) return
        /* A thumb's own handler runs first and wins; -1 only lands when the
           press started on the track. */
        setGrabbed((current) => current ?? -1)
      }}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full bg-secondary data-horizontal:h-1.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-1.5"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "absolute bg-selected select-none data-horizontal:h-full data-vertical:w-full",
            !dragging &&
              "transition-[inset] duration-spring-glide ease-spring-glide"
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          /* The thumb is the role="slider" element, so the label belongs on it;
             on the root span it named nothing. A range keeps the primitive's
             own "Minimum" / "Maximum" per thumb unless a label is given. */
          aria-label={
            ariaLabel && _values.length > 1
              ? `${ariaLabel}, ${index === 0 ? "minimum" : "maximum"}`
              : ariaLabel
          }
          onPointerDown={() => {
            if (!disabled) setGrabbed(index)
          }}
          className={cn(
            "relative block size-5 shrink-0 rounded-full border-2 border-selected bg-card shadow-soft ring-selected/40 transition-[color,box-shadow,scale] duration-base ease-out-expo select-none after:absolute after:-inset-2 hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden active:ring-4 disabled:pointer-events-none disabled:opacity-50",
            /* Grabbing springs out; letting go returns on the rest-state tween,
               because these classes come off with the grab. */
            grabbed === index &&
              "scale-125 ring-4 duration-spring-press ease-spring-press"
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
