/* The constraint solver.
 *
 * Every derived tone is solved against the way the token is ACTUALLY used in
 * this codebase, at the WCAG level that use demands. The thresholds are not a
 * judgement call — they come from grepping the components:
 *
 *   --selected appears as `text-selected` in 26 places (tabs.tsx:190,
 *   pagination.tsx:59, stepper.tsx:49, tree-view.tsx:298, calendar.tsx:130,
 *   dialog.tsx:150 …). That is body text on --card, so WCAG 1.4.3 applies and
 *   the bar is 4.5:1, not the 3:1 you would pick if you only thought of it as
 *   a checkbox fill.
 *
 *   --selected-foreground sits ON that fill as text (`text-selected-foreground`
 *   on `bg-selected` in toggle, filter, calendar, checkbox, radio). Also 4.5:1.
 *
 *   --primary carries `text-primary-foreground` labels (button.tsx:21,
 *   badge.tsx:12, tag.tsx:15) and is itself used as text in badge.tsx:26's
 *   `link` variant. Both 4.5:1.
 *
 *   Progress fill against its --secondary track is a graphical object, so
 *   WCAG 1.4.11 applies and the bar is 3:1.
 *
 * The consequence worth understanding before reading further: under these
 * rules a brand colour cannot be both a loud CTA surface and an accessible
 * one. The lime #D1F826 is 1.22:1 against white — it fails 1.4.3 by a factor
 * of four. Solving for compliance necessarily darkens it. That is not the
 * solver being conservative; it is what the requirement means.
 *
 * The other structural fact, which is why --selected-foreground is solved
 * rather than pinned: in light mode the accent must be DARK (to be readable as
 * text on a white card), so a white mark sits on it. In dark mode it must be
 * LIGHT (to be readable on a near-black card), so the mark must be dark. The
 * mark inverts with the mode because the accent does. Pinning it white makes
 * dark mode unsatisfiable.
 */

import {
  contrast,
  maxChroma,
  toGamutRgb,
  toHex,
  type Oklch,
  type Rgb,
} from "./color"

/** WCAG 1.4.3 — normal-size body text. */
export const BODY_TEXT = 4.5
/** WCAG 1.4.11 — UI components and graphical objects. */
export const NON_TEXT = 3

/**
 * Below this chroma a colour has no meaningful hue: hue comes from
 * `atan2(b, a)` and at c ≈ 0 that is matrix residue, not colour. Every pure
 * grey from #101010 to #EEEEEE reports 89.88°.
 */
export const MIN_BRAND_CHROMA = 0.025

export function isChromatic(color: Oklch): boolean {
  return color.c >= MIN_BRAND_CHROMA
}

export type Mode = "light" | "dark"

export interface AuditRow {
  id: string
  /** The component that forces this pairing to exist. */
  forcedBy: string
  /** Which success criterion applies. */
  wcag: "1.4.3" | "1.4.11"
  required: number
  actual: number
  passes: boolean
  foregroundHex: string
  backgroundHex: string
}

/** The neutral surfaces a derived tone is judged against, at the brand hue. */
export interface Neighbours {
  mode: Mode
  /** --card: white in light, near-black in dark. */
  card: Oklch
  /** --secondary: the progress/slider track. */
  track: Oklch
  /** --foreground: the ink used for body copy. */
  ink: Oklch
}

const WHITE: Oklch = { l: 1, c: 0, h: 0 }

/** Read straight off index.css so the solver checks the real tokens. */
export function neighboursFor(hue: number, mode: Mode): Neighbours {
  return mode === "light"
    ? {
        mode,
        card: { l: 1, c: 0, h: hue },
        track: { l: 0.9542, c: 0.0042, h: hue },
        ink: { l: 0.2404, c: 0.0055, h: hue },
      }
    : {
        mode,
        card: { l: 0.2404, c: 0.0055, h: hue },
        track: { l: 0.2686, c: 0.0072, h: hue },
        ink: { l: 0.2404, c: 0.0055, h: hue },
      }
}

/** Chroma clamped to the sRGB gamut, never above the brand's own. */
const toneAt = (l: number, brand: Oklch): Oklch => ({
  l,
  c: Math.min(brand.c, maxChroma(l, brand.h)),
  h: brand.h,
})

export interface SolvedTone {
  color: Oklch
  hex: string
  /** Solved per mode — white on a dark accent, ink on a light one. */
  foreground: Oklch
  foregroundHex: string
  audit: AuditRow[]
  /** Feasible lightness interval, null when no tone satisfies every rule. */
  band: { lo: number; hi: number } | null
  ok: boolean
  /** True when the solver had to move off the brand's own lightness. */
  adjusted: boolean
  lightnessShift: number
}

/**
 * Pick the mark colour for a fill, preferring whichever clears the bar with
 * more room. Unlike the earlier version this is genuinely solved: at 4.5:1 a
 * single pinned choice is unsatisfiable across both modes.
 */
function markFor(fill: Rgb, hue: number): { color: Oklch; ratio: number } {
  const ink: Oklch = { l: 0.2404, c: 0.0055, h: hue }
  const w = { color: WHITE, ratio: contrast(toGamutRgb(WHITE), fill) }
  const k = { color: ink, ratio: contrast(toGamutRgb(ink), fill) }
  return w.ratio >= k.ratio ? w : k
}

interface Rule {
  id: string
  forcedBy: string
  wcag: "1.4.3" | "1.4.11"
  required: number
  /** Contrast of the candidate tone against this neighbour, or of its mark. */
  against: "card" | "track" | "mark"
}

