"use client"

import * as React from "react"

import { Label } from "./ui/label"
import { cn } from "../lib/utils"

/* Label + control + helper/error text — the standard form row */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional = false,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  optional?: boolean
  children: React.ReactNode
  className?: string
}) {
  const messageId = React.useId()
  const message = error ?? hint

  /* The shake fires on the transition INTO an error, not on a row that happens
     to mount already invalid — a form rendered with server-side errors would
     otherwise jitter on load, which reads as noise rather than as feedback. A
     second, different failure re-arms it; the class is dropped again on
     animationend so the next one can restart the keyframes. */
  const [shaking, setShaking] = React.useState(false)
  const previousError = React.useRef(error)
  React.useEffect(() => {
    if (error && error !== previousError.current) setShaking(true)
    previousError.current = error
  }, [error])

  /* The control carries the wiring: it points at the message and reports its
     own invalidity, so the shake is something a screen reader can follow.
     Anything set explicitly on the child wins — this only fills in gaps. */
  const control = React.Children.map(children, (child) => {
    if (!React.isValidElement<Record<string, unknown>>(child)) return child
    if (child.type === React.Fragment) return child

    const describedBy = [
      child.props["aria-describedby"],
      message ? messageId : null,
    ]
      .filter(Boolean)
      .join(" ")

    return React.cloneElement(child, {
      "aria-describedby": describedBy || undefined,
      "aria-invalid": child.props["aria-invalid"] ?? (error ? true : undefined),
    })
  })

  return (
    <div
      className={cn("space-y-2", shaking && "animate-shake", className)}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setShaking(false)
      }}
    >
      <Label htmlFor={htmlFor}>
        {label}
        {optional && (
          <span className="font-normal text-muted-foreground">Optional</span>
        )}
      </Label>
      {control}
      {message && (
        /* Keyed on the text so a hint→error swap remounts the node: the enter
           is an @starting-style transition, and only a fresh element fires it. */
        <p
          key={error ? `error:${error}` : `hint:${hint}`}
          id={messageId}
          className={cn(
            "text-caption transition-[opacity,translate,filter] duration-base ease-out-expo starting:-translate-y-1 starting:opacity-0 starting:blur-xs",
            error ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {message}
        </p>
      )}
    </div>
  )
}
