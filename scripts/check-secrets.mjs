#!/usr/bin/env node
/**
 * Fail the build if a credential is committed.
 *   node scripts/check-secrets.mjs [root]
 *
 * Scope is `git ls-files` in the repository at [root] — this one by default — so
 * the private repository runs the same gate against itself through its
 * submodule: `node vendor/pestoui/scripts/check-secrets.mjs .`
 *
 * Most rules match a credential's real shape (its issuer's prefix and length),
 * so they stay quiet until something real lands. One is generic: a literal
 * assigned to a name that says it holds a secret — any identifier containing
 * secret, password, passwd, pwd, api key, access key, private key, or an access,
 * auth or refresh token — as `NAME=value`, `name: "value"` or `"name": "value"`.
 * That value must look like a credential: at least 12 characters besides
 * `- _ .`, at least two of lowercase, uppercase, digits and symbols, and not a
 * placeholder, an environment or template reference, a URL, a path, a dotted
 * identifier or a CSS variable. In JS and TS files only a quoted value counts,
 * because an unquoted one is code. So a placeholder in .env.example passes.
 *
 * Every match on a line is checked, so a placeholder cannot hide a real key
 * after it, and each file, line and rule is reported once. A finding reports the
 * file, the line and the rule, never the matched text: a failing run must not
 * copy a live key into a CI log. A committed key counts as leaked even after it
 * is deleted — rotate it at its issuer first, then remove it.
 */

import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const root = process.argv[2] ? path.resolve(process.argv[2]) : here

