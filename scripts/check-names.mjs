#!/usr/bin/env node
/**
 * One identity, and a private blocklist.
 *   node scripts/check-names.mjs [root] [--require-list]
 *
 * [root] is the repository to check, this one by default. The private
 * repository runs the same gate against itself through its submodule:
 * `node vendor/pestoui/scripts/check-names.mjs . --require-list`
 *
 * 1. Commit identity. Every author and committer on the current branch must be
 *    the project's one identity, or GitHub acting for it when a pull request is
 *    merged in the web interface. This needs no configuration and always runs.
 *
 * 2. Blocked words. Some strings must never appear in a tracked file or a
 *    commit message. The list is deliberately not stored in this repository:
 *    writing a word down in order to forbid it would put it in every clone. It
 *    is read from the FORBIDDEN_NAMES environment variable (a CI secret) and
 *    from an untracked `.forbidden-names` file at the repository root, one
 *    entry per line. With neither present the word check is skipped and says
 *    so; pass --require-list to make a missing list an error instead.
 *
 * A violation reports where, never what: neither a matched word nor a rejected
 * commit identity is printed, so a failing run does not put it into a build log.
 *
 * Scope is `git ls-files`: exactly what a commit would contain. Build output
 * and node_modules are regenerable and not checked.
 */

import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const rootArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"))
const root = rootArg
  ? path.resolve(rootArg)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const REQUIRE_LIST = process.argv.includes("--require-list")
const BLOCKLIST_FILE = ".forbidden-names"
const HISTORY_DEPTH = "500"

/* The one identity, plus the two shapes GitHub itself produces for it: the
   no-reply author address on a web merge, and GitHub as the committer of that
   merge. Adding anyone else here is a deliberate decision, not a fix. */
const ALLOWED_IDENTITIES = [
  /^Fahim Anando <fahim\.anando@gmail\.com>$/,
  /^Fahim Anando <\d+\+Fahim-Anando@users\.noreply\.github\.com>$/,
  /^GitHub <noreply@github\.com>$/,
]

const BINARY = /\.(png|jpe?g|gif|ico|webp|woff2?|ttf|otf|eot|pdf|zip|gz|tgz|mp4|webm)$/i

const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })

const violations = []

let tracked = []
try {
  tracked = git("ls-files").split("\n").filter(Boolean)
} catch {
  console.error("check:names — not a git repository, or git is unavailable.")
  process.exit(2)
}

/* ---- 1. commit identity on the current branch ---------------------------- */

let identitiesChecked = 0
try {
  /* A rejected identity is reported by the first commit that carries it, never
     printed: it could hold a blocked word or someone else's address, and this
     log may be public. `git log -1 <hash>` shows it locally. */
  const seen = new Set()
  const rejected = new Set()
  const log = git("log", "--format=%h%x00%an <%ae>%x00%cn <%ce>", "-n", HISTORY_DEPTH)
  for (const line of log.split("\n").filter(Boolean)) {
    const [hash, author, committer] = line.split("\u0000")
    for (const [role, id] of [
      ["author", author],
      ["committer", committer],
    ]) {
      seen.add(id)
      if (rejected.has(id) || ALLOWED_IDENTITIES.some((allowed) => allowed.test(id))) continue
      rejected.add(id)
      violations.push({ where: `commit ${hash}`, detail: `its ${role} is not an allowed identity` })
    }
  }
  identitiesChecked = seen.size
} catch {
  /* A shallow clone or a fresh repo with no commits. Not a violation. */
}

/* ---- 2. the private blocklist -------------------------------------------- */

function loadBlocklist() {
  let fromFile = ""
  try {
    fromFile = fs.readFileSync(path.join(root, BLOCKLIST_FILE), "utf8")
  } catch {
    /* No local list. The environment variable may still supply one. */
  }
  const entries = `${process.env.FORBIDDEN_NAMES ?? ""}\n${fromFile}`
    .split(/[\n,]/)
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry && !entry.startsWith("#"))
  return [...new Set(entries)]
}

if (tracked.includes(BLOCKLIST_FILE)) {
  violations.push({
    where: BLOCKLIST_FILE,
    detail: "the blocklist file is tracked by git; it must stay untracked",
  })
}

const blocklist = loadBlocklist()

if (blocklist.length === 0 && REQUIRE_LIST) {
  console.error(
    "check:names — no blocklist supplied, and --require-list was passed." +
      "\nSet the FORBIDDEN_NAMES secret (comma-separated) for this repository," +
      `\nor create an untracked ${BLOCKLIST_FILE} file with one entry per line.\n`
  )
  process.exit(2)
}

if (blocklist.length > 0) {
  for (const rel of tracked) {
    if (rel === BLOCKLIST_FILE || BINARY.test(rel)) continue
    let text
    try {
      text = fs.readFileSync(path.join(root, rel), "utf8")
    } catch {
      continue // deleted-but-staged, or unreadable; not this script's problem
    }
    if (text.includes("\u0000")) continue // binary that slipped past the extension test

    text.split(/\r?\n/).forEach((line, i) => {
      const lower = line.toLowerCase()
      blocklist.forEach((term, n) => {
        if (lower.includes(term)) {
          violations.push({ where: `${rel}:${i + 1}`, detail: `blocklist entry ${n + 1}` })
        }
      })
    })
  }

  try {
    const commits = git("log", "--format=%h%x00%B%x01", "-n", HISTORY_DEPTH).split("\u0001")
    for (const commit of commits) {
      const [hash, message = ""] = commit.trim().split("\u0000")
      if (!hash) continue
      const lower = message.toLowerCase()
      blocklist.forEach((term, n) => {
        if (lower.includes(term)) {
          violations.push({ where: `commit ${hash} message`, detail: `blocklist entry ${n + 1}` })
        }
      })
    }
  } catch {
    /* No history to read. Not a violation. */
  }
}

/* ---- report -------------------------------------------------------------- */

if (violations.length > 0) {
  console.error(`\ncheck:names — ${violations.length} violation(s):\n`)
  for (const v of violations) {
    console.error(`  ✗ ${v.where}`)
    console.error(`      ${v.detail}`)
  }
  console.error(
    "\nThe only identity this project uses is Fahim Anando <fahim.anando@gmail.com>." +
      "\nSee the identity section of CONTRIBUTING.md.\n"
  )
  process.exit(1)
}

const wordCheck =
  blocklist.length > 0
    ? `${tracked.length} tracked files and recent commit messages clean against ${blocklist.length} blocklist entries`
    : "word check skipped: no blocklist supplied"
console.log(`✓ ${identitiesChecked} commit identities allowed; ${wordCheck}`)
