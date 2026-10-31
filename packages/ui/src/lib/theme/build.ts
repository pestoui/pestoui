/* Turning one brand colour into the token set, and getting it onto the page.
 *
 * The surprising part is how little has to be emitted, and that is down to
 * index.css:78. 107 declarations are written as `oklch(<L> <C> var(--brand-hue))`,
 * so re-pointing that one number retints every neutral — background,
 * foreground, card, paper, inverse, secondary, muted, accent, border, input
 * and the whole sidebar group — for free.
 *
 * That only works because of a rule the codebase already documents at
 * index.css:229-235: a custom property has its var() references substituted at
 * computed-value time on the element the declaration lands on. `--background`
 * is declared on :root, so it re-resolves only if --brand-hue changes on :root
 * too. This is why the .theme-* classes must restate 22 neutral tokens — they
 * land on a descendant and cannot reach back. Writing to :root has no such
 * problem, so this module targets documentElement.
 *
 * What does NOT follow, and is emitted explicitly:
 *   - --primary / --sidebar-primary — literal oklch, not hue-keyed (index.css:99, 147)
 *   - --selected — hue-keyed but at a fixed L/C the solver overrides
 *   - --surface* — literal hex in light mode (index.css:94-96), hue-keyed in dark
 *   - both foregrounds — they invert between modes, see derive.ts
 */

import { formatOklch, parseHex, rgbToOklch, toGamutRgb, type Oklch } from "./color"
import {
  deriveAccent,
  derivePrimary,
  isChromatic,
  neighboursFor,
  type AuditRow,
  type SolvedTone,
} from "./derive"

export interface ThemeTokens {
  brandHue: number
  light: Record<string, string>
  dark: Record<string, string>
  report: {
    lightAccent: SolvedTone
    darkAccent: SolvedTone
    lightPrimary: SolvedTone
    darkPrimary: SolvedTone
    /** Every pairing checked, both modes, in one list for the UI. */
    audit: AuditRow[]
    /** True when every pairing in every mode clears its WCAG threshold. */
    allPass: boolean
    /** False when the source colour had no usable hue. */
    chromatic: boolean
  }
}

/** Re-hue a fixed colour, keeping its lightness and chroma. */
const rehue = (hex: string, h: number): Oklch => {
  const rgb = parseHex(hex)
  if (!rgb) return { l: 0.97, c: 0.004, h }
  const lch = rgbToOklch(rgb)
  return { l: lch.l, c: lch.c, h }
}

/**
 * Build the complete token set from a single brand colour.
 *
 * Emits both modes in full. Partial emission is a bug: the generated sheet is
 * appended after index.css, and `:root` and `.dark` have equal specificity, so
 * a `:root` rule of ours beats index.css's `.dark` rule and leaks light values
 * into dark mode.
 */
