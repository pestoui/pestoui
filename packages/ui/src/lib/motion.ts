/* The few motion tokens a JavaScript loop has to be able to read.
 *
 * Everything that animates in CSS takes its duration from a token, and the
 * reduced-motion preference collapses those tokens globally — which is exactly
 * why nothing in a component ever hand-types a duration. A requestAnimationFrame
 * loop can do neither: it cannot resolve a custom property, and it cannot be
 * collapsed by one. Where such a loop has to land in step with a CSS transition,
 * it reads the number from here.
 *
 * These are mirrors, not owners. `src/styles/motion.css` remains the source of
 * truth; a change there has to be made here in the same commit.
 */

/** Mirrors `--duration-spring-glide` — the arc/travel spring, ms. */
export const DURATION_SPRING_GLIDE = 364
