/* Ring geometry shared by the two circular components.
 *
 * `ProgressCircle` and `ActivityGauge` deliberately stay separate — different
 * ARIA contracts, different jobs — but they were each carrying their own copy
 * of the same clamp and the same circumference. They should share the maths,
 * not the identity, so the maths lives here.
 *
 * Every arc in the system is drawn the same way: one `<circle>` whose dash
 * array is its whole circumference, offset backwards to expose the fraction
 * that should paint. Nothing about the geometry changes as a value moves —
 * only that one scalar offset does, which is why a single property transition
 * is enough to animate a ring.
 */

/** Clamps a 0–100 reading. A non-finite input reads as empty, never as NaN. */
export function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

/** Path length of a circle, in SVG user units. */
export function circumferenceOf(radius: number) {
  return 2 * Math.PI * Math.max(radius, 0)
}

/**
 * Dash offset that paints `percent` of the path, measured from the path start.
 * `circumference` paints nothing; `0` paints the closed ring.
 */
export function arcOffset(circumference: number, percent: number) {
  return circumference * (1 - clampPercent(percent) / 100)
}
