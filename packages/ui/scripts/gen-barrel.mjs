#!/usr/bin/env node
/**
 * Regenerate the barrel exports after adding or removing components.
 *   npm run gen:barrel
 *
 * Emits **explicit named re-exports**, never `export *`.
 *
 * Why this is a Node script and not the shell one-liner it replaces: a barrel
 * can only name what a module exports if something actually parses the module.
 * The previous version emitted `export * from "./x"` because that is the only
 * thing a shell loop can know how to write — which quietly violated the repo's
 * own rule and, worse, silently clobbered any hand-written named exports the
 * next time anyone regenerated.
 *
 * `export *` defeats Rollup's side-effect analysis: a consumer importing one
 * component pulls the whole surface into the module graph and tree-shaking has
 * to prove each re-export unused rather than never seeing it.
 *
 * Values and types are emitted separately (`export { … }` / `export type { … }`)
 * so the barrel stays correct under `isolatedModules` / `verbatimModuleSyntax`,
 * where a type re-exported through a value clause is a build error.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

/* `--check` generates in memory and fails if any barrel on disk differs, without
   writing. CI runs it: HEAD once shipped a `components/ui/index.ts` missing
   `cardVariants`, and nothing noticed, because regenerating was a habit rather
   than a gate. A plain `git diff --exit-code` after regenerating would also fail
   on every uncommitted change, so the comparison is against the working tree. */
const CHECK = process.argv.includes("--check")
const stale = []

function write(file, content) {
  if (!CHECK) return fs.writeFileSync(file, content, "utf8")
  const onDisk = fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    : null
  if (onDisk !== content) stale.push(path.relative(root, file).split(path.sep).join("/"))
}

/** Collect the exported value and type names of one module, in source order. */
function collectExports(file) {
  const text = fs.readFileSync(file, "utf8")
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX
  )

  const values = new Set()
  const types = new Set()
  let sawDefault = false

  const isExported = (node) =>
    ts.canHaveModifiers(node) &&
    ts
      .getModifiers(node)
      ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)

  const isDefault = (node) =>
    ts.canHaveModifiers(node) &&
    ts
      .getModifiers(node)
      ?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)

  /** Destructuring in an exported const still exports each bound name. */
  const bindingNames = (name, into) => {
    if (ts.isIdentifier(name)) into.add(name.text)
    else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name))
      for (const el of name.elements)
        if (ts.isBindingElement(el)) bindingNames(el.name, into)
  }

  for (const node of sf.statements) {
    if (ts.isExportAssignment(node)) {
      sawDefault = true
      continue
    }

    // `export { a, b as c }` and `export … from "./x"` (re-exports)
    if (ts.isExportDeclaration(node)) {
      if (!node.exportClause) {
        // `export * from "./x"` — cannot be enumerated without resolving the
        // target. Surface it rather than silently dropping the names.
        console.warn(
          `  ! ${path.basename(file)}: contains \`export *\`, cannot enumerate — ` +
            `replace it with named exports`
        )
        continue
      }
      if (ts.isNamedExports(node.exportClause)) {
        for (const spec of node.exportClause.elements) {
          const name = spec.name.text
          if (node.isTypeOnly || spec.isTypeOnly) types.add(name)
          else values.add(name)
        }
      }
      continue
    }

    if (!isExported(node)) continue
    if (isDefault(node)) {
      sawDefault = true
      continue
    }

    if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
      if (node.name) values.add(node.name.text)
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations)
        bindingNames(decl.name, values)
    } else if (ts.isEnumDeclaration(node)) {
      values.add(node.name.text)
    } else if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      types.add(node.name.text)
    }
  }

  if (sawDefault)
    console.warn(
      `  ! ${path.basename(file)}: has a default export, which the barrel skips — ` +
        `prefer a named export`
    )

  return { values: [...values].sort(), types: [...types].sort() }
}

function gen(dir) {
  const abs = path.join(root, dir)
  const files = fs
    .readdirSync(abs)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => f.replace(/\.tsx$/, ""))
    .sort()

  const lines = [
    "// Auto-generated barrel — do not edit by hand. Run `npm run gen:barrel`.",
    "// Explicit named re-exports, never `export *` — see scripts/gen-barrel.mjs.",
    "",
  ]

  let empty = 0
  /** name → every module in this directory that exports it */
  const owners = new Map()
  for (const f of files) {
    const { values, types } = collectExports(path.join(abs, `${f}.tsx`))
    if (!values.length && !types.length) {
      empty++
      continue
    }
    // A type sharing a name with a value is already reachable through the
    // value export. Emitting both from one module is a duplicate the owners map
    // cannot see, because it deduplicates by name.
    const typeOnly = types.filter((n) => !values.includes(n))
    for (const name of new Set([...values, ...typeOnly]))
      owners.set(name, [...(owners.get(name) ?? []), `./${f}`])
    if (values.length) lines.push(`export { ${values.join(", ")} } from "./${f}"`)
    if (typeOnly.length) lines.push(`export type { ${typeOnly.join(", ")} } from "./${f}"`)
  }
  // Refuse to write on a collision, as the root target already does. Writing
  // anyway leaves a barrel the next build may resolve differently.
  if (!reportCollisions(`${dir}/index.ts`, owners)) return

  write(path.join(abs, "index.ts"), lines.join("\n") + "\n")
  console.log(
    `${CHECK ? "checked" : "wrote"} ${dir}/index.ts (${files.length - empty} modules` +
      (empty ? `, ${empty} with no exports skipped` : "") +
      ")"
  )
}

