#!/usr/bin/env node
/**
 * Fail the build if a raw design value escapes the token layer.
 *   node scripts/check-tokens.mjs                  check the tree against the allowlist
 *   node scripts/check-tokens.mjs --init [--force] write the allowlist from the current tree
 *   node scripts/check-tokens.mjs --prune          remove or decrement stale entries (never adds)
 *   node scripts/check-tokens.mjs --summary        print counts per rule and per label, then check
 *   node scripts/check-tokens.mjs --base <git-ref> fail if the allowlist grew relative to <git-ref>
 *   node scripts/check-tokens.mjs --files <path…> [--index-css <path>] [--utils <path>]
 *       scan arbitrary files (fixtures) with every rule, no allowlist, and print each hit
 *   node scripts/check-tokens.mjs --scope <repo-relative path…>
 *       print which rules the repo check applies to each path (reads no file but
 *       the entry stylesheets' @source lines)
 *
 * CONTRIBUTING.md bans raw `oklch()`, hex, `text-[…rem]`, `rounded-[…px]`, numeric `z-*`
 * and `tracking-[…]` outside `packages/ui/src/index.css` and
 * `packages/ui/src/styles/`. This script is that rule as a build gate, shaped
 * like check-names.mjs: scoped by git, reporting file:line, exiting non-zero.
 *
 * It is a RATCHET, not a ban. Every occurrence that existed when the gate landed
 * is listed in scripts/tokens-allowlist.json with a count and a target phase. The
 * check fails when an occurrence appears that the list does not cover, and also
 * when the list covers more than exists — so an entry cannot outlive the code it
 * excused. `--prune` does the shrinking; of this script's modes nothing but
 * `--init --force` ever adds. A hand edit could still add, which is what
 * `--base` (below) exists to catch.
 *
 * Scope is packages/ui and the root package.json, as `git ls-files --cached
 * --others --exclude-standard` lists them: what a commit would contain once new
 * files are added. In CI that is exactly the tracked tree. Raw-value rules read
 * source files (.ts .tsx .mts .cts .js .jsx .mjs .cjs .css .html) everywhere,
 * and the other text files Tailwind's scanner reads (.json .md .mdx .svg .txt
 * .yaml …, config JSON excepted) only under a directory Tailwind scans: one the
 * package stylesheet names with @source (see tailwindSourceDirs). There a class
 * in Markdown ships, elsewhere Markdown is prose. Test code (packages/<name>/test/)
 * is not a source of the published stylesheet, so only the import rules apply
 * to it. The exemption is by directory: a test-named file inside a directory
 * Tailwind scans gets every rule.
 *
 * The structural assertions read the design system's stylesheet the way
 * Tailwind compiles it: packages/ui/src/index.css, every file it reaches by a
 * relative @import, and everything under packages/ui/src/styles/. That
 * directory is exempt from the value scan (it is where raw values belong), so
 * the assertions are what keep a companion, a colour or a re-valued token out
 * of it. Two of them — no namespace reset, and no rule or @utility that adds
 * declarations to a type-scale class — also run over every other stylesheet
 * the scan reads (cssRuleGuards), since a rule in an app's stylesheet reaches
 * the same call sites.
 *
 * `--base <git-ref>` makes the ratchet a gate rather than a convention: it fails
 * when the repo-wide count of some (rule, match, context) in
 * scripts/tokens-allowlist.json is higher than in the ref's copy. Per value, not
 * per file, so renaming a file that holds grandfathered values is not growth.
 * CI runs it on every pull request against the base branch. A ref with no
 * allowlist passes (there is nothing to ratchet against).
 *
 * Exit codes: 0 clean, 1 violation, 2 usage or environment error.
 */

import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const INDEX_CSS = "packages/ui/src/index.css"
const UTILS_TS = "packages/ui/src/lib/utils.ts"

const WORKSPACES = ["packages/ui/"]
const EXCLUDED = (rel) => rel === INDEX_CSS || rel.startsWith("packages/ui/src/styles/")
const SOURCE = /\.(tsx?|jsx?|mts|cts|mjs|cjs|css|html)$/i
/* Text files Tailwind's scanner reads besides SOURCE. Measured, not assumed:
   @tailwindcss/oxide (Tailwind 4.3.3) run over a directory holding one probe
   class per extension returned a candidate from every one of these; .css is
   compiled rather than scanned, and .lock and .log are skipped. A class in one
   of them reaches a stylesheet only when it sits under a directory Tailwind
   scans — an @source directory of the package stylesheet (tailwindSourceDirs) —
   so that is the only place they are read. */
const TAILWIND_TEXT = /\.(json|mdx|md|svg|txt|ya?ml|xml|csv|toml|vue|svelte|astro)$/i
/* JSON that configures a tool rather than holding content. package.json has its
   own branch (scanPackageJson). */
const CONFIG_JSON = (base) =>
  /^(?:[tj]sconfig(?:\.[\w.-]+)?|components)\.json$/i.test(base)
/* The stylesheets whose @source lines define what Tailwind reads. */
const ENTRY_CSS = [INDEX_CSS]
/* Test code is exempt from the value rules by DIRECTORY, never by file name: a
   `badge.snap.tsx` under packages/ui/src/components is still read by Tailwind
   (the @source lines in index.css name that directory), so every class in it
   would ship in the published stylesheet. These directories are not sources
   of the published stylesheet. */
const TEST = (rel) => /^packages\/[^/]+\/test\//.test(rel)

/* The one file allowed to import tailwind-merge. A parity test that must compare
   against the unconfigured merger goes here too, by path, with a reason. */
const TW_MERGE_ALLOWED = new Set([UTILS_TS])

/* Rules that can never be allowlisted: they have no legitimate occurrence. */
const HARD_RULES = new Set([
  "cn-import",
  "cn-dependency",
  "tailwind-merge-import",
  "type-colour-collision",
  "structure",
])

