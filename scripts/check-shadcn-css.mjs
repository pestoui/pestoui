#!/usr/bin/env node
/**
 * Fail if the vendored shadcn stylesheet drifts from the installed shadcn.
 *   node scripts/check-shadcn-css.mjs
 *
 * packages/ui/src/styles/shadcn.css is a byte-for-byte copy of the stylesheet
 * the shadcn package ships at dist/tailwind.css (MIT; see NOTICE.md). It is
 * copied so that the published package no longer depends on the shadcn CLI at
 * runtime — that dependency pulled the CLI's whole server stack into every
 * consumer's install. shadcn stays a root devDependency for the CLI itself.
 *
 * When a shadcn update changes the upstream file, this fails, so the new copy
 * is taken on purpose instead of arriving unseen: copy dist/tailwind.css over
 * the vendored file, then check it in the website's browser suites, which are
 * kept in a separate private repository.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const VENDORED = "packages/ui/src/styles/shadcn.css"
const UPSTREAM = "node_modules/shadcn/dist/tailwind.css"

const read = (rel) => {
  try {
    return fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n")
  } catch {
    return null
  }
}

const vendored = read(VENDORED)
const upstream = read(UPSTREAM)

if (vendored === null) {
  console.error(`check:shadcn-css — ${VENDORED} is missing.`)
  process.exit(1)
}
if (upstream === null) {
  console.error(
    `check:shadcn-css — ${UPSTREAM} is missing; run npm install (shadcn is a root devDependency).`,
  )
  process.exit(2)
}
if (vendored !== upstream) {
  const version = JSON.parse(
    fs.readFileSync(path.join(root, "node_modules/shadcn/package.json"), "utf8"),
  ).version
  console.error(
    `check:shadcn-css — ${VENDORED} differs from shadcn ${version}'s dist/tailwind.css.\n` +
      "Copy the new file over the vendored one on purpose, then check it in the website's browser suites.",
  )
  process.exit(1)
}
console.log(`✓ ${VENDORED} matches the installed shadcn's stylesheet`)
