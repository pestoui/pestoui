# Contributing

Thanks for looking. This document is short on ceremony and long on the specific
things that will silently break if you do not know them.

## Getting set up

Node **22.18+**, npm 10+. (`npm run test:merge` runs a TypeScript file with
`node --test`, which needs the type stripping Node turned on by default in 22.18.)

The root `package.json` declares this as `"engines": { "node": ">=22.18.0 <25" }`.
It was `>=20.19.0` until the type-scale work added `test:merge`: Node 20 cannot
run that test at all, and Node 22 before 22.18 only with
`--experimental-strip-types`. The upper bound means a new Node major is taken on
purpose: raise it in a commit, after the suite has run on the new major.
`.nvmrc`, which CI reads, names the newest major the range allows: 24 today. The
requirement is for contributors only: the published package,
`packages/ui/package.json`, declares no `engines` field, so it asks nothing of a
consumer's Node.

```bash
git clone https://github.com/pestoui/pestoui.git
cd pestoui
npm install          # from the root; do not install inside packages/ui
```

Before you open a pull request:

```bash
npm run check:names
npm run check:secrets
npm run test:secrets
npm run check:placeholders
npm run tokens:check
npm run test:merge
npm run test:chart
npm run check:notices
npm run check:barrel
npm run check:shadcn-css
npm run lint
npm run typecheck
npm run check:exports
```

`check:secrets` scans every tracked file for credential shapes and reports the
file and line, never the value; `test:secrets` runs it against fixtures it must
catch and fixtures it must pass. `check:shadcn-css` fails when the installed
shadcn's stylesheet differs from the copy vendored at
`packages/ui/src/styles/shadcn.css`; take a new copy on purpose, and say so in
the pull request so the maintainer checks it in the website's browser suites.

`check:names` enforces the project's single identity: every commit must be
authored and committed as the project owner, and tracked files and commit
messages are scanned against a private blocklist that CI supplies. It runs
first because it is the only one whose failure is expensive to undo after a
merge.

CI runs exactly these, plus one more on pull requests:
`node scripts/check-tokens.mjs --base origin/<base>`, which fails if the token
allowlist gained an entry or a count the base branch does not have. Nothing
else gates a PR.

## Identity and naming

**The only identity this project uses is Fahim Anando
<fahim.anando@gmail.com>**: git author, git committer, package `author` and
copyright holder. A commit may credit Claude as co-author, and no one else.
Contributions from others are welcome under MIT; they are committed under the
project's identity, so no other name enters the history.

Never write another personal name, company, team, agency, organisation scope,
domain or email address into the repository in any form — source, comment,
string literal, demo data, package name, author field, URL or documentation.

Demo content uses plain descriptive labels ("Team workspace", "Main account")
and the reserved `example.com` domain — never a fictional company or product
name, and never a third-party brand as demo data. `npm run check:placeholders`
enforces this.

`npm run check:names` enforces the identity rule and runs first in CI. It fails
if a commit on the branch was authored or committed under another identity, and
it scans tracked files and commit messages against a private blocklist that is
deliberately not written down here: CI receives it as the `FORBIDDEN_NAMES`
secret, and a local run reads an untracked `.forbidden-names` file if one exists.

A `commit-msg` hook in `.githooks/` refuses any co-author trailer except
Claude's, and any "generated with" line, before it reaches history. Turn it on
once per clone with `git config core.hooksPath .githooks`.

## How the repository is laid out

An npm workspaces repository with a single workspace:

