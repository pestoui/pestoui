#!/usr/bin/env node
/**
 * Gate a tag before it becomes a published version.
 *   node scripts/check-release.mjs v0.1.0
 *   node scripts/check-release.mjs            # falls back to $GITHUB_REF_NAME
 *
 * Why this exists: `@pestoui/core` has no build step. `files` is
 * `["src", …]`, so `npm publish` copies the working tree — there is nothing
 * standing between what happens to be checked out and what strangers install,
 * and nothing anywhere forces the changelog to have been written first. A
 * hand-maintained CHANGELOG.md survives exactly as long as one maintainer keeps
 * remembering it. This converts remembering into a release gate.
 *
 * Four failures, each of them unfixable afterwards because npm will not let a
 * version number be republished:
 *
 *   1. A tag whose number disagrees with `packages/ui/package.json`. The tag is
 *      what an issue cites; the manifest is what npm records. Once they diverge,
 *      "which commit is 0.2.1?" has no answer.
 *   2. A version with no changelog section at all — the release ships with no
 *      account of what changed, and writing one next week does not reach anyone
 *      who already upgraded.
 *   3. Entries still sitting under `[Unreleased]`. The version heading was added
 *      but the bullets were never moved down into it, so the release notes come
 *      out empty while the work is one heading above them.
 *   4. A version heading with nothing under it, which publishes as "no changes"
 *      for a release that changed something.
 *
 * On success it writes that section's body — body only, since the GitHub Release
 * carries the version in its title — to `.release-notes.md`. The workflow uses
 * that file as the release body, so the notes on GitHub are the same text the
 * repository records rather than a second summary that can drift from it.
 *
 * Every problem is reported in one pass. A release attempt that fails four
 * checks should cost one run, not four.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const MANIFEST = "packages/ui/package.json"
const CHANGELOG = "packages/ui/CHANGELOG.md"
const NOTES = ".release-notes.md"

/* The SemVer 2.0.0 expression from semver.org, unmodified. Hand-rolling this is
   how `1.0` and `v1.2.3.4` get published. */
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

const failures = []
const fail = (file, problem, fix) => failures.push({ file, problem, fix })

const report = () => {
  console.error(
    `\ncheck:release — ${failures.length} problem(s). Nothing was published.\n`,
  )
  for (const f of failures) {
    console.error(`  ✗ ${f.file}`)
    console.error(`      ${f.problem}`)
    console.error(`      fix: ${f.fix}`)
  }
  console.error("")
  process.exit(1)
}

/* ---- the tag ------------------------------------------------------------- */

const tag = (process.argv[2] ?? process.env.GITHUB_REF_NAME ?? "").trim()

if (!tag) {
  console.error(
    "\ncheck:release — no tag given." +
      "\n  usage: node scripts/check-release.mjs v<major>.<minor>.<patch>" +
      "\n  in CI the tag comes from $GITHUB_REF_NAME.\n",
  )
  process.exit(1)
}

if (!tag.startsWith("v") || !SEMVER.test(tag.slice(1))) {
  fail(
    `tag ${tag}`,
    "not a v-prefixed semantic version.",
    "tag as v<major>.<minor>.<patch>, e.g. v0.2.0 or v0.2.0-rc.1. " +
      "Delete the bad tag before retagging — a published version cannot be taken back.",
  )
  report()
}

const version = tag.slice(1)

/* ---- the manifest agrees with the tag ------------------------------------ */

let manifest
try {
  manifest = JSON.parse(fs.readFileSync(path.join(root, MANIFEST), "utf8"))
} catch (err) {
  fail(MANIFEST, `could not be read or parsed: ${err.message}`, "restore the manifest.")
  report()
}

if (manifest.version !== version) {
  fail(
    MANIFEST,
    `"version" is ${JSON.stringify(manifest.version)} but the tag says ${version}.`,
    `set "version": "${version}", commit it, then move the tag onto that commit. ` +
      "npm records the manifest; people quote the tag. They have to be the same number.",
  )
}

/* ---- the changelog ------------------------------------------------------- */

let changelog
try {
  changelog = fs.readFileSync(path.join(root, CHANGELOG), "utf8")
} catch (err) {
  fail(CHANGELOG, `could not be read: ${err.message}`, "restore the changelog.")
  report()
}

/**
 * Split the file on its `##` headings. `###` subheadings stay inside the
 * section they belong to, because `^##\s` needs whitespace directly after two
 * hashes. Fenced blocks are skipped so a `## ` line inside a code sample does
 * not start a phantom section.
 */
function sections(text) {
  const out = []
  let current = null
  let fenced = false

  text.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
    if (!fenced && /^##\s/.test(line)) {
      current = { heading: line.trim(), line: i + 1, body: [] }
      out.push(current)
      return
    }
    if (current) current.body.push(line)
  })

  return out
}

/**
 * The lines in a section that are actual content. A bare `### Added` scaffold
 * and a link-reference definition are both structure, not an entry — counting
 * them would let an empty `[Unreleased]` skeleton read as pending work, and an
 * empty version section read as a documented release.
 */
