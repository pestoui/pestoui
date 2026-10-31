import { cn } from "../../lib/utils"

/* The skeleton → content crossfade, as a component.

   The mechanism is CSS: a container carrying `data-reveal="loading" | "ready"`
   and two children carrying `reveal-skeleton` / `reveal-content`, all three
   declared in `styles/motion.css`. That is deliberately the whole contract, so
   a component which already renders its own placeholders — `Table` with
   `TableSkeletonRows`, `Sidebar` with `SidebarMenuSkeleton` — opts in by
   setting one attribute and adding two class names. It does not have to adopt
   a wrapper, and this wrapper is a convenience for the common case rather than
   the mechanism itself.

   What the wrapper buys over hand-writing those three class names:

   - `inert` on the hidden layer. This is the part that is easy to get wrong.
     Opacity does not stop hit-testing and does not remove anything from the
     accessibility tree, so a naive crossfade leaves an invisible placeholder
     catching clicks, or — worse — leaves the real content focusable and
     screen-reader-visible underneath the skeleton for the whole load. Here the
     hidden layer is unreachable in both directions: `inert` while loading (it
     drops the subtree from the a11y tree and from the tab order), and
     `pointer-events: none` from `reveal-skeleton` once ready.
   - `aria-busy`, paired with `aria-hidden` on the placeholder, so the
     placeholder is not read as a wall of empty boxes. `aria-busy` alone is not
     enough: on a bare `div` the implicit role is generic, which NVDA and JAWS
     do not expose a busy state for, so the load would otherwise finish in
     silence.
   - A separate visually-hidden live region that carries a short label once the
     content lands. It is separate for three reasons, each of which broke a
     first attempt that put `role="status"` on the content layer itself:
     the content layer is `inert` while loading, so it is not in the
     accessibility tree and no live region is ever registered — and a region
     that appears already populated does not announce, because announcement is
     driven by mutations *after* registration; `role="status"` implies
     `aria-atomic="true"`, so a revealed table would be read out entire; and the
     role would persist, re-announcing the whole subtree on every later change
     to a sorted column, a ticking number or a controlled input.

   Both layers sit in the same grid cell, so they stack *and* stay in flow: the
   box is as tall as the taller of the two. The real content is rendered from
   the first frame — laid out, just not yet visible — which means the container
   already has its finished height while the skeleton is up and nothing reflows
   at the moment data lands. See the long note above `reveal-stack` in
   `styles/motion.css` for why absolute positioning cannot do this.

   The corollary: the skeleton stays mounted after the reveal, and a skeleton
   *taller* than its content would hold the box open at that height. Size a
   placeholder to the content it stands in for — which is what makes it stop
   the layout jumping in the first place.

   Reduced motion needs nothing here. `--reveal-blur` and `--reveal-rise` drop
   to `0px` and `--duration-slower` to `1ms` under `prefers-reduced-motion`, so
   the crossfade becomes an instant swap without this file knowing about it. */

interface RevealProps extends React.ComponentProps<"div"> {
  /** While `true`, the placeholder is shown and the content is inert. */
  loading: boolean
  /** The placeholder. Rendered once, by the consumer — the reveal never tries
   *  to derive a skeleton from the content, because the shape of a placeholder
   *  is not the shape of the thing it replaces. */
  skeleton: React.ReactNode
  /** Announced politely, once, when the content arrives. Name the thing that
   *  landed — "Results loaded" beats the default. */
  loadedLabel?: string
}

function Reveal({
  loading,
  skeleton,
  loadedLabel = "Content loaded",
  className,
  children,
  ...props
}: RevealProps) {
  return (
    <div
      data-slot="reveal"
      data-reveal={loading ? "loading" : "ready"}
      aria-busy={loading || undefined}
      className={cn("reveal-stack", className)}
      {...props}
    >
      <div data-slot="reveal-skeleton" aria-hidden="true" className="reveal-skeleton">
        {skeleton}
      </div>
      <div data-slot="reveal-content" inert={loading} className="reveal-content">
        {children}
      </div>
      {/* Outside the inert subtree, and empty until the content lands, so the
          mutation that fills it is what triggers the announcement. */}
      <span role="status" className="sr-only">
        {loading ? "" : loadedLabel}
      </span>
    </div>
  )
}

export { Reveal }
export type { RevealProps }