| Workspace     | Package         | Rule of thumb                                                                                                                    |
| ------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui` | `@pestoui/core` | The design system: every component, the tokens, the motion system and the theme engine. Changes here affect everyone downstream. |

The root holds the gates (`scripts/`), CI and the release workflow
(`.github/workflows/`), and the project's documents. The documentation site,
[pestoui.com](https://pestoui.com), lives in a separate private repository with
its demos and its browser suites, and so do the PRO layouts and sidebars; this
repository holds none of their source. They consume `@pestoui/core`, never the
other way round: nothing in `packages/ui` may import from them.

### Imports: relative only

`packages/ui/src` uses **relative imports only**. There is no `@/` alias, and
adding one back will break things in a way that is not obvious: `packages/ui`
ships its TypeScript source to npm, and an alias only resolves for whoever
configured it. Someone who ran `npm install` never did.

Adding a new entry point means adding it to the package's `exports` map. If it
is not in the map it does not exist, and the failure shows up as a module
resolution error in whoever imports it. `npm run check:exports` resolves every
entry in the map.

## Rules that break things quietly

These come from an audit of the codebase. Each has already cost someone a day.

- **Never add a line-height to `--text-body`.** `text-body` (`--text-body`,
  15px) sets only font-size; Tailwind v4 emits a line-height for a size utility
  only when `--<name>--line-height` exists, so declaring one silently moves
  layout at every Tier-1 call site. The same holds for every Tier-1 size.
- **Primitives go in plain `:root`, never in `@theme`.** That is the enforcement
  mechanism: Tailwind only generates utilities from `--color-*` inside `@theme`,
  so `--sand-900` produces no `bg-sand-900` and components physically cannot
  reach past the semantic layer.
- **`rounded-box-*` is for fixed square boxes only.** On a container that grows,
  a radius past half the edge collapses the shape into a circle.
- **`packages/ui/src/components/` stays free of documentation and demo
  scaffolding.** These files get copied into other people's projects. Component
  metadata and demos live with the website, in its own repository.
- **Surface radius values stay numerically identical.** The website's test pages
  render them as visible labels beside live swatches, so a rounded value that
  drifts is a visible lie.
- **Tailwind cannot see `packages/ui` on its own.** `packages/ui/src/index.css`
  names its own sources with `@source`. Delete those three lines and the built
  stylesheet drops from ~317 kB to ~89 kB with no error anywhere — a consuming
  app just renders nearly unstyled.

## Conventions

- **Variants.** A component with one or more variant axes defines a `cva()`. It
  may emit `data-variant`/`data-size` for _descendants_ to select on, but never
  reads its own `data-*` to style itself. No `cva` for components with no
  variant axes.
- **Tokens.** No raw `oklch()`, hex, `text-[…rem]`, `rounded-[…px]`, numeric
  `z-*` or `tracking-[…]` outside `packages/ui/src/index.css` and
  `packages/ui/src/styles/`. `npm run tokens:check` enforces it as a ratchet
  over `scripts/tokens-allowlist.json`, which may only shrink.
- **Barrels.** Explicit named re-exports, never `export *` — it defeats
  tree-shaking. Regenerate with `npm run gen:barrel`.
- **Formatting.** Prettier: no semicolons, double quotes, `printWidth: 88`,
  with `prettier-plugin-tailwindcss`. Format the files you changed, with
  `npx prettier --write <file>…`, never the whole tree: much of it is not in
  Prettier's style yet, and `npm run format` would put every one of those files
  in your diff.

## The client boundary

`packages/ui` is source that lands in Next.js App Router apps, so `"use client"`
is part of each file's public contract. "Calls a hook" is the wrong test, and it
fails in both directions.

A file needs the directive when, and only when, it:

- calls `useState`, `useEffect`, `useLayoutEffect`, `useRef`, `useReducer`,
  `useContext`, `useSyncExternalStore` or `useImperativeHandle`;
- calls `createContext` — at module scope this throws on mere import;
- **creates a function on every render** and hands it to an element or a client
  component — `onClick={(e) => …}`, `format={(n) => …}`;
- imports a module that is itself client-only (`vaul` is one).

It does **not** need it for `useId`, `useMemo`, `useCallback` or `use` — React's
server build exports those — nor for passing a prop straight through. Over-marking
is not free: it turns every `cva` function the file exports into a client
reference that throws when server code calls it. The proof is a real Next.js
build importing the component into a Server Component, not a regex.

## Third-party code

Code entering `packages/ui` is published under MIT, so it must be licensed for
**redistribution and sublicensing**, not merely for use — most "free for
commercial use" snippet libraries grant only the second. Before pasting anything
from outside this repository into `packages/ui`, read the source's licence and
check for a clause forbidding republication as a component library, template
pack or kit.

Motion _characteristics_ are not the protected part. A duration, an easing curve
and the idea of a squash on arrival are functional; the specific code expressing
them is not. Rebuild an effect against the tokens in
`packages/ui/src/styles/motion.css`.

## Verification

- **Anything visible in a browser is proved in a browser.** Render the component
  in an app and read computed values off the live page. "It typechecks" is not
  evidence that a component renders.
- **Attach the evidence to the claim** — the command, its output, the value, the
  screenshot — and measure before you conclude.

## Adding a component

1. Add the file to `packages/ui/src/components/ui/` (a primitive) or
   `packages/ui/src/components/` (application UI). If you pulled it in with
   `npx shadcn add`, **repoint the imports it writes**: the CLI emits
   `@/lib/utils`, and this package has no `@` alias. It becomes
   `../../lib/utils` from `ui/`, `../lib/utils` from `components/`.
2. `npm run gen:barrel` to update the barrel.
3. Run the checks listed under [Getting set up](#getting-set-up). Its
   documentation page and demos are added on the website, which lives in a
   separate private repository; describe in the pull request what they should
   show.

## Pull requests

- One logical change per PR. A restructure and a behaviour change in the same
  diff cannot be reviewed.
- Say what you verified, not just what you changed. "Typechecks" is not the same
  claim as "I loaded the page and the tabs still switch".
- Visual changes: include before and after. The design system has an explicit
  no-unintended-visual-change rule and screenshots are how it is kept.

## Releasing

Publishing is the `Release` workflow's job (`.github/workflows/release.yml`),
started by pushing a `v*` tag. Before tagging, the maintainer:

1. Moves the `[Unreleased]` entries in `packages/ui/CHANGELOG.md` under a dated
   heading for the new version, and sets the same version in
   `packages/ui/package.json`. `scripts/check-release.mjs` refuses the tag
   otherwise.
2. Runs the website's browser suites, which are kept in a separate private
   repository, against the new version, and publishes only when they pass.
   Nothing in this repository's CI renders a component, so this is the step
   that proves a release still looks and behaves as the last one did.
3. Tags a commit on `main` and pushes the tag. The workflow runs every gate
   again, packs the tarball, and publishes once the `npm` environment approves.

## Code of Conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
