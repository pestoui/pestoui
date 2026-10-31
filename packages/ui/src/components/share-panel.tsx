"use client"

import * as React from "react"
import { Check, Globe, Link2 } from "lucide-react"

import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Switch } from "./ui/switch"
import { OrbStack } from "./orb-avatar"
import { cn } from "../lib/utils"

function ShareRow({
  leading,
  label,
  badge,
  trailing,
  defaultChecked = true,
}: {
  leading: React.ReactNode
  label: string
  badge: string
  trailing?: React.ReactNode
  defaultChecked?: boolean
}) {
  return (
    /* Motion: switching an audience off settles its label back to the muted
       tone, so the switch is not the only thing that acknowledges the change —
       the row it governs answers too. Both rows ship on, so the resting panel
       is untouched. */
    <div className="flex items-center gap-2.5 py-3 transition-colors duration-base ease-out-expo has-data-[state=unchecked]:text-muted-foreground">
      {leading}
      <span className="text-lead font-semibold tracking-[-0.015em]">{label}</span>
      <Badge variant="secondary" className="h-7 px-3 text-body-sm font-normal">
        {badge}
      </Badge>
      <div className="ml-auto flex items-center gap-4">
        {trailing}
        <Switch
          defaultChecked={defaultChecked}
          aria-label={`Share with ${label.toLowerCase()}`}
        />
      </div>
    </div>
  )
}

/* A copy control that answers back — the one interaction in this panel worth
   real motion, because copying a link is otherwise entirely silent.

   The confirmation is stacked *over* the label rather than replacing it, so the
   button keeps its exact resting width and nothing in the row reflows; a label
   that grew from "Copy" to a longer word would snap the width, since width is
   not animatable from auto. The label leaves on the short exit tween while the
   tick arrives on the swap spring. A reversible two-state toggle shares one
   travel distance in both directions by construction, so the asymmetry between
   arriving and leaving lives entirely in the timing.

   The visible state resets itself; the live region announces the same thing
   once, for anyone who cannot see the tick. */
function CopyLinkButton() {
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<number | undefined>(undefined)

  React.useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="relative h-10 rounded-[13px] px-5 text-body-md"
        onClick={() => {
          setCopied(true)
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => setCopied(false), 1600)
        }}
      >
        {/* Each state emits exactly one timing pair rather than layering an
            override on a base — the duration and easing tokens are not numeric,
            so the class merger cannot tell two of them apart and both would
            survive, leaving stylesheet order to pick the winner. */}
        <span
          className={cn(
            /* Only the two properties that move — a blanket transition here
               would also retime the label's inherited hover colour and leave it
               trailing the button's own background by a hundred milliseconds. */
            "transition-[translate,opacity]",
            copied
              ? "-translate-y-1.5 opacity-0 duration-exit ease-out-expo"
              : "translate-y-0 opacity-100 duration-spring-swap ease-spring-swap"
          )}
        >
          Copy
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-[translate,opacity]",
            copied
              ? "translate-y-0 opacity-100 duration-spring-swap ease-spring-swap"
              : "translate-y-1.5 opacity-0 duration-exit ease-out-expo"
          )}
        >
          <Check />
        </span>
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </>
  )
}

/* Share sheet — paper preview, copy-link field, audience toggles, primary CTA */
export function SharePanel({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full max-w-[480px] rounded-xl bg-card p-7 shadow-card ring-1 ring-foreground/[0.04]",
        className
      )}
    >
      <div className="h-28 rounded-lg bg-paper ring-1 ring-foreground/[0.03]" />

      <h3 className="mt-7 text-[1.5rem] leading-tight font-semibold tracking-title">
        Share this Document
      </h3>
      <p className="mt-1.5 text-body-lg text-muted-foreground">
        Sharing as a single view
      </p>

      <div className="mt-6 flex h-16 items-center gap-3.5 rounded-lg bg-secondary/60 px-4 ring-1 ring-foreground/[0.035]">
        <Link2 className="size-5.5 text-foreground/70" strokeWidth={1.8} />
        <span className="flex-1 text-lead font-medium tracking-snug">Link</span>
        <CopyLinkButton />
      </div>

      <div className="mt-7 text-body-md text-muted-foreground">Share with</div>
      <div className="mt-1.5">
        <ShareRow
          leading={
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-info/15 text-body-md font-semibold text-info">
              Y
            </span>
          }
          label="Your team"
          badge="Team"
          trailing={<OrbStack />}
        />
        <ShareRow
          leading={
            <span className="flex size-9 shrink-0 items-center justify-center">
              <Globe className="size-6.5 text-foreground/80" strokeWidth={1.6} />
            </span>
          }
          label="Anyone with the link"
          badge="World"
        />
      </div>

      <Button size="xl" className="mt-7 w-full text-body-lg">
        Publish
      </Button>
    </div>
  )
}
