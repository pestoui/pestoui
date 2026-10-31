/* Runs check-secrets.mjs against throwaway git repositories.
 *   node --test scripts/check-secrets.test.mjs
 *
 * Every fake credential below is assembled at run time from fragments, so this
 * file never matches a rule itself and the repository's own check:secrets stays
 * clean over it. */

import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, test } from "node:test"
import { fileURLToPath } from "node:url"

const SCRIPT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "check-secrets.mjs",
)
const join = (...parts) => parts.join("")
const live = (rest) => join("sk", "_li", "ve_", rest)

const VALUES = {
  env: join("Zq8v", "R2mN", "5pL7", "tY4w"),
  quoted: join("aB3d", "eF6g", "hJ9k", "Lm2n"),
  yaml: join("Pq4r", "St7u", "Vw1x", "Yz5a"),
  ts: join("cD8e", "fG2h", "iJ6k", "lM0n"),
  json: join("oP3q", "rS7t", "uV1w", "xY5z"),
  afterPlaceholder: join("gH4j", "kL8m", "nP2q", "rS6t"),
  pairA: join("tU9v", "wX3y", "zA7b", "cD1e"),
  pairB: join("fG5h", "iJ9k", "lM3n", "oP7q"),
  stripe: live(join("Q7wE9rT2", "yU4iO6pA", "8sD1fG3h")),
}
const STRIPE_PLACEHOLDER = live("x".repeat(24))

/* Each file is a list of lines; app.env uses CRLF to check line numbers. */
const POSITIVES = {
  "app.env": [`API_KEY=${VALUES.env}`, `DB_PASSWORD="${VALUES.quoted}"`],
  "settings.yml": [`JWT_SECRET: '${VALUES.yaml}'`],
  "client.ts": [`export const config = { clientSecret: "${VALUES.ts}" }`],
  "data.json": [`{ "secret_key": "${VALUES.json}" }`],
  "mixed.json": [
    `{"api_key": "your_api_key_here", "client_secret": "${VALUES.afterPlaceholder}"}`,
  ],
  "pair.json": [
    `{"api_secret": "${VALUES.pairA}", "client_secret": "${VALUES.pairB}"}`,
  ],
  "keys.txt": [`old: ${STRIPE_PLACEHOLDER} new: ${VALUES.stripe}`],
}

const EXPECTED = [
  "app.env:1  secret-looking assignment",
  "app.env:2  secret-looking assignment",
  "settings.yml:1  secret-looking assignment",
  "client.ts:1  secret-looking assignment",
  "data.json:1  secret-looking assignment",
  "mixed.json:1  secret-looking assignment",
  "pair.json:1  secret-looking assignment",
  "keys.txt:1  Stripe secret or restricted key",
]

const NEGATIVES = {
  ".env.example": [
    "API_KEY=your-api-key",
    "CLIENT_SECRET=changeme",
    "DB_PASSWORD=",
    "ACCESS_TOKEN=$ACCESS_TOKEN",
    "PRIVATE_KEY_PATH=/etc/keys/server.pem",
    "AUTH_TOKEN_URL=https://oauth2.googleapis.com/token",
    "SECRET=abc123",
  ],
  "ci.yml": [
    "          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}",
    "          API_SECRET: ${{secrets.API_SECRET}}",
  ],
  "code.ts": [
    "const apiKey = process.env.API_KEY",
    "const secret = import.meta.env.VITE_SHARED_SECRET",
    "let password: string",
    "const authToken = readToken(headers)",
    'const input = { type: "password", autoComplete: "current-password" }',
    'const theme = { passwordStrength: "var(--color-success)" }',
  ],
  "notes.yml": [
    "api_key: config.credentials.apiKey",
    "secret_name: productionsecretname",
    'password_hint: "use a long phrase"',
  ],
}

const dirs = []
after(() => {
  for (const dir of dirs)
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 })
})

function tempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-secrets-"))
  dirs.push(dir)
  return dir
}

function repoWith(...fileSets) {
  const dir = tempDir()
  execFileSync("git", ["init", "-q"], { cwd: dir })
  for (const files of fileSets) {
    for (const [name, lines] of Object.entries(files)) {
      const eol = name === "app.env" ? "\r\n" : "\n"
      fs.writeFileSync(path.join(dir, name), lines.join(eol) + eol)
    }
  }
  execFileSync("git", ["-c", "core.autocrlf=false", "add", "-A"], { cwd: dir })
  return dir
}

/* The ceiling stops git from finding a repository above the temp folder, so
   the not-a-repository case cannot be answered by some parent directory. */
function scan(dir) {
  const r = spawnSync(process.execPath, [SCRIPT, dir], {
    encoding: "utf8",
    env: { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(dir) },
  })
  const output = `${r.stdout}${r.stderr}`
  const reported = output
    .split(/\r?\n/)
    .filter((line) => line.startsWith("  ✗ "))
    .map((line) => line.slice(4))
  return { status: r.status, output, reported }
}

test("reports every credential once, at the right file, line and rule", () => {
  const { status, reported } = scan(repoWith(POSITIVES, NEGATIVES))
  assert.equal(status, 1)
  assert.deepEqual([...reported].sort(), [...EXPECTED].sort())
  assert.equal(new Set(reported).size, reported.length)
})

test("a placeholder earlier on a line does not hide a credential after it", () => {
  const { reported } = scan(repoWith(POSITIVES))
  assert.ok(reported.includes("mixed.json:1  secret-looking assignment"))
  assert.ok(reported.includes("keys.txt:1  Stripe secret or restricted key"))
})

test("never prints a matched value", () => {
  const { output } = scan(repoWith(POSITIVES, NEGATIVES))
  for (const value of [...Object.values(VALUES), STRIPE_PLACEHOLDER])
    assert.ok(!output.includes(value), "a fixture value reached the output")
})

test("passes placeholders, references, paths, URLs and code", () => {
  const { status, reported, output } = scan(repoWith(NEGATIVES))
  assert.deepEqual(reported, [])
  assert.equal(status, 0)
  assert.match(output, /✓ \d+ tracked files hold no credential/)
})

test("exits 2 outside a git repository", () => {
  assert.equal(scan(tempDir()).status, 2)
})
