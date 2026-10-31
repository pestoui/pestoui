import { IconTile } from "./icon-tile"
import { OrbAvatar, type OrbHue } from "./orb-avatar"
import { cn } from "../lib/utils"

export type CoverGradient = "sky" | "sunrise" | "blossom" | "meadow"

export function AgentCard({
  title,
  description,
  gradient,
  icons,
  author,
  authorHue = "violet",
  cover = "bleed",
  className,
}: {
  title: string
  description: string
  gradient: CoverGradient
  icons: React.ReactNode[]
  /* Omit to drop the "by" row entirely */
  author?: string
  authorHue?: OrbHue
  /* bleed: cover runs to the card edges · inset: cover sits in a white frame */
  cover?: "bleed" | "inset"
  className?: string
}) {
  const inset = cover === "inset"

  return (
    /* Motion: the whole card is the target, so the card answers rather than
       anything inside it. Hover raises it two pixels and steps the resting
       shadow up one rung of the scale — travel and shadow together are what
       read as a lift; either alone reads as a slide. Press is the system press
       spring, and it can own the entire surface here because nothing inside
       this card is interactive, so there is no child press to fight. */
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-foreground/[0.04] transition-[box-shadow,translate,scale] duration-base ease-out-expo hover:-translate-y-0.5 hover:shadow-float active:scale-99 active:duration-spring-press active:ease-spring-press",
        inset && "p-2",
        className
      )}
    >
      <div
        className={cn(
          "flex h-48 items-center justify-center gap-4",
          `gradient-${gradient}`,
          inset ? "rounded-[14px]" : "rounded-t-[calc(var(--radius-xl)-1px)]"
        )}
      >
        {icons.map((icon, i) => (
          <IconTile key={i} variant="raised" size="xl">
            {icon}
          </IconTile>
        ))}
      </div>
      <div className={cn("px-6 pt-6 pb-6", inset && "px-4 pb-4")}>
        <h3 className="text-[1.1875rem] leading-snug font-semibold tracking-[-0.012em]">
          {title}
        </h3>
        <p className="mt-1.5 text-body leading-normal text-muted-foreground">
          {description}
        </p>
        {author ? (
          <div className="mt-6 flex items-center gap-2 text-body text-muted-foreground">
            by
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <OrbAvatar hue={authorHue} className="size-5" />
              {author}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
