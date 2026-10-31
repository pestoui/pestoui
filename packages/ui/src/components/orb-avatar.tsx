import { cn } from "../lib/utils"

export type OrbHue = "violet" | "pink" | "orange" | "blue" | "teal"

const HUE_COLOR: Record<OrbHue, string> = {
  violet: "#7C5CF0",
  pink: "#EF6FBE",
  orange: "#F59A4B",
  blue: "#5B9DF7",
  teal: "#43C6C8",
}

/* Quadrant wedges of one hue at stepped opacities — the identity "orb" avatar */
const QUADRANT_OPACITY = [1, 0.45, 0.75, 0.28]

export function OrbAvatar({
  hue = "violet",
  className,
}: {
  hue?: OrbHue
  className?: string
}) {
  const color = HUE_COLOR[hue]
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6 shrink-0", className)}>
      <circle cx="12" cy="12" r="12" fill="#fff" />
      {QUADRANT_OPACITY.map((opacity, i) => (
        <path
          key={i}
          d="M12 12 L12 0.6 A11.4 11.4 0 0 1 23.4 12 Z"
          fill={color}
          opacity={opacity}
          transform={`rotate(${i * 90} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="1.7" fill="#fff" />
    </svg>
  )
}

export function OrbStack({
  hues = ["violet", "pink", "orange", "blue", "teal"],
  className,
  orbClassName,
}: {
  hues?: OrbHue[]
  className?: string
  orbClassName?: string
}) {
  return (
    <div className={cn("flex -space-x-1.5", className)}>
      {hues.map((hue, i) => (
        <OrbAvatar
          key={i}
          hue={hue}
          className={cn("size-7 rounded-full ring-2 ring-card", orbClassName)}
        />
      ))}
    </div>
  )
}
