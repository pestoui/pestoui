# Third-party notices

`@pestoui/core` is MIT-licensed, and its `LICENSE` covers the original
work in this repository. It does not cover the work this package is built on.

Two different obligations are at play, and the difference decides what this file
has to say about each entry:

- **Redistribution.** 68 files under `packages/ui/src/components/ui/` are
  derivatives of shadcn/ui, and `packages/ui/src/styles/shadcn.css` is a copy of
  shadcn's own stylesheet. That source ships inside the npm tarball, so MIT's requirement
  that "the above copyright notice and this permission notice shall be included
  in all copies or substantial portions of the Software" applies directly. The
  notice is reproduced in full below.
- **Dependency.** The 18 packages in `packages/ui`'s `dependencies` are resolved
  by the consumer's own `npm install`. Their code is not copied into this
  repository and not included in the tarball, so no licence text has to travel
  with ours. They are listed anyway, with their real copyright lines, because a
  consumer auditing what lands in their `node_modules` should not have to walk
  the tree to find out.

Every copyright line below was read off the licence file on disk in this
repository's `node_modules` at the resolved version named with it. Nothing here
is reconstructed from memory. Where a package ships no licence file at all, it
is listed separately rather than given a copyright holder it did not state.

---

## shadcn/ui — the derived component set

Read from `node_modules/shadcn/LICENSE.md` (package `shadcn`, resolved 4.23.0,
repository `https://github.com/shadcn-ui/ui.git` — the same repository that
holds the component source).

What derives from it:

| In this repository                           | Relationship                                                                |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| `packages/ui/src/components/ui/` — 68 files  | derivative works: shadcn/ui components, restyled against this token layer   |
| `packages/ui/components.json`                | shadcn's own config format, against its published `ui.shadcn.com/schema.json` |
| `packages/ui/src/styles/shadcn.css`          | a verbatim copy of shadcn's stylesheet (`dist/tailwind.css` from 4.23.0); `check:shadcn-css` keeps it in step |

The attribution is applied to that directory as a whole rather than file by
file. The restyling pass did not record per-file provenance, and a handful of
the 68 — among them `color-picker`, `multi-select`, `rating`, `tree-view`,
`status-badge` — have no counterpart in shadcn's registry and were written here
against its conventions. Naming the whole directory over-attributes in those
cases. That is the deliberate direction to err in: under-attributing a file that
did start as shadcn/ui would breach the retention requirement, and
over-attributing one that did not costs nothing but precision.

```
MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Runtime dependencies

All 18 entries in `packages/ui/package.json`'s `dependencies`. Four of them
are not MIT, under three different licences, and that is the part of this
section worth reading.

The three `peerDependencies` — `react` and `react-dom` (MIT, Meta Platforms) and
`tailwindcss` (MIT, Tailwind Labs) — also land in a consumer's `node_modules`,
but the consumer installs them, at a version the consumer chooses. They are
named here for completeness and not reproduced below.

### MIT

The permission notice is the same text reproduced above for shadcn/ui, with the
copyright line replaced by the one given here.

| Package                  | Resolved | Copyright line                                                                   | Read from                                        |
| ------------------------ | -------- | -------------------------------------------------------------------------------- | ------------------------------------------------ |
| `clsx`                   | 2.1.1    | `Copyright (c) Luke Edwards <luke.edwards05@gmail.com> (lukeed.com)`             | `node_modules/clsx/license`                      |
| `cmdk`                   | 1.1.1    | `Copyright (c) 2022 Paco Coursey`                                                | `node_modules/cmdk/LICENSE.md`                   |
| `date-fns`               | 4.4.0    | `Copyright (c) 2021 Sasha Koss and Lesha Koss https://kossnocorp.mit-license.org` | `node_modules/date-fns/LICENSE.md`               |
| `input-otp`              | 1.5.0    | `Copyright (c) 2024 Guilherme Rodz`                                               | `node_modules/input-otp/LICENSE`                 |
| `next-themes`            | 0.4.6    | `Copyright (c) 2022 Paco Coursey`                                                | `node_modules/next-themes/license.md`            |
| `radix-ui`               | 1.8.1    | `Copyright (c) 2022 WorkOS`                                                      | `node_modules/radix-ui/LICENSE`                  |
| `react-day-picker`       | 10.0.2   | `Copyright (c) 2014-2026 Giampaolo Bellavite <io@gpbl.dev> and contributors`      | `node_modules/react-day-picker/LICENSE`          |
| `react-resizable-panels` | 4.15.3   | `Copyright (c) 2018 Brian Vaughn`                                                | `node_modules/react-resizable-panels/LICENSE.md` |
| `recharts`               | 3.8.0    | `Copyright (c) 2015-present recharts`                                            | `node_modules/recharts/LICENSE`                  |
| `sonner`                 | 2.0.8    | `Copyright (c) 2023 Emil Kowalski`                                               | `node_modules/sonner/LICENSE.md`                 |
| `tailwind-merge`         | 3.7.0    | `Copyright (c) 2021 Dany Castillo`                                               | `node_modules/tailwind-merge/LICENSE.md`         |
| `tw-animate-css`         | 1.4.0    | `Copyright (c) 2025 Wombosvideo`                                                 | `node_modules/tw-animate-css/LICENSE`            |
| `vaul`                   | 1.1.2    | `Copyright (c) 2023 Emil Kowalski`                                               | `node_modules/vaul/LICENSE.md`                   |