const RULES = [
  [
    "private key block",
    /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/,
  ],
  ["AWS access key id", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ["GitHub fine-grained token", /\bgithub_pat_[A-Za-z0-9_]{60,}\b/],
  ["npm token", /\bnpm_[A-Za-z0-9]{36}\b/],
  ["Stripe secret or restricted key", /\b(?:sk|rk)_live_[0-9a-zA-Z]{20,}\b/],
  ["Stripe webhook secret", /\bwhsec_[0-9a-zA-Z]{24,}\b/],
  ["Polar token", /\bpolar_[a-z]{2,4}_[A-Za-z0-9]{20,}\b/],
  ["OpenAI key", /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{32,}\b/],
  ["Anthropic key", /\bsk-ant-[A-Za-z0-9_-]{32,}\b/],
  ["Hugging Face token", /\bhf_[A-Za-z0-9]{34,}\b/],
  ["Groq key", /\bgsk_[A-Za-z0-9]{40,}\b/],
  ["Replicate token", /\br8_[A-Za-z0-9]{37}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Google OAuth client secret", /\bGOCSPX-[A-Za-z0-9_-]{28}\b/],
  ["Google service account file", /"type"\s*:\s*"service_account"/],
  ["Supabase secret key", /\bsb_secret_[A-Za-z0-9_-]{20,}\b/],
  [
    "JSON Web Token",
    /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  ],
  ["Slack token", /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
  [
    "Slack webhook",
    /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/,
  ],
  [
    "Discord webhook",
    /https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/,
  ],
  ["Telegram bot token", /\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b/],
  ["Resend key", /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{20,}\b/],
  ["SendGrid key", /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/],
  ["Twilio API key", /\bSK[0-9a-fA-F]{32}\b/],
  ["Mailgun key", /\bkey-[0-9a-zA-Z]{32}\b/],
  ["Shopify token", /\bshp(?:at|ca|pa|ss)_[a-fA-F0-9]{32}\b/],
  [
    "URL with an embedded password",
    /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@"'`]+:[^\s/@"'`]{3,}@[^\s"'`]+/i,
  ],
].map(([name, re]) => [name, new RegExp(re.source, `${re.flags}g`)])

/* The generic rule. Group 1 is the name, group 3 a quoted value and group 4 an
   unquoted one. A name may carry any prefix or suffix (DB_PASSWORD,
   clientSecret, secret_key), and a JSON key's closing quote is allowed. */
const ASSIGNMENT_RULE = "secret-looking assignment"
const ASSIGNMENT = new RegExp(
  String.raw`(?<![\w-])([\w-]*(?:secret|passw(?:or)?d|pwd|api[_-]?key|access[_-]?key|private[_-]?key|(?:access|auth|refresh)[_-]?token)[\w-]*)["']?\s*[:=]\s*(?:(["'\x60])([^"'\x60\s]*)\2|([^\s"'\x60,;]+))`,
  "gi",
)

/* A placeholder is not a credential: example.com hosts and obvious stand-ins. */
const PLACEHOLDER =
  /example\.(?:com|org|net)|\byour[-_]|placeholder|changeme|x{8,}|\*{4,}/i

/* Assigned values that are something else, whatever the name says. */
const NOT_A_CREDENTIAL = [
  PLACEHOLDER,
  // $VAR, ${VAR}, ${{ secrets.X }}, %VAR%, <your-key>, {{ var }}
  /^[$%<]|\$\{|\{\{/,
  // a URL: one that carries a password has its own rule
  /^[a-z][a-z0-9+.-]*:\/\//i,
  // a path: /etc/x, C:\x, ./x, ../x, ~/x
  /^(?:[a-z]:)?[\\/]|^\.{1,2}[\\/]|^~[\\/]/i,
  // a dotted identifier: process.env.API_KEY, config.apiKey
  /^[a-z_$][\w$-]*(?:\.[a-z_$][\w$-]*)+$/i,
  // a CSS variable, or a reference to one
  /^(?:var\()?--[\w-]+\)?$/,
]

const CHARACTER_CLASSES = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^\w.-]/]

function looksLikeCredential(value) {
  if (value.replace(/[-_.]/g, "").length < 12) return false
  if (NOT_A_CREDENTIAL.some((re) => re.test(value))) return false
  return CHARACTER_CLASSES.filter((re) => re.test(value)).length >= 2
}

/* In code an unquoted value is an expression (process.env.X, getKey()), not a
   literal, so only quoted values are read there. */
const CODE_FILE = /\.[cm]?[jt]sx?$/i

const BINARY =
  /\.(png|jpe?g|gif|ico|webp|avif|woff2?|ttf|otf|eot|pdf|zip|gz|tgz|mp4|webm)$/i

let tracked
try {
  tracked = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 << 20,
  })
    .split("\0")
    .filter(Boolean)
} catch {
  console.error(
    `check:secrets — ${root} is not a git repository, or git is unavailable.`,
  )
  process.exit(2)
}

const findings = new Set()
for (const rel of tracked) {
  if (BINARY.test(rel) || rel === ".forbidden-names") continue
  let text
  try {
    text = fs.readFileSync(path.join(root, rel), "utf8")
  } catch {
    continue // a submodule, or deleted-but-staged
  }
  if (text.includes("\u0000")) continue
  const code = CODE_FILE.test(rel)
  text.split(/\r?\n/).forEach((line, i) => {
    const where = `${rel}:${i + 1}`
    for (const [name, re] of RULES) {
      for (const m of line.matchAll(re)) {
        if (!PLACEHOLDER.test(m[0])) {
          findings.add(`${where}  ${name}`)
          break
        }
      }
    }
    for (const m of line.matchAll(ASSIGNMENT)) {
      const value = m[3] ?? (code ? undefined : m[4])
      if (value !== undefined && looksLikeCredential(value)) {
        findings.add(`${where}  ${ASSIGNMENT_RULE}`)
        break
      }
    }
  })
}

if (findings.size > 0) {
  console.error(`\ncheck:secrets — ${findings.size} possible credential(s):\n`)
  for (const f of findings) console.error(`  ✗ ${f}`)
  console.error(
    "\nRotate any real key at its issuer first; deleting it from the file does not un-leak it.\n",
  )
  process.exit(1)
}
console.log(
  `✓ ${tracked.length} tracked files hold no credential matching ${RULES.length + 1} rules`,
)
