/* Pulling a brand colour out of an uploaded logo.
 *
 * The naive version of this — "take the most common colour" — fails on almost
 * every real logo, because almost every real logo is mostly background. A PNG
 * of a wordmark on white is 90% white, 8% black type and 2% brand. Frequency
 * alone returns white every time.
 *
 * So this does two things instead: it throws away the pixels that can never be
 * a brand colour (transparent, near-white, near-black, near-grey), and it then
 * ranks what remains by population *weighted by chroma*, so a small block of
 * saturated colour outranks a large field of nearly-neutral pixels.
 */

import { oklchToRgb, rgbToOklch, toHex, type Oklch, type Rgb } from "./color"

export interface Swatch {
  rgb: Rgb
  oklch: Oklch
  hex: string
  /** Share of surviving (non-rejected) pixels, 0–1. */
  share: number
}

export interface ExtractOptions {
  /** Longest edge the image is downscaled to before sampling. */
  sampleSize?: number
  /** Below this alpha a pixel is ignored entirely. */
  minAlpha?: number
  /** Below this chroma a pixel counts as grey and is rejected. */
  minChroma?: number
  /** Outside this lightness band a pixel is too pale or too dark to be brand. */
  minLightness?: number
  maxLightness?: number
  /** How many swatches to return. */
  count?: number
}

const DEFAULTS: Required<ExtractOptions> = {
  sampleSize: 160,
  minAlpha: 128,
  /* 0.04 is deliberately low. Muted corporate palettes — navy, forest, maroon —
     sit around 0.05–0.08, and a stricter cut-off silently rejects exactly the
     brands most likely to be uploaded by the kind of company that has a brand
     guideline in the first place. */
  minChroma: 0.04,
  minLightness: 0.12,
  maxLightness: 0.97,
  count: 6,
}

/**
 * Draw an image into an offscreen canvas and read its pixels.
 *
 * Downscaled first: a 2000px logo is four million pixels to walk for an answer
 * that does not change past a few thousand samples.
 */
export function imageToPixels(
  image: HTMLImageElement | ImageBitmap,
  sampleSize: number,
): ImageData | null {
  const w = image.width
  const h = image.height
  if (!w || !h) return null

  const scale = Math.min(1, sampleSize / Math.max(w, h))
  const tw = Math.max(1, Math.round(w * scale))
  const th = Math.max(1, Math.round(h * scale))

  const canvas = document.createElement("canvas")
  canvas.width = tw
  canvas.height = th

  /* willReadFrequently keeps Chromium from promoting this to a GPU-backed
     surface, which would make the getImageData round-trip far slower than the
     drawing it is meant to support. */
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null

  ctx.drawImage(image as CanvasImageSource, 0, 0, tw, th)
  try {
    return ctx.getImageData(0, 0, tw, th)
  } catch {
    /* Tainted canvas — a cross-origin image without CORS headers. Uploads go
       through a blob: URL so this should not fire, but a caller passing a
       remote <img> would land here and deserves null rather than a throw. */
    return null
  }
}

/**
 * Quantise, reject, rank.
 *
 * Bucketing is by hue (12° bins) crossed with coarse lightness and chroma
 * bands. Hue-first because hue is what the theme is actually keyed to — two
 * tones of the same brand green should reinforce each other, not compete.
 */
export function extractSwatches(
  data: ImageData,
  options: ExtractOptions = {},
): Swatch[] {
  const o = { ...DEFAULTS, ...options }
  const px = data.data

  interface Bucket {
    n: number
    l: number
    c: number
    /* Hue is circular, so it cannot be averaged arithmetically — 359° and 1°
       would average to 180°, the exact opposite hue. Accumulate the unit
       vector and take its angle at the end. */
    sin: number
    cos: number
  }

  const buckets = new Map<string, Bucket>()
  let kept = 0

  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3]
    if (a < o.minAlpha) continue

    const rgb: Rgb = { r: px[i], g: px[i + 1], b: px[i + 2] }
    const lch = rgbToOklch(rgb)

    if (lch.c < o.minChroma) continue
    if (lch.l < o.minLightness || lch.l > o.maxLightness) continue

    kept++

    const key = `${Math.round(lch.h / 12)}:${Math.round(lch.l * 8)}:${Math.round(lch.c * 16)}`
    const b = buckets.get(key)
    const rad = (lch.h * Math.PI) / 180
    if (b) {
      b.n++
      b.l += lch.l
      b.c += lch.c
      b.sin += Math.sin(rad)
      b.cos += Math.cos(rad)
    } else {
      buckets.set(key, { n: 1, l: lch.l, c: lch.c, sin: Math.sin(rad), cos: Math.cos(rad) })
    }
  }

  if (!kept) return []

  const swatches = [...buckets.values()].map((b) => {
    let h = (Math.atan2(b.sin / b.n, b.cos / b.n) * 180) / Math.PI
    if (h < 0) h += 360

    const oklch: Oklch = { l: b.l / b.n, c: b.c / b.n, h }
    const rgb = oklchToRgb(oklch)

    return { rgb, oklch, hex: toHex(rgb), share: b.n / kept }
  })

  /* The ranking. Chroma is raised to a power so it dominates share without
     erasing it — a 3% block of vivid brand red should beat a 40% wash of
     desaturated beige, but a single stray pixel should not beat everything. */
  return swatches
    .sort((x, y) => score(y) - score(x))
    .slice(0, o.count)
}

function score(s: Swatch): number {
  return Math.pow(s.oklch.c, 1.5) * Math.pow(s.share, 0.5)
}

/**
 * Full pipeline: a File from an <input type="file"> to ranked swatches.
 *
 * Resolves to an empty array when the image has no brand-like pixels at all —
 * a pure greyscale logo, for instance. The caller should treat that as "ask
 * the user to pick a colour", not as an error.
 */
export async function extractPalette(
  file: File,
  options: ExtractOptions = {},
): Promise<Swatch[]> {
  const url = URL.createObjectURL(file)
  try {
    const image = await loadImage(url)
    const data = imageToPixels(image, options.sampleSize ?? DEFAULTS.sampleSize)
    if (!data) return []
    return extractSwatches(data, options)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Could not decode that image."))
    img.src = src
  })
}
