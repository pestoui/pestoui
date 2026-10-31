import { Button } from "./ui/button"
import { cn } from "../lib/utils"

/* Dark connect/upsell card — the inverse surface */
export function PromoCard({
  icon,
  title,
  subtitle,
  cta,
  className,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  cta: string
  className?: string
}) {
  return (
    /* Motion: hover lift only, and deliberately no press. The CTA inside is the
       real target and it already carries the press spring — scaling the card
       under it would double the feedback on one tap and imply the card itself
       was hit. No shadow step either: this surface already rests on the deepest
       shadow in the scale, so the travel carries the lift on its own. */
    <div
      className={cn(
        "w-[320px] rounded-2xl bg-inverse p-6 shadow-float transition-transform duration-base ease-out-expo hover:-translate-y-0.5",
        className
      )}
    >
      <div className="[&_svg]:size-9">{icon}</div>
      <h4 className="mt-5 text-lg font-semibold tracking-snug text-inverse-foreground">
        {title}
      </h4>
      <p className="mt-1 text-body text-inverse-muted">{subtitle}</p>
      <Button variant="inverse" size="lg" className="mt-6 w-full">
        {cta}
      </Button>
    </div>
  )
}