const entries = (body) =>
  body
    .map((l) => l.trim())
    .filter(
      (t) =>
        t && !/^#{3,}\s/.test(t) && !/^\[[^\]]+\]:\s*\S+/.test(t) &&
        // A `<!-- nothing yet -->` placeholder is a common Keep-a-Changelog idiom
        // for an empty section, not a pending entry.
        !/^<!--.*-->$/.test(t)
    )

const parsed = sections(changelog)

const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const DATED = new RegExp(`^##\\s+\\[${escaped}\\]\\s+-\\s+(\\d{4}-\\d{2}-\\d{2})\\s*$`)
/* The near-miss heading, for a better message than "no section". The negative
   lookahead stops a search for 0.2.0 from matching `[0.2.0-rc.1]`, which is a
   different release and not a malformed heading. */
const LOOSE = new RegExp(`^##\\s+\\[?${escaped}\\]?(?![\\w.-])`)

/* -- [Unreleased] has been emptied out ------------------------------------- */

const unreleased = parsed.find((s) => /^##\s+\[unreleased\]/i.test(s.heading))

if (!unreleased) {
  fail(
    CHANGELOG,
    "no `## [Unreleased]` heading.",
    "add it back above the version headings. Keep a Changelog keeps it permanently, " +
      "so the next entry always has somewhere to go that is not a released section.",
  )
} else {
  const pending = entries(unreleased.body)
  if (pending.length > 0) {
    const sample = pending.slice(0, 3).map((l) => `        ${l}`)
    fail(
      `${CHANGELOG}:${unreleased.line}`,
      `[Unreleased] still holds ${pending.length} entr${pending.length === 1 ? "y" : "ies"}:\n` +
        sample.join("\n") +
        (pending.length > 3 ? `\n        … and ${pending.length - 3} more` : ""),
      `move them under \`## [${version}] - <today>\` and leave [Unreleased] empty. ` +
        "Entries left here are work that shipped and went unannounced.",
    )
  }
}

/* -- the version has a dated section, once, and it says something ---------- */

const dated = parsed.filter((s) => DATED.test(s.heading))
const loose = parsed.filter((s) => LOOSE.test(s.heading))

let release = null

if (dated.length === 0 && loose.length > 0) {
  fail(
    `${CHANGELOG}:${loose[0].line}`,
    `found \`${loose[0].heading}\`, which is not the expected heading shape.`,
    `write it as \`## [${version}] - YYYY-MM-DD\` — square brackets, a spaced hyphen, ` +
      "an ISO date. The workflow reads the release body by matching that shape.",
  )
} else if (dated.length === 0) {
  fail(
    CHANGELOG,
    `no section for ${version}.`,
    `add \`## [${version}] - YYYY-MM-DD\` below [Unreleased] and move this release's ` +
      "entries under it. A version published without notes cannot be documented " +
      "retroactively for anyone who already upgraded.",
  )
} else if (loose.length > 1) {
  // Count every heading naming this version, dated or not. Counting only the
  // dated ones let a `## [0.2.0] - <date>` plus a stray `## 0.2.0` through,
  // and the second section`s entries vanished from the release notes.
  fail(
    CHANGELOG,
    `${loose.length} sections for ${version}, at lines ${loose.map((s) => s.line).join(", ")}.`,
    "delete the duplicates. With two sections there is no single answer to what " +
      "the release notes are.",
  )
} else {
  release = dated[0]

  const [, date] = release.heading.match(DATED)
  const [y, m, d] = date.split("-").map(Number)
  const asDate = new Date(Date.UTC(y, m - 1, d))
  const real =
    asDate.getUTCFullYear() === y &&
    asDate.getUTCMonth() === m - 1 &&
    asDate.getUTCDate() === d

  if (!real) {
    fail(
      `${CHANGELOG}:${release.line}`,
      `the date ${date} is not a real calendar date.`,
      "use an ISO date that exists, e.g. 2026-10-06.",
    )
  }

  if (entries(release.body).length === 0) {
    fail(
      `${CHANGELOG}:${release.line}`,
      `the [${version}] section is empty.`,
      "write what changed under it. An empty section publishes as 'no changes' for " +
        "a release that changed something, which is worse than no section at all.",
    )
    release = null
  }
}

if (failures.length > 0) report()

/* ---- write the release body --------------------------------------------- */

/* Link-reference definitions are file plumbing, not notes. Keep-a-changelog
   parks them under the last section, so without this they would be the final
   two lines of the GitHub Release body. */
const body =
  release.body
    .filter((l) => !/^\[[^\]]+\]:\s*\S+/.test(l.trim()))
    .join("\n")
    .replace(/^\s*\n+/, "")
    .replace(/\s+$/, "") + "\n"

const notesPath = path.join(root, NOTES)

fs.writeFileSync(notesPath, body, "utf8")

const [, date] = release.heading.match(DATED)
const count = entries(release.body).length

console.log(
  `✓ ${tag} — ${MANIFEST} agrees, [Unreleased] is clear, ` +
    `${count} entr${count === 1 ? "y" : "ies"} under [${version}] - ${date}`,
)
console.log(`  release body → ${NOTES} (${Buffer.byteLength(body)} bytes)`)
