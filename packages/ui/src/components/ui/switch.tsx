"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "../../lib/utils"

function Switch({
  className,
  size = "default",
  onCheckedChange,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  /* The knob compresses and bounces while it travels, not only while it is held
     down — so a keyboard toggle, or a click whose press ends before the travel
     does, still reads as a knob under load. It has to be keyframes: neither a
     there-and-back on one property nor an overshoot past a destination is
     expressible as a transition between two values.

     The flag is what keeps it off the first paint. A `data-checked:animate-…`
     rule would run on mount, so every switch on a page would squish and bounce
     on load — very visible in a settings list. Arming on the first change means
     the class is simply absent until the user has actually touched the control,
     and dropping it again on animationend lets the next toggle restart the
     keyframes rather than inheriting a class that is already applied. */
  const [travelling, setTravelling] = React.useState(false)
  const thumb = React.useRef<HTMLSpanElement>(null)

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      onCheckedChange={(checked) => {
        /* Toggling again mid-journey has to rewind the keyframes by hand. The
           class is already on the element, so React re-rendering it changes
           nothing the engine can see — the running animation keeps its progress
           and simply picks up the flipped endpoints, which teleports the knob
           by most of a track width. Measured: a second click 140ms in moved it
           15.9px → -1.0px between two frames. Rewinding to 0 turns that into
           the ~1.6px worth of overshoot it had already spent, and the reverse
           journey then plays in full. Transitions are left alone (`transform`
           is carrying a live press at exactly this moment, and rewinding that
           would undo the squeeze under the finger). */
        for (const animation of thumb.current?.getAnimations() ?? []) {
          if ("animationName" in animation) animation.currentTime = 0
        }
        setTravelling(true)
        onCheckedChange?.(checked)
      }}
      /* One number describes the whole control. Track height h is the only
         per-size value; everything else is a fixed fraction of it, which is what
         makes the two sizes one object at two scales rather than two hand-tuned
         boxes:

             track   2h × h        thumb  h × 2h/3      inset  h/6      travel  2h/3

         h = 22 → 44 × 22 track, 22 × 14.667 pill, 3.667 inset, 14.667 travel.
         h = 18 → 36 × 18 track, 18 × 12     pill, 3     inset, 12     travel.

         The padding is what places the knob, so the inset is one declaration
         instead of a resting offset the travel then has to carry: content box =
         h − 2·border − 2·pad = 2h/3 vertically, which is exactly the thumb, so
         `items-center` has nothing left to centre and the top and bottom insets
         cannot drift apart. The −1px is the transparent border, which is inside
         the border box and would otherwise be counted twice.

         The track colour is deliberately NOT transitioned: the fill answers the
         click on the same frame while the knob is still crossing, which is what
         separates "the state changed" from "the knob is moving". */
      className={cn(
        "peer group/switch relative inline-flex h-(--switch-h) w-[calc(var(--switch-h)*2)] shrink-0 items-center rounded-full border border-transparent p-[calc(var(--switch-h)/6_-_1px)] outline-none [--switch-h:22px] after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=sm]:[--switch-h:18px] dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:bg-selected data-unchecked:bg-switch-track dark:data-unchecked:bg-input/80 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:active:animate-nudge",
        className
      )}
      {...props}
    >
      {/* Three transform properties, three jobs, three clocks. `translate` is
          the travel — parked at --travel-x, and animated over --travel-x by the
          bounce keyframes so the two can never disagree about where the knob
          lives. `transform` is the press — squeeze plus a stretch toward the
          destination — on the fast press spring. `scale` is the travel squish,
          on keyframes. Because the browser composes translate → scale →
          transform into one matrix, the two squeezes multiply during the
          overlap of a slow press instead of one clobbering the other, and the
          travel keeps its own timing throughout.

          `translate` stays in the transition list at the animation's own
          duration for the case the flag cannot see: a controlled switch whose
          `checked` prop is changed from somewhere else (a select-all, an undo,
          a sync) never calls onCheckedChange, so no animation is armed. It
          glides rather than snapping, and because the clocks match, the moment
          the animation ends the transition has landed on the same pixel — no
          hand-off is visible.

          `data-checked:bg-selected-foreground` binds the knob to the fill it
          lands on rather than restating white. What it is NOT is the thing
          earning the contrast, and the measured values say so: at rest the knob
          is `bg-white`, and --selected-foreground resolves to that same pure
          white in both default themes — so the class repaints nothing there. In
          the four .theme-* blocks it is a near-white, one and a half points of
          lightness below it.

          The 3:1 a state indicator needs is cleared by --selected being dark
          enough on its own. Knob against the checked fill, measured off the
          rendered colours: 3.48:1 light default and 3.23:1 dark default (both
          of those pure white), then 3.15:1 orange, 3.55:1 green, 4.71:1 blue,
          5.47:1 violet on the themes' near-white. Worst case 3.15:1. Pure
          white in those same four would read 3.28 / 3.71 / 4.92 / 5.70, so the
          token costs 0.13–0.23 rather than earning anything.

          So the class is here to keep the knob following the token if a theme
          ever moves it — not to fix a contrast failure. Anyone retuning
          --selected-foreground should read the ratios above as constraints on
          --selected, which is the value that actually carries them. */}
      <SwitchPrimitive.Thumb
        ref={thumb}
        data-slot="switch-thumb"
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setTravelling(false)
        }}
        className={cn(
          "pointer-events-none block h-[calc(var(--switch-h)*2/3)] w-(--switch-h) translate-x-(--travel-x) rounded-full bg-white shadow-sm ring-0 [--travel-distance:calc(var(--switch-h)*2/3)] [transition-property:translate,transform] [transition-duration:var(--duration-travel),var(--duration-spring-press)] [transition-timing-function:var(--ease-out-back),var(--ease-spring-press)] data-checked:bg-selected-foreground data-checked:[--travel-dir:1] data-checked:[--travel-x:var(--travel-distance)] data-unchecked:[--travel-dir:-1] data-unchecked:[--travel-x:0px] group-active/switch:data-checked:[transform:translateX(calc(--spacing(1)*-1))_scale(0.9)] group-active/switch:data-unchecked:[transform:translateX(--spacing(1))_scale(0.9)]",
          travelling && "animate-travel"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
