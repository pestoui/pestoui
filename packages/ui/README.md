# @pestoui/core

A warm-neutral React design system for agent and dashboard products. Every
shadcn/ui primitive restyled to one coherent language, plus a full
application-UI set on top.

**69 primitives · 46 application components · Tailwind v4 · React 19 · Radix · TypeScript**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

---

## Status

This package is the source of truth for the components of Pesto UI, all 115 of
them, along with the tokens, the motion system and the theme engine. It is
**not published to npm**. Installation through a shadcn registry namespace
(`@pestoui`), alongside a small foundation package on npm, is planned for the
first public release.

Until then, use it from a clone of this repository as a workspace package, or
copy the source (see
[Copying rather than installing](#copying-rather-than-installing)). The notes
below describe the package as a dependency: how to import it, what its
stylesheet carries and what a consuming build has to do.

Peer dependencies: `react` 19, `react-dom` 19, `tailwindcss` 4.

## Use it

```tsx
import { Button, Card, CardContent, MetricCard } from "@pestoui/core"
import "@pestoui/core/styles.css" // once, at your app root

export function Panel() {
  return (
    <Card>
      <CardContent>
        <MetricCard label="Runs today" value={1204} />
        <Button size="lg">New agent</Button>
      </CardContent>
    </Card>
  )
}
```

Or reach for a single module, which is what you want if you care about what
lands in your bundle:

```tsx
import { Slider } from "@pestoui/core/ui/slider"
import { AgentCard } from "@pestoui/core/components/agent-card"
import { cn } from "@pestoui/core/lib/utils"
```

### Entry points

| Specifier                                                   | What it gives you                                       |
| ----------------------------------------------------------- | ------------------------------------------------------- |
| `@pestoui/core`                                   | everything — primitives, application components, `cn`   |
| `@pestoui/core/styles.css`                        | the stylesheet: tokens, base layer, fonts, motion       |
| `@pestoui/core/ui` · `/ui/<name>`                 | the restyled shadcn/ui primitives                       |
| `@pestoui/core/components` · `/components/<name>` | the application-UI components                           |
| `@pestoui/core/lib/<name>`                        | `utils` (`cn`, `typeScaleMergeConfig`), `arc`, `motion` |
| `@pestoui/core/hooks/<name>`                      | `use-mobile`                                            |
| `@pestoui/core/theme`                             | the theme engine — extract, derive, build               |

## The Tailwind step you cannot skip

This package **ships TypeScript source, not compiled output**. That is
deliberate: you get the real components, readable and steppable, and your
bundler tree-shakes them against your own config.

The consequence is that Tailwind has to scan them. Automatic content detection
never walks into `node_modules`, so `styles.css` names its own sources with
`@source` directives — which means importing it is enough:

```css
/* your app's stylesheet */
@import "@pestoui/core/styles.css";
```

`styles.css` imports Tailwind itself, so that one line is the whole entry. If
your stylesheet already has `@import "tailwindcss"` it still works, but
Tailwind's preflight is then included twice (harmless, and a production build
merges most of it), so you can drop your own import.

**`styles.css` is not optional.** It holds every token the components read —
colours, radii, the type scale, the tracking values — and an `@source` line on
its own loads none of them. Built without it, `text-body`, `text-caption` and
`tracking-title` emit no rule at all and text falls back to Tailwind's defaults.

Add the source yourself only if your build cannot use the package's own
`@source` directives — for example, a pipeline that moves or inlines the
stylesheet so their relative paths no longer reach the components. Even then,
keep importing `styles.css` for the tokens:

```css
@import "@pestoui/core/styles.css";
@source "../node_modules/@pestoui/core/src";
```

If Tailwind does not scan the components, they render with their markup intact
and almost none of their styling. The failure is quiet, which is why it is
called out here.

## The bundler step, if you are on Next.js

Vite and plain TypeScript handle this package as-is: types resolve through the
`exports` map, and the dev server compiles `.tsx` from `node_modules` without
being asked.

Next.js does not. It excludes `node_modules` from its loaders, so the raw
`.tsx` arrives at webpack unhandled and the build dies:

```
Unknown module type
./node_modules/@pestoui/core/src/index.ts
```

The message never names the fix and the link in it goes to a webpack-loaders
page that does not apply. The fix is one field:

```ts
// next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@pestoui/core"],
}

export default nextConfig
```

### And then the client boundary

The package declares its own. Every file that holds state, calls
`createContext`, creates an event handler, or imports a client-only module
starts with `"use client"`, so you can import `Switch`, `Sidebar` and
`SidebarProvider` straight into a Server Component. Verified against a real
Next.js 16 App Router build: a page with no directive of its own rendering all
three alongside `Button` builds and prerenders.

Purely presentational components — `Button`, `Badge`, `Card`, `Alert`,
`Skeleton` and most of the Radix wrappers — deliberately do **not** carry the
directive, so they stay server-rendered and add nothing to your client bundle.

Two things still belong to you:

- **Event handlers come from client code.** A Server Component cannot pass a
  function as a prop, so `<Button onClick={…}>` or `<Table onSort={…}>` needs
  to live in a file of yours that starts with `"use client"`. That is React's
  rule, not this package's.
- **A variant function is a client reference if its component is.** Every
  `*Variants` export (the `cva()` functions — `toggleVariants`, `tagVariants`,
  `progressCircleVariants` and so on) lives in the same file as its component,
  and `"use client"` applies to the whole file. So if the component is a client
  component, calling its variant function from server code throws
  `Attempted to call … from the server but … is on the client`. The test is
  the first line of the component's source: if it says `"use client"`, compute
  the class string in a client file of your own.
- **Function props come from client code too.** That includes the ones that are
  not event handlers — `ProgressCircle`'s `formatValue`, for example — because
  a component that animates its readout is a client component, and a Server
  Component cannot hand a function across that boundary.

`useId`, `useMemo` and `useCallback` are part of React's server build, so a
component using only those stays server-safe and is not marked.

## Strict TypeScript, honestly

Shipping source means shipping no `.d.ts`. There is no `types` field in
`package.json` and no declaration file anywhere in the package, because the
`exports` map points `tsc` at the `.ts` and `.tsx` files themselves.

The consequence is that **your compiler typechecks this library under your
flags.** `skipLibCheck` does not rescue you — it skips `.d.ts` files, and this
package has none. And because `tsc` follows every re-export in the root entry,
a single import from the package root pulls every component's source into your
program — over a hundred files for a consumer importing only `Button` — so
errors can appear in components you never used. A subpath import such as
`@pestoui/core/ui/button` pulls in only what that component depends
on: two files, for `Button`.

Two flags reliably produce them today: `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`. What you can do about it now:

- **Import from the deep entry points instead of the root.**
  `@pestoui/core/ui/switch` brings in that file and its imports rather
  than all 115 components. This narrows the surface a long way; it does not
  close it.
- **Build is unaffected either way.** Vite, esbuild, swc and Next.js strip
  types without checking them, so the app still builds and runs — it is
  `tsc --noEmit` that reports the errors.
- **Turn the two flags off for the project,** or run your typecheck without
  them, if neither of the above is acceptable.

The target is being clean under plain `strict`, not under every optional flag.
That is not a finished claim yet: the package's own typecheck does not enable
`strict` at all, and doing so is open hygiene work. A `.d.ts` build would solve
this properly and is the real fix; it is not here.

## Stylesheet size

The `@source` directives in `src/index.css` are unconditional, so Tailwind
scans all 115 shipped components plus `hooks/` and `lib/` on every build. The
emitted stylesheet is about **305 kB minified (≈42 kB gzipped) whether you import
three components or all of them.** It does not shrink with use. (Measured with a
Vite 8 production build of a page that imports only `styles.css`, against
Tailwind 4.3.3.)

Deleting the directives is not the fix, and it is worth knowing why before you
try it: measured the same way, the stylesheet drops to about 25 kB (≈5 kB
gzipped) and the components render unstyled. The scan is what makes the
utilities exist at all. Narrowing it to only the components an app imports
needs a build step the package does not have yet.

## Theming

Everything keys off CSS variables in `:root`, so retinting is a stylesheet
override rather than a fork:

```css
:root {
  --brand-hue: 210; /* every hue-keyed token follows this one number */
}
```

Four accent themes ship as classes — put `theme-blue`, `theme-orange`,
`theme-violet` or `theme-green` on any ancestor. Dark mode is the `dark` class,
the shadcn convention, so `next-themes` works unchanged.

`@pestoui/core/theme` exposes the engine behind that: `extractPalette`,
`deriveAccent` and `buildTheme` take a brand colour and solve for a tone set
that clears the contrast thresholds the system imposes, rather than assuming the
brand colour is usable as-is. Most brand colours are not; the header comment of
`src/lib/theme/derive.ts` explains why.

## The type scale and your own `cn`

`styles.css` adds eight size-only type utilities: `text-micro`, `text-caption-sm`,
`text-caption`, `text-body-sm`, `text-body`, `text-body-md`, `text-body-lg` and
`text-lead`. It also adds two tracking utilities, `tracking-snug` and
`tracking-title`. The package's own `cn` is registered for them. Three things
outside the package can still break them:

- **An unconfigured `cn` or `twMerge` in your app.** tailwind-merge doesn't know
  these names, so it reads `text-body` as a text _colour_. That breaks merges
  three ways:
  - A type-scale class written _before_ a text colour is dropped:
    `cn("text-body text-muted-foreground")` keeps only the colour.
  - A text colour written _before_ a type-scale class is dropped:
    `cn("text-red-500", "text-body")` keeps only `text-body`, so the text loses
    its colour.
  - A stock size written after a type-scale class doesn't override it:
    `cn("text-body", "text-sm")` keeps both, and `text-body` wins because the
    type-scale utilities come later in the stylesheet. Your override has no
    effect. `tracking-title` against `tracking-tight` behaves the same way.
    Which class wins is decided by stylesheet order, not by the order you
    wrote them. The eight sizes always beat the stock sizes, but among
    tracking utilities `tracking-tight` beats `tracking-snug` and
    `tracking-wide` beats `tracking-title`.

  Classes you pass _into_ this package's components are fine, because they are
  merged by the package's `cn`. The risk is your own merge calls, and the
  `*Variants` functions (`buttonVariants`, `toggleVariants`,
  `sidebarMenuButtonVariants` and so on): a `cva()` function joins its base and
  variant classes without merging them, so pass its result through a configured
  `cn` before you use it. `buttonVariants({ size: "sm" })` on its own carries
  both `text-body` and `text-sm` and renders 15px; through `cn` it renders
  14px, as `<Button size="sm">` does. A `className` passed _into_ a
  `*Variants()` call is appended the same way, without merging, so hand it to
  `cn` instead: `cn(kbdVariants(), "text-sm")`, not
  `kbdVariants({ className: "text-sm" })`. Either import `cn` from
  `@pestoui/core`, or register the same names in your merger:

  ```ts
  import { extendTailwindMerge } from "tailwind-merge"
  import { typeScaleMergeConfig } from "@pestoui/core/lib/utils"

  const twMerge = extendTailwindMerge(typeScaleMergeConfig)
  ```

  The object is frozen (and typed read-only), so mutating it throws a
  `TypeError`. To add sizes of your own, build a new config from copies of its
  lists:

  ```ts
  const twMerge = extendTailwindMerge({
    extend: {
      theme: {
        text: [...typeScaleMergeConfig.extend.theme.text, "brand"],
        tracking: [...typeScaleMergeConfig.extend.theme.tracking],
      },
    },
  })
  ```

  This needs **tailwind-merge 3.x**, the major version this package depends
  on. The config uses v3's `text` and `tracking` theme keys; tailwind-merge
  2.x has neither, so there the registration does nothing (or fails to
  typecheck).

- **A colour token with the same name as a type token.** If your stylesheet
  defines `--color-body`, `--color-caption` or `--color-lead` (or any
  `--color-<name>` matching one of the eight sizes), Tailwind compiles
  `text-<name>` as that colour and the font size disappears. Pick a different
  name for the colour.

- **Your own `@theme` can re-value these.** The sizes are ordinary theme
  variables, so the consumer's theme and the package's share one namespace.
  `--text-*: initial` placed after this stylesheet removes every font size,
  including the stock ones the package's components use: no rule is emitted for
  `text-body` or `text-sm` alike, and that text falls back to the inherited size
  (`Button size="sm"` uses `text-sm`, for one). Declaring `--text-body` (or any
  of the eight names) changes the package's components too, and so does a
  `--text-<name>--line-height` companion for one of them, which adds a
  line-height to every place the package uses that size.

  So **don't reset or re-value a theme size the package uses.** That is the
  eight type-scale names and the stock `text-xs` through `text-5xl`, which the
  components also use. Add your own sizes under new names instead
  (`--text-brand: 1.25rem` gives you `text-brand` and touches nothing else).

## Copying rather than installing

The components are also meant to be _owned_. `components.json` is a shadcn
config, and the source under `src/components/` is deliberately free of
documentation and demo scaffolding so a file survives being pasted into your
project. Internal imports are relative (`../../lib/utils`), so a copied file
needs its `cn` import repointed at wherever your own `cn` lives. `OrbAvatar` also
reads its colours from `src/styles/orb.css`, so take that file with it.

## Why the shadcn stylesheet is copied in

`src/styles/shadcn.css` is a verbatim copy of the stylesheet the `shadcn`
package ships: 16 kB of `@theme` keyframes and `@custom-variant` rules. It used
to be imported from that package, which made `shadcn` — a CLI — a runtime
dependency, and so put the CLI's whole server stack into every consumer's
install. The copy keeps the styles and drops the dependency. The repository's
`check:shadcn-css` gate fails when a shadcn update changes the upstream file, so
a new copy is always taken on purpose.

## Browser support

**The last two versions of Chrome, Edge, Firefox and Safari.** There is no
`browserslist` field and no `.browserslistrc` in this repository; that policy is
a statement of intent, not something a tool enforces.

There is no polyfill story, and two specifics are worth naming:

- **Colour is `oklch()` with no sRGB fallback.** Almost every colour custom
  property in `src/index.css` is `oklch()` — the exceptions are the three
  `--surface*` tokens and the `--code-*` syntax tokens — and the stylesheet
  contains no
  `@supports` block and no `color-gamut` query. A browser without `oklch()`
  support gets no colour, not a degraded one.
- **`textarea` uses `field-sizing-content`** (`src/components/ui/textarea.tsx`,
  the only use in the package). Where it is unsupported the textarea degrades to
  its `min-h-28` fixed height instead of growing with its content. That is a
  cosmetic loss, not a broken control.

## Documentation

Component pages with live previews and props tables live on the docs site,
[pestoui.com](https://pestoui.com).

## Contributing

See [CONTRIBUTING.md](https://github.com/pestoui/pestoui/blob/main/CONTRIBUTING.md).

## Licence

[MIT](./LICENSE) © Fahim Anando. Derived in part from
[shadcn/ui](https://ui.shadcn.com), also MIT — see [NOTICE.md](./NOTICE.md) for
the attribution.
