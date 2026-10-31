# Component catalog

The families below cover the components with system-specific choices worth
recording. The full surface is larger — 69 primitives in
`packages/ui/src/components/ui/` and 46 application components in
`packages/ui/src/components/` — and the authoritative, always-current catalogue
is the docs site, [pestoui.com](https://pestoui.com). Anything unlisted here
follows the shadcn API unchanged.

## Actions & inputs

| Component | Key API | System notes |
| --- | --- | --- |
| **Button** | `variant`: default · outline · secondary · ghost · inverse · destructive · link<br>`size`: xs · sm · default · lg · xl · icon · icon-sm · icon-lg · **icon-round** | Pills. `outline` carries `shadow-soft`. `xl` squares to `rounded-lg` for full-width CTAs. Icon sizes are squircles; `icon-round` is the opt-in circle. |
| **Input / Textarea** | — | `h-11`, `bg-card`, 15px, blue focus ring. Textarea `min-h-28`. |
| **Input Group** | `InputGroupAddon`, `InputGroupButton` | `h-11` to match Input; addons align inside the pill. |
| **Input OTP** | `maxLength`, `InputOTPSlot` | `size-12` slots, blue active ring. |
| **Label / Field** | `Field` = label + control + hint/error | `Field` is bespoke — the standard form row with `optional` and `error` props. |
| **Checkbox / Radio** | — | `size-5`, **blue** when checked/selected. |
| **Switch** | — | Blue when on. |
| **Select** | `SelectTrigger size` | `h-11` trigger, `bg-card`, float menu. |
| **Slider** | `defaultValue` (array = range) | Blue range, `size-5` thumb with `shadow-soft` + blue border. |
| **Toggle / Toggle Group** | `variant`: default · outline<br>`spacing={0}` = segmented | Blue-tinted `on` state, explicit squircle radii. |

## Overlays

All floating surfaces use `shadow-float` + `ring-foreground/[0.06]`. Menu items are 15px with
`rounded-[10px]` and an `accent` focus fill.

| Component | Key API | System notes |
| --- | --- | --- |
| **Dialog** | `DialogContent`, `showCloseButton` | `p-7`, 22px title, borderless footer. |
| **Alert Dialog** | `size`: default · sm<br>`AlertDialogMedia` for an icon | Matches Dialog; media tile is a soft squircle. |
| **Sheet** | `side`: top/right/bottom/left | Rounded inner edge, `max-w-md`, `p-6` header/footer. |
| **Drawer** | (vaul) | Rounded top, grab handle, `p-6`. |
| **Popover / Hover Card** | — | `rounded-[18px]`, `p-3`/`p-4`, float shadow. |
| **Tooltip** | self-provides its Provider | Dark pill, `rounded-lg`, float shadow. No wrapper needed. |
| **Dropdown / Context Menu / Menubar** | items, checkbox/radio items, sub-menus, shortcuts | Shared item spec: 15px, `rounded-[10px]`, `rounded-[14px]` menu, float shadow. |
| **Command** | `CommandDialog`, `CommandInput`, `CommandGroup` | `h-12` search field on `secondary`, `accent` selected row. |

## Navigation & disclosure

| Component | Key API | System notes |
| --- | --- | --- |
| **Tabs** | — | Pill tabs on a `secondary` track (active = white card). |
| **Breadcrumb** | `BreadcrumbPage` = current | 15px, medium-weight current page. |
| **Pagination** | `PaginationLink isActive` | **Active page is blue-tinted**, not just outlined. |
| **Navigation Menu** | `NavigationMenuTrigger` | Pill triggers, float viewport, 15px links. |
| **Sidebar** | `SidebarProvider`, `SidebarMenuButton isActive` | White surface, `rounded-[10px]` rows, 15px. |
| **Accordion** | `type` single/multiple | `py-4` triggers, muted 15px content, no underline. |
| **Collapsible** | — | Structural; styled by its children. |

## Data & feedback

| Component | Key API | System notes |
| --- | --- | --- |
| **Table** | header/body/row/cell | Quiet uppercase-weight header labels, `px-4 py-3` cells, **blue selected row**. |
| **Badge** | `variant`: default · secondary · count · info · success · warning · destructive · outline · ghost · link | `count` is the blue notification pill. Semantic variants are soft-tinted. |
| **Alert** | `variant`: default · info · success · warning · destructive | Tinted surface + coloured icon per variant. |
| **Avatar** | — | Plus bespoke `OrbAvatar` (identity-hue gradient orbs). |
| **Calendar** | `mode`: single · range | Blue selected day, blue range band, blue "today". |
| **Chart** | `ChartContainer`, `ChartTooltipContent`, `ChartConfig` | recharts themed to identity hues; float tooltip. Set `isAnimationActive={false}` for static shots. |
| **Progress** | `value` | Blue indicator on a `secondary` track. |
| **Skeleton** | — | `bg-foreground/[0.06]` pulse. |
| **Carousel** | (embla) `CarouselPrevious/Next` | Circular nav buttons (conventional for carousels). |
| **Resizable** | `orientation` (v4 API, not `direction`) | Warm handle with grip. |
| **Scroll Area / Aspect Ratio / Separator / Card** | — | Token-driven, unchanged API. |
| **Sonner (toasts)** | `toast()`, `.success/.info/.warning/.error/.promise` | Popover surface, `--radius`, bottom-right. Mount `<Toaster />` once. |

## Bespoke components

Built on the primitives, specific to the agents platform:

- **AgentCard** — `cover="bleed"` (default) or `"inset"`; gradient cover, icon tiles, author orb.
- **AppRow** — app-directory row with connect state.
- **BrandIcons** — `LogoMark`, the product mark; `monochrome` follows the text colour. No third-party logos ship: a service's mark is its owner's trademark, so take it from that service's own brand kit.
- **Chip** — category filter pill.
- **IconTile** — squircle brand-mark tile (`raised` / `soft`, four sizes).
- **OrbAvatar / OrbStack** — identity-hue gradient orbs.
- **PromoCard** — dark promo card with CTA.
- **SharePanel** — the share sheet (copy link, audience toggles, publish).
- **SidebarPreview** — the workspace sidebar mock.

## Adding a component

1. `npx shadcn@latest add <name>` (back up `button.tsx` first).
2. Restyle it to the six rules — usually: 15px type, blue selected state, `shadow-float` if floating, explicit radii on any square icon target.
3. `npm run gen:barrel && npm run typecheck`.
4. Its demo goes on the docs site, which lives in a separate private repository; describe in the pull request what it should show.
