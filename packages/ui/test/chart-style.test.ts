/**
 * The chart style guard: what ChartStyle may write into its <style> element.
 *   node --test packages/ui/test/chart-style.test.ts
 *
 * The values in a chart config come from the caller, and a <style> element's
 * text is not escaped by React. These tests hold the guard to two promises:
 * valid colours render exactly as before, and nothing a caller supplies can
 * leave the declaration or end the element.
 */
import { test } from "node:test"
import assert from "node:assert/strict"

import {
  chartIdFrom,
  chartStyleCss,
  isChartColor,
} from "../src/components/ui/chart-style.ts"

const THEMES = { light: "", dark: ".dark" }

test("token references, hex values and numeric colour functions pass", () => {
  for (const colour of [
    "var(--chart-1)",
    "var(--muted-foreground)",
    "#0a0",
    "#00aa0080",
    "rgb(0 170 0)",
    "rgba(0, 170, 0, 0.5)",
    "hsl(120deg 100% 33%)",
    "oklch(0.6 0.2 140 / 50%)",
  ]) {
    assert.ok(isChartColor(colour), colour)
  }
})

test("anything that could leave the declaration or the element is rejected", () => {
  for (const colour of [
    "red;} body { display: none",
    "</style><script>alert(1)</script>",
    "var(--chart-1);}",
    "var(--chart-1)</style>",
    "url(https://example.com/x)",
    "expression(alert(1))",
    "rgb(0 0 0) </style>",
    "rgb(0 0 0);background:red",
  ]) {
    assert.equal(isChartColor(colour), false, colour)
  }
})

test("a hostile colour, key or id never reaches the stylesheet", () => {
  const css =
    chartStyleCss(
      "chart-r1",
      {
        safe: { color: "var(--chart-1)" },
        badColour: { color: "</style><script>alert(1)</script>" },
        "bad}</style>key": { color: "#fff" },
      },
      THEMES,
    ) ?? ""
  assert.ok(css.includes("--color-safe: var(--chart-1);"))
  assert.ok(!css.includes("</style>"))
  assert.ok(!css.includes("script"))
  assert.ok(!css.includes("bad}"))
  assert.equal(chartStyleCss("x] {} </style>", { a: { color: "#fff" } }, THEMES), null)
})

test("an id from useId passes in every shape React has given it", () => {
  for (const reactId of [":r1:", "«r1»", "_r_1_"]) {
    const css = chartStyleCss(
      `chart-${chartIdFrom(reactId)}`,
      { a: { color: "var(--chart-1)" } },
      THEMES,
    )
    assert.ok(css?.includes("--color-a: var(--chart-1);"), reactId)
  }
  assert.equal(chartIdFrom("_r_1_"), "_r_1_")
})

test("valid input renders exactly as the upstream component did", () => {
  const css = chartStyleCss(
    "chart-r1",
    {
      a: { color: "var(--chart-1)" },
      b: { theme: { light: "#fff", dark: "#000" } },
      c: {},
    },
    THEMES,
  )
  assert.equal(
    css,
    "\n [data-chart=chart-r1] {\n  --color-a: var(--chart-1);\n  --color-b: #fff;\n}\n" +
      "\n" +
      "\n.dark [data-chart=chart-r1] {\n  --color-a: var(--chart-1);\n  --color-b: #000;\n}\n",
  )
  assert.equal(chartStyleCss("chart-r1", { a: {} }, THEMES), null)
})
