# Design tokens

Every value below is a CSS custom property defined in [`packages/ui/src/index.css`](../packages/ui/src/index.css) and
exposed to Tailwind through the `@theme inline` block. Change it there and it propagates
everywhere — components never hard-code colour, radius or shadow.

## Colour

Authored in OKLCH for perceptually even steps; hex shown for reference.

### Surfaces
| Token | Hex | Use |
| --- | --- | --- |
| `--background` | `#F5F4F0` | app canvas — warm paper grey |
| `--foreground` | `#232019` | primary text — warm near-black |
| `--card` | `#FFFFFF` | raised surfaces, inputs |
| `--popover` | `#FFFFFF` | floating surfaces |
| `--paper` | `#F0EDE3` | document / preview canvas |
| `--inverse` | `#2B2823` | dark promo surfaces |
| `--inverse-foreground` | `#FAFAF8` | text on inverse |
| `--inverse-muted` | `#A9A49B` | muted text on inverse |

### Text & interactive
| Token | Hex | Use |
| --- | --- | --- |
| `--muted-foreground` | `#666862` | secondary text — 4.5:1 minimum on every light surface |
| `--primary` | `#232019` | dark pill / CTA |
| `--secondary` | `#F1F0EB` | quiet fills, tracks |
| `--accent` | `#EFEDE7` | hover fill |
| `--border` | `#EAE8E2` | hairlines |
| `--ring` | `#3B82F6` | focus ring (blue) |

### Semantic
| Token | Hex | Use |
| --- | --- | --- |
| `--info` | `#3B82F6` | **the** accent — selected state, links, counts |
| `--success` | `#16A34A` | success |
| `--warning` | `#F59E0B` | warning |
| `--destructive` | `#DC2626` | danger, delete |

### Identity (chart / orb hues)
| Token | Hex | Name |
| --- | --- | --- |
| `--chart-1` | `#8B5CF6` | violet |
| `--chart-2` | `#F472B6` | pink |
| `--chart-3` | `#FB923C` | orange |
| `--chart-4` | `#60A5FA` | blue |
| `--chart-5` | `#2DD4BF` | teal |

Every semantic and identity colour has a matching `-foreground` for text/icons placed on it.

## Radius

Base `--radius: 1rem` (16px). The scale multiplies it:

| Token | Multiplier | ≈ px |
| --- | --- | --- |
| `--radius-sm` | 0.6 | 10 |
| `--radius-md` | 0.8 | 13 |
| `--radius-lg` | 1.0 | 16 |
| `--radius-xl` | 1.4 | 22 |
| `--radius-2xl` | 1.8 | 29 |
| `--radius-3xl` | 2.2 | 35 |

> ⚠️ **Icon buttons and tiles do not use this scale.** A radius over half the box collapses a
> square into a circle. They carry explicit pixel radii (`rounded-[13px]`, `rounded-[16px]`…).
> Use `size="icon-round"` when a circle is actually wanted.

## Elevation

Four steps, all warm-tinted (`oklch(0.216 0.006 56 / …)`) rather than pure black.

| Token | Role |
| --- | --- |
| `--shadow-soft` | raised controls — outline buttons, tiles, slider thumbs |
| `--shadow-tile` | icon tiles, small raised chips |
| `--shadow-card` | cards, panels |
| `--shadow-float` | popovers, dialogs, menus, tooltips, sheets |

## Typography

- **Family:** `Inter Variable` (weight axis only, latin + latin-ext) → `--font-sans` / `--font-heading`.
- **Body:** 15px (`text-[0.9375rem]`), letter-spacing `-0.011em`, antialiased.
- **Headings:** semibold, `-0.015em` to `-0.02em` tracking.

## Cover gradients

Four pastel meshes built from stacked radial gradients (utilities in `index.css`):
`.gradient-sky` · `.gradient-sunrise` · `.gradient-blossom` · `.gradient-meadow`.

## Dark mode

Every token has a `.dark` override in `index.css`. Surfaces invert to warm charcoals, the blue
accent and identity hues stay constant. The system is wired for it; a dedicated dark-mode
visual pass is the one remaining polish item.