/** What --selected must satisfy. */
const ACCENT_RULES: Rule[] = [
  {
    id: "accent-as-text",
    forcedBy: "text-selected on a card (tabs, pagination, stepper, tree-view)",
    wcag: "1.4.3",
    required: BODY_TEXT,
    against: "card",
  },
  {
    id: "accent-vs-track",
    forcedBy: "Progress fill against its --secondary track",
    wcag: "1.4.11",
    required: NON_TEXT,
    against: "track",
  },
  {
    id: "mark-on-accent",
    forcedBy: "text-selected-foreground on bg-selected (toggle, filter, calendar)",
    wcag: "1.4.3",
    required: BODY_TEXT,
    against: "mark",
  },
]

/** What --primary must satisfy. */
const PRIMARY_RULES: Rule[] = [
  {
    id: "primary-as-text",
    forcedBy: "text-primary, badge.tsx:26 link variant",
    wcag: "1.4.3",
    required: BODY_TEXT,
    against: "card",
  },
  {
    id: "label-on-primary",
    forcedBy: "text-primary-foreground on bg-primary (button, badge, tag)",
    wcag: "1.4.3",
    required: BODY_TEXT,
    against: "mark",
  },
]

function auditTone(tone: Oklch, n: Neighbours, rules: Rule[]): AuditRow[] {
  const fill = toGamutRgb(tone)
  const mark = markFor(fill, tone.h)

  return rules.map((r) => {
    const actual =
      r.against === "mark"
        ? mark.ratio
        : contrast(fill, toGamutRgb(r.against === "card" ? n.card : n.track))

    const bg = r.against === "mark" ? fill : toGamutRgb(r.against === "card" ? n.card : n.track)
    const fg = r.against === "mark" ? toGamutRgb(mark.color) : fill

    return {
      id: `${n.mode}/${r.id}`,
      forcedBy: r.forcedBy,
      wcag: r.wcag,
      required: r.required,
      actual,
      passes: actual >= r.required,
      foregroundHex: toHex(fg),
      backgroundHex: toHex(bg),
    }
  })
}

/**
 * Sweep the lightness axis, keep every tone that satisfies all rules, and
 * return the feasible band plus the point in it nearest the brand's own
 * lightness — the most brand-faithful tone that is still compliant.
 */
function solve(brand: Oklch, n: Neighbours, rules: Rule[]): SolvedTone {
  const STEP = 0.0025
  const LO = 0.12
  const HI = 0.97

  /* Solve to a hair above each threshold rather than exactly onto it. These
     ratios are computed from 8-bit sRGB, but a browser composites in its own
     working space and its rounding will not always agree in the last decimal.
     A tone that measures exactly 4.500:1 here can audit at 4.49:1 in a real
     checker, which reads as a failure. The margin is far below a perceptible
     step and buys the result out of that whole argument. */
  const MARGIN = 0.05

  const feasible: number[] = []
  for (let l = LO; l <= HI + 1e-9; l += STEP) {
    const rows = auditTone(toneAt(l, brand), n, rules)
    if (rows.every((r) => r.actual >= r.required + MARGIN)) feasible.push(l)
  }

  if (!feasible.length) {
    /* Nothing works. Return the least-bad tone with a full audit so the caller
       can name the rule that could not be met, rather than silently shipping
       something unreadable. */
    let best = brand.l
    let worstShortfall = Infinity
    for (let l = LO; l <= HI + 1e-9; l += STEP) {
      const rows = auditTone(toneAt(l, brand), n, rules)
      const short = rows.reduce((s, r) => s + Math.max(0, r.required - r.actual), 0)
      if (short < worstShortfall) {
        worstShortfall = short
        best = l
      }
    }
    const tone = toneAt(best, brand)
    const fill = toGamutRgb(tone)
    const mark = markFor(fill, brand.h)
    return {
      color: tone,
      hex: toHex(fill),
      foreground: mark.color,
      foregroundHex: toHex(toGamutRgb(mark.color)),
      audit: auditTone(tone, n, rules),
      band: null,
      ok: false,
      adjusted: Math.abs(best - brand.l) > STEP * 2,
      lightnessShift: Math.abs(best - brand.l),
    }
  }

  const lo = feasible[0]
  const hi = feasible[feasible.length - 1]
  /* Nearest feasible lightness to the brand's own — clamping into the band
     rather than jumping to an end of it is what keeps the theme recognisable. */
  const chosen = feasible.reduce((a, b) =>
    Math.abs(b - brand.l) < Math.abs(a - brand.l) ? b : a,
  )

  const tone = toneAt(chosen, brand)
  const fill = toGamutRgb(tone)
  const mark = markFor(fill, brand.h)

  return {
    color: tone,
    hex: toHex(fill),
    foreground: mark.color,
    foregroundHex: toHex(toGamutRgb(mark.color)),
    audit: auditTone(tone, n, rules),
    band: { lo, hi },
    ok: true,
    adjusted: Math.abs(chosen - brand.l) > STEP * 2,
    lightnessShift: Math.abs(chosen - brand.l),
  }
}

/** --selected for one mode. */
export function deriveAccent(brand: Oklch, n: Neighbours): SolvedTone {
  return solve(brand, n, ACCENT_RULES)
}

/** --primary for one mode. */
export function derivePrimary(brand: Oklch, n: Neighbours): SolvedTone {
  return solve(brand, n, PRIMARY_RULES)
}

/**
 * Audit an arbitrary tone the user picked by hand, so the UI can show exactly
 * what a manual override breaks.
 */
export function auditAccent(tone: Oklch, n: Neighbours): AuditRow[] {
  return auditTone(tone, n, ACCENT_RULES)
}
