import { cn } from "../lib/utils"

/* Filter pill — the "All agents / Support / Research" category selector.

   Motion: a chip is clicked constantly, so the press is the whole story — a
   small spring scale that settles in well under a fifth of a second, sitting on
   top of a selection colour that resolves fast enough to read as instant. The
   two are split onto separate timings for that reason: one shared duration
   would either make the colour lag or cut the spring off mid-settle. No hover
   scale — in a scrolling row of these it reads as noise and fights the press. */
export function Chip({
  active = false,
  className,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-10 shrink-0 items-center justify-center rounded-full px-5 text-body font-medium whitespace-nowrap [transition-property:color,background-color,border-color,box-shadow,scale] [transition-duration:var(--duration-fast),var(--duration-fast),var(--duration-fast),var(--duration-fast),var(--duration-spring-press)] [transition-timing-function:var(--ease-out-expo),var(--ease-out-expo),var(--ease-out-expo),var(--ease-out-expo),var(--ease-spring-press)] outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:not-disabled:scale-97",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-foreground hover:bg-accent",
        className
      )}
      {...props}
    />
  )
}
