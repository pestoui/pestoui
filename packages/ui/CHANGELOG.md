# Changelog

All notable changes to `@pestoui/core` are recorded here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `RatingBadge` and `AnimatedNumber` take a `locale` for their digit grouping.
  Unset, both format in the browser's locale, which can differ from the
  server's; set it on a server-rendered page so hydration matches.

- Nine components, each lifted out of a dashboard layout where it had been a
  private helper, and each with a docs page: `GoalMeter` (a count heading for a
  fixed goal, with a ticked remainder and a percent flag), `QuotaTile` (an
  allowance with its usage meter and a status badge), `DateTile` (a month and
  day in a tinted square), `LegendList` (a chart key that carries formatted
  figures), `DescriptionList` (term and value pairs as a real `<dl>`),
  `TrendPill` (a signed change with its arrow), `GradientMark` (a gradient
  disc or square that can hold a glyph), `ChartAxisTick` and
  `ChartReferenceLabel` (a recharts axis tick and reference-line label drawn
  from the tokens). None needs `"use client"`.

- `npm run check:names` — a build gate, wired into CI ahead of lint, that fails
  if a commit is authored or committed under any identity but the project's
  own, or if a tracked file or commit message matches the private blocklist
  that CI supplies.

- The repository is an npm workspaces monorepo. `@pestoui/core` is a package in its
  own right, with an `exports` map covering the whole surface and no dependency
  on anything above it.
