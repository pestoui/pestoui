"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "../../lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-5 shrink-0 items-center justify-center rounded-[6px] border border-input bg-card [transition-property:color,background-color,border-color,scale] [transition-duration:var(--duration-base),var(--duration-base),var(--duration-base),var(--duration-spring-press)] [transition-timing-function:var(--ease-out-expo),var(--ease-out-expo),var(--ease-out-expo),var(--ease-spring-press)] outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.92] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-selected dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-selected data-checked:bg-selected data-checked:text-selected-foreground dark:data-checked:bg-selected",
        className
      )}
      {...props}
    >
      {/* forceMount keeps the mark in the DOM through the unchecked state so the
          exit can be transitioned. It contributes no layout — the box is a fixed
          size-5 and both glyphs are centred inside it. */}
      <CheckboxPrimitive.Indicator
        forceMount
        data-slot="checkbox-indicator"
        className="group/checkbox-indicator relative grid place-content-center text-current [&>svg]:size-3.5"
      >
        {/* strokeWidth is in viewBox units, so the inked weight is whatever the
            render scale leaves of it: the svg is size-3.5, so 24 units map to
            14px and every unit is worth 0.5833px. lucide's stock 2 therefore
            paints 1.167px — measured, not derived — against the 2px
            indeterminate bar sitting in the same 20px box, which is why the
            tick read light next to its own sibling. 3 paints 1.75px and closes
            that gap to 12.5%. It is also the most the geometry takes: the short
            leg is √50 ≈ 7.07 units, so at 3 the mark is still 2.4 stroke-widths
            long, and the round caps push the painted box to 19 × 14 units —
            inside the 24 the svg clips at, with room to spare. */}
        {/* The three transitioned properties are NOT on one clock, and the odd
            one out is the blur. motion.css rule 3 makes blur an enter-only
            materialise cue that always resolves to 0 — but the resting value has
            to live on the unchecked state, because that is where the enter
            departs from, so a symmetric list runs it backwards on the way out:
            measured blur(0) → blur(4px) across a real un-check, growing to the
            full enter magnitude at the exact moment the mark should be leaving.
            Zero duration plus a delay of one whole exit re-arms it instead:
            filter is held at `none` for every frame the mark is still visible
            and snaps back to blur-xs once opacity has reached 0, so the next
            enter still has 4px to resolve out of and the exit never blurs.
            (A re-check inside that 160ms window materialises without the blur.
            That is the reversal case, and a reversal should not re-play the
            arrival cue.) */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="scale-50 opacity-0 blur-xs transition-[opacity,scale,filter] [transition-delay:0s,0s,var(--duration-exit)] [transition-duration:var(--duration-exit),var(--duration-exit),0s] ease-out-expo group-data-checked/checkbox-indicator:scale-100 group-data-checked/checkbox-indicator:opacity-100 group-data-checked/checkbox-indicator:blur-none group-data-checked/checkbox-indicator:[transition-delay:var(--stagger-base)] group-data-checked/checkbox-indicator:duration-slow"
        >
          {/* pathLength normalises the stroke to 100 units, so the dash travel is
              independent of the tick's real geometry. --draw-length then runs the
              dash to 112: twelve units of deliberate headroom past the end of the
              mark. The tip therefore lands at 89.3% of the travel, which
              --ease-out-expo reaches 80ms into the 250ms draw, and the remaining
              170ms of easing tail is spent on nothing visible. Without the
              headroom the tick is only whole at 100% of the travel — i.e. at
              249ms — so the last few units creep to a stop instead of arriving.
              Resting geometry is unchanged either way: at offset 112 the whole
              path sits in the gap, at offset 0 a single dash covers it.

              That headroom is free on the enter and ruinous on the exit, because
              the exit walks the SAME dash range in the opposite direction and
              the twelve units are now at the START. Visible length is
              clamp(112 − offset, 0, 100), so the first 10.71% of the reverse
              travel erases nothing at all — and draw-path's exit easing is
              --ease-in-quart, whose y is literally t³, so crossing that dead
              zone costs 57% of the 160ms exit. Measured: the tick was still 100%
              drawn at 101ms, by which point the svg above had faded to 0.024
              opacity. The erase ran entirely inside frames nobody could see.

              A negative delay skips the dead zone instead of removing it. 12 ÷
              112 = 0.1071 of the travel, and the ease-in-quart pre-image of
              0.1071 is 0.570 of the duration; −0.55 rounds inward so the exit's
              first frame still starts at offset 10.6 — under 12, so the mark is
              whole and there is no clip to see — and the erase is under way
              ~3ms later, at full opacity. Nothing else moves: dasharray,
              dashoffset, duration and easing all keep the values draw-path gives
              them, and the enter's own `[transition-delay:var(--stagger-base)]`
              outranks this one at (0,3,0), so the 35ms stagger is untouched.
              Measured after: 91.7 units left at 0.49 opacity, 75.5 at 0.23, and
              fully erased by 86ms — inside a fade that runs to 160ms.

              ⚠️ The −0.55 is a function of BOTH --draw-length and draw-path's
              exit easing. Retune either and re-derive it, or the exit goes back
              to painting nothing. */}
          <path
            d="M20 6 9 17l-5-5"
            pathLength="100"
            className="draw-path [transition-delay:calc(var(--duration-exit)*-0.55)] [--draw-length:112] group-data-checked/checkbox-indicator:draw-path-done group-data-checked/checkbox-indicator:[transition-delay:var(--stagger-base)]"
          />
        </svg>
        {/* Same three-clock split as the tick above, for the same reason: the
            bar's blur was travelling 0 → 4px on the way out. Held at `none`
            through the fade, re-armed after it.

            The `[transition-delay:0s]` on the enter is not redundant. A delay
            LIST is inherited by whichever state does not replace it, and the
            tick above only escapes that because its enter already sets a single
            `var(--stagger-base)` for the 35ms stagger. The bar has no stagger,
            so without this the exit's 160ms filter hold leaks into the enter and
            the blur only starts resolving after the bar is already fully opaque.
            Measured that way round before it was added. */}
        <span
          data-slot="checkbox-indeterminate"
          className="absolute top-1/2 left-1/2 h-0.5 w-2.5 -translate-x-1/2 -translate-y-1/2 scale-50 rounded-full bg-current opacity-0 blur-xs transition-[opacity,scale,filter] [transition-delay:0s,0s,var(--duration-exit)] [transition-duration:var(--duration-exit),var(--duration-exit),0s] ease-out-expo group-data-[state=indeterminate]/checkbox-indicator:scale-100 group-data-[state=indeterminate]/checkbox-indicator:opacity-100 group-data-[state=indeterminate]/checkbox-indicator:blur-none group-data-[state=indeterminate]/checkbox-indicator:[transition-delay:0s] group-data-[state=indeterminate]/checkbox-indicator:duration-base"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
