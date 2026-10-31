/* Colour maths for logo-driven theming.
 *
 * Hand-written rather than pulled from `culori` for two reasons: the whole
 * surface we need is ~5 conversions, and this file has to run inside the
 * single-file build, where every dependency is inlined into the HTML.
 *
 * The one thing to hold onto while reading: OKLCH lightness and WCAG contrast
 * are NOT the same axis and do not move together. OKLab L is perceptual;
 * WCAG relative luminance is a weighted sum of linear sRGB channels that
 * massively favours green (0.7152) over blue (0.0722). Two colours at
 * identical OKLCH L — say yellow and blue — differ by several stops of WCAG
 * luminance. Every accessibility decision in this module therefore routes
 * through `contrast()`, never through L. Treating L as a contrast proxy is the
 * single easiest way to ship an unreadable theme.
 */

export interface Oklch {
  /** Perceptual lightness, 0–1. */
  l: number
  /** Chroma, 0–~0.4 in sRGB. Unbounded in principle, gamut-limited in practice. */
  c: number
  /** Hue angle in degrees, 0–360. Meaningless when c ≈ 0. */
  h: number
}

export interface Rgb {
  /** 0–255 */
  r: number
  /** 0–255 */
  g: number
  /** 0–255 */
  b: number
}

/* ---------------------------------------------------------------- transfer */

/** sRGB 0–1 → linear-light 0–1. */
function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** Linear-light 0–1 → sRGB 0–1. */
function toGamma(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

/* -------------------------------------------------------------- conversion */

/* Ottosson's sRGB↔OKLab matrices. The cube root is the perceptual step: it is
   what makes equal L differences look equally different, which is the whole
   reason we search on this axis instead of on sRGB. */

function linearRgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ]
}

function oklabToLinearRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const [L, A, B] = linearRgbToOklab(
    toLinear(r / 255),
    toLinear(g / 255),
    toLinear(b / 255),
  )

  const c = Math.sqrt(A * A + B * B)
  /* atan2 returns (-180, 180]; normalise so hue is always a positive angle,
     otherwise a red-ish logo emits a negative --brand-hue and every neutral
     that interpolates off it lands somewhere unintended. */
  let h = (Math.atan2(B, A) * 180) / Math.PI
  if (h < 0) h += 360

  return { l: L, c, h }
}

/**
 * OKLCH → sRGB, with out-of-gamut channels clipped.
 *
 * Prefer `toGamutRgb` for anything user-facing: naive clipping shifts hue,
 * because it truncates channels independently.
 */
export function oklchToRgb({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180
  const [lr, lg, lb] = oklabToLinearRgb(l, c * Math.cos(rad), c * Math.sin(rad))

  return {
    r: Math.round(clamp01(toGamma(lr)) * 255),
    g: Math.round(clamp01(toGamma(lg)) * 255),
    b: Math.round(clamp01(toGamma(lb)) * 255),
  }
}

/** Is this OKLCH colour representable in sRGB without clipping? */
export function inGamut({ l, c, h }: Oklch): boolean {
  const rad = (h * Math.PI) / 180
  const [r, g, b] = oklabToLinearRgb(l, c * Math.cos(rad), c * Math.sin(rad))
  /* A hair of tolerance: the round-trip is not bit-exact, and without it
     colours that are legitimately in gamut get needlessly desaturated. */
  const e = 1e-4
  return r >= -e && r <= 1 + e && g >= -e && g <= 1 + e && b >= -e && b <= 1 + e
}

/**
 * Reduce chroma until the colour fits in sRGB, holding L and H fixed.
 *
 * This is the honest way to leave the gamut: hue is the brand, lightness is
 * the accessibility constraint, so chroma is the only axis that may give. 20
 * bisection steps resolves to ~1e-6, far below a perceptible step.
 */
export function toGamutRgb(color: Oklch): Rgb {
  if (inGamut(color)) return oklchToRgb(color)

  let lo = 0
  let hi = color.c
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (inGamut({ ...color, c: mid })) lo = mid
    else hi = mid
  }
  return oklchToRgb({ ...color, c: lo })
}

/** Largest chroma representable at this lightness and hue. */
export function maxChroma(l: number, h: number): number {
  let lo = 0
  let hi = 0.4
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (inGamut({ l, c: mid, h })) lo = mid
    else hi = mid
  }
  return lo
}

/* ------------------------------------------------------------------ WCAG */

/**
 * WCAG 2.1 relative luminance. Note the channel weights — green carries ten
 * times the weight of blue, which is why a saturated yellow and a saturated
 * blue at the same OKLCH L sit nowhere near each other on this scale.
 */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return (
    0.2126 * toLinear(r / 255) +
    0.7152 * toLinear(g / 255) +
    0.0722 * toLinear(b / 255)
  )
}

/** WCAG 2.1 contrast ratio, 1–21. Symmetric in its arguments. */
export function contrast(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Contrast between two OKLCH colours, both gamut-mapped first. */
export function contrastOklch(a: Oklch, b: Oklch): number {
  return contrast(toGamutRgb(a), toGamutRgb(b))
}

/* ----------------------------------------------------------------- parsing */

/** `#abc`, `#aabbcc`, `#aabbccff` → Rgb. Returns null on anything else. */
export function parseHex(input: string): Rgb | null {
  const hex = input.trim().replace(/^#/, "")

  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    }
  }
  if (/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    }
  }
  return null
}

export function toHex({ r, g, b }: Rgb): string {
  const p = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")
  return `#${p(r)}${p(g)}${p(b)}`.toUpperCase()
}

/**
 * Serialise for CSS. Rounded to the precision index.css already uses — four
 * decimals on L and C — so generated tokens diff cleanly against hand-written
 * ones instead of trailing seventeen digits of float noise.
 */
export function formatOklch({ l, c, h }: Oklch): string {
  const n = (v: number, dp: number) => parseFloat(v.toFixed(dp)).toString()
  return `oklch(${n(l, 4)} ${n(c, 4)} ${n(h, 2)})`
}
