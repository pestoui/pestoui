#!/usr/bin/env node
/**
 * Verify every workspace entry point actually resolves.
 *   node scripts/check-exports.mjs
 *
 * Why this exists: `@pestoui/core` publishes TypeScript source rather than
 * a build, so nothing type-checks the `exports` map. A missing subpath is not a
 * compile error in the package — it is a module-resolution failure in whoever
 * installed it, which is the worst place to find out.
 *
 * Two directions, because either alone passes while the pair is broken:
 *
 *   1. Every subpath the map advertises points at a file that exists.
 *   2. Every specifier the repo actually imports is covered by a map.
 *
 * Resolution goes through Node's own resolver from the repository root — the
 * same code path a consumer's `npm install` takes — rather than a hand-rolled
 * reimplementation that could agree with a bug.
 */

import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const require = createRequire(pathToFileURL(path.join(root, "index.js")))

const WORKSPACES = ["packages/ui"]

const failures = []
let checked = 0

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"))

/** Resolve a bare specifier the way an installed consumer would. */
function resolves(specifier) {
  try {
    return require.resolve(specifier)
  } catch {
    return null
  }
}

/* ---- direction 1: everything the maps advertise ------------------------- */

const manifests = new Map()

for (const ws of WORKSPACES) {
  const manifestPath = path.join(root, ws, "package.json")
  const manifest = read(manifestPath)
  manifests.set(manifest.name, { ws, manifest })

  for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
    if (typeof target !== "string") continue

    /* A pattern key advertises a whole directory. Expanding it against the real
       files is the only way to catch a map whose extension is wrong — the
       literal `*` specifier would "resolve" and prove nothing. */
    if (subpath.includes("*")) {
      const [prefix, suffix] = target.split("*")
      /* `path.dirname` on a trailing slash drops a real segment — dirname of
         "./src/components/ui/" is "./src/components", which silently widens the
         search by one directory and matches nothing. Split on the slash. */
      const endsInSlash = prefix.endsWith("/")
      const dir = path.join(root, ws, endsInSlash ? prefix : path.dirname(prefix))
      if (!fs.existsSync(dir)) {
        failures.push(
          `${manifest.name}: exports "${subpath}" points at a missing directory ${dir}`,
        )
        continue
      }
      const base = endsInSlash ? "" : path.basename(prefix)
      const names = fs
        .readdirSync(dir)
        .filter((f) => f.startsWith(base) && f.endsWith(suffix))
        .map((f) => f.slice(base.length, f.length - suffix.length))
        .filter((n) => n && !n.includes(path.sep))

      if (names.length === 0) {
        failures.push(
          `${manifest.name}: exports "${subpath}" matches no files under ${dir}`,
        )
        continue
      }
      for (const name of names) {
        const specifier = path.posix.join(manifest.name, subpath.replace("*", name))
        checked++
        if (!resolves(specifier))
          failures.push(`${specifier} — advertised but does not resolve`)
      }
      continue
    }

    const specifier =
      subpath === "." ? manifest.name : path.posix.join(manifest.name, subpath.slice(2))
    checked++
    const resolved = resolves(specifier)
    if (!resolved) failures.push(`${specifier} — advertised but does not resolve`)
    else if (!fs.existsSync(resolved))
      failures.push(`${specifier} — resolves to a missing file ${resolved}`)
  }
}

/* ---- direction 2: everything the repo imports ---------------------------- */

const NAMES = [...manifests.keys()]
const SPECIFIER = /["'](@pestoui\/[^"'\n]+)["']/g

function* sources(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* sources(p)
    else if (/\.(tsx?|mjs|js)$/.test(entry.name)) yield p
  }
}

const seen = new Set()
for (const ws of WORKSPACES) {
  for (const file of sources(path.join(root, ws))) {
    const text = fs.readFileSync(file, "utf8")
    for (const [, specifier] of text.matchAll(SPECIFIER)) {
      if (!NAMES.some((n) => specifier === n || specifier.startsWith(`${n}/`))) continue
      if (specifier.endsWith(".css")) continue // resolved by the CSS pipeline, not Node
      if (seen.has(specifier)) continue
      seen.add(specifier)
      checked++
      if (!resolves(specifier)) {
        failures.push(
          `${specifier} — imported by ${path.relative(root, file)} but not exported`,
        )
      }
    }
  }
}

/* ---- report -------------------------------------------------------------- */

if (failures.length > 0) {
  console.error(`\n${failures.length} entry point(s) broken:\n`)
  for (const f of failures) console.error(`  ✗ ${f}`)
  console.error("")
  process.exit(1)
}

console.log(
  `✓ ${checked} entry points resolve (${seen.size} of them actually imported somewhere)`,
)
