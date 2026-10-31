/* ChartStyle (chart.tsx) writes one CSS custom property per series into a
   <style> element, and React does not escape what goes into one. So every value
   that reaches that stylesheet is checked here first. Ids and series keys must
   be plain identifiers. A colour must be a var(--token) reference, a hex value,
   or an rgb, hsl or oklch-family function of numbers. Anything else is dropped,
   never escaped: a rejected colour behaves exactly like a series with no colour,
   and nothing a caller supplies can end the element early with `</style>`.

   A .ts file on purpose: the barrels and the ./ui/* export map collect .tsx
   files only, so this stays private to the package, and node --test can load it
   without a JSX transform (packages/ui/test/chart-style.test.ts). */

type SeriesColors = Record<string, { color?: string; theme?: Record<string, string> }>

const IDENT = /^[A-Za-z0-9_-]+$/

const COLOR_FORMS = [
  /^var\(--[A-Za-z0-9_-]+\)$/,
  /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
  /^(?:rgba?|hsla?|oklch|oklab|lch|lab)\((?:[0-9.,%\s/+-]|deg|turn|rad|grad|none)*\)$/,
]

export function isChartColor(value: string) {
  return COLOR_FORMS.some((form) => form.test(value))
}

/* The id ChartContainer takes from useId when the caller passes none. React has
   changed that id's shape between versions (":r1:", "«r1»", "_r_1_"), and any
   character outside the identifier set would fail the check below and silently
   drop every colour, so only identifier characters are kept. */
export function chartIdFrom(reactId: string) {
  return reactId.replace(/[^A-Za-z0-9_-]/g, "")
}

/* The stylesheet ChartStyle renders, or null when there is nothing safe to
   write. For valid input the text is exactly what the upstream shadcn component
   produces, so a chart's appearance does not change. */
export function chartStyleCss(
  id: string,
  config: SeriesColors,
  themes: Record<string, string>,
): string | null {
  if (!IDENT.test(id)) return null

  const series = Object.entries(config).filter(([, item]) => item.theme ?? item.color)
  if (!series.length) return null

  return Object.entries(themes)
    .map(
      ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${series
  .map(([key, item]) => {
    const color = item.theme?.[theme] ?? item.color
    return color && IDENT.test(key) && isChartColor(color)
      ? `  --color-${key}: ${color};`
      : null
  })
  .join("\n")}
}
`,
    )
    .join("\n")
}