`shadcn` is not a runtime dependency. The one file this package used from it, the
stylesheet, is copied in and covered by the shadcn/ui notice above; the CLI
itself is a devDependency of this repository, which a consumer never installs.

### Apache-2.0 — `class-variance-authority`

`class-variance-authority@0.7.1` is **not MIT**. Read from
`node_modules/class-variance-authority/LICENSE`:

```
Copyright 2022 Joe Bell

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

This matters more than the MIT entries, because Apache-2.0 §4 attaches
conditions that MIT does not — retaining the licence, stating changes, and
propagating any `NOTICE` file the Work carries. Those conditions bind anyone who
distributes the Work or a derivative of it. This package does neither: 56 files
under `packages/ui/src/` import `class-variance-authority` and call `cva()`, and
the package itself is resolved from the registry by the consumer. The dependency
is declared, not vendored.

`class-variance-authority@0.7.1` ships no `NOTICE` file of its own — the
package's published contents are `LICENSE`, `README.md`, `dist/` and
`package.json` — so there is nothing to propagate.

### ISC — `lucide-react`

`lucide-react@1.27.0` is ISC, and its licence file carries two notices. Both are
reproduced; read from `node_modules/lucide-react/LICENSE`.

```
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

The same file names 115 icons derived from the Feather project, which carry a
second, separate MIT notice:

```
Copyright (c) 2013-present Cole Bemis
```

followed by the standard MIT permission text. The icon names it applies to are
enumerated in `node_modules/lucide-react/LICENSE`; they are not repeated here,
because the list is authoritative at the installed version and reproducing it
would go stale on the next minor.

### SIL OFL-1.1 — the two Geist font packages

`@fontsource-variable/geist@5.3.0` and `@fontsource-variable/geist-mono@5.3.0`
are font software under the SIL Open Font License, Version 1.1 — not MIT, and
not a software licence. `packages/ui/src/index.css` imports their stylesheets
(`wght.css`), which reference `.woff2` files inside the installed packages. No
font binary is copied into this repository.

Read from `node_modules/@fontsource-variable/geist/LICENSE`:

```
Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font) Geist-Italic[wght].ttf: Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font)
```

Read from `node_modules/@fontsource-variable/geist-mono/LICENSE`:

```
Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font.git) GeistMono-Italic[wght].ttf: Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font.git)
```

Both files then reproduce the full OFL-1.1 text. Two of its conditions are worth
naming, because they do not look like software-licence conditions:

- The font software may not be sold on its own, though it may be bundled,
  embedded or redistributed with software.
- A modified version may not use a Reserved Font Name without written
  permission. Nothing here modifies the fonts; they are consumed as published.

### Declared MIT, but shipping no licence file

One dependency declares `"license": "MIT"` in `package.json` and publishes no
licence file in its tarball. There is nothing to quote, and this file does not
invent a copyright line for it. The holder named below is the package's own
`author` field, not a copyright notice, and is recorded as such:

| Package                  | Resolved | Declared | `author` field                     | Licence file   |
| ------------------------ | -------- | -------- | ---------------------------------- | -------------- |
| `embla-carousel-react`   | 8.6.0    | MIT      | `David Jerleke`                    | none published |

`embla-carousel-react` pulls in `embla-carousel` and
`embla-carousel-reactive-utils`, both 8.6.0, both declaring MIT with the same
`author` and likewise publishing no licence file. The canonical text for all
three is in the upstream repository, `https://github.com/davidjerleke/embla-carousel`.
It was not read from disk, so it is not quoted here.

---

## Original work

MIT, `Copyright (c) 2026 Fahim Anando`, per `LICENSE` and
`packages/ui/LICENSE`. Nothing in this list derives from a third party:

- **The token layer.** `packages/ui/src/index.css` — the greyscale and semantic
  colour tokens, every declaration that keys off `var(--brand-hue)`, the
  `.theme-*` accent blocks, the radius and type scales, and the primitive/
  semantic split that keeps primitives out of `@theme`.
- **The motion system.** `packages/ui/src/styles/motion.css` — the `--ease-*`
  bezier set, the nine `linear()` spring curves sampled from damped-spring
  solves, their matched durations, the keyframe animations, the duration and
  `anim-*` utilities, and the `avatar-lift`, `draw-path`, `digit-column` and
  `reveal-*` primitives.
- **The 35 application components** in `packages/ui/src/components/` — metric
  cards, agent cards, activity feeds, gauges, sparklines, heat grids and the
  rest. These have no shadcn/ui counterpart.
- **The theme engine.** `packages/ui/src/lib/theme/` — `extractPalette`,
  `deriveAccent` and `buildTheme`, which solve a brand colour for a tone set
  that clears the system's contrast thresholds rather than assuming the input is
  usable.
- **`packages/ui/src/lib/`** (`utils`, `arc`, `motion`) and
  **`packages/ui/src/hooks/`** (`use-mobile`).

The restyling of the 68 files under `packages/ui/src/components/ui/` is original
work on top of shadcn/ui's structure, and is licensed under this repository's
MIT licence. That does not displace shadcn/ui's notice above; both apply.
