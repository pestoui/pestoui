/* tailwind-merge registration for the Tier-1 type scale.

   Run: npm run test:merge   (node --test; Node strips the types itself)

   What this proves: registering the type-scale names makes cn() treat a token
   exactly as it already treats the arbitrary class the token replaces. The
   zero-change baseline is the arbitrary class (text-[0.9375rem] is classified
   as a font size by tailwind-merge's own arbitrary-length validator), not an
   unregistered token, so the core assertion is
       cn(token form) === rename(cn(arbitrary form)).
   cn() only EXTENDS tailwind-merge's default config, so for input that holds no
   token name it returns what a bare twMerge returns. This file does not import
   tailwind-merge itself — tokens:check allows that import only in lib/utils.ts.

   The merge function is reached as `merge`, not `cn`, on purpose: the Prettier
   Tailwind plugin sorts class strings inside cn() calls, and tailwind-merge is
   order-sensitive, so a format pass would silently rewrite these cases.

   This file lives outside src/ so it is neither published (package.json
   "files") nor scanned by Tailwind (@source in src/index.css). */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { describe, test } from "node:test"
import { fileURLToPath } from "node:url"

import { cn, typeScaleMergeConfig } from "../src/lib/utils.ts"

const merge = cn

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, "../../..")

/* token name -> the arbitrary class it replaces, value for value */
const SIZES: Record<string, string> = {
  "text-micro": "text-[0.6875rem]",
  "text-caption-sm": "text-[0.75rem]",
  "text-caption": "text-[0.8125rem]",
  "text-body-sm": "text-[0.875rem]",
  "text-body": "text-[0.9375rem]",
  "text-body-md": "text-[1rem]",
  "text-body-lg": "text-[1.0625rem]",
  "text-lead": "text-[1.125rem]",
}
const TRACKING: Record<string, string> = {
  "tracking-snug": "tracking-[-0.01em]",
  "tracking-title": "tracking-[-0.02em]",
}
const TO_ARBITRARY = new Map(Object.entries({ ...SIZES, ...TRACKING }))
const TO_TOKEN = new Map([...TO_ARBITRARY].map(([t, a]) => [a, t]))

/* Rewrite one class token's utility, keeping variants, important (either
   side) and a /modifier, e.g. md:hover:!text-[0.9375rem]/6 -> md:hover:!text-body/6. */
function renameClass(cls: string, table: Map<string, string>): string {
  let depth = 0
  let cut = 0
  for (let i = 0; i < cls.length; i++) {
    const ch = cls[i]
    if (ch === "[" || ch === "(") depth++
    else if (ch === "]" || ch === ")") depth--
    else if (ch === ":" && depth === 0) cut = i + 1
  }
  const variants = cls.slice(0, cut)
  let rest = cls.slice(cut)
  let pre = ""
  let post = ""
  if (rest.startsWith("!")) [pre, rest] = ["!", rest.slice(1)]
  if (rest.endsWith("!")) [post, rest] = ["!", rest.slice(0, -1)]
  let mod = ""
  depth = 0
  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i]
    if (ch === "[" || ch === "(") depth++
    else if (ch === "]" || ch === ")") depth--
    else if (ch === "/" && depth === 0) {
      mod = rest.slice(i)
      rest = rest.slice(0, i)
      break
    }
  }
  const mapped = table.get(rest)
  return mapped ? `${variants}${pre}${mapped}${mod}${post}` : cls
}
const rename = (s: string, table: Map<string, string>) =>
  s
    .split(/\s+/)
    .filter(Boolean)
    .map((c) => renameClass(c, table))
    .join(" ")
const toToken = (s: string) => rename(s, TO_TOKEN)
const toArbitrary = (s: string) => rename(s, TO_ARBITRARY)

/* The parity property, for any number of cn() arguments. */
function assertParity(args: string[]) {
  const viaArbitrary = toToken(merge(...args.map(toArbitrary)))
  const viaToken = merge(...args.map(toToken))
  assert.equal(viaToken, viaArbitrary, `cn(${JSON.stringify(args)})`)
}