/**
 * A name exported from two places is a conflict, and it is reported rather than
 * resolved. Under `export *` the language resolves it for you: a name two star
 * re-exports both provide is ambiguous, and the module spec quietly leaves it
 * out of the namespace — the error only arrives when someone imports it. The
 * explicit form makes it a duplicate export, which is the point; this says
 * where it is before tsc does. Fails the run, writes nothing for the root, and
 * leaves picking a winner to whoever owns the two modules.
 */
function reportCollisions(target, owners) {
  const clashes = [...owners].filter(([, from]) => from.length > 1)
  if (!clashes.length) return true
  console.error(
    `  ✗ ${target}: ${clashes.length} name(s) exported from more than one place`,
  )
  for (const [name, from] of clashes)
    console.error(`      ${name}  ←  ${from.join(", ")}`)
  process.exitCode = 1
  return false
}

/* ------------------------------------------------------------- root barrel */

/**
 * The package's `.` entry point, generated rather than hand-written.
 *
 * It was hand-written once, as two `export *` lines, before this script existed
 * — and because the script was only ever pointed at the two component
 * directories, it kept those two lines through every regeneration since. It is
 * a target now, so it cannot drift from the sub-barrels again.
 *
 * It re-exports from the sub-barrels rather than from each module: the
 * sub-barrels are the published `./ui` and `./components` entry points, and
 * the root naming exactly what they name is the guarantee worth having. Each
 * sub-barrel is re-parsed from disk after it is written, so the root lists what
 * the barrel file actually exports, not what this script believes it wrote.
 */
const ROOT_SOURCES = [
  { from: "./components/ui", file: "src/components/ui/index.ts" },
  { from: "./components", file: "src/components/index.ts" },
  /* Only `cn` — the rest of lib/ is reachable through `./lib/*` and is not
     part of the root surface. */
  { from: "./lib/utils", file: "src/lib/utils.ts", pick: ["cn"] },
]

/* The usage example in the header names real exports; they are checked below
   so the example cannot rot into a lie. */
const EXAMPLE_NAMES = ["Button", "Dialog", "AgentCard", "cn"]

const PRINT_WIDTH = 88 // .prettierrc — the root is emitted already formatted

/** `export { a, b } from "x"`, broken one-per-line past the print width. */
function exportClause(keyword, names, from) {
  const flat = `${keyword} { ${names.join(", ")} } from "${from}"`
  if (flat.length <= PRINT_WIDTH) return flat
  return `${keyword} {\n${names.map((n) => `  ${n},\n`).join("")}} from "${from}"`
}

function genRoot() {
  /* A sub-barrel that already failed would be re-parsed with its duplicate
     collapsed to one name, and the root would look clean. Stop instead. */
  if (process.exitCode) {
    console.error(
      "  ✗ src/index.ts: not written — fix the sub-barrel errors above first",
    )
    return
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))
  const owners = new Map()
  const blocks = []
  let total = 0

  for (const { from, file, pick } of ROOT_SOURCES) {
    let { values, types } = collectExports(path.join(root, file))
    if (pick) {
      const missing = pick.filter((n) => !values.includes(n) && !types.includes(n))
      if (missing.length) {
        console.error(
          `  ✗ src/index.ts: ${file} no longer exports ${missing.join(", ")}`,
        )
        process.exitCode = 1
        return
      }
      values = values.filter((n) => pick.includes(n))
      types = types.filter((n) => pick.includes(n))
    }
    /* A name that is both a value and a type in its module (a const and a
       same-named type) is carried by the value clause; listing it again under
       `export type` would export it twice. */
    types = types.filter((n) => !values.includes(n))

    for (const name of [...values, ...types])
      owners.set(name, [...(owners.get(name) ?? []), from])
    if (values.length) blocks.push(exportClause("export", values, from))
    if (types.length) blocks.push(exportClause("export type", types, from))
    total += values.length + types.length
  }

  if (!reportCollisions("src/index.ts", owners)) return

  const missingExample = EXAMPLE_NAMES.filter((n) => !owners.has(n))
  if (missingExample.length) {
    console.error(
      `  ✗ src/index.ts: the header's usage example names ${missingExample.join(", ")}, ` +
        `which the root no longer exports — update EXAMPLE_NAMES and the header`,
    )
    process.exitCode = 1
    return
  }

  const header = [
    "// Pesto UI — library entry point.",
    "//",
    "// Consume the whole system from one import:",
    `//   import { ${EXAMPLE_NAMES.join(", ")} } from "${pkg.name}"`,
    "//",
    "// Styles are shipped separately — import once at your app root:",
    `//   import "${pkg.name}/styles.css"`,
    "//",
    "// Auto-generated — do not edit by hand. Run `npm run gen:barrel`.",
    "// Explicit named re-exports, never `export *` — see scripts/gen-barrel.mjs.",
    "",
  ]

  write(
    path.join(root, "src/index.ts"),
    header.join("\n") + "\n" + blocks.join("\n") + "\n",
  )
  console.log(
    `${CHECK ? "checked" : "wrote"} src/index.ts (${total} names from ${ROOT_SOURCES.length} modules)`,
  )
}

/* Order matters: the root is read from the two sub-barrels as written. */
gen("src/components/ui")
gen("src/components")
genRoot()

if (CHECK) {
  if (stale.length) {
    console.error(`\ncheck:barrel — ${stale.length} barrel(s) out of date:\n`)
    for (const f of stale) console.error(`  ✗ ${f}`)
    console.error("\nRun `npm run gen:barrel` and commit the result.\n")
    process.exitCode = 1
  } else {
    console.log("✓ barrels match their sources")
  }
}
console.log(process.exitCode ? "failed" : "done")
