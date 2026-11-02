import { useId } from "react"

import { cn } from "../lib/utils"

export type OrbHue = "violet" | "pink" | "orange" | "blue" | "teal"

/* cx, cy, rx, ry and rotation in degrees, then opacity: one ellipse of colour on a
   100-unit disc. Its colour is the matching --orb-<hue>-<n> in styles/orb.css. */
type OrbEllipse = readonly [number, number, number, number, number, number]

/* Each disc is fitted to a painted original, so these numbers and the colours in
   styles/orb.css only mean anything together. `rim` is the rim's opacity at each of
   RIM_OFFSETS; it starts from nothing at RIM_START. */
const DISCS: Record<
  OrbHue,
  { ellipses: readonly OrbEllipse[]; rim: readonly number[] }
> = {
  violet: {
    ellipses: [
      [42.4, 39.8, 75.6, 37.1, 39, 1],
      [37.9, 81.2, 74, 30.8, 80, 1],
      [23.6, 23.8, 52.4, 46.5, 176, 1],
      [87.3, 34.8, 60.4, 25.5, 15, 0.95],
    ],
    rim: [0.16, 0.45, 0.85],
  },
  pink: {
    ellipses: [
      [61.3, 39.9, 71.3, 53.5, 135, 0.9],
      [44.3, 8.1, 58.7, 32.2, 115, 0.9],
      [30.8, 71.4, 35.2, 27.3, 140, 0.77],
      [89.8, 61.1, 34.4, 61.2, 76, 0.89],
    ],
    rim: [0.12, 0.4, 0.82],
  },
  orange: {
    ellipses: [
      [54, 68.3, 76, 57.9, 24, 0.97],
      [73.1, 26.8, 34.4, 30.2, 137, 1],
      [25.5, 39.6, 66.3, 48.6, 73, 0.22],
    ],
    rim: [0.13, 0.44, 0.84],
  },
  blue: {
    ellipses: [
      [14.7, 33.9, 160, 50.4, 55, 0.91],
      [22.9, 49.4, 63.1, 42.6, 4, 0.87],
      [51.5, 14.3, 38.5, 30.3, 141, 0.85],
      [108.7, 46.5, 89.7, 58, 158, 1],
    ],
    rim: [0.1, 0.41, 0.83],
  },
  teal: {
    ellipses: [
      [62.3, 61.9, 59.2, 48.6, 36, 1],
      [95.3, 40.1, 67.6, 31, 11, 0.74],
      [44.4, 93.3, 58.7, 31.4, 64, 0.62],
      [30.6, 31.9, 35, 24.5, 39, 0.87],
    ],
    rim: [0.14, 0.45, 0.84],
  },
}

/* An ellipse's opacity from its centre to its edge, offset then opacity: close to a
   Gaussian in as few stops as still look like one, since each is markup in every
   avatar. */
const FADE = [
  [0, 1],
  [0.25, 0.82],
  [0.49, 0.41],
  [0.73, 0.12],
  [1, 0],
] as const

const RIM_START = 0.8
const RIM_OFFSETS = [0.87, 0.93, 1] as const

/* A soft disc of blended colour, the identity "orb" avatar. Gradients alone, with no
   canvas, filter or image, so it renders on the server and draws under a strict CSP. */
export function OrbAvatar({
  hue = "violet",
  className,
}: {
  hue?: OrbHue
  className?: string
}) {
  /* A gradient is found by an id that the whole document shares, and the shape of
     useId's value varies across React 19. Reduced to characters that are safe in
     url(#…), and with the hue kept in it, so two React roots or two Server Component
     requests, whose ids can repeat, still draw their own colours. The one loss: when
     the first copy of a repeated id is under display:none, browsers paint no gradient
     from it, and the later disc shows only its flat base. */
  const id = `orb-${hue}-${useId().replace(/[^A-Za-z0-9_-]/g, "")}`
  const { ellipses, rim } = DISCS[hue]
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      /* rounded-full is the disc's edge: it needs no id of its own, and the ring
         OrbStack draws follows the same curve. */
      className={cn("size-6 shrink-0 rounded-full", className)}
    >
      <defs>
        {ellipses.map((_, i) => (
          <radialGradient key={i} id={`${id}-${i}`}>
            {FADE.map(([offset, opacity]) => (
              <stop
                key={offset}
                offset={offset}
                stopColor={`var(--orb-${hue}-${i + 1})`}
                stopOpacity={opacity}
              />
            ))}
          </radialGradient>
        ))}
        <radialGradient id={`${id}-rim`}>
          <stop
            offset={RIM_START}
            stopColor={`var(--orb-${hue}-rim)`}
            stopOpacity={0}
          />
          {RIM_OFFSETS.map((offset, i) => (
            <stop
              key={offset}
              offset={offset}
              stopColor={`var(--orb-${hue}-rim)`}
              stopOpacity={rim[i]}
            />
          ))}
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`var(--orb-${hue}-base)`} />
      {ellipses.map(([cx, cy, rx, ry, rotation, opacity], i) => (
        <ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          transform={`rotate(${rotation} ${cx} ${cy})`}
          fill={`url(#${id}-${i})`}
          fillOpacity={opacity}
        />
      ))}
      <rect width="100" height="100" fill={`url(#${id}-rim)`} />
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
