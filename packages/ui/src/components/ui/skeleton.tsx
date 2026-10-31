import { cn } from "../../lib/utils"

/* A sweep rather than a fade. A block that dims and brightens in place reads as
   "disabled"; a highlight travelling left to right reads as "still loading",
   and it does it without the whole page breathing in unison.

   The tint is the same flat foreground wash as before — the sweep is a second
   layer on top of it, a gradient twice the width of the box that the shimmer
   keyframe slides across. Both stops come off `--foreground`, so it inverts with
   the theme for free and stays one quiet value in either mode.

   This is the placeholder only — it knows nothing about the content it stands
   in for, and nothing about when that content arrives. Handing over is the
   `reveal-stack` / `reveal-skeleton` / `reveal-content` trio in
   `styles/motion.css`, wrapped for the common case by `<Reveal>` in `./reveal`.
   That lives in its own module on purpose: importing `Skeleton` must not drag
   the reveal machinery in behind it. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-shimmer rounded-lg bg-foreground/[0.06] bg-linear-to-r from-transparent via-foreground/[0.07] to-transparent bg-size-[200%_100%]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
