#!/usr/bin/env node
/**
 * Fail the build if borrowed placeholder content comes back.
 *   node scripts/check-placeholders.mjs            # the repository
 *   node scripts/check-placeholders.mjs <file...>  # just these files
 *
 * Demo content in this repository uses plain descriptive labels ("Team
 * workspace", "Main account") and the reserved example.com domain. It never
 * uses a fictional company or product name, a third-party brand as demo data,
 * or wording copied from another kit. CONTRIBUTING.md states the rule; this is
 * what notices when it is broken anyway.
 *
 * Scope is every tracked and untracked (not ignored) file in packages/ui, plus
 * the public markdown at the root, in docs/ and in .github/.
 * Licence and history files, and the two scripts that have to name the terms
 * to enforce them, are left out.
 */

import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

/* Every term this gate rejects, in one list, each with the reason it is here.
   - acme, northwind, contoso: stock fictional-company names from sample data.
     A plain label says the same thing.
   - company.com: a real, registered domain used as a fake one.
   - 4242: the canonical test-card digits from payment-provider samples.
   - "Example <Noun>": a made-up brand dressed as a placeholder ("Example Pay").
   Names of other products and sites are deliberately not listed: writing a name
   down in order to forbid it would put it in every clone. They go in the private
   blocklist that scripts/check-names.mjs reads (the FORBIDDEN_NAMES secret, or an
   untracked .forbidden-names file). Credit for code that is actually used lives
   in NOTICE.md, which this gate does not read.
   Emails are checked separately below, because what is wrong there is the
   domain, not a word. */
const TERMS = [
  { name: "acme", re: /\bacme\b/i },
  { name: "northwind", re: /northwind/i },
  { name: "contoso", re: /contoso/i },
  { name: "company.com", re: /\bcompany\.com\b/i },
  { name: "test card 4242", re: /(?<![\d.])4242(?![\d.])/ },
  { name: "Example <Brand>", re: /\bExample [A-Z][a-z]+/ },
]

/* Email addresses must use a domain reserved for documentation (RFC 2606):
   example.com, example.org or example.net, or a subdomain of one. */
const EMAIL = /[A-Za-z0-9._%+-]+@((?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})\b/g
const RESERVED_DOMAIN = /(^|\.)example\.(com|org|net)$/i

/* Addresses that are not demo data: the project's one identity (CONTRIBUTING.md
   names it as author, committer and contact) and the git SSH remote user. */
const IDENTITY = new Set(["fahim.anando@gmail.com", "git@github.com"])

/* package.json fields that describe the package or the repository rather than
   showing demo content. An address in one of these is metadata. */
const METADATA_KEY =
  /"(author|email|bugs|maintainers|contributors|funding|repository|homepage)"\s*:/

const WORKSPACES = ["packages/ui/"]

const isPublicMarkdown = (rel) =>
  /\.md$/i.test(rel) &&
  (!rel.includes("/") || rel.startsWith("docs/") || rel.startsWith(".github/"))

const EXCLUDED_FILE = /(^|\/)(NOTICE\.md|LICENSE[^/]*|CHANGELOG\.md)$/i
const EXCLUDED = new Set(["scripts/check-names.mjs", "scripts/check-placeholders.mjs"])
const EXCLUDED_DIR = /^(research_notes|reports)\//

const BINARY =
  /\.(png|jpe?g|gif|ico|webp|avif|woff2?|ttf|otf|eot|pdf|zip|gz|tgz|mp4|webm)$/i

function inScope(rel) {
  if (EXCLUDED.has(rel) || EXCLUDED_FILE.test(rel) || EXCLUDED_DIR.test(rel))
    return false
  if (BINARY.test(rel)) return false
  return WORKSPACES.some((w) => rel.startsWith(w)) || isPublicMarkdown(rel)
}

/* ---- which files --------------------------------------------------------- */

const explicit = process.argv.slice(2)
let files
if (explicit.length > 0) {
  files = explicit.map((f) => path.resolve(f))
} else {
  try {
    const listed = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard"],
      {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      },
    )
    files = [...new Set(listed.split("\n").filter(Boolean))]
      .filter(inScope)
      .map((rel) => path.join(root, rel))
  } catch {
    console.error("check:placeholders — not a git repository, or git is unavailable.")
    process.exit(2)
  }
}

/* ---- scan ---------------------------------------------------------------- */

const violations = []
let scanned = 0

for (const abs of files) {
  let text
  try {
    text = fs.readFileSync(abs, "utf8")
  } catch {
    continue // deleted but still listed, or unreadable; not this script's problem
  }
  if (text.includes("\u0000")) continue // binary that slipped past the extension test
  scanned++

  const rel = path.relative(root, abs).split(path.sep).join("/")
  const isPackageJson = path.basename(abs) === "package.json"

  text.split(/\r?\n/).forEach((line, i) => {
    const where = `${rel}:${i + 1}`
    const evidence = line.trim().slice(0, 120)
    for (const { name, re } of TERMS) {
      if (re.test(line)) violations.push({ where, term: name, evidence })
    }
    if (isPackageJson && METADATA_KEY.test(line)) return
    for (const m of line.matchAll(EMAIL)) {
      const address = m[0].toLowerCase()
      if (IDENTITY.has(address) || RESERVED_DOMAIN.test(m[1])) continue
      violations.push({ where, term: `non-reserved email domain (${m[1]})`, evidence })
    }
  })
}

/* ---- report -------------------------------------------------------------- */

if (violations.length > 0) {
  console.error(
    `\ncheck:placeholders — ${violations.length} borrowed placeholder(s) found:\n`,
  )
  for (const v of violations) {
    console.error(`  ✗ ${v.where}`)
    console.error(`      matched ${v.term} in: ${v.evidence}`)
  }
  console.error(
    "\nDemo content uses plain descriptive labels and the reserved example.com domain —" +
      "\nnever a fictional company or product name, and never a third-party brand as demo data." +
      "\nSee the naming section of CONTRIBUTING.md.\n",
  )
  process.exit(1)
}

console.log(`✓ ${scanned} files clean of borrowed placeholders`)
