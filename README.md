# Pesto UI

A warm-neutral React design system for agent and dashboard products, built on
shadcn/ui, Tailwind v4, React 19 and Radix.

This repository is the component library, `@pestoui/core`, in
[`packages/ui`](packages/ui): all 115 components (69 primitives, 46 application
components), the tokens, the motion system and the theme engine. The package
ships its TypeScript source; there is no build step.

**Documentation, with a live preview of every component:
[pestoui.com](https://pestoui.com).**

## Install

Peer dependencies: `react` 19, `react-dom` 19 and `tailwindcss` 4.

`@pestoui/core` is not published yet. From the first release it installs from
npm with `npm install @pestoui/core`, and the same package is mirrored to GitHub
Packages as `@pestoui/core`; a shadcn registry namespace (`@pestoui`) is planned
too. Until then, use it from a clone of this repository as a workspace package,
or copy the components you need (see
[Copying rather than installing](packages/ui/README.md#copying-rather-than-installing)).

To work on the library itself you need Node 22.18 or later:

```bash
git clone https://github.com/pestoui/pestoui.git
cd pestoui
npm install
```

## Usage

Import the stylesheet once, at your app root, then the components:

```tsx
import { Button, Card, CardContent, MetricCard } from "@pestoui/core"
import "@pestoui/core/styles.css"

export function Panel() {
  return (
    <Card>
      <CardContent>
        <MetricCard label="Runs today" value={1204} />
        <Button size="lg">New agent</Button>
      </CardContent>
    </Card>
  )
}
```

`styles.css` carries every token and tells Tailwind where the components are.
On Next.js, add the package to `transpilePackages`. The
[package README](packages/ui/README.md) covers both, along with the entry
points, theming and the client boundary.

## Free and PRO

Everything in this repository is free and MIT-licensed. A paid tier, Pesto Pro,
is maintained in a separate private repository; none of its source is here.

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md). By participating you agree to the
[Code of Conduct](CODE_OF_CONDUCT.md). To report a security problem, see
[SECURITY.md](SECURITY.md).

## Licence

[MIT](LICENSE) © Fahim Anando. Derived in part from shadcn/ui, also MIT; see
[NOTICE.md](NOTICE.md) for the attribution.