- `MIT LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue
  and pull request templates, and a CI workflow running lint, typecheck and
  entry-point resolution.
- `NOTICE.md` ships in the package (`files`), so the README's link to the
  shadcn/ui attribution resolves in an installed copy. `npm run check:notices`
  fails CI if it drifts from the repository's root copy.
- Repository gates, all run in CI: `npm run tokens:check` (a ratchet over raw
  design values; its allowlist may only shrink), `npm run test:merge` (replays
  the repo's class strings through `cn` to prove each type-scale name merges as
  the arbitrary class it replaced) and `npm run check:barrel` (the barrels
  match their sources).
- `scripts/check-exports.mjs` — resolves every advertised entry point through
  Node's own resolver, and every specifier the repo imports back through the
  maps. Nothing else type-checks an `exports` map on a package that ships
  source.
- `@source` directives in `src/index.css` so Tailwind sees the package's own
  files. Without them a consuming build silently drops most of the stylesheet.
- The Tier-1 type scale in `styles.css`: eight size-only utilities, `text-micro`
  (11px), `text-caption-sm` (12px), `text-caption` (13px), `text-body-sm`
  (14px), `text-body` (15px), `text-body-md` (16px), `text-body-lg` (17px) and
  `text-lead` (18px). They set `font-size` only, never a line-height. Two
  tracking utilities, `tracking-snug` (-0.01em) and `tracking-title` (-0.02em).
  The stock `text-xs` … `text-9xl` and `tracking-*` utilities are unchanged.
- `typeScaleMergeConfig`, exported from `./lib/utils` (not from the root entry):
  the `{ extend }` config that registers those names with tailwind-merge 3.x,
  for consumers who run their own `cn` or `twMerge`. It is deep-frozen and typed
  read-only, so mutating it throws a `TypeError`; copy its lists (spread them, or
  `structuredClone` the object) to extend them.

### Changed

- **Imports inside the package are relative.** The `@/` alias is gone. It only
  ever resolved for whoever configured it, and a consumer installing from npm
  never does — the package was unusable outside this repository.
- `cn` is built with `extendTailwindMerge(typeScaleMergeConfig)`, so a type-scale
  token merges exactly as the arbitrary size class it replaces. Its signature
  is unchanged, and for input containing none of the ten names it returns what
  a plain `twMerge` returns.
- Components use the type-scale and tracking utilities in place of arbitrary
  `text-[…]` and `tracking-[…]` values. Rendered output is identical: a
  computed-style, bounding-box and pixel comparison of every docs route, in
  both themes at two viewport widths, found no difference.
- `badgeVariants()` and `kbdVariants()` now carry the font size in their
  variants rather than in the base, so their raw (unmerged) output has exactly
  one size class for every variant and size, `null` included, and no longer
  depends on stylesheet order. `badgeVariants({ variant: "count" })` used
  without `cn` now resolves to 11px, as `<Badge variant="count">` always did; it
  used to resolve to 13px. This one change is intentional.
  A `null` variant or size resolves as before, raw, through `cn` and rendered:
  `badgeVariants({ variant: null })` and `<Badge variant={null}>` at 13px,
  `kbdVariants({ size: null })` and `<Kbd size={null}>` at 12px. A compound
  variant inside each `cva` supplies that one size class, since cva emits no
  variant class for `null`.
- The `body` rule reads its letter-spacing from `--tracking-body` (-0.011em, in
  `:root`, with no utility) instead of a literal.
- In the emitted stylesheet the eight type-scale utilities come after every
  stock size utility, so when a type-scale class and a stock size both reach an
  element unmerged, the type-scale class wins.
- New consumer hazards, all described in the README section "The type scale and
  your own `cn`":
  - An unconfigured `cn`/`twMerge` reads the new names as text colours. It
    drops a type-scale class written before a text colour, drops a text colour
    written before a type-scale class (`cn("text-red-500", "text-body")` loses
    the red), and keeps both classes when a stock size follows a type-scale
    class, where the type-scale class wins and the override does nothing.
  - The exported `*Variants` functions join classes without merging them, so
    their raw output can hold two sizes and resolve by stylesheet order:
    `buttonVariants({ size: "sm" })` carries `text-body` and `text-sm` and
    renders 15px, where `<Button size="sm">` renders 14px. Pass the result
    through a configured `cn`.
  - A `className` passed into a `*Variants()` call is appended the same way,
    without merging. Pass it to `cn` alongside the result instead.
  - A `--color-<name>` that matches a size name turns that utility into a
    colour.
  - A consumer `@theme` with `--text-*: initial` removes every font size,
    including the stock ones the components use; a same-name `--text-*` or a
    `--text-<name>--line-height` companion re-values the package's components.
    New sizes belong under new names.

- `Drawer` defaults `autoFocus` to `true`. The underlying primitive defaults
  it to `false`, which left focus on the trigger behind the open drawer and
  let Tab walk out into the page. Pass `autoFocus={false}` for the old
  behaviour.
- `ScrollArea`'s viewport is a tab stop (`tabIndex={0}`), so a scroll area
  holding only text can be scrolled from the keyboard in every browser. Its
  focus ring was already there.
- `ContextMenuContent` is capped at the width the viewport has left
  (`max-w-(--radix-context-menu-content-available-width)`). On a phone a wide
  menu opened from the middle of its target used to run past the screen edge.

### Fixed

- `Calendar` formatted its month dropdown and its days' `data-day` in the
  browser's locale while DayPicker drew the caption in English, so a
  server-rendered calendar could fail to hydrate. Both now follow the `locale`
  prop, English when it is unset.

- `Progress` with `segments` never painted its fill. The fill is a `<span>`,
  and `size-full` does nothing to an inline box; it is now block-level. The
  continuous bar is unchanged.

### Removed

- `@fontsource-variable/inter`, which nothing imported.
- `shadcn` from `dependencies`. It was there only so `index.css` could import
  one stylesheet, and it brought the whole shadcn command-line tool and its
  dependency tree into every install. That stylesheet is now copied into the
  package at `src/styles/shadcn.css` and credited in `NOTICE.md`, and
  `npm run check:shadcn-css` fails CI when a shadcn update changes the upstream
  copy.

### Security

- `ChartStyle` checks every value before writing it into its `<style>`
  element, so chart config built from untrusted data can no longer inject CSS,
  or markup when the page is server-rendered. Chart ids and series keys must
  use only `A-Z a-z 0-9 _ -`. A colour must be a `var(--token)` reference, a
  hex value, or an `rgb()`, `hsl()`, `lab()`, `lch()`, `oklab()` or `oklch()`
  function of plain numbers. Anything else is left out rather than written: a
  named colour such as `red`, or a nested form such as `hsl(var(--chart-1))`,
  now renders as a series with no colour. Accepted values produce the same CSS
  as before.
- The sidebar's open-state cookie is set with `SameSite=Lax`, and with
  `Secure` on an https page.