export function buildTheme(brand: Oklch): ThemeTokens {
  /* Rounded once, here, so the hue in the emitted CSS, the hue the solver
     works from and the hue shown in the UI are the same number. */
  const h = Number(brand.h.toFixed(2))
  const hued: Oklch = { ...brand, h }
  const chromatic = isChromatic(brand)

  const lightN = neighboursFor(h, "light")
  const darkN = neighboursFor(h, "dark")

  const lightAccent = deriveAccent(hued, lightN)
  const darkAccent = deriveAccent(hued, darkN)
  const lightPrimary = derivePrimary(hued, lightN)
  const darkPrimary = derivePrimary(hued, darkN)

  const audit = [
    ...lightPrimary.audit,
    ...lightAccent.audit,
    ...darkPrimary.audit,
    ...darkAccent.audit,
  ]

  const light: Record<string, string> = {
    /* Omitted entirely for a greyscale source. At chroma ~0, hue is matrix
       residue — every pure grey reports 89.88°, and a different published
       matrix rounding gives a different angle. Emitting it would key 107
       neutral declarations to a number that means nothing. Leaving it out
       keeps the existing neutrals, which is the honest outcome. */
    ...(chromatic ? { "--brand-hue": String(h) } : {}),

    "--primary": formatOklch(lightPrimary.color),
    "--primary-foreground": formatOklch(lightPrimary.foreground),
    "--sidebar-primary": formatOklch(lightPrimary.color),
    "--sidebar-primary-foreground": formatOklch(lightPrimary.foreground),

    "--selected": formatOklch(lightAccent.color),
    "--selected-foreground": formatOklch(lightAccent.foreground),

    /* Literal hex in the source, so invisible to a hue change. */
    "--surface": formatOklch(rehue("#F9FAF7", h)),
    "--surface-card": formatOklch(rehue("#FEFFFC", h)),
    "--surface-card-border": formatOklch(rehue("#EFF0ED", h)),
  }

  const dark: Record<string, string> = {
    "--primary": formatOklch(darkPrimary.color),
    "--primary-foreground": formatOklch(darkPrimary.foreground),
    "--sidebar-primary": formatOklch(darkPrimary.color),
    "--sidebar-primary-foreground": formatOklch(darkPrimary.foreground),

    "--selected": formatOklch(darkAccent.color),
    "--selected-foreground": formatOklch(darkAccent.foreground),

    /* Restated because our :root block is appended after index.css and both
       are specificity (0,1,0) — a token emitted for light but omitted here
       wins in dark mode too. Any token added to `light` needs its counterpart
       here; assertModeParity below enforces it. */
    "--surface": formatOklch({ l: 0.205, c: 0.004, h }),
    "--surface-card": formatOklch({ l: 0.248, c: 0.005, h }),
    "--surface-card-border": "oklch(1 0 0 / 8%)",
  }

  /* `import.meta.env` is Vite's, not the language's: ImportMeta only gains
     `env` when vite/client is in `types`, and this package ships source, so it
     is typechecked under the consumer's config — Next, Remix, plain tsc. Left
     bare, it was the one error the package produced under `strict` with
     `types: []`, and it broke the ./theme entry point for all of them.

     So the cast states exactly what this line relies on and nothing more: `env`
     may be absent, and so may DEV. Two things it must not become:
       - a `declare global` widening ImportMeta — that leaks into the
         consumer's program and collides with vite/client's own `env`
       - `const meta = import.meta` and a read of `meta.env` — Vite finds
         `import.meta.env` by its literal text, so aliasing it would silently
         turn the parity check off in dev. The cast is erased by the TS
         transform before Vite looks, leaving `import.meta.env?.DEV` intact.
     Outside Vite, `env` is undefined and the check is skipped, as before. */
  if ((import.meta as ViteImportMeta).env?.DEV) assertModeParity(light, dark)

  return {
    brandHue: h,
    light,
    dark,
    report: {
      lightAccent,
      darkAccent,
      lightPrimary,
      darkPrimary,
      audit,
      allPass: audit.every((r) => r.passes),
      chromatic,
    },
  }
}

/**
 * Every token emitted for light must also be emitted for dark.
 *
 * Not a style preference — a cascade requirement, for the reason given above.
 * This exact omission shipped twice while this file was being written, once in
 * index.css itself, so it is asserted rather than left to a comment.
 */
const LIGHT_ONLY_BY_DESIGN = new Set([
  /* A hue angle, not a colour, and identical in both modes — .dark inherits
     it from :root rather than restating it. */
  "--brand-hue",
])

/** Only the slice of Vite's ImportMeta that the parity check reads. */
type ViteImportMeta = ImportMeta & { env?: { DEV?: boolean } }

function assertModeParity(
  light: Record<string, string>,
  dark: Record<string, string>,
): void {
  const missing = Object.keys(light).filter(
    (k) => !LIGHT_ONLY_BY_DESIGN.has(k) && !(k in dark),
  )
  if (missing.length) {
    console.error(
      `[theme] These tokens are emitted for light but not dark, so they will ` +
        `leak light values into dark mode: ${missing.join(", ")}`,
    )
  }
}

/* ------------------------------------------------------------------ runtime */

const STYLE_ID = "ds-logo-theme"

/** Serialise to a stylesheet. Also what an export button would hand the user. */
export function toCss(tokens: ThemeTokens): string {
  const block = (sel: string, vars: Record<string, string>) =>
    `${sel} {\n${Object.entries(vars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n")}\n}`

  return `${block(":root", tokens.light)}\n\n${block(".dark", tokens.dark)}\n`
}

/**
 * Apply to the live document.
 *
 * A <style> element rather than documentElement.style.setProperty, and that
 * choice is load-bearing: inline styles beat every class selector, so an
 * inline --selected would win in dark mode too and pin the light value there.
 * A stylesheet keeps :root and .dark as separate rules and lets the existing
 * dark-mode toggle keep working.
 */
export function applyTheme(tokens: ThemeTokens): void {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement("style")
    el.id = STYLE_ID
    document.head.appendChild(el)
  }
  el.textContent = toCss(tokens)
}

export function clearTheme(): void {
  document.getElementById(STYLE_ID)?.remove()
}

export function isThemeApplied(): boolean {
  return document.getElementById(STYLE_ID) !== null
}

/** Convenience: hex string straight to a built theme. */
export function buildThemeFromHex(hex: string): ThemeTokens | null {
  const rgb = parseHex(hex)
  if (!rgb) return null
  return buildTheme(rgbToOklch(rgb))
}

/** The swatch colour to show in the UI for a derived token. */
export function previewHex(color: Oklch): string {
  const { r, g, b } = toGamutRgb(color)
  return `rgb(${r} ${g} ${b})`
}
