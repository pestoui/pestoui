"use client"

import * as React from "react"

import { cn } from "../../lib/utils"

/* Every column holds all ten glyphs and slides to expose one. Building the list
   once at module scope keeps the render free of throwaway arrays. */
const GLYPHS = Array.from({ length: 10 }, (_, glyph) => glyph)

/* ---------------------------------------------------------------------------
   Shared start trigger

   Both components animate *from* a resting state, so both need the same answer
   to "when does the animation begin". Deferring to the next frame is not a nice
   touch, it is load-bearing for the ticker: the columns have to paint once at
   zero before their translate changes, or the browser has no start value to
   transition from and the digits simply appear in place.
*/
function useStartTrigger(
  startOnView: boolean,
  forwardedRef: React.Ref<HTMLSpanElement> | undefined
) {
  const nodeRef = React.useRef<HTMLSpanElement | null>(null)
  const [started, setStarted] = React.useState(false)

  /* Compose rather than clobber — the observer needs the node, and a consumer
     that passed a ref still gets it. */
  const ref = React.useCallback(
    (node: HTMLSpanElement | null) => {
      nodeRef.current = node
      if (typeof forwardedRef === "function") return forwardedRef(node)
      if (forwardedRef) forwardedRef.current = node
    },
    [forwardedRef]
  )

  React.useEffect(() => {
    const node = nodeRef.current

    if (!startOnView || !node || typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setStarted(true))
      return () => cancelAnimationFrame(frame)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setStarted(true)
        /* One-shot: a number that re-rolls every time it scrolls past reads as
           a glitch, not a reveal. */
        observer.disconnect()
      },
      { threshold: 0.35 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [startOnView])

  return { ref, started }
}

/* ---------------------------------------------------------------------------
   NumberTicker
*/

type TickerCell =
  | { key: string; kind: "digit"; digit: number; stagger: number }
  | { key: string; kind: "static"; text: string }

/* Flattens a value into positioned cells plus the plain string assistive tech
   receives.

   The keys are the whole trick. A digit is identified by its PLACE VALUE — ones
   are 0, tens 1, hundreds 2, and the fractional side runs negative — never by
   its index in the array. Index keys break the moment the number changes width:
   going 99 -> 100 shifts every index by one, so React would tear down the two
   nines and mount three fresh columns, animating digits that did not change.
   Keyed by place, the ones and tens columns survive and roll 9 -> 0 while the
   new hundreds column mounts already showing its 1, on the left, silently.

   Group separators are keyed by the place they sit in front of for the same
   reason: the comma in 1,234 and the comma in 12,345 are the same node.
*/
function toCells(
  value: number,
  decimals: number,
  separator: string,
  prefix: string,
  suffix: string
): { cells: TickerCell[]; text: string } {
  const safe = Number.isFinite(value) ? value : 0
  const places = Math.max(0, Math.min(20, Math.trunc(decimals)))
  const fixed = Math.abs(safe).toFixed(places)
  const [intPart, fracPart = ""] = fixed.split(".")
  const fracLength = fracPart.length

  const cells: TickerCell[] = []
  let text = ""

  const pushStatic = (key: string, chunk: string) => {
    if (!chunk) return
    cells.push({ key, kind: "static", text: chunk })
    text += chunk
  }

  /* Sign leads the prefix — a negative currency reads "-$5", not "$-5". */
  pushStatic("sign", safe < 0 ? "-" : "")
  pushStatic("prefix", prefix)

  for (let i = 0; i < intPart.length; i++) {
    const place = intPart.length - 1 - i

    if (separator && i > 0 && (place + 1) % 3 === 0) {
      pushStatic(`group-${place}`, separator)
    }

    cells.push({
      key: `digit-${place}`,
      kind: "digit",
      digit: Number(intPart[i]),
      /* Stagger counts digits to the right, so the ones column leaves first and
         the leading digit lands last — the order a geared odometer moves in. */
      stagger: place + fracLength,
    })
    text += intPart[i]
  }

  if (fracLength > 0) {
    pushStatic("point", ".")

    for (let i = 0; i < fracLength; i++) {
      cells.push({
        key: `digit-${-(i + 1)}`,
        kind: "digit",
        digit: Number(fracPart[i]),
        stagger: fracLength - 1 - i,
      })
      text += fracPart[i]
    }
  }

  pushStatic("suffix", suffix)

  return { cells, text }
}

interface NumberTickerProps
  extends Omit<React.ComponentProps<"span">, "children" | "prefix"> {
  /** The number to display. Rolls to any new value it is given. */
  value: number
  /** Fixed number of decimal places. Fixed on purpose — a width that changes
   *  with the value would re-key the columns on every update. */
  decimals?: number
  /** Thousands separator. Pass an empty string to group nothing. */
  separator?: string
  prefix?: string
  suffix?: string
  /** Hold at zero until the ticker scrolls into view, then roll once. */
  startOnView?: boolean
}

/* Rolling odometer. Each digit position is a window one glyph tall clipping a
   column of all ten, and the column translates by -(digit x --digit-height) to
   bring the right one into frame.

   The height comes from `digit-column`, which pins it to its own token rather
   than to body leading. Deriving it from a line-height would couple the ticker
   to typography and move layout the next time type is retuned.
*/
function NumberTicker({
  className,
  value,
  decimals = 0,
  separator = ",",
  prefix = "",
  suffix = "",
  startOnView = false,
  ref,
  ...props
}: NumberTickerProps) {
  const trigger = useStartTrigger(startOnView, ref)
  const { cells, text } = toCells(value, decimals, separator, prefix, suffix)

  return (
    <span
      ref={trigger.ref}
      data-slot="number-ticker"
      /* `digit-column` here establishes --digit-height and tabular leading for
         the whole ticker, so separators and columns share one baseline. */
      className={cn("digit-column relative inline-flex items-center", className)}
      {...props}
    >
      <span className="sr-only">{text}</span>
      {/* Selecting the glyph stack would copy all ten digits of every column;
          the sr-only string above is the copyable one. */}
      <span aria-hidden="true" className="inline-flex items-center select-none">
        {cells.map((cell) => {
          if (cell.kind === "static") {
            return (
              <span key={cell.key} data-slot="number-ticker-static">
                {cell.text}
              </span>
            )
          }

          /* Before the trigger fires every column sits at zero, so the ticker
             already holds the target's exact shape and rolls into it — nothing
             reflows when the real digits arrive. */
          const offset = trigger.started ? cell.digit : 0

          return (
            <span
              key={cell.key}
              data-slot="number-ticker-digit"
              className="inline-block overflow-hidden"
              style={{ height: "var(--digit-height)" }}
            >
              <span
                className="digit-column flex flex-col"
                style={{
                  translate: `0 calc(${offset} * var(--digit-height) * -1)`,
                  transitionDelay: `calc(${cell.stagger} * var(--stagger-base))`,
                }}
              >
                {GLYPHS.map((glyph) => (
                  <span key={glyph}>{glyph}</span>
                ))}
              </span>
            </span>
          )
        })}
      </span>
    </span>
  )
}

/* ---------------------------------------------------------------------------
   AnimatedNumber
*/

const formatCount = (n: number, locale?: string) => Math.round(n).toLocaleString(locale)

interface AnimatedNumberProps
  extends Omit<React.ComponentProps<"span">, "children"> {
  /** Target value. Changing it re-aims the count from wherever it currently is. */
  value: number
  /** Count duration in milliseconds. */
  duration?: number
  /** Hold at zero until the number scrolls into view, then count once. */
  startOnView?: boolean
  /** Renders the in-flight value. Also renders the announced target. */
  format?: (n: number) => string
  /** Locale for the default format's digit grouping; the browser's own when
   *  unset. Set it on a server-rendered page, so the server's markup and the
   *  browser's first render agree. Unused when `format` is given. */
  locale?: string
}

/* Plain count-up: one value interpolated to the next on a rAF loop.

   Duration-eased rather than spring-driven, and that is not a stylistic call.
   Every spring in the system except the overdamped pair crosses its target
   before settling, and a counter that crosses its target briefly displays a
   number that was never true. Overshoot is free on a knob and wrong on a
   quantity, so this one eases out and approaches from a single side.
*/
function AnimatedNumber({
  className,
  value,
  duration = 1200,
  startOnView = false,
  locale,
  format = (n) => formatCount(n, locale),
  ref,
  ...props
}: AnimatedNumberProps) {
  const trigger = useStartTrigger(startOnView, ref)
  const [display, setDisplay] = React.useState(0)
  /* The rendered value mirrored outside React state so a value change landing
     mid-flight can pick up from the frame actually on screen. */
  const displayRef = React.useRef(0)
  const frameRef = React.useRef<number | null>(null)
  const target = Number.isFinite(value) ? value : 0

  React.useEffect(() => {
    if (!trigger.started) return

    const from = displayRef.current
    const settle = () => {
      displayRef.current = target
      setDisplay(target)
    }

    /* The one place a media query belongs in code. Reduced motion is handled in
       the token layer for everything that animates in CSS, but a rAF loop
       cannot read a collapsed duration token — the preference has to be asked
       for directly. Answer: skip the travel, show the number. */
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (prefersReducedMotion || duration <= 0 || from === target) {
      settle()
      return
    }

    let startTime: number | null = null

    const tick = (now: number) => {
      startTime ??= now
      const elapsed = Math.min(1, (now - startTime) / duration)

      if (elapsed < 1) {
        /* ease-out-quart, the JS counterpart of the bezier of the same name. */
        const eased = 1 - Math.pow(1 - elapsed, 4)
        const next = from + (target - from) * eased
        displayRef.current = next
        setDisplay(next)
        frameRef.current = requestAnimationFrame(tick)
      } else {
        /* Land on the exact target rather than on the last eased sample. */
        frameRef.current = null
        settle()
      }
    }

    frameRef.current = requestAnimationFrame(tick)

    /* Fires on unmount and on every re-aim, so an in-flight frame is always
       dropped before a second loop can start against the same state. */
    return () => {
      if (frameRef.current === null) return
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [target, duration, trigger.started])

  return (
    <span
      ref={trigger.ref}
      data-slot="animated-number"
      /* Tabular figures so the box does not twitch as digits change width. */
      className={cn("relative inline-flex items-center tabular-nums", className)}
      {...props}
    >
      {/* The target, not the frame. Announcing every tick would flood a screen
          reader with a hundred readings of a number that has not settled. */}
      <span className="sr-only" aria-live="polite">
        {format(target)}
      </span>
      <span aria-hidden="true">{format(display)}</span>
    </span>
  )
}

export { NumberTicker, AnimatedNumber }
export type { NumberTickerProps, AnimatedNumberProps }
