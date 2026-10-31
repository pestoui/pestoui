"use client"

import * as React from "react"
import { Check, Plus } from "lucide-react"

import { Button } from "./ui/button"
import { IconTile } from "./icon-tile"
import { cn } from "../lib/utils"

/* App directory row — icon tile, name + blurb, connect action */
export function AppRow({
  icon,
  name,
  description,
  connected = false,
  className,
}: {
  icon: React.ReactNode
  name: string
  description: string
  connected?: boolean
  className?: string
}) {
  /* Connecting is the only state this row owns, so the check landing is the
     only thing worth animating — the row itself is a static list item, and a
     directory of them is exactly where a hover lift turns into noise.

     The ref is what keeps a list that renders with half its rows already
     connected from popping every tick at once on first paint: only a row that
     has been seen disconnected animates its check in. It latches on rather than
     tracking the previous value, so an unrelated re-render mid-animation cannot
     pull the class back off and cancel it. */
  const wasDisconnected = React.useRef(!connected)
  if (!connected) {
    wasDisconnected.current = true
  }

  return (
    <div className={cn("flex items-center gap-4 py-3", className)}>
      <IconTile variant="soft" size="lg">
        {icon}
      </IconTile>
      <div className="min-w-0 flex-1">
        <div className="text-body-lg font-semibold tracking-snug">{name}</div>
        <div className="mt-0.5 truncate text-body text-muted-foreground">
          {description}
        </div>
      </div>
      {connected ? (
        <Check
          aria-label="Connected"
          className={cn(
            "mr-2 size-5 shrink-0 text-muted-foreground",
            wasDisconnected.current &&
              "animate-in fade-in zoom-in-90 blur-in-3 duration-spring-swap ease-spring-swap"
          )}
        />
      ) : (
        <Button variant="outline" size="icon" aria-label={`Connect ${name}`}>
          <Plus className="size-4.5" />
        </Button>
      )}
    </div>
  )
}
