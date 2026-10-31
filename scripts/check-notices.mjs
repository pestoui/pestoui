#!/usr/bin/env node
/**
 * Fail the build if a published copy of a legal file drifts from its source.
 *   node scripts/check-notices.mjs
 *
 * npm resolves a package's `files` globs against the *package* root, not the
 * repository root, so a NOTICE.md that lives only at the top of the repo is
 * dropped from the tarball with no warning — the published README then links
 * to a file the consumer never receives. The fix is the one LICENSE already
 * used: a committed copy inside each published package.
 *
 * A duplicated legal file is a drift hazard, and this repository has a long
 * record of hand-maintained copies going stale. So the copies are not trusted;
 * they are compared, byte for byte, on every CI run and before every release.
 * Edit the root file, then copy it down.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

/* source -> every copy that must match it */
const PAIRS = [
  ["LICENSE", ["packages/ui/LICENSE"]],
  ["NOTICE.md", ["packages/ui/NOTICE.md"]],
]

const failures = []
const norm = (b) => b.toString("utf8").replace(/\r\n/g, "\n") // line endings are git's business, not this check's

for (const [source, copies] of PAIRS) {
  const src = path.join(root, source)
  if (!fs.existsSync(src)) {
    failures.push(`${source} — source is missing`)
    continue
  }
  const want = norm(fs.readFileSync(src))
  for (const copy of copies) {
    const dst = path.join(root, copy)
    if (!fs.existsSync(dst)) {
      failures.push(`${copy} — missing; copy it from ${source}`)
    } else if (norm(fs.readFileSync(dst)) !== want) {
      failures.push(`${copy} — differs from ${source}; copy it down again`)
    }
  }
}

if (failures.length > 0) {
  console.error(`\ncheck:notices — ${failures.length} legal file(s) out of sync:\n`)
  for (const f of failures) console.error(`  ✗ ${f}`)
  console.error(
    "\nThe root copy is the source of truth. A published copy that differs ships" +
      "\nan attribution nobody reviewed.\n"
  )
  process.exit(1)
}

const n = PAIRS.reduce((a, [, c]) => a + c.length, 0)
console.log(`✓ ${n} published legal files match their source`)
