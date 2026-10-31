## What this changes

<!-- One or two sentences. What is different after this merges? -->

## Why

<!-- Link the issue, or explain the problem. If this contradicts something in
     CONTRIBUTING.md, say so here rather than leaving a reviewer to find it. -->

## How I verified it

<!-- Be specific. "Typechecks" and "I loaded the page and the tabs still switch"
     are different claims. -->

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] The other checks in CONTRIBUTING.md ("Before you open a pull request")
- [ ] Loaded the affected components in a browser

## Visual changes

<!-- Delete this section if there are none. Otherwise: before and after
     screenshots. The system has an explicit no-unintended-visual-change rule
     and screenshots are how it is kept. -->

## Checklist

- [ ] Imports inside `packages/ui` are relative
- [ ] No raw `oklch()`, hex, `text-[…rem]`, `rounded-[…px]` or `tracking-[…]` outside `packages/ui/src/index.css` and `packages/ui/src/styles/`
- [ ] New exports are in the workspace's `exports` map
- [ ] Barrels regenerated (`npm run gen:barrel`) if a component was added or removed