describe("typeScaleMergeConfig", () => {
  test("registers exactly the eight sizes and two trackings", () => {
    assert.deepEqual(typeScaleMergeConfig, {
      extend: {
        theme: {
          text: Object.keys(SIZES).map((k) => k.slice("text-".length)),
          tracking: Object.keys(TRACKING).map((k) => k.slice("tracking-".length)),
        },
      },
    })
  })

  test("is frozen all the way down, so a consumer cannot re-shape this package's cn()", () => {
    /* tailwind-merge reads the config lazily, on the first merge: a consumer
       who edited the imported lists before then would change cn() itself. */
    const { extend } = typeScaleMergeConfig
    const levels = [
      ["config", typeScaleMergeConfig],
      ["extend", extend],
      ["extend.theme", extend.theme],
      ["extend.theme.text", extend.theme.text],
      ["extend.theme.tracking", extend.theme.tracking],
    ] as const
    for (const [label, value] of levels)
      assert.ok(Object.isFrozen(value), `${label} is frozen`)
    /* push() with no arguments still writes length, so it throws on a frozen
       array and is a no-op on a live one: the probe cannot corrupt the config
       the other tests merge with. */
    assert.throws(() => (extend.theme.text as unknown as string[]).push(), TypeError)
    assert.throws(
      () => (extend.theme.tracking as unknown as string[]).push(),
      TypeError,
    )
  })

  test("matches the --text-* and --tracking-* names in every @theme of the stylesheet", () => {
    /* index.css, every file it reaches by a relative @import (styles/motion.css
       has a @theme of its own) and anything else under styles/: they compile
       into one theme, so a name declared in any of them is a utility
       tailwind-merge must know. */
    const seen = new Set<string>()
    const sheets: string[] = []
    const visit = (file: string) => {
      const abs = path.resolve(file)
      if (seen.has(abs)) return
      seen.add(abs)
      const css = fs.readFileSync(abs, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")
      sheets.push(css)
      for (const m of css.matchAll(/@import\s+(?:url\(\s*)?(["'])(\.{1,2}\/[^"']+)\1/g))
        visit(path.resolve(path.dirname(abs), m[2]))
    }
    visit(path.join(HERE, "../src/index.css"))
    const stylesDir = path.join(HERE, "../src/styles")
    for (const f of fs.readdirSync(stylesDir, { recursive: true }) as string[])
      if (f.endsWith(".css")) visit(path.join(stylesDir, f))
    assert.ok(sheets.length >= 2, "index.css and styles/motion.css are both read")

    /* the body of every @theme block, plain or inline, braces balanced */
    const themeBodies = (css: string) => {
      const out: string[] = []
      for (const m of css.matchAll(/@theme\b[^{;]*\{/g)) {
        const open = m.index + m[0].length - 1
        let depth = 0
        for (let i = open; i < css.length; i++) {
          if (css[i] === "{") depth++
          else if (css[i] === "}" && --depth === 0) {
            out.push(css.slice(open + 1, i))
            break
          }
        }
      }
      return out
    }
    const names = (ns: string) =>
      sheets
        .flatMap(themeBodies)
        .flatMap((body) =>
          [...body.matchAll(new RegExp(`--${ns}-([a-z0-9-]+)\\s*:`, "g"))].map(
            (x) => x[1],
          ),
        )
    assert.deepEqual(names("text"), typeScaleMergeConfig.extend.theme.text)
    assert.deepEqual(names("tracking"), typeScaleMergeConfig.extend.theme.tracking)
  })
})

describe("cn() with the type scale", () => {
  const cases: Array<[string[], string, string]> = [
    [
      ["text-body text-muted-foreground"],
      "text-body text-muted-foreground",
      "size and colour coexist",
    ],
    [
      ["text-muted-foreground text-body"],
      "text-muted-foreground text-body",
      "reverse order",
    ],
    [
      ["text-body", "text-sm"],
      "text-sm",
      "a cva base size overridden by a size variant",
    ],
    [["text-sm", "text-body"], "text-body", "a later token wins"],
    [
      ["leading-normal text-body"],
      "text-body",
      "a later size removes an earlier leading, as the arbitrary class does",
    ],
    [
      ["leading-normal text-[0.9375rem]"],
      "text-[0.9375rem]",
      "today's behaviour, unchanged",
    ],
    [
      ["text-body leading-normal"],
      "text-body leading-normal",
      "a later leading survives",
    ],
    [["text-body-lg", "text-sm"], "text-sm", "hyphenated names parse as sizes"],
    [["text-caption-sm", "text-xs"], "text-xs", "hyphenated names parse as sizes"],
    [["text-lg text-micro"], "text-micro", "a token beats a stock size"],
    [
      ["text-[0.9375rem]", "text-body"],
      "text-body",
      "mixed old and new during migration",
    ],
    [
      ["text-base md:text-body"],
      "text-base md:text-body",
      "the input pattern keeps both",
    ],
    [
      ["md:text-body md:text-muted-foreground"],
      "md:text-body md:text-muted-foreground",
      "variants keep their own groups",
    ],
    [["hover:text-body hover:text-sm"], "hover:text-sm", "same variant conflicts"],
    [
      ["md:text-body text-sm"],
      "md:text-body text-sm",
      "different variants do not conflict",
    ],
    [["!text-body !text-sm"], "!text-sm", "important vs important conflicts"],
    [["text-body! text-sm!"], "text-sm!", "trailing important conflicts"],
    [
      ["!text-body text-sm"],
      "!text-body text-sm",
      "important vs plain does not conflict, as today",
    ],
    [["leading-5 text-body/6"], "text-body/6", "slash form"],
    [["text-body text-body/6"], "text-body/6", "slash form against plain"],
    [
      ["text-body tracking-snug text-white"],
      "text-body tracking-snug text-white",
      "size, tracking and colour coexist",
    ],
    [["tracking-snug", "tracking-tight"], "tracking-tight", "tracking registration"],
    [["tracking-tight", "tracking-title"], "tracking-title", "tracking registration"],
    [
      ["tracking-title tracking-[-0.02em]"],
      "tracking-[-0.02em]",
      "tracking token vs arbitrary",
    ],
    [["text-body text-[13px]"], "text-[13px]", "token vs another arbitrary length"],
    [
      ["text-body text-(--x)"],
      "text-body text-(--x)",
      "a var() shorthand is a colour, as today",
    ],
    [
      ["text-body text-[var(--x)]"],
      "text-body text-[var(--x)]",
      "an arbitrary var() is a colour, as today",
    ],
    [
      [
        "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1",
        "font-sans leading-snug font-normal tracking-normal text-muted-foreground text-sm",
      ],
      "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-sans font-normal tracking-normal text-muted-foreground text-sm",
      "stat.tsx caption, as recorded today: a later text-sm still drops leading-snug",
    ],
  ]
  for (const [args, expected, why] of cases) {
    test(`${JSON.stringify(args)} -> ${JSON.stringify(expected)} (${why})`, () => {
      assert.equal(merge(...args), expected)
    })
  }

  test("every table case containing a token matches its arbitrary twin", () => {
    for (const [args] of cases) assertParity(args)
  })
})

describe("equivalence sweep: token vs the arbitrary class it replaces", () => {
  /* Representative neighbours a size or tracking class meets in this repo:
     stock sizes, leadings, colours, tracking, weights, other arbitrary values,
     with and without variants and important. */
  const neighbours = [
    "",
    "text-xs",
    "text-sm",
    "text-base",
    "text-lg",
    "text-2xl",
    "text-sm/6",
    "text-[13px]",
    "text-[length:var(--size)]",
    "leading-none",
    "leading-tight",
    "leading-snug",
    "leading-normal",
    "leading-5",
    "leading-[1.3]",
    "text-muted-foreground",
    "text-foreground",
    "text-white",
    "text-(--accent)",
    "text-[var(--x)]",
    "tracking-tight",
    "tracking-normal",
    "tracking-wide",
    "tracking-[-0.03em]",
    "font-medium",
    "font-semibold",
    "font-mono",
    "md:text-sm",
    "md:leading-5",
    "hover:text-foreground",
    "!text-sm",
    "text-sm!",
  ]
  const forms = (token: string) => [
    token,
    `md:${token}`,
    `hover:${token}`,
    `group-hover:md:${token}`,
    `!${token}`,
    `${token}!`,
    ...(token.startsWith("text-")
      ? [`${token}/6`, `${token}/tight`, `md:${token}/5`]
      : []),
  ]

  for (const token of TO_ARBITRARY.keys()) {
    test(token, () => {
      let n = 0
      for (const form of forms(token)) {
        for (const a of neighbours) {
          for (const b of neighbours) {
            assertParity([`${a} ${form} ${b}`.trim()])
            assertParity([a, form, b])
            assertParity([form, `${a} ${b}`.trim()])
            n += 3
          }
        }
      }
      assert.ok(n > 1000)
    })
  }

  test("every pair of type-scale classes", () => {
    const all = [...TO_ARBITRARY.keys()].flatMap(forms)
    for (const x of all) for (const y of all) assertParity([x, y])
  })
})

describe("replay over the repository's own class strings", () => {
  /* Every string literal in the package source that carries a type-scale class
     in either spelling, merged on its own and paired with every other. Holds
     before, during and after the migration, because both sides are normalised. */
  const ROOTS = ["packages/ui/src"]
  const pattern = new RegExp(
    [...TO_ARBITRARY.keys(), ...TO_TOKEN.keys()]
      .map((s) => s.replace(/[[\]().-]/g, "\\$&"))
      .map((s) => `(?<![\\w-])${s}(?![\\w-])`)
      .join("|"),
  )
  const literals = new Set<string>()
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(ts|tsx)$/.test(e.name)) {
        const src = fs.readFileSync(p, "utf8")
        for (const m of src.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)) {
          const s = (m[1] ?? m[2] ?? m[3]).replace(/\$\{[^}]*\}/g, " ")
          if (pattern.test(s)) literals.add(s.trim())
        }
      }
    }
  }
  for (const r of ROOTS) {
    const abs = path.join(REPO, r)
    if (fs.existsSync(abs)) walk(abs)
  }
  const list = [...literals]

  test(`found class strings to replay (${list.length})`, () => {
    assert.ok(list.length > 0)
  })

  test("each string merged on its own", () => {
    for (const s of list) assertParity([s])
  })

  test("each string paired with every other, both orders", () => {
    for (const a of list) for (const b of list) assertParity([a, b])
  })
})
