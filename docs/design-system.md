# MaizeMeals design system

The rules for building UI so new pages look and behave like the rest of the app. **Check `web/components/ui` before building any control yourself.** Add missing primitives with the shadcn CLI (`cd web && npx shadcn@latest add <name>`, style `new-york`, Radix-based) instead of hand-rolling them.

## Tokens

| Use | Class | Notes |
| --- | --- | --- |
| Brand maize | `bg-maize`, `text-maize`, `border-maize`, `bg-maize/20` | Primary actions, highlights, ratings |
| Brand blue | `bg-umich-blue`, `text-umich-blue` | Text on maize; active nav in light mode |
| Surfaces | `bg-background`, `bg-card`, `bg-muted` | Never `bg-white`, `bg-slate-*` or `bg-gray-*` |
| Text | `text-foreground`, `text-muted-foreground` | Never `text-slate-*` or `text-gray-*` |
| Borders | `border-border`, `border-input` | |
| Status | `Badge` variants `success` / `warning` / `danger` / `muted` | Open / closing soon / closed / neutral. `lib/dining/constants.ts` `STATUS_COLORS` matches these |

Never hard-code hex values in components. If a colour is missing, add a CSS variable in `app/globals.css` and a `--color-*` entry in `@theme`.

## Radius scale

| Element | Radius |
| --- | --- |
| Pills: chips, search fields, toolbar buttons, segmented tabs, badges | `rounded-full` |
| Cards, list groups, images inside cards | `rounded-xl` |
| Dialogs and drawers | `rounded-2xl` (built into `ResponsiveDialog`) |
| Small inline tags (dietary tag, rating) | `rounded-md` |

## Type scale

The utilities are defined in `globals.css`:
- `type-page-title`: one per page; use `PageHeader`
- `type-section-title`: use `SectionHeader`
- `type-card-title`: card headings

Body text uses `text-sm` (14px), with `text-base` on inputs on mobile so iOS doesn't zoom. Metadata uses `text-xs text-muted-foreground`.

## Layering (z-index)

| Layer | z |
| --- | --- |
| Sticky in-page toolbars | `z-20` |
| Mobile bottom nav, install prompt, map drawer | `z-40` |
| Fixed header | `z-50` |
| Dialogs, drawers, sheets, popovers (Radix portals) | `z-50` (portals render last, so they sit above the header) |

Don't use `z-[60]`, `z-[70]` or `z-[9999]`. If something needs one, the structure is wrong.

## Components: what to use

| Need | Use |
| --- | --- |
| Page frame below the header | `components/layout/page-shell.tsx`: `PageShell`, `PageHeader`, `SectionHeader` |
| Any modal | `components/ui/responsive-dialog.tsx`: a bottom drawer (vaul) on phones, a centered `Dialog` at md+. Always include a Title (it can be `sr-only`) |
| Side panel (desktop) | `components/ui/sheet.tsx` |
| Search input | `components/ui/search-field.tsx` |
| Menu toolbar (search, date, filters, dietary chips, meal tabs) | Reuse the hall page's pieces: `DateControls`, `FilterDialog`, `QuickToggles`, `MenuTabs` (see `components/menus/FoodFinder.tsx`) |
| Toggleable filter pill | `components/ui/chip.tsx` (Radix Toggle, `aria-pressed`), or `DietaryFilterButton` for dietary tags |
| Mutually exclusive views or sort | `components/ui/tabs.tsx` (`TabsList` + `TabsTrigger`, `rounded-full`) |
| Status, rating or match labels | `components/ui/badge.tsx`, variants `maize` / `maize-soft` / `success` / `warning` / `danger` / `muted`, with `shape="pill"` |
| List rows with media and actions | `components/ui/item.tsx` |
| Empty and zero-result states | `components/ui/empty.tsx` |
| Buttons | `components/ui/button.tsx` + `lib/button-styles.ts` (`appPrimaryButtonClassName`, `appToolbarControlClassName`, …) |
| Toasts | `lib/toast.ts` (sonner) |
| Loading placeholders | `components/ui/skeleton.tsx` |

## Accessibility basics

- Icon-only buttons need `aria-label`, or an `sr-only` span.
- Use real `<button>` and `<a>` elements. Avoid `div role="button"` unless it wraps other interactive content.
- Toggles use Radix Toggle/ToggleGroup (or `aria-pressed`). Tabs use Radix Tabs.
- Never `alert()` or `confirm()`. Use a toast, or a `ResponsiveDialog` for confirmations.

## Mobile and PWA

- Full-height layouts subtract the tab bar with `calc(100dvh - var(--bottom-nav-h, 0px))`. Scrolling pages get its padding automatically through `body`.
- Fixed bottom UI sits at `bottom: var(--bottom-nav-h)`.
- Keep the side gutter at 16px (`px-4`) on phones.