/* ---- arguments ----------------------------------------------------------- */

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(name)
const valueOf = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}
const FIXTURE_FILES = (() => {
  const i = argv.indexOf("--files")
  if (i < 0) return null
  const out = []
  for (let j = i + 1; j < argv.length && !argv[j].startsWith("--"); j++)
    out.push(argv[j])
  return out
})()
const SCOPE_PATHS = (() => {
  const i = argv.indexOf("--scope")
  if (i < 0) return null
  const out = []
  for (let j = i + 1; j < argv.length && !argv[j].startsWith("--"); j++)
    out.push(argv[j].replace(/\\/g, "/").replace(/^\.\//, ""))
  return out
})()
const MODE_INIT = flag("--init")
const MODE_PRUNE = flag("--prune")
const FORCE = flag("--force")
const SUMMARY = flag("--summary")
const BASE_REF = valueOf("--base")
/* --allowlist <path> reads and writes another list: for testing the ratchet itself. */
const ALLOWLIST = path.resolve(
  valueOf("--allowlist") ?? path.join(root, "scripts", "tokens-allowlist.json"),
)

if (MODE_INIT && MODE_PRUNE) usage("--init and --prune are exclusive")
if (FIXTURE_FILES && (MODE_INIT || MODE_PRUNE))
  usage("--files never reads or writes the allowlist")
if (FIXTURE_FILES && FIXTURE_FILES.length === 0)
  usage("--files needs at least one path")
if (argv.includes("--base") && (!BASE_REF || BASE_REF.startsWith("--")))
  usage("--base needs a git ref")
if (BASE_REF && (MODE_INIT || MODE_PRUNE || FIXTURE_FILES))
  usage("--base only compares the allowlist with a ref's copy of it")

function usage(msg) {
  console.error(`tokens:check — ${msg}`)
  process.exit(2)
}

/* ---- source helpers ------------------------------------------------------ */

const DELIM = new Set([..." \t\"'`{}(),;<>=", "\r", "\n"])

/* Index just past the bracket that closes the one at `open` ("[" or "("). */
function closeOf(s, open) {
  const o = s[open]
  const c = o === "[" ? "]" : ")"
  let depth = 0
  for (let i = open; i < s.length; i++) {
    if (s[i] === o) depth++
    else if (s[i] === c && --depth === 0) return i + 1
  }
  return -1
}

/* Grow a utility match into the whole class token: variants and an important
   prefix on the left, a /modifier and an important suffix on the right. */
function classToken(line, start, end) {
  let l = start
  while (l > 0) {
    const ch = line[l - 1]
    if (ch === "]") {
      let depth = 0
      let k = l - 1
      for (; k >= 0; k--) {
        if (line[k] === "]") depth++
        else if (line[k] === "[" && --depth === 0) break
      }
      if (k < 0) break
      l = k
    } else if (DELIM.has(ch)) break
    else l--
  }
  let r = end
  while (r < line.length) {
    const ch = line[r]
    if (ch === "[") {
      const e = closeOf(line, r)
      if (e < 0) break
      r = e
    } else if (DELIM.has(ch)) break
    else r++
  }
  /* A left part that is not a variant chain is not ours (e.g. "foo.text-[…]"). */
  const prefix = line.slice(l, start)
  if (prefix && !/[:!]$/.test(prefix)) l = start
  return line.slice(l, r)
}

/* Spans of docs code samples: template literals assigned to `code:` or `code={`.
   Class names inside them are visible text, not styling. */
function codeSampleSpans(text) {
  const spans = []
  const re = /\bcode\s*(?::|=\s*\{)\s*`/g
  let m
  while ((m = re.exec(text))) {
    const start = m.index + m[0].length - 1
    const end = templateEnd(text, start)
    if (end < 0) break
    spans.push([start, end])
    re.lastIndex = end
  }
  return spans
}

function templateEnd(s, tick) {
  for (let i = tick + 1; i < s.length; i++) {
    const ch = s[i]
    if (ch === "\\") i++
    else if (ch === "`") return i + 1
    else if (ch === "$" && s[i + 1] === "{") {
      let depth = 1
      i += 2
      for (; i < s.length && depth > 0; i++) {
        if (s[i] === "{") depth++
        else if (s[i] === "}") depth--
        else if (s[i] === "`") {
          const e = templateEnd(s, i)
          if (e < 0) return -1
          i = e - 1
        } else if (s[i] === '"' || s[i] === "'") {
          const q = s[i]
          for (i++; i < s.length && s[i] !== q; i++) if (s[i] === "\\") i++
        }
      }
      i--
    }
  }
  return -1
}

/* ---- value classification ------------------------------------------------ */

/* A CSS number (exponent allowed) with a length unit, case-insensitive like CSS. */
const NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?`
const UNITS =
  "px|rem|em|%|vw|vh|vi|vb|vmin|vmax|svw|svh|svi|svb|svmin|svmax|lvw|lvh|lvi|lvb|lvmin|lvmax|dvw|dvh|dvi|dvb|dvmin|dvmax|ch|ex|cap|ic|lh|rlh|rch|rex|rcap|ric|pt|pc|in|cm|mm|q|cqw|cqh|cqi|cqb|cqmin|cqmax"
const LENGTH = new RegExp(`^${NUMBER}(?:${UNITS})$`, "i")
const SIZE_KEYWORD =
  /^(xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|smaller|larger)$/i
/* The data-type hints Tailwind's text utility reads as a font size. `size:` is
   one of them: in Tailwind 4.3.3 text-[size:15px] and text-(size:--x) compile
   to font-size, alongside the four hints it shares with type inference. Shared
   by the [...] and (...) forms below. */
const SIZE_HINT = /^(size|length|absolute-size|relative-size|percentage):/i
const COLOUR_START =
  /^(#|-?(rgba?|hsla?|hwb|color|color-mix|light-dark|oklab|oklch|lab|lch|contrast-color)\()/i
const MATH_FN =
  /(^|[^\w-])(calc|calc-size|min|max|clamp|mod|rem|round|abs|sign|sin|cos|tan|asin|acos|atan|atan2|pow|sqrt|hypot|log|exp)\(/i

/* Is the inside of `text-[…]` a font size? This follows Tailwind's own reading
   of the value (checked against candidatesToCss, Tailwind 4.3.3): a type hint
   decides; otherwise a colour wins, a bare `var(…)` is a colour, and a length,
   a percentage, a size keyword or any maths function is a font size.
   `--spacing(n)` compiles to a calc() of the spacing scale and is a size too.
   Deliberately stricter than Tailwind in one place: a length with an upper-case
   unit (15PX) or a unit Tailwind does not know (1cap) is flagged, although
   Tailwind emits it as an invalid colour. It is still a raw size someone meant. */
function textValueKind(v) {
  if (v.includes("${")) return "interpolated"
  const hint = /^([a-z][\w-]*):/i.exec(v)
  if (hint) return SIZE_HINT.test(v) ? "size" : null
  if (COLOUR_START.test(v)) return null
  if (/^var\(/i.test(v)) return null
  if (LENGTH.test(v) || SIZE_KEYWORD.test(v)) return "size"
  if (MATH_FN.test(v) || /^--spacing\(/i.test(v)) return "size"
  return null
}

function toPx(v) {
  const m = /^(?:length:|size:)?(-?\d*\.?\d+)(px|rem|em)$/i.exec(v)
  if (!m) return null
  const n = parseFloat(m[1])
  const unit = m[2].toLowerCase()
  return unit === "px" ? n : unit === "rem" ? n * 16 : null // em is relative: no px
}

const TIER1_PX = new Set([11, 12, 13, 14, 15, 16, 17, 18])
const COMPOSITE_PX = new Set([22, 28, 32])
const TIER1_TRACKING = new Set(["-0.01em", "-0.02em"])

/* The Tier-1 type scale as it landed, name for value. The structural check
   pins these; changing one is a deliberate edit here, not a side effect. */
const PINNED_TEXT = {
  micro: "0.6875rem",
  "caption-sm": "0.75rem",
  caption: "0.8125rem",
  "body-sm": "0.875rem",
  body: "0.9375rem",
  "body-md": "1rem",
  "body-lg": "1.0625rem",
  lead: "1.125rem",
}
const PINNED_TRACKING = { snug: "-0.01em", title: "-0.02em" }
const BODY_TRACKING = ["--tracking-body", "-0.011em"]

/* A target phase for a grandfathered occurrence. Labels are for people; they are
   not part of the allowlist key, so they can be edited by hand. */
function labelFor(o) {
  /* Visible text in a hand-written code sample. Rewriting it would change what
     the page shows, so it stays until the code tab is generated from the
     demo's own source and the hand-written string is deleted. */
  if (o.context === "code") return "2a: code tab generated from source"
  switch (o.rule) {
    case "type-size": {
      if (o.kind === "interpolated") return "review: interpolated"
      const px = toPx(o.value)
      if (px == null) return "6: snap"
      if (TIER1_PX.has(px)) return "1b: migrate"
      if (COMPOSITE_PX.has(px)) return "6d: composite"
      return "6: snap"
    }
    case "type-tracking":
      return TIER1_TRACKING.has(o.value) ? "1b: migrate" : "6: snap"
    case "type-leading":
      return "6: snap"
    case "type-arbitrary-property":
      return "6: snap"
    case "type-style-key":
      return "6: style prop"
    case "type-css-declaration":
      return "6: snap"
    case "type-interpolated":
      return "review: interpolated"
    case "type-token-override":
      return "review: token override"
    case "color-oklch":
    case "color-hex":
      return "1a: primitives"
    case "radius-px":
      return "1c: radius"
    case "z-index":
      return "1b: z-index"
    default:
      return "review"
  }
}

/* ---- the scanners -------------------------------------------------------- */

/* Spans of the object literal inside each style={{ … }}. */
function styleObjectSpans(text) {
  const spans = []
  const re = /\bstyle\s*=\s*\{\s*\{/g
  let m
  while ((m = re.exec(text))) {
    const open = m.index + m[0].length - 1
    spans.push([open, braceEnd(text, open)])
  }
  return spans
}

/* Spans of the template literal inside each <style>{`…`}</style>. */
function styleBlockSpans(text) {
  const spans = []
  const re = /<style\b[^>]*>\s*\{\s*`/g
  let m
  while ((m = re.exec(text))) {
    const start = m.index + m[0].length - 1
    const end = templateEnd(text, start)
    if (end < 0) break
    spans.push([start, end])
    re.lastIndex = end
  }
  return spans
}

const inSpan = (spans, abs) => spans.some(([a, b]) => abs >= a && abs < b)

function scanText(rel, text, { valueRules, importRules, sizeNames = new Set() }) {
  const out = []
  const spans = valueRules ? codeSampleSpans(text) : []
  const styleObjects = valueRules ? styleObjectSpans(text) : []
  const styleBlocks = valueRules ? styleBlockSpans(text) : []
  const lines = text.split("\n")
  let offset = 0
  const isCss = /\.css$/i.test(rel)

  /* Import rules read the whole file, so a specifier split across lines
     (`import(\n  "tailwind-merge"\n)`) is still one import. */
  if (importRules) {
    const lineAt = (i) => text.slice(0, i).split("\n").length
    const evidenceAt = (i) =>
      (text.split("\n")[lineAt(i) - 1] ?? "").trim().slice(0, 140)
    const hit = (rule, m) =>
      out.push({
        file: rel,
        line: lineAt(m.index),
        rule,
        match: m[0].replace(/\s+/g, " "),
        context: "source",
        evidence: evidenceAt(m.index),
      })
    /* comments may sit between the keyword and the specifier:
       import(/* webpackChunkName: "x" *\/ "tailwind-merge") */
    const GAP = String.raw`(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*\n)*`
    const SPEC = String.raw`(?:\bfrom${GAP}|\bimport${GAP}(?:\(${GAP})?|\brequire${GAP}\(${GAP})`
    let m
    const cnRe = new RegExp(`${SPEC}(["'\`])cn(\\/[^"'\`]*)?\\1`, "g")
    while ((m = cnRe.exec(text))) hit("cn-import", m)
    if (rel !== null && !TW_MERGE_ALLOWED.has(rel)) {
      const twRe = new RegExp(`${SPEC}(["'\`])tailwind-merge(\\/[^"'\`]*)?\\1`, "g")
      while ((m = twRe.exec(text))) hit("tailwind-merge-import", m)
    }
  }

  lines.forEach((raw, idx) => {
    const line = raw.replace(/\r$/, "")
    const lineNo = idx + 1
    const at = (col) => {
      const abs = offset + col
      return spans.some(([a, b]) => abs >= a && abs < b) ? "code" : "source"
    }
    const push = (rule, match, col, extra = {}) =>
      out.push({
        file: rel,
        line: lineNo,
        rule,
        match,
        context: at(col),
        evidence: line.trim().slice(0, 140),
        ...extra,
      })

    if (valueRules) {
      let m

      /* text-[…], text-(length:…) and text-(size:…) — font sizes, not colours */
      const textRe = /(?<![\w-])text-([[(])/g
      while ((m = textRe.exec(line))) {
        const open = m.index + 5
        const close = closeOf(line, open)
        if (close < 0) continue
        const inner = line.slice(open + 1, close - 1)
        let kind
        if (line[open] === "(") kind = SIZE_HINT.test(inner) ? "size" : null
        else kind = textValueKind(inner)
        if (!kind) continue
        const token = classToken(line, m.index, close)
        if (kind === "interpolated") push("type-interpolated", token, m.index)
        else push("type-size", token, m.index, { kind, value: inner })
      }

      /* an arbitrary line-height modifier on a named size: text-body/[1.2]
         compiles to font-size: var(--text-body); line-height: 1.2, and
         text-body/(--lh) to line-height: var(--lh). On a colour
         the same modifier is an opacity, so only size names count. (An
         arbitrary size with a modifier is already a type-size hit above.) */
      const modRe = /(?<![\w-])text-([a-z0-9][\w-]*?)\/[[(]/g
      while ((m = modRe.exec(line))) {
        if (!sizeNames.has(m[1])) continue
        const open = m.index + m[0].length - 1
        const close = closeOf(line, open)
        if (close < 0) continue
        const token = classToken(line, m.index, close)
        if (line.slice(open, close).includes("${"))
          push("type-interpolated", token, m.index)
        else
          push("type-leading", token, m.index, {
            value: line.slice(open + 1, close - 1),
          })
      }

      /* re-valuing a token on an element: [--text-body:20px] changes every
         text-body beneath it */
      const ovRe = /(?<![\w\])])\[--(text|tracking|leading|font-weight)-[\w*-]*\s*:/g
      while ((m = ovRe.exec(line))) {
        const close = closeOf(line, m.index)
        if (close < 0) continue
        push("type-token-override", classToken(line, m.index, close), m.index)
      }
      if (!isCss) {
        /* the same through a style object or setProperty */
        const ovKeyRe =
          /(?<![\w$.-])(["'`])(--(?:text|tracking|leading|font-weight)-[\w-]*)\1(?:\s+as\s+[\w.]+)?\s*\]?\s*:(?!:)|\.setProperty\(\s*(["'`])(--(?:text|tracking|leading|font-weight)-[\w-]*)\3/g
        while ((m = ovKeyRe.exec(line)))
          push("type-token-override", (m[2] ?? m[4]).slice(0, 80), m.index)
      }

      /* tracking-[…] and leading-[…] */
      const tlRe = /(?<![\w-])-?(tracking|leading)-[[(]/g
      while ((m = tlRe.exec(line))) {
        const open = m.index + m[0].length - 1
        const close = closeOf(line, open)
        if (close < 0) continue
        const inner = line.slice(open + 1, close - 1)
        const token = classToken(line, m.index, close)
        if (inner.includes("${")) push("type-interpolated", token, m.index)
        else
          push(m[1] === "tracking" ? "type-tracking" : "type-leading", token, m.index, {
            value: inner,
          })
      }

      /* [font-size:…] [font:…] [letter-spacing:…] [line-height:…], in any
         case: CSS property names are case-insensitive, so [Font-Size:15px]
         compiles too */
      const propRe = /(?<![\w\])])\[(font-size|font|letter-spacing|line-height)\s*:/gi
      while ((m = propRe.exec(line))) {
        const close = closeOf(line, m.index)
        if (close < 0) continue
        const token = classToken(line, m.index, close)
        if (line.slice(m.index, close).includes("${"))
          push("type-interpolated", token, m.index)
        else push("type-arbitrary-property", token, m.index)
      }

      /* style objects and SVG props: fontSize: 11, "letter-spacing": …,
         fontSize={11}, a computed ["fontSize"]: key, and the font shorthand
         (font: "600 15px Inter") when its value carries a size */
      if (!isCss) {
        const keyRe =
          /(?<![\w$.])(?:(["']?)(fontSize|letterSpacing|lineHeight|font)\1|(["'])(font-size|letter-spacing|line-height)\3)\]?\s*(:(?!:)|=(?![=>]))/g
        while ((m = keyRe.exec(line))) {
          /* a variable declaration, not a key: const fontSize = 15 */
          if (/\b(const|let|var)\s+$/.test(line.slice(0, m.index))) continue
          const rest = line.slice(m.index + m[0].length)
          const value = (
            /^\s*(\{[^}]*\}+|"[^"]*"|'[^']*'|`[^`]*`|[^,;}\n]*)/.exec(rest)?.[1] ?? ""
          ).trim()
          if (/^(number|string|CSSProperties\b|React\.)/.test(value)) continue // a type, not a value
          if (m[2] === "font" && !/^["'`].*\d/.test(value)) continue // font: not a shorthand with a size
          push(
            "type-style-key",
            `${m[2] ?? m[4]}${m[5] === ":" ? ": " : "="}${value}`.slice(0, 80),
            m.index,
          )
        }
        /* style.setProperty("font-size", …) and an SVG/HTML attribute in markup
           held as a string: <text font-size="12"> */
        const setRe =
          /\.setProperty\(\s*(["'`])(font-size|letter-spacing|line-height|font)\1|(?<![\w$.-])(font-size|letter-spacing|line-height)\s*=\s*(?=["'{])/g
        while ((m = setRe.exec(line))) {
          const rest = line.slice(m.index + m[0].length)
          const value = (
            /^\s*,?\s*("[^"]*"|'[^']*'|`[^`]*`|\{[^}]*\}|[^,)\s]*)/.exec(rest)?.[1] ??
            ""
          ).trim()
          push("type-style-key", `${m[2] ?? m[3]}=${value}`.slice(0, 80), m.index)
        }
        /* a DOM write: el.style.fontSize = "15px". keyRe skips a key after a
           dot, which is what lets cs.fontSize — a read — through; a write is
           the same raw value as a style prop. (The bracket form,
           el.style["font-size"] = …, is a quoted key keyRe already reads.) */
        const writeRe = /\.style\.(fontSize|letterSpacing|lineHeight|font)\s*=(?![=>])/g
        while ((m = writeRe.exec(line))) {
          const prop = m[1]
          const rest = line.slice(m.index + m[0].length)
          const value = (
            /^\s*("[^"]*"|'[^']*'|`[^`]*`|[^;,)\n]*)/.exec(rest)?.[1] ?? ""
          ).trim()
          if (prop === "font" && !/\d/.test(value)) continue
          push("type-style-key", `${prop}=${value}`.slice(0, 80), m.index)
        }
        /* the shorthand property inside a style object: style={{ fontSize }} */
        const shortRe =
          /(?<![\w$.'"`-])(?<!:\s*)(fontSize|letterSpacing|lineHeight)(?=\s*[,}])/g
        while ((m = shortRe.exec(line))) {
          if (inSpan(styleObjects, offset + m.index))
            push("type-style-key", m[1], m.index)
        }
      }

      /* hand-written CSS declarations with a literal value, in a .css file or
         in a <style>{`…`}</style> template inside a component */
      if (
        isCss ||
        styleBlocks.some(([a, b]) => a < offset + line.length && b > offset)
      ) {
        const declRe =
          /(?<![\w\-[])(font-size|letter-spacing|line-height|font)\s*:\s*([^;{}]+)/gi
        while ((m = declRe.exec(line))) {
          if (!isCss && !inSpan(styleBlocks, offset + m.index)) continue
          const v = m[2].trim()
          if (/^var\(/i.test(v)) continue
          const prop = m[1].toLowerCase()
          const raw =
            /\d/.test(v) ||
            (prop !== "line-height" &&
              prop !== "letter-spacing" &&
              /\b(xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|smaller|larger)\b/i.test(
                v,
              ))
          if (raw) push("type-css-declaration", `${prop}: ${v}`, m.index)
        }
      }
      if (!isCss) {
        /* CSS held anywhere else in a script: a string or template literal
           (`.x{font-size:15px}`), an __html payload, an insertRule() argument,
           cssText. Script code never spells a property in kebab case followed
           directly by a colon (a quoted key has its quote in between), so the
           kebab form is CSS text. The shorthand `font` counts only right after
           `{` or `;`, where it starts a declaration, and only with a literal
           value: a quoted value is a JS object key's, which keyRe reads. */
        const strDeclRe =
          /(?<![\w\-[.$])(font-size|letter-spacing|line-height)\s*:\s*([^;{}"'`\n]+)|(?<=[{;]\s*)(font)\s*:\s*([^;{}"'`\n]+)/gi
        while ((m = strDeclRe.exec(line))) {
          if (inSpan(styleBlocks, offset + m.index)) continue // counted above
          const prop = (m[1] ?? m[3]).toLowerCase()
          const v = (m[2] ?? m[4]).trim()
          if (/^var\(/i.test(v)) continue
          const raw =
            /\d/.test(v) ||
            (prop !== "line-height" &&
              prop !== "letter-spacing" &&
              /\b(xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|smaller|larger)\b/i.test(
                v,
              ))
          if (raw) push("type-css-declaration", `${prop}: ${v}`, m.index)
        }
      }
      if (isCss) {
        /* a component stylesheet re-valuing a token */
        const ovDeclRe =
          /(?<![\w-])(--(?:text|tracking|leading|font-weight)-[\w*-]*)\s*:/g
        while ((m = ovDeclRe.exec(line))) push("type-token-override", m[1], m.index)

        /* a colour named like a font size: --color-body (or --color-base)
           anywhere in a stylesheet that reaches Tailwind makes text-body
           (text-base) compile to that colour and drop the font size. Never
           legitimate, so HARD. Custom property names are case-sensitive:
           --color-Body is another variable and makes another utility. */
        const colourRe = /(?<![\w-])--color-([\w-]+)\s*:/g
        while ((m = colourRe.exec(line)))
          if (sizeNames.has(m[1]))
            push("type-colour-collision", `--color-${m[1]}`, m.index)
      }

      /* oklch( */
      const okRe = /(?<![\w-])oklch\(/g
      while ((m = okRe.exec(line))) {
        const close = closeOf(line, m.index + 5)
        push(
          "color-oklch",
          line.slice(m.index, close < 0 ? line.length : close).slice(0, 80),
          m.index,
        )
      }

      /* hex colours: #rgb #rgba #rrggbb #rrggbbaa. An all-digit 3/4-character
         run needs a colour-like left neighbour, so "Invoice #1042" is not one. */
      const hexRe =
        /(?<![\w&#/.$-])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![\w-])/g
      while ((m = hexRe.exec(line))) {
        if (/^\d{3,4}$/.test(m[1]) && !/["'`[(:,=]$/.test(line.slice(0, m.index)))
          continue
        push("color-hex", m[0], m.index)
      }

      /* rounded-[…] whose value carries a px literal */
      const radRe =
        /(?<![\w-])rounded(?:-(?:t|r|b|l|s|e|x|y|tl|tr|br|bl|ss|se|es|ee))?-\[/g
      while ((m = radRe.exec(line))) {
        const open = m.index + m[0].length - 1
        const close = closeOf(line, open)
        if (close < 0) continue
        if (!/\d(\.\d+)?px\b/i.test(line.slice(open, close))) continue
        push("radius-px", classToken(line, m.index, close), m.index)
      }

      /* numeric z-index utilities: z-10, -z-10, z-[…] */
      const zRe = /(?<![\w-])-?z-(\d+|\[[^\]]*\])(?![\w-])/g
      while ((m = zRe.exec(line)))
        push("z-index", classToken(line, m.index, m.index + m[0].length), m.index)
    }

    offset += raw.length + 1
  })
  return out
}

function scanPackageJson(rel, text) {
  const out = []
  let pkg
  try {
    pkg = JSON.parse(text)
  } catch {
    return [
      {
        file: rel,
        line: 1,
        rule: "structure",
        match: "unparseable package.json",
        context: "source",
        evidence: "",
      },
    ]
  }
  for (const field of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    if (pkg[field] && Object.hasOwn(pkg[field], "cn")) {
      const lineNo = text.split("\n").findIndex((l) => /"cn"\s*:/.test(l)) + 1
      out.push({
        file: rel,
        line: lineNo || 1,
        rule: "cn-dependency",
        match: `${field}.cn`,
        context: "source",
        evidence: `"cn": "${pkg[field].cn}"`,
      })
    }
  }
  return out
}

/* ---- structural assertions ----------------------------------------------- */

const STOCK_FALLBACK = {
  text: [
    "xs",
    "sm",
    "base",
    "lg",
    "xl",
    "2xl",
    "3xl",
    "4xl",
    "5xl",
    "6xl",
    "7xl",
    "8xl",
    "9xl",
  ],
  tracking: ["tighter", "tight", "normal", "wide", "wider", "widest"],
  leading: ["tight", "snug", "normal", "relaxed", "loose"],
}
const COLOUR_KEYWORDS = ["inherit", "current", "transparent", "black", "white"]

function stockTheme() {
  const file = path.join(root, "node_modules", "tailwindcss", "theme.css")
  const names = {
    text: new Set(STOCK_FALLBACK.text),
    tracking: new Set(STOCK_FALLBACK.tracking),
    leading: new Set(STOCK_FALLBACK.leading),
    color: new Set(COLOUR_KEYWORDS),
  }
  try {
    const css = fs.readFileSync(file, "utf8")
    for (const m of css.matchAll(
      /--(text|tracking|leading|color)-([a-z0-9-]+?)(?:--[a-z-]+)?\s*:/g,
    ))
      names[m[1]].add(m[2])
  } catch {
    /* Not installed: the fallback lists still cover the typography names. */
  }
  return names
}

const stripCssComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
const stripJsComments = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1")

/* Every declaration inside every @theme block (plain, inline, static, …). */
function themeDeclarations(css) {
  const src = stripCssComments(css)
  const decls = []
  const re = /@theme\b[^{;]*\{/g
  let m
  while ((m = re.exec(src))) {
    const open = m.index + m[0].length - 1
    let depth = 0
    let end = -1
    for (let i = open; i < src.length; i++) {
      if (src[i] === "{") depth++
      else if (src[i] === "}" && --depth === 0) {
        end = i
        break
      }
    }
    if (end < 0) break
    const body = src.slice(open + 1, end)
    const lineBase = src.slice(0, open).split("\n").length
    for (const d of body.matchAll(/(--[\w-]+(?:\*)?)\s*:\s*([^;]*);/g)) {
      decls.push({
        name: d[1],
        value: d[2].trim(),
        line: lineBase + body.slice(0, d.index).split("\n").length - 1,
      })
    }
    re.lastIndex = end
  }
  return decls
}

/* The `text` and `tracking` lists of the extendTailwindMerge config, or null
   when there is no config. Throws when a config exists but cannot be read. */
function mergeLists(ts) {
  const src = stripJsComments(ts)
  if (!/\bextendTailwindMerge\s*[(<]/.test(src)) return null
  let body
  /* the exported literal, bare or wrapped in utils.ts's own deepFreeze() */
  const named = /\btypeScaleMergeConfig\b[^=]*=\s*(?:deepFreeze\s*\(\s*)?\{/.exec(src)
  if (named) {
    const open = named.index + named[0].length - 1
    body = src.slice(open, braceEnd(src, open))
    /* the lists read below must be the ones the package's cn() merges with */
    if (
      !/\bextendTailwindMerge\s*(?:<[^>]*>)?\s*\(\s*(?:structuredClone\s*\(\s*)?typeScaleMergeConfig\b/.test(
        src,
      )
    )
      throw new Error(
        "typeScaleMergeConfig exists but extendTailwindMerge is not called with it, so the lists checked here are not the ones cn() uses",
      )
  } else {
    const call = /\bextendTailwindMerge\s*(?:<[^>]*>)?\s*\(\s*\{/.exec(src)
    if (!call)
      throw new Error(
        "extendTailwindMerge is called with something other than an object literal or typeScaleMergeConfig",
      )
    const open = call.index + call[0].length - 1
    body = src.slice(open, braceEnd(src, open))
  }
  const theme = /\btheme\s*:\s*\{/.exec(body)
  const themeBody = theme
    ? body.slice(
        theme.index + theme[0].length - 1,
        braceEnd(body, theme.index + theme[0].length - 1),
      )
    : ""
  const list = (key) => {
    const mm = new RegExp(`\\b${key}\\s*:\\s*\\[([^\\]]*)\\]`).exec(themeBody)
    if (!mm) return []
    const items = [...mm[1].matchAll(/(["'`])([^"'`]+)\1/g)].map((x) => x[2])
    const leftovers = mm[1]
      .replace(/(["'`])([^"'`]+)\1/g, "")
      .replace(/[\s,]|as\s+const/g, "")
    if (leftovers)
      throw new Error(
        `theme.${key} holds something other than string literals: ${leftovers.slice(0, 60)}`,
      )
    return items
  }
  return { text: list("text"), tracking: list("tracking") }
}

function braceEnd(s, open) {
  let depth = 0
  for (let i = open; i < s.length; i++) {
    if (s[i] === "{") depth++
    else if (s[i] === "}" && --depth === 0) return i + 1
  }
  return s.length
}

/* The design system's stylesheet as Tailwind compiles it: the entry file, every
   file it reaches through a relative @import (recursively), and every .css file
   under its styles/ directory whether imported yet or not. A second @theme in
   styles/motion.css is the same theme as the one in index.css — a companion or
   a colour declared there changes text-body exactly as it would in index.css,
   and the value scan never reads that directory. Returns [{ abs, label }],
   entry first; a file that cannot be read is returned with css: null. */
function uiStylesheets(entryAbs, entryLabel) {
  const out = []
  const seen = new Set()
  const labelOf = (abs) =>
    abs === entryAbs
      ? entryLabel
      : path.relative(root, abs).split(path.sep).join("/").startsWith("..")
        ? abs.replace(/\\/g, "/")
        : path.relative(root, abs).split(path.sep).join("/")
  const visit = (abs) => {
    const key = path.resolve(abs).toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    let css = null
    try {
      css = fs.readFileSync(abs, "utf8")
    } catch {
      /* reported by the caller */
    }
    out.push({ abs, label: labelOf(abs), css })
    if (css == null) return
    for (const m of stripCssComments(css).matchAll(
      /@import\s+(?:url\(\s*)?(["'])(\.{1,2}\/[^"']+)\1/g,
    ))
      visit(path.resolve(path.dirname(abs), m[2]))
  }
  visit(entryAbs)
  const stylesDir = path.join(path.dirname(entryAbs), "styles")
  let extra = []
  try {
    extra = fs
      .readdirSync(stylesDir, { recursive: true })
      .filter((f) => /\.css$/i.test(f))
      .map((f) => path.join(stylesDir, f))
      .sort()
  } catch {
    /* no styles/ directory */
  }
  for (const abs of extra) visit(abs)
  return out
}

/* Every declaration OUTSIDE the @theme blocks, line numbers kept. */
function nonThemeDeclarations(css) {
  let src = stripCssComments(css)
  const re = /@theme\b[^{;]*\{/g
  let m
  while ((m = re.exec(src))) {
    const open = m.index + m[0].length - 1
    const end = braceEnd(src, open)
    src =
      src.slice(0, m.index) +
      src.slice(m.index, end).replace(/[^\n]/g, " ") +
      src.slice(end)
    re.lastIndex = end
  }
  const decls = []
  for (const d of src.matchAll(/(?<![\w-])(--[\w-]+)\s*:\s*([^;{}]*)/g))
    decls.push({
      name: d[1],
      value: d[2].trim(),
      line: src.slice(0, d.index).split("\n").length,
    })
  return decls
}

/* The text-* and tracking-* names a rule guard protects: every stock name, the
   pinned Tier-1 names, and every non-companion --text-* / --tracking-* the
   given stylesheets declare in @theme. */
function guardedTypeNames(cssFiles) {
  const stock = stockTheme()
  const guarded = {
    text: new Set([...stock.text, ...Object.keys(PINNED_TEXT)]),
    tracking: new Set([...stock.tracking, ...Object.keys(PINNED_TRACKING)]),
  }
  for (const f of cssFiles) {
    if (f.css == null) continue
    for (const d of themeDeclarations(f.css)) {
      const t = /^--(text|tracking)-([a-z0-9][\w-]*?)(--[\w-]+)?$/.exec(d.name)
      if (t && !t[3]) guarded[t[1]].add(t[2])
    }
  }
  return guarded
}

const unescapeCss = (s) =>
  s
    .replace(/\\([0-9a-f]{1,6})\s?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\(.)/g, "$1")

/* the utility a class token names once variants, important and a modifier are
   peeled off: md:hover:!text-body/6 -> text-body */
function utilityOf(cls) {
  return cls
    .slice(variantCut(cls))
    .replace(/^!|!$/g, "")
    .replace(/\/.*$/, "")
    .replace(/^-/, "")
}

/* where the utility starts in a class token: just past its last variant colon
   outside [] and (), or 0 when it has no variant */
function variantCut(cls) {
  let depth = 0
  let cut = 0
  for (let i = 0; i < cls.length; i++) {
    if (cls[i] === "[" || cls[i] === "(") depth++
    else if (cls[i] === "]" || cls[i] === ")") depth--
    else if (cls[i] === ":" && depth === 0) cut = i + 1
  }
  return cut
}

/* ---- selector subjects ---------------------------------------------------
   Just enough of a CSS selector parser to find which elements a rule's
   declarations land on. Escapes (a hex escape eats one trailing space),
   quoted strings, [] and () are honoured, so a combinator or comma inside an
   attribute value or a pseudo-class argument never splits the selector. */

/* index just past the escape, string or bracket group that starts at s[i] */
function skipToken(s, i) {
  const c = s[i]
  if (c === "\\") {
    const hex = /^[0-9a-f]{1,6}\s?/i.exec(s.slice(i + 1))
    return i + 1 + (hex ? hex[0].length : 1)
  }
  if (c === '"' || c === "'") {
    let j = i + 1
    while (j < s.length && s[j] !== c) j += s[j] === "\\" ? 2 : 1
    return j + 1
  }
  if (c === "[" || c === "(") {
    const close = c === "[" ? "]" : ")"
    let j = i + 1
    while (j < s.length && s[j] !== close) j = skipToken(s, j)
    return j + 1
  }
  return i + 1
}

/* s split at every top-level character `isSep` accepts */
function splitTop(s, isSep) {
  const out = []
  let start = 0
  for (let i = 0; i < s.length; ) {
    if (isSep(s[i])) {
      out.push(s.slice(start, i))
      start = i + 1
      i++
    } else i = skipToken(s, i)
  }
  out.push(s.slice(start))
  return out
}

/* Adds to `hits` every type-scale class a selector list's SUBJECTS carry. The
   subject is the last compound of each complex selector: in `.text-sm svg`
   and `.text-body > *` the declarations land on the svg and the children,
   whose own classes decide their type. Inside the subject, :is()/:where() and
   any other selector-taking pseudo-class are read the same way, recursively;
   :has() and :not() are skipped, since the element they select carries
   something else (or explicitly lacks the class). */
function selectorTargets(selectorList, t, hits) {
  for (const complex of splitTop(selectorList, (c) => c === ",")) {
    const subject = splitTop(complex.trim(), (c) => /[\s>+~]/.test(c))
      .filter(Boolean)
      .pop()
    if (subject) compoundTargets(subject, t, hits)
  }
}

function compoundTargets(comp, t, hits) {
  for (let i = 0; i < comp.length; ) {
    const rest = comp.slice(i)
    const cls = /^\.((?:\\[0-9a-f]{1,6}\s?|\\.|[\w-])+)/i.exec(rest)
    if (cls) {
      const u = utilityOf(unescapeCss(cls[1]))
      if (t.isGuarded(u)) hits.add(u)
      i += cls[0].length
      continue
    }
    if (comp[i] === "[") {
      const end = skipToken(comp, i)
      attrTargets(comp.slice(i, end), t, hits)
      i = end
      continue
    }
    const fn = /^::?([\w-]+)\(/.exec(rest)
    if (fn) {
      const open = i + fn[0].length - 1
      const end = skipToken(comp, open)
      if (!/^(?:has|not)$/i.test(fn[1])) selectorTargets(comp.slice(open + 1, end - 1), t, hits)
      i = end
      continue
    }
    i = skipToken(comp, i)
  }
}

/* A [class…] attribute selector, read by what its operator means. The value
   is the element's whole class string, so each whitespace-separated word is a
   class whose start and end are known — except the first word under *= and
   $= (it may be the tail of a longer class) and the last under *=, ^= and |=
   (it may be the head of one). */
function attrTargets(attr, t, hits) {
  const a =
    /^\[\s*class\s*([~|^$*]?=)\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^\s\]]+))\s*([is])?\s*\]$/i.exec(
      attr,
    )
  if (!a) return
  const op = a[1]
  let value = unescapeCss(a[2] ?? a[3] ?? a[4] ?? "")
  if (a[5]?.toLowerCase() === "i") value = value.toLowerCase()
  if (!value.trim() || (op === "~=" && /\s/.test(value))) return
  const words = value.split(/\s+/)
  const fromStart = op === "=" || op === "~=" || op === "^=" || op === "|="
  const toEnd = op === "=" || op === "~=" || op === "$="
  words.forEach((word, k) => {
    if (!word) return
    const start = k > 0 || fromStart
    const end = k < words.length - 1 || toEnd
    /* |= matches the value itself or the value followed by "-" */
    const last = k === words.length - 1
    const hit =
      op === "|=" && last
        ? t.fragment(word, start, true) || t.fragment(`${word}-`, start, false)
        : t.fragment(word, start, end)
    if (hit) hits.add(start && end ? utilityOf(word) : `[class${op}"${value}"]`)
  })
}

/* Two guards that hold for ANY stylesheet Tailwind compiles in this repo, not
   only the design system's: a type-scale utility reaches every call site from
   whichever stylesheet re-opens it. structuralChecks runs them over the ui
   stylesheets; collectRepo runs them over every other .css file it scans,
   whose value scan alone needs a digit or a size keyword and so misses
   `line-height: normal` or `var(--leading-loose)`. Hits are `structure`, which
   cannot be allowlisted. */
function cssRuleGuards(label, css, guarded) {
  const out = []
  const fail = (line, match, evidence) =>
    out.push({
      file: label,
      line,
      rule: "structure",
      match,
      context: "source",
      evidence,
    })
  const src = stripCssComments(css)
  const lineOf = (i) => src.slice(0, i).split("\n").length

  /* (g) a namespace reset. `--text-*: initial` (or `--*: initial`) deletes every
     stock size along with whatever the design system declares, in everything
     the stylesheet builds; text-sm would stop compiling. The decision is that
     stock text-xs…5xl stay, so a reset is never legitimate here. */
  for (const m of src.matchAll(
    /(?<![\w-])--(?:(text|tracking|leading)-)?\*\s*:\s*([^;{}]*)/g,
  ))
    fail(
      lineOf(m.index),
      `${m[1] ? `--${m[1]}-*` : "--*"} namespace reset`,
      `${m[0].trim()} — removes stock ${m[1] ? `${m[1]}-*` : "theme"} utilities from everything this stylesheet builds; the type scale keeps the stock sizes and adds beside them`,
    )

  /* (i) a rule that adds declarations to a type-scale class. A hand-written
     `.text-body { line-height: … }`, `@utility text-body { … }` or functional
     `@utility text-* { … }` puts a line-height on every call site, which is
     exactly what size-only Tier 1 forbids. Covers every stock and custom
     text/tracking name, through variants, escapes, :is()/:where() and class
     attribute selectors — but only in the rule's subject (selectorTargets):
     `.text-sm svg { … }` styles the svg, not the type element. */
  const guardedClasses = Object.entries(guarded).flatMap(([ns, set]) =>
    [...set].map((n) => `${ns}-${n}`),
  )
  const isGuarded = (utility) => {
    const m = /^(text|tracking)-(.+)$/.exec(utility)
    return !!m && guarded[m[1]].has(m[2])
  }
  /* A functional `@utility <root>-*` serves every candidate `<root>-<value>`
     whose value its --value() resolves. Measured with Tailwind 4.3.3
     compile(): `@utility text-body-* { line-height: --value(--text-body-*) }`
     emits `.text-body-sm { line-height: … }` (and leaves bare text-body alone),
     so the root is a prefix: text-* reaches every name, text-body-* reaches
     body-sm/-md/-lg, tracking-ti-* reaches nothing. */
  const isGuardedUtility = (name) => {
    const m = /^(text|tracking)-(.*)$/.exec(name)
    if (!m) return false
    if (!m[2].endsWith("*")) return guarded[m[1]].has(m[2])
    const prefix = m[2].slice(0, -1)
    return [...guarded[m[1]]].some((n) => n.startsWith(prefix) && n !== prefix)
  }
  for (const m of src.matchAll(/@utility\s+((?:\\.|[^\s{;])+)/g)) {
    const name = unescapeCss(m[1])
    if (isGuardedUtility(name))
      fail(
        lineOf(m.index),
        `@utility ${name} redefines a type-scale utility`,
        `adds its declarations to every ${name.endsWith("*") ? name.replace(/\*$/, "<value>") : name} call site — Tier 1 is size-only`,
      )
  }
  const targets = {
    isGuarded,
    /* one word of a class attribute value. `start`/`end`: whether the word is
       known to begin/finish a class (the operator and the whitespace around it
       decide). A word that is only a fragment counts when it still names the
       namespace in full — `text-`, `tracking-` — so [class*="in"] and
       [class^="a"] stay clean while [class*="text-"] and [class$="text-lead"]
       do not. */
    fragment(word, start, end) {
      let u = word
      const cut = variantCut(u)
      if (cut > 0) {
        u = u.slice(cut)
        start = true
      }
      if (start) u = u.replace(/^!/, "").replace(/^-/, "")
      const slash = u.indexOf("/")
      if (slash >= 0) {
        u = u.slice(0, slash)
        end = true
      }
      if (u.endsWith("!")) {
        u = u.slice(0, -1)
        end = true
      }
      if (!/(?:text|tracking)-/.test(u)) return false
      return guardedClasses.some((g) =>
        start ? (end ? g === u : g.startsWith(u)) : end ? g.endsWith(u) : g.includes(u),
      )
    },
  }
  for (const m of src.matchAll(/(?<=^|[{};])([^{};]*)\{/g)) {
    const prelude = m[1].trim()
    if (!prelude || prelude.startsWith("@")) continue
    const at = m.index + m[0].indexOf(prelude)
    const hits = new Set()
    selectorTargets(prelude, targets, hits)
    if (hits.size)
      fail(
        lineOf(at),
        `rule targets ${[...hits].join(", ")}`,
        `${prelude.slice(0, 100)} { … } — adds declarations to type-scale call sites; Tier 1 is size-only`,
      )
  }
  return out
}

function structuralChecks(cssFiles, tsPath, tsLabel) {
  const out = []
  const fail = (file, line, match, evidence) =>
    out.push({ file, line, rule: "structure", match, context: "source", evidence })
  let ts
  for (const f of cssFiles)
    if (f.css == null) fail(f.label, 1, "missing stylesheet", `cannot read ${f.label}`)
  if (!cssFiles.length || cssFiles[0].css == null) return out
  try {
    ts = fs.readFileSync(tsPath, "utf8")
  } catch {
    fail(tsLabel, 1, "missing merge config", `cannot read ${tsLabel}`)
    return out
  }

  const stock = stockTheme()
  const readable = cssFiles.filter((f) => f.css != null)
  /* one theme: every @theme declaration of every file, each citing its own file */
  const decls = readable.flatMap((f) =>
    themeDeclarations(f.css).map((d) => ({ ...d, file: f.label })),
  )
  const where = (d) => `${d.file}:${d.line}`
  const custom = { text: new Map(), tracking: new Map() }
  const colours = new Map()
  for (const d of decls) {
    const c = /^--color-([\w-]+)$/.exec(d.name)
    if (c) colours.set(c[1], d)
    const t = /^--(text|tracking|leading)-([a-z0-9][\w-]*?)(--([\w-]+))?$/.exec(d.name)
    if (!t) continue
    const [, ns, name, , companion] = t
    /* (d) a stock typography name redefined, base or companion */
    if (stock[ns].has(name)) {
      fail(
        d.file,
        d.line,
        `${d.name} overrides stock Tailwind`,
        `${d.name}: ${d.value} — the published stylesheet would change every consumer's ${ns}-${name}`,
      )
      continue
    }
    if (ns === "leading") continue
    if (companion) {
      /* (c) Tier 1 is size-only */
      if (ns === "text")
        fail(
          d.file,
          d.line,
          `${d.name} is a companion`,
          `${d.name}: ${d.value} — a custom --text-* token may not carry --line-height, --letter-spacing or --font-weight`,
        )
      continue
    }
    /* (e) one declaration per token: a second @theme that re-values it wins
       or loses by import order, and either way one of them is a lie */
    const prev = custom[ns].get(name)
    if (prev) {
      fail(
        d.file,
        d.line,
        `${d.name} is declared twice`,
        `${d.name}: ${d.value} here and ${prev.value} at ${where(prev)} — one @theme declaration per token`,
      )
      continue
    }
    custom[ns].set(name, d)
  }

  /* (b) a --text-<name> that is also a colour makes text-<name> emit only
     colour. Custom sizes against any colour (declared or stock); stock sizes
     against a declared colour — --color-base would break text-base. */
  for (const name of stock.text)
    if (colours.has(name)) {
      const c = colours.get(name)
      fail(
        c.file,
        c.line,
        `--color-${name} collides with stock --text-${name}`,
        `text-${name} would compile to a colour and drop the font size (--color-${name} at ${where(c)})`,
      )
    }
  for (const [name, d] of custom.text) {
    if (colours.has(name) || stock.color.has(name)) {
      const c = colours.get(name)
      fail(
        c ? c.file : d.file,
        c ? c.line : d.line,
        `--text-${name} collides with --color-${name}`,
        `text-${name} would compile to a colour and drop the font size (--text-${name} at ${where(d)}${c ? `, --color-${name} at ${where(c)}` : ", a stock colour"})`,
      )
    }
  }

  /* (f) a type-scale variable re-valued outside @theme. :root wins over the
     theme layer, so `:root { --text-body: 1rem }` in any of these files changes
     every text-body (or, for a stock name, every consumer's text-sm). A name
     that is not a utility — --tracking-body, read only by the body rule — is
     not covered: no class reads it. */
  for (const f of readable) {
    for (const d of nonThemeDeclarations(f.css)) {
      const t = /^--(text|tracking|leading)-([a-z0-9][\w-]*?)(--[\w-]+)?$/.exec(d.name)
      if (!t) continue
      const [, ns, name] = t
      if (stock[ns].has(name) || custom[ns]?.has(name))
        fail(
          f.label,
          d.line,
          `${d.name} is declared outside @theme`,
          `${d.name}: ${d.value} — re-values ${ns}-${name} for every element; declare type-scale tokens once, in @theme`,
        )
    }
  }

  /* (g) a namespace reset and (i) a rule that adds declarations to a type-scale
     class: see cssRuleGuards, which collectRepo also runs over every other
     stylesheet in the workspaces. */
  const guarded = guardedTypeNames(readable)
  for (const f of readable) out.push(...cssRuleGuards(f.label, f.css, guarded))

  /* (h) the Tier-1 values, pinned. The type-scale migration replaced arbitrary
     classes value for value, and the visual gate proved that only for these
     exact values; a re-valued token moves every call site at once and no value
     scan reads this file. Changing one is a deliberate decision, made here. */
  const norm = (v) => v.replace(/\s+/g, "").toLowerCase()
  for (const [ns, pins] of [
    ["text", PINNED_TEXT],
    ["tracking", PINNED_TRACKING],
  ])
    for (const [name, value] of Object.entries(pins)) {
      const d = custom[ns].get(name)
      if (!d)
        fail(
          cssFiles[0].label,
          1,
          `--${ns}-${name} is missing`,
          `The type scale pins --${ns}-${name}: ${value} in @theme`,
        )
      else if (norm(d.value) !== norm(value))
        fail(
          d.file,
          d.line,
          `--${ns}-${name} is re-valued`,
          `--${ns}-${name}: ${d.value} — pinned to ${value}; every call site was proved against that value`,
        )
    }
  /* body tracking: one plain declaration outside @theme (so no utility exists
     for it), read by the body rule */
  {
    const [name, value] = BODY_TRACKING
    const found = readable.flatMap((f) =>
      nonThemeDeclarations(f.css)
        .filter((d) => d.name === name)
        .map((d) => ({ ...d, file: f.label })),
    )
    if (found.length !== 1)
      fail(
        found[1]?.file ?? cssFiles[0].label,
        found[1]?.line ?? 1,
        `${name} is declared ${found.length} times outside @theme`,
        `expected exactly one ${name}: ${value} in :root${found.length ? ` (${found.map(where).join(", ")})` : ""}`,
      )
    for (const d of found)
      if (norm(d.value) !== norm(value))
        fail(
          d.file,
          d.line,
          `${name} is re-valued`,
          `${name}: ${d.value} — pinned to ${value}`,
        )
  }

  /* (a) the merge config names exactly the custom @theme names */
  let lists
  try {
    lists = mergeLists(ts)
  } catch (e) {
    fail(tsLabel, 1, "unreadable extendTailwindMerge config", e.message)
    return out
  }
  for (const ns of ["text", "tracking"]) {
    const declared = new Set(custom[ns].keys())
    const registered = lists ? lists[ns] : []
    const reg = new Set(registered)
    for (const n of registered.filter((n, i) => registered.indexOf(n) !== i))
      fail(tsLabel, 1, `theme.${ns} lists "${n}" twice`, "")
    for (const n of declared) {
      if (!reg.has(n))
        fail(
          tsLabel,
          1,
          `theme.${ns} is missing "${n}"`,
          `--${ns}-${n} is declared in @theme (${where(custom[ns].get(n))}) but not registered with tailwind-merge — ${ns === "text" ? "it merges as a text colour" : "it never conflicts with other tracking"}`,
        )
    }
    for (const n of reg) {
      if (!declared.has(n))
        fail(
          tsLabel,
          1,
          `theme.${ns} has extra "${n}"`,
          `no --${ns}-${n} in @theme — twMerge would delete real classes in favour of a utility that does not exist`,
        )
    }
  }
  return out
}

/* Every name text-<name> resolves as a font size: stock Tailwind's and the
   custom @theme ones (companions excluded). */
function typeSizeNames(cssFiles) {
  const names = new Set(stockTheme().text)
  for (const f of cssFiles) {
    if (f.css == null) continue // no stylesheet: stock names only
    for (const d of themeDeclarations(f.css)) {
      const t = /^--text-([a-z0-9][\w-]*)$/.exec(d.name)
      if (t && !t[1].includes("--")) names.add(t[1])
    }
  }
  return names
}

/* ---- collect occurrences ------------------------------------------------- */

/* Repo-relative directories Tailwind scans for the entry stylesheets: the paths
   their @source lines name (a glob is cut back to its static prefix;
   `@source not` and `@source inline()` name no directory). Automatic detection
   adds nothing here: it runs from a consumer's own project root, which is not
   this repository. Read live, so moving a @source line moves this scope with
   it. */
function tailwindSourceDirs() {
  const dirs = new Set()
  const read = (rel) => {
    try {
      return stripCssComments(fs.readFileSync(path.join(root, rel), "utf8"))
    } catch {
      return null
    }
  }
  for (const rel of ENTRY_CSS) {
    const css = read(rel)
    if (css == null) continue
    for (const m of css.matchAll(/@source\s+(?!not\b)(["'])([^"']+)\1/g)) {
      let p = m[2]
      const glob = p.search(/[*?{[]/)
      if (glob >= 0) p = p.slice(0, glob)
      const abs = path.resolve(path.dirname(path.join(root, rel)), p || ".")
      const r = path.relative(root, abs).split(path.sep).join("/")
      if (r.startsWith("..") || path.isAbsolute(r)) continue
      dirs.add(r)
    }
  }
  return [...dirs].sort()
}

/* What collectRepo does with one repo-relative path. */
function scopeOf(rel, sourceDirs) {
  const base = path.posix.basename(rel)
  if (base === "package.json") return "package.json"
  if (EXCLUDED(rel)) return "skipped: the token layer itself (structural checks only)"
  const underSource = sourceDirs.some(
    (d) => d === "" || rel === d || rel.startsWith(d + "/"),
  )
  const read =
    SOURCE.test(rel) || (TAILWIND_TEXT.test(rel) && !CONFIG_JSON(base) && underSource)
  if (!read)
    return CONFIG_JSON(base)
      ? "skipped: tool config JSON"
      : TAILWIND_TEXT.test(rel)
        ? "skipped: not under a directory Tailwind scans"
        : "skipped: not a scanned extension"
  return TEST(rel) ? "import rules" : "every rule"
}

function collectRepo() {
  let files
  try {
    files = execFileSync(
      "git",
      [
        "ls-files",
        "--cached",
        "--others",
        "--exclude-standard",
        "--",
        ...WORKSPACES,
        "package.json",
      ],
      {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      },
    )
      .split("\n")
      .filter(Boolean)
  } catch {
    usage("not a git repository, or git is unavailable.")
  }
  files = [...new Set(files)].sort()
  const sheets = uiStylesheets(path.join(root, INDEX_CSS), INDEX_CSS)
  const sizeNames = typeSizeNames(sheets)
  const sourceDirs = tailwindSourceDirs()
  const guarded = guardedTypeNames(sheets)
  /* the ui stylesheets get the rule guards inside structuralChecks */
  const sheetLabels = new Set(sheets.map((s) => s.label))
  const occ = []
  let scanned = 0
  for (const rel of files) {
    const scope = scopeOf(rel, sourceDirs)
    if (scope.startsWith("skipped")) continue
    let text
    try {
      text = fs.readFileSync(path.join(root, rel), "utf8")
    } catch {
      continue
    }
    if (scope === "package.json") {
      occ.push(...scanPackageJson(rel, text))
      scanned++
      continue
    }
    if (text.includes("\u0000")) continue
    scanned++
    occ.push(
      ...scanText(rel, text, {
        valueRules: !TEST(rel),
        importRules: true,
        sizeNames,
      }),
    )
    if (/\.css$/i.test(rel) && !TEST(rel) && !sheetLabels.has(rel))
      occ.push(...cssRuleGuards(rel, text, guarded))
  }
  occ.push(...structuralChecks(sheets, path.join(root, UTILS_TS), UTILS_TS))
  return { occ, scanned }
}

function collectFixtures(paths) {
  const occ = []
  const cssArg = valueOf("--index-css")
  const sheets = cssArg
    ? uiStylesheets(path.resolve(cssArg), cssArg)
    : uiStylesheets(path.join(root, INDEX_CSS), INDEX_CSS)
  const sizeNames = typeSizeNames(sheets)
  for (const p of paths) {
    const abs = path.resolve(p)
    let text
    try {
      text = fs.readFileSync(abs, "utf8")
    } catch {
      usage(`cannot read ${p}`)
    }
    const label = abs.replace(/\\/g, "/")
    if (path.basename(abs) === "package.json") occ.push(...scanPackageJson(label, text))
    else {
      occ.push(
        ...scanText(label, text, {
          valueRules: true,
          importRules: true,
          sizeNames,
        }),
      )
      if (/\.css$/i.test(abs))
        occ.push(...cssRuleGuards(label, text, guardedTypeNames(sheets)))
    }
  }
  const ts = valueOf("--utils")
  if (cssArg || ts) {
    if (!cssArg || !ts) usage("--index-css and --utils go together")
    occ.push(...structuralChecks(sheets, path.resolve(ts), ts))
  }
  return occ
}

/* ---- allowlist ----------------------------------------------------------- */

const keyOf = (o) => `${o.file}\u0000${o.rule}\u0000${o.match}\u0000${o.context}`

function tally(occ) {
  const map = new Map()
  for (const o of occ) {
    if (HARD_RULES.has(o.rule)) continue
    const k = keyOf(o)
    if (!map.has(k))
      map.set(k, {
        file: o.file,
        rule: o.rule,
        match: o.match,
        context: o.context,
        count: 0,
        label: labelFor(o),
        lines: [],
      })
    const e = map.get(k)
    e.count++
    e.lines.push(o.line)
  }
  return map
}

function readAllowlist() {
  let raw
  try {
    raw = fs.readFileSync(ALLOWLIST, "utf8")
  } catch {
    usage(
      `no allowlist at ${path.relative(root, ALLOWLIST)} — run \`node scripts/check-tokens.mjs --init\``,
    )
  }
  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    usage(`allowlist is not valid JSON: ${e.message}`)
  }
  if (!Array.isArray(data.entries)) usage("allowlist has no `entries` array")
  const map = new Map()
  for (const e of data.entries) {
    if (
      !e.file ||
      !e.rule ||
      typeof e.match !== "string" ||
      !Number.isInteger(e.count) ||
      e.count < 1
    ) {
      usage(`malformed allowlist entry: ${JSON.stringify(e)}`)
    }
    if (HARD_RULES.has(e.rule))
      usage(`rule "${e.rule}" cannot be allowlisted: ${JSON.stringify(e)}`)
    const k = keyOf({ ...e, context: e.context ?? "source" })
    if (map.has(k)) usage(`duplicate allowlist entry: ${JSON.stringify(e)}`)
    map.set(k, { ...e, context: e.context ?? "source" })
  }
  return { data, map }
}

const HEADER =
  "Ratchet for scripts/check-tokens.mjs. Each entry grandfathers `count` occurrences of an exact `match` for one `rule` in one `file`; `context` is `code` when the match is visible text inside a docs code sample. `label` names the phase that removes it and is free text. New occurrences fail; so do entries that cover more than exists. Shrink with `npm run tokens:check -- --prune`. Never add entries by hand to get a build through."

function writeAllowlist(entries) {
  const sorted = [...entries].sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.rule.localeCompare(b.rule) ||
      a.match.localeCompare(b.match) ||
      a.context.localeCompare(b.context),
  )
  const body = {
    $comment: HEADER,
    entries: sorted.map(({ file, rule, match, context, count, label }) => ({
      file,
      rule,
      match,
      context,
      count,
      label,
    })),
  }
  fs.writeFileSync(ALLOWLIST, JSON.stringify(body, null, 2) + "\n")
}

/* ---- report -------------------------------------------------------------- */

function printSummary(entries, title) {
  const byRule = new Map()
  const byLabel = new Map()
  let total = 0
  for (const e of entries) {
    byRule.set(e.rule, (byRule.get(e.rule) ?? 0) + e.count)
    byLabel.set(e.label, (byLabel.get(e.label) ?? 0) + e.count)
    total += e.count
  }
  console.log(
    `\n${title}: ${total} occurrences in ${new Set(entries.map((e) => e.file)).size} files, ${entries.length} entries`,
  )
  console.log("  by rule:")
  for (const [k, v] of [...byRule].sort((a, b) => b[1] - a[1]))
    console.log(`    ${String(v).padStart(5)}  ${k}`)
  console.log("  by label:")
  for (const [k, v] of [...byLabel].sort((a, b) => b[1] - a[1]))
    console.log(`    ${String(v).padStart(5)}  ${k}`)
}

function printHard(hard) {
  for (const v of hard) {
    console.error(`  ✗ ${v.file}:${v.line}  [${v.rule}] ${v.match}`)
    if (v.evidence) console.error(`      ${v.evidence}`)
  }
}

/* ---- main ---------------------------------------------------------------- */

if (SCOPE_PATHS) {
  if (FIXTURE_FILES || MODE_INIT || MODE_PRUNE || BASE_REF)
    usage("--scope only reports which rules a path gets")
  const dirs = tailwindSourceDirs()
  console.log(`directories Tailwind scans: ${dirs.join(", ")}`)
  for (const rel of SCOPE_PATHS) {
    const inWs = rel === "package.json" || WORKSPACES.some((w) => rel.startsWith(w))
    console.log(
      `${rel}\t${inWs ? scopeOf(rel, dirs) : "skipped: outside the workspaces"}`,
    )
  }
  process.exit(0)
}

if (FIXTURE_FILES) {
  const occ = collectFixtures(FIXTURE_FILES)
  for (const o of occ)
    console.log(
      `${o.file}:${o.line}\t[${o.rule}]\t${o.match}${o.context === "code" ? "\t(code sample)" : ""}`,
    )
  console.log(`\n${occ.length} hit(s)`)
  process.exit(occ.length ? 1 : 0)
}

if (BASE_REF) {
  const git = (args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    })
  try {
    git(["rev-parse", "--verify", "--quiet", `${BASE_REF}^{tree}`])
  } catch {
    usage(
      `--base: "${BASE_REF}" is not a commit or tree git can see (in CI, check out with fetch-depth: 0)`,
    )
  }
  const relList = path.relative(root, ALLOWLIST).split(path.sep).join("/")
  let baseText = null
  try {
    baseText = git(["show", `${BASE_REF}:${relList}`])
  } catch {
    /* the ref has no allowlist */
  }
  if (baseText === null) {
    console.log(`✓ ${BASE_REF} has no ${relList}: nothing to ratchet against`)
    process.exit(0)
  }
  let baseEntries
  try {
    baseEntries = JSON.parse(baseText).entries
  } catch (e) {
    usage(`--base: ${BASE_REF}:${relList} is not valid JSON: ${e.message}`)
  }
  if (!Array.isArray(baseEntries))
    usage(`--base: ${BASE_REF}:${relList} has no entries array`)
  const baseCounts = new Map(
    baseEntries.map((e) => [keyOf({ ...e, context: e.context ?? "source" }), e.count]),
  )
  const { map: current } = readAllowlist()
  /* Growth is judged per (rule, match, context) across the whole list, not per
     file: renaming or moving a file that holds grandfathered values gives its
     entries a new key without adding a single raw value. A per-file increase
     counts only when the repo-wide total for that value rose too. Moving one
     occurrence from file A to file B in the same change is net zero, and
     tokens:check (without --base) still proves B's count against the tree. */
  const valueKey = (e) => `${e.rule}\u0000${e.match}\u0000${e.context ?? "source"}`
  const totals = (entries) => {
    const t = new Map()
    for (const e of entries) t.set(valueKey(e), (t.get(valueKey(e)) ?? 0) + e.count)
    return t
  }
  const baseTotals = totals(baseEntries)
  const curTotals = totals(current.values())
  const grew = []
  const moved = []
  for (const [k, e] of current) {
    const was = baseCounts.get(k)
    if (was !== undefined && e.count <= was) continue
    const v = valueKey(e)
    const row = {
      ...e,
      was: was ?? 0,
      totalWas: baseTotals.get(v) ?? 0,
      totalNow: curTotals.get(v),
    }
    if (row.totalNow > row.totalWas) grew.push(row)
    else moved.push(row)
  }
  for (const mv of moved)
    console.log(
      `  · ${mv.file}  [${mv.rule}] ${mv.match} — ${mv.was} → ${mv.count} here, but ${mv.totalWas} → ${mv.totalNow} repo-wide (a rename or move, not growth)`,
    )
  if (grew.length) {
    console.error(
      `\ntokens:check --base ${BASE_REF} — the allowlist grew in ${grew.length} entr${grew.length === 1 ? "y" : "ies"}:\n`,
    )
    for (const g of grew)
      console.error(
        `  ✗ ${g.file}  [${g.rule}] ${g.match}${g.context === "code" ? " (code sample)" : ""} — ${g.was} → ${g.count} here, ${g.totalWas} → ${g.totalNow} repo-wide`,
      )
    console.error(
      "\nThe allowlist only shrinks. Use a token instead of adding the raw value; see the Tokens convention in CONTRIBUTING.md.\n",
    )
    process.exit(1)
  }
  const before = [...baseCounts.values()].reduce((s, n) => s + n, 0)
  const after = [...current.values()].reduce((s, e) => s + e.count, 0)
  console.log(
    `✓ allowlist did not grow against ${BASE_REF}: ${before} → ${after} occurrence(s), no value counted more often than before`,
  )
  process.exit(0)
}

const { occ, scanned } = collectRepo()
const hard = occ.filter((o) => HARD_RULES.has(o.rule))
const found = tally(occ)

if (MODE_INIT) {
  if (fs.existsSync(ALLOWLIST) && !FORCE)
    usage(`${path.relative(root, ALLOWLIST)} exists; pass --force to regenerate it`)
  writeAllowlist(found.values())
  printSummary(
    [...found.values()],
    `wrote ${path.relative(root, ALLOWLIST).replace(/\\/g, "/")}`,
  )
  if (hard.length) {
    console.error(
      `\ntokens:check — ${hard.length} violation(s) that cannot be allowlisted:\n`,
    )
    printHard(hard)
    process.exit(1)
  }
  process.exit(0)
}

const { map: allowed } = readAllowlist()
const fresh = []
const stale = []
for (const [k, e] of found) {
  const a = allowed.get(k)
  if (!a) fresh.push({ ...e, over: e.count })
  else if (e.count > a.count)
    fresh.push({ ...e, over: e.count - a.count, allowed: a.count })
}
for (const [k, a] of allowed) {
  const e = found.get(k)
  const n = e ? e.count : 0
  if (n < a.count) stale.push({ ...a, found: n })
}

if (MODE_PRUNE) {
  const kept = []
  for (const [k, a] of allowed) {
    const e = found.get(k)
    const n = e ? e.count : 0
    if (n === 0) continue
    kept.push({ ...a, count: Math.min(a.count, n) })
  }
  writeAllowlist(kept)
  const removed = stale.reduce((s, x) => s + (x.count - x.found), 0)
  console.log(
    `✓ pruned ${stale.length} stale entr${stale.length === 1 ? "y" : "ies"} (${removed} occurrence(s)); added nothing`,
  )
  stale.length = 0
  allowed.clear()
  for (const a of kept) allowed.set(keyOf(a), a)
}

if (SUMMARY) printSummary([...allowed.values()], "allowlist")

if (hard.length || fresh.length || stale.length) {
  const n = hard.length + fresh.reduce((s, x) => s + x.over, 0) + stale.length
  console.error(`\ntokens:check — ${n} problem(s):\n`)
  if (hard.length) {
    console.error("Never allowed (no allowlist covers these):")
    printHard(hard)
    console.error("")
  }
  if (fresh.length) {
    console.error("Raw values the allowlist does not cover — use a token instead:")
    for (const f of fresh) {
      const where = f.lines.map((l) => `${f.file}:${l}`).join(", ")
      console.error(
        `  ✗ [${f.rule}] ${f.match}${f.context === "code" ? " (code sample)" : ""}`,
      )
      console.error(
        `      ${f.allowed != null ? `${f.count} found, ${f.allowed} allowed — ` : ""}${where}`,
      )
    }
    console.error("")
  }
  if (stale.length) {
    console.error(
      "Stale allowlist entries — the occurrence is gone; shrink the list with `npm run tokens:check -- --prune`:",
    )
    for (const s of stale)
      console.error(
        `  ✗ ${s.file}  [${s.rule}] ${s.match}${s.context === "code" ? " (code sample)" : ""} — allowed ${s.count}, found ${s.found}`,
      )
    console.error("")
  }
  console.error(
    "See the Tokens convention in CONTRIBUTING.md. Do not add allowlist entries to get a build through.\n",
  )
  process.exit(1)
}

const total = [...allowed.values()].reduce((s, e) => s + e.count, 0)
console.log(
  `✓ ${scanned} files: no raw values beyond the ${total} grandfathered in ${path.relative(root, ALLOWLIST).replace(/\\/g, "/")}`,
)
