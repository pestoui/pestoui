/* Explicit named re-exports — never `export *`, which defeats Rollup's
   side-effect analysis (CONTRIBUTING.md, The client boundary). */

export {
  contrast,
  contrastOklch,
  formatOklch,
  inGamut,
  maxChroma,
  oklchToRgb,
  parseHex,
  relativeLuminance,
  rgbToOklch,
  toGamutRgb,
  toHex,
  type Oklch,
  type Rgb,
} from "./color"

export {
  extractPalette,
  extractSwatches,
  imageToPixels,
  type ExtractOptions,
  type Swatch,
} from "./extract"

export {
  BODY_TEXT,
  MIN_BRAND_CHROMA,
  NON_TEXT,
  auditAccent,
  deriveAccent,
  derivePrimary,
  isChromatic,
  neighboursFor,
  type AuditRow,
  type Mode,
  type Neighbours,
  type SolvedTone,
} from "./derive"

export {
  applyTheme,
  buildTheme,
  buildThemeFromHex,
  clearTheme,
  isThemeApplied,
  previewHex,
  toCss,
  type ThemeTokens,
} from "./build"
